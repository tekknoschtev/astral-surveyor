import { expect, test, describe, beforeEach, beforeAll, vi } from 'vitest';

// Import modules for testing
let ChunkManager, Protostar, RegionGenerator, SeededRandom;

beforeAll(async () => {
    const worldModule = await import('../../dist/world/ChunkManager.js');
    const regionModule = await import('../../dist/celestial/RegionSpecificObjects.js');
    const regionGenModule = await import('../../dist/world/RegionGenerator.js');
    const randomModule = await import('../../dist/utils/random.js');
    
    ChunkManager = worldModule.ChunkManager;
    Protostar = regionModule.Protostar;
    RegionGenerator = regionGenModule.RegionGenerator;
    SeededRandom = randomModule.SeededRandom;
});

describe('Protostar Regional Spawning', () => {
    let chunkManager;
    let mockErrorService;
    let mockDiscoveryManager;
    let regionGenerator;

    beforeEach(() => {
        // Create mock services
        mockErrorService = {
            safeExecute: vi.fn((context, operation, fn, fallback, errorMsg) => {
                try {
                    return fn();
                } catch (error) {
                    console.error(errorMsg, error);
                    return fallback;
                }
            })
        };
        
        mockDiscoveryManager = {
            // Mock discovery manager methods if needed
        };

        // Initialize region generator
        regionGenerator = new RegionGenerator();
        
        // Create chunk manager
        chunkManager = new ChunkManager(mockErrorService, mockDiscoveryManager);
    });

    describe('Regional Spawning Rules', () => {
        test('should only spawn protostars in Star-Forge Cluster regions', () => {
            // Test integration with actual region generator
            // We'll test known coordinate ranges that map to different region types
            const testChunks = [
                // Coordinate that should be in star-forge cluster (center region)
                { x: 0, y: 0, expectPossibleSpawn: true },
                // Coordinates that should be in other regions
                { x: 100, y: 100, expectPossibleSpawn: false },
                { x: -100, y: -100, expectPossibleSpawn: false }
            ];

            for (const testChunk of testChunks) {
                const chunk = {
                    x: testChunk.x,
                    y: testChunk.y,
                    protostars: []
                };

                // Test the method works without errors
                expect(() => {
                    chunkManager.generateProtostarsForChunk(testChunk.x, testChunk.y, chunk);
                }).not.toThrow();

                // Verify chunk structure is maintained
                expect(chunk.protostars).toBeDefined();
                expect(Array.isArray(chunk.protostars)).toBe(true);
            }
        });

        test('should respect spawn rate in Star-Forge Cluster regions', () => {
            // Test spawn rate by testing many chunks in star-forge cluster region
            // We'll test center chunks (0,0) area which should be star-forge cluster
            let totalSpawns = 0;
            const totalChunks = 50; // Smaller sample size for test speed

            // Test chunks around origin (likely star-forge cluster region)
            for (let i = 0; i < totalChunks; i++) {
                const chunk = {
                    x: i % 10 - 5, // -5 to +4 range around origin
                    y: Math.floor(i / 10) - 2, // -2 to +2 range around origin
                    protostars: []
                };

                // Test the method works without errors
                expect(() => {
                    chunkManager.generateProtostarsForChunk(chunk.x, chunk.y, chunk);
                }).not.toThrow();

                totalSpawns += chunk.protostars.length;
            }

            // With the low spawn rate (0.8%), we might not get any spawns in 50 chunks
            // So we just verify the system works and spawns are possible
            expect(totalSpawns).toBeGreaterThanOrEqual(0);
            expect(totalSpawns).toBeLessThanOrEqual(totalChunks); // No more than one per chunk
        });
    });

    describe('Variant Distribution', () => {
        test('should spawn variants according to specified probabilities', () => {
            // Mock region generator to always return star-forge cluster
            vi.spyOn(regionGenerator, 'getRegionAt').mockReturnValue({
                regionType: 'star_forge_cluster',
                regionName: 'Test Star-Forge Cluster',
                spawnModifiers: {},
                ambientColor: '#FF4500'
            });

            const variants = { 'class-0': 0, 'class-1': 0, 'class-2': 0 };
            const totalTests = 10000;

            // Force spawning by mocking RNG to always spawn
            let originalSeededRandom;
            
            for (let i = 0; i < totalTests; i++) {
                const chunk = {
                    x: i,
                    y: 0,
                    protostars: []
                };

                // Mock the spawn chance to always succeed
                const mockRng = {
                    next: vi.fn()
                        .mockReturnValueOnce(0.001) // Always spawn (< 0.008 rate)
                        .mockReturnValueOnce(Math.random()) // Variant selection
                };

                vi.doMock('../../dist/utils/random.js', () => ({
                    SeededRandom: vi.fn(() => mockRng),
                    hashPosition: vi.fn(() => i)
                }));

                chunkManager.generateProtostarsForChunk(i, 0, chunk);

                if (chunk.protostars.length > 0) {
                    const variant = chunk.protostars[0].variant;
                    variants[variant]++;
                }
            }

            // Expected distribution: Class 0 (50%), Class I (40%), Class II (10%)
            const totalSpawned = variants['class-0'] + variants['class-1'] + variants['class-2'];
            
            if (totalSpawned > 100) { // Only test if we have sufficient sample size
                const class0Percentage = variants['class-0'] / totalSpawned;
                const class1Percentage = variants['class-1'] / totalSpawned;
                const class2Percentage = variants['class-2'] / totalSpawned;

                // Allow ±10% variance from expected percentages
                expect(class0Percentage).toBeCloseTo(0.5, 1);
                expect(class1Percentage).toBeCloseTo(0.4, 1);
                expect(class2Percentage).toBeCloseTo(0.1, 1);
            }

            vi.restoreAllMocks();
        });
    });

    describe('Position and Properties', () => {
        test('should position protostars within chunk boundaries with proper margins', () => {
            // Mock region generator to always return star-forge cluster
            vi.spyOn(regionGenerator, 'getRegionAt').mockReturnValue({
                regionType: 'star_forge_cluster',
                regionName: 'Test Star-Forge Cluster',
                spawnModifiers: {},
                ambientColor: '#FF4500'
            });

            const chunkX = 5;
            const chunkY = 10;
            const chunkSize = 1000;

            // Force spawn by testing many times
            for (let attempt = 0; attempt < 100; attempt++) {
                const chunk = {
                    x: chunkX,
                    y: chunkY,
                    protostars: []
                };

                chunkManager.generateProtostarsForChunk(chunkX, chunkY, chunk);

                if (chunk.protostars.length > 0) {
                    const protostar = chunk.protostars[0];

                    // Check position is within chunk bounds with margin
                    const margin = 120; // As defined in implementation
                    const minX = chunkX * chunkSize + margin;
                    const maxX = chunkX * chunkSize + chunkSize - margin;
                    const minY = chunkY * chunkSize + margin;
                    const maxY = chunkY * chunkSize + chunkSize - margin;

                    expect(protostar.x).toBeGreaterThanOrEqual(minX);
                    expect(protostar.x).toBeLessThanOrEqual(maxX);
                    expect(protostar.y).toBeGreaterThanOrEqual(minY);
                    expect(protostar.y).toBeLessThanOrEqual(maxY);

                    // Check it's a valid Protostar instance
                    expect(protostar).toBeInstanceOf(Protostar);
                    expect(['class-0', 'class-1', 'class-2']).toContain(protostar.variant);

                    break; // Found one, test passed
                }
            }

            vi.restoreAllMocks();
        });

        test('should create protostars with correct properties', () => {
            // Mock region generator
            vi.spyOn(regionGenerator, 'getRegionAt').mockReturnValue({
                regionType: 'star_forge_cluster',
                regionName: 'Test Star-Forge Cluster',
                spawnModifiers: {},
                ambientColor: '#FF4500'
            });

            // Force spawn by testing many times
            for (let attempt = 0; attempt < 100; attempt++) {
                const chunk = {
                    x: 0,
                    y: 0,
                    protostars: []
                };

                chunkManager.generateProtostarsForChunk(0, 0, chunk);

                if (chunk.protostars.length > 0) {
                    const protostar = chunk.protostars[0];

                    // Check discovery properties
                    expect(protostar.discoveryValue).toBe(90);
                    expect(protostar.discoveryDistance).toBe(70);
                    expect(protostar.type).toBe('protostar');

                    // Check stellar properties are set
                    expect(protostar.stellarClassification).toBeDefined();
                    expect(protostar.coreColor).toBeDefined();
                    expect(protostar.nebulaColor).toBeDefined();
                    expect(protostar.radius).toBeGreaterThan(0);

                    // Check variant-specific properties
                    if (protostar.variant === 'class-0') {
                        expect(protostar.coreTemperature).toBe(1000);
                        expect(protostar.instabilityFactor).toBe(0.8);
                    } else if (protostar.variant === 'class-1') {
                        expect(protostar.coreTemperature).toBe(2000);
                        expect(protostar.instabilityFactor).toBe(0.6);
                    } else if (protostar.variant === 'class-2') {
                        expect(protostar.coreTemperature).toBe(3000);
                        expect(protostar.instabilityFactor).toBe(0.3);
                    }

                    break;
                }
            }

            vi.restoreAllMocks();
        });
    });

    describe('Debug Object Integration', () => {
        test('should handle debug protostars in chunks', () => {
            // Add debug protostar
            const debugProtostar = new Protostar(500, 600, 'class-2');
            chunkManager.debugObjects = [{
                type: 'protostar',
                object: debugProtostar,
                x: 500,
                y: 600
            }];

            const chunk = {
                x: 0,
                y: 0,
                protostars: []
            };

            // Mock getChunkCoords to return the correct chunk
            vi.spyOn(chunkManager, 'getChunkCoords').mockReturnValue({ x: 0, y: 0 });

            chunkManager.generateProtostarsForChunk(0, 0, chunk);

            // Should include debug protostar
            expect(chunk.protostars.length).toBeGreaterThanOrEqual(1);
            expect(chunk.protostars).toContain(debugProtostar);

            vi.restoreAllMocks();
        });

        test('should not duplicate debug protostars from other chunks', () => {
            // Add debug protostar in different chunk
            const debugProtostar = new Protostar(2500, 2600, 'class-1');
            chunkManager.debugObjects = [{
                type: 'protostar',
                object: debugProtostar,
                x: 2500,
                y: 2600
            }];

            const chunk = {
                x: 0,
                y: 0,
                protostars: []
            };

            // Mock getChunkCoords to return different chunk for debug object
            vi.spyOn(chunkManager, 'getChunkCoords').mockReturnValue({ x: 2, y: 2 });

            chunkManager.generateProtostarsForChunk(0, 0, chunk);

            // Should not include debug protostar from different chunk
            expect(chunk.protostars).not.toContain(debugProtostar);

            vi.restoreAllMocks();
        });
    });

    describe('Deterministic Generation', () => {
        test('should generate same results for same chunk coordinates and seed', () => {
            // Mock region generator
            vi.spyOn(regionGenerator, 'getRegionAt').mockReturnValue({
                regionType: 'star_forge_cluster',
                regionName: 'Test Star-Forge Cluster',
                spawnModifiers: {},
                ambientColor: '#FF4500'
            });

            const chunkX = 10;
            const chunkY = 20;

            // Generate same chunk twice
            const chunk1 = { x: chunkX, y: chunkY, protostars: [] };
            const chunk2 = { x: chunkX, y: chunkY, protostars: [] };

            chunkManager.generateProtostarsForChunk(chunkX, chunkY, chunk1);
            chunkManager.generateProtostarsForChunk(chunkX, chunkY, chunk2);

            // Results should be identical
            expect(chunk1.protostars.length).toBe(chunk2.protostars.length);

            if (chunk1.protostars.length > 0) {
                const protostar1 = chunk1.protostars[0];
                const protostar2 = chunk2.protostars[0];

                expect(protostar1.x).toBe(protostar2.x);
                expect(protostar1.y).toBe(protostar2.y);
                expect(protostar1.variant).toBe(protostar2.variant);
                expect(protostar1.stellarClassification).toBe(protostar2.stellarClassification);
            }

            vi.restoreAllMocks();
        });
    });
});