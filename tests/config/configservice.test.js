import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import from compiled TypeScript
import { ConfigService } from '../../dist/config/ConfigService.js';

describe('ConfigService Tests', () => {
  let configService;
  
  beforeEach(() => {
    configService = new ConfigService();
  });
  
  describe('Service Interface', () => {
    it('should have a get method to retrieve configuration values', () => {
      expect(typeof configService.get).toBe('function');
    });
    
    it('should have a set method to update configuration values', () => {
      expect(typeof configService.set).toBe('function');
    });
    
    it('should have a reset method to restore default values', () => {
      expect(typeof configService.reset).toBe('function');
    });
    
    it('should have a validate method to check configuration integrity', () => {
      expect(typeof configService.validate).toBe('function');
    });
  });
  
  describe('Configuration Retrieval', () => {
    it('should get world configuration values', () => {
      const chunkSize = configService.get('world.chunkSize');
      expect(typeof chunkSize).toBe('number');
      expect(chunkSize).toBeGreaterThan(0);
    });
    
    it('should get nested configuration values with dot notation', () => {
      const starSpawnChance = configService.get('world.starSystem.spawnChance');
      expect(typeof starSpawnChance).toBe('number');
      expect(starSpawnChance).toBeGreaterThan(0);
      expect(starSpawnChance).toBeLessThanOrEqual(1);
    });
    
    it('should get celestial configuration values', () => {
      const planetRadius = configService.get('celestial.planets.baseRadius');
      expect(typeof planetRadius).toBe('object');
      expect(planetRadius).toHaveProperty('min');
      expect(planetRadius).toHaveProperty('max');
    });
    
    it('should get discovery configuration values', () => {
      const starDiscoveryDistance = configService.get('discovery.distances.star');
      expect(typeof starDiscoveryDistance).toBe('number');
      expect(starDiscoveryDistance).toBeGreaterThan(0);
    });
    
    it('should get debug configuration values', () => {
      const debugEnabled = configService.get('debug.enabled');
      expect(typeof debugEnabled).toBe('boolean');
    });
    
    it('should return undefined for non-existent configuration paths', () => {
      const nonExistent = configService.get('non.existent.path');
      expect(nonExistent).toBeUndefined();
    });
    
    it('should return default value when path does not exist', () => {
      const defaultValue = { test: 123 };
      const result = configService.get('non.existent.path', defaultValue);
      expect(result).toBe(defaultValue);
    });
  });
  
  describe('Configuration Updates', () => {
    it('should set configuration values using dot notation', () => {
      configService.set('debug.enabled', true);
      const result = configService.get('debug.enabled');
      expect(result).toBe(true);
    });
    
    it('should set nested configuration values', () => {
      configService.set('world.chunkSize', 3000);
      const result = configService.get('world.chunkSize');
      expect(result).toBe(3000);
    });
    
    it('should create new configuration paths when setting', () => {
      configService.set('custom.newPath', 'testValue');
      const result = configService.get('custom.newPath');
      expect(result).toBe('testValue');
    });
    
    it('should handle setting complex objects', () => {
      const complexObject = { min: 10, max: 20, enabled: true };
      configService.set('test.complex', complexObject);
      const result = configService.get('test.complex');
      expect(result).toEqual(complexObject);
    });
    
    it('should emit change events when configuration is updated', () => {
      const changeHandler = vi.fn();
      configService.onChange(changeHandler);
      
      configService.set('debug.enabled', true);
      
      expect(changeHandler).toHaveBeenCalledWith('debug.enabled', true);
    });
  });
  
  describe('Configuration Reset', () => {
    it('should reset all configuration to defaults', () => {
      // Modify some values
      configService.set('debug.enabled', true);
      configService.set('world.chunkSize', 5000);
      
      // Reset configuration
      configService.reset();
      
      // Values should be back to defaults
      const debugEnabled = configService.get('debug.enabled');
      const chunkSize = configService.get('world.chunkSize');
      
      expect(debugEnabled).toBe(false); // Default is false
      expect(chunkSize).toBe(2000); // Default is 2000
    });
    
    it('should reset specific configuration sections', () => {
      configService.set('debug.enabled', true);
      configService.set('debug.showFPS', false);
      configService.set('world.chunkSize', 5000);
      
      configService.reset('debug');
      
      // Debug section should be reset
      expect(configService.get('debug.enabled')).toBe(false);
      expect(configService.get('debug.showFPS')).toBe(true);
      
      // Other sections should remain modified
      expect(configService.get('world.chunkSize')).toBe(5000);
    });
    
    it('should emit reset events', () => {
      const resetHandler = vi.fn();
      configService.onReset(resetHandler);
      
      configService.reset();
      
      expect(resetHandler).toHaveBeenCalled();
    });
  });
  
  describe('Configuration Validation', () => {
    it('should validate configuration integrity', () => {
      const isValid = configService.validate();
      expect(typeof isValid).toBe('boolean');
      expect(isValid).toBe(true);
    });
    
    it('should detect invalid configuration values', () => {
      // Set invalid value
      configService.set('world.chunkSize', -1000);
      
      const isValid = configService.validate();
      expect(isValid).toBe(false);
    });
    
    it('should validate specific configuration sections', () => {
      const worldValid = configService.validate('world');
      expect(typeof worldValid).toBe('boolean');
    });
    
    it('should return validation errors', () => {
      configService.set('world.chunkSize', 'invalid');
      
      const errors = configService.getValidationErrors();
      expect(Array.isArray(errors)).toBe(true);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
  
  describe('Event System', () => {
    it('should support change event listeners', () => {
      const handler = vi.fn();
      configService.onChange(handler);
      
      configService.set('test.value', 123);
      
      expect(handler).toHaveBeenCalledWith('test.value', 123);
    });
    
    it('should support removing event listeners', () => {
      const handler = vi.fn();
      const unsubscribe = configService.onChange(handler);
      
      unsubscribe();
      configService.set('test.value', 456);
      
      expect(handler).not.toHaveBeenCalled();
    });
    
    it('should support multiple event listeners', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      configService.onChange(handler1);
      configService.onChange(handler2);
      
      configService.set('test.value', 789);
      
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });
  
  describe('Configuration Categories', () => {
    it('should provide access to world configuration', () => {
      const worldConfig = configService.getWorldConfig();
      expect(typeof worldConfig).toBe('object');
      expect(worldConfig).toHaveProperty('chunkSize');
      expect(worldConfig).toHaveProperty('starSystem');
    });
    
    it('should provide access to celestial configuration', () => {
      const celestialConfig = configService.getCelestialConfig();
      expect(typeof celestialConfig).toBe('object');
      expect(celestialConfig).toHaveProperty('planets');
      expect(celestialConfig).toHaveProperty('stars');
    });
    
    it('should provide access to discovery configuration', () => {
      const discoveryConfig = configService.getDiscoveryConfig();
      expect(typeof discoveryConfig).toBe('object');
      expect(discoveryConfig).toHaveProperty('distances');
      expect(discoveryConfig).toHaveProperty('values');
    });
    
    it('should provide access to visual configuration', () => {
      const visualConfig = configService.getVisualConfig();
      expect(typeof visualConfig).toBe('object');
      expect(visualConfig).toHaveProperty('parallax');
    });
    
    it('should provide access to debug configuration', () => {
      const debugConfig = configService.getDebugConfig();
      expect(typeof debugConfig).toBe('object');
      expect(debugConfig).toHaveProperty('enabled');
      expect(debugConfig).toHaveProperty('chunkBoundaries');
    });
  });
  
  describe('Constants and Defaults', () => {
    it('should provide access to game constants', () => {
      const constants = configService.getConstants();
      expect(typeof constants).toBe('object');
      expect(constants).toHaveProperty('DEFAULT_CHUNK_SIZE');
      expect(constants).toHaveProperty('MAX_DISCOVERY_DISTANCE');
    });
    
    it('should enforce constant immutability', () => {
      const constants = configService.getConstants();
      const originalChunkSize = constants.DEFAULT_CHUNK_SIZE;
      
      // Attempt to modify constant (should throw an error or silently fail)
      expect(() => {
        constants.DEFAULT_CHUNK_SIZE = 9999;
      }).toThrow();
      
      // Get constants again - should be unchanged
      const freshConstants = configService.getConstants();
      expect(freshConstants.DEFAULT_CHUNK_SIZE).toBe(originalChunkSize);
    });
  });
  
  describe('Environment Integration', () => {
    it('should load configuration from environment if available', () => {
      // This test would check if the service can load config from env vars
      // For now, just ensure the method exists
      expect(typeof configService.loadFromEnvironment).toBe('function');
    });
    
    it('should export configuration for debugging', () => {
      const exported = configService.exportConfig();
      expect(typeof exported).toBe('object');
      expect(exported).toHaveProperty('world');
      expect(exported).toHaveProperty('celestial');
    });
    
    it('should import configuration from object', () => {
      const testConfig = {
        debug: { enabled: true },
        world: { chunkSize: 4000 }
      };
      
      configService.importConfig(testConfig);
      
      expect(configService.get('debug.enabled')).toBe(true);
      expect(configService.get('world.chunkSize')).toBe(4000);
    });
  });
});