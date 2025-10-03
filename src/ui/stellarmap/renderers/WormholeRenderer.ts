// Wormhole rendering for stellar map
// Extracted from stellarmap.ts for better code organization

import { BaseRenderer } from './BaseRenderer.js';
import type { WormholeLike, MapRenderContext } from '../StellarMapTypes.js';
import type { NamingService } from '../../../naming/naming.js';

export class WormholeRenderer extends BaseRenderer {
    private namingService: NamingService | null = null;

    setNamingService(namingService: NamingService): void {
        this.namingService = namingService;
    }

    renderDiscoveredWormholes(
        context: MapRenderContext,
        discoveredWormholes: WormholeLike[],
        selectedWormhole: WormholeLike | null,
        hoveredWormhole: WormholeLike | null,
        currentPositionColor: string,
        zoomLevel: number
    ): void {
        if (!discoveredWormholes) return;

        const { ctx, mapX, mapY, mapWidth, mapHeight } = context;

        // Group wormholes by their wormhole ID to render pairs and connections
        const wormholePairs = new Map<string, WormholeLike[]>();

        for (const wormhole of discoveredWormholes) {
            if (!wormholePairs.has(wormhole.wormholeId)) {
                wormholePairs.set(wormhole.wormholeId, []);
            }
            wormholePairs.get(wormhole.wormholeId)!.push(wormhole);
        }

        // First pass: Draw connection lines between paired wormholes
        this.renderWormholeConnections(ctx, wormholePairs, context, zoomLevel);

        // Second pass: Draw individual wormholes on top of connection lines
        for (const wormhole of discoveredWormholes) {
            const wormholeMapPos = this.worldToMapCoords(wormhole.x, wormhole.y, context);

            // Calculate wormhole size (prominent objects, larger than planets but smaller than big stars)
            const baseSize = 6; // Larger than planets (1.5-2.6) to show their significance
            const wormholeSize = Math.max(4, baseSize * Math.min(1.0, zoomLevel * 0.7));

            // Check if wormhole is within map bounds (with margin for size)
            const margin = wormholeSize + 10;
            if (
                wormholeMapPos.x >= mapX - margin &&
                wormholeMapPos.x <= mapX + mapWidth + margin &&
                wormholeMapPos.y >= mapY - margin &&
                wormholeMapPos.y <= mapY + mapHeight + margin
            ) {
                // Get wormhole colors (unique to differentiate from other objects)
                const wormholeColors = this.getWormholeColors(wormhole);

                ctx.save();

                // Draw wormhole as a distinctive swirling vortex symbol
                this.renderWormholeVortex(ctx, wormholeMapPos.x, wormholeMapPos.y, wormholeSize, wormholeColors);

                // Add selection highlight if this wormhole is selected
                if (selectedWormhole === wormhole) {
                    ctx.strokeStyle = currentPositionColor;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    const highlightRadius = wormholeSize + 3;
                    ctx.arc(wormholeMapPos.x, wormholeMapPos.y, highlightRadius, 0, Math.PI * 2);
                    ctx.stroke();
                }

                // Add hover highlight if this wormhole is hovered
                if (hoveredWormhole === wormhole) {
                    ctx.strokeStyle = currentPositionColor + '80'; // Semi-transparent
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    const hoverRadius = wormholeSize + 2;
                    ctx.arc(wormholeMapPos.x, wormholeMapPos.y, hoverRadius, 0, Math.PI * 2);
                    ctx.stroke();
                }

                // Draw designation symbol (α or β)
                this.renderWormholeDesignation(ctx, wormholeMapPos.x, wormholeMapPos.y, wormholeSize, wormhole);

                ctx.restore();

                // Render wormhole label if zoomed in enough or selected
                if (zoomLevel > 1.5 || selectedWormhole === wormhole) {
                    this.renderWormholeLabel(ctx, wormhole, wormholeMapPos.x, wormholeMapPos.y, zoomLevel);
                }
            }
        }
    }

    private renderWormholeConnections(
        ctx: CanvasRenderingContext2D,
        wormholePairs: Map<string, WormholeLike[]>,
        context: MapRenderContext,
        zoomLevel: number
    ): void {
        ctx.save();
        ctx.strokeStyle = '#6a5acd40'; // Semi-transparent purple for connections
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]); // Distinctive dashed pattern

        for (const [/* wormholeId */, wormholes] of wormholePairs) {
            // Only draw connection if we have both wormholes discovered
            if (wormholes.length === 2) {
                const alpha = wormholes.find(w => w.designation === 'alpha');
                const beta = wormholes.find(w => w.designation === 'beta');

                if (alpha && beta) {
                    const alphaMapPos = this.worldToMapCoords(alpha.x, alpha.y, context);
                    const betaMapPos = this.worldToMapCoords(beta.x, beta.y, context);

                    // Draw connection line between the pair
                    ctx.beginPath();
                    ctx.moveTo(alphaMapPos.x, alphaMapPos.y);
                    ctx.lineTo(betaMapPos.x, betaMapPos.y);
                    ctx.stroke();

                    // Draw directional indicators (small arrows) along the line
                    if (zoomLevel > 0.5) {
                        this.renderDirectionalIndicators(ctx, alphaMapPos.x, alphaMapPos.y, betaMapPos.x, betaMapPos.y);
                    }
                }
            }
        }

        ctx.setLineDash([]); // Reset line dash
        ctx.restore();
    }

    private renderWormholeVortex(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        size: number,
        colors: {core: string, spiral: string, outer: string}
    ): void {
        // Draw the swirling vortex effect
        const spiralRadius = size;
        const coreRadius = size * 0.4;

        // Draw outer ring
        ctx.strokeStyle = colors.outer;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, spiralRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw spiral pattern
        ctx.strokeStyle = colors.spiral;
        ctx.lineWidth = 1;
        const spiralTurns = 2;
        const spiralPoints = 16;
        ctx.beginPath();

        for (let i = 0; i <= spiralPoints; i++) {
            const angle = (i / spiralPoints) * Math.PI * 2 * spiralTurns;
            const radius = (spiralRadius * 0.8) * (1 - i / spiralPoints);
            const spiralX = x + Math.cos(angle) * radius;
            const spiralY = y + Math.sin(angle) * radius;

            if (i === 0) {
                ctx.moveTo(spiralX, spiralY);
            } else {
                ctx.lineTo(spiralX, spiralY);
            }
        }
        ctx.stroke();

        // Draw bright core
        ctx.fillStyle = colors.core;
        ctx.beginPath();
        ctx.arc(x, y, coreRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    private renderWormholeDesignation(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        size: number,
        wormhole: WormholeLike
    ): void {
        const symbol = wormhole.designation === 'alpha' ? 'α' : 'β';

        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.max(8, Math.min(12, size * 1.2))}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw text background for readability
        const textMetrics = ctx.measureText(symbol);
        const bgSize = Math.max(textMetrics.width, size * 0.6);

        ctx.fillStyle = '#00000080';
        ctx.beginPath();
        ctx.arc(x + size + 8, y - size - 8, bgSize / 2 + 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw the designation symbol
        ctx.fillStyle = '#ffffff';
        ctx.fillText(symbol, x + size + 8, y - size - 8);

        ctx.textBaseline = 'alphabetic'; // Reset baseline
    }

    private renderDirectionalIndicators(
        ctx: CanvasRenderingContext2D,
        x1: number,
        y1: number,
        x2: number,
        y2: number
    ): void {
        const arrowCount = 3;
        const arrowSize = 4;

        for (let i = 1; i <= arrowCount; i++) {
            const t = i / (arrowCount + 1);
            const arrowX = x1 + (x2 - x1) * t;
            const arrowY = y1 + (y2 - y1) * t;

            // Calculate arrow direction
            const angle = Math.atan2(y2 - y1, x2 - x1);

            // Draw small arrow
            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(arrowX - arrowSize * Math.cos(angle - Math.PI/6), arrowY - arrowSize * Math.sin(angle - Math.PI/6));
            ctx.moveTo(arrowX, arrowY);
            ctx.lineTo(arrowX - arrowSize * Math.cos(angle + Math.PI/6), arrowY - arrowSize * Math.sin(angle + Math.PI/6));
            ctx.stroke();
        }
    }

    private getWormholeColors(wormhole: WormholeLike): {core: string, spiral: string, outer: string} {
        // Color scheme based on designation with spacetime theme
        if (wormhole.designation === 'alpha') {
            return {
                core: '#9370db',    // Medium slate blue core
                spiral: '#ba55d3',  // Medium orchid spiral
                outer: '#dda0dd60'  // Plum outer ring (semi-transparent)
            };
        } else {
            return {
                core: '#4169e1',    // Royal blue core
                spiral: '#1e90ff',  // Dodger blue spiral
                outer: '#87ceeb60'  // Sky blue outer ring (semi-transparent)
            };
        }
    }

    private renderWormholeLabel(
        ctx: CanvasRenderingContext2D,
        wormhole: WormholeLike,
        wormholeMapX: number,
        wormholeMapY: number,
        zoomLevel: number
    ): void {
        if (!this.namingService) return;

        const wormholeName = wormhole.objectName || this.namingService.generateDisplayName(wormhole);

        // Calculate offset position for scientific diagram style
        const offsetDistance = 30; // Distance from wormhole center
        const offsetAngle = -Math.PI / 6; // -30 degrees (upper-right)

        // Calculate label position
        const labelX = wormholeMapX + Math.cos(offsetAngle) * offsetDistance;
        const labelY = wormholeMapY + Math.sin(offsetAngle) * offsetDistance;

        // Draw connecting line from wormhole edge to text
        ctx.strokeStyle = '#aaaaaa';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Start line from edge of wormhole (approximate size)
        const wormholeSize = 6; // Approximate wormhole visual size
        const lineStartX = wormholeMapX + Math.cos(offsetAngle) * (wormholeSize + 2);
        const lineStartY = wormholeMapY + Math.sin(offsetAngle) * (wormholeSize + 2);
        // End line just before the text starts
        const lineEndX = labelX - 5; // Small gap before text
        const lineEndY = labelY;
        ctx.moveTo(lineStartX, lineStartY);
        ctx.lineTo(lineEndX, lineEndY);
        ctx.stroke();

        ctx.save();
        ctx.fillStyle = '#e8f4fd';
        ctx.font = '12px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Draw text background for readability
        const textWidth = ctx.measureText(wormholeName).width;
        const bgPadding = 4;
        ctx.fillStyle = '#000000C0';
        ctx.fillRect(labelX - bgPadding, labelY - 7, textWidth + bgPadding*2, 14);

        // Draw label text
        ctx.fillStyle = '#e8f4fd';
        ctx.fillText(wormholeName, labelX, labelY);

        // Draw twin coordinates if zoomed in enough
        if (zoomLevel > 2.0) {
            const twinText = `→ (${Math.round(wormhole.twinX)}, ${Math.round(wormhole.twinY)})`;
            ctx.font = '9px "Courier New", monospace';
            const twinTextWidth = ctx.measureText(twinText).width;

            const twinLabelY = labelY + 15;
            ctx.fillStyle = '#000000A0';
            ctx.fillRect(labelX - 2, twinLabelY - 6, twinTextWidth + 4, 12);

            ctx.fillStyle = '#aaaaaa';
            ctx.fillText(twinText, labelX, twinLabelY);
        }

        // Reset text alignment and baseline
        ctx.textBaseline = 'alphabetic';
        ctx.restore();
    }
}
