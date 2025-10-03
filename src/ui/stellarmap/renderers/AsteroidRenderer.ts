// Asteroid garden rendering for stellar map
// Extracted from stellarmap.ts for better code organization

import { BaseRenderer } from './BaseRenderer.js';
import type { AsteroidGardenLike, MapRenderContext } from '../StellarMapTypes.js';
import type { NamingService } from '../../../naming/naming.js';

export class AsteroidRenderer extends BaseRenderer {
    private namingService: NamingService | null = null;

    setNamingService(namingService: NamingService): void {
        this.namingService = namingService;
    }

    renderDiscoveredAsteroidGardens(
        context: MapRenderContext,
        discoveredAsteroidGardens: AsteroidGardenLike[],
        selectedAsteroidGarden: AsteroidGardenLike | null,
        hoveredAsteroidGarden: AsteroidGardenLike | null,
        currentPositionColor: string,
        zoomLevel: number
    ): void {
        if (!discoveredAsteroidGardens) return;

        const { ctx, mapX, mapY, mapWidth, mapHeight } = context;

        for (const asteroidGarden of discoveredAsteroidGardens) {
            const gardenMapPos = this.worldToMapCoords(asteroidGarden.x, asteroidGarden.y, context);

            // Calculate asteroid garden size (smaller than nebulae, larger than planets)
            const baseSize = 4; // Smaller than nebulae (8), larger than planets (1.5-2.6)
            const gardenSize = Math.max(2, baseSize * Math.min(1.0, zoomLevel * 0.8));

            // Check if asteroid garden is within map bounds (with margin for size)
            const margin = gardenSize + 5;
            if (
                gardenMapPos.x >= mapX - margin &&
                gardenMapPos.x <= mapX + mapWidth + margin &&
                gardenMapPos.y >= mapY - margin &&
                gardenMapPos.y <= mapY + mapHeight + margin
            ) {
                // Get asteroid garden colors
                const gardenColors = this.getAsteroidGardenColors(asteroidGarden);

                ctx.save();

                // Draw asteroid garden as scattered dots with glitter effect
                this.renderAsteroidField(ctx, gardenMapPos.x, gardenMapPos.y, gardenSize, gardenColors, asteroidGarden.x, asteroidGarden.y);

                // Add selection highlight if this asteroid garden is selected
                if (selectedAsteroidGarden === asteroidGarden) {
                    ctx.strokeStyle = currentPositionColor;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    const highlightRadius = gardenSize + 2;
                    ctx.arc(gardenMapPos.x, gardenMapPos.y, highlightRadius, 0, Math.PI * 2);
                    ctx.stroke();
                }

                // Add hover highlight if this asteroid garden is hovered
                if (hoveredAsteroidGarden === asteroidGarden) {
                    ctx.strokeStyle = currentPositionColor + '80'; // Semi-transparent
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    const hoverRadius = gardenSize + 1;
                    ctx.arc(gardenMapPos.x, gardenMapPos.y, hoverRadius, 0, Math.PI * 2);
                    ctx.stroke();
                }

                ctx.restore();

                // Render asteroid garden label if zoomed in enough or selected
                if (zoomLevel > 2.0 || selectedAsteroidGarden === asteroidGarden) {
                    this.renderAsteroidGardenLabel(ctx, asteroidGarden, gardenMapPos.x, gardenMapPos.y);
                }
            }
        }
    }

    private renderAsteroidField(
        ctx: CanvasRenderingContext2D,
        centerX: number,
        centerY: number,
        size: number,
        colors: {rocks: string[], accents: string[]},
        worldX: number,
        worldY: number
    ): void {
        // Draw several small rocks scattered around the center point
        const rockCount = Math.max(4, Math.floor(size * 0.8)); // More rocks, better distribution
        const spreadRadius = size * 2.5; // Much wider spread

        // Use deterministic "randomness" based on WORLD position for consistent appearance across all map movements
        const seed = Math.floor(worldX + worldY * 1000);

        for (let i = 0; i < rockCount; i++) {
            // Create more spread out, less uniform distribution
            const pseudoRandom1 = Math.sin(seed + i * 1.618) * 0.5 + 0.5; // Golden ratio for better distribution
            const pseudoRandom2 = Math.sin(seed + i * 2.414) * 0.5 + 0.5; // Different multiplier for Y
            const pseudoRandom3 = Math.sin(seed + i * 3.142) * 0.5 + 0.5; // For size variation

            // Distribute rocks with more variation and spread
            const angle = (i / rockCount) * Math.PI * 2 + (pseudoRandom1 - 0.5) * Math.PI * 0.8; // More angular variation
            const distance = pseudoRandom2 * spreadRadius * (0.3 + pseudoRandom1 * 0.7); // Variable distance, some closer to center
            const rockX = centerX + Math.cos(angle) * distance;
            const rockY = centerY + Math.sin(angle) * distance;
            const rockSize = Math.max(1, size * (0.2 + pseudoRandom3 * 0.5)); // More size variation

            // Draw rock
            ctx.fillStyle = colors.rocks[i % colors.rocks.length];
            ctx.beginPath();
            ctx.arc(rockX, rockY, rockSize, 0, Math.PI * 2);
            ctx.fill();

            // Add occasional glitter effect (reduced frequency and more subtle)
            const glitterChance = 0.3; // Reduced from 70% to 30%
            const glitterRandom = Math.sin(seed + i * 5.678) * 0.5 + 0.5;
            if (glitterRandom < glitterChance) {
                const glitterX = rockX + (pseudoRandom1 - 0.5) * rockSize * 0.8;
                const glitterY = rockY + (pseudoRandom2 - 0.5) * rockSize * 0.8;
                const glitterSize = Math.max(0.3, rockSize * 0.2); // Smaller glitter

                // Use more subtle glitter colors (blend with rock color)
                const accentColor = colors.accents[Math.floor(pseudoRandom3 * colors.accents.length)];
                ctx.fillStyle = accentColor + '80'; // Add transparency for subtlety
                ctx.beginPath();
                ctx.arc(glitterX, glitterY, glitterSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    private getAsteroidGardenColors(asteroidGarden: AsteroidGardenLike): {rocks: string[], accents: string[]} {
        // Use colors from the asteroid garden type data if available
        if (asteroidGarden.gardenTypeData?.colors && asteroidGarden.gardenTypeData?.accentColors) {
            return {
                rocks: asteroidGarden.gardenTypeData.colors,
                accents: asteroidGarden.gardenTypeData.accentColors
            };
        }

        // Fallback colors based on garden type
        const colorSchemes: Record<string, {rocks: string[], accents: string[]}> = {
            metallic: {
                rocks: ['#8c8c8c', '#a0a0a0', '#7a7a7a'],
                accents: ['#ffffff', '#e6e6e6', '#d4d4d4']
            },
            carbonaceous: {
                rocks: ['#2d2d2d', '#404040', '#1a1a1a'],
                accents: ['#4a90e2', '#7bb3f0', '#a8c8ec']
            },
            crystalline: {
                rocks: ['#e6f3ff', '#d4e6f1', '#aed6f1'],
                accents: ['#ffffff', '#85c1e9', '#5dade2']
            },
            volcanic: {
                rocks: ['#8b4513', '#a0522d', '#d2691e'],
                accents: ['#ff4500', '#ff6347', '#ffa500']
            }
        };

        return colorSchemes[asteroidGarden.gardenType] || colorSchemes.metallic;
    }

    private renderAsteroidGardenLabel(
        ctx: CanvasRenderingContext2D,
        asteroidGarden: AsteroidGardenLike,
        gardenMapX: number,
        gardenMapY: number
    ): void {
        if (!this.namingService) return;

        const gardenName = asteroidGarden.objectName || this.namingService.generateDisplayName(asteroidGarden);

        // Calculate offset position for scientific diagram style
        const offsetDistance = 30; // Distance from garden center
        const offsetAngle = -Math.PI / 6; // -30 degrees (upper-right)

        // Calculate label position
        const labelX = gardenMapX + Math.cos(offsetAngle) * offsetDistance;
        const labelY = gardenMapY + Math.sin(offsetAngle) * offsetDistance;

        // Draw connecting line from garden edge to text
        ctx.strokeStyle = '#aaaaaa';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Start line from edge of asteroid garden (approximate size)
        const gardenSize = 10; // Approximate asteroid garden visual size
        const lineStartX = gardenMapX + Math.cos(offsetAngle) * (gardenSize + 2);
        const lineStartY = gardenMapY + Math.sin(offsetAngle) * (gardenSize + 2);
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
        const textWidth = ctx.measureText(gardenName).width;
        const bgPadding = 3;
        ctx.fillStyle = '#000000B0';
        ctx.fillRect(labelX - bgPadding, labelY - 6, textWidth + bgPadding*2, 12);

        // Draw label text
        ctx.fillStyle = '#e8f4fd';
        ctx.fillText(gardenName, labelX, labelY);

        // Reset text alignment and baseline
        ctx.textBaseline = 'alphabetic';
        ctx.restore();
    }
}
