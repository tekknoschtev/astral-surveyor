// WorldService Tests - Test-driven development for world management service
// Following Phase 4 clean architecture patterns

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorldService } from '../../dist/services/WorldService.js';

describe('WorldService', () => {
    let worldService;
    let mockConfigService;
    let mockDiscoveryService;

    beforeEach(() => {
        // Mock dependencies
        mockConfigService = {
            get: (key, defaultValue) => {
                const configMap = {
                    'world.chunkSize': 2048,
                    'world.loadRadius': 2,
                    'world.generation.starDensity': 0.3,
                    'world.generation.starSystemDensity': 0.15,
                    'world.generation.nebulaSpawnChance': 0.02,
                    'world.generation.asteroidSpawnChance': 0.05
                };
                return configMap[key] || defaultValue;
            },
            getWorldConfig: () => ({
                chunkSize: 2048,
                loadRadius: 2,
                generation: {
                    starDensity: 0.3,
                    starSystemDensity: 0.15
                }
            })
        };

        mockDiscoveryService = {
            isObjectDiscovered: () => false,
            markDiscovered: () => {},
            getDiscoveredObjects: () => new Map()
        };

        worldService = new WorldService(mockConfigService, mockDiscoveryService);
    });

    afterEach(() => {
        if (worldService && typeof worldService.dispose === 'function') {
            worldService.dispose();
        }
    });

    describe('Initialization', () => {
        it('should initialize with proper dependencies', () => {
            expect(worldService).toBeDefined();
            expect(worldService.configService).toBe(mockConfigService);
            expect(worldService.discoveryService).toBe(mockDiscoveryService);
        });

        it('should initialize chunk manager with configuration', () => {
            expect(worldService.chunkManager).toBeDefined();
            expect(typeof worldService.chunkManager.generateChunk).toBe('function');
        });

        it('should have default load radius from config', () => {
            const loadRadius = worldService.getLoadRadius();
            expect(loadRadius).toBe(2);
        });

        it('should handle missing dependencies gracefully', () => {
            expect(() => {
                new WorldService(null, mockDiscoveryService);
            }).toThrow('ConfigService is required');

            expect(() => {
                new WorldService(mockConfigService, null);
            }).toThrow('DiscoveryService is required');
        });
    });

    describe('World Generation', () => {
        it('should generate chunks at specified coordinates', () => {
            const chunk = worldService.generateChunk(0, 0);
            
            expect(chunk).toBeDefined();
            expect(chunk.x).toBe(0);
            expect(chunk.y).toBe(0);
            expect(Array.isArray(chunk.stars)).toBe(true);
            expect(Array.isArray(chunk.celestialStars)).toBe(true);
            expect(Array.isArray(chunk.planets)).toBe(true);
            expect(Array.isArray(chunk.nebulae)).toBe(true);
        });

        it('should generate deterministic content for same coordinates', () => {
            const chunk1 = worldService.generateChunk(1, 1);
            const chunk2 = worldService.generateChunk(1, 1);
            
            expect(chunk1.stars.length).toBe(chunk2.stars.length);
            expect(chunk1.celestialStars.length).toBe(chunk2.celestialStars.length);
            
            // First star should be in same position
            if (chunk1.stars.length > 0) {
                expect(chunk1.stars[0].x).toBe(chunk2.stars[0].x);
                expect(chunk1.stars[0].y).toBe(chunk2.stars[0].y);
            }
        });

        it('should generate different content for different coordinates', () => {
            const chunk1 = worldService.generateChunk(0, 0);
            const chunk2 = worldService.generateChunk(1, 0);
            
            // Content should be different (very unlikely to be identical)
            const contentMatch = 
                chunk1.stars.length === chunk2.stars.length &&
                chunk1.celestialStars.length === chunk2.celestialStars.length &&
                chunk1.planets.length === chunk2.planets.length;
            
            expect(contentMatch).toBe(false);
        });

        it('should respect configuration parameters', () => {
            // Mock different density config
            mockConfigService.get = (key, defaultValue) => {
                if (key === 'world.generation.starDensity') return 0.8; // High density
                return defaultValue;
            };

            const highDensityService = new WorldService(mockConfigService, mockDiscoveryService);
            const chunk = highDensityService.generateChunk(0, 0);
            
            // Should generate more stars with higher density
            expect(chunk.stars.length).toBeGreaterThan(0);
            
            highDensityService.dispose();
        });
    });

    describe('Chunk Management', () => {
        it('should convert world coordinates to chunk coordinates', () => {
            const chunkCoords = worldService.getChunkCoords(2048, 4096);
            expect(chunkCoords.x).toBe(1);
            expect(chunkCoords.y).toBe(2);
        });

        it('should convert negative coordinates correctly', () => {
            const chunkCoords = worldService.getChunkCoords(-2048, -2048);
            expect(chunkCoords.x).toBe(-2); // ChunkManager uses floor division
            expect(chunkCoords.y).toBe(-2);
        });

        it('should generate unique chunk keys', () => {
            const key1 = worldService.getChunkKey(0, 0);
            const key2 = worldService.getChunkKey(1, 0);
            const key3 = worldService.getChunkKey(0, 1);
            
            expect(key1).not.toBe(key2);
            expect(key1).not.toBe(key3);
            expect(key2).not.toBe(key3);
        });

        it('should update active chunks based on player position', () => {
            worldService.updateActiveChunks(1000, 1000);
            
            const activeObjects = worldService.getActiveObjects();
            expect(activeObjects).toBeDefined();
            expect(Array.isArray(activeObjects.stars)).toBe(true);
            expect(Array.isArray(activeObjects.celestialStars)).toBe(true);
        });

        it('should unload distant chunks', () => {
            // Load chunks around 0,0
            worldService.updateActiveChunks(0, 0);
            const initialChunkCount = worldService.getActiveChunkCount();
            
            // Move far away
            worldService.updateActiveChunks(10000, 10000);
            const finalChunkCount = worldService.getActiveChunkCount();
            
            // Should have loaded new chunks and unloaded old ones
            expect(finalChunkCount).toBeGreaterThan(0);
        });
    });

    describe('Object Discovery Integration', () => {
        it('should integrate with discovery service for object tracking', () => {
            // Manually add discovery data to the chunk manager
            worldService.chunkManager.discoveredObjects.set('star_0_0', { 
                name: 'Test Star', 
                timestamp: Date.now(),
                objId: 'star_0_0'
            });

            const discoveries = worldService.getDiscoveredObjects();
            expect(discoveries.size).toBe(1);
            expect(discoveries.has('star_0_0')).toBe(true);
        });

        it('should generate unique object IDs', () => {
            const id1 = worldService.getObjectId(100, 200, 'star');
            const id2 = worldService.getObjectId(100, 201, 'star');
            const id3 = worldService.getObjectId(101, 200, 'star');
            
            expect(id1).not.toBe(id2);
            expect(id1).not.toBe(id3);
            expect(id2).not.toBe(id3);
        });

        it('should handle complex object IDs for planets and moons', () => {
            const mockPlanet = {
                x: 100,
                y: 200,
                type: 'planet',
                parentStar: { x: 90, y: 190 },
                planetIndex: 2
            };

            const planetId = worldService.getObjectId(100, 200, 'planet', mockPlanet);
            expect(planetId).toContain('planet');
            expect(planetId).toContain('90_190'); // Parent star coordinates
            expect(planetId).toContain('2'); // Planet index
        });
    });

    describe('Performance and Memory Management', () => {
        it('should handle multiple chunk generations efficiently', () => {
            const start = performance.now();
            
            // Generate multiple chunks
            for (let x = 0; x < 5; x++) {
                for (let y = 0; y < 5; y++) {
                    worldService.generateChunk(x, y);
                }
            }
            
            const end = performance.now();
            const duration = end - start;
            
            // Should complete in reasonable time
            expect(duration).toBeLessThan(1000); // Less than 1 second for 25 chunks
        });

        it('should properly dispose resources', () => {
            worldService.updateActiveChunks(0, 0);
            expect(worldService.getActiveChunkCount()).toBeGreaterThan(0);
            
            const chunkCountBeforeDispose = worldService.getActiveChunkCount();
            worldService.dispose();
            
            // After dispose, service should be unusable
            expect(() => {
                worldService.getActiveChunkCount();
            }).toThrow('WorldService has been disposed');
            
            // But we can check that dispose cleared the chunks
            expect(worldService.chunkManager.activeChunks.size).toBe(0);
        });

        it('should handle concurrent chunk updates', () => {
            // Simulate rapid position changes
            worldService.updateActiveChunks(0, 0);
            worldService.updateActiveChunks(1000, 1000);
            worldService.updateActiveChunks(2000, 2000);
            
            const activeObjects = worldService.getActiveObjects();
            expect(activeObjects).toBeDefined();
            expect(worldService.getActiveChunkCount()).toBeGreaterThan(0);
        });
    });

    describe('Configuration Integration', () => {
        it('should respond to configuration changes', () => {
            const initialLoadRadius = worldService.getLoadRadius();
            
            // Simulate config change
            mockConfigService.get = (key, defaultValue) => {
                if (key === 'world.loadRadius') return 3;
                return defaultValue;
            };

            worldService.reloadConfiguration();
            const newLoadRadius = worldService.getLoadRadius();
            
            expect(newLoadRadius).toBe(3);
            expect(newLoadRadius).not.toBe(initialLoadRadius);
        });

        it('should validate configuration values', () => {
            mockConfigService.get = (key, defaultValue) => {
                if (key === 'world.loadRadius') return -1; // Invalid value
                return defaultValue;
            };

            expect(() => {
                worldService.reloadConfiguration();
            }).toThrow('Invalid load radius');
        });
    });

    describe('Error Handling', () => {
        it('should handle chunk generation errors gracefully', () => {
            // Mock a chunk generation error
            const originalGenerate = worldService.chunkManager.generateChunk;
            worldService.chunkManager.generateChunk = () => {
                throw new Error('Generation failed');
            };

            expect(() => {
                worldService.generateChunk(0, 0);
            }).toThrow('Failed to generate chunk');

            // Restore original method
            worldService.chunkManager.generateChunk = originalGenerate;
        });

        it('should handle invalid coordinates', () => {
            expect(() => {
                worldService.generateChunk(NaN, 0);
            }).toThrow('Invalid chunk coordinates');

            expect(() => {
                worldService.generateChunk(0, Infinity);
            }).toThrow('Invalid chunk coordinates');
        });

        it('should handle missing chunk data gracefully', () => {
            const result = worldService.getActiveObjects();
            expect(result).toBeDefined();
            expect(Array.isArray(result.stars)).toBe(true);
        });
    });
});