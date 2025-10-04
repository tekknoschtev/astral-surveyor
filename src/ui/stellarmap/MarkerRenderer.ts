// MarkerRenderer for StellarMap
// Handles rendering of origin, starting position, and current position markers

import type { Camera } from '../../camera/camera.js';

export interface GameStartingPosition {
    x: number;
    y: number;
}

export class MarkerRenderer {
    private currentPositionColor: string;

    constructor(currentPositionColor: string = '#d4a574') {
        this.currentPositionColor = currentPositionColor;
    }

    /**
     * Update marker colors
     */
    setCurrentPositionColor(color: string): void {
        this.currentPositionColor = color;
    }

    /**
     * Render starting position marker (diamond shape, blue)
     */
    renderStartingPositionMarker(
        ctx: CanvasRenderingContext2D,
        mapX: number,
        mapY: number,
        mapWidth: number,
        mapHeight: number,
        scale: number,
        zoomLevel: number,
        centerX: number,
        centerY: number,
        startingPosition: GameStartingPosition
    ): void {
        // Edge case: Don't render starting position marker if it's the same as origin (0,0)
        if (startingPosition.x === 0 && startingPosition.y === 0) {
            return;
        }

        // Convert starting position to map coordinates
        const startMapX = mapX + mapWidth/2 + (startingPosition.x - centerX) * scale;
        const startMapY = mapY + mapHeight/2 + (startingPosition.y - centerY) * scale;

        // Only draw if starting position is within map bounds
        if (startMapX >= mapX && startMapX <= mapX + mapWidth &&
            startMapY >= mapY && startMapY <= mapY + mapHeight) {

            // Use blue color for starting position
            ctx.strokeStyle = '#4488ff';
            ctx.fillStyle = '#4488ff40'; // Semi-transparent fill
            ctx.lineWidth = 2;

            // Scale marker size based on zoom level
            const markerSize = Math.max(4, Math.min(10, 6 / zoomLevel));

            // Draw diamond shape
            ctx.beginPath();
            ctx.moveTo(startMapX, startMapY - markerSize); // Top
            ctx.lineTo(startMapX + markerSize, startMapY); // Right
            ctx.lineTo(startMapX, startMapY + markerSize); // Bottom
            ctx.lineTo(startMapX - markerSize, startMapY); // Left
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Add label at lower zoom levels
            if (zoomLevel < 0.5) {
                ctx.fillStyle = '#4488ff';
                ctx.font = '12px "Courier New", monospace';
                ctx.textAlign = 'center';

                // Draw text background for readability
                const labelText = 'Start';
                const textWidth = ctx.measureText(labelText).width;
                const bgPadding = 2;
                ctx.fillStyle = '#000000C0';
                ctx.fillRect(startMapX - textWidth/2 - bgPadding, startMapY + markerSize + 5, textWidth + bgPadding*2, 12);

                // Draw label text
                ctx.fillStyle = '#4488ff';
                ctx.fillText(labelText, startMapX, startMapY + markerSize + 15);

                // Reset text alignment
                ctx.textAlign = 'left';
            }
        }
    }

    /**
     * Render origin marker (cross/plus at 0,0, red-orange)
     */
    renderOriginMarker(
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
        // Convert origin (0,0) to map coordinates
        const originMapX = mapX + mapWidth/2 + (0 - centerX) * scale;
        const originMapY = mapY + mapHeight/2 + (0 - centerY) * scale;

        // Only draw if origin is within map bounds
        if (originMapX >= mapX && originMapX <= mapX + mapWidth &&
            originMapY >= mapY && originMapY <= mapY + mapHeight) {

            // Use distinctive red-orange color for origin
            ctx.strokeStyle = '#ff6644';
            ctx.fillStyle = '#ff664440'; // Semi-transparent fill
            ctx.lineWidth = 2;

            // Scale marker size based on zoom level (larger when zoomed out)
            const markerSize = Math.max(4, Math.min(12, 8 / zoomLevel));
            const crossSize = markerSize * 1.5;

            // Draw cross/plus symbol
            ctx.beginPath();
            // Horizontal line
            ctx.moveTo(originMapX - crossSize, originMapY);
            ctx.lineTo(originMapX + crossSize, originMapY);
            // Vertical line
            ctx.moveTo(originMapX, originMapY - crossSize);
            ctx.lineTo(originMapX, originMapY + crossSize);
            ctx.stroke();

            // Draw center circle
            ctx.beginPath();
            ctx.arc(originMapX, originMapY, markerSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Add label at lower zoom levels (when zoomed out and origin is more significant)
            if (zoomLevel < 0.5) {
                ctx.fillStyle = '#ff6644';
                ctx.font = '12px "Courier New", monospace';
                ctx.textAlign = 'center';

                // Draw text background for readability
                const labelText = '(0,0)';
                const textWidth = ctx.measureText(labelText).width;
                const bgPadding = 2;
                ctx.fillStyle = '#000000C0';
                ctx.fillRect(originMapX - textWidth/2 - bgPadding, originMapY + crossSize + 5, textWidth + bgPadding*2, 12);

                // Draw label text
                ctx.fillStyle = '#ff6644';
                ctx.fillText(labelText, originMapX, originMapY + crossSize + 15);

                // Reset text alignment
                ctx.textAlign = 'left';
            }
        }
    }

    /**
     * Render current position marker (gentle amber circle)
     */
    renderCurrentPosition(
        ctx: CanvasRenderingContext2D,
        mapX: number,
        mapY: number,
        mapWidth: number,
        mapHeight: number,
        scale: number,
        centerX: number,
        centerY: number,
        camera: Camera
    ): void {
        // Convert current position to map coordinates (same as other objects)
        const currentMapX = mapX + mapWidth/2 + (camera.x - centerX) * scale;
        const currentMapY = mapY + mapHeight/2 + (camera.y - centerY) * scale;

        // Only draw if current position is within map bounds (with some margin)
        const margin = 20; // Allow marker to be slightly outside visible area
        if (currentMapX >= mapX - margin && currentMapX <= mapX + mapWidth + margin &&
            currentMapY >= mapY - margin && currentMapY <= mapY + mapHeight + margin) {

            // Draw current position as gentle marker
            ctx.strokeStyle = this.currentPositionColor;
            ctx.fillStyle = this.currentPositionColor + '40'; // Semi-transparent fill
            ctx.lineWidth = 1;

            // Draw filled circle with subtle outline
            ctx.beginPath();
            ctx.arc(currentMapX, currentMapY, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Draw subtle outer ring
            ctx.beginPath();
            ctx.arc(currentMapX, currentMapY, 12, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}
