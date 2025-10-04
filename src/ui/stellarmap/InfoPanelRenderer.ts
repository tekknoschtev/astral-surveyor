// Info panel rendering for stellar map
// Extracted from stellarmap.ts for better code organization
// Renders detailed information panels for selected celestial objects

import type { NamingService } from '../../naming/naming.js';

export class InfoPanelRenderer {
    private namingService: NamingService | null = null;

    setNamingService(namingService: NamingService): void {
        this.namingService = namingService;
    }

    // Helper method to draw standard panel background
    private drawPanelBackground(
        ctx: CanvasRenderingContext2D,
        panelX: number,
        panelY: number,
        panelWidth: number,
        panelHeight: number
    ): void {
        // Draw panel background
        ctx.fillStyle = '#000000E0';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        ctx.strokeStyle = '#2a3a4a';
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
    }

    // Helper method to setup panel text style
    private setupPanelTextStyle(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = '#b0c4d4';
        ctx.font = '12px "Courier New", monospace';
    }

    // ========== STAR INFO PANEL ==========

    renderStarInfoPanel(
        ctx: CanvasRenderingContext2D,
        canvas: HTMLCanvasElement,
        selectedStar: any
    ): void {
        if (!selectedStar || !this.namingService) return;

        // Generate full designation information
        const fullDesignation = this.namingService.generateFullDesignation(selectedStar);
        if (!fullDesignation) {
            console.warn('Could not generate designation for star:', selectedStar);
            return;
        }

        // Panel dimensions and position
        const panelWidth = 300;
        const panelHeight = 120;
        const panelX = canvas.width - panelWidth - 20;
        const panelY = 60;

        this.drawPanelBackground(ctx, panelX, panelY, panelWidth, panelHeight);
        this.setupPanelTextStyle(ctx);

        let lineY = panelY + 20;
        const lineHeight = 14;

        // Star designation
        ctx.fillText(`Designation: ${fullDesignation.catalog || 'Unknown'}`, panelX + 10, lineY);
        lineY += lineHeight;

        // Coordinate designation
        ctx.fillText(`Coordinates: ${fullDesignation.coordinate || 'Unknown'}`, panelX + 10, lineY);
        lineY += lineHeight;

        // Star type
        ctx.fillText(`Type: ${fullDesignation.type}`, panelX + 10, lineY);
        lineY += lineHeight;

        // Classification
        if (fullDesignation.classification) {
            ctx.fillText(`Class: ${fullDesignation.classification}`, panelX + 10, lineY);
            lineY += lineHeight;
        }

        // Position
        ctx.fillText(`Position: (${Math.round(selectedStar.x)}, ${Math.round(selectedStar.y)})`, panelX + 10, lineY);
        lineY += lineHeight;

        // Discovery timestamp if available
        if (selectedStar.timestamp) {
            const date = new Date(selectedStar.timestamp);
            const dateStr = date.toLocaleDateString();
            ctx.fillText(`Discovered: ${dateStr}`, panelX + 10, lineY);
        }
    }

    // Helper method to generate planet display name
    private generatePlanetDisplayName(planet: any): string {
        // Use stored planet name from discovery data if available
        if (planet.objectName) {
            return planet.objectName;
        }

        // Fallback to naming service if no stored name
        if (!this.namingService) {
            return `Planet ${planet.planetIndex + 1}`;
        }

        try {
            // Construct a planet object with the properties the naming service expects
            const mockParentStar = {
                x: planet.parentStarX,
                y: planet.parentStarY,
                type: 'star'
            };

            const mockPlanet = {
                type: 'planet',
                parentStar: mockParentStar,
                planetTypeName: planet.planetTypeName,
                planetIndex: planet.planetIndex,
                x: planet.x || planet.parentStarX, // Fallback to star position if planet position not available
                y: planet.y || planet.parentStarY
            };

            return this.namingService.generateDisplayName(mockPlanet);
        } catch (error) {
            console.warn('Failed to generate planet name:', error);
            return `Planet ${planet.planetIndex + 1}`;
        }
    }

    // Helper method to generate nebula display name
    private generateNebulaDisplayName(nebula: any): string {
        // Use stored nebula name from discovery data if available
        if (nebula.objectName) {
            return nebula.objectName;
        }

        // Fallback to naming service if no stored name
        if (!this.namingService) {
            return `Nebula`;
        }

        // Generate name using naming service
        try {
            return this.namingService.generateDisplayName(nebula);
        } catch (error) {
            console.warn('Failed to generate nebula name:', error);
            return `Nebula`;
        }
    }

    // Helper method to generate wormhole display name
    private generateWormholeDisplayName(wormhole: any): string {
        // Use stored wormhole name from discovery data if available
        if (wormhole.objectName) {
            return wormhole.objectName;
        }

        // Fallback to naming service if no stored name
        if (!this.namingService) {
            return `${wormhole.wormholeId}-${wormhole.designation === 'alpha' ? 'α' : 'β'}`;
        }

        const displayName = this.namingService.generateDisplayName(wormhole);
        return displayName || `${wormhole.wormholeId}-${wormhole.designation === 'alpha' ? 'α' : 'β'}`;
    }

    // Helper method to generate black hole display name
    private generateBlackHoleDisplayName(blackHole: any): string {
        // Use stored black hole name from discovery data if available
        if (blackHole.objectName) {
            return blackHole.objectName;
        }

        // Fallback based on black hole type
        if (blackHole.blackHoleTypeName === 'supermassive') {
            return 'Supermassive Black Hole';
        } else if (blackHole.blackHoleTypeName === 'stellar') {
            return 'Stellar Black Hole';
        } else {
            return 'Black Hole';
        }
    }

    // Helper method to generate comet display name
    private generateCometDisplayName(comet: any): string {
        // Use stored comet name from discovery data if available
        if (comet.objectName) {
            return comet.objectName;
        }

        // Fallback based on comet type
        if (comet.cometType?.name) {
            return comet.cometType.name;
        } else {
            return 'Comet';
        }
    }

    // Helper method to generate asteroid garden display name
    private generateAsteroidGardenDisplayName(asteroidGarden: any): string {
        // Use stored asteroid garden name from discovery data if available
        if (asteroidGarden.objectName) {
            return asteroidGarden.objectName;
        }

        // Fallback to naming service if no stored name
        if (!this.namingService) {
            return `Asteroid Garden`;
        }

        // Generate name using naming service
        try {
            return this.namingService.generateDisplayName(asteroidGarden);
        } catch (_error) {
            return `Asteroid Garden`;
        }
    }

    // Helper method to generate rogue planet display name
    private generateRoguePlanetDisplayName(roguePlanet: any): string {
        if (this.namingService) {
            return this.namingService.generateDisplayName(roguePlanet);
        }
        return `RP-Unknown`;
    }

    // Helper method to generate dark nebula display name
    private generateDarkNebulaDisplayName(darkNebula: any): string {
        if (!this.namingService) return 'Unknown Dark Nebula';

        // Use the naming service to generate a consistent name
        return this.namingService.generateDisplayName(darkNebula);
    }

    // ========== PLANET INFO PANEL ==========

    renderPlanetInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, selectedPlanet: any): void {
        if (!selectedPlanet || !this.namingService) return;

        // Panel dimensions and position
        const panelWidth = 300;
        const panelHeight = 120;
        const panelX = canvas.width - panelWidth - 20;
        const panelY = 60;

        this.drawPanelBackground(ctx, panelX, panelY, panelWidth, panelHeight);
        this.setupPanelTextStyle(ctx);

        let lineY = panelY + 20;
        const lineHeight = 14;

        // Planet designation using naming service
        const planetName = this.generatePlanetDisplayName(selectedPlanet);
        ctx.fillText(`Designation: ${planetName}`, panelX + 10, lineY);
        lineY += lineHeight;

        // Planet type
        ctx.fillText(`Type: ${selectedPlanet.planetTypeName}`, panelX + 10, lineY);
        lineY += lineHeight;

        // Parent star coordinates
        ctx.fillText(`Orbits Star: (${Math.round(selectedPlanet.parentStarX)}, ${Math.round(selectedPlanet.parentStarY)})`, panelX + 10, lineY);
        lineY += lineHeight;

        // Planet position (if available)
        if (selectedPlanet.x !== null && selectedPlanet.y !== null) {
            ctx.fillText(`Position: (${Math.round(selectedPlanet.x)}, ${Math.round(selectedPlanet.y)})`, panelX + 10, lineY);
            lineY += lineHeight;
        }

        // Discovery timestamp if available
        if (selectedPlanet.timestamp) {
            const date = new Date(selectedPlanet.timestamp);
            const dateStr = date.toLocaleDateString();
            ctx.fillText(`Discovered: ${dateStr}`, panelX + 10, lineY);
        }
    }

    // ========== PLACEHOLDER METHODS (will be implemented) ==========
    // These will be filled in with the actual implementations from stellarmap.ts

    renderNebulaInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, selectedNebula: any): void {
        if (!selectedNebula || !this.namingService) return;

        // Panel dimensions and position
        const panelWidth = 300;
        const panelHeight = 120;
        const panelX = canvas.width - panelWidth - 20;
        const panelY = 60;

        this.drawPanelBackground(ctx, panelX, panelY, panelWidth, panelHeight);
        this.setupPanelTextStyle(ctx);

        let lineY = panelY + 20;
        const lineHeight = 14;

        // Nebula designation using naming service
        const nebulaName = this.generateNebulaDisplayName(selectedNebula);
        ctx.fillText(`Designation: ${nebulaName}`, panelX + 10, lineY);
        lineY += lineHeight;

        // Nebula type
        ctx.fillText(`Type: ${selectedNebula.nebulaType}`, panelX + 10, lineY);
        lineY += lineHeight;

        // Nebula position
        if (selectedNebula.x !== null && selectedNebula.y !== null) {
            ctx.fillText(`Position: (${Math.round(selectedNebula.x)}, ${Math.round(selectedNebula.y)})`, panelX + 10, lineY);
            lineY += lineHeight;
        }

        // Discovery timestamp if available
        if (selectedNebula.timestamp) {
            const date = new Date(selectedNebula.timestamp);
            const dateStr = date.toLocaleDateString();
            ctx.fillText(`Discovered: ${dateStr}`, panelX + 10, lineY);
        }
    }

    renderWormholeInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, selectedWormhole: any): void {
        if (!selectedWormhole || !this.namingService) return;

        // Panel dimensions and position (same as other panels)
        const panelWidth = 300;
        const panelHeight = 140; // Slightly taller for wormhole-specific info
        const panelX = canvas.width - panelWidth - 20;
        const panelY = 60;

        this.drawPanelBackground(ctx, panelX, panelY, panelWidth, panelHeight);
        this.setupPanelTextStyle(ctx);

        let lineY = panelY + 20;
        const lineHeight = 14;

        // Wormhole designation
        const wormholeName = this.generateWormholeDisplayName(selectedWormhole);
        ctx.fillText(`Designation: ${wormholeName}`, panelX + 10, lineY);
        lineY += lineHeight;

        // Wormhole type and designation
        const designation = selectedWormhole.designation === 'alpha' ? 'α (Primary)' : 'β (Secondary)';
        ctx.fillText(`Type: Stable Traversable (${designation})`, panelX + 10, lineY);
        lineY += lineHeight;

        // Twin coordinates
        ctx.fillText(`Twin Location: (${Math.round(selectedWormhole.twinX)}, ${Math.round(selectedWormhole.twinY)})`, panelX + 10, lineY);
        lineY += lineHeight;

        // Current position
        ctx.fillText(`Position: (${Math.round(selectedWormhole.x)}, ${Math.round(selectedWormhole.y)})`, panelX + 10, lineY);
        lineY += lineHeight;

        // Wormhole ID (for scientific reference)
        ctx.fillText(`ID: ${selectedWormhole.wormholeId}`, panelX + 10, lineY);
        lineY += lineHeight;

        // Discovery timestamp if available
        if (selectedWormhole.timestamp) {
            const date = new Date(selectedWormhole.timestamp);
            const dateStr = date.toLocaleDateString();
            ctx.fillText(`Discovered: ${dateStr}`, panelX + 10, lineY);
        }
    }

    renderBlackHoleInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, selectedBlackHole: any): void {
        if (!selectedBlackHole || !this.namingService) return;

        // Panel dimensions and position (consistent with other panels)
        const panelWidth = 300;
        const panelHeight = 140;
        const panelX = canvas.width - panelWidth - 20;
        const panelY = 60;

        // Draw panel background (consistent with other panels)
        ctx.save();
        this.drawPanelBackground(ctx, panelX, panelY, panelWidth, panelHeight);

        // Setup text
        ctx.font = '12px monospace';
        ctx.fillStyle = '#FFFFFF';
        let lineY = panelY + 20;
        const lineHeight = 18;

        // Black hole designation
        const blackHoleName = this.generateBlackHoleDisplayName(selectedBlackHole);
        ctx.fillText(`Designation: ${blackHoleName}`, panelX + 10, lineY);
        lineY += lineHeight;

        // Black hole type with scientific description
        let typeDescription = selectedBlackHole.blackHoleTypeName;
        if (selectedBlackHole.blackHoleTypeName === 'supermassive') {
            typeDescription = 'Supermassive (10⁶-10¹⁰ M☉)';
        } else if (selectedBlackHole.blackHoleTypeName === 'stellar') {
            typeDescription = 'Stellar-mass (3-30 M☉)';
        }
        ctx.fillText(`Type: ${typeDescription}`, panelX + 10, lineY);
        lineY += lineHeight;

        // Gravitational influence note
        ctx.fillText(`Event Horizon: Active`, panelX + 10, lineY);
        lineY += lineHeight;

        // Black hole position
        ctx.fillText(`Position: (${Math.round(selectedBlackHole.x)}, ${Math.round(selectedBlackHole.y)})`, panelX + 10, lineY);
        lineY += lineHeight;

        // Discovery timestamp if available
        if (selectedBlackHole.timestamp) {
            const date = new Date(selectedBlackHole.timestamp);
            const dateStr = date.toLocaleDateString();
            ctx.fillText(`Discovered: ${dateStr}`, panelX + 10, lineY);
        }

        ctx.restore();
    }

    renderCometInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, selectedComet: any): void {
        if (!selectedComet || !this.namingService) return;

        // Panel dimensions and position (consistent with other panels)
        const panelWidth = 320;
        const panelHeight = 140;
        const panelX = canvas.width - panelWidth - 20;
        const panelY = 60;

        this.drawPanelBackground(ctx, panelX, panelY, panelWidth, panelHeight);

        // Panel content
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px "Courier New", monospace';

        let lineY = panelY + 20;
        const lineHeight = 18;

        // Comet designation
        const cometName = this.generateCometDisplayName(selectedComet);
        ctx.fillText(`Designation: ${cometName}`, panelX + 10, lineY);
        lineY += lineHeight;

        // Comet type
        const cometTypeName = selectedComet.cometType?.name || 'Unknown Comet';
        ctx.fillText(`Type: ${cometTypeName}`, panelX + 10, lineY);
        lineY += lineHeight;

        // Orbital characteristics if available
        if (selectedComet.parentStarX !== undefined && selectedComet.parentStarY !== undefined) {
            const distance = Math.sqrt(
                (selectedComet.x - selectedComet.parentStarX) ** 2 +
                (selectedComet.y - selectedComet.parentStarY) ** 2
            );
            ctx.fillText(`Current Distance: ${distance.toFixed(1)} AU`, panelX + 10, lineY);
            lineY += lineHeight;

            // Show orbital data if available
            if ((selectedComet as any).orbit) {
                const orbit = (selectedComet as any).orbit;
                ctx.fillText(`Eccentricity: ${orbit.eccentricity.toFixed(3)}`, panelX + 10, lineY);
                lineY += lineHeight;
            }
        }

        // Composition note
        ctx.fillText(`Composition: Ice and Rock`, panelX + 10, lineY);
        lineY += lineHeight;

        // Comet position
        ctx.fillText(`Position: (${Math.round(selectedComet.x)}, ${Math.round(selectedComet.y)})`, panelX + 10, lineY);
        lineY += lineHeight;

        // Discovery timestamp if available
        if (selectedComet.timestamp) {
            const date = new Date(selectedComet.timestamp);
            const dateStr = date.toLocaleDateString();
            ctx.fillText(`Discovered: ${dateStr}`, panelX + 10, lineY);
        }
    }

    renderAsteroidGardenInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, selectedAsteroidGarden: any): void {
        if (!selectedAsteroidGarden || !this.namingService) return;

        // Panel dimensions and position (same as other panels)
        const panelWidth = 300;
        const panelHeight = 120;
        const panelX = canvas.width - panelWidth - 20;
        const panelY = 60;

        this.drawPanelBackground(ctx, panelX, panelY, panelWidth, panelHeight);
        this.setupPanelTextStyle(ctx);

        let lineY = panelY + 20;
        const lineHeight = 14;

        // Asteroid garden designation
        const gardenName = this.generateAsteroidGardenDisplayName(selectedAsteroidGarden);
        ctx.fillText(`Designation: ${gardenName}`, panelX + 10, lineY);
        lineY += lineHeight;

        // Garden type
        const gardenTypeName = selectedAsteroidGarden.gardenTypeData?.name || selectedAsteroidGarden.gardenType;
        ctx.fillText(`Type: ${gardenTypeName}`, panelX + 10, lineY);
        lineY += lineHeight;

        // Garden position
        ctx.fillText(`Position: (${selectedAsteroidGarden.x.toFixed(0)}, ${selectedAsteroidGarden.y.toFixed(0)})`, panelX + 10, lineY);
        lineY += lineHeight;

        // Discovery timestamp if available
        if (selectedAsteroidGarden.timestamp) {
            const date = new Date(selectedAsteroidGarden.timestamp);
            const dateStr = date.toLocaleDateString();
            ctx.fillText(`Discovered: ${dateStr}`, panelX + 10, lineY);
        }
    }

    renderRoguePlanetInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, selectedRoguePlanet: any): void {
        if (!selectedRoguePlanet || !this.namingService) return;

        // Panel dimensions and position (same as other panels)
        const panelWidth = 300;
        const panelHeight = 120;
        const panelX = canvas.width - panelWidth - 20;
        const panelY = 60;

        this.drawPanelBackground(ctx, panelX, panelY, panelWidth, panelHeight);
        this.setupPanelTextStyle(ctx);

        let lineY = panelY + 20;
        const lineHeight = 14;

        // Rogue planet designation
        const roguePlanetName = this.generateRoguePlanetDisplayName(selectedRoguePlanet);
        ctx.fillText(`Designation: ${roguePlanetName}`, panelX + 10, lineY);
        lineY += lineHeight;

        // Rogue planet variant/type
        const variantName = selectedRoguePlanet.variant ?
            selectedRoguePlanet.variant.charAt(0).toUpperCase() + selectedRoguePlanet.variant.slice(1) + ' Rogue Planet' :
            'Rogue Planet';
        ctx.fillText(`Type: ${variantName}`, panelX + 10, lineY);
        lineY += lineHeight;

        // Orbital status
        ctx.fillText(`Status: Unbound (No Parent Star)`, panelX + 10, lineY);
        lineY += lineHeight;

        // Position
        ctx.fillText(`Position: (${Math.round(selectedRoguePlanet.x)}, ${Math.round(selectedRoguePlanet.y)})`, panelX + 10, lineY);
        lineY += lineHeight;

        // Discovery timestamp if available
        if (selectedRoguePlanet.timestamp) {
            const date = new Date(selectedRoguePlanet.timestamp);
            const dateStr = date.toLocaleDateString();
            ctx.fillText(`Discovered: ${dateStr}`, panelX + 10, lineY);
        }
    }

    renderDarkNebulaInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, selectedDarkNebula: any): void {
        if (!selectedDarkNebula || !this.namingService) return;

        // Panel dimensions and position (same as other panels)
        const panelWidth = 300;
        const panelHeight = 120;
        const panelX = canvas.width - panelWidth - 20;
        const panelY = 60;

        this.drawPanelBackground(ctx, panelX, panelY, panelWidth, panelHeight);
        this.setupPanelTextStyle(ctx);

        let lineY = panelY + 20;
        const lineHeight = 14;

        // Dark nebula designation
        const darkNebulaName = this.generateDarkNebulaDisplayName(selectedDarkNebula);
        ctx.fillText(`Designation: ${darkNebulaName}`, panelX + 10, lineY);
        lineY += lineHeight;

        // Dark nebula variant/type
        const variantName = selectedDarkNebula.variant ?
            selectedDarkNebula.variant.charAt(0).toUpperCase() + selectedDarkNebula.variant.slice(1).replace('-', ' ') + ' Dark Nebula' :
            'Dark Nebula';
        ctx.fillText(`Type: ${variantName}`, panelX + 10, lineY);
        lineY += lineHeight;

        // Special property: Star occlusion
        const occlusionPercent = Math.round((selectedDarkNebula.occlusionStrength || 0.8) * 100);
        ctx.fillText(`Star Occlusion: ${occlusionPercent}%`, panelX + 10, lineY);
        lineY += lineHeight;

        // Position
        ctx.fillText(`Position: (${Math.round(selectedDarkNebula.x)}, ${Math.round(selectedDarkNebula.y)})`, panelX + 10, lineY);
        lineY += lineHeight;

        // Discovery timestamp if available
        if (selectedDarkNebula.timestamp) {
            const date = new Date(selectedDarkNebula.timestamp);
            const dateStr = date.toLocaleDateString();
            ctx.fillText(`Discovered: ${dateStr}`, panelX + 10, lineY);
        }
    }

    renderCrystalGardenInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, selectedCrystalGarden: any): void {
        if (!selectedCrystalGarden || !this.namingService) return;

        // Panel dimensions and position (same as other panels)
        const panelWidth = 300;
        const panelHeight = 140;
        const panelX = canvas.width - panelWidth - 20;
        const panelY = 60;

        this.drawPanelBackground(ctx, panelX, panelY, panelWidth, panelHeight);
        this.setupPanelTextStyle(ctx);

        let lineY = panelY + 20;
        const lineHeight = 14;

        // Crystal garden designation
        const gardenName = this.namingService.generateDisplayName(selectedCrystalGarden);
        ctx.fillText(`Designation: ${gardenName}`, panelX + 10, lineY);
        lineY += lineHeight;

        // Crystal garden variant/type
        const variantName = selectedCrystalGarden.variant ?
            selectedCrystalGarden.variant.charAt(0).toUpperCase() + selectedCrystalGarden.variant.slice(1).replace('-', ' ') + ' Crystal Garden' :
            'Crystal Garden';
        ctx.fillText(`Type: ${variantName}`, panelX + 10, lineY);
        lineY += lineHeight;

        // Special properties: Crystal count and refraction index
        const crystalCount = selectedCrystalGarden.crystalCount || 'Unknown';
        ctx.fillText(`Crystal Formations: ${crystalCount}`, panelX + 10, lineY);
        lineY += lineHeight;

        const refractionIndex = selectedCrystalGarden.refractionIndex || 'Unknown';
        ctx.fillText(`Refraction Index: ${refractionIndex}`, panelX + 10, lineY);
        lineY += lineHeight;

        // Primary mineral composition
        const primaryMineral = selectedCrystalGarden.primaryMineral || 'Unknown';
        ctx.fillText(`Primary Mineral: ${primaryMineral}`, panelX + 10, lineY);
        lineY += lineHeight;

        // Position
        ctx.fillText(`Position: (${Math.round(selectedCrystalGarden.x)}, ${Math.round(selectedCrystalGarden.y)})`, panelX + 10, lineY);
        lineY += lineHeight;

        // Discovery timestamp if available
        if (selectedCrystalGarden.timestamp) {
            const date = new Date(selectedCrystalGarden.timestamp);
            const dateStr = date.toLocaleDateString();
            ctx.fillText(`Discovered: ${dateStr}`, panelX + 10, lineY);
        }
    }

    renderProtostarInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, selectedProtostar: any): void {
        if (!selectedProtostar || !this.namingService) return;

        // Panel dimensions and position (same as other panels)
        const panelWidth = 300;
        const panelHeight = 140;
        const panelX = canvas.width - panelWidth - 20;
        const panelY = 60;

        this.drawPanelBackground(ctx, panelX, panelY, panelWidth, panelHeight);
        this.setupPanelTextStyle(ctx);

        let lineY = panelY + 20;
        const lineHeight = 14;

        // Protostar designation
        const protostarName = this.namingService.generateDisplayName(selectedProtostar);
        ctx.fillText(`Designation: ${protostarName}`, panelX + 10, lineY);
        lineY += lineHeight;

        // Stellar classification
        const classification = selectedProtostar.stellarClassification || 'Unknown';
        ctx.fillText(`Classification: ${classification}`, panelX + 10, lineY);
        lineY += lineHeight;

        // Protostar variant/evolutionary stage
        const variantName = selectedProtostar.variant ?
            `Class ${selectedProtostar.variant.split('-')[1]} Protostar` :
            'Protostar';
        ctx.fillText(`Type: ${variantName}`, panelX + 10, lineY);
        lineY += lineHeight;

        // Core temperature
        const temperature = selectedProtostar.coreTemperature || 'Unknown';
        ctx.fillText(`Core Temperature: ${temperature}K`, panelX + 10, lineY);
        lineY += lineHeight;

        // Special properties based on variant
        if (selectedProtostar.variant === 'class-1' || selectedProtostar.variant === 'class-2') {
            ctx.fillText(`Features: Polar Jets Active`, panelX + 10, lineY);
        } else {
            ctx.fillText(`Features: Accretion Disk`, panelX + 10, lineY);
        }
        lineY += lineHeight;

        // Position
        ctx.fillText(`Position: (${Math.round(selectedProtostar.x)}, ${Math.round(selectedProtostar.y)})`, panelX + 10, lineY);
        lineY += lineHeight;

        // Discovery timestamp if available
        if (selectedProtostar.discoveryTimestamp) {
            const date = new Date(selectedProtostar.discoveryTimestamp);
            const dateStr = date.toLocaleDateString();
            ctx.fillText(`Discovered: ${dateStr}`, panelX + 10, lineY);
        }
    }
}
