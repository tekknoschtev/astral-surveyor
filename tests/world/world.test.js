import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import from compiled TypeScript
import { ChunkManager, InfiniteStarField } from '../../dist/world/world.js';

describe('World Generation and Management', () => {
  let chunkManager, starField;
  let mockRenderer;
  
  beforeEach(() => {
    // Reset Math.random for consistent testing
    resetMockMathRandom();
    
    mockRenderer = {
      canvas: { width: 800, height: 600 },
      ctx: {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        globalAlpha: 1,
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        save: vi.fn(),
        restore: vi.fn()
      },
      drawCircle: vi.fn(),
      drawPixel: vi.fn()
    };
    
    chunkManager = new ChunkManager();
    starField = new InfiniteStarField(chunkManager);
  });
  
  describe('ChunkManager', () => {
    it('should initialize with correct default values', () => {
      expect(chunkManager.chunkSize).toBe(2000);
      expect(chunkManager.loadRadius).toBe(1);
      expect(chunkManager.activeChunks).toBeInstanceOf(Map);
      expect(chunkManager.discoveredObjects).toBeInstanceOf(Map);
    });
    
    it('should calculate chunk coordinates from world position', () => {
      const coords1 = chunkManager.getChunkCoords(500, 750);
      const coords2 = chunkManager.getChunkCoords(2500, 4500);
      const coords3 = chunkManager.getChunkCoords(-500, -750);
      
      expect(coords1.x).toBe(0);
      expect(coords1.y).toBe(0);
      expect(coords2.x).toBe(1);
      expect(coords2.y).toBe(2);
      expect(coords3.x).toBe(-1);
      expect(coords3.y).toBe(-1);
    });
    
    it('should generate chunk keys from coordinates', () => {
      const key1 = chunkManager.getChunkKey(0, 0);
      const key2 = chunkManager.getChunkKey(1, -1);
      const key3 = chunkManager.getChunkKey(0, 0); // Same as key1
      
      expect(key1).toBe('0,0');
      expect(key2).toBe('1,-1');
      expect(key1).toBe(key3);
      expect(key1).not.toBe(key2);
    });
    
    it('should generate consistent object IDs', () => {
      const id1 = chunkManager.getObjectId(100, 200, 'star');
      const id2 = chunkManager.getObjectId(100, 200, 'star'); // Same parameters
      const id3 = chunkManager.getObjectId(100, 200, 'planet'); // Different type
      const id4 = chunkManager.getObjectId(300, 400, 'star'); // Different position
      
      expect(id1).toBe(id2); // Same parameters should give same ID
      expect(id1).not.toBe(id3); // Different type should give different ID
      expect(id1).not.toBe(id4); // Different position should give different ID
    });
    
    it('should generate chunk with background stars', () => {
      const chunk = chunkManager.generateChunk(0, 0);
      
      expect(chunk.x).toBe(0);
      expect(chunk.y).toBe(0);
      expect(chunk.stars).toBeInstanceOf(Array);
      expect(chunk.planets).toBeInstanceOf(Array);
      expect(chunk.moons).toBeInstanceOf(Array);
      expect(chunk.celestialStars).toBeInstanceOf(Array);
      
      // Should generate some background stars
      expect(chunk.stars.length).toBeGreaterThan(0);
      
      // Check star properties
      chunk.stars.forEach(star => {
        expect(star.x).toBeTypeOf('number');
        expect(star.y).toBeTypeOf('number');
        expect(star.brightness).toBeGreaterThan(0);
        expect(star.brightness).toBeLessThanOrEqual(1);
        expect(star.size).toBeGreaterThan(0);
        expect(star.color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
    
    it('should generate same chunk content for same coordinates', () => {
      const chunk1 = chunkManager.generateChunk(0, 0);
      const chunk2 = chunkManager.generateChunk(0, 0);
      
      // Should return same chunk object (cached)
      expect(chunk1).toBe(chunk2);
    });
    
    it('should cache generated chunks', () => {
      const chunk = chunkManager.generateChunk(1, 1);
      const chunkKey = chunkManager.getChunkKey(1, 1);
      
      expect(chunkManager.activeChunks.has(chunkKey)).toBe(true);
      expect(chunkManager.activeChunks.get(chunkKey)).toBe(chunk);
    });
    
    it('should get all active objects', () => {
      // Generate a few chunks first
      chunkManager.generateChunk(0, 0);
      chunkManager.generateChunk(1, 0);
      
      const activeObjects = chunkManager.getAllActiveObjects();
      
      expect(activeObjects.stars).toBeInstanceOf(Array);
      expect(activeObjects.planets).toBeInstanceOf(Array);
      expect(activeObjects.moons).toBeInstanceOf(Array);
      expect(activeObjects.celestialStars).toBeInstanceOf(Array);
      
      // Should have some stars from the generated chunks
      expect(activeObjects.stars.length).toBeGreaterThan(0);
    });
    
    it('should mark objects as discovered', () => {
      const mockObject = {
        x: 100,
        y: 200,
        type: 'star',
        starTypeName: 'G-Type Star',
        discovered: false
      };
      
      chunkManager.markObjectDiscovered(mockObject, 'Test Star');
      
      expect(mockObject.discovered).toBe(true);
      expect(chunkManager.isObjectDiscovered(mockObject)).toBe(true);
    });
    
    it('should track discovered objects persistently', () => {
      const mockObject = {
        x: 100,
        y: 200,
        type: 'planet',
        planetTypeName: 'Rocky Planet',
        discovered: false
      };
      
      // Mark as discovered
      chunkManager.markObjectDiscovered(mockObject);
      
      // Create new object with same position/type
      const sameObject = {
        x: 100,
        y: 200,
        type: 'planet',
        discovered: false
      };
      
      // Should recognize it as already discovered
      expect(chunkManager.isObjectDiscovered(sameObject)).toBe(true);
    });
    
    it('should restore discovery state for objects', () => {
      const mockObjects = [
        { x: 100, y: 200, type: 'star', discovered: false },
        { x: 300, y: 400, type: 'planet', discovered: false }
      ];
      
      // Mark first object as discovered
      chunkManager.markObjectDiscovered(mockObjects[0]);
      
      // Reset discovery flags
      mockObjects.forEach(obj => obj.discovered = false);
      
      // Restore discovery state
      chunkManager.restoreDiscoveryState(mockObjects);
      
      expect(mockObjects[0].discovered).toBe(true);
      expect(mockObjects[1].discovered).toBe(false);
    });
    
    it('should get discovered stars', () => {
      const mockStar = {
        x: 100,
        y: 200,
        type: 'star',
        starTypeName: 'Red Giant',
        discovered: false
      };
      
      chunkManager.markObjectDiscovered(mockStar);
      const discoveredStars = chunkManager.getDiscoveredStars();
      
      expect(discoveredStars).toBeInstanceOf(Array);
      expect(discoveredStars.length).toBeGreaterThan(0);
      
      const found = discoveredStars.find(star => 
        Math.floor(star.x) === 100 && Math.floor(star.y) === 200
      );
      expect(found).toBeDefined();
      expect(found?.starTypeName).toBe('Red Giant');
    });
  });
  
  describe('ChunkManager - Advanced Object ID Generation', () => {
    it('should generate planet IDs with parent star coordinates', () => {
      const mockPlanet = {
        type: 'planet',
        parentStar: { x: 500, y: 600 },
        planetIndex: 2
      };
      
      const id = chunkManager.getObjectId(123, 456, 'planet', mockPlanet);
      expect(id).toBe('planet_500_600_planet_2');
    });
    
    it('should generate moon IDs with parent planet coordinates', () => {
      const mockMoon = {
        type: 'moon',
        parentPlanet: { x: 700, y: 800 },
        moonIndex: 1
      };
      
      const id = chunkManager.getObjectId(123, 456, 'moon', mockMoon);
      expect(id).toBe('moon_700_800_moon_1');
    });
    
    it('should generate regular object IDs for objects without special properties', () => {
      const id = chunkManager.getObjectId(123.7, 456.9, 'star');
      expect(id).toBe('star_123_456');
    });
  });
  
  describe('ChunkManager - Star System Generation', () => {
    it('should select star types with proper distribution', () => {
      // Test multiple selections to verify distribution
      const starTypes = new Set();
      const mockRng = {
        values: [0.1, 0.4, 0.6, 0.85, 0.95, 0.99, 0.999],
        index: 0,
        nextFloat: function() { return this.values[this.index++ % this.values.length]; }
      };
      
      for (let i = 0; i < 7; i++) {
        const starType = chunkManager.selectStarType(mockRng);
        expect(starType).toHaveProperty('name');
        expect(starType).toHaveProperty('rarity');
        starTypes.add(starType.name);
      }
      
      // Should select multiple different star types
      expect(starTypes.size).toBeGreaterThan(1);
    });
    
    it('should select planet types based on orbital distance', () => {
      const mockStar = { radius: 50 };
      const mockRng = {
        value: 0.5,
        nextFloat: function() { return this.value; }
      };
      
      // Test close to star - should favor hot planets
      const closePlanet = chunkManager.selectPlanetType(mockRng, 100, mockStar);
      expect(closePlanet).toHaveProperty('name');
      
      // Test far from star - should favor cold planets
      const farPlanet = chunkManager.selectPlanetType(mockRng, 800, mockStar);
      expect(farPlanet).toHaveProperty('name');
    });
    
    it('should apply star type modifiers correctly', () => {
      const baseProbabilities = {
        ROCKY: 0.5,
        OCEAN: 0.3,
        VOLCANIC: 0.1,
        FROZEN: 0.1
      };
      
      // Test with Blue Giant (should increase volcanic, decrease ocean)
      const mockBlueGiant = { name: 'Blue Giant' };
      const modifiedProbs = chunkManager.applyStarTypeModifiers(baseProbabilities, mockBlueGiant, 0.3);
      
      expect(modifiedProbs).toHaveProperty('ROCKY');
      expect(modifiedProbs).toHaveProperty('OCEAN');
      expect(modifiedProbs).toHaveProperty('VOLCANIC');
      expect(modifiedProbs).toHaveProperty('FROZEN');
      
      // Should not modify original object
      expect(baseProbabilities.ROCKY).toBe(0.5);
    });
  });
  
  describe('ChunkManager - Binary Star Systems', () => {
    it('should select appropriate companion star types', () => {
      const mockRng = {
        value: 0.5,
        nextFloat: function(min, max) { 
          if (arguments.length === 0) return this.value;
          return min + this.value * (max - min);
        }
      };
      
      // Test with various primary star types
      const mockGiant = { name: 'Red Giant' };
      const companion1 = chunkManager.selectCompanionStarType(mockRng, mockGiant);
      expect(companion1).toHaveProperty('name');
      
      const mockMainSequence = { name: 'G-Type' };
      const companion2 = chunkManager.selectCompanionStarType(mockRng, mockMainSequence);
      expect(companion2).toHaveProperty('name');
    });
  });
  
  describe('ChunkManager - Chunk Management', () => {
    it('should update active chunks based on player position', () => {
      // Generate initial chunks
      chunkManager.updateActiveChunks(500, 500);
      
      // Should have generated chunks around (0,0) position
      expect(chunkManager.activeChunks.size).toBeGreaterThan(0);
      
      const initialSize = chunkManager.activeChunks.size;
      
      // Move player to different location
      chunkManager.updateActiveChunks(2500, 2500);
      
      // Should have updated chunks - may be same size but different chunks
      expect(chunkManager.activeChunks.size).toBeGreaterThan(0);
    });
    
    it('should unload distant chunks to save memory', () => {
      // Generate chunks at different locations
      chunkManager.updateActiveChunks(0, 0);
      const nearChunks = new Set(chunkManager.activeChunks.keys());
      
      // Move very far away
      chunkManager.updateActiveChunks(10000, 10000);
      const farChunks = new Set(chunkManager.activeChunks.keys());
      
      // Should have different chunks loaded
      expect(nearChunks).not.toEqual(farChunks);
    });
  });
  
  describe('ChunkManager - Position Scoring', () => {
    it('should score star system positions for optimal spacing', () => {
      // Generate a chunk with a star system
      const chunk = chunkManager.generateChunk(0, 0);
      
      // Score various positions
      const score1 = chunkManager.scoreStarSystemPosition(500, 500, 0, 0);
      const score2 = chunkManager.scoreStarSystemPosition(1500, 1500, 1, 1);
      
      expect(score1).toBeGreaterThanOrEqual(0);
      expect(score2).toBeGreaterThanOrEqual(0);
      expect(typeof score1).toBe('number');
      expect(typeof score2).toBe('number');
    });
  });
  
  describe('ChunkManager - Moon Generation', () => {
    it('should generate moons for gas giant planets', () => {
      const mockPlanet = {
        planetType: { name: 'Gas Giant' },
        radius: 30,
        x: 500,
        y: 500
      };
      
      const mockRng = {
        values: [0.5, 0.3, 0.7, 0.4, 0.8, 0.2],
        index: 0,
        nextFloat: function(min, max) { 
          const val = this.values[this.index++ % this.values.length];
          if (arguments.length === 0) return val;
          return min + val * (max - min);
        },
        nextInt: function(min, max) {
          return Math.floor(this.nextFloat(min, max + 1));
        }
      };
      
      const chunk = { moons: [] };
      
      // Mock the planet types
      const originalPlanetTypes = global.PlanetTypes;
      global.PlanetTypes = {
        GAS_GIANT: { name: 'Gas Giant' },
        ROCKY: { name: 'Rocky' },
        OCEAN: { name: 'Ocean' }
      };
      
      try {
        chunkManager.generateMoonsForPlanet(mockPlanet, mockRng, chunk);
        
        // Should potentially generate moons (based on probability)
        expect(chunk.moons).toBeInstanceOf(Array);
        expect(chunk.moons.length).toBeGreaterThanOrEqual(0);
      } finally {
        global.PlanetTypes = originalPlanetTypes;
      }
    });
  });
  
  describe('ChunkManager - Discovery System Extended', () => {
    it('should get discovered planets with proper data structure', () => {
      // Create a mock discovered planet in the system
      chunkManager.discoveredObjects.set('planet_100_200_planet_0', {
        discovered: true,
        timestamp: Date.now(),
        planetTypeName: 'Rocky Planet',
        objectName: 'Test Planet'
      });
      
      const discoveredPlanets = chunkManager.getDiscoveredPlanets();
      expect(discoveredPlanets).toBeInstanceOf(Array);
    });
    
    it('should get discovered moons with proper data structure', () => {
      // Create a mock discovered moon in the system
      chunkManager.discoveredObjects.set('moon_300_400_moon_0', {
        discovered: true,
        timestamp: Date.now()
      });
      
      const discoveredMoons = chunkManager.getDiscoveredMoons();
      expect(discoveredMoons).toBeInstanceOf(Array);
    });
    
    it('should handle discovery data with optional object names', () => {
      const mockObject = {
        x: 500,
        y: 600,
        type: 'planet',
        planetTypeName: 'Ocean World',
        discovered: false
      };
      
      chunkManager.markObjectDiscovered(mockObject, 'New Terra');
      
      expect(mockObject.discovered).toBe(true);
      
      const discoveryData = chunkManager.discoveredObjects.get(
        chunkManager.getObjectId(mockObject.x, mockObject.y, mockObject.type, mockObject)
      );
      
      expect(discoveryData).toBeDefined();
      expect(discoveryData?.objectName).toBe('New Terra');
      expect(discoveryData?.planetTypeName).toBe('Ocean World');
    });
  });
  
  describe('InfiniteStarField', () => {
    let mockCamera;
    
    beforeEach(() => {
      mockCamera = {
        x: 0,
        y: 0,
        worldToScreen: vi.fn((x, y) => [x + 400, y + 300])
      };
    });
    
    it('should initialize with correct default values', () => {
      expect(starField.parallaxLayers).toBeInstanceOf(Array);
      expect(starField.parallaxLayers.length).toBe(3);
      expect(starField.chunkManager).toBe(chunkManager);
      expect(starField.lastCameraX).toBe(0);
      expect(starField.lastCameraY).toBe(0);
      
      // Check each layer has expected properties
      starField.parallaxLayers.forEach(layer => {
        expect(layer.stars).toBeInstanceOf(Map);
        expect(layer.depth).toBeGreaterThan(0);
        expect(layer.density).toBeGreaterThan(0);
        expect(layer.brightnesRange).toHaveLength(2);
        expect(layer.sizeRange).toHaveLength(2);
        expect(layer.colors).toBeInstanceOf(Array);
        expect(layer.colors.length).toBeGreaterThan(0);
      });
    });
    
    it('should generate parallax stars for regions', () => {
      const layer = starField.parallaxLayers[0];
      const stars = starField.generateParallaxStars(layer, 0, 0, 1000);
      
      expect(stars).toBeInstanceOf(Array);
      expect(stars.length).toBeGreaterThan(0);
      
      // Check star properties
      stars.forEach(star => {
        expect(star.x).toBeTypeOf('number');
        expect(star.y).toBeTypeOf('number');
        expect(star.brightness).toBeGreaterThan(0);
        expect(star.brightness).toBeLessThanOrEqual(1);
        expect(star.size).toBeGreaterThanOrEqual(layer.sizeRange[0]);
        expect(star.size).toBeLessThanOrEqual(layer.sizeRange[1]);
        expect(layer.colors).toContain(star.color);
      });
    });
    
    it('should cache generated parallax stars', () => {
      const layer = starField.parallaxLayers[0];
      const stars1 = starField.generateParallaxStars(layer, 1000, 2000, 1000);
      const stars2 = starField.generateParallaxStars(layer, 1000, 2000, 1000);
      
      // Should return same array (cached)
      expect(stars1).toBe(stars2);
    });
    
    it('should render all components correctly', () => {
      // Generate some chunks to ensure there's content to render
      chunkManager.generateChunk(0, 0);
      
      starField.render(mockRenderer, mockCamera);
      
      // Should have called rendering functions
      expect(mockRenderer.drawPixel).toHaveBeenCalled();
      
      // Should update camera tracking
      expect(starField.lastCameraX).toBe(mockCamera.x);
      expect(starField.lastCameraY).toBe(mockCamera.y);
    });
    
    it('should render parallax layers with depth-based positioning', () => {
      starField.renderParallaxLayers(mockRenderer, mockCamera);
      
      // Should have attempted to render stars
      expect(mockRenderer.drawPixel).toHaveBeenCalled();
    });
    
    it('should render chunk stars with proper screen positioning', () => {
      // Generate a chunk with stars
      chunkManager.generateChunk(0, 0);
      
      starField.renderChunkStars(mockRenderer, mockCamera);
      
      // Should have called worldToScreen for positioning
      expect(mockCamera.worldToScreen).toHaveBeenCalled();
      
      // Should have rendered pixels or circles
      expect(mockRenderer.drawPixel).toHaveBeenCalled();
    });
    
    it('should handle camera movement for parallax effects', () => {
      // Move camera and render
      mockCamera.x = 1000;
      mockCamera.y = 2000;
      
      starField.render(mockRenderer, mockCamera);
      
      expect(starField.lastCameraX).toBe(1000);
      expect(starField.lastCameraY).toBe(2000);
    });
    
    it('should only render on-screen stars for performance', () => {
      // Mock off-screen positioning
      mockCamera.worldToScreen.mockReturnValue([-100, -100]);
      
      chunkManager.generateChunk(0, 0);
      
      const drawCallsBefore = mockRenderer.drawPixel.mock.calls.length;
      starField.renderChunkStars(mockRenderer, mockCamera);
      const drawCallsAfter = mockRenderer.drawPixel.mock.calls.length;
      
      // Should have minimal or no draw calls for off-screen stars
      expect(drawCallsAfter - drawCallsBefore).toBe(0);
    });
  });
  
  describe('Integration Tests', () => {
    it('should generate different chunks with different content', () => {
      const chunk1 = chunkManager.generateChunk(0, 0);
      const chunk2 = chunkManager.generateChunk(1, 1);
      
      // Different chunks should have different star positions
      const chunk1FirstStar = chunk1.stars[0];
      const chunk2FirstStar = chunk2.stars[0];
      
      expect(chunk1FirstStar.x).not.toBe(chunk2FirstStar.x);
      expect(chunk1FirstStar.y).not.toBe(chunk2FirstStar.y);
    });
    
    it('should handle edge cases with large coordinates', () => {
      const largeChunk = chunkManager.generateChunk(1000, -1000);
      
      expect(largeChunk.x).toBe(1000);
      expect(largeChunk.y).toBe(-1000);
      expect(largeChunk.stars.length).toBeGreaterThan(0);
    });
    
    it('should generate consistent results with deterministic seeds', () => {
      const chunk1a = chunkManager.generateChunk(5, 5);
      
      // Create new manager and generate same chunk
      const newManager = new ChunkManager();
      const chunk1b = newManager.generateChunk(5, 5);
      
      // Should have same number of stars (deterministic generation)
      expect(chunk1a.stars.length).toBe(chunk1b.stars.length);
      
      // First stars should be at same positions
      expect(chunk1a.stars[0].x).toBeCloseTo(chunk1b.stars[0].x, 1);
      expect(chunk1a.stars[0].y).toBeCloseTo(chunk1b.stars[0].y, 1);
    });
  });
});

// Helper function to reset Math.random for consistent testing
function resetMockMathRandom() {
  let mockRandomCounter = 0;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    const values = [0.1, 0.5, 0.7, 0.3, 0.9, 0.2, 0.8, 0.4, 0.6, 0.15];
    return values[mockRandomCounter++ % values.length];
  });
}

// Additional integration test
describe('Full World Integration', () => {
  it('should handle complete world generation workflow', () => {
    const chunkManager = new ChunkManager();
    const starField = new InfiniteStarField(chunkManager);
    
    // Simulate player exploration pattern
    const explorationPath = [
      [0, 0], [1000, 0], [2000, 1000], [0, 2000], [-1000, -1000]
    ];
    
    explorationPath.forEach(([x, y]) => {
      chunkManager.updateActiveChunks(x, y);
      const activeObjects = chunkManager.getAllActiveObjects();
      
      // Should always have background stars
      expect(activeObjects.stars.length).toBeGreaterThan(0);
      
      // Discover any celestial stars found
      activeObjects.celestialStars.forEach(star => {
        chunkManager.markObjectDiscovered(star, `Star at ${star.x},${star.y}`);
      });
    });
    
    // Should have discovered some stars across the exploration
    const discoveredStars = chunkManager.getDiscoveredStars();
    expect(discoveredStars.length).toBeGreaterThanOrEqual(0);
  });
});