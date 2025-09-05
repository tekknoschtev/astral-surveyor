import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import from compiled TypeScript
import { RegionGenerator } from '../../dist/world/RegionGenerator.js';
import { 
    CosmicRegionTypes, 
    getCosmicRegionTypes, 
    getCosmicRegionById,
    applyRegionModifiers 
} from '../../dist/world/CosmicRegions.js';

describe('Cosmic Regions System', () => {
    let regionGenerator;

    beforeEach(() => {
        regionGenerator = new RegionGenerator();
    });

    describe('CosmicRegionTypes', () => {
        it('should define all expected region types', () => {
            const expectedRegions = ['VOID', 'STAR_FORGE', 'GALACTIC_CORE', 'ASTEROID_GRAVEYARD', 'ANCIENT_EXPANSE', 'STELLAR_NURSERY'];
            
            for (const regionId of expectedRegions) {
                expect(CosmicRegionTypes[regionId]).toBeDefined();
                expect(CosmicRegionTypes[regionId].id).toBe(regionId.toLowerCase());
                expect(CosmicRegionTypes[regionId].name).toBeTruthy();
                expect(CosmicRegionTypes[regionId].description).toBeTruthy();
                expect(CosmicRegionTypes[regionId].spawnModifiers).toBeDefined();
            }
        });

        it('should have valid spawn modifiers for all regions', () => {
            const regionTypes = getCosmicRegionTypes();
            
            for (const region of regionTypes) {
                const modifiers = region.spawnModifiers;
                
                // All modifiers should be positive numbers
                expect(modifiers.starSystems).toBeGreaterThan(0);
                expect(modifiers.nebulae).toBeGreaterThan(0);
                expect(modifiers.asteroidGardens).toBeGreaterThan(0);
                expect(modifiers.wormholes).toBeGreaterThan(0);
                expect(modifiers.blackHoles).toBeGreaterThan(0);
                expect(modifiers.comets).toBeGreaterThan(0);
                
                // Modifiers should be reasonable (0.1x to 10x)
                Object.values(modifiers).forEach(modifier => {
                    expect(modifier).toBeGreaterThanOrEqual(0.1);
                    expect(modifier).toBeLessThanOrEqual(10.0);
                });
            }
        });

        it('should provide different characteristics for each region', () => {
            const regions = getCosmicRegionTypes();
            
            // Ensure regions have meaningfully different spawn modifiers
            const voidModifiers = CosmicRegionTypes.VOID.spawnModifiers;
            const starForgeModifiers = CosmicRegionTypes.STAR_FORGE.spawnModifiers;
            
            // Void should have fewer star systems, Star-Forge should have more
            expect(voidModifiers.starSystems).toBeLessThan(starForgeModifiers.starSystems);
            
            // Star-Forge should have many more nebulae than Void
            expect(starForgeModifiers.nebulae).toBeGreaterThan(voidModifiers.nebulae * 2);
            
            // Void should have more wormholes than Star-Forge
            expect(voidModifiers.wormholes).toBeGreaterThan(starForgeModifiers.wormholes);
        });
    });

    describe('Region Utility Functions', () => {
        it('should retrieve region by ID correctly', () => {
            const voidRegion = getCosmicRegionById('void');
            expect(voidRegion).toBeDefined();
            expect(voidRegion.id).toBe('void');
            expect(voidRegion.name).toBe('The Void');
            
            const nonexistentRegion = getCosmicRegionById('nonexistent');
            expect(nonexistentRegion).toBeNull();
        });

        it('should apply region modifiers correctly', () => {
            const baseSpawnChances = {
                starSystems: 0.08,
                nebulae: 0.05,
                asteroidGardens: 0.15,
                wormholes: 0.0005,
                blackHoles: 0.000001,
                comets: 0.20
            };
            
            const voidModifiers = CosmicRegionTypes.VOID.spawnModifiers;
            const modifiedChances = applyRegionModifiers(baseSpawnChances, voidModifiers);
            
            // Verify modifiers are applied correctly
            expect(modifiedChances.starSystems).toBeCloseTo(baseSpawnChances.starSystems * voidModifiers.starSystems);
            expect(modifiedChances.nebulae).toBeCloseTo(baseSpawnChances.nebulae * voidModifiers.nebulae);
            expect(modifiedChances.wormholes).toBeCloseTo(baseSpawnChances.wormholes * voidModifiers.wormholes);
        });
    });

    describe('RegionGenerator', () => {
        it('should generate deterministic regions', () => {
            // Test that same coordinates always produce same region
            const region1 = regionGenerator.getRegionAt(100000, 100000);
            const region2 = regionGenerator.getRegionAt(100000, 100000);
            
            expect(region1.regionType).toBe(region2.regionType);
            expect(region1.distance).toBeCloseTo(region2.distance);
            expect(region1.influence).toBeCloseTo(region2.influence);
        });

        it('should return valid region info for any coordinates', () => {
            const testCoords = [
                [0, 0],
                [50000, 75000],
                [-100000, -50000],
                [500000, -300000]
            ];
            
            for (const [x, y] of testCoords) {
                const region = regionGenerator.getRegionAt(x, y);
                
                expect(region).toBeDefined();
                expect(region.regionType).toBeTruthy();
                expect(region.definition).toBeDefined();
                expect(region.distance).toBeGreaterThanOrEqual(0);
                expect(region.influence).toBeGreaterThanOrEqual(0);
                expect(region.influence).toBeLessThanOrEqual(1);
                
                // Verify region type exists in definitions
                expect(CosmicRegionTypes[region.regionType]).toBeDefined();
            }
        });

        it('should find region centers within specified radius', () => {
            const regionCenters = regionGenerator.getRegionCentersNear(0, 0, 200000);
            
            expect(regionCenters).toBeDefined();
            expect(Array.isArray(regionCenters)).toBe(true);
            
            // Each region center should be valid
            for (const center of regionCenters) {
                expect(center.x).toBeDefined();
                expect(center.y).toBeDefined();
                expect(center.regionType).toBeTruthy();
                expect(CosmicRegionTypes[center.regionType]).toBeDefined();
                
                // Region should be within search radius + influence distance
                const distance = Math.sqrt(center.x * center.x + center.y * center.y);
                expect(distance).toBeLessThanOrEqual(350000); // 200k search + 150k influence
            }
        });

        it('should provide smooth influence transitions', () => {
            // Test that influence decreases smoothly with distance from region center
            const region1 = regionGenerator.getRegionAt(0, 0);
            const region2 = regionGenerator.getRegionAt(10000, 10000);  
            const region3 = regionGenerator.getRegionAt(50000, 50000);
            
            // If they're the same region type, influence should generally decrease with distance
            if (region1.regionType === region2.regionType && region2.regionType === region3.regionType) {
                expect(region1.influence).toBeGreaterThanOrEqual(region2.influence);
                expect(region2.influence).toBeGreaterThanOrEqual(region3.influence);
            }
        });

        it('should handle cache cleanup without errors', () => {
            // Generate some region data
            regionGenerator.getRegionAt(0, 0);
            regionGenerator.getRegionAt(100000, 100000);
            regionGenerator.getRegionAt(500000, 500000);
            
            // Clear distant caches
            expect(() => {
                regionGenerator.clearDistantCaches(0, 0);
            }).not.toThrow();
        });
    });

    describe('Region Consistency', () => {
        it('should maintain deterministic generation across multiple calls', () => {
            const testPositions = [
                [25000, 25000],
                [125000, 75000],
                [-50000, 150000]
            ];
            
            // Generate regions multiple times and verify consistency
            for (const [x, y] of testPositions) {
                const region1 = regionGenerator.getRegionAt(x, y);
                const region2 = regionGenerator.getRegionAt(x, y);
                const region3 = regionGenerator.getRegionAt(x, y);
                
                expect(region1.regionType).toBe(region2.regionType);
                expect(region2.regionType).toBe(region3.regionType);
                expect(region1.distance).toBeCloseTo(region2.distance);
                expect(region2.distance).toBeCloseTo(region3.distance);
            }
        });

        it('should generate different regions for distant coordinates', () => {
            // Test positions far apart should likely be in different regions
            const region1 = regionGenerator.getRegionAt(0, 0);
            const region2 = regionGenerator.getRegionAt(1000000, 1000000); // Very far apart
            
            // While not guaranteed, regions this far apart should very likely be different
            // This test mainly ensures the system is actually generating varied regions
            const regionsAreDifferent = region1.regionType !== region2.regionType;
            const distancesAreDifferent = Math.abs(region1.distance - region2.distance) > 10000;
            
            // At least one aspect should be different for such distant coordinates
            expect(regionsAreDifferent || distancesAreDifferent).toBe(true);
        });
    });
});