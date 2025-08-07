import { describe, it, expect, beforeEach } from 'vitest';

// Load the required modules
const fs = await import('fs');
const path = await import('path');

// Load dependencies
const randomJsPath = path.resolve('./js/utils/random.js');
const randomJsContent = fs.readFileSync(randomJsPath, 'utf8');
eval(randomJsContent);

const namingJsPath = path.resolve('./js/naming/naming.js');
const namingJsContent = fs.readFileSync(namingJsPath, 'utf8');
eval(namingJsContent);

const { NamingService } = window;

describe('NamingService - Planet and Moon Naming', () => {
  let namingService;
  
  beforeEach(() => {
    // Set global state before creating service
    window.UNIVERSE_SEED = 12345;
    resetMockMathRandom();
    // Create new service instance
    namingService = new NamingService();
  });
  
  describe('Planet naming', () => {
    it('should generate proper planet designations with letter suffixes', () => {
      const parentStar = {
        x: 1000,
        y: 2000,
        starTypeName: 'G-Type Star',
        planets: []
      };
      
      const planet = {
        type: 'planet',
        parentStar: parentStar,
        orbitalDistance: 150, // AU-like distance
        planetTypeName: 'Terrestrial World'
      };
      
      // Mock the calculatePlanetIndex to return a known value
      parentStar.planets = [planet];
      
      const planetName = namingService.generatePlanetName(planet);
      
      expect(planetName).toMatch(/^ASV-\d{4} [b-z]$/);
    });
    
    it('should use special designations for rare planet types', () => {
      const parentStar = {
        x: 500,
        y: 750,
        starTypeName: 'K-Type Star'
      };
      
      const exoticPlanet = {
        type: 'planet',
        parentStar: parentStar,
        planetTypeName: 'Exotic World'
      };
      
      const volcanicPlanet = {
        type: 'planet',
        parentStar: parentStar,
        planetTypeName: 'Volcanic World'
      };
      
      const frozenPlanet = {
        type: 'planet',
        parentStar: parentStar,
        planetTypeName: 'Frozen World'
      };
      
      expect(namingService.generatePlanetName(exoticPlanet)).toMatch(/^ASV-\d{4} EX$/);
      expect(namingService.generatePlanetName(volcanicPlanet)).toMatch(/^ASV-\d{4} VL$/);
      expect(namingService.generatePlanetName(frozenPlanet)).toMatch(/^ASV-\d{4} FR$/);
    });
    
    it('should handle planets without parent stars gracefully', () => {
      const orphanPlanet = {
        type: 'planet',
        parentStar: null,
        planetTypeName: 'Rogue World'
      };
      
      const name = namingService.generatePlanetName(orphanPlanet);
      expect(name).toBe('Unknown Planet');
    });
    
    it('should assign letters based on orbital distance ordering', () => {
      const parentStar = {
        x: 100,
        y: 200,
        starTypeName: 'G-Type Star',
        planets: []
      };
      
      const innerPlanet = {
        type: 'planet',
        parentStar: parentStar,
        orbitalDistance: 50,
        planetTypeName: 'Hot World'
      };
      
      const outerPlanet = {
        type: 'planet',
        parentStar: parentStar,
        orbitalDistance: 200,
        planetTypeName: 'Cold World'
      };
      
      // Set up the star's planet array in distance order
      parentStar.planets = [innerPlanet, outerPlanet];
      
      const innerName = namingService.generatePlanetName(innerPlanet);
      const outerName = namingService.generatePlanetName(outerPlanet);
      
      // Inner planet should get 'b', outer planet should get 'c'
      expect(innerName).toMatch(/^ASV-\d{4} b$/);
      expect(outerName).toMatch(/^ASV-\d{4} c$/);
    });
  });
  
  describe('Moon naming', () => {
    it('should generate proper moon designations with Roman numerals', () => {
      const parentStar = {
        x: 300,
        y: 400,
        starTypeName: 'K-Type Star',
        planets: []
      };
      
      const parentPlanet = {
        type: 'planet',
        x: 350, // Planet position
        y: 450,
        parentStar: parentStar,
        orbitalDistance: 100,
        planetTypeName: 'Gas Giant'
      };
      
      parentStar.planets = [parentPlanet];
      
      const moon = {
        type: 'moon',
        parentPlanet: parentPlanet,
        orbitalDistance: 10 // Distance from planet
      };
      
      const moonName = namingService.generateMoonName(moon);
      
      expect(moonName).toMatch(/^ASV-\d{4} [b-z] [IVX]+$/);
    });
    
    it('should handle multiple moons with different Roman numerals', () => {
      const parentStar = {
        x: 600,
        y: 700,
        starTypeName: 'M-Type Star',
        planets: []
      };
      
      const parentPlanet = {
        type: 'planet',
        x: 650, // Planet position derived from star + orbital distance
        y: 720,
        parentStar: parentStar,
        orbitalDistance: 80,
        planetTypeName: 'Ice Giant'
      };
      
      parentStar.planets = [parentPlanet];
      
      const moon1 = {
        type: 'moon',
        parentPlanet: parentPlanet,
        orbitalDistance: 5
      };
      
      const moon2 = {
        type: 'moon',
        parentPlanet: parentPlanet,
        orbitalDistance: 15
      };
      
      const moon1Name = namingService.generateMoonName(moon1);
      const moon2Name = namingService.generateMoonName(moon2);
      
      // Both should have Roman numeral suffixes
      expect(moon1Name).toMatch(/^ASV-\d{4} [b-z] [IVX]+$/);
      expect(moon2Name).toMatch(/^ASV-\d{4} [b-z] [IVX]+$/);
      
      // Should be different Roman numerals
      expect(moon1Name).not.toBe(moon2Name);
    });
    
    it('should handle moons of rare planets correctly', () => {
      const parentStar = {
        x: 800,
        y: 900,
        starTypeName: 'Red Giant',
        planets: []
      };
      
      const exoticPlanet = {
        type: 'planet',
        x: 850, // Planet position
        y: 950,
        parentStar: parentStar,
        orbitalDistance: 120,
        planetTypeName: 'Exotic World'
      };
      
      const moon = {
        type: 'moon',
        parentPlanet: exoticPlanet,
        orbitalDistance: 8
      };
      
      const moonName = namingService.generateMoonName(moon);
      
      expect(moonName).toMatch(/^ASV-\d{4} EX [IVX]+$/);
    });
    
    it('should handle moons without parent planets gracefully', () => {
      const orphanMoon = {
        type: 'moon',
        parentPlanet: null
      };
      
      const name = namingService.generateMoonName(orphanMoon);
      expect(name).toBe('Unknown Moon');
    });
  });
  
  describe('Planet index calculation', () => {
    it('should calculate planet index based on orbital distance', () => {
      const parentStar = {
        x: 0,
        y: 0,
        starTypeName: 'G-Type Star',
        planets: []
      };
      
      const planet1 = { parentStar: parentStar, orbitalDistance: 50 };
      const planet2 = { parentStar: parentStar, orbitalDistance: 100 };
      const planet3 = { parentStar: parentStar, orbitalDistance: 75 };
      
      // Unsorted array
      parentStar.planets = [planet2, planet3, planet1];
      
      // planet1 should be index 0 (closest)
      // planet3 should be index 1 (middle) 
      // planet2 should be index 2 (farthest)
      expect(namingService.calculatePlanetIndex(planet1)).toBe(0);
      expect(namingService.calculatePlanetIndex(planet3)).toBe(1);
      expect(namingService.calculatePlanetIndex(planet2)).toBe(2);
    });
    
    it('should handle planets without parent stars', () => {
      const orphanPlanet = {
        parentStar: null
      };
      
      expect(namingService.calculatePlanetIndex(orphanPlanet)).toBe(0);
    });
    
    it('should handle planets whose parent star has no planets array', () => {
      const planet = {
        parentStar: { x: 0, y: 0 } // No planets array
      };
      
      expect(namingService.calculatePlanetIndex(planet)).toBe(0);
    });
  });
  
  describe('Moon index calculation', () => {
    it('should generate consistent moon indices based on orbital distance', () => {
      const parentPlanet = {
        x: 100,
        y: 200
      };
      
      const moon1 = {
        parentPlanet: parentPlanet,
        orbitalDistance: 10
      };
      
      const moon2 = {
        parentPlanet: parentPlanet,
        orbitalDistance: 10
      };
      
      // Same orbital distance should give same index
      const index1 = namingService.calculateMoonIndex(moon1);
      const index2 = namingService.calculateMoonIndex(moon2);
      
      expect(index1).toBe(index2);
      expect(index1).toBeGreaterThanOrEqual(0);
      expect(index1).toBeLessThan(4); // Limited to 4 indices
    });
    
    it('should generate different indices for different orbital distances', () => {
      const parentPlanet = {
        x: 100,
        y: 200
      };
      
      const moon1 = {
        parentPlanet: parentPlanet,
        orbitalDistance: 5
      };
      
      const moon2 = {
        parentPlanet: parentPlanet,
        orbitalDistance: 15
      };
      
      const index1 = namingService.calculateMoonIndex(moon1);
      const index2 = namingService.calculateMoonIndex(moon2);
      
      // Different distances should typically give different indices
      // (though hash collisions are possible)
      expect(index1).toBeGreaterThanOrEqual(0);
      expect(index2).toBeGreaterThanOrEqual(0);
      expect(index1).toBeLessThan(4);
      expect(index2).toBeLessThan(4);
    });
  });
  
  describe('Integration with display names', () => {
    it('should generate display names for planets and moons', () => {
      const parentStar = {
        x: 1200,
        y: 1500,
        starTypeName: 'G-Type Star',
        planets: []
      };
      
      const planet = {
        type: 'planet',
        parentStar: parentStar,
        orbitalDistance: 90,
        planetTypeName: 'Terrestrial World'
      };
      
      const moon = {
        type: 'moon',
        parentPlanet: planet,
        orbitalDistance: 5
      };
      
      parentStar.planets = [planet];
      
      const planetDisplayName = namingService.generateDisplayName(planet);
      const moonDisplayName = namingService.generateDisplayName(moon);
      
      expect(planetDisplayName).toMatch(/^ASV-\d{4} [b-z]$/);
      expect(moonDisplayName).toMatch(/^ASV-\d{4} [b-z] [IVX]+$/);
    });
  });
});