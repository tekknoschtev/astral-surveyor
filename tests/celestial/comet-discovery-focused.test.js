import { describe, it, expect, vi } from 'vitest';

// Import from compiled TypeScript
import { Comet, CometTypes } from '../../dist/celestial/comets.js';
import { Star, StarTypes } from '../../dist/celestial/Star.js';
import { DiscoveryConfig } from '../../dist/config/gameConfig.js';
import { DiscoveryService } from '../../dist/services/DiscoveryService.js';

describe('Comet Discovery Integration Tests', () => {
  it('should set discoveryDistance from DiscoveryConfig on creation', () => {
    // Create minimal test objects
    const star = new Star(100, 100, StarTypes.G_TYPE, 0);
    const orbit = {
      semiMajorAxis: 500,
      eccentricity: 0.7,
      perihelionDistance: 150,
      aphelionDistance: 850,
      orbitalPeriod: 10000,
      argumentOfPerihelion: 0,
      meanAnomalyAtEpoch: 0,
      epoch: 0
    };
    
    const comet = new Comet(200, 200, star, orbit, CometTypes.ICE, 0);
    
    // Verify configuration integration
    expect(comet.discoveryDistance).toBe(DiscoveryConfig.distances.comet);
    expect(comet.discoveryDistance).toBe(275);
    expect(comet.type).toBe('comet');
  });

  it('should work with DiscoveryService using mock object', () => {
    const discoveryService = new DiscoveryService();
    
    // Create a mock comet-like object with known position
    const mockComet = {
      x: 200,
      y: 200, 
      type: 'comet',
      discoveryDistance: 275,
      discovered: false
    };
    
    // Create mock camera
    const mockCamera = {
      x: 150,
      y: 150,
      worldToScreen: vi.fn((worldX, worldY, canvasWidth, canvasHeight) => {
        const screenX = (worldX - mockCamera.x) + canvasWidth / 2;
        const screenY = (worldY - mockCamera.y) + canvasHeight / 2;
        return [screenX, screenY];
      })
    };
    
    // Distance = sqrt((200-150)^2 + (200-150)^2) = sqrt(2500 + 2500) ≈ 70.7px
    // Should be discoverable since 70.7 < 275
    const result = discoveryService.checkDiscovery(mockComet, mockCamera, 800, 600);
    expect(result).toBe(true);
    
    // Test outside discovery range
    mockCamera.x = -200; // Distance = sqrt((200-(-200))^2 + (200-150)^2) ≈ 403px 
    mockCamera.y = 150;  // Should not be discoverable since 403 > 275
    mockComet.discovered = false; // Reset
    
    const result2 = discoveryService.checkDiscovery(mockComet, mockCamera, 800, 600);
    expect(result2).toBe(false);
  });

  it('should have correct discovery distance relative to other objects', () => {
    const star = new Star(100, 100, StarTypes.G_TYPE, 0);
    const orbit = {
      semiMajorAxis: 500,
      eccentricity: 0.7,
      perihelionDistance: 150,
      aphelionDistance: 850,
      orbitalPeriod: 10000,
      argumentOfPerihelion: 0,
      meanAnomalyAtEpoch: 0,
      epoch: 0
    };
    
    const comet = new Comet(200, 200, star, orbit, CometTypes.ICE, 0);
    
    // Verify comet discovery distance is between asteroids and nebulae
    expect(comet.discoveryDistance).toBeGreaterThan(DiscoveryConfig.distances.asteroidGarden);
    expect(comet.discoveryDistance).toBeLessThan(DiscoveryConfig.distances.nebula);
    
    // Verify specific values
    expect(DiscoveryConfig.distances.asteroidGarden).toBe(250);
    expect(comet.discoveryDistance).toBe(275);
    expect(DiscoveryConfig.distances.nebula).toBe(300);
  });
});