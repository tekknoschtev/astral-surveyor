// Wormhole System Tests - Ultra-Rare FTL Travel Infrastructure
// Testing the Wormhole class, pairing logic, travel mechanics, and visual effects

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Wormhole, WormholeTypes, generateWormholePair } from '../../dist/celestial/wormholes.js';

describe('Wormhole System', () => {
  let mockRenderer;
  let mockCamera;
  let mockRandom;

  beforeEach(() => {
    // Mock renderer
    mockRenderer = {
      canvas: { width: 800, height: 600 },
      ctx: {
        save: vi.fn(),
        restore: vi.fn(),
        globalAlpha: 1,
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '',
        textAlign: '',
        textBaseline: '',
        lineCap: '',
        beginPath: vi.fn(),
        arc: vi.fn(),
        ellipse: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        fillText: vi.fn(),
        fillRect: vi.fn(),
        setLineDash: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        createRadialGradient: vi.fn(() => ({
          addColorStop: vi.fn()
        })),
        createLinearGradient: vi.fn(() => ({
          addColorStop: vi.fn()
        })),
        clip: vi.fn(),
        rect: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        quadraticCurveTo: vi.fn()
      },
      drawCircle: vi.fn(),
      drawDiscoveryIndicator: vi.fn(),
      drawDiscoveryPulse: vi.fn()
    };

    // Mock camera
    mockCamera = {
      x: 1000,
      y: 2000,
      worldToScreen: vi.fn((x, y, w, h) => [x - mockCamera.x + w/2, y - mockCamera.y + h/2])
    };

    // Mock seeded random
    mockRandom = {
      next: vi.fn(() => 0.5),
      nextFloat: vi.fn((min, max) => (min + max) / 2),
      nextInt: vi.fn((min, max) => Math.floor((min + max) / 2)),
      choice: vi.fn((array) => array[0])
    };
  });

  describe('Wormhole Class', () => {
    it('should initialize with basic properties', () => {
      const wormhole = new Wormhole(500, 300, 'WH-1234', 'alpha', 1500, 800, mockRandom);

      expect(wormhole.x).toBe(500);
      expect(wormhole.y).toBe(300);
      expect(wormhole.type).toBe('wormhole');
      expect(wormhole.wormholeId).toBe('WH-1234');
      expect(wormhole.designation).toBe('alpha');
      expect(wormhole.pairId).toBe('WH-1234-α');
      expect(wormhole.twinX).toBe(1500);
      expect(wormhole.twinY).toBe(800);
      expect(wormhole.isActive).toBe(true);
    });

    it('should generate correct β designation', () => {
      const wormhole = new Wormhole(500, 300, 'WH-5678', 'beta', 1500, 800, mockRandom);

      expect(wormhole.designation).toBe('beta');
      expect(wormhole.pairId).toBe('WH-5678-β');
    });

    it('should have appropriate discovery distance', () => {
      const wormhole = new Wormhole(500, 300, 'WH-1234', 'alpha', 1500, 800, mockRandom);

      // Should be larger than planets but smaller than stars (110-120px range)
      expect(wormhole.discoveryDistance).toBeGreaterThan(100);
      expect(wormhole.discoveryDistance).toBeLessThan(130);
    });

    it('should generate unique ID based on position and designation', () => {
      const alpha = new Wormhole(500, 300, 'WH-1234', 'alpha', 1500, 800, mockRandom);
      const beta = new Wormhole(1500, 800, 'WH-1234', 'beta', 500, 300, mockRandom);

      expect(alpha.uniqueId).toBe('wormhole_500_300_alpha');
      expect(beta.uniqueId).toBe('wormhole_1500_800_beta');
      expect(alpha.uniqueId).not.toBe(beta.uniqueId);
    });

    it('should initialize particle systems', () => {
      const wormhole = new Wormhole(500, 300, 'WH-1234', 'alpha', 1500, 800, mockRandom);

      expect(wormhole.particles).toBeDefined();
      expect(wormhole.particles.length).toBe(24); // Default stable wormhole particle count
      expect(wormhole.vortexRotation).toBeDefined();
      expect(wormhole.energyPulse).toBeDefined();
    });
  });

  describe('Wormhole Pairing Logic', () => {
    it('should create paired wormholes with generateWormholePair', () => {
      const [alpha, beta] = generateWormholePair(100, 200, 800, 900, 'WH-TEST', mockRandom);

      // Check pairing
      expect(alpha.wormholeId).toBe('WH-TEST');
      expect(beta.wormholeId).toBe('WH-TEST');
      expect(alpha.designation).toBe('alpha');
      expect(beta.designation).toBe('beta');

      // Check cross-references
      expect(alpha.twinWormhole).toBe(beta);
      expect(beta.twinWormhole).toBe(alpha);
      expect(alpha.twinX).toBe(800);
      expect(alpha.twinY).toBe(900);
      expect(beta.twinX).toBe(100);
      expect(beta.twinY).toBe(200);
    });

    it('should generate deterministic properties with same seed', () => {
      const [alpha1, beta1] = generateWormholePair(100, 200, 800, 900, 'WH-SEED', mockRandom);
      const [alpha2, beta2] = generateWormholePair(100, 200, 800, 900, 'WH-SEED', mockRandom);

      // Same seed should produce same properties
      expect(alpha1.radius).toBe(alpha2.radius);
      expect(beta1.radius).toBe(beta2.radius);
      expect(alpha1.discoveryDistance).toBe(alpha2.discoveryDistance);
      expect(beta1.discoveryDistance).toBe(beta2.discoveryDistance);
    });
  });

  describe('Travel Mechanics', () => {
    it('should detect ship within traversal range', () => {
      const wormhole = new Wormhole(500, 300, 'WH-1234', 'alpha', 1500, 800, mockRandom);
      wormhole.radius = 40;

      // Ship at wormhole center (within range)
      mockCamera.x = 500;
      mockCamera.y = 300;
      expect(wormhole.canTraverse(mockCamera)).toBe(true);

      // Ship at edge of traversal range (80% of radius)
      mockCamera.x = 500 + (wormhole.radius * 0.8 - 1);
      mockCamera.y = 300;
      expect(wormhole.canTraverse(mockCamera)).toBe(true);

      // Ship outside traversal range
      mockCamera.x = 500 + wormhole.radius;
      mockCamera.y = 300;
      expect(wormhole.canTraverse(mockCamera)).toBe(false);
    });

    it('should not allow traversal when inactive', () => {
      const wormhole = new Wormhole(500, 300, 'WH-1234', 'alpha', 1500, 800, mockRandom);
      wormhole.isActive = false;

      mockCamera.x = 500;
      mockCamera.y = 300;
      expect(wormhole.canTraverse(mockCamera)).toBe(false);
    });

    it('should calculate deterministic destination coordinates', () => {
      const wormhole = new Wormhole(500, 300, 'WH-1234', 'alpha', 1500, 800, mockRandom);
      
      const destination1 = wormhole.getDestinationCoordinates();
      const destination2 = wormhole.getDestinationCoordinates();

      // Should be deterministic
      expect(destination1.x).toBe(destination2.x);
      expect(destination1.y).toBe(destination2.y);

      // Should be offset from twin position (not exactly at twin coordinates)
      expect(destination1.x).not.toBe(1500);
      expect(destination1.y).not.toBe(800);

      // Should be within reasonable distance of twin (80px + some angle offset)
      const distance = Math.sqrt(Math.pow(destination1.x - 1500, 2) + Math.pow(destination1.y - 800, 2));
      expect(distance).toBeGreaterThan(70); // At least some offset (updated for 80px safety margin)
      expect(distance).toBeLessThan(90); // Not too far (updated for 80px safety margin)
    });
  });

  describe('Visual Effects and Animation', () => {
    it('should update animations over time', () => {
      const wormhole = new Wormhole(500, 300, 'WH-1234', 'alpha', 1500, 800, mockRandom);
      const initialRotation = wormhole.vortexRotation;
      const initialPulse = wormhole.energyPulse;

      wormhole.update(1.0); // 1 second

      // Animations should have progressed
      expect(wormhole.vortexRotation).toBeGreaterThan(initialRotation);
      expect(wormhole.energyPulse).toBeGreaterThan(initialPulse);
    });

    it('should handle rotation wrapping', () => {
      const wormhole = new Wormhole(500, 300, 'WH-1234', 'alpha', 1500, 800, mockRandom);
      wormhole.vortexRotation = Math.PI * 2 - 0.1; // Near full rotation

      wormhole.update(1.0);

      // Should wrap around to stay within 0 to 2π
      expect(wormhole.vortexRotation).toBeLessThan(Math.PI * 2);
      expect(wormhole.vortexRotation).toBeGreaterThanOrEqual(0);
    });

    it('should not render when off screen', () => {
      const wormhole = new Wormhole(500, 300, 'WH-1234', 'alpha', 1500, 800, mockRandom);
      
      // Position camera so wormhole is way off screen
      mockCamera.worldToScreen = vi.fn(() => [-1000, -1000]);

      wormhole.render(mockRenderer, mockCamera);

      // Should not call rendering functions when off screen
      expect(mockRenderer.ctx.beginPath).not.toHaveBeenCalled();
    });

    it('should render when on screen', () => {
      const wormhole = new Wormhole(500, 300, 'WH-1234', 'alpha', 1500, 800, mockRandom);
      
      // Position camera so wormhole is on screen
      mockCamera.worldToScreen = vi.fn(() => [400, 300]);

      wormhole.render(mockRenderer, mockCamera);

      // Should call rendering functions
      expect(mockRenderer.ctx.save).toHaveBeenCalled();
      expect(mockRenderer.ctx.restore).toHaveBeenCalled();
      expect(mockRenderer.ctx.beginPath).toHaveBeenCalled();
    });

    it('should render discovery indicator when discovered', () => {
      const wormhole = new Wormhole(500, 300, 'WH-1234', 'alpha', 1500, 800, mockRandom);
      wormhole.discovered = true;
      
      mockCamera.worldToScreen = vi.fn(() => [400, 300]);

      wormhole.render(mockRenderer, mockCamera);

      // Should use unified discovery indicator system and render designation
      expect(mockRenderer.drawDiscoveryIndicator).toHaveBeenCalled();
      expect(mockRenderer.ctx.fillText).toHaveBeenCalledWith('α', expect.any(Number), expect.any(Number));
    });

    it('should render β designation for beta wormholes', () => {
      const wormhole = new Wormhole(500, 300, 'WH-1234', 'beta', 1500, 800, mockRandom);
      wormhole.discovered = true;
      
      mockCamera.worldToScreen = vi.fn(() => [400, 300]);

      wormhole.render(mockRenderer, mockCamera);

      expect(mockRenderer.ctx.fillText).toHaveBeenCalledWith('β', expect.any(Number), expect.any(Number));
    });
  });

  describe('Discovery Logic', () => {
    it('should be discoverable when ship is within range', () => {
      const wormhole = new Wormhole(500, 300, 'WH-1234', 'alpha', 1500, 800, mockRandom);
      
      // Ship within discovery range
      mockCamera.x = 500 + wormhole.discoveryDistance - 1;
      mockCamera.y = 300;

      const wasDiscovered = wormhole.checkDiscovery(mockCamera, 800, 600);

      expect(wasDiscovered).toBe(true);
      expect(wormhole.discovered).toBe(true);
    });

    it('should not be discoverable when ship is too far', () => {
      const wormhole = new Wormhole(500, 300, 'WH-1234', 'alpha', 1500, 800, mockRandom);
      
      // Ship outside discovery range
      mockCamera.x = 500 + wormhole.discoveryDistance + 10;
      mockCamera.y = 300;

      const wasDiscovered = wormhole.checkDiscovery(mockCamera, 800, 600);

      expect(wasDiscovered).toBe(false);
      expect(wormhole.discovered).toBe(false);
    });

    it('should not rediscover already discovered wormholes', () => {
      const wormhole = new Wormhole(500, 300, 'WH-1234', 'alpha', 1500, 800, mockRandom);
      wormhole.discovered = true;
      
      mockCamera.x = 500;
      mockCamera.y = 300;

      const wasDiscovered = wormhole.checkDiscovery(mockCamera, 800, 600);

      expect(wasDiscovered).toBe(false); // Already discovered
    });

    it('should provide discovery data for saving', () => {
      const wormhole = new Wormhole(500, 300, 'WH-1234', 'alpha', 1500, 800, mockRandom);
      wormhole.discovered = true;

      const discoveryData = wormhole.getDiscoveryData();

      expect(discoveryData.discovered).toBe(true);
      expect(discoveryData.wormholeId).toBe('WH-1234');
      expect(discoveryData.designation).toBe('alpha');
      expect(discoveryData.pairId).toBe('WH-1234-α');
      expect(discoveryData.twinX).toBe(1500);
      expect(discoveryData.twinY).toBe(800);
      expect(discoveryData.discoveryValue).toBe(100);
      expect(discoveryData.timestamp).toBeDefined();
    });
  });

  describe('Wormhole Types', () => {
    it('should have defined wormhole types with proper structure', () => {
      expect(WormholeTypes.stable).toBeDefined();
      expect(WormholeTypes.stable.name).toBe('Stable Traversable Wormhole');
      expect(WormholeTypes.stable.colors).toBeInstanceOf(Array);
      expect(WormholeTypes.stable.accentColors).toBeInstanceOf(Array);
      expect(WormholeTypes.stable.particleCount).toBe(24);
      expect(WormholeTypes.stable.vortexIntensity).toBe(0.8);
      expect(WormholeTypes.stable.energyField).toBeDefined();
      expect(WormholeTypes.stable.discoveryValue).toBe(100);
    });

    it('should have appropriate visual configuration', () => {
      const stableType = WormholeTypes.stable;
      
      expect(stableType.energyField.innerRadius).toBe(1.2);
      expect(stableType.energyField.outerRadius).toBe(1.8);
      expect(stableType.energyField.pulseSpeed).toBe(0.5);
      expect(stableType.energyField.colors).toBeInstanceOf(Array);
      expect(stableType.energyField.colors.length).toBeGreaterThan(0);
    });
  });

  describe('Integration with World Generation', () => {
    it('should be compatible with chunk-based loading', () => {
      const wormhole = new Wormhole(500, 300, 'WH-1234', 'alpha', 1500, 800, mockRandom);

      // Should have all properties needed for chunk management
      expect(wormhole.x).toBeDefined();
      expect(wormhole.y).toBeDefined();
      expect(wormhole.type).toBe('wormhole');
      expect(wormhole.uniqueId).toBeDefined();
    });

    it('should maintain pairing across different chunks', () => {
      // Alpha in chunk A, Beta in chunk B (different locations)
      const [alpha, beta] = generateWormholePair(100, 100, 5000, 5000, 'WH-CROSS-CHUNK', mockRandom);

      // Should maintain references even when far apart
      expect(alpha.twinX).toBe(5000);
      expect(alpha.twinY).toBe(5000);
      expect(beta.twinX).toBe(100);
      expect(beta.twinY).toBe(100);
      expect(alpha.twinWormhole).toBe(beta);
      expect(beta.twinWormhole).toBe(alpha);
    });

    it('should serialize discovery data correctly', () => {
      const wormhole = new Wormhole(500, 300, 'WH-1234', 'alpha', 1500, 800, mockRandom);
      wormhole.discovered = true;

      const data = wormhole.getDiscoveryData();
      
      // Should be serializable for storage
      const json = JSON.stringify(data);
      const parsed = JSON.parse(json);
      
      expect(parsed.wormholeId).toBe('WH-1234');
      expect(parsed.designation).toBe('alpha');
      expect(parsed.pairId).toBe('WH-1234-α');
      expect(parsed.discovered).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing twin wormhole gracefully', () => {
      const wormhole = new Wormhole(500, 300, 'WH-ORPHAN', 'alpha', 1500, 800, mockRandom);
      wormhole.twinWormhole = undefined;

      // Should not crash when twin is missing
      const destination = wormhole.getDestinationCoordinates();
      expect(destination.x).toBeDefined();
      expect(destination.y).toBeDefined();
      
      // Position camera at wormhole center for traversal test
      mockCamera.x = 500;
      mockCamera.y = 300;
      expect(wormhole.canTraverse(mockCamera)).toBe(true); // Should still function
    });

    it('should handle extreme coordinate values', () => {
      const wormhole = new Wormhole(-999999, 999999, 'WH-EXTREME', 'alpha', 999999, -999999, mockRandom);

      expect(wormhole.x).toBe(-999999);
      expect(wormhole.y).toBe(999999);
      expect(wormhole.uniqueId).toContain('-999999');
      expect(wormhole.uniqueId).toContain('999999');
    });

    it('should handle rapid traversal attempts safely', () => {
      const wormhole = new Wormhole(500, 300, 'WH-RAPID', 'alpha', 1500, 800, mockRandom);
      
      mockCamera.x = 500;
      mockCamera.y = 300;

      // Should consistently allow traversal when in range
      expect(wormhole.canTraverse(mockCamera)).toBe(true);
      expect(wormhole.canTraverse(mockCamera)).toBe(true);
      expect(wormhole.canTraverse(mockCamera)).toBe(true);
    });

    it('should handle animation updates with zero deltaTime', () => {
      const wormhole = new Wormhole(500, 300, 'WH-ZERO', 'alpha', 1500, 800, mockRandom);
      const initialRotation = wormhole.vortexRotation;

      wormhole.update(0); // Zero time delta

      // Should not crash and rotation should remain unchanged
      expect(wormhole.vortexRotation).toBe(initialRotation);
    });

    it('should handle negative deltaTime gracefully', () => {
      const wormhole = new Wormhole(500, 300, 'WH-NEG', 'alpha', 1500, 800, mockRandom);
      const initialRotation = wormhole.vortexRotation;

      wormhole.update(-1.0); // Negative time delta

      // Should not crash or go backwards significantly
      expect(wormhole.vortexRotation).toBeDefined();
      expect(typeof wormhole.vortexRotation).toBe('number');
    });
  });

  describe('Performance and Memory', () => {
    it('should not create excessive particle objects', () => {
      const wormhole = new Wormhole(500, 300, 'WH-PERF', 'alpha', 1500, 800, mockRandom);

      // Should have reasonable particle count for performance
      expect(wormhole.particles.length).toBeLessThanOrEqual(30);
      expect(wormhole.particles.length).toBeGreaterThan(0);
    });

    it('should clean up references properly', () => {
      const [alpha, beta] = generateWormholePair(100, 200, 800, 900, 'WH-CLEANUP', mockRandom);

      // References should be properly established
      expect(alpha.twinWormhole).toBeDefined();
      expect(beta.twinWormhole).toBeDefined();
      
      // Simulate cleanup
      alpha.twinWormhole = undefined;
      beta.twinWormhole = undefined;
      
      // Should not crash after cleanup
      const destination = alpha.getDestinationCoordinates();
      expect(destination).toBeDefined();
    });
  });
});