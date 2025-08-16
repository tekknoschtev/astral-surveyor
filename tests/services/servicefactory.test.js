// ServiceFactory Tests - Test-driven development for service management
// Tests the central service factory and dependency injection

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ServiceFactory } from '../../dist/services/ServiceFactory.js';

describe('ServiceFactory', () => {
    let factory;

    beforeEach(() => {
        factory = ServiceFactory.getInstance();
    });

    afterEach(() => {
        // Clean up between tests
        factory.dispose();
    });

    describe('Singleton Pattern', () => {
        it('should return the same instance on multiple calls', () => {
            const factory1 = ServiceFactory.getInstance();
            const factory2 = ServiceFactory.getInstance();
            
            expect(factory1).toBe(factory2);
        });

        it('should create new instance after dispose', () => {
            const factory1 = ServiceFactory.getInstance();
            factory1.dispose();
            
            const factory2 = ServiceFactory.getInstance();
            expect(factory2).not.toBe(factory1);
        });
    });

    describe('Initialization', () => {
        it('should require initialization before getting services', () => {
            expect(() => {
                factory.get('config');
            }).toThrow('ServiceFactory must be initialized before getting services');
        });

        it('should not throw when getting services after initialization', () => {
            factory.initialize();
            
            expect(() => {
                factory.get('config');
            }).not.toThrow();
        });

        it('should be safe to initialize multiple times', () => {
            factory.initialize();
            factory.initialize();
            
            const config1 = factory.get('config');
            const config2 = factory.get('config');
            
            expect(config1).toBe(config2); // Should be the same singleton instance
        });
    });

    describe('Core Service Registration', () => {
        beforeEach(() => {
            factory.initialize();
        });

        it('should register config service', () => {
            expect(factory.has('config')).toBe(true);
            
            const config = factory.get('config');
            expect(config).toBeDefined();
            expect(typeof config.get).toBe('function');
            expect(typeof config.set).toBe('function');
        });

        it('should register discovery service', () => {
            expect(factory.has('discovery')).toBe(true);
            
            const discovery = factory.get('discovery');
            expect(discovery).toBeDefined();
            expect(typeof discovery.checkDiscovery).toBe('function');
            expect(typeof discovery.distanceToShip).toBe('function');
        });

        it('should return singleton instances', () => {
            const config1 = factory.get('config');
            const config2 = factory.get('config');
            
            expect(config1).toBe(config2);
            
            const discovery1 = factory.get('discovery');
            const discovery2 = factory.get('discovery');
            
            expect(discovery1).toBe(discovery2);
        });
    });

    describe('Custom Service Registration', () => {
        beforeEach(() => {
            factory.initialize();
        });

        it('should allow registration of custom services', () => {
            const customService = { name: 'custom', value: 42 };
            
            factory.registerService('custom', () => customService);
            
            expect(factory.has('custom')).toBe(true);
            expect(factory.get('custom')).toBe(customService);
        });

        it('should support custom services with dependencies', () => {
            factory.registerService('dependent', (deps) => ({
                config: deps.config,
                hasConfig: !!deps.config
            }), ['config']);
            
            const service = factory.get('dependent');
            expect(service.hasConfig).toBe(true);
            expect(service.config).toBeDefined();
        });

        it('should validate dependencies for custom services', () => {
            factory.registerService('invalid', (deps) => ({
                missing: deps.nonexistent
            }), ['nonexistent']);
            
            expect(() => {
                factory.get('invalid');
            }).toThrow('Service "nonexistent" is not registered');
        });
    });

    describe('Service Introspection', () => {
        beforeEach(() => {
            factory.initialize();
        });

        it('should list all registered services', () => {
            const services = factory.getRegisteredServices();
            
            expect(services).toContain('config');
            expect(services).toContain('discovery');
            expect(services.length).toBeGreaterThanOrEqual(2);
        });

        it('should include custom services in listing', () => {
            factory.registerService('test', () => ({}));
            
            const services = factory.getRegisteredServices();
            expect(services).toContain('test');
        });
    });

    describe('Lifecycle Management', () => {
        it('should dispose all services on dispose', () => {
            factory.initialize();
            
            // Get services to ensure they're created
            factory.get('config');
            factory.get('discovery');
            
            factory.dispose();
            
            // Should require re-initialization
            expect(() => {
                factory.get('config');
            }).toThrow('ServiceFactory must be initialized before getting services');
        });

        it('should handle services with dispose methods', () => {
            factory.initialize();
            
            let disposed = false;
            factory.registerService('disposable', () => ({
                dispose: () => { disposed = true; }
            }));
            
            factory.get('disposable'); // Create the service
            factory.dispose();
            
            expect(disposed).toBe(true);
        });
    });

    describe('Error Handling', () => {
        beforeEach(() => {
            factory.initialize();
        });

        it('should throw meaningful errors for unregistered services', () => {
            expect(() => {
                factory.get('nonexistent');
            }).toThrow('Service "nonexistent" is not registered');
        });

        it('should handle service creation errors', () => {
            factory.registerService('failing', () => {
                throw new Error('Service creation failed');
            });
            
            expect(() => {
                factory.get('failing');
            }).toThrow('Failed to create service "failing": Service creation failed');
        });
    });

    describe('Configuration Integration', () => {
        beforeEach(() => {
            factory.initialize();
        });

        it('should load configuration from environment on initialization', () => {
            const config = factory.get('config');
            
            // The config service should have loaded environment settings
            expect(typeof config.loadFromEnvironment).toBe('function');
            
            // Should have default configuration values
            expect(config.get('debug.enabled')).toBeDefined();
        });
    });
});