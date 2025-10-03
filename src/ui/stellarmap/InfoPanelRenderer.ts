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
        if (!selected

Star || !this.namingService) return;

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

    // ========== PLACEHOLDER METHODS (will be implemented) ==========
    // These will be filled in with the actual implementations from stellarmap.ts

    renderPlanetInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, selectedPlanet: any): void {
        // TODO: Extract from stellarmap.ts
    }

    renderNebulaInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, selectedNebula: any): void {
        // TODO: Extract from stellarmap.ts
    }

    renderWormholeInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, selectedWormhole: any): void {
        // TODO: Extract from stellarmap.ts
    }

    renderBlackHoleInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, selectedBlackHole: any): void {
        // TODO: Extract from stellarmap.ts
    }

    renderCometInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, selectedComet: any): void {
        // TODO: Extract from stellarmap.ts
    }

    renderAsteroidGardenInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, selectedAsteroidGarden: any): void {
        // TODO: Extract from stellarmap.ts
    }

    renderRoguePlanetInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, selectedRoguePlanet: any): void {
        // TODO: Extract from stellarmap.ts
    }

    renderDarkNebulaInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, selectedDarkNebula: any): void {
        // TODO: Extract from stellarmap.ts
    }

    renderCrystalGardenInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, selectedCrystalGarden: any): void {
        // TODO: Extract from stellarmap.ts
    }

    renderProtostarInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, selectedProtostar: any): void {
        // TODO: Extract from stellarmap.ts
    }
}
