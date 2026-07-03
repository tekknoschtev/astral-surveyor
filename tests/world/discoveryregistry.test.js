import { describe, it, expect, beforeEach } from 'vitest';

// Import from compiled TypeScript
import { DiscoveryRegistry } from '../../dist/world/DiscoveryRegistry.js';
import { ChunkManager } from '../../dist/world/ChunkManager.js';

function createEmptyChunk() {
    return {
        stars: [],
        planets: [],
        moons: [],
        celestialStars: [],
        nebulae: [],
        asteroidGardens: [],
        wormholes: [],
        blackholes: [],
        comets: [],
        roguePlanets: [],
        darkNebulae: [],
        crystalGardens: [],
        protostars: []
    };
}

function createChunkSource(chunks = []) {
    const activeChunks = new Map();
    chunks.forEach((chunk, i) => activeChunks.set(`${i},0`, chunk));
    return {
        chunkSize: 1000,
        activeChunks,
        selectStarType: () => ({ name: 'G-Type Star' })
    };
}

describe('DiscoveryRegistry', () => {
    let registry;

    beforeEach(() => {
        registry = new DiscoveryRegistry(createChunkSource());
    });

    describe('Object ID generation', () => {
        it('should generate position-based IDs for regular objects', () => {
            expect(registry.getObjectId(150.9, 20.1, 'star')).toBe('star_150_20');
        });

        it('should floor negative coordinates consistently', () => {
            expect(registry.getObjectId(-10.5, -0.2, 'nebula')).toBe('nebula_-11_-1');
        });

        it('should use parent star position and planet index for planets', () => {
            const planet = {
                type: 'planet',
                x: 320.5,
                y: 410.7,
                parentStar: { x: 300.2, y: 400.9 },
                planetIndex: 1
            };
            expect(registry.getObjectId(planet.x, planet.y, 'planet', planet)).toBe('planet_300_400_planet_1');
        });

        it('should use parent planet position and moon index for moons', () => {
            const moon = {
                type: 'moon',
                x: 322.0,
                y: 412.0,
                parentPlanet: { x: 320.5, y: 410.7 },
                moonIndex: 0
            };
            expect(registry.getObjectId(moon.x, moon.y, 'moon', moon)).toBe('moon_320_410_moon_0');
        });

        it('should include designation for wormholes', () => {
            const wormhole = { type: 'wormhole', x: 100.3, y: 200.8, designation: 'alpha' };
            expect(registry.getObjectId(wormhole.x, wormhole.y, 'wormhole', wormhole)).toBe('wormhole_100_200_alpha');
        });

        it('should include comet index for comets', () => {
            const comet = { type: 'comet', x: 700.5, y: 800.5, cometIndex: 2 };
            expect(registry.getObjectId(comet.x, comet.y, 'comet', comet)).toBe('comet_700_800_2');
        });
    });

    describe('Marking and checking discoveries', () => {
        it('should mark an object discovered and report it as discovered', () => {
            const star = { type: 'star', x: 100, y: 200, starTypeName: 'Red Dwarf' };
            expect(registry.isObjectDiscovered(star)).toBe(false);

            registry.markObjectDiscovered(star, 'ASV-1234');

            expect(star.discovered).toBe(true);
            expect(registry.isObjectDiscovered(star)).toBe(true);
        });

        it('should store type-specific data for persistent display', () => {
            const star = { type: 'star', x: 100, y: 200, starTypeName: 'Red Dwarf' };
            registry.markObjectDiscovered(star, 'ASV-1234');

            const data = registry.discoveredObjects.get('star_100_200');
            expect(data.discovered).toBe(true);
            expect(data.starTypeName).toBe('Red Dwarf');
            expect(data.objectName).toBe('ASV-1234');
            expect(typeof data.timestamp).toBe('number');
        });

        it('should restore discovered flags on regenerated objects', () => {
            const star = { type: 'star', x: 100, y: 200, starTypeName: 'Red Dwarf' };
            registry.markObjectDiscovered(star);

            // Simulate the object being regenerated when its chunk reloads
            const regenerated = { type: 'star', x: 100, y: 200, starTypeName: 'Red Dwarf', discovered: false };
            const other = { type: 'star', x: 900, y: 900, starTypeName: 'Blue Giant', discovered: false };
            registry.restoreDiscoveryState([regenerated, other]);

            expect(regenerated.discovered).toBe(true);
            expect(other.discovered).toBe(false);
        });
    });

    describe('getDiscoveredStars', () => {
        it('should use live star data when the star is in an active chunk', () => {
            const chunk = createEmptyChunk();
            chunk.celestialStars.push({ x: 100.4, y: 200.6, starTypeName: 'Red Dwarf' });
            registry = new DiscoveryRegistry(createChunkSource([chunk]));

            registry.markObjectDiscovered({ type: 'star', x: 100.4, y: 200.6, starTypeName: 'Red Dwarf' });

            const stars = registry.getDiscoveredStars();
            expect(stars).toHaveLength(1);
            expect(stars[0].x).toBe(100.4);
            expect(stars[0].starTypeName).toBe('Red Dwarf');
        });

        it('should reconstruct from stored data when chunk is not loaded', () => {
            registry.markObjectDiscovered({ type: 'star', x: 1500, y: 2500, starTypeName: 'Blue Giant' });

            const stars = registry.getDiscoveredStars();
            expect(stars).toHaveLength(1);
            expect(stars[0].x).toBe(1500);
            expect(stars[0].starTypeName).toBe('Blue Giant');
        });

        it('should fall back to deterministic regeneration when no type was stored', () => {
            // Old saves may lack starTypeName in discovery data
            registry.markObjectDiscovered({ type: 'star', x: 1500, y: 2500 });

            const stars = registry.getDiscoveredStars();
            expect(stars).toHaveLength(1);
            expect(stars[0].starTypeName).toBe('G-Type Star');
        });
    });

    describe('getDiscoveredPlanets', () => {
        it('should reconstruct planets from stored data when chunk is not loaded', () => {
            const planet = {
                type: 'planet',
                x: 320.5,
                y: 410.7,
                parentStar: { x: 300.2, y: 400.9 },
                planetIndex: 1,
                planetTypeName: 'Rocky Planet'
            };
            registry.markObjectDiscovered(planet, 'ASV-5678 b');

            const planets = registry.getDiscoveredPlanets();
            expect(planets).toHaveLength(1);
            expect(planets[0].parentStarX).toBe(300);
            expect(planets[0].parentStarY).toBe(400);
            expect(planets[0].planetIndex).toBe(1);
            expect(planets[0].planetTypeName).toBe('Rocky Planet');
            expect(planets[0].objectName).toBe('ASV-5678 b');
            // Position cannot be reconstructed without orbital data
            expect(planets[0].x).toBeNull();
            expect(planets[0].y).toBeNull();
        });
    });

    describe('getDiscoveredWormholes', () => {
        it('should use live wormhole data when in an active chunk', () => {
            const chunk = createEmptyChunk();
            chunk.wormholes.push({ x: 100.2, y: 200.7, wormholeId: 'WH-1', designation: 'alpha', pairId: 'WH-1-α', twinX: 5000, twinY: 6000 });
            registry = new DiscoveryRegistry(createChunkSource([chunk]));
            registry.markObjectDiscovered({ type: 'wormhole', x: 100.2, y: 200.7, wormholeId: 'WH-1', designation: 'alpha' });

            const wormholes = registry.getDiscoveredWormholes();
            expect(wormholes).toHaveLength(1);
            expect(wormholes[0].x).toBe(100.2);
            expect(wormholes[0].pairId).toBe('WH-1-α');
        });

        it('should reconstruct wormhole pairs and locate twins from discovery data', () => {
            registry.markObjectDiscovered({ type: 'wormhole', x: 100, y: 200, wormholeId: 'WH-1234', designation: 'alpha' });
            registry.markObjectDiscovered({ type: 'wormhole', x: 5000, y: 6000, wormholeId: 'WH-1234', designation: 'beta' });

            const wormholes = registry.getDiscoveredWormholes();
            expect(wormholes).toHaveLength(2);

            const alpha = wormholes.find(w => w.designation === 'alpha');
            expect(alpha.wormholeId).toBe('WH-1234');
            expect(alpha.twinX).toBe(5000);
            expect(alpha.twinY).toBe(6000);
        });
    });

    describe('Region discoveries', () => {
        it('should mark and report region discoveries', () => {
            expect(registry.isRegionDiscovered('ancient-expanse')).toBe(false);

            registry.markRegionDiscovered('ancient-expanse', 'The Ancient Expanse', 10, 20, 0.8);

            expect(registry.isRegionDiscovered('ancient-expanse')).toBe(true);
            const regions = registry.getDiscoveredRegions();
            expect(regions).toHaveLength(1);
            expect(regions[0].regionName).toBe('The Ancient Expanse');
        });

        it('should only record the first discovery of a region', () => {
            registry.markRegionDiscovered('ancient-expanse', 'The Ancient Expanse', 10, 20, 0.8);
            registry.markRegionDiscovered('ancient-expanse', 'Renamed Expanse', 99, 99, 0.1);

            const regions = registry.getDiscoveredRegions();
            expect(regions).toHaveLength(1);
            expect(regions[0].regionName).toBe('The Ancient Expanse');
            expect(regions[0].discoveryX).toBe(10);
        });
    });

    describe('Result ordering and ID filtering', () => {
        it('should return nebulae most recently discovered first', () => {
            registry.discoveredObjects.set('nebula_10_20', { discovered: true, timestamp: 100, nebulaType: 'emission', nebulaTypeData: { name: 'Emission Nebula' } });
            registry.discoveredObjects.set('nebula_30_40', { discovered: true, timestamp: 200, nebulaType: 'dark', nebulaTypeData: { name: 'Dark Nebula' } });

            const nebulae = registry.getDiscoveredNebulae();
            expect(nebulae.map(n => n.nebulaType)).toEqual(['dark', 'emission']);
        });

        it('should return asteroid gardens most recently discovered first', () => {
            registry.discoveredObjects.set('asteroids_10_20', { discovered: true, timestamp: 100, gardenType: 'metallic' });
            registry.discoveredObjects.set('asteroids_30_40', { discovered: true, timestamp: 200, gardenType: 'icy' });

            const gardens = registry.getDiscoveredAsteroidGardens();
            expect(gardens.map(g => g.gardenType)).toEqual(['icy', 'metallic']);
        });

        it('should ignore IDs that do not match the planet ID format', () => {
            registry.discoveredObjects.set('planet_100_200', { discovered: true, timestamp: 100, planetTypeName: 'Rocky Planet' });

            expect(registry.getDiscoveredPlanets()).toHaveLength(0);
        });
    });

    describe('Clearing history', () => {
        it('should clear object discoveries but preserve region discoveries', () => {
            const star = { type: 'star', x: 100, y: 200, starTypeName: 'Red Dwarf' };
            registry.markObjectDiscovered(star);
            registry.markRegionDiscovered('ancient-expanse', 'The Ancient Expanse', 10, 20, 0.8);

            registry.clearDiscoveryHistory();

            expect(registry.isObjectDiscovered(star)).toBe(false);
            expect(registry.discoveredObjects.size).toBe(0);
            // Matches previous ChunkManager behavior: regions are not cleared
            expect(registry.isRegionDiscovered('ancient-expanse')).toBe(true);
        });
    });
});

describe('ChunkManager discovery delegation (back-compat)', () => {
    let chunkManager;

    beforeEach(() => {
        chunkManager = new ChunkManager();
    });

    it('should expose the registry map as chunkManager.discoveredObjects', () => {
        const star = { type: 'star', x: 100, y: 200, starTypeName: 'Red Dwarf' };
        chunkManager.markObjectDiscovered(star, 'ASV-1234');

        expect(chunkManager.discoveredObjects.size).toBe(1);
        expect(chunkManager.discoveredObjects.get('star_100_200').objectName).toBe('ASV-1234');
    });

    it('should support direct map writes (save/load and debug spawner path)', () => {
        chunkManager.discoveredObjects.set('star_1_2', { discovered: true, timestamp: 123 });

        expect(chunkManager.isObjectDiscovered({ type: 'star', x: 1, y: 2 })).toBe(true);
    });

    it('should delegate getDiscoveredStars', () => {
        chunkManager.markObjectDiscovered({ type: 'star', x: 1500, y: 2500, starTypeName: 'Blue Giant' });

        const stars = chunkManager.getDiscoveredStars();
        expect(stars).toHaveLength(1);
        expect(stars[0].starTypeName).toBe('Blue Giant');
    });

    it('should delegate clearDiscoveryHistory', () => {
        chunkManager.markObjectDiscovered({ type: 'star', x: 1500, y: 2500, starTypeName: 'Blue Giant' });
        chunkManager.clearDiscoveryHistory();

        expect(chunkManager.discoveredObjects.size).toBe(0);
    });
});
