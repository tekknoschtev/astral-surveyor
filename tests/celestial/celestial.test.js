import { describe, it, expect, beforeEach, vi } from 'vitest';

// Load the required modules
const fs = await import('fs');
const path = await import('path');

// Load dependencies first
const randomJsPath = path.resolve('./js/utils/random.js');
const randomJsContent = fs.readFileSync(randomJsPath, 'utf8');
eval(randomJsContent);

// Load celestial.js
const celestialJsPath = path.resolve('./js/celestial/celestial.js');
const celestialJsContent = fs.readFileSync(celestialJsPath, 'utf8');
eval(celestialJsContent);

const { CelestialObject, Planet, Moon, Star } = window;

describe('CelestialObject Discovery Logic', () => {
  let camera;
  
  beforeEach(() => {
    // Set up global state
    window.UNIVERSE_SEED = 12345;
    resetMockMathRandom();
    
    // Mock camera object with worldToScreen method
    camera = {
      x: 100,
      y: 100,
      worldToScreen: vi.fn((x, y, canvasWidth, canvasHeight) => {
        // Simple mock: return screen coordinates based on world position
        // In reality this would involve zoom, translation, etc.
        const screenX = (x - camera.x) + canvasWidth / 2;
        const screenY = (y - camera.y) + canvasHeight / 2;
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