import { describe, it, expect } from 'vitest';

// Import from compiled TypeScript
import { DiscoveryConfig } from '../../dist/config/gameConfig.js';

describe('Comet Discovery Configuration', () => {
  it('should have comet discovery distance configured', () => {
    expect(DiscoveryConfig.distances.comet).toBeDefined();
    expect(typeof DiscoveryConfig.distances.comet).toBe('number');
    expect(DiscoveryConfig.distances.comet).toBeGreaterThan(0);
  });
  
  it('should have comet discovery value configured', () => {
    expect(DiscoveryConfig.values.comet).toBeDefined();
    expect(typeof DiscoveryConfig.values.comet).toBe('number');
    expect(DiscoveryConfig.values.comet).toBeGreaterThan(0);
  });
  
  it('should have comet discovery distance between uncommon objects', () => {
    // Comets should have discovery distance between asteroids (250) and nebulae (300)
    // since they are more common than nebulae but rarer than asteroids
    expect(DiscoveryConfig.distances.comet).toBeGreaterThan(DiscoveryConfig.distances.asteroidGarden);
    expect(DiscoveryConfig.distances.comet).toBeLessThan(DiscoveryConfig.distances.nebula);
  });
  
  it('should have comet discovery value between uncommon objects', () => {
    // Comets should be worth more than asteroids but less than nebulae
    expect(DiscoveryConfig.values.comet).toBeGreaterThan(DiscoveryConfig.values.asteroidGarden);
    expect(DiscoveryConfig.values.comet).toBeLessThan(DiscoveryConfig.values.nebula);
  });
});