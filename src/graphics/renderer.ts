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
}