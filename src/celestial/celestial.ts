// Celestial system barrel exports
// Main entry point for all celestial objects and related functionality

// Export shared types and interfaces
export { CelestialObject } from './CelestialTypes.js';
export type { 
    Renderer, 
    Camera, 
    RingConfig,
    AtmosphereConfig,
    PlanetVisualEffects,
    Sunspot,
    CoronaConfig,
    StarVisualEffects,
    PlanetType,
    StarType
} from './CelestialTypes.js';

// Export celestial object classes
export { Star, StarTypes } from './Star.js';
export { Planet, PlanetTypes } from './Planet.js';
export { Moon } from './Moon.js';