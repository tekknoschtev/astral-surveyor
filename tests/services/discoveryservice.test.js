import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import from compiled TypeScript
import { DiscoveryService } from '../../dist/services/DiscoveryService.js';

describe('DiscoveryService Interface Tests', () => {
  let discoveryService;
  let mockCamera;
  let mockObject;
  
  beforeEach(() => {
    discoveryService = new DiscoveryService();
    
    // Mock camera with minimal interface
    mockCamera = {
      x: 100,
      y: 100,
      worldToScreen: vi.fn((worldX, worldY, canvasWidth, canvasHeight) => {
        const screenX = (worldX - mockCamera.x) + canvasWidth / 2;
        const screenY = (worldY - mockCamera.y) + canvasHeight / 2;
        return [screenX, screenY];
      })
    };
    
    // Mock celestial object
    mockObject = {
      x: 150,
      y: 150,
      type: 'star',
      radius: 30,
      discoveryDistance: 50,
      discovered: false
    };
  });
  
  describe('Discovery Check Interface', () => {
    it('should have checkDiscovery method', () => {
      expect(typeof discoveryService.checkDiscovery).toBe('function');
    });
    
    it('should return boolean from checkDiscovery', () => {
      const result = discoveryService.checkDiscovery(mockObject, mockCamera, 800, 600);
      expect(typeof result).toBe('boolean');
    });
    
    it('should not discover already discovered objects', () => {
      mockObject.discovered = true;
      const result = discoveryService.checkDiscovery(mockObject, mockCamera, 800, 600);
      expect(result).toBe(false);
    });
  });
  
  describe('Star Discovery Logic', () => {
    it('should discover stars when visible on screen', () => {
      mockObject.type = 'star';
      mockObject.radius = 30;
      // Object at (150, 150) should be visible on 800x600 screen with camera at (100, 100)
      const result = discoveryService.checkDiscovery(mockObject, mockCamera, 800, 600);
      expect(result).toBe(true);
    });
    
    it('should not discover stars outside screen boundaries', () => {
      mockObject.type = 'star';
      mockObject.x = 1000; // Far off screen
      mockObject.y = 1000;
      const result = discoveryService.checkDiscovery(mockObject, mockCamera, 800, 600);
      expect(result).toBe(false);
    });
    
    it('should use radius margin for star discovery', () => {
      mockObject.type = 'star';
      mockObject.radius = 50;
      // Test edge case where star is just within radius margin
      mockObject.x = mockCamera.x + 450; // Near right edge + margin
      mockObject.y = mockCamera.y;
      const result = discoveryService.checkDiscovery(mockObject, mockCamera, 800, 600);
      expect(result).toBe(true);
    });
  });
  
  describe('Distance-based Discovery Logic', () => {
    it('should discover planets within discovery distance', () => {
      mockObject.type = 'planet';
      mockObject.discoveryDistance = 100;
      // Distance from (100,100) to (150,150) is ~70.7, within 100
      const result = discoveryService.checkDiscovery(mockObject, mockCamera, 800, 600);
      expect(result).toBe(true);
    });
    
    it('should not discover planets outside discovery distance', () => {
      mockObject.type = 'planet';
      mockObject.discoveryDistance = 50;
      // Distance from (100,100) to (150,150) is ~70.7, outside 50
      const result = discoveryService.checkDiscovery(mockObject, mockCamera, 800, 600);
      expect(result).toBe(false);
    });
    
    it('should discover moons within discovery distance', () => {
      mockObject.type = 'moon';
      mockObject.discoveryDistance = 80;
      // Distance from (100,100) to (150,150) is ~70.7, within 80
      const result = discoveryService.checkDiscovery(mockObject, mockCamera, 800, 600);
      expect(result).toBe(true);
    });
    
    it('should discover nebulae within discovery distance', () => {
      mockObject.type = 'nebula';
      mockObject.discoveryDistance = 75;
      // Distance from (100,100) to (150,150) is ~70.7, within 75
      const result = discoveryService.checkDiscovery(mockObject, mockCamera, 800, 600);
      expect(result).toBe(true);
    });
    
    it('should discover asteroid gardens within discovery distance', () => {
      mockObject.type = 'asteroids';
      mockObject.discoveryDistance = 100;
      // Distance from (100,100) to (150,150) is ~70.7, within 100
      const result = discoveryService.checkDiscovery(mockObject, mockCamera, 800, 600);
      expect(result).toBe(true);
    });
  });
  
  describe('Special Discovery Logic', () => {
    it('should discover wormholes within discovery distance', () => {
      mockObject.type = 'wormhole';
      mockObject.discoveryDistance = 80;
      // Distance from (100,100) to (150,150) is ~70.7, within 80
      const result = discoveryService.checkDiscovery(mockObject, mockCamera, 800, 600);
      expect(result).toBe(true);
    });
    
    it('should discover black holes within discovery distance', () => {
      mockObject.type = 'blackhole';
      mockObject.discoveryDistance = 100;
      // Distance from (100,100) to (150,150) is ~70.7, within 100
      const result = discoveryService.checkDiscovery(mockObject, mockCamera, 800, 600);
      expect(result).toBe(true);
    });
  });
  
  describe('Distance Calculation', () => {
    it('should have distanceToShip method', () => {
      expect(typeof discoveryService.distanceToShip).toBe('function');
    });
    
    it('should calculate distance correctly', () => {
      const distance = discoveryService.distanceToShip(mockObject, mockCamera);
      // Distance from (100,100) to (150,150) should be sqrt(50^2 + 50^2) = ~70.71
      expect(distance).toBeCloseTo(70.71, 2);
    });
    
    it('should return zero distance for same position', () => {
      mockObject.x = mockCamera.x;
      mockObject.y = mockCamera.y;
      const distance = discoveryService.distanceToShip(mockObject, mockCamera);
      expect(distance).toBe(0);
    });
  });
  
  describe('Discovery Type Support', () => {
    const types = ['star', 'planet', 'moon', 'nebula', 'asteroids', 'wormhole', 'blackhole'];
    
    types.forEach(type => {
      it(`should support discovery checking for ${type}`, () => {
        mockObject.type = type;
        mockObject.discoveryDistance = 100; // Ensure discovery happens
        const result = discoveryService.checkDiscovery(mockObject, mockCamera, 800, 600);
        expect(typeof result).toBe('boolean');
      });
    });
  });
});