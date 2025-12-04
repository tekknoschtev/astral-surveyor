// Procedural Generation Consistency Integration Test
// Tests that procedural generation is deterministic and consistent

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChunkManager } from '../../dist/world/ChunkManager.js';
import { SeededRandom, setUniverseSeed } from '../../dist/utils/random.js';

describe('Procedural Generation Consistency', () => {
    beforeEach(() => {
        // Reset universe seed before each test
        setUniverseSeed(12345);
    });

    describe('Deterministic Chunk Generation', () => {
        it('should generate identical chunks with same seed', () => {
            const seed = 12345;
            setUniverseSeed(seed);

            const manager1 = new ChunkManager();
            const chunk1 = manager1.generateChunk(0, 0);

            // Create new manager with same seed
            setUniverseSeed(seed);
            const manager2 = new ChunkManager();
            const chunk2 = manager2.generateChunk(0, 0);

            // Chunks should have identical content
            expect(chunk1.stars.length).toBe(chunk2.stars.length);
            expect(chunk1.celestialStars.length).toBe(chunk2.celestialStars.length);
            expect(chunk1.planets.length).toBe(chunk2.planets.length);

            // First background star should be at same position
            if (chunk1.stars.length > 0) {
                expect(chunk1.stars[0].x).toBeCloseTo(chunk2.stars[0].x, 1);
                expect(chunk1.stars[0].y).toBeCloseTo(chunk2.stars[0].y, 1);
                expect(chunk1.stars[0].brightness).toBeCloseTo(chunk2.stars[0].brightness, 3);
                expect(chunk1.stars[0].color).toBe(chunk2.stars[0].color);
            }

            // Celestial stars should match exactly
            if (chunk1.celestialStars.length > 0 && chunk2.celestialStars.length > 0) {
                expect(chunk1.celestialStars[0].x).toBe(chunk2.celestialStars[0].x);
                expect(chunk1.celestialStars[0].y).toBe(chunk2.celestialStars[0].y);
                expect(chunk1.celestialStars[0].starTypeName).toBe(chunk2.celestialStars[0].starTypeName);
            }
        });

        it('should generate same chunk multiple times from same manager', () => {
            const manager = new ChunkManager();

            const chunk1 = manager.generateChunk(5, 5);
            const chunk2 = manager.generateChunk(5, 5);

            // Should return cached chunk (same instance)
            expect(chunk1).toBe(chunk2);
        });

        it('should generate different content for different chunk coordinates', () => {
            const manager = new ChunkManager();

            const chunk1 = manager.generateChunk(0, 0);
            const chunk2 = manager.generateChunk(1, 1);

            // Different chunks should have different content
            const chunk1FirstStar = chunk1.stars[0];
            const chunk2FirstStar = chunk2.stars[0];

            expect(chunk1FirstStar.x).not.toBe(chunk2FirstStar.x);
            expect(chunk1FirstStar.y).not.toBe(chunk2FirstStar.y);
        });

        it('should maintain consistency across universe reload', () => {
            const seed = 98765;

            // First session
            setUniverseSeed(seed);
            const manager1 = new ChunkManager();
            const chunk1 = manager1.generateChunk(2, 3);
            const firstCelestialCount = chunk1.celestialStars.length;
            const firstCelestialStar = chunk1.celestialStars.length > 0 ? chunk1.celestialStars[0] : null;

            // Simulate game restart
            setUniverseSeed(seed);
            const manager2 = new ChunkManager();
            const chunk2 = manager2.generateChunk(2, 3);

            // Should have same number of celestial stars
            expect(chunk2.celestialStars.length).toBe(firstCelestialCount);

            // First celestial star should be identical (if it exists)
            if (firstCelestialStar && chunk2.celestialStars.length > 0) {
                const secondCelestialStar = chunk2.celestialStars[0];
                expect(secondCelestialStar.x).toBe(firstCelestialStar.x);
                expect(secondCelestialStar.y).toBe(firstCelestialStar.y);
                expect(secondCelestialStar.starTypeName).toBe(firstCelestialStar.starTypeName);
                expect(secondCelestialStar.radius).toBe(firstCelestialStar.radius);
            }
        });
    });

    describe('Star System Consistency', () => {
        it('should generate consistent star types for same position', () => {
            const seed = 11111;
            setUniverseSeed(seed);

            const manager1 = new ChunkManager();
            const chunk1 = manager1.generateChunk(10, 10);

            setUniverseSeed(seed);
            const manager2 = new ChunkManager();
            const chunk2 = manager2.generateChunk(10, 10);

            // All celestial stars should match
            expect(chunk1.celestialStars.length).toBe(chunk2.celestialStars.length);

            for (let i = 0; i < chunk1.celestialStars.length; i++) {
                const star1 = chunk1.celestialStars[i];
                const star2 = chunk2.celestialStars[i];

                expect(star2.x).toBe(star1.x);
                expect(star2.y).toBe(star1.y);
                expect(star2.starTypeName).toBe(star1.starTypeName);
                expect(star2.radius).toBe(star1.radius);
                expect(star2.color).toBe(star1.color);
            }
        });

        it('should generate consistent planetary systems', () => {
            const seed = 22222;
            setUniverseSeed(seed);

            const manager1 = new ChunkManager();
            const chunk1 = manager1.generateChunk(15, 15);
            const planets1 = chunk1.planets;

            setUniverseSeed(seed);
            const manager2 = new ChunkManager();
            const chunk2 = manager2.generateChunk(15, 15);
            const planets2 = chunk2.planets;

            expect(planets1.length).toBe(planets2.length);

            // Compare first few planets if they exist
            const compareCount = Math.min(3, planets1.length);
            for (let i = 0; i < compareCount; i++) {
                const planet1 = planets1[i];
                const planet2 = planets2[i];

                expect(planet2.planetTypeName).toBe(planet1.planetTypeName);
                expect(planet2.orbitalDistance).toBeCloseTo(planet1.orbitalDistance, 1);
                expect(planet2.planetIndex).toBe(planet1.planetIndex);
            }
        });
    });

    describe('Seeded Random Generator', () => {
        it('should produce identical sequences for same seed', () => {
            const rng1 = new SeededRandom(12345);
            const rng2 = new SeededRandom(12345);

            const values1 = [];
            const values2 = [];

            for (let i = 0; i < 10; i++) {
                values1.push(rng1.next());
                values2.push(rng2.next());
            }

            expect(values1).toEqual(values2);
        });

        it('should produce different sequences for different seeds', () => {
            const rng1 = new SeededRandom(11111);
            const rng2 = new SeededRandom(22222);

            const values1 = [];
            const values2 = [];

            for (let i = 0; i < 10; i++) {
                values1.push(rng1.next());
                values2.push(rng2.next());
            }

            expect(values1).not.toEqual(values2);
        });

        it('should be deterministic across multiple calls', () => {
            const seed = 33333;

            // First run
            const rng1 = new SeededRandom(seed);
            const firstValue = rng1.next();

            // Second run with same seed
            const rng2 = new SeededRandom(seed);
            const secondValue = rng2.next();

            expect(secondValue).toBe(firstValue);
        });
    });

    describe('Chunk Re-Entry Consistency', () => {
        it('should generate same chunk content when re-entering area', () => {
            const manager = new ChunkManager();

            // First visit to chunks
            manager.updateActiveChunks(0, 0);
            const chunk1First = manager.generateChunk(0, 0);
            const starCount1 = chunk1First.celestialStars.length;

            // Move away (far enough to potentially clear cache)
            manager.updateActiveChunks(10000, 10000);

            // Return to original area
            manager.updateActiveChunks(0, 0);
            const chunk1Second = manager.generateChunk(0, 0);

            // Celestial objects should be consistent (main discovery objects)
            expect(chunk1Second.celestialStars.length).toBe(starCount1);

            // If there are celestial stars, verify they match
            if (starCount1 > 0) {
                expect(chunk1Second.celestialStars[0].x).toBe(chunk1First.celestialStars[0].x);
                expect(chunk1Second.celestialStars[0].y).toBe(chunk1First.celestialStars[0].y);
                expect(chunk1Second.celestialStars[0].starTypeName).toBe(chunk1First.celestialStars[0].starTypeName);
            }

            // Background stars may be regenerated, but important objects should match
            expect(chunk1Second.planets.length).toBe(chunk1First.planets.length);
            expect(chunk1Second.wormholes.length).toBe(chunk1First.wormholes.length);
        });

        it('should maintain object IDs across chunk reloads', () => {
            const manager = new ChunkManager();

            // Generate chunk
            const chunk1 = manager.generateChunk(5, 5);

            // Get first celestial star's ID
            if (chunk1.celestialStars.length > 0) {
                const star = chunk1.celestialStars[0];
                const objectId1 = manager.getObjectId(star.x, star.y, 'star', star);

                // Generate same chunk again (should be cached)
                const chunk2 = manager.generateChunk(5, 5);
                const star2 = chunk2.celestialStars[0];
                const objectId2 = manager.getObjectId(star2.x, star2.y, 'star', star2);

                expect(objectId2).toBe(objectId1);
            }
        });
    });

    describe('Object Property Consistency', () => {
        it('should not change celestial object properties on reload', () => {
            const seed = 44444;
            setUniverseSeed(seed);

            const manager1 = new ChunkManager();
            const chunk1 = manager1.generateChunk(7, 8);

            // Capture properties of first celestial star (if exists)
            if (chunk1.celestialStars.length === 0) {
                // Skip test if no celestial stars in this chunk
                return;
            }

            const originalStar = chunk1.celestialStars[0];
            const originalProps = {
                x: originalStar.x,
                y: originalStar.y,
                starTypeName: originalStar.starTypeName,
                radius: originalStar.radius,
                color: originalStar.color
            };

            // Reload with same seed
            setUniverseSeed(seed);
            const manager2 = new ChunkManager();
            const chunk2 = manager2.generateChunk(7, 8);

            // Should have celestial stars in reloaded chunk
            expect(chunk2.celestialStars.length).toBeGreaterThan(0);
            const reloadedStar = chunk2.celestialStars[0];

            // All properties should match exactly
            expect(reloadedStar.x).toBe(originalProps.x);
            expect(reloadedStar.y).toBe(originalProps.y);
            expect(reloadedStar.starTypeName).toBe(originalProps.starTypeName);
            expect(reloadedStar.radius).toBe(originalProps.radius);
            expect(reloadedStar.color).toBe(originalProps.color);
        });

        it('should maintain planet orbital parameters across reloads', () => {
            const seed = 55555;
            setUniverseSeed(seed);

            const manager1 = new ChunkManager();
            const chunk1 = manager1.generateChunk(12, 13);
            const originalPlanets = chunk1.planets.slice(0, 2); // First two planets

            setUniverseSeed(seed);
            const manager2 = new ChunkManager();
            const chunk2 = manager2.generateChunk(12, 13);
            const reloadedPlanets = chunk2.planets.slice(0, 2);

            expect(reloadedPlanets.length).toBe(originalPlanets.length);

            for (let i = 0; i < originalPlanets.length; i++) {
                const original = originalPlanets[i];
                const reloaded = reloadedPlanets[i];

                expect(reloaded.planetTypeName).toBe(original.planetTypeName);
                expect(reloaded.orbitalDistance).toBeCloseTo(original.orbitalDistance, 1);
                expect(reloaded.orbitalSpeed).toBeCloseTo(original.orbitalSpeed, 3);
                expect(reloaded.orbitalAngle).toBeCloseTo(original.orbitalAngle, 3);
            }
        });
    });

    describe('Large-Scale Consistency', () => {
        it('should maintain consistency across multiple chunks', () => {
            const seed = 66666;
            setUniverseSeed(seed);

            const manager1 = new ChunkManager();
            const chunks1 = [
                manager1.generateChunk(0, 0),
                manager1.generateChunk(1, 0),
                manager1.generateChunk(0, 1),
                manager1.generateChunk(1, 1)
            ];

            setUniverseSeed(seed);
            const manager2 = new ChunkManager();
            const chunks2 = [
                manager2.generateChunk(0, 0),
                manager2.generateChunk(1, 0),
                manager2.generateChunk(0, 1),
                manager2.generateChunk(1, 1)
            ];

            // All chunks should have consistent content
            for (let i = 0; i < 4; i++) {
                expect(chunks2[i].celestialStars.length).toBe(chunks1[i].celestialStars.length);
                expect(chunks2[i].stars.length).toBe(chunks1[i].stars.length);
            }
        });

        it('should handle negative chunk coordinates consistently', () => {
            const seed = 77777;
            setUniverseSeed(seed);

            const manager1 = new ChunkManager();
            const chunk1 = manager1.generateChunk(-5, -5);

            setUniverseSeed(seed);
            const manager2 = new ChunkManager();
            const chunk2 = manager2.generateChunk(-5, -5);

            expect(chunk2.celestialStars.length).toBe(chunk1.celestialStars.length);

            if (chunk1.celestialStars.length > 0 && chunk2.celestialStars.length > 0) {
                expect(chunk2.celestialStars[0].x).toBe(chunk1.celestialStars[0].x);
                expect(chunk2.celestialStars[0].y).toBe(chunk1.celestialStars[0].y);
            }
        });
    });
});
