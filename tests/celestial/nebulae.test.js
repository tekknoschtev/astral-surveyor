// Nebulae System Tests - Procedural Gas Clouds for Tranquil Exploration
// Testing the Nebula class and related generation/rendering logic

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Nebula, NebulaTypes } from '../../dist/celestial/nebulae.js';

describe('Nebulae System', () => {
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
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        createRadialGradient: vi.fn(() => ({
          addColorStop: vi.fn()
        })),
        fillRect: vi.fn(),
        setLineDash: vi.fn(),
        lineTo: vi.fn(),
        moveTo: vi.fn()
      },
      drawCircle: vi.fn(),
      drawDiscoveryIndicator: vi.fn(),
      drawDiscoveryPulse: vi.fn()
    };

    // Mock camera
    mockCamera = {
      x: 1000,
      y: 2000,
      worldToScreen: vi.fn((x, y) => [x - 600, y - 1700]) // Simple mock conversion
    };

    // Mock seeded random
    mockRandom = {
      next: vi.fn(() => 0.5),
      nextFloat: vi.fn((min, max) => (min + max) / 2),
      nextInt: vi.fn((min, max) => Math.floor((min + max) / 2)),
      choice: vi.fn((array) => array[0])
    };
  });

  describe('Nebula Class', () => {
    it('should initialize with basic properties', () => {
      const nebula = new Nebula(1000, 2000, 'emission', mockRandom);
      
      expect(nebula.x).toBe(1000);
      expect(nebula.y).toBe(2000);
      expect(nebula.type).toBe('nebula');
      expect(nebula.nebulaType).toBe('emission');
      expect(nebula.discovered).toBe(false);
      expect(nebula.radius).toBeGreaterThan(0);
      expect(nebula.colors).toHaveLength(3); // Primary, secondary, accent colors
      expect(nebula.density).toBeGreaterThan(0);
      expect(nebula.particleCount).toBeGreaterThan(0);
    });

    it('should generate unique ID based on position and type', () => {
      const nebula1 = new Nebula(1000, 2000, 'emission', mockRandom);
      const nebula2 = new Nebula(1000, 2000, 'emission', mockRandom);
      const nebula3 = new Nebula(1001, 2000, 'emission', mockRandom);
      
      expect(nebula1.id).toBe(nebula2.id); // Same position/type = same ID
      expect(nebula1.id).not.toBe(nebula3.id); // Different position = different ID
      expect(nebula1.id).toContain('nebula');
    });

    it('should have appropriate discovery distance based on size', () => {
      // Create separate mock randoms to ensure different sizes
      const mockRandom1 = {
        ...mockRandom,
        nextFloat: vi.fn((min, max) => min) // Return minimum for small
      };
      const mockRandom2 = {
        ...mockRandom,
        nextFloat: vi.fn((min, max) => max) // Return maximum for large
      };
      
      const smallNebula = new Nebula(0, 0, 'emission', mockRandom1);
      const largeNebula = new Nebula(0, 0, 'emission', mockRandom2);
      
      // Larger nebulae should be discoverable from greater distances
      expect(largeNebula.discoveryDistance).toBeGreaterThan(smallNebula.discoveryDistance);
      expect(smallNebula.discoveryDistance).toBeGreaterThan(smallNebula.radius); // At least radius
    });
  });

  describe('Nebula Types', () => {
    it('should have defined nebula types with proper structure', () => {
      expect(NebulaTypes).toBeDefined();
      expect(NebulaTypes.emission).toBeDefined();
      expect(NebulaTypes.reflection).toBeDefined();
      expect(NebulaTypes.planetary).toBeDefined();
      expect(NebulaTypes.dark).toBeDefined();
      
      // Check structure of emission nebula type
      const emission = NebulaTypes.emission;
      expect(emission.name).toBe('Emission Nebula');
      expect(emission.colors).toHaveLength(3);
      expect(emission.sizeRange).toHaveLength(2);
      expect(emission.rarity).toBeGreaterThan(0);
      expect(emission.rarity).toBeLessThanOrEqual(1);
      expect(emission.discoveryValue).toBeGreaterThan(0);
    });

    it('should have balanced rarity distribution', () => {
      const rarities = Object.values(NebulaTypes).map(type => type.rarity);
      const totalRarity = rarities.reduce((sum, r) => sum + r, 0);
      
      expect(totalRarity).toBeCloseTo(1.0, 2); // Should sum to ~1.0
    });

    it('should have appropriate discovery values', () => {
      // Rarer nebulae should have higher discovery values
      expect(NebulaTypes.planetary.discoveryValue).toBeGreaterThan(NebulaTypes.emission.discoveryValue);
      expect(NebulaTypes.dark.discoveryValue).toBeGreaterThan(NebulaTypes.reflection.discoveryValue);
    });
  });

  describe('Procedural Generation', () => {
    it('should generate different properties for different nebula types', () => {
      const emission = new Nebula(0, 0, 'emission', mockRandom);
      const dark = new Nebula(0, 0, 'dark', mockRandom);
      
      // Dark nebulae should have different characteristics than emission
      expect(emission.colors).not.toEqual(dark.colors);
      expect(emission.particleCount).not.toEqual(dark.particleCount);
    });

    it('should generate consistent properties with same seed', () => {
      const mockRandom1 = {
        next: vi.fn(() => 0.5),
        nextFloat: vi.fn((min, max) => (min + max) / 2),
        nextInt: vi.fn((min, max) => Math.floor((min + max) / 2)),
        choice: vi.fn((array) => array[0])
      };
      
      const mockRandom2 = {
        next: vi.fn(() => 0.5),
        nextFloat: vi.fn((min, max) => (min + max) / 2),
        nextInt: vi.fn((min, max) => Math.floor((min + max) / 2)),
        choice: vi.fn((array) => array[0])
      };
      
      const nebula1 = new Nebula(1000, 2000, 'emission', mockRandom1);
      const nebula2 = new Nebula(1000, 2000, 'emission', mockRandom2);
      
      expect(nebula1.radius).toBe(nebula2.radius);
      expect(nebula1.colors).toEqual(nebula2.colors);
      expect(nebula1.density).toBe(nebula2.density);
    });
  });

  describe('Discovery Logic', () => {
    it('should be discoverable when ship is within range', () => {
      const nebula = new Nebula(1000, 2000, 'emission', mockRandom);
      nebula.discoveryDistance = 100;
      
      const mockShip = { x: 1050, y: 2050 }; // 70.7 units away
      
      expect(nebula.shouldDiscover(mockShip, mockCamera, 800, 600)).toBe(true);
    });

    it('should not be discoverable when ship is too far', () => {
      const nebula = new Nebula(1000, 2000, 'emission', mockRandom);
      nebula.discoveryDistance = 50;
      
      const mockShip = { x: 1200, y: 2200 }; // 282.8 units away
      
      expect(nebula.shouldDiscover(mockShip, mockCamera, 800, 600)).toBe(false);
    });

    it('should not rediscover already discovered nebulae', () => {
      const nebula = new Nebula(1000, 2000, 'emission', mockRandom);
      nebula.discovered = true;
      
      const mockShip = { x: 1000, y: 2000 }; // Right on top
      
      expect(nebula.shouldDiscover(mockShip, mockCamera, 800, 600)).toBe(false);
    });
  });

  describe('Rendering System', () => {
    it('should not render when off screen', () => {
      const nebula = new Nebula(5000, 5000, 'emission', mockRandom);
      mockCamera.worldToScreen.mockReturnValue([-1000, -1000]); // Way off screen
      
      nebula.render(mockRenderer, mockCamera);
      
      expect(mockRenderer.ctx.save).not.toHaveBeenCalled();
    });

    it('should render when on screen', () => {
      const nebula = new Nebula(1000, 2000, 'emission', mockRandom);
      mockCamera.worldToScreen.mockReturnValue([400, 300]); // Center of screen
      
      nebula.render(mockRenderer, mockCamera);
      
      expect(mockRenderer.ctx.save).toHaveBeenCalled();
      expect(mockRenderer.ctx.restore).toHaveBeenCalled();
    });

    it('should render discovery indicator when discovered', () => {
      const nebula = new Nebula(1000, 2000, 'emission', mockRandom);
      nebula.discovered = true;
      mockCamera.worldToScreen.mockReturnValue([400, 300]);
      
      nebula.render(mockRenderer, mockCamera);
      
      // Should render discovery indicator using unified system
      expect(mockRenderer.drawDiscoveryIndicator).toHaveBeenCalled();
      
      // Verify the discovery indicator is called with the correct parameters
      const call = mockRenderer.drawDiscoveryIndicator.mock.calls[0];
      expect(call[0]).toBe(400); // screenX
      expect(call[1]).toBe(300); // screenY
      expect(call[2]).toBeGreaterThan(0); // radius (nebula radius + 10)
      expect(call[3]).toEqual(expect.any(String)); // color
    });

    it('should render multiple particle layers for depth', () => {
      const nebula = new Nebula(1000, 2000, 'emission', mockRandom);
      nebula.particleCount = 50;
      mockCamera.worldToScreen.mockReturnValue([400, 300]);
      
      nebula.render(mockRenderer, mockCamera);
      
      // Should call arc multiple times for particles
      expect(mockRenderer.ctx.arc).toHaveBeenCalled();
      expect(mockRenderer.ctx.arc.mock.calls.length).toBeGreaterThan(5);
    });
  });

  describe('Visual Effects', () => {
    it('should apply appropriate alpha based on distance', () => {
      const nebula = new Nebula(1000, 2000, 'emission', mockRandom);
      mockCamera.worldToScreen.mockReturnValue([400, 300]);
      
      nebula.render(mockRenderer, mockCamera);
      
      // Should have set alpha during rendering
      expect(mockRenderer.ctx.globalAlpha).not.toBe(1);
    });

    it('should use different rendering for dark nebulae', () => {
      const darkNebula = new Nebula(1000, 2000, 'dark', mockRandom);
      const emissionNebula = new Nebula(1000, 2000, 'emission', mockRandom);
      mockCamera.worldToScreen.mockReturnValue([400, 300]);
      
      const mockCtx1 = { ...mockRenderer.ctx };
      const mockCtx2 = { ...mockRenderer.ctx };
      
      darkNebula.render({ ...mockRenderer, ctx: mockCtx1 }, mockCamera);
      emissionNebula.render({ ...mockRenderer, ctx: mockCtx2 }, mockCamera);
      
      // Dark nebulae should render differently (fewer particles, different colors)
      expect(mockCtx1.fillStyle).not.toBe(mockCtx2.fillStyle);
    });
  });

  describe('Integration with World Generation', () => {
    it('should be compatible with chunk-based loading', () => {
      const nebula = new Nebula(1000, 2000, 'emission', mockRandom);
      
      // Should have properties needed for chunk management
      expect(typeof nebula.x).toBe('number');
      expect(typeof nebula.y).toBe('number');
      expect(typeof nebula.id).toBe('string');
      expect(nebula.type).toBe('nebula');
    });

    it('should serialize discovery data correctly', () => {
      const nebula = new Nebula(1000, 2000, 'planetary', mockRandom);
      nebula.discovered = true;
      
      const discoveryData = nebula.getDiscoveryData();
      
      expect(discoveryData.discovered).toBe(true);
      expect(discoveryData.nebulaType).toBe('planetary');
      expect(discoveryData.timestamp).toBeGreaterThan(0);
      expect(discoveryData.discoveryValue).toBeGreaterThan(0);
    });
  });
});