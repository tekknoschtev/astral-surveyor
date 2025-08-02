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

    getObjectId(x, y, type) {
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
            planets: []
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

        // Generate planets for this chunk (rarer than stars)
        const planetSeed = hashPosition(chunkX * this.chunkSize, chunkY * this.chunkSize) + 2;
        const planetRng = new SeededRandom(planetSeed);
        const planetCount = planetRng.nextInt(0, 3); // 0-3 planets per chunk

        for (let i = 0; i < planetCount; i++) {
            const x = chunkX * this.chunkSize + planetRng.nextFloat(100, this.chunkSize - 100);
            const y = chunkY * this.chunkSize + planetRng.nextFloat(100, this.chunkSize - 100);
            
            const planet = new Planet(x, y);
            // Ensure planet uses the seeded random for consistent properties
            planet.initWithSeed(planetRng);
            
            chunk.planets.push(planet);
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
        const objects = { stars: [], planets: [] };
        
        for (const chunk of this.activeChunks.values()) {
            objects.stars.push(...chunk.stars);
            objects.planets.push(...chunk.planets);
        }

        return objects;
    }

    markObjectDiscovered(object) {
        const objId = this.getObjectId(object.x, object.y, object.type);
        this.discoveredObjects.set(objId, {
            discovered: true,
            timestamp: Date.now()
        });
        object.discovered = true;
    }

    isObjectDiscovered(object) {
        const objId = this.getObjectId(object.x, object.y, object.type);
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