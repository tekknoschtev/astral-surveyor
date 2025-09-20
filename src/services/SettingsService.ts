// SettingsService - User preference management and persistence
// Handles all user settings with localStorage persistence and event system

import type { AudioService } from './AudioService.js';

// Settings data structure
interface UserSettings {
    // Audio settings
    ambientVolume: number;
    discoveryVolume: number; 
    masterVolume: number;
    ambientMuted: boolean;
    discoveryMuted: boolean;
    masterMuted: boolean;
    
    // Display settings
    showCoordinates: boolean;
    uiScale: number;
    fullscreen: boolean;
    
    // Internal tracking
    version: string;
}

// Settings change event
interface SettingsChangeEvent {
    type: 'settingsChanged';
    setting: string;
    value: unknown;
    previousValue: unknown;
}

export class SettingsService {
    private readonly audioService: AudioService;
    private settings: UserSettings;
    private readonly instanceId: string = `SettingsService-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    private previousVolumes: { ambient: number; discovery: number; master: number } = {
        ambient: 60,
        discovery: 70,
        master: 80
    };
    private eventListeners: Map<string, ((...args: unknown[]) => void)[]> = new Map();
    
    // Callbacks for external operations
    onDistanceReset?: () => void;
    onDiscoveryHistoryClear?: () => void;

    constructor(audioService: AudioService) {
        if (!audioService) {
            throw new Error('AudioService is required');
        }
        
        this.audioService = audioService;
        this.settings = this.getDefaultSettings();
        this.loadSettings();
    }

    private getDefaultSettings(): UserSettings {
        return {
            // Audio defaults
            ambientVolume: 60,
            discoveryVolume: 70,
            masterVolume: 80,
            ambientMuted: false,
            discoveryMuted: false,
            masterMuted: false,
            
            // Display defaults
            showCoordinates: false,
            uiScale: 1.0,
            fullscreen: false,
            
            version: '1.0.0'
        };
    }

    private loadSettings(): void {
        try {
            if (typeof localStorage === 'undefined' || !localStorage) {
                return; // Gracefully handle missing localStorage
            }
            
            const saved = localStorage.getItem('astralSurveyor_settings');
            if (saved) {
                const parsedSettings = JSON.parse(saved);
                
                // Merge with defaults to handle new settings in updates
                this.settings = { ...this.settings, ...parsedSettings };
                
                // Store previous volumes for unmuting
                if (!this.settings.ambientMuted) {
                    this.previousVolumes.ambient = this.settings.ambientVolume;
                }
                if (!this.settings.discoveryMuted) {
                    this.previousVolumes.discovery = this.settings.discoveryVolume;
                }
                if (!this.settings.masterMuted) {
                    this.previousVolumes.master = this.settings.masterVolume;
                }
                
                // Sync initial state with audio service
                this.syncWithAudioService();
            } else {
            }
        } catch (error) {
            console.warn('Failed to load settings, using defaults:', error);
            this.settings = this.getDefaultSettings();
        }
    }

    private saveSettings(): void {
        try {
            if (typeof localStorage === 'undefined' || !localStorage) {
                return;
            }
            
            const settingsJson = JSON.stringify(this.settings);
            localStorage.setItem('astralSurveyor_settings', settingsJson);
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }

    private syncWithAudioService(): void {
        // Convert percentage to 0-1 range for AudioService
        const ambientVol = this.settings.ambientMuted ? 0 : this.settings.ambientVolume / 100;
        const discoveryVol = this.settings.discoveryMuted ? 0 : this.settings.discoveryVolume / 100;
        const masterVol = this.settings.masterMuted ? 0 : this.settings.masterVolume / 100;
        
        this.audioService.setAmbientVolume(ambientVol);
        this.audioService.setEffectsVolume(discoveryVol);
        this.audioService.setMasterVolume(masterVol);
        this.audioService.setMuted(this.settings.masterMuted);
    }

    private validateVolume(volume: unknown): void {
        if (typeof volume !== 'number') {
            throw new Error('Volume must be a number');
        }
        if (volume < 0 || volume > 100) {
            throw new Error('Volume must be between 0 and 100');
        }
    }

    private validateUIScale(scale: unknown): void {
        if (typeof scale !== 'number') {
            throw new Error('UI scale must be a number');
        }
        if (scale < 0.5 || scale > 2.0) {
            throw new Error('UI scale must be between 0.5 and 2.0');
        }
    }

    private validateBoolean(value: unknown, settingName: string): void {
        if (typeof value !== 'boolean') {
            throw new Error(`${settingName} must be a boolean`);
        }
    }

    private emitSettingsChange(setting: string, value: unknown, previousValue: unknown): void {
        const event: SettingsChangeEvent = {
            type: 'settingsChanged',
            setting,
            value,
            previousValue
        };
        
        const listeners = this.eventListeners.get('settingsChanged') || [];
        listeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.warn('Settings event listener error:', error);
            }
        });
    }

    // Audio Volume Management
    getAmbientVolume(): number {
        return this.settings.ambientMuted ? 0 : this.settings.ambientVolume;
    }

    setAmbientVolume(volume: number): void {
        this.validateVolume(volume);
        
        const previousValue = this.getAmbientVolume();
        
        if (!this.settings.ambientMuted) {
            this.previousVolumes.ambient = volume;
        }
        this.settings.ambientVolume = volume;
        
        if (!this.settings.ambientMuted) {
            this.audioService.setAmbientVolume(volume / 100);
        }
        
        this.saveSettings();
        this.emitSettingsChange('ambientVolume', volume, previousValue);
    }

    getDiscoveryVolume(): number {
        return this.settings.discoveryMuted ? 0 : this.settings.discoveryVolume;
    }

    setDiscoveryVolume(volume: number): void {
        this.validateVolume(volume);
        
        const previousValue = this.getDiscoveryVolume();
        
        if (!this.settings.discoveryMuted) {
            this.previousVolumes.discovery = volume;
        }
        this.settings.discoveryVolume = volume;
        
        if (!this.settings.discoveryMuted) {
            this.audioService.setEffectsVolume(volume / 100);
        }
        
        this.saveSettings();
        this.emitSettingsChange('discoveryVolume', volume, previousValue);
    }

    getMasterVolume(): number {
        return this.settings.masterMuted ? 0 : this.settings.masterVolume;
    }

    setMasterVolume(volume: number): void {
        this.validateVolume(volume);
        
        const previousValue = this.getMasterVolume();
        
        if (!this.settings.masterMuted) {
            this.previousVolumes.master = volume;
        }
        this.settings.masterVolume = volume;
        
        if (!this.settings.masterMuted) {
            this.audioService.setMasterVolume(volume / 100);
        }
        
        this.saveSettings();
        this.emitSettingsChange('masterVolume', volume, previousValue);
    }

    // Audio Mute Management
    isAmbientMuted(): boolean {
        return this.settings.ambientMuted;
    }

    setAmbientMuted(muted: boolean): void {
        this.validateBoolean(muted, 'Ambient muted');
        
        const previousValue = this.settings.ambientMuted;
        this.settings.ambientMuted = muted;
        
        if (muted) {
            this.audioService.setAmbientMuted(true);
        } else {
            this.settings.ambientVolume = this.previousVolumes.ambient;
            this.audioService.setAmbientMuted(false);
            this.audioService.setAmbientVolume(this.settings.ambientVolume / 100);
        }
        
        this.saveSettings();
        this.emitSettingsChange('ambientMuted', muted, previousValue);
    }

    isDiscoveryMuted(): boolean {
        return this.settings.discoveryMuted;
    }

    setDiscoveryMuted(muted: boolean): void {
        this.validateBoolean(muted, 'Discovery muted');
        
        const previousValue = this.settings.discoveryMuted;
        this.settings.discoveryMuted = muted;
        
        if (muted) {
            this.audioService.setDiscoveryMuted(true);
        } else {
            this.settings.discoveryVolume = this.previousVolumes.discovery;
            this.audioService.setDiscoveryMuted(false);
            this.audioService.setEffectsVolume(this.settings.discoveryVolume / 100);
        }
        
        this.saveSettings();
        this.emitSettingsChange('discoveryMuted', muted, previousValue);
    }

    isMasterMuted(): boolean {
        return this.settings.masterMuted;
    }

    setMasterMuted(muted: boolean): void {
        this.validateBoolean(muted, 'Master muted');
        
        const previousValue = this.settings.masterMuted;
        this.settings.masterMuted = muted;
        
        this.audioService.setMasterMuted(muted);
        
        if (!muted) {
            this.settings.masterVolume = this.previousVolumes.master;
            this.audioService.setMasterVolume(this.settings.masterVolume / 100);
        }
        
        this.saveSettings();
        this.emitSettingsChange('masterMuted', muted, previousValue);
    }

    // Display Settings
    getShowCoordinates(): boolean {
        return this.settings.showCoordinates;
    }

    setShowCoordinates(show: boolean): void {
        this.validateBoolean(show, 'Show coordinates');
        
        const previousValue = this.settings.showCoordinates;
        this.settings.showCoordinates = show;
        
        this.saveSettings();
        this.emitSettingsChange('showCoordinates', show, previousValue);
    }

    getUIScale(): number {
        return this.settings.uiScale;
    }

    setUIScale(scale: number): void {
        this.validateUIScale(scale);
        
        const previousValue = this.settings.uiScale;
        this.settings.uiScale = scale;
        
        this.saveSettings();
        this.emitSettingsChange('uiScale', scale, previousValue);
    }

    isFullscreen(): boolean {
        return this.settings.fullscreen;
    }

    setFullscreen(fullscreen: boolean): void {
        this.validateBoolean(fullscreen, 'Fullscreen');
        
        const previousValue = this.settings.fullscreen;
        this.settings.fullscreen = fullscreen;
        
        // Handle actual fullscreen API (if available)
        try {
            if (fullscreen && document.documentElement && typeof document.documentElement.requestFullscreen === 'function' && !document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.warn('Failed to enter fullscreen:', err);
                });
            } else if (!fullscreen && document.fullscreenElement && typeof document.exitFullscreen === 'function') {
                document.exitFullscreen().catch(err => {
                    console.warn('Failed to exit fullscreen:', err);
                });
            }
        } catch (error) {
            // Fullscreen API not available (e.g., in tests)
            console.warn('Fullscreen API not available:', error);
        }
        
        this.saveSettings();
        this.emitSettingsChange('fullscreen', fullscreen, previousValue);
    }

    // Data Management
    exportSaveData(): string {
        const exportData = {
            version: '1.0.0',
            exportDate: new Date().toISOString(),
            settings: { ...this.settings },
            userStats: {
                // These would be provided by external systems
                distanceTraveled: 0, // Placeholder
                discoveryCount: 0    // Placeholder
            }
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    resetDistanceTraveled(): void {
        if (this.onDistanceReset) {
            this.onDistanceReset();
        }
        
        this.emitSettingsChange('distanceReset', true, false);
    }

    clearDiscoveryHistory(): void {
        if (this.onDiscoveryHistoryClear) {
            this.onDiscoveryHistoryClear();
        }
        
        this.emitSettingsChange('discoveryHistoryCleared', true, false);
    }

    // Event System
    addEventListener(eventType: string, listener: (...args: unknown[]) => void): void {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }
        
        const listeners = this.eventListeners.get(eventType)!;
        listeners.push(listener);
    }

    removeEventListener(eventType: string, listener: (...args: unknown[]) => void): void {
        const listeners = this.eventListeners.get(eventType);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
}