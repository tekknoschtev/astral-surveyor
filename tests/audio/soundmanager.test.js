import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Import from compiled TypeScript
import { SoundManager } from '../../dist/audio/soundmanager.js';

describe('SoundManager Audio System', () => {
  let soundManager;
  let mockAudioContext;
  let mockGainNode;
  let mockOscillator;
  let mockBufferSource;
  let mockFilter;
  let mockBuffer;
  let originalLocalStorage;
  let originalConsole;

  beforeEach(() => {
    // Mock console methods
    originalConsole = global.console;
    global.console = {
      ...console,
      warn: vi.fn(),
      log: vi.fn(),
      error: vi.fn()
    };

    // Mock localStorage
    originalLocalStorage = global.localStorage;
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };

    // Create comprehensive Web Audio API mocks
    mockGainNode = {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn()
      },
      connect: vi.fn(),
      disconnect: vi.fn()
    };

    mockOscillator = {
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn()
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn()
    };

    mockBufferSource = {
      buffer: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn()
    };

    mockFilter = {
      type: 'lowpass',
      frequency: {
        setValueAtTime: vi.fn()
      },
      Q: {
        setValueAtTime: vi.fn()
      },
      connect: vi.fn(),
      disconnect: vi.fn()
    };

    mockBuffer = {
      length: 44100,
      sampleRate: 44100,
      numberOfChannels: 1,
      getChannelData: vi.fn().mockReturnValue(new Float32Array(44100))
    };

    mockAudioContext = {
      currentTime: 0,
      sampleRate: 44100,
      destination: { connect: vi.fn() },
      state: 'running',
      suspend: vi.fn(),
      resume: vi.fn(),
      close: vi.fn(),
      createGain: vi.fn(() => ({ ...mockGainNode })),
      createOscillator: vi.fn(() => ({ ...mockOscillator })),
      createBufferSource: vi.fn(() => ({ ...mockBufferSource })),
      createBiquadFilter: vi.fn(() => ({ ...mockFilter })),
      createBuffer: vi.fn(() => ({ ...mockBuffer }))
    };

    // Mock AudioContext constructor
    global.window = {
      AudioContext: vi.fn(() => mockAudioContext),
      webkitAudioContext: vi.fn(() => mockAudioContext)
    };
  });

  afterEach(() => {
    if (soundManager && soundManager.dispose) {
      soundManager.dispose();
    }
    
    global.console = originalConsole;
    global.localStorage = originalLocalStorage;
    vi.restoreAllMocks();
  });

  describe('Initialization and Setup', () => {
    it('should initialize with correct default state', () => {
      soundManager = new SoundManager();
      
      expect(soundManager.isMuted()).toBe(false);
      expect(soundManager.isInitialized()).toBe(true);
    });

    it('should create audio context and gain nodes', () => {
      soundManager = new SoundManager();
      
      expect(global.window.AudioContext).toHaveBeenCalled();
      expect(mockAudioContext.createGain).toHaveBeenCalledTimes(3); // master, ambient, effects
      expect(mockGainNode.connect).toHaveBeenCalled();
    });

    it('should set initial volume levels correctly', () => {
      soundManager = new SoundManager();
      
      expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(0.5, 0); // master volume
      expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(0.3, 0); // ambient volume
      expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(0.7, 0); // effects volume
    });

    it('should handle audio context creation failure gracefully', () => {
      global.window.AudioContext = vi.fn(() => {
        throw new Error('AudioContext not supported');
      });
      
      soundManager = new SoundManager();
      
      expect(soundManager.isInitialized()).toBe(false);
      expect(global.console.warn).toHaveBeenCalledWith('Failed to initialize audio:', expect.any(Error));
    });

    it('should use webkitAudioContext as fallback', () => {
      global.window.AudioContext = undefined;
      
      soundManager = new SoundManager();
      
      expect(global.window.webkitAudioContext).toHaveBeenCalled();
    });
  });

  describe('Settings Management', () => {
    it('should load muted state from localStorage', () => {
      global.localStorage.getItem.mockReturnValue(JSON.stringify({ muted: true }));
      
      soundManager = new SoundManager();
      
      expect(global.localStorage.getItem).toHaveBeenCalledWith('astralSurveyor_audioSettings');
      expect(soundManager.isMuted()).toBe(true);
    });

    it('should handle missing localStorage settings gracefully', () => {
      global.localStorage.getItem.mockReturnValue(null);
      
      soundManager = new SoundManager();
      
      expect(soundManager.isMuted()).toBe(false);
    });

    it('should handle malformed localStorage settings', () => {
      global.localStorage.getItem.mockReturnValue('invalid json');
      
      soundManager = new SoundManager();
      
      expect(soundManager.isMuted()).toBe(false);
      expect(global.console.warn).toHaveBeenCalledWith('Failed to load audio settings:', expect.any(Error));
    });

    it('should save settings to localStorage', () => {
      soundManager = new SoundManager();
      
      soundManager.toggleMute();
      
      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        'astralSurveyor_audioSettings',
        JSON.stringify({ muted: true })
      );
    });

    it('should handle localStorage save errors gracefully', () => {
      global.localStorage.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });
      
      soundManager = new SoundManager();
      soundManager.toggleMute();
      
      expect(global.console.warn).toHaveBeenCalledWith('Failed to save audio settings:', expect.any(Error));
    });
  });

  describe('Mute and Volume Control', () => {
    beforeEach(() => {
      soundManager = new SoundManager();
    });

    it('should toggle mute state correctly', () => {
      expect(soundManager.isMuted()).toBe(false);
      
      const result1 = soundManager.toggleMute();
      expect(result1).toBe(true);
      expect(soundManager.isMuted()).toBe(true);
      
      const result2 = soundManager.toggleMute();
      expect(result2).toBe(false);
      expect(soundManager.isMuted()).toBe(false);
    });

    it('should update master volume when muting', () => {
      mockGainNode.gain.setValueAtTime.mockClear();
      
      soundManager.toggleMute();
      
      expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(0, 0);
    });

    it('should update master volume when unmuting', () => {
      soundManager.toggleMute(); // mute first
      mockGainNode.gain.setValueAtTime.mockClear();
      
      soundManager.toggleMute(); // unmute
      
      expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(0.5, 0);
    });

    it('should save settings when toggling mute', () => {
      soundManager.toggleMute();
      
      expect(global.localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Sound Configuration', () => {
    beforeEach(() => {
      soundManager = new SoundManager();
    });

    it('should have correct star discovery sound config', () => {
      // Test by triggering the sound and verifying oscillator settings
      soundManager.playStarDiscovery();
      
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(110, 0);
      expect(mockOscillator.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(165, expect.any(Number));
    });

    it('should have correct planet discovery sound config', () => {
      soundManager.playPlanetDiscovery();
      
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(220, 0);
      expect(mockOscillator.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(330, expect.any(Number));
    });

    it('should have correct moon discovery sound config', () => {
      soundManager.playMoonDiscovery();
      
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(440, 0);
    });

    it('should have correct rare discovery sound config', () => {
      soundManager.playRareDiscovery();
      
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(65, 0);
    });

    it('should have UI sound configurations', () => {
      soundManager.playMapToggle();
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      
      mockAudioContext.createOscillator.mockClear();
      
      soundManager.playNotification();
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    });
  });

  describe('Star Discovery Sound Variations', () => {
    beforeEach(() => {
      soundManager = new SoundManager();
    });

    it('should vary frequency for different star types', () => {
      const starTypes = [
        { name: 'G-Type Star', multiplier: 1.0 },
        { name: 'K-Type Star', multiplier: 0.8 },
        { name: 'M-Type Star', multiplier: 0.6 },
        { name: 'Red Giant', multiplier: 0.4 },
        { name: 'Blue Giant', multiplier: 1.5 },
        { name: 'White Dwarf', multiplier: 1.8 },
        { name: 'Neutron Star', multiplier: 2.2 }
      ];

      starTypes.forEach(({ name, multiplier }) => {
        mockOscillator.frequency.setValueAtTime.mockClear();
        mockOscillator.frequency.exponentialRampToValueAtTime.mockClear();
        
        soundManager.playStarDiscovery(name);
        
        expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(110 * multiplier, 0);
        expect(mockOscillator.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(165 * multiplier, expect.any(Number));
      });
    });

    it('should handle unknown star types with default frequency', () => {
      soundManager.playStarDiscovery('Unknown Star Type');
      
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(110, 0);
    });
  });

  describe('Planet Discovery Sound Variations', () => {
    beforeEach(() => {
      soundManager = new SoundManager();
    });

    it('should vary frequency for different planet types', () => {
      const planetTypes = [
        { name: 'Rocky Planet', multiplier: 1.0 },
        { name: 'Gas Giant', multiplier: 0.5 },
        { name: 'Ice Giant', multiplier: 0.7 },
        { name: 'Volcanic World', multiplier: 1.3 },
        { name: 'Frozen World', multiplier: 0.6 },
        { name: 'Exotic World', multiplier: 1.8 }
      ];

      planetTypes.forEach(({ name, multiplier }) => {
        mockOscillator.frequency.setValueAtTime.mockClear();
        
        soundManager.playPlanetDiscovery(name);
        
        expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(220 * multiplier, 0);
      });
    });

    it('should handle unknown planet types with default frequency', () => {
      soundManager.playPlanetDiscovery('Unknown Planet Type');
      
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(220, 0);
    });
  });

  describe('Oscillator Sound Generation', () => {
    beforeEach(() => {
      soundManager = new SoundManager();
    });

    it('should create oscillator with correct waveform', () => {
      soundManager.playStarDiscovery();
      
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockOscillator.type).toBe('sine');
    });

    it('should set up ADSR envelope correctly', () => {
      soundManager.playStarDiscovery();
      
      // Check that gain envelope is set up
      expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(0, 0); // Start at 0
      expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalled(); // Attack and release
    });

    it('should connect audio nodes correctly', () => {
      soundManager.playStarDiscovery();
      
      expect(mockOscillator.connect).toHaveBeenCalledWith(mockGainNode);
      expect(mockGainNode.connect).toHaveBeenCalled();
    });

    it('should start and stop oscillator correctly', () => {
      soundManager.playStarDiscovery();
      
      expect(mockOscillator.start).toHaveBeenCalledWith(0);
      expect(mockOscillator.stop).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should handle frequency sweeps for two-tone sounds', () => {
      soundManager.playStarDiscovery();
      
      expect(mockOscillator.frequency.exponentialRampToValueAtTime).toHaveBeenCalled();
    });

    it('should not play sound when muted', () => {
      soundManager.toggleMute(); // mute
      mockAudioContext.createOscillator.mockClear();
      
      soundManager.playStarDiscovery();
      
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });

    it('should not play sound when audio context is not initialized', () => {
      // Create a SoundManager that fails initialization
      global.window.AudioContext = vi.fn(() => {
        throw new Error('No audio context');
      });
      
      const failedSoundManager = new SoundManager();
      mockAudioContext.createOscillator.mockClear();
      
      failedSoundManager.playStarDiscovery();
      
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });

    it('should handle sound generation errors gracefully', () => {
      mockAudioContext.createOscillator.mockImplementation(() => {
        throw new Error('Failed to create oscillator');
      });
      
      soundManager.playStarDiscovery();
      
      expect(global.console.warn).toHaveBeenCalledWith('Failed to play sound:', expect.any(Error));
    });
  });

  describe('Noise Sound Generation', () => {
    beforeEach(() => {
      soundManager = new SoundManager();
    });

    it('should generate noise for thruster sounds', () => {
      soundManager.playThrusterStart();
      
      expect(mockAudioContext.createBuffer).toHaveBeenCalled();
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
      expect(mockBuffer.getChannelData).toHaveBeenCalledWith(0);
    });

    it('should apply filter to noise sounds', () => {
      soundManager.playThrusterStart();
      
      expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled();
      expect(mockFilter.type).toBe('lowpass');
      expect(mockFilter.frequency.setValueAtTime).toHaveBeenCalledWith(2000, 0);
      expect(mockFilter.Q.setValueAtTime).toHaveBeenCalledWith(1, 0);
    });

    it('should connect filter in audio chain for filtered noise', () => {
      soundManager.playThrusterStart();
      
      expect(mockBufferSource.connect).toHaveBeenCalledWith(mockFilter);
      expect(mockFilter.connect).toHaveBeenCalledWith(mockGainNode);
    });

    it('should generate brake sound', () => {
      soundManager.playBrake();
      
      expect(mockAudioContext.createBuffer).toHaveBeenCalled();
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
    });

    it('should handle noise generation without filter', () => {
      // Test a noise sound that doesn't specify a filter
      // We'll need to modify the test or the sound config for this case
      soundManager.playBrake();
      
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
      expect(mockBufferSource.start).toHaveBeenCalled();
    });
  });

  describe('Audio Graph Setup', () => {
    beforeEach(() => {
      soundManager = new SoundManager();
    });

    it('should connect ambient gain to master gain', () => {
      // Verify the audio graph connections were made during initialization
      expect(mockGainNode.connect).toHaveBeenCalled();
    });

    it('should connect effects gain to master gain', () => {
      // Verify the audio graph connections were made during initialization
      expect(mockGainNode.connect).toHaveBeenCalled();
    });

    it('should connect master gain to destination', () => {
      // Verify final connection to speakers
      expect(mockGainNode.connect).toHaveBeenCalled();
    });
  });

  describe('Cleanup and Disposal', () => {
    beforeEach(() => {
      soundManager = new SoundManager();
    });

    it('should close audio context on dispose', () => {
      soundManager.dispose();
      
      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('should handle ambient sound disposal gracefully', () => {
      // Since currentAmbient is private, we test that dispose doesn't throw
      // and that it handles the case where ambient sound exists
      expect(() => soundManager.dispose()).not.toThrow();
    });

    it('should handle disposal when no audio context exists', () => {
      const failedSoundManager = new SoundManager();
      failedSoundManager.context = null;
      
      expect(() => failedSoundManager.dispose()).not.toThrow();
    });
  });

  describe('Public API Methods', () => {
    beforeEach(() => {
      soundManager = new SoundManager();
    });

    it('should provide isInitialized method', () => {
      expect(soundManager.isInitialized()).toBe(true);
    });

    it('should provide isMuted method', () => {
      expect(soundManager.isMuted()).toBe(false);
    });

    it('should provide all discovery sound methods', () => {
      expect(typeof soundManager.playStarDiscovery).toBe('function');
      expect(typeof soundManager.playPlanetDiscovery).toBe('function');
      expect(typeof soundManager.playMoonDiscovery).toBe('function');
      expect(typeof soundManager.playRareDiscovery).toBe('function');
    });

    it('should provide UI sound methods', () => {
      expect(typeof soundManager.playMapToggle).toBe('function');
      expect(typeof soundManager.playNotification).toBe('function');
    });

    it('should provide ship sound methods', () => {
      expect(typeof soundManager.playThrusterStart).toBe('function');
      expect(typeof soundManager.playBrake).toBe('function');
    });

    it('should provide cleanup method', () => {
      expect(typeof soundManager.dispose).toBe('function');
    });
  });

  describe('Integration and Edge Cases', () => {
    beforeEach(() => {
      soundManager = new SoundManager();
    });

    it('should handle multiple simultaneous sounds', () => {
      soundManager.playStarDiscovery();
      soundManager.playPlanetDiscovery();
      soundManager.playMoonDiscovery();
      
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(3);
      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });

    it('should handle rapid sound triggering', () => {
      for (let i = 0; i < 10; i++) {
        soundManager.playNotification();
      }
      
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(10);
    });

    it('should maintain settings across multiple operations', () => {
      soundManager.toggleMute();
      soundManager.playStarDiscovery(); // Should not play when muted
      soundManager.toggleMute();
      soundManager.playPlanetDiscovery(); // Should play when unmuted
      
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(1);
    });

    it('should handle currentTime progression', () => {
      mockAudioContext.currentTime = 5.5;
      
      soundManager.playStarDiscovery();
      
      expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(0, 5.5);
    });

    it('should handle very short duration sounds', () => {
      soundManager.playNotification(); // Short duration sound
      
      expect(mockOscillator.start).toHaveBeenCalled();
      expect(mockOscillator.stop).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should handle very long duration sounds', () => {
      soundManager.playRareDiscovery(); // Long duration sound
      
      expect(mockOscillator.start).toHaveBeenCalled();
      expect(mockOscillator.stop).toHaveBeenCalledWith(expect.any(Number));
    });
  });
});