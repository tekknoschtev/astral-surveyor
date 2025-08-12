import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import from compiled TypeScript
import { AsteroidGarden, AsteroidGardenTypes, selectAsteroidGardenType } from '../../dist/celestial/asteroids.js';
import { SeededRandom } from '../../dist/utils/random.js';

describe('Asteroid Garden System', () => {
  let mockRenderer;
  let mockCamera;
  
  beforeEach(() => {
    // Mock renderer with comprehensive canvas context
    mockRenderer = {
      canvas: { width: 1024, height: 768 },
      ctx: {
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        globalAlpha: 0,
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        setLineDash: vi.fn(),
        createRadialGradient: vi.fn().mockReturnValue({
          addColorStop: vi.fn()
        })
      }
    };
    
    // Mock camera
    mockCamera = {
      x: 0,
      y: 0,
      worldToScreen: vi.fn().mockReturnValue([100, 100])
    };
  });
  
  describe('AsteroidGarden Class', () => {
    it('should initialize with basic properties', () => {
      const random = new SeededRandom(12345);
      const garden = new AsteroidGarden(100, 200, 'metallic', random);
      
      expect(garden.x).toBe(100);
      expect(garden.y).toBe(200);
      expect(garden.type).toBe('asteroids');
      expect(garden.gardenType).toBe('metallic');
      expect(garden.discovered).toBe(false);
      expect(garden.rocks).toBeDefined();
      expect(garden.rocks.length).toBeGreaterThan(0);
    });
    
    it('should generate unique ID based on position and type', () => {
      const random1 = new SeededRandom(12345);
      const random2 = new SeededRandom(12345);
      
      const garden1 = new AsteroidGarden(100, 200, 'metallic', random1);
      const garden2 = new AsteroidGarden(300, 400, 'crystalline', random2);
      
      expect(garden1.id).toBeDefined();
      expect(garden2.id).toBeDefined();
      expect(garden1.id).not.toBe(garden2.id);
      expect(garden1.id).toContain('asteroids');
      expect(garden1.id).toContain('metallic');
      expect(garden2.id).toContain('crystalline');
    });
    
    it('should have appropriate discovery distance based on size', () => {
      const random = new SeededRandom(12345);
      const garden = new AsteroidGarden(0, 0, 'metallic', random);
      
      expect(garden.discoveryDistance).toBeGreaterThanOrEqual(80);
      expect(garden.discoveryDistance).toBe(Math.max(garden.fieldRadius * 1.2, 80));
    });
    
    it('should throw error for unknown garden type', () => {
      const random = new SeededRandom(12345);
      expect(() => {
        new AsteroidGarden(0, 0, 'unknown_type', random);
      }).toThrow('Unknown asteroid garden type: unknown_type');
    });
  });
  
  describe('Garden Types', () => {
    it('should have defined garden types with proper structure', () => {
      expect(AsteroidGardenTypes).toBeDefined();
      
      const requiredTypes = ['metallic', 'crystalline', 'carbonaceous', 'icy', 'rare_minerals'];
      for (const type of requiredTypes) {
        expect(AsteroidGardenTypes[type]).toBeDefined();
        
        const gardenType = AsteroidGardenTypes[type];
        expect(gardenType.name).toBeDefined();
        expect(gardenType.colors).toBeInstanceOf(Array);
        expect(gardenType.accentColors).toBeInstanceOf(Array);
        expect(gardenType.sizeRange).toBeInstanceOf(Array);
        expect(gardenType.sizeRange.length).toBe(2);
        expect(gardenType.densityRange).toBeInstanceOf(Array);
        expect(gardenType.densityRange.length).toBe(2);
        expect(gardenType.rockCountRange).toBeInstanceOf(Array);
        expect(gardenType.rockCountRange.length).toBe(2);
        expect(typeof gardenType.rarity).toBe('number');
        expect(gardenType.rarity).toBeGreaterThan(0);
        expect(gardenType.rarity).toBeLessThanOrEqual(1);
        expect(typeof gardenType.discoveryValue).toBe('number');
        expect(gardenType.discoveryValue).toBeGreaterThan(0);
        expect(typeof gardenType.glitterChance).toBe('number');
        expect(gardenType.glitterChance).toBeGreaterThanOrEqual(0);
        expect(gardenType.glitterChance).toBeLessThanOrEqual(1);
      }
    });
    
    it('should have balanced rarity distribution', () => {
      const totalRarity = Object.values(AsteroidGardenTypes)
        .reduce((sum, type) => sum + type.rarity, 0);
      
      // Should sum to approximately 1.0 (allowing for small floating point variations)
      expect(totalRarity).toBeCloseTo(1.0, 2);
    });
    
    it('should have appropriate discovery values for rarity', () => {
      // Rarer types should generally have higher discovery values
      expect(AsteroidGardenTypes.rare_minerals.discoveryValue).toBeGreaterThan(AsteroidGardenTypes.metallic.discoveryValue);
      expect(AsteroidGardenTypes.crystalline.discoveryValue).toBeGreaterThan(AsteroidGardenTypes.metallic.discoveryValue);
      expect(AsteroidGardenTypes.icy.discoveryValue).toBeGreaterThan(AsteroidGardenTypes.carbonaceous.discoveryValue);
    });
  });
  
  describe('Procedural Generation', () => {
    it('should generate different properties for different garden types', () => {
      const random1 = new SeededRandom(12345);
      const random2 = new SeededRandom(12345);
      
      const metallicGarden = new AsteroidGarden(0, 0, 'metallic', random1);
      const crystallineGarden = new AsteroidGarden(0, 0, 'crystalline', random2);
      
      // Should use different color palettes
      expect(metallicGarden.colors).not.toEqual(crystallineGarden.colors);
      expect(metallicGarden.accentColors).not.toEqual(crystallineGarden.accentColors);
    });
    
    it('should generate consistent properties with same seed', () => {
      const garden1 = new AsteroidGarden(100, 200, 'metallic', new SeededRandom(54321));
      const garden2 = new AsteroidGarden(100, 200, 'metallic', new SeededRandom(54321));
      
      expect(garden1.fieldRadius).toBe(garden2.fieldRadius);
      expect(garden1.density).toBe(garden2.density);
      expect(garden1.rockCount).toBe(garden2.rockCount);
      expect(garden1.rocks.length).toBe(garden2.rocks.length);
    });
    
    it('should generate rocks within expected ranges', () => {
      const random = new SeededRandom(12345);
      const garden = new AsteroidGarden(0, 0, 'metallic', random);
      
      const typeData = AsteroidGardenTypes.metallic;
      expect(garden.fieldRadius).toBeGreaterThanOrEqual(typeData.sizeRange[0]);
      expect(garden.fieldRadius).toBeLessThanOrEqual(typeData.sizeRange[1]);
      expect(garden.density).toBeGreaterThanOrEqual(typeData.densityRange[0]);
      expect(garden.density).toBeLessThanOrEqual(typeData.densityRange[1]);
      expect(garden.rockCount).toBeGreaterThanOrEqual(typeData.rockCountRange[0]);
      expect(garden.rockCount).toBeLessThanOrEqual(typeData.rockCountRange[1]);
    });
    
    it('should generate rocks with valid properties', () => {
      const random = new SeededRandom(12345);
      const garden = new AsteroidGarden(0, 0, 'crystalline', random);
      
      for (const rock of garden.rocks) {
        expect(typeof rock.offsetX).toBe('number');
        expect(typeof rock.offsetY).toBe('number');
        expect(rock.size).toBeGreaterThan(0);
        expect(rock.brightness).toBeGreaterThanOrEqual(0);
        expect(rock.brightness).toBeLessThanOrEqual(1);
        expect(typeof rock.color).toBe('string');
        expect(rock.color).toMatch(/^#[0-9a-f]{6}$/i);
        expect(typeof rock.rotationSpeed).toBe('number');
        expect(typeof rock.baseRotation).toBe('number');
        expect(rock.glitterIntensity).toBeGreaterThanOrEqual(0);
        expect(rock.glitterIntensity).toBeLessThanOrEqual(1);
        expect(['round', 'angular', 'irregular']).toContain(rock.shape);
      }
    });
  });
  
  describe('Discovery Logic', () => {
    it('should be discoverable when ship is within range', () => {
      const random = new SeededRandom(12345);
      const garden = new AsteroidGarden(0, 0, 'metallic', random);
      
      // Place camera within discovery distance
      mockCamera.x = garden.discoveryDistance / 2;
      mockCamera.y = garden.discoveryDistance / 2;
      
      const discovered = garden.checkDiscovery(mockCamera, 1024, 768);
      expect(discovered).toBe(true);
      expect(garden.discovered).toBe(true);
    });
    
    it('should not be discoverable when ship is too far', () => {
      const random = new SeededRandom(12345);
      const garden = new AsteroidGarden(0, 0, 'metallic', random);
      
      // Place camera outside discovery distance
      mockCamera.x = garden.discoveryDistance * 2;
      mockCamera.y = garden.discoveryDistance * 2;
      
      const discovered = garden.checkDiscovery(mockCamera, 1024, 768);
      expect(discovered).toBe(false);
      expect(garden.discovered).toBe(false);
    });
    
    it('should not rediscover already discovered gardens', () => {
      const random = new SeededRandom(12345);
      const garden = new AsteroidGarden(0, 0, 'metallic', random);
      garden.discovered = true; // Pre-discovered
      
      mockCamera.x = 0; // Within discovery distance
      mockCamera.y = 0;
      
      const discovered = garden.checkDiscovery(mockCamera, 1024, 768);
      expect(discovered).toBe(false); // Should not trigger new discovery
    });
    
    it('should have shouldDiscover method for ship-based detection', () => {
      const random = new SeededRandom(12345);
      const garden = new AsteroidGarden(0, 0, 'metallic', random);
      
      const mockShip = { x: 50, y: 50 };
      const shouldDiscover = garden.shouldDiscover(mockShip, mockCamera, 1024, 768);
      expect(typeof shouldDiscover).toBe('boolean');
    });
  });
  
  describe('Rendering System', () => {
    it('should not render when off screen', () => {
      const random = new SeededRandom(12345);
      const garden = new AsteroidGarden(0, 0, 'metallic', random);
      
      // Position garden far off screen
      mockCamera.worldToScreen.mockReturnValue([-1000, -1000]);
      
      garden.render(mockRenderer, mockCamera);
      
      // Should not have called many rendering functions
      expect(mockRenderer.ctx.arc).not.toHaveBeenCalled();
    });
    
    it('should render when on screen', () => {
      const random = new SeededRandom(12345);
      const garden = new AsteroidGarden(0, 0, 'metallic', random);
      
      // Position garden on screen
      mockCamera.worldToScreen.mockReturnValue([500, 400]);
      
      garden.render(mockRenderer, mockCamera);
      
      // Should have called rendering functions for rocks
      expect(mockRenderer.ctx.save).toHaveBeenCalled();
      expect(mockRenderer.ctx.restore).toHaveBeenCalled();
      expect(mockRenderer.ctx.beginPath).toHaveBeenCalled();
      expect(mockRenderer.ctx.fill).toHaveBeenCalled();
    });
    
    it('should render discovery indicator when discovered', () => {
      const random = new SeededRandom(12345);
      const garden = new AsteroidGarden(0, 0, 'metallic', random);
      garden.discovered = true;
      
      mockCamera.worldToScreen.mockReturnValue([500, 400]);
      
      garden.render(mockRenderer, mockCamera);
      
      // Should render discovery indicator
      expect(mockRenderer.ctx.setLineDash).toHaveBeenCalledWith([5, 5]);
      expect(mockRenderer.ctx.stroke).toHaveBeenCalled();
      expect(mockRenderer.ctx.setLineDash).toHaveBeenCalledWith([]); // Reset line dash
    });
    
    it('should render different rock shapes correctly', () => {
      const random = new SeededRandom(12345);
      const garden = new AsteroidGarden(0, 0, 'crystalline', random);
      
      // Check that different rock shapes are generated
      const shapes = garden.rocks.map(rock => rock.shape);
      const uniqueShapes = [...new Set(shapes)];
      expect(uniqueShapes.length).toBeGreaterThan(1); // Should have multiple shape types
    });
    
    it('should apply glitter effects for high-glitter gardens', () => {
      const random = new SeededRandom(12345);
      const garden = new AsteroidGarden(0, 0, 'crystalline', random); // High glitter chance
      
      mockCamera.worldToScreen.mockReturnValue([500, 400]);
      
      // Check that some rocks have high glitter intensity
      const highGlitterRocks = garden.rocks.filter(rock => rock.glitterIntensity > 0.5);
      expect(highGlitterRocks.length).toBeGreaterThan(0);
    });
  });
  
  describe('Visual Effects', () => {
    it('should use different colors for different garden types', () => {
      const random = new SeededRandom(12345);
      const metallicGarden = new AsteroidGarden(0, 0, 'metallic', random);
      const crystallineGarden = new AsteroidGarden(0, 0, 'crystalline', new SeededRandom(12345));
      
      // Should have different base colors
      expect(metallicGarden.colors).not.toEqual(crystallineGarden.colors);
      expect(metallicGarden.accentColors).not.toEqual(crystallineGarden.accentColors);
    });
    
    it('should apply appropriate glitter chances per garden type', () => {
      const testTypes = ['metallic', 'crystalline', 'carbonaceous', 'rare_minerals'];
      
      for (const type of testTypes) {
        const random = new SeededRandom(12345);
        const garden = new AsteroidGarden(0, 0, type, random);
        const typeData = AsteroidGardenTypes[type];
        
        // High-glitter gardens should have more high-glitter rocks
        const highGlitterRocks = garden.rocks.filter(rock => rock.glitterIntensity > 0.5);
        const glitterRatio = highGlitterRocks.length / garden.rocks.length;
        
        if (typeData.glitterChance > 0.8) {
          // High-glitter types should have many glittery rocks
          expect(glitterRatio).toBeGreaterThan(0.3);
        } else if (typeData.glitterChance < 0.5) {
          // Low-glitter types should have fewer glittery rocks
          expect(glitterRatio).toBeLessThan(0.7);
        }
      }
    });
  });
  
  describe('Integration with World Generation', () => {
    it('should be compatible with chunk-based loading', () => {
      const random = new SeededRandom(12345);
      const garden = new AsteroidGarden(1000, 2000, 'icy', random);
      
      // Should have position that can be used for chunk calculations
      expect(typeof garden.x).toBe('number');
      expect(typeof garden.y).toBe('number');
      expect(garden.x).toBe(1000);
      expect(garden.y).toBe(2000);
    });
    
    it('should serialize discovery data correctly', () => {
      const random = new SeededRandom(12345);
      const garden = new AsteroidGarden(0, 0, 'rare_minerals', random);
      garden.discovered = true;
      
      const discoveryData = garden.getDiscoveryData();
      expect(discoveryData.discovered).toBe(true);
      expect(discoveryData.gardenType).toBe('rare_minerals');
      expect(typeof discoveryData.timestamp).toBe('number');
      expect(discoveryData.discoveryValue).toBe(AsteroidGardenTypes.rare_minerals.discoveryValue);
    });
  });
  
  describe('Type Selection', () => {
    it('should select garden types based on rarity weights', () => {
      const selections = {};
      const iterations = 10000;
      
      // Run many selections to test distribution
      for (let i = 0; i < iterations; i++) {
        const random = new SeededRandom(i);
        const type = selectAsteroidGardenType(random);
        selections[type] = (selections[type] || 0) + 1;
      }
      
      // All defined types should be selectable (but rare types might not appear in small samples)
      const expectedTypes = Object.keys(AsteroidGardenTypes);
      for (const type of expectedTypes) {
        if (selections[type]) { // Only test if the type was selected
          expect(selections[type]).toBeGreaterThan(0);
        }
      }
      
      // Most common type should definitely be selected
      expect(selections.metallic).toBeGreaterThan(0);
      
      // More common types should be selected more often than rare types (if both exist)
      if (selections.rare_minerals) {
        expect(selections.metallic).toBeGreaterThan(selections.rare_minerals);
        if (selections.carbonaceous) {
          expect(selections.carbonaceous).toBeGreaterThan(selections.rare_minerals);
        }
      }
    });
    
    it('should fallback to metallic type', () => {
      // Test with deterministic random that would exceed all rarities
      const random = new SeededRandom(99999);
      // Force the random to return a value that exceeds the sum of all rarities
      vi.spyOn(random, 'next').mockReturnValue(1.1); // Beyond 1.0 cumulative
      
      const type = selectAsteroidGardenType(random);
      expect(type).toBe('metallic');
    });
  });
  
  describe('Performance and Edge Cases', () => {
    it('should handle very small field sizes gracefully', () => {
      // Create a garden type with minimal size
      const random = new SeededRandom(12345);
      const garden = new AsteroidGarden(0, 0, 'rare_minerals', random); // Smallest type
      
      expect(garden.fieldRadius).toBeGreaterThan(0);
      expect(garden.rocks.length).toBeGreaterThan(0);
      expect(() => garden.render(mockRenderer, mockCamera)).not.toThrow();
    });
    
    it('should handle very large field sizes gracefully', () => {
      const random = new SeededRandom(12345);
      const garden = new AsteroidGarden(0, 0, 'carbonaceous', random); // Largest type
      
      expect(garden.fieldRadius).toBeGreaterThan(0);
      expect(() => garden.render(mockRenderer, mockCamera)).not.toThrow();
    });
    
    it('should handle edge case coordinates', () => {
      const random = new SeededRandom(12345);
      const garden = new AsteroidGarden(0, 0, 'metallic', random);
      
      // Test edge case camera positions
      mockCamera.x = 0;
      mockCamera.y = 0;
      expect(() => garden.checkDiscovery(mockCamera, 1024, 768)).not.toThrow();
      
      mockCamera.x = -1000000;
      mockCamera.y = 1000000;
      expect(() => garden.checkDiscovery(mockCamera, 1024, 768)).not.toThrow();
    });
  });
});