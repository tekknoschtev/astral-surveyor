// DI Container Tests - Test-driven development for dependency injection
// Following TDD principles: Write tests first, then implement

import { describe, it, expect, beforeEach } from 'vitest';
import { DIContainer } from '../../dist/services/DIContainer.js';

describe('DIContainer', () => {
    let container;

    beforeEach(() => {
        container = new DIContainer();
    });

    describe('Service Registration', () => {
        it('should register a simple service', () => {
            const testService = { name: 'test' };
            container.register('testService', testService);
            
            const retrieved = container.get('testService');
            expect(retrieved).toBe(testService);
        });

        it('should register a service factory', () => {
            let counter = 0;
            const factory = () => ({ value: ++counter });
            container.registerFactory('randomService', factory);
            
            const service1 = container.get('randomService');
            const service2 = container.get('randomService');
            
            expect(service1).toHaveProperty('value');
            expect(service2).toHaveProperty('value');
            expect(service1.value).not.toBe(service2.value); // Each call creates new instance
            expect(service1.value).toBe(1);
            expect(service2.value).toBe(2);
        });

        it('should register a singleton service', () => {
            const factory = () => ({ value: Math.random() });
            container.registerSingleton('singletonService', factory);
            
            const service1 = container.get('singletonService');
            const service2 = container.get('singletonService');
            
            expect(service1).toBe(service2); // Same instance
            expect(service1.value).toBe(service2.value);
        });

        it('should throw error when trying to register duplicate service', () => {
            container.register('duplicate', {});
            
            expect(() => {
                container.register('duplicate', {});
            }).toThrow('Service "duplicate" is already registered');
        });
    });

    describe('Service Resolution', () => {
        it('should throw error for unregistered service', () => {
            expect(() => {
                container.get('nonexistent');
            }).toThrow('Service "nonexistent" is not registered');
        });

        it('should resolve services with dependencies', () => {
            // Register dependencies first
            container.register('logger', { log: (msg) => msg });
            container.register('config', { debug: true });
            
            // Register service with dependencies
            container.registerFactory('service', (deps) => ({
                logger: deps.logger,
                config: deps.config,
                process: (data) => deps.logger.log(data)
            }), ['logger', 'config']);
            
            const service = container.get('service');
            expect(service.logger).toBeDefined();
            expect(service.config).toBeDefined();
            expect(service.process('test')).toBe('test');
        });

        it('should detect circular dependencies', () => {
            container.registerFactory('serviceA', (deps) => ({
                b: deps.serviceB
            }), ['serviceB']);
            
            container.registerFactory('serviceB', (deps) => ({
                a: deps.serviceA
            }), ['serviceA']);
            
            expect(() => {
                container.get('serviceA');
            }).toThrow('Circular dependency detected');
        });

        it('should handle deep dependency chains', () => {
            container.register('level1', { value: 1 });
            container.registerFactory('level2', (deps) => ({
                value: deps.level1.value + 1
            }), ['level1']);
            container.registerFactory('level3', (deps) => ({
                value: deps.level2.value + 1
            }), ['level2']);
            
            const service = container.get('level3');
            expect(service.value).toBe(3);
        });
    });

    describe('Service Lifecycle', () => {
        it('should call dispose on services that have it', () => {
            let disposed = false;
            const service = {
                dispose: () => { disposed = true; }
            };
            
            container.register('disposable', service);
            container.dispose();
            
            expect(disposed).toBe(true);
        });

        it('should dispose all registered services', () => {
            let disposedCount = 0;
            const createDisposableService = () => ({
                dispose: () => { disposedCount++; }
            });
            
            container.register('service1', createDisposableService());
            container.register('service2', createDisposableService());
            container.register('service3', { value: 'no dispose method' });
            
            container.dispose();
            expect(disposedCount).toBe(2);
        });

        it('should clear all services after disposal', () => {
            container.register('test', {});
            container.dispose();
            
            expect(() => {
                container.get('test');
            }).toThrow('Service "test" is not registered');
        });
    });

    describe('Service Introspection', () => {
        it('should check if service is registered', () => {
            expect(container.has('nonexistent')).toBe(false);
            
            container.register('exists', {});
            expect(container.has('exists')).toBe(true);
        });

        it('should list all registered service names', () => {
            container.register('service1', {});
            container.register('service2', {});
            container.registerFactory('service3', () => ({}));
            
            const services = container.getRegisteredServices();
            expect(services).toContain('service1');
            expect(services).toContain('service2');
            expect(services).toContain('service3');
            expect(services).toHaveLength(3);
        });
    });

    describe('Type Safety and Validation', () => {
        it('should validate dependency requirements', () => {
            container.registerFactory('service', (deps) => ({
                logger: deps.logger
            }), ['logger']);
            
            // Try to get service without registering its dependency
            expect(() => {
                container.get('service');
            }).toThrow('Service "logger" is not registered');
        });

        it('should handle services with no dependencies', () => {
            container.registerFactory('independent', () => ({
                value: 'standalone'
            }), []); // Explicitly no dependencies
            
            const service = container.get('independent');
            expect(service.value).toBe('standalone');
        });

        it('should handle services with undefined dependencies array', () => {
            container.registerFactory('service', () => ({
                value: 'no deps'
            })); // Dependencies not specified
            
            const service = container.get('service');
            expect(service.value).toBe('no deps');
        });
    });

    describe('Error Handling', () => {
        it('should provide helpful error messages for missing dependencies', () => {
            container.registerFactory('service', (deps) => deps.missing, ['missing']);
            
            expect(() => {
                container.get('service');
            }).toThrow('Service "missing" is not registered (required by "service")');
        });

        it('should handle factory function errors gracefully', () => {
            container.registerFactory('failing', () => {
                throw new Error('Factory failed');
            });
            
            expect(() => {
                container.get('failing');
            }).toThrow('Failed to create service "failing": Factory failed');
        });

        it('should handle dispose errors gracefully', () => {
            const service = {
                dispose: () => { throw new Error('Dispose failed'); }
            };
            
            container.register('problematic', service);
            
            // Should not throw, but should handle errors internally
            expect(() => {
                container.dispose();
            }).not.toThrow();
        });
    });
});