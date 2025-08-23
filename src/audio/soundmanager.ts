// Audio settings interface
interface AudioSettings {
    muted: boolean;
    masterVolume: number;
    ambientVolume: number;
    effectsVolume: number;
    masterMuted: boolean;
    ambientMuted: boolean;
    effectsMuted: boolean;
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
    private ambientLayers: Array<{
        oscillator: OscillatorNode;
        gain: GainNode;
        frequency: number;
        cycleTime: number;
        phase: number;
        targetVolume: number;
        currentVolume: number;
        fadeDirection: 'in' | 'out' | 'sustain';
        nextPhaseTime: number;
    }> = [];
    private ambientMasterGain: GainNode | null = null;
    private ambientUpdateInterval: number | null = null;
    
    // Melodic progression system
    private melodicState: {
        nextSequenceTime: number;
        currentSequence: Array<{
            oscillator: OscillatorNode;
            gain: GainNode;
            frequency: number;
            startTime: number;
            duration: number;
        }> | null;
        isPlaying: boolean;
    } = {
        nextSequenceTime: 0,
        currentSequence: null,
        isPlaying: false
    };
    private initialized: boolean = false;
    private muted: boolean = false;
    
    // Individual volume and mute controls
    private masterVolume: number = 0.8;
    private ambientVolume: number = 0.6;
    private effectsVolume: number = 0.7;
    private masterMuted: boolean = false;
    private ambientMuted: boolean = false;
    private effectsMuted: boolean = false;
    
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
                this.masterVolume = settings.masterVolume ?? 0.8;
                this.ambientVolume = settings.ambientVolume ?? 0.6;
                this.effectsVolume = settings.effectsVolume ?? 0.7;
                this.masterMuted = settings.masterMuted ?? false;
                this.ambientMuted = settings.ambientMuted ?? false;
                this.effectsMuted = settings.effectsMuted ?? false;
            }
        } catch (error) {
            console.warn('Failed to load audio settings:', error);
        }
    }

    private saveSettings(): void {
        try {
            const settings: AudioSettings = {
                muted: this.muted,
                masterVolume: this.masterVolume,
                ambientVolume: this.ambientVolume,
                effectsVolume: this.effectsVolume,
                masterMuted: this.masterMuted,
                ambientMuted: this.ambientMuted,
                effectsMuted: this.effectsMuted
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
            
            // Set initial volumes from stored settings
            this.updateAllVolumes();
            this.initialized = true;
            
        } catch (error) {
            console.warn('Failed to initialize audio:', error);
            this.initialized = false;
        }
    }

    private updateMasterVolume(): void {
        if (this.masterGain && this.context) {
            const volume = (this.muted || this.masterMuted) ? 0 : this.masterVolume;
            console.log('🔊 AUDIO DEBUG: updateMasterVolume - muted:', this.muted, 'masterMuted:', this.masterMuted, 'volume:', this.masterVolume, '→ final:', volume);
            this.masterGain.gain.setValueAtTime(volume, this.context.currentTime);
            console.log('🔊 AUDIO DEBUG: Master gain node updated to:', volume, 'at time:', this.context.currentTime);
        } else {
            console.warn('🔊 AUDIO DEBUG: updateMasterVolume called but masterGain or context is null');
        }
    }

    private updateAmbientVolume(): void {
        if (this.ambientGain && this.context) {
            const volume = (this.muted || this.masterMuted || this.ambientMuted) ? 0 : this.ambientVolume;
            console.log('🔊 AUDIO DEBUG: updateAmbientVolume - muted:', this.muted, 'masterMuted:', this.masterMuted, 'ambientMuted:', this.ambientMuted, 'volume:', this.ambientVolume, '→ final:', volume);
            this.ambientGain.gain.setValueAtTime(volume, this.context.currentTime);
            console.log('🔊 AUDIO DEBUG: Ambient gain node updated to:', volume);
            console.log('🔊 AUDIO DEBUG: Actual ambientGain.gain.value:', this.ambientGain.gain.value);
            console.log('🔊 AUDIO DEBUG: Context currentTime:', this.context.currentTime);
            // Force immediate value (bypass Web Audio scheduling)
            this.ambientGain.gain.value = volume;
            console.log('🔊 AUDIO DEBUG: Forced ambientGain.gain.value to:', this.ambientGain.gain.value);
            console.log('🔊 AUDIO DEBUG: ambientGain node ID:', this.ambientGain);
            console.log('🔊 AUDIO DEBUG: ambientMasterGain node ID:', this.ambientMasterGain);
            console.log('🔊 AUDIO DEBUG: context ID:', this.context);
        } else {
            console.warn('🔊 AUDIO DEBUG: updateAmbientVolume called but ambientGain or context is null');
        }
    }

    private updateEffectsVolume(): void {
        if (this.effectsGain && this.context) {
            const volume = (this.muted || this.masterMuted || this.effectsMuted) ? 0 : this.effectsVolume;
            console.log('🔊 AUDIO DEBUG: updateEffectsVolume - muted:', this.muted, 'masterMuted:', this.masterMuted, 'effectsMuted:', this.effectsMuted, 'volume:', this.effectsVolume, '→ final:', volume);
            this.effectsGain.gain.setValueAtTime(volume, this.context.currentTime);
            console.log('🔊 AUDIO DEBUG: Effects gain node updated to:', volume);
        } else {
            console.warn('🔊 AUDIO DEBUG: updateEffectsVolume called but effectsGain or context is null');
        }
    }

    private updateAllVolumes(): void {
        this.updateMasterVolume();
        this.updateAmbientVolume();
        this.updateEffectsVolume();
    }

    toggleMute(): boolean {
        this.muted = !this.muted;
        this.updateAllVolumes(); // Global mute affects all channels
        this.saveSettings();
        return this.muted;
    }

    isMuted(): boolean {
        return this.muted;
    }

    // Individual volume controls
    setMasterVolume(volume: number): void {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        console.log('🔊 AUDIO DEBUG: setMasterVolume called:', volume, '→', clampedVolume, 'old:', this.masterVolume);
        this.masterVolume = clampedVolume;
        this.updateMasterVolume();
        this.saveSettings();
    }

    setAmbientVolume(volume: number): void {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        console.log('🔊 AUDIO DEBUG: setAmbientVolume called:', volume, '→', clampedVolume, 'old:', this.ambientVolume);
        this.ambientVolume = clampedVolume;
        this.updateAmbientVolume();
        this.saveSettings();
    }

    setEffectsVolume(volume: number): void {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        console.log('🔊 AUDIO DEBUG: setEffectsVolume called:', volume, '→', clampedVolume, 'old:', this.effectsVolume);
        this.effectsVolume = clampedVolume;
        this.updateEffectsVolume();
        this.saveSettings();
    }

    // Discovery volume is mapped to effects volume
    setDiscoveryVolume(volume: number): void {
        this.setEffectsVolume(volume);
    }

    getMasterVolume(): number {
        return this.masterVolume;
    }

    getAmbientVolume(): number {
        return this.ambientVolume;
    }

    getEffectsVolume(): number {
        return this.effectsVolume;
    }

    getDiscoveryVolume(): number {
        return this.effectsVolume;
    }

    // Individual mute controls
    setMasterMuted(muted: boolean): void {
        console.log('🔊 AUDIO DEBUG: setMasterMuted called:', muted, 'old:', this.masterMuted);
        this.masterMuted = muted;
        this.updateAllVolumes(); // Master mute affects all channels
        this.saveSettings();
    }

    setAmbientMuted(muted: boolean): void {
        console.log('🔊 AUDIO DEBUG: setAmbientMuted called:', muted, 'old:', this.ambientMuted);
        this.ambientMuted = muted;
        
        // ELEGANT SOLUTION: Use gain nodes for instant muting (no stopping/starting)
        this.updateAmbientVolume();
        this.saveSettings();
    }

    setEffectsMuted(muted: boolean): void {
        console.log('🔊 AUDIO DEBUG: setEffectsMuted called:', muted, 'old:', this.effectsMuted);
        this.effectsMuted = muted;
        this.updateEffectsVolume();
        this.saveSettings();
    }

    // Discovery mute is mapped to effects mute
    setDiscoveryMuted(muted: boolean): void {
        this.setEffectsMuted(muted);
    }

    isMasterMuted(): boolean {
        console.log('🔊 AUDIO DEBUG: isMasterMuted called, returning:', this.masterMuted);
        return this.masterMuted;
    }

    isAmbientMuted(): boolean {
        console.log('🔊 AUDIO DEBUG: isAmbientMuted called, returning:', this.ambientMuted);
        return this.ambientMuted;
    }

    isEffectsMuted(): boolean {
        console.log('🔊 AUDIO DEBUG: isEffectsMuted called, returning:', this.effectsMuted);
        return this.effectsMuted;
    }

    isDiscoveryMuted(): boolean {
        console.log('🔊 AUDIO DEBUG: isDiscoveryMuted called, returning:', this.effectsMuted);
        return this.effectsMuted;
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

    /**
     * Start ethereal space ambient - inspired by SATRN's layered soundscape
     * Creates multiple evolving tonal layers that fade in and out over time
     */
    async startSpaceDrone(): Promise<void> {
        console.log('🔊 AUDIO DEBUG: startSpaceDrone called');
        console.log('🔊 AUDIO DEBUG: - context exists:', !!this.context);
        console.log('🔊 AUDIO DEBUG: - ambientGain exists:', !!this.ambientGain);
        console.log('🔊 AUDIO DEBUG: - muted:', this.muted);
        console.log('🔊 AUDIO DEBUG: - masterMuted:', this.masterMuted);
        console.log('🔊 AUDIO DEBUG: - ambientMuted:', this.ambientMuted);
        
        if (!this.context || !this.ambientGain || this.muted) {
            console.warn('🔊 AUDIO DEBUG: startSpaceDrone early return - missing context/gain or muted');
            return;
        }
        
        // Resume audio context if suspended (browser autoplay policy)
        if (this.context.state === 'suspended') {
            console.log('🔊 AUDIO DEBUG: Audio context suspended, attempting resume...');
            try {
                await this.context.resume();
                console.log('🔊 AUDIO DEBUG: Audio context resumed for space drone, new state:', this.context.state);
            } catch (error) {
                console.error('🔊 AUDIO DEBUG: Failed to resume audio context:', error);
                return;
            }
        } else {
            console.log('🔊 AUDIO DEBUG: Audio context already running, state:', this.context.state);
        }
        
        // Stop any existing ambient layers first
        this.stopSpaceDrone();
        
        try {
            const now = this.context.currentTime;
            
            // Create master gain for all ambient layers
            this.ambientMasterGain = this.context.createGain();
            this.ambientMasterGain.gain.setValueAtTime(0.6, now); // Overall ambient volume - moderate level
            console.log('🔊 AUDIO DEBUG: SpaceDrone - Created ambientMasterGain:', this.ambientMasterGain, 'connecting to ambientGain:', this.ambientGain);
            this.ambientMasterGain.connect(this.ambientGain);
            console.log('🔊 AUDIO DEBUG: SpaceDrone - Connection established, ambientGain current value:', this.ambientGain.gain.value);
            
            // Define ethereal frequency layers (harmonically related for pleasant sound)
            const frequencies = [
                { freq: 65.4, cycle: 45, phase: 0 },      // C2 - deep foundation
                { freq: 130.8, cycle: 38, phase: 12 },   // C3 - mid foundation  
                { freq: 196.0, cycle: 52, phase: 25 },   // G3 - perfect fifth harmony
                { freq: 261.6, cycle: 41, phase: 38 },   // C4 - octave brightness
                { freq: 392.0, cycle: 47, phase: 8 },    // G4 - higher harmonic
                { freq: 523.3, cycle: 55, phase: 31 }    // C5 - ethereal brightness
            ];
            
            // Create each ambient layer
            for (let i = 0; i < frequencies.length; i++) {
                const config = frequencies[i];
                const oscillator = this.context.createOscillator();
                const gain = this.context.createGain();
                
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(config.freq, now);
                
                // Start with silence, will fade in/out organically
                gain.gain.setValueAtTime(0, now);
                
                // Connect audio path
                oscillator.connect(gain);
                gain.connect(this.ambientMasterGain);
                
                // Start oscillator
                oscillator.start(now);
                
                // Create layer data for evolution
                const layer = {
                    oscillator,
                    gain,
                    frequency: config.freq,
                    cycleTime: config.cycle,
                    phase: config.phase,
                    targetVolume: 0.15 - (i * 0.02), // Higher layers quieter
                    currentVolume: 0,
                    fadeDirection: 'in' as 'in' | 'out' | 'sustain',
                    nextPhaseTime: now + config.phase
                };
                
                this.ambientLayers.push(layer);
            }
            
            // Initialize melodic system
            this.melodicState.nextSequenceTime = now + 15 + Math.random() * 15; // First sequence in 15-30 seconds
            this.melodicState.currentSequence = null;
            this.melodicState.isPlaying = false;
            
            // Start the evolution update loop (handles both ambient and melodic)
            this.startAmbientEvolution();
            
            console.log('Space drone started - atmospheric background audio with melodic progressions');
            
        } catch (error) {
            console.warn('Failed to start space drone:', error);
            this.stopSpaceDrone();
        }
    }

    /**
     * Start the ambient evolution system - handles organic fade in/out of layers
     */
    private startAmbientEvolution(): void {
        if (this.ambientUpdateInterval) {
            clearInterval(this.ambientUpdateInterval);
        }
        
        const updateEvolution = () => {
            if (!this.context || this.ambientLayers.length === 0) return;
            
            const now = this.context.currentTime;
            
            for (const layer of this.ambientLayers) {
                // Check if it's time for this layer to change phase
                if (now >= layer.nextPhaseTime) {
                    this.evolveLayer(layer, now);
                }
                
                // Gradually adjust volume towards target
                this.updateLayerVolume(layer, now);
            }
            
            // Handle melodic progressions
            this.updateMelodicSequences(now);
        };
        
        // Update every 100ms for smooth evolution
        this.ambientUpdateInterval = window.setInterval(updateEvolution, 100);
    }

    /**
     * Evolve a layer to its next phase (fade in, sustain, fade out)
     */
    private evolveLayer(layer: any, currentTime: number): void {
        const fadeTime = 8 + Math.random() * 12; // 8-20 second fades for organic feel
        const sustainTime = 15 + Math.random() * 25; // 15-40 second sustains
        const silenceTime = 5 + Math.random() * 15; // 5-20 second silence
        
        switch (layer.fadeDirection) {
            case 'in':
                // Start fading in
                const fadeInTarget = layer.targetVolume * (0.7 + Math.random() * 0.6); // Vary intensity
                layer.currentVolume = fadeInTarget;
                layer.gain.gain.linearRampToValueAtTime(fadeInTarget, currentTime + fadeTime);
                layer.fadeDirection = 'sustain';
                layer.nextPhaseTime = currentTime + fadeTime + sustainTime;
                break;
                
            case 'sustain':
                // Start fading out
                layer.gain.gain.linearRampToValueAtTime(0, currentTime + fadeTime);
                layer.currentVolume = 0;
                layer.fadeDirection = 'out';
                layer.nextPhaseTime = currentTime + fadeTime + silenceTime;
                break;
                
            case 'out':
                // Start fading in again
                layer.fadeDirection = 'in';
                layer.nextPhaseTime = currentTime + (Math.random() * 3); // Small random delay
                break;
        }
    }

    /**
     * Smooth volume updates for organic evolution
     */
    private updateLayerVolume(layer: any, currentTime: number): void {
        // This method can add micro-variations or smooth interpolation if needed
        // Currently the linearRampToValueAtTime handles the volume changes
    }

    /**
     * Update melodic sequences - handles SATRN-inspired rising progressions
     */
    private updateMelodicSequences(currentTime: number): void {
        if (!this.context || !this.ambientMasterGain) return;
        
        // Check if it's time to start a new melodic sequence
        if (currentTime >= this.melodicState.nextSequenceTime && !this.melodicState.isPlaying) {
            this.startMelodicSequence(currentTime);
        }
        
        // Clean up finished sequences
        if (this.melodicState.currentSequence) {
            const activeNotes = this.melodicState.currentSequence.filter(note => 
                currentTime < note.startTime + note.duration + 0.5 // 0.5s fade buffer
            );
            
            if (activeNotes.length === 0) {
                this.melodicState.currentSequence = null;
                this.melodicState.isPlaying = false;
                // Schedule next sequence in 15-30 seconds
                this.melodicState.nextSequenceTime = currentTime + 15 + Math.random() * 15;
            }
        }
    }

    /**
     * Start a new melodic sequence - creates rising note progression
     */
    private startMelodicSequence(currentTime: number): void {
        if (!this.context || !this.ambientMasterGain) return;
        
        // Define melodic progressions (frequencies in Hz) - lowered highest notes
        const progressions = [
            // Simple ascent: C4→D4→E4→F4
            [261.6, 293.7, 329.6, 349.2],
            // Pentatonic rise: C4→D4→G4→A4  
            [261.6, 293.7, 392.0, 440.0],
            // Mid ethereal: C4→D4→G4→C5 (lowered from C6 to C5)
            [261.6, 293.7, 392.0, 523.3],
            // Gentle rise: G3→C4→E4→G4
            [196.0, 261.6, 329.6, 392.0],
            // Warm ascent: F3→G3→C4→D4 (new, stays in comfortable range)
            [174.6, 196.0, 261.6, 293.7]
        ];
        
        // Randomly select a progression
        const selectedProgression = progressions[Math.floor(Math.random() * progressions.length)];
        
        // Create sequence with staggered timing
        const sequence = [];
        let noteStartTime = currentTime + 0.2; // Small initial delay
        
        for (let i = 0; i < selectedProgression.length; i++) {
            const frequency = selectedProgression[i];
            const duration = 3 + Math.random() * 3; // 3-6 seconds per note - longer for more droning
            const fadeInTime = 1.2 + Math.random() * 0.8; // 1.2-2 second gentle fade in
            const fadeOutTime = 1.5 + Math.random() * 1; // 1.5-2.5 second gentle fade out
            
            try {
                const oscillator = this.context.createOscillator();
                const gain = this.context.createGain();
                
                // Configure oscillator for more ethereal quality
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(frequency, noteStartTime);
                
                // Add subtle frequency drift for organic droning feel
                const driftAmount = frequency * 0.002; // Very subtle drift (0.2%)
                oscillator.frequency.linearRampToValueAtTime(
                    frequency + driftAmount * (Math.random() - 0.5) * 2, 
                    noteStartTime + duration
                );
                
                // Configure envelope with much longer, more gradual fades
                const peakVolume = 0.25 + Math.random() * 0.15; // 0.25-0.4 with variation
                gain.gain.setValueAtTime(0, noteStartTime);
                gain.gain.linearRampToValueAtTime(peakVolume, noteStartTime + fadeInTime); // Slow fade in
                
                // Sustain phase with slight volume breathing
                const sustainStart = noteStartTime + fadeInTime;
                const sustainEnd = noteStartTime + duration - fadeOutTime;
                gain.gain.setValueAtTime(peakVolume, sustainStart);
                
                // Add subtle volume breathing during sustain
                if (sustainEnd > sustainStart) {
                    const midSustain = sustainStart + (sustainEnd - sustainStart) * 0.5;
                    const breatheVolume = peakVolume * (0.85 + Math.random() * 0.1); // Subtle variation
                    gain.gain.linearRampToValueAtTime(breatheVolume, midSustain);
                    gain.gain.linearRampToValueAtTime(peakVolume, sustainEnd);
                }
                
                // Very gradual fade out - no sharp cutoff
                gain.gain.linearRampToValueAtTime(0, noteStartTime + duration);
                
                // Connect and start
                oscillator.connect(gain);
                gain.connect(this.ambientMasterGain);
                oscillator.start(noteStartTime);
                oscillator.stop(noteStartTime + duration + 0.1); // Small buffer to avoid clicks
                
                sequence.push({
                    oscillator,
                    gain,
                    frequency,
                    startTime: noteStartTime,
                    duration: duration + 0.1
                });
                
                // Next note starts with more substantial overlap for droning blend
                noteStartTime += duration * 0.5; // 50% overlap between notes for more droning effect
                
            } catch (error) {
                console.warn('Failed to create melodic note:', error);
            }
        }
        
        this.melodicState.currentSequence = sequence;
        this.melodicState.isPlaying = true;
        
        console.log(`Started melodic sequence with ${sequence.length} notes`);
    }

    /**
     * Stop the atmospheric space drone and all layers
     */
    stopSpaceDrone(): void {
        try {
            // Stop evolution update loop
            if (this.ambientUpdateInterval) {
                clearInterval(this.ambientUpdateInterval);
                this.ambientUpdateInterval = null;
            }
            
            // Stop all ambient layers
            for (const layer of this.ambientLayers) {
                try {
                    layer.oscillator.stop();
                } catch (error) {
                    // Oscillator might already be stopped, ignore error
                }
            }
            
            // Stop any active melodic sequences
            if (this.melodicState.currentSequence) {
                for (const note of this.melodicState.currentSequence) {
                    try {
                        note.oscillator.stop();
                    } catch (error) {
                        // Oscillator might already be stopped, ignore error
                    }
                }
            }
            
            // Clear arrays and reset state
            this.ambientLayers = [];
            this.melodicState.currentSequence = null;
            this.melodicState.isPlaying = false;
            this.melodicState.nextSequenceTime = 0;
            
            // Clean up master gain
            this.ambientMasterGain = null;
            
        } catch (error) {
            console.warn('Error stopping space drone:', error);
        }
    }

    /**
     * Check if space drone is currently playing
     */
    isSpaceDronePlaying(): boolean {
        const isPlaying = this.ambientLayers.length > 0 && this.ambientUpdateInterval !== null;
        console.log('🔊 AUDIO DEBUG: isSpaceDronePlaying called, result:', isPlaying, 'layers:', this.ambientLayers.length, 'interval:', !!this.ambientUpdateInterval);
        return isPlaying;
    }

    /**
     * Resume audio context if suspended - call on user interaction
     */
    async resumeAudioContext(): Promise<boolean> {
        console.log('🔊 AUDIO DEBUG: resumeAudioContext called, context state:', this.context?.state);
        if (!this.context) {
            console.warn('🔊 AUDIO DEBUG: No audio context available');
            return false;
        }
        
        if (this.context.state === 'suspended') {
            try {
                console.log('🔊 AUDIO DEBUG: Attempting to resume suspended audio context...');
                await this.context.resume();
                console.log('🔊 AUDIO DEBUG: Audio context resumed successfully! New state:', this.context.state);
                return true;
            } catch (error) {
                console.error('🔊 AUDIO DEBUG: Failed to resume audio context:', error.message);
                console.error('🔊 AUDIO DEBUG: Error details:', error);
                return false;
            }
        }
        console.log('🔊 AUDIO DEBUG: Audio context already running, state:', this.context.state);
        return true; // Already running
    }

    /**
     * Get audio context state for debugging
     */
    getAudioContextState(): string {
        console.log('🔊 AUDIO DEBUG: getAudioContextState called, state:', this.context?.state || 'no-context');
        return this.context?.state || 'no-context';
    }


    // Removed problematic volume control methods - let's not interfere with existing audio system

    dispose(): void {
        if (this.currentAmbient) {
            this.currentAmbient.stop();
            this.currentAmbient = null;
        }
        
        // Clean up space drone
        this.stopSpaceDrone();
        
        if (this.context) {
            this.context.close();
        }
    }
}