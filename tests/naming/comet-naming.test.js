import { describe, it, expect, beforeEach } from 'vitest';

// Import from compiled TypeScript
import { NamingService } from '../../dist/naming/naming.js';

describe('Comet Naming System', () => {
  let namingService;
  
  beforeEach(() => {
    namingService = new NamingService();
  });
  
  describe('Basic Comet Naming', () => {
    it('should generate consistent comet designations following astronomical conventions', () => {
      const mockStar = {
        x: 1000,
        y: 2000,
        type: 'star',
        starTypeName: 'G-Type Star'
      };
      
      const mockComet = {
        x: 1050,
        y: 2050,
        type: 'comet',
        parentStar: mockStar,
        cometIndex: 0,
        cometType: {
          name: 'Ice Comet',
          rarity: 0.4,
          discoveryValue: 20,
          description: 'Frozen water and volatile compounds'
        }
      };
      
      const cometName = namingService.generateCometName(mockComet);
      
      // Should follow C/YEAR-SNN format
      expect(cometName).toMatch(/^C\/\d{4}-S\d{2}$/);
      
      // Should be consistent for same comet
      const secondCall = namingService.generateCometName(mockComet);
      expect(cometName).toBe(secondCall);
    });
    
    it('should generate different designations for different comets in same system', () => {
      const mockStar = {
        x: 1000,
        y: 2000,
        type: 'star',
        starTypeName: 'G-Type Star'
      };
      
      const comet1 = {
        x: 1050,
        y: 2050,
        type: 'comet',
        parentStar: mockStar,
        cometIndex: 0,
        cometType: { name: 'Ice Comet', rarity: 0.4, discoveryValue: 20, description: 'Ice comet' }
      };
      
      const comet2 = {
        x: 1100,
        y: 2100,
        type: 'comet',
        parentStar: mockStar,
        cometIndex: 1,
        cometType: { name: 'Dust Comet', rarity: 0.3, discoveryValue: 22, description: 'Dust comet' }
      };
      
      const name1 = namingService.generateCometName(comet1);
      const name2 = namingService.generateCometName(comet2);
      
      // Different indices should produce different sequence numbers
      expect(name1).not.toBe(name2);
      expect(name1).toMatch(/S01$/);
      expect(name2).toMatch(/S02$/);
    });
    
    it('should handle comets without parent star', () => {
      const mockComet = {
        x: 1000,
        y: 2000,
        type: 'comet',
        cometIndex: 0,
        cometType: {
          name: 'Ice Comet',
          rarity: 0.4,
          discoveryValue: 20,
          description: 'Orphaned comet'
        }
      };
      
      const cometName = namingService.generateCometName(mockComet);
      
      // Should still generate valid name using comet's own coordinates
      expect(cometName).toMatch(/^C\/\d{4}-S\d{2}$/);
    });
  });
  
  describe('Display Name Generation', () => {
    it('should return comet designation for display name', () => {
      const mockComet = {
        x: 1000,
        y: 2000,
        type: 'comet',
        cometIndex: 0,
        cometType: {
          name: 'Ice Comet',
          rarity: 0.4,
          discoveryValue: 20,
          description: 'Ice comet'
        }
      };
      
      const displayName = namingService.generateDisplayName(mockComet);
      const directName = namingService.generateCometName(mockComet);
      
      expect(displayName).toBe(directName);
      expect(displayName).toMatch(/^C\/\d{4}-S\d{2}$/);
    });
  });
  
  describe('Full Designation System', () => {
    it('should generate comprehensive full designation for comets', () => {
      const mockStar = {
        x: 1000,
        y: 2000,
        type: 'star',
        starTypeName: 'G-Type Star'
      };
      
      const mockComet = {
        x: 1050,
        y: 2050,
        type: 'comet',
        parentStar: mockStar,
        cometIndex: 0,
        cometType: {
          name: 'Ice Comet',
          rarity: 0.4,
          discoveryValue: 20,
          description: 'Frozen water and volatile compounds'
        }
      };
      
      const fullDesignation = namingService.generateFullDesignation(mockComet);
      
      expect(fullDesignation).toBeDefined();
      expect(fullDesignation.catalog).toMatch(/^C\/\d{4}-S\d{2}$/);
      expect(fullDesignation.coordinate).toMatch(/^ASV J\d{4}[+-]\d{4}[+-]$/);
      expect(fullDesignation.type).toBe('Ice Comet');
      expect(fullDesignation.classification).toBe('H2O-Rich (Periodic Visitor)');
      expect(fullDesignation.parentStar).toBeDefined();
    });
    
    it('should provide correct classification for all comet types', () => {
      const cometTypes = [
        { name: 'Ice Comet', expectedClass: 'H2O-Rich (Periodic Visitor)' },
        { name: 'Dust Comet', expectedClass: 'Silicate-Rich (Debris Trail)' },
        { name: 'Rocky Comet', expectedClass: 'Metal-Rich (Dense Core)' },
        { name: 'Organic Comet', expectedClass: 'Carbon-Rich (Primordial Composition)' }
      ];
      
      cometTypes.forEach(({ name, expectedClass }) => {
        const mockComet = {
          x: 1000,
          y: 2000,
          type: 'comet',
          cometIndex: 0,
          cometType: {
            name: name,
            rarity: 0.4,
            discoveryValue: 20,
            description: 'Test comet'
          }
        };
        
        const fullDesignation = namingService.generateFullDesignation(mockComet);
        expect(fullDesignation.classification).toBe(expectedClass);
      });
    });
    
    it('should handle comets with unknown types gracefully', () => {
      const mockComet = {
        x: 1000,
        y: 2000,
        type: 'comet',
        cometIndex: 0
        // No cometType
      };
      
      const fullDesignation = namingService.generateFullDesignation(mockComet);
      
      expect(fullDesignation).toBeDefined();
      expect(fullDesignation.type).toBe('Comet'); // Fallback type
      expect(fullDesignation.classification).toBe(null); // No classification for unknown type
    });
  });
  
  describe('Notable Discovery Detection', () => {
    it('should identify organic comets as notable discoveries', () => {
      const organicComet = {
        x: 1000,
        y: 2000,
        type: 'comet',
        cometType: {
          name: 'Organic Comet',
          rarity: 0.1,
          discoveryValue: 30,
          description: 'Rare organic compounds'
        }
      };
      
      const isNotable = namingService.isNotableDiscovery(organicComet);
      expect(isNotable).toBe(true);
    });
    
    it('should not mark common comets as notable discoveries', () => {
      const commonComets = ['Ice Comet', 'Dust Comet', 'Rocky Comet'];
      
      commonComets.forEach(name => {
        const comet = {
          x: 1000,
          y: 2000,
          type: 'comet',
          cometType: {
            name: name,
            rarity: 0.4,
            discoveryValue: 20,
            description: 'Common comet'
          }
        };
        
        const isNotable = namingService.isNotableDiscovery(comet);
        expect(isNotable).toBe(false);
      });
    });
  });
  
  describe('Integration with Star Systems', () => {
    it('should correctly reference parent star in full designation', () => {
      const mockStar = {
        x: 1500,
        y: 2500,
        type: 'star',
        starTypeName: 'K-Type Star'
      };
      
      const mockComet = {
        x: 1550,
        y: 2550,
        type: 'comet',
        parentStar: mockStar,
        cometIndex: 2,
        cometType: {
          name: 'Dust Comet',
          rarity: 0.3,
          discoveryValue: 22,
          description: 'Dusty comet'
        }
      };
      
      const fullDesignation = namingService.generateFullDesignation(mockComet);
      const starDisplayName = namingService.generateDisplayName(mockStar);
      
      expect(fullDesignation.parentStar).toBe(starDisplayName);
      expect(fullDesignation.parentStar).toMatch(/^ASV-\d{4}$/);
    });
  });
});