import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import from compiled TypeScript
import { Renderer } from '../../dist/graphics/renderer.js';

describe('Renderer Graphics System', () => {
  let renderer;
  let mockCanvas;
  let mockContext;

  beforeEach(() => {
    // Create comprehensive mock canvas context
    mockContext = {
      // Canvas state properties
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      globalAlpha: 1,
      imageSmoothingEnabled: true,
      
      // Drawing functions
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      
      // Transform functions
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      transform: vi.fn(),
      setTransform: vi.fn(),
      resetTransform: vi.fn(),
      
      // Path functions
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      rect: vi.fn(),
      
      // Image functions
      drawImage: vi.fn(),
      createImageData: vi.fn(),
      getImageData: vi.fn(),
      putImageData: vi.fn()
    };

    // Create mock canvas
    mockCanvas = {
      width: 800,
      height: 600,
      getContext: vi.fn(() => mockContext),
      
      // DOM properties
      style: {},
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      
      // Canvas-specific methods
      toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
      toBlob: vi.fn()
    };

    renderer = new Renderer(mockCanvas);
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with valid canvas and context', () => {
      expect(renderer.canvas).toBe(mockCanvas);
      expect(renderer.ctx).toBe(mockContext);
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
      expect(mockContext.imageSmoothingEnabled).toBe(false);
    });

    it('should throw error when canvas context is not available', () => {
      const badCanvas = {
        getContext: vi.fn(() => null)
      };

      expect(() => new Renderer(badCanvas)).toThrow('Could not get 2D rendering context');
    });

    it('should disable image smoothing for pixel-perfect rendering', () => {
      expect(mockContext.imageSmoothingEnabled).toBe(false);
    });
  });

  describe('Clear Screen Function', () => {
    it('should clear screen with deep space background color', () => {
      renderer.clear();

      expect(mockContext.fillStyle).toBe('#000511');
      expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
    });

    it('should use full canvas dimensions', () => {
      // Test with different canvas size
      mockCanvas.width = 1024;
      mockCanvas.height = 768;
      
      renderer.clear();

      expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 1024, 768);
    });

    it('should always use the same background color', () => {
      renderer.clear();
      const firstCall = mockContext.fillStyle;
      
      // Call clear again
      renderer.clear();
      const secondCall = mockContext.fillStyle;
      
      expect(firstCall).toBe(secondCall);
      expect(firstCall).toBe('#000511');
    });
  });

  describe('Pixel Drawing Function', () => {
    it('should draw single pixel with default size', () => {
      renderer.drawPixel(100, 150, '#ff0000');

      expect(mockContext.fillStyle).toBe('#ff0000');
      expect(mockContext.fillRect).toHaveBeenCalledWith(100, 150, 1, 1);
    });

    it('should draw pixel with custom size', () => {
      renderer.drawPixel(50, 75, '#00ff00', 3);

      expect(mockContext.fillStyle).toBe('#00ff00');
      expect(mockContext.fillRect).toHaveBeenCalledWith(50, 75, 3, 3);
    });

    it('should floor pixel coordinates for crisp rendering', () => {
      renderer.drawPixel(100.7, 150.9, '#0000ff', 2);

      expect(mockContext.fillRect).toHaveBeenCalledWith(100, 150, 2, 2);
    });

    it('should handle zero-size pixels', () => {
      renderer.drawPixel(10, 20, '#ffffff', 0);

      expect(mockContext.fillRect).toHaveBeenCalledWith(10, 20, 0, 0);
    });

    it('should handle negative coordinates', () => {
      renderer.drawPixel(-10, -20, '#888888', 1);

      expect(mockContext.fillRect).toHaveBeenCalledWith(-10, -20, 1, 1);
    });

    it('should change fill style for each pixel color', () => {
      renderer.drawPixel(0, 0, '#red');
      renderer.drawPixel(1, 1, '#green');
      renderer.drawPixel(2, 2, '#blue');

      expect(mockContext.fillStyle).toBe('#blue'); // Last color set
      expect(mockContext.fillRect).toHaveBeenCalledTimes(3);
    });
  });

  describe('Circle Drawing Function', () => {
    it('should draw circle with correct parameters', () => {
      renderer.drawCircle(200, 300, 50, '#ffff00');

      expect(mockContext.fillStyle).toBe('#ffff00');
      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.arc).toHaveBeenCalledWith(200, 300, 50, 0, Math.PI * 2);
      expect(mockContext.fill).toHaveBeenCalled();
    });

    it('should floor circle coordinates for consistency', () => {
      renderer.drawCircle(100.6, 200.8, 25.5, '#00ffff');

      expect(mockContext.arc).toHaveBeenCalledWith(100, 200, 25.5, 0, Math.PI * 2);
    });

    it('should handle zero radius circles', () => {
      renderer.drawCircle(50, 100, 0, '#ff00ff');

      expect(mockContext.arc).toHaveBeenCalledWith(50, 100, 0, 0, Math.PI * 2);
      expect(mockContext.fill).toHaveBeenCalled();
    });

    it('should handle large radius circles', () => {
      renderer.drawCircle(400, 300, 1000, '#123456');

      expect(mockContext.arc).toHaveBeenCalledWith(400, 300, 1000, 0, Math.PI * 2);
    });

    it('should call beginPath for each circle', () => {
      renderer.drawCircle(10, 10, 5, '#aaa');
      renderer.drawCircle(20, 20, 10, '#bbb');

      expect(mockContext.beginPath).toHaveBeenCalledTimes(2);
      expect(mockContext.fill).toHaveBeenCalledTimes(2);
    });
  });

  describe('Sprite Drawing Function - No Rotation', () => {
    it('should draw simple sprite without rotation', () => {
      const sprite = [
        ['#ff0000', '#00ff00'],
        ['#0000ff', '#ffffff']
      ];

      renderer.drawSprite(100, 200, sprite, 1, 0);

      // Should call drawPixel for each non-space pixel
      expect(mockContext.fillRect).toHaveBeenCalledWith(100, 200, 1, 1); // Red pixel
      expect(mockContext.fillRect).toHaveBeenCalledWith(101, 200, 1, 1); // Green pixel
      expect(mockContext.fillRect).toHaveBeenCalledWith(100, 201, 1, 1); // Blue pixel
      expect(mockContext.fillRect).toHaveBeenCalledWith(101, 201, 1, 1); // White pixel
      expect(mockContext.fillRect).toHaveBeenCalledTimes(4);
    });

    it('should skip space characters in sprite', () => {
      const sprite = [
        ['#ff0000', ' ', '#0000ff'],
        [' ', '#00ff00', ' ']
      ];

      renderer.drawSprite(50, 100, sprite, 1, 0);

      // Should only draw non-space pixels
      expect(mockContext.fillRect).toHaveBeenCalledTimes(3);
      expect(mockContext.fillRect).toHaveBeenCalledWith(50, 100, 1, 1); // Red
      expect(mockContext.fillRect).toHaveBeenCalledWith(52, 100, 1, 1); // Blue
      expect(mockContext.fillRect).toHaveBeenCalledWith(51, 101, 1, 1); // Green
    });

    it('should scale sprite correctly', () => {
      const sprite = [
        ['#ff0000', '#00ff00'],
        ['#0000ff', '#ffffff']
      ];

      renderer.drawSprite(0, 0, sprite, 3, 0);

      // Check scaled positions and sizes
      expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 3, 3);   // Red (0,0)
      expect(mockContext.fillRect).toHaveBeenCalledWith(3, 0, 3, 3);   // Green (3,0)
      expect(mockContext.fillRect).toHaveBeenCalledWith(0, 3, 3, 3);   // Blue (0,3)
      expect(mockContext.fillRect).toHaveBeenCalledWith(3, 3, 3, 3);   // White (3,3)
    });

    it('should handle empty sprite', () => {
      const sprite = [];

      renderer.drawSprite(10, 20, sprite, 1, 0);

      expect(mockContext.fillRect).not.toHaveBeenCalled();
    });

    it('should handle sprite with empty rows', () => {
      const sprite = [
        [],
        ['#ff0000']
      ];

      renderer.drawSprite(10, 20, sprite, 1, 0);

      expect(mockContext.fillRect).toHaveBeenCalledWith(10, 21, 1, 1);
      expect(mockContext.fillRect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Sprite Drawing Function - With Rotation', () => {
    it('should use canvas transforms for rotation', () => {
      const sprite = [
        ['#ff0000', '#00ff00'],
        ['#0000ff', '#ffffff']
      ];

      renderer.drawSprite(100, 200, sprite, 2, Math.PI / 4); // 45 degrees

      // Should use canvas transform functions
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.translate).toHaveBeenCalledTimes(2);
      expect(mockContext.rotate).toHaveBeenCalledWith(Math.PI / 4);
      expect(mockContext.restore).toHaveBeenCalled();

      // Should draw pixels using fillRect directly (not drawPixel)
      expect(mockContext.fillRect).toHaveBeenCalledTimes(4);
    });

    it('should calculate sprite center correctly for rotation', () => {
      const sprite = [
        ['#ff0000', '#00ff00', '#0000ff'],
        ['#ffffff', '#888888', '#444444']
      ];

      renderer.drawSprite(50, 100, sprite, 3, Math.PI / 2); // 90 degrees

      // Width = 3 pixels * 3 scale = 9, Height = 2 pixels * 3 scale = 6
      // Center should be at (50 + 9/2, 100 + 6/2) = (54.5, 103)
      expect(mockContext.translate).toHaveBeenNthCalledWith(1, 54.5, 103);
      expect(mockContext.translate).toHaveBeenNthCalledWith(2, -4.5, -3); // -width/2, -height/2
    });

    it('should set fillStyle directly for rotated sprites', () => {
      const sprite = [
        ['#123456', '#abcdef']
      ];

      renderer.drawSprite(0, 0, sprite, 1, 0.5);

      // For rotated path, should set fillStyle directly on context
      expect(mockContext.fillStyle).toBe('#abcdef'); // Last pixel color
    });

    it('should skip spaces in rotated sprites too', () => {
      const sprite = [
        ['#ff0000', ' ', '#0000ff'],
        [' ', ' ', ' ']
      ];

      renderer.drawSprite(10, 20, sprite, 1, 1.0);

      // Should only draw 2 pixels (skipping spaces)
      expect(mockContext.fillRect).toHaveBeenCalledTimes(2);
    });

    it('should handle zero rotation as non-rotated path', () => {
      const sprite = [['#ff0000']];

      // Reset the spy to track calls clearly
      mockContext.fillRect.mockClear();

      renderer.drawSprite(10, 20, sprite, 1, 0);

      // Zero rotation should use fast path (no save/restore/translate)
      expect(mockContext.save).not.toHaveBeenCalled();
      expect(mockContext.translate).not.toHaveBeenCalled();
      expect(mockContext.rotate).not.toHaveBeenCalled();
      expect(mockContext.restore).not.toHaveBeenCalled();
    });

    it('should save and restore canvas state properly', () => {
      const sprite = [['#ff0000']];

      renderer.drawSprite(10, 20, sprite, 1, 0.1);

      // Should save and restore canvas state for rotation
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
      
      // Check that transforms were called (indicating rotation path was used)
      expect(mockContext.translate).toHaveBeenCalled();
      expect(mockContext.rotate).toHaveBeenCalled();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle very large sprites', () => {
      // Create 100x100 sprite
      const sprite = Array(100).fill(null).map(() => Array(100).fill('#ff0000'));

      renderer.drawSprite(0, 0, sprite, 1, 0);

      expect(mockContext.fillRect).toHaveBeenCalledTimes(10000); // 100x100 pixels
    });

    it('should handle fractional scale values', () => {
      const sprite = [['#ff0000']];

      renderer.drawSprite(10, 20, sprite, 2.5, 0);

      expect(mockContext.fillRect).toHaveBeenCalledWith(10, 20, 2.5, 2.5);
    });

    it('should handle negative scale values', () => {
      const sprite = [['#ff0000']];

      renderer.drawSprite(10, 20, sprite, -2, 0);

      expect(mockContext.fillRect).toHaveBeenCalledWith(10, 20, -2, -2);
    });

    it('should handle extreme rotation values', () => {
      const sprite = [['#ff0000']];

      // Test rotation > 2π
      renderer.drawSprite(10, 20, sprite, 1, Math.PI * 4);

      expect(mockContext.rotate).toHaveBeenCalledWith(Math.PI * 4);
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });

    it('should handle concurrent drawing operations', () => {
      // Test multiple drawing operations in sequence
      renderer.clear();
      renderer.drawPixel(10, 10, '#ff0000', 1);
      renderer.drawCircle(50, 50, 20, '#00ff00');
      renderer.drawSprite(100, 100, [['#0000ff']], 1, 0);

      // Verify all operations were called
      expect(mockContext.fillRect).toHaveBeenCalledTimes(3); // clear + pixel + sprite
      expect(mockContext.arc).toHaveBeenCalledTimes(1);
      expect(mockContext.fill).toHaveBeenCalledTimes(1);
    });

    it('should maintain state isolation between sprites', () => {
      const sprite = [['#ff0000']];

      renderer.drawSprite(0, 0, sprite, 1, Math.PI / 4);
      renderer.drawSprite(10, 10, sprite, 2, 0); // No rotation

      // First sprite should save/restore, second should not
      expect(mockContext.save).toHaveBeenCalledTimes(1);
      expect(mockContext.restore).toHaveBeenCalledTimes(1);
    });
  });

  describe('Color and Style Management', () => {
    it('should handle different color formats', () => {
      // Test various color formats
      renderer.drawPixel(0, 0, '#ff0000', 1);     // Hex
      renderer.drawPixel(1, 1, 'red', 1);         // Named
      renderer.drawPixel(2, 2, 'rgb(0,255,0)', 1); // RGB
      renderer.drawPixel(3, 3, 'rgba(0,0,255,0.5)', 1); // RGBA

      // Should set each color correctly
      expect(mockContext.fillStyle).toBe('rgba(0,0,255,0.5)'); // Last color
    });

    it('should not interfere with external context state', () => {
      // Set some external context state
      const originalFillStyle = '#external';
      mockContext.fillStyle = originalFillStyle;

      const sprite = [['#internal']];
      renderer.drawSprite(0, 0, sprite, 1, Math.PI / 6);

      // After rotation, context should be restored (fillStyle might change during drawing)
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    it('should render a complete scene', () => {
      // Clear background
      renderer.clear();

      // Draw stars (pixels)
      renderer.drawPixel(100, 50, '#ffffff', 1);
      renderer.drawPixel(200, 80, '#ffffcc', 1);
      renderer.drawPixel(300, 120, '#ccffff', 1);

      // Draw planets (circles)
      renderer.drawCircle(150, 200, 15, '#ff6600');
      renderer.drawCircle(350, 300, 25, '#0066ff');

      // Draw ship (sprite)
      const shipSprite = [
        [' ', '#00ff88', ' '],
        ['#00ff88', '#00ff88', '#00ff88'],
        [' ', '#00ff88', ' ']
      ];
      renderer.drawSprite(400, 300, shipSprite, 2, Math.PI / 8);

      // Verify all drawing operations occurred
      expect(mockContext.fillRect).toHaveBeenCalled(); // clear + pixels + sprite
      expect(mockContext.arc).toHaveBeenCalledTimes(2); // 2 circles
      expect(mockContext.save).toHaveBeenCalledTimes(1); // rotated sprite
      expect(mockContext.restore).toHaveBeenCalledTimes(1);
    });

    it('should handle mixed drawing with different scales', () => {
      const sprite = [['#ff0000', '#00ff00']];

      // Draw same sprite at different scales
      renderer.drawSprite(0, 0, sprite, 1, 0);
      renderer.drawSprite(10, 10, sprite, 2, 0);
      renderer.drawSprite(20, 20, sprite, 0.5, 0);

      // Should draw 2 pixels per sprite = 6 total
      expect(mockContext.fillRect).toHaveBeenCalledTimes(6);
      
      // Check different scale calls
      expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 1, 1);     // scale 1
      expect(mockContext.fillRect).toHaveBeenCalledWith(10, 10, 2, 2);   // scale 2
      expect(mockContext.fillRect).toHaveBeenCalledWith(20, 20, 0.5, 0.5); // scale 0.5
    });
  });
});