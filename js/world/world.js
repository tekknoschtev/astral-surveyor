// Chunk-based world management for infinite generation
class ChunkManager {
    constructor() {
        this.chunkSize = 1000; // 1000x1000 pixel chunks
        this.loadRadius = 1; // Load chunks in 3x3 grid around player
        this.activeChunks = new Map(); // Key: "x,y", Value: chunk data
        this.discoveredObjects = new Map(); // Key: "objId", Value: discovery state
    }

    getChunkCoords(worldX, worldY) {
        return {
            x: Math.floor(worldX / this.chunkSize),
            y: Math.floor(worldY / this.chunkSize)
        };
    }

    getChunkKey(chunkX, chunkY) {
        return `${chunkX},${chunkY}`;
    }

    getObjectId(x, y, type, object = null) {
        // For orbiting planets, use parent star position plus orbital distance for stable ID
        if (object && object.type === 'planet' && object.parentStar) {
            const starX = Math.floor(object.parentStar.x);
            const starY = Math.floor(object.parentStar.y);
            const orbitalDistance = Math.floor(object.orbitalDistance);
            return `${type}_${starX}_${starY}_orbit_${orbitalDistance}`;
        }
        
        // For regular objects, use their position
        return `${type}_${Math.floor(x)}_${Math.floor(y)}`;
    }

    generateChunk(chunkX, chunkY) {
        const chunkKey = this.getChunkKey(chunkX, chunkY);
        if (this.activeChunks.has(chunkKey)) {
            return this.activeChunks.get(chunkKey);
        }

        const chunk = {
            x: chunkX,
            y: chunkY,
            stars: [],
            planets: [],
            celestialStars: [] // Discoverable stars (different from background stars)
        };

        // Generate stars for this chunk
        const starSeed = hashPosition(chunkX * this.chunkSize, chunkY * this.chunkSize) + 1;
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
        const starSystemSeed = hashPosition(chunkX * this.chunkSize, chunkY * this.chunkSize) + 2;
        const starSystemRng = new SeededRandom(starSystemSeed);
        // Reduce star system density for more exploration - most chunks will be empty space
        const starSystemRoll = starSystemRng.nextFloat(0, 1);
        let starSystemCount;
        
        if (starSystemRoll < 0.92) {
            starSystemCount = 0; // 92% chance of empty chunk (even more space to explore with larger orbits)
        } else {
            starSystemCount = 1; // 8% chance of having a star system
        }

        for (let i = 0; i < starSystemCount; i++) {
            // Center star systems more in chunks to create better spacing and exploration feel
            // With 92% empty chunks and larger orbital distances (up to 800px), we need adequate margins
            const margin = 250; // Margin adjusted for larger star systems with epic outer planet orbits
            const starX = chunkX * this.chunkSize + starSystemRng.nextFloat(margin, this.chunkSize - margin);
            const starY = chunkY * this.chunkSize + starSystemRng.nextFloat(margin, this.chunkSize - margin);
            
            // Determine star type based on rarity distribution
            const starType = this.selectStarType(starSystemRng);
            
            // Create the star with the selected type
            const star = new Star(starX, starY, starType);
            star.initWithSeed(starSystemRng, starType);
            
            // Generate planets for this star system with weighted distribution (0-12 planets)
            // Weighted to favor 2-5 planets per star for realistic systems
            const planetRoll = starSystemRng.nextFloat(0, 1);
            let planetCount;
            
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
                let orbitalDistance;
                
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
                const planetSeed = starSystemSeed + j + 100; // Unique seed for each planet
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
                planet.initWithSeed(starSystemRng, star, orbitalDistance, orbitalAngle, orbitalSpeed, planetType);
                
                // Add planet to both the star's planet list and the chunk
                star.addPlanet(planet);
                chunk.planets.push(planet);
            }
            
            chunk.celestialStars.push(star);
        }

        this.activeChunks.set(chunkKey, chunk);
        return chunk;
    }

    selectPlanetType(rng, orbitalDistance, star) {
        // Create weighted selection based on orbital distance and star characteristics
        const minDistance = star.radius + 60;
        const relativeDistance = (orbitalDistance - minDistance) / 800; // Normalize to 0-1 range
        
        // Base probabilities based on distance from star
        let probabilities = {};
        
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
        const globalModifiers = {};
        for (const [typeName, typeData] of Object.entries(PlanetTypes)) {
            globalModifiers[typeName] = typeData.rarity;
        }
        
        // Combine distance-based probabilities with global rarity
        const finalProbabilities = {};
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

    selectStarType(rng) {
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

    applyStarTypeModifiers(probabilities, starType, relativeDistance) {
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

    updateActiveChunks(playerX, playerY) {
        const playerChunk = this.getChunkCoords(playerX, playerY);
        const requiredChunks = new Set();

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

    getAllActiveObjects() {
        const objects = { stars: [], planets: [], celestialStars: [] };
        
        for (const chunk of this.activeChunks.values()) {
            objects.stars.push(...chunk.stars);
            objects.planets.push(...chunk.planets);
            objects.celestialStars.push(...chunk.celestialStars);
        }

        return objects;
    }

    markObjectDiscovered(object) {
        const objId = this.getObjectId(object.x, object.y, object.type, object);
        this.discoveredObjects.set(objId, {
            discovered: true,
            timestamp: Date.now()
        });
        object.discovered = true;
    }

    isObjectDiscovered(object) {
        const objId = this.getObjectId(object.x, object.y, object.type, object);
        return this.discoveredObjects.has(objId);
    }

    restoreDiscoveryState(objects) {
        for (const obj of objects) {
            if (this.isObjectDiscovered(obj)) {
                obj.discovered = true;
            }
        }
    }
}

// Infinite starfield using chunk-based generation
class InfiniteStarField {
    constructor(chunkManager) {
        this.chunkManager = chunkManager;
    }

    render(renderer, camera) {
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

// Export for use in other modules
window.ChunkManager = ChunkManager;
window.InfiniteStarField = InfiniteStarField;