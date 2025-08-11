// Audio settings interface
interface AudioSettings {
    muted: boolean;
}

// Sound configuration for procedural audio
interface SoundConfig {
    type: 'oscillator' | 'noise';
    frequency?: number;
    frequency2?: number;
    duration?: number;
    attack?: number;
    decay?: number;
    sustain?: number;
    release?: number;
    volume?: number;
    waveform?: OscillatorType;
    filterFreq?: number;
    filterQ?: number;
}

// Sound generation options
interface SoundOptions {
    volume?: number;
    pan?: number;
    delay?: number;
}

export class SoundManager {
    private context: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private ambientGain: GainNode | null = null;
    private effectsGain: GainNode | null = null;
    private sounds: Map<string, SoundConfig> = new Map();
    private currentAmbient: AudioBufferSourceNode | null = null;
    private initialized: boolean = false;
    private muted: boolean = false;
    
    constructor() {
        // Load mute preference from localStorage
        this.loadSettings();
        
        // Initialize audio context (requires user interaction in some browsers)
        this.initializeAudio();
    }

    private loadSettings(): void {
        try {
            const savedSettings = localStorage.getItem('astralSurveyor_audioSettings');
            if (savedSettings) {
                const settings: AudioSettings = JSON.parse(savedSettings);
                this.muted = settings.muted || false;
            }
        } catch (error) {
            console.warn('Failed to load audio settings:', error);
        }
    }

    private saveSettings(): void {
        try {
            const settings: AudioSettings = {
                muted: this.muted
            };
            localStorage.setItem('astralSurveyor_audioSettings', JSON.stringify(settings));
        } catch (error) {
            console.warn('Failed to save audio settings:', error);
        }
    }

    private async initializeAudio(): Promise<void> {
        try {
            // Create audio context
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            this.context = new AudioContextClass();
            
            // Create gain nodes for volume control
            this.masterGain = this.context.createGain();
            this.ambientGain = this.context.createGain();
            this.effectsGain = this.context.createGain();
            
            // Connect audio graph
            this.ambientGain.connect(this.masterGain);
            this.effectsGain.connect(this.masterGain);
            this.masterGain.connect(this.context.destination);
            
            // Set initial volumes
            this.masterGain.gain.setValueAtTime(0.5, this.context.currentTime);
            this.ambientGain.gain.setValueAtTime(0.3, this.context.currentTime);
            this.effectsGain.gain.setValueAtTime(0.7, this.context.currentTime);
            
            this.updateMasterVolume();
            this.initialized = true;
            
        } catch (error) {
            console.warn('Failed to initialize audio:', error);
            this.initialized = false;
        }
    }

    private updateMasterVolume(): void {
        if (this.masterGain && this.context) {
            const volume = this.muted ? 0 : 0.5;
            this.masterGain.gain.setValueAtTime(volume, this.context.currentTime);
        }
    }

    toggleMute(): boolean {
        this.muted = !this.muted;
        this.updateMasterVolume();
        this.saveSettings();
        return this.muted;
    }

    isMuted(): boolean {
        return this.muted;
    }

    isInitialized(): boolean {
        return this.initialized;
    }

    private getSoundConfig(name: string): SoundConfig | undefined {
        // Define sound configurations for different discovery types
        const configs: Record<string, SoundConfig> = {
            'star_discovery': {
                type: 'oscillator',
                frequency: 110,
                frequency2: 165,
                duration: 1.2,
                attack: 0.1,
                decay: 0.2,
                sustain: 0.3,
                release: 0.3,
                volume: 0.6,
                waveform: 'sine'
            },
            'planet_discovery': {
                type: 'oscillator', 
                frequency: 220,
                frequency2: 330,
                duration: 0.6,
                attack: 0.05,
                decay: 0.15,
                sustain: 0.4,
                release: 0.25,
                volume: 0.5,
                waveform: 'triangle'
            },
            'moon_discovery': {
                type: 'oscillator',
                frequency: 440,
                duration: 0.3,
                attack: 0.02,
                decay: 0.08,
                sustain: 0.1,
                release: 0.15,
                volume: 0.4,
                waveform: 'sine'
            },
            'nebula_discovery': {
                type: 'oscillator',
                frequency: 880,
                frequency2: 1320,  // Perfect fifth for harmonic sparkle
                duration: 1.0,
                attack: 0.15,      // Slow attack for ethereal build-up
                decay: 0.3,        // Gentle decay
                sustain: 0.2,      // Lower sustain for twinkly effect
                release: 0.4,      // Long release for ethereal fade
                volume: 0.45,
                waveform: 'triangle'  // Triangle wave for softer, warmer sparkle
            },
            'rare_discovery': {
                type: 'oscillator',
                frequency: 65,
                frequency2: 97,
                duration: 1.2,
                attack: 0.15,
                decay: 0.3,
                sustain: 0.4,
                release: 0.5,
                volume: 0.6,
                waveform: 'sine'
            },
            'map_toggle': {
                type: 'oscillator',
                frequency: 800,
                duration: 0.1,
                attack: 0.01,
                decay: 0.02,
                sustain: 0.1,
                release: 0.05,
                volume: 0.3,
                waveform: 'square'
            },
            'notification': {
                type: 'oscillator',
                frequency: 1000,
                duration: 0.15,
                attack: 0.01,
                decay: 0.05,
                sustain: 0.2,
                release: 0.08,
                volume: 0.4,
                waveform: 'sine'
            },
            'thruster_start': {
                type: 'noise',
                duration: 0.3,
                attack: 0.05,
                decay: 0.1,
                sustain: 0.2,
                release: 0.15,
                volume: 0.3,
                filterFreq: 2000,
                filterQ: 1
            },
            'brake': {
                type: 'noise',
                duration: 0.2,
                attack: 0.02,
                decay: 0.08,
                sustain: 0.1,
                release: 0.1,
                volume: 0.25,
                filterFreq: 1500,
                filterQ: 2
            }
        };

        return configs[name];
    }

    private playOscillatorSound(config: SoundConfig, options: SoundOptions = {}): void {
        if (!this.context || !this.effectsGain || this.muted) return;

        try {
            const now = this.context.currentTime;
            const duration = config.duration || 0.5;
            const attack = config.attack || 0.1;
            const decay = config.decay || 0.1;
            const sustain = config.sustain || 0.5;
            const release = config.release || 0.2;
            const volume = (options.volume || config.volume || 0.5);

            if (config.type === 'oscillator') {
                // Create oscillator
                const oscillator = this.context.createOscillator();
                const gainNode = this.context.createGain();
                
                oscillator.type = config.waveform || 'sine';
                oscillator.frequency.setValueAtTime(config.frequency || 440, now);
                
                // Handle frequency sweep for two-tone sounds
                if (config.frequency2) {
                    oscillator.frequency.exponentialRampToValueAtTime(config.frequency2, now + duration * 0.7);
                }
                
                // Set up ADSR envelope
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(volume, now + attack);
                gainNode.gain.linearRampToValueAtTime(volume * sustain, now + attack + decay);
                gainNode.gain.setValueAtTime(volume * sustain, now + duration - release);
                gainNode.gain.linearRampToValueAtTime(0, now + duration);
                
                // Connect and play
                oscillator.connect(gainNode);
                gainNode.connect(this.effectsGain);
                
                oscillator.start(now);
                oscillator.stop(now + duration);
                
            } else if (config.type === 'noise') {
                // Create noise buffer
                const bufferSize = this.context.sampleRate * duration;
                const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
                const data = buffer.getChannelData(0);
                
                // Fill with white noise
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                
                const source = this.context.createBufferSource();
                const gainNode = this.context.createGain();
                
                source.buffer = buffer;
                
                // Apply filter if specified
                if (config.filterFreq) {
                    const filter = this.context.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(config.filterFreq, now);
                    filter.Q.setValueAtTime(config.filterQ || 1, now);
                    
                    source.connect(filter);
                    filter.connect(gainNode);
                } else {
                    source.connect(gainNode);
                }
                
                // Set up ADSR envelope
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(volume, now + attack);
                gainNode.gain.linearRampToValueAtTime(volume * sustain, now + attack + decay);
                gainNode.gain.setValueAtTime(volume * sustain, now + duration - release);
                gainNode.gain.linearRampToValueAtTime(0, now + duration);
                
                gainNode.connect(this.effectsGain);
                
                source.start(now);
            }
            
        } catch (error) {
            console.warn('Failed to play sound:', error);
        }
    }

    // Public API methods for specific game sounds
    playStarDiscovery(starType: string = 'G-Type Star'): void {
        const config = this.getSoundConfig('star_discovery');
        if (config) {
            // Vary frequency based on star type
            const variations: Record<string, number> = {
                'G-Type Star': 1.0,
                'K-Type Star': 0.8,
                'M-Type Star': 0.6,
                'Red Giant': 0.4,
                'Blue Giant': 1.5,
                'White Dwarf': 1.8,
                'Neutron Star': 2.2
            };
            
            const multiplier = variations[starType] || 1.0;
            const modifiedConfig = {
                ...config,
                frequency: (config.frequency || 440) * multiplier,
                frequency2: config.frequency2 ? config.frequency2 * multiplier : undefined
            };
            
            this.playOscillatorSound(modifiedConfig);
        }
    }

    playPlanetDiscovery(planetType: string = 'Rocky Planet'): void {
        const config = this.getSoundConfig('planet_discovery');
        if (config) {
            // Vary tone based on planet type
            const variations: Record<string, number> = {
                'Rocky Planet': 1.0,
                'Gas Giant': 0.5,
                'Ice Giant': 0.7,
                'Volcanic World': 1.3,
                'Frozen World': 0.6,
                'Exotic World': 1.8
            };
            
            const multiplier = variations[planetType] || 1.0;
            const modifiedConfig = {
                ...config,
                frequency: (config.frequency || 220) * multiplier,
                frequency2: config.frequency2 ? config.frequency2 * multiplier : undefined
            };
            
            this.playOscillatorSound(modifiedConfig);
        }
    }

    playMoonDiscovery(): void {
        const config = this.getSoundConfig('moon_discovery');
        if (config) this.playOscillatorSound(config);
    }

    playNebulaDiscovery(nebulaType: string = 'emission'): void {
        const config = this.getSoundConfig('nebula_discovery');
        if (config) {
            // Vary sparkle based on nebula type for unique sonic identity
            const variations: Record<string, number> = {
                'emission': 1.0,      // Bright, warm sparkle
                'reflection': 1.2,    // Higher, more reflective sparkle  
                'planetary': 0.9,     // Slightly lower, more contained
                'dark': 0.7          // Muted, mysterious sparkle
            };
            
            const multiplier = variations[nebulaType] || 1.0;
            const modifiedConfig = {
                ...config,
                frequency: (config.frequency || 880) * multiplier,
                frequency2: config.frequency2 ? config.frequency2 * multiplier : undefined
            };
            
            this.playOscillatorSound(modifiedConfig);
        }
    }

    playRareDiscovery(): void {
        const config = this.getSoundConfig('rare_discovery');
        if (config) this.playOscillatorSound(config);
    }

    playMapToggle(): void {
        const config = this.getSoundConfig('map_toggle');
        if (config) this.playOscillatorSound(config);
    }

    playNotification(): void {
        const config = this.getSoundConfig('notification');
        if (config) this.playOscillatorSound(config);
    }

    playThrusterStart(): void {
        const config = this.getSoundConfig('thruster_start');
        if (config) this.playOscillatorSound(config);
    }

    playBrake(): void {
        const config = this.getSoundConfig('brake');
        if (config) this.playOscillatorSound(config);
    }

    dispose(): void {
        if (this.currentAmbient) {
            this.currentAmbient.stop();
            this.currentAmbient = null;
        }
        
        if (this.context) {
            this.context.close();
        }
    }
}