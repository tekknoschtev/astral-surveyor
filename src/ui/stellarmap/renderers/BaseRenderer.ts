// Base renderer class for stellar map celestial objects
// Provides common utilities and shared rendering logic

import type { MapRenderContext } from '../StellarMapTypes.js';

export abstract class BaseRenderer {
    
    /**
     * Convert world coordinates to map coordinates
     */
    protected worldToMapCoords(
        worldX: number, 
        worldY: number, 
        context: MapRenderContext
    ): { x: number; y: number } {
        return {
            x: context.mapX + context.mapWidth/2 + (worldX - context.centerX) * context.worldToMapScale,
            y: context.mapY + context.mapHeight/2 + (worldY - context.centerY) * context.worldToMapScale
        };
    }

    /**
     * Check if an object is within the visible map bounds (with optional margin)
     */
    protected isInBounds(
        mapX: number, 
        mapY: number, 
        context: MapRenderContext, 
        margin: number = 10
    ): boolean {
        return mapX >= context.mapX - margin && 
               mapX <= context.mapX + context.mapWidth + margin && 
               mapY >= context.mapY - margin && 
               mapY <= context.mapY + context.mapHeight + margin;
    }

    /**
     * Draw a simple circular celestial object
     */
    protected drawCircularObject(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        radius: number,
        color: string
    ): void {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Draw a hover highlight effect
     */
    protected drawHoverHighlight(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        radius: number,
        color: string = '#d4a57480'
    ): void {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(5, radius + 1), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Draw a selection highlight effect
     */
    protected drawSelectionHighlight(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        radius: number,
        color: string = '#d4a574'
    ): void {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(6, radius + 2), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Render a text label for an object
     */
    protected renderLabel(
        ctx: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        fontSize: number = 12,
        fontFamily: string = '"Courier New", monospace',
        color: string = '#d4a574'
    ): void {
        ctx.save();
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText(text, x, y - 10);
        ctx.restore();
    }
}