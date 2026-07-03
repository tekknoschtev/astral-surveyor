// ChunkGenerator - procedural generation for world chunks
// Extracted from ChunkManager so chunk lifecycle and generation are separate.
// CRITICAL: generation is deterministic from world position. The seed
// derivations and RNG call order below must not change, or existing
// universes (and shared seed URLs) would generate differently.

import { SeededRandom, hashPosition } from '../utils/random.js';
import { Star, Planet, Moon, PlanetTypes, StarTypes } from '../celestial/celestial.js';
import { Nebula, selectNebulaType } from '../celestial/nebulae.js';
import { AsteroidGarden, selectAsteroidGardenType } from '../celestial/asteroids.js';
import { Wormhole, generateWormholePair } from '../celestial/wormholes.js';
import { BlackHole, generateBlackHole } from '../celestial/blackholes.js';
import { Comet, selectCometType } from '../celestial/comets.js';
import { RoguePlanet, DarkNebula, CrystalGarden, Protostar } from '../celestial/RegionSpecificObjects.js';
import { GameConfig } from '../config/gameConfig.js';
import { RegionGenerator, type RegionInfo } from './RegionGenerator.js';
import { applyRegionModifiers, type RegionSpawnModifiers } from './CosmicRegions.js';
import type { Chunk, ChunkCoords, DebugObject } from './ChunkManager.js';
import type { DiscoveryData } from './DiscoveryRegistry.js';

// The view of the world the generator needs: the chunk cache for cross-chunk
// placement decisions, discovery state for wormhole pair restoration, debug
// spawns, and region queries for spawn-rate modifiers.
export interface WorldContext {
    chunkSize: number;
    activeChunks: Map<string, Chunk>;
    debugObjects?: DebugObject[];
    discoveredObjects: Map<string, DiscoveryData>;
    getChunkKey(chunkX: number, chunkY: number): string;
    getChunkCoords(worldX: number, worldY: number): ChunkCoords;
    getChunkRegion(chunkX: number, chunkY: number): RegionInfo | null;
    generateChunk(chunkX: number, chunkY: number): Chunk;
}

interface CompanionWeight {
    type: typeof StarTypes[keyof typeof StarTypes];
    weight: number;
}

export class ChunkGenerator {
    private world: WorldContext;

    constructor(world: WorldContext) {
        this.world = world;
    }

    // Accessor mirrors: the generation code below was moved verbatim from
    // ChunkManager, so these keep its this.* references compiling unchanged.
    private get chunkSize(): number {
        return this.world.chunkSize;
    }

    private get activeChunks(): Map<string, Chunk> {
        return this.world.activeChunks;
    }

    private get debugObjects(): DebugObject[] | undefined {
        return this.world.debugObjects;
    }

    private get discoveredObjects(): Map<string, DiscoveryData> {
        return this.world.discoveredObjects;
    }

    private getChunkKey(chunkX: number, chunkY: number): string {
        return this.world.getChunkKey(chunkX, chunkY);
    }

    private getChunkCoords(worldX: number, worldY: number): ChunkCoords {
        return this.world.getChunkCoords(worldX, worldY);
    }

    private getChunkRegion(chunkX: number, chunkY: number): RegionInfo | null {
        return this.world.getChunkRegion(chunkX, chunkY);
    }

    // Remote chunks are generated through the manager so error handling and
    // chunk caching behave exactly as before the extraction
    private generateChunk(chunkX: number, chunkY: number): Chunk {
        return this.world.generateChunk(chunkX, chunkY);
    }

    generate(chunkX: number, chunkY: number): Chunk {
        const chunkKey = this.getChunkKey(chunkX, chunkY);
        if (this.activeChunks.has(chunkKey)) {
            return this.activeChunks.get(chunkKey)!;
        }

        // Get region-modified spawn rates for this chunk
        const regionSpawnRates = this.getRegionModifiedSpawnRates(chunkX, chunkY);

        const chunk: Chunk = {
            x: chunkX,
            y: chunkY,
            stars: [],
            planets: [],
            moons: [], // Discoverable moons orbiting planets
            celestialStars: [], // Discoverable stars (different from background stars)
            nebulae: [], // Beautiful gas clouds for tranquil exploration
            asteroidGardens: [], // Scattered fields of glittering rocks
            wormholes: [], // Extremely rare spacetime anomalies for FTL travel
            blackholes: [], // Ultra-rare cosmic phenomena with universe reset
            comets: [], // Elliptical orbital objects around stars
            // Region-specific objects
            roguePlanets: [],
            darkNebulae: [],
            crystalGardens: [],
            protostars: []
        };

        // Generate stars for this chunk
        const starSeed = hashPosition(chunkX * this.chunkSize, chunkY * this.chunkSize) ^ 0x12345678;
        const starRng = new SeededRandom(starSeed);
        const starCount = starRng.nextInt(40, 80); // 40-80 stars per chunk

        for (let i = 0; i < starCount; i++) {
            const x = chunkX * this.chunkSize + starRng.nextFloat(0, this.chunkSize);
            const y = chunkY * this.chunkSize + starRng.nextFloat(0, this.chunkSize);
            
            chunk.stars.push({
                x: x,
                y: y,
                brightness: starRng.nextFloat(0.2, 1.0),
                size: starRng.next() > 0.9 ? 2 : 1,
                color: starRng.choice(['#ffffff', '#ffddaa', '#aaddff', '#ffaa88', '#88aaff'])
            });
        }

        // Generate star systems for this chunk (stars with orbiting planets)
        const starSystemSeed = hashPosition(chunkX * this.chunkSize, chunkY * this.chunkSize) ^ 0x87654321;
        const starSystemRng = new SeededRandom(starSystemSeed);
        // Reduce star system density for more exploration - most chunks will be empty space
        const starSystemRoll = starSystemRng.nextFloat(0, 1);
        let starSystemCount: number;
        
        // Use region-modified spawn rates instead of base configuration
        const spawnThreshold = 1 - regionSpawnRates.starSystems;
        if (starSystemRoll < spawnThreshold) {
            starSystemCount = 0; // Most chunks will be empty space
        } else {
            starSystemCount = 1; // Region-modified chance of having a star system
        }

        for (let i = 0; i < starSystemCount; i++) {
            // Improved star system placement to eliminate vertical line patterns
            const margin = GameConfig.world.starSystem.margin;
            
            // Use separate RNG instances for X and Y to break correlation
            const positionSeed = starSystemSeed + i * 1000000; // Unique seed per star system
            const xRng = new SeededRandom(positionSeed ^ 0xAAAA5555); // XOR for X coordinate
            const yRng = new SeededRandom(positionSeed ^ 0x5555AAAA); // Different XOR for Y coordinate
            
            // Generate multiple candidate positions and select the best one
            let bestX: number, bestY: number, bestScore = -1;
            const candidates = 3; // Try 3 different positions
            
            for (let attempt = 0; attempt < candidates; attempt++) {
                // Add extra randomization to break patterns
                const subSeed = attempt * 12345;
                xRng.setSeed((positionSeed ^ 0xAAAA5555 ^ subSeed) % 2147483647);
                yRng.setSeed((positionSeed ^ 0x5555AAAA ^ subSeed) % 2147483647);
                
                const candidateX = chunkX * this.chunkSize + xRng.nextFloat(margin, this.chunkSize - margin);
                const candidateY = chunkY * this.chunkSize + yRng.nextFloat(margin, this.chunkSize - margin);
                
                // Score this position based on distance from other star systems
                const score = this.scoreStarSystemPosition(candidateX, candidateY, chunkX, chunkY);
                
                if (score > bestScore) {
                    bestX = candidateX;
                    bestY = candidateY;
                    bestScore = score;
                }
            }
            
            const starX = bestX!;
            const starY = bestY!;
            
            // Determine star type based on rarity distribution
            const starType = this.selectStarType(starSystemRng);
            
            // Check for binary system generation
            const binaryChance = starSystemRng.nextFloat(0, 1);
            const isBinary = binaryChance < GameConfig.world.starSystem.binaryChance;
            
            // Create the primary star with the selected type
            const star = new Star(starX, starY, starType);
            star.initWithSeed(starSystemRng, starType);
            
            // Add binary companion if this is a binary system
            if (isBinary) {
                // Generate companion star properties
                const companionDistance = starSystemRng.nextFloat(
                    GameConfig.world.binaryStars.distanceRange.min, 
                    GameConfig.world.binaryStars.distanceRange.max
                );
                const companionAngle = starSystemRng.nextFloat(0, Math.PI * 2); // Random angle
                const companionX = starX + Math.cos(companionAngle) * companionDistance;
                const companionY = starY + Math.sin(companionAngle) * companionDistance;
                
                // Companion is usually smaller/different type
                const companionType = this.selectCompanionStarType(starSystemRng, starType);
                const companionStar = new Star(companionX, companionY, companionType);
                companionStar.initWithSeed(starSystemRng, companionType);
                
                // Add both stars to the chunk
                chunk.celestialStars.push(star);
                chunk.celestialStars.push(companionStar);
            } else {
                // Single star system
                chunk.celestialStars.push(star);
            }
            
            // Generate planets for this star system with weighted distribution (0-12 planets)
            // Weighted to favor 2-5 planets per star for realistic systems
            const planetRoll = starSystemRng.nextFloat(0, 1);
            let planetCount: number;
            
            const config = GameConfig.world.planetCounts;
            if (planetRoll < config.empty) {
                planetCount = 0; // Empty system
            } else if (planetRoll < config.empty + config.single) {
                planetCount = 1; // Single planet
            } else if (planetRoll < config.empty + config.single + config.small) {
                const range = GameConfig.world.planetCountRanges.small;
                planetCount = starSystemRng.nextInt(range.min, range.max); // Small system - most common
            } else if (planetRoll < config.empty + config.single + config.small + config.medium) {
                const range = GameConfig.world.planetCountRanges.medium;
                planetCount = starSystemRng.nextInt(range.min, range.max); // Medium system - solar system-like
            } else {
                const range = GameConfig.world.planetCountRanges.large;
                planetCount = starSystemRng.nextInt(range.min, range.max); // Large system - massive system
            }
            
            for (let j = 0; j < planetCount; j++) {
                // Calculate orbital distance based on planet index and star size
                const minDistance = star.radius + GameConfig.celestial.planets.minDistanceFromStar;
                
                // Scale orbital distance with much more dramatic variation for speed differences
                // Inner planets much closer, outer planets can have truly massive orbits
                // With 92% empty chunks and 250px margins, we can support much larger systems
                let orbitalDistance: number;
                
                if (j === 0) {
                    // First planet: very close to star for fast orbit
                    orbitalDistance = minDistance + starSystemRng.nextFloat(10, 40);
                } else if (j === 1) {
                    // Second planet: moderate distance
                    orbitalDistance = minDistance + starSystemRng.nextFloat(60, 120);
                } else if (j === 2) {
                    // Third planet: further out
                    orbitalDistance = minDistance + starSystemRng.nextFloat(150, 250);
                } else {
                    // Outer planets: massive orbits with exponential spacing for epic systems
                    const baseDistance = minDistance + 250 + (j - 2) * starSystemRng.nextFloat(150, 300);
                    orbitalDistance = Math.min(baseDistance, 800); // Much larger max distance for epic outer planets
                }
                
                // Random starting angle for this planet
                const orbitalAngle = starSystemRng.nextFloat(0, Math.PI * 2);
                
                // Individual orbital speed calculation with fresh randomness for each planet
                // Kepler's laws: closer planets orbit significantly faster
                const planetSeed = starSystemSeed ^ (j * 0xA5A5A5A5) ^ 0xDEADBEEF; // Unique seed for each planet
                const planetRng = new SeededRandom(planetSeed);
                
                const baseSpeed = GameConfig.celestial.planets.orbitalSpeed.base;
                
                // Stronger inverse relationship with distance for more dramatic speed differences
                // Using a more pronounced power relationship to make speed differences very visible
                const distanceSpeedFactor = Math.pow(
                    GameConfig.celestial.planets.orbitalSpeed.keplerReference / orbitalDistance, 
                    GameConfig.celestial.planets.orbitalSpeed.keplerExponent
                );
                
                // Individual randomness for each planet
                const randomSpeedFactor = planetRng.nextFloat(
                    GameConfig.celestial.planets.orbitalSpeed.randomFactor.min,
                    GameConfig.celestial.planets.orbitalSpeed.randomFactor.max
                );
                
                const orbitalSpeed = baseSpeed * distanceSpeedFactor * randomSpeedFactor;
                
                // Calculate initial position based on orbital parameters
                const planetX = starX + Math.cos(orbitalAngle) * orbitalDistance;
                const planetY = starY + Math.sin(orbitalAngle) * orbitalDistance;
                
                // Determine planet type based on orbital distance and star characteristics
                const planetType = this.selectPlanetType(starSystemRng, orbitalDistance, star);
                
                // Create the planet with orbital properties and type
                const planet = new Planet(planetX, planetY, star, orbitalDistance, orbitalAngle, orbitalSpeed, planetType);
                planet.initWithSeed(starSystemRng, star, orbitalDistance, orbitalAngle, orbitalSpeed, planetType, j);
                
                // Add planet to both the star's planet list and the chunk
                star.addPlanet(planet);
                chunk.planets.push(planet);
                
                // Generate moons for this planet based on rarity rules
                this.generateMoonsForPlanet(planet, starSystemRng, chunk);
            }
            
            // Generate comets for this star system based on configuration
            this.generateCometsForStarSystem(star, starSystemRng, chunk, regionSpawnRates.comets);
        }

        // Generate nebulae for this chunk (separate from star systems)
        this.generateNebulaeForChunk(chunkX, chunkY, chunk);
        
        // Generate asteroid gardens for this chunk
        this.generateAsteroidGardensForChunk(chunkX, chunkY, chunk);
        
        // Check for pending wormhole pairs that should be placed in this chunk FIRST
        this.placePendingWormholePairs(chunkX, chunkY, chunk);
        
        // Generate new wormholes for this chunk (extremely rare) - only if no pending pairs were placed
        if (chunk.wormholes.length === 0) {
            this.generateWormholesForChunk(chunkX, chunkY, chunk);
        }
        
        // Generate black holes for this chunk (ultra-rare - cosmic reset points)
        this.generateBlackHolesForChunk(chunkX, chunkY, chunk);

        // Generate region-specific objects for this chunk
        this.generateRoguePlanetsForChunk(chunkX, chunkY, chunk);
        this.generateDarkNebulaeForChunk(chunkX, chunkY, chunk);
        this.generateCrystalGardensForChunk(chunkX, chunkY, chunk);
        this.generateProtostarsForChunk(chunkX, chunkY, chunk);

        this.activeChunks.set(chunkKey, chunk);
        return chunk;
    }

    selectPlanetType(rng: SeededRandom, orbitalDistance: number, star: Star): typeof PlanetTypes[keyof typeof PlanetTypes] {
        // Create weighted selection based on orbital distance and star characteristics
        const minDistance = star.radius + 60;
        const relativeDistance = (orbitalDistance - minDistance) / 800; // Normalize to 0-1 range
        
        // Base probabilities based on distance from star
        let probabilities: Record<string, number> = {};
        
        if (relativeDistance < 0.2) {
            // Very close to star - hot planets more likely
            probabilities = GameConfig.planetTypes.inner;
        } else if (relativeDistance < 0.4) {
            // Close to star - temperate zone
            probabilities = GameConfig.planetTypes.habitable;
        } else if (relativeDistance < 0.7) {
            // Medium distance - gas giants more common
            probabilities = GameConfig.planetTypes.outer;
        } else {
            // Far from star - frozen worlds dominate
            probabilities = GameConfig.planetTypes.far;
        }
        
        // Apply star type modifiers to create realistic stellar systems
        probabilities = this.applyStarTypeModifiers(probabilities, star.starType, relativeDistance);
        
        // Apply global rarity modifiers to ensure overall distribution matches design
        const globalModifiers: Record<string, number> = {};
        for (const [typeName, typeData] of Object.entries(PlanetTypes)) {
            globalModifiers[typeName] = typeData.rarity;
        }
        
        // Combine distance-based probabilities with global rarity
        const finalProbabilities: Record<string, number> = {};
        let totalWeight = 0;
        
        for (const typeName of Object.keys(PlanetTypes)) {
            const distanceProb = probabilities[typeName] || 0.01;
            const globalRarity = globalModifiers[typeName];
            finalProbabilities[typeName] = distanceProb * globalRarity;
            totalWeight += finalProbabilities[typeName];
        }
        
        // Normalize probabilities
        for (const typeName of Object.keys(finalProbabilities)) {
            finalProbabilities[typeName] /= totalWeight;
        }
        
        // Select planet type using weighted random selection
        const roll = rng.nextFloat(0, 1);
        let cumulativeProbability = 0;
        
        for (const [typeName, probability] of Object.entries(finalProbabilities)) {
            cumulativeProbability += probability;
            if (roll <= cumulativeProbability) {
                return PlanetTypes[typeName];
            }
        }
        
        // Fallback to rocky planet if something goes wrong
        return PlanetTypes.ROCKY;
    }

    selectStarType(rng: SeededRandom): typeof StarTypes[keyof typeof StarTypes] {
        // Use weighted random selection based on star type rarity
        const roll = rng.nextFloat(0, 1);
        let cumulativeProbability = 0;
        
        // Order by rarity for proper cumulative distribution
        const starTypeOrder = [
            'G_TYPE',    // 30%
            'K_TYPE',    // 25% 
            'M_TYPE',    // 25%
            'RED_GIANT', // 10%
            'BLUE_GIANT',// 5%
            'WHITE_DWARF',// 4%
            'NEUTRON_STAR'// 1%
        ];
        
        for (const typeName of starTypeOrder) {
            const starType = StarTypes[typeName];
            cumulativeProbability += starType.rarity;
            if (roll <= cumulativeProbability) {
                return starType;
            }
        }
        
        // Fallback to G-type star if something goes wrong
        return StarTypes.G_TYPE;
    }

    applyStarTypeModifiers(probabilities: Record<string, number>, starType: typeof StarTypes[keyof typeof StarTypes], relativeDistance: number): Record<string, number> {
        // Create a copy to avoid modifying the original
        const modifiedProbs = { ...probabilities };
        
        // Apply star-specific modifiers based on temperature and characteristics
        switch (starType) {
            case StarTypes.BLUE_GIANT:
                // Very hot, massive stars - harsh conditions
                modifiedProbs.VOLCANIC *= 2.0;  // More volcanic worlds due to intense radiation
                modifiedProbs.DESERT *= 1.5;    // More desert worlds
                modifiedProbs.OCEAN *= 0.3;     // Much fewer ocean worlds (water boiled away)
                modifiedProbs.FROZEN *= 0.1;    // Almost no frozen worlds
                modifiedProbs.EXOTIC *= 1.8;    // More exotic conditions
                break;
                
            case StarTypes.RED_GIANT:
                // Evolved star - expanded habitable zone but unstable
                modifiedProbs.ROCKY *= 0.8;     // Fewer rocky worlds (atmosphere stripped)
                modifiedProbs.VOLCANIC *= 1.3;  // More volcanic activity from stellar variation
                modifiedProbs.DESERT *= 1.4;    // More desert worlds
                modifiedProbs.OCEAN *= 0.6;     // Fewer stable ocean worlds
                modifiedProbs.EXOTIC *= 1.5;    // Unusual conditions from stellar evolution
                break;
                
            case StarTypes.M_TYPE:
                // Red dwarf - cool, stable, long-lived
                modifiedProbs.OCEAN *= 1.4;     // More stable ocean worlds
                modifiedProbs.FROZEN *= 1.3;    // Extended frozen zone
                modifiedProbs.VOLCANIC *= 0.7;  // Less volcanic activity
                modifiedProbs.DESERT *= 0.8;    // Fewer desert worlds
                if (relativeDistance > 0.3) {   // In outer regions especially
                    modifiedProbs.FROZEN *= 1.8;
                }
                break;
                
            case StarTypes.WHITE_DWARF:
                // Dense, hot remnant - unique conditions
                modifiedProbs.ROCKY *= 1.5;     // More rocky survivors
                modifiedProbs.EXOTIC *= 3.0;    // Much more exotic conditions
                modifiedProbs.OCEAN *= 0.2;     // Very few ocean worlds
                modifiedProbs.GAS_GIANT *= 0.1; // Gas giants mostly dispersed
                modifiedProbs.VOLCANIC *= 0.5;  // Less active volcanism
                break;
                
            case StarTypes.NEUTRON_STAR:
                // Extreme conditions - mostly exotic/rocky survivors
                modifiedProbs.EXOTIC *= 5.0;    // Extreme exotic conditions
                modifiedProbs.ROCKY *= 2.0;     // Dense rocky survivors
                modifiedProbs.OCEAN *= 0.05;    // Almost no oceans survive
                modifiedProbs.GAS_GIANT *= 0.02; // Gas giants stripped away
                modifiedProbs.FROZEN *= 0.1;    // Radiation prevents freezing
                modifiedProbs.VOLCANIC *= 0.3;  // Limited volcanic activity
                modifiedProbs.DESERT *= 0.3;    // Surfaces modified by radiation
                break;
                
            case StarTypes.K_TYPE:
                // Orange dwarf - stable, slightly cooler than sun
                modifiedProbs.OCEAN *= 1.2;     // Slightly more ocean worlds
                modifiedProbs.FROZEN *= 1.1;    // Slightly more frozen worlds
                modifiedProbs.VOLCANIC *= 0.9;  // Slightly less volcanic
                break;
                
            case StarTypes.G_TYPE:
            default:
                // Sun-like star - baseline, no major modifications
                // This is our reference case
                break;
        }
        
        return modifiedProbs;
    }

    /**
     * Apply region-specific spawn rate modifications to base probabilities
     */
    private getRegionModifiedSpawnRates(chunkX: number, chunkY: number): Record<string, number> {
        // Get base spawn chances from configuration
        const baseSpawnChances = {
            starSystems: GameConfig.world.starSystem.spawnChance,
            nebulae: GameConfig.world.specialObjects.nebulae.spawnChance,
            asteroidGardens: GameConfig.world.specialObjects.asteroidGardens.spawnChance,
            wormholes: GameConfig.world.specialObjects.wormholes.spawnChance,
            blackHoles: GameConfig.world.specialObjects.blackHoles.spawnChance,
            comets: GameConfig.world.specialObjects.comets.spawnChance,
        };
        
        // If cosmic regions are disabled, use base rates
        if (!GameConfig.world.cosmicRegions?.enabled) {
            return baseSpawnChances;
        }
        
        // Get region info for this chunk
        const regionInfo = this.getChunkRegion(chunkX, chunkY);
        
        if (!regionInfo || regionInfo.influence <= 0) {
            return baseSpawnChances;
        }
        
        // Apply region modifiers with influence scaling
        const influence = regionInfo.influence;
        const modifiers = regionInfo.definition.spawnModifiers;
        
        // Interpolate between base rates and region-modified rates based on influence
        const interpolatedModifiers: RegionSpawnModifiers = {
            starSystems: 1 + (modifiers.starSystems - 1) * influence,
            nebulae: 1 + (modifiers.nebulae - 1) * influence,
            asteroidGardens: 1 + (modifiers.asteroidGardens - 1) * influence,
            wormholes: 1 + (modifiers.wormholes - 1) * influence,
            blackHoles: 1 + (modifiers.blackHoles - 1) * influence,
            comets: 1 + (modifiers.comets - 1) * influence,
        };
        
        return applyRegionModifiers(baseSpawnChances, interpolatedModifiers);
    }

    // Score a potential star system position based on distance from existing systems
    scoreStarSystemPosition(x: number, y: number, currentChunkX: number, currentChunkY: number): number {
        const minDistance = GameConfig.world.starSystem.minDistance;
        const preferredDistance = GameConfig.world.starSystem.preferredDistance;
        const nebulaMinDistance = GameConfig.world.specialObjects.nebulae.minDistance;
        const nebulaPreferredDistance = GameConfig.world.specialObjects.nebulae.preferredDistance;
        
        let score = 1.0; // Start with perfect score
        
        // Check neighboring chunks for existing star systems and nebulae
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
                const neighborChunkX = currentChunkX + dx;
                const neighborChunkY = currentChunkY + dy;
                const chunkKey = this.getChunkKey(neighborChunkX, neighborChunkY);
                const chunk = this.activeChunks.get(chunkKey);
                
                if (chunk) {
                    // Check distances to existing star systems
                    if (chunk.celestialStars) {
                        for (const star of chunk.celestialStars) {
                            const distance = Math.sqrt(Math.pow(x - star.x, 2) + Math.pow(y - star.y, 2));
                            
                            // Penalize positions too close to existing systems
                            if (distance < minDistance) {
                                score *= 0.1; // Heavy penalty for violating minimum distance
                            } else if (distance < preferredDistance) {
                                // Gradual penalty for being closer than preferred
                                const penalty = (distance - minDistance) / (preferredDistance - minDistance);
                                score *= (0.3 + 0.7 * penalty);
                            }
                            // Positions at preferred distance or farther get no penalty
                        }
                    }
                    
                    // Check distances to existing nebulae to prevent overlap
                    if (chunk.nebulae) {
                        for (const nebula of chunk.nebulae) {
                            const distance = Math.sqrt(Math.pow(x - nebula.x, 2) + Math.pow(y - nebula.y, 2));
                            
                            // Penalize positions too close to nebulae
                            if (distance < nebulaMinDistance) {
                                score *= 0.05; // Very heavy penalty for overlapping with nebulae
                            } else if (distance < nebulaPreferredDistance) {
                                // Gradual penalty for being closer than preferred
                                const penalty = (distance - nebulaMinDistance) / (nebulaPreferredDistance - nebulaMinDistance);
                                score *= (0.2 + 0.8 * penalty);
                            }
                            // Positions at preferred distance or farther get minimal penalty
                        }
                    }
                }
            }
        }
        
        return score;
    }

    // Generate comets for a star system based on configuration
    generateCometsForStarSystem(star: Star, rng: SeededRandom, chunk: Chunk, cometSpawnChance?: number): void {
        const config = GameConfig.world.specialObjects.comets;
        const spawnChance = cometSpawnChance !== undefined ? cometSpawnChance : config.spawnChance;
        
        // Check if this star system should have comets (region-modified chance)
        if (rng.nextFloat(0, 1) >= spawnChance) {
            return; // No comets for this star system
        }
        
        // Determine number of comets based on distribution
        const countRoll = rng.nextFloat(0, 1);
        let cometCount = 0;
        
        if (countRoll < config.countDistribution.none) {
            cometCount = 0; // 80% - no comets
        } else if (countRoll < config.countDistribution.none + config.countDistribution.single) {
            cometCount = 1; // 15% - single comet
        } else {
            cometCount = rng.nextInt(2, 3); // 5% - multiple comets (2-3)
        }
        
        if (cometCount === 0) return;
        
        for (let i = 0; i < cometCount; i++) {
            // Generate orbital parameters using configuration ranges
            const semiMajorAxis = rng.nextFloat(
                config.orbit.semiMajorAxis.min,
                config.orbit.semiMajorAxis.max
            );
            
            const eccentricity = rng.nextFloat(
                config.orbit.eccentricity.min,
                config.orbit.eccentricity.max
            );
            
            const period = rng.nextFloat(
                config.orbit.period.min,
                config.orbit.period.max
            );
            
            // Random argument of periapsis (orientation of ellipse)
            const argumentOfPeriapsis = rng.nextFloat(0, Math.PI * 2);
            
            // Random starting mean anomaly (position in orbit)
            const meanAnomalyAtEpoch = rng.nextFloat(0, Math.PI * 2);
            
            // Calculate derived orbital parameters
            const perihelionDistance = semiMajorAxis * (1 - eccentricity);
            const aphelionDistance = semiMajorAxis * (1 + eccentricity);
            const epoch = 0; // Use 0 as epoch for all comets
            
            // Create orbital parameters object
            const orbit = {
                semiMajorAxis,
                eccentricity,
                perihelionDistance,
                aphelionDistance,
                orbitalPeriod: period,
                argumentOfPerihelion: argumentOfPeriapsis,
                meanAnomalyAtEpoch,
                epoch
            };
            
            // Select comet type based on rarity
            const cometType = selectCometType(rng);
            
            // Calculate initial position (start at perihelion for visibility)
            const initialX = star.x + perihelionDistance * Math.cos(argumentOfPeriapsis);
            const initialY = star.y + perihelionDistance * Math.sin(argumentOfPeriapsis);
            
            // Create the comet
            const comet = new Comet(initialX, initialY, star, orbit, cometType, i);
            
            // Add to chunk
            chunk.comets.push(comet);
        }
    }

    // Generate moons for a planet based on rarity rules
    generateMoonsForPlanet(planet: Planet, rng: SeededRandom, chunk: Chunk): void {
        // Determine moon probability based on planet type and size
        let moonChance = 0;
        let maxMoons = 0;
        
        // Gas giants have the highest chance of moons
        if (planet.planetType === PlanetTypes.GAS_GIANT) {
            moonChance = GameConfig.world.moons.gasGiantChance;
            maxMoons = 4;
        }
        // Large rocky/ocean planets can have moons
        else if ((planet.planetType === PlanetTypes.ROCKY || planet.planetType === PlanetTypes.OCEAN) && planet.radius > 15) {
            moonChance = GameConfig.world.moons.largePlanetChance;
            maxMoons = 2;
        }
        // Other planet types have low chance of moons
        else {
            moonChance = GameConfig.world.moons.otherPlanetChance;
            maxMoons = 1;
        }
        
        // Roll for moon generation
        if (rng.nextFloat(0, 1) > moonChance) {
            return; // No moons for this planet
        }
        
        // Determine number of moons
        const moonCount = rng.nextInt(1, maxMoons);
        
        for (let i = 0; i < moonCount; i++) {
            // Calculate moon orbital parameters
            const minDistance = planet.radius + GameConfig.world.moons.minDistance;
            const maxDistance = planet.radius + GameConfig.world.moons.maxDistance;
            const orbitalDistance = rng.nextFloat(minDistance, maxDistance);
            
            // Random starting angle
            const orbitalAngle = rng.nextFloat(0, Math.PI * 2);
            
            // Fast orbital speed (complete orbit in 10-30 seconds)
            const baseSpeed = 0.2; // Base speed in radians per second
            const speedVariation = rng.nextFloat(0.7, 1.3); // ±30% variation
            const orbitalSpeed = baseSpeed * speedVariation;
            
            // Calculate initial position
            const moonX = planet.x + Math.cos(orbitalAngle) * orbitalDistance;
            const moonY = planet.y + Math.sin(orbitalAngle) * orbitalDistance;
            
            // Create the moon
            const moon = new Moon(moonX, moonY, planet, orbitalDistance, orbitalAngle, orbitalSpeed);
            moon.initWithSeed(rng, planet, orbitalDistance, orbitalAngle, orbitalSpeed, i);
            
            // Add moon to the chunk
            chunk.moons.push(moon);
        }
    }
    
    // Select appropriate companion star type for binary systems
    selectCompanionStarType(rng: SeededRandom, primaryStarType: typeof StarTypes[keyof typeof StarTypes]): typeof StarTypes[keyof typeof StarTypes] {
        // Companion stars are typically smaller than the primary
        // Create weighted distribution favoring smaller star types
        const companionWeights: CompanionWeight[] = [];
        
        // If primary is a giant, companion is usually a dwarf
        if (primaryStarType === StarTypes.RED_GIANT || primaryStarType === StarTypes.BLUE_GIANT) {
            companionWeights.push(
                { type: StarTypes.M_TYPE, weight: 0.4 },
                { type: StarTypes.K_TYPE, weight: 0.3 },
                { type: StarTypes.G_TYPE, weight: 0.2 },
                { type: StarTypes.WHITE_DWARF, weight: 0.1 }
            );
        }
        // If primary is main sequence, companion can be similar or smaller
        else if (primaryStarType === StarTypes.G_TYPE || primaryStarType === StarTypes.K_TYPE) {
            companionWeights.push(
                { type: StarTypes.M_TYPE, weight: 0.5 },
                { type: StarTypes.K_TYPE, weight: 0.3 },
                { type: StarTypes.G_TYPE, weight: 0.2 }
            );
        }
        // If primary is M-type, companion is usually also M-type or white dwarf
        else if (primaryStarType === StarTypes.M_TYPE) {
            companionWeights.push(
                { type: StarTypes.M_TYPE, weight: 0.7 },
                { type: StarTypes.WHITE_DWARF, weight: 0.3 }
            );
        }
        // For exotic primaries, use diverse companions
        else {
            companionWeights.push(
                { type: StarTypes.M_TYPE, weight: 0.4 },
                { type: StarTypes.K_TYPE, weight: 0.3 },
                { type: StarTypes.WHITE_DWARF, weight: 0.3 }
            );
        }
        
        // Select companion based on weighted distribution
        const totalWeight = companionWeights.reduce((sum, item) => sum + item.weight, 0);
        let randomValue = rng.nextFloat(0, totalWeight);
        
        for (const item of companionWeights) {
            randomValue -= item.weight;
            if (randomValue <= 0) {
                return item.type;
            }
        }
        
        // Fallback to M-type if something goes wrong
        return StarTypes.M_TYPE;
    }
    
    // Generate nebulae for a chunk - independent of star systems for varied placement
    generateNebulaeForChunk(chunkX: number, chunkY: number, chunk: Chunk): void {
        // Use separate seed for nebulae generation to avoid correlation with star systems
        const nebulaeSeed = hashPosition(chunkX * this.chunkSize, chunkY * this.chunkSize) ^ 0xABCDEF01;
        const nebulaeRng = new SeededRandom(nebulaeSeed);
        
        // Lower probability for nebulae - they should be special discoveries
        // Most chunks (95%) will have no nebulae for sense of wonder when found
        const nebulaeRoll = nebulaeRng.nextFloat(0, 1);
        let nebulaeCount: number;
        
        // Get region-modified spawn rates for this chunk
        const regionSpawnRates = this.getRegionModifiedSpawnRates(chunkX, chunkY);
        
        const spawnThreshold = regionSpawnRates.nebulae;
        const multipleThreshold = spawnThreshold + GameConfig.world.specialObjects.nebulae.multipleChance;
        
        if (nebulaeRoll < (1 - spawnThreshold)) {
            nebulaeCount = 0; // Most chunks have no nebulae
        } else if (nebulaeRoll < (1 - multipleThreshold)) {
            nebulaeCount = 1; // Single nebula
        } else {
            nebulaeCount = nebulaeRng.nextInt(1, 2); // Rare clusters of multiple nebulae
        }
        
        for (let i = 0; i < nebulaeCount; i++) {
            // Position nebulae with margin to ensure they fit within chunk
            const margin = 300; // Larger margin for nebulae since they can be quite large
            const nebulaX = chunkX * this.chunkSize + nebulaeRng.nextFloat(margin, this.chunkSize - margin);
            const nebulaY = chunkY * this.chunkSize + nebulaeRng.nextFloat(margin, this.chunkSize - margin);
            
            // Select nebula type based on rarity
            const nebulaType = selectNebulaType(nebulaeRng);
            
            // Create the nebula
            const nebula = new Nebula(nebulaX, nebulaY, nebulaType, nebulaeRng);
            
            // Add to chunk
            chunk.nebulae.push(nebula);
        }
    }
    
    // Generate asteroid gardens for a chunk - scattered fields for exploration
    generateAsteroidGardensForChunk(chunkX: number, chunkY: number, chunk: Chunk): void {
        // Use separate seed for asteroid generation to avoid correlation with other objects
        const asteroidSeed = hashPosition(chunkX * this.chunkSize, chunkY * this.chunkSize) ^ 0x456789AB;
        const asteroidRng = new SeededRandom(asteroidSeed);
        
        // Moderate probability for asteroid gardens - more common than nebulae but still special
        // Most chunks (85%) will have no asteroid gardens, creating anticipation for discovery
        const asteroidRoll = asteroidRng.nextFloat(0, 1);
        let asteroidCount: number;
        
        // Get region-modified spawn rates for this chunk  
        const regionSpawnRates = this.getRegionModifiedSpawnRates(chunkX, chunkY);
        
        const asteroidSpawnThreshold = regionSpawnRates.asteroidGardens;
        const asteroidMultipleThreshold = asteroidSpawnThreshold + GameConfig.world.specialObjects.asteroidGardens.multipleChance;
        
        if (asteroidRoll < (1 - asteroidSpawnThreshold)) {
            asteroidCount = 0; // Most chunks have no asteroid gardens
        } else if (asteroidRoll < (1 - asteroidMultipleThreshold)) {
            asteroidCount = 1; // Single asteroid garden
        } else {
            asteroidCount = asteroidRng.nextInt(1, 2); // Rare multiple asteroid gardens
        }
        
        for (let i = 0; i < asteroidCount; i++) {
            // Position asteroid gardens with margin to ensure they fit within chunk
            // Use larger margin since asteroid gardens can be quite spread out
            const margin = 250; 
            const asteroidX = chunkX * this.chunkSize + asteroidRng.nextFloat(margin, this.chunkSize - margin);
            const asteroidY = chunkY * this.chunkSize + asteroidRng.nextFloat(margin, this.chunkSize - margin);
            
            // Avoid placing asteroid gardens too close to existing star systems
            // This ensures they feel like independent discoveries rather than orbital debris
            let validPosition = true;
            for (const star of chunk.celestialStars) {
                const distance = Math.sqrt(
                    Math.pow(asteroidX - star.x, 2) + Math.pow(asteroidY - star.y, 2)
                );
                if (distance < 400) { // Minimum distance from stars
                    validPosition = false;
                    break;
                }
            }
            
            // If too close to a star system, try a different position (simple retry)
            if (!validPosition) {
                const retryX = chunkX * this.chunkSize + asteroidRng.nextFloat(margin, this.chunkSize - margin);
                const retryY = chunkY * this.chunkSize + asteroidRng.nextFloat(margin, this.chunkSize - margin);
                
                // Check retry position
                validPosition = true;
                for (const star of chunk.celestialStars) {
                    const distance = Math.sqrt(
                        Math.pow(retryX - star.x, 2) + Math.pow(retryY - star.y, 2)
                    );
                    if (distance < 400) {
                        validPosition = false;
                        break;
                    }
                }
                
                // If retry also fails, skip this asteroid garden (maintain quality over quantity)
                if (!validPosition) {
                    continue;
                }
                
                // Use retry position
                const asteroidGarden = new AsteroidGarden(retryX, retryY, selectAsteroidGardenType(asteroidRng), asteroidRng);
                chunk.asteroidGardens.push(asteroidGarden);
            } else {
                // Original position is valid
                const asteroidGarden = new AsteroidGarden(asteroidX, asteroidY, selectAsteroidGardenType(asteroidRng), asteroidRng);
                chunk.asteroidGardens.push(asteroidGarden);
            }
        }
    }

    // Generate wormholes for a chunk - extremely rare spacetime anomalies
    generateWormholesForChunk(chunkX: number, chunkY: number, chunk: Chunk): void {
        // First, check for debug wormholes in this chunk
        if (this.debugObjects) {
            for (const debugObj of this.debugObjects) {
                if (debugObj.type === 'wormhole') {
                    const objChunkCoords = this.getChunkCoords(debugObj.x, debugObj.y);
                    if (objChunkCoords.x === chunkX && objChunkCoords.y === chunkY) {
                        chunk.wormholes.push(debugObj.object as Wormhole);
                        // Continue to check for natural wormholes too
                    }
                }
            }
        }
        
        // Continue with normal wormhole generation
        // Use separate seed for wormhole generation to avoid correlation with other objects
        const wormholeSeed = hashPosition(chunkX * this.chunkSize, chunkY * this.chunkSize) ^ 0x789ABCDE;
        const wormholeRng = new SeededRandom(wormholeSeed);
        
        // Ultra-rare probability for wormholes - creating true sense of wonder when found
        // 99.95% of chunks will have no wormholes (approximately 1 every 2000 chunks)
        const wormholeRoll = wormholeRng.nextFloat(0, 1);
        
        // Get region-modified spawn rates for this chunk
        const regionSpawnRates = this.getRegionModifiedSpawnRates(chunkX, chunkY);
        
        if (wormholeRoll >= regionSpawnRates.wormholes) {
            return; // No wormhole in this chunk (most of the time)
        }
        
        // This chunk gets a wormhole! Generate its pair location
        // Use deterministic algorithm to ensure pairs always exist
        const wormholeId = this.generateWormholeId(chunkX, chunkY, wormholeRng);
        const pairLocation = this.generateWormholePairLocation(chunkX, chunkY, wormholeRng);
        
        // Position wormhole within this chunk with good margin
        const margin = 300; // Large margin to ensure wormholes don't conflict with other objects
        const wormholeX = chunkX * this.chunkSize + wormholeRng.nextFloat(margin, this.chunkSize - margin);
        const wormholeY = chunkY * this.chunkSize + wormholeRng.nextFloat(margin, this.chunkSize - margin);
        
        // Ensure wormhole is far enough from star systems (they are cosmic-scale phenomena)
        let validPosition = true;
        for (const star of chunk.celestialStars) {
            const distance = Math.sqrt(
                Math.pow(wormholeX - star.x, 2) + Math.pow(wormholeY - star.y, 2)
            );
            if (distance < 500) { // Minimum 500px from star systems
                validPosition = false;
                break;
            }
        }
        
        // If position conflicts with star system, try alternative position
        let finalX = wormholeX;
        let finalY = wormholeY;
        
        if (!validPosition) {
            // Try placing at chunk edge instead (wormholes as boundary phenomena)
            const edgeChoice = wormholeRng.nextInt(0, 4);
            const edgeMargin = 100;
            
            switch (edgeChoice) {
                case 0: // Top edge
                    finalX = chunkX * this.chunkSize + wormholeRng.nextFloat(edgeMargin, this.chunkSize - edgeMargin);
                    finalY = chunkY * this.chunkSize + edgeMargin;
                    break;
                case 1: // Right edge
                    finalX = (chunkX + 1) * this.chunkSize - edgeMargin;
                    finalY = chunkY * this.chunkSize + wormholeRng.nextFloat(edgeMargin, this.chunkSize - edgeMargin);
                    break;
                case 2: // Bottom edge
                    finalX = chunkX * this.chunkSize + wormholeRng.nextFloat(edgeMargin, this.chunkSize - edgeMargin);
                    finalY = (chunkY + 1) * this.chunkSize - edgeMargin;
                    break;
                case 3: // Left edge
                    finalX = chunkX * this.chunkSize + edgeMargin;
                    finalY = chunkY * this.chunkSize + wormholeRng.nextFloat(edgeMargin, this.chunkSize - edgeMargin);
                    break;
            }
        }
        
        // Generate the wormhole pair
        const [alphaWormhole, betaWormhole] = generateWormholePair(
            finalX, finalY, 
            pairLocation.x, pairLocation.y, 
            wormholeId, 
            wormholeRng
        );
        
        // Add the local wormhole to this chunk
        chunk.wormholes.push(alphaWormhole);
        
        // Immediately generate the remote chunk to ensure the beta wormhole exists
        const remoteChunkX = Math.floor(pairLocation.x / this.chunkSize);
        const remoteChunkY = Math.floor(pairLocation.y / this.chunkSize);
        
        // Generate or get the remote chunk
        const remoteChunk = this.generateChunk(remoteChunkX, remoteChunkY);
        
        // CRITICAL FIX: Only add beta wormhole if it doesn't already exist in the remote chunk
        const betaAlreadyExists = remoteChunk.wormholes.some(w => 
            (w.wormholeId === wormholeId && w.designation === 'beta') ||
            (Math.floor(w.x) === Math.floor(pairLocation.x) && Math.floor(w.y) === Math.floor(pairLocation.y) && w.designation === 'beta')
        );
        
        if (!betaAlreadyExists) {
            remoteChunk.wormholes.push(betaWormhole);
        }
        
        // Debug logging can be enabled for development
        // console.log(`Generated wormhole pair ${wormholeId}: Alpha at (${chunkX}, ${chunkY}), Beta placed at (${remoteChunkX}, ${remoteChunkY})`);
    }
    
    // Place beta wormholes from pending pairs into the appropriate chunk
    private placePendingWormholePairs(chunkX: number, chunkY: number, chunk: Chunk): void {
        // Check all pending wormhole pairs to see if any belong to this chunk
        for (const [wormholeId, pairData] of this.pendingWormholePairs) {
            if (pairData.remoteChunkX === chunkX && pairData.remoteChunkY === chunkY) {
                // This chunk should contain the beta wormhole for this pair
                chunk.wormholes.push(pairData.remoteWormhole);
                
                // Remove from pending since we've placed it
                this.pendingWormholePairs.delete(wormholeId);
                
                // Debug logging can be enabled for development
                // console.log(`Placed beta wormhole ${wormholeId} (${pairData.remoteWormhole.designation}) at chunk (${chunkX}, ${chunkY})`);
            }
        }
        
        // Also check discovered wormholes to see if any alpha wormholes point to this chunk
        // This handles the case where wormholes were discovered in previous sessions
        
        // CRITICAL FIX: Create a comprehensive set of unique wormhole IDs that need beta wormholes in this chunk
        const requiredBetaWormholes = new Map<string, { wormholeId: string, alphaX: number, alphaY: number, betaX: number, betaY: number }>();
        
        for (const [objId, discoveryData] of this.discoveredObjects) {
            if (objId.startsWith('wormhole_') && discoveryData.wormholeId && discoveryData.designation === 'alpha') {
                // Extract alpha wormhole position from the object ID
                const parts = objId.split('_');
                if (parts.length >= 4) {
                    const alphaX = parseInt(parts[1]);
                    const alphaY = parseInt(parts[2]);
                    
                    // Generate the alpha wormhole deterministically to get its twin coordinates
                    // This recreates the same logic as when it was originally generated
                    const alphaChunkX = Math.floor(alphaX / this.chunkSize);
                    const alphaChunkY = Math.floor(alphaY / this.chunkSize);
                    const wormholeId = discoveryData.wormholeId;
                    
                    // Generate the same alpha wormhole to get its pair location
                    const wormholeSeed = hashPosition(alphaChunkX * this.chunkSize, alphaChunkY * this.chunkSize) ^ 0x789ABCDE;
                    const wormholeRng = new SeededRandom(wormholeSeed);
                    const pairLocation = this.generateWormholePairLocation(alphaChunkX, alphaChunkY, wormholeRng);
                    
                    // Check if the beta should be in this chunk
                    const betaChunkX = Math.floor(pairLocation.x / this.chunkSize);
                    const betaChunkY = Math.floor(pairLocation.y / this.chunkSize);
                    
                    if (betaChunkX === chunkX && betaChunkY === chunkY) {
                        // CRITICAL FIX: Only add to the map if we haven't seen this wormhole ID yet
                        if (!requiredBetaWormholes.has(wormholeId)) {
                            requiredBetaWormholes.set(wormholeId, {
                                wormholeId,
                                alphaX,
                                alphaY,
                                betaX: pairLocation.x,
                                betaY: pairLocation.y
                            });
                        }
                    }
                }
            }
        }
        
        // CRITICAL FIX: Now create exactly one beta wormhole for each unique wormhole ID
        for (const [wormholeId, betaData] of requiredBetaWormholes) {
            // Check if beta wormhole already exists in chunk
            const betaAlreadyExists = chunk.wormholes.some(w => 
                (w.wormholeId === wormholeId && w.designation === 'beta') ||
                (Math.floor(w.x) === Math.floor(betaData.betaX) && Math.floor(w.y) === Math.floor(betaData.betaY) && w.designation === 'beta')
            );
            
            if (!betaAlreadyExists) {
                // Create the beta wormhole
                const betaRng = new SeededRandom(hashPosition(betaData.betaX, betaData.betaY));
                const betaWormhole = new Wormhole(
                    betaData.betaX,
                    betaData.betaY,
                    wormholeId,
                    'beta',
                    betaData.alphaX,
                    betaData.alphaY,
                    betaRng
                );
                
                chunk.wormholes.push(betaWormhole);
            }
        }
    }
    
    private generateWormholeId(chunkX: number, chunkY: number, rng: SeededRandom): string {
        // Generate unique but predictable wormhole ID
        const baseId = Math.abs(hashPosition(chunkX, chunkY)) % 9999;
        return `WH-${baseId.toString().padStart(4, '0')}`;
    }
    
    private generateWormholePairLocation(chunkX: number, chunkY: number, rng: SeededRandom): { x: number, y: number } {
        // Generate distant but deterministic pair location
        // Ensure pairs are separated by truly cosmic distances for meaningful travel shortcuts
        const minDistance = this.chunkSize * 100; // At least 100 chunks away (100,000px = 2+ minutes travel)
        const maxDistance = this.chunkSize * 500; // At most 500 chunks away (500,000px = 10+ minutes travel)
        
        const angle = rng.nextFloat(0, Math.PI * 2);
        const distance = rng.nextFloat(minDistance, maxDistance);
        
        const originX = (chunkX + 0.5) * this.chunkSize;
        const originY = (chunkY + 0.5) * this.chunkSize;
        
        const pairX = originX + Math.cos(angle) * distance;
        const pairY = originY + Math.sin(angle) * distance;
        
        return { x: pairX, y: pairY };
    }
    
    // Store for managing wormhole pairs across chunks
    private pendingWormholePairs = new Map<string, {
        localWormhole: Wormhole,
        remoteWormhole: Wormhole,
        remoteChunkX: number,
        remoteChunkY: number
    }>();

    // Generate black holes for a chunk - ultra-rare cosmic phenomena
    generateBlackHolesForChunk(chunkX: number, chunkY: number, chunk: Chunk): void {
        // First, check for debug black holes in this chunk
        if (this.debugObjects) {
            for (const debugObj of this.debugObjects) {
                if (debugObj.type === 'blackhole') {
                    const objChunkCoords = this.getChunkCoords(debugObj.x, debugObj.y);
                    if (objChunkCoords.x === chunkX && objChunkCoords.y === chunkY) {
                        chunk.blackholes.push(debugObj.object as BlackHole);
                        // Continue to check for natural black holes too
                    }
                }
            }
        }
        
        // Use separate seed for black hole generation to avoid correlation with other objects
        const blackHoleSeed = hashPosition(chunkX * this.chunkSize, chunkY * this.chunkSize) ^ 0xABCDEF01;
        const blackHoleRng = new SeededRandom(blackHoleSeed);
        
        // Get region-modified spawn rates for this chunk
        const regionSpawnRates = this.getRegionModifiedSpawnRates(chunkX, chunkY);
        
        // Ultra-rare chance for black holes
        const blackHoleChance = regionSpawnRates.blackHoles;
        
        if (blackHoleRng.next() > blackHoleChance) {
            return; // No black hole in this chunk
        }
        
        console.log(`🕳️ Generating ultra-rare BLACK HOLE in chunk (${chunkX}, ${chunkY})!`);
        
        // Position black hole in chunk center for maximum isolation
        // Black holes need significant space due to their massive gravitational influence
        const centerX = chunkX * this.chunkSize + (this.chunkSize / 2);
        const centerY = chunkY * this.chunkSize + (this.chunkSize / 2);
        
        // Check for conflicts with existing celestial objects
        let hasConflict = false;
        const minDistance = GameConfig.world.specialObjects.blackHoles.minDistance;
        
        // Check celestial stars in this chunk
        for (const star of chunk.celestialStars) {
            const distance = Math.sqrt(Math.pow(star.x - centerX, 2) + Math.pow(star.y - centerY, 2));
            if (distance < minDistance) {
                hasConflict = true;
                break;
            }
        }
        
        // Check neighboring chunks for conflicts (black holes dominate large areas)
        if (!hasConflict) {
            const checkRadius = 3; // Check 3x3 grid of chunks around this one
            for (let dx = -checkRadius; dx <= checkRadius; dx++) {
                for (let dy = -checkRadius; dy <= checkRadius; dy++) {
                    const neighborChunkX = chunkX + dx;
                    const neighborChunkY = chunkY + dy;
                    const neighborKey = this.getChunkKey(neighborChunkX, neighborChunkY);
                    
                    if (this.activeChunks.has(neighborKey)) {
                        const neighborChunk = this.activeChunks.get(neighborKey)!;
                        
                        // Check for celestial stars in neighbor chunks
                        for (const star of neighborChunk.celestialStars) {
                            const distance = Math.sqrt(Math.pow(star.x - centerX, 2) + Math.pow(star.y - centerY, 2));
                            if (distance < minDistance) {
                                hasConflict = true;
                                break;
                            }
                        }
                        
                        // Check for other black holes in neighbor chunks
                        for (const blackHole of neighborChunk.blackholes) {
                            const distance = Math.sqrt(Math.pow(blackHole.x - centerX, 2) + Math.pow(blackHole.y - centerY, 2));
                            if (distance < minDistance * 2) { // Black holes need even more space from each other
                                hasConflict = true;
                                break;
                            }
                        }
                        
                        if (hasConflict) break;
                    }
                }
                if (hasConflict) break;
            }
        }
        
        if (hasConflict) {
            console.log(`🕳️ Black hole generation cancelled due to proximity to existing objects in chunk (${chunkX}, ${chunkY})`);
            return;
        }
        
        // Generate the black hole - most are stellar mass, very few supermassive
        const blackHole = generateBlackHole(centerX, centerY, blackHoleRng);
        
        // Add the black hole to this chunk
        chunk.blackholes.push(blackHole);
        
        console.log(`🕳️ BLACK HOLE generated successfully at (${centerX.toFixed(0)}, ${centerY.toFixed(0)}) - Type: ${blackHole.blackHoleTypeName}`);
    }

    // Generate rogue planets for a chunk - wandering worlds between stars
    generateRoguePlanetsForChunk(chunkX: number, chunkY: number, chunk: Chunk): void {
        // First, check for debug rogue planets in this chunk
        if (this.debugObjects) {
            for (const debugObj of this.debugObjects) {
                if (debugObj.type === 'rogue-planet' && debugObj.object instanceof RoguePlanet) {
                    const objChunkCoords = this.getChunkCoords(debugObj.x, debugObj.y);
                    if (objChunkCoords.x === chunkX && objChunkCoords.y === chunkY) {
                        // Check if this debug object is already in the chunk to avoid duplicates
                        const alreadyExists = chunk.roguePlanets.some(existingPlanet => 
                            existingPlanet.x === debugObj.object.x && existingPlanet.y === debugObj.object.y
                        );
                        if (!alreadyExists) {
                            chunk.roguePlanets.push(debugObj.object);
                        }
                        // Continue to check for natural rogue planets too
                    }
                }
            }
        }

        // Use separate seed for rogue planet generation
        const roguePlanetSeed = hashPosition(chunkX * this.chunkSize, chunkY * this.chunkSize) ^ 0x12DE34AF;
        const roguePlanetRng = new SeededRandom(roguePlanetSeed);

        // Rogue planets are region-exclusive: only spawn in The Void (0.5% rate)
        // Check if we're in a region that supports rogue planets
        const regionInfo = this.getChunkRegion(chunkX, chunkY);
        let spawnChance = 0.0; // Default: no rogue planets in most regions
        
        if (regionInfo && regionInfo.regionType === 'void') {
            // The Void region - lonely rogue worlds drifting in sparse space
            spawnChance = 0.005; // 0.5% chance per chunk (as per design document)
        }
        
        if (spawnChance === 0.0 || roguePlanetRng.next() > spawnChance) {
            return; // No rogue planet in this chunk
        }

        // Determine variant based on probabilities
        const variantRoll = roguePlanetRng.next();
        let variant: 'ice' | 'rock' | 'volcanic';
        
        if (variantRoll < 0.5) {
            variant = 'ice'; // 50% - most common in cold space
        } else if (variantRoll < 0.8) {
            variant = 'rock'; // 30% - rocky worlds
        } else {
            variant = 'volcanic'; // 20% - rare volcanic activity from internal heat
        }

        // Position rogue planet randomly in chunk with some margin
        const margin = 50;
        const x = chunkX * this.chunkSize + roguePlanetRng.nextFloat(margin, this.chunkSize - margin);
        const y = chunkY * this.chunkSize + roguePlanetRng.nextFloat(margin, this.chunkSize - margin);

        // Create the rogue planet
        const roguePlanet = new RoguePlanet(x, y, variant);

        // Add to chunk
        chunk.roguePlanets.push(roguePlanet);
    }

    // Generate dark nebulae for a chunk - dust clouds that obscure background stars
    generateDarkNebulaeForChunk(chunkX: number, chunkY: number, chunk: Chunk): void {
        // First, check for debug dark nebulae in this chunk
        if (this.debugObjects) {
            for (const debugObj of this.debugObjects) {
                if (debugObj.type === 'dark-nebula' && debugObj.object instanceof DarkNebula) {
                    const objChunkCoords = this.getChunkCoords(debugObj.x, debugObj.y);
                    if (objChunkCoords.x === chunkX && objChunkCoords.y === chunkY) {
                        chunk.darkNebulae.push(debugObj.object);
                        // Continue to check for natural dark nebulae too
                    }
                }
            }
        }

        // Use separate seed for dark nebula generation
        const darkNebulaSeed = hashPosition(chunkX * this.chunkSize, chunkY * this.chunkSize) ^ 0x13FE45BD;
        const darkNebulaRng = new SeededRandom(darkNebulaSeed);

        // Dark nebulae are region-exclusive: only spawn in The Void (0.8% rate)
        // Check if we're in a region that supports dark nebulae
        const regionInfo = this.getChunkRegion(chunkX, chunkY);
        let spawnChance = 0.0; // Default: no dark nebulae in most regions
        
        if (regionInfo && regionInfo.regionType === 'void') {
            // The Void region - dark dust clouds creating "dead zones" in space
            spawnChance = 0.008; // 0.8% chance per chunk (as per design document)
        }
        
        if (spawnChance === 0.0 || darkNebulaRng.next() > spawnChance) {
            return; // No dark nebula in this chunk
        }

        // Determine variant based on probabilities
        const variantRoll = darkNebulaRng.next();
        let variant: 'dense-core' | 'wispy' | 'globular';
        
        if (variantRoll < 0.4) {
            variant = 'dense-core'; // 40% - complete star occlusion
        } else if (variantRoll < 0.9) {
            variant = 'wispy'; // 50% - partial occlusion with irregular edges
        } else {
            variant = 'globular'; // 10% - nearly perfect circular shape
        }

        // Position dark nebula randomly in chunk with some margin
        const margin = 100; // Larger margin due to nebula size
        const x = chunkX * this.chunkSize + darkNebulaRng.nextFloat(margin, this.chunkSize - margin);
        const y = chunkY * this.chunkSize + darkNebulaRng.nextFloat(margin, this.chunkSize - margin);

        // Create the dark nebula
        const darkNebula = new DarkNebula(x, y, variant);

        // Add to chunk
        chunk.darkNebulae.push(darkNebula);
    }

    // Generate crystal gardens for a chunk - sparkling crystal formations that refract starlight
    generateCrystalGardensForChunk(chunkX: number, chunkY: number, chunk: Chunk): void {
        // First, check for debug crystal gardens in this chunk
        if (this.debugObjects) {
            for (const debugObj of this.debugObjects) {
                if (debugObj.type === 'crystal-garden' && debugObj.object instanceof CrystalGarden) {
                    const objChunkCoords = this.getChunkCoords(debugObj.x, debugObj.y);
                    if (objChunkCoords.x === chunkX && objChunkCoords.y === chunkY) {
                        chunk.crystalGardens.push(debugObj.object);
                        // Continue to check for natural crystal gardens too
                    }
                }
            }
        }

        // Get region info for this chunk to determine spawning
        const regionGenerator = new RegionGenerator();
        const chunkWorldX = chunkX * this.chunkSize + this.chunkSize / 2;
        const chunkWorldY = chunkY * this.chunkSize + this.chunkSize / 2;
        const regionInfo = regionGenerator.getRegionAt(chunkWorldX, chunkWorldY);
        
        // Crystal gardens only spawn in ASTEROID_GRAVEYARD regions (per Phase 3 design)
        if (regionInfo.regionType !== 'asteroid_graveyard') {
            return; // Early exit - no crystal gardens in other regions
        }

        // Use separate seed for crystal garden generation
        const crystalGardenSeed = hashPosition(chunkX * this.chunkSize, chunkY * this.chunkSize) ^ 0x7CADE91F;
        const crystalGardenRng = new SeededRandom(crystalGardenSeed);

        // Phase 3 design: 1.2% spawn rate per chunk in Asteroid Graveyard regions
        const baseSpawnRate = 0.012; // 1.2%
        
        // Check if we should spawn a crystal garden in this chunk
        if (crystalGardenRng.next() > baseSpawnRate) {
            return; // No crystal garden spawns in this chunk
        }

        // Determine variant based on Phase 3 design probabilities:
        // Pure (40%), Mixed (50%), Rare Earth (10%)
        let variant: 'pure' | 'mixed' | 'rare-earth';
        const variantRoll = crystalGardenRng.next();
        if (variantRoll < 0.4) {
            variant = 'pure';
        } else if (variantRoll < 0.9) {
            variant = 'mixed';
        } else {
            variant = 'rare-earth';
        }

        // Position crystal garden randomly in chunk with margin for light effects
        const margin = 80; // Margin for light refraction effects
        const x = chunkX * this.chunkSize + crystalGardenRng.nextFloat(margin, this.chunkSize - margin);
        const y = chunkY * this.chunkSize + crystalGardenRng.nextFloat(margin, this.chunkSize - margin);

        // Create the crystal garden
        const crystalGarden = new CrystalGarden(x, y, variant);

        // Add to chunk
        chunk.crystalGardens.push(crystalGarden);
    }

    // Generate protostars for a chunk - stellar formation objects in dense star formation regions
    generateProtostarsForChunk(chunkX: number, chunkY: number, chunk: Chunk): void {
        // First, check for debug protostars in this chunk
        if (this.debugObjects) {
            for (const debugObj of this.debugObjects) {
                if (debugObj.type === 'protostar' && debugObj.object instanceof Protostar) {
                    const objChunkCoords = this.getChunkCoords(debugObj.x, debugObj.y);
                    if (objChunkCoords.x === chunkX && objChunkCoords.y === chunkY) {
                        chunk.protostars.push(debugObj.object);
                    }
                }
            }
        }

        // Get regional information for this chunk
        const regionGenerator = new RegionGenerator();
        const chunkWorldX = chunkX * this.chunkSize + this.chunkSize / 2;
        const chunkWorldY = chunkY * this.chunkSize + this.chunkSize / 2;
        const regionInfo = regionGenerator.getRegionAt(chunkWorldX, chunkWorldY);
        
        // Protostars only spawn in STAR_FORGE_CLUSTER regions (per Phase 4 design)
        if (regionInfo.regionType !== 'star_forge_cluster') {
            return; // Early exit - no protostars in other regions
        }

        // Use separate seed for protostar generation
        const protostarSeed = hashPosition(chunkX * this.chunkSize, chunkY * this.chunkSize) ^ 0x8FABE12C;
        const protostarRng = new SeededRandom(protostarSeed);

        // Phase 4 design: 0.8% spawn rate per chunk in Star-Forge Cluster regions
        const baseSpawnRate = 0.008; // 0.8%
        
        // Check if we should spawn a protostar in this chunk
        if (protostarRng.next() > baseSpawnRate) {
            return; // No protostar spawns in this chunk
        }

        // Determine variant based on Phase 4 design probabilities:
        // Class 0 (50%), Class I (40%), Class II (10%)
        let variant: 'class-0' | 'class-1' | 'class-2';
        const variantRoll = protostarRng.next();
        if (variantRoll < 0.5) {
            variant = 'class-0';
        } else if (variantRoll < 0.9) {
            variant = 'class-1';
        } else {
            variant = 'class-2';
        }

        // Position protostar randomly in chunk with margin for jets and accretion disk
        const margin = 120; // Margin for stellar jets and surrounding effects
        const x = chunkX * this.chunkSize + protostarRng.nextFloat(margin, this.chunkSize - margin);
        const y = chunkY * this.chunkSize + protostarRng.nextFloat(margin, this.chunkSize - margin);

        // Create the protostar
        const protostar = new Protostar(x, y, variant);

        // Add to chunk
        chunk.protostars.push(protostar);
    }
}
