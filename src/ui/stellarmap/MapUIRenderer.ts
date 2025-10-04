// MapUIRenderer for StellarMap
// Handles map overlay UI rendering (title, zoom, coordinates)

export class MapUIRenderer {
    private titleText: string;
    private textColor: string;
    private fontFamily: string;

    constructor(
        titleText: string = 'Stellar Map',
        textColor: string = '#b0c4d4',
        fontFamily: string = '12px "Courier New", monospace'
    ) {
        this.titleText = titleText;
        this.textColor = textColor;
        this.fontFamily = fontFamily;
    }

    /**
     * Update visual settings
     */
    setTitleText(text: string): void {
        this.titleText = text;
    }

    setTextColor(color: string): void {
        this.textColor = color;
    }

    setFontFamily(font: string): void {
        this.fontFamily = font;
    }

    /**
     * Render map UI overlay (title, zoom info, coordinates)
     */
    renderMapOverlay(
        ctx: CanvasRenderingContext2D,
        canvas: HTMLCanvasElement,
        zoomLevel: number,
        centerX: number,
        centerY: number
    ): void {
        // Set font to match game UI
        ctx.font = this.fontFamily;
        ctx.fillStyle = this.textColor;

        // Title
        const titleWidth = ctx.measureText(this.titleText).width;
        ctx.fillText(this.titleText, (canvas.width - titleWidth) / 2, 30);

        // Zoom info with descriptive labels
        const zoomLabel = this.getZoomLabel(zoomLevel);
        const zoomText = `Zoom: ${zoomLevel.toFixed(2)}x (${zoomLabel})`;
        const zoomWidth = ctx.measureText(zoomText).width;
        ctx.fillText(zoomText, canvas.width - zoomWidth - 20, canvas.height - 65);

        // Center coordinates
        const coordText = `Center: (${Math.round(centerX)}, ${Math.round(centerY)})`;
        const coordWidth = ctx.measureText(coordText).width;
        ctx.fillText(coordText, canvas.width - coordWidth - 20, canvas.height - 50);
    }

    /**
     * Get descriptive zoom level label
     */
    private getZoomLabel(zoomLevel: number): string {
        if (zoomLevel <= 0.05) {
            return 'Galactic View';
        } else if (zoomLevel <= 0.2) {
            return 'Sector View';
        } else if (zoomLevel <= 1.0) {
            return 'Regional View';
        } else if (zoomLevel <= 3.0) {
            return 'Local View';
        } else {
            return 'Detail View';
        }
    }
}
