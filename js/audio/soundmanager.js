class SoundManager {
    constructor() {
        this.context = null;
        this.masterGain = null;
        this.ambientGain = null;
        this.effectsGain = null;
        this.sounds = new Map();
        this.currentAmbient = null;
        this.initialized = false;
        this.muted = false;
        
        // Load mute preference from localStorage
        this.loadSettings();
        
        // Initialize audio context (requires user interaction in some browsers)
        this.initializeAudio();
    }

    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('astralSurveyor_audioSettings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                this.muted = settings.muted || false;
            }
        } catch (error) {
            console.warn('Failed to load audio settings:', error);
        }
    }

    saveSettings() {
        try {
            const settings = {
                muted: this.muted
            };
            localStorage.setItem('astralSurveyor_audioSettings', JSON.stringify(settings));
        } catch (error) {
            console.warn('Failed to save audio settings:', error);
        }
    }

    async initializeAudio() {
        try {
            // Create audio context
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create gain nodes for volume control
            this.masterGain = this.context.createGain();
            this.ambientGain = this.context.createGain();
            this.effectsGain = this.context.createGain();
            
            // Set up audio routing: ambient/effects -> master -> destination
            this.ambientGain.connect(this.masterGain);
            this.effectsGain.connect(this.masterGain);
            this.masterGain.connect(this.context.destination);
            
            // Set initial volumes
            this.ambientGain.gain.value = 0.3; // Subtle ambient
            this.effectsGain.gain.value = 1.0; // Full effects volume
            this.updateMasterVolume();
            
            this.initialized = true;
            
        } catch (error) {
            console.warn('Audio initialization failed:', error);
            this.initialized = false;
        }
    }

    updateMasterVolume() {
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : 1;
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        this.updateMasterVolume();
        this.saveSettings();
        return this.muted;
    }

    async loadSound(name, url) {
        if (!this.initialized || this.sounds.has(name)) {
            return;
        }

        try {
            // For now, we'll create placeholder oscillator-based sounds
            // In a real implementation, you'd fetch and decode audio files
            this.sounds.set(name, { type: 'oscillator', config: this.getSoundConfig(name) });
        } catch (error) {
            console.warn(`Failed to load sound '${name}':`, error);
        }
    }

    getSoundConfig(name) {
        // Temporary oscillator configurations for different sound types
        const configs = {
            'star-discovery': { type: 'sine', frequency: 150, duration: 1.5, volume: 0.8 },
            'planet-discovery': { type: 'sine', frequency: 220, duration: 1.0, volume: 0.8 },
            'moon-discovery': { type: 'sine', frequency: 300, duration: 0.8, volume: 0.7 },
            'rare-discovery': { type: 'sine', frequency: 110, duration: 2.0, volume: 0.8 },
            'thruster-start': { type: 'sawtooth', frequency: 80, duration: 0.3, volume: 0.2 },
            'brake': { type: 'triangle', frequency: 120, duration: 0.5, volume: 0.2 },
            'map-toggle': { type: 'sine', frequency: 800, duration: 0.2, volume: 0.4 },
            'notification': { type: 'triangle', frequency: 600, duration: 0.3, volume: 0.5 },
            'ambient-space': { type: 'sine', frequency: 60, duration: -1, volume: 0.1 }, // -1 = loop
            'ambient-coasting': { type: 'sine', frequency: 40, duration: -1, volume: 0.08 }
        };
        
        return configs[name] || { type: 'sine', frequency: 440, duration: 0.5, volume: 0.2 };
    }

    async playSound(name, options = {}) {
        if (!this.initialized || this.muted || !this.context) {
            return;
        }

        // Resume audio context if suspended (required for some browsers)
        if (this.context.state === 'suspended') {
            await this.context.resume();
        }

        const soundData = this.sounds.get(name);
        if (!soundData) {
            // Auto-load sound if not found
            this.loadSound(name);
            // Try again after loading
            setTimeout(() => this.playSound(name, options), 100);
            return;
        }

        try {
            this.playOscillatorSound(soundData.config, options);
        } catch (error) {
            // Silently fail
        }
    }

    playOscillatorSound(config, options = {}) {
        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();
        
        // Configure oscillator
        oscillator.type = config.type;
        oscillator.frequency.value = config.frequency * (options.pitch || 1);
        
        // Configure gain
        const volume = (config.volume || 0.2) * (options.volume || 1);
        gainNode.gain.value = volume;
        
        // Connect to appropriate output
        const targetGain = options.ambient ? this.ambientGain : this.effectsGain;
        oscillator.connect(gainNode);
        gainNode.connect(targetGain);
        
        // Handle duration
        const duration = options.duration || config.duration;
        const now = this.context.currentTime;
        
        if (duration > 0) {
            // Fade in/out for smoother sound
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(volume, now + 0.1);
            gainNode.gain.linearRampToValueAtTime(0, now + duration - 0.1);
            
            oscillator.start(now);
            oscillator.stop(now + duration);
        } else if (duration === -1) {
            // Looping ambient sound
            oscillator.start(now);
            return { oscillator, gainNode }; // Return for manual control
        }
    }

    // Discovery sound methods
    playStarDiscovery(starType = 'G-Type Star') {
        // Vary pitch based on star type for variety
        const pitchMap = {
            'Neutron Star': 0.5,    // Very low, ominous
            'Red Giant': 0.7,       // Low, majestic
            'Blue Giant': 1.3,      // Higher, energetic
            'White Dwarf': 1.1,     // Slightly higher
            'G-Type Star': 1.0,     // Standard
            'K-Type Star': 0.9,     // Slightly lower
            'M-Type Star': 0.8      // Lower, dim
        };
        
        const pitch = pitchMap[starType] || 1.0;
        this.playSound('star-discovery', { pitch });
    }

    playPlanetDiscovery(planetType = 'Rocky Planet') {
        // Vary sound characteristics based on planet type
        const soundMap = {
            'Gas Giant': { pitch: 0.8, volume: 1.2 },
            'Ocean World': { pitch: 1.1, volume: 1.0 },
            'Rocky Planet': { pitch: 1.0, volume: 1.0 },
            'Desert World': { pitch: 0.9, volume: 0.9 },
            'Frozen World': { pitch: 1.3, volume: 0.8 },
            'Volcanic World': { pitch: 0.7, volume: 1.1 },
            'Exotic World': { pitch: 1.4, volume: 1.0 }
        };
        
        const config = soundMap[planetType] || { pitch: 1.0, volume: 1.0 };
        this.playSound('planet-discovery', config);
    }

    playMoonDiscovery() {
        this.playSound('moon-discovery');
    }

    playRareDiscovery() {
        this.playSound('rare-discovery');
    }

    // UI sound methods
    playMapToggle() {
        this.playSound('map-toggle');
    }

    playNotification() {
        this.playSound('notification');
    }

    // Ship movement sounds
    playThrusterStart() {
        this.playSound('thruster-start');
    }

    playBrake() {
        this.playSound('brake');
    }

    // Ambient sound management
    startAmbientSpace() {
        this.stopCurrentAmbient();
        const ambientControl = this.playOscillatorSound(
            this.getSoundConfig('ambient-space'), 
            { ambient: true, duration: -1 }
        );
        this.currentAmbient = ambientControl;
    }

    startAmbientCoasting() {
        this.stopCurrentAmbient();
        const ambientControl = this.playOscillatorSound(
            this.getSoundConfig('ambient-coasting'), 
            { ambient: true, duration: -1 }
        );
        this.currentAmbient = ambientControl;
    }

    stopCurrentAmbient() {
        if (this.currentAmbient && this.currentAmbient.oscillator) {
            try {
                this.currentAmbient.oscillator.stop();
                this.currentAmbient = null;
            } catch (error) {
                // Oscillator may already be stopped
                this.currentAmbient = null;
            }
        }
    }

    // Velocity-based ambient modulation
    updateAmbientForVelocity(velocity, isCoasting) {
        if (!this.initialized || this.muted) return;
        
        // Play ambient sound while cruising (any velocity > minimal threshold)
        const isMoving = velocity > 5; // Small threshold to avoid jitter when stationary
        
        if (isMoving && !this.currentAmbient) {
            // Start ambient when beginning to move
            this.startAmbientSpace();
            if (this.currentAmbient) this.currentAmbient.type = 'space';
        } else if (!isMoving && this.currentAmbient) {
            // Stop ambient when completely stationary
            this.stopCurrentAmbient();
        }
        
        // Modulate ambient based on velocity (subtle effect)
        if (this.currentAmbient && this.currentAmbient.oscillator) {
            const normalizedVelocity = Math.min(velocity / 150, 1); // 150 is max speed
            const baseFreq = isCoasting ? 40 : 60;
            const modulation = 1 + (normalizedVelocity * 0.2); // Up to 20% frequency increase
            
            try {
                this.currentAmbient.oscillator.frequency.value = baseFreq * modulation;
            } catch (error) {
                // Oscillator may be stopped
            }
        }
    }

    // Cleanup
    destroy() {
        this.stopCurrentAmbient();
        if (this.context) {
            this.context.close();
        }
    }
}

// Export for use in other modules
window.SoundManager = SoundManager;