import { describe, it, expect, beforeEach } from 'vitest';

// Import from compiled TypeScript instead of duplicate modules
import { NamingService } from '../../dist/naming/naming.js';

describe('NamingService', () => {
  let namingService;
  
  beforeEach(() => {
    // Set a consistent universe seed for predictable testing BEFORE creating NamingService
    window.UNIVERSE_SEED = 12345;
    // Reset any global state that might affect tests
    resetMockMathRandom();
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
    
    it('should cache catalog numbers to avoid recalculation', () => {
      const number1 = namingService.generateStarCatalogNumber(123, 456);
      const number2 = namingService.generateStarCatalogNumber(123, 456);
      
      // Should be same instance from cache
      expect(number1).toBe(number2);
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
      expect(designation).toBe('ASV J1205+0341+');
    });
    
    it('should handle negative coordinates correctly', () => {
      const designation = namingService.generateCoordinateDesignation(-1500, -2000);
      expect(designation).toBe('ASV J1500-2000-');
    });
    
    it('should pad coordinates with zeros', () => {
      const designation = namingService.generateCoordinateDesignation(5, 42);
      expect(designation).toBe('ASV J0005+0042+');
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
    
    it('should return null for unknown star types', () => {
      expect(namingService.getStarClassification('Unknown Star')).toBe(null);
      expect(namingService.getStarClassification('')).toBe(null);
      expect(namingService.getStarClassification(undefined)).toBe(null);
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
    
    it('should handle numbers beyond roman numeral range', () => {
      expect(namingService.toRomanNumeral(15)).toBe('15');
      expect(namingService.toRomanNumeral(0)).toBe('0'); // 0 falls back to toString()
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
  });
});