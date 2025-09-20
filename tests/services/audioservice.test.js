// AudioService Tests - Updated for simplified interface
// Following complexity elimination and clean architecture patterns

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioService } from '../../dist/services/AudioService.js';

describe('AudioService', () => {
    let audioService;
    let mockConfigService;
    let mockSoundManager;

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Mock localStorage
        const localStorageMock = {
            getItem: vi.fn(() => null),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn()
        };
        Object.defineProperty(global, 'localStorage', {
            value: localStorageMock,
            writable: true
        });

        // Mock ConfigService - simplified
        mockConfigService = {
            get: vi.fn((key, defaultValue) => defaultValue),
            getAudioConfig: vi.fn(() => null)
        };

        // Mock SoundManager - simplified interface
        mockSoundManager = {
            isInitialized: vi.fn(() => true),
            isMuted: vi.fn(() => false),
            toggleMute: vi.fn(() => false),
            playStarDiscovery: vi.fn(),
            playPlanetDiscovery: vi.fn(),
            playNebulaDiscovery: vi.fn(),
            playCrystalGardenDiscovery: vi.fn(),
            setVolume: vi.fn(),
            startSpaceDrone: vi.fn(),
            stopSpaceDrone: vi.fn(),
            isSpaceDronePlaying: vi.fn(() => false)
        };

        audioService = new AudioService(mockConfigService, mockSoundManager);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Basic Initialization', () => {
        it('should initialize with proper dependencies', () => {
            expect(audioService).toBeDefined();
        });

        it('should load default settings', () => {
            expect(audioService.getVolume()).toBe(0.8);
            expect(audioService.isMuted()).toBe(false);
        });
    });

    describe('Volume Management', () => {
        it('should manage volume', () => {
            audioService.setVolume(0.5);
            expect(audioService.getVolume()).toBe(0.5);
        });

        it('should manage master volume through compatibility methods', () => {
            audioService.setMasterVolume(0.7);
            expect(audioService.getVolume()).toBe(0.7);
        });

        it('should manage effects volume through compatibility methods', () => {
            audioService.setEffectsVolume(0.6);
            expect(audioService.getVolume()).toBe(0.6);
        });

        it('should manage ambient volume through compatibility methods', () => {
            audioService.setAmbientVolume(0.3);
            expect(audioService.getVolume()).toBe(0.3);
        });

        it('should validate volume ranges', () => {
            // Valid range should work
            audioService.setVolume(0.5);
            expect(audioService.getVolume()).toBe(0.5);

            // Invalid ranges should be ignored (simplified behavior)
            audioService.setVolume(1.5);
            expect(audioService.getVolume()).toBe(0.5); // Should remain unchanged

            audioService.setVolume(-0.1);
            expect(audioService.getVolume()).toBe(0.5); // Should remain unchanged
        });
    });

    describe('Mute Management', () => {
        it('should manage mute state', () => {
            audioService.setMuted(true);
            expect(audioService.isMuted()).toBe(true);

            audioService.setMuted(false);
            expect(audioService.isMuted()).toBe(false);
        });

        it('should toggle mute', () => {
            mockSoundManager.toggleMute.mockReturnValue(true);
            const result = audioService.toggleMute();
            expect(result).toBe(true);
            expect(mockSoundManager.toggleMute).toHaveBeenCalled();
        });

        it('should provide compatibility mute methods', () => {
            audioService.setMasterMuted(true);
            expect(audioService.isMuted()).toBe(true);

            audioService.setAmbientMuted(false);
            expect(audioService.isMuted()).toBe(false);

            audioService.setDiscoveryMuted(true);
            expect(audioService.isMuted()).toBe(true);
        });
    });

    describe('Discovery Sound Effects', () => {
        it('should play discovery sounds through generic method', () => {
            audioService.playDiscoverySound('G-Type Star');
            expect(mockSoundManager.playStarDiscovery).toHaveBeenCalledWith('G-Type Star');

            audioService.playDiscoverySound('Gas Giant Planet');
            expect(mockSoundManager.playPlanetDiscovery).toHaveBeenCalledWith('Gas Giant Planet');

            audioService.playDiscoverySound('emission nebula');
            expect(mockSoundManager.playNebulaDiscovery).toHaveBeenCalledWith('emission nebula');

            audioService.playDiscoverySound('crystal-garden');
            expect(mockSoundManager.playCrystalGardenDiscovery).toHaveBeenCalledWith('pure');
        });

        it('should not play sounds when muted', () => {
            audioService.setMuted(true);
            audioService.playDiscoverySound('M-Type Star');
            expect(mockSoundManager.playStarDiscovery).not.toHaveBeenCalled();
        });

        it('should not play sounds when sound manager not initialized', () => {
            mockSoundManager.isInitialized.mockReturnValue(false);
            audioService.playDiscoverySound('G-Type Star');
            expect(mockSoundManager.playStarDiscovery).not.toHaveBeenCalled();
        });
    });

    describe('Space Drone Audio Management', () => {
        it('should start space drone', () => {
            audioService.startSpaceDrone('deep-space');
            expect(mockSoundManager.startSpaceDrone).toHaveBeenCalledWith('deep-space');
        });

        it('should stop space drone', () => {
            audioService.stopSpaceDrone();
            expect(mockSoundManager.stopSpaceDrone).toHaveBeenCalled();
        });

        it('should check if space drone is playing', () => {
            mockSoundManager.isSpaceDronePlaying.mockReturnValue(true);
            expect(audioService.isSpaceDronePlaying()).toBe(true);

            mockSoundManager.isSpaceDronePlaying.mockReturnValue(false);
            expect(audioService.isSpaceDronePlaying()).toBe(false);
        });

        it('should handle missing space drone methods gracefully', () => {
            // Remove optional methods
            delete mockSoundManager.startSpaceDrone;
            delete mockSoundManager.stopSpaceDrone;
            delete mockSoundManager.isSpaceDronePlaying;

            // Should not throw errors
            expect(() => {
                audioService.startSpaceDrone('space');
                audioService.stopSpaceDrone();
                audioService.isSpaceDronePlaying();
            }).not.toThrow();

            expect(audioService.isSpaceDronePlaying()).toBe(false);
        });
    });

    describe('Settings Persistence', () => {
        it('should save settings to localStorage', () => {
            audioService.setVolume(0.6);
            audioService.setMuted(true);

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'astralSurveyor_audioSettings',
                expect.stringContaining('0.6')
            );
        });

        it('should load settings from localStorage on initialization', () => {
            const savedSettings = JSON.stringify({
                volume: 0.3,
                muted: true
            });
            localStorage.getItem.mockReturnValue(savedSettings);

            const newService = new AudioService(mockConfigService, mockSoundManager);
            expect(newService.getVolume()).toBe(0.3);
            expect(newService.isMuted()).toBe(true);
        });

        it('should handle corrupted localStorage gracefully', () => {
            localStorage.getItem.mockReturnValue('invalid json');

            expect(() => {
                new AudioService(mockConfigService, mockSoundManager);
            }).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        it('should handle sound manager errors gracefully', () => {
            mockSoundManager.playStarDiscovery.mockImplementation(() => {
                throw new Error('Sound failed');
            });

            expect(() => {
                audioService.playDiscoverySound('G-Type Star');
            }).not.toThrow();
        });

        it('should handle volume setting errors gracefully', () => {
            mockSoundManager.setVolume.mockImplementation(() => {
                throw new Error('Volume failed');
            });

            expect(() => {
                audioService.setVolume(0.5);
            }).not.toThrow();
        });

        it('should handle localStorage errors gracefully', () => {
            localStorage.setItem.mockImplementation(() => {
                throw new Error('Storage full');
            });

            expect(() => {
                audioService.setVolume(0.5);
            }).not.toThrow();
        });
    });

    describe('Sound Manager Integration', () => {
        it('should sync mute state with sound manager', () => {
            mockSoundManager.isMuted.mockReturnValue(true);
            audioService.setMuted(false);
            expect(mockSoundManager.toggleMute).toHaveBeenCalled();
        });

        it('should not toggle when already in sync', () => {
            mockSoundManager.isMuted.mockReturnValue(false);
            audioService.setMuted(false);
            expect(mockSoundManager.toggleMute).not.toHaveBeenCalled();
        });

        it('should set volume on sound manager when available', () => {
            audioService.setVolume(0.7);
            expect(mockSoundManager.setVolume).toHaveBeenCalledWith('master', 0.7);
        });
    });
});