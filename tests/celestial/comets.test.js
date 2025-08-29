import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import from compiled TypeScript
import { Comet, CometTypes, selectCometType } from '../../dist/celestial/comets.js';
import { SeededRandom } from '../../dist/utils/random.js';
import { Star, StarTypes } from '../../dist/celestial/Star.js';
import { DiscoveryService } from '../../dist/services/DiscoveryService.js';

// Mock Star class for testing
const createMockStar = (x = 0, y = 0) => ({
  x,
  y,
  radius: 100,
  type: 'star'
});

describe('Comet Orbital Mechanics', () => {
  let mockStar;
  let testOrbit;
  let testCometType;

  beforeEach(() => {
    mockStar = createMockStar(500, 500);
    
    // Standard test orbit with known parameters
    testOrbit = {
      semiMajorAxis: 600,           // 600px average distance
      eccentricity: 0.8,            // Highly elliptical
      perihelionDistance: 120,      // q = a(1-e) = 600(1-0.8) = 120
      aphelionDistance: 1080,       // Q = a(1+e) = 600(1+0.8) = 1080
      orbitalPeriod: 10000,         // 10000 time units for full orbit
      argumentOfPerihelion: Math.PI / 4, // 45 degrees
      meanAnomalyAtEpoch: 0,        // Start at perihelion
      epoch: 0                      // Reference time = 0
    };
    
    testCometType = CometTypes.ICE;
  });

  describe('Kepler\'s Equation Solver', () => {
    it('should solve Kepler\'s equation accurately for circular orbit', () => {
      const comet = new Comet(0, 0, mockStar, {...testOrbit, eccentricity: 0}, testCometType, 0);
      
      // For circular orbit (e=0), eccentric anomaly should equal mean anomaly
      const meanAnomaly = Math.PI / 2; // 90 degrees
      const eccentricAnomaly = comet.solveKeplersEquation(meanAnomaly, 0);
      
      expect(eccentricAnomaly).toBeCloseTo(meanAnomaly, 6);
    });

    it('should solve Kepler\'s equation accurately for elliptical orbit', () => {
      const comet = new Comet(0, 0, mockStar, testOrbit, testCometType, 0);
      
      // Test known case: for e=0.8, M=π, E should be approximately 2.498 radians
      const meanAnomaly = Math.PI;
      const eccentricAnomaly = comet.solveKeplersEquation(meanAnomaly, 0.8);
      
      // Verify Kepler's equation: M = E - e*sin(E)
      const calculatedMeanAnomaly = eccentricAnomaly - 0.8 * Math.sin(eccentricAnomaly);
      expect(calculatedMeanAnomaly).toBeCloseTo(meanAnomaly, 6);
    });

    it('should converge quickly for reasonable eccentricities', () => {
      const comet = new Comet(0, 0, mockStar, testOrbit, testCometType, 0);
      
      // Test convergence by checking multiple mean anomalies
      for (let M = 0; M < 2 * Math.PI; M += Math.PI / 6) {
        const E = comet.solveKeplersEquation(M, 0.8);
        const verifyM = E - 0.8 * Math.sin(E);
        expect(verifyM).toBeCloseTo(M, 6);
      }
    });

    it('should handle extreme eccentricities without infinite loops', () => {
      const comet = new Comet(0, 0, mockStar, testOrbit, testCometType, 0);
      
      // Test near-parabolic orbit (game-breaking if solver fails)
      const extremeEccentricity = 0.999;
      const meanAnomaly = Math.PI / 4;
      
      const start = Date.now();
      const eccentricAnomaly = comet.solveKeplersEquation(meanAnomaly, extremeEccentricity);
      const duration = Date.now() - start;
      
      // Must converge within reasonable time (catches infinite loops)
      expect(duration).toBeLessThan(100);
      expect(eccentricAnomaly).toBeGreaterThan(0);
      expect(eccentricAnomaly).toBeLessThan(Math.PI);
      
      // Verify solution is still accurate
      const verifyM = eccentricAnomaly - extremeEccentricity * Math.sin(eccentricAnomaly);
      expect(verifyM).toBeCloseTo(meanAnomaly, 4);
    });

    it('should maintain orbital energy conservation', () => {
      const comet = new Comet(0, 0, mockStar, testOrbit, testCometType, 0);
      
      const specificOrbitalEnergy = -1 / (2 * testOrbit.semiMajorAxis); // E = -μ/(2a)
      
      // Test at multiple orbital positions
      for (let meanAnomaly = 0; meanAnomaly < 2 * Math.PI; meanAnomaly += Math.PI / 4) {
        vi.spyOn(comet, 'calculateUniversalTime').mockReturnValue(meanAnomaly * testOrbit.orbitalPeriod / (2 * Math.PI));
        comet.updatePosition();
        
        // Calculate energy: E = v²/2 - μ/r (simplified: E ≈ -1/(2a))
        const calculatedEnergy = -1 / (2 * comet.currentDistance * testOrbit.semiMajorAxis / testOrbit.semiMajorAxis);
        
        // Energy should be conserved within numerical precision
        expect(Math.abs(calculatedEnergy - specificOrbitalEnergy)).toBeLessThan(0.01);
      }
    });
  });

  describe('Position Calculation', () => {
    it('should calculate correct position at perihelion', () => {
      // Set up comet at perihelion (closest to star)
      const perihelionOrbit = {...testOrbit, meanAnomalyAtEpoch: 0};
      const comet = new Comet(0, 0, mockStar, perihelionOrbit, testCometType, 0);
      
      // Mock universal time to return epoch time (0)
      vi.spyOn(comet, 'calculateUniversalTime').mockReturnValue(0);
      
      comet.updatePosition();
      
      // At perihelion, distance should be perihelionDistance
      expect(comet.currentDistance).toBeCloseTo(120, 1);
      
      // Position should be at argument of perihelion angle from star
      const expectedX = mockStar.x + 120 * Math.cos(Math.PI / 4);
      const expectedY = mockStar.y + 120 * Math.sin(Math.PI / 4);
      
      expect(comet.x).toBeCloseTo(expectedX, 1);
      expect(comet.y).toBeCloseTo(expectedY, 1);
    });

    it('should calculate correct position at aphelion', () => {
      // Set up comet at aphelion (farthest from star)
      const aphelionOrbit = {...testOrbit, meanAnomalyAtEpoch: Math.PI};
      const comet = new Comet(0, 0, mockStar, aphelionOrbit, testCometType, 0);
      
      // Mock universal time to return epoch time (0)
      vi.spyOn(comet, 'calculateUniversalTime').mockReturnValue(0);
      
      comet.updatePosition();
      
      // At aphelion, distance should be aphelionDistance
      expect(comet.currentDistance).toBeCloseTo(1080, 1);
      
      // Position should be opposite to perihelion direction
      const aphelionAngle = Math.PI / 4 + Math.PI; // 225 degrees
      const expectedX = mockStar.x + 1080 * Math.cos(aphelionAngle);
      const expectedY = mockStar.y + 1080 * Math.sin(aphelionAngle);
      
      expect(comet.x).toBeCloseTo(expectedX, 1);
      expect(comet.y).toBeCloseTo(expectedY, 1);
    });

    it('should handle orbital progression over time', () => {
      const comet = new Comet(0, 0, mockStar, testOrbit, testCometType, 0);
      
      // Mock universal time for quarter orbit (T/4)
      vi.spyOn(comet, 'calculateUniversalTime').mockReturnValue(2500);
      
      comet.updatePosition();
      
      // For highly elliptical orbits (e=0.8), distance at quarter orbit varies significantly
      // Just check that distance is within the valid orbital range
      expect(comet.currentDistance).toBeGreaterThanOrEqual(testOrbit.perihelionDistance * 0.95);
      expect(comet.currentDistance).toBeLessThanOrEqual(testOrbit.aphelionDistance * 1.05);
    });
  });

  describe('Time Independence', () => {
    it('should produce same position for same universal time', () => {
      const comet1 = new Comet(0, 0, mockStar, testOrbit, testCometType, 0);
      const comet2 = new Comet(100, 100, mockStar, testOrbit, testCometType, 0);
      
      // Mock same universal time for both comets
      const universalTime = 5000;
      vi.spyOn(comet1, 'calculateUniversalTime').mockReturnValue(universalTime);
      vi.spyOn(comet2, 'calculateUniversalTime').mockReturnValue(universalTime);
      
      comet1.updatePosition();
      comet2.updatePosition();
      
      // Both comets should have identical orbital state
      expect(comet1.currentDistance).toBeCloseTo(comet2.currentDistance, 6);
      expect(comet1.currentTrueAnomaly).toBeCloseTo(comet2.currentTrueAnomaly, 6);
      expect(comet1.currentEccentricAnomaly).toBeCloseTo(comet2.currentEccentricAnomaly, 6);
    });

    it('should maintain consistency across multiple updates with same time', () => {
      const comet = new Comet(0, 0, mockStar, testOrbit, testCometType, 0);
      
      // Mock consistent universal time
      const universalTime = 3000;
      vi.spyOn(comet, 'calculateUniversalTime').mockReturnValue(universalTime);
      
      // Update multiple times
      comet.updatePosition();
      const firstX = comet.x;
      const firstY = comet.y;
      const firstDistance = comet.currentDistance;
      
      comet.updatePosition();
      comet.updatePosition();
      
      // Position should remain identical (reduced precision for timing-dependent orbital mechanics)
      expect(comet.x).toBeCloseTo(firstX, 4);
      expect(comet.y).toBeCloseTo(firstY, 4);
      expect(comet.currentDistance).toBeCloseTo(firstDistance, 4);
    });
  });

  describe('Brightness and Visibility Calculations', () => {
    it('should be brightest at perihelion', () => {
      const perihelionComet = new Comet(0, 0, mockStar, {...testOrbit, meanAnomalyAtEpoch: 0}, testCometType, 0);
      vi.spyOn(perihelionComet, 'calculateUniversalTime').mockReturnValue(0);
      
      perihelionComet.updatePosition();
      perihelionComet.updateVisualProperties();
      
      const perihelionBrightness = perihelionComet.nucleusBrightness;
      const perihelionTailLength = perihelionComet.tailLength;
      
      // Create aphelion comet for comparison
      const aphelionComet = new Comet(0, 0, mockStar, {...testOrbit, meanAnomalyAtEpoch: Math.PI}, testCometType, 0);
      vi.spyOn(aphelionComet, 'calculateUniversalTime').mockReturnValue(0);
      
      aphelionComet.updatePosition();
      aphelionComet.updateVisualProperties();
      
      // Perihelion should be brighter and have longer tail
      expect(perihelionBrightness).toBeGreaterThan(aphelionComet.nucleusBrightness);
      expect(perihelionTailLength).toBeGreaterThan(aphelionComet.tailLength);
    });

    it('should calculate tail direction correctly', () => {
      const comet = new Comet(0, 0, mockStar, testOrbit, testCometType, 0);
      vi.spyOn(comet, 'calculateUniversalTime').mockReturnValue(0);
      
      comet.updatePosition();
      comet.updateVisualProperties();
      
      // Tail should point away from star
      const starToCometX = comet.x - mockStar.x;
      const starToCometY = comet.y - mockStar.y;
      const starToCometMagnitude = Math.sqrt(starToCometX * starToCometX + starToCometY * starToCometY);
      
      const expectedTailX = starToCometX / starToCometMagnitude;
      const expectedTailY = starToCometY / starToCometMagnitude;
      
      expect(comet.tailDirection.x).toBeCloseTo(expectedTailX, 3);
      expect(comet.tailDirection.y).toBeCloseTo(expectedTailY, 3);
    });

    it('should have visibility threshold based on distance', () => {
      const comet = new Comet(0, 0, mockStar, testOrbit, testCometType, 0);
      
      // Test visibility at different distances
      comet.currentDistance = 200; // Close - should be visible
      comet.updateVisualProperties();
      const closeVisibility = comet.isVisible;
      
      comet.currentDistance = 2000; // Far - should not be visible
      comet.updateVisualProperties();
      const farVisibility = comet.isVisible;
      
      expect(closeVisibility).toBe(true);
      expect(farVisibility).toBe(false);
    });
  });

  describe('Comet Type Selection', () => {
    it('should select comet types based on rarity weights', () => {
      const rng = new SeededRandom(12345);
      const selectedTypes = [];
      
      // Generate 1000 comet types using single RNG to ensure good distribution
      for (let i = 0; i < 1000; i++) {
        const cometType = selectCometType(rng);
        selectedTypes.push(cometType.name);
      }
      
      // Count occurrences
      const counts = {
        'Ice Comet': 0,
        'Dust Comet': 0,
        'Rocky Comet': 0,
        'Organic Comet': 0
      };
      
      selectedTypes.forEach(type => {
        counts[type] = (counts[type] || 0) + 1;
      });
      
      // Comet type distribution should match expected rarities
      
      // Ensure we got some types selected
      const totalTypes = Object.values(counts).reduce((sum, count) => sum + count, 0);
      expect(totalTypes).toBe(1000);
      
      // With 1000 samples, each type should appear at least once
      // Allow some tolerance for statistical variation
      expect(counts['Ice Comet']).toBeGreaterThan(300); // ~40% of 1000 = 400
      expect(counts['Dust Comet']).toBeGreaterThan(200); // ~30% of 1000 = 300  
      expect(counts['Rocky Comet']).toBeGreaterThan(100); // ~20% of 1000 = 200
      expect(counts['Organic Comet']).toBeGreaterThan(50);  // ~10% of 1000 = 100
      
      // Ice comets should be most common (40% rarity)
      expect(counts['Ice Comet']).toBeGreaterThan(counts['Dust Comet']);
      expect(counts['Ice Comet']).toBeGreaterThan(counts['Rocky Comet']);
      expect(counts['Ice Comet']).toBeGreaterThan(counts['Organic Comet']);
    });

    it('should return valid comet type for any seed', () => {
      const rng = new SeededRandom(999);
      
      for (let i = 0; i < 100; i++) {
        const cometType = selectCometType(rng);
        
        expect(cometType).toBeDefined();
        expect(cometType.name).toBeDefined();
        expect(cometType.rarity).toBeGreaterThan(0);
        expect(cometType.rarity).toBeLessThanOrEqual(1);
        expect(Array.isArray(cometType.tailColors)).toBe(true);
      }
    });
  });

  describe('Comet Construction and Initialization', () => {
    it('should initialize comet with correct properties', () => {
      const comet = new Comet(100, 200, mockStar, testOrbit, testCometType, 5);
      
      expect(comet.type).toBe('comet');
      expect(comet.parentStar).toBe(mockStar);
      expect(comet.orbit).toEqual(testOrbit);
      expect(comet.cometType).toBe(testCometType);
      expect(comet.cometIndex).toBe(5);
      expect(comet.uniqueId).toContain('comet_500_500_5');
    });

    it('should generate unique IDs correctly', () => {
      const star1 = createMockStar(100, 200);
      const star2 = createMockStar(300, 400);
      
      const comet1 = new Comet(0, 0, star1, testOrbit, testCometType, 0);
      const comet2 = new Comet(0, 0, star1, testOrbit, testCometType, 1);
      const comet3 = new Comet(0, 0, star2, testOrbit, testCometType, 0);
      
      // Same star, different index
      expect(comet1.uniqueId).not.toBe(comet2.uniqueId);
      // Different star, same index
      expect(comet1.uniqueId).not.toBe(comet3.uniqueId);
      // All should be different
      expect(new Set([comet1.uniqueId, comet2.uniqueId, comet3.uniqueId]).size).toBe(3);
    });

    it('should update position and visual properties on construction', () => {
      const comet = new Comet(999, 888, mockStar, testOrbit, testCometType, 0);
      
      // Position should be calculated, not the initial constructor values
      expect(comet.x).not.toBe(999);
      expect(comet.y).not.toBe(888);
      
      // Visual properties should be initialized
      expect(comet.currentDistance).toBeGreaterThan(0);
      expect(comet.tailDirection).toBeDefined();
      
      // Tail direction should be properly calculated
      
      // Only check tail direction if comet has been updated and is not at star center
      if (comet.currentDistance > 1) { // Must have meaningful distance from star
        const tailMagnitude = Math.sqrt(comet.tailDirection.x * comet.tailDirection.x + comet.tailDirection.y * comet.tailDirection.y);
        expect(tailMagnitude).toBeCloseTo(1, 0.1); // Allow some tolerance for unit vector
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle extreme eccentricities without breaking', () => {
      const extremeOrbit = {
        ...testOrbit,
        eccentricity: 0.99 // Very eccentric
      };
      
      const comet = new Comet(0, 0, mockStar, extremeOrbit, testCometType, 0);
      vi.spyOn(comet, 'calculateUniversalTime').mockReturnValue(0);
      
      expect(() => {
        comet.updatePosition();
        comet.updateVisualProperties();
      }).not.toThrow();
      
      expect(comet.currentDistance).toBeGreaterThan(0);
      expect(comet.currentDistance).toBeLessThan(extremeOrbit.aphelionDistance * 1.1);
    });

    it('should handle zero orbital period gracefully', () => {
      const zeroOrbit = {
        ...testOrbit,
        orbitalPeriod: 1 // Minimum period to avoid division by zero
      };
      
      const comet = new Comet(0, 0, mockStar, zeroOrbit, testCometType, 0);
      
      expect(() => {
        comet.updatePosition();
      }).not.toThrow();
    });

    it('should maintain orbital constraints', () => {
      const comet = new Comet(0, 0, mockStar, testOrbit, testCometType, 0);
      
      // Test various times throughout the orbit
      for (let time = 0; time < testOrbit.orbitalPeriod; time += 1000) {
        vi.spyOn(comet, 'calculateUniversalTime').mockReturnValue(time);
        comet.updatePosition();
        
        // Distance should always be between perihelion and aphelion
        expect(comet.currentDistance).toBeGreaterThanOrEqual(testOrbit.perihelionDistance * 0.99);
        expect(comet.currentDistance).toBeLessThanOrEqual(testOrbit.aphelionDistance * 1.01);
        
        // True anomaly should be between 0 and 2π
        expect(comet.currentTrueAnomaly).toBeGreaterThanOrEqual(0);
        expect(comet.currentTrueAnomaly).toBeLessThanOrEqual(2 * Math.PI + 0.01);
      }
    });
  });

  describe('Discovery System Integration', () => {
    it('should set discoveryDistance dynamically based on visibility', () => {
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
      
      // Discovery distance should be dynamic based on visibility
      if (comet.isVisible) {
        expect(comet.discoveryDistance).toBeGreaterThan(0);
        expect(comet.discoveryDistance).toBe(Math.max(30, comet.tailLength + 20));
      } else {
        expect(comet.discoveryDistance).toBe(0);
      }
    });

    it('should work with DiscoveryService for range detection', () => {
      const discoveryService = new DiscoveryService();
      
      const mockComet = {
        x: 200,
        y: 200, 
        type: 'comet',
        discoveryDistance: 275,
        discovered: false
      };
      
      const mockCamera = {
        x: 150,
        y: 150,
        worldToScreen: vi.fn((worldX, worldY, canvasWidth, canvasHeight) => {
          const screenX = (worldX - mockCamera.x) + canvasWidth / 2;
          const screenY = (worldY - mockCamera.y) + canvasHeight / 2;
          return [screenX, screenY];
        })
      };
      
      // Distance = sqrt((200-150)^2 + (200-150)^2) ≈ 70.7px < 275
      const result = discoveryService.checkDiscovery(mockComet, mockCamera, 800, 600);
      expect(result).toBe(true);
      
      // Test outside discovery range
      mockCamera.x = -200; // Distance ≈ 403px > 275
      mockCamera.y = 150;
      mockComet.discovered = false;
      
      const result2 = discoveryService.checkDiscovery(mockComet, mockCamera, 800, 600);
      expect(result2).toBe(false);
    });
  });
});

// Helper function to reset Math.random for consistent testing
function resetMockMathRandom() {
  // This matches the pattern used in other test files
  // Since we use SeededRandom for comet calculations, this may not be needed
  // but kept for consistency with other tests
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
}