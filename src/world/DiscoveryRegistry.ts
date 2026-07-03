// DiscoveryRegistry - persistent record of what the player has discovered
// Extracted from ChunkManager so discovery state is independent of chunk
// generation. Discovery data survives chunk unloading: when an object's chunk
// is active we report live data, otherwise we reconstruct from stored data.
//
// Each getDiscoveredX method shares one skeleton (collectDiscoveries): iterate
// the discovery map, filter by ID prefix, parse coordinates out of the ID, and
// hand off to a per-type builder that prefers live chunk data over stored data.

import { SeededRandom, hashPosition } from '../utils/random.js';
import { Star, Planet, Moon, PlanetTypes } from '../celestial/celestial.js';
import { Nebula } from '../celestial/nebulae.js';
import { AsteroidGarden } from '../celestial/asteroids.js';
import { Wormhole } from '../celestial/wormholes.js';
import { BlackHole } from '../celestial/blackholes.js';
import type { Comet } from '../celestial/comets.js';
import type { Chunk } from './ChunkManager.js';

// Minimal view of the chunk system the registry needs for live-object lookups
export interface ChunkSource {
    chunkSize: number;
    activeChunks: Map<string, Chunk>;
    selectStarType(rng: SeededRandom): { name: string };
}

// The chunk collections that hold positioned celestial objects
type ChunkObjectCollection = Exclude<keyof Chunk, 'x' | 'y' | 'stars'>;

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

    // Shared skeleton for the getDiscoveredX methods: walk the discovery map,
    // filter by ID prefix, split the ID, and let a per-type builder produce the
    // result (or null to skip the entry).
    private collectDiscoveries<T>(
        prefix: string,
        minParts: number,
        build: (parts: string[], data: DiscoveryData) => T | null,
        sortByTimestamp = false
    ): T[] {
        const results: T[] = [];
        for (const [objId, discoveryData] of this.discoveredObjects) {
            if (!objId.startsWith(prefix)) continue;
            const parts = objId.split('_');
            if (parts.length < minParts) continue;
            const item = build(parts, discoveryData);
            if (item !== null) {
                results.push(item);
            }
        }
        if (sortByTimestamp) {
            // Most recent first
            (results as Array<T & { timestamp: number }>).sort((a, b) => b.timestamp - a.timestamp);
        }
        return results;
    }

    private findInActiveChunks<K extends ChunkObjectCollection>(
        collection: K,
        predicate: (obj: Chunk[K][number]) => boolean
    ): Chunk[K][number] | null {
        for (const chunk of this.chunks.activeChunks.values()) {
            for (const obj of chunk[collection]) {
                if (predicate(obj)) {
                    return obj;
                }
            }
        }
        return null;
    }

    // Positions in object IDs are floored, so live lookups match on floored coordinates
    private findByFlooredPosition<K extends ChunkObjectCollection>(
        collection: K,
        x: number,
        y: number
    ): Chunk[K][number] | null {
        return this.findInActiveChunks(collection, obj => Math.floor(obj.x) === x && Math.floor(obj.y) === y);
    }

    getDiscoveredStars(): DiscoveredStar[] {
        return this.collectDiscoveries('star_', 3, (parts, discoveryData) => {
            const x = parseFloat(parts[1]);
            const y = parseFloat(parts[2]);

            const star = this.findByFlooredPosition('celestialStars', Math.floor(x), Math.floor(y));
            if (star) {
                return {
                    x: star.x,
                    y: star.y,
                    starTypeName: star.starTypeName,
                    timestamp: discoveryData.timestamp
                };
            }

            // Use stored star type from discovery data, fallback to regeneration if not available
            let starTypeName = discoveryData.starTypeName;
            if (!starTypeName) {
                // Fallback: regenerate star type deterministically
                const chunkX = Math.floor(x / this.chunks.chunkSize);
                const chunkY = Math.floor(y / this.chunks.chunkSize);
                const starSystemSeed = hashPosition(chunkX * this.chunks.chunkSize, chunkY * this.chunks.chunkSize) + 2;
                const starSystemRng = new SeededRandom(starSystemSeed);
                starTypeName = this.chunks.selectStarType(starSystemRng).name;
            }

            return {
                x: x,
                y: y,
                starTypeName: starTypeName,
                timestamp: discoveryData.timestamp
            };
        });
    }

    getDiscoveredMoons(): DiscoveredMoon[] {
        return this.collectDiscoveries('moon_', 3, (parts, discoveryData) => {
            const planetX = Math.floor(parseFloat(parts[1]));
            const planetY = Math.floor(parseFloat(parts[2]));

            // Moons are only reported while their chunk is loaded
            const moon = this.findInActiveChunks('moons', m =>
                !!m.parentPlanet &&
                Math.floor(m.parentPlanet.x) === planetX &&
                Math.floor(m.parentPlanet.y) === planetY);
            if (!moon || !moon.parentPlanet) return null;

            return {
                x: moon.x,
                y: moon.y,
                parentPlanetX: moon.parentPlanet.x,
                parentPlanetY: moon.parentPlanet.y,
                timestamp: discoveryData.timestamp
            };
        });
    }

    getDiscoveredPlanets(): DiscoveredPlanet[] {
        return this.collectDiscoveries('planet_', 5, (parts, discoveryData) => {
            // ID format: planet_{starX}_{starY}_planet_{planetIndex}
            if (parts[3] !== 'planet') return null;
            const starX = parseFloat(parts[1]);
            const starY = parseFloat(parts[2]);
            const planetIndex = parseInt(parts[4]);

            // Prefer live data when the parent star's chunk is loaded
            const star = this.findByFlooredPosition('celestialStars', Math.floor(starX), Math.floor(starY));
            if (star && star.planets && star.planets[planetIndex]) {
                const planet = star.planets[planetIndex];
                return {
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

            // Reconstruct from stored discovery data; skip entries without a
            // stored type (position would require recreating the star system)
            const planetTypeName = discoveryData.planetTypeName;
            const planetType = planetTypeName
                ? Object.values(PlanetTypes).find(type => type.name === planetTypeName)
                : undefined;
            if (!planetTypeName || !planetType) return null;

            return {
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
        });
    }

    getDiscoveredNebulae(): DiscoveredNebula[] {
        return this.collectDiscoveries('nebula_', 3, (parts, discoveryData) => {
            const nebulaX = parseInt(parts[1]);
            const nebulaY = parseInt(parts[2]);

            const nebula = this.findByFlooredPosition('nebulae', nebulaX, nebulaY);
            if (nebula) {
                return {
                    x: nebula.x,
                    y: nebula.y,
                    nebulaType: nebula.nebulaType,
                    nebulaTypeData: nebula.nebulaTypeData,
                    objectName: discoveryData.objectName,
                    timestamp: discoveryData.timestamp
                };
            }

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

            return {
                x: nebulaX,
                y: nebulaY,
                nebulaType: nebulaType,
                nebulaTypeData: nebulaTypeData,
                objectName: discoveryData.objectName,
                timestamp: discoveryData.timestamp
            };
        }, true);
    }

    getDiscoveredWormholes(): DiscoveredWormhole[] {
        return this.collectDiscoveries('wormhole_', 4, (parts, discoveryData) => {
            // ID format: wormhole_x_y_designation
            const wormholeX = parseInt(parts[1]);
            const wormholeY = parseInt(parts[2]);
            const designation = parts[3] as 'alpha' | 'beta';

            const wormhole = this.findInActiveChunks('wormholes', w =>
                Math.floor(w.x) === wormholeX && Math.floor(w.y) === wormholeY && w.designation === designation);
            if (wormhole) {
                return {
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
            }

            if (!discoveryData.wormholeId || !discoveryData.designation) return null;

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

            return wormholeData;
        }, true);
    }

    getDiscoveredAsteroidGardens(): DiscoveredAsteroidGarden[] {
        return this.collectDiscoveries('asteroids_', 3, (parts, discoveryData) => {
            if (!discoveryData.gardenType) return null;
            const gardenX = parseInt(parts[1]);
            const gardenY = parseInt(parts[2]);

            const garden = this.findByFlooredPosition('asteroidGardens', gardenX, gardenY);
            if (garden) {
                return {
                    x: garden.x,
                    y: garden.y,
                    gardenType: garden.gardenType,
                    gardenTypeData: garden.gardenTypeData,
                    objectName: discoveryData.objectName,
                    timestamp: discoveryData.timestamp
                };
            }

            // Fallback for asteroid gardens in inactive chunks: stored data with basic colors
            return {
                x: gardenX,
                y: gardenY,
                gardenType: discoveryData.gardenType,
                gardenTypeData: discoveryData.gardenTypeData || {
                    name: discoveryData.gardenType + ' Asteroid Garden',
                    colors: this.getBasicGardenColors(discoveryData.gardenType)
                },
                objectName: discoveryData.objectName,
                timestamp: discoveryData.timestamp
            };
        }, true);
    }

    getDiscoveredBlackHoles(): DiscoveredBlackHole[] {
        return this.collectDiscoveries('blackhole_', 3, (parts, discoveryData) => {
            const blackHoleX = parseInt(parts[1]);
            const blackHoleY = parseInt(parts[2]);

            const blackHole = this.findByFlooredPosition('blackholes', blackHoleX, blackHoleY);
            if (blackHole) {
                return {
                    x: blackHole.x,
                    y: blackHole.y,
                    blackHoleTypeName: blackHole.blackHoleTypeName,
                    objectName: discoveryData.objectName,
                    timestamp: discoveryData.timestamp
                };
            }

            if (!discoveryData.blackHoleTypeName) return null;

            // Black hole chunk not loaded - reconstruct from discovery data
            return {
                x: blackHoleX,
                y: blackHoleY,
                blackHoleTypeName: discoveryData.blackHoleTypeName,
                objectName: discoveryData.objectName,
                timestamp: discoveryData.timestamp
            };
        }, true);
    }

    getDiscoveredComets(): DiscoveredComet[] {
        return this.collectDiscoveries('comet_', 4, (parts, discoveryData) => {
            // ID format: comet_x_y_index
            const cometX = parseInt(parts[1]);
            const cometY = parseInt(parts[2]);
            const cometIndex = parseInt(parts[3]);

            const comet = this.findCometByIdentifier(cometIndex, cometX, cometY);
            if (comet) {
                return {
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
            }

            // Comet's chunk is no longer loaded - use stored discovery data
            return {
                x: cometX,
                y: cometY,
                parentStarX: 0, // Will need to reconstruct or store this
                parentStarY: 0,
                cometTypeName: discoveryData.cometTypeName || 'Unknown Comet',
                objectName: discoveryData.objectName,
                timestamp: discoveryData.timestamp
            };
        });
    }

    getDiscoveredRoguePlanets(): DiscoveredRoguePlanet[] {
        return this.collectDiscoveries('rogue-planet_', 3, (parts, discoveryData) => {
            const roguePlanetX = parseInt(parts[1]);
            const roguePlanetY = parseInt(parts[2]);

            const roguePlanet = this.findByFlooredPosition('roguePlanets', roguePlanetX, roguePlanetY);
            if (roguePlanet) {
                return {
                    x: roguePlanet.x,
                    y: roguePlanet.y,
                    variant: roguePlanet.variant,
                    objectName: discoveryData.objectName,
                    timestamp: discoveryData.timestamp,
                    type: 'rogue-planet' as const,
                    radius: roguePlanet.radius
                };
            }

            // Use stored discovery data if rogue planet is not in active chunks
            return {
                x: roguePlanetX,
                y: roguePlanetY,
                variant: (discoveryData as any).variant || 'rock', // Fallback to rock variant
                objectName: discoveryData.objectName,
                timestamp: discoveryData.timestamp,
                type: 'rogue-planet' as const,
                radius: (discoveryData as any).radius || 13 // Fallback radius
            };
        });
    }

    getDiscoveredDarkNebulae(): DiscoveredDarkNebula[] {
        return this.collectDiscoveries('dark-nebula_', 3, (parts, discoveryData) => {
            const darkNebulaX = parseInt(parts[1]);
            const darkNebulaY = parseInt(parts[2]);

            const darkNebula = this.findByFlooredPosition('darkNebulae', darkNebulaX, darkNebulaY);
            if (darkNebula) {
                return {
                    x: darkNebula.x,
                    y: darkNebula.y,
                    variant: darkNebula.variant,
                    objectName: discoveryData.objectName,
                    timestamp: discoveryData.timestamp,
                    type: 'dark-nebula' as const,
                    radius: darkNebula.radius
                };
            }

            // Use stored discovery data as fallback
            return {
                x: darkNebulaX,
                y: darkNebulaY,
                variant: 'wispy' as const, // Default variant
                objectName: discoveryData.objectName,
                timestamp: discoveryData.timestamp,
                type: 'dark-nebula' as const,
                radius: 200 // Default radius
            };
        });
    }

    getDiscoveredCrystalGardens(): DiscoveredCrystalGarden[] {
        return this.collectDiscoveries('crystal-garden_', 3, (parts, discoveryData) => {
            const crystalGardenX = parseInt(parts[1]);
            const crystalGardenY = parseInt(parts[2]);

            // Crystal gardens are only reported while their chunk is loaded
            const crystalGarden = this.findByFlooredPosition('crystalGardens', crystalGardenX, crystalGardenY);
            if (!crystalGarden) return null;

            return {
                name: discoveryData.objectName || 'Crystal Garden',
                type: 'crystal-garden' as const,
                x: crystalGarden.x,
                y: crystalGarden.y,
                variant: crystalGarden.variant,
                radius: crystalGarden.radius,
                primaryColor: crystalGarden.primaryColor,
                crystalCount: crystalGarden.crystalClusters ? crystalGarden.crystalClusters.length : 0,
                discoveryTimestamp: discoveryData.timestamp
            };
        });
    }

    getDiscoveredProtostars(): DiscoveredProtostar[] {
        return this.collectDiscoveries('protostar_', 3, (parts, discoveryData) => {
            const protostarX = parseInt(parts[1]);
            const protostarY = parseInt(parts[2]);

            // Protostars are only reported while their chunk is loaded
            const protostar = this.findByFlooredPosition('protostars', protostarX, protostarY);
            if (!protostar) return null;

            return {
                name: discoveryData.objectName || 'Protostar',
                type: 'protostar' as const,
                x: protostar.x,
                y: protostar.y,
                variant: protostar.variant,
                radius: protostar.radius,
                stellarClassification: protostar.stellarClassification,
                coreColor: protostar.coreColor,
                coreTemperature: protostar.coreTemperature,
                discoveryTimestamp: discoveryData.timestamp
            };
        });
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

    // Comets move along their orbits, so match by index and verify the comet is
    // within a plausible orbital distance of where it was discovered
    private findCometByIdentifier(cometIndex: number, originalCometX: number, originalCometY: number): Comet | null {
        return this.findInActiveChunks('comets', comet => {
            if (comet.cometIndex !== cometIndex) return false;
            const distanceFromOriginal = Math.sqrt(
                (comet.x - originalCometX) ** 2 + (comet.y - originalCometY) ** 2
            );
            const maxOrbitalDistance = comet.orbit?.semiMajorAxis ? comet.orbit.semiMajorAxis * 2 : 1000;
            return distanceFromOriginal <= maxOrbitalDistance;
        });
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
