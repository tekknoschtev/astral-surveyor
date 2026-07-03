import { describe, it, expect } from 'vitest';

// Import from compiled TypeScript
import { ChunkManager } from '../../dist/world/ChunkManager.js';

// Determinism is the core contract of world generation: the same chunk
// coordinates must always produce the same objects, regardless of which
// ChunkManager instance (or play session) generates them.
describe('Chunk generation determinism', () => {
    it('should generate identical chunks from two independent managers', () => {
        const managerA = new ChunkManager();
        const managerB = new ChunkManager();

        // Scan a row of chunks so at least some contain star systems
        for (let chunkX = 0; chunkX < 8; chunkX++) {
            const chunkA = managerA.generateChunk(chunkX, 7);
            const chunkB = managerB.generateChunk(chunkX, 7);

            expect(chunkA.stars.map(s => [s.x, s.y, s.brightness, s.size, s.color]))
                .toEqual(chunkB.stars.map(s => [s.x, s.y, s.brightness, s.size, s.color]));
            expect(chunkA.celestialStars.map(s => [s.x, s.y, s.starTypeName]))
                .toEqual(chunkB.celestialStars.map(s => [s.x, s.y, s.starTypeName]));
            expect(chunkA.planets.map(p => [p.x, p.y, p.planetTypeName]))
                .toEqual(chunkB.planets.map(p => [p.x, p.y, p.planetTypeName]));
            expect(chunkA.moons.length).toBe(chunkB.moons.length);
            expect(chunkA.nebulae.map(n => [n.x, n.y, n.nebulaType]))
                .toEqual(chunkB.nebulae.map(n => [n.x, n.y, n.nebulaType]));
            expect(chunkA.asteroidGardens.map(g => [g.x, g.y, g.gardenType]))
                .toEqual(chunkB.asteroidGardens.map(g => [g.x, g.y, g.gardenType]));
            expect(chunkA.comets.length).toBe(chunkB.comets.length);
        }
    });

    it('should return the cached chunk object on repeat generation', () => {
        const manager = new ChunkManager();
        const first = manager.generateChunk(2, 3);
        const second = manager.generateChunk(2, 3);

        expect(second).toBe(first);
    });

    it('should run registered object generators in the original generation order', () => {
        const manager = new ChunkManager();

        expect(manager.generator.registeredObjectGenerators).toEqual([
            'nebulae',
            'asteroidGardens',
            'wormholes',
            'blackHoles',
            'roguePlanets',
            'darkNebulae',
            'crystalGardens',
            'protostars'
        ]);
    });

    it('should invoke a custom registered generator for each newly generated chunk', () => {
        const manager = new ChunkManager();
        const calls = [];
        manager.generator.registerObjectGenerator({
            name: 'test-objects',
            generate: (chunkX, chunkY, chunk) => calls.push({ chunkX, chunkY, chunk })
        });

        const chunk = manager.generateChunk(4, 5);

        // Wormhole generation can recursively create a remote chunk, so assert
        // on the call for this chunk specifically
        const callForChunk = calls.filter(c => c.chunkX === 4 && c.chunkY === 5);
        expect(callForChunk).toHaveLength(1);
        expect(callForChunk[0].chunk).toBe(chunk);
    });

    it('should not re-run object generators for cached chunks', () => {
        const manager = new ChunkManager();
        const seen = [];
        manager.generator.registerObjectGenerator({
            name: 'counter',
            generate: (chunkX, chunkY) => seen.push(`${chunkX},${chunkY}`)
        });

        manager.generateChunk(6, 6);
        manager.generateChunk(6, 6);

        expect(seen.filter(key => key === '6,6')).toHaveLength(1);
    });

    it('should generate at least one star system across a region of chunks', () => {
        // Guards against a refactor accidentally short-circuiting generation:
        // with ~8% star system chance per chunk, 100 chunks virtually always
        // contain several systems.
        const manager = new ChunkManager();
        let totalCelestialStars = 0;
        for (let chunkX = 0; chunkX < 10; chunkX++) {
            for (let chunkY = 0; chunkY < 10; chunkY++) {
                totalCelestialStars += manager.generateChunk(chunkX, chunkY).celestialStars.length;
            }
        }

        expect(totalCelestialStars).toBeGreaterThan(0);
    });
});
