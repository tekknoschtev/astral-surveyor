// World system barrel exports
// Main entry point for world generation and management modules

// Export ChunkManager and related types
export { ChunkManager } from './ChunkManager.js';
export type { 
    ChunkCoords, 
    BackgroundStar, 
    Chunk, 
    ActiveObjects, 
    DiscoveryData, 
    DiscoveredStar, 
    DiscoveredPlanet, 
    DiscoveredNebula, 
    DiscoveredAsteroidGarden, 
    DiscoveredMoon, 
    DiscoveredWormhole, 
    DiscoveredBlackHole 
} from './ChunkManager.js';

// Export InfiniteStarField and related types
export { InfiniteStarField } from './InfiniteStarField.js';
export type { ParallaxLayer } from './InfiniteStarField.js';