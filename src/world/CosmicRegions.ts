/**
 * Cosmic Regions - Large-scale region types that modify celestial object spawn rates
 * 
 * Defines distinct cosmic regions to eliminate universe homogeneity and create
 * varied exploration experiences. Each region has unique characteristics and
 * spawn rate modifiers for different celestial object types.
 */

export interface RegionSpawnModifiers {
    starSystems: number;      // Multiplier for star system spawn rate
    nebulae: number;         // Multiplier for nebula spawn rate
    asteroidGardens: number; // Multiplier for asteroid garden spawn rate
    wormholes: number;       // Multiplier for wormhole spawn rate
    blackHoles: number;      // Multiplier for black hole spawn rate
    comets: number;          // Multiplier for comet spawn rate
}

export interface CosmicRegionDefinition {
    id: string;
    name: string;
    description: string;
    spawnModifiers: RegionSpawnModifiers;
    visualCharacteristics?: {
        starDensityModifier: number;     // Multiplier for background star density
        starColorBias?: string[];        // Preferred star colors for this region
        nebulaColorBias?: string[];      // Preferred nebula colors for this region
    };
}

/**
 * Predefined cosmic region types with their spawn characteristics
 */
export const CosmicRegionTypes: Record<string, CosmicRegionDefinition> = {
    VOID: {
        id: 'void',
        name: 'The Void',
        description: 'Vast empty space with sparse star systems but higher probability of exotic phenomena',
        spawnModifiers: {
            starSystems: 0.3,        // 70% fewer star systems
            nebulae: 0.4,           // 60% fewer nebulae
            asteroidGardens: 0.1,   // 90% fewer asteroid gardens
            wormholes: 3.0,         // 3x more wormholes (rare becomes slightly less rare)
            blackHoles: 2.0,        // 2x more black holes
            comets: 0.5,            // 50% fewer comets
        },
        visualCharacteristics: {
            starDensityModifier: 0.4,           // Much fewer background stars
            starColorBias: ['#aaaaff', '#ccccff'], // Cooler, more distant-feeling stars
        }
    },

    STAR_FORGE: {
        id: 'star_forge',
        name: 'Star-Forge Cluster',
        description: 'Dense stellar formation region with abundant nebulae and young hot stars',
        spawnModifiers: {
            starSystems: 1.8,        // 80% more star systems
            nebulae: 4.0,           // 4x more nebulae (frequent stellar nurseries)
            asteroidGardens: 0.7,   // 30% fewer asteroid gardens
            wormholes: 0.5,         // 50% fewer wormholes
            blackHoles: 0.1,        // 90% fewer black holes
            comets: 1.5,            // 50% more comets (active stellar environment)
        },
        visualCharacteristics: {
            starDensityModifier: 2.0,               // Much denser background stars
            starColorBias: ['#aaddff', '#ffffff', '#ffddaa'], // Young, hot blue-white stars
            nebulaColorBias: ['#ff6666', '#66ff66', '#6666ff'] // Bright emission nebulae
        }
    },

    GALACTIC_CORE: {
        id: 'galactic_core',
        name: 'Galactic Core',
        description: 'Dense region with older stars and higher probability of exotic massive objects',
        spawnModifiers: {
            starSystems: 2.2,        // 120% more star systems (very dense)
            nebulae: 1.5,           // 50% more nebulae
            asteroidGardens: 0.8,   // 20% fewer asteroid gardens
            wormholes: 1.5,         // 50% more wormholes
            blackHoles: 8.0,        // 8x more black holes (supermassive environment)
            comets: 0.8,            // 20% fewer comets (stable older systems)
        },
        visualCharacteristics: {
            starDensityModifier: 3.0,                           // Extremely dense background
            starColorBias: ['#ffaa88', '#ffcc88', '#ff8888'],  // Older, redder stars
        }
    },

    ASTEROID_GRAVEYARD: {
        id: 'asteroid_graveyard',
        name: 'Asteroid Graveyard',
        description: 'Sparse stellar region dominated by vast asteroid fields and debris',
        spawnModifiers: {
            starSystems: 0.4,        // 60% fewer star systems
            nebulae: 0.3,           // 70% fewer nebulae
            asteroidGardens: 6.0,   // 6x more asteroid gardens (dominant feature)
            wormholes: 0.7,         // 30% fewer wormholes
            blackHoles: 0.5,        // 50% fewer black holes
            comets: 0.2,            // 80% fewer comets (no host stars for orbits)
        },
        visualCharacteristics: {
            starDensityModifier: 0.6,                          // Fewer background stars
            starColorBias: ['#ffaa88', '#ff8888'],            // Older, dying stars
        }
    },

    ANCIENT_EXPANSE: {
        id: 'ancient_expanse',
        name: 'Ancient Expanse',
        description: 'Old stellar region with balanced celestial object distribution and mysterious artifacts',
        spawnModifiers: {
            starSystems: 1.0,        // Normal star system density
            nebulae: 0.8,           // 20% fewer nebulae (most gas consumed long ago)
            asteroidGardens: 1.2,   // 20% more asteroid gardens
            wormholes: 1.8,         // 80% more wormholes (ancient travel networks)
            blackHoles: 1.5,        // 50% more black holes
            comets: 0.6,            // 40% fewer comets (older, stable systems)
        },
        visualCharacteristics: {
            starDensityModifier: 1.1,                          // Slightly more stars
            starColorBias: ['#ffcc88', '#ffffff', '#ffaa88'],  // Mix of mature stars
        }
    },

    STELLAR_NURSERY: {
        id: 'stellar_nursery',
        name: 'Stellar Nursery',
        description: 'Active star formation region with brilliant nebulae and proto-stellar objects',
        spawnModifiers: {
            starSystems: 1.4,        // 40% more star systems (active formation)
            nebulae: 5.0,           // 5x more nebulae (stellar birth clouds)
            asteroidGardens: 1.8,   // 80% more asteroid gardens (formation debris)
            wormholes: 0.3,         // 70% fewer wormholes (unstable spacetime)
            blackHoles: 0.2,        // 80% fewer black holes (young region)
            comets: 2.0,            // 2x more comets (active debris)
        },
        visualCharacteristics: {
            starDensityModifier: 1.8,                               // Dense young stars
            starColorBias: ['#aaddff', '#ffffff', '#ddaaff'],       // Young blue-white stars
            nebulaColorBias: ['#ff4444', '#44ff44', '#ffaa44']      // Bright formation nebulae
        }
    }
};

/**
 * Get all available cosmic region types
 */
export function getCosmicRegionTypes(): CosmicRegionDefinition[] {
    return Object.values(CosmicRegionTypes);
}

/**
 * Get a specific cosmic region definition by ID
 */
export function getCosmicRegionById(id: string): CosmicRegionDefinition | null {
    return CosmicRegionTypes[id.toUpperCase()] || null;
}

/**
 * Apply region spawn modifiers to base spawn chances
 */
export function applyRegionModifiers(
    baseSpawnChances: Record<string, number>,
    regionModifiers: RegionSpawnModifiers
): Record<string, number> {
    return {
        starSystems: (baseSpawnChances.starSystems || 0) * regionModifiers.starSystems,
        nebulae: (baseSpawnChances.nebulae || 0) * regionModifiers.nebulae,
        asteroidGardens: (baseSpawnChances.asteroidGardens || 0) * regionModifiers.asteroidGardens,
        wormholes: (baseSpawnChances.wormholes || 0) * regionModifiers.wormholes,
        blackHoles: (baseSpawnChances.blackHoles || 0) * regionModifiers.blackHoles,
        comets: (baseSpawnChances.comets || 0) * regionModifiers.comets,
    };
}