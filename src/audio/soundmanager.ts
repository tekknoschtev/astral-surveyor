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
    reverbTime?: number;
    reverbDecay?: number;
    reverbWetness?: number;
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
                frequency: 98,    // Slightly lower for warmer tone
                frequency2: 147,  // Slightly lower for warmer harmony
                duration: 2.0,    // Extended duration for reverb tail
                attack: 0.3,      // Soft, gentle onset
                decay: 0.4,       // Gradual decay
                sustain: 0.3,
                release: 0.8,     // Long, soft release
                volume: 0.5,      // Slightly quieter
                waveform: 'sine', // Pure, soft sine wave
                reverbTime: 2.0,  // 2-second reverb tail
                reverbDecay: 2.5, // Moderate decay rate
                reverbWetness: 0.4 // 40% reverb mix
            },
            'planet_discovery': {
                type: 'oscillator', 
                frequency: 196,   // Lower for warmer tone
                frequency2: 294,  // Lower harmony
                duration: 1.5,    // Extended duration
                attack: 0.2,      // Soft onset
                decay: 0.3,       // Gentle decay
                sustain: 0.4,
                release: 0.6,     // Longer release
                volume: 0.45,     // Slightly quieter
                waveform: 'sine', // Softer sine instead of triangle
                reverbTime: 1.5,  // 1.5-second reverb
                reverbDecay: 2.0,
                reverbWetness: 0.35
            },
            'moon_discovery': {
                type: 'oscillator',
                frequency: 392,   // Lower, softer
                duration: 0.8,    // Extended duration
                attack: 0.1,      // Softer onset
                decay: 0.2,       // Gentle decay
                sustain: 0.2,
                release: 0.4,     // Longer, gentle release
                volume: 0.35,     // Quieter
                waveform: 'sine',
                reverbTime: 1.0,  // 1-second reverb
                reverbDecay: 1.8,
                reverbWetness: 0.3
            },
            'nebula_discovery': {
                type: 'oscillator',
                frequency: 784,    // Slightly lower for softer sparkle
                frequency2: 1176,  // Maintain harmonic ratio but lower
                duration: 1.8,     // Extended for reverb tail
                attack: 0.25,      // Even slower ethereal build-up
                decay: 0.4,        // Gentle decay
                sustain: 0.2,      // Lower sustain for twinkly effect
                release: 0.7,      // Longer ethereal fade
                volume: 0.4,       // Slightly quieter
                waveform: 'sine',  // Pure sine for softest sparkle
                reverbTime: 2.5,   // Long cosmic reverb
                reverbDecay: 3.0,  // Very ethereal decay
                reverbWetness: 0.5 // High reverb mix for cosmic effect
            },
            'rare_discovery': {
                type: 'oscillator',
                frequency: 58,     // Deeper, more mysterious
                frequency2: 87,    // Maintain ratio but deeper
                duration: 2.5,     // Extended for epic feel
                attack: 0.4,       // Slow, majestic onset
                decay: 0.5,        // Gradual decay
                sustain: 0.4,
                release: 1.2,      // Very long, majestic release
                volume: 0.5,       // Slightly quieter
                waveform: 'sine',
                reverbTime: 3.0,   // Long, majestic reverb
                reverbDecay: 3.5,  // Very slow decay for rarity
                reverbWetness: 0.6 // High reverb for cosmic grandeur
            },
            'wormhole_discovery': {
                type: 'oscillator',
                frequency: 49,        // Even deeper, more mysterious
                frequency2: 98,       // Maintain octave relationship
                duration: 3.0,        // Extended for reverb tail
                attack: 0.5,          // Very slow, mysterious emergence
                decay: 0.6,           // Extended decay for ethereal quality
                sustain: 0.3,         // Sustained presence
                release: 1.5,         // Extremely long haunting fade
                volume: 0.6,          // Slightly quieter but present
                waveform: 'sine',     // Softer sine instead of harsh sawtooth
                filterFreq: 150,      // Lower filter for even softer tone
                filterQ: 1.0,         // Gentler filtering
                reverbTime: 4.0,      // Very long cosmic reverb
                reverbDecay: 4.0,     // Ultra-slow decay for cosmic mystery
                reverbWetness: 0.7    // High reverb for otherworldly effect
            },
            'wormhole_traversal': {
                type: 'oscillator',
                frequency: 72,        // Lower for softer dimensional shift
                frequency2: 108,      // Maintain perfect fifth relationship
                duration: 2.0,        // Extended duration for reverb
                attack: 0.2,          // Softer onset for gentler shift
                decay: 0.3,           // Longer decay
                sustain: 0.5,         // Sustained transition
                release: 0.8,         // Longer, softer landing
                volume: 0.55,         // Quieter
                waveform: 'sine',     // Softer sine wave
                filterFreq: 300,      // Lower filter for softer tone
                filterQ: 1.2,         // Gentler resonance
                reverbTime: 2.0,      // Reverb for spatial sense
                reverbDecay: 2.5,
                reverbWetness: 0.4
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

    private createReverbEffect(reverbTime: number, reverbDecay: number): AudioNode | null {
        if (!this.context) return null;

        try {
            // Create a simple algorithmic reverb using multiple delay lines
            const convolver = this.context.createConvolver();
            
            // Create impulse response buffer for reverb
            const sampleRate = this.context.sampleRate;
            const length = sampleRate * reverbTime;
            const impulse = this.context.createBuffer(2, length, sampleRate);
            
            // Generate reverb impulse response
            for (let channel = 0; channel < 2; channel++) {
                const channelData = impulse.getChannelData(channel);
                for (let i = 0; i < length; i++) {
                    // Create exponentially decaying noise for reverb tail
                    const decay = Math.pow(1 - (i / length), reverbDecay);
                    channelData[i] = (Math.random() * 2 - 1) * decay;
                }
            }
            
            convolver.buffer = impulse;
            return convolver;
        } catch (error) {
            console.warn('Failed to create reverb effect:', error);
            return null;
        }
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
                
                // Apply filter if specified
                let outputNode: AudioNode = gainNode;
                if (config.filterFreq) {
                    const filter = this.context.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(config.filterFreq, now);
                    if (config.filterQ) {
                        filter.Q.setValueAtTime(config.filterQ, now);
                    }
                    gainNode.connect(filter);
                    outputNode = filter;
                }
                
                // Apply reverb if specified
                if (config.reverbTime && config.reverbTime > 0) {
                    const reverbEffect = this.createReverbEffect(
                        config.reverbTime, 
                        config.reverbDecay || 2.0
                    );
                    const dryGain = this.context.createGain();
                    const wetGain = this.context.createGain();
                    const mixGain = this.context.createGain();
                    
                    if (reverbEffect) {
                        const wetness = config.reverbWetness || 0.3;
                        
                        // Set dry/wet mix levels
                        dryGain.gain.setValueAtTime(1 - wetness, now);
                        wetGain.gain.setValueAtTime(wetness, now);
                        
                        // Connect dry signal
                        outputNode.connect(dryGain);
                        dryGain.connect(mixGain);
                        
                        // Connect wet signal through reverb
                        outputNode.connect(reverbEffect);
                        reverbEffect.connect(wetGain);
                        wetGain.connect(mixGain);
                        
                        outputNode = mixGain;
                    }
                }
                
                // Connect and play
                oscillator.connect(gainNode);
                outputNode.connect(this.effectsGain);
                
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

    playWormholeDiscovery(): void {
        const config = this.getSoundConfig('wormhole_discovery');
        if (config) this.playOscillatorSound(config);
    }

    playWormholeTraversal(): void {
        const config = this.getSoundConfig('wormhole_traversal');
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