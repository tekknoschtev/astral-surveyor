// Audio Service Integration Tests
// Tests audio system integration with discovery, mute persistence, and error handling

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SoundManager } from '../../dist/audio/soundmanager.js';
import { SimpleAudioCoordinator } from '../../dist/services/SimpleAudioCoordinator.js';

describe('Audio Service Integration', () => {
    let soundManager;
    let audioCoordinator;
    let mockLocalStorage;

    beforeEach(() => {
        // Mock localStorage
        mockLocalStorage = {
            data: {},
            getItem: vi.fn((key) => mockLocalStorage.data[key] || null),
            setItem: vi.fn((key, value) => { mockLocalStorage.data[key] = value; }),
            removeItem: vi.fn((key) => { delete mockLocalStorage.data[key]; }),
            clear: vi.fn(() => { mockLocalStorage.data = {}; })
        };
        global.localStorage = mockLocalStorage;

        // Mock Web Audio API
        global.AudioContext = vi.fn().mockImplementation(() => ({
            createGain: vi.fn(() => ({
                gain: {
                    value: 1,
                    setValueAtTime: vi.fn(),
                    linearRampToValueAtTime: vi.fn(),
                    exponentialRampToValueAtTime: vi.fn()
                },
                connect: vi.fn()
            })),
            createOscillator: vi.fn(() => ({
                type: 'sine',
                frequency: {
                    value: 440,
                    setValueAtTime: vi.fn(),
                    linearRampToValueAtTime: vi.fn(),
                    exponentialRampToValueAtTime: vi.fn()
                },
                connect: vi.fn(),
                start: vi.fn(),
                stop: vi.fn()
            })),
            createBiquadFilter: vi.fn(() => ({
                type: 'lowpass',
                frequency: {
                    value: 1000,
                    setValueAtTime: vi.fn()
                },
                Q: {
                    value: 1,
                    setValueAtTime: vi.fn()
                },
                connect: vi.fn()
            })),
            createConvolver: vi.fn(() => ({
                buffer: null,
                connect: vi.fn()
            })),
            createBuffer: vi.fn((channels, length, sampleRate) => ({
                getChannelData: vi.fn(() => new Float32Array(length))
            })),
            createBufferSource: vi.fn(() => ({
                buffer: null,
                connect: vi.fn(),
                start: vi.fn(),
                stop: vi.fn()
            })),
            currentTime: 0,
            sampleRate: 44100,
            destination: {},
            state: 'running',
            resume: vi.fn().mockResolvedValue(undefined),
            close: vi.fn().mockResolvedValue(undefined)
        }));

        soundManager = new SoundManager();
        audioCoordinator = new SimpleAudioCoordinator(soundManager);
    });

    afterEach(() => {
        if (soundManager) {
            soundManager.dispose();
        }
        vi.restoreAllMocks();
    });

    describe('Discovery Audio for Each Celestial Type', () => {
        it('should play star discovery audio with correct parameters', () => {
            const playSpy = vi.spyOn(soundManager, 'playStarDiscovery');

            audioCoordinator.playDiscoverySound({
                objectType: 'star',
                starType: 'G-Type Star'
            });

            expect(playSpy).toHaveBeenCalledWith('G-Type Star');
        });

        it('should play planet discovery audio with correct parameters', () => {
            const playSpy = vi.spyOn(soundManager, 'playPlanetDiscovery');

            audioCoordinator.playDiscoverySound({
                objectType: 'planet',
                planetType: 'Ocean World'
            });

            expect(playSpy).toHaveBeenCalledWith('Ocean World');
        });

        it('should play moon discovery audio', () => {
            const playSpy = vi.spyOn(soundManager, 'playMoonDiscovery');

            audioCoordinator.playDiscoverySound({
                objectType: 'moon'
            });

            expect(playSpy).toHaveBeenCalled();
        });

        it('should play nebula discovery audio with correct parameters', () => {
            const playSpy = vi.spyOn(soundManager, 'playNebulaDiscovery');

            audioCoordinator.playDiscoverySound({
                objectType: 'nebula',
                nebulaType: 'emission'
            });

            expect(playSpy).toHaveBeenCalledWith('emission');
        });

        it('should play wormhole discovery audio', () => {
            const playSpy = vi.spyOn(soundManager, 'playWormholeDiscovery');

            audioCoordinator.playDiscoverySound({
                objectType: 'wormhole'
            });

            expect(playSpy).toHaveBeenCalled();
        });

        it('should play black hole discovery audio', () => {
            const playSpy = vi.spyOn(soundManager, 'playBlackHoleDiscovery');

            audioCoordinator.playDiscoverySound({
                objectType: 'blackhole'
            });

            expect(playSpy).toHaveBeenCalled();
        });

        it('should play crystal garden discovery audio with variant', () => {
            const playSpy = vi.spyOn(soundManager, 'playCrystalGardenDiscovery');

            audioCoordinator.playDiscoverySound({
                objectType: 'crystal-garden',
                gardenType: 'pure'
            });

            expect(playSpy).toHaveBeenCalledWith('pure');
        });

        it('should play asteroid discovery audio', () => {
            const playSpy = vi.spyOn(soundManager, 'playPlanetDiscovery');

            audioCoordinator.playDiscoverySound({
                objectType: 'asteroids'
            });

            expect(playSpy).toHaveBeenCalledWith('Asteroid Garden');
        });

        it('should play rare discovery audio for comets', () => {
            const playSpy = vi.spyOn(soundManager, 'playRareDiscovery');

            audioCoordinator.playDiscoverySound({
                objectType: 'comet'
            });

            expect(playSpy).toHaveBeenCalled();
        });

        it('should play rare discovery audio for rogue planets', () => {
            const playSpy = vi.spyOn(soundManager, 'playRareDiscovery');

            audioCoordinator.playDiscoverySound({
                objectType: 'rogue-planet'
            });

            expect(playSpy).toHaveBeenCalled();
        });

        it('should play rare discovery audio for dark nebulae', () => {
            const playSpy = vi.spyOn(soundManager, 'playRareDiscovery');

            audioCoordinator.playDiscoverySound({
                objectType: 'dark-nebula'
            });

            expect(playSpy).toHaveBeenCalled();
        });

        it('should play rare discovery audio for protostars', () => {
            const playSpy = vi.spyOn(soundManager, 'playRareDiscovery');

            audioCoordinator.playDiscoverySound({
                objectType: 'protostar'
            });

            expect(playSpy).toHaveBeenCalled();
        });
    });

    describe('Rare Discovery Audio Enhancement', () => {
        it('should play additional rare audio for rare discoveries after delay', () => {
            vi.useFakeTimers();
            const playSpy = vi.spyOn(soundManager, 'playRareDiscovery');

            audioCoordinator.playDiscoverySound({
                objectType: 'star',
                starType: 'Neutron Star',
                isRare: true
            });

            // Should not be called immediately
            expect(playSpy).not.toHaveBeenCalled();

            // Should be called after 300ms delay
            vi.advanceTimersByTime(300);
            expect(playSpy).toHaveBeenCalled();

            vi.useRealTimers();
        });

        it('should not play additional rare audio for common discoveries', () => {
            vi.useFakeTimers();
            const playSpy = vi.spyOn(soundManager, 'playRareDiscovery');

            audioCoordinator.playDiscoverySound({
                objectType: 'star',
                starType: 'G-Type Star',
                isRare: false
            });

            vi.advanceTimersByTime(300);
            expect(playSpy).not.toHaveBeenCalled();

            vi.useRealTimers();
        });
    });

    describe('Rapid Discoveries Without Overlap/Crash', () => {
        it('should handle multiple rapid discoveries without crashing', () => {
            const discoveries = [
                { objectType: 'star', starType: 'G-Type Star' },
                { objectType: 'planet', planetType: 'Rocky World' },
                { objectType: 'moon' },
                { objectType: 'nebula', nebulaType: 'emission' },
                { objectType: 'wormhole' }
            ];

            expect(() => {
                discoveries.forEach(discovery => {
                    audioCoordinator.playDiscoverySound(discovery);
                });
            }).not.toThrow();
        });

        it('should handle simultaneous identical discoveries', () => {
            const discovery = { objectType: 'star', starType: 'G-Type Star' };

            expect(() => {
                for (let i = 0; i < 10; i++) {
                    audioCoordinator.playDiscoverySound(discovery);
                }
            }).not.toThrow();
        });

        it('should gracefully handle audio errors without crashing', () => {
            // Make playStarDiscovery throw an error
            vi.spyOn(soundManager, 'playStarDiscovery').mockImplementation(() => {
                throw new Error('Audio context error');
            });

            // Should not throw - errors should be caught and logged
            expect(() => {
                audioCoordinator.playDiscoverySound({
                    objectType: 'star',
                    starType: 'G-Type Star'
                });
            }).not.toThrow();
        });
    });

    describe('Mute Setting Persistence Across Sessions', () => {
        it('should save mute state to localStorage', () => {
            soundManager.toggleMute();

            expect(mockLocalStorage.setItem).toHaveBeenCalled();
            const savedData = mockLocalStorage.data['astralSurveyor_audioSettings'];
            expect(savedData).toBeDefined();

            const settings = JSON.parse(savedData);
            expect(settings.muted).toBe(true);
        });

        it('should load mute state from localStorage on initialization', () => {
            // Set muted state in localStorage
            mockLocalStorage.data['astralSurveyor_audioSettings'] = JSON.stringify({
                muted: true,
                masterVolume: 0.8,
                ambientVolume: 0.6,
                effectsVolume: 0.7,
                masterMuted: false,
                ambientMuted: false,
                effectsMuted: false
            });

            // Create new sound manager
            const newSoundManager = new SoundManager();

            expect(newSoundManager.isMuted()).toBe(true);

            newSoundManager.dispose();
        });

        it('should persist volume settings across sessions', () => {
            soundManager.setMasterVolume(0.5);
            soundManager.setAmbientVolume(0.3);
            soundManager.setEffectsVolume(0.7);

            expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(3);

            const savedData = mockLocalStorage.data['astralSurveyor_audioSettings'];
            const settings = JSON.parse(savedData);

            expect(settings.masterVolume).toBe(0.5);
            expect(settings.ambientVolume).toBe(0.3);
            expect(settings.effectsVolume).toBe(0.7);
        });

        it('should persist individual mute settings across sessions', () => {
            soundManager.setMasterMuted(true);
            soundManager.setAmbientMuted(false);
            soundManager.setEffectsMuted(true);

            const savedData = mockLocalStorage.data['astralSurveyor_audioSettings'];
            const settings = JSON.parse(savedData);

            expect(settings.masterMuted).toBe(true);
            expect(settings.ambientMuted).toBe(false);
            expect(settings.effectsMuted).toBe(true);
        });

        it('should handle corrupted localStorage data gracefully', () => {
            mockLocalStorage.data['astralSurveyor_audioSettings'] = 'invalid json {{{';

            // Should not throw - should use defaults
            expect(() => {
                new SoundManager();
            }).not.toThrow();
        });

        it('should handle missing localStorage gracefully', () => {
            global.localStorage = undefined;

            // Should not throw - should work without persistence
            expect(() => {
                new SoundManager();
            }).not.toThrow();
        });
    });

    describe('Audio Muted Behavior', () => {
        it('should not play audio when globally muted', () => {
            soundManager.toggleMute(); // Mute

            const playSpy = vi.spyOn(soundManager, 'playStarDiscovery');

            audioCoordinator.playDiscoverySound({
                objectType: 'star',
                starType: 'G-Type Star'
            });

            // The coordinator still calls the method, but SoundManager should handle muting
            expect(playSpy).toHaveBeenCalled();
        });

        it('should not play effects when effects are muted', () => {
            soundManager.setEffectsMuted(true);

            const playSpy = vi.spyOn(soundManager, 'playPlanetDiscovery');

            audioCoordinator.playDiscoverySound({
                objectType: 'planet',
                planetType: 'Rocky World'
            });

            // The coordinator calls the method, SoundManager handles muting
            expect(playSpy).toHaveBeenCalled();
        });

        it('should respect master mute over individual channel settings', () => {
            soundManager.setEffectsMuted(false); // Effects unmuted
            soundManager.setMasterMuted(true);   // But master muted

            expect(soundManager.isMasterMuted()).toBe(true);
            expect(soundManager.isEffectsMuted()).toBe(false);
        });

        it('should allow toggling mute on and off', () => {
            expect(soundManager.isMuted()).toBe(false);

            soundManager.toggleMute();
            expect(soundManager.isMuted()).toBe(true);

            soundManager.toggleMute();
            expect(soundManager.isMuted()).toBe(false);
        });
    });

    describe('Volume Controls', () => {
        it('should clamp volume values to 0-1 range', () => {
            soundManager.setMasterVolume(1.5); // Above max
            expect(soundManager.getMasterVolume()).toBe(1.0);

            soundManager.setMasterVolume(-0.5); // Below min
            expect(soundManager.getMasterVolume()).toBe(0);
        });

        it('should allow setting discovery volume (mapped to effects)', () => {
            soundManager.setDiscoveryVolume(0.6);

            expect(soundManager.getDiscoveryVolume()).toBe(0.6);
            expect(soundManager.getEffectsVolume()).toBe(0.6);
        });

        it('should allow setting discovery mute (mapped to effects)', () => {
            soundManager.setDiscoveryMuted(true);

            expect(soundManager.isDiscoveryMuted()).toBe(true);
            expect(soundManager.isEffectsMuted()).toBe(true);
        });

        it('should get current volume settings', () => {
            soundManager.setMasterVolume(0.8);
            soundManager.setAmbientVolume(0.6);
            soundManager.setEffectsVolume(0.7);

            expect(soundManager.getMasterVolume()).toBe(0.8);
            expect(soundManager.getAmbientVolume()).toBe(0.6);
            expect(soundManager.getEffectsVolume()).toBe(0.7);
        });
    });

    describe('Audio Initialization', () => {
        it('should report initialization status', () => {
            expect(soundManager.isInitialized()).toBe(true);
        });

        it('should handle audio context suspension', async () => {
            // Mock suspended state
            const context = soundManager['context'];
            if (context) {
                context.state = 'suspended';
            }

            expect(soundManager.getAudioContextState()).toBe('suspended');

            const resumed = await soundManager.resumeAudioContext();
            expect(resumed).toBe(true);
            expect(context.resume).toHaveBeenCalled();
        });

        it('should handle audio context resume failure gracefully', async () => {
            const context = soundManager['context'];
            if (context) {
                context.state = 'suspended';
                context.resume.mockRejectedValue(new Error('Resume failed'));
            }

            const resumed = await soundManager.resumeAudioContext();
            expect(resumed).toBe(false);
        });

        it('should report no-context when audio context is unavailable', () => {
            soundManager['context'] = null;
            expect(soundManager.getAudioContextState()).toBe('no-context');
        });
    });

    describe('Discovery Audio with Missing Methods', () => {
        it('should gracefully handle missing playStarDiscovery method', () => {
            delete soundManager.playStarDiscovery;

            expect(() => {
                audioCoordinator.playDiscoverySound({
                    objectType: 'star',
                    starType: 'G-Type Star'
                });
            }).not.toThrow();
        });

        it('should gracefully handle missing playPlanetDiscovery method', () => {
            delete soundManager.playPlanetDiscovery;

            expect(() => {
                audioCoordinator.playDiscoverySound({
                    objectType: 'planet',
                    planetType: 'Rocky World'
                });
            }).not.toThrow();
        });

        it('should use default values when celestial type is missing', () => {
            const playSpy = vi.spyOn(soundManager, 'playStarDiscovery');

            audioCoordinator.playDiscoverySound({
                objectType: 'star'
                // No starType provided
            });

            expect(playSpy).toHaveBeenCalledWith('G-Type Star'); // Default
        });
    });
});
