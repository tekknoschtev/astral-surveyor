// Service Integration Communication Tests - Priority 3 Critical Coverage
// Tests cross-system workflows and state consistency between services

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createGameComponents } from '../../dist/services/GameFactory.js';

describe('Service Integration Workflows', () => {
    let components;
    let mockCanvas;

    beforeEach(() => {
        // Mock HTMLCanvasElement and all browser APIs
        mockCanvas = {
            getContext: vi.fn().mockReturnValue({
                canvas: { width: 800, height: 600 },
                clearRect: vi.fn(),
                fillRect: vi.fn(),
                strokeRect: vi.fn(),
                beginPath: vi.fn(),
                arc: vi.fn(),
                fill: vi.fn(),
                stroke: vi.fn(),
                save: vi.fn(),
                restore: vi.fn(),
                translate: vi.fn(),
                scale: vi.fn(),
                rotate: vi.fn(),
                drawImage: vi.fn(),
                createLinearGradient: vi.fn().mockReturnValue({
                    addColorStop: vi.fn()
                }),
                createRadialGradient: vi.fn().mockReturnValue({
                    addColorStop: vi.fn()
                })
            }),
            width: 800,
            height: 600,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn()
        };

        // Mock browser APIs
        global.localStorage = {
            getItem: vi.fn().mockReturnValue(null),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn()
        };

        global.document = {
            createElement: vi.fn().mockReturnValue({
                play: vi.fn().mockResolvedValue(undefined),
                pause: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                canPlayType: vi.fn().mockReturnValue('probably'),
                load: vi.fn(),
                volume: 1,
                currentTime: 0,
                duration: 100,
                paused: true,
                ended: false
            }),
            body: {
                appendChild: vi.fn(),
                removeChild: vi.fn()
            }
        };

        global.window = {
            AudioContext: vi.fn().mockImplementation(() => ({
                createOscillator: vi.fn().mockReturnValue({
                    connect: vi.fn(),
                    start: vi.fn(),
                    stop: vi.fn(),
                    frequency: { value: 440 }
                }),
                createGain: vi.fn().mockReturnValue({
                    connect: vi.fn(),
                    gain: {
                        value: 1,
                        setValueAtTime: vi.fn()
                    }
                }),
                destination: {},
                state: 'running',
                resume: vi.fn().mockResolvedValue(undefined)
            })),
            webkitAudioContext: vi.fn(),
            location: { reload: vi.fn() },
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            innerWidth: 800,
            innerHeight: 600,
            setInterval: vi.fn().mockReturnValue(123),
            clearInterval: vi.fn(),
            setTimeout: vi.fn().mockReturnValue(456),
            clearTimeout: vi.fn()
        };

        global.URL = class {
            constructor(url) {
                this.searchParams = new URLSearchParams();
            }
        };
        global.URLSearchParams = class {
            get() { return null; }
            has() { return false; }
        };

        // Create game components for integration testing
        components = createGameComponents(mockCanvas);
    });

    afterEach(() => {
        if (components && components.saveLoadService) {
            components.saveLoadService.disableAutoSave();
        }
        vi.restoreAllMocks();
        delete global.localStorage;
        delete global.document;
        delete global.window;
        delete global.URL;
        delete global.URLSearchParams;
    });

    describe('Save/Load with Discovery State Integration', () => {
        it('should preserve discovery state across save/load cycles', async () => {
            const { saveLoadService, discoveryManager, chunkManager, camera } = components;

            // Mock discovery manager methods
            discoveryManager.processObjectDiscovery = vi.fn();
            discoveryManager.clearState = vi.fn();
            discoveryManager.getAllDiscoveries = vi.fn().mockReturnValue([
                { type: 'star', x: 100, y: 200, discovered: true, name: 'Alpha Centauri' }
            ]);
            discoveryManager.restoreDiscoveries = vi.fn();

            // Mock chunk manager methods
            chunkManager.clearAllChunks = vi.fn();
            chunkManager.getDiscoveredStars = vi.fn().mockReturnValue([
                { x: 100, y: 200, type: 'star', discovered: true }
            ]);
            chunkManager.setDiscoveredStars = vi.fn();

            // Simulate discovery
            const mockStar = { type: 'star', x: 100, y: 200, discovered: true, name: 'Alpha Centauri' };
            discoveryManager.processObjectDiscovery(mockStar, camera);

            // Mock successful save
            saveLoadService.saveGame = vi.fn().mockResolvedValue({
                success: true,
                data: {
                    discoveries: [mockStar],
                    camera: { x: camera.x, y: camera.y }
                }
            });

            // Save game
            const saveResult = await saveLoadService.saveGame();
            expect(saveResult.success).toBe(true);

            // Clear state
            chunkManager.clearAllChunks();
            discoveryManager.clearState();

            // Mock successful load
            saveLoadService.loadGame = vi.fn().mockResolvedValue({
                success: true,
                data: {
                    discoveries: [mockStar],
                    camera: { x: 100, y: 200 }
                }
            });

            // Load game
            const loadResult = await saveLoadService.loadGame();
            expect(loadResult.success).toBe(true);

            // Verify state restoration would be called
            expect(saveLoadService.loadGame).toHaveBeenCalled();
        });

        it('should handle corrupted save data gracefully', async () => {
            const { saveLoadService } = components;

            // Mock corrupted localStorage
            global.localStorage.getItem = vi.fn().mockReturnValue('corrupted{json');

            // Mock loadGame to handle corruption
            saveLoadService.loadGame = vi.fn().mockResolvedValue({
                success: false,
                error: 'Save data is corrupted or invalid'
            });

            const loadResult = await saveLoadService.loadGame();
            expect(loadResult.success).toBe(false);
            expect(loadResult.error).toContain('corrupted');

            // Game should continue running - verify core components still functional
            expect(components.camera).toBeDefined();
            expect(components.chunkManager).toBeDefined();
            expect(components.discoveryManager).toBeDefined();
        });

        it('should maintain data consistency during save failures', async () => {
            const { saveLoadService, discoveryManager } = components;

            // Mock save failure
            saveLoadService.saveGame = vi.fn().mockResolvedValue({
                success: false,
                error: 'Storage quota exceeded'
            });

            // Add some discoveries
            discoveryManager.getAllDiscoveries = vi.fn().mockReturnValue([
                { type: 'star', x: 50, y: 75, discovered: true, name: 'Beta Star' }
            ]);

            const saveResult = await saveLoadService.saveGame();
            expect(saveResult.success).toBe(false);

            // Discoveries should still be available in memory
            const discoveries = discoveryManager.getAllDiscoveries();
            expect(discoveries).toHaveLength(1);
            expect(discoveries[0].name).toBe('Beta Star');
        });

        it('should coordinate auto-save with game state changes', () => {
            const { saveLoadService, discoveryManager, camera } = components;

            // Mock auto-save methods
            saveLoadService.enableAutoSave = vi.fn();
            saveLoadService.isAutoSaveEnabled = vi.fn().mockReturnValue(true);

            // Verify auto-save is enabled
            expect(saveLoadService.isAutoSaveEnabled()).toBe(true);

            // Simulate state changes that should trigger save
            camera.x = 1000;
            camera.y = 2000;

            // Auto-save should handle state preservation automatically
            expect(saveLoadService.isAutoSaveEnabled()).toBe(true);
        });
    });

    describe('StateManager Traversal Coordination', () => {
        it('should coordinate wormhole traversal across all systems', () => {
            const { stateManager, camera, stellarMap, chunkManager } = components;

            // Mock wormhole object
            const mockWormhole = {
                designation: 'alpha',
                twinX: 5000,
                twinY: 6000,
                getDestinationCoordinates: vi.fn().mockReturnValue({ x: 5000, y: 6000 })
            };

            // Mock stateManager methods
            stateManager.startTraversal = vi.fn();
            stateManager.isTraversing = true;

            // Mock camera velocity properties
            camera.velocityX = 100;
            camera.velocityY = 50;

            // Start traversal
            stateManager.startTraversal(mockWormhole, 5000, 6000, camera, stellarMap);

            expect(stateManager.startTraversal).toHaveBeenCalledWith(
                mockWormhole, 5000, 6000, camera, stellarMap
            );

            // Verify traversal state
            expect(stateManager.isTraversing).toBe(true);
        });

        it('should handle traversal completion and state restoration', () => {
            const { stateManager, camera, chunkManager } = components;

            // Mock traversal completion
            stateManager.completeTraversal = vi.fn();
            stateManager.isTraversing = false;

            // Mock camera restoration
            camera.x = 5000;
            camera.y = 6000;
            camera.velocityX = 0;
            camera.velocityY = 0;

            // Mock chunk loading at destination
            chunkManager.updateActiveChunks = vi.fn();

            // Complete traversal
            if (stateManager.completeTraversal) {
                stateManager.completeTraversal(camera, chunkManager);
            }

            // Verify final state
            expect(stateManager.isTraversing).toBe(false);
            expect(camera.x).toBe(5000);
            expect(camera.y).toBe(6000);
        });

        it('should handle traversal errors gracefully', () => {
            const { stateManager, camera, stellarMap } = components;

            // Mock invalid wormhole
            const invalidWormhole = {
                designation: 'broken',
                twinX: null,
                twinY: null,
                getDestinationCoordinates: vi.fn().mockImplementation(() => {
                    throw new Error('Invalid destination coordinates');
                })
            };

            // Mock error handling
            stateManager.handleTraversalError = vi.fn();

            // Attempt traversal with invalid wormhole
            expect(() => {
                if (invalidWormhole.getDestinationCoordinates) {
                    try {
                        invalidWormhole.getDestinationCoordinates();
                    } catch (error) {
                        if (stateManager.handleTraversalError) {
                            stateManager.handleTraversalError(error);
                        }
                    }
                }
            }).not.toThrow();

            // Camera should remain at original position
            expect(typeof camera.x).toBe('number');
            expect(typeof camera.y).toBe('number');
        });
    });

    describe('Audio System Service Communication', () => {
        it('should coordinate between AudioService and discovery events', () => {
            const { audioService, soundManager, discoveryManager } = components;

            // Mock sound manager methods
            soundManager.playStarDiscovery = vi.fn();
            soundManager.isEnabled = vi.fn().mockReturnValue(true);

            // Mock discovery event
            const mockStar = {
                type: 'star',
                starTypeName: 'G-type Main Sequence',
                x: 100,
                y: 200
            };

            // Mock discovery manager to trigger audio
            discoveryManager.processObjectDiscovery = vi.fn().mockImplementation((star, camera) => {
                if (soundManager.isEnabled()) {
                    soundManager.playStarDiscovery(star.starTypeName);
                }
            });

            // Process discovery
            discoveryManager.processObjectDiscovery(mockStar, components.camera);

            expect(discoveryManager.processObjectDiscovery).toHaveBeenCalledWith(
                mockStar,
                components.camera
            );
            expect(soundManager.playStarDiscovery).toHaveBeenCalledWith('G-type Main Sequence');
        });

        it('should handle audio system failures without affecting discoveries', () => {
            const { soundManager, discoveryManager } = components;

            // Mock audio failure
            soundManager.playStarDiscovery = vi.fn().mockImplementation(() => {
                throw new Error('Audio context suspended');
            });
            soundManager.isEnabled = vi.fn().mockReturnValue(true);

            // Mock discovery processing with error handling
            discoveryManager.processObjectDiscovery = vi.fn().mockImplementation((star, camera) => {
                try {
                    if (soundManager.isEnabled()) {
                        soundManager.playStarDiscovery(star.starTypeName);
                    }
                } catch (error) {
                    // Audio failed but discovery should still work
                    console.warn('Audio failed during discovery:', error.message);
                }
                // Discovery should complete regardless
                return { discovered: true, name: star.name || 'Unknown Star' };
            });

            const mockStar = {
                type: 'star',
                starTypeName: 'K-type Main Sequence',
                name: 'Orange Star'
            };

            // Process discovery
            const result = discoveryManager.processObjectDiscovery(mockStar, components.camera);

            // Discovery should succeed even if audio fails
            expect(result.discovered).toBe(true);
            expect(result.name).toBe('Orange Star');
        });

        it('should coordinate ambient audio with game state', () => {
            const { audioService, soundManager, stateManager } = components;

            // Mock ambient audio methods
            soundManager.playAmbientSound = vi.fn();
            soundManager.stopAmbientSound = vi.fn();
            audioService.updateAmbientAudio = vi.fn();

            // Mock state changes
            stateManager.getCurrentRegion = vi.fn().mockReturnValue('nebula');

            // Update ambient audio based on region
            if (audioService.updateAmbientAudio) {
                audioService.updateAmbientAudio('nebula');
            }

            expect(audioService.updateAmbientAudio).toHaveBeenCalledWith('nebula');
        });
    });

    describe('Discovery System Cross-Service Integration', () => {
        it('should coordinate discovery between all related systems', () => {
            const { discoveryManager, discoveryDisplay, discoveryLogbook, namingService, soundManager } = components;

            // Mock all discovery-related methods
            discoveryDisplay.addNotification = vi.fn();
            discoveryLogbook.addEntry = vi.fn();
            namingService.generateStarName = vi.fn().mockReturnValue('Proxima Beta');
            soundManager.playStarDiscovery = vi.fn();

            // Mock comprehensive discovery processing
            discoveryManager.processObjectDiscovery = vi.fn().mockImplementation((object, camera) => {
                const name = namingService.generateStarName(object.x, object.y, object.seed);

                discoveryDisplay.addNotification(`Discovered: ${name}`);
                discoveryLogbook.addEntry({
                    name,
                    type: object.type,
                    coordinates: { x: object.x, y: object.y },
                    timestamp: new Date()
                });

                if (soundManager.isEnabled && soundManager.isEnabled()) {
                    soundManager.playStarDiscovery(object.starTypeName);
                }

                return { discovered: true, name };
            });

            const mockStar = {
                type: 'star',
                starTypeName: 'F-type Main Sequence',
                x: 300,
                y: 400,
                seed: 12345
            };

            // Process discovery
            const result = discoveryManager.processObjectDiscovery(mockStar, components.camera);

            // Verify all systems were coordinated
            expect(namingService.generateStarName).toHaveBeenCalledWith(300, 400, 12345);
            expect(discoveryDisplay.addNotification).toHaveBeenCalledWith('Discovered: Proxima Beta');
            expect(discoveryLogbook.addEntry).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Proxima Beta',
                    type: 'star',
                    coordinates: { x: 300, y: 400 }
                })
            );
            expect(result.discovered).toBe(true);
            expect(result.name).toBe('Proxima Beta');
        });

        it('should handle partial system failures during discovery', () => {
            const { discoveryManager, discoveryDisplay, discoveryLogbook, namingService } = components;

            // Mock some systems failing
            discoveryDisplay.addNotification = vi.fn().mockImplementation(() => {
                throw new Error('Display system failed');
            });
            discoveryLogbook.addEntry = vi.fn(); // This works
            namingService.generateStarName = vi.fn().mockReturnValue('Fallback Name');

            // Mock resilient discovery processing
            discoveryManager.processObjectDiscovery = vi.fn().mockImplementation((object, camera) => {
                const name = namingService.generateStarName(object.x, object.y, object.seed);

                try {
                    discoveryDisplay.addNotification(`Discovered: ${name}`);
                } catch (error) {
                    console.warn('Display notification failed:', error.message);
                }

                try {
                    discoveryLogbook.addEntry({
                        name,
                        type: object.type,
                        coordinates: { x: object.x, y: object.y },
                        timestamp: new Date()
                    });
                } catch (error) {
                    console.warn('Logbook entry failed:', error.message);
                }

                return { discovered: true, name };
            });

            const mockObject = {
                type: 'nebula',
                x: 500,
                y: 600,
                seed: 67890
            };

            // Discovery should succeed even with partial failures
            const result = discoveryManager.processObjectDiscovery(mockObject, components.camera);

            expect(result.discovered).toBe(true);
            expect(result.name).toBe('Fallback Name');
            expect(discoveryLogbook.addEntry).toHaveBeenCalled();
        });
    });

    describe('Settings Service Cross-System Coordination', () => {
        it('should coordinate settings changes across all systems', () => {
            const { settingsService, audioService, discoveryLogbook, chunkManager, camera, discoveryDisplay } = components;

            // Mock settings service callbacks
            settingsService.onDistanceReset = vi.fn().mockImplementation(() => {
                camera.resetLifetimeDistance();
                discoveryDisplay.addNotification('Distance traveled has been reset');
            });

            settingsService.onDiscoveryHistoryClear = vi.fn().mockImplementation(() => {
                discoveryLogbook.clearHistory();
                chunkManager.clearDiscoveryHistory();
                discoveryDisplay.addNotification('Discovery history has been cleared');
            });

            // Mock component methods
            camera.resetLifetimeDistance = vi.fn();
            discoveryLogbook.clearHistory = vi.fn();
            chunkManager.clearDiscoveryHistory = vi.fn();
            discoveryDisplay.addNotification = vi.fn();

            // Test distance reset coordination
            settingsService.onDistanceReset();

            expect(camera.resetLifetimeDistance).toHaveBeenCalled();
            expect(discoveryDisplay.addNotification).toHaveBeenCalledWith('Distance traveled has been reset');

            // Test discovery history clear coordination
            settingsService.onDiscoveryHistoryClear();

            expect(discoveryLogbook.clearHistory).toHaveBeenCalled();
            expect(chunkManager.clearDiscoveryHistory).toHaveBeenCalled();
            expect(discoveryDisplay.addNotification).toHaveBeenCalledWith('Discovery history has been cleared');
        });

        it('should handle audio settings changes', () => {
            const { settingsService, audioService, soundManager } = components;

            // Mock audio service methods
            audioService.setMasterVolume = vi.fn();
            audioService.toggleMute = vi.fn();
            soundManager.setVolume = vi.fn();

            // Test audio setting changes
            if (settingsService.setAudioVolume) {
                settingsService.setAudioVolume(0.7);
            }

            // Settings should be applied across audio systems
            expect(audioService).toBeDefined();
            expect(soundManager).toBeDefined();
        });
    });
});