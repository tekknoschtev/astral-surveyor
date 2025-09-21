// AudioService - Simple audio management for game sounds
// Provides basic volume control and discovery sound effects

import type { ConfigService } from '../config/ConfigService.js';

// SoundManager interface
interface ISoundManager {
    isInitialized(): boolean;
    isMuted(): boolean;
    toggleMute(): boolean;
    playStarDiscovery(starType: string): void;
    playPlanetDiscovery(planetType: string): void;
    playNebulaDiscovery(nebulaType: string): void;
    playCrystalGardenDiscovery(variant: string): void;
    setVolume?(channel: string, volume: number): void;
    startSpaceDrone?(regionType?: string): void;
    stopSpaceDrone?(): void;
    isSpaceDronePlaying?(): boolean;
}

export class AudioService {
    private soundManager: ISoundManager;
    private volume: number = 0.8;
    private muted: boolean = false;

    constructor(configService: ConfigService, soundManager: ISoundManager) {
        this.soundManager = soundManager;
        this.loadSettings();
        this.syncMuteState();
    }

    // Volume management
    getVolume(): number {
        return this.volume;
    }

    setVolume(volume: number): void {
        if (volume >= 0 && volume <= 1) {
            this.volume = volume;
            try {
                if (this.soundManager.setVolume) {
                    this.soundManager.setVolume('master', volume);
                }
            } catch (error) {
                // Ignore sound manager errors gracefully
            }
            this.saveSettings();
        }
    }

    // Individual volume controls for compatibility
    setMasterVolume(volume: number): void { this.setVolume(volume); }
    setAmbientVolume(volume: number): void { this.setVolume(volume); }
    setEffectsVolume(volume: number): void { this.setVolume(volume); }

    // Individual mute controls for compatibility
    setMuted(muted: boolean): void {
        this.muted = muted;
        if (this.soundManager.isMuted() !== muted) {
            this.soundManager.toggleMute();
        }
        this.saveSettings();
    }
    setMasterMuted(muted: boolean): void { this.setMuted(muted); }
    setAmbientMuted(muted: boolean): void { this.setMuted(muted); }
    setDiscoveryMuted(muted: boolean): void { this.setMuted(muted); }

    // Mute management
    isMuted(): boolean {
        return this.muted;
    }

    toggleMute(): boolean {
        this.muted = this.soundManager.toggleMute();
        this.saveSettings();
        return this.muted;
    }

    // Discovery sounds
    playDiscoverySound(objectType: string): void {
        if (this.shouldPlaySound()) {
            try {
                if (objectType.includes('star') || objectType.includes('Star')) {
                    this.soundManager.playStarDiscovery(objectType);
                } else if (objectType.includes('planet') || objectType.includes('Planet')) {
                    this.soundManager.playPlanetDiscovery(objectType);
                } else if (objectType.includes('nebula') || objectType.includes('Nebula')) {
                    this.soundManager.playNebulaDiscovery(objectType);
                } else if (objectType === 'crystal-garden') {
                    this.soundManager.playCrystalGardenDiscovery('pure');
                }
            } catch (error) {
                // Ignore sound manager errors gracefully
            }
        }
    }

    // Space drone ambient audio
    startSpaceDrone(regionType?: string): void {
        if (this.shouldPlaySound() && this.soundManager.startSpaceDrone) {
            this.soundManager.startSpaceDrone(regionType);
        }
    }

    stopSpaceDrone(): void {
        if (this.soundManager.stopSpaceDrone) {
            this.soundManager.stopSpaceDrone();
        }
    }

    isSpaceDronePlaying(): boolean {
        return this.soundManager.isSpaceDronePlaying?.() || false;
    }

    // Private methods
    private shouldPlaySound(): boolean {
        return !this.muted && this.soundManager.isInitialized();
    }

    private loadSettings(): void {
        try {
            const saved = localStorage.getItem('astralSurveyor_audioSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.volume = settings.volume || 0.8;
                this.muted = settings.muted || false;
            }
        } catch (error) {
            // Use defaults
        }
    }

    private saveSettings(): void {
        try {
            const settings = { volume: this.volume, muted: this.muted };
            localStorage.setItem('astralSurveyor_audioSettings', JSON.stringify(settings));
        } catch (error) {
            // Ignore save errors
        }
    }

    /**
     * Synchronize the mute state with the sound manager after loading settings
     */
    private syncMuteState(): void {
        if (this.muted !== this.soundManager.isMuted()) {
            this.soundManager.toggleMute();
        }
    }
}