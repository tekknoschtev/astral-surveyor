/**
 * Centralized Game Configuration
 * 
 * This file contains all the core gameplay parameters for Astral Surveyor.
 * Centralizing these values makes it easy to tweak gameplay balance and
 * ensures consistency across all generation systems.
 */

// World Generation Configuration
export const WorldConfig = {
    // Chunk system
    chunkSize: 2000,
    
    // Star system generation
    starSystem: {
        spawnChance: 0.08,              // 8% chance per chunk
        binaryChance: 0.10,             // 10% chance for binary systems
        minDistance: 1200,              // Minimum distance between star systems
        preferredDistance: 1800,        // Preferred distance for optimal spacing
        margin: 250,                    // Margin for larger star systems with epic outer planet orbits
    },
    
    // Planet count probability distribution
    planetCounts: {
        empty: 0.10,                    // 10% chance - empty system
        single: 0.15,                   // 15% chance - single planet
        small: 0.60,                    // 60% chance - 2-5 planets (most common)
        medium: 0.12,                   // 12% chance - 6-8 planets (solar system-like)
        large: 0.03,                    // 3% chance - 9-12 planets (massive system)
    },
    
    // Planet count ranges for each category
    planetCountRanges: {
        small: { min: 2, max: 5 },
        medium: { min: 6, max: 8 },
        large: { min: 9, max: 12 },
    },
    
    // Moon generation
    moons: {
        gasGiantChance: 0.6,            // 60% chance for gas giants
        largePlanetChance: 0.25,        // 25% chance for large rocky/ocean planets  
        otherPlanetChance: 0.10,        // 10% chance for other planet types
        minDistance: 15,                // Minimum safe distance from planet
        maxDistance: 50,                // Maximum distance (closer than planets)
    },
    
    // Special objects spawn rates
    specialObjects: {
        nebulae: {
            spawnChance: 0.05,          // 5% chance per chunk
            multipleChance: 0.02,       // 2% chance of 1-2 nebulae (rare clusters)
            minDistance: 800,           // Minimum distance from nebulae to prevent overlap
            preferredDistance: 1200,    // Preferred distance from nebulae
        },
        asteroidGardens: {
            spawnChance: 0.15,          // 15% chance per chunk
            multipleChance: 0.05,       // 5% chance of 1-2 asteroid gardens (rare multiple fields)
        },
        wormholes: {
            spawnChance: 0.0005,        // 0.05% chance (very rare)
            minDistance: 2000,          // 2000px minimum distance from any major object
        },
        blackHoles: {
            spawnChance: 0.000001,      // 0.0001% chance (ultra rare - 1 in 1,000,000)
            minDistance: 2000,          // 2000px minimum distance from any major object
        }
    },
    
    // Binary star configuration
    binaryStars: {
        distanceRange: { min: 150, max: 300 },  // Distance between binary stars
    }
};

// Planet Type Probability Distribution by Distance Zones
export const PlanetTypeConfig = {
    // Inner zone (< 0.2 relative distance from star)
    inner: {
        ROCKY: 0.5,
        VOLCANIC: 0.25,
        DESERT: 0.2,
        OCEAN: 0.03,
        FROZEN: 0.01,
        GAS_GIANT: 0.01,
        EXOTIC: 0.001
    },
    
    // Habitable zone (0.2 - 0.4 relative distance)
    habitable: {
        ROCKY: 0.35,
        OCEAN: 0.25,
        DESERT: 0.2,
        VOLCANIC: 0.1,
        GAS_GIANT: 0.05,
        FROZEN: 0.03,
        EXOTIC: 0.02
    },
    
    // Outer zone (0.4 - 0.7 relative distance)
    outer: {
        GAS_GIANT: 0.3,
        ROCKY: 0.25,
        OCEAN: 0.15,
        FROZEN: 0.15,
        DESERT: 0.1,
        VOLCANIC: 0.03,
        EXOTIC: 0.02
    },
    
    // Far zone (> 0.7 relative distance)
    far: {
        FROZEN: 0.4,
        GAS_GIANT: 0.25,
        ROCKY: 0.2,
        OCEAN: 0.1,
        DESERT: 0.02,
        VOLCANIC: 0.01,
        EXOTIC: 0.02
    }
};

// Celestial Object Properties
export const CelestialConfig = {
    // Planet properties
    planets: {
        // Base radius ranges
        baseRadius: { min: 8, max: 20 },
        
        // Orbital mechanics
        orbitalSpeed: {
            base: 0.08,                 // radians per second (more perceptible motion)
            randomFactor: { min: 0.7, max: 1.3 },
            keplerExponent: 2.0,        // More dramatic Kepler's law
            keplerReference: 120,       // Reference distance for speed calculation
        },
        
        // Planet distance from star
        minDistanceFromStar: 60,       // Added to star radius
        
        // Crater generation (for rocky planets)
        craters: {
            baseCraterCount: 3,
            bonusCratersPer4Radius: 1,  // Extra craters for larger planets
            minCraters: 2,
            distanceFromCenter: 0.7,    // Relative to radius
            sizeRange: { min: 1, max: 3 },
        },
        
        // Ring systems
        rings: {
            rockyChance: 0.0,           // Rocky planets don't have rings
            oceanChance: 0.0,           // Ocean planets don't have rings
            desertChance: 0.0,          // Desert planets don't have rings
            volcanicChance: 0.0,        // Volcanic planets don't have rings
            frozenChance: 0.3,          // 30% chance of icy ring systems
            gasGiantChance: 0.4,        // 40% chance of ring systems
            exoticChance: 0.5,          // 50% chance of exotic ring systems
        }
    },
    
    // Star properties  
    stars: {
        baseRadius: { min: 80, max: 140 },
        brakingDistance: 100,           // Added to star radius
        
        // Sunspot generation
        sunspots: {
            lowActivityChance: 0.4,     // 40% chance, 0 sunspots
            moderateActivityChance: 0.3, // 30% chance, 3-4 sunspots  
            highActivityChance: 0.3,    // 30% chance, 1-6 sunspots
            countRange: { min: 1, max: 6 },
            moderateRange: { min: 3, max: 4 },
        }
    },
    
    // Moon properties
    moons: {
        sizeVariation: { min: 0.1, max: 0.2 }, // 10-20% of parent planet size
        parentColorChance: 0.3,        // 30% chance to use parent planet color
    }
};

// Discovery and Gameplay Configuration
export const DiscoveryConfig = {
    // Discovery distances (how close player needs to be to discover objects)
    distances: {
        star: 500,
        planet: 200,
        moon: 100,
        nebula: 300,
        asteroidGarden: 250,
        wormhole: 400,
        blackHole: 600,
    },
    
    // Discovery values (points awarded for discovering objects)
    values: {
        star: 10,
        planet: 15,
        moon: 8,
        nebula: 50,          // Rare objects worth more
        asteroidGarden: 25,
        wormhole: 200,       // Very rare
        blackHole: 500,      // Ultra rare
    },
    
    // Special discovery rules
    notable: {
        // All nebulae are notable due to their rarity (5% spawn chance)
        nebulaAlwaysNotable: true,
        // All wormholes are extremely notable due to ultra-rarity (0.0005% spawn chance)  
        wormholeAlwaysNotable: true,
        // All black holes are ultra-notable due to extreme rarity (0.0001% spawn chance)
        blackHoleAlwaysNotable: true,
    }
};

// Particle Effects Configuration
export const ParticleConfig = {
    // Ship thrust particles
    thrust: {
        spawnRate: 8,                   // Particles per frame
        velocitySpread: 40,             // Random velocity variation
        baseVelocity: 80,               // Base particle velocity
        lifeRange: { min: 0.5, max: 0.8 },
        
        // Size distribution
        sizes: {
            large: { size: 3, chance: 0.15 },    // 15% chance
            medium: { size: 2, chance: 0.15 },   // 15% chance  
            small: { size: 1, chance: 0.7 },     // 70% chance
        }
    },
    
    // Stellar corona particles
    stellarCorona: {
        baseSpawnRate: 0.2,             // Particles per millisecond
        speedRange: { min: 3, max: 9 }, // Much slower speed
        directionRandomness: 0.4,       // Radians of random direction
        radiusMultiplier: { min: 0.8, max: 1.1 }, // Spawn radius relative to star
        brightnessRange: { min: 0.4, max: 0.7 },  // Brightness multiplier
        lifeRange: { min: 1.0, max: 1.8 },
        
        // Size distribution (same as thrust)
        sizes: {
            large: { size: 3, chance: 0.15 },
            medium: { size: 2, chance: 0.15 },
            small: { size: 1, chance: 0.7 },
        }
    }
};

// Parallax and Visual Effects
export const VisualConfig = {
    // Background parallax stars
    parallax: {
        regionSize: 2000,               // Size of each parallax region
        starsPerRegion: 50,             // Number of background stars per region
        depthLayers: 3,                 // Number of parallax layers
        brightness: { min: 0.2, max: 1.0 },
        sizeChance: 0.9,                // 90% chance for size 1, 10% for size 2
    },
    
    // Cosmic dust effects
    cosmicDust: {
        fadeDistance: 200,              // Distance over which dust fades
        alphaMultiplier: 0.8,
    }
};

// Audio Configuration  
export const AudioConfig = {
    // Wormhole audio effects
    wormhole: {
        entryTone: {
            frequency: 55,              // Deep, resonant fundamental frequency
            decay: 3.0,                 // Long resonant decay
            filterFreq: 800,
            filterQ: 1.2,               // Moderate resonance for character
        },
        exitTone: {
            frequency: 80,              // Mid-low frequency for dimensional shift
            attack: 0.1,
            decay: 2.0,
            release: 0.4,               // Moderate release for soft landing
        }
    },
    
    // Ambient audio
    ambient: {
        noiseBufferSize: 4096,          // White noise buffer size
    }
};

// Debug Configuration  
export const DebugConfig = {
    // Enable/disable debug features
    enabled: false,                    // Master debug toggle - set to true to enable debug features
    
    // Chunk boundary visualization
    chunkBoundaries: {
        enabled: true,                 // Show chunk boundaries when debug mode is on
        crosshairSize: 20,             // Size of crosshair markers in pixels
        color: '#FF00FF',              // Magenta color for high contrast
        lineWidth: 2,                  // Thickness of crosshair lines
        opacity: 0.8,                  // Semi-transparent for less visual noise
        
        // Subdivision markers (10% intervals along chunk edges)
        subdivisions: {
            enabled: true,             // Show subdivision markers
            dashLength: 10,            // Length of subdivision dash marks
            color: '#FFAAFF',          // Lighter magenta for subdivisions
            lineWidth: 1,              // Thinner lines for subdivisions
            opacity: 0.6,              // More transparent than main crosshairs
            interval: 0.1,             // 10% intervals (0.1 = 10%)
        }
    },
    
    // Other debug features can be added here
    showCoordinates: true,             // Show current coordinates
    showFPS: true,                     // Show frame rate counter
};

// Export combined configuration for easy importing
export const GameConfig = {
    world: WorldConfig,
    planetTypes: PlanetTypeConfig,
    celestial: CelestialConfig,
    discovery: DiscoveryConfig,
    particles: ParticleConfig,
    visual: VisualConfig,
    audio: AudioConfig,
    debug: DebugConfig,
};

export default GameConfig;