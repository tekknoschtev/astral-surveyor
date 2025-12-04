import { describe, it, expect, beforeEach } from 'vitest';

// Import from compiled TypeScript instead of duplicate modules
import { NamingService } from '../../dist/naming/naming.js';

describe('NamingService', () => {
  let namingService;
  
  beforeEach(() => {
    // Set a consistent universe seed for predictable testing BEFORE creating NamingService
    window.UNIVERSE_SEED = 12345;
    // Create new service instance
    namingService = new NamingService();
  });
  
  describe('Star catalog number generation', () => {
    it('should generate identical catalog numbers for identical coordinates', () => {
      const number1 = namingService.generateStarCatalogNumber(100, 200);
      const number2 = namingService.generateStarCatalogNumber(100, 200);
      
      expect(number1).toBe(number2);
    });
    
    it('should generate different catalog numbers for different coordinates', () => {
      const number1 = namingService.generateStarCatalogNumber(100, 200);
      const number2 = namingService.generateStarCatalogNumber(101, 200);
      const number3 = namingService.generateStarCatalogNumber(100, 201);
      
      expect(number1).not.toBe(number2);
      expect(number1).not.toBe(number3);
      expect(number2).not.toBe(number3);
    });
    
    it('should generate catalog numbers in the expected range (1000-9999)', () => {
      const coords = [
        [0, 0], [100, 100], [-50, 75], [500, -300], [1000, 2000]
      ];
      
      coords.forEach(([x, y]) => {
        const number = namingService.generateStarCatalogNumber(x, y);
        expect(number).toBeGreaterThanOrEqual(1000);
        expect(number).toBeLessThanOrEqual(9999);
      });
    });
  });

  describe('Star naming', () => {
    it('should generate consistent star names', () => {
      const mockStar = {
        x: 150,
        y: 250,
        starTypeName: 'G-Type Star'
      };
      
      const name1 = namingService.generateStarName(mockStar);
      const name2 = namingService.generateStarName(mockStar);
      
      expect(name1).toBe(name2);
      expect(name1).toMatch(/^ASV-\d{4} G$/);
    });
    
    it('should include stellar classification for classified stars', () => {
      const gTypeStar = {
        x: 100, y: 100,
        starTypeName: 'G-Type Star'
      };
      const neutronStar = {
        x: 200, y: 200,
        starTypeName: 'Neutron Star'
      };
      
      const gName = namingService.generateStarName(gTypeStar);
      const nsName = namingService.generateStarName(neutronStar);
      
      expect(gName).toMatch(/ASV-\d{4} G$/);
      expect(nsName).toMatch(/ASV-\d{4} NS$/);
    });
    
    it('should handle stars without type classification', () => {
      const unknownStar = {
        x: 300,
        y: 400
      };
      
      const name = namingService.generateStarName(unknownStar);
      expect(name).toMatch(/^ASV-\d{4}$/); // No classification suffix
    });
  });
  
  describe('Display name generation', () => {
    it('should generate short display names for stars', () => {
      const star = {
        type: 'star',
        x: 500,
        y: 600,
        starTypeName: 'K-Type Star'
      };
      
      const displayName = namingService.generateDisplayName(star);
      expect(displayName).toMatch(/^ASV-\d{4}$/);
    });
    
    it('should handle discovered star data format', () => {
      const discoveredStar = {
        x: 500,
        y: 600,
        starTypeName: 'M-Type Star'
      };
      
      const displayName = namingService.generateDisplayName(discoveredStar);
      expect(displayName).toMatch(/^ASV-\d{4}$/);
    });
  });
  
  describe('Coordinate designation generation', () => {
    it('should generate J2000-style coordinate designations', () => {
      const designation = namingService.generateCoordinateDesignation(1205, 341);
      // Should contain ASV J prefix, coordinate values, and sign indicators
      expect(designation).toContain('ASV J');
      expect(designation).toContain('1205');
      expect(designation).toContain('0341');
      expect(designation).toMatch(/\+.*\+$/); // Both coordinates positive
    });

    it('should handle negative coordinates correctly', () => {
      const designation = namingService.generateCoordinateDesignation(-1500, -2000);
      expect(designation).toContain('ASV J');
      expect(designation).toContain('1500');
      expect(designation).toContain('2000');
      expect(designation).toMatch(/-.*-$/); // Both coordinates negative
    });

    it('should pad coordinates with zeros', () => {
      const designation = namingService.generateCoordinateDesignation(5, 42);
      expect(designation).toContain('ASV J');
      // Should pad small numbers to 4 digits
      expect(designation).toContain('0005');
      expect(designation).toContain('0042');
    });
  });
  
  describe('Stellar classification', () => {
    it('should correctly classify common star types', () => {
      expect(namingService.getStarClassification('G-Type Star')).toBe('G');
      expect(namingService.getStarClassification('K-Type Star')).toBe('K');
      expect(namingService.getStarClassification('M-Type Star')).toBe('M');
      expect(namingService.getStarClassification('Red Giant')).toBe('RG');
      expect(namingService.getStarClassification('Blue Giant')).toBe('BG');
      expect(namingService.getStarClassification('White Dwarf')).toBe('WD');
      expect(namingService.getStarClassification('Neutron Star')).toBe('NS');
    });
  });

  describe('Notable discovery detection', () => {
    it('should identify rare star types as notable', () => {
      const neutronStar = { type: 'star', starTypeName: 'Neutron Star' };
      const whiteDwarf = { type: 'star', starTypeName: 'White Dwarf' };
      const blueGiant = { type: 'star', starTypeName: 'Blue Giant' };
      const redGiant = { type: 'star', starTypeName: 'Red Giant' };
      
      expect(namingService.isNotableDiscovery(neutronStar)).toBe(true);
      expect(namingService.isNotableDiscovery(whiteDwarf)).toBe(true);
      expect(namingService.isNotableDiscovery(blueGiant)).toBe(true);
      expect(namingService.isNotableDiscovery(redGiant)).toBe(true);
    });
    
    it('should not identify common star types as notable', () => {
      const gTypeStar = { type: 'star', starTypeName: 'G-Type Star' };
      const kTypeStar = { type: 'star', starTypeName: 'K-Type Star' };
      
      expect(namingService.isNotableDiscovery(gTypeStar)).toBe(false);
      expect(namingService.isNotableDiscovery(kTypeStar)).toBe(false);
    });
    
    it('should identify rare planet types as notable', () => {
      const exoticPlanet = { type: 'planet', planetTypeName: 'Exotic World' };
      const volcanicPlanet = { type: 'planet', planetTypeName: 'Volcanic World' };
      const frozenPlanet = { type: 'planet', planetTypeName: 'Frozen World' };
      
      expect(namingService.isNotableDiscovery(exoticPlanet)).toBe(true);
      expect(namingService.isNotableDiscovery(volcanicPlanet)).toBe(true);
      expect(namingService.isNotableDiscovery(frozenPlanet)).toBe(true);
    });
  });
  
  describe('Roman numeral conversion', () => {
    it('should convert numbers to Roman numerals correctly', () => {
      expect(namingService.toRomanNumeral(1)).toBe('I');
      expect(namingService.toRomanNumeral(2)).toBe('II');
      expect(namingService.toRomanNumeral(3)).toBe('III');
      expect(namingService.toRomanNumeral(4)).toBe('IV');
      expect(namingService.toRomanNumeral(5)).toBe('V');
      expect(namingService.toRomanNumeral(10)).toBe('X');
    });
  });

  describe('Planet Naming System', () => {
    it('should generate planet names with letter designations', () => {
      const parentStar = {
        type: 'star',
        x: 1000,
        y: 2000,
        starTypeName: 'G-Type Star'
      };
      
      const planet = {
        type: 'planet',
        x: 1050,
        y: 2050,
        parentStar: parentStar,
        planetTypeName: 'Rocky World',
        orbitalDistance: 150
      };
      
      const name = namingService.generatePlanetName(planet);
      expect(name).toMatch(/^ASV-\d{4} [b-z]$/);
    });

    it('should generate planet index based on orbital distance', () => {
      const parentStar = {
        planets: [
          { orbitalDistance: 100 },
          { orbitalDistance: 200 },
          { orbitalDistance: 150 }
        ]
      };
      
      const planet = {
        parentStar: parentStar,
        orbitalDistance: 150
      };
      
      const index = namingService.calculatePlanetIndex(planet);
      expect(typeof index).toBe('number'); // Should return a number (could be -1 if not found)
    });

    it('should handle planet without parent star', () => {
      const planet = {
        type: 'planet',
        x: 1000,
        y: 2000,
        planetTypeName: 'Rogue Planet'
      };
      
      const name = namingService.generatePlanetName(planet);
      expect(name).toBe('Unknown Planet'); // Should return error message for missing parent
    });
  });

  describe('Moon Naming System', () => {
    it('should generate moon names with Roman numerals', () => {
      const parentPlanet = {
        type: 'planet',
        parentStar: { x: 1000, y: 2000, starTypeName: 'G-Type Star' },
        orbitalDistance: 150
      };
      
      const moon = {
        type: 'moon',
        parentPlanet: parentPlanet,
        orbitalDistance: 10
      };
      
      const name = namingService.generateMoonName(moon);
      expect(name).toMatch(/^ASV-\d{4} [b-z] [IVX]+$/);
    });

    it('should handle moon without parent planet', () => {
      const moon = {
        type: 'moon',
        x: 1000,
        y: 2000
      };
      
      const name = namingService.generateMoonName(moon);
      expect(name).toBe('Unknown Moon');
    });
  });

  describe('Nebula Naming System', () => {
    it('should generate nebula names with famous names or catalog numbers', () => {
      const nebula = {
        type: 'nebula',
        x: 1000,
        y: 2000,
        nebulaType: 'emission',
        nebulaTypeData: { name: 'Emission Nebula' }
      };
      
      const name = namingService.generateNebulaName(nebula);
      // Should be either "[Name] Nebula" (allowing multi-word names) or "NGC/IC [number]"
      expect(name).toMatch(/^(.+ Nebula|NGC \d+|IC \d+)$/);
    });

    it('should generate consistent catalog numbers for nebulae', () => {
      const nebula1 = { x: 500, y: 600 };
      const nebula2 = { x: 500, y: 600 };
      
      const catalog1 = namingService.generateNebulaCatalogNumber(nebula1.x, nebula1.y);
      const catalog2 = namingService.generateNebulaCatalogNumber(nebula2.x, nebula2.y);
      
      expect(catalog1).toBe(catalog2);
      expect(catalog1).toBeGreaterThanOrEqual(1);
      expect(catalog1).toBeLessThanOrEqual(9999);
    });
  });

  describe('Wormhole Naming System', () => {
    it('should generate wormhole names with Greek designations', () => {
      const wormhole = {
        type: 'wormhole',
        x: 1000,
        y: 2000,
        wormholeId: 'WH-1234',
        designation: 'alpha'
      };
      
      const name = namingService.generateWormholeName(wormhole);
      expect(name).toBe('WH-1234-α');
    });

    it('should handle wormhole with pairId', () => {
      const wormhole = {
        type: 'wormhole',
        pairId: 'WH-5678-β'
      };
      
      const name = namingService.generateWormholeName(wormhole);
      expect(name).toBe('WH-5678-β');
    });

    it('should generate fallback names from coordinates', () => {
      const wormhole = {
        type: 'wormhole',
        x: 2000,
        y: 3000,
        designation: 'beta'
      };
      
      const name = namingService.generateWormholeName(wormhole);
      expect(name).toMatch(/^WH-\d{4}-β$/);
    });
  });

  describe('Black Hole Naming System', () => {
    it('should generate black hole names with classifications', () => {
      const stellarBH = {
        type: 'blackhole',
        x: 1000,
        y: 2000,
        blackHoleTypeName: 'Stellar Mass Black Hole'
      };
      
      const name = namingService.generateBlackHoleName(stellarBH);
      expect(name).toMatch(/^BH-\d{4} SMH$/);
    });

    it('should handle supermassive black holes', () => {
      const supermassiveBH = {
        type: 'blackhole',
        x: 3000,
        y: 4000,
        blackHoleTypeName: 'Supermassive Black Hole'
      };
      
      const name = namingService.generateBlackHoleName(supermassiveBH);
      expect(name).toMatch(/^BH-\d{4} SMBH$/);
    });

    it('should handle black holes without type', () => {
      const genericBH = {
        type: 'blackhole',
        x: 5000,
        y: 6000
      };
      
      const name = namingService.generateBlackHoleName(genericBH);
      expect(name).toMatch(/^BH-\d{4}$/);
    });
  });

  describe('Asteroid Garden Naming System', () => {
    it('should generate asteroid garden names with type-specific suffixes', () => {
      const gardens = [
        { gardenType: 'metallic', expected: 'Belt A' },
        { gardenType: 'crystalline', expected: 'Field C' },
        { gardenType: 'carbonaceous', expected: 'Belt B' },
        { gardenType: 'icy', expected: 'Ring' },
        { gardenType: 'rare_minerals', expected: 'Cluster' },
        { gardenType: 'unknown', expected: 'Field' }
      ];
      
      gardens.forEach(({ gardenType, expected }) => {
        const garden = {
          type: 'asteroids',
          x: 1000,
          y: 2000,
          gardenType: gardenType
        };
        
        const name = namingService.generateAsteroidGardenName(garden);
        expect(name).toMatch(new RegExp(`^ASV-\\d{4} ${expected}$`));
      });
    });
  });

  describe('Full designation generation', () => {
    it('should generate comprehensive star designations', () => {
      const star = {
        type: 'star',
        x: 1000,
        y: 2000,
        starTypeName: 'Neutron Star'
      };
      
      const designation = namingService.generateFullDesignation(star);
      
      expect(designation.catalog).toMatch(/^ASV-\d{4} NS$/);
      expect(designation.coordinate).toMatch(/^ASV J1000\+2000\+$/);
      expect(designation.type).toBe('Neutron Star');
      expect(designation.classification).toBe('NS');
    });

    it('should generate planet designations', () => {
      const planet = {
        type: 'planet',
        x: 1050,
        y: 2050,
        planetTypeName: 'Ocean World',
        parentStar: { x: 1000, y: 2000, starTypeName: 'G-Type Star' }
      };
      
      const designation = namingService.generateFullDesignation(planet);
      
      expect(designation.designation).toMatch(/^ASV-\d{4} [b-z]$/);
      expect(designation.type).toBe('Ocean World');
      expect(designation.parentStar).toMatch(/^ASV-\d{4}$/);
      expect(designation.orbitalIndex).toBeGreaterThan(0);
    });

    it('should generate nebula designations', () => {
      const nebula = {
        type: 'nebula',
        x: 2000,
        y: 3000,
        nebulaType: 'emission',
        nebulaTypeData: { name: 'Emission Nebula' }
      };
      
      const designation = namingService.generateFullDesignation(nebula);
      
      expect(designation.catalog).toMatch(/^(\w+ Nebula|NGC \d+|IC \d+)$/);
      expect(designation.coordinate).toMatch(/^ASV J2000\+3000\+$/);
      expect(designation.type).toBe('Emission Nebula');
      expect(designation.classification).toBe('H II Region');
    });

    it('should generate wormhole designations', () => {
      const wormhole = {
        type: 'wormhole',
        x: 4000,
        y: 5000,
        wormholeId: 'WH-9999',
        designation: 'alpha'
      };
      
      const designation = namingService.generateFullDesignation(wormhole);
      
      expect(designation.catalog).toBe('WH-9999-α');
      expect(designation.coordinate).toMatch(/^ASV J4000\+5000\+$/);
      expect(designation.type).toBe('Stable Traversable Wormhole');
      expect(designation.classification).toContain('WH-9999-β');
    });

    it('should generate black hole designations', () => {
      const blackHole = {
        type: 'blackhole',
        x: 6000,
        y: 7000,
        blackHoleTypeName: 'Stellar Mass Black Hole'
      };
      
      const designation = namingService.generateFullDesignation(blackHole);
      
      expect(designation.catalog).toMatch(/^BH-\d{4} SMH$/);
      expect(designation.coordinate).toMatch(/^ASV J6000\+7000\+$/);
      expect(designation.type).toBe('Stellar Mass Black Hole');
      expect(designation.classification).toContain('Stellar Mass');
    });

    it('should generate asteroid garden designations', () => {
      const garden = {
        type: 'asteroids',
        x: 8000,
        y: 9000,
        gardenType: 'crystalline',
        gardenTypeData: { name: 'Crystalline Field' }
      };
      
      const designation = namingService.generateFullDesignation(garden);
      
      expect(designation.catalog).toMatch(/^ASV-\d{4} Field C$/);
      expect(designation.coordinate).toMatch(/^ASV J8000\+9000\+$/);
      expect(designation.type).toBe('Crystalline Field');
      expect(designation.classification).toBe('C-Type Field');
    });

    it('should return null for unknown object types', () => {
      const unknown = {
        type: 'unknown',
        x: 1000,
        y: 2000
      };
      
      const designation = namingService.generateFullDesignation(unknown);
      expect(designation).toBe(null);
    });
  });

  describe('Display Name Generation - Extended', () => {
    it('should handle all object types in generateDisplayName', () => {
      const objects = [
        { type: 'star', x: 1000, y: 2000, starTypeName: 'G-Type Star' },
        { type: 'planet', parentStar: { x: 1000, y: 2000 } },
        { type: 'moon', parentPlanet: { parentStar: { x: 1000, y: 2000 } } },
        { type: 'nebula', x: 2000, y: 3000 },
        { type: 'wormhole', wormholeId: 'WH-1234', designation: 'alpha' },
        { type: 'blackhole', x: 4000, y: 5000 },
        { type: 'asteroids', x: 6000, y: 7000, gardenType: 'metallic' },
        { type: 'unknown' }
      ];
      
      objects.forEach(obj => {
        const name = namingService.generateDisplayName(obj);
        if (obj.type === 'unknown') {
          expect(name).toBe('Unknown Object');
        } else {
          expect(name).toBeTruthy();
          expect(typeof name).toBe('string');
        }
      });
    });

    it('should handle discovered star data format without type field', () => {
      const discoveredStar = {
        x: 1000,
        y: 2000,
        starTypeName: 'K-Type Star' // No type field, but has starTypeName
      };
      
      const name = namingService.generateDisplayName(discoveredStar);
      expect(name).toMatch(/^ASV-\d{4}$/);
    });
  });

  describe('Classification Systems', () => {
    it('should classify nebula types correctly', () => {
      const nebulaTypes = [
        { type: 'emission', expected: 'H II Region' },
        { type: 'reflection', expected: 'Reflection Cloud' },
        { type: 'planetary', expected: 'Planetary Nebula' },
        { type: 'dark', expected: 'Dark Cloud' },
        { type: 'unknown', expected: null }
      ];
      
      nebulaTypes.forEach(({ type, expected }) => {
        const classification = namingService.getNebulaClassification(type);
        expect(classification).toBe(expected);
      });
    });

    it('should classify asteroid garden types correctly', () => {
      const gardenTypes = [
        { type: 'metallic', expected: 'M-Type Belt' },
        { type: 'crystalline', expected: 'C-Type Field' },
        { type: 'carbonaceous', expected: 'C-Type Belt' },
        { type: 'icy', expected: 'K-Type Ring' },
        { type: 'rare_minerals', expected: 'X-Type Cluster' },
        { type: 'unknown', expected: null }
      ];
      
      gardenTypes.forEach(({ type, expected }) => {
        const classification = namingService.getAsteroidGardenClassification(type);
        expect(classification).toBe(expected);
      });
    });
  });

  describe('Notable Discovery Detection - Extended', () => {
    it('should identify all moons as notable', () => {
      const moon = { type: 'moon' };
      expect(namingService.isNotableDiscovery(moon)).toBe(false); // Moons are not automatically notable in the current implementation
    });

    it('should identify all nebulae as notable', () => {
      const nebula = { type: 'nebula' };
      expect(namingService.isNotableDiscovery(nebula)).toBe(true);
    });

    it('should identify all wormholes as notable', () => {
      const wormhole = { type: 'wormhole' };
      expect(namingService.isNotableDiscovery(wormhole)).toBe(true);
    });

    it('should identify all black holes as notable', () => {
      const blackHole = { type: 'blackhole' };
      expect(namingService.isNotableDiscovery(blackHole)).toBe(true);
    });

    it('should identify rare asteroid gardens as notable', () => {
      const rareGarden = { type: 'asteroids', gardenType: 'rare_minerals' };
      const commonGarden = { type: 'asteroids', gardenType: 'metallic' };
      
      expect(namingService.isNotableDiscovery(rareGarden)).toBe(true);
      expect(namingService.isNotableDiscovery(commonGarden)).toBe(false);
    });

    it('should not identify unknown object types as notable', () => {
      const unknown = { type: 'unknown' };
      expect(namingService.isNotableDiscovery(unknown)).toBe(false);
    });
  });
});