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
            this.masterGain.gain.setValueAtTime(volume, this.context.currentTime);
        } else {
            // Master gain or context is null
        }
    }

    private updateAmbientVolume(): void {
        if (this.ambientGain && this.context) {
            const volume = (this.muted || this.masterMuted || this.ambientMuted) ? 0 : this.ambientVolume;
            this.ambientGain.gain.setValueAtTime(volume, this.context.currentTime);
            // Force immediate value (bypass Web Audio scheduling)
            this.ambientGain.gain.value = volume;
        } else {
            // Ambient gain or context is null
        }
    }

    private updateEffectsVolume(): void {
        if (this.effectsGain && this.context) {
            const volume = (this.muted || this.masterMuted || this.effectsMuted) ? 0 : this.effectsVolume;
            this.effectsGain.gain.setValueAtTime(volume, this.context.currentTime);
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
        this.masterVolume = clampedVolume;
        this.updateMasterVolume();
        this.saveSettings();
    }

    setAmbientVolume(volume: number): void {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        this.ambientVolume = clampedVolume;
        this.updateAmbientVolume();
        this.saveSettings();
    }

    setEffectsVolume(volume: number): void {
        const clampedVolume = Math.max(0, Math.min(1, volume));
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
        this.masterMuted = muted;
        this.updateAllVolumes(); // Master mute affects all channels
        this.saveSettings();
    }

    setAmbientMuted(muted: boolean): void {
        this.ambientMuted = muted;
        
        // ELEGANT SOLUTION: Use gain nodes for instant muting (no stopping/starting)
        this.updateAmbientVolume();
        this.saveSettings();
    }

    setEffectsMuted(muted: boolean): void {
        this.effectsMuted = muted;
        this.updateEffectsVolume();
        this.saveSettings();
    }

    // Discovery mute is mapped to effects mute
    setDiscoveryMuted(muted: boolean): void {
        this.setEffectsMuted(muted);
    }

    isMasterMuted(): boolean {
        return this.masterMuted;
    }

    isAmbientMuted(): boolean {
        return this.ambientMuted;
    }

    isEffectsMuted(): boolean {
        return this.effectsMuted;
    }

    isDiscoveryMuted(): boolean {
        return this.effectsMuted;
    }

    isInitialized(): boolean {
        return this.initialized;
    }

    private getSoundConfig(name: string): SoundConfig | undefined {
        // HARMONIC DISCOVERY SOUND SYSTEM
        // Base frequencies derived from harmonic series and space drone tones for coherent integration
        // Designed around calm, meaningful discovery experiences with subtle object-type variations
        
        const configs: Record<string, SoundConfig> = {
            // === STAR DISCOVERIES === 
            // Pure sustained tones with volume breathing - like wine glass resonance
            // Mid-low frequency for clarity above ambient bass layers
            'star_discovery': {
                type: 'oscillator',
                frequency: 110,       // Clear fundamental tone (A2) - above ambient bass
                duration: 3.0,        // Extended for wine glass-like resonance
                attack: 0.8,          // Very slow, gentle emergence
                decay: 0.2,           // Quick to sustain for pure tone clarity
                sustain: 0.75,        // Stronger sustained presence for clarity
                release: 1.5,         // Long, gentle fade like glass resonance
                volume: 0.55,         // Increased volume for prominence
                waveform: 'sine',     // Pure sine wave for glass-like quality
                reverbTime: 2.8,      // Slightly less reverb for clarity
                reverbDecay: 3.0,     // Controlled resonant decay
                reverbWetness: 0.45   // Balanced spatial presence for clarity
            },

            // === PLANET DISCOVERIES ===
            // Pure sustained planetary tones with gentle volume breathing
            // Clear mid-range frequencies avoiding ambient layer overlap
            'planet_discovery': {
                type: 'oscillator',
                frequency: 220,       // Clear planetary tone (A3) - between ambient layers
                duration: 2.5,        // Extended for sustained resonance
                attack: 0.6,          // Gentle, welcoming emergence
                decay: 0.15,          // Quick to pure sustain for clarity
                sustain: 0.8,         // Stronger, stable planetary presence
                release: 1.2,         // Warm, lingering planetary afterglow
                volume: 0.5,          // Increased volume for prominence
                waveform: 'sine',     // Pure sine for glass-like quality
                reverbTime: 2.0,      // Slightly less reverb for clarity
                reverbDecay: 2.3,     // Controlled, stable decay
                reverbWetness: 0.4    // Balanced spatial presence for clarity
            },

            // === MOON DISCOVERIES ===
            // Pure ethereal tones for smaller celestial companions
            // Higher register with delicate volume breathing
            'moon_discovery': {
                type: 'oscillator',
                frequency: 329.6,     // Pure lunar tone (E4)
                duration: 1.8,        // Extended for gentle resonance
                attack: 0.4,          // Gentle, ethereal emergence  
                decay: 0.15,          // Quick to delicate sustain
                sustain: 0.45,        // Subtle, sustained lunar presence
                release: 0.8,         // Gentle, fading lunar glow
                volume: 0.28,         // Delicate, unobtrusive
                waveform: 'sine',     // Pure, crystalline tone
                reverbTime: 2.0,      // Intimate lunar reverb
                reverbDecay: 2.2,     // Light, floating decay
                reverbWetness: 0.4    // Ethereal spatial presence
            },

            // === NEBULA DISCOVERIES ===
            // Pure crystalline tones for cosmic gas clouds and stellar nurseries
            // High register with ethereal volume breathing
            'nebula_discovery': {
                type: 'oscillator',
                frequency: 659.3,     // Pure crystalline tone (E5)
                duration: 2.8,        // Extended for ethereal beauty
                attack: 0.7,          // Slow, dreamy emergence
                decay: 0.25,          // Quick to ethereal sustain
                sustain: 0.4,         // Gentle, sustained cosmic presence
                release: 1.3,         // Long, ethereal fade into space
                volume: 0.32,         // Delicate, beautiful
                waveform: 'sine',     // Pure, crystalline wine glass tone
                reverbTime: 3.5,      // Long, cosmic reverb
                reverbDecay: 3.8,     // Extended ethereal decay  
                reverbWetness: 0.6    // High spatial beauty
            },

            // === COMET DISCOVERIES ===
            // Pure bright tones for dynamic cosmic visitors
            // Mid-high register with swift but sustained presence
            'comet_discovery': {
                type: 'oscillator',
                frequency: 523.3,     // Pure bright tone (C5)
                duration: 2.0,        // Extended for resonant presence
                attack: 0.2,          // Swift emergence like comet appearance
                decay: 0.15,          // Quick to bright sustain
                sustain: 0.55,        // Clear, sustained comet presence
                release: 0.9,         // Trailing fade like comet tail
                volume: 0.36,         // Bright but not overpowering
                waveform: 'sine',     // Pure, crystalline streaming tone
                reverbTime: 2.3,      // Moderate, clear reverb
                reverbDecay: 2.6,     // Clean, dynamic decay
                reverbWetness: 0.45   // Clear spatial movement
            },

            // === ASTEROID FIELD DISCOVERIES ===  
            // Pure practical tones for scattered rocky debris
            // Mid-range with solid, grounded presence
            'asteroid_discovery': {
                type: 'oscillator',
                frequency: 293.7,     // Pure practical tone (D4)
                duration: 1.5,        // Moderate, solid presence
                attack: 0.3,          // Defined but gentle emergence
                decay: 0.1,           // Quick to solid sustain
                sustain: 0.5,         // Brief but clear rocky presence
                release: 0.6,         // Clean, practical fade
                volume: 0.32,         // Modest but clear
                waveform: 'sine',     // Pure, solid wine glass tone
                reverbTime: 1.8,      // Compact, grounded reverb
                reverbDecay: 2.0,     // Clean, practical decay
                reverbWetness: 0.35   // Moderate spatial presence
            },

            // === RARE DISCOVERY ENHANCEMENT ===
            // Deep, profound mystery tones with extended harmonics
            'rare_discovery': {
                type: 'oscillator',
                frequency: 65.4,      // Deep, mysterious fundamental (C2)
                frequency2: 98.0,     // Perfect fifth harmony (G2)
                duration: 3.0,        // Extended for rarity impact
                attack: 0.6,          // Very slow, building mystery
                decay: 0.7,           // Extended, profound decay
                sustain: 0.3,         // Mysterious sustained presence
                release: 1.5,         // Very long, profound fade
                volume: 0.5,          // Substantial for rare discovery
                waveform: 'sine',     // Pure, profound tone
                reverbTime: 3.5,      // Long, mysterious reverb
                reverbDecay: 4.0,     // Extended mysterious decay
                reverbWetness: 0.6    // High spatial mystery
            },

            // === WORMHOLE DISCOVERIES ===
            // Ultra-deep, dimensional shift tones
            'wormhole_discovery': {
                type: 'oscillator',
                frequency: 49,        // Ultra-deep dimensional tone
                frequency2: 73.4,     // Perfect fifth harmony
                duration: 3.5,        // Extended dimensional presence
                attack: 0.7,          // Very slow dimensional emergence
                decay: 0.8,           // Extended dimensional decay
                sustain: 0.25,        // Mysterious dimensional presence
                release: 1.8,         // Very long dimensional fade
                volume: 0.5,          // Significant dimensional impact
                waveform: 'sine',     // Pure dimensional tone
                filterFreq: 120,      // Deep filter for dimension effect
                filterQ: 0.8,         // Smooth dimensional filtering
                reverbTime: 4.5,      // Very long dimensional reverb
                reverbDecay: 4.8,     // Ultra-slow dimensional decay
                reverbWetness: 0.7    // High dimensional spatial effect
            },

            // === BLACK HOLE DISCOVERIES ===
            // Ultra-deep, gravitational tones with immense presence
            'blackhole_discovery': {
                type: 'oscillator',
                frequency: 32.7,      // Ultra-deep gravitational fundamental
                frequency2: 49.0,     // Perfect fifth harmony
                duration: 4.5,        // Extended for cosmic enormity
                attack: 1.0,          // Very slow gravitational emergence
                decay: 1.0,           // Extended gravitational decay
                sustain: 0.2,         // Deep gravitational presence
                release: 2.5,         // Very long gravitational fade
                volume: 0.55,         // Substantial gravitational impact
                waveform: 'sine',     // Pure gravitational tone (softer than sawtooth)
                filterFreq: 80,       // Very deep filter for gravity effect
                filterQ: 1.0,         // Smooth gravitational filtering
                reverbTime: 5.5,      // Longest gravitational reverb
                reverbDecay: 5.8,     // Ultra-slow gravitational decay
                reverbWetness: 0.75   // Maximum gravitational spatial effect
            },

            // === WORMHOLE TRAVERSAL ===
            // Dimensional transition tones
            'wormhole_traversal': {
                type: 'oscillator',
                frequency: 87,        // Transitional dimensional tone
                frequency2: 130.8,    // Perfect fifth harmony
                duration: 2.5,        // Extended transition
                attack: 0.3,          // Smooth dimensional shift
                decay: 0.4,           // Extended dimensional decay
                sustain: 0.4,         // Stable dimensional transition
                release: 1.0,         // Long dimensional landing
                volume: 0.45,         // Clear dimensional transition
                waveform: 'sine',     // Pure dimensional tone
                filterFreq: 200,      // Moderate dimensional filtering
                filterQ: 1.0,         // Smooth dimensional transition
                reverbTime: 2.8,      // Extended dimensional reverb
                reverbDecay: 3.0,     // Long dimensional decay
                reverbWetness: 0.5    // Balanced dimensional spatial effect
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
                
                // Set up ADSR envelope with subtle volume breathing for wine glass prominence
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(volume, now + attack);
                gainNode.gain.linearRampToValueAtTime(volume * sustain, now + attack + decay);
                
                // Add gentle volume breathing during sustain phase for prominence
                const sustainStart = now + attack + decay;
                const sustainEnd = now + duration - release;
                if (sustainEnd > sustainStart + 0.5) { // Only if sustain is long enough
                    const midSustain = sustainStart + (sustainEnd - sustainStart) * 0.5;
                    const breatheVolume = volume * sustain * 1.15; // Slight volume boost for prominence
                    gainNode.gain.linearRampToValueAtTime(breatheVolume, midSustain);
                    gainNode.gain.linearRampToValueAtTime(volume * sustain, sustainEnd);
                } else {
                    gainNode.gain.setValueAtTime(volume * sustain, sustainEnd);
                }
                
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

    // === DISCOVERY SOUND API ===
    // Harmonic variations that maintain coherent relationships while expressing object characteristics

    playStarDiscovery(starType: string = 'G-Type Star'): void {
        const config = this.getSoundConfig('star_discovery');
        if (config) {
            // Star type variations using harmonic intervals for musical coherence
            // Each type maintains perfect fifth relationships but shifts to different harmonic positions
            const variations: Record<string, { freqMultiplier: number, harmonyMultiplier: number, durationMod: number, volumeMod: number, description: string }> = {
                'G-Type Star': { 
                    freqMultiplier: 1.0,     // Base: G2 (87 Hz) + C3 (130.8 Hz)
                    harmonyMultiplier: 1.0,  // Perfect fifth harmony
                    durationMod: 1.0, 
                    volumeMod: 1.0,
                    description: 'Warm, balanced solar presence'
                },
                'K-Type Star': { 
                    freqMultiplier: 0.89,    // Slightly lower: F2 (77.8 Hz) + Bb2 (116.5 Hz) 
                    harmonyMultiplier: 0.89, // Maintains perfect fifth
                    durationMod: 1.1,        // Slightly longer for stable K-type
                    volumeMod: 0.95,
                    description: 'Warm orange dwarf - stable and welcoming'
                },
                'M-Type Star': { 
                    freqMultiplier: 0.75,    // Lower: D2 (65.4 Hz) + A2 (98 Hz)
                    harmonyMultiplier: 0.75, // Maintains perfect fifth 
                    durationMod: 1.2,        // Longer for red dwarf longevity
                    volumeMod: 0.85,
                    description: 'Deep red dwarf - ancient and enduring'
                },
                'Red Giant': { 
                    freqMultiplier: 0.67,    // Deep: C2 (58.3 Hz) + G2 (87 Hz)
                    harmonyMultiplier: 0.67, // Maintains perfect fifth
                    durationMod: 1.5,        // Much longer for giant presence
                    volumeMod: 1.15,         // Slightly louder for size
                    description: 'Majestic evolved giant - deep and expansive'
                },
                'Blue Giant': { 
                    freqMultiplier: 1.33,    // Higher: B2 (116.5 Hz) + F#3 (174.6 Hz)
                    harmonyMultiplier: 1.33, // Maintains perfect fifth
                    durationMod: 0.9,        // Slightly shorter for hot giant energy  
                    volumeMod: 1.25,         // Louder for massive presence
                    description: 'Brilliant massive giant - bright and powerful'
                },
                'White Dwarf': { 
                    freqMultiplier: 1.5,     // High: C3 (130.8 Hz) + G3 (196 Hz)
                    harmonyMultiplier: 1.5,  // Maintains perfect fifth
                    durationMod: 0.8,        // Shorter for compact density
                    volumeMod: 0.9,          // Quieter for small size
                    description: 'Dense compact remnant - crystalline and precise'
                },
                'Neutron Star': { 
                    freqMultiplier: 2.0,     // Very high: G3 (174.6 Hz) + D4 (261.6 Hz)
                    harmonyMultiplier: 2.0,  // Maintains perfect fifth
                    durationMod: 0.7,        // Shorter for extreme density
                    volumeMod: 1.1,          // Slightly louder for rarity impact
                    description: 'Ultra-dense pulsar - intense and otherworldly'
                }
            };
            
            const variation = variations[starType] || variations['G-Type Star'];
            const modifiedConfig = {
                ...config,
                frequency: (config.frequency || 110) * variation.freqMultiplier,
                // Remove frequency sweeping - pure sustained tones only
                frequency2: undefined,
                duration: (config.duration || 3.0) * variation.durationMod,
                volume: (config.volume || 0.55) * variation.volumeMod
            };
            
            this.playOscillatorSound(modifiedConfig);
        }
    }

    playPlanetDiscovery(planetType: string = 'Rocky Planet'): void {
        const config = this.getSoundConfig('planet_discovery');
        if (config) {
            // Planet type variations maintaining harmonic coherence within mid-register
            const variations: Record<string, { freqMultiplier: number, harmonyMultiplier: number, durationMod: number, volumeMod: number, description: string }> = {
                'Rocky Planet': { 
                    freqMultiplier: 1.0,     // Base: F3 (174.6 Hz) + C4 (261.6 Hz)
                    harmonyMultiplier: 1.0,  // Perfect fifth harmony
                    durationMod: 1.0, 
                    volumeMod: 1.0,
                    description: 'Solid terrestrial foundation'
                },
                'Ocean World': { 
                    freqMultiplier: 1.12,    // Higher: G3 (196 Hz) + D4 (293.7 Hz)
                    harmonyMultiplier: 1.12, // Maintains perfect fifth - brighter for water worlds
                    durationMod: 1.2,        // Longer for oceanic depth
                    volumeMod: 1.05,         // Slightly more prominent for habitability
                    description: 'Flowing oceanic depths - life potential'
                },
                'Gas Giant': { 
                    freqMultiplier: 0.75,    // Lower: D3 (146.8 Hz) + A3 (220 Hz)
                    harmonyMultiplier: 0.75, // Maintains perfect fifth - deeper for massive planets
                    durationMod: 1.4,        // Much longer for giant presence
                    volumeMod: 1.2,          // Louder for massive scale
                    description: 'Massive atmospheric giant - deep and expansive'
                },
                'Ice Giant': { 
                    freqMultiplier: 0.84,    // Slightly lower: Eb3 (155.6 Hz) + Bb3 (233.1 Hz) 
                    harmonyMultiplier: 0.84, // Maintains perfect fifth - cool ice giant
                    durationMod: 1.3,        // Longer for distant cold giant
                    volumeMod: 1.1,          // Moderately louder for size
                    description: 'Distant ice giant - crystalline and cold'
                },
                'Desert World': { 
                    freqMultiplier: 1.19,    // Higher: Ab3 (207.7 Hz) + Eb4 (311.1 Hz)
                    harmonyMultiplier: 1.19, // Maintains perfect fifth - warmer for desert
                    durationMod: 0.9,        // Slightly shorter for arid simplicity
                    volumeMod: 0.95,         // Slightly quieter for barren world
                    description: 'Arid desert expanse - warm and dry'
                },
                'Frozen World': { 
                    freqMultiplier: 0.89,    // Lower: E3 (164.8 Hz) + B3 (246.9 Hz)
                    harmonyMultiplier: 0.89, // Maintains perfect fifth - cooler for ice
                    durationMod: 1.1,        // Longer for frozen stillness
                    volumeMod: 0.9,          // Quieter for frozen silence
                    description: 'Frozen ice world - still and crystalline'
                },
                'Volcanic World': { 
                    freqMultiplier: 1.33,    // Higher: Bb3 (233.1 Hz) + F4 (349.2 Hz)
                    harmonyMultiplier: 1.33, // Maintains perfect fifth - energetic for volcanism
                    durationMod: 0.8,        // Shorter for active energy
                    volumeMod: 1.15,         // Louder for volcanic activity
                    description: 'Active volcanic world - energetic and dynamic'
                },
                'Exotic World': { 
                    freqMultiplier: 1.5,     // High: C4 (261.6 Hz) + G4 (392 Hz)
                    harmonyMultiplier: 1.5,  // Maintains perfect fifth - unique for exotic
                    durationMod: 1.3,        // Longer for mysterious exotic nature
                    volumeMod: 1.1,          // Slightly louder for rarity
                    description: 'Exotic anomalous world - mysterious and unique'
                },
                // Handle alternative namings
                'Asteroid Garden': {
                    freqMultiplier: 1.41,    // Higher: B3 (246.9 Hz) + F#4 (370 Hz) 
                    harmonyMultiplier: 1.41, // Maintains perfect fifth - clustered asteroids
                    durationMod: 0.7,        // Shorter for scattered debris
                    volumeMod: 0.8,          // Quieter for smaller objects
                    description: 'Scattered asteroid cluster - fragmented beauty'
                }
            };
            
            const variation = variations[planetType] || variations['Rocky Planet'];
            const modifiedConfig = {
                ...config,
                frequency: (config.frequency || 220) * variation.freqMultiplier,
                // Remove frequency sweeping - pure sustained tones only  
                frequency2: undefined,
                duration: (config.duration || 2.5) * variation.durationMod,
                volume: (config.volume || 0.5) * variation.volumeMod
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
            // Nebula type variations in high ethereal register
            const variations: Record<string, { freqMultiplier: number, harmonyMultiplier: number, durationMod: number, volumeMod: number, description: string }> = {
                'emission': { 
                    freqMultiplier: 1.0,     // Base: E5 (659.3 Hz) + B5 (987.8 Hz)
                    harmonyMultiplier: 1.0,  // Perfect fifth harmony - bright emission
                    durationMod: 1.0, 
                    volumeMod: 1.0,
                    description: 'Bright emission nebula - stellar nursery glowing'
                },
                'reflection': { 
                    freqMultiplier: 1.12,    // Higher: G5 (784 Hz) + D6 (1175 Hz)
                    harmonyMultiplier: 1.12, // Maintains perfect fifth - reflective sparkle
                    durationMod: 1.1,        // Slightly longer for reflective beauty
                    volumeMod: 1.05,         // Slightly brighter for reflection
                    description: 'Reflection nebula - starlight scattered in cosmic dust'
                },
                'planetary': { 
                    freqMultiplier: 0.89,    // Lower: D5 (587.3 Hz) + A5 (880 Hz)
                    harmonyMultiplier: 0.89, // Maintains perfect fifth - contained planetary
                    durationMod: 0.9,        // Shorter for smaller planetary nebula
                    volumeMod: 0.95,         // Slightly quieter for smaller scale
                    description: 'Planetary nebula - stellar death creating beauty'
                },
                'dark': { 
                    freqMultiplier: 0.75,    // Lower: C5 (523.3 Hz) + G5 (784 Hz)
                    harmonyMultiplier: 0.75, // Maintains perfect fifth - mysterious dark
                    durationMod: 1.3,        // Longer for dark mystery
                    volumeMod: 0.8,          // Quieter for dark, hidden nature  
                    description: 'Dark nebula - mysterious cosmic shadow'
                }
            };
            
            const variation = variations[nebulaType] || variations['emission'];
            const modifiedConfig = {
                ...config,
                frequency: (config.frequency || 659.3) * variation.freqMultiplier,
                // Remove frequency sweeping - pure sustained tones only
                frequency2: undefined,
                duration: (config.duration || 2.8) * variation.durationMod,
                volume: (config.volume || 0.32) * variation.volumeMod
            };
            
            this.playOscillatorSound(modifiedConfig);
        }
    }

    playCometDiscovery(): void {
        const config = this.getSoundConfig('comet_discovery');
        if (config) this.playOscillatorSound(config);
    }

    playAsteroidDiscovery(): void {
        const config = this.getSoundConfig('asteroid_discovery');
        if (config) this.playOscillatorSound(config);
    }

    playRareDiscovery(): void {
        const config = this.getSoundConfig('rare_discovery');
        if (config) this.playOscillatorSound(config);
    }

    playWormholeDiscovery(): void {
        const config = this.getSoundConfig('wormhole_discovery');
        if (config) this.playOscillatorSound(config);
    }

    playBlackHoleDiscovery(): void {
        const config = this.getSoundConfig('blackhole_discovery');
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
        
        if (!this.context || !this.ambientGain || this.muted) {
            return;
        }
        
        // Resume audio context if suspended (browser autoplay policy)
        if (this.context.state === 'suspended') {
            try {
                await this.context.resume();
            } catch (error) {
                console.error('Failed to resume audio context:', error);
                return;
            }
        }
        
        // Stop any existing ambient layers first
        this.stopSpaceDrone();
        
        try {
            const now = this.context.currentTime;
            
            // Create master gain for all ambient layers
            this.ambientMasterGain = this.context.createGain();
            this.ambientMasterGain.gain.setValueAtTime(0.6, now); // Overall ambient volume - moderate level
            this.ambientMasterGain.connect(this.ambientGain);
            
            // PHASE 4: Layered Harmonic Textures
            
            // === HARMONIC INTEGRATION WITH DISCOVERY SYSTEM ===
            // Ambient layers now designed to complement discovery sound frequencies
            // All frequencies chosen to create perfect harmonic relationships with discovery tones
            
            // Layer 1: Bass Drone Layer (32-98Hz) - Fundamental cosmic foundation
            // Supports star discovery range (58-174 Hz) with deep harmonics
            const bassDroneFreqs = [
                { freq: 32.7, cycle: 75, phase: 0, volume: 0.25 },   // Ultra-deep C1 - supports black holes
                { freq: 49.0, cycle: 68, phase: 25, volume: 0.3 },   // G1 - supports wormholes & deep stars
                { freq: 65.4, cycle: 60, phase: 45, volume: 0.35 },  // C2 - fundamental root, supports rare discoveries
                { freq: 87.0, cycle: 55, phase: 15, volume: 0.3 }    // G2 - supports star discoveries
            ];
            
            // Layer 2: Planetary Harmonic Layer (130-261Hz) - Mid-register planetary resonance  
            // Directly harmonizes with planet discovery range (146-392 Hz)
            const melodicFreqs = [
                { freq: 130.8, cycle: 45, phase: 20, volume: 0.35 }, // C3 - star discovery harmony
                { freq: 174.6, cycle: 42, phase: 35, volume: 0.4 },  // F3 - planet discovery fundamental
                { freq: 196.0, cycle: 48, phase: 10, volume: 0.32 }, // G3 - planet discovery harmony 
                { freq: 261.6, cycle: 40, phase: 50, volume: 0.3 }   // C4 - planet discovery harmony
            ];
            
            // Layer 3: Ethereal Overtone Layer (329-659Hz) - High harmonic sparkle
            // Supports moon and nebula discovery range (329-987 Hz) 
            const harmonicOvertones = [
                { freq: 329.6, cycle: 55, phase: 5, volume: 0.12 },  // E4 - moon discovery fundamental
                { freq: 392.0, cycle: 50, phase: 30, volume: 0.15 }, // G4 - general harmonic fifth
                { freq: 523.3, cycle: 58, phase: 40, volume: 0.1 },  // C5 - comet discovery fundamental
                { freq: 659.3, cycle: 62, phase: 15, volume: 0.08 }  // E5 - nebula discovery fundamental
            ];
            
            // Layer 4: Cosmic Textural Layer (98-220Hz) - Deep harmonic foundation
            // Provides rich harmonic support across the discovery spectrum
            const texturalPads = [
                { freq: 98.0, cycle: 80, phase: 35, volume: 0.18 },  // G2 - deep harmonic support
                { freq: 146.8, cycle: 85, phase: 55, volume: 0.2 },  // D3 - planet discovery support  
                { freq: 220.0, cycle: 78, phase: 20, volume: 0.16 }  // A3 - asteroid discovery support
            ];
            
            // Combine all layers into unified system
            const allFrequencies = [
                ...bassDroneFreqs.map(f => ({...f, layer: 'bass'})),
                ...melodicFreqs.map(f => ({...f, layer: 'melodic'})),
                ...harmonicOvertones.map(f => ({...f, layer: 'harmonic'})),
                ...texturalPads.map(f => ({...f, layer: 'textural'}))
            ];
            
            // Create each ambient layer with proper volume balancing
            for (let i = 0; i < allFrequencies.length; i++) {
                const config = allFrequencies[i];
                const oscillator = this.context.createOscillator();
                const gain = this.context.createGain();
                
                // Keep all waves as gentle sine waves for tranquil aesthetic
                oscillator.type = 'sine'; // Pure, peaceful tones for all layers
                
                oscillator.frequency.setValueAtTime(config.freq, now);
                
                // Start with silence, will fade in/out organically
                gain.gain.setValueAtTime(0, now);
                
                // Connect audio path
                oscillator.connect(gain);
                gain.connect(this.ambientMasterGain);
                
                // Start oscillator
                oscillator.start(now);
                
                // Create layer data for evolution with Phase 4 enhancements
                const layer = {
                    oscillator,
                    gain,
                    frequency: config.freq,
                    cycleTime: config.cycle,
                    phase: config.phase,
                    targetVolume: config.volume, // Use configured volume per layer type
                    currentVolume: 0,
                    fadeDirection: 'in' as 'in' | 'out' | 'sustain',
                    nextPhaseTime: now + config.phase,
                    layerType: config.layer // Track layer type for evolution logic
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
        // PHASE 4: Layer-specific evolution behavior
        let fadeTime: number, sustainTime: number, silenceTime: number;
        
        switch (layer.layerType) {
            case 'bass':
                // Bass drone: longer, more stable cycles
                fadeTime = 15 + Math.random() * 15; // 15-30 second fades
                sustainTime = 30 + Math.random() * 60; // 30-90 second sustains
                silenceTime = 10 + Math.random() * 20; // 10-30 second silence
                break;
            case 'melodic':
                // Melodic: medium cycles, main voice
                fadeTime = 8 + Math.random() * 12; // 8-20 second fades
                sustainTime = 15 + Math.random() * 25; // 15-40 second sustains
                silenceTime = 5 + Math.random() * 15; // 5-20 second silence
                break;
            case 'harmonic':
                // Harmonic: shorter, more active cycles
                fadeTime = 5 + Math.random() * 8; // 5-13 second fades
                sustainTime = 10 + Math.random() * 20; // 10-30 second sustains
                silenceTime = 3 + Math.random() * 12; // 3-15 second silence
                break;
            case 'textural':
                // Textural: very long, ambient cycles
                fadeTime = 20 + Math.random() * 20; // 20-40 second fades
                sustainTime = 45 + Math.random() * 75; // 45-120 second sustains
                silenceTime = 15 + Math.random() * 30; // 15-45 second silence
                break;
            default:
                // Default behavior (legacy)
                fadeTime = 8 + Math.random() * 12;
                sustainTime = 15 + Math.random() * 25;
                silenceTime = 5 + Math.random() * 15;
        }
        
        switch (layer.fadeDirection) {
            case 'in': {
                // Start fading in
                const fadeInTarget = layer.targetVolume * (0.7 + Math.random() * 0.6); // Vary intensity
                layer.currentVolume = fadeInTarget;
                layer.gain.gain.linearRampToValueAtTime(fadeInTarget, currentTime + fadeTime);
                layer.fadeDirection = 'sustain';
                layer.nextPhaseTime = currentTime + fadeTime + sustainTime;
                break;
            }
                
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
        
        // Modal scale system for emotional variety
        interface ModalScale {
            name: string;
            intervals: number[]; // Semitone intervals from root
            emotion: 'mysterious' | 'dreamy' | 'vast' | 'alien';
            description: string;
        }
        
        const modalScales: ModalScale[] = [
            {
                name: 'Dorian',
                intervals: [0, 2, 3, 5, 7, 9, 10, 12], // Natural minor with raised 6th
                emotion: 'mysterious',
                description: 'Mysterious hope - minor with bright sixth'
            },
            {
                name: 'Mixolydian', 
                intervals: [0, 2, 4, 5, 7, 9, 10, 12], // Major with flat 7th
                emotion: 'dreamy',
                description: 'Dreamy float - major with subtle melancholy'
            },
            {
                name: 'Aeolian',
                intervals: [0, 2, 3, 5, 7, 8, 10, 12], // Natural minor
                emotion: 'vast',
                description: 'Vast emptiness - pure minor tonality'
            },
            {
                name: 'Lydian',
                intervals: [0, 2, 4, 6, 7, 9, 11, 12], // Major with raised 4th
                emotion: 'alien',
                description: 'Alien beauty - major with ethereal fourth'
            }
        ];
        
        // Generate frequencies for a modal scale from a root frequency
        const generateModalFrequencies = (rootFreq: number, scale: ModalScale): number[] => {
            return scale.intervals.map(interval => rootFreq * Math.pow(2, interval / 12));
        };

        // Define harmonic progressions with intervals, chords, movement patterns, and modal scales
        interface HarmonicProgression {
            name: string;
            notes: Array<{
                root: number;
                harmonies?: number[];
                intervalType?: 'perfect5th' | 'minor3rd' | 'major7th' | 'sus4';
            }>;
            emotion: 'spacious' | 'melancholy' | 'ethereal' | 'mysterious' | 'contemplative' | 'dreamy' | 'vast' | 'alien';
            movement: 'ascending' | 'descending' | 'arch' | 'meandering' | 'pendulum';
            mode?: string; // Optional modal scale identifier
        }
        
        const harmonicProgressions: HarmonicProgression[] = [
            // Perfect 5ths - Open, spacious cosmic feel
            {
                name: 'Cosmic Fifths Ascent',
                emotion: 'spacious',
                movement: 'ascending',
                notes: [
                    { root: 261.6, harmonies: [392.0], intervalType: 'perfect5th' }, // C4 + G4
                    { root: 293.7, harmonies: [440.0], intervalType: 'perfect5th' }, // D4 + A4
                    { root: 329.6, harmonies: [493.9], intervalType: 'perfect5th' }, // E4 + B4
                    { root: 349.2, harmonies: [523.3], intervalType: 'perfect5th' }  // F4 + C5
                ]
            },
            {
                name: 'Deep Space Descent',
                emotion: 'spacious', 
                movement: 'descending',
                notes: [
                    { root: 293.7, harmonies: [440.0], intervalType: 'perfect5th' }, // D4 + A4
                    { root: 261.6, harmonies: [392.0], intervalType: 'perfect5th' }, // C4 + G4
                    { root: 220.0, harmonies: [329.6], intervalType: 'perfect5th' }, // A3 + E4
                    { root: 196.0, harmonies: [293.7], intervalType: 'perfect5th' }  // G3 + D4
                ]
            },
            {
                name: 'Cosmic Arch',
                emotion: 'spacious',
                movement: 'arch',
                notes: [
                    { root: 196.0, harmonies: [293.7], intervalType: 'perfect5th' }, // G3 + D4 (start low)
                    { root: 261.6, harmonies: [392.0], intervalType: 'perfect5th' }, // C4 + G4 (rise)
                    { root: 329.6, harmonies: [493.9], intervalType: 'perfect5th' }, // E4 + B4 (peak)
                    { root: 261.6, harmonies: [392.0], intervalType: 'perfect5th' }  // C4 + G4 (fall back)
                ]
            },
            // Minor 3rds - Melancholy, mysterious undertones
            {
                name: 'Melancholy Rise',
                emotion: 'melancholy',
                movement: 'ascending',
                notes: [
                    { root: 261.6, harmonies: [311.1], intervalType: 'minor3rd' }, // C4 + Eb4
                    { root: 293.7, harmonies: [349.2], intervalType: 'minor3rd' }, // D4 + F4
                    { root: 329.6, harmonies: [392.0], intervalType: 'minor3rd' }, // E4 + G4
                    { root: 349.2, harmonies: [415.3], intervalType: 'minor3rd' }  // F4 + Ab4
                ]
            },
            {
                name: 'Contemplative Descent', 
                emotion: 'contemplative',
                movement: 'descending',
                notes: [
                    { root: 392.0, harmonies: [466.2], intervalType: 'minor3rd' }, // G4 + Bb4
                    { root: 349.2, harmonies: [415.3], intervalType: 'minor3rd' }, // F4 + Ab4
                    { root: 293.7, harmonies: [349.2], intervalType: 'minor3rd' }, // D4 + F4
                    { root: 261.6, harmonies: [311.1], intervalType: 'minor3rd' }  // C4 + Eb4
                ]
            },
            // Major 7ths - Ethereal, floating quality
            {
                name: 'Ethereal Suspension',
                emotion: 'ethereal',
                movement: 'ascending',
                notes: [
                    { root: 261.6, harmonies: [493.9], intervalType: 'major7th' }, // C4 + B4
                    { root: 293.7, harmonies: [554.4], intervalType: 'major7th' }, // D4 + C#5
                    { root: 329.6, harmonies: [622.3], intervalType: 'major7th' }, // E4 + D#5
                    { root: 349.2, harmonies: [659.3], intervalType: 'major7th' }  // F4 + E5
                ]
            },
            {
                name: 'Floating Descent',
                emotion: 'ethereal',
                movement: 'descending',
                notes: [
                    { root: 349.2, harmonies: [659.3], intervalType: 'major7th' }, // F4 + E5
                    { root: 329.6, harmonies: [622.3], intervalType: 'major7th' }, // E4 + D#5
                    { root: 293.7, harmonies: [554.4], intervalType: 'major7th' }, // D4 + C#5
                    { root: 261.6, harmonies: [493.9], intervalType: 'major7th' }  // C4 + B4
                ]
            },
            // Suspended 4ths - Unresolved tension
            {
                name: 'Cosmic Suspension',
                emotion: 'mysterious',
                movement: 'ascending',
                notes: [
                    { root: 261.6, harmonies: [349.2, 392.0], intervalType: 'sus4' }, // C4 + F4 + G4
                    { root: 293.7, harmonies: [392.0, 440.0], intervalType: 'sus4' }, // D4 + G4 + A4
                    { root: 329.6, harmonies: [440.0, 493.9], intervalType: 'sus4' }, // E4 + A4 + B4
                    { root: 349.2, harmonies: [466.2, 523.3], intervalType: 'sus4' }  // F4 + Bb4 + C5
                ]
            },
            // Meandering patterns - Wandering, exploratory feel
            {
                name: 'Stellar Wandering',
                emotion: 'mysterious',
                movement: 'meandering',
                notes: [
                    { root: 261.6, harmonies: [392.0], intervalType: 'perfect5th' }, // C4 + G4 (start)
                    { root: 329.6, harmonies: [493.9], intervalType: 'perfect5th' }, // E4 + B4 (jump up)
                    { root: 293.7, harmonies: [440.0], intervalType: 'perfect5th' }, // D4 + A4 (step back)
                    { root: 349.2, harmonies: [523.3], intervalType: 'perfect5th' }  // F4 + C5 (wander up)
                ]
            },
            {
                name: 'Cosmic Drift',
                emotion: 'contemplative',
                movement: 'meandering',
                notes: [
                    { root: 293.7, harmonies: [349.2], intervalType: 'minor3rd' }, // D4 + F4 (start mid)
                    { root: 220.0, harmonies: [261.6], intervalType: 'minor3rd' }, // A3 + C4 (drift low)
                    { root: 329.6, harmonies: [392.0], intervalType: 'minor3rd' }, // E4 + G4 (rise up)
                    { root: 261.6, harmonies: [311.1], intervalType: 'minor3rd' }  // C4 + Eb4 (settle)
                ]
            },
            // Pendulum patterns - Back and forth motion
            {
                name: 'Harmonic Pendulum',
                emotion: 'mysterious',
                movement: 'pendulum',
                notes: [
                    { root: 261.6, harmonies: [392.0], intervalType: 'perfect5th' }, // C4 + G4 (center)
                    { root: 329.6, harmonies: [493.9], intervalType: 'perfect5th' }, // E4 + B4 (swing high)
                    { root: 261.6, harmonies: [392.0], intervalType: 'perfect5th' }, // C4 + G4 (back to center)
                    { root: 196.0, harmonies: [293.7], intervalType: 'perfect5th' }  // G3 + D4 (swing low)
                ]
            },
            {
                name: 'Ethereal Swing',
                emotion: 'ethereal',
                movement: 'pendulum',
                notes: [
                    { root: 293.7, harmonies: [554.4], intervalType: 'major7th' }, // D4 + C#5 (center)
                    { root: 349.2, harmonies: [659.3], intervalType: 'major7th' }, // F4 + E5 (swing high)
                    { root: 293.7, harmonies: [554.4], intervalType: 'major7th' }, // D4 + C#5 (center)
                    { root: 261.6, harmonies: [493.9], intervalType: 'major7th' }  // C4 + B4 (swing low)
                ]
            },
            // Legacy single-note progressions (enhanced with movement patterns)
            {
                name: 'Simple Melodic Ascent',
                emotion: 'contemplative',
                movement: 'ascending',
                notes: [
                    { root: 261.6 }, // C4
                    { root: 293.7 }, // D4
                    { root: 329.6 }, // E4
                    { root: 349.2 }  // F4
                ]
            }
        ];
        
        // Generate additional modal progressions dynamically
        const createModalProgressions = (): HarmonicProgression[] => {
            const modalProgressions: HarmonicProgression[] = [];
            const baseFreq = 261.6; // C4 as root
            
            modalScales.forEach(scale => {
                const scaleFreqs = generateModalFrequencies(baseFreq, scale);
                
                // Create ascending modal progression
                modalProgressions.push({
                    name: `${scale.name} Ascent`,
                    emotion: scale.emotion,
                    movement: 'ascending',
                    mode: scale.name,
                    notes: [
                        { root: scaleFreqs[0], harmonies: [scaleFreqs[4]], intervalType: 'perfect5th' }, // Root + 5th
                        { root: scaleFreqs[2], harmonies: [scaleFreqs[6]], intervalType: 'perfect5th' }, // 3rd + 7th  
                        { root: scaleFreqs[4], harmonies: [scaleFreqs[1]], intervalType: 'perfect5th' }, // 5th + 2nd (octave)
                        { root: scaleFreqs[6], harmonies: [scaleFreqs[3]], intervalType: 'perfect5th' }  // 7th + 4th (octave)
                    ]
                });
                
                // Create descending modal progression  
                modalProgressions.push({
                    name: `${scale.name} Descent`,
                    emotion: scale.emotion,
                    movement: 'descending', 
                    mode: scale.name,
                    notes: [
                        { root: scaleFreqs[6], harmonies: [scaleFreqs[3]], intervalType: 'perfect5th' }, // 7th + 4th (octave)
                        { root: scaleFreqs[4], harmonies: [scaleFreqs[1]], intervalType: 'perfect5th' }, // 5th + 2nd (octave)
                        { root: scaleFreqs[2], harmonies: [scaleFreqs[6]], intervalType: 'perfect5th' }, // 3rd + 7th
                        { root: scaleFreqs[0], harmonies: [scaleFreqs[4]], intervalType: 'perfect5th' }  // Root + 5th
                    ]
                });
                
                // Create arch modal progression
                modalProgressions.push({
                    name: `${scale.name} Arch`,
                    emotion: scale.emotion,
                    movement: 'arch',
                    mode: scale.name, 
                    notes: [
                        { root: scaleFreqs[0], harmonies: [scaleFreqs[4]], intervalType: 'perfect5th' }, // Root + 5th (start)
                        { root: scaleFreqs[4], harmonies: [scaleFreqs[1]], intervalType: 'perfect5th' }, // 5th + 2nd (rise)
                        { root: scaleFreqs[7], harmonies: [scaleFreqs[3]], intervalType: 'perfect5th' }, // Octave + 4th (peak)
                        { root: scaleFreqs[2], harmonies: [scaleFreqs[6]], intervalType: 'perfect5th' }  // 3rd + 7th (fall)
                    ]
                });
            });
            
            return modalProgressions;
        };
        
        // Combine traditional and modal progressions
        const allProgressions = [...harmonicProgressions, ...createModalProgressions()];
        
        // Randomly select from all available progressions (traditional + modal)
        const selectedProgression = allProgressions[Math.floor(Math.random() * allProgressions.length)];
        
        // Create sequence with staggered timing and harmonic intervals
        const sequence = [];
        let noteStartTime = currentTime + 0.2; // Small initial delay
        
        for (let i = 0; i < selectedProgression.notes.length; i++) {
            const noteData = selectedProgression.notes[i];
            const duration = 3 + Math.random() * 3; // 3-6 seconds per note - longer for more droning
            const fadeInTime = 1.2 + Math.random() * 0.8; // 1.2-2 second gentle fade in
            const fadeOutTime = 1.5 + Math.random() * 1; // 1.5-2.5 second gentle fade out
            
            // Create array of all frequencies for this chord/interval
            const allFrequencies = [noteData.root];
            if (noteData.harmonies) {
                allFrequencies.push(...noteData.harmonies);
            }
            
            // Create oscillators for each frequency in the chord/interval
            for (let freqIndex = 0; freqIndex < allFrequencies.length; freqIndex++) {
                const frequency = allFrequencies[freqIndex];
                
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
                    
                    // Configure envelope with volume balancing for harmonic intervals
                    let baseVolume: number;
                    if (freqIndex === 0) {
                        // Root frequency - full volume
                        baseVolume = 0.25 + Math.random() * 0.15; // 0.25-0.4 with variation
                    } else if (noteData.intervalType === 'perfect5th') {
                        // Perfect 5th - strong but not overpowering (60% of root)
                        baseVolume = (0.25 + Math.random() * 0.15) * 0.6;
                    } else if (noteData.intervalType === 'minor3rd') {
                        // Minor 3rd - subtle melancholy (40% of root)  
                        baseVolume = (0.25 + Math.random() * 0.15) * 0.4;
                    } else if (noteData.intervalType === 'major7th') {
                        // Major 7th - ethereal whisper (30% of root)
                        baseVolume = (0.25 + Math.random() * 0.15) * 0.3;
                    } else if (noteData.intervalType === 'sus4') {
                        // Suspended chord voices - balanced (45% of root)
                        baseVolume = (0.25 + Math.random() * 0.15) * 0.45;
                    } else {
                        // Default harmony - moderate (50% of root)
                        baseVolume = (0.25 + Math.random() * 0.15) * 0.5;
                    }
                    
                    gain.gain.setValueAtTime(0, noteStartTime);
                    gain.gain.linearRampToValueAtTime(baseVolume, noteStartTime + fadeInTime); // Slow fade in
                    
                    // Sustain phase with slight volume breathing
                    const sustainStart = noteStartTime + fadeInTime;
                    const sustainEnd = noteStartTime + duration - fadeOutTime;
                    gain.gain.setValueAtTime(baseVolume, sustainStart);
                    
                    // Add subtle volume breathing during sustain
                    if (sustainEnd > sustainStart) {
                        const midSustain = sustainStart + (sustainEnd - sustainStart) * 0.5;
                        const breatheVolume = baseVolume * (0.85 + Math.random() * 0.1); // Subtle variation
                        gain.gain.linearRampToValueAtTime(breatheVolume, midSustain);
                        gain.gain.linearRampToValueAtTime(baseVolume, sustainEnd);
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
                    
                } catch (error) {
                    console.warn('Failed to create harmonic oscillator:', error);
                }
            }
            
            // Next chord/interval starts with substantial overlap for droning blend
            noteStartTime += duration * 0.5; // 50% overlap between chords for more droning effect
        }
        
        this.melodicState.currentSequence = sequence;
        this.melodicState.isPlaying = true;
        
        // Log progression info for debugging
        const harmonicCount = selectedProgression.notes.filter(n => n.harmonies && n.harmonies.length > 0).length;
        const harmonicInfo = harmonicCount > 0 ? ` with ${harmonicCount} harmonic intervals` : '';
        const modalInfo = selectedProgression.mode ? ` in ${selectedProgression.mode} mode` : '';
        console.log(`Started "${selectedProgression.name}" (${selectedProgression.emotion}, ${selectedProgression.movement})${modalInfo} sequence with ${sequence.length} total oscillators${harmonicInfo}`);
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
        return this.ambientLayers.length > 0 && this.ambientUpdateInterval !== null;
    }

    /**
     * Resume audio context if suspended - call on user interaction
     */
    async resumeAudioContext(): Promise<boolean> {
        if (!this.context) {
            return false;
        }
        
        if (this.context.state === 'suspended') {
            try {
                await this.context.resume();
                return true;
            } catch (error) {
                console.error('Failed to resume audio context:', error.message);
                console.error('Error details:', error);
                return false;
            }
        }
        return true; // Already running
    }

    /**
     * Get audio context state for debugging
     */
    getAudioContextState(): string {
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