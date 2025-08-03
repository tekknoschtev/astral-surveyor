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
            
            // Create the star
            const star = new Star(starX, starY);
            star.initWithSeed(starSystemRng);
            
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
                
                // Create the planet with orbital properties
                const planet = new Planet(planetX, planetY, star, orbitalDistance, orbitalAngle, orbitalSpeed);
                planet.initWithSeed(starSystemRng, star, orbitalDistance, orbitalAngle, orbitalSpeed);
                
                // Add planet to both the star's planet list and the chunk
                star.addPlanet(planet);
                chunk.planets.push(planet);
            }
            
            chunk.celestialStars.push(star);
        }

        this.activeChunks.set(chunkKey, chunk);
        return chunk;
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