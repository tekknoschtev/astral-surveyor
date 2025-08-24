// ServiceOrchestrator - Central event-driven coordination between services
// Replaces direct service coupling with event-based communication

import { EventDispatcher, IEventDispatcher } from './EventSystem.js';
import { AudioService } from './AudioService.js';

// Standard game event types for type safety
export const GameEvents = {
    // Discovery events
    OBJECT_DISCOVERED: 'object.discovered',
    RARE_DISCOVERY: 'object.discovered.rare',
    
    // Audio events
    AUDIO_PLAY_DISCOVERY: 'audio.play.discovery',
    AUDIO_PLAY_STAR_DISCOVERY: 'audio.play.star.discovery',
    AUDIO_PLAY_PLANET_DISCOVERY: 'audio.play.planet.discovery',
    AUDIO_PLAY_NEBULA_DISCOVERY: 'audio.play.nebula.discovery',
    AUDIO_VOLUME_CHANGED: 'audio.volume.changed',
    AUDIO_MUTE_TOGGLED: 'audio.mute.toggled',
    
    // World events
    WORLD_CHUNK_GENERATED: 'world.chunk.generated',
    WORLD_OBJECT_CREATED: 'world.object.created',
    
    // Configuration events
    CONFIG_CHANGED: 'config.changed',
    
    // UI events
    UI_NOTIFICATION: 'ui.notification',
    UI_MAP_TOGGLED: 'ui.map.toggled',
    UI_LOGBOOK_TOGGLED: 'ui.logbook.toggled'
} as const;

// Event data interfaces for type safety
export interface DiscoveryEventData {
    objectType: 'star' | 'planet' | 'moon' | 'nebula' | 'asteroids' | 'wormhole' | 'blackhole';
    objectId: string;
    position: { x: number; y: number };
    objectName?: string;
    starType?: string;
    planetType?: string;
    nebulaType?: string;
    isRare?: boolean;
}

export interface AudioEventData {
    soundType: string;
    volume?: number;
    objectType?: string;
}

export interface ConfigEventData {
    key: string;
    oldValue: unknown;
    newValue: unknown;
}

export interface WorldEventData {
    chunkCoords: { x: number; y: number };
    objectCount?: number;
    objectType?: string;
}

export interface UIEventData {
    message?: string;
    type?: 'info' | 'warning' | 'error';
    duration?: number;
}

/**
 * ServiceOrchestrator manages event-driven communication between services
 * This replaces direct service dependencies with loose coupling via events
 */
export class ServiceOrchestrator {
    private eventDispatcher: IEventDispatcher;
    private services: Map<string, unknown> = new Map();
    private disposed: boolean = false;

    constructor() {
        this.eventDispatcher = new EventDispatcher();
        this.setupEventHandlers();
    }

    /**
     * Register a service with the orchestrator
     */
    registerService(name: string, service: unknown): void {
        this.ensureNotDisposed();
        this.services.set(name, service);
        
        // Auto-wire common service event patterns
        this.wireServiceEvents(name, service);
    }

    /**
     * Get the event dispatcher for external use
     */
    getEventDispatcher(): IEventDispatcher {
        return this.eventDispatcher;
    }

    /**
     * Get a registered service by name
     */
    getService<T>(name: string): T | undefined {
        return this.services.get(name) as T;
    }

    /**
     * Emit a discovery event
     */
    emitDiscovery(data: DiscoveryEventData): void {
        this.eventDispatcher.emit(GameEvents.OBJECT_DISCOVERED, data);
        
        if (data.isRare) {
            this.eventDispatcher.emit(GameEvents.RARE_DISCOVERY, data);
        }
    }

    /**
     * Emit an audio event
     */
    emitAudioEvent(eventType: string, data: AudioEventData): void {
        this.eventDispatcher.emit(eventType, data);
    }

    /**
     * Emit a world event
     */
    emitWorldEvent(eventType: string, data: WorldEventData): void {
        this.eventDispatcher.emit(eventType, data);
    }

    /**
     * Emit a configuration change event
     */
    emitConfigChange(data: ConfigEventData): void {
        this.eventDispatcher.emit(GameEvents.CONFIG_CHANGED, data);
    }

    /**
     * Emit a UI notification event
     */
    emitNotification(data: UIEventData): void {
        this.eventDispatcher.emit(GameEvents.UI_NOTIFICATION, data);
    }

    /**
     * Dispose of the orchestrator and all event listeners
     */
    dispose(): void {
        if (this.disposed) return;
        
        this.eventDispatcher.dispose();
        this.services.clear();
        this.disposed = true;
    }

    // Private helper methods

    private setupEventHandlers(): void {
        // Discovery to Audio coordination
        this.eventDispatcher.on(GameEvents.OBJECT_DISCOVERED, (data: DiscoveryEventData) => {
            this.handleDiscoveryAudio(data);
        });

        // Configuration changes
        this.eventDispatcher.on(GameEvents.CONFIG_CHANGED, (data: ConfigEventData) => {
            this.handleConfigurationChange(data);
        });

        // Audio events
        this.eventDispatcher.on(GameEvents.AUDIO_PLAY_STAR_DISCOVERY, (data: AudioEventData) => {
            const audioService = this.getService<AudioService>('audio');
            if (audioService && data.soundType) {
                audioService.playStarDiscovery(data.soundType);
            }
        });

        this.eventDispatcher.on(GameEvents.AUDIO_PLAY_PLANET_DISCOVERY, (data: AudioEventData) => {
            const audioService = this.getService<AudioService>('audio');
            if (audioService && data.soundType) {
                audioService.playPlanetDiscovery(data.soundType);
            }
        });

        this.eventDispatcher.on(GameEvents.AUDIO_PLAY_NEBULA_DISCOVERY, (data: AudioEventData) => {
            const audioService = this.getService<AudioService>('audio');
            if (audioService && data.soundType) {
                audioService.playNebulaDiscovery(data.soundType);
            }
        });
    }

    private handleDiscoveryAudio(data: DiscoveryEventData): void {
        // Route discovery to appropriate audio event based on object type
        switch (data.objectType) {
            case 'star':
                this.eventDispatcher.emit(GameEvents.AUDIO_PLAY_STAR_DISCOVERY, {
                    soundType: data.starType || 'G-Type Star',
                    objectType: 'star'
                });
                break;
                
            case 'planet':
                this.eventDispatcher.emit(GameEvents.AUDIO_PLAY_PLANET_DISCOVERY, {
                    soundType: data.planetType || 'Rocky Planet',
                    objectType: 'planet'
                });
                break;
                
            case 'nebula':
                this.eventDispatcher.emit(GameEvents.AUDIO_PLAY_NEBULA_DISCOVERY, {
                    soundType: data.nebulaType || 'emission',
                    objectType: 'nebula'
                });
                break;
                
            case 'moon':
                // Moons use planet discovery sound
                this.eventDispatcher.emit(GameEvents.AUDIO_PLAY_PLANET_DISCOVERY, {
                    soundType: 'Moon',
                    objectType: 'moon'
                });
                break;
                
            case 'asteroids':
                // Asteroid gardens use planet discovery sound
                this.eventDispatcher.emit(GameEvents.AUDIO_PLAY_PLANET_DISCOVERY, {
                    soundType: 'Asteroid Garden',
                    objectType: 'asteroids'
                });
                break;
                
            case 'wormhole': {
                // Wormholes have special discovery sound
                const audioService = this.getService<AudioService>('audio');
                if (audioService) {
                    audioService.playDiscoverySound('wormhole');
                }
                break;
            }
                
            case 'blackhole': {
                // Black holes have special discovery sound
                const audioService2 = this.getService<AudioService>('audio');
                if (audioService2) {
                    audioService2.playDiscoverySound('blackhole');
                }
                break;
            }
        }

        // Play additional rare discovery sound for special objects
        if (data.isRare) {
            const audioService = this.getService<AudioService>('audio');
            if (audioService) {
                // Delay the rare sound slightly to layer with the primary discovery sound
                setTimeout(() => {
                    audioService.playDiscoverySound('rare');
                }, 200);
            }
        }
    }

    private handleConfigurationChange(data: ConfigEventData): void {
        // Route configuration changes to relevant services
        if (data.key.startsWith('audio.')) {
            const audioService = this.getService<AudioService>('audio');
            if (audioService) {
                audioService.reloadConfiguration();
            }
        }
    }

    private wireServiceEvents(name: string, service: unknown): void {
        // Auto-wire common service patterns based on service type
        if (name === 'audio' && service && typeof service === 'object' && 'reloadConfiguration' in service && typeof (service as any).reloadConfiguration === 'function') {
            // Audio service listens for configuration changes
            this.eventDispatcher.on(GameEvents.CONFIG_CHANGED, (data: ConfigEventData) => {
                if (data.key.startsWith('audio.')) {
                    (service as any).reloadConfiguration();
                }
            });
        }

        if (name === 'world' && service && typeof service === 'object' && 'generateChunk' in service && typeof (service as any).generateChunk === 'function') {
            // World service emits chunk generation events
            // This would be implemented by modifying WorldService to emit events
        }
    }

    private ensureNotDisposed(): void {
        if (this.disposed) {
            throw new Error('ServiceOrchestrator has been disposed');
        }
    }
}

// Singleton instance for easy access throughout the application
let instance: ServiceOrchestrator | null = null;

export function getServiceOrchestrator(): ServiceOrchestrator {
    if (!instance) {
        instance = new ServiceOrchestrator();
    }
    return instance;
}

export function resetServiceOrchestrator(): void {
    if (instance) {
        instance.dispose();
        instance = null;
    }
}