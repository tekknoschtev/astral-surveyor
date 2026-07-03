// DiscoveryRegistry - persistent record of what the player has discovered
// Extracted from ChunkManager so discovery state is independent of chunk
// generation. Discovery data survives chunk unloading: when an object's chunk
// is active we report live data, otherwise we reconstruct from stored data.

import { SeededRandom, hashPosition } from '../utils/random.js';
import { Star, Planet, Moon, PlanetTypes } from '../celestial/celestial.js';
import { Nebula } from '../celestial/nebulae.js';
import { AsteroidGarden } from '../celestial/asteroids.js';
import { Wormhole } from '../celestial/wormholes.js';
import { BlackHole } from '../celestial/blackholes.js';
import type { Chunk } from './ChunkManager.js';

// Minimal view of the chunk system the registry needs for live-object lookups
export interface ChunkSource {
    chunkSize: number;
    activeChunks: Map<string, Chunk>;
    selectStarType(rng: SeededRandom): { name: string };
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

    // Comet properties
    cometTypeName?: string;

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

interface DiscoveredComet {
    x: number;
    y: number;
    parentStarX: number;
    parentStarY: number;
    cometTypeName: string;
    cometType?: {
        name: string;
        tailColors?: string[];
        nucleusColor?: string;
    };
    orbit?: {
        semiMajorAxis: number;
        eccentricity: number;
        perihelionDistance: number;
        aphelionDistance: number;
        argumentOfPerihelion: number;
    };
    objectName?: string;
    timestamp: number;
}

interface DiscoveredRoguePlanet {
    x: number;
    y: number;
    variant: 'ice' | 'rock' | 'volcanic';
    objectName?: string;
    timestamp: number;
    type: 'rogue-planet';
    radius: number;
}

interface DiscoveredDarkNebula {
    x: number;
    y: number;
    variant: 'dense-core' | 'wispy' | 'globular';
    objectName?: string;
    timestamp: number;
    type: 'dark-nebula';
    radius: number;
}

interface DiscoveredCrystalGarden {
    name: string;
    type: 'crystal-garden';
    x: number;
    y: number;
    variant: 'pure' | 'mixed' | 'rare-earth';
    radius: number;
    primaryColor: string;
    crystalCount: number;
    discoveryTimestamp: number;
}

interface DiscoveredProtostar {
    name: string;
    type: 'protostar';
    x: number;
    y: number;
    variant: 'class-0' | 'class-1' | 'class-2';
    radius: number;
    stellarClassification: string;
    coreColor: string;
    coreTemperature: number;
    discoveryTimestamp: number;
}

interface DiscoveredRegion {
    regionType: string;
    regionName: string;
    discoveryX: number;  // Location where player first discovered this region
    discoveryY: number;
    influence: number;   // Influence at discovery location
    timestamp: number;
}

export class DiscoveryRegistry {
    discoveredObjects: Map<string, DiscoveryData>;
    discoveredRegions: Map<string, DiscoveredRegion>;
    private chunks: ChunkSource;

    constructor(chunks: ChunkSource) {
        this.chunks = chunks;
        this.discoveredObjects = new Map(); // Key: "objId", Value: discovery state
        this.discoveredRegions = new Map(); // Key: "regionType", Value: discovery data
    }

    getObjectId(x: number, y: number, type: string, object?: Star | Planet | Moon | Nebula | AsteroidGarden | Wormhole | BlackHole | any): string {
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

        // For comets, include comet index for proper identification
        if (type === 'comet' && object && 'cometIndex' in object && object.cometIndex !== undefined) {
            return `${type}_${Math.floor(x)}_${Math.floor(y)}_${object.cometIndex}`;
        }

        // For regular objects, use their position
        return `${type}_${Math.floor(x)}_${Math.floor(y)}`;
    }

    markObjectDiscovered(object: Star | Planet | Moon | Nebula | AsteroidGarden | Wormhole | BlackHole | any, objectName?: string): void {
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
        } else if (object.type === 'comet' && 'cometType' in object && object.cometType && object.cometType.name) {
            discoveryData.cometTypeName = object.cometType.name;
        }

        // Store the generated name if provided
        if (objectName) {
            discoveryData.objectName = objectName;
        }

        this.discoveredObjects.set(objId, discoveryData);
        object.discovered = true;
    }

    isObjectDiscovered(object: Star | Planet | Moon | Nebula | AsteroidGarden | Wormhole | BlackHole | any): boolean {
        const objId = this.getObjectId(object.x, object.y, object.type, object);
        return this.discoveredObjects.has(objId);
    }

    restoreDiscoveryState(objects: (Star | Planet | Moon | Nebula | AsteroidGarden | Wormhole | BlackHole | any)[]): void {
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
                    for (const chunk of this.chunks.activeChunks.values()) {
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
                            const chunkX = Math.floor(x / this.chunks.chunkSize);
                            const chunkY = Math.floor(y / this.chunks.chunkSize);
                            const starSystemSeed = hashPosition(chunkX * this.chunks.chunkSize, chunkY * this.chunks.chunkSize) + 2;
                            const starSystemRng = new SeededRandom(starSystemSeed);
                            const starType = this.chunks.selectStarType(starSystemRng);
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

                    for (const chunk of this.chunks.activeChunks.values()) {
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
                    for (const chunk of this.chunks.activeChunks.values()) {
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
                        const planetTypeName = discoveryData.planetTypeName;
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
                            const chunkX = Math.floor(nebulaX / this.chunks.chunkSize);
                            const chunkY = Math.floor(nebulaY / this.chunks.chunkSize);
                            const nebulaeSeed = hashPosition(chunkX * this.chunks.chunkSize, chunkY * this.chunks.chunkSize) ^ 0xABCDEF01;
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

    getDiscoveredComets(): DiscoveredComet[] {
        const discoveredComets: DiscoveredComet[] = [];

        // Get all discovered objects that are comets
        for (const [objId, discoveryData] of this.discoveredObjects) {
            if (objId.startsWith('comet_')) {
                // Extract coordinates from comet ID
                // Format: comet_x_y_index (from getObjectId)
                const parts = objId.split('_');
                if (parts.length >= 4) {
                    const cometX = parseInt(parts[1]);
                    const cometY = parseInt(parts[2]);
                    const cometIndex = parseInt(parts[3]);

                    // Try to find comet in active chunks first
                    const comet = this.findCometByIdentifier(cometIndex, cometX, cometY);

                    if (comet) {
                        // Use live comet data if available
                        const cometData: DiscoveredComet = {
                            x: comet.x,
                            y: comet.y,
                            parentStarX: comet.parentStar.x,
                            parentStarY: comet.parentStar.y,
                            cometTypeName: comet.cometType.name,
                            cometType: {
                                name: comet.cometType.name,
                                tailColors: comet.cometType.tailColors,
                                nucleusColor: comet.cometType.nucleusColor
                            },
                            orbit: {
                                semiMajorAxis: comet.orbit.semiMajorAxis,
                                eccentricity: comet.orbit.eccentricity,
                                perihelionDistance: comet.orbit.perihelionDistance,
                                aphelionDistance: comet.orbit.aphelionDistance,
                                argumentOfPerihelion: comet.orbit.argumentOfPerihelion
                            },
                            objectName: discoveryData.objectName,
                            timestamp: discoveryData.timestamp
                        };

                        discoveredComets.push(cometData);
                    } else {
                        // Use stored discovery data if comet is not in active chunks
                        // This happens when the comet was discovered but its chunk is no longer loaded
                        const storedCometData: DiscoveredComet = {
                            x: cometX,
                            y: cometY,
                            parentStarX: 0, // Will need to reconstruct or store this
                            parentStarY: 0,
                            cometTypeName: discoveryData.cometTypeName || 'Unknown Comet',
                            objectName: discoveryData.objectName,
                            timestamp: discoveryData.timestamp
                        };

                        discoveredComets.push(storedCometData);
                    }
                }
            }
        }

        return discoveredComets;
    }

    getDiscoveredRoguePlanets(): DiscoveredRoguePlanet[] {
        const discoveredRoguePlanets: DiscoveredRoguePlanet[] = [];

        // Get all discovered objects that are rogue planets
        for (const [objId, discoveryData] of this.discoveredObjects) {
            if (objId.startsWith('rogue-planet_')) {
                // Extract coordinates from rogue planet ID
                // Format: rogue-planet_x_y (from getObjectId)
                const parts = objId.split('_');
                if (parts.length >= 3) {
                    const roguePlanetX = parseInt(parts[1]);
                    const roguePlanetY = parseInt(parts[2]);

                    // Try to find rogue planet in active chunks first
                    const roguePlanet = this.findRoguePlanetByCoordinates(roguePlanetX, roguePlanetY);

                    if (roguePlanet) {
                        // Use active rogue planet data
                        const roguePlanetData: DiscoveredRoguePlanet = {
                            x: roguePlanet.x,
                            y: roguePlanet.y,
                            variant: roguePlanet.variant,
                            objectName: discoveryData.objectName,
                            timestamp: discoveryData.timestamp,
                            type: 'rogue-planet',
                            radius: roguePlanet.radius
                        };

                        discoveredRoguePlanets.push(roguePlanetData);
                    } else {
                        // Use stored discovery data if rogue planet is not in active chunks
                        const storedRoguePlanetData: DiscoveredRoguePlanet = {
                            x: roguePlanetX,
                            y: roguePlanetY,
                            variant: (discoveryData as any).variant || 'rock', // Fallback to rock variant
                            objectName: discoveryData.objectName,
                            timestamp: discoveryData.timestamp,
                            type: 'rogue-planet',
                            radius: (discoveryData as any).radius || 13 // Fallback radius
                        };

                        discoveredRoguePlanets.push(storedRoguePlanetData);
                    }
                }
            }
        }

        return discoveredRoguePlanets;
    }

    getDiscoveredDarkNebulae(): DiscoveredDarkNebula[] {
        const discoveredDarkNebulae: DiscoveredDarkNebula[] = [];

        // Get all discovered objects that are dark nebulae
        for (const [objId, discoveryData] of this.discoveredObjects) {
            if (objId.startsWith('dark-nebula_')) {
                // Extract coordinates from dark nebula ID
                // Format: dark-nebula_x_y (from getObjectId)
                const parts = objId.split('_');
                if (parts.length >= 3) {
                    const darkNebulaX = parseInt(parts[1]);
                    const darkNebulaY = parseInt(parts[2]);

                    // Try to find dark nebula in active chunks first
                    const darkNebula = this.findDarkNebulaByCoordinates(darkNebulaX, darkNebulaY);

                    if (darkNebula) {
                        // Use active dark nebula data
                        const darkNebulaData: DiscoveredDarkNebula = {
                            x: darkNebula.x,
                            y: darkNebula.y,
                            variant: darkNebula.variant,
                            objectName: discoveryData.objectName,
                            timestamp: discoveryData.timestamp,
                            type: 'dark-nebula',
                            radius: darkNebula.radius
                        };
                        discoveredDarkNebulae.push(darkNebulaData);
                    } else {
                        // Use stored discovery data as fallback
                        const fallbackData: DiscoveredDarkNebula = {
                            x: darkNebulaX,
                            y: darkNebulaY,
                            variant: 'wispy', // Default variant
                            objectName: discoveryData.objectName,
                            timestamp: discoveryData.timestamp,
                            type: 'dark-nebula',
                            radius: 200 // Default radius
                        };
                        discoveredDarkNebulae.push(fallbackData);
                    }
                }
            }
        }

        return discoveredDarkNebulae;
    }

    getDiscoveredCrystalGardens(): DiscoveredCrystalGarden[] {
        const discoveredCrystalGardens: DiscoveredCrystalGarden[] = [];

        // Get all discovered objects that are crystal gardens
        for (const [objId, discoveryData] of this.discoveredObjects) {
            if (objId.startsWith('crystal-garden_')) {
                // Extract coordinates from crystal garden ID
                // Format: crystal-garden_x_y (from getObjectId)
                const parts = objId.split('_');
                if (parts.length >= 3) {
                    const crystalGardenX = parseInt(parts[1]);
                    const crystalGardenY = parseInt(parts[2]);

                    // Find the actual crystal garden object
                    const crystalGarden = this.findCrystalGardenByCoordinates(crystalGardenX, crystalGardenY);
                    if (crystalGarden) {
                        discoveredCrystalGardens.push({
                            name: discoveryData.objectName || 'Crystal Garden',
                            type: 'crystal-garden',
                            x: crystalGarden.x,
                            y: crystalGarden.y,
                            variant: crystalGarden.variant,
                            radius: crystalGarden.radius,
                            primaryColor: crystalGarden.primaryColor,
                            crystalCount: crystalGarden.crystalClusters ? crystalGarden.crystalClusters.length : 0,
                            discoveryTimestamp: discoveryData.timestamp
                        });
                    }
                }
            }
        }

        return discoveredCrystalGardens;
    }

    getDiscoveredProtostars(): DiscoveredProtostar[] {
        const discoveredProtostars: DiscoveredProtostar[] = [];

        // Get all discovered objects that are protostars
        for (const [objId, discoveryData] of this.discoveredObjects) {
            if (objId.startsWith('protostar_')) {
                // Extract coordinates from protostar ID
                // Format: protostar_x_y (from getObjectId)
                const parts = objId.split('_');
                if (parts.length >= 3) {
                    const protostarX = parseInt(parts[1]);
                    const protostarY = parseInt(parts[2]);

                    // Find the actual protostar object
                    const protostar = this.findProtostarByCoordinates(protostarX, protostarY);
                    if (protostar) {
                        discoveredProtostars.push({
                            name: discoveryData.objectName || 'Protostar',
                            type: 'protostar',
                            x: protostar.x,
                            y: protostar.y,
                            variant: protostar.variant,
                            radius: protostar.radius,
                            stellarClassification: protostar.stellarClassification,
                            coreColor: protostar.coreColor,
                            coreTemperature: protostar.coreTemperature,
                            discoveryTimestamp: discoveryData.timestamp
                        });
                    }
                }
            }
        }

        return discoveredProtostars;
    }

    markRegionDiscovered(regionType: string, regionName: string, discoveryX: number, discoveryY: number, influence: number): void {
        // Only mark a region as discovered once (first discovery)
        if (!this.discoveredRegions.has(regionType)) {
            const regionData: DiscoveredRegion = {
                regionType,
                regionName,
                discoveryX,
                discoveryY,
                influence,
                timestamp: Date.now()
            };

            this.discoveredRegions.set(regionType, regionData);
        }
    }

    getDiscoveredRegions(): DiscoveredRegion[] {
        return Array.from(this.discoveredRegions.values());
    }

    isRegionDiscovered(regionType: string): boolean {
        return this.discoveredRegions.has(regionType);
    }

    // Clear only discovery history (preserves regions, matching prior ChunkManager behavior)
    clearDiscoveryHistory(): void {
        this.discoveredObjects.clear();
    }

    // Helper method to find a nebula by its position in active chunks
    private findNebulaByPosition(x: number, y: number): Nebula | null {
        for (const chunk of this.chunks.activeChunks.values()) {
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
        for (const chunk of this.chunks.activeChunks.values()) {
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
        for (const chunk of this.chunks.activeChunks.values()) {
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
        for (const chunk of this.chunks.activeChunks.values()) {
            for (const blackHole of chunk.blackholes) {
                // Check if black hole position matches (using floor to match getObjectId)
                if (Math.floor(blackHole.x) === x && Math.floor(blackHole.y) === y) {
                    return blackHole;
                }
            }
        }
        return null;
    }

    // Helper method to find a comet by identifier in active chunks
    private findCometByIdentifier(cometIndex: number, originalCometX: number, originalCometY: number): any | null {
        for (const chunk of this.chunks.activeChunks.values()) {
            for (const comet of chunk.comets) {
                // Match by comet index first (most reliable identifier)
                if (comet.cometIndex === cometIndex) {
                    // Additional verification: check if this comet could have been at the original position
                    // We'll be more lenient here since comets move significantly
                    const distanceFromOriginal = Math.sqrt(
                        (comet.x - originalCometX) ** 2 + (comet.y - originalCometY) ** 2
                    );

                    // If the comet is within a reasonable orbital distance of the original position,
                    // or if the cometIndex matches (which should be unique per star system),
                    // consider it a match
                    const maxOrbitalDistance = comet.orbit?.semiMajorAxis ? comet.orbit.semiMajorAxis * 2 : 1000;

                    if (distanceFromOriginal <= maxOrbitalDistance) {
                        return comet;
                    }
                }
            }
        }
        return null;
    }

    private findRoguePlanetByCoordinates(x: number, y: number): any {
        // Search through all active chunks for a rogue planet with matching coordinates
        for (const chunk of this.chunks.activeChunks.values()) {
            for (const roguePlanet of chunk.roguePlanets) {
                if (Math.floor(roguePlanet.x) === x && Math.floor(roguePlanet.y) === y) {
                    return roguePlanet;
                }
            }
        }
        return null;
    }

    private findDarkNebulaByCoordinates(x: number, y: number): any {
        // Search through all active chunks for a dark nebula with matching coordinates
        for (const chunk of this.chunks.activeChunks.values()) {
            for (const darkNebula of chunk.darkNebulae) {
                if (Math.floor(darkNebula.x) === x && Math.floor(darkNebula.y) === y) {
                    return darkNebula;
                }
            }
        }
        return null;
    }

    private findCrystalGardenByCoordinates(x: number, y: number): any {
        // Search through all active chunks for a crystal garden with matching coordinates
        for (const chunk of this.chunks.activeChunks.values()) {
            for (const crystalGarden of chunk.crystalGardens) {
                if (Math.floor(crystalGarden.x) === x && Math.floor(crystalGarden.y) === y) {
                    return crystalGarden;
                }
            }
        }
        return null;
    }

    private findProtostarByCoordinates(x: number, y: number): any {
        // Search through all active chunks for a protostar with matching coordinates
        for (const chunk of this.chunks.activeChunks.values()) {
            for (const protostar of chunk.protostars) {
                if (Math.floor(protostar.x) === x && Math.floor(protostar.y) === y) {
                    return protostar;
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

export type {
    DiscoveryData,
    DiscoveredStar,
    DiscoveredPlanet,
    DiscoveredNebula,
    DiscoveredAsteroidGarden,
    DiscoveredMoon,
    DiscoveredWormhole,
    DiscoveredBlackHole,
    DiscoveredComet,
    DiscoveredRoguePlanet,
    DiscoveredDarkNebula,
    DiscoveredCrystalGarden,
    DiscoveredProtostar,
    DiscoveredRegion,
    NebulaTypeData,
    GardenTypeData
};
