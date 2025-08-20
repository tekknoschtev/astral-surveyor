// ServiceOrchestrator Tests - Test-driven development for event-driven service coordination
// Following Phase 4 clean architecture patterns

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServiceOrchestrator, GameEvents } from '../../dist/services/ServiceOrchestrator.js';

describe('ServiceOrchestrator', () => {
    let orchestrator;
    let mockAudioService;
    let mockWorldService;
    let mockConfigService;

    beforeEach(() => {
        orchestrator = new ServiceOrchestrator();

        // Mock services
        mockAudioService = {
            playStarDiscovery: vi.fn(),
            playPlanetDiscovery: vi.fn(),
            playNebulaDiscovery: vi.fn(),
            playDiscoverySound: vi.fn(),
            reloadConfiguration: vi.fn(),
            setMasterVolume: vi.fn(),
            getMasterVolume: vi.fn(() => 0.8),
            dispose: vi.fn()
        };

        mockWorldService = {
            generateChunk: vi.fn(),
            getChunkObjects: vi.fn(() => []),
            dispose: vi.fn()
        };

        mockConfigService = {
            get: vi.fn((key, defaultValue) => defaultValue),
            set: vi.fn(),
            getAudioConfig: vi.fn(() => ({ enabled: true, volume: { master: 0.8 } }))
        };
    });

    afterEach(() => {
        if (orchestrator) {
            orchestrator.dispose();
        }
    });

    describe('Service Registration', () => {
        it('should register services successfully', () => {
            orchestrator.registerService('audio', mockAudioService);
            orchestrator.registerService('world', mockWorldService);
            orchestrator.registerService('config', mockConfigService);

            expect(orchestrator.getService('audio')).toBe(mockAudioService);
            expect(orchestrator.getService('world')).toBe(mockWorldService);
            expect(orchestrator.getService('config')).toBe(mockConfigService);
        });

        it('should return undefined for unregistered services', () => {
            expect(orchestrator.getService('nonexistent')).toBeUndefined();
        });

        it('should replace existing services when re-registered', () => {
            const firstService = { name: 'first' };
            const secondService = { name: 'second' };

            orchestrator.registerService('test', firstService);
            expect(orchestrator.getService('test')).toBe(firstService);

            orchestrator.registerService('test', secondService);
            expect(orchestrator.getService('test')).toBe(secondService);
        });
    });

    describe('Event Dispatcher Access', () => {
        it('should provide access to event dispatcher', () => {
            const eventDispatcher = orchestrator.getEventDispatcher();
            
            expect(eventDispatcher).toBeDefined();
            expect(typeof eventDispatcher.on).toBe('function');
            expect(typeof eventDispatcher.emit).toBe('function');
            expect(typeof eventDispatcher.off).toBe('function');
        });

        it('should allow external event registration', () => {
            const eventDispatcher = orchestrator.getEventDispatcher();
            const handler = vi.fn();

            eventDispatcher.on('test.event', handler);
            eventDispatcher.emit('test.event', { test: 'data' });

            expect(handler).toHaveBeenCalledWith({ test: 'data' }, expect.any(Object));
        });
    });

    describe('Discovery Event Coordination', () => {
        beforeEach(() => {
            orchestrator.registerService('audio', mockAudioService);
        });

        it('should emit discovery event and trigger audio', () => {
            const discoveryData = {
                objectType: 'star',
                objectId: 'star_100_200',
                position: { x: 100, y: 200 },
                starType: 'G-Type Star',
                isRare: false
            };

            orchestrator.emitDiscovery(discoveryData);

            expect(mockAudioService.playStarDiscovery).toHaveBeenCalledWith('G-Type Star');
        });

        it('should handle planet discoveries', () => {
            const discoveryData = {
                objectType: 'planet',
                objectId: 'planet_100_200',
                position: { x: 100, y: 200 },
                planetType: 'Gas Giant',
                isRare: false
            };

            orchestrator.emitDiscovery(discoveryData);

            expect(mockAudioService.playPlanetDiscovery).toHaveBeenCalledWith('Gas Giant');
        });

        it('should handle nebula discoveries', () => {
            const discoveryData = {
                objectType: 'nebula',
                objectId: 'nebula_100_200',
                position: { x: 100, y: 200 },
                nebulaType: 'emission',
                isRare: true
            };

            orchestrator.emitDiscovery(discoveryData);

            expect(mockAudioService.playNebulaDiscovery).toHaveBeenCalledWith('emission');
        });

        it('should handle moon discoveries with planet sound', () => {
            const discoveryData = {
                objectType: 'moon',
                objectId: 'moon_100_200',
                position: { x: 100, y: 200 },
                isRare: true
            };

            orchestrator.emitDiscovery(discoveryData);

            expect(mockAudioService.playPlanetDiscovery).toHaveBeenCalledWith('Moon');
        });

        it('should handle asteroid discoveries with planet sound', () => {
            const discoveryData = {
                objectType: 'asteroids',
                objectId: 'asteroids_100_200',
                position: { x: 100, y: 200 },
                isRare: false
            };

            orchestrator.emitDiscovery(discoveryData);

            expect(mockAudioService.playPlanetDiscovery).toHaveBeenCalledWith('Asteroid Garden');
        });

        it('should handle wormhole discoveries with special sound', () => {
            const discoveryData = {
                objectType: 'wormhole',
                objectId: 'wormhole_100_200',
                position: { x: 100, y: 200 },
                isRare: true
            };

            orchestrator.emitDiscovery(discoveryData);

            expect(mockAudioService.playDiscoverySound).toHaveBeenCalledWith('wormhole');
        });

        it('should handle black hole discoveries with special sound', () => {
            const discoveryData = {
                objectType: 'blackhole',
                objectId: 'blackhole_100_200',
                position: { x: 100, y: 200 },
                isRare: true
            };

            orchestrator.emitDiscovery(discoveryData);

            expect(mockAudioService.playDiscoverySound).toHaveBeenCalledWith('blackhole');
        });

        it('should emit rare discovery events separately', () => {
            const eventDispatcher = orchestrator.getEventDispatcher();
            const rareHandler = vi.fn();
            eventDispatcher.on(GameEvents.RARE_DISCOVERY, rareHandler);

            const discoveryData = {
                objectType: 'star',
                objectId: 'star_100_200',
                position: { x: 100, y: 200 },
                starType: 'Neutron Star',
                isRare: true
            };

            orchestrator.emitDiscovery(discoveryData);

            expect(rareHandler).toHaveBeenCalledWith(discoveryData, expect.any(Object));
        });

        it('should play additional rare discovery sound for rare objects', async () => {
            const discoveryData = {
                objectType: 'nebula',
                objectId: 'nebula_100_200',
                position: { x: 100, y: 200 },
                nebulaType: 'emission',
                isRare: true
            };

            orchestrator.emitDiscovery(discoveryData);

            // Wait for rare sound to be called after delay
            await new Promise(resolve => setTimeout(resolve, 250));
            
            expect(mockAudioService.playDiscoverySound).toHaveBeenCalledWith('rare');
        });
    });

    describe('Audio Event Coordination', () => {
        beforeEach(() => {
            orchestrator.registerService('audio', mockAudioService);
        });

        it('should handle direct audio events', () => {
            const audioData = {
                soundType: 'M-Type Star',
                objectType: 'star'
            };

            orchestrator.emitAudioEvent(GameEvents.AUDIO_PLAY_STAR_DISCOVERY, audioData);

            expect(mockAudioService.playStarDiscovery).toHaveBeenCalledWith('M-Type Star');
        });

        it('should handle audio volume change events', () => {
            const eventDispatcher = orchestrator.getEventDispatcher();
            
            orchestrator.emitAudioEvent(GameEvents.AUDIO_VOLUME_CHANGED, {
                soundType: 'master',
                volume: 0.5
            });

            // Event should be emitted (services can listen to this)
            expect(eventDispatcher.getListenerCount(GameEvents.AUDIO_VOLUME_CHANGED)).toBe(0);
        });
    });

    describe('Configuration Event Coordination', () => {
        beforeEach(() => {
            orchestrator.registerService('audio', mockAudioService);
        });

        it('should handle configuration changes', () => {
            const configData = {
                key: 'audio.volume.master',
                oldValue: 0.8,
                newValue: 0.6
            };

            orchestrator.emitConfigChange(configData);

            expect(mockAudioService.reloadConfiguration).toHaveBeenCalled();
        });

        it('should only reload audio service for audio config changes', () => {
            const configData = {
                key: 'graphics.quality',
                oldValue: 'high',
                newValue: 'low'
            };

            orchestrator.emitConfigChange(configData);

            expect(mockAudioService.reloadConfiguration).not.toHaveBeenCalled();
        });
    });

    describe('World Event Coordination', () => {
        it('should emit world events', () => {
            const eventDispatcher = orchestrator.getEventDispatcher();
            const handler = vi.fn();
            eventDispatcher.on(GameEvents.WORLD_CHUNK_GENERATED, handler);

            const worldData = {
                chunkCoords: { x: 0, y: 0 },
                objectCount: 15
            };

            orchestrator.emitWorldEvent(GameEvents.WORLD_CHUNK_GENERATED, worldData);

            expect(handler).toHaveBeenCalledWith(worldData, expect.any(Object));
        });
    });

    describe('UI Event Coordination', () => {
        it('should emit notification events', () => {
            const eventDispatcher = orchestrator.getEventDispatcher();
            const handler = vi.fn();
            eventDispatcher.on(GameEvents.UI_NOTIFICATION, handler);

            const notificationData = {
                message: 'Test notification',
                type: 'info',
                duration: 3000
            };

            orchestrator.emitNotification(notificationData);

            expect(handler).toHaveBeenCalledWith(notificationData, expect.any(Object));
        });
    });

    describe('Service Auto-Wiring', () => {
        it('should auto-wire audio service to configuration events', () => {
            orchestrator.registerService('audio', mockAudioService);

            const configData = {
                key: 'audio.volume.effects',
                oldValue: 0.6,
                newValue: 0.8
            };

            orchestrator.emitConfigChange(configData);

            expect(mockAudioService.reloadConfiguration).toHaveBeenCalled();
        });

        it('should not auto-wire non-audio services to audio config events', () => {
            orchestrator.registerService('world', mockWorldService);

            const configData = {
                key: 'audio.volume.master',
                oldValue: 0.8,
                newValue: 0.6
            };

            orchestrator.emitConfigChange(configData);

            // World service should not be affected by audio config changes
            expect(mockWorldService.generateChunk).not.toHaveBeenCalled();
        });
    });

    describe('Event Type Constants', () => {
        it('should provide game event constants', () => {
            expect(GameEvents.OBJECT_DISCOVERED).toBe('object.discovered');
            expect(GameEvents.RARE_DISCOVERY).toBe('object.discovered.rare');
            expect(GameEvents.AUDIO_PLAY_DISCOVERY).toBe('audio.play.discovery');
            expect(GameEvents.AUDIO_PLAY_STAR_DISCOVERY).toBe('audio.play.star.discovery');
            expect(GameEvents.WORLD_CHUNK_GENERATED).toBe('world.chunk.generated');
            expect(GameEvents.CONFIG_CHANGED).toBe('config.changed');
            expect(GameEvents.UI_NOTIFICATION).toBe('ui.notification');
        });
    });

    describe('Lifecycle Management', () => {
        it('should dispose properly', () => {
            orchestrator.registerService('audio', mockAudioService);
            
            expect(() => {
                orchestrator.dispose();
            }).not.toThrow();
        });

        it('should throw when used after disposal', () => {
            orchestrator.dispose();

            expect(() => {
                orchestrator.registerService('test', {});
            }).toThrow('ServiceOrchestrator has been disposed');
        });

        it('should handle multiple dispose calls gracefully', () => {
            orchestrator.dispose();

            expect(() => {
                orchestrator.dispose();
            }).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        it('should handle missing audio service gracefully', () => {
            // Don't register audio service
            const discoveryData = {
                objectType: 'star',
                objectId: 'star_100_200',
                position: { x: 100, y: 200 },
                starType: 'G-Type Star',
                isRare: false
            };

            expect(() => {
                orchestrator.emitDiscovery(discoveryData);
            }).not.toThrow();
        });

        it('should handle audio service errors gracefully', () => {
            mockAudioService.playStarDiscovery.mockImplementation(() => {
                throw new Error('Audio error');
            });

            orchestrator.registerService('audio', mockAudioService);

            const discoveryData = {
                objectType: 'star',
                objectId: 'star_100_200',
                position: { x: 100, y: 200 },
                starType: 'G-Type Star',
                isRare: false
            };

            expect(() => {
                orchestrator.emitDiscovery(discoveryData);
            }).not.toThrow();
        });
    });

    describe('Singleton Pattern', () => {
        it('should provide singleton access', async () => {
            // Import the singleton functions
            const { getServiceOrchestrator, resetServiceOrchestrator } = await import('../../dist/services/ServiceOrchestrator.js');
            
            const instance1 = getServiceOrchestrator();
            const instance2 = getServiceOrchestrator();
            
            expect(instance1).toBe(instance2);
            
            // Clean up
            resetServiceOrchestrator();
        });

        it('should reset singleton instance', async () => {
            const { getServiceOrchestrator, resetServiceOrchestrator } = await import('../../dist/services/ServiceOrchestrator.js');
            
            const instance1 = getServiceOrchestrator();
            resetServiceOrchestrator();
            const instance2 = getServiceOrchestrator();
            
            expect(instance1).not.toBe(instance2);
            
            // Clean up
            resetServiceOrchestrator();
        });
    });
});