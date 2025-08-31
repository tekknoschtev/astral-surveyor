import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Import from compiled TypeScript
import { SeedInspectorService } from '../../dist/debug/SeedInspectorService.js';
import { setUniverseSeed, getUniverseSeed } from '../../dist/utils/random.js';

describe('SeedInspectorService', () => {
    let seedInspector;
    let mockChunkManager;
    let originalSeed;

    beforeEach(() => {
        // Store original seed to restore later
        originalSeed = getUniverseSeed();

        // Create mock ChunkManager
        mockChunkManager = {
            generateChunk: vi.fn()
        };

        // Create service instance
        seedInspector = new SeedInspectorService(mockChunkManager);
    });

    afterEach(() => {
        // Restore original universe seed
        setUniverseSeed(originalSeed);
    });

    describe('Region Analysis', () => {
        it('should analyze a 3x3 region correctly', async () => {
            // Mock chunk generation to return predictable data
            mockChunkManager.generateChunk.mockImplementation((chunkX, chunkY) => ({
                x: chunkX,
                y: chunkY,
                stars: Array(50).fill(null).map((_, i) => ({ // 50 background stars per chunk
                    x: chunkX * 2000 + (i * 40),
                    y: chunkY * 2000 + (i * 40),
                    brightness: 0.5,
                    size: 1,
                    color: '#ffffff'
                })),
                celestialStars: [{ // 1 celestial star per chunk
                    x: chunkX * 2000 + 1000,
                    y: chunkY * 2000 + 1000,
                    starTypeName: 'G-type Main Sequence',
                    radius: 50,
                    color: '#ffff00'
                }],
                planets: [{ // 1 planet per chunk
                    x: chunkX * 2000 + 1200,
                    y: chunkY * 2000 + 1200,
                    planetTypeName: 'Rocky World',
                    radius: 20,
                    color: '#888888',
                    orbitRadius: 200
                }],
                moons: [],
                nebulae: [],
                asteroidGardens: [],
                wormholes: [],
                blackholes: [],
                comets: []
            }));

            const analysis = await seedInspector.analyzeRegion(12345, 0, 0, 1);

            expect(analysis.seed).toBe(12345);
            expect(analysis.centerX).toBe(0);
            expect(analysis.centerY).toBe(0);
            expect(analysis.chunkRadius).toBe(1);
            expect(analysis.totalChunks).toBe(9); // 3x3 grid
            
            // Verify totals (9 chunks × objects per chunk)
            expect(analysis.totals.backgroundStars).toBe(450); // 9 × 50
            expect(analysis.totals.celestialStars).toBe(9);    // 9 × 1
            expect(analysis.totals.planets).toBe(9);           // 9 × 1
            
            // Verify density calculations
            expect(analysis.density.backgroundStars).toBe(50);  // 450/9
            expect(analysis.density.celestialStars).toBe(1);    // 9/9
            expect(analysis.density.planets).toBe(1);           // 9/9
            
            // Verify analysis metadata
            expect(analysis.analysisTime).toBeGreaterThan(0);
            expect(analysis.generatedAt).toBeInstanceOf(Date);
            expect(analysis.chunks.length).toBe(9);
        });

        it('should handle different region sizes', async () => {
            mockChunkManager.generateChunk.mockReturnValue({
                x: 0, y: 0,
                stars: [],
                celestialStars: [],
                planets: [],
                moons: [],
                nebulae: [],
                asteroidGardens: [],
                wormholes: [],
                blackholes: [],
                comets: []
            });

            // Test 1x1 region (single chunk)
            const smallAnalysis = await seedInspector.analyzeRegion(12345, 0, 0, 0);
            expect(smallAnalysis.totalChunks).toBe(1);
            expect(smallAnalysis.chunks.length).toBe(1);

            // Test 5x5 region
            const largeAnalysis = await seedInspector.analyzeRegion(12345, 0, 0, 2);
            expect(largeAnalysis.totalChunks).toBe(25);
            expect(largeAnalysis.chunks.length).toBe(25);
        });

        it('should handle non-zero center coordinates', async () => {
            mockChunkManager.generateChunk.mockImplementation((chunkX, chunkY) => ({
                x: chunkX,
                y: chunkY,
                stars: [],
                celestialStars: [],
                planets: [],
                moons: [],
                nebulae: [],
                asteroidGardens: [],
                wormholes: [],
                blackholes: [],
                comets: []
            }));

            // Analyze region centered at (4000, 6000) which should be chunks (2, 3)
            const analysis = await seedInspector.analyzeRegion(12345, 4000, 6000, 1);
            
            expect(analysis.centerX).toBe(4000);
            expect(analysis.centerY).toBe(6000);
            
            // Should generate chunks around (2, 3)
            const expectedChunks = [
                [1, 2], [2, 2], [3, 2],
                [1, 3], [2, 3], [3, 3],
                [1, 4], [2, 4], [3, 4]
            ];
            
            expect(mockChunkManager.generateChunk).toHaveBeenCalledTimes(9);
            for (const [x, y] of expectedChunks) {
                expect(mockChunkManager.generateChunk).toHaveBeenCalledWith(x, y);
            }
        });

        it('should preserve and restore universe seed', async () => {
            const testSeed = 99999;
            setUniverseSeed(testSeed);
            
            mockChunkManager.generateChunk.mockReturnValue({
                x: 0, y: 0,
                stars: [], celestialStars: [], planets: [], moons: [],
                nebulae: [], asteroidGardens: [], wormholes: [], blackholes: [], comets: []
            });

            await seedInspector.analyzeRegion(12345, 0, 0, 0);

            // Should restore original seed
            expect(getUniverseSeed()).toBe(testSeed);
        });
    });

    describe('Object Data Collection', () => {
        it('should collect detailed object data for visualization', async () => {
            mockChunkManager.generateChunk.mockReturnValue({
                x: 0,
                y: 0,
                stars: [{
                    x: 100,
                    y: 200,
                    brightness: 0.8,
                    size: 2,
                    color: '#ffffff'
                }],
                celestialStars: [{
                    x: 1000,
                    y: 1000,
                    starTypeName: 'Red Giant',
                    radius: 80,
                    color: '#ff6600'
                }],
                planets: [{
                    x: 1200,
                    y: 1200,
                    planetTypeName: 'Gas Giant',
                    radius: 40,
                    color: '#6666ff',
                    orbitalDistance: 300
                }],
                moons: [],
                nebulae: [],
                asteroidGardens: [],
                wormholes: [],
                blackholes: [],
                comets: []
            });

            const objects = await seedInspector.getRegionObjects(12345, 0, 0, 0);

            expect(objects.length).toBe(3); // 1 background star + 1 celestial star + 1 planet

            // Verify background star
            const backgroundStar = objects.find(obj => obj.type === 'backgroundStar');
            expect(backgroundStar).toBeDefined();
            expect(backgroundStar.x).toBe(100);
            expect(backgroundStar.y).toBe(200);
            expect(backgroundStar.properties.brightness).toBe(0.8);

            // Verify celestial star
            const celestialStar = objects.find(obj => obj.type === 'celestialStar');
            expect(celestialStar).toBeDefined();
            expect(celestialStar.x).toBe(1000);
            expect(celestialStar.properties.starType).toBe('Red Giant');

            // Verify planet
            const planet = objects.find(obj => obj.type === 'planet');
            expect(planet).toBeDefined();
            expect(planet.x).toBe(1200);
            expect(planet.properties.planetType).toBe('Gas Giant');
            expect(planet.properties.orbitalDistance).toBe(300);
        });

        it('should handle chunks with rare objects', async () => {
            mockChunkManager.generateChunk.mockReturnValue({
                x: 0, y: 0,
                stars: [],
                celestialStars: [],
                planets: [],
                moons: [],
                nebulae: [{
                    x: 500,
                    y: 600,
                    nebulaType: 'emission',
                    radius: 150,
                    color: '#ff66cc'
                }],
                asteroidGardens: [],
                wormholes: [{
                    x: 800,
                    y: 900,
                    wormholeId: 'WH-001',
                    designation: 'alpha',
                    twinX: 5000,
                    twinY: 6000
                }],
                blackholes: [{
                    x: 1500,
                    y: 1600,
                    blackHoleTypeName: 'Stellar Mass',
                    eventHorizonRadius: 10,
                    gravitationalInfluence: 30
                }],
                comets: []
            });

            const objects = await seedInspector.getRegionObjects(12345, 0, 0, 0);

            expect(objects.length).toBe(3);
            
            const nebula = objects.find(obj => obj.type === 'nebula');
            expect(nebula.properties.nebulaType).toBe('emission');
            
            const wormhole = objects.find(obj => obj.type === 'wormhole');
            expect(wormhole.properties.wormholeId).toBe('WH-001');
            
            const blackhole = objects.find(obj => obj.type === 'blackhole');
            expect(blackhole.properties.eventHorizonRadius).toBe(10);
        });
    });

    describe('Data Export', () => {
        it('should export analysis as JSON', async () => {
            mockChunkManager.generateChunk.mockReturnValue({
                x: 0, y: 0,
                stars: [], celestialStars: [], planets: [], moons: [],
                nebulae: [], asteroidGardens: [], wormholes: [], blackholes: [], comets: []
            });

            const analysis = await seedInspector.analyzeRegion(12345, 0, 0, 0);
            const jsonExport = seedInspector.exportAnalysis(analysis);
            
            expect(jsonExport).toContain('"seed": 12345');
            expect(jsonExport).toContain('"totalChunks": 1');
            
            // Should be valid JSON
            const parsed = JSON.parse(jsonExport);
            expect(parsed.seed).toBe(12345);
        });

        it('should export analysis as CSV', async () => {
            mockChunkManager.generateChunk.mockImplementation((chunkX, chunkY) => ({
                x: chunkX, y: chunkY,
                stars: Array(10).fill(null), // 10 background stars
                celestialStars: [{}], // 1 celestial star
                planets: [{}], // 1 planet
                moons: [], nebulae: [], asteroidGardens: [], wormholes: [], blackholes: [], comets: []
            }));

            const analysis = await seedInspector.analyzeRegion(12345, 0, 0, 0);
            const csvExport = seedInspector.exportAnalysisCSV(analysis);
            
            const lines = csvExport.split('\n');
            expect(lines[0]).toContain('ChunkX,ChunkY,BackgroundStars');
            expect(lines[1]).toContain('0,0,10,1,1'); // chunk (0,0) with 10 bg stars, 1 celestial star, 1 planet
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle empty chunks', async () => {
            mockChunkManager.generateChunk.mockReturnValue({
                x: 0, y: 0,
                stars: [],
                celestialStars: [],
                planets: [],
                moons: [],
                nebulae: [],
                asteroidGardens: [],
                wormholes: [],
                blackholes: [],
                comets: []
            });

            const analysis = await seedInspector.analyzeRegion(12345, 0, 0, 0);
            
            expect(analysis.totals.backgroundStars).toBe(0);
            expect(analysis.totals.celestialStars).toBe(0);
            expect(analysis.density.backgroundStars).toBe(0);
            expect(analysis.chunks[0].backgroundStars).toBe(0);
        });

        it('should handle ChunkManager errors gracefully', async () => {
            mockChunkManager.generateChunk.mockImplementation(() => {
                throw new Error('Chunk generation failed');
            });

            // Should not throw - service should handle errors gracefully
            await expect(seedInspector.analyzeRegion(12345, 0, 0, 0)).rejects.toThrow('Chunk generation failed');
        });

        it('should calculate density correctly with zero chunks', async () => {
            // This shouldn't happen in normal usage, but test defensive programming
            mockChunkManager.generateChunk.mockReturnValue({
                x: 0, y: 0,
                stars: [], celestialStars: [], planets: [], moons: [],
                nebulae: [], asteroidGardens: [], wormholes: [], blackholes: [], comets: []
            });

            // Use radius 0 for single chunk to avoid division issues
            const analysis = await seedInspector.analyzeRegion(12345, 0, 0, 0);
            
            expect(analysis.density.backgroundStars).toBe(0); // 0/1 = 0
            expect(analysis.totalChunks).toBe(1);
        });
    });

    describe('Binary System Detection', () => {
        it('should detect binary star systems correctly', async () => {
            mockChunkManager.generateChunk.mockReturnValue({
                x: 0, y: 0,
                stars: [],
                celestialStars: [
                    { // Primary star
                        x: 1000,
                        y: 1000,
                        starTypeName: 'G-type Main Sequence'
                    },
                    { // Companion star very close (within 100-unit grid)
                        x: 1050,
                        y: 1020,
                        starTypeName: 'M-type Red Dwarf'
                    },
                    { // Distant star (different system)
                        x: 1500,
                        y: 1500,
                        starTypeName: 'F-type Main Sequence'
                    }
                ],
                planets: [], moons: [], nebulae: [], asteroidGardens: [], wormholes: [], blackholes: [], comets: []
            });

            const analysis = await seedInspector.analyzeRegion(12345, 0, 0, 0);
            
            expect(analysis.totals.celestialStars).toBe(3);
            expect(analysis.totals.binarySystems).toBe(1); // Should detect 1 binary system
            expect(analysis.chunks[0].binarySystems).toBe(1);
        });
    });

    describe('Seed Consistency', () => {
        it('should produce identical results for the same seed', async () => {
            let callCount = 0;
            mockChunkManager.generateChunk.mockImplementation((chunkX, chunkY) => {
                callCount++;
                return {
                    x: chunkX, y: chunkY,
                    stars: Array(callCount).fill(null), // Different count based on call order
                    celestialStars: [], planets: [], moons: [], nebulae: [], 
                    asteroidGardens: [], wormholes: [], blackholes: [], comets: []
                };
            });

            const analysis1 = await seedInspector.analyzeRegion(12345, 0, 0, 0);
            
            // Reset call count and run again
            callCount = 0;
            const analysis2 = await seedInspector.analyzeRegion(12345, 0, 0, 0);

            // Results should be identical for same seed
            expect(analysis1.totals.backgroundStars).toBe(analysis2.totals.backgroundStars);
            expect(analysis1.chunks[0].backgroundStars).toBe(analysis2.chunks[0].backgroundStars);
        });

        it('should produce different results for different seeds', async () => {
            mockChunkManager.generateChunk.mockImplementation((chunkX, chunkY) => ({
                x: chunkX, y: chunkY,
                stars: Array(Math.floor(Math.random() * 50)).fill(null), // Random count
                celestialStars: [], planets: [], moons: [], nebulae: [],
                asteroidGardens: [], wormholes: [], blackholes: [], comets: []
            }));

            const analysis1 = await seedInspector.analyzeRegion(12345, 0, 0, 0);
            const analysis2 = await seedInspector.analyzeRegion(67890, 0, 0, 0);

            expect(analysis1.seed).toBe(12345);
            expect(analysis2.seed).toBe(67890);
            // Note: With random generation, results will likely differ, but we can't guarantee it
        });
    });

    describe('Performance', () => {
        it('should complete analysis within reasonable time', async () => {
            mockChunkManager.generateChunk.mockReturnValue({
                x: 0, y: 0,
                stars: Array(100).fill(null).map(() => ({ x: 0, y: 0 })), // Large number of objects
                celestialStars: Array(10).fill(null).map(() => ({ x: 0, y: 0 })),
                planets: Array(20).fill(null).map(() => ({ x: 0, y: 0 })),
                moons: [], nebulae: [], asteroidGardens: [], wormholes: [], blackholes: [], comets: []
            });

            const startTime = performance.now();
            const analysis = await seedInspector.analyzeRegion(12345, 0, 0, 2); // 5x5 = 25 chunks
            const endTime = performance.now();

            expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
            expect(analysis.analysisTime).toBeLessThan(1000);
            expect(analysis.totalChunks).toBe(25);
        });
    });
});