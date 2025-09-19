// AudioService - Clean architecture service for audio management
// Provides a unified interface to sound effects, ambient audio, and volume control

import type { ConfigService } from '../config/ConfigService.js';

// Audio quality settings
type AudioQuality = 'low' | 'medium' | 'high';

// Sound category types
type SoundCategory = 'discovery' | 'ambient' | 'effects' | 'ui';

// Audio settings interface for persistence
interface AudioSettings {
    masterVolume: number;
    effectsVolume: number;
    ambientVolume: number;
    muted: boolean;
    quality: AudioQuality;
}

// SoundManager interface to avoid tight coupling
interface ISoundManager {
    isInitialized(): boolean;
    isMuted(): boolean;
    toggleMute(): boolean;
    playStarDiscovery(starType: string): void;
    playPlanetDiscovery(planetType: string): void;
    playNebulaDiscovery(nebulaType: string): void;
    playCrystalGardenDiscovery(variant: string): void;
    setVolume?(channel: string, volume: number): void;
    stopAmbient?(): void;
    
    // Individual channel mute methods
    isMasterMuted?(): boolean;
    setMasterMuted?(muted: boolean): void;
    isAmbientMuted?(): boolean;
    setAmbientMuted?(muted: boolean): void;
    isEffectsMuted?(): boolean;
    setEffectsMuted?(muted: boolean): void;
    startSpaceDrone?(regionType?: string): void;
    stopSpaceDrone?(): void;
    isSpaceDronePlaying?(): boolean;
}

export interface IAudioService {
    // Volume management
    getMasterVolume(): number;
    setMasterVolume(volume: number): void;
    getEffectsVolume(): number;
    setEffectsVolume(volume: number): void;
    getAmbientVolume(): number;
    setAmbientVolume(volume: number): void;
    
    // Mute management
    isMuted(): boolean;
    setMuted(muted: boolean): void;
    toggleMute(): boolean;
    
    // Individual channel mute management
    isMasterMuted(): boolean;
    setMasterMuted(muted: boolean): void;
    isAmbientMuted(): boolean;
    setAmbientMuted(muted: boolean): void;
    isDiscoveryMuted(): boolean;
    setDiscoveryMuted(muted: boolean): void;
    
    // Discovery sound effects
    playStarDiscovery(starType: string): void;
    playPlanetDiscovery(planetType: string): void;
    playNebulaDiscovery(nebulaType: string): void;
    playCrystalGardenDiscovery(variant: string): void;
    playDiscoverySound(objectType: string): void;
    
    // Ambient audio
    startAmbient(trackName: string): void;
    stopAmbient(): void;
    isAmbientPlaying(): boolean;
    
    // Atmospheric space drone
    startSpaceDrone(regionType?: string): void;
    stopSpaceDrone(): void;
    isSpaceDronePlaying(): boolean;
    
    // Audio system management
    isAudioSupported(): boolean;
    isAudioContextActive(): boolean;
    resumeAudioContext(): Promise<void>;
    
    // Quality and configuration
    getAudioQuality(): AudioQuality;
    setAudioQuality(quality: AudioQuality): void;
    getAvailableSoundCategories(): SoundCategory[];
    reloadConfiguration(): void;
    saveSettings(): void;
    
    // Lifecycle
    dispose(): void;
}

export class AudioService implements IAudioService {
    public readonly configService: ConfigService;
    public readonly soundManager: ISoundManager;
    
    private audioSettings: AudioSettings;
    private disposed: boolean = false;
    private ambientPlaying: boolean = false;
    private audioContext: AudioContext | null = null;

    constructor(configService: ConfigService, soundManager: ISoundManager) {
        if (!configService) {
            throw new Error('ConfigService is required');
        }
        if (!soundManager) {
            throw new Error('SoundManager is required');
        }

        this.configService = configService;
        this.soundManager = soundManager;
        
        // Initialize audio settings
        this.audioSettings = this.loadDefaultSettings();
        this.loadConfiguration();
        this.initializeAudioContext();
    }

    /**
     * Get master volume level
     */
    getMasterVolume(): number {
        return this.audioSettings.masterVolume;
    }

    /**
     * Set master volume level
     */
    setMasterVolume(volume: number): void {
        this.ensureNotDisposed();
        this.validateVolume(volume);
        
        this.audioSettings.masterVolume = volume;
        this.applyVolumeChange('master', volume);
        this.saveSettings();
    }

    /**
     * Get effects volume level
     */
    getEffectsVolume(): number {
        return this.audioSettings.effectsVolume;
    }

    /**
     * Set effects volume level
     */
    setEffectsVolume(volume: number): void {
        this.ensureNotDisposed();
        this.validateVolume(volume);
        
        this.audioSettings.effectsVolume = volume;
        this.applyVolumeChange('effects', volume);
        this.saveSettings();
    }

    /**
     * Get ambient volume level
     */
    getAmbientVolume(): number {
        return this.audioSettings.ambientVolume;
    }

    /**
     * Set ambient volume level
     */
    setAmbientVolume(volume: number): void {
        this.ensureNotDisposed();
        this.validateVolume(volume);
        
        this.audioSettings.ambientVolume = volume;
        this.applyVolumeChange('ambient', volume);
        this.saveSettings();
    }

    /**
     * Check if audio is muted
     */
    isMuted(): boolean {
        return this.audioSettings.muted;
    }

    /**
     * Set mute state explicitly
     */
    setMuted(muted: boolean): void {
        this.ensureNotDisposed();
        
        if (this.audioSettings.muted !== muted) {
            this.audioSettings.muted = muted;
            
            // Sync with sound manager if it supports toggle
            if (this.soundManager.isMuted() !== muted) {
                this.soundManager.toggleMute();
            }
            
            this.saveSettings();
        }
    }

    /**
     * Toggle mute state
     */
    toggleMute(): boolean {
        this.ensureNotDisposed();
        
        const newMutedState = this.soundManager.toggleMute();
        this.audioSettings.muted = newMutedState;
        this.saveSettings();
        
        return newMutedState;
    }

    /**
     * Play star discovery sound
     */
    playStarDiscovery(starType: string): void {
        this.ensureNotDisposed();
        
        if (this.shouldPlaySound()) {
            try {
                this.soundManager.playStarDiscovery(starType);
            } catch (error) {
                console.warn('Failed to play star discovery sound:', error);
            }
        }
    }

    /**
     * Play planet discovery sound
     */
    playPlanetDiscovery(planetType: string): void {
        this.ensureNotDisposed();
        
        if (this.shouldPlaySound()) {
            try {
                this.soundManager.playPlanetDiscovery(planetType);
            } catch (error) {
                console.warn('Failed to play planet discovery sound:', error);
            }
        }
    }

    /**
     * Play nebula discovery sound
     */
    playNebulaDiscovery(nebulaType: string): void {
        this.ensureNotDisposed();
        
        if (this.shouldPlaySound()) {
            try {
                this.soundManager.playNebulaDiscovery(nebulaType);
            } catch (error) {
                console.warn('Failed to play nebula discovery sound:', error);
            }
        }
    }

    /**
     * Play crystal garden discovery sound
     */
    playCrystalGardenDiscovery(variant: string = 'pure'): void {
        this.ensureNotDisposed();
        
        if (this.shouldPlaySound()) {
            try {
                this.soundManager.playCrystalGardenDiscovery(variant);
            } catch (error) {
                console.warn('Failed to play crystal garden discovery sound:', error);
            }
        }
    }

    /**
     * Play discovery sound based on object type
     */
    playDiscoverySound(objectType: string): void {
        this.ensureNotDisposed();
        
        if (!this.shouldPlaySound()) return;

        try {
            // Route to appropriate discovery sound based on object type
            if (objectType.includes('star') || objectType.includes('Star')) {
                this.playStarDiscovery(objectType);
            } else if (objectType.includes('planet') || objectType.includes('Planet')) {
                this.playPlanetDiscovery(objectType);
            } else if (objectType.includes('nebula') || objectType.includes('Nebula')) {
                this.playNebulaDiscovery(objectType);
            } else if (objectType === 'crystal-garden') {
                this.playCrystalGardenDiscovery('pure'); // Default variant, actual variant passed from DiscoveryManager
            } else {
                // Default to star discovery for unknown types
                console.warn(`Unknown object type for discovery sound: ${objectType}`);
            }
        } catch (error) {
            console.warn('Failed to play discovery sound:', error);
        }
    }

    /**
     * Start ambient audio track
     */
    startAmbient(trackName: string): void {
        this.ensureNotDisposed();
        
        if (!this.shouldPlaySound()) return;

        try {
            // Stop current ambient if playing
            if (this.ambientPlaying) {
                this.stopAmbient();
            }
            
            // Start new ambient track
            // Note: Actual implementation would depend on SoundManager capabilities
            this.ambientPlaying = true;
            
            console.log(`Starting ambient track: ${trackName}`);
        } catch (error) {
            console.warn('Failed to start ambient audio:', error);
        }
    }

    /**
     * Stop ambient audio
     */
    stopAmbient(): void {
        this.ensureNotDisposed();
        
        try {
            if (this.soundManager.stopAmbient) {
                this.soundManager.stopAmbient();
            }
            // Also stop space drone as part of ambient audio
            this.stopSpaceDrone();
            this.ambientPlaying = false;
        } catch (error) {
            console.warn('Failed to stop ambient audio:', error);
        }
    }

    /**
     * Check if ambient audio is playing
     */
    isAmbientPlaying(): boolean {
        return this.ambientPlaying;
    }

    /**
     * Start atmospheric space drone
     * Creates a low, vacant droning sound with ebb and flow modulation inspired by SATRN
     * @param regionType - Optional cosmic region type for unique soundscapes
     */
    startSpaceDrone(regionType?: string): void {
        this.ensureNotDisposed();
        
        if (!this.shouldPlaySound()) return;

        try {
            if (this.soundManager.startSpaceDrone) {
                this.soundManager.startSpaceDrone(regionType);
            }
        } catch (error) {
            console.warn('Failed to start space drone:', error);
        }
    }

    /**
     * Stop atmospheric space drone
     */
    stopSpaceDrone(): void {
        this.ensureNotDisposed();
        
        try {
            if (this.soundManager.stopSpaceDrone) {
                this.soundManager.stopSpaceDrone();
            }
        } catch (error) {
            console.warn('Failed to stop space drone:', error);
        }
    }

    /**
     * Check if space drone is currently playing
     */
    isSpaceDronePlaying(): boolean {
        if (this.soundManager.isSpaceDronePlaying) {
            return this.soundManager.isSpaceDronePlaying();
        }
        return false;
    }

    /**
     * Check if audio is supported by the browser
     */
    isAudioSupported(): boolean {
        return !!(window.AudioContext || (window as any).webkitAudioContext);
    }

    /**
     * Check if audio context is active
     */
    isAudioContextActive(): boolean {
        return this.audioContext?.state === 'running';
    }

    /**
     * Resume audio context (required for some browsers)
     */
    async resumeAudioContext(): Promise<void> {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
            } catch (error) {
                throw new Error(`Failed to resume audio context: ${error}`);
            }
        }
    }

    /**
     * Get current audio quality setting
     */
    getAudioQuality(): AudioQuality {
        return this.audioSettings.quality;
    }

    /**
     * Set audio quality
     */
    setAudioQuality(quality: AudioQuality): void {
        this.ensureNotDisposed();
        
        const validQualities: AudioQuality[] = ['low', 'medium', 'high'];
        if (!validQualities.includes(quality)) {
            throw new Error(`Invalid audio quality: ${quality}. Must be one of: ${validQualities.join(', ')}`);
        }
        
        this.audioSettings.quality = quality;
        this.saveSettings();
    }

    /**
     * Get available sound categories
     */
    getAvailableSoundCategories(): SoundCategory[] {
        return ['discovery', 'ambient', 'effects', 'ui'];
    }

    /**
     * Reload configuration from config service
     */
    reloadConfiguration(): void {
        this.loadConfiguration();
    }

    /**
     * Save current settings to localStorage
     */
    saveSettings(): void {
        try {
            const settingsJson = JSON.stringify(this.audioSettings);
            localStorage.setItem('astralSurveyor_audioSettings', settingsJson);
        } catch (error) {
            console.warn('Failed to save audio settings:', error);
        }
    }

    /**
     * Individual channel mute management
     */
    isMasterMuted(): boolean {
        // Delegate to sound manager if available
        if (this.soundManager.isMasterMuted && typeof this.soundManager.isMasterMuted === 'function') {
            return this.soundManager.isMasterMuted();
        }
        return this.audioSettings.muted;
    }
    
    setMasterMuted(muted: boolean): void {
        this.ensureNotDisposed();
        if (this.soundManager.setMasterMuted && typeof this.soundManager.setMasterMuted === 'function') {
            this.soundManager.setMasterMuted(muted);
        } else {
        }
    }
    
    isAmbientMuted(): boolean {
        if (this.soundManager.isAmbientMuted && typeof this.soundManager.isAmbientMuted === 'function') {
            return this.soundManager.isAmbientMuted();
        }
        return false;
    }
    
    setAmbientMuted(muted: boolean): void {
        this.ensureNotDisposed();
        if (this.soundManager.setAmbientMuted && typeof this.soundManager.setAmbientMuted === 'function') {
            this.soundManager.setAmbientMuted(muted);
        } else {
        }
    }
    
    isDiscoveryMuted(): boolean {
        if (this.soundManager.isEffectsMuted && typeof this.soundManager.isEffectsMuted === 'function') {
            return this.soundManager.isEffectsMuted();
        }
        return false;
    }
    
    setDiscoveryMuted(muted: boolean): void {
        this.ensureNotDisposed();
        if (this.soundManager.setEffectsMuted && typeof this.soundManager.setEffectsMuted === 'function') {
            this.soundManager.setEffectsMuted(muted);
        } else {
        }
    }

    /**
     * Dispose resources and clean up
     */
    dispose(): void {
        if (this.disposed) return;
        
        // Stop any playing ambient audio and space drone
        this.stopAmbient();
        this.stopSpaceDrone();
        
        // Close audio context
        if (this.audioContext && this.audioContext.state !== 'closed') {
            try {
                if (typeof this.audioContext.close === 'function') {
                    this.audioContext.close();
                }
            } catch (error) {
                console.warn('Failed to close audio context:', error);
            }
            this.audioContext = null;
        }
        
        this.disposed = true;
    }

    // Private helper methods

    private loadDefaultSettings(): AudioSettings {
        return {
            masterVolume: 0.8,
            effectsVolume: 0.6,
            ambientVolume: 0.4,
            muted: false,
            quality: 'high'
        };
    }

    private loadConfiguration(): void {
        try {
            // Load from config service
            const masterVolume = this.configService.get('audio.volume.master', this.audioSettings.masterVolume);
            const effectsVolume = this.configService.get('audio.volume.effects', this.audioSettings.effectsVolume);
            const ambientVolume = this.configService.get('audio.volume.ambient', this.audioSettings.ambientVolume);
            const quality = this.configService.get('audio.quality', this.audioSettings.quality) as AudioQuality;

            // Validate and apply configuration
            this.validateVolume(masterVolume, 'Invalid master volume');
            this.validateVolume(effectsVolume, 'Invalid effects volume');
            this.validateVolume(ambientVolume, 'Invalid ambient volume');

            this.audioSettings.masterVolume = masterVolume;
            this.audioSettings.effectsVolume = effectsVolume;
            this.audioSettings.ambientVolume = ambientVolume;
            this.audioSettings.quality = quality;

            // Try to load from localStorage (user preferences override config)
            this.loadFromLocalStorage();
        } catch (error) {
            // Re-throw validation errors for reloadConfiguration
            if (error instanceof Error && error.message.includes('Invalid')) {
                throw error;
            }
            console.warn('Error loading audio configuration:', error);
        }
    }

    private loadFromLocalStorage(): void {
        try {
            const savedSettings = localStorage.getItem('astralSurveyor_audioSettings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings) as Partial<AudioSettings>;
                
                // Merge saved settings with current settings
                if (typeof parsed.masterVolume === 'number') this.audioSettings.masterVolume = parsed.masterVolume;
                if (typeof parsed.effectsVolume === 'number') this.audioSettings.effectsVolume = parsed.effectsVolume;
                if (typeof parsed.ambientVolume === 'number') this.audioSettings.ambientVolume = parsed.ambientVolume;
                if (typeof parsed.muted === 'boolean') this.audioSettings.muted = parsed.muted;
                if (parsed.quality) this.audioSettings.quality = parsed.quality;
            }
        } catch (error) {
            console.warn('Failed to load audio settings from localStorage:', error);
        }
    }

    private initializeAudioContext(): void {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                this.audioContext = new AudioContextClass();
            }
        } catch (error) {
            console.warn('Failed to initialize audio context:', error);
        }
    }

    private validateVolume(volume: number, message: string = 'Volume must be between 0 and 1'): void {
        if (typeof volume !== 'number' || volume < 0 || volume > 1) {
            throw new Error(message);
        }
    }

    private shouldPlaySound(): boolean {
        const audioEnabled = this.configService.get('audio.enabled', true);
        return audioEnabled && !this.isMuted() && this.soundManager.isInitialized();
    }

    private applyVolumeChange(channel: string, volume: number): void {
        try {
            if (this.soundManager.setVolume) {
                this.soundManager.setVolume(channel, volume);
            }
        } catch (error) {
            console.warn(`Failed to apply volume change for ${channel}:`, error);
        }
    }

    private ensureNotDisposed(): void {
        if (this.disposed) {
            throw new Error('AudioService has been disposed');
        }
    }
}