// Chunk-based world management for infinite generation
// Extracted from world.ts for better modularity and maintainability

// Import dependencies
import { SeededRandom } from '../utils/random.js';
import { Star, Planet, Moon, PlanetTypes, StarTypes } from '../celestial/celestial.js';
import { Nebula } from '../celestial/nebulae.js';
import { AsteroidGarden } from '../celestial/asteroids.js';
import { Wormhole } from '../celestial/wormholes.js';
import { BlackHole } from '../celestial/blackholes.js';
import { Comet } from '../celestial/comets.js';
import { RoguePlanet, DarkNebula, CrystalGarden, Protostar } from '../celestial/RegionSpecificObjects.js';
import { GameConfig } from '../config/gameConfig.js';
import { ErrorService } from '../services/ErrorService.js';
import { RegionGenerator, type RegionInfo } from './RegionGenerator.js';
import { ChunkGenerator } from './ChunkGenerator.js';
import { DiscoveryRegistry } from './DiscoveryRegistry.js';
import type { DiscoveryData, DiscoveredStar, DiscoveredPlanet, DiscoveredNebula, DiscoveredAsteroidGarden, DiscoveredMoon, DiscoveredWormhole, DiscoveredBlackHole, DiscoveredComet, DiscoveredRoguePlanet, DiscoveredDarkNebula, DiscoveredCrystalGarden, DiscoveredProtostar, DiscoveredRegion } from './DiscoveryRegistry.js';

// Interface definitions
interface ChunkCoords {
    x: number;
    y: number;
}

interface BackgroundStar {
    x: number;
    y: number;
    brightness: number;
    size: number;
    color: string;
}

interface Chunk {
    x: number;
    y: number;
    stars: BackgroundStar[];
    planets: Planet[];
    moons: Moon[];
    celestialStars: Star[];
    nebulae: Nebula[];
    asteroidGardens: AsteroidGarden[];
    wormholes: Wormhole[];
    blackholes: BlackHole[];
    comets: Comet[];
    // Region-specific objects
    roguePlanets: RoguePlanet[];
    darkNebulae: DarkNebula[];
    crystalGardens: CrystalGarden[];
    protostars: Protostar[];
}

interface ActiveObjects {
    stars: BackgroundStar[];
    planets: Planet[];
    moons: Moon[];
    celestialStars: Star[];
    nebulae: Nebula[];
    asteroidGardens: AsteroidGarden[];
    wormholes: Wormhole[];
    blackholes: BlackHole[];
    comets: Comet[];
    // Region-specific objects
    roguePlanets: RoguePlanet[];
    darkNebulae: DarkNebula[];
    crystalGardens: CrystalGarden[];
    protostars: Protostar[];
}

export interface DebugObject {
    type: string;
    object: Star | Planet | Moon | Nebula | AsteroidGarden | Wormhole | BlackHole;
    x: number;
    y: number;
}

export class ChunkManager {
    chunkSize: number;
    loadRadius: number;
    activeChunks: Map<string, Chunk>;
    readonly discoveries: DiscoveryRegistry;
    readonly generator: ChunkGenerator;
    debugObjects?: DebugObject[];
    private errorService: ErrorService;
    private regionGenerator: RegionGenerator;

    constructor(errorService?: ErrorService) {
        this.chunkSize = GameConfig.world.chunkSize;
        this.loadRadius = 1; // Load chunks in 3x3 grid around player
        this.activeChunks = new Map(); // Key: "x,y", Value: chunk data
        this.discoveries = new DiscoveryRegistry(this);
        this.generator = new ChunkGenerator(this);
        this.errorService = errorService || new ErrorService();
        this.regionGenerator = new RegionGenerator();
    }

    // Back-compat accessors: save/load and debug tooling access these maps directly
    get discoveredObjects(): Map<string, DiscoveryData> {
        return this.discoveries.discoveredObjects;
    }

    get discoveredRegions(): Map<string, DiscoveredRegion> {
        return this.discoveries.discoveredRegions;
    }

    getChunkCoords(worldX: number, worldY: number): ChunkCoords {
        return {
            x: Math.floor(worldX / this.chunkSize),
            y: Math.floor(worldY / this.chunkSize)
        };
    }

    getChunkKey(chunkX: number, chunkY: number): string {
        return `${chunkX},${chunkY}`;
    }

    getObjectId(x: number, y: number, type: string, object?: Star | Planet | Moon | Nebula | AsteroidGarden | Wormhole | BlackHole | any): string {
        return this.discoveries.getObjectId(x, y, type, object);
    }

    generateChunk(chunkX: number, chunkY: number): Chunk {
        // Use error handling but don't fallback to empty chunks in normal operation
        const result = this.errorService.safeExecute(
            'ChunkManager',
            `generateChunk(${chunkX}, ${chunkY})`,
            () => this.generator.generate(chunkX, chunkY),
            null, // Don't use empty chunk fallback for normal operation
            `Failed to generate world chunk at (${chunkX}, ${chunkY}). Using empty chunk.`
        );

        // Only use empty chunk as absolute last resort
        return result || this.generator.generate(chunkX, chunkY);
    }

    selectPlanetType(rng: SeededRandom, orbitalDistance: number, star: Star): typeof PlanetTypes[keyof typeof PlanetTypes] {
        return this.generator.selectPlanetType(rng, orbitalDistance, star);
    }

    selectStarType(rng: SeededRandom): typeof StarTypes[keyof typeof StarTypes] {
        return this.generator.selectStarType(rng);
    }

    applyStarTypeModifiers(probabilities: Record<string, number>, starType: typeof StarTypes[keyof typeof StarTypes], relativeDistance: number): Record<string, number> {
        return this.generator.applyStarTypeModifiers(probabilities, starType, relativeDistance);
    }

    updateActiveChunks(playerX: number, playerY: number): void {
        const playerChunk = this.getChunkCoords(playerX, playerY);
        const requiredChunks = new Set<string>();

        // Determine which chunks should be loaded
        for (let dx = -this.loadRadius; dx <= this.loadRadius; dx++) {
            for (let dy = -this.loadRadius; dy <= this.loadRadius; dy++) {
                const chunkX = playerChunk.x + dx;
                const chunkY = playerChunk.y + dy;
                const chunkKey = this.getChunkKey(chunkX, chunkY);
                requiredChunks.add(chunkKey);
                
                // Generate chunk if it doesn't exist
                this.generateChunk(chunkX, chunkY);
            }
        }

        // Unload distant chunks to save memory with proper cleanup
        for (const [chunkKey, chunk] of this.activeChunks) {
            if (!requiredChunks.has(chunkKey)) {
                this.cleanupChunkObjects(chunk);
                this.activeChunks.delete(chunkKey);
            }
        }
        
        // Cleanup distant region caches for performance
        if (GameConfig.world.cosmicRegions?.enabled) {
            this.regionGenerator.clearDistantCaches(playerX, playerY);
        }
    }

    // Public method to access chunks for gravitational lensing preview
    getChunk(chunkKey: string): Chunk | undefined {
        return this.activeChunks.get(chunkKey);
    }

    // Generate a chunk if it doesn't exist (used for preview system)
    ensureChunkExists(chunkX: number, chunkY: number): void {
        this.generateChunk(chunkX, chunkY);
    }

    getAllActiveObjects(): ActiveObjects {
        const objects: ActiveObjects = { 
            stars: [], 
            planets: [], 
            moons: [], 
            celestialStars: [], 
            nebulae: [], 
            asteroidGardens: [], 
            wormholes: [], 
            blackholes: [], 
            comets: [],
            // Region-specific objects
            roguePlanets: [],
            darkNebulae: [],
            crystalGardens: [],
            protostars: [],
        };
        
        for (const chunk of this.activeChunks.values()) {
            objects.stars.push(...chunk.stars);
            objects.planets.push(...chunk.planets);
            objects.moons.push(...chunk.moons);
            objects.celestialStars.push(...chunk.celestialStars);
            objects.nebulae.push(...chunk.nebulae);
            objects.asteroidGardens.push(...chunk.asteroidGardens);
            objects.wormholes.push(...chunk.wormholes);
            objects.blackholes.push(...chunk.blackholes);
            objects.comets.push(...chunk.comets);
            // Region-specific objects
            objects.roguePlanets.push(...chunk.roguePlanets);
            objects.darkNebulae.push(...chunk.darkNebulae);
            objects.crystalGardens.push(...chunk.crystalGardens);
            objects.protostars.push(...chunk.protostars);
        }

        return objects;
    }

    // Cosmic Regions - Region boundary detection methods

    /**
     * Get the cosmic region at the specified world coordinates
     */
    getRegionAt(worldX: number, worldY: number): RegionInfo | null {
        if (!GameConfig.world.cosmicRegions?.enabled) {
            return null;
        }
        
        return this.regionGenerator.getRegionAt(worldX, worldY);
    }
    
    /**
     * Get the cosmic region for a specific chunk
     */
    getChunkRegion(chunkX: number, chunkY: number): RegionInfo | null {
        if (!GameConfig.world.cosmicRegions?.enabled) {
            return null;
        }
        
        // Use chunk center coordinates for region lookup
        const worldX = chunkX * this.chunkSize + this.chunkSize * 0.5;
        const worldY = chunkY * this.chunkSize + this.chunkSize * 0.5;
        
        return this.regionGenerator.getRegionAt(worldX, worldY);
    }
    
    markObjectDiscovered(object: Star | Planet | Moon | Nebula | AsteroidGarden | Wormhole | BlackHole | any, objectName?: string): void {
        this.discoveries.markObjectDiscovered(object, objectName);
    }

    isObjectDiscovered(object: Star | Planet | Moon | Nebula | AsteroidGarden | Wormhole | BlackHole | any): boolean {
        return this.discoveries.isObjectDiscovered(object);
    }

    restoreDiscoveryState(objects: (Star | Planet | Moon | Nebula | AsteroidGarden | Wormhole | BlackHole | any)[]): void {
        this.discoveries.restoreDiscoveryState(objects);
    }

    getDiscoveredStars(): DiscoveredStar[] {
        return this.discoveries.getDiscoveredStars();
    }

    getDiscoveredMoons(): DiscoveredMoon[] {
        return this.discoveries.getDiscoveredMoons();
    }

    getDiscoveredPlanets(): DiscoveredPlanet[] {
        return this.discoveries.getDiscoveredPlanets();
    }

    getDiscoveredNebulae(): DiscoveredNebula[] {
        return this.discoveries.getDiscoveredNebulae();
    }

    getDiscoveredWormholes(): DiscoveredWormhole[] {
        return this.discoveries.getDiscoveredWormholes();
    }

    getDiscoveredAsteroidGardens(): DiscoveredAsteroidGarden[] {
        return this.discoveries.getDiscoveredAsteroidGardens();
    }

    getDiscoveredBlackHoles(): DiscoveredBlackHole[] {
        return this.discoveries.getDiscoveredBlackHoles();
    }

    scoreStarSystemPosition(x: number, y: number, currentChunkX: number, currentChunkY: number): number {
        return this.generator.scoreStarSystemPosition(x, y, currentChunkX, currentChunkY);
    }
    
    // Generation methods delegate to ChunkGenerator (kept for API compatibility)
    generateCometsForStarSystem(star: Star, rng: SeededRandom, chunk: Chunk, cometSpawnChance?: number): void {
        this.generator.generateCometsForStarSystem(star, rng, chunk, cometSpawnChance);
    }

    generateMoonsForPlanet(planet: Planet, rng: SeededRandom, chunk: Chunk): void {
        this.generator.generateMoonsForPlanet(planet, rng, chunk);
    }

    selectCompanionStarType(rng: SeededRandom, primaryStarType: typeof StarTypes[keyof typeof StarTypes]): typeof StarTypes[keyof typeof StarTypes] {
        return this.generator.selectCompanionStarType(rng, primaryStarType);
    }

    generateNebulaeForChunk(chunkX: number, chunkY: number, chunk: Chunk): void {
        this.generator.generateNebulaeForChunk(chunkX, chunkY, chunk);
    }

    generateAsteroidGardensForChunk(chunkX: number, chunkY: number, chunk: Chunk): void {
        this.generator.generateAsteroidGardensForChunk(chunkX, chunkY, chunk);
    }

    generateWormholesForChunk(chunkX: number, chunkY: number, chunk: Chunk): void {
        this.generator.generateWormholesForChunk(chunkX, chunkY, chunk);
    }

    generateBlackHolesForChunk(chunkX: number, chunkY: number, chunk: Chunk): void {
        this.generator.generateBlackHolesForChunk(chunkX, chunkY, chunk);
    }

    generateRoguePlanetsForChunk(chunkX: number, chunkY: number, chunk: Chunk): void {
        this.generator.generateRoguePlanetsForChunk(chunkX, chunkY, chunk);
    }

    generateDarkNebulaeForChunk(chunkX: number, chunkY: number, chunk: Chunk): void {
        this.generator.generateDarkNebulaeForChunk(chunkX, chunkY, chunk);
    }

    generateCrystalGardensForChunk(chunkX: number, chunkY: number, chunk: Chunk): void {
        this.generator.generateCrystalGardensForChunk(chunkX, chunkY, chunk);
    }

    generateProtostarsForChunk(chunkX: number, chunkY: number, chunk: Chunk): void {
        this.generator.generateProtostarsForChunk(chunkX, chunkY, chunk);
    }

    // Clear all chunks but preserve discovered objects (for game loading)
    clearAllChunks(): void {
        this.activeChunks.clear();
        console.log('🌌 All chunks cleared (discoveries preserved)');
    }
    
    // Clear all chunks and discovered objects (for universe reset)
    clearAllChunksAndDiscoveries(): void {
        this.activeChunks.clear();
        this.discoveries.clearDiscoveryHistory();
        console.log('🌌 All chunks and discoveries cleared for universe regeneration');
    }

    // Clear only discovery history (preserves chunks)
    clearDiscoveryHistory(): void {
        this.discoveries.clearDiscoveryHistory();
    }
    
    getDiscoveredComets(): DiscoveredComet[] {
        return this.discoveries.getDiscoveredComets();
    }

    getDiscoveredRoguePlanets(): DiscoveredRoguePlanet[] {
        return this.discoveries.getDiscoveredRoguePlanets();
    }

    getDiscoveredDarkNebulae(): DiscoveredDarkNebula[] {
        return this.discoveries.getDiscoveredDarkNebulae();
    }

    getDiscoveredCrystalGardens(): DiscoveredCrystalGarden[] {
        return this.discoveries.getDiscoveredCrystalGardens();
    }

    getDiscoveredProtostars(): DiscoveredProtostar[] {
        return this.discoveries.getDiscoveredProtostars();
    }

    markRegionDiscovered(regionType: string, regionName: string, discoveryX: number, discoveryY: number, influence: number): void {
        this.discoveries.markRegionDiscovered(regionType, regionName, discoveryX, discoveryY, influence);
    }

    getDiscoveredRegions(): DiscoveredRegion[] {
        return this.discoveries.getDiscoveredRegions();
    }

    isRegionDiscovered(regionType: string): boolean {
        return this.discoveries.isRegionDiscovered(regionType);
    }

    /**
     * Clean up celestial objects when chunks are unloaded to prevent memory leaks
     */
    private cleanupChunkObjects(chunk: Chunk): void {
        // Dispose of objects that have cleanup methods
        const allObjects = [
            ...chunk.celestialStars,
            ...chunk.planets,
            ...chunk.moons,
            ...chunk.nebulae,
            ...chunk.asteroidGardens,
            ...chunk.wormholes,
            ...chunk.blackholes,
            ...chunk.comets
        ];

        for (const obj of allObjects) {
            // Clean up animation timers, event listeners, etc.
            if (obj && typeof (obj as any).dispose === 'function') {
                (obj as any).dispose();
            }
            
            // Clear references to help garbage collection
            if (obj) {
                (obj as any).discoveryState = null;
                (obj as any).parentStar = null;
                (obj as any).parentPlanet = null;
                (obj as any).twinWormhole = null;
            }
        }

        // Clear chunk arrays
        chunk.stars.length = 0;
        chunk.celestialStars.length = 0;
        chunk.planets.length = 0;
        chunk.moons.length = 0;
        chunk.nebulae.length = 0;
        chunk.asteroidGardens.length = 0;
        chunk.wormholes.length = 0;
        chunk.blackholes.length = 0;
        chunk.comets.length = 0;
    }

    /**
     * Enhanced clear method with proper cleanup
     */
    clearAllChunksWithCleanup(): void {
        for (const [, chunk] of this.activeChunks) {
            this.cleanupChunkObjects(chunk);
        }
        this.activeChunks.clear();
        this.discoveredObjects.clear();
        console.log('🌌 All chunks cleared with proper cleanup');
    }
}

// Export interfaces for use by other modules
export type { ChunkCoords, BackgroundStar, Chunk, ActiveObjects };
export type { DiscoveryData, DiscoveredStar, DiscoveredPlanet, DiscoveredNebula, DiscoveredAsteroidGarden, DiscoveredMoon, DiscoveredWormhole, DiscoveredBlackHole, DiscoveredComet, DiscoveredRegion, DiscoveredCrystalGarden, DiscoveredProtostar } from './DiscoveryRegistry.js';