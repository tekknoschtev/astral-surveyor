import { describe, it, expect, beforeEach } from 'vitest';

// Import from compiled TypeScript
import { DiscoveryVisualizationService } from '../../dist/services/DiscoveryVisualizationService.js';

describe('Comet Discovery Visualization', () => {
  let visualizationService;
  
  beforeEach(() => {
    visualizationService = new DiscoveryVisualizationService();
  });
  
  describe('Comet-Specific Visual Effects', () => {
    it('should apply special comet discovery effects', () => {
      const cometRarity = visualizationService.getObjectRarity('comet');
      const cometConfig = visualizationService.getRarityConfig(cometRarity, 'comet');
      
      // Verify comet gets special ice-blue color
      expect(cometConfig.color).toBe('#87CEEB');
      expect(cometConfig.pulseColor).toBe('#E0FFFF');
      
      // Verify comet gets discovery pulse (like rare objects)
      expect(cometConfig.hasDiscoveryPulse).toBe(true);
      expect(cometConfig.hasOngoingPulse).toBe(false);
      
      // Verify comet gets special dash pattern
      expect(cometConfig.dashPattern).toEqual([12, 8, 4, 8]);
      
      // Verify comet gets thicker line width
      expect(cometConfig.lineWidth).toBe(1.8);
    });
    
    it('should provide discovery pulse for comets when discovered', () => {
      const currentTime = Date.now();
      const discoveryTime = currentTime - 1000; // Discovered 1 second ago
      
      const indicatorData = visualizationService.getDiscoveryIndicatorData('test-comet', {
        x: 100,
        y: 100,
        baseRadius: 50,
        rarity: visualizationService.getObjectRarity('comet'),
        objectType: 'comet',
        discoveryTimestamp: discoveryTime,
        currentTime: currentTime
      });
      
      // Should have discovery pulse active
      expect(indicatorData.discoveryPulse).toBeDefined();
      expect(indicatorData.discoveryPulse.isVisible).toBe(true);
      expect(indicatorData.discoveryPulse.radius).toBeGreaterThan(0);
      expect(indicatorData.discoveryPulse.opacity).toBeGreaterThan(0);
      
      // Should not have ongoing pulse
      expect(indicatorData.ongoingPulse).toBeUndefined();
      
      // Should use comet-specific colors
      expect(indicatorData.config.color).toBe('#87CEEB');
      expect(indicatorData.config.pulseColor).toBe('#E0FFFF');
    });
    
    it('should complete discovery pulse after duration', () => {
      const currentTime = Date.now();
      const discoveryTime = currentTime - 3000; // Discovered 3 seconds ago (past 2.5s duration)
      
      const indicatorData = visualizationService.getDiscoveryIndicatorData('test-comet-2', {
        x: 100,
        y: 100,
        baseRadius: 50,
        rarity: visualizationService.getObjectRarity('comet'),
        objectType: 'comet',
        discoveryTimestamp: discoveryTime,
        currentTime: currentTime
      });
      
      // Discovery pulse should be finished
      if (indicatorData.discoveryPulse) {
        expect(indicatorData.discoveryPulse.isVisible).toBe(false);
      }
    });
    
    it('should render comet discovery indicators differently than standard uncommon objects', () => {
      const currentTime = Date.now();
      
      // Get comet visualization config
      const cometConfig = visualizationService.getRarityConfig(
        visualizationService.getObjectRarity('comet'), 
        'comet'
      );
      
      // Get standard uncommon object config (e.g., ocean world)
      const standardConfig = visualizationService.getRarityConfig(
        visualizationService.getObjectRarity('OCEAN'), 
        'OCEAN'
      );
      
      // Comets should have different visual properties
      expect(cometConfig.color).not.toBe(standardConfig.color);
      expect(cometConfig.lineWidth).toBeGreaterThan(standardConfig.lineWidth);
      expect(cometConfig.hasDiscoveryPulse).toBe(true);
      expect(standardConfig.hasDiscoveryPulse).toBe(false);
      expect(cometConfig.dashPattern).not.toEqual(standardConfig.dashPattern);
    });
    
    it('should use special pulse timing for comets', () => {
      const currentTime = Date.now();
      const discoveryTime = currentTime - 2750; // 2.75 seconds ago
      
      // Test comet pulse duration (should still be active at 2.75s since duration is 3s)
      const cometData = visualizationService.getDiscoveryIndicatorData('test-comet-pulse', {
        x: 100,
        y: 100,
        baseRadius: 50,
        rarity: visualizationService.getObjectRarity('comet'),
        objectType: 'comet',
        discoveryTimestamp: discoveryTime,
        currentTime: currentTime
      });
      
      // Comet pulse should still be active (3s duration vs standard 2.5s)
      expect(cometData.discoveryPulse).toBeDefined();
      expect(cometData.discoveryPulse.isVisible).toBe(true);
      
      // Test that standard rare object would have finished by now
      const rareData = visualizationService.getDiscoveryIndicatorData('test-rare-object', {
        x: 100,
        y: 100,
        baseRadius: 50,
        rarity: 'rare',
        objectType: 'BLUE_GIANT',
        discoveryTimestamp: discoveryTime,
        currentTime: currentTime
      });
      
      // Standard rare object pulse should be finished (2.5s duration)
      if (rareData.discoveryPulse) {
        expect(rareData.discoveryPulse.isVisible).toBe(false);
      }
    });
  });
});