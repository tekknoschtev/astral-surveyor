// Star rendering for stellar map
// Extracted from stellarmap.ts for better code organization

import { BaseRenderer } from './BaseRenderer.js';
import type { StarLike, MapRenderContext } from '../StellarMapTypes.js';
import { NamingService } from '../../../naming/naming.js';

export class StarRenderer extends BaseRenderer {
    private static readonly STAR_COLORS: Record<string, string> = {
        'G-Type Star': '#ffdd88',
        'K-Type Star': '#ffaa44', 
        'M-Type Star': '#ff6644',
        'Red Giant': '#ff4422',
        'Blue Giant': '#88ddff',
        'White Dwarf': '#ffffff',
        'Neutron Star': '#ddddff'
    };

    private namingService: NamingService | null = null;

    constructor(namingService?: NamingService) {
        super();
        this.namingService = namingService || null;
    }

    setNamingService(namingService: NamingService): void {
        this.namingService = namingService;
    }

    renderDiscoveredStars(
        context: MapRenderContext,
        discoveredStars: StarLike[],
        zoomLevel: number,
        selectedStar: StarLike | null,
        hoveredStar: StarLike | null,
        currentPositionColor: string
    ): void {
        if (!discoveredStars) return;

        const { ctx } = context;
        
        // Performance optimization: reduce star detail at extreme zoom out
        const isExtremeZoomOut = zoomLevel < 0.1;
        const renderLabels = zoomLevel > 2.0 || (!isExtremeZoomOut && selectedStar);

        for (const star of discoveredStars) {
            // Convert world coordinates to map coordinates
            const { x: starMapX, y: starMapY } = this.worldToMapCoords(star.x, star.y, context);
            
            // Calculate proportional star size based on zoom level and star type
            const starSize = this.calculateStarSize(star, isExtremeZoomOut, zoomLevel);
            
            // Expanded bounds check for better culling at extreme zoom
            const margin = isExtremeZoomOut ? 0 : 10; // No margin needed at extreme zoom
            if (this.isInBounds(starMapX, starMapY, context, margin)) {
                
                // Get star color based on type
                const starColor = StarRenderer.STAR_COLORS[star.starTypeName || ''] || '#ffffff';
                
                // Draw star as circle with proportional sizing
                this.drawCircularObject(ctx, starMapX, starMapY, starSize, starColor);
                
                // Add hover highlight if this star is hovered (but not selected)
                if (hoveredStar === star && selectedStar !== star) {
                    this.drawHoverHighlight(ctx, starMapX, starMapY, starSize, currentPositionColor + '80');
                }
                
                // Add selection highlight if this star is selected (takes precedence over hover)
                if (selectedStar === star) {
                    this.drawSelectionHighlight(ctx, starMapX, starMapY, starSize, currentPositionColor);
                }
                
                // Draw star name at higher zoom levels or when selected (optimized)
                if (renderLabels && (zoomLevel > 2.0 || selectedStar === star)) {
                    this.renderStarLabel(ctx, star, starMapX, starMapY, starSize);
                }
            }
        }
    }

    private calculateStarSize(star: StarLike, isExtremeZoomOut: boolean, zoomLevel: number): number {
        // At extreme zoom out, use minimal fixed size for performance
        if (isExtremeZoomOut) {
            return 1;
        }
        
        // Get the star's size multiplier from its star type (default 1.0 if not available)
        const sizeMultiplier = star.starType?.sizeMultiplier || 1.0;
        
        // Base size varies by zoom level to show more detail at higher zooms
        let baseSize: number;
        if (zoomLevel <= 0.2) {
            // Galactic/Sector View: minimal differences, focus on visibility
            baseSize = 2;
            return Math.max(1, baseSize * (0.8 + sizeMultiplier * 0.4)); // Range: ~1.6-3.2
        } else if (zoomLevel <= 1.0) {
            // Regional View: moderate size differences become visible
            baseSize = 3;
            return Math.max(2, baseSize * (0.6 + sizeMultiplier * 0.8)); // Range: ~1.8-5.4
        } else if (zoomLevel <= 3.0) {
            // Local View: significant size differences
            baseSize = 4;
            return Math.max(2, baseSize * (0.4 + sizeMultiplier * 1.2)); // Range: ~2.6-8.6
        } else {
            // Detail View: full proportional sizing - dramatic differences
            baseSize = 5;
            return Math.max(2, baseSize * (0.2 + sizeMultiplier * 1.6)); // Range: ~2.6-15.4
        }
    }

    private renderStarLabel(
        ctx: CanvasRenderingContext2D, 
        star: StarLike, 
        starMapX: number, 
        starMapY: number, 
        starSize: number
    ): void {
        if (!this.namingService) return;
        
        // Generate star name
        const starName = this.namingService.generateDisplayName(star);
        
        // Calculate offset position for scientific diagram style
        const offsetDistance = 35; // Distance from star center
        const offsetAngle = -Math.PI / 6; // -30 degrees (upper-right)
        
        // Calculate label position
        const labelX = starMapX + Math.cos(offsetAngle) * offsetDistance;
        const labelY = starMapY + Math.sin(offsetAngle) * offsetDistance;
        
        // Draw connecting line from star edge to text
        ctx.save();
        ctx.strokeStyle = '#aaaaaa'; // Lighter gray for visibility
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        // Start line from edge of star
        const lineStartX = starMapX + Math.cos(offsetAngle) * (starSize + 2);
        const lineStartY = starMapY + Math.sin(offsetAngle) * (starSize + 2);
        // End line just before the text starts
        const lineEndX = labelX - 5; // Small gap before text
        const lineEndY = labelY;
        ctx.moveTo(lineStartX, lineStartY);
        ctx.lineTo(lineEndX, lineEndY);
        ctx.stroke();
        
        // Draw star name at offset position
        ctx.fillStyle = '#b0c4d4';
        ctx.font = '12px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(starName, labelX, labelY);
        
        // Reset text alignment and baseline
        ctx.textBaseline = 'alphabetic';
        ctx.restore();
    }
}