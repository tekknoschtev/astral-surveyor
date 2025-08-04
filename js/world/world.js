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
            moons: [], // Discoverable moons orbiting planets
            celestialStars: [] // Discoverable stars (different from background stars)
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
        let starSystemCount;
        
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
            let bestX, bestY, bestScore = -1;
            const candidates = 3; // Try 3 different positions
            
            for (let attempt = 0; attempt < candidates; attempt++) {
                // Add extra randomization to break patterns
                const subSeed = attempt * 12345;
                xRng.seed = (positionSeed ^ 0xAAAA5555 ^ subSeed) % 2147483647;
                yRng.seed = (positionSeed ^ 0x5555AAAA ^ subSeed) % 2147483647;
                
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
            
            const starX = bestX;
            const starY = bestY;
            
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
                planet.initWithSeed(starSystemRng, star, orbitalDistance, orbitalAngle, orbitalSpeed, planetType);
                
                // Add planet to both the star's planet list and the chunk
                star.addPlanet(planet);
                chunk.planets.push(planet);
                
                // Generate moons for this planet based on rarity rules
                this.generateMoonsForPlanet(planet, starSystemRng, chunk);
            }
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
        const objects = { stars: [], planets: [], moons: [], celestialStars: [] };
        
        for (const chunk of this.activeChunks.values()) {
            objects.stars.push(...chunk.stars);
            objects.planets.push(...chunk.planets);
            objects.moons.push(...chunk.moons);
            objects.celestialStars.push(...chunk.celestialStars);
        }

        return objects;
    }

    markObjectDiscovered(object, objectName = null) {
        const objId = this.getObjectId(object.x, object.y, object.type, object);
        const discoveryData = {
            discovered: true,
            timestamp: Date.now()
        };
        
        // Store type information for persistent display
        if (object.type === 'star' && object.starTypeName) {
            discoveryData.starTypeName = object.starTypeName;
        } else if (object.type === 'planet' && object.planetTypeName) {
            discoveryData.planetTypeName = object.planetTypeName;
        }
        
        // Store the generated name if provided
        if (objectName) {
            discoveryData.objectName = objectName;
        }
        
        this.discoveredObjects.set(objId, discoveryData);
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

    getDiscoveredStars() {
        const discoveredStars = [];
        
        // Get all discovered objects that are stars
        for (const [objId, discoveryData] of this.discoveredObjects) {
            if (objId.startsWith('star_')) {
                // Extract coordinates from object ID
                const parts = objId.split('_');
                if (parts.length >= 3) {
                    const x = parseFloat(parts[1]);
                    const y = parseFloat(parts[2]);
                    
                    // Find the star in active chunks or reconstruct minimal data
                    let starData = null;
                    
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
                            starTypeName: starTypeName,
                            timestamp: discoveryData.timestamp
                        };
                    }
                    
                    discoveredStars.push(starData);
                }
            }
        }
        
        return discoveredStars;
    }
    
    getDiscoveredMoons() {
        const discoveredMoons = [];
        
        // Get all discovered objects that are moons
        for (const [objId, discoveryData] of this.discoveredObjects) {
            if (objId.startsWith('moon_')) {
                // Extract coordinates from object ID
                const parts = objId.split('_');
                if (parts.length >= 3) {
                    const planetX = parseFloat(parts[1]);
                    const planetY = parseFloat(parts[2]);
                    
                    // Find the moon in active chunks
                    let moonData = null;
                    
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
    
    // Score a potential star system position based on distance from existing systems
    scoreStarSystemPosition(x, y, currentChunkX, currentChunkY) {
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
    generateMoonsForPlanet(planet, rng, chunk) {
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
            moon.initWithSeed(rng, planet, orbitalDistance, orbitalAngle, orbitalSpeed);
            
            // Add moon to the chunk
            chunk.moons.push(moon);
        }
    }
    
    // Select appropriate companion star type for binary systems
    selectCompanionStarType(rng, primaryStarType) {
        // Import star types for reference
        const StarTypes = window.StarTypes;
        
        // Companion stars are typically smaller than the primary
        // Create weighted distribution favoring smaller star types
        const companionWeights = [];
        
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