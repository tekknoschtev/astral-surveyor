// Game Constants - Immutable values used throughout the application
// Extracted from various files for centralized constant management

export const GameConstants = {
    // Core world constants
    DEFAULT_CHUNK_SIZE: 2000,
    MINIMUM_CHUNK_SIZE: 1000,
    MAXIMUM_CHUNK_SIZE: 5000,
    
    // Discovery distances (maximum possible values)
    MAX_DISCOVERY_DISTANCE: 1000,
    MIN_DISCOVERY_DISTANCE: 50,
    
    // Camera and movement constants
    DEFAULT_CAMERA_SPEED: 150,
    MAX_CAMERA_SPEED: 300,
    MIN_CAMERA_SPEED: 50,
    CAMERA_ACCELERATION: 50,
    CAMERA_FRICTION: 0.9999,
    
    // Physics constants
    GRAVITY_CONSTANT: 0.1,
    MAX_ORBITAL_SPEED: 2.0,
    MIN_ORBITAL_SPEED: 0.01,
    
    // Rendering constants
    MIN_STAR_RADIUS: 20,
    MAX_STAR_RADIUS: 200,
    MIN_PLANET_RADIUS: 5,
    MAX_PLANET_RADIUS: 50,
    MIN_MOON_RADIUS: 2,
    MAX_MOON_RADIUS: 15,
    
    // Generation limits
    MAX_PLANETS_PER_SYSTEM: 15,
    MAX_MOONS_PER_PLANET: 5,
    MAX_ASTEROIDS_PER_GARDEN: 100,
    MIN_ASTEROIDS_PER_GARDEN: 20,
    
    // Distance constants for object spacing
    MIN_STAR_SEPARATION: 1000,
    MIN_PLANET_SEPARATION: 30,
    MIN_MOON_SEPARATION: 10,
    
    // UI constants
    DEFAULT_UI_PANEL_WIDTH: 300,
    DEFAULT_UI_PANEL_HEIGHT: 400,
    UI_ANIMATION_DURATION: 0.3,
    
    // Audio constants
    MAX_AUDIO_VOLUME: 1.0,
    MIN_AUDIO_VOLUME: 0.0,
    DEFAULT_AUDIO_VOLUME: 0.7,
    
    // Discovery scoring constants
    BASE_DISCOVERY_SCORE: 10,
    RARE_DISCOVERY_MULTIPLIER: 5,
    ULTRA_RARE_DISCOVERY_MULTIPLIER: 20,
    
    // Performance constants
    MAX_PARTICLES_PER_SYSTEM: 1000,
    TARGET_FRAMERATE: 60,
    MAX_RENDER_DISTANCE: 3000,
    
    // Color constants (immutable color values)
    COLORS: {
        BACKGROUND: '#000000',
        UI_PRIMARY: '#FFFFFF',
        UI_SECONDARY: '#CCCCCC',
        WARNING: '#FF6600',
        ERROR: '#FF0000',
        SUCCESS: '#00FF00',
        DISCOVERY: '#FFFF00',
    },
    
    // File format constants
    SAVE_VERSION: '1.0',
    MAX_SAVE_SIZE: 1048576, // 1MB
    
    // Input constants
    DOUBLE_CLICK_THRESHOLD: 300, // milliseconds
    LONG_PRESS_THRESHOLD: 500,   // milliseconds
    TOUCH_SENSITIVITY: 1.0,
    
    // Procedural generation seeds
    UNIVERSE_SEED_LENGTH: 10,
    MAX_RANDOM_SEED: 2147483647,
    
    // Debug constants
    DEBUG_LOG_MAX_ENTRIES: 1000,
    DEBUG_PERFORMANCE_SAMPLE_SIZE: 60,
} as const;

// Type for ensuring constants are immutable
export type GameConstantsType = typeof GameConstants;

// Helper function to get a constant safely
export function getConstant<K extends keyof GameConstantsType>(key: K): GameConstantsType[K] {
    return GameConstants[key];
}

// Helper function to validate constant values
export function validateConstants(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate chunk size constraints
    if (GameConstants.DEFAULT_CHUNK_SIZE < GameConstants.MINIMUM_CHUNK_SIZE ||
        GameConstants.DEFAULT_CHUNK_SIZE > GameConstants.MAXIMUM_CHUNK_SIZE) {
        errors.push('DEFAULT_CHUNK_SIZE is outside valid range');
    }
    
    // Validate discovery distance constraints
    if (GameConstants.MAX_DISCOVERY_DISTANCE <= GameConstants.MIN_DISCOVERY_DISTANCE) {
        errors.push('MAX_DISCOVERY_DISTANCE must be greater than MIN_DISCOVERY_DISTANCE');
    }
    
    // Validate camera speed constraints
    if (GameConstants.DEFAULT_CAMERA_SPEED < GameConstants.MIN_CAMERA_SPEED ||
        GameConstants.DEFAULT_CAMERA_SPEED > GameConstants.MAX_CAMERA_SPEED) {
        errors.push('DEFAULT_CAMERA_SPEED is outside valid range');
    }
    
    // Validate radius constraints
    if (GameConstants.MIN_STAR_RADIUS >= GameConstants.MAX_STAR_RADIUS) {
        errors.push('MIN_STAR_RADIUS must be less than MAX_STAR_RADIUS');
    }
    
    if (GameConstants.MIN_PLANET_RADIUS >= GameConstants.MAX_PLANET_RADIUS) {
        errors.push('MIN_PLANET_RADIUS must be less than MAX_PLANET_RADIUS');
    }
    
    // Validate audio volume range
    if (GameConstants.DEFAULT_AUDIO_VOLUME < GameConstants.MIN_AUDIO_VOLUME ||
        GameConstants.DEFAULT_AUDIO_VOLUME > GameConstants.MAX_AUDIO_VOLUME) {
        errors.push('DEFAULT_AUDIO_VOLUME is outside valid range');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}