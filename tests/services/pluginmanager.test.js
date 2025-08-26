// PluginManager basic test coverage
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginManager } from '../../dist/services/PluginManager.js';

describe('PluginManager', () => {
    let pluginManager;
    let mockDependencies;
    let mockPlugin;

    beforeEach(() => {
        mockDependencies = {
            celestialFactory: {
                registerType: vi.fn()
            },
            discoveryService: {
                addDiscoveryType: vi.fn()
            },
            audioService: {
                registerSoundscape: vi.fn()
            }
        };

        mockPlugin = {
            id: 'test-plugin',
            name: 'Test Plugin',
            version: '1.0.0',
            type: 'celestial',
            description: 'A test plugin',
            author: 'Test Author',
            register: vi.fn(),
            unregister: vi.fn()
        };

        pluginManager = new PluginManager(mockDependencies);
    });

    describe('Initialization', () => {
        it('should initialize with required dependencies', () => {
            expect(pluginManager).toBeDefined();
            expect(pluginManager.celestialFactory).toBe(mockDependencies.celestialFactory);
            expect(pluginManager.discoveryService).toBe(mockDependencies.discoveryService);
            expect(pluginManager.audioService).toBe(mockDependencies.audioService);
        });

        it('should throw error if celestialFactory is missing', () => {
            expect(() => {
                new PluginManager({
                    discoveryService: mockDependencies.discoveryService,
                    audioService: mockDependencies.audioService
                });
            }).toThrow('CelestialFactory is required for plugin system');
        });

        it('should throw error if discoveryService is missing', () => {
            expect(() => {
                new PluginManager({
                    celestialFactory: mockDependencies.celestialFactory,
                    audioService: mockDependencies.audioService
                });
            }).toThrow('DiscoveryService is required for plugin system');
        });

        it('should throw error if audioService is missing', () => {
            expect(() => {
                new PluginManager({
                    celestialFactory: mockDependencies.celestialFactory,
                    discoveryService: mockDependencies.discoveryService
                });
            }).toThrow('AudioService is required for plugin system');
        });
    });

    describe('Plugin Registration', () => {
        it('should register a valid plugin', () => {
            pluginManager.registerPlugin(mockPlugin);
            
            expect(mockPlugin.register).toHaveBeenCalled();
            expect(pluginManager.plugins.has('test-plugin')).toBe(true);
        });

        it('should provide API to registered plugins', () => {
            pluginManager.registerPlugin(mockPlugin);
            
            const expectedAPI = {
                celestialFactory: mockDependencies.celestialFactory,
                discoveryService: mockDependencies.discoveryService,
                audioService: mockDependencies.audioService
            };
            
            expect(mockPlugin.register).toHaveBeenCalledWith(expectedAPI);
        });

        it('should throw error for duplicate plugin IDs', () => {
            pluginManager.registerPlugin(mockPlugin);
            
            expect(() => {
                pluginManager.registerPlugin(mockPlugin);
            }).toThrow('Plugin with ID "test-plugin" is already registered');
        });

        it('should handle plugin registration errors', () => {
            mockPlugin.register.mockImplementation(() => {
                throw new Error('Registration failed');
            });
            
            expect(() => {
                pluginManager.registerPlugin(mockPlugin);
            }).toThrow('Failed to register plugin "test-plugin": Registration failed');
        });
    });

    describe('Plugin Unregistration', () => {
        beforeEach(() => {
            pluginManager.registerPlugin(mockPlugin);
        });

        it('should unregister a plugin', () => {
            pluginManager.unregisterPlugin('test-plugin');
            
            expect(mockPlugin.unregister).toHaveBeenCalled();
            expect(pluginManager.plugins.has('test-plugin')).toBe(false);
        });

        it('should throw error for unregistered plugin ID', () => {
            expect(() => {
                pluginManager.unregisterPlugin('non-existent-plugin');
            }).toThrow('Plugin with ID "non-existent-plugin" is not registered');
        });
    });

    describe('Plugin Management', () => {
        beforeEach(() => {
            pluginManager.registerPlugin(mockPlugin);
        });

        it('should check if plugin exists', () => {
            const hasPlugin = pluginManager.plugins.has('test-plugin');
            expect(hasPlugin).toBe(true);
        });

        it('should get plugin info', () => {
            const pluginInfo = pluginManager.getPluginInfo('test-plugin');
            
            expect(pluginInfo).toBeDefined();
            expect(pluginInfo.id).toBe('test-plugin');
            expect(pluginInfo.name).toBe('Test Plugin');
            expect(pluginInfo.status).toBe('active');
        });

        it('should list registered plugins', () => {
            const plugins = pluginManager.getRegisteredPlugins();
            
            expect(Array.isArray(plugins)).toBe(true);
            expect(plugins.length).toBe(1);
            expect(plugins[0]).toBe('test-plugin');
        });
    });

    describe('Plugin Validation', () => {
        it('should validate plugin structure', () => {
            const invalidPlugin = {
                // Missing required fields
                name: 'Invalid Plugin'
            };
            
            expect(() => {
                pluginManager.registerPlugin(invalidPlugin);
            }).toThrow();
        });

        it('should validate plugin methods', () => {
            const invalidPlugin = {
                id: 'invalid-plugin',
                name: 'Invalid Plugin',
                version: '1.0.0',
                type: 'celestial',
                // Missing register method
            };
            
            expect(() => {
                pluginManager.registerPlugin(invalidPlugin);
            }).toThrow();
        });
    });

    describe('Disposal', () => {
        it('should dispose plugin manager', () => {
            pluginManager.registerPlugin(mockPlugin);
            
            pluginManager.dispose();
            
            expect(pluginManager.disposed).toBe(true);
            expect(mockPlugin.unregister).toHaveBeenCalled();
        });

        it('should prevent operations after disposal', () => {
            pluginManager.dispose();
            
            expect(() => {
                pluginManager.registerPlugin(mockPlugin);
            }).toThrow();
        });
    });
});