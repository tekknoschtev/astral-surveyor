// Chunk-based world management for infinite generation
// TypeScript conversion with comprehensive type definitions

// Import dependencies
import { SeededRandom, hashPosition } from '../utils/random.js';
import { Star, Planet, Moon, PlanetTypes, StarTypes } from '../celestial/celestial.js';
import { Nebula, selectNebulaType } from '../celestial/nebulae.js';
import { AsteroidGarden, selectAsteroidGardenType } from '../celestial/asteroids.js';
import { Wormhole, generateWormholePair } from '../celestial/wormholes.js';
import { BlackHole, generateBlackHole } from '../celestial/blackholes.js';
import type { Renderer } from '../graphics/renderer.js';
import type { Camera } from '../camera/camera.js';

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

interface ParallaxLayer {
    stars: Map<string, BackgroundStar[]>;
    depth: number;
    density: number;
    brightnesRange: [number, number];
    sizeRange: [number, number];
    colors: string[];
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
}

interface DiscoveryData {
    discovered: boolean;
    timestamp: number;
    starTypeName?: string;
    planetTypeName?: string;
    nebulaType?: string;
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
    planetType: any;
    planetIndex: number;
    objectName?: string;
    timestamp: number;
}

interface DiscoveredNebula {
    x: number;
    y: number;
    nebulaType: string;
    nebulaTypeData: {
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

interface CompanionWeight {
    type: any;
    weight: number;
}

export class ChunkManager {
    chunkSize: number;
    loadRadius: number;
    activeChunks: Map<string, Chunk>;
    discoveredObjects: Map<string, DiscoveryData>;

    constructor() {
        this.chunkSize = 1000; // 1000x1000 pixel chunks
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

    getObjectId(x: number, y: number, type: string, object?: any): string {
        // For orbiting planets, use parent star position plus planet index for stable unique ID
        if (object && object.type === 'planet' && object.parentStar && object.planetIndex !== undefined) {
            const starX = Math.floor(object.parentStar.x);
            const starY = Math.floor(object.parentStar.y);
            return `${type}_${starX}_${starY}_planet_${object.planetIndex}`;
        }
        
        // For orbiting moons, use parent planet position plus moon index for stable unique ID
        if (object && object.type === 'moon' && object.parentPlanet && object.moonIndex !== undefined) {
            const planetX = Math.floor(object.parentPlanet.x);
            const planetY = Math.floor(object.parentPlanet.y);
            return `${type}_${planetX}_${planetY}_moon_${object.moonIndex}`;
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
            blackholes: [] // Ultra-rare cosmic phenomena with universe reset
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
        
        if (starSystemRoll < 0.92) {
            starSystemCount = 0; // 92% chance of empty chunk (even more space to explore with larger orbits)
        } else {
            starSystemCount = 1; // 8% chance of having a star system
        }

        for (let i = 0; i < starSystemCount; i++) {
            // Improved star system placement to eliminate vertical line patterns
            const margin = 250; // Margin for larger star systems with epic outer planet orbits
            
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
            
            // Check for binary system generation (10% chance)
            const binaryChance = starSystemRng.nextFloat(0, 1);
            const isBinary = binaryChance < 0.10; // 10% chance for binary systems
            
            // Create the primary star with the selected type
            const star = new Star(starX, starY, starType);
            star.initWithSeed(starSystemRng, starType);
            
            // Add binary companion if this is a binary system
            if (isBinary) {
                // Generate companion star properties
                const companionDistance = starSystemRng.nextFloat(150, 300); // Distance between stars
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
            
            if (planetRoll < 0.10) {
                planetCount = 0; // 10% chance - empty system
            } else if (planetRoll < 0.25) {
                planetCount = 1; // 15% chance - single planet
            } else if (planetRoll < 0.85) {
                planetCount = starSystemRng.nextInt(2, 5); // 60% chance - 2-5 planets (most common)
            } else if (planetRoll < 0.97) {
                planetCount = starSystemRng.nextInt(6, 8); // 12% chance - 6-8 planets (solar system-like)
            } else {
                planetCount = starSystemRng.nextInt(9, 12); // 3% chance - 9-12 planets (massive system)
            }
            
            for (let j = 0; j < planetCount; j++) {
                // Calculate orbital distance based on planet index and star size
                const minDistance = star.radius + 60; // Minimum safe distance from star
                
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
                
                const baseSpeed = 0.08; // radians per second (more perceptible motion)
                
                // Stronger inverse relationship with distance for more dramatic speed differences
                // Using a more pronounced power relationship to make speed differences very visible
                const distanceSpeedFactor = Math.pow(120 / orbitalDistance, 2.0); // More dramatic Kepler's law
                
                // Individual randomness for each planet (±30% variation, less random more physics-based)
                const randomSpeedFactor = planetRng.nextFloat(0.7, 1.3);
                
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
        }

        // Generate nebulae for this chunk (separate from star systems)
        this.generateNebulaeForChunk(chunkX, chunkY, chunk);
        
        // Generate asteroid gardens for this chunk
        this.generateAsteroidGardensForChunk(chunkX, chunkY, chunk);
        
        // Generate wormholes for this chunk (extremely rare)
        this.generateWormholesForChunk(chunkX, chunkY, chunk);
        
        // Generate black holes for this chunk (ultra-rare - cosmic reset points)
        this.generateBlackHolesForChunk(chunkX, chunkY, chunk);

        this.activeChunks.set(chunkKey, chunk);
        return chunk;
    }

    selectPlanetType(rng: SeededRandom, orbitalDistance: number, star: Star): any {
        // Create weighted selection based on orbital distance and star characteristics
        const minDistance = star.radius + 60;
        const relativeDistance = (orbitalDistance - minDistance) / 800; // Normalize to 0-1 range
        
        // Base probabilities based on distance from star
        let probabilities: Record<string, number> = {};
        
        if (relativeDistance < 0.2) {
            // Very close to star - hot planets more likely
            probabilities = {
                ROCKY: 0.5,
                VOLCANIC: 0.25,
                DESERT: 0.2,
                OCEAN: 0.03,
                FROZEN: 0.01,
                GAS_GIANT: 0.01,
                EXOTIC: 0.001
            };
        } else if (relativeDistance < 0.4) {
            // Close to star - temperate zone
            probabilities = {
                ROCKY: 0.35,
                OCEAN: 0.25,
                DESERT: 0.2,
                VOLCANIC: 0.1,
                GAS_GIANT: 0.05,
                FROZEN: 0.03,
                EXOTIC: 0.02
            };
        } else if (relativeDistance < 0.7) {
            // Medium distance - gas giants more common
            probabilities = {
                GAS_GIANT: 0.3,
                ROCKY: 0.25,
                OCEAN: 0.15,
                FROZEN: 0.15,
                DESERT: 0.1,
                VOLCANIC: 0.03,
                EXOTIC: 0.02
            };
        } else {
            // Far from star - frozen worlds dominate
            probabilities = {
                FROZEN: 0.4,
                GAS_GIANT: 0.25,
                ROCKY: 0.2,
                OCEAN: 0.1,
                DESERT: 0.02,
                VOLCANIC: 0.01,
                EXOTIC: 0.02
            };
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

    selectStarType(rng: SeededRandom): any {
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

    applyStarTypeModifiers(probabilities: Record<string, number>, starType: any, relativeDistance: number): Record<string, number> {
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
        const objects: ActiveObjects = { stars: [], planets: [], moons: [], celestialStars: [], nebulae: [], asteroidGardens: [], wormholes: [], blackholes: [] };
        
        for (const chunk of this.activeChunks.values()) {
            objects.stars.push(...chunk.stars);
            objects.planets.push(...chunk.planets);
            objects.moons.push(...chunk.moons);
            objects.celestialStars.push(...chunk.celestialStars);
            objects.nebulae.push(...chunk.nebulae);
            objects.asteroidGardens.push(...chunk.asteroidGardens);
            objects.wormholes.push(...chunk.wormholes);
            objects.blackholes.push(...chunk.blackholes);
        }

        return objects;
    }

    markObjectDiscovered(object: any, objectName?: string): void {
        const objId = this.getObjectId(object.x, object.y, object.type, object);
        const discoveryData: DiscoveryData = {
            discovered: true,
            timestamp: Date.now()
        };
        
        // Store type information for persistent display
        if (object.type === 'star' && object.starTypeName) {
            discoveryData.starTypeName = object.starTypeName;
        } else if (object.type === 'planet' && object.planetTypeName) {
            discoveryData.planetTypeName = object.planetTypeName;
        } else if (object.type === 'nebula' && object.nebulaType) {
            discoveryData.nebulaType = object.nebulaType;
        }
        
        // Store the generated name if provided
        if (objectName) {
            discoveryData.objectName = objectName;
        }
        
        this.discoveredObjects.set(objId, discoveryData);
        object.discovered = true;
    }

    isObjectDiscovered(object: any): boolean {
        const objId = this.getObjectId(object.x, object.y, object.type, object);
        return this.discoveredObjects.has(objId);
    }

    restoreDiscoveryState(objects: any[]): void {
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
                    const nebula = this.findNebulaByPosition(nebulaX, nebulaY);
                
                    if (nebula) {
                    const nebulaData: DiscoveredNebula = {
                        x: nebula.x,
                        y: nebula.y,
                        nebulaType: nebula.nebulaType,
                        nebulaTypeData: nebula.nebulaTypeData,
                        objectName: discoveryData.objectName,
                        timestamp: discoveryData.timestamp
                    };
                    
                    discoveredNebulae.push(nebulaData);
                    }
                }
            }
        }
        
        // Sort by discovery time (most recent first)
        discoveredNebulae.sort((a, b) => b.timestamp - a.timestamp);
        console.log(`[ChunkManager] getDiscoveredNebulae returning ${discoveredNebulae.length} nebulae`);
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
                    const wormhole = this.findWormholeByPosition(wormholeX, wormholeY, designation);
                
                    if (wormhole) {
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
                    }
                }
            }
        }
        
        // Sort by discovery time (most recent first)
        discoveredWormholes.sort((a, b) => b.timestamp - a.timestamp);
        console.log(`[ChunkManager] getDiscoveredWormholes returning ${discoveredWormholes.length} wormholes`);
        return discoveredWormholes;
    }

    // Helper method to find a nebula by its position in active chunks  
    private findNebulaByPosition(x: number, y: number): any | null {
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
    private findWormholeByPosition(x: number, y: number, designation: 'alpha' | 'beta'): any | null {
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
    
    // Score a potential star system position based on distance from existing systems
    scoreStarSystemPosition(x: number, y: number, currentChunkX: number, currentChunkY: number): number {
        const minDistance = 1200; // Minimum distance between star systems
        const preferredDistance = 1800; // Preferred distance for optimal spacing
        
        let score = 1.0; // Start with perfect score
        
        // Check neighboring chunks for existing star systems
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
                const neighborChunkX = currentChunkX + dx;
                const neighborChunkY = currentChunkY + dy;
                const chunkKey = this.getChunkKey(neighborChunkX, neighborChunkY);
                const chunk = this.activeChunks.get(chunkKey);
                
                // If chunk exists, check distances to its star systems
                if (chunk && chunk.celestialStars) {
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
            }
        }
        
        return score;
    }
    
    // Generate moons for a planet based on rarity rules
    generateMoonsForPlanet(planet: Planet, rng: SeededRandom, chunk: Chunk): void {
        // Determine moon probability based on planet type and size
        let moonChance = 0;
        let maxMoons = 0;
        
        // Gas giants have the highest chance of moons
        if (planet.planetType === PlanetTypes.GAS_GIANT) {
            moonChance = 0.6; // 60% chance
            maxMoons = 4;
        }
        // Large rocky/ocean planets can have moons
        else if ((planet.planetType === PlanetTypes.ROCKY || planet.planetType === PlanetTypes.OCEAN) && planet.radius > 15) {
            moonChance = 0.25; // 25% chance for large planets
            maxMoons = 2;
        }
        // Other planet types have low chance of moons
        else {
            moonChance = 0.10; // 10% chance
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
            const minDistance = planet.radius + 15; // Minimum safe distance from planet
            const maxDistance = planet.radius + 50; // Maximum distance (closer than planets)
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
    selectCompanionStarType(rng: SeededRandom, primaryStarType: any): any {
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
        
        if (nebulaeRoll < 0.95) {
            nebulaeCount = 0; // 95% chance of no nebulae
        } else if (nebulaeRoll < 0.98) {
            nebulaeCount = 1; // 3% chance of 1 nebula
        } else {
            nebulaeCount = nebulaeRng.nextInt(1, 2); // 2% chance of 1-2 nebulae (rare clusters)
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
        
        if (asteroidRoll < 0.85) {
            asteroidCount = 0; // 85% chance of no asteroid gardens
        } else if (asteroidRoll < 0.95) {
            asteroidCount = 1; // 10% chance of 1 asteroid garden
        } else {
            asteroidCount = asteroidRng.nextInt(1, 2); // 5% chance of 1-2 asteroid gardens (rare multiple fields)
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
        // Use separate seed for wormhole generation to avoid correlation with other objects
        const wormholeSeed = hashPosition(chunkX * this.chunkSize, chunkY * this.chunkSize) ^ 0x789ABCDE;
        const wormholeRng = new SeededRandom(wormholeSeed);
        
        // Ultra-rare probability for wormholes - creating true sense of wonder when found
        // 99.95% of chunks will have no wormholes (approximately 1 every 2000 chunks)
        const wormholeRoll = wormholeRng.nextFloat(0, 1);
        
        if (wormholeRoll >= 0.0005) {
            return; // No wormhole in this chunk (99.95% of the time)
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
        
        // Store pair information for future chunk generation
        this.pendingWormholePairs.set(wormholeId, {
            localWormhole: alphaWormhole,
            remoteWormhole: betaWormhole,
            remoteChunkX: Math.floor(pairLocation.x / this.chunkSize),
            remoteChunkY: Math.floor(pairLocation.y / this.chunkSize)
        });
    }
    
    private generateWormholeId(chunkX: number, chunkY: number, rng: SeededRandom): string {
        // Generate unique but predictable wormhole ID
        const baseId = Math.abs(hashPosition(chunkX, chunkY)) % 9999;
        return `WH-${baseId.toString().padStart(4, '0')}`;
    }
    
    private generateWormholePairLocation(chunkX: number, chunkY: number, rng: SeededRandom): { x: number, y: number } {
        // Generate distant but deterministic pair location
        // Ensure pairs are separated by significant distance (multiple chunks)
        const minDistance = this.chunkSize * 5; // At least 5 chunks away
        const maxDistance = this.chunkSize * 20; // At most 20 chunks away
        
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
        // Use separate seed for black hole generation to avoid correlation with other objects
        const blackHoleSeed = hashPosition(chunkX * this.chunkSize, chunkY * this.chunkSize) ^ 0xABCDEF01;
        const blackHoleRng = new SeededRandom(blackHoleSeed);
        
        // Ultra-rare chance: 0.0001% (1 in 1,000,000 chance)  
        // This means roughly 1 black hole every 1,000,000 chunks
        const blackHoleChance = 0.000001;
        
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
        const minDistance = 2000; // 2000px minimum distance from any major object
        
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
}

// Infinite starfield using chunk-based generation with parallax layers
export class InfiniteStarField {
    chunkManager: ChunkManager;
    parallaxLayers: ParallaxLayer[];
    lastCameraX: number;
    lastCameraY: number;

    constructor(chunkManager: ChunkManager) {
        this.chunkManager = chunkManager;
        
        // Initialize parallax layers with different depths and movement speeds
        this.parallaxLayers = [
            {
                stars: new Map(), // Key: "x,y", Value: star array for that position
                depth: 0.1,       // Very distant stars, move 10% of camera speed
                density: 0.3,     // Lower density for distant stars
                brightnesRange: [0.1, 0.3], // Dimmer distant stars
                sizeRange: [1, 1], // Small distant stars
                colors: ['#666688', '#555577', '#444466'] // Dimmer colors
            },
            {
                stars: new Map(),
                depth: 0.3,       // Mid-distance stars, move 30% of camera speed
                density: 0.5,
                brightnesRange: [0.2, 0.5],
                sizeRange: [1, 1],
                colors: ['#888899', '#7788aa', '#6677bb']
            },
            {
                stars: new Map(),
                depth: 0.6,       // Closer stars, move 60% of camera speed
                density: 0.7,
                brightnesRange: [0.3, 0.7],
                sizeRange: [1, 2],
                colors: ['#aabbcc', '#99aadd', '#88bbee']
            }
        ];
        
        // Track camera position for parallax calculations
        this.lastCameraX = 0;
        this.lastCameraY = 0;
    }

    // Generate parallax stars for a given screen region
    generateParallaxStars(layer: ParallaxLayer, regionX: number, regionY: number, regionSize: number): BackgroundStar[] {
        const regionKey = `${regionX},${regionY}`;
        
        if (layer.stars.has(regionKey)) {
            return layer.stars.get(regionKey)!;
        }
        
        // Use seeded random based on region position and layer depth
        const seed = hashPosition(regionX, regionY) ^ Math.floor(layer.depth * 1000000);
        const rng = new SeededRandom(seed);
        
        const stars: BackgroundStar[] = [];
        const starCount = Math.floor(regionSize * regionSize * layer.density / 100000); // Density per 100k pixels
        
        for (let i = 0; i < starCount; i++) {
            stars.push({
                x: regionX + rng.nextFloat(0, regionSize),
                y: regionY + rng.nextFloat(0, regionSize),
                brightness: rng.nextFloat(layer.brightnesRange[0], layer.brightnesRange[1]),
                size: rng.nextInt(layer.sizeRange[0], layer.sizeRange[1]),
                color: rng.choice(layer.colors)
            });
        }
        
        layer.stars.set(regionKey, stars);
        return stars;
    }

    render(renderer: Renderer, camera: Camera): void {
        const { canvas } = renderer;
        
        // Render parallax background layers first (back to front)
        this.renderParallaxLayers(renderer, camera);
        
        // Then render the original chunk-based stars (these are "foreground" stars)
        this.renderChunkStars(renderer, camera);
        
        // Update camera tracking
        this.lastCameraX = camera.x;
        this.lastCameraY = camera.y;
    }
    
    renderParallaxLayers(renderer: Renderer, camera: Camera): void {
        const { canvas } = renderer;
        const regionSize = 2000; // Size of each parallax region
        
        // Calculate which regions we need to cover the screen for each parallax layer
        for (const layer of this.parallaxLayers) {
            // Calculate effective camera position for this depth layer
            const effectiveCameraX = camera.x * layer.depth;
            const effectiveCameraY = camera.y * layer.depth;
            
            // Determine region bounds to cover screen
            const leftRegion = Math.floor((effectiveCameraX - canvas.width * 0.5) / regionSize) * regionSize;
            const rightRegion = Math.floor((effectiveCameraX + canvas.width * 0.5) / regionSize) * regionSize;
            const topRegion = Math.floor((effectiveCameraY - canvas.height * 0.5) / regionSize) * regionSize;
            const bottomRegion = Math.floor((effectiveCameraY + canvas.height * 0.5) / regionSize) * regionSize;
            
            // Generate and render stars for each needed region
            for (let regionX = leftRegion; regionX <= rightRegion; regionX += regionSize) {
                for (let regionY = topRegion; regionY <= bottomRegion; regionY += regionSize) {
                    const stars = this.generateParallaxStars(layer, regionX, regionY, regionSize);
                    
                    for (const star of stars) {
                        // Convert star world position to screen position using effective camera
                        const screenX = canvas.width * 0.5 + (star.x - effectiveCameraX);
                        const screenY = canvas.height * 0.5 + (star.y - effectiveCameraY);
                        
                        // Only render stars that are on screen (with margin)
                        if (screenX >= -10 && screenX <= canvas.width + 10 && 
                            screenY >= -10 && screenY <= canvas.height + 10) {
                            
                            // Calculate alpha based on brightness
                            const alpha = Math.floor(star.brightness * 255).toString(16).padStart(2, '0');
                            const colorWithAlpha = star.color + alpha;
                            
                            if (star.size > 1) {
                                renderer.drawCircle(screenX, screenY, star.size, colorWithAlpha);
                            } else {
                                renderer.drawPixel(screenX, screenY, colorWithAlpha);
                            }
                        }
                    }
                }
            }
        }
    }
    
    renderChunkStars(renderer: Renderer, camera: Camera): void {
        const { canvas } = renderer;
        const activeObjects = this.chunkManager.getAllActiveObjects();
        
        for (const star of activeObjects.stars) {
            const [screenX, screenY] = camera.worldToScreen(star.x, star.y, canvas.width, canvas.height);
            
            // Only render stars that are on screen (with some margin)
            if (screenX >= -10 && screenX <= canvas.width + 10 && 
                screenY >= -10 && screenY <= canvas.height + 10) {
                
                // Calculate alpha based on brightness
                const alpha = Math.floor(star.brightness * 255).toString(16).padStart(2, '0');
                const colorWithAlpha = star.color + alpha;
                
                if (star.size > 1) {
                    renderer.drawCircle(screenX, screenY, star.size, colorWithAlpha);
                } else {
                    renderer.drawPixel(screenX, screenY, colorWithAlpha);
                }
            }
        }
    }
}