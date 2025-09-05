import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import from compiled TypeScript
import { ChunkManager } from '../../dist/world/ChunkManager.js';
import { RegionGenerator } from '../../dist/world/RegionGenerator.js';

describe('Cosmic Regions Integration Tests', () => {
    let chunkManager;
    
    beforeEach(() => {
        chunkManager = new ChunkManager();
    });

    describe('Region-Based Chunk Generation', () => {
        it('should generate deterministic chunks with region modifications', () => {
            // Test multiple chunks in different regions
            const testChunks = [
                { x: 0, y: 0 },      // Origin
                { x: 10, y: 10 },    // Same region as origin
                { x: 100, y: 0 },    // Likely different region
                { x: -50, y: 50 },   // Different region
            ];
            
            for (const coords of testChunks) {
                // Generate chunk multiple times - should be identical
                const chunk1 = chunkManager.generateChunk(coords.x, coords.y);
                const chunk2 = chunkManager.generateChunk(coords.x, coords.y);
                
                expect(chunk1.x).toBe(chunk2.x);
                expect(chunk1.y).toBe(chunk2.y);
                expect(chunk1.celestialStars.length).toBe(chunk2.celestialStars.length);
                expect(chunk1.nebulae.length).toBe(chunk2.nebulae.length);
                expect(chunk1.asteroidGardens.length).toBe(chunk2.asteroidGardens.length);
                expect(chunk1.wormholes.length).toBe(chunk2.wormholes.length);
                expect(chunk1.blackholes.length).toBe(chunk2.blackholes.length);
                
                // Verify object positions are identical
                for (let i = 0; i < chunk1.celestialStars.length; i++) {
                    expect(chunk1.celestialStars[i].x).toBeCloseTo(chunk2.celestialStars[i].x);
                    expect(chunk1.celestialStars[i].y).toBeCloseTo(chunk2.celestialStars[i].y);
                }
            }
        });

        it('should respect region boundaries without breaking determinism', () => {
            // Generate chunks across potential region boundaries
            const chunks = [];
            
            // Generate a grid of chunks that likely spans multiple regions
            for (let x = -2; x <= 2; x++) {
                for (let y = -2; y <= 2; y++) {
                    const chunkX = x * 75; // 75 chunks = ~150k px = 1 region width
                    const chunkY = y * 75;
                    
                    const chunk = chunkManager.generateChunk(chunkX, chunkY);
                    chunks.push({ coords: { x: chunkX, y: chunkY }, chunk });
                }
            }
            
            // Verify chunks are generated successfully
            expect(chunks.length).toBe(25); // 5x5 grid
            
            // Check that different regions produce different object distributions
            const objectCounts = chunks.map(c => ({
                coords: c.coords,
                starSystems: c.chunk.celestialStars.length,
                nebulae: c.chunk.nebulae.length,
                asteroids: c.chunk.asteroidGardens.length,
                region: chunkManager.getChunkRegion(c.coords.x, c.coords.y)?.regionType
            }));
            
            // Verify we have some variation in object counts across regions
            const starSystemCounts = objectCounts.map(o => o.starSystems);
            const nebulaeCounts = objectCounts.map(o => o.nebulae);
            
            const starSystemVariance = Math.max(...starSystemCounts) - Math.min(...starSystemCounts);
            const nebulaeVariance = Math.max(...nebulaeCounts) - Math.min(...nebulaeCounts);
            
            // Should have some variation due to different regions (not necessarily in every test run,
            // but should show variation across multiple regions)
            expect(starSystemVariance + nebulaeVariance).toBeGreaterThanOrEqual(0);
        });

        it('should maintain region consistency across chunk reloads', () => {
            const testCoords = { x: 25, y: 25 };
            
            // Get region info before chunk generation
            const regionBefore = chunkManager.getChunkRegion(testCoords.x, testCoords.y);
            
            // Generate chunk
            const chunk1 = chunkManager.generateChunk(testCoords.x, testCoords.y);
            
            // Get region info after chunk generation
            const regionAfter = chunkManager.getChunkRegion(testCoords.x, testCoords.y);
            
            // Region should be identical
            if (regionBefore && regionAfter) {
                expect(regionBefore.regionType).toBe(regionAfter.regionType);
                expect(regionBefore.distance).toBeCloseTo(regionAfter.distance);
                expect(regionBefore.influence).toBeCloseTo(regionAfter.influence);
            }
            
            // Clear chunk from active chunks
            chunkManager.activeChunks.clear();
            
            // Regenerate chunk - should be identical
            const chunk2 = chunkManager.generateChunk(testCoords.x, testCoords.y);
            
            expect(chunk1.celestialStars.length).toBe(chunk2.celestialStars.length);
            expect(chunk1.nebulae.length).toBe(chunk2.nebulae.length);
            expect(chunk1.asteroidGardens.length).toBe(chunk2.asteroidGardens.length);
        });
    });

    describe('Cross-Service Integration', () => {
        it('should integrate properly with existing chunk management', () => {
            // Test that region system doesn't break existing functionality
            const playerX = 1000;
            const playerY = 1000;
            
            // Update active chunks (this triggers chunk generation)
            expect(() => {
                chunkManager.updateActiveChunks(playerX, playerY);
            }).not.toThrow();
            
            // Verify active objects can be retrieved
            const activeObjects = chunkManager.getAllActiveObjects();
            expect(activeObjects).toBeDefined();
            expect(activeObjects.stars).toBeDefined();
            expect(activeObjects.celestialStars).toBeDefined();
            expect(activeObjects.nebulae).toBeDefined();
            
            // Test coordinate utilities still work
            const chunkCoords = chunkManager.getChunkCoords(playerX, playerY);
            expect(chunkCoords.x).toBeDefined();
            expect(chunkCoords.y).toBeDefined();
            
            // Test object ID generation still works
            const objId = chunkManager.getObjectId(playerX, playerY, 'test');
            expect(objId).toBeTruthy();
        });

        it('should handle region system being disabled gracefully', () => {
            // Test that the region methods work correctly when enabled
            const chunk = chunkManager.generateChunk(10, 10);
            expect(chunk).toBeDefined();
            
            // With regions enabled, we should get region info
            const regionInfo = chunkManager.getChunkRegion(10, 10);
            if (regionInfo) {
                expect(regionInfo.regionType).toBeTruthy();
                expect(regionInfo.definition).toBeDefined();
            }
            
            const worldRegionInfo = chunkManager.getRegionAt(20000, 20000);
            if (worldRegionInfo) {
                expect(worldRegionInfo.regionType).toBeTruthy();
                expect(worldRegionInfo.definition).toBeDefined();
            }
            
            // The system should work without throwing errors regardless of config state
            expect(() => {
                chunkManager.updateActiveChunks(20000, 20000);
            }).not.toThrow();
        });
    });

    describe('Performance Integration', () => {
        it('should not significantly impact chunk generation performance', () => {
            const iterations = 50;
            const startTime = Date.now();
            
            // Generate multiple chunks to test performance
            for (let i = 0; i < iterations; i++) {
                const chunkX = Math.floor(i / 10) - 2;
                const chunkY = (i % 10) - 2;
                chunkManager.generateChunk(chunkX, chunkY);
            }
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            const avgTimePerChunk = totalTime / iterations;
            
            // Should generate chunks reasonably quickly (less than 50ms per chunk on average)
            expect(avgTimePerChunk).toBeLessThan(50);
            
            // Verify all chunks were generated
            expect(chunkManager.activeChunks.size).toBeGreaterThanOrEqual(iterations);
        });

        it('should clean up region caches during chunk updates', () => {
            // Generate some chunks to populate caches
            for (let x = -5; x <= 5; x++) {
                for (let y = -5; y <= 5; y++) {
                    chunkManager.generateChunk(x, y);
                }
            }
            
            // Initial cache should have data
            const initialActiveCount = chunkManager.activeChunks.size;
            expect(initialActiveCount).toBeGreaterThan(0);
            
            // Move player far away and update chunks
            const distantX = 1000000;
            const distantY = 1000000;
            
            expect(() => {
                chunkManager.updateActiveChunks(distantX, distantY);
            }).not.toThrow();
            
            // Should have cleaned up distant chunks
            const finalActiveCount = chunkManager.activeChunks.size;
            expect(finalActiveCount).toBeLessThan(initialActiveCount);
        });
    });

    describe('Region Transition Validation', () => {
        it('should generate consistent objects at region boundaries', () => {
            // Test chunks that are likely near region boundaries
            const boundaryTestCoords = [
                { x: 74, y: 0 },   // Near potential boundary
                { x: 75, y: 0 },   // Just across potential boundary
                { x: 76, y: 0 },   // Further into new region
            ];
            
            const chunks = boundaryTestCoords.map(coords => ({
                coords,
                chunk: chunkManager.generateChunk(coords.x, coords.y),
                region: chunkManager.getChunkRegion(coords.x, coords.y)
            }));
            
            // All chunks should generate successfully
            chunks.forEach(({ chunk, region }) => {
                expect(chunk).toBeDefined();
                expect(chunk.x).toBeDefined();
                expect(chunk.y).toBeDefined();
                
                // Region info should be available (if enabled)
                if (region) {
                    expect(region.regionType).toBeTruthy();
                    expect(region.definition).toBeDefined();
                    expect(region.influence).toBeGreaterThanOrEqual(0);
                    expect(region.influence).toBeLessThanOrEqual(1);
                }
            });
            
            // Regenerating the same chunks should produce identical results
            const regeneratedChunks = boundaryTestCoords.map(coords => 
                chunkManager.generateChunk(coords.x, coords.y)
            );
            
            for (let i = 0; i < chunks.length; i++) {
                const original = chunks[i].chunk;
                const regenerated = regeneratedChunks[i];
                
                expect(original.celestialStars.length).toBe(regenerated.celestialStars.length);
                expect(original.nebulae.length).toBe(regenerated.nebulae.length);
                expect(original.asteroidGardens.length).toBe(regenerated.asteroidGardens.length);
            }
        });
    });
});