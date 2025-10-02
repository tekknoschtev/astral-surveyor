// Planet rendering for stellar map
// Extracted from stellarmap.ts for better code organization

import { BaseRenderer } from './BaseRenderer.js';
import type { PlanetLike, MapRenderContext } from '../StellarMapTypes.js';

export class PlanetRenderer extends BaseRenderer {
    private static readonly PLANET_COLORS: Record<string, string> = {
        'Rocky Planet': '#8B4513',
        'Ocean World': '#4169E1',
        'Gas Giant': '#DAA520',
        'Desert World': '#FFE4B5',
        'Frozen World': '#87CEEB',
        'Volcanic World': '#DC143C',
        'Exotic World': '#DA70D6'
    };

    renderDiscoveredPlanets(
        context: MapRenderContext,
        discoveredPlanets: PlanetLike[],
        selectedPlanet: PlanetLike | null,
        hoveredPlanet: PlanetLike | null,
        currentPositionColor: string
    ): void {
        if (!discoveredPlanets) return;

        const { ctx, mapX, mapY, mapWidth, mapHeight, worldToMapScale, centerX, centerY } = context;

        // Group planets by their parent star for orbital rendering
        const planetsByStarId = new Map<string, PlanetLike[]>();

        for (const planet of discoveredPlanets) {
            // Only process planets that have current position data (are in active chunks)
            if (planet.x === null || planet.y === null) continue;

            const starId = `${planet.parentStarX}_${planet.parentStarY}`;
            if (!planetsByStarId.has(starId)) {
                planetsByStarId.set(starId, []);
            }
            planetsByStarId.get(starId)!.push(planet);
        }

        // Render orbital systems
        for (const [starId, planets] of planetsByStarId) {
            const [starX, starY] = starId.split('_').map(parseFloat);
            const starMapPos = this.worldToMapCoords(starX, starY, context);

            // Check if star system is within extended map bounds
            const systemMargin = 200 * worldToMapScale; // Allow for large orbital systems
            if (
                starMapPos.x >= mapX - systemMargin &&
                starMapPos.x <= mapX + mapWidth + systemMargin &&
                starMapPos.y >= mapY - systemMargin &&
                starMapPos.y <= mapY + mapHeight + systemMargin
            ) {
                // Draw orbital circles for each planet
                this.renderOrbitalCircles(ctx, starMapPos.x, starMapPos.y, planets, context);

                // Draw planets on their orbits
                for (const planet of planets) {
                    const planetMapPos = this.worldToMapCoords(planet.x!, planet.y!, context);

                    // Calculate proportional planet size (smaller than stars)
                    const planetSize = this.calculatePlanetSize(planet);

                    // Get planet color based on type
                    const planetColor = this.getPlanetColor(planet);

                    // Draw planet as circle
                    this.drawCircularObject(ctx, planetMapPos.x, planetMapPos.y, planetSize, planetColor);

                    // Add subtle outline to differentiate from stars
                    ctx.save();
                    ctx.strokeStyle = planetColor;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.arc(planetMapPos.x, planetMapPos.y, planetSize, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();

                    // Add hover highlight if this planet is hovered (but not selected)
                    if (hoveredPlanet === planet && selectedPlanet !== planet) {
                        this.drawHoverHighlight(ctx, planetMapPos.x, planetMapPos.y, planetSize + 0.5, currentPositionColor + '80');
                    }

                    // Add selection highlight if this planet is selected (takes precedence over hover)
                    if (selectedPlanet === planet) {
                        this.drawSelectionHighlight(ctx, planetMapPos.x, planetMapPos.y, planetSize + 1, currentPositionColor);
                    }
                }
            }
        }
    }

    private renderOrbitalCircles(
        ctx: CanvasRenderingContext2D,
        starMapX: number,
        starMapY: number,
        planets: PlanetLike[],
        context: MapRenderContext
    ): void {
        const { mapX, mapY, mapWidth, mapHeight, centerX, centerY, worldToMapScale } = context;

        // Calculate unique orbital radii for this star system based on actual map positions
        const orbitalRadii = new Set<number>();

        for (const planet of planets) {
            // Calculate the planet's actual position on the map
            const planetMapPos = this.worldToMapCoords(planet.x!, planet.y!, context);

            // Calculate orbital radius directly from map coordinates
            const mapOrbitalRadius = Math.sqrt(
                Math.pow(planetMapPos.x - starMapX, 2) +
                    Math.pow(planetMapPos.y - starMapY, 2)
            );
            orbitalRadii.add(Math.round(mapOrbitalRadius)); // Round to avoid duplicate very close orbits
        }

        // Draw orbital circles
        ctx.save();
        ctx.strokeStyle = '#444444'; // Subtle dark gray
        ctx.lineWidth = 0.5;
        ctx.setLineDash([2, 3]); // Dashed line for subtle effect

        for (const radius of orbitalRadii) {
            // Only draw orbits that are reasonably visible and not too large
            if (radius > 2 && radius < 500) {
                ctx.beginPath();
                ctx.arc(starMapX, starMapY, radius, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Reset line dash for other rendering
        ctx.setLineDash([]);
        ctx.restore();
    }

    private calculatePlanetSize(planet: PlanetLike): number {
        // Get the planet's size multiplier from its planet type (default 1.0 if not available)
        const sizeMultiplier = planet.planetType?.sizeMultiplier || 1.0;

        // Base size for planets (smaller than stars)
        const baseSize = 1.5;

        // Scale planet size based on type, but keep them smaller than stars
        return Math.max(1, baseSize * (0.8 + sizeMultiplier * 0.4)); // Range: ~1.2-2.6
    }

    private getPlanetColor(planet: PlanetLike): string {
        // Use planet type colors if available, otherwise default
        if (planet.planetType && planet.planetType.colors) {
            return planet.planetType.colors[0]; // Use first color from palette
        }
        // Fallback colors based on planet type name
        return PlanetRenderer.PLANET_COLORS[planet.planetTypeName] || '#888888';
    }
}
