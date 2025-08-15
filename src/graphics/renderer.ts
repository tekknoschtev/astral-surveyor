// Sprite pixel data type - array of strings representing pixel colors
export type SpriteData = string[][];

export class Renderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Could not get 2D rendering context');
        }
        this.ctx = context;
        this.ctx.imageSmoothingEnabled = false;
    }

    clear(): void {
        this.ctx.fillStyle = '#000511';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawPixel(x: number, y: number, color: string, size: number = 1): void {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
    }

    drawCircle(x: number, y: number, radius: number, color: string): void {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(Math.floor(x), Math.floor(y), radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawSprite(x: number, y: number, pixels: SpriteData, scale: number = 1, rotation: number = 0): void {
        if (rotation === 0) {
            // Fast path for no rotation
            for (let row = 0; row < pixels.length; row++) {
                for (let col = 0; col < pixels[row].length; col++) {
                    const pixel = pixels[row][col];
                    if (pixel !== ' ') {
                        this.drawPixel(
                            x + col * scale, 
                            y + row * scale, 
                            pixel, 
                            scale
                        );
                    }
                }
            }
        } else {
            // Rotation path using canvas transforms
            const width = pixels[0].length * scale;
            const height = pixels.length * scale;
            const centerX = x + width / 2;
            const centerY = y + height / 2;

            this.ctx.save();
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(rotation);
            this.ctx.translate(-width / 2, -height / 2);

            for (let row = 0; row < pixels.length; row++) {
                for (let col = 0; col < pixels[row].length; col++) {
                    const pixel = pixels[row][col];
                    if (pixel !== ' ') {
                        this.ctx.fillStyle = pixel;
                        this.ctx.fillRect(col * scale, row * scale, scale, scale);
                    }
                }
            }

            this.ctx.restore();
        }
    }

    drawCrosshair(x: number, y: number, size: number, color: string, lineWidth: number = 2, opacity: number = 1.0): void {
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.globalAlpha = opacity;
        this.ctx.lineCap = 'round';
        
        const halfSize = size / 2;
        
        this.ctx.beginPath();
        // Horizontal line
        this.ctx.moveTo(Math.floor(x - halfSize), Math.floor(y));
        this.ctx.lineTo(Math.floor(x + halfSize), Math.floor(y));
        // Vertical line
        this.ctx.moveTo(Math.floor(x), Math.floor(y - halfSize));
        this.ctx.lineTo(Math.floor(x), Math.floor(y + halfSize));
        this.ctx.stroke();
        
        this.ctx.restore();
    }

    drawDash(x: number, y: number, length: number, color: string, angle: number = 0, lineWidth: number = 1, opacity: number = 1.0): void {
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.globalAlpha = opacity;
        this.ctx.lineCap = 'round';
        
        const halfLength = length / 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        this.ctx.beginPath();
        this.ctx.moveTo(
            Math.floor(x - halfLength * cos), 
            Math.floor(y - halfLength * sin)
        );
        this.ctx.lineTo(
            Math.floor(x + halfLength * cos), 
            Math.floor(y + halfLength * sin)
        );
        this.ctx.stroke();
        
        this.ctx.restore();
    }
}