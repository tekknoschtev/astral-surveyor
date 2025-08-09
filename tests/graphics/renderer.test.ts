// Renderer.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Renderer, SpriteData } from '../../dist/graphics/renderer.js';

// A helper to create a mocked canvas + context
function createMockCanvas() {
  const ctx = {
    imageSmoothingEnabled: true,
    fillStyle: '',
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
  } as unknown as CanvasRenderingContext2D;

  const canvas = {
    width: 100,
    height: 50,
    getContext: vi.fn().mockReturnValue(ctx),
  } as unknown as HTMLCanvasElement;

  return { canvas, ctx };
}

describe('Renderer', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;
  let renderer: Renderer;

  beforeEach(() => {
    const { canvas, ctx } = createMockCanvas();
    mockCanvas = canvas;
    mockCtx = ctx;
    renderer = new Renderer(mockCanvas);
  });

  it('should set up the renderer with 2D context', () => {
    expect(renderer.ctx).toBe(mockCtx);
    expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
    expect(renderer.ctx.imageSmoothingEnabled).toBe(false);
  });

  it('should throw if no 2D context is returned', () => {
    const badCanvas = {
      getContext: vi.fn().mockReturnValue(null),
    } as unknown as HTMLCanvasElement;

    expect(() => new Renderer(badCanvas)).toThrow('Could not get 2D rendering context');
  });

  it('clear() should fill the whole canvas with background color', () => {
    renderer.clear();
    expect(mockCtx.fillStyle).toBe('#000511');
    expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, mockCanvas.width, mockCanvas.height);
  });

  it('drawPixel() should draw a pixel at given position', () => {
    renderer.drawPixel(10.6, 20.4, '#ff0000', 2);
    expect(mockCtx.fillStyle).toBe('#ff0000');
    expect(mockCtx.fillRect).toHaveBeenCalledWith(10, 20, 2, 2);
  });

  it('drawCircle() should draw a circle at given position', () => {
    renderer.drawCircle(15.2, 25.8, 5, '#00ff00');
    expect(mockCtx.fillStyle).toBe('#00ff00');
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.arc).toHaveBeenCalledWith(15, 26, 5, 0, Math.PI * 2);
    expect(mockCtx.fill).toHaveBeenCalled();
  });

  it('drawSprite() without rotation should call drawPixel for non-space pixels', () => {
    const drawPixelSpy = vi.spyOn(renderer, 'drawPixel');
    const pixels: SpriteData = [
      ['#fff', ' '],
      ['#000', '#123']
    ];

    renderer.drawSprite(5, 10, pixels, 2);

    expect(drawPixelSpy).toHaveBeenCalledTimes(3); // 3 non-space pixels
    expect(drawPixelSpy).toHaveBeenCalledWith(5, 10, '#fff', 2);
    expect(drawPixelSpy).toHaveBeenCalledWith(5, 12, '#000', 2);
    expect(drawPixelSpy).toHaveBeenCalledWith(7, 12, '#123', 2);
  });

  it('drawSprite() with rotation should use canvas transforms', () => {
    const pixels: SpriteData = [
      ['#fff', ' '],
      ['#000', '#123']
    ];

    renderer.drawSprite(5, 10, pixels, 2, Math.PI / 4);

    expect(mockCtx.save).toHaveBeenCalled();
    expect(mockCtx.translate).toHaveBeenCalledTimes(2);
    expect(mockCtx.rotate).toHaveBeenCalledWith(Math.PI / 4);
    expect(mockCtx.fillRect).toHaveBeenCalled();
    expect(mockCtx.restore).toHaveBeenCalled();
  });
});
