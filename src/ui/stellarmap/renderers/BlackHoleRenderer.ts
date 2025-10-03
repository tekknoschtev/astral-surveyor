// Black hole rendering for stellar map
// Extracted from stellarmap.ts for better code organization

import { BaseRenderer } from './BaseRenderer.js';
import type { BlackHoleLike, MapRenderContext } from '../StellarMapTypes.js';

export class BlackHoleRenderer extends BaseRenderer {
    renderDiscoveredBlackHoles(
        context: MapRenderContext,
        discoveredBlackHoles: BlackHoleLike[],
        selectedBlackHole: BlackHoleLike | null,
        hoveredBlackHole: BlackHoleLike | null,
        currentPositionColor: string,
        zoomLevel: number
    ): void {
        if (!discoveredBlackHoles) return;

        const { ctx, mapX, mapY, mapWidth, mapHeight } = context;

        for (const blackHole of discoveredBlackHoles) {
            const blackHoleMapPos = this.worldToMapCoords(blackHole.x, blackHole.y, context);

            // Check if black hole is visible on the map
            if (
                blackHoleMapPos.x < mapX - 20 ||
                blackHoleMapPos.x > mapX + mapWidth + 20 ||
                blackHoleMapPos.y < mapY - 20 ||
                blackHoleMapPos.y > mapY + mapHeight + 20
            ) {
                continue;
            }

            ctx.save();

            // Calculate black hole size based on zoom level
            const baseSize = 8;
            const blackHoleSize = Math.max(2, baseSize * Math.sqrt(zoomLevel));
            const accretionDiscSize = blackHoleSize * 2.5;

            // Render accretion disc
            ctx.globalAlpha = 0.6;

            // Create radial gradient for accretion disc
            const gradient = ctx.createRadialGradient(
                blackHoleMapPos.x,
                blackHoleMapPos.y,
                blackHoleSize * 0.3,
                blackHoleMapPos.x,
                blackHoleMapPos.y,
                accretionDiscSize
            );
            gradient.addColorStop(0, 'rgba(255, 100, 0, 0.8)'); // Hot orange center
            gradient.addColorStop(0.3, 'rgba(255, 150, 50, 0.6)'); // Orange middle
            gradient.addColorStop(0.7, 'rgba(200, 50, 100, 0.3)'); // Purple outer
            gradient.addColorStop(1, 'rgba(100, 0, 150, 0.1)'); // Dark purple edge

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(blackHoleMapPos.x, blackHoleMapPos.y, accretionDiscSize, 0, Math.PI * 2);
            ctx.fill();

            // Render event horizon (black center)
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(blackHoleMapPos.x, blackHoleMapPos.y, blackHoleSize, 0, Math.PI * 2);
            ctx.fill();

            // Add subtle gravitational distortion ring
            ctx.strokeStyle = 'rgba(100, 100, 255, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(blackHoleMapPos.x, blackHoleMapPos.y, blackHoleSize * 1.2, 0, Math.PI * 2);
            ctx.stroke();

            // Add hover highlight if this black hole is hovered (but not selected)
            if (hoveredBlackHole === blackHole && selectedBlackHole !== blackHole) {
                ctx.strokeStyle = currentPositionColor + '80'; // Semi-transparent amber
                ctx.lineWidth = 1;
                ctx.beginPath();
                const hoverRadius = accretionDiscSize + 2;
                ctx.arc(blackHoleMapPos.x, blackHoleMapPos.y, hoverRadius, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Add selection highlight if this black hole is selected (takes precedence over hover)
            if (selectedBlackHole === blackHole) {
                ctx.strokeStyle = currentPositionColor; // Full amber
                ctx.lineWidth = 2;
                const selectionRadius = accretionDiscSize + 3;
                ctx.beginPath();
                ctx.arc(blackHoleMapPos.x, blackHoleMapPos.y, selectionRadius, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.restore();

            // Render black hole label if zoomed in enough or selected
            if (zoomLevel > 2.0 || selectedBlackHole === blackHole) {
                this.renderBlackHoleLabel(ctx, blackHole, blackHoleMapPos.x, blackHoleMapPos.y);
            }
        }
    }

    private renderBlackHoleLabel(
        ctx: CanvasRenderingContext2D,
        blackHole: BlackHoleLike,
        mapX: number,
        mapY: number
    ): void {
        ctx.save();

        // Use stored black hole name from discovery data if available, otherwise fallback based on type
        const displayName = blackHole.objectName ||
            (blackHole.blackHoleTypeName === 'supermassive' ? 'Supermassive Black Hole' :
             blackHole.blackHoleTypeName === 'stellar' ? 'Stellar Black Hole' : 'Black Hole');

        // Calculate offset position for scientific diagram style
        const offsetDistance = 25; // Distance from black hole center
        const offsetAngle = -Math.PI / 6; // -30 degrees (upper-right)

        // Calculate label position
        const labelX = mapX + Math.cos(offsetAngle) * offsetDistance;
        const labelY = mapY + Math.sin(offsetAngle) * offsetDistance;

        // Draw connecting line from black hole edge to text
        ctx.strokeStyle = '#aaaaaa';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Start line from edge of black hole (approximate size)
        const blackHoleSize = 8; // Approximate black hole visual size
        const lineStartX = mapX + Math.cos(offsetAngle) * (blackHoleSize + 2);
        const lineStartY = mapY + Math.sin(offsetAngle) * (blackHoleSize + 2);
        // End line just before the text starts
        const lineEndX = labelX - 5; // Small gap before text
        const lineEndY = labelY;
        ctx.moveTo(lineStartX, lineStartY);
        ctx.lineTo(lineEndX, lineEndY);
        ctx.stroke();

        ctx.font = '12px "Courier New", monospace';
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Draw text outline and fill
        ctx.strokeText(displayName, labelX, labelY);
        ctx.fillText(displayName, labelX, labelY);

        // Reset text alignment and baseline
        ctx.textBaseline = 'alphabetic';
        ctx.restore();
    }
}
