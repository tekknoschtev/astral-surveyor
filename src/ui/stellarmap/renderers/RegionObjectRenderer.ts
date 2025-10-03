// Region-specific object rendering for stellar map
// Extracted from stellarmap.ts for better code organization
// Handles: Rogue Planets, Dark Nebulae, Crystal Gardens, Protostars

import { BaseRenderer } from './BaseRenderer.js';
import type { MapRenderContext } from '../StellarMapTypes.js';
import type { NamingService } from '../../../naming/naming.js';

export class RegionObjectRenderer extends BaseRenderer {
    private namingService: NamingService | null = null;

    setNamingService(namingService: NamingService): void {
        this.namingService = namingService;
    }

    // ========== ROGUE PLANETS ==========

    renderDiscoveredRoguePlanets(
        context: MapRenderContext,
        discoveredRoguePlanets: any[],
        zoomLevel: number
    ): void {
        if (!discoveredRoguePlanets) return;

        const { ctx, mapX, mapY, mapWidth, mapHeight } = context;

        for (const roguePlanet of discoveredRoguePlanets) {
            const planetMapPos = this.worldToMapCoords(roguePlanet.x, roguePlanet.y, context);

            // Calculate rogue planet size (similar to regular planets but slightly larger)
            const baseSize = 2.5; // Slightly larger than regular planets
            const planetSize = Math.max(1.5, baseSize * Math.min(1.0, zoomLevel * 0.9));

            // Check if rogue planet is within map bounds (with margin for size)
            const margin = planetSize + 3;
            if (
                planetMapPos.x >= mapX - margin &&
                planetMapPos.x <= mapX + mapWidth + margin &&
                planetMapPos.y >= mapY - margin &&
                planetMapPos.y <= mapY + mapHeight + margin
            ) {
                ctx.save();

                // Get rogue planet color based on variant
                const planetColor = this.getRoguePlanetColor(roguePlanet.variant);

                // Draw glow effect for ice and volcanic variants
                if (roguePlanet.variant === 'ice' || roguePlanet.variant === 'volcanic') {
                    const glowColor = roguePlanet.variant === 'ice' ? '#E0FFFF' : '#FF4500';
                    const gradient = ctx.createRadialGradient(
                        planetMapPos.x,
                        planetMapPos.y,
                        planetSize,
                        planetMapPos.x,
                        planetMapPos.y,
                        planetSize * 1.8
                    );
                    gradient.addColorStop(0, glowColor + '40'); // 40 = ~25% opacity
                    gradient.addColorStop(1, glowColor + '00'); // Fully transparent

                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(planetMapPos.x, planetMapPos.y, planetSize * 1.8, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Draw main rogue planet body
                ctx.fillStyle = planetColor;
                ctx.beginPath();
                ctx.arc(planetMapPos.x, planetMapPos.y, planetSize, 0, Math.PI * 2);
                ctx.fill();

                // Add subtle outline to differentiate from regular planets
                ctx.strokeStyle = planetColor;
                ctx.lineWidth = 0.5;
                ctx.stroke();

                ctx.restore();
            }
        }
    }

    private getRoguePlanetColor(variant: 'ice' | 'rock' | 'volcanic'): string {
        switch (variant) {
            case 'ice':
                return '#B0E0E6'; // Light steel blue
            case 'volcanic':
                return '#8B0000'; // Dark red
            case 'rock':
            default:
                return '#696969'; // Dim gray
        }
    }

    // ========== DARK NEBULAE ==========

    renderDiscoveredDarkNebulae(
        context: MapRenderContext,
        discoveredDarkNebulae: any[],
        zoomLevel: number
    ): void {
        if (!discoveredDarkNebulae) return;

        const { ctx, mapX, mapY, mapWidth, mapHeight } = context;

        for (const darkNebula of discoveredDarkNebulae) {
            const nebulaMapPos = this.worldToMapCoords(darkNebula.x, darkNebula.y, context);

            // Calculate dark nebula size based on radius and zoom level
            const baseSize = Math.max(8, darkNebula.radius * context.worldToMapScale * 0.3); // Larger than planets
            const nebulaSize = Math.max(4, baseSize * Math.min(1.2, zoomLevel * 0.8));

            // Check if dark nebula is within map bounds (with margin for size)
            const margin = nebulaSize + 5;
            if (
                nebulaMapPos.x >= mapX - margin &&
                nebulaMapPos.x <= mapX + mapWidth + margin &&
                nebulaMapPos.y >= mapY - margin &&
                nebulaMapPos.y <= mapY + mapHeight + margin
            ) {
                ctx.save();

                // Get dark nebula color and opacity based on variant
                const nebulaColor = this.getDarkNebulaColor(darkNebula.variant);
                const occlusionStrength = darkNebula.occlusionStrength || 0.8;

                // Create gradient for dark nebula representation
                const gradient = ctx.createRadialGradient(
                    nebulaMapPos.x,
                    nebulaMapPos.y,
                    0,
                    nebulaMapPos.x,
                    nebulaMapPos.y,
                    nebulaSize
                );

                // Dark core fading to transparent edges
                gradient.addColorStop(0, nebulaColor + Math.floor(occlusionStrength * 255).toString(16).padStart(2, '0'));
                gradient.addColorStop(0.7, nebulaColor + Math.floor(occlusionStrength * 128).toString(16).padStart(2, '0'));
                gradient.addColorStop(1, nebulaColor + '00'); // Fully transparent

                // Draw dark nebula with irregular shape approximation
                ctx.fillStyle = gradient;
                if (darkNebula.shape === 'irregular') {
                    // Draw irregular shape with multiple overlapping circles
                    for (let i = 0; i < 3; i++) {
                        const offsetX = (Math.random() - 0.5) * nebulaSize * 0.4;
                        const offsetY = (Math.random() - 0.5) * nebulaSize * 0.4;
                        const circleSize = nebulaSize * (0.6 + Math.random() * 0.4);

                        ctx.beginPath();
                        ctx.arc(nebulaMapPos.x + offsetX, nebulaMapPos.y + offsetY, circleSize, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else {
                    // Draw circular shape
                    ctx.beginPath();
                    ctx.arc(nebulaMapPos.x, nebulaMapPos.y, nebulaSize, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Add subtle border to make it visible against dark backgrounds
                ctx.strokeStyle = nebulaColor + '80'; // 50% opacity border
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.restore();
            }
        }
    }

    private getDarkNebulaColor(variant: 'dense-core' | 'wispy' | 'globular'): string {
        switch (variant) {
            case 'dense-core':
                return '#2C1810'; // Very dark brown
            case 'wispy':
                return '#1A1A2E'; // Dark purple-blue
            case 'globular':
            default:
                return '#0F0F23'; // Very dark blue
        }
    }

    // ========== CRYSTAL GARDENS ==========

    renderDiscoveredCrystalGardens(
        context: MapRenderContext,
        discoveredCrystalGardens: any[],
        zoomLevel: number
    ): void {
        if (!discoveredCrystalGardens) return;

        const { ctx, mapX, mapY, mapWidth, mapHeight } = context;

        for (const crystalGarden of discoveredCrystalGardens) {
            const gardenMapPos = this.worldToMapCoords(crystalGarden.x, crystalGarden.y, context);

            // Calculate crystal garden size based on radius and zoom level
            const baseSize = Math.max(8, crystalGarden.radius * context.worldToMapScale * 0.4);
            const gardenSize = Math.max(4, baseSize * Math.min(1.2, zoomLevel * 0.8));

            // Check if crystal garden is within map bounds (with margin for size)
            const margin = gardenSize + 5;
            if (
                gardenMapPos.x >= mapX - margin &&
                gardenMapPos.x <= mapX + mapWidth + margin &&
                gardenMapPos.y >= mapY - margin &&
                gardenMapPos.y <= mapY + mapHeight + margin
            ) {
                ctx.save();

                // Get crystal garden colors based on variant
                const gardenColors = this.getCrystalGardenColors(crystalGarden.variant);

                // Create gradient for crystal garden representation
                const gradient = ctx.createRadialGradient(
                    gardenMapPos.x,
                    gardenMapPos.y,
                    0,
                    gardenMapPos.x,
                    gardenMapPos.y,
                    gardenSize
                );

                // Bright center fading to transparent edges
                gradient.addColorStop(0, gardenColors.primary + 'FF');
                gradient.addColorStop(0.3, gardenColors.primary + 'DD');
                gradient.addColorStop(0.7, gardenColors.secondary + '88');
                gradient.addColorStop(1, gardenColors.secondary + '00');

                // Draw crystal garden base
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(gardenMapPos.x, gardenMapPos.y, gardenSize, 0, Math.PI * 2);
                ctx.fill();

                // Add crystalline sparkle effects
                this.renderCrystalSparkles(ctx, gardenMapPos.x, gardenMapPos.y, gardenSize, gardenColors, crystalGarden);

                // Add border for visibility
                ctx.strokeStyle = gardenColors.primary + '80';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(gardenMapPos.x, gardenMapPos.y, gardenSize, 0, Math.PI * 2);
                ctx.stroke();

                // Check for selection and draw label if needed
                if (zoomLevel > 1.5) {
                    this.renderCrystalGardenLabel(ctx, crystalGarden, gardenMapPos.x, gardenMapPos.y);
                }

                ctx.restore();
            }
        }
    }

    private getCrystalGardenColors(variant: 'pure' | 'mixed' | 'rare-earth'): {primary: string, secondary: string} {
        switch (variant) {
            case 'pure':
                return { primary: '#E0F7FF', secondary: '#B3E5FC' };
            case 'mixed':
                return { primary: '#FFE0B3', secondary: '#FFCC80' };
            case 'rare-earth':
                return { primary: '#E1BEE7', secondary: '#CE93D8' };
            default:
                return { primary: '#E0F7FF', secondary: '#B3E5FC' };
        }
    }

    private renderCrystalSparkles(
        ctx: CanvasRenderingContext2D,
        centerX: number,
        centerY: number,
        size: number,
        colors: {primary: string, secondary: string},
        crystalGarden: any
    ): void {
        // Use deterministic sparkles based on world position
        const seed = Math.floor(crystalGarden.x + crystalGarden.y * 1000);
        const sparkleCount = Math.max(3, Math.floor(size * 0.3));

        for (let i = 0; i < sparkleCount; i++) {
            const pseudoRandom1 = Math.sin(seed + i * 1.618) * 0.5 + 0.5;
            const pseudoRandom2 = Math.sin(seed + i * 2.414) * 0.5 + 0.5;

            const angle = pseudoRandom1 * Math.PI * 2;
            const distance = pseudoRandom2 * size * 0.7;
            const sparkleX = centerX + Math.cos(angle) * distance;
            const sparkleY = centerY + Math.sin(angle) * distance;
            const sparkleSize = Math.max(1, size * 0.15);

            ctx.fillStyle = colors.primary + 'CC';
            ctx.beginPath();
            ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    private renderCrystalGardenLabel(
        ctx: CanvasRenderingContext2D,
        crystalGarden: any,
        gardenMapX: number,
        gardenMapY: number
    ): void {
        if (!this.namingService) return;

        const gardenName = this.namingService.generateDisplayName(crystalGarden);
        const labelY = gardenMapY + 20; // Position label below the garden

        // Label background
        const textMetrics = ctx.measureText(gardenName);
        const labelWidth = textMetrics.width + 8;
        const labelHeight = 16;
        const labelX = gardenMapX - labelWidth / 2;

        ctx.fillStyle = '#000000CC';
        ctx.fillRect(labelX, labelY - 12, labelWidth, labelHeight);

        // Label text
        ctx.fillStyle = '#E0F7FF';
        ctx.font = '10px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(gardenName, gardenMapX, labelY);
        ctx.textAlign = 'left'; // Reset alignment
    }

    // ========== PROTOSTARS ==========

    renderDiscoveredProtostars(
        context: MapRenderContext,
        discoveredProtostars: any[],
        selectedProtostar: any | null,
        hoveredProtostar: any | null,
        currentPositionColor: string,
        zoomLevel: number
    ): void {
        if (!discoveredProtostars) return;

        const { ctx, mapX, mapY, mapWidth, mapHeight } = context;

        for (const protostar of discoveredProtostars) {
            const protostarMapPos = this.worldToMapCoords(protostar.x, protostar.y, context);

            // Calculate protostar size based on radius and zoom level
            const baseSize = Math.max(10, protostar.radius * context.worldToMapScale * 0.5);
            const protostarSize = Math.max(6, baseSize * Math.min(1.3, zoomLevel * 0.9));

            // Check if protostar is within map bounds (with margin for jets)
            const margin = protostarSize + 20; // Extra margin for polar jets
            if (
                protostarMapPos.x >= mapX - margin &&
                protostarMapPos.x <= mapX + mapWidth + margin &&
                protostarMapPos.y >= mapY - margin &&
                protostarMapPos.y <= mapY + mapHeight + margin
            ) {
                ctx.save();

                // Get protostar colors based on variant
                const protostarColors = this.getProtostarColors(protostar.variant);

                // Draw polar jets first (background layer)
                if (protostar.variant === 'class-1' || protostar.variant === 'class-2') {
                    this.renderProtostarJets(ctx, protostarMapPos.x, protostarMapPos.y, protostarSize, protostarColors, protostar);
                }

                // Draw accretion disk
                this.renderProtostarDisk(ctx, protostarMapPos.x, protostarMapPos.y, protostarSize, protostarColors);

                // Create core gradient
                const coreGradient = ctx.createRadialGradient(
                    protostarMapPos.x,
                    protostarMapPos.y,
                    0,
                    protostarMapPos.x,
                    protostarMapPos.y,
                    protostarSize * 0.6
                );
                coreGradient.addColorStop(0, protostarColors.core);
                coreGradient.addColorStop(0.4, protostarColors.core + '80');
                coreGradient.addColorStop(1, protostarColors.core + '20');

                // Draw core
                ctx.fillStyle = coreGradient;
                ctx.beginPath();
                ctx.arc(protostarMapPos.x, protostarMapPos.y, protostarSize * 0.6, 0, Math.PI * 2);
                ctx.fill();

                // Add glow effect
                ctx.shadowColor = protostarColors.core;
                ctx.shadowBlur = protostarSize * 0.8;
                ctx.fillStyle = protostarColors.core + '40';
                ctx.beginPath();
                ctx.arc(protostarMapPos.x, protostarMapPos.y, protostarSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

                // Add hover highlight if this protostar is hovered (but not selected)
                if (hoveredProtostar === protostar && selectedProtostar !== protostar) {
                    ctx.strokeStyle = currentPositionColor + '80'; // Semi-transparent amber
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    const hoverRadius = Math.max(5, protostarSize + 1);
                    ctx.arc(protostarMapPos.x, protostarMapPos.y, hoverRadius, 0, Math.PI * 2);
                    ctx.stroke();
                }

                // Add selection highlight if this protostar is selected (takes precedence over hover)
                if (selectedProtostar === protostar) {
                    ctx.strokeStyle = currentPositionColor; // Full amber
                    ctx.lineWidth = 2;
                    const selectionRadius = protostarSize + 3;
                    ctx.beginPath();
                    ctx.arc(protostarMapPos.x, protostarMapPos.y, selectionRadius, 0, Math.PI * 2);
                    ctx.stroke();
                }

                // Check for selection and draw label if needed
                if (zoomLevel > 1.5) {
                    this.renderProtostarLabel(ctx, protostar, protostarMapPos.x, protostarMapPos.y);
                }

                ctx.restore();
            }
        }
    }

    private getProtostarColors(variant: 'class-0' | 'class-1' | 'class-2'): {core: string, jet: string, disk: string} {
        switch (variant) {
            case 'class-0':
                return { core: '#8B0000', jet: '#FF4500', disk: '#8B4513' };
            case 'class-1':
                return { core: '#FF4500', jet: '#FFD700', disk: '#CD853F' };
            case 'class-2':
                return { core: '#FFD700', jet: '#FFFF00', disk: '#F0E68C' };
            default:
                return { core: '#FF4500', jet: '#FFD700', disk: '#CD853F' };
        }
    }

    private renderProtostarJets(
        ctx: CanvasRenderingContext2D,
        centerX: number,
        centerY: number,
        size: number,
        colors: {core: string, jet: string, disk: string},
        protostar: any
    ): void {
        // Use deterministic angle based on world position
        const seed = Math.floor(protostar.x + protostar.y * 1000);
        const jetAngle = (seed % 360) * (Math.PI / 180);

        const jetLength = size * 3;
        const jetWidth = size * 0.3;

        // Draw two opposing jets
        for (let i = 0; i < 2; i++) {
            const angle = jetAngle + (i * Math.PI);
            const jetEndX = centerX + Math.cos(angle) * jetLength;
            const jetEndY = centerY + Math.sin(angle) * jetLength;

            // Create gradient for jet
            const jetGradient = ctx.createLinearGradient(centerX, centerY, jetEndX, jetEndY);
            jetGradient.addColorStop(0, colors.jet + '80');
            jetGradient.addColorStop(0.5, colors.jet + '40');
            jetGradient.addColorStop(1, colors.jet + '10');

            ctx.fillStyle = jetGradient;
            ctx.beginPath();
            ctx.ellipse(
                centerX + Math.cos(angle) * jetLength * 0.5,
                centerY + Math.sin(angle) * jetLength * 0.5,
                jetLength * 0.5,
                jetWidth,
                angle,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
    }

    private renderProtostarDisk(
        ctx: CanvasRenderingContext2D,
        centerX: number,
        centerY: number,
        size: number,
        colors: {core: string, jet: string, disk: string}
    ): void {
        const diskSize = size * 1.8;

        // Create disk gradient
        const diskGradient = ctx.createRadialGradient(
            centerX, centerY, size * 0.6,
            centerX, centerY, diskSize
        );
        diskGradient.addColorStop(0, 'transparent');
        diskGradient.addColorStop(0.3, colors.disk + '30');
        diskGradient.addColorStop(0.7, colors.disk + '60');
        diskGradient.addColorStop(1, colors.disk + '20');

        ctx.fillStyle = diskGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, diskSize, 0, Math.PI * 2);
        ctx.fill();
    }

    private renderProtostarLabel(
        ctx: CanvasRenderingContext2D,
        protostar: any,
        protostarMapX: number,
        protostarMapY: number
    ): void {
        if (!this.namingService) return;

        const protostarName = this.namingService.generateDisplayName(protostar);

        // Calculate offset position for scientific diagram style (same as other objects)
        const offsetDistance = 35; // Distance from protostar center
        const offsetAngle = -Math.PI / 6; // -30 degrees (upper-right)

        // Calculate label position
        const labelX = protostarMapX + Math.cos(offsetAngle) * offsetDistance;
        const labelY = protostarMapY + Math.sin(offsetAngle) * offsetDistance;

        // Draw connecting line from protostar edge to text
        ctx.strokeStyle = '#aaaaaa'; // Gray line like other objects
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Start line from edge of protostar (approximate size)
        const protostarSize = 10; // Approximate protostar visual size
        const lineStartX = protostarMapX + Math.cos(offsetAngle) * (protostarSize + 2);
        const lineStartY = protostarMapY + Math.sin(offsetAngle) * (protostarSize + 2);
        // End line just before the text starts
        const lineEndX = labelX - 5; // Small gap before text
        const lineEndY = labelY;
        ctx.moveTo(lineStartX, lineStartY);
        ctx.lineTo(lineEndX, lineEndY);
        ctx.stroke();

        // Set text properties like other objects
        ctx.font = '12px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Draw text background for readability (same as nebulae/crystal gardens)
        const textWidth = ctx.measureText(protostarName).width;
        const bgPadding = 3;
        ctx.fillStyle = '#000000B0';
        ctx.fillRect(labelX - bgPadding, labelY - 6, textWidth + bgPadding*2, 12);

        // Draw label text (same color as other objects)
        ctx.fillStyle = '#e8f4fd';
        ctx.fillText(protostarName, labelX, labelY);

        // Reset text alignment and baseline
        ctx.textBaseline = 'alphabetic';
    }
}
