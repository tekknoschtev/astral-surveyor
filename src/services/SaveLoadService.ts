// SaveLoadService - Game state persistence orchestration
// Manages complete game state serialization and restoration

import type { IStorageService, StorageResult } from './StorageService.js';
import type { StateManager } from './StateManager.js';
import type { DiscoveryLogbook } from '../ui/discoverylogbook.js';
import type { Camera } from '../camera/camera.js';
import type { SettingsService } from './SettingsService.js';
import type { ChunkManager } from '../world/ChunkManager.js';
import { getUniverseSeed, setUniverseSeed, getUniverseResetCount } from '../utils/random.js';

// Serializable game state structure
export interface SaveGameData {
    version: string;
    timestamp: number;
    
    // Core game state
    player: {
        x: number;
        y: number;
        velocityX: number;
        velocityY: number;
        distanceTraveled: number;
    };
    
    // World state
    world: {
        currentSeed: string;
        universeResetCount: number;
    };
    
    // Discovery progress
    discoveries: Array<{
        name: string;
        type: string;
        timestamp: number;
    }>;
    
    // ChunkManager discovery state
    discoveredObjects: Array<{
        objectId: string;
        discoveryData: any;
    }>;
    
    // Game statistics
    stats: {
        sessionStartTime: number;
        totalPlayTime: number;
        firstDiscoveryTime?: number;
        lastDiscoveryTime?: number;
    };
}

export interface ISaveLoadService {
    saveGame(slotName?: string): Promise<StorageResult<void>>;
    loadGame(slotName?: string): Promise<StorageResult<SaveGameData>>;
    hasSavedGame(slotName?: string): boolean;
    deleteSavedGame(slotName?: string): StorageResult<void>;
    getSaveGameInfo(slotName?: string): Promise<{ exists: boolean; timestamp?: number; version?: string }>;
    getAvailableSaveSlots(): string[];
    enableAutoSave(intervalMinutes?: number): void;
    disableAutoSave(): void;
    saveOnDiscovery(): Promise<void>;
}

export class SaveLoadService implements ISaveLoadService {
    private readonly defaultSlot = 'gameState';
    private readonly currentVersion = '1.0.0';
    private autoSaveTimer?: number;
    private autoSaveInterval: number = 5 * 60 * 1000; // 5 minutes default
    
    constructor(
        private storageService: IStorageService,
        private stateManager: StateManager,
        private camera: Camera,
        private discoveryLogbook: DiscoveryLogbook,
        private chunkManager: ChunkManager,
        private settingsService?: SettingsService
    ) {}

    /**
     * Save complete game state to localStorage
     */
    async saveGame(slotName: string = this.defaultSlot): Promise<StorageResult<void>> {
        try {
            const saveData = this.collectGameState();
            
            const result = this.storageService.setItem(slotName, saveData, {
                version: this.currentVersion
            });
            
            if (result.success) {
                // Emit save success event for UI feedback
                this.emitSaveEvent('game-saved', { timestamp: saveData.timestamp });
            }
            
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown save error';
            return { success: false, error: `Failed to save game: ${errorMessage}` };
        }
    }

    /**
     * Load game state from localStorage
     */
    async loadGame(slotName: string = this.defaultSlot): Promise<StorageResult<SaveGameData>> {
        const result = this.storageService.getItem<SaveGameData>(slotName);
        
        if (!result.success) {
            return result;
        }

        try {
            // Validate save data structure
            if (!this.validateSaveData(result.data)) {
                return { success: false, error: 'Save data validation failed' };
            }

            // Apply loaded state to game systems
            await this.restoreGameState(result.data!);
            
            // Emit load success event
            this.emitSaveEvent('game-loaded', { 
                timestamp: result.data!.timestamp,
                version: result.version 
            });
            
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown load error';
            return { success: false, error: `Failed to load game: ${errorMessage}` };
        }
    }

    /**
     * Check if a saved game exists
     */
    hasSavedGame(slotName: string = this.defaultSlot): boolean {
        const result = this.storageService.getItem(slotName);
        return result.success;
    }

    /**
     * Delete saved game data
     */
    deleteSavedGame(slotName: string = this.defaultSlot): StorageResult<void> {
        return this.storageService.removeItem(slotName);
    }

    /**
     * Get information about existing save game
     */
    async getSaveGameInfo(slotName: string = this.defaultSlot): Promise<{ exists: boolean; timestamp?: number; version?: string }> {
        const result = this.storageService.getItem<SaveGameData>(slotName);
        
        if (!result.success) {
            return { exists: false };
        }

        return {
            exists: true,
            timestamp: result.data?.timestamp,
            version: result.version
        };
    }

    /**
     * Get list of available save slots
     */
    getAvailableSaveSlots(): string[] {
        // For single slot implementation, return array with default slot if it exists
        const slots: string[] = [];
        
        if (this.hasSavedGame(this.defaultSlot)) {
            slots.push(this.defaultSlot);
        }
        
        return slots;
    }

    /**
     * Collect current game state for serialization
     */
    private collectGameState(): SaveGameData {
        // Get current discoveries from logbook
        const discoveries = this.discoveryLogbook.getDiscoveries().map(d => ({
            name: d.name,
            type: d.type,
            timestamp: d.timestamp
        }));
        
        // Get discovered objects from ChunkManager
        const discoveredObjects: Array<{ objectId: string; discoveryData: any }> = [];
        for (const [objectId, discoveryData] of (this.chunkManager as any).discoveredObjects) {
            discoveredObjects.push({ objectId, discoveryData });
        }

        // Calculate total play time (basic implementation)
        const sessionStart = this.getSessionStartTime();
        const currentTime = Date.now();
        const sessionDuration = currentTime - sessionStart;

        return {
            version: this.currentVersion,
            timestamp: Date.now(),
            
            player: {
                x: this.camera.x,
                y: this.camera.y,
                velocityX: this.camera.velocityX || 0,
                velocityY: this.camera.velocityY || 0,
                distanceTraveled: this.getDistanceTraveled()
            },
            
            world: {
                currentSeed: this.getCurrentSeed(),
                universeResetCount: this.getUniverseResetCount()
            },
            
            discoveries: discoveries,
            discoveredObjects: discoveredObjects,
            
            stats: {
                sessionStartTime: sessionStart,
                totalPlayTime: this.getTotalPlayTime() + sessionDuration,
                firstDiscoveryTime: this.getFirstDiscoveryTime(discoveries),
                lastDiscoveryTime: this.getLastDiscoveryTime(discoveries)
            }
        };
    }

    /**
     * Restore game state from loaded data
     */
    private async restoreGameState(saveData: SaveGameData): Promise<void> {
        // Restore player position and velocity
        this.camera.x = saveData.player.x;
        this.camera.y = saveData.player.y;
        
        if (this.camera.velocityX !== undefined) {
            this.camera.velocityX = saveData.player.velocityX;
        }
        if (this.camera.velocityY !== undefined) {
            this.camera.velocityY = saveData.player.velocityY;
        }

        // Restore world state
        if (saveData.world.currentSeed) {
            this.setCurrentSeed(saveData.world.currentSeed);
        }

        // Restore discoveries in logbook
        this.discoveryLogbook.clearHistory();
        saveData.discoveries.forEach(discovery => {
            this.discoveryLogbook.addDiscovery(discovery.name, discovery.type, discovery.timestamp);
        });
        
        // Restore ChunkManager discovered objects map
        (this.chunkManager as any).discoveredObjects.clear();
        saveData.discoveredObjects.forEach(({ objectId, discoveryData }) => {
            (this.chunkManager as any).discoveredObjects.set(objectId, discoveryData);
        });

        // Update session tracking
        this.setSessionStartTime(Date.now() - (saveData.stats.totalPlayTime || 0));
    }

    /**
     * Validate save data structure
     */
    private validateSaveData(data: any): data is SaveGameData {
        if (!data || typeof data !== 'object') return false;
        
        // Check required top-level properties
        if (!data.version || !data.timestamp || !data.player || !data.world || !data.discoveries || !data.discoveredObjects) {
            return false;
        }
        
        // Validate discoveredObjects array
        if (!Array.isArray(data.discoveredObjects)) {
            return false;
        }

        // Validate player data
        const player = data.player;
        if (typeof player.x !== 'number' || typeof player.y !== 'number') {
            return false;
        }

        // Validate world data
        const world = data.world;
        if (!world.currentSeed || typeof world.currentSeed !== 'string') {
            return false;
        }

        // Validate discoveries array
        if (!Array.isArray(data.discoveries)) {
            return false;
        }

        return true;
    }

    /**
     * Emit save/load events for UI feedback
     */
    private emitSaveEvent(eventType: string, data: any): void {
        // Use global event system if available
        if (typeof window !== 'undefined' && (window as any).gameEventSystem) {
            (window as any).gameEventSystem.emit(eventType, data);
        }
    }

    // Helper methods for accessing game state
    // These will need to be implemented based on actual game architecture

    private getDistanceTraveled(): number {
        // Access distance from camera or separate tracking
        return (this.camera as any).distanceTraveled || 0;
    }

    private getCurrentSeed(): string {
        return getUniverseSeed().toString();
    }

    private getUniverseResetCount(): number {
        return getUniverseResetCount();
    }

    private setCurrentSeed(seed: string): void {
        const numericSeed = parseInt(seed, 10);
        if (!isNaN(numericSeed)) {
            setUniverseSeed(numericSeed);
        }
    }

    private getSessionStartTime(): number {
        return (globalThis as any).sessionStartTime || Date.now();
    }

    private setSessionStartTime(time: number): void {
        (globalThis as any).sessionStartTime = time;
    }

    private getTotalPlayTime(): number {
        return (globalThis as any).totalPlayTime || 0;
    }

    private getFirstDiscoveryTime(discoveries: any[]): number | undefined {
        if (discoveries.length === 0) return undefined;
        return Math.min(...discoveries.map(d => d.timestamp));
    }

    private getLastDiscoveryTime(discoveries: any[]): number | undefined {
        if (discoveries.length === 0) return undefined;
        return Math.max(...discoveries.map(d => d.timestamp));
    }

    /**
     * Enable periodic auto-save functionality
     */
    enableAutoSave(intervalMinutes: number = 5): void {
        this.disableAutoSave(); // Clear any existing timer
        
        this.autoSaveInterval = intervalMinutes * 60 * 1000;
        this.autoSaveTimer = window.setInterval(async () => {
            try {
                const result = await this.saveGame();
                if (result.success) {
                } else {
                }
            } catch (error) {
            }
        }, this.autoSaveInterval);
        
    }

    /**
     * Disable auto-save functionality
     */
    disableAutoSave(): void {
        if (this.autoSaveTimer) {
            window.clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = undefined;
        }
    }

    /**
     * Save game when discovery is made (non-blocking)
     */
    async saveOnDiscovery(): Promise<void> {
        try {
            const result = await this.saveGame();
            if (result.success) {
            } else {
            }
        } catch (error) {
        }
    }
}