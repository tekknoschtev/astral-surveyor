// Nebula rendering for stellar map
// Extracted from stellarmap.ts for better code organization

import { BaseRenderer } from './BaseRenderer.js';
import type { NebulaLike, MapRenderContext } from '../StellarMapTypes.js';
import type { NamingService } from '../../../naming/naming.js';

export class NebulaRenderer extends BaseRenderer {
    private namingService: NamingService | null = null;

    setNamingService(namingService: NamingService): void {
        this.namingService = namingService;
    }

    renderDiscoveredNebulae(
        context: MapRenderContext,
        discoveredNebulae: NebulaLike[],
        selectedNebula: NebulaLike | null,
        hoveredNebula: NebulaLike | null,
        currentPositionColor: string,
        zoomLevel: number
    ): void {
        if (!discoveredNebulae) return;

        const { ctx, mapX, mapY, mapWidth, mapHeight } = context;

        for (const nebula of discoveredNebulae) {
            const nebulaMapPos = this.worldToMapCoords(nebula.x, nebula.y, context);

            // Check if nebula is within extended map bounds (nebulae can be large)
            const nebulaMargin = 100;
            if (
                nebulaMapPos.x >= mapX - nebulaMargin &&
                nebulaMapPos.x <= mapX + mapWidth + nebulaMargin &&
                nebulaMapPos.y >= mapY - nebulaMargin &&
                nebulaMapPos.y <= mapY + mapHeight + nebulaMargin
            ) {
                // Determine nebula size based on type
                const baseRadius = nebula.nebulaTypeData?.size || 50;
                const nebulaRadius = baseRadius * context.worldToMapScale;

                // Get nebula-specific colors
                const colors = this.getNebulaColors(nebula);

                // Draw nebula with radial gradient
                ctx.save();

                // Create radial gradient for glow effect
                const gradient = ctx.createRadialGradient(
                    nebulaMapPos.x,
                    nebulaMapPos.y,
                    0,
                    nebulaMapPos.x,
                    nebulaMapPos.y,
                    nebulaRadius
                );

                gradient.addColorStop(0, colors.core);
                gradient.addColorStop(0.5, colors.mid);
                gradient.addColorStop(1, colors.edge);

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(nebulaMapPos.x, nebulaMapPos.y, nebulaRadius, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();

                // Add hover highlight if this nebula is hovered (but not selected)
                if (hoveredNebula === nebula && selectedNebula !== nebula) {
                    this.drawHoverHighlight(ctx, nebulaMapPos.x, nebulaMapPos.y, nebulaRadius + 2, currentPositionColor + '60');
                }

                // Add selection highlight if this nebula is selected (takes precedence over hover)
                if (selectedNebula === nebula) {
                    this.drawSelectionHighlight(ctx, nebulaMapPos.x, nebulaMapPos.y, nebulaRadius + 3, currentPositionColor);
                }

                // Render nebula label if zoomed in enough or selected
                if (zoomLevel > 1.5 || selectedNebula === nebula) {
                    this.renderNebulaLabel(ctx, nebula, nebulaMapPos.x, nebulaMapPos.y);
                }
            }
        }
    }

    private getNebulaColors(nebula: NebulaLike): { core: string; mid: string; edge: string } {
        // Use nebula type-specific colors if available
        if (nebula.nebulaTypeData && nebula.nebulaTypeData.colors) {
            const typeColors = nebula.nebulaTypeData.colors;
            return {
                core: typeColors[0] + 'CC', // More opaque core
                mid: typeColors[0] + '66',   // Semi-transparent mid
                edge: typeColors[0] + '00'   // Transparent edge
            };
        }

        // Fallback colors based on nebula type name
        const typeColorMap: Record<string, { core: string; mid: string; edge: string }> = {
            'Emission Nebula': { core: '#FF6B6BCC', mid: '#FF6B6B66', edge: '#FF6B6B00' },
            'Reflection Nebula': { core: '#4D96FFCC', mid: '#4D96FF66', edge: '#4D96FF00' },
            'Planetary Nebula': { core: '#6BCF7FCC', mid: '#6BCF7F66', edge: '#6BCF7F00' },
            'Dark Nebula': { core: '#2C2C2CCC', mid: '#2C2C2C66', edge: '#2C2C2C00' }
        };

        return typeColorMap[nebula.nebulaType] || { core: '#888888CC', mid: '#88888866', edge: '#88888800' };
    }

    private renderNebulaLabel(ctx: CanvasRenderingContext2D, nebula: NebulaLike, nebulaMapX: number, nebulaMapY: number): void {
        // Get nebula name (either custom name or generated name)
        let nebulaName = nebula.objectName;
        if (!nebulaName && this.namingService) {
            nebulaName = this.namingService.generateDisplayName(nebula);
        }

        if (nebulaName) {
            const labelOffsetY = 20; // Offset label below nebula center

            ctx.save();

            // Draw connecting line from nebula to label
            ctx.strokeStyle = '#CCCCCC40';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(nebulaMapX, nebulaMapY);
            ctx.lineTo(nebulaMapX, nebulaMapY + labelOffsetY);
            ctx.stroke();

            // Draw label
            ctx.fillStyle = '#CCCCCC';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(nebulaName, nebulaMapX, nebulaMapY + labelOffsetY);

            ctx.restore();
        }
    }
}
