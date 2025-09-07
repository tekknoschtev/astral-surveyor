/**
 * @fileoverview SeedInspectorService - Headless seed analysis and inspection tool
 * Provides comprehensive analysis of procedural generation patterns without game overhead
 * 
 * @author Astral Surveyor Development Team
 * @since 0.1.0
 */

import { SeededRandom, hashPosition, setUniverseSeed, getUniverseSeed } from '../utils/random.js';
import type { ChunkManager } from '../world/ChunkManager.js';

/**
 * Represents analysis data for a single chunk
 */
export interface ChunkAnalysis {
    x: number;
    y: number;
    backgroundStars: number;
    celestialStars: number;
    planets: number;
    moons: number;
    nebulae: number;
    asteroidGardens: number;
    wormholes: number;
    blackholes: number;
    comets: number;
    roguePlanets: number;
    darkNebulae: number;
    starSystems: number;
    binarySystems: number;
}

/**
 * Statistical analysis for a region of chunks
 */
export interface RegionAnalysis {
    seed: number;
    centerX: number;
    centerY: number;
    chunkRadius: number;
    totalChunks: number;
    
    // Object counts across all chunks
    totals: {
        backgroundStars: number;
        celestialStars: number;
        planets: number;
        moons: number;
        nebulae: number;
        asteroidGardens: number;
        wormholes: number;
        blackholes: number;
        comets: number;
        roguePlanets: number;
        darkNebulae: number;
        starSystems: number;
        binarySystems: number;
    };
    
    // Density statistics (objects per chunk)
    density: {
        backgroundStars: number;
        celestialStars: number;
        planets: number;
        moons: number;
        nebulae: number;
        asteroidGardens: number;
        wormholes: number;
        blackholes: number;
        comets: number;
        roguePlanets: number;
        darkNebulae: number;
        starSystems: number;
        binarySystems: number;
    };
    
    // Per-chunk analysis data
    chunks: ChunkAnalysis[];
    
    // Analysis metadata
    analysisTime: number; // milliseconds
    generatedAt: Date;
}

/**
 * Individual celestial object data for detailed inspection
 */
export interface CelestialObjectData {
    type: 'backgroundStar' | 'celestialStar' | 'planet' | 'moon' | 'nebula' | 'asteroidGarden' | 'wormhole' | 'blackhole' | 'comet' | 'rogue-planet' | 'dark-nebula';
    x: number;
    y: number;
    chunkX: number;
    chunkY: number;
    properties: Record<string, any>; // Type-specific properties
    cosmicRegion?: {
        regionType: string;
        regionName: string;
        influence: number;
    };
}

/**
 * Service for analyzing seeds and regions without game overhead
 * Provides headless chunk generation for debugging and analysis
 */
export class SeedInspectorService {
    private chunkManager: ChunkManager;
    private originalSeed: number;

    constructor(chunkManager: ChunkManager) {
        this.chunkManager = chunkManager;
        this.originalSeed = getUniverseSeed();
    }

    /**
     * Analyze a region around a point with a specific seed
     * @param seed - Universe seed to analyze
     * @param centerX - Center X coordinate (world space)
     * @param centerY - Center Y coordinate (world space) 
     * @param chunkRadius - Number of chunks in each direction (1 = 3x3, 2 = 5x5, etc.)
     */
    async analyzeRegion(seed: number, centerX: number = 0, centerY: number = 0, chunkRadius: number = 2): Promise<RegionAnalysis> {
        const startTime = performance.now();
        
        // Temporarily set the universe seed for analysis
        const originalSeed = getUniverseSeed();
        setUniverseSeed(seed);
        
        try {
            // Convert world coordinates to chunk coordinates
            const chunkSize = 2000; // From GameConstants.DEFAULT_CHUNK_SIZE
            const centerChunkX = Math.floor(centerX / chunkSize);
            const centerChunkY = Math.floor(centerY / chunkSize);
            
            const chunks: ChunkAnalysis[] = [];
            const totals = {
                backgroundStars: 0,
                celestialStars: 0,
                planets: 0,
                moons: 0,
                nebulae: 0,
                asteroidGardens: 0,
                wormholes: 0,
                blackholes: 0,
                comets: 0,
                roguePlanets: 0,
                darkNebulae: 0,
                starSystems: 0,
                binarySystems: 0
            };

            // Analyze each chunk in the region
            for (let dx = -chunkRadius; dx <= chunkRadius; dx++) {
                for (let dy = -chunkRadius; dy <= chunkRadius; dy++) {
                    const chunkX = centerChunkX + dx;
                    const chunkY = centerChunkY + dy;
                    
                    const analysis = await this.analyzeChunk(chunkX, chunkY);
                    chunks.push(analysis);
                    
                    // Add to totals
                    totals.backgroundStars += analysis.backgroundStars;
                    totals.celestialStars += analysis.celestialStars;
                    totals.planets += analysis.planets;
                    totals.moons += analysis.moons;
                    totals.nebulae += analysis.nebulae;
                    totals.asteroidGardens += analysis.asteroidGardens;
                    totals.wormholes += analysis.wormholes;
                    totals.blackholes += analysis.blackholes;
                    totals.comets += analysis.comets;
                    totals.roguePlanets += analysis.roguePlanets;
                    totals.darkNebulae += analysis.darkNebulae;
                    totals.starSystems += analysis.starSystems;
                    totals.binarySystems += analysis.binarySystems;
                }
            }

            const totalChunks = chunks.length;
            const analysisTime = performance.now() - startTime;

            const analysis: RegionAnalysis = {
                seed,
                centerX,
                centerY,
                chunkRadius,
                totalChunks,
                totals,
                density: {
                    backgroundStars: totals.backgroundStars / totalChunks,
                    celestialStars: totals.celestialStars / totalChunks,
                    planets: totals.planets / totalChunks,
                    moons: totals.moons / totalChunks,
                    nebulae: totals.nebulae / totalChunks,
                    asteroidGardens: totals.asteroidGardens / totalChunks,
                    wormholes: totals.wormholes / totalChunks,
                    blackholes: totals.blackholes / totalChunks,
                    comets: totals.comets / totalChunks,
                    roguePlanets: totals.roguePlanets / totalChunks,
                    darkNebulae: totals.darkNebulae / totalChunks,
                    starSystems: totals.starSystems / totalChunks,
                    binarySystems: totals.binarySystems / totalChunks
                },
                chunks,
                analysisTime,
                generatedAt: new Date()
            };

            return analysis;
        } finally {
            // Always restore the original seed
            setUniverseSeed(originalSeed);
        }
    }

    /**
     * Analyze a single chunk for object counts
     * @param chunkX - Chunk X coordinate
     * @param chunkY - Chunk Y coordinate
     */
    private async analyzeChunk(chunkX: number, chunkY: number): Promise<ChunkAnalysis> {
        // Generate the chunk using existing ChunkManager logic
        // Use the private _generateChunk method to bypass cache for fresh analysis
        const chunk = (this.chunkManager as any)._generateChunk(chunkX, chunkY);
        
        // Count binary systems (approximate - count pairs of nearby stars)
        let binarySystems = 0;
        const stars = chunk.celestialStars;
        
        // Check for stars that are close together (likely binaries)
        for (let i = 0; i < stars.length; i++) {
            for (let j = i + 1; j < stars.length; j++) {
                const star1 = stars[i];
                const star2 = stars[j];
                const distance = Math.sqrt(
                    Math.pow(star1.x - star2.x, 2) + 
                    Math.pow(star1.y - star2.y, 2)
                );
                
                // If stars are within 300 units, consider them a binary system
                if (distance < 300) {
                    binarySystems++;
                    break; // Don't count the same star in multiple binaries
                }
            }
        }

        return {
            x: chunkX,
            y: chunkY,
            backgroundStars: chunk.stars.length,
            celestialStars: chunk.celestialStars.length,
            planets: chunk.planets.length,
            moons: chunk.moons.length,
            nebulae: chunk.nebulae.length,
            asteroidGardens: chunk.asteroidGardens.length,
            wormholes: chunk.wormholes.length,
            blackholes: chunk.blackholes.length,
            comets: chunk.comets.length,
            roguePlanets: chunk.roguePlanets ? chunk.roguePlanets.length : 0,
            darkNebulae: chunk.darkNebulae ? chunk.darkNebulae.length : 0,
            starSystems: Math.max(1, Math.ceil(chunk.celestialStars.length / 2)), // Estimate systems from stars
            binarySystems
        };
    }

    /**
     * Get cosmic region information for a specific chunk
     */
    private getCosmicRegionInfo(chunkX: number, chunkY: number): { regionType: string; regionName: string; influence: number } | null {
        try {
            const regionInfo = this.chunkManager.getChunkRegion(chunkX, chunkY);
            if (regionInfo && regionInfo.definition) {
                return {
                    regionType: regionInfo.regionType,
                    regionName: regionInfo.definition.name,
                    influence: regionInfo.influence
                };
            }
        } catch (error) {
            // Silently handle region lookup errors
            console.warn('Failed to get cosmic region info:', error);
        }
        return null;
    }

    /**
     * Get detailed object data for a region (for visualization)
     * @param seed - Universe seed to analyze
     * @param centerX - Center X coordinate (world space)
     * @param centerY - Center Y coordinate (world space)
     * @param chunkRadius - Number of chunks in each direction
     */
    async getRegionObjects(seed: number, centerX: number = 0, centerY: number = 0, chunkRadius: number = 2): Promise<CelestialObjectData[]> {
        const originalSeed = getUniverseSeed();
        setUniverseSeed(seed);
        
        try {
            const objects: CelestialObjectData[] = [];
            const chunkSize = 2000;
            const centerChunkX = Math.floor(centerX / chunkSize);
            const centerChunkY = Math.floor(centerY / chunkSize);

            // Collect objects from each chunk
            for (let dx = -chunkRadius; dx <= chunkRadius; dx++) {
                for (let dy = -chunkRadius; dy <= chunkRadius; dy++) {
                    const chunkX = centerChunkX + dx;
                    const chunkY = centerChunkY + dy;
                    const chunk = (this.chunkManager as any)._generateChunk(chunkX, chunkY);
                    
                    // Get cosmic region information for this chunk
                    const cosmicRegion = this.getCosmicRegionInfo(chunkX, chunkY);

                    // Skip background stars entirely in inspector mode - they're just visual noise for analysis

                    // Add celestial stars
                    for (const star of chunk.celestialStars) {
                        objects.push({
                            type: 'celestialStar',
                            x: star.x,
                            y: star.y,
                            chunkX,
                            chunkY,
                            properties: {
                                starType: star.starTypeName,
                                radius: star.radius,
                                color: star.color
                            },
                            cosmicRegion
                        });
                    }

                    // Add planets
                    for (const planet of chunk.planets) {
                        objects.push({
                            type: 'planet',
                            x: planet.x,
                            y: planet.y,
                            chunkX,
                            chunkY,
                            properties: {
                                planetType: planet.planetTypeName,
                                radius: planet.radius,
                                color: planet.color,
                                orbitalDistance: planet.orbitalDistance
                            },
                            cosmicRegion
                        });
                    }

                    // Add other object types...
                    for (const moon of chunk.moons) {
                        objects.push({
                            type: 'moon',
                            x: moon.x,
                            y: moon.y,
                            chunkX,
                            chunkY,
                            properties: {
                                radius: moon.radius,
                                orbitalDistance: moon.orbitalDistance
                            },
                            cosmicRegion
                        });
                    }

                    for (const nebula of chunk.nebulae) {
                        objects.push({
                            type: 'nebula',
                            x: nebula.x,
                            y: nebula.y,
                            chunkX,
                            chunkY,
                            properties: {
                                nebulaType: nebula.nebulaType,
                                radius: nebula.radius,
                                colors: nebula.colors
                            },
                            cosmicRegion
                        });
                    }

                    for (const garden of chunk.asteroidGardens) {
                        objects.push({
                            type: 'asteroidGarden',
                            x: garden.x,
                            y: garden.y,
                            chunkX,
                            chunkY,
                            properties: {
                                gardenType: garden.gardenType,
                                fieldRadius: garden.fieldRadius,
                                rockCount: garden.rockCount
                            },
                            cosmicRegion
                        });
                    }

                    for (const wormhole of chunk.wormholes) {
                        objects.push({
                            type: 'wormhole',
                            x: wormhole.x,
                            y: wormhole.y,
                            chunkX,
                            chunkY,
                            properties: {
                                wormholeId: wormhole.wormholeId,
                                designation: wormhole.designation,
                                twinX: wormhole.twinX,
                                twinY: wormhole.twinY
                            },
                            cosmicRegion
                        });
                    }

                    for (const blackhole of chunk.blackholes) {
                        objects.push({
                            type: 'blackhole',
                            x: blackhole.x,
                            y: blackhole.y,
                            chunkX,
                            chunkY,
                            properties: {
                                blackHoleType: blackhole.blackHoleTypeName,
                                eventHorizonRadius: blackhole.eventHorizonRadius,
                                gravitationalInfluence: blackhole.gravitationalInfluence
                            },
                            cosmicRegion
                        });
                    }

                    for (const comet of chunk.comets) {
                        objects.push({
                            type: 'comet',
                            x: comet.x,
                            y: comet.y,
                            chunkX,
                            chunkY,
                            properties: {
                                cometType: comet.cometType,
                                currentDistance: comet.currentDistance,
                                isVisible: comet.isVisible
                            },
                            cosmicRegion
                        });
                    }

                    // Add rogue planets
                    for (const roguePlanet of chunk.roguePlanets) {
                        objects.push({
                            type: 'rogue-planet',
                            x: roguePlanet.x,
                            y: roguePlanet.y,
                            chunkX,
                            chunkY,
                            properties: {
                                variant: roguePlanet.variant,
                                radius: roguePlanet.radius
                            },
                            cosmicRegion
                        });
                    }

                    // Add dark nebulae
                    if (chunk.darkNebulae) {
                        for (const darkNebula of chunk.darkNebulae) {
                            objects.push({
                                type: 'dark-nebula',
                                x: darkNebula.x,
                                y: darkNebula.y,
                                chunkX,
                                chunkY,
                                properties: {
                                    variant: darkNebula.variant,
                                    radius: darkNebula.radius,
                                    occlusionStrength: darkNebula.occlusionStrength,
                                    shape: darkNebula.shape
                                },
                                cosmicRegion
                            });
                        }
                    }
                }
            }

            return objects;
        } finally {
            setUniverseSeed(originalSeed);
        }
    }

    /**
     * Export analysis data as JSON
     */
    exportAnalysis(analysis: RegionAnalysis): string {
        return JSON.stringify(analysis, null, 2);
    }

    /**
     * Export analysis data as CSV
     */
    exportAnalysisCSV(analysis: RegionAnalysis): string {
        const headers = [
            'ChunkX', 'ChunkY', 'BackgroundStars', 'CelestialStars', 'Planets', 'Moons',
            'Nebulae', 'AsteroidGardens', 'Wormholes', 'BlackHoles', 'Comets', 'RoguePlanets', 'DarkNebulae', 'StarSystems', 'BinarySystems'
        ];
        
        const rows = analysis.chunks.map(chunk => [
            chunk.x, chunk.y, chunk.backgroundStars, chunk.celestialStars, chunk.planets,
            chunk.moons, chunk.nebulae, chunk.asteroidGardens, chunk.wormholes,
            chunk.blackholes, chunk.comets, chunk.roguePlanets, chunk.darkNebulae, chunk.starSystems, chunk.binarySystems
        ]);

        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
}