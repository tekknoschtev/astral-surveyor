// Comet rendering for stellar map
// Extracted from stellarmap.ts for better code organization

import { BaseRenderer } from './BaseRenderer.js';
import type { CometLike, MapRenderContext } from '../StellarMapTypes.js';

export class CometRenderer extends BaseRenderer {
    renderDiscoveredComets(
        context: MapRenderContext,
        discoveredComets: CometLike[],
        selectedComet: CometLike | null,
        hoveredComet: CometLike | null,
        currentPositionColor: string,
        zoomLevel: number
    ): void {
        if (!discoveredComets) return;

        const { ctx, mapX, mapY, mapWidth, mapHeight } = context;

        for (const comet of discoveredComets) {
            const cometMapPos = this.worldToMapCoords(comet.x, comet.y, context);

            // Check if comet is visible on the map
            if (
                cometMapPos.x < mapX - 30 ||
                cometMapPos.x > mapX + mapWidth + 30 ||
                cometMapPos.y < mapY - 30 ||
                cometMapPos.y > mapY + mapHeight + 30
            ) {
                continue;
            }

            ctx.save();

            // Calculate comet size based on zoom level
            const cometSize = this.calculateCometSize(zoomLevel);

            // Render elliptical orbit if zoom level is high enough and we have orbit data
            if (zoomLevel > 1.5 && comet.parentStarX !== undefined && comet.parentStarY !== undefined) {
                this.renderCometOrbit(ctx, comet, context, zoomLevel);
            }

            // Render comet nucleus
            const nucleusColor = comet.cometType?.nucleusColor || '#E0FFFF';
            ctx.fillStyle = nucleusColor;
            ctx.beginPath();
            ctx.arc(cometMapPos.x, cometMapPos.y, cometSize, 0, Math.PI * 2);
            ctx.fill();

            // Add bright center
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(cometMapPos.x, cometMapPos.y, cometSize * 0.5, 0, Math.PI * 2);
            ctx.fill();

            // Render stylized tail at medium zoom levels and above (like other detailed features)
            if (zoomLevel > 0.5) {
                this.renderCometTail(ctx, cometMapPos.x, cometMapPos.y, comet, zoomLevel);
            }

            // Add hover highlight if this comet is hovered (but not selected)
            if (hoveredComet === comet && selectedComet !== comet) {
                ctx.strokeStyle = currentPositionColor + '80'; // Semi-transparent amber
                ctx.lineWidth = 1;
                ctx.beginPath();
                const hoverRadius = cometSize + 3;
                ctx.arc(cometMapPos.x, cometMapPos.y, hoverRadius, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Add selection highlight if this comet is selected (takes precedence over hover)
            if (selectedComet === comet) {
                ctx.strokeStyle = currentPositionColor; // Full amber
                ctx.lineWidth = 2;
                const selectionRadius = cometSize + 4;
                ctx.beginPath();
                ctx.arc(cometMapPos.x, cometMapPos.y, selectionRadius, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.restore();

            // Render comet label if zoomed in enough or selected
            if (zoomLevel > 2.0 || selectedComet === comet) {
                this.renderCometLabel(ctx, comet, cometMapPos.x, cometMapPos.y);
            }
        }
    }

    private renderCometOrbit(
        ctx: CanvasRenderingContext2D,
        comet: CometLike,
        context: MapRenderContext,
        zoomLevel: number
    ): void {
        if (!comet.parentStarX || !comet.parentStarY) return;

        const starMapPos = this.worldToMapCoords(comet.parentStarX, comet.parentStarY, context);

        ctx.save();
        ctx.strokeStyle = '#444444'; // Subtle dark gray (same as planet orbits)
        ctx.lineWidth = 0.5; // Thin line (same as planet orbits)
        ctx.setLineDash([2, 3]); // Dashed line for orbit

        // If we have orbit data, render actual ellipse
        if (comet.orbit) {
            const orbit = comet.orbit;

            // Calculate ellipse parameters for map display
            const semiMajorAxis = orbit.semiMajorAxis * context.worldToMapScale;
            const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - orbit.eccentricity * orbit.eccentricity);

            // Calculate ellipse center (offset from star due to eccentricity)
            const focalDistance = orbit.eccentricity * semiMajorAxis;
            const ellipseCenterX = starMapPos.x - focalDistance * Math.cos(orbit.argumentOfPerihelion || 0);
            const ellipseCenterY = starMapPos.y - focalDistance * Math.sin(orbit.argumentOfPerihelion || 0);

            // Draw elliptical orbit
            ctx.beginPath();
            ctx.ellipse(
                ellipseCenterX,
                ellipseCenterY,
                semiMajorAxis,
                semiMinorAxis,
                orbit.argumentOfPerihelion || 0,
                0,
                Math.PI * 2
            );
            ctx.stroke();
        } else {
            // Fallback: draw circular orbit based on current distance
            const currentDistance = Math.sqrt(
                (comet.x - comet.parentStarX) ** 2 +
                (comet.y - comet.parentStarY) ** 2
            );
            const orbitRadius = currentDistance * context.worldToMapScale;

            ctx.beginPath();
            ctx.arc(starMapPos.x, starMapPos.y, orbitRadius, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    private renderCometTail(
        ctx: CanvasRenderingContext2D,
        cometMapX: number,
        cometMapY: number,
        comet: CometLike,
        zoomLevel: number
    ): void {
        // Calculate tail direction - if we have parent star data, use it, otherwise use a default direction
        let tailDirection: { x: number, y: number };
        if (comet.parentStarX !== undefined && comet.parentStarY !== undefined) {
            // Calculate direction from parent star to comet (tail points away from star)
            const dx = comet.x - comet.parentStarX;
            const dy = comet.y - comet.parentStarY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance === 0) return;
            tailDirection = { x: dx / distance, y: dy / distance };
        } else {
            // Default tail direction (pointing roughly away from galactic center)
            tailDirection = { x: 0.7, y: 0.7 }; // Default northeast direction
        }

        const tailLength = Math.min(15 * Math.sqrt(zoomLevel), 25); // Scale with zoom, smaller than before
        const tailColors = comet.cometType?.tailColors || ['#87CEEB', '#B0E0E6', '#E0FFFF'];

        ctx.save();

        // Render particle streams instead of single line (similar to main game)
        const streamCount = Math.max(2, Math.floor(zoomLevel * 2)); // 2-6 streams based on zoom
        const maxSpreadAngle = 0.3; // Fixed maximum spread angle in radians (~17 degrees total)

        for (let stream = 0; stream < streamCount; stream++) {
            // Distribute streams evenly within fixed angular spread
            const spreadFraction = streamCount > 1 ? stream / (streamCount - 1) : 0.5; // 0 to 1
            const spreadAngle = (spreadFraction - 0.5) * maxSpreadAngle; // Center around 0
            const streamAngle = Math.atan2(tailDirection.y, tailDirection.x) + spreadAngle;
            const streamDirX = Math.cos(streamAngle);
            const streamDirY = Math.sin(streamAngle);

            // Vary length slightly per stream
            const streamLength = tailLength * (0.8 + Math.random() * 0.4);
            const streamEndX = cometMapX + streamDirX * streamLength;
            const streamEndY = cometMapY + streamDirY * streamLength;

            // Create gradient for this stream
            const gradient = ctx.createLinearGradient(cometMapX, cometMapY, streamEndX, streamEndY);
            gradient.addColorStop(0, tailColors[0] + 'AA'); // 67% opacity at base
            gradient.addColorStop(0.5, tailColors[1] + '66'); // 40% opacity at middle
            gradient.addColorStop(1, tailColors[2] + '22'); // 13% opacity at tip

            // Draw stream as tapered line
            ctx.strokeStyle = gradient;
            ctx.lineWidth = Math.max(1, 2 * Math.sqrt(zoomLevel) / streamCount); // Thinner per stream
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(cometMapX, cometMapY);
            ctx.lineTo(streamEndX, streamEndY);
            ctx.stroke();
        }

        // Add subtle particle effects at higher zoom levels
        if (zoomLevel > 2.0) {
            this.renderCometParticles(ctx, cometMapX, cometMapY, tailDirection, tailLength, tailColors);
        }

        ctx.restore();
    }

    private renderCometParticles(
        ctx: CanvasRenderingContext2D,
        cometMapX: number,
        cometMapY: number,
        tailDirection: { x: number, y: number },
        tailLength: number,
        tailColors: string[]
    ): void {
        const particleCount = Math.floor(tailLength / 3); // Fewer particles for map view

        for (let i = 0; i < particleCount; i++) {
            const t = i / particleCount; // 0 to 1 along tail
            const particleX = cometMapX + tailDirection.x * tailLength * t;
            const particleY = cometMapY + tailDirection.y * tailLength * t;

            // Random offset for particle scatter
            const scatter = 2;
            const offsetX = particleX + (Math.random() - 0.5) * scatter;
            const offsetY = particleY + (Math.random() - 0.5) * scatter;

            // Fade opacity along tail
            const opacity = Math.floor((1 - t) * 100).toString(16).padStart(2, '0');
            const colorIndex = Math.floor(t * (tailColors.length - 1));

            ctx.fillStyle = tailColors[colorIndex] + opacity;
            ctx.beginPath();
            ctx.arc(offsetX, offsetY, 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    private renderCometLabel(
        ctx: CanvasRenderingContext2D,
        comet: CometLike,
        mapX: number,
        mapY: number
    ): void {
        ctx.save();

        // Use stored comet name or fallback based on comet type
        const displayName = comet.objectName || comet.cometType?.name || 'Comet';

        // Calculate offset position for scientific diagram style
        const offsetDistance = 20; // Distance from comet center
        const offsetAngle = Math.PI / 4; // 45 degrees (upper-right)

        // Calculate label position
        const labelX = mapX + Math.cos(offsetAngle) * offsetDistance;
        const labelY = mapY + Math.sin(offsetAngle) * offsetDistance;

        // Draw connecting line from comet edge to text
        ctx.strokeStyle = '#aaaaaa';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Start line from edge of comet (approximate size)
        const cometSize = 3; // Approximate comet visual size
        const lineStartX = mapX + Math.cos(offsetAngle) * (cometSize + 2);
        const lineStartY = mapY + Math.sin(offsetAngle) * (cometSize + 2);
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

    private calculateCometSize(zoomLevel: number): number {
        // Comets should be similar size to planets - small celestial objects
        // Match the planet size range of ~1.2-2.6 pixels
        const baseSize = 1.5; // Same base as planets

        if (zoomLevel <= 0.2) {
            // Galactic/Sector View: minimal size
            return Math.max(1, baseSize * 0.8); // ~1.2
        } else if (zoomLevel <= 1.0) {
            // Regional View: small but visible
            return Math.max(1, baseSize * 1.0); // ~1.5
        } else {
            // Local/Detail View: cap at planet size range
            return Math.max(1.5, Math.min(2.6, baseSize * (0.8 + zoomLevel * 0.3))); // Range: 1.5-2.6
        }
    }
}
