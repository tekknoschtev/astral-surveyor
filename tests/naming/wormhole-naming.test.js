// Wormhole Naming System Tests - Scientific Classification and Discovery Integration
// Testing NamingService integration with wormhole objects

import { describe, it, expect, beforeEach } from 'vitest';
import { NamingService } from '../../dist/naming/naming.js';

describe('Wormhole Naming System', () => {
  let namingService;

  beforeEach(() => {
    namingService = new NamingService();
  });

  describe('Basic Wormhole Naming', () => {
    it('should generate proper wormhole display names', () => {
      const wormhole = {
        type: 'wormhole',
        x: 1500,
        y: 2500,
        wormholeId: 'WH-1234',
        designation: 'alpha',
        pairId: 'WH-1234-α'
      };

      const displayName = namingService.generateDisplayName(wormhole);
      expect(displayName).toBe('WH-1234-α');
    });

    it('should handle beta designation correctly', () => {
      const wormhole = {
        type: 'wormhole',
        x: 3000,
        y: 1500,
        wormholeId: 'WH-5678',
        designation: 'beta',
        pairId: 'WH-5678-β'
      };

      const displayName = namingService.generateDisplayName(wormhole);
      expect(displayName).toBe('WH-5678-β');
    });

    it('should generate fallback names when pairId is missing', () => {
      const wormhole = {
        type: 'wormhole',
        x: 1000,
        y: 2000,
        wormholeId: 'WH-9999',
        designation: 'alpha',
        // pairId missing
      };

      const displayName = namingService.generateDisplayName(wormhole);
      expect(displayName).toContain('WH-9999-α');
    });

    it('should generate coordinate-based names as last resort', () => {
      const wormhole = {
        type: 'wormhole',
        x: 1000,
        y: 2000,
        designation: 'alpha'
        // wormholeId and pairId missing
      };

      const displayName = namingService.generateDisplayName(wormhole);
      expect(displayName).toMatch(/WH-\d{4}-α/);
    });
  });

  describe('Full Scientific Designation', () => {
    it('should generate complete scientific designation for wormholes', () => {
      const wormhole = {
        type: 'wormhole',
        x: 2500,
        y: 1800,
        wormholeId: 'WH-7890',
        designation: 'alpha',
        pairId: 'WH-7890-α'
      };

      const designation = namingService.generateFullDesignation(wormhole);
      
      expect(designation).toMatchObject({
        catalog: 'WH-7890-α',
        coordinate: expect.any(String),
        type: 'Stable Traversable Wormhole',
        classification: 'Einstein-Rosen Bridge (Paired with WH-7890-β)'
      });
    });

    it('should show correct pairing in classification for beta wormholes', () => {
      const wormhole = {
        type: 'wormhole',
        x: 3500,
        y: 2800,
        wormholeId: 'WH-4567',
        designation: 'beta',
        pairId: 'WH-4567-β'
      };

      const designation = namingService.generateFullDesignation(wormhole);
      
      expect(designation.classification).toBe('Einstein-Rosen Bridge (Paired with WH-4567-α)');
    });

    it('should generate proper coordinate designations', () => {
      const wormhole = {
        type: 'wormhole',
        x: 1234.5,
        y: -5678.9,
        wormholeId: 'WH-COORD',
        designation: 'alpha',
        pairId: 'WH-COORD-α'
      };

      const designation = namingService.generateFullDesignation(wormhole);
      
      // Should have a coordinate designation
      expect(designation.coordinate).toBeDefined();
      expect(typeof designation.coordinate).toBe('string');
    });
  });

  describe('Notable Discovery Classification', () => {
    it('should classify all wormholes as notable discoveries', () => {
      const wormholeAlpha = {
        type: 'wormhole',
        wormholeId: 'WH-NOTABLE-1',
        designation: 'alpha'
      };

      const wormholeBeta = {
        type: 'wormhole',  
        wormholeId: 'WH-NOTABLE-2',
        designation: 'beta'
      };

      expect(namingService.isNotableDiscovery(wormholeAlpha)).toBe(true);
      expect(namingService.isNotableDiscovery(wormholeBeta)).toBe(true);
    });

    it('should consistently classify wormholes as more notable than most other objects', () => {
      const wormhole = { type: 'wormhole', designation: 'alpha' };
      const commonPlanet = { type: 'planet', planetTypeName: 'Rocky Planet' };
      const rarePlanet = { type: 'planet', planetTypeName: 'Exotic World' };
      const star = { type: 'star', starTypeName: 'G-Type Star' };

      expect(namingService.isNotableDiscovery(wormhole)).toBe(true);
      expect(namingService.isNotableDiscovery(commonPlanet)).toBe(false);
      expect(namingService.isNotableDiscovery(rarePlanet)).toBe(true);
      expect(namingService.isNotableDiscovery(star)).toBe(false);
    });
  });

  describe('Deterministic Naming', () => {
    it('should generate consistent names for same coordinates', () => {
      const wormhole1 = {
        type: 'wormhole',
        x: 5000,
        y: 3000,
        designation: 'alpha'
        // No IDs - force coordinate-based naming
      };

      const wormhole2 = {
        type: 'wormhole',
        x: 5000,
        y: 3000,
        designation: 'alpha'
      };

      const name1 = namingService.generateDisplayName(wormhole1);
      const name2 = namingService.generateDisplayName(wormhole2);

      expect(name1).toBe(name2);
    });

    it('should generate different names for different coordinates', () => {
      const wormhole1 = {
        type: 'wormhole',
        x: 1000,
        y: 2000,
        designation: 'alpha'
      };

      const wormhole2 = {
        type: 'wormhole',
        x: 3000,
        y: 4000,
        designation: 'alpha'
      };

      const name1 = namingService.generateDisplayName(wormhole1);
      const name2 = namingService.generateDisplayName(wormhole2);

      expect(name1).not.toBe(name2);
    });

    it('should generate different names for same position but different designations', () => {
      const wormholeAlpha = {
        type: 'wormhole',
        x: 2000,
        y: 3000,
        designation: 'alpha'
      };

      const wormholeBeta = {
        type: 'wormhole',
        x: 2000,
        y: 3000,
        designation: 'beta'
      };

      const nameAlpha = namingService.generateDisplayName(wormholeAlpha);
      const nameBeta = namingService.generateDisplayName(wormholeBeta);

      expect(nameAlpha).toContain('α');
      expect(nameBeta).toContain('β');
      expect(nameAlpha).not.toBe(nameBeta);
    });
  });

  describe('Integration with Game Objects', () => {
    it('should handle wormhole objects with all standard properties', () => {
      const fullWormhole = {
        type: 'wormhole',
        x: 1500,
        y: 2500,
        wormholeId: 'WH-FULL',
        designation: 'alpha',
        pairId: 'WH-FULL-α',
        twinX: 8500,
        twinY: 3500,
        discovered: true,
        isActive: true,
        radius: 40,
        discoveryDistance: 115
      };

      const displayName = namingService.generateDisplayName(fullWormhole);
      const fullDesignation = namingService.generateFullDesignation(fullWormhole);
      const isNotable = namingService.isNotableDiscovery(fullWormhole);

      expect(displayName).toBe('WH-FULL-α');
      expect(fullDesignation).toBeDefined();
      expect(fullDesignation.catalog).toBe('WH-FULL-α');
      expect(isNotable).toBe(true);
    });

    it('should handle malformed wormhole objects gracefully', () => {
      const partialWormhole = {
        type: 'wormhole',
        x: 1000,
        y: 2000
        // Missing most properties
      };

      // Should not crash
      expect(() => {
        const name = namingService.generateDisplayName(partialWormhole);
        const designation = namingService.generateFullDesignation(partialWormhole);
        const notable = namingService.isNotableDiscovery(partialWormhole);
      }).not.toThrow();
    });

    it('should properly distinguish from other celestial objects', () => {
      const wormhole = { type: 'wormhole', x: 1000, y: 2000, designation: 'alpha' };
      const star = { type: 'star', x: 1000, y: 2000, starTypeName: 'G-Type Star' };
      const parentStar = { type: 'star', x: 900, y: 1900, starTypeName: 'G-Type Star' };
      const planet = { type: 'planet', x: 1000, y: 2000, planetTypeName: 'Rocky Planet', parentStar: parentStar };

      const wormholeName = namingService.generateDisplayName(wormhole);
      const starName = namingService.generateDisplayName(star);
      const planetName = namingService.generateDisplayName(planet);

      expect(wormholeName).toContain('α');
      expect(starName).toContain('ASV-');
      expect(planetName).toContain('ASV-');
    });
  });

  describe('Catalog Number Generation', () => {
    it('should generate 4-digit wormhole catalog numbers', () => {
      const wormhole = {
        type: 'wormhole',
        x: 12345,
        y: 67890,
        designation: 'alpha'
      };

      const name = namingService.generateDisplayName(wormhole);
      const match = name.match(/WH-(\d{4})-α/);
      
      expect(match).not.toBeNull();
      expect(match[1]).toHaveLength(4);
      
      const catalogNumber = parseInt(match[1]);
      expect(catalogNumber).toBeGreaterThanOrEqual(1000);
      expect(catalogNumber).toBeLessThanOrEqual(9999);
    });

    it('should generate different catalog numbers for different positions', () => {
      const positions = [
        [1000, 2000],
        [3000, 4000],
        [5000, 6000],
        [7000, 8000]
      ];

      const catalogNumbers = positions.map(([x, y]) => {
        const wormhole = { type: 'wormhole', x, y, designation: 'alpha' };
        const name = namingService.generateDisplayName(wormhole);
        const match = name.match(/WH-(\d{4})-α/);
        return match ? match[1] : null;
      });

      // All should be different
      const uniqueNumbers = new Set(catalogNumbers);
      expect(uniqueNumbers.size).toBe(positions.length);
    });

    it('should be deterministic for same coordinates', () => {
      const coords = [5432, 9876];
      
      const catalogNumbers = [];
      for (let i = 0; i < 3; i++) {
        const wormhole = { type: 'wormhole', x: coords[0], y: coords[1], designation: 'alpha' };
        const name = namingService.generateDisplayName(wormhole);
        const match = name.match(/WH-(\d{4})-α/);
        catalogNumbers.push(match ? match[1] : null);
      }

      // All should be the same
      expect(catalogNumbers[0]).toBe(catalogNumbers[1]);
      expect(catalogNumbers[1]).toBe(catalogNumbers[2]);
    });
  });
});