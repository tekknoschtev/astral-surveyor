// Plugin System Tests - Test-driven development for extensible architecture
// Following Phase 5 future-proofing patterns

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PluginManager } from '../../dist/services/PluginManager.js';

describe('PluginManager', () => {
    let pluginManager;
    let mockCelestialFactory;
    let mockDiscoveryService;
    let mockAudioService;

    beforeEach(() => {
        // Mock dependencies
        mockCelestialFactory = {
            registerType: vi.fn(),
            unregisterType: vi.fn(),
            getRegisteredTypes: vi.fn(() => ['star', 'planet', 'moon'])
        };

        mockDiscoveryService = {
            addDiscoveryType: vi.fn(),
            removeDiscoveryType: vi.fn(),
            getDiscoveryTypes: vi.fn(() => ['star', 'planet', 'nebula'])
        };

        mockAudioService = {
            addSoundscape: vi.fn(),
            removeSoundscape: vi.fn(),
            getSoundscapes: vi.fn(() => ['space', 'nebula'])
        };

        pluginManager = new PluginManager({
            celestialFactory: mockCelestialFactory,
            discoveryService: mockDiscoveryService,
            audioService: mockAudioService
        });
    });

    afterEach(() => {
        if (pluginManager && typeof pluginManager.dispose === 'function') {
            pluginManager.dispose();
        }
        vi.restoreAllMocks();
    });

    describe('Initialization', () => {
        it('should initialize with proper dependencies', () => {
            expect(pluginManager).toBeDefined();
            expect(pluginManager.celestialFactory).toBe(mockCelestialFactory);
            expect(pluginManager.discoveryService).toBe(mockDiscoveryService);
            expect(pluginManager.audioService).toBe(mockAudioService);
        });

        it('should handle missing dependencies gracefully', () => {
            expect(() => {
                new PluginManager({});
            }).toThrow('CelestialFactory is required for plugin system');
        });

        it('should initialize with empty plugin registry', () => {
            expect(pluginManager.getRegisteredPlugins()).toEqual([]);
            expect(pluginManager.getPluginCount()).toBe(0);
        });
    });

    describe('Plugin Registration', () => {
        it('should register celestial object plugins', () => {
            const quasarPlugin = {
                id: 'quasar-plugin',
                name: 'Quasar Objects',
                version: '1.0.0',
                type: 'celestial',
                register: vi.fn(),
                unregister: vi.fn()
            };

            pluginManager.registerPlugin(quasarPlugin);

            expect(pluginManager.getRegisteredPlugins()).toContain(quasarPlugin.id);
            expect(quasarPlugin.register).toHaveBeenCalledWith({
                celestialFactory: mockCelestialFactory,
                discoveryService: mockDiscoveryService,
                audioService: mockAudioService
            });
        });

        it('should register discovery plugins', () => {
            const artifactPlugin = {
                id: 'artifact-plugin',
                name: 'Ancient Artifacts',
                version: '1.0.0',
                type: 'discovery',
                register: vi.fn(),
                unregister: vi.fn()
            };

            pluginManager.registerPlugin(artifactPlugin);

            expect(pluginManager.getRegisteredPlugins()).toContain(artifactPlugin.id);
            expect(artifactPlugin.register).toHaveBeenCalled();
        });

        it('should register audio plugins', () => {
            const soundscapePlugin = {
                id: 'soundscape-plugin',
                name: 'Cosmic Soundscapes',
                version: '1.0.0',
                type: 'audio',
                register: vi.fn(),
                unregister: vi.fn()
            };

            pluginManager.registerPlugin(soundscapePlugin);

            expect(pluginManager.getRegisteredPlugins()).toContain(soundscapePlugin.id);
            expect(soundscapePlugin.register).toHaveBeenCalled();
        });

        it('should prevent duplicate plugin registration', () => {
            const plugin = {
                id: 'test-plugin',
                name: 'Test Plugin',
                version: '1.0.0',
                type: 'celestial',
                register: vi.fn(),
                unregister: vi.fn()
            };

            pluginManager.registerPlugin(plugin);
            
            expect(() => {
                pluginManager.registerPlugin(plugin);
            }).toThrow('Plugin with ID "test-plugin" is already registered');
        });

        it('should validate plugin structure', () => {
            const invalidPlugin = {
                name: 'Invalid Plugin'
                // Missing required fields: id, version, type, register, unregister
            };

            expect(() => {
                pluginManager.registerPlugin(invalidPlugin);
            }).toThrow('Plugin must have required fields: id, name, version, type, register, unregister');
        });
    });

    describe('Plugin Management', () => {
        let testPlugin;

        beforeEach(() => {
            testPlugin = {
                id: 'test-plugin',
                name: 'Test Plugin',
                version: '1.0.0',
                type: 'celestial',
                register: vi.fn(),
                unregister: vi.fn()
            };
            pluginManager.registerPlugin(testPlugin);
        });

        it('should unregister plugins correctly', () => {
            pluginManager.unregisterPlugin('test-plugin');

            expect(pluginManager.getRegisteredPlugins()).not.toContain('test-plugin');
            expect(testPlugin.unregister).toHaveBeenCalled();
        });

        it('should handle unregistering non-existent plugins', () => {
            expect(() => {
                pluginManager.unregisterPlugin('non-existent-plugin');
            }).toThrow('Plugin with ID "non-existent-plugin" is not registered');
        });

        it('should get plugin information', () => {
            const pluginInfo = pluginManager.getPluginInfo('test-plugin');

            expect(pluginInfo).toEqual({
                id: 'test-plugin',
                name: 'Test Plugin',
                version: '1.0.0',
                type: 'celestial',
                status: 'active',
                description: undefined,
                author: undefined,
                registeredAt: expect.any(Date)
            });
        });

        it('should enable and disable plugins', () => {
            pluginManager.disablePlugin('test-plugin');
            expect(pluginManager.getPluginInfo('test-plugin').status).toBe('disabled');

            pluginManager.enablePlugin('test-plugin');
            expect(pluginManager.getPluginInfo('test-plugin').status).toBe('active');
        });

        it('should list plugins by type', () => {
            const celestialPlugin = {
                id: 'celestial-plugin',
                name: 'Celestial Plugin',
                version: '1.0.0',
                type: 'celestial',
                register: vi.fn(),
                unregister: vi.fn()
            };

            const audioPlugin = {
                id: 'audio-plugin',
                name: 'Audio Plugin',
                version: '1.0.0',
                type: 'audio',
                register: vi.fn(),
                unregister: vi.fn()
            };

            pluginManager.registerPlugin(celestialPlugin);
            pluginManager.registerPlugin(audioPlugin);

            const celestialPlugins = pluginManager.getPluginsByType('celestial');
            expect(celestialPlugins).toHaveLength(2); // test-plugin + celestial-plugin
            expect(celestialPlugins.map(p => p.id)).toContain('celestial-plugin');

            const audioPlugins = pluginManager.getPluginsByType('audio');
            expect(audioPlugins).toHaveLength(1);
            expect(audioPlugins[0].id).toBe('audio-plugin');
        });
    });

    describe('Plugin Lifecycle', () => {
        it('should handle plugin initialization errors gracefully', () => {
            const faultyPlugin = {
                id: 'faulty-plugin',
                name: 'Faulty Plugin',
                version: '1.0.0',
                type: 'celestial',
                register: vi.fn(() => {
                    throw new Error('Plugin initialization failed');
                }),
                unregister: vi.fn()
            };

            expect(() => {
                pluginManager.registerPlugin(faultyPlugin);
            }).toThrow('Failed to register plugin "faulty-plugin": Plugin initialization failed');
        });

        it('should handle plugin cleanup errors gracefully', () => {
            const faultyPlugin = {
                id: 'faulty-cleanup-plugin',
                name: 'Faulty Cleanup Plugin',
                version: '1.0.0',
                type: 'celestial',
                register: vi.fn(),
                unregister: vi.fn(() => {
                    throw new Error('Plugin cleanup failed');
                })
            };

            pluginManager.registerPlugin(faultyPlugin);

            // Should not throw, but should log the error
            console.warn = vi.fn();
            pluginManager.unregisterPlugin('faulty-cleanup-plugin');
            
            expect(console.warn).toHaveBeenCalledWith(
                'Error during plugin unregistration for "faulty-cleanup-plugin":',
                expect.any(Error)
            );
        });

        it('should dispose all plugins on manager disposal', () => {
            const plugin1 = {
                id: 'plugin-1',
                name: 'Plugin 1',
                version: '1.0.0',
                type: 'celestial',
                register: vi.fn(),
                unregister: vi.fn()
            };

            const plugin2 = {
                id: 'plugin-2',
                name: 'Plugin 2',
                version: '1.0.0',
                type: 'audio',
                register: vi.fn(),
                unregister: vi.fn()
            };

            pluginManager.registerPlugin(plugin1);
            pluginManager.registerPlugin(plugin2);

            expect(pluginManager.getPluginCount()).toBe(2);
            
            pluginManager.dispose();

            expect(plugin1.unregister).toHaveBeenCalled();
            expect(plugin2.unregister).toHaveBeenCalled();
        });
    });

    describe('Plugin API Integration', () => {
        it('should allow plugins to register new celestial object types', () => {
            const quasarPlugin = {
                id: 'quasar-plugin',
                name: 'Quasar Plugin',
                version: '1.0.0',
                type: 'celestial',
                register: ({ celestialFactory }) => {
                    celestialFactory.registerType('quasar', {
                        create: (x, y, seed) => ({ type: 'quasar', x, y, seed }),
                        rarity: 0.001
                    });
                },
                unregister: ({ celestialFactory }) => {
                    celestialFactory.unregisterType('quasar');
                }
            };

            pluginManager.registerPlugin(quasarPlugin);

            expect(mockCelestialFactory.registerType).toHaveBeenCalledWith('quasar', {
                create: expect.any(Function),
                rarity: 0.001
            });
        });

        it('should allow plugins to add discovery types', () => {
            const artifactPlugin = {
                id: 'artifact-plugin',
                name: 'Artifact Plugin',
                version: '1.0.0',
                type: 'discovery',
                register: ({ discoveryService }) => {
                    discoveryService.addDiscoveryType('artifact', {
                        triggerCondition: (object) => object.age > 1000000,
                        loreText: 'Ancient structures...'
                    });
                },
                unregister: ({ discoveryService }) => {
                    discoveryService.removeDiscoveryType('artifact');
                }
            };

            pluginManager.registerPlugin(artifactPlugin);

            expect(mockDiscoveryService.addDiscoveryType).toHaveBeenCalledWith('artifact', {
                triggerCondition: expect.any(Function),
                loreText: 'Ancient structures...'
            });
        });

        it('should allow plugins to add audio content', () => {
            const soundscapePlugin = {
                id: 'soundscape-plugin',
                name: 'Soundscape Plugin',
                version: '1.0.0',
                type: 'audio',
                register: ({ audioService }) => {
                    audioService.addSoundscape('cosmic-meditation', {
                        tracks: ['deep-space-hum.mp3'],
                        triggerZones: ['nebula']
                    });
                },
                unregister: ({ audioService }) => {
                    audioService.removeSoundscape('cosmic-meditation');
                }
            };

            pluginManager.registerPlugin(soundscapePlugin);

            expect(mockAudioService.addSoundscape).toHaveBeenCalledWith('cosmic-meditation', {
                tracks: ['deep-space-hum.mp3'],
                triggerZones: ['nebula']
            });
        });
    });

    describe('Error Handling and Recovery', () => {
        it('should isolate plugin errors from core system', () => {
            const stablePlugin = {
                id: 'stable-plugin',
                name: 'Stable Plugin',
                version: '1.0.0',
                type: 'celestial',
                register: vi.fn(),
                unregister: vi.fn()
            };

            const unstablePlugin = {
                id: 'unstable-plugin',
                name: 'Unstable Plugin',
                version: '1.0.0',
                type: 'celestial',
                register: vi.fn(() => {
                    throw new Error('Plugin crashed');
                }),
                unregister: vi.fn()
            };

            // Register stable plugin first
            pluginManager.registerPlugin(stablePlugin);
            expect(pluginManager.getRegisteredPlugins()).toContain('stable-plugin');

            // Unstable plugin should fail without affecting stable plugin
            expect(() => {
                pluginManager.registerPlugin(unstablePlugin);
            }).toThrow();

            // Stable plugin should still be registered
            expect(pluginManager.getRegisteredPlugins()).toContain('stable-plugin');
            expect(pluginManager.getRegisteredPlugins()).not.toContain('unstable-plugin');
        });

        it('should provide plugin status monitoring', () => {
            const plugin = {
                id: 'monitored-plugin',
                name: 'Monitored Plugin',
                version: '1.0.0',
                type: 'celestial',
                register: vi.fn(),
                unregister: vi.fn()
            };

            pluginManager.registerPlugin(plugin);

            const status = pluginManager.getSystemStatus();
            expect(status).toEqual({
                totalPlugins: 1,
                activePlugins: 1,
                disabledPlugins: 0,
                erroredPlugins: 0,
                pluginTypes: {
                    celestial: 1,
                    discovery: 0,
                    audio: 0,
                    visual: 0,
                    gameplay: 0,
                    data: 0
                }
            });
        });
    });
});