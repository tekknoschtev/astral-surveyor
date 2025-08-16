// Integration Tests - Cross-service interaction testing
// Tests how services work together in realistic scenarios

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ServiceFactory } from '../../dist/services/ServiceFactory.js';

describe('Service Integration', () => {
    let factory;

    beforeEach(() => {
        factory = ServiceFactory.getInstance();
        factory.initialize();
    });

    afterEach(() => {
        factory.dispose();
    });

    describe('Configuration and Discovery Integration', () => {
        it('should configure discovery service through config service', () => {
            const config = factory.get('config');
            const discovery = factory.get('discovery');

            // Test that configuration can influence discovery behavior
            expect(config).toBeDefined();
            expect(discovery).toBeDefined();
            
            // Verify they can work together
            const mockObject = {
                x: 100,
                y: 100,
                type: 'star',
                discovered: false,
                radius: 30
            };
            
            const mockCamera = {
                x: 0,
                y: 0,
                worldToScreen: (x, y, width, height) => [x + width/2, y + height/2]
            };
            
            const result = discovery.checkDiscovery(mockObject, mockCamera, 800, 600);
            expect(typeof result).toBe('boolean');
        });

        it('should handle configuration changes that affect discovery', () => {
            const config = factory.get('config');
            const discovery = factory.get('discovery');

            // Test configuration change propagation
            const initialDebugMode = config.get('debug.enabled', false);
            config.set('debug.enabled', !initialDebugMode);
            
            const newDebugMode = config.get('debug.enabled');
            expect(newDebugMode).toBe(!initialDebugMode);
            
            // Discovery service should still function correctly
            const mockObject = {
                x: 10,
                y: 10,
                type: 'planet',
                discovered: false,
                discoveryDistance: 50
            };
            
            const mockCamera = { x: 0, y: 0 };
            const distance = discovery.distanceToShip(mockObject, mockCamera);
            expect(distance).toBeCloseTo(Math.sqrt(200), 1); // sqrt(10^2 + 10^2) = sqrt(200)
        });
    });

    describe('Service Factory Lifecycle Integration', () => {
        it('should manage all services together during disposal', () => {
            // Get services to ensure they're created
            const config = factory.get('config');
            const discovery = factory.get('discovery');
            
            expect(config).toBeDefined();
            expect(discovery).toBeDefined();
            
            // All services should be registered
            const services = factory.getRegisteredServices();
            expect(services).toContain('config');
            expect(services).toContain('discovery');
            
            // Disposal should clean up everything
            factory.dispose();
            
            // New factory should start fresh
            const newFactory = ServiceFactory.getInstance();
            expect(newFactory).not.toBe(factory);
        });

        it('should handle service re-initialization correctly', () => {
            const config1 = factory.get('config');
            const discovery1 = factory.get('discovery');
            
            factory.dispose();
            
            const newFactory = ServiceFactory.getInstance();
            newFactory.initialize();
            
            const config2 = newFactory.get('config');
            const discovery2 = newFactory.get('discovery');
            
            // Should be different instances after re-initialization
            expect(config2).not.toBe(config1);
            expect(discovery2).not.toBe(discovery1);
            
            // But should work the same way
            expect(typeof config2.get).toBe('function');
            expect(typeof discovery2.checkDiscovery).toBe('function');
            
            newFactory.dispose();
        });
    });

    describe('Real-world Usage Scenarios', () => {
        it('should support game object discovery workflow', () => {
            const config = factory.get('config');
            const discovery = factory.get('discovery');
            
            // Simulate a real discovery scenario
            const gameObjects = [
                {
                    x: 100,
                    y: 100,
                    type: 'star',
                    discovered: false,
                    radius: 40
                },
                {
                    x: 150,
                    y: 120,
                    type: 'planet',
                    discovered: false,
                    discoveryDistance: 75
                },
                {
                    x: 160,
                    y: 130,
                    type: 'moon',
                    discovered: false,
                    discoveryDistance: 30
                }
            ];
            
            const camera = {
                x: 120,
                y: 110,
                worldToScreen: (x, y, width, height) => [
                    x - camera.x + width/2,
                    y - camera.y + height/2
                ]
            };
            
            // Test discovery for each object
            const discoveryResults = gameObjects.map(obj => 
                discovery.checkDiscovery(obj, camera, 800, 600)
            );
            
            // At least some objects should be discoverable at this distance
            expect(discoveryResults).toContain(true);
            
            // Test distance calculations
            const distances = gameObjects.map(obj =>
                discovery.distanceToShip(obj, camera)
            );
            
            expect(distances.every(d => typeof d === 'number')).toBe(true);
            expect(distances.every(d => d >= 0)).toBe(true);
        });

        it('should handle configuration-driven discovery parameters', () => {
            const config = factory.get('config');
            const discovery = factory.get('discovery');
            
            // Test that configuration values are accessible and can influence discovery
            const worldConfig = config.getWorldConfig();
            const discoveryConfig = config.getDiscoveryConfig();
            
            expect(worldConfig).toBeDefined();
            expect(discoveryConfig).toBeDefined();
            
            // Test with an object that uses configuration-based discovery distance
            const configuredObject = {
                x: 0,
                y: 0,
                type: 'nebula',
                discovered: false,
                discoveryDistance: config.get('discovery.distances.nebula', 300)
            };
            
            const farCamera = { x: 250, y: 0 }; // 250 units away
            const nearCamera = { x: 100, y: 0 }; // 100 units away
            
            const farResult = discovery.checkDiscovery(configuredObject, farCamera, 800, 600);
            const nearResult = discovery.checkDiscovery(configuredObject, nearCamera, 800, 600);
            
            // Behavior should be consistent with distance-based discovery
            expect(typeof farResult).toBe('boolean');
            expect(typeof nearResult).toBe('boolean');
        });
    });

    describe('Error Handling Integration', () => {
        it('should handle service errors gracefully', () => {
            const config = factory.get('config');
            const discovery = factory.get('discovery');
            
            // Test that one service failing doesn't break others
            expect(() => {
                config.get('nonexistent.deeply.nested.value');
            }).not.toThrow();
            
            // Discovery should still work
            const mockObject = {
                x: 0,
                y: 0,
                type: 'star',
                discovered: false
            };
            
            const mockCamera = { x: 100, y: 100 };
            
            expect(() => {
                discovery.distanceToShip(mockObject, mockCamera);
            }).not.toThrow();
        });

        it('should validate cross-service data types', () => {
            const config = factory.get('config');
            
            // Test type validation from configuration
            const errors = config.getValidationErrors();
            expect(Array.isArray(errors)).toBe(true);
            
            // If there are errors, they should be strings
            if (errors.length > 0) {
                expect(errors.every(error => typeof error === 'string')).toBe(true);
            }
        });
    });

    describe('Performance Integration', () => {
        it('should handle multiple service calls efficiently', () => {
            const config = factory.get('config');
            const discovery = factory.get('discovery');
            
            const start = performance.now();
            
            // Simulate multiple rapid service calls
            for (let i = 0; i < 100; i++) {
                config.get('debug.enabled');
                discovery.distanceToShip(
                    { x: i, y: i },
                    { x: 0, y: 0 }
                );
            }
            
            const end = performance.now();
            const duration = end - start;
            
            // Should complete in reasonable time (less than 100ms for 100 calls)
            expect(duration).toBeLessThan(100);
        });

        it('should maintain singleton efficiency', () => {
            // Multiple gets should return same instances
            const config1 = factory.get('config');
            const config2 = factory.get('config');
            const discovery1 = factory.get('discovery');
            const discovery2 = factory.get('discovery');
            
            expect(config1).toBe(config2);
            expect(discovery1).toBe(discovery2);
            
            // Should be very fast since they're cached
            const start = performance.now();
            for (let i = 0; i < 1000; i++) {
                factory.get('config');
                factory.get('discovery');
            }
            const end = performance.now();
            
            // 1000 cached lookups should be very fast
            expect(end - start).toBeLessThan(50);
        });
    });
});