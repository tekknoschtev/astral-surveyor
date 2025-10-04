// GridRenderer for StellarMap
// Handles coordinate grid rendering with adaptive sizing based on zoom level

export class GridRenderer {
    private gridSize: number;
    private gridColor: string;

    constructor(gridSize: number = 2000, gridColor: string = '#2a3a4a40') {
        this.gridSize = gridSize;
        this.gridColor = gridColor;
    }

    /**
     * Update grid visual settings
     */
    setGridColor(color: string): void {
        this.gridColor = color;
    }

    /**
     * Render coordinate grid with adaptive sizing based on zoom level
     */
    renderGrid(
        ctx: CanvasRenderingContext2D,
        mapX: number,
        mapY: number,
        mapWidth: number,
        mapHeight: number,
        scale: number,
        zoomLevel: number,
        centerX: number,
        centerY: number
    ): void {
        ctx.strokeStyle = this.gridColor;
        ctx.lineWidth = 0.5; // Even more subtle lines

        // Dynamic grid size based on zoom level
        let effectiveGridSize = this.gridSize;
        if (zoomLevel < 0.1) {
            // Galactic view: very large grid (20000 units)
            effectiveGridSize = this.gridSize * 10;
        } else if (zoomLevel < 0.5) {
            // Sector view: large grid (10000 units)
            effectiveGridSize = this.gridSize * 5;
        } else if (zoomLevel > 5.0) {
            // Detail view: small grid (500 units)
            effectiveGridSize = this.gridSize / 4;
        }

        // Calculate grid line spacing on screen
        const gridSpacing = effectiveGridSize * scale;

        // Skip grid rendering if spacing is too small or too large
        if (gridSpacing < 10 || gridSpacing > mapWidth) {
            return;
        }

        // Calculate offset based on map center
        const offsetX = (centerX % effectiveGridSize) * scale;
        const offsetY = (centerY % effectiveGridSize) * scale;

        // Draw vertical grid lines
        for (let x = mapX - offsetX; x <= mapX + mapWidth; x += gridSpacing) {
            if (x >= mapX && x <= mapX + mapWidth) {
                ctx.beginPath();
                ctx.moveTo(x, mapY);
                ctx.lineTo(x, mapY + mapHeight);
                ctx.stroke();
            }
        }

        // Draw horizontal grid lines
        for (let y = mapY - offsetY; y <= mapY + mapHeight; y += gridSpacing) {
            if (y >= mapY && y <= mapY + mapHeight) {
                ctx.beginPath();
                ctx.moveTo(mapX, y);
                ctx.lineTo(mapX + mapWidth, y);
                ctx.stroke();
            }
        }
    }
}
