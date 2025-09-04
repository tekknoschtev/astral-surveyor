/**
 * RegionGenerator - Deterministic macro-region generation system
 * 
 * Creates large-scale cosmic regions using seed-based generation to eliminate
 * universe homogeneity. Uses Voronoi-style region boundaries for smooth,
 * natural-looking region distribution.
 */

import { SeededRandom, hashPosition, getUniverseSeed } from '../utils/random.js';
import { CosmicRegionTypes, type CosmicRegionDefinition } from './CosmicRegions.js';

export interface RegionPoint {
    x: number;
    y: number;
    regionType: string;
}

export interface RegionInfo {
    regionType: string;
    definition: CosmicRegionDefinition;
    distance: number;        // Distance to region center
    influence: number;       // Influence strength at this position [0-1]
}

/**
 * Configuration for region generation
 */
const REGION_CONFIG = {
    // Region scale - larger values create bigger regions
    regionScale: 150000,     // ~75 chunks per region (150,000px = 75 * 2000px chunks)
    
    // Number of region centers to generate in each macro area
    regionsPerMacroArea: 8,  // 8 region centers per 300k x 300k area
    
    // Macro area size for region center generation
    macroAreaSize: 300000,   // 300,000px (150 chunks)
    
    // Influence falloff for smooth transitions between regions
    influenceFalloff: 0.3,   // How quickly region influence decreases with distance
    
    // Minimum distance between region centers to prevent clustering
    minRegionDistance: 80000, // 40 chunks minimum separation
};

/**
 * RegionGenerator handles deterministic cosmic region placement and lookup
 */
export class RegionGenerator {
    private regionCenterCache = new Map<string, RegionPoint[]>();
    private regionLookupCache = new Map<string, RegionInfo>();
    
    /**
     * Get the cosmic region at the specified world coordinates
     */
    getRegionAt(worldX: number, worldY: number): RegionInfo {
        const cacheKey = this.getRegionCacheKey(worldX, worldY);
        
        if (this.regionLookupCache.has(cacheKey)) {
            return this.regionLookupCache.get(cacheKey)!;
        }
        
        const regionInfo = this.calculateRegionAt(worldX, worldY);
        this.regionLookupCache.set(cacheKey, regionInfo);
        
        return regionInfo;
    }
    
    /**
     * Get all region centers that could influence the given area
     */
    getRegionCentersNear(centerX: number, centerY: number, radius: number): RegionPoint[] {
        const regionCenters: RegionPoint[] = [];
        const searchRadius = radius + REGION_CONFIG.regionScale; // Extra margin for influence
        
        // Determine which macro areas we need to check
        const leftMacro = Math.floor((centerX - searchRadius) / REGION_CONFIG.macroAreaSize);
        const rightMacro = Math.floor((centerX + searchRadius) / REGION_CONFIG.macroAreaSize);
        const topMacro = Math.floor((centerY - searchRadius) / REGION_CONFIG.macroAreaSize);
        const bottomMacro = Math.floor((centerY + searchRadius) / REGION_CONFIG.macroAreaSize);
        
        // Get region centers from all relevant macro areas
        for (let macroX = leftMacro; macroX <= rightMacro; macroX++) {
            for (let macroY = topMacro; macroY <= bottomMacro; macroY++) {
                const macroRegions = this.getRegionCentersInMacroArea(macroX, macroY);
                
                // Filter to only regions within influence distance
                for (const region of macroRegions) {
                    const distance = Math.sqrt(
                        Math.pow(region.x - centerX, 2) + 
                        Math.pow(region.y - centerY, 2)
                    );
                    
                    if (distance <= searchRadius) {
                        regionCenters.push(region);
                    }
                }
            }
        }
        
        return regionCenters;
    }
    
    /**
     * Calculate region influence at specific coordinates
     */
    private calculateRegionAt(worldX: number, worldY: number): RegionInfo {
        // Get all region centers that could influence this position
        const nearbyRegions = this.getRegionCentersNear(worldX, worldY, REGION_CONFIG.regionScale * 2);
        
        if (nearbyRegions.length === 0) {
            // Fallback to default region if no regions found
            return {
                regionType: 'ANCIENT_EXPANSE',
                definition: CosmicRegionTypes.ANCIENT_EXPANSE,
                distance: Infinity,
                influence: 1.0
            };
        }
        
        // Find the closest region center
        let closestRegion = nearbyRegions[0];
        let closestDistance = Math.sqrt(
            Math.pow(closestRegion.x - worldX, 2) + 
            Math.pow(closestRegion.y - worldY, 2)
        );
        
        for (let i = 1; i < nearbyRegions.length; i++) {
            const region = nearbyRegions[i];
            const distance = Math.sqrt(
                Math.pow(region.x - worldX, 2) + 
                Math.pow(region.y - worldY, 2)
            );
            
            if (distance < closestDistance) {
                closestRegion = region;
                closestDistance = distance;
            }
        }
        
        // Calculate influence strength based on distance
        const maxInfluenceDistance = REGION_CONFIG.regionScale;
        const influence = Math.max(0, Math.min(1, 
            1.0 - (closestDistance / maxInfluenceDistance)
        ));
        
        // Apply falloff curve for smoother transitions
        const adjustedInfluence = Math.pow(influence, REGION_CONFIG.influenceFalloff);
        
        const regionDefinition = CosmicRegionTypes[closestRegion.regionType];
        if (!regionDefinition) {
            throw new Error(`Unknown region type: ${closestRegion.regionType}`);
        }
        
        return {
            regionType: closestRegion.regionType,
            definition: regionDefinition,
            distance: closestDistance,
            influence: adjustedInfluence
        };
    }
    
    /**
     * Generate region centers for a macro area using deterministic placement
     */
    private getRegionCentersInMacroArea(macroX: number, macroY: number): RegionPoint[] {
        const cacheKey = `${macroX},${macroY}`;
        
        if (this.regionCenterCache.has(cacheKey)) {
            return this.regionCenterCache.get(cacheKey)!;
        }
        
        const regionCenters = this.generateRegionCentersForMacroArea(macroX, macroY);
        this.regionCenterCache.set(cacheKey, regionCenters);
        
        return regionCenters;
    }
    
    /**
     * Generate deterministic region centers within a macro area
     */
    private generateRegionCentersForMacroArea(macroX: number, macroY: number): RegionPoint[] {
        // Create deterministic seed for this macro area
        const macroSeed = hashPosition(macroX, macroY) ^ getUniverseSeed() ^ 0xC05A1C;
        const rng = new SeededRandom(macroSeed);
        
        const regionCenters: RegionPoint[] = [];
        const regionTypes = Object.keys(CosmicRegionTypes);
        const macroAreaSize = REGION_CONFIG.macroAreaSize;
        const regionsToPlace = REGION_CONFIG.regionsPerMacroArea;
        
        // Calculate macro area bounds
        const areaLeft = macroX * macroAreaSize;
        const areaTop = macroY * macroAreaSize;
        
        // Generate regions with minimum distance constraints
        for (let attempts = 0; attempts < regionsToPlace && regionCenters.length < regionsToPlace; attempts++) {
            const regionX = areaLeft + rng.nextFloat(0, macroAreaSize);
            const regionY = areaTop + rng.nextFloat(0, macroAreaSize);
            
            // Check minimum distance from existing regions
            let validPlacement = true;
            for (const existingRegion of regionCenters) {
                const distance = Math.sqrt(
                    Math.pow(regionX - existingRegion.x, 2) + 
                    Math.pow(regionY - existingRegion.y, 2)
                );
                
                if (distance < REGION_CONFIG.minRegionDistance) {
                    validPlacement = false;
                    break;
                }
            }
            
            if (validPlacement) {
                // Select region type with some weighting for variety
                const regionType = this.selectRegionType(rng, regionCenters);
                
                regionCenters.push({
                    x: regionX,
                    y: regionY,
                    regionType: regionType
                });
            }
        }
        
        return regionCenters;
    }
    
    /**
     * Select region type with some bias for variety within macro areas
     */
    private selectRegionType(rng: SeededRandom, existingRegions: RegionPoint[]): string {
        const regionTypes = Object.keys(CosmicRegionTypes);
        
        // For variety, reduce probability of region types already present in this macro area
        const typeCount = new Map<string, number>();
        for (const region of existingRegions) {
            typeCount.set(region.regionType, (typeCount.get(region.regionType) || 0) + 1);
        }
        
        // Create weighted selection favoring less common types
        const weights: number[] = [];
        for (const regionType of regionTypes) {
            const count = typeCount.get(regionType) || 0;
            const weight = Math.max(0.1, 1.0 - count * 0.3); // Reduce weight for existing types
            weights.push(weight);
        }
        
        // Weighted random selection
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let randomValue = rng.nextFloat(0, totalWeight);
        
        for (let i = 0; i < regionTypes.length; i++) {
            randomValue -= weights[i];
            if (randomValue <= 0) {
                return regionTypes[i];
            }
        }
        
        // Fallback
        return regionTypes[0];
    }
    
    /**
     * Generate cache key for region lookup optimization
     */
    private getRegionCacheKey(worldX: number, worldY: number): string {
        // Cache regions at 10,000px resolution (5 chunk resolution)
        const cacheResolution = 10000;
        const cacheX = Math.floor(worldX / cacheResolution);
        const cacheY = Math.floor(worldY / cacheResolution);
        return `${cacheX},${cacheY}`;
    }
    
    /**
     * Clear caches to free memory (call periodically)
     */
    clearDistantCaches(playerX: number, playerY: number): void {
        const maxDistance = REGION_CONFIG.macroAreaSize * 3; // Keep 3 macro areas around player
        
        // Clear region center cache
        for (const [key] of this.regionCenterCache) {
            const [macroX, macroY] = key.split(',').map(Number);
            const centerX = macroX * REGION_CONFIG.macroAreaSize;
            const centerY = macroY * REGION_CONFIG.macroAreaSize;
            
            const distance = Math.sqrt(
                Math.pow(centerX - playerX, 2) + 
                Math.pow(centerY - playerY, 2)
            );
            
            if (distance > maxDistance) {
                this.regionCenterCache.delete(key);
            }
        }
        
        // Clear region lookup cache
        const cacheResolution = 10000;
        for (const [key] of this.regionLookupCache) {
            const [cacheX, cacheY] = key.split(',').map(Number);
            const centerX = cacheX * cacheResolution;
            const centerY = cacheY * cacheResolution;
            
            const distance = Math.sqrt(
                Math.pow(centerX - playerX, 2) + 
                Math.pow(centerY - playerY, 2)
            );
            
            if (distance > maxDistance) {
                this.regionLookupCache.delete(key);
            }
        }
    }
}