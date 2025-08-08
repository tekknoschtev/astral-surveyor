import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import from compiled TypeScript instead of duplicate modules
import { CelestialObject, Planet, Moon, Star, PlanetTypes, StarTypes } from '../../dist/celestial/celestial.js';

describe('CelestialObject Discovery Logic', () => {
  let camera;
  
  beforeEach(() => {
    // Set up global state - not needed for ES6 modules
    resetMockMathRandom();
    
    // Create mock camera with vitest spy
    camera = {
      x: 100,
      y: 100,
      worldToScreen: vi.fn((worldX, worldY, canvasWidth, canvasHeight) => {
        // Simple mock: return screen coordinates based on world position
        const screenX = (worldX - camera.x) + canvasWidth / 2;
        const screenY = (worldY - camera.y) + canvasHeight / 2;
        return [screenX, screenY];
      })
    };
  });
  
  describe('Base CelestialObject', () => {
    it('should calculate distance to ship correctly', () => {
      const obj = new CelestialObject(150, 175, 'test');
      
      // Distance from camera at (100, 100) to object at (150, 175)
      // Should be sqrt((150-100)^2 + (175-100)^2) = sqrt(50^2 + 75^2) = sqrt(8125) ≈ 90.14
      const distance = obj.distanceToShip(camera);
      
      expect(distance).toBeCloseTo(90.14, 2);
    });
    
    it('should not discover objects that are already discovered', () => {
      const obj = new CelestialObject(120, 130, 'test');
      obj.discovered = true;
      
      const result = obj.checkDiscovery(camera, 800, 600);
      
      expect(result).toBe(false);
    });
  });
  
  describe('Star Discovery Logic', () => {
    it('should discover stars when they are visible on screen', () => {
      const star = new CelestialObject(150, 150, 'star');
      star.radius = 30;
      
      // Mock worldToScreen to return coordinates that are on screen
      camera.worldToScreen.mockReturnValue([400, 300]); // Center of 800x600 screen
      
      const result = star.checkDiscovery(camera, 800, 600);
      
      expect(result).toBe(true);
      expect(star.discovered).toBe(true);
      expect(camera.worldToScreen).toHaveBeenCalledWith(150, 150, 800, 600);
    });
    
    it('should not discover stars when they are off screen', () => {
      const star = new CelestialObject(200, 200, 'star');
      star.radius = 20;
      
      // Mock worldToScreen to return coordinates that are off screen
      camera.worldToScreen.mockReturnValue([-100, -100]); // Off screen
      
      const result = star.checkDiscovery(camera, 800, 600);
      
      expect(result).toBe(false);
      expect(star.discovered).toBe(false);
    });
    
    it('should discover stars near screen edges with margin', () => {
      const star = new CelestialObject(300, 300, 'star');
      star.radius = 60; // Large radius for bigger margin
      
      // Mock coordinates just outside screen bounds but within margin
      camera.worldToScreen.mockReturnValue([-40, 300]); // 40px left of screen
      
      const result = star.checkDiscovery(camera, 800, 600);
      
      expect(result).toBe(true);
      expect(star.discovered).toBe(true);
    });
    
    it('should use minimum 50px margin for small stars', () => {
      const smallStar = new CelestialObject(400, 400, 'star');
      smallStar.radius = 10; // Small radius
      
      // Mock coordinates 30px outside screen (within 50px margin)
      camera.worldToScreen.mockReturnValue([-30, 300]);
      
      const result = smallStar.checkDiscovery(camera, 800, 600);
      
      expect(result).toBe(true);
      expect(smallStar.discovered).toBe(true);
    });
    
    it('should not discover stars beyond margin', () => {
      const star = new CelestialObject(500, 500, 'star');
      star.radius = 20;
      
      // Mock coordinates well outside screen and margin
      camera.worldToScreen.mockReturnValue([-100, -100]);
      
      const result = star.checkDiscovery(camera, 800, 600);
      
      expect(result).toBe(false);
      expect(star.discovered).toBe(false);
    });
  });
  
  describe('Planet Discovery Logic', () => {
    it('should discover planets using distance-based logic', () => {
      const planet = new CelestialObject(140, 140, 'planet');
      planet.discoveryDistance = 50;
      
      // Planet is at (140, 140), camera at (100, 100)
      // Distance is sqrt(40^2 + 40^2) = sqrt(3200) ≈ 56.57
      // This is greater than discoveryDistance of 50, so should not discover
      let result = planet.checkDiscovery(camera, 800, 600);
      expect(result).toBe(false);
      
      // Move planet closer
      planet.x = 130;
      planet.y = 130;
      // Distance is now sqrt(30^2 + 30^2) = sqrt(1800) ≈ 42.43
      // This is less than discoveryDistance of 50, so should discover
      result = planet.checkDiscovery(camera, 800, 600);
      expect(result).toBe(true);
      expect(planet.discovered).toBe(true);
    });
    
    it('should not use visibility-based discovery for planets', () => {
      const planet = new CelestialObject(200, 200, 'planet');
      planet.discoveryDistance = 30;
      
      // Mock worldToScreen to return on-screen coordinates
      camera.worldToScreen.mockReturnValue([400, 300]);
      
      // But planet is far from camera (distance > discoveryDistance)
      const result = planet.checkDiscovery(camera, 800, 600);
      
      expect(result).toBe(false);
      expect(planet.discovered).toBe(false);
      // Should not have called worldToScreen for planets
      expect(camera.worldToScreen).not.toHaveBeenCalled();
    });
  });
  
  describe('Moon Discovery Logic', () => {
    it('should discover moons using distance-based logic like planets', () => {
      const moon = new CelestialObject(115, 115, 'moon');
      moon.discoveryDistance = 25;
      
      // Moon is at (115, 115), camera at (100, 100)
      // Distance is sqrt(15^2 + 15^2) = sqrt(450) ≈ 21.21
      // This is less than discoveryDistance of 25, so should discover
      const result = moon.checkDiscovery(camera, 800, 600);
      
      expect(result).toBe(true);
      expect(moon.discovered).toBe(true);
      expect(camera.worldToScreen).not.toHaveBeenCalled();
    });
    
    it('should not discover distant moons even if visible on screen', () => {
      const moon = new CelestialObject(300, 300, 'moon');
      moon.discoveryDistance = 30;
      
      // Mock worldToScreen to return on-screen coordinates
      camera.worldToScreen.mockReturnValue([400, 300]);
      
      // But moon is far from camera
      const result = moon.checkDiscovery(camera, 800, 600);
      
      expect(result).toBe(false);
      expect(moon.discovered).toBe(false);
    });
  });
  
  describe('Mixed object type discovery', () => {
    it('should apply different discovery rules to different object types', () => {
      const star = new CelestialObject(200, 200, 'star');
      star.radius = 25;
      
      const planet = new CelestialObject(200, 200, 'planet'); // Same position
      planet.discoveryDistance = 50;
      
      const moon = new CelestialObject(200, 200, 'moon'); // Same position
      moon.discoveryDistance = 30;
      
      // Mock star as visible on screen
      camera.worldToScreen.mockReturnValue([400, 300]);
      
      // All objects are at distance sqrt(100^2 + 100^2) ≈ 141.42 from camera
      
      const starResult = star.checkDiscovery(camera, 800, 600);
      const planetResult = planet.checkDiscovery(camera, 800, 600);
      const moonResult = moon.checkDiscovery(camera, 800, 600);
      
      // Star should be discovered (visibility-based)
      expect(starResult).toBe(true);
      expect(star.discovered).toBe(true);
      
      // Planet should not be discovered (distance > discoveryDistance)
      expect(planetResult).toBe(false);
      expect(planet.discovered).toBe(false);
      
      // Moon should not be discovered (distance > discoveryDistance)
      expect(moonResult).toBe(false);
      expect(moon.discovered).toBe(false);
    });
  });
  
  describe('Edge cases', () => {
    it('should handle objects at camera position', () => {
      const star = new CelestialObject(100, 100, 'star'); // Same as camera
      star.radius = 20;
      
      camera.worldToScreen.mockReturnValue([400, 300]); // On screen
      
      const result = star.checkDiscovery(camera, 800, 600);
      
      expect(result).toBe(true);
      expect(star.discovered).toBe(true);
    });
    
    it('should handle very large stars with large margins', () => {
      const largeStar = new CelestialObject(500, 500, 'star');
      largeStar.radius = 200; // Very large star
      
      // Position well off screen but within large margin
      camera.worldToScreen.mockReturnValue([-150, 300]);
      
      const result = largeStar.checkDiscovery(camera, 800, 600);
      
      expect(result).toBe(true);
      expect(largeStar.discovered).toBe(true);
    });
    
    it('should handle screen edge coordinates correctly', () => {
      const star = new CelestialObject(600, 600, 'star');
      star.radius = 30;
      
      // Exactly at screen edge
      camera.worldToScreen.mockReturnValue([800, 600]); // Bottom-right corner
      
      const result = star.checkDiscovery(camera, 800, 600);
      
      expect(result).toBe(true);
      expect(star.discovered).toBe(true);
    });
  });
});

// Additional test suites for Star, Planet, and Moon classes

describe('Star Class', () => {
  let mockCamera, mockRenderer;
  
  beforeEach(() => {
    resetMockMathRandom();
    
    mockCamera = {
      x: 0,
      y: 0,
      worldToScreen: vi.fn(() => [400, 300])
    };
    
    mockRenderer = {
      canvas: { width: 800, height: 600 },
      ctx: {
        createRadialGradient: vi.fn(() => ({
          addColorStop: vi.fn()
        })),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        beginPath: vi.fn(),
        arc: vi.fn(),
        ellipse: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        clip: vi.fn(),
        rect: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        quadraticCurveTo: vi.fn()
      },
      drawCircle: vi.fn()
    };
  });
  
  it('should initialize with default G-type star properties', () => {
    const star = new Star(100, 200);
    
    expect(star.x).toBe(100);
    expect(star.y).toBe(200);
    expect(star.type).toBe('star');
    expect(star.starType).toBe(StarTypes.G_TYPE);
    expect(star.starTypeName).toBe('G-Type Star');
    expect(star.planets).toEqual([]);
    expect(star.radius).toBeGreaterThan(80);
    expect(star.color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(star.brightness).toBe(1.0);
  });
  
  it('should initialize with custom star type', () => {
    const star = new Star(0, 0, StarTypes.RED_GIANT);
    
    expect(star.starType).toBe(StarTypes.RED_GIANT);
    expect(star.starTypeName).toBe('Red Giant');
  });
  
  it('should generate unique ID based on position', () => {
    const star = new Star(123, 456);
    const expectedId = 'star_123_456';
    
    expect(star.generateUniqueId()).toBe(expectedId);
  });
  
  it('should hash string to number consistently', () => {
    const star = new Star(0, 0);
    const hash1 = star.hashStringToNumber('test_string');
    const hash2 = star.hashStringToNumber('test_string');
    const hash3 = star.hashStringToNumber('different_string');
    
    expect(hash1).toBe(hash2); // Same input = same output
    expect(hash1).not.toBe(hash3); // Different input = different output
    expect(hash1).toBeGreaterThanOrEqual(0);
    expect(hash1).toBeLessThan(1000000);
  });
  
  it('should add planets to its planetary system', () => {
    const star = new Star(0, 0);
    const planet1 = new Planet(10, 0);
    const planet2 = new Planet(20, 0);
    
    star.addPlanet(planet1);
    star.addPlanet(planet2);
    
    expect(star.planets).toHaveLength(2);
    expect(star.planets).toContain(planet1);
    expect(star.planets).toContain(planet2);
  });
  
  it('should render on screen', () => {
    const star = new Star(100, 100);
    star.render(mockRenderer, mockCamera);
    
    expect(mockCamera.worldToScreen).toHaveBeenCalledWith(100, 100, 800, 600);
    expect(mockRenderer.drawCircle).toHaveBeenCalled();
  });
  
  it('should not render when off screen', () => {
    const star = new Star(100, 100);
    mockCamera.worldToScreen.mockReturnValue([-1000, -1000]); // Far off screen
    
    star.render(mockRenderer, mockCamera);
    
    expect(mockRenderer.drawCircle).not.toHaveBeenCalled();
  });
  
  it('should render discovery indicator when discovered', () => {
    const star = new Star(100, 100);
    star.discovered = true;
    
    star.render(mockRenderer, mockCamera);
    
    expect(mockRenderer.ctx.strokeStyle).toBe('#00ff88');
    expect(mockRenderer.ctx.lineWidth).toBe(3);
  });
  
  it('should lighten colors correctly', () => {
    const star = new Star(0, 0);
    const darkColor = '#804020'; // Dark brown
    const lightened = star.lightenColor(darkColor, 0.5);
    
    // Should move towards white
    expect(lightened).toMatch(/^#[0-9a-f]{6}$/i);
    expect(lightened).not.toBe(darkColor);
    
    // Parse colors to verify lightening
    const originalR = parseInt(darkColor.slice(1, 3), 16);
    const lightenedR = parseInt(lightened.slice(1, 3), 16);
    expect(lightenedR).toBeGreaterThan(originalR);
  });
  
  it('should darken colors correctly', () => {
    const star = new Star(0, 0);
    const lightColor = '#c0a080'; // Light brown
    const darkened = star.darkenColor(lightColor, 0.3);
    
    // Should move towards black
    expect(darkened).toMatch(/^#[0-9a-f]{6}$/i);
    expect(darkened).not.toBe(lightColor);
    
    // Parse colors to verify darkening
    const originalR = parseInt(lightColor.slice(1, 3), 16);
    const darkenedR = parseInt(darkened.slice(1, 3), 16);
    expect(darkenedR).toBeLessThan(originalR);
  });
});

describe('Planet Class', () => {
  let mockCamera, mockRenderer;
  
  beforeEach(() => {
    resetMockMathRandom();
    
    mockCamera = {
      x: 0,
      y: 0,
      worldToScreen: vi.fn(() => [400, 300])
    };
    
    mockRenderer = {
      canvas: { width: 800, height: 600 },
      ctx: {
        createRadialGradient: vi.fn(() => ({
          addColorStop: vi.fn()
        })),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        beginPath: vi.fn(),
        arc: vi.fn(),
        ellipse: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        clip: vi.fn(),
        rect: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        fillRect: vi.fn()
      },
      drawCircle: vi.fn()
    };
  });
  
  it('should initialize with default rocky planet properties', () => {
    const planet = new Planet(50, 100);
    
    expect(planet.x).toBe(50);
    expect(planet.y).toBe(100);
    expect(planet.type).toBe('planet');
    expect(planet.planetType).toBe(PlanetTypes.ROCKY);
    expect(planet.planetTypeName).toBe('Rocky Planet');
    expect(planet.radius).toBeGreaterThan(8);
    expect(planet.color).toMatch(/^#[0-9a-f]{6}$/i);
  });
  
  it('should initialize with custom planet type', () => {
    const planet = new Planet(0, 0, null, 0, 0, 0, PlanetTypes.GAS_GIANT);
    
    expect(planet.planetType).toBe(PlanetTypes.GAS_GIANT);
    expect(planet.planetTypeName).toBe('Gas Giant');
  });
  
  it('should generate unique ID with parent star', () => {
    const parentStar = new Star(100, 200);
    const planet = new Planet(110, 200, parentStar);
    planet.planetIndex = 2;
    
    const expectedId = 'planet_100_200_planet_2';
    expect(planet.generateUniqueId()).toBe(expectedId);
  });
  
  it('should generate unique ID without parent star', () => {
    const planet = new Planet(123, 456);
    
    const expectedId = 'planet_123_456';
    expect(planet.generateUniqueId()).toBe(expectedId);
  });
  
  it('should determine ring system for gas giant', () => {
    const planet = new Planet(0, 0, null, 0, 0, 0, PlanetTypes.GAS_GIANT);
    
    // Gas giants have 40% chance of rings
    const hasRings = planet.determineRingSystem();
    expect(typeof hasRings).toBe('boolean');
  });
  
  it('should always have rings when hasRings is true', () => {
    const customPlanetType = {
      ...PlanetTypes.ROCKY,
      visualEffects: { hasRings: true }
    };
    const planet = new Planet(0, 0, null, 0, 0, 0, customPlanetType);
    
    expect(planet.determineRingSystem()).toBe(true);
  });
  
  it('should never have rings when hasRings is false or undefined', () => {
    const customPlanetType = {
      ...PlanetTypes.ROCKY,
      visualEffects: { hasRings: false }
    };
    const planet = new Planet(0, 0, null, 0, 0, 0, customPlanetType);
    
    expect(planet.determineRingSystem()).toBe(false);
  });
  
  it('should update orbital position when it has a parent star', () => {
    const parentStar = new Star(100, 100);
    const planet = new Planet(150, 100, parentStar, 50, 0, 1.0); // 50px orbital distance, 0 angle, 1.0 speed
    
    const initialAngle = planet.orbitalAngle;
    planet.updatePosition(0.1); // 0.1 second delta
    
    expect(planet.orbitalAngle).toBe(initialAngle + 0.1);
    // Position should be updated based on new angle
    expect(planet.x).toBeCloseTo(100 + Math.cos(0.1) * 50, 1);
    expect(planet.y).toBeCloseTo(100 + Math.sin(0.1) * 50, 1);
  });
  
  it('should wrap orbital angle within 2π range', () => {
    const parentStar = new Star(100, 100);
    const planet = new Planet(150, 100, parentStar, 50, Math.PI * 1.9, 1.0);
    
    planet.updatePosition(0.5); // Should push angle over 2π
    
    expect(planet.orbitalAngle).toBeLessThan(Math.PI * 2);
    expect(planet.orbitalAngle).toBeGreaterThanOrEqual(0);
  });
  
  it('should not update position without parent star', () => {
    const planet = new Planet(100, 200);
    const initialX = planet.x;
    const initialY = planet.y;
    
    planet.updatePosition(1.0);
    
    expect(planet.x).toBe(initialX);
    expect(planet.y).toBe(initialY);
  });
  
  it('should render on screen', () => {
    const planet = new Planet(100, 100);
    planet.render(mockRenderer, mockCamera);
    
    expect(mockCamera.worldToScreen).toHaveBeenCalledWith(100, 100, 800, 600);
    expect(mockRenderer.drawCircle).toHaveBeenCalled();
  });
  
  it('should not render when off screen', () => {
    const planet = new Planet(100, 100);
    mockCamera.worldToScreen.mockReturnValue([-1000, -1000]); // Far off screen
    
    planet.render(mockRenderer, mockCamera);
    
    expect(mockRenderer.drawCircle).not.toHaveBeenCalled();
  });
  
  it('should render discovery indicator when discovered', () => {
    const planet = new Planet(100, 100);
    planet.discovered = true;
    
    planet.render(mockRenderer, mockCamera);
    
    expect(mockRenderer.ctx.strokeStyle).toBe('#00ff88');
    expect(mockRenderer.ctx.lineWidth).toBe(2);
  });
  
  it('should darken and lighten colors correctly', () => {
    const planet = new Planet(0, 0);
    const testColor = '#8080ff';
    
    const darkened = planet.darkenColor(testColor, 0.3);
    const lightened = planet.lightenColor(testColor, 0.3);
    
    expect(darkened).toMatch(/^#[0-9a-f]{6}$/i);
    expect(lightened).toMatch(/^#[0-9a-f]{6}$/i);
    expect(darkened).not.toBe(testColor);
    expect(lightened).not.toBe(testColor);
  });
});

describe('Moon Class', () => {
  let mockCamera, mockRenderer;
  
  beforeEach(() => {
    resetMockMathRandom();
    
    mockCamera = {
      x: 0,
      y: 0,
      worldToScreen: vi.fn(() => [400, 300])
    };
    
    mockRenderer = {
      canvas: { width: 800, height: 600 },
      ctx: {
        strokeStyle: '',
        lineWidth: 0,
        beginPath: vi.fn(),
        arc: vi.fn(),
        stroke: vi.fn()
      },
      drawCircle: vi.fn()
    };
  });
  
  it('should initialize with default properties', () => {
    const moon = new Moon(30, 40);
    
    expect(moon.x).toBe(30);
    expect(moon.y).toBe(40);
    expect(moon.type).toBe('moon');
    expect(moon.radius).toBeGreaterThanOrEqual(2);
    expect(moon.color).toMatch(/^#[0-9a-f]{6}$/i);
  });
  
  it('should size itself relative to parent planet', () => {
    const parentPlanet = new Planet(100, 100);
    parentPlanet.radius = 20;
    const moon = new Moon(120, 100, parentPlanet);
    
    // Should be ~15% of parent size, minimum 2px
    expect(moon.radius).toBeGreaterThanOrEqual(2);
    expect(moon.radius).toBeLessThanOrEqual(parentPlanet.radius * 0.15 + 1); // Small tolerance
  });
  
  it('should generate unique ID with parent planet', () => {
    const parentPlanet = new Planet(200, 300);
    const moon = new Moon(210, 300, parentPlanet);
    moon.moonIndex = 1;
    
    const expectedId = 'moon_200_300_moon_1';
    expect(moon.generateUniqueId()).toBe(expectedId);
  });
  
  it('should generate unique ID without parent planet', () => {
    const moon = new Moon(123, 456);
    
    const expectedId = 'moon_123_456';
    expect(moon.generateUniqueId()).toBe(expectedId);
  });
  
  it('should update orbital position when it has a parent planet', () => {
    const parentPlanet = new Planet(100, 100);
    const moon = new Moon(120, 100, parentPlanet, 20, 0, 2.0); // 20px orbital distance, 0 angle, 2.0 speed
    
    const initialAngle = moon.orbitalAngle;
    moon.updatePosition(0.1); // 0.1 second delta
    
    expect(moon.orbitalAngle).toBe(initialAngle + 0.2); // 2.0 speed * 0.1 time
    // Position should be updated based on new angle
    expect(moon.x).toBeCloseTo(100 + Math.cos(0.2) * 20, 1);
    expect(moon.y).toBeCloseTo(100 + Math.sin(0.2) * 20, 1);
  });
  
  it('should generate moon colors with variety', () => {
    const moon1 = new Moon(0, 0);
    const moon2 = new Moon(10, 10);
    
    // Both should have valid hex colors
    expect(moon1.color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(moon2.color).toMatch(/^#[0-9a-f]{6}$/i);
  });
  
  it('should render on screen when parent planet is close', () => {
    const parentPlanet = new Planet(100, 100);
    const moon = new Moon(120, 100, parentPlanet);
    
    // Mock camera close to parent planet
    mockCamera.x = 90;
    mockCamera.y = 90;
    
    moon.render(mockRenderer, mockCamera);
    
    expect(mockCamera.worldToScreen).toHaveBeenCalledWith(120, 100, 800, 600);
    expect(mockRenderer.drawCircle).toHaveBeenCalled();
  });
  
  it('should not render when parent planet is distant', () => {
    const parentPlanet = new Planet(100, 100);
    const moon = new Moon(120, 100, parentPlanet);
    
    // Mock camera very far from parent planet
    mockCamera.x = 2000;
    mockCamera.y = 2000;
    
    moon.render(mockRenderer, mockCamera);
    
    expect(mockRenderer.drawCircle).not.toHaveBeenCalled();
  });
  
  it('should render discovery indicator when discovered', () => {
    const parentPlanet = new Planet(100, 100);
    const moon = new Moon(120, 100, parentPlanet);
    moon.discovered = true;
    
    // Mock camera close to parent planet
    mockCamera.x = 90;
    mockCamera.y = 90;
    
    moon.render(mockRenderer, mockCamera);
    
    expect(mockRenderer.ctx.strokeStyle).toBe('#00ff88');
    expect(mockRenderer.ctx.lineWidth).toBe(1);
  });
  
  it('should darken colors correctly', () => {
    const moon = new Moon(0, 0);
    const testColor = '#8080ff';
    const darkened = moon.darkenColor(testColor, 0.3);
    
    expect(darkened).toMatch(/^#[0-9a-f]{6}$/i);
    expect(darkened).not.toBe(testColor);
  });
});

describe('Planet and Star Type Definitions', () => {
  it('should have all required planet types', () => {
    const requiredTypes = ['ROCKY', 'OCEAN', 'GAS_GIANT', 'DESERT', 'FROZEN', 'VOLCANIC', 'EXOTIC'];
    
    requiredTypes.forEach(type => {
      expect(PlanetTypes[type]).toBeDefined();
      expect(PlanetTypes[type].name).toBeDefined();
      expect(PlanetTypes[type].colors).toBeInstanceOf(Array);
      expect(PlanetTypes[type].sizeMultiplier).toBeGreaterThan(0);
      expect(PlanetTypes[type].rarity).toBeGreaterThan(0);
      expect(PlanetTypes[type].rarity).toBeLessThanOrEqual(1);
    });
  });
  
  it('should have all required star types', () => {
    const requiredTypes = ['G_TYPE', 'K_TYPE', 'M_TYPE', 'RED_GIANT', 'BLUE_GIANT', 'WHITE_DWARF', 'NEUTRON_STAR'];
    
    requiredTypes.forEach(type => {
      expect(StarTypes[type]).toBeDefined();
      expect(StarTypes[type].name).toBeDefined();
      expect(StarTypes[type].colors).toBeInstanceOf(Array);
      expect(StarTypes[type].sizeMultiplier).toBeGreaterThan(0);
      expect(StarTypes[type].rarity).toBeGreaterThan(0);
      expect(StarTypes[type].rarity).toBeLessThanOrEqual(1);
    });
  });
  
  it('should have planet rarities that sum to approximately 1.0', () => {
    const totalRarity = Object.values(PlanetTypes).reduce((sum, type) => sum + type.rarity, 0);
    expect(totalRarity).toBeCloseTo(1.0, 1);
  });
  
  it('should have star rarities that sum to approximately 1.0', () => {
    const totalRarity = Object.values(StarTypes).reduce((sum, type) => sum + type.rarity, 0);
    expect(totalRarity).toBeCloseTo(1.0, 1);
  });
});