// InspectorModeController for StellarMap
// Handles seed inspection, chunk revelation, and statistics tracking

import type { SeedInspectorService, CelestialObjectData } from '../../debug/SeedInspectorService.js';
import { GameConstants } from '../../config/GameConstants.js';

interface ChunkMetadata {
    timestamp: number;
    seed: number;
    chunkX: number;
    chunkY: number;
}

interface ViewStatistics {
    objectCounts: Record<string, number>;
    totalObjects: number;
    density: number;
    regionArea: number;
}

export class InspectorModeController {
    // Inspector mode state
    public inspectorMode: boolean = false;
    public inspectorSeed: number | null = null;
    public inspectorZoomExtended: boolean = false;
    public inspectorObjects: CelestialObjectData[] = [];
    public inspectorService: SeedInspectorService | null = null;

    // Preserved seed for toggle functionality
    private lastInspectorSeed: number | null = null;

    // Statistics tracking
    public statisticsOverlayEnabled: boolean = false;
    public currentViewStatistics: ViewStatistics | null = null;

    // Chunk revelation system
    private revealedChunks: Map<string, CelestialObjectData[]> = new Map();
    private revealedChunksMetadata: Map<string, ChunkMetadata> = new Map();

    // Object type visibility toggles
    public objectTypeVisibility: Record<string, boolean> = {
        'celestialStar': true,
        'planet': true,
        'moon': true,
        'nebula': true,
        'asteroidGarden': true,
        'wormhole': true,
        'blackhole': true,
        'comet': true,
        'rogue-planet': true,
        'dark-nebula': true,
        'crystal-garden': true,
        'protostar': true
    };

    /**
     * Initialize inspector mode with seed inspector service
     */
    initInspectorMode(seedInspectorService: SeedInspectorService): void {
        this.inspectorService = seedInspectorService;
    }

    /**
     * Enable inspector mode with a specific seed
     */
    async enableInspectorMode(seed: number): Promise<void> {
        if (!this.inspectorService) {
            throw new Error('Inspector service not initialized. Call initInspectorMode() first.');
        }

        this.inspectorMode = true;
        this.inspectorSeed = seed;
        this.lastInspectorSeed = seed; // Preserve for toggle
        this.inspectorZoomExtended = true;
        this.statisticsOverlayEnabled = true;

        console.log(`🔍 Inspector mode enabled for seed ${seed}`);
    }

    /**
     * Disable inspector mode and return to discovered-only view
     */
    disableInspectorMode(): void {
        this.inspectorMode = false;
        this.inspectorSeed = null;
        this.inspectorObjects = [];
        this.inspectorZoomExtended = false;
        console.log('🔍 Inspector mode disabled - showing discovered objects only');
    }

    /**
     * Toggle between inspector mode and normal mode
     */
    async toggleInspectorMode(): Promise<void> {
        if (this.inspectorMode) {
            this.disableInspectorMode();
        } else if (this.lastInspectorSeed !== null) {
            // Re-enable with last used seed
            await this.enableInspectorMode(this.lastInspectorSeed);
        }
    }

    /**
     * Check if inspector mode is active
     */
    isInspectorMode(): boolean {
        return this.inspectorMode;
    }

    /**
     * Enable statistics overlay
     */
    enableStatisticsOverlay(): void {
        this.statisticsOverlayEnabled = true;
        if (this.inspectorMode) {
            this.updateViewStatistics();
        }
    }

    /**
     * Disable statistics overlay
     */
    disableStatisticsOverlay(): void {
        this.statisticsOverlayEnabled = false;
        this.currentViewStatistics = null;
    }

    /**
     * Toggle statistics overlay on/off
     */
    toggleStatisticsOverlay(): void {
        if (this.statisticsOverlayEnabled) {
            this.disableStatisticsOverlay();
        } else {
            this.enableStatisticsOverlay();
        }
    }

    /**
     * Generate unique key for chunk identification
     */
    private getChunkKey(seed: number, chunkX: number, chunkY: number): string {
        return `${seed}_${chunkX}_${chunkY}`;
    }

    /**
     * Check if a specific chunk is already revealed
     */
    isChunkRevealed(seed: number, chunkX: number, chunkY: number): boolean {
        return this.revealedChunks.has(this.getChunkKey(seed, chunkX, chunkY));
    }

    /**
     * Add chunk data to revealed areas
     */
    addRevealedChunk(seed: number, chunkX: number, chunkY: number, objects: CelestialObjectData[]): void {
        const key = this.getChunkKey(seed, chunkX, chunkY);

        // Avoid duplicates
        if (this.revealedChunks.has(key)) {
            return;
        }

        this.revealedChunks.set(key, objects);
        this.revealedChunksMetadata.set(key, {
            timestamp: Date.now(),
            seed: seed,
            chunkX: chunkX,
            chunkY: chunkY
        });
    }

    /**
     * Get all revealed objects for the current seed
     */
    getRevealedObjects(seed: number): CelestialObjectData[] {
        const objects: CelestialObjectData[] = [];
        for (const [key, chunkObjects] of this.revealedChunks.entries()) {
            const metadata = this.revealedChunksMetadata.get(key);
            if (metadata && metadata.seed === seed) {
                objects.push(...chunkObjects);
            }
        }
        return objects;
    }

    /**
     * Get count of revealed chunks for a specific seed
     */
    getRevealedChunkCount(seed: number): number {
        let count = 0;
        for (const metadata of this.revealedChunksMetadata.values()) {
            if (metadata.seed === seed) {
                count++;
            }
        }
        return count;
    }

    /**
     * Clear all revealed chunks for current or specified seed
     */
    clearRevealedChunks(seed?: number): void {
        if (seed === undefined) {
            // Clear all revealed chunks
            this.revealedChunks.clear();
            this.revealedChunksMetadata.clear();
            console.log('🧹 Cleared all revealed chunks');
        } else {
            // Clear chunks for specific seed
            const keysToDelete: string[] = [];
            for (const [key, metadata] of this.revealedChunksMetadata.entries()) {
                if (metadata.seed === seed) {
                    keysToDelete.push(key);
                }
            }

            keysToDelete.forEach(key => {
                this.revealedChunks.delete(key);
                this.revealedChunksMetadata.delete(key);
            });

            console.log(`🧹 Cleared ${keysToDelete.length} revealed chunks for seed ${seed}`);
        }
    }

    /**
     * Reveal chunks around a center position with specified radius
     */
    async revealChunks(seed: number, centerWorldX: number, centerWorldY: number, chunkRadius: number = 2): Promise<{ newChunks: number; totalChunks: number }> {
        if (!this.inspectorService) {
            throw new Error('Inspector service not initialized');
        }

        // Convert world coordinates to chunk coordinates
        const chunkSize = GameConstants.DEFAULT_CHUNK_SIZE;
        const centerChunkX = Math.floor(centerWorldX / chunkSize);
        const centerChunkY = Math.floor(centerWorldY / chunkSize);

        let newChunksRevealed = 0;
        let totalChunksInArea = 0;

        // Performance warning for large areas
        const totalChunks = (chunkRadius * 2 + 1) * (chunkRadius * 2 + 1);
        if (totalChunks > 1000) {
            console.warn(`⚠️ Large reveal requested: ${totalChunks} chunks. This may take a while...`);
        }

        // Generate chunks in the specified radius
        for (let dx = -chunkRadius; dx <= chunkRadius; dx++) {
            for (let dy = -chunkRadius; dy <= chunkRadius; dy++) {
                const chunkX = centerChunkX + dx;
                const chunkY = centerChunkY + dy;
                totalChunksInArea++;

                // Skip if chunk is already revealed
                if (this.isChunkRevealed(seed, chunkX, chunkY)) {
                    continue;
                }

                // Generate objects for this chunk
                const chunkCenterX = chunkX * chunkSize + chunkSize / 2;
                const chunkCenterY = chunkY * chunkSize + chunkSize / 2;

                try {
                    // Generate single chunk (radius = 0 means just the center chunk)
                    const chunkObjects = await this.inspectorService.getRegionObjects(
                        seed,
                        chunkCenterX,
                        chunkCenterY,
                        0
                    );

                    // Add to revealed chunks
                    this.addRevealedChunk(seed, chunkX, chunkY, chunkObjects);
                    newChunksRevealed++;
                } catch (error) {
                    console.warn('Failed to reveal chunks:', error);
                    // Continue with other chunks even if one fails
                }
            }
        }

        // Update inspector objects to use all revealed chunks for current seed
        this.inspectorObjects = this.getRevealedObjects(seed);

        // Update statistics if new chunks were revealed
        if (newChunksRevealed > 0 && this.statisticsOverlayEnabled) {
            await this.updateViewStatistics();
        }

        return {
            newChunks: newChunksRevealed,
            totalChunks: totalChunksInArea
        };
    }

    /**
     * Update statistics across all revealed chunks for current seed
     */
    async updateViewStatistics(): Promise<void> {
        if (!this.inspectorSeed) return;

        try {
            // Get all revealed objects for current seed
            const revealedObjects = this.getRevealedObjects(this.inspectorSeed);

            if (revealedObjects.length === 0) {
                this.currentViewStatistics = null;
                return;
            }

            // Count objects by type from revealed chunks
            const objectCounts: Record<string, number> = {
                'celestialStar': 0,
                'planet': 0,
                'moon': 0,
                'nebula': 0,
                'asteroidGarden': 0,
                'wormhole': 0,
                'blackhole': 0,
                'comet': 0,
                'rogue-planet': 0,
                'dark-nebula': 0,
                'crystal-garden': 0,
                'protostar': 0
            };

            // Count objects from revealed chunks
            for (const obj of revealedObjects) {
                if (Object.prototype.hasOwnProperty.call(objectCounts, obj.type)) {
                    objectCounts[obj.type]++;
                } else {
                    objectCounts[obj.type] = 1;
                }
            }

            // Calculate total meaningful objects
            const totalObjects = objectCounts.celestialStar + objectCounts.planet +
                               objectCounts.moon + objectCounts.nebula +
                               objectCounts.asteroidGarden + objectCounts.wormhole +
                               objectCounts.blackhole + objectCounts.comet +
                               objectCounts['rogue-planet'] + objectCounts['dark-nebula'] +
                               objectCounts['crystal-garden'] + objectCounts['protostar'];

            // Calculate area from revealed chunks count
            const revealedChunkCount = this.getRevealedChunkCount(this.inspectorSeed);
            const regionArea = revealedChunkCount * 1000000; // Each chunk is 1000x1000 units

            const density = totalObjects / (regionArea / 1000000); // Objects per million square units

            this.currentViewStatistics = {
                objectCounts,
                totalObjects,
                density,
                regionArea
            };
        } catch (error) {
            console.warn('Failed to update view statistics:', error);
            this.currentViewStatistics = null;
        }
    }

    /**
     * Get statistics for testing/external access
     */
    getStatistics(): Record<string, number> {
        return this.currentViewStatistics?.objectCounts || {};
    }

    /**
     * Get inspector object color based on type
     */
    getInspectorObjectColor(objectType: string): string {
        const colors: Record<string, string> = {
            celestialStar: '#ffdd88',       // Bright yellow for discoverable stars
            planet: '#88aa88',              // Green for planets
            moon: '#cccccc',                // Light gray for moons
            nebula: '#ff88cc',              // Pink for nebulae
            asteroidGarden: '#cc8844',      // Orange for asteroid gardens
            wormhole: '#8844ff',            // Purple for wormholes
            blackhole: '#ff0000',           // Red for black holes
            comet: '#88ccff',               // Light blue for comets
            'rogue-planet': '#cc88aa',      // Muted purple for rogue planets
            'dark-nebula': '#6a4a3a',       // Medium brown for dark nebulae
            'crystal-garden': '#44ffcc',    // Cyan-green for crystal gardens
            'protostar': '#ffaa44'          // Orange-yellow for protostars
        };
        return colors[objectType] || '#ffffff'; // White for unknown types
    }

    /**
     * Toggle visibility of an object type
     */
    toggleObjectTypeVisibility(objectType: string): void {
        if (Object.prototype.hasOwnProperty.call(this.objectTypeVisibility, objectType)) {
            this.objectTypeVisibility[objectType] = !this.objectTypeVisibility[objectType];
        }
    }

    /**
     * Get filtered objects for rendering (applies visibility toggles)
     */
    getFilteredObjects(): CelestialObjectData[] {
        return this.inspectorObjects.filter(obj => this.objectTypeVisibility[obj.type] !== false);
    }
}
