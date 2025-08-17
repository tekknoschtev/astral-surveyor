// Plugin System Type Definitions
// Interfaces for extensible plugin architecture

export type PluginType = 'celestial' | 'discovery' | 'audio' | 'visual' | 'gameplay' | 'data';

export interface PluginAPI {
    celestialFactory: ICelestialFactory;
    discoveryService: IDiscoveryService;
    audioService: IAudioService;
}

export interface Plugin {
    id: string;
    name: string;
    version: string;
    type: PluginType;
    description?: string;
    author?: string;
    
    // Plugin lifecycle methods
    register(api: PluginAPI): void;
    unregister(api: PluginAPI): void;
}

export interface PluginInfo {
    id: string;
    name: string;
    version: string;
    type: PluginType;
    status: 'active' | 'disabled' | 'error';
    description?: string;
    author?: string;
    registeredAt?: Date;
    error?: string;
}

export interface PluginSystemStatus {
    totalPlugins: number;
    activePlugins: number;
    disabledPlugins: number;
    erroredPlugins: number;
    pluginTypes: Record<PluginType, number>;
}

// Extended interfaces for plugin-enhanced services
export interface ICelestialFactory {
    registerType(typeName: string, config: CelestialObjectConfig): void;
    unregisterType(typeName: string): void;
    getRegisteredTypes(): string[];
    create(typeName: string, ...args: any[]): any;
}

export interface CelestialObjectConfig {
    create: (...args: any[]) => any;
    rarity?: number;
    discoveryPoints?: number;
    renderEffects?: string[];
    interactable?: boolean;
}

export interface IDiscoveryService {
    addDiscoveryType(typeName: string, config: DiscoveryTypeConfig): void;
    removeDiscoveryType(typeName: string): void;
    getDiscoveryTypes(): string[];
}

export interface DiscoveryTypeConfig {
    triggerCondition?: (object: any) => boolean;
    loreText?: string;
    audioEffect?: string;
    requiresProximity?: number;
    unlocksCodes?: string[];
    specialEffect?: string;
}

export interface IAudioService {
    addSoundscape(name: string, config: SoundscapeConfig): void;
    removeSoundscape(name: string): void;
    getSoundscapes(): string[];
}

export interface SoundscapeConfig {
    tracks: string[];
    triggerZones?: string[];
    fadeDuration?: number;
    volume?: number;
    loop?: boolean;
}

// Plugin-specific interfaces
export interface CelestialObjectPlugin extends Plugin {
    type: 'celestial';
    objectTypes: string[];
}

export interface DiscoveryPlugin extends Plugin {
    type: 'discovery';
    discoveryTypes: string[];
}

export interface AudioPlugin extends Plugin {
    type: 'audio';
    soundscapes: string[];
}

export interface VisualPlugin extends Plugin {
    type: 'visual';
    themes: string[];
}

export interface GameplayPlugin extends Plugin {
    type: 'gameplay';
    features: string[];
}

export interface DataPlugin extends Plugin {
    type: 'data';
    exporters: string[];
}