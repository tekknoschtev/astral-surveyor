// AudioService Tests - Test-driven development for audio management
// Following Phase 4 clean architecture patterns

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioService } from '../../dist/services/AudioService.js';

describe('AudioService', () => {
    let audioService;
    let mockConfigService;
    let mockSoundManager;

    // Mock AudioContext for testing
    const mockAudioContext = {
        createGain: vi.fn(() => ({
            gain: { value: 1 },
            connect: vi.fn(),
            disconnect: vi.fn()
        })),
        createOscillator: vi.fn(() => ({
            frequency: { value: 440 },
            type: 'sine',
            connect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn()
        })),
        createBiquadFilter: vi.fn(() => ({
            frequency: { value: 350 },
            Q: { value: 1 },
            type: 'lowpass',
            connect: vi.fn()
        })),
        destination: {},
        currentTime: 0,
        state: 'running',
        resume: vi.fn(),
        close: vi.fn()
    };

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
        
        // Mock global AudioContext
        global.AudioContext = vi.fn(() => mockAudioContext);
        global.webkitAudioContext = vi.fn(() => mockAudioContext);

        // Mock dependencies
        mockConfigService = {
            get: (key, defaultValue) => {
                const configMap = {
                    'audio.enabled': true,
                    'audio.volume.master': 0.8,
                    'audio.volume.effects': 0.6,
                    'audio.volume.ambient': 0.4,
                    'audio.quality': 'high'
                };
                return configMap[key] || defaultValue;
            },
            getAudioConfig: () => ({
                enabled: true,
                volume: {
                    master: 0.8,
                    effects: 0.6,
                    ambient: 0.4
                }
            })
        };

        mockSoundManager = {
            isInitialized: vi.fn(() => true),
            isMuted: vi.fn(() => false),
            toggleMute: vi.fn(() => false),
            playStarDiscovery: vi.fn(),
            playPlanetDiscovery: vi.fn(),
            playNebulaDiscovery: vi.fn(),
            setVolume: vi.fn(),
            stopAmbient: vi.fn()
        };

        audioService = new AudioService(mockConfigService, mockSoundManager);
    });

    afterEach(() => {
        if (audioService && typeof audioService.dispose === 'function') {
            audioService.dispose();
        }
        vi.restoreAllMocks();
    });

    describe('Initialization', () => {
        it('should initialize with proper dependencies', () => {
            expect(audioService).toBeDefined();
            expect(audioService.configService).toBe(mockConfigService);
            expect(audioService.soundManager).toBe(mockSoundManager);
        });

        it('should handle missing dependencies gracefully', () => {
            expect(() => {
                new AudioService(null, mockSoundManager);
            }).toThrow('ConfigService is required');

            expect(() => {
                new AudioService(mockConfigService, null);
            }).toThrow('SoundManager is required');
        });

        it('should initialize audio settings from configuration', () => {
            expect(audioService.getMasterVolume()).toBe(0.8);
            expect(audioService.getEffectsVolume()).toBe(0.6);
            expect(audioService.getAmbientVolume()).toBe(0.4);
        });

        it('should detect audio capability', () => {
            expect(audioService.isAudioSupported()).toBe(true);
        });
    });

    describe('Volume Management', () => {
        it('should manage master volume', () => {
            audioService.setMasterVolume(0.5);
            expect(audioService.getMasterVolume()).toBe(0.5);
        });

        it('should manage effects volume', () => {
            audioService.setEffectsVolume(0.7);
            expect(audioService.getEffectsVolume()).toBe(0.7);
        });

        it('should manage ambient volume', () => {
            audioService.setAmbientVolume(0.3);
            expect(audioService.getAmbientVolume()).toBe(0.3);
        });

        it('should validate volume ranges', () => {
            expect(() => {
                audioService.setMasterVolume(1.5);
            }).toThrow('Volume must be between 0 and 1');

            expect(() => {
                audioService.setMasterVolume(-0.1);
            }).toThrow('Volume must be between 0 and 1');
        });

        it('should apply volume changes immediately', () => {
            audioService.setMasterVolume(0.5);
            expect(mockSoundManager.setVolume).toHaveBeenCalledWith('master', 0.5);
        });
    });

    describe('Mute Management', () => {
        it('should toggle mute state', () => {
            mockSoundManager.toggleMute.mockReturnValue(true);
            
            const isMuted = audioService.toggleMute();
            expect(isMuted).toBe(true);
            expect(mockSoundManager.toggleMute).toHaveBeenCalled();
        });

        it('should get mute state', () => {
            // Set mute state first
            audioService.setMuted(true);
            
            const isMuted = audioService.isMuted();
            expect(isMuted).toBe(true);
        });

        it('should set mute state explicitly', () => {
            audioService.setMuted(true);
            expect(audioService.isMuted()).toBe(true);
            
            audioService.setMuted(false);
            expect(audioService.isMuted()).toBe(false);
        });
    });

    describe('Discovery Sound Effects', () => {
        it('should play star discovery sounds', () => {
            audioService.playStarDiscovery('G-Type Star');
            expect(mockSoundManager.playStarDiscovery).toHaveBeenCalledWith('G-Type Star');
        });

        it('should play planet discovery sounds', () => {
            audioService.playPlanetDiscovery('Gas Giant');
            expect(mockSoundManager.playPlanetDiscovery).toHaveBeenCalledWith('Gas Giant');
        });

        it('should play nebula discovery sounds', () => {
            audioService.playNebulaDiscovery('emission');
            expect(mockSoundManager.playNebulaDiscovery).toHaveBeenCalledWith('emission');
        });

        it('should play generic discovery sound', () => {
            audioService.playDiscoverySound('wormhole');
            // Should call appropriate discovery method based on type
            expect(mockSoundManager.playStarDiscovery).not.toHaveBeenCalled();
        });

        it('should not play sounds when muted', () => {
            audioService.setMuted(true);
            
            audioService.playStarDiscovery('M-Type Star');
            expect(mockSoundManager.playStarDiscovery).not.toHaveBeenCalled();
        });

        it('should not play sounds when audio is disabled', () => {
            mockConfigService.get = (key, defaultValue) => {
                if (key === 'audio.enabled') return false;
                return defaultValue;
            };

            const disabledAudioService = new AudioService(mockConfigService, mockSoundManager);
            disabledAudioService.playStarDiscovery('G-Type Star');
            
            expect(mockSoundManager.playStarDiscovery).not.toHaveBeenCalled();
            
            disabledAudioService.dispose();
        });
    });

    describe('Ambient Audio Management', () => {
        it('should start ambient audio', () => {
            audioService.startAmbient('space');
            // Should trigger ambient audio setup
            expect(audioService.isAmbientPlaying()).toBe(true);
        });

        it('should stop ambient audio', () => {
            audioService.startAmbient('space');
            audioService.stopAmbient();
            
            expect(mockSoundManager.stopAmbient).toHaveBeenCalled();
            expect(audioService.isAmbientPlaying()).toBe(false);
        });

        it('should change ambient tracks smoothly', () => {
            audioService.startAmbient('space');
            audioService.startAmbient('nebula');
            
            // Should stop previous and start new
            expect(mockSoundManager.stopAmbient).toHaveBeenCalled();
        });

        it('should adjust ambient volume independently', () => {
            audioService.startAmbient('space');
            audioService.setAmbientVolume(0.2);
            
            expect(audioService.getAmbientVolume()).toBe(0.2);
        });
    });

    describe('Configuration Integration', () => {
        it('should load settings from configuration on startup', () => {
            const audioService2 = new AudioService(mockConfigService, mockSoundManager);
            
            expect(audioService2.getMasterVolume()).toBe(0.8);
            expect(audioService2.getEffectsVolume()).toBe(0.6);
            expect(audioService2.getAmbientVolume()).toBe(0.4);
            
            audioService2.dispose();
        });

        it('should respond to configuration changes', () => {
            mockConfigService.get = (key, defaultValue) => {
                if (key === 'audio.volume.master') return 0.3;
                return defaultValue;
            };

            audioService.reloadConfiguration();
            expect(audioService.getMasterVolume()).toBe(0.3);
        });

        it('should validate configuration values', () => {
            mockConfigService.get = (key, defaultValue) => {
                if (key === 'audio.volume.master') return 2.0; // Invalid
                return defaultValue;
            };

            expect(() => {
                audioService.reloadConfiguration();
            }).toThrow('Invalid master volume');
        });

        it('should save settings to localStorage', () => {
            audioService.setMasterVolume(0.9);
            audioService.saveSettings();
            
            expect(global.localStorage.setItem).toHaveBeenCalledWith(
                'astralSurveyor_audioSettings', 
                expect.stringContaining('0.9')
            );
        });
    });

    describe('Audio Context Management', () => {
        it('should handle audio context initialization', () => {
            expect(audioService.isAudioContextActive()).toBe(true);
        });

        it('should resume audio context when needed', async () => {
            mockAudioContext.state = 'suspended';
            
            await audioService.resumeAudioContext();
            expect(mockAudioContext.resume).toHaveBeenCalled();
        });

        it('should handle audio context errors gracefully', async () => {
            mockAudioContext.resume.mockRejectedValue(new Error('Resume failed'));
            
            await expect(audioService.resumeAudioContext()).rejects.toThrow('Resume failed');
        });

        it('should detect when audio context is not available', () => {
            global.AudioContext = undefined;
            global.webkitAudioContext = undefined;

            const serviceWithoutAudio = new AudioService(mockConfigService, mockSoundManager);
            expect(serviceWithoutAudio.isAudioSupported()).toBe(false);
            
            serviceWithoutAudio.dispose();
        });
    });

    describe('Performance and Memory Management', () => {
        it('should handle rapid sound effect calls efficiently', () => {
            const start = performance.now();
            
            // Simulate rapid discovery sounds
            for (let i = 0; i < 50; i++) {
                audioService.playStarDiscovery('G-Type Star');
            }
            
            const end = performance.now();
            const duration = end - start;
            
            // Should handle calls quickly
            expect(duration).toBeLessThan(100);
        });

        it('should properly dispose of resources', () => {
            audioService.startAmbient('space');
            expect(audioService.isAmbientPlaying()).toBe(true);
            
            audioService.dispose();
            
            // Should not be able to play sounds after disposal
            expect(() => {
                audioService.playStarDiscovery('G-Type Star');
            }).toThrow('AudioService has been disposed');
        });

        it('should clean up ambient audio on disposal', () => {
            audioService.startAmbient('space');
            audioService.dispose();
            
            expect(mockSoundManager.stopAmbient).toHaveBeenCalled();
        });
    });

    describe('Sound Effect Categories', () => {
        it('should categorize discovery sounds correctly', () => {
            const starTypes = ['G-Type Star', 'M-Type Star', 'Blue Giant'];
            
            starTypes.forEach(type => {
                audioService.playStarDiscovery(type);
                expect(mockSoundManager.playStarDiscovery).toHaveBeenCalledWith(type);
            });
        });

        it('should handle unknown sound types gracefully', () => {
            expect(() => {
                audioService.playDiscoverySound('unknown-type');
            }).not.toThrow();
        });

        it('should provide available sound categories', () => {
            const categories = audioService.getAvailableSoundCategories();
            
            expect(categories).toContain('discovery');
            expect(categories).toContain('ambient');
            expect(categories).toContain('effects');
        });
    });

    describe('Audio Quality Management', () => {
        it('should adjust quality based on configuration', () => {
            mockConfigService.get = (key, defaultValue) => {
                if (key === 'audio.quality') return 'low';
                return defaultValue;
            };

            const lowQualityService = new AudioService(mockConfigService, mockSoundManager);
            expect(lowQualityService.getAudioQuality()).toBe('low');
            
            lowQualityService.dispose();
        });

        it('should handle quality changes at runtime', () => {
            audioService.setAudioQuality('high');
            expect(audioService.getAudioQuality()).toBe('high');
            
            audioService.setAudioQuality('low');
            expect(audioService.getAudioQuality()).toBe('low');
        });

        it('should validate quality settings', () => {
            expect(() => {
                audioService.setAudioQuality('invalid');
            }).toThrow('Invalid audio quality');
        });
    });

    describe('Error Handling', () => {
        it('should handle sound manager errors gracefully', () => {
            mockSoundManager.playStarDiscovery.mockImplementation(() => {
                throw new Error('Sound failed');
            });

            expect(() => {
                audioService.playStarDiscovery('G-Type Star');
            }).not.toThrow();
        });

        it('should continue working when some audio features fail', () => {
            mockSoundManager.playStarDiscovery.mockImplementation(() => {
                throw new Error('Star sound failed');
            });

            // Other sounds should still work
            audioService.playPlanetDiscovery('Rocky Planet');
            expect(mockSoundManager.playPlanetDiscovery).toHaveBeenCalled();
        });

        it('should handle volume setting errors', () => {
            mockSoundManager.setVolume.mockImplementation(() => {
                throw new Error('Volume failed');
            });

            expect(() => {
                audioService.setMasterVolume(0.5);
            }).not.toThrow();
        });
    });
});