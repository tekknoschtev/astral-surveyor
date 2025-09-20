// SaveLoadService - Simple game state persistence
// Manages localStorage save/load with minimal complexity

import type { IStorageService, StorageResult } from './StorageService.js';
import type { StateManager } from './StateManager.js';
import type { DiscoveryLogbook } from '../ui/discoverylogbook.js';
import type { Camera } from '../camera/camera.js';
import type { ChunkManager } from '../world/ChunkManager.js';
import type { SimplifiedDiscoveryService } from './SimplifiedDiscoveryService.js';
import { getUniverseSeed, setUniverseSeed, getUniverseResetCount } from '../utils/random.js';

// Simple save data structure
export interface SaveGameData {
    version: string;
    timestamp: number;
    player: { x: number; y: number; velocityX: number; velocityY: number; distanceTraveled: number };
    world: { currentSeed: string; universeResetCount: number };
    discoveries: Array<{ name: string; type: string; timestamp: number }>;
    discoveredObjects: Array<{ objectId: string; discoveryData: any }>;
    discoveryManager?: any;
    stats: { sessionStartTime: number; totalPlayTime: number };
}

export class SaveLoadService {
    private readonly defaultSlot = 'gameState';
    private readonly currentVersion = '1.0.0';
    private autoSaveTimer?: number;
    private discoveryManager?: SimplifiedDiscoveryService;

    constructor(
        private storageService: IStorageService,
        private stateManager: StateManager,
        private camera: Camera,
        private discoveryLogbook: DiscoveryLogbook,
        private chunkManager: ChunkManager,
        discoveryManager?: SimplifiedDiscoveryService,
        settingsService?: any // Optional for backward compatibility
    ) {
        if (discoveryManager) {
            this.discoveryManager = discoveryManager;
        }
    }

    setDiscoveryManager(discoveryManager: SimplifiedDiscoveryService): void {
        this.discoveryManager = discoveryManager;
    }

    // Save game state
    async saveGame(slotName: string = this.defaultSlot): Promise<StorageResult<void>> {
        try {
            const saveData = this.collectGameState();
            return this.storageService.setItem(slotName, saveData, { version: this.currentVersion });
        } catch (error) {
            return { success: false, error: `Save failed: ${error}` };
        }
    }

    // Load game state
    async loadGame(slotName: string = this.defaultSlot): Promise<StorageResult<SaveGameData>> {
        const result = this.storageService.getItem<SaveGameData>(slotName);

        if (!result.success || !result.data) {
            return result;
        }

        try {
            // Validate save data structure
            if (!this.validateSaveData(result.data)) {
                return { success: false, error: 'Save data validation failed' };
            }

            await this.restoreGameState(result.data);
            return result;
        } catch (error) {
            return { success: false, error: `Load failed: ${error}` };
        }
    }

    // Check if save exists
    hasSavedGame(slotName: string = this.defaultSlot): boolean {
        return this.storageService.getItem(slotName).success;
    }

    // Delete saved game
    deleteSavedGame(slotName: string = this.defaultSlot): StorageResult<void> {
        return this.storageService.removeItem(slotName);
    }

    // Enable auto-save
    enableAutoSave(intervalMinutes: number = 5): void {
        this.disableAutoSave();
        this.autoSaveTimer = window.setInterval(() => {
            this.saveGame().catch(() => {}); // Silent fail for auto-save
        }, intervalMinutes * 60 * 1000);
    }

    // Disable auto-save
    disableAutoSave(): void {
        if (this.autoSaveTimer) {
            window.clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = undefined;
        }
    }

    // Save on discovery
    async saveOnDiscovery(): Promise<void> {
        await this.saveGame();
    }

    // Get information about existing save game
    async getSaveGameInfo(slotName: string = this.defaultSlot): Promise<{ exists: boolean; timestamp?: number; version?: string }> {
        const result = this.storageService.getItem<SaveGameData>(slotName);

        if (!result.success) {
            return { exists: false };
        }

        return {
            exists: true,
            timestamp: result.data?.timestamp,
            version: this.currentVersion
        };
    }

    // Get list of available save slots
    getAvailableSaveSlots(): string[] {
        const slots: string[] = [];

        if (this.hasSavedGame(this.defaultSlot)) {
            slots.push(this.defaultSlot);
        }

        return slots;
    }

    // Collect current game state
    private collectGameState(): SaveGameData {
        const discoveries = this.discoveryLogbook.getDiscoveries().map(d => ({
            name: d.name,
            type: d.type,
            timestamp: d.timestamp
        }));

        const discoveredObjects: Array<{ objectId: string; discoveryData: any }> = [];
        for (const [objectId, discoveryData] of (this.chunkManager as any).discoveredObjects) {
            discoveredObjects.push({ objectId, discoveryData });
        }

        const sessionStart = (globalThis as any).sessionStartTime || Date.now();
        const sessionDuration = Date.now() - sessionStart;

        return {
            version: this.currentVersion,
            timestamp: Date.now(),

            player: {
                x: this.camera.x,
                y: this.camera.y,
                velocityX: this.camera.velocityX || 0,
                velocityY: this.camera.velocityY || 0,
                distanceTraveled: this.camera.getSessionDistance()
            },

            world: {
                currentSeed: getUniverseSeed().toString(),
                universeResetCount: getUniverseResetCount()
            },

            discoveries,
            discoveredObjects,
            discoveryManager: this.discoveryManager?.exportDiscoveryData(),

            stats: {
                sessionStartTime: sessionStart,
                totalPlayTime: ((globalThis as any).totalPlayTime || 0) + sessionDuration
            }
        };
    }

    // Restore game state from save data
    private async restoreGameState(saveData: SaveGameData): Promise<void> {
        // Restore player position
        this.camera.x = saveData.player.x;
        this.camera.y = saveData.player.y;

        if (this.camera.velocityX !== undefined) {
            this.camera.velocityX = saveData.player.velocityX;
        }
        if (this.camera.velocityY !== undefined) {
            this.camera.velocityY = saveData.player.velocityY;
        }

        // Restore distance
        if (this.camera.sessionDistanceTraveled !== undefined) {
            this.camera.sessionDistanceTraveled = saveData.player.distanceTraveled;
        }

        // Restore world seed
        if (saveData.world.currentSeed) {
            const seed = parseInt(saveData.world.currentSeed, 10);
            if (!isNaN(seed)) {
                setUniverseSeed(seed);
            }
        }

        // Restore discoveries
        this.discoveryLogbook.clearHistory();
        saveData.discoveries.forEach(discovery => {
            this.discoveryLogbook.addDiscovery(discovery.name, discovery.type, discovery.timestamp);
        });

        // Restore discovered objects
        (this.chunkManager as any).discoveredObjects.clear();
        saveData.discoveredObjects.forEach(({ objectId, discoveryData }) => {
            (this.chunkManager as any).discoveredObjects.set(objectId, discoveryData);
        });

        // Restore discovery manager
        if (this.discoveryManager && saveData.discoveryManager) {
            this.discoveryManager.importDiscoveryData(saveData.discoveryManager);
        }

        // Update session tracking
        (globalThis as any).sessionStartTime = Date.now() - (saveData.stats.totalPlayTime || 0);
    }

    // Validate save data structure
    private validateSaveData(data: any): data is SaveGameData {
        if (!data || typeof data !== 'object') {
            console.log('Validation failed: not object or null/undefined');
            return false;
        }

        // Check required top-level properties - all must exist
        if (!data.version || !data.timestamp || !data.player || !data.world ||
            !data.hasOwnProperty('discoveries') || !data.hasOwnProperty('discoveredObjects')) {
            console.log('Validation failed: missing required properties', JSON.stringify(data));
            return false;
        }

        // Validate arrays
        if (!Array.isArray(data.discoveries) || !Array.isArray(data.discoveredObjects)) {
            console.log('Validation failed: invalid arrays', typeof data.discoveries, typeof data.discoveredObjects);
            return false;
        }

        // Validate player data
        const player = data.player;
        if (!player || typeof player.x !== 'number' || typeof player.y !== 'number') {
            console.log('Validation failed: invalid player data', player);
            return false;
        }

        // Validate world data
        const world = data.world;
        if (!world || !world.currentSeed || typeof world.currentSeed !== 'string') {
            console.log('Validation failed: invalid world data', world);
            return false;
        }

        console.log('Validation passed for:', JSON.stringify(data));
        return true;
    }
}