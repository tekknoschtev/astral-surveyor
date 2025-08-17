// WorldService - Clean architecture service for world management
// Provides a clean interface to world generation and chunk management

import { ChunkManager } from '../world/ChunkManager.js';
import type { 
    ChunkCoords, 
    Chunk, 
    ActiveObjects,
    DiscoveryData
} from '../world/ChunkManager.js';
import type { ConfigService } from '../config/ConfigService.js';
import type { DiscoveryService } from './DiscoveryService.js';

export interface IWorldService {
    // Core world management
    generateChunk(chunkX: number, chunkY: number): Chunk;
    updateActiveChunks(playerX: number, playerY: number): void;
    getActiveObjects(): ActiveObjects;
    getActiveChunkCount(): number;
    
    // Coordinate utilities
    getChunkCoords(worldX: number, worldY: number): ChunkCoords;
    getChunkKey(chunkX: number, chunkY: number): string;
    getObjectId(x: number, y: number, type: string, object?: any): string;
    
    // Discovery integration
    getDiscoveredObjects(): Map<string, DiscoveryData>;
    
    // Configuration
    getLoadRadius(): number;
    reloadConfiguration(): void;
    
    // Lifecycle
    dispose(): void;
}

export class WorldService implements IWorldService {
    public readonly configService: ConfigService;
    public readonly discoveryService: DiscoveryService;
    public readonly chunkManager: ChunkManager;
    
    private loadRadius: number = 2;
    private disposed: boolean = false;

    constructor(configService: ConfigService, discoveryService: DiscoveryService) {
        if (!configService) {
            throw new Error('ConfigService is required');
        }
        if (!discoveryService) {
            throw new Error('DiscoveryService is required');
        }

        this.configService = configService;
        this.discoveryService = discoveryService;
        this.chunkManager = new ChunkManager();
        
        this.loadConfiguration();
    }

    /**
     * Generate a chunk at the specified coordinates
     */
    generateChunk(chunkX: number, chunkY: number): Chunk {
        this.validateChunkCoordinates(chunkX, chunkY);
        
        try {
            return this.chunkManager.generateChunk(chunkX, chunkY);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to generate chunk at (${chunkX}, ${chunkY}): ${message}`);
        }
    }

    /**
     * Update active chunks based on player position
     */
    updateActiveChunks(playerX: number, playerY: number): void {
        this.ensureNotDisposed();
        this.chunkManager.updateActiveChunks(playerX, playerY);
    }

    /**
     * Get all objects from currently active chunks
     */
    getActiveObjects(): ActiveObjects {
        this.ensureNotDisposed();
        return this.chunkManager.getAllActiveObjects();
    }

    /**
     * Get the number of currently active chunks
     */
    getActiveChunkCount(): number {
        this.ensureNotDisposed();
        return this.chunkManager.activeChunks.size;
    }

    /**
     * Convert world coordinates to chunk coordinates
     */
    getChunkCoords(worldX: number, worldY: number): ChunkCoords {
        return this.chunkManager.getChunkCoords(worldX, worldY);
    }

    /**
     * Generate a unique key for chunk coordinates
     */
    getChunkKey(chunkX: number, chunkY: number): string {
        return this.chunkManager.getChunkKey(chunkX, chunkY);
    }

    /**
     * Generate a unique ID for an object
     */
    getObjectId(x: number, y: number, type: string, object?: any): string {
        return this.chunkManager.getObjectId(x, y, type, object);
    }

    /**
     * Get discovered objects from the chunk manager
     */
    getDiscoveredObjects(): Map<string, DiscoveryData> {
        return this.chunkManager.discoveredObjects;
    }

    /**
     * Get the current load radius
     */
    getLoadRadius(): number {
        return this.loadRadius;
    }

    /**
     * Reload configuration from the config service
     */
    reloadConfiguration(): void {
        this.loadConfiguration();
    }

    /**
     * Dispose of resources and clean up
     */
    dispose(): void {
        if (this.disposed) {
            return;
        }

        // Clear all active chunks
        this.chunkManager.activeChunks.clear();
        
        this.disposed = true;
    }

    // Private helper methods

    private loadConfiguration(): void {
        this.loadRadius = this.configService.get('world.loadRadius', 2);
        
        // Validate configuration
        if (this.loadRadius < 1 || this.loadRadius > 10) {
            throw new Error(`Invalid load radius: ${this.loadRadius}. Must be between 1 and 10.`);
        }

        // Update chunk manager if it exists
        if (this.chunkManager) {
            this.chunkManager.loadRadius = this.loadRadius;
        }
    }

    private validateChunkCoordinates(chunkX: number, chunkY: number): void {
        if (!Number.isFinite(chunkX) || !Number.isFinite(chunkY)) {
            throw new Error(`Invalid chunk coordinates: (${chunkX}, ${chunkY})`);
        }
    }

    private ensureNotDisposed(): void {
        if (this.disposed) {
            throw new Error('WorldService has been disposed');
        }
    }
}