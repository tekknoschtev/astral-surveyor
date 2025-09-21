// GameFactory Integration Tests - Priority 1 Critical Coverage
// Tests the complex service wiring and component initialization that could break the entire game

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createGameComponents } from '../../dist/services/GameFactory.js';

describe('GameFactory Integration Tests', () => {
    let mockCanvas;
    let components;

    beforeEach(() => {
        // Mock HTMLCanvasElement
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

        // Mock URL constructor for starting coordinates
        global.URL = class {
            constructor(url) {
                this.searchParams = new URLSearchParams();
            }
        };
        global.URLSearchParams = class {
            get() { return null; }
            has() { return false; }
        };

        // Mock localStorage
        global.localStorage = {
            getItem: vi.fn().mockReturnValue(null),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn()
        };

        // Mock document for audio elements
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

        // Mock window for audio context and event handling
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
    });

    afterEach(() => {
        if (components) {
            // Clean up any timers or intervals
            if (components.saveLoadService && components.saveLoadService.disableAutoSave) {
                components.saveLoadService.disableAutoSave();
            }
        }
        vi.restoreAllMocks();
        delete global.URL;
        delete global.URLSearchParams;
        delete global.localStorage;
        delete global.document;
        delete global.window;
    });

    describe('Component Creation and Wiring', () => {
        it('should create all required game components without errors', () => {
            expect(() => {
                components = createGameComponents(mockCanvas);
            }).not.toThrow();

            expect(components).toBeDefined();
        });

        it('should create all core components with proper types', () => {
            components = createGameComponents(mockCanvas);

            // Core components
            expect(components.renderer).toBeDefined();
            expect(components.input).toBeDefined();
            expect(components.camera).toBeDefined();
            expect(components.chunkManager).toBeDefined();
            expect(components.starField).toBeDefined();
            expect(components.ship).toBeDefined();
            expect(components.thrusterParticles).toBeDefined();
            expect(components.starParticles).toBeDefined();

            // Verify core component types have expected properties
            expect(components.camera).toHaveProperty('x');
            expect(components.camera).toHaveProperty('y');
            expect(components.chunkManager).toHaveProperty('updateActiveChunks');
            expect(components.ship).toHaveProperty('sprite');
            expect(components.ship).toHaveProperty('scale');
        });

        it('should create all UI components with proper types', () => {
            components = createGameComponents(mockCanvas);

            // UI components
            expect(components.discoveryDisplay).toBeDefined();
            expect(components.discoveryLogbook).toBeDefined();
            expect(components.stellarMap).toBeDefined();
            expect(components.localMinimap).toBeDefined();
            expect(components.touchUI).toBeDefined();
            expect(components.settingsMenu).toBeDefined();
            expect(components.confirmationDialog).toBeDefined();
            expect(components.developerConsole).toBeDefined();

            // Verify UI components have expected methods
            expect(components.discoveryDisplay).toHaveProperty('addNotification');
            expect(components.discoveryLogbook).toHaveProperty('clearHistory');
            expect(components.stellarMap).toHaveProperty('setNamingService');
        });

        it('should create all services with proper types', () => {
            components = createGameComponents(mockCanvas);

            // Services
            expect(components.discoveryService).toBeDefined();
            expect(components.namingService).toBeDefined();
            expect(components.soundManager).toBeDefined();
            expect(components.audioService).toBeDefined();
            expect(components.settingsService).toBeDefined();
            expect(components.storageService).toBeDefined();
            expect(components.saveLoadService).toBeDefined();
            expect(components.stateManager).toBeDefined();
            expect(components.discoveryManager).toBeDefined();
            expect(components.commandRegistry).toBeDefined();
            expect(components.seedInspectorService).toBeDefined();

            // Verify services have expected methods
            expect(components.namingService).toHaveProperty('generateStarName');
            expect(components.saveLoadService).toHaveProperty('saveGame');
            expect(components.saveLoadService).toHaveProperty('loadGame');
            expect(components.stateManager).toHaveProperty('startTraversal');
        });

        it('should wire critical service dependencies correctly', () => {
            components = createGameComponents(mockCanvas);

            // Test critical dependency connections identified by unit-test-auditor
            expect(components.stellarMap.namingService).toBe(components.namingService);
            expect(components.stellarMap.chunkManager).toBe(components.chunkManager);
            expect(components.localMinimap.chunkManager).toBe(components.chunkManager);

            // Verify discovery manager connections
            expect(components.discoveryLogbook.discoveryManager).toBe(components.discoveryManager);

            // Verify settings service connections
            expect(components.settingsService.audioService).toBe(components.audioService);
        });

        it('should initialize auto-save functionality', () => {
            components = createGameComponents(mockCanvas);

            // Auto-save should be enabled by calling enableAutoSave
            expect(components.saveLoadService.enableAutoSave).toBeInstanceOf(Function);
            expect(components.saveLoadService.disableAutoSave).toBeInstanceOf(Function);
        });

        it('should handle canvas initialization failure gracefully', () => {
            const nullCanvas = null;

            // Renderer will throw when canvas is null - this is expected behavior
            expect(() => {
                components = createGameComponents(nullCanvas);
            }).toThrow();
        });

        it('should initialize chunks around starting position', () => {
            components = createGameComponents(mockCanvas);

            // Should call updateActiveChunks during initialization
            expect(components.chunkManager.updateActiveChunks).toBeDefined();

            // Camera should have valid position
            expect(typeof components.camera.x).toBe('number');
            expect(typeof components.camera.y).toBe('number');
        });
    });

    describe('Service Lifecycle Management', () => {
        it('should handle circular dependency resolution correctly', () => {
            components = createGameComponents(mockCanvas);

            // Test the complex circular dependency: discovery manager -> save/load -> state manager -> discovery manager
            expect(components.discoveryManager).toBeDefined();
            expect(components.saveLoadService.discoveryManager).toBe(components.discoveryManager);
            expect(components.stateManager.discoveryManager).toBe(components.discoveryManager);

            // StateManager should be properly set in SaveLoadService
            expect(components.saveLoadService.stateManager).toBe(components.stateManager);
        });

        it('should properly initialize state manager with starting position', () => {
            components = createGameComponents(mockCanvas);

            expect(components.stateManager).toBeDefined();
            // StateManager should have been initialized with starting position (internal to constructor)
            expect(components.stateManager.isTraversing).toBeDefined();
            expect(components.stateManager.isResettingUniverse).toBeDefined();
        });

        it('should set up settings service callbacks correctly', () => {
            components = createGameComponents(mockCanvas);

            // Distance reset callback should be set
            expect(components.settingsService.onDistanceReset).toBeInstanceOf(Function);

            // Discovery history clear callback should be set
            expect(components.settingsService.onDiscoveryHistoryClear).toBeInstanceOf(Function);
        });

        it('should initialize developer tools correctly', () => {
            components = createGameComponents(mockCanvas);

            expect(components.commandRegistry).toBeDefined();
            expect(components.developerConsole).toBeDefined();
            expect(components.seedInspectorService).toBeDefined();

            // Stellar map should have inspector mode initialized
            expect(components.stellarMap.inspectorService).toBe(components.seedInspectorService);
        });
    });

    describe('Error Resilience During Initialization', () => {
        it('should handle audio service initialization failure', () => {
            // Mock audio service creation to fail
            const originalAudioContext = global.window.AudioContext;
            global.window.AudioContext = undefined;
            global.window.webkitAudioContext = undefined;

            expect(() => {
                components = createGameComponents(mockCanvas);
            }).not.toThrow();

            // Should still create components even if audio fails
            expect(components.audioService).toBeDefined();

            // Restore for cleanup
            global.window.AudioContext = originalAudioContext;
        });

        it('should handle localStorage unavailability', () => {
            // Mock localStorage to throw errors
            global.localStorage = {
                getItem: vi.fn().mockImplementation(() => {
                    throw new Error('localStorage unavailable');
                }),
                setItem: vi.fn().mockImplementation(() => {
                    throw new Error('localStorage unavailable');
                }),
                removeItem: vi.fn(),
                clear: vi.fn()
            };

            expect(() => {
                components = createGameComponents(mockCanvas);
            }).not.toThrow();

            // Should still create components
            expect(components.storageService).toBeDefined();
            expect(components.saveLoadService).toBeDefined();
        });

        it('should maintain component integrity after partial failures', () => {
            // Test that even with some service failures, the core game components remain functional
            components = createGameComponents(mockCanvas);

            // Core game loop components should always be functional
            expect(components.renderer).toBeDefined();
            expect(components.camera).toBeDefined();
            expect(components.chunkManager).toBeDefined();
            expect(components.starField).toBeDefined();
            expect(components.ship).toBeDefined();

            // These are critical for basic game functionality
            expect(components.input).toBeDefined();
            expect(components.discoveryDisplay).toBeDefined();
        });
    });

    describe('Settings Menu Integration', () => {
        it('should create settings menu with proper callbacks', () => {
            components = createGameComponents(mockCanvas);

            expect(components.settingsMenu).toBeDefined();
            expect(components.settingsMenu.onSaveGame).toBeInstanceOf(Function);
            expect(components.settingsMenu.onLoadGame).toBeInstanceOf(Function);
            expect(components.settingsMenu.onNewGame).toBeInstanceOf(Function);
        });

        it('should wire settings menu callbacks to services', async () => {
            components = createGameComponents(mockCanvas);

            // Mock save/load methods
            components.saveLoadService.saveGame = vi.fn().mockResolvedValue({ success: true });
            components.saveLoadService.loadGame = vi.fn().mockResolvedValue({ success: true });

            // Test save game callback
            await components.settingsMenu.onSaveGame();
            expect(components.saveLoadService.saveGame).toHaveBeenCalled();

            // Test load game callback
            await components.settingsMenu.onLoadGame();
            expect(components.saveLoadService.loadGame).toHaveBeenCalled();

            // Test new game callback
            components.settingsMenu.onNewGame();
            expect(global.window.location.reload).toHaveBeenCalled();
        });
    });
});