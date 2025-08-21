// Chunk-based world management for infinite generation
// Extracted from world.ts for better modularity and maintainability

// Import dependencies
import { SeededRandom, hashPosition } from '../utils/random.js';
import { Star, Planet, Moon, PlanetTypes, StarTypes } from '../celestial/celestial.js';
import { Nebula, selectNebulaType } from '../celestial/nebulae.js';
import { AsteroidGarden, selectAsteroidGardenType } from '../celestial/asteroids.js';
import { Wormhole, generateWormholePair } from '../celestial/wormholes.js';
import { BlackHole, generateBlackHole } from '../celestial/blackholes.js';
import { Comet, selectCometType } from '../celestial/comets.js';
import { GameConfig } from '../config/gameConfig.js';

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
}

interface NebulaTypeData {
    name: string;
    type?: string;
    color?: string;
    size?: number;
}

interface GardenTypeData {
    name: string;
    density?: number;
    color?: string;
}

interface DiscoveryData {
    discovered: boolean;
    timestamp: number;
    
    // Star properties
    starTypeName?: string;
    
    // Planet properties
    planetTypeName?: string;
    
    // Nebula properties
    nebulaType?: string;
    nebulaTypeData?: NebulaTypeData;
    
    // Wormhole properties
    wormholeId?: string;
    designation?: 'alpha' | 'beta';
    
    // Garden properties
    gardenType?: string;
    gardenTypeData?: GardenTypeData;
    
    // Black hole properties
    blackHoleTypeName?: string;
    
    // Object name for display
    objectName?: string;
}

interface DiscoveredStar {
    x: number;
    y: number;
    starTypeName: string;
    timestamp: number;
}

interface DiscoveredPlanet {
    x: number | null;
    y: number | null;
    parentStarX: number;
    parentStarY: number;
    planetTypeName: string;
    planetType?: typeof PlanetTypes[keyof typeof PlanetTypes];
    planetIndex: number;
    objectName?: string;
    timestamp: number;
}

interface DiscoveredNebula {
    x: number;
    y: number;
    nebulaType: string;
    nebulaTypeData?: {
        name: string;
        colors?: string[];
    };
    objectName?: string;
    timestamp: number;
}

interface DiscoveredAsteroidGarden {
    x: number;
    y: number;
    gardenType: string;
    gardenTypeData: {
        name: string;
        colors?: string[];
    };
    objectName?: string;
    timestamp: number;
}

interface DiscoveredMoon {
    x: number;
    y: number;
    parentPlanetX: number;
    parentPlanetY: number;
    timestamp: number;
}

interface DiscoveredWormhole {
    x: number;
    y: number;
    wormholeId: string;
    designation: 'alpha' | 'beta';
    pairId: string;
    twinX: number;
    twinY: number;
    objectName?: string;
    timestamp: number;
}

interface DiscoveredBlackHole {
    x: number;
    y: number;
    blackHoleTypeName: string;
    objectName?: string;
    timestamp: number;
}

interface CompanionWeight {
    type: typeof StarTypes[keyof typeof StarTypes];
    weight: number;
}

interface DebugObject {
    type: string;
    object: Star | Planet | Moon | Nebula | AsteroidGarden | Wormhole | BlackHole;
    x: number;
    y: number;
}

export class ChunkManager {
    chunkSize: number;
    loadRadius: number;
    activeChunks: Map<string, Chunk>;
    discoveredObjects: Map<string, DiscoveryData>;
    debugObjects?: DebugObject[];

    constructor() {
        this.chunkSize = GameConfig.world.chunkSize;
        this.loadRadius = 1; // Load chunks in 3x3 grid around player
        this.activeChunks = new Map(); // Key: "x,y", Value: chunk data
        this.discoveredObjects = new Map(); // Key: "objId", Value: discovery state
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

    getObjectId(x: number, y: number, type: string, object?: Star | Planet | Moon | Nebula | AsteroidGarden | Wormhole | BlackHole): string {
        // For orbiting planets, use parent star position plus planet index for stable unique ID
        if (object && object.type === 'planet' && 'parentStar' in object && 'planetIndex' in object && object.parentStar && object.planetIndex !== undefined) {
            const starX = Math.floor(object.parentStar.x);
            const starY = Math.floor(object.parentStar.y);
            return `${type}_${starX}_${starY}_planet_${object.planetIndex}`;
        }
        
        // For orbiting moons, use parent planet position plus moon index for stable unique ID
        if (object && object.type === 'moon' && 'parentPlanet' in object && 'moonIndex' in object && object.parentPlanet && object.moonIndex !== undefined) {
            const planetX = Math.floor(object.parentPlanet.x);
            const planetY = Math.floor(object.parentPlanet.y);
            return `${type}_${planetX}_${planetY}_moon_${object.moonIndex}`;
        }
        
        // For wormholes, include designation for proper stellar map discovery parsing
        if (type === 'wormhole' && object && 'designation' in object && object.designation) {
            return `${type}_${Math.floor(x)}_${Math.floor(y)}_${object.designation}`;
        }
        
        // For regular objects, use their position
        return `${type}_${Math.floor(x)}_${Math.floor(y)}`;
    }

    generateChunk(chunkX: number, chunkY: number): Chunk {
        const chunkKey = this.getChunkKey(chunkX, chunkY);
        if (this.activeChunks.has(chunkKey)) {
            return this.activeChunks.get(chunkKey)!;
        }

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
            comets: [] // Elliptical orbital objects around stars
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
        
        const spawnThreshold = 1 - GameConfig.world.starSystem.spawnChance;
        if (starSystemRoll < spawnThreshold) {
            starSystemCount = 0; // Most chunks will be empty space
        } else {
            starSystemCount = 1; // Configured chance of having a star system
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
            this.generateCometsForStarSystem(star, starSystemRng, chunk);
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

        // Unload distant chunks to save memory
        for (const [chunkKey] of this.activeChunks) {
            if (!requiredChunks.has(chunkKey)) {
                this.activeChunks.delete(chunkKey);
            }
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
        const objects: ActiveObjects = { stars: [], planets: [], moons: [], celestialStars: [], nebulae: [], asteroidGardens: [], wormholes: [], blackholes: [], comets: [] };
        
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
        }

        return objects;
    }

    markObjectDiscovered(object: Star | Planet | Moon | Nebula | AsteroidGarden | Wormhole | BlackHole, objectName?: string): void {
        const objId = this.getObjectId(object.x, object.y, object.type, object);
        const discoveryData: DiscoveryData = {
            discovered: true,
            timestamp: Date.now()
        };
        
        // Store type information for persistent display
        if (object.type === 'star' && 'starTypeName' in object && object.starTypeName) {
            discoveryData.starTypeName = object.starTypeName;
        } else if (object.type === 'planet' && 'planetTypeName' in object && object.planetTypeName) {
            discoveryData.planetTypeName = object.planetTypeName;
        } else if (object.type === 'nebula' && 'nebulaType' in object && object.nebulaType) {
            discoveryData.nebulaType = object.nebulaType;
            if ('nebulaTypeData' in object) {
                discoveryData.nebulaTypeData = object.nebulaTypeData;
            }
        } else if (object.type === 'wormhole' && 'wormholeId' in object && 'designation' in object && object.wormholeId && object.designation) {
            discoveryData.wormholeId = object.wormholeId;
            discoveryData.designation = object.designation;
        } else if (object.type === 'blackhole' && 'blackHoleTypeName' in object && object.blackHoleTypeName) {
            discoveryData.blackHoleTypeName = object.blackHoleTypeName;
        } else if (object.type === 'asteroids' && 'gardenType' in object && object.gardenType) {
            discoveryData.gardenType = object.gardenType;
            if ('gardenTypeData' in object) {
                discoveryData.gardenTypeData = object.gardenTypeData;
            }
        }
        
        // Store the generated name if provided
        if (objectName) {
            discoveryData.objectName = objectName;
        }
        
        this.discoveredObjects.set(objId, discoveryData);
        object.discovered = true;
    }

    isObjectDiscovered(object: Star | Planet | Moon | Nebula | AsteroidGarden | Wormhole | BlackHole): boolean {
        const objId = this.getObjectId(object.x, object.y, object.type, object);
        return this.discoveredObjects.has(objId);
    }

    restoreDiscoveryState(objects: (Star | Planet | Moon | Nebula | AsteroidGarden | Wormhole | BlackHole)[]): void {
        for (const obj of objects) {
            if (this.isObjectDiscovered(obj)) {
                obj.discovered = true;
            }
        }
    }

    getDiscoveredStars(): DiscoveredStar[] {
        const discoveredStars: DiscoveredStar[] = [];
        
        // Get all discovered objects that are stars
        for (const [objId, discoveryData] of this.discoveredObjects) {
            if (objId.startsWith('star_')) {
                // Extract coordinates from object ID
                const parts = objId.split('_');
                if (parts.length >= 3) {
                    const x = parseFloat(parts[1]);
                    const y = parseFloat(parts[2]);
                    
                    // Find the star in active chunks or reconstruct minimal data
                    let starData: DiscoveredStar | null = null;
                    
                    // Check if star is in currently active chunks
                    for (const chunk of this.activeChunks.values()) {
                        for (const star of chunk.celestialStars) {
                            if (Math.floor(star.x) === Math.floor(x) && Math.floor(star.y) === Math.floor(y)) {
                                starData = {
                                    x: star.x,
                                    y: star.y,
                                    starTypeName: star.starTypeName,
                                    timestamp: discoveryData.timestamp
                                };
                                break;
                            }
                        }
                        if (starData) break;
                    }
                    
                    // If not in active chunks, use stored discovery data
                    if (!starData) {
                        // Use stored star type from discovery data, fallback to regeneration if not available
                        let starTypeName = discoveryData.starTypeName;
                        
                        if (!starTypeName) {
                            // Fallback: regenerate star type deterministically
                            const chunkX = Math.floor(x / this.chunkSize);
                            const chunkY = Math.floor(y / this.chunkSize);
                            const starSystemSeed = hashPosition(chunkX * this.chunkSize, chunkY * this.chunkSize) + 2;
                            const starSystemRng = new SeededRandom(starSystemSeed);
                            const starType = this.selectStarType(starSystemRng);
                            starTypeName = starType.name;
                        }
                        
                        starData = {
                            x: x,
                            y: y,
                            starTypeName: starTypeName!,
                            timestamp: discoveryData.timestamp
                        };
                    }
                    
                    discoveredStars.push(starData);
                }
            }
        }
        
        return discoveredStars;
    }
    
    getDiscoveredMoons(): DiscoveredMoon[] {
        const discoveredMoons: DiscoveredMoon[] = [];
        
        // Get all discovered objects that are moons
        for (const [objId, discoveryData] of this.discoveredObjects) {
            if (objId.startsWith('moon_')) {
                // Extract coordinates from object ID
                const parts = objId.split('_');
                if (parts.length >= 3) {
                    const planetX = parseFloat(parts[1]);
                    const planetY = parseFloat(parts[2]);
                    
                    // Find the moon in active chunks
                    let moonData: DiscoveredMoon | null = null;
                    
                    for (const chunk of this.activeChunks.values()) {
                        for (const moon of chunk.moons) {
                            if (moon.parentPlanet && 
                                Math.floor(moon.parentPlanet.x) === Math.floor(planetX) && 
                                Math.floor(moon.parentPlanet.y) === Math.floor(planetY)) {
                                moonData = {
                                    x: moon.x,
                                    y: moon.y,
                                    parentPlanetX: moon.parentPlanet.x,
                                    parentPlanetY: moon.parentPlanet.y,
                                    timestamp: discoveryData.timestamp
                                };
                                break;
                            }
                        }
                        if (moonData) break;
                    }
                    
                    if (moonData) {
                        discoveredMoons.push(moonData);
                    }
                }
            }
        }
        
        return discoveredMoons;
    }

    getDiscoveredPlanets(): DiscoveredPlanet[] {
        const discoveredPlanets: DiscoveredPlanet[] = [];
        
        // Get all discovered objects that are planets
        for (const [objId, discoveryData] of this.discoveredObjects) {
            if (objId.startsWith('planet_') && objId.includes('_planet_')) {
                // Parse the planet ID format: planet_{starX}_{starY}_planet_{planetIndex}
                const parts = objId.split('_');
                if (parts.length >= 5) {
                    const starX = parseFloat(parts[1]);
                    const starY = parseFloat(parts[2]);
                    const planetIndex = parseInt(parts[4]);
                    
                    // Find the planet in active chunks or reconstruct minimal data
                    let planetData: DiscoveredPlanet | null = null;
                    
                    // Check if planet is in currently active chunks
                    for (const chunk of this.activeChunks.values()) {
                        for (const star of chunk.celestialStars) {
                            if (Math.floor(star.x) === Math.floor(starX) && Math.floor(star.y) === Math.floor(starY)) {
                                // Found the parent star, look for the planet
                                if (star.planets && star.planets[planetIndex]) {
                                    const planet = star.planets[planetIndex];
                                    planetData = {
                                        x: planet.x,
                                        y: planet.y,
                                        parentStarX: star.x,
                                        parentStarY: star.y,
                                        planetTypeName: planet.planetTypeName,
                                        planetType: planet.planetType,
                                        planetIndex: planetIndex,
                                        objectName: discoveryData.objectName,
                                        timestamp: discoveryData.timestamp
                                    };
                                }
                                break;
                            }
                        }
                        if (planetData) break;
                    }
                    
                    // If not in active chunks, use stored discovery data
                    if (!planetData) {
                        // Use stored planet type from discovery data
                        let planetTypeName = discoveryData.planetTypeName;
                        let planetType = null;
                        
                        if (planetTypeName) {
                            // Find the planet type object
                            planetType = Object.values(PlanetTypes).find(type => type.name === planetTypeName);
                        }
                        
                        if (!planetTypeName || !planetType) {
                            // Fallback: regenerate planet type deterministically if needed
                            // This would require recreating the star system, but for now skip incomplete data
                            continue;
                        }
                        
                        planetData = {
                            x: null, // Position would need to be recalculated from orbital data
                            y: null,
                            parentStarX: starX,
                            parentStarY: starY,
                            planetTypeName: planetTypeName,
                            planetType: planetType,
                            planetIndex: planetIndex,
                            objectName: discoveryData.objectName,
                            timestamp: discoveryData.timestamp
                        };
                    }
                    
                    if (planetData) {
                        discoveredPlanets.push(planetData);
                    }
                }
            }
        }
        
        return discoveredPlanets;
    }

    getDiscoveredNebulae(): DiscoveredNebula[] {
        const discoveredNebulae: DiscoveredNebula[] = [];
        
        // Get all discovered objects that are nebulae  
        for (const [objId, discoveryData] of this.discoveredObjects) {
            if (objId.startsWith('nebula_')) {
                // Extract coordinates from nebula ID 
                // Format: nebula_x_y (from getObjectId)
                const parts = objId.split('_');
                if (parts.length >= 3) {
                    const nebulaX = parseInt(parts[1]);
                    const nebulaY = parseInt(parts[2]);
                    
                    // Find the nebula in active chunks or reconstruct minimal data
                    let nebulaData: DiscoveredNebula | null = null;
                    
                    // Check if nebula is in currently active chunks
                    const nebula = this.findNebulaByPosition(nebulaX, nebulaY);
                    if (nebula) {
                        nebulaData = {
                            x: nebula.x,
                            y: nebula.y,
                            nebulaType: nebula.nebulaType,
                            nebulaTypeData: nebula.nebulaTypeData,
                            objectName: discoveryData.objectName,
                            timestamp: discoveryData.timestamp
                        };
                    }
                    
                    // If not in active chunks, use stored discovery data
                    if (!nebulaData) {
                        // Use stored nebula type from discovery data, fallback to regeneration if not available
                        let nebulaType = discoveryData.nebulaType;
                        let nebulaTypeData = discoveryData.nebulaTypeData;
                        
                        if (!nebulaType) {
                            // Fallback: regenerate nebula type deterministically
                            const chunkX = Math.floor(nebulaX / this.chunkSize);
                            const chunkY = Math.floor(nebulaY / this.chunkSize);
                            const nebulaeSeed = hashPosition(chunkX * this.chunkSize, chunkY * this.chunkSize) ^ 0xABCDEF01;
                            const nebulaeRng = new SeededRandom(nebulaeSeed);
                            
                            // Regenerate nebula type using the same logic as in generateNebulaeForChunk
                            const nebulaTypes = ['emission', 'reflection', 'planetary', 'dark'];
                            nebulaType = nebulaTypes[nebulaeRng.nextInt(0, nebulaTypes.length - 1)];
                            
                            // Generate basic type data
                            nebulaTypeData = {
                                name: `${nebulaType.charAt(0).toUpperCase()}${nebulaType.slice(1)} Nebula`,
                                color: this.getBasicNebulaColors(nebulaType)?.[0] || '#ff00ff'
                            };
                        }
                        
                        nebulaData = {
                            x: nebulaX,
                            y: nebulaY,
                            nebulaType: nebulaType!,
                            nebulaTypeData: nebulaTypeData,
                            objectName: discoveryData.objectName,
                            timestamp: discoveryData.timestamp
                        };
                    }
                    
                    if (nebulaData) {
                        discoveredNebulae.push(nebulaData);
                    }
                }
            }
        }
        
        // Sort by discovery time (most recent first)
        discoveredNebulae.sort((a, b) => b.timestamp - a.timestamp);
        return discoveredNebulae;
    }

    getDiscoveredWormholes(): DiscoveredWormhole[] {
        const discoveredWormholes: DiscoveredWormhole[] = [];
        
        // Get all discovered objects that are wormholes
        for (const [objId, discoveryData] of this.discoveredObjects) {
            if (objId.startsWith('wormhole_')) {
                // Extract coordinates and designation from wormhole ID
                // Format: wormhole_x_y_designation (from getObjectId)
                const parts = objId.split('_');
                if (parts.length >= 4) {
                    const wormholeX = parseInt(parts[1]);
                    const wormholeY = parseInt(parts[2]);
                    const designation = parts[3] as 'alpha' | 'beta';
                    
                    // Try to find wormhole in active chunks first
                    const wormhole = this.findWormholeByPosition(wormholeX, wormholeY, designation);
                    
                    if (wormhole) {
                        // Use live wormhole data if available
                        const wormholeData: DiscoveredWormhole = {
                            x: wormhole.x,
                            y: wormhole.y,
                            wormholeId: wormhole.wormholeId,
                            designation: wormhole.designation,
                            pairId: wormhole.pairId,
                            twinX: wormhole.twinX,
                            twinY: wormhole.twinY,
                            objectName: discoveryData.objectName,
                            timestamp: discoveryData.timestamp
                        };
                        
                        discoveredWormholes.push(wormholeData);
                    } else if (discoveryData.wormholeId && discoveryData.designation) {
                        // Wormhole chunk not loaded - reconstruct from discovery data
                        const wormholeData: DiscoveredWormhole = {
                            x: wormholeX,
                            y: wormholeY,
                            wormholeId: discoveryData.wormholeId,
                            designation: designation,
                            pairId: `${discoveryData.wormholeId}-${designation === 'alpha' ? 'α' : 'β'}`,
                            twinX: 0, // Will be updated if twin is found
                            twinY: 0, // Will be updated if twin is found
                            objectName: discoveryData.objectName,
                            timestamp: discoveryData.timestamp
                        };
                        
                        // Try to find twin coordinates from discovery data
                        for (const [twinObjId, twinData] of this.discoveredObjects) {
                            if (twinObjId.startsWith('wormhole_') && twinData.wormholeId === discoveryData.wormholeId && twinData.designation !== designation) {
                                const twinParts = twinObjId.split('_');
                                if (twinParts.length >= 4) {
                                    wormholeData.twinX = parseInt(twinParts[1]);
                                    wormholeData.twinY = parseInt(twinParts[2]);
                                    break;
                                }
                            }
                        }
                        
                        discoveredWormholes.push(wormholeData);
                    }
                }
            }
        }
        
        // Sort by discovery time (most recent first)
        discoveredWormholes.sort((a, b) => b.timestamp - a.timestamp);
        return discoveredWormholes;
    }

    getDiscoveredAsteroidGardens(): DiscoveredAsteroidGarden[] {
        const discoveredAsteroidGardens: DiscoveredAsteroidGarden[] = [];
        
        // Get all discovered objects that are asteroid gardens  
        for (const [objId, discoveryData] of this.discoveredObjects) {
            if (objId.startsWith('asteroids_') && discoveryData.gardenType) {
                // Extract coordinates from asteroid garden ID 
                // Format: asteroids_x_y (from getObjectId)
                const parts = objId.split('_');
                if (parts.length >= 3) {
                    const gardenX = parseInt(parts[1]);
                    const gardenY = parseInt(parts[2]);
                    const garden = this.findAsteroidGardenByPosition(gardenX, gardenY);
                
                    if (garden) {
                        const gardenData: DiscoveredAsteroidGarden = {
                            x: garden.x,
                            y: garden.y,
                            gardenType: garden.gardenType,
                            gardenTypeData: garden.gardenTypeData,
                            objectName: discoveryData.objectName,
                            timestamp: discoveryData.timestamp
                        };
                        
                        discoveredAsteroidGardens.push(gardenData);
                    } else {
                        // Fallback for asteroid gardens in inactive chunks 
                        // Use stored discovery data with basic color scheme
                        const fallbackGardenData: DiscoveredAsteroidGarden = {
                            x: gardenX,
                            y: gardenY,
                            gardenType: discoveryData.gardenType!,
                            gardenTypeData: discoveryData.gardenTypeData || {
                                name: discoveryData.gardenType! + ' Asteroid Garden',
                                colors: this.getBasicGardenColors(discoveryData.gardenType!)
                            },
                            objectName: discoveryData.objectName,
                            timestamp: discoveryData.timestamp
                        };
                        
                        discoveredAsteroidGardens.push(fallbackGardenData);
                        // Using fallback data for asteroid garden in inactive chunk (normal behavior)
                    }
                }
            }
        }
        
        // Sort by discovery time (most recent first)
        discoveredAsteroidGardens.sort((a, b) => b.timestamp - a.timestamp);
        return discoveredAsteroidGardens;
    }

    getDiscoveredBlackHoles(): DiscoveredBlackHole[] {
        const discoveredBlackHoles: DiscoveredBlackHole[] = [];
        
        // Get all discovered objects that are black holes
        for (const [objId, discoveryData] of this.discoveredObjects) {
            if (objId.startsWith('blackhole_')) {
                // Extract coordinates from black hole ID
                // Format: blackhole_x_y (from getObjectId)
                const parts = objId.split('_');
                if (parts.length >= 3) {
                    const blackHoleX = parseInt(parts[1]);
                    const blackHoleY = parseInt(parts[2]);
                    
                    // Try to find black hole in active chunks first
                    const blackHole = this.findBlackHoleByPosition(blackHoleX, blackHoleY);
                    
                    if (blackHole) {
                        // Use live black hole data if available
                        const blackHoleData: DiscoveredBlackHole = {
                            x: blackHole.x,
                            y: blackHole.y,
                            blackHoleTypeName: blackHole.blackHoleTypeName,
                            objectName: discoveryData.objectName,
                            timestamp: discoveryData.timestamp
                        };
                        
                        discoveredBlackHoles.push(blackHoleData);
                    } else if (discoveryData.blackHoleTypeName) {
                        // Black hole chunk not loaded - reconstruct from discovery data
                        const blackHoleData: DiscoveredBlackHole = {
                            x: blackHoleX,
                            y: blackHoleY,
                            blackHoleTypeName: discoveryData.blackHoleTypeName,
                            objectName: discoveryData.objectName,
                            timestamp: discoveryData.timestamp
                        };
                        
                        discoveredBlackHoles.push(blackHoleData);
                    }
                }
            }
        }
        
        // Sort by discovery time (most recent first)
        discoveredBlackHoles.sort((a, b) => b.timestamp - a.timestamp);
        return discoveredBlackHoles;
    }

    // Helper method to find a nebula by its position in active chunks  
    private findNebulaByPosition(x: number, y: number): Nebula | null {
        for (const chunk of this.activeChunks.values()) {
            for (const nebula of chunk.nebulae) {
                // Check if nebula position matches (using floor to match getObjectId)
                if (Math.floor(nebula.x) === x && Math.floor(nebula.y) === y) {
                    return nebula;
                }
            }
        }
        return null;
    }

    // Helper method to find a wormhole by its position and designation in active chunks
    private findWormholeByPosition(x: number, y: number, designation: 'alpha' | 'beta'): Wormhole | null {
        for (const chunk of this.activeChunks.values()) {
            for (const wormhole of chunk.wormholes) {
                // Check if wormhole position and designation match (using floor to match getObjectId)
                if (Math.floor(wormhole.x) === x && Math.floor(wormhole.y) === y && wormhole.designation === designation) {
                    return wormhole;
                }
            }
        }
        return null;
    }

    // Helper method to find an asteroid garden by its position in active chunks
    private findAsteroidGardenByPosition(x: number, y: number): AsteroidGarden | null {
        for (const chunk of this.activeChunks.values()) {
            for (const garden of chunk.asteroidGardens) {
                // Check if asteroid garden position matches (using floor to match getObjectId)
                if (Math.floor(garden.x) === x && Math.floor(garden.y) === y) {
                    return garden;
                }
            }
        }
        return null;
    }

    // Helper method to find a black hole by its position in active chunks
    private findBlackHoleByPosition(x: number, y: number): BlackHole | null {
        for (const chunk of this.activeChunks.values()) {
            for (const blackHole of chunk.blackholes) {
                // Check if black hole position matches (using floor to match getObjectId)
                if (Math.floor(blackHole.x) === x && Math.floor(blackHole.y) === y) {
                    return blackHole;
                }
            }
        }
        return null;
    }

    // Helper method to get basic colors for asteroid garden types (fallback when chunk not active)
    private getBasicGardenColors(gardenType: string): string[] {
        const basicColors: Record<string, string[]> = {
            metallic: ['#8c8c8c', '#a0a0a0', '#7a7a7a'],
            crystalline: ['#e8e8ff', '#d0d0ff', '#c0c0ff'],
            icy: ['#e0f0ff', '#c0e0ff', '#a0d0ff'],
            rare_minerals: ['#ffd700', '#ffcc00', '#ffaa00'],
            volcanic: ['#cc4400', '#aa3300', '#882200'],
            organic: ['#6b4423', '#8b5a3c', '#5a3a1a']
        };
        return basicColors[gardenType] || ['#888888', '#999999', '#777777'];
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
    generateCometsForStarSystem(star: Star, rng: SeededRandom, chunk: Chunk): void {
        const config = GameConfig.world.specialObjects.comets;
        
        // Check if this star system should have comets (20% chance)
        if (rng.nextFloat(0, 1) >= config.spawnChance) {
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
        
        const spawnThreshold = GameConfig.world.specialObjects.nebulae.spawnChance;
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
        
        const asteroidSpawnThreshold = GameConfig.world.specialObjects.asteroidGardens.spawnChance;
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
        
        if (wormholeRoll >= GameConfig.world.specialObjects.wormholes.spawnChance) {
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
        
        // Ultra-rare chance for black holes
        const blackHoleChance = GameConfig.world.specialObjects.blackHoles.spawnChance;
        
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

    // Clear all chunks and discovered objects (for universe reset)
    clearAllChunks(): void {
        this.activeChunks.clear();
        this.discoveredObjects.clear();
        console.log('🌌 All chunks cleared for universe regeneration');
    }
    
    // Helper method to get basic nebula colors for fallback reconstruction
    private getBasicNebulaColors(nebulaType: string): string[] {
        const colorSchemes: Record<string, string[]> = {
            'emission': ['#ff6b6b', '#ff8e53', '#ff6b9d'],
            'reflection': ['#4ecdc4', '#45b7d1', '#96ceb4'],
            'planetary': ['#a8e6cf', '#7fcdcd', '#81ecec'],
            'dark': ['#2c3e50', '#34495e', '#4a6741']
        };
        
        return colorSchemes[nebulaType] || colorSchemes['emission'];
    }
}

// Export interfaces for use by other modules
export type { ChunkCoords, BackgroundStar, Chunk, ActiveObjects, DiscoveryData, DiscoveredStar, DiscoveredPlanet, DiscoveredNebula, DiscoveredAsteroidGarden, DiscoveredMoon, DiscoveredWormhole, DiscoveredBlackHole };