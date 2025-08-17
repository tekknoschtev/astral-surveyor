// Example Plugin Tests - Demonstrating plugin system functionality
// Testing a real plugin implementation

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PluginManager } from '../../dist/services/PluginManager.js';

// Example Quasar Plugin Implementation
class QuasarPlugin {
    constructor() {
        this.id = 'quasar-plugin';
        this.name = 'Quasar Objects';
        this.version = '1.0.0';
        this.type = 'celestial';
        this.description = 'Adds rare quasar objects to the universe';
        this.author = 'Astral Surveyor Team';
    }

    register({ celestialFactory, discoveryService, audioService }) {
        // Register quasar celestial object type
        celestialFactory.registerType('quasar', {
            create: (x, y, seed) => {
                return {
                    type: 'quasar',
                    x,
                    y,
                    seed,
                    luminosity: 1000000,
                    spectralClass: 'Q',
                    redshift: Math.random() * 3,
                    render: vi.fn(),
                    discovered: false,
                    uniqueId: `quasar-${x}-${y}-${seed}`
                };
            },
            rarity: 0.0001, // Extremely rare
            discoveryPoints: 5000
        });

        // Register quasar discovery type
        discoveryService.addDiscoveryType('quasar', {
            triggerCondition: (object) => object.type === 'quasar',
            loreText: 'A brilliant quasar blazes across the cosmic void, its light traveling billions of years to reach you.',
            audioEffect: 'quasar-discovery.mp3',
            specialEffect: 'intense-brightness'
        });

        // Register cosmic soundscape for quasar regions
        audioService.addSoundscape('quasar-region', {
            tracks: ['high-energy-cosmic.mp3', 'distant-roar.mp3'],
            triggerZones: ['quasar'],
            fadeDuration: 5000,
            volume: 0.3
        });
    }

    unregister({ celestialFactory, discoveryService, audioService }) {
        celestialFactory.unregisterType('quasar');
        discoveryService.removeDiscoveryType('quasar');
        audioService.removeSoundscape('quasar-region');
    }
}

// Example Ancient Artifact Discovery Plugin
class ArtifactPlugin {
    constructor() {
        this.id = 'artifact-plugin';
        this.name = 'Ancient Artifacts';
        this.version = '1.2.0';
        this.type = 'discovery';
        this.description = 'Discover mysterious ancient structures';
        this.author = 'Community Contributor';
    }

    register({ discoveryService, audioService }) {
        discoveryService.addDiscoveryType('artifact', {
            triggerCondition: (object) => {
                // Rare chance for any old object to have artifacts
                return object.age && object.age > 1000000 && Math.random() < 0.01;
            },
            loreText: 'Ancient structures of unknown origin dot this celestial body. What civilization could have built these?',
            audioEffect: 'mystery-chime.mp3',
            unlocksCodes: ['ancient-language-primer'],
            specialEffect: 'archaeological-highlight'
        });

        audioService.addSoundscape('artifact-site', {
            tracks: ['ancient-whispers.mp3', 'ethereal-hum.mp3'],
            triggerZones: ['artifact'],
            fadeDuration: 3000,
            volume: 0.2,
            loop: true
        });
    }

    unregister({ discoveryService, audioService }) {
        discoveryService.removeDiscoveryType('artifact');
        audioService.removeSoundscape('artifact-site');
    }
}

describe('Example Plugin Implementation', () => {
    let pluginManager;
    let mockCelestialFactory;
    let mockDiscoveryService;
    let mockAudioService;

    beforeEach(() => {
        // Mock dependencies
        mockCelestialFactory = {
            registerType: vi.fn(),
            unregisterType: vi.fn(),
            getRegisteredTypes: vi.fn(() => ['star', 'planet', 'moon']),
            create: vi.fn()
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

    describe('Quasar Plugin', () => {
        it('should register quasar plugin successfully', () => {
            const quasarPlugin = new QuasarPlugin();
            
            pluginManager.registerPlugin(quasarPlugin);

            expect(pluginManager.getRegisteredPlugins()).toContain('quasar-plugin');
            
            const pluginInfo = pluginManager.getPluginInfo('quasar-plugin');
            expect(pluginInfo.name).toBe('Quasar Objects');
            expect(pluginInfo.type).toBe('celestial');
            expect(pluginInfo.status).toBe('active');
        });

        it('should register quasar celestial object type', () => {
            const quasarPlugin = new QuasarPlugin();
            
            pluginManager.registerPlugin(quasarPlugin);

            expect(mockCelestialFactory.registerType).toHaveBeenCalledWith('quasar', {
                create: expect.any(Function),
                rarity: 0.0001,
                discoveryPoints: 5000
            });
        });

        it('should create quasar objects correctly', () => {
            const quasarPlugin = new QuasarPlugin();
            pluginManager.registerPlugin(quasarPlugin);

            // Get the registered factory function
            const registerCall = mockCelestialFactory.registerType.mock.calls.find(
                call => call[0] === 'quasar'
            );
            const quasarConfig = registerCall[1];
            
            const quasar = quasarConfig.create(1000, 2000, 12345);

            expect(quasar).toEqual({
                type: 'quasar',
                x: 1000,
                y: 2000,
                seed: 12345,
                luminosity: 1000000,
                spectralClass: 'Q',
                redshift: expect.any(Number),
                render: expect.any(Function),
                discovered: false,
                uniqueId: 'quasar-1000-2000-12345'
            });
        });

        it('should register quasar discovery type', () => {
            const quasarPlugin = new QuasarPlugin();
            
            pluginManager.registerPlugin(quasarPlugin);

            expect(mockDiscoveryService.addDiscoveryType).toHaveBeenCalledWith('quasar', {
                triggerCondition: expect.any(Function),
                loreText: expect.stringContaining('brilliant quasar'),
                audioEffect: 'quasar-discovery.mp3',
                specialEffect: 'intense-brightness'
            });
        });

        it('should register quasar soundscape', () => {
            const quasarPlugin = new QuasarPlugin();
            
            pluginManager.registerPlugin(quasarPlugin);

            expect(mockAudioService.addSoundscape).toHaveBeenCalledWith('quasar-region', {
                tracks: ['high-energy-cosmic.mp3', 'distant-roar.mp3'],
                triggerZones: ['quasar'],
                fadeDuration: 5000,
                volume: 0.3
            });
        });

        it('should unregister quasar plugin correctly', () => {
            const quasarPlugin = new QuasarPlugin();
            
            pluginManager.registerPlugin(quasarPlugin);
            pluginManager.unregisterPlugin('quasar-plugin');

            expect(mockCelestialFactory.unregisterType).toHaveBeenCalledWith('quasar');
            expect(mockDiscoveryService.removeDiscoveryType).toHaveBeenCalledWith('quasar');
            expect(mockAudioService.removeSoundscape).toHaveBeenCalledWith('quasar-region');
            
            expect(pluginManager.getRegisteredPlugins()).not.toContain('quasar-plugin');
        });
    });

    describe('Artifact Plugin', () => {
        it('should register artifact plugin successfully', () => {
            const artifactPlugin = new ArtifactPlugin();
            
            pluginManager.registerPlugin(artifactPlugin);

            expect(pluginManager.getRegisteredPlugins()).toContain('artifact-plugin');
            
            const pluginInfo = pluginManager.getPluginInfo('artifact-plugin');
            expect(pluginInfo.name).toBe('Ancient Artifacts');
            expect(pluginInfo.type).toBe('discovery');
            expect(pluginInfo.author).toBe('Community Contributor');
        });

        it('should register artifact discovery type with conditions', () => {
            const artifactPlugin = new ArtifactPlugin();
            
            pluginManager.registerPlugin(artifactPlugin);

            const discoveryCall = mockDiscoveryService.addDiscoveryType.mock.calls.find(
                call => call[0] === 'artifact'
            );
            const artifactConfig = discoveryCall[1];

            // Test the trigger condition
            const oldObject = { age: 2000000 };
            const youngObject = { age: 100000 };
            
            // Should have a chance to trigger for old objects
            expect(typeof artifactConfig.triggerCondition(oldObject)).toBe('boolean');
            expect(artifactConfig.triggerCondition(youngObject)).toBe(false);
        });

        it('should include lore and unlock codes', () => {
            const artifactPlugin = new ArtifactPlugin();
            
            pluginManager.registerPlugin(artifactPlugin);

            expect(mockDiscoveryService.addDiscoveryType).toHaveBeenCalledWith('artifact', {
                triggerCondition: expect.any(Function),
                loreText: expect.stringContaining('Ancient structures'),
                audioEffect: 'mystery-chime.mp3',
                unlocksCodes: ['ancient-language-primer'],
                specialEffect: 'archaeological-highlight'
            });
        });
    });

    describe('Multiple Plugin Management', () => {
        it('should handle multiple plugins simultaneously', () => {
            const quasarPlugin = new QuasarPlugin();
            const artifactPlugin = new ArtifactPlugin();
            
            pluginManager.registerPlugin(quasarPlugin);
            pluginManager.registerPlugin(artifactPlugin);

            expect(pluginManager.getPluginCount()).toBe(2);
            
            const celestialPlugins = pluginManager.getPluginsByType('celestial');
            const discoveryPlugins = pluginManager.getPluginsByType('discovery');
            
            expect(celestialPlugins).toHaveLength(1);
            expect(discoveryPlugins).toHaveLength(1);
            
            expect(celestialPlugins[0].id).toBe('quasar-plugin');
            expect(discoveryPlugins[0].id).toBe('artifact-plugin');
        });

        it('should maintain plugin isolation', () => {
            const quasarPlugin = new QuasarPlugin();
            const artifactPlugin = new ArtifactPlugin();
            
            pluginManager.registerPlugin(quasarPlugin);
            pluginManager.registerPlugin(artifactPlugin);

            // Unregister one plugin
            pluginManager.unregisterPlugin('quasar-plugin');

            // Other plugin should remain unaffected
            expect(pluginManager.getRegisteredPlugins()).toContain('artifact-plugin');
            expect(pluginManager.getRegisteredPlugins()).not.toContain('quasar-plugin');
            expect(pluginManager.getPluginCount()).toBe(1);
        });

        it('should provide comprehensive system status', () => {
            const quasarPlugin = new QuasarPlugin();
            const artifactPlugin = new ArtifactPlugin();
            
            pluginManager.registerPlugin(quasarPlugin);
            pluginManager.registerPlugin(artifactPlugin);

            const status = pluginManager.getSystemStatus();
            
            expect(status).toEqual({
                totalPlugins: 2,
                activePlugins: 2,
                disabledPlugins: 0,
                erroredPlugins: 0,
                pluginTypes: {
                    celestial: 1,
                    discovery: 1,
                    audio: 0,
                    visual: 0,
                    gameplay: 0,
                    data: 0
                }
            });
        });
    });
});