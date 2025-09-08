import { expect, test, describe, beforeEach, beforeAll, vi } from 'vitest';

// Import modules for testing
let DebugSpawner, Protostar, ChunkManager, Camera;

beforeAll(async () => {
    const debugModule = await import('../../dist/debug/debug-spawner.js');
    const regionModule = await import('../../dist/celestial/RegionSpecificObjects.js');
    const worldModule = await import('../../dist/world/ChunkManager.js');
    const cameraModule = await import('../../dist/camera/camera.js');
    
    DebugSpawner = debugModule.DebugSpawner;
    Protostar = regionModule.Protostar;
    ChunkManager = worldModule.ChunkManager;
    Camera = cameraModule.Camera;
});

describe('Protostar Debug Spawning', () => {
    let mockCamera;
    let mockChunkManager;

    beforeEach(() => {
        // Create mock camera
        mockCamera = {
            x: 1000,
            y: 2000
        };

        // Create mock chunk manager
        mockChunkManager = {
            debugObjects: [],
            discoveredObjects: new Map(),
            activeChunks: new Map(),
            chunkSize: 1000,
            getChunkCoords: vi.fn((x, y) => ({
                x: Math.floor(x / 1000),
                y: Math.floor(y / 1000)
            })),
            getChunkKey: vi.fn((x, y) => `${x},${y}`),
            getObjectId: vi.fn((x, y, type, obj) => `${type}_${Math.floor(x)}_${Math.floor(y)}`),
            generateChunk: vi.fn((x, y) => ({
                x, y,
                stars: [], planets: [], moons: [], celestialStars: [], nebulae: [],
                asteroidGardens: [], wormholes: [], blackholes: [], comets: [],
                roguePlanets: [], darkNebulae: [], crystalGardens: [], protostars: []
            }))
        };
    });

    describe('Basic Spawning', () => {
        test('should spawn protostar with debug mode enabled', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            DebugSpawner.spawnProtostar(mockCamera, mockChunkManager, undefined, true);
            
            // Should have added debug object
            expect(mockChunkManager.debugObjects.length).toBe(1);
            
            const debugObj = mockChunkManager.debugObjects[0];
            expect(debugObj.type).toBe('protostar');
            expect(debugObj.object).toBeInstanceOf(Protostar);
            expect(debugObj.object.discovered).toBe(true);
            
            // Should be positioned near player (200-400px away)
            const distance = Math.sqrt(
                Math.pow(debugObj.x - mockCamera.x, 2) + 
                Math.pow(debugObj.y - mockCamera.y, 2)
            );
            expect(distance).toBeGreaterThanOrEqual(200);
            expect(distance).toBeLessThanOrEqual(400);
            
            consoleSpy.mockRestore();
        });

        test('should reject spawning when debug mode is disabled', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            
            DebugSpawner.spawnProtostar(mockCamera, mockChunkManager, undefined, false);
            
            // Should not have spawned anything
            expect(mockChunkManager.debugObjects.length).toBe(0);
            expect(consoleSpy).toHaveBeenCalledWith('Debug spawning requires debug mode to be enabled');
            
            consoleSpy.mockRestore();
        });

        test('should spawn specific variant when requested', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            // Test each variant
            const variants = ['class-0', 'class-1', 'class-2'];
            
            for (const variant of variants) {
                mockChunkManager.debugObjects = []; // Reset
                
                DebugSpawner.spawnProtostar(mockCamera, mockChunkManager, variant, true);
                
                expect(mockChunkManager.debugObjects.length).toBe(1);
                const protostar = mockChunkManager.debugObjects[0].object;
                expect(protostar.variant).toBe(variant);
            }
            
            consoleSpy.mockRestore();
        });

        test('should spawn random variant when not specified', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            // Mock Math.random to ensure we get variety in testing
            const originalRandom = Math.random;
            let callCount = 0;
            Math.random = vi.fn(() => {
                // Cycle through different values to ensure variety
                const values = [0.1, 0.6, 0.95, 0.3, 0.8, 0.2, 0.7, 0.4];
                return values[callCount++ % values.length];
            });
            
            // Spawn multiple times to test randomness
            const variants = [];
            for (let i = 0; i < 8; i++) {
                mockChunkManager.debugObjects = []; // Reset
                
                DebugSpawner.spawnProtostar(mockCamera, mockChunkManager, undefined, true);
                
                const protostar = mockChunkManager.debugObjects[0].object;
                variants.push(protostar.variant);
            }
            
            // Should have variety (not all the same)
            const uniqueVariants = [...new Set(variants)];
            expect(uniqueVariants.length).toBeGreaterThan(1);
            
            // All should be valid variants
            for (const variant of variants) {
                expect(['class-0', 'class-1', 'class-2']).toContain(variant);
            }
            
            // Restore Math.random and console
            Math.random = originalRandom;
            consoleSpy.mockRestore();
        });
    });

    describe('Error Handling', () => {
        test('should handle errors gracefully', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            
            // Create broken chunk manager
            const brokenChunkManager = {
                ...mockChunkManager,
                getChunkCoords: vi.fn(() => { throw new Error('Test error'); })
            };
            
            expect(() => {
                DebugSpawner.spawnProtostar(mockCamera, brokenChunkManager, 'class-1', true);
            }).not.toThrow();
            
            expect(consoleSpy).toHaveBeenCalledWith('❌ DEBUG: Error spawning protostar:', expect.any(Error));
            
            consoleSpy.mockRestore();
        });

        test('should validate input parameters', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            
            // Test null parameters
            expect(() => {
                DebugSpawner.spawnProtostar(null, mockChunkManager, 'class-1', true);
            }).not.toThrow();
            
            expect(() => {
                DebugSpawner.spawnProtostar(mockCamera, null, 'class-1', true);
            }).not.toThrow();
            
            consoleSpy.mockRestore();
        });
    });

    describe('Discovery Integration', () => {
        test('should mark spawned protostar as discovered', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            DebugSpawner.spawnProtostar(mockCamera, mockChunkManager, 'class-1', true);
            
            const debugObj = mockChunkManager.debugObjects[0];
            expect(debugObj.object.discovered).toBe(true);
            
            consoleSpy.mockRestore();
        });

        test('should add to discovery state', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            DebugSpawner.spawnProtostar(mockCamera, mockChunkManager, 'class-1', true);
            
            // Should have called getObjectId and set discovery state
            expect(mockChunkManager.getObjectId).toHaveBeenCalled();
            expect(mockChunkManager.discoveredObjects.size).toBe(1);
            
            const discoveryEntry = mockChunkManager.discoveredObjects.values().next().value;
            expect(discoveryEntry.discovered).toBe(true);
            expect(discoveryEntry.timestamp).toBeDefined();
            
            consoleSpy.mockRestore();
        });

        test('should log spawning information', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            DebugSpawner.spawnProtostar(mockCamera, mockChunkManager, 'class-2', true);
            
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching(/⭐ DEBUG: Spawned class-2 protostar ".+" at \(\d+, \d+\)/)
            );
            
            consoleSpy.mockRestore();
        });
    });

    describe('Chunk Integration', () => {
        test('should add protostar to appropriate chunk', () => {
            // Update mock to return the correct chunk coordinates
            mockChunkManager.getChunkCoords = vi.fn((x, y) => ({ x: 1, y: 2 }));
            mockChunkManager.getChunkKey = vi.fn((x, y) => '1,2');
            
            const mockChunk = {
                x: 1, y: 2,
                stars: [], planets: [], moons: [], celestialStars: [], nebulae: [],
                asteroidGardens: [], wormholes: [], blackholes: [], comets: [],
                roguePlanets: [], darkNebulae: [], crystalGardens: [], protostars: []
            };
            
            mockChunkManager.activeChunks.set('1,2', mockChunk);
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            DebugSpawner.spawnProtostar(mockCamera, mockChunkManager, 'class-1', true);
            
            // Should have added to protostars array
            expect(mockChunk.protostars.length).toBe(1);
            expect(mockChunk.protostars[0]).toBeInstanceOf(Protostar);
            
            consoleSpy.mockRestore();
        });

        test('should create chunk if it does not exist', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            DebugSpawner.spawnProtostar(mockCamera, mockChunkManager, 'class-1', true);
            
            // Should have called generateChunk
            expect(mockChunkManager.generateChunk).toHaveBeenCalled();
            
            consoleSpy.mockRestore();
        });
    });

    describe('Position Generation', () => {
        test('should respect minimum distance from player', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            // Spawn multiple times to test positioning
            for (let i = 0; i < 10; i++) {
                mockChunkManager.debugObjects = []; // Reset
                
                DebugSpawner.spawnProtostar(mockCamera, mockChunkManager, 'class-1', true);
                
                const debugObj = mockChunkManager.debugObjects[0];
                const distance = Math.sqrt(
                    Math.pow(debugObj.x - mockCamera.x, 2) + 
                    Math.pow(debugObj.y - mockCamera.y, 2)
                );
                
                // Should maintain minimum distance to account for jets
                expect(distance).toBeGreaterThanOrEqual(200);
            }
            
            consoleSpy.mockRestore();
        });

        test('should have varied positions', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            // Mock Math.random to provide different values for angle and distance generation
            const originalRandom = Math.random;
            let callCount = 0;
            Math.random = vi.fn(() => {
                // Provide varied values for angle and distance calculations
                const values = [0.1, 0.3, 0.5, 0.7, 0.9, 0.2, 0.4, 0.6, 0.8, 0.15, 0.35, 0.55, 0.75, 0.95, 0.25, 0.45, 0.65, 0.85];
                return values[callCount++ % values.length];
            });
            
            const positions = [];
            
            // Spawn multiple protostars
            for (let i = 0; i < 10; i++) {
                mockChunkManager.debugObjects = []; // Reset
                
                DebugSpawner.spawnProtostar(mockCamera, mockChunkManager, 'class-1', true);
                
                const debugObj = mockChunkManager.debugObjects[0];
                positions.push({ x: debugObj.x, y: debugObj.y });
            }
            
            // Positions should be varied (not all the same)
            const uniqueX = [...new Set(positions.map(p => Math.floor(p.x / 50)))];
            const uniqueY = [...new Set(positions.map(p => Math.floor(p.y / 50)))];
            
            expect(uniqueX.length).toBeGreaterThan(1);
            expect(uniqueY.length).toBeGreaterThan(1);
            
            // Restore Math.random and console
            Math.random = originalRandom;
            consoleSpy.mockRestore();
        });
    });
});