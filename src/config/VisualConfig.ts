// Visual Configuration - All visual and rendering-related settings
// Extracted from gameConfig.ts for better organization

// Color palettes and schemes
export const ColorSchemes = {
    // Star color schemes by type
    stars: {
        // Main sequence stars
        blueGiant: '#4DFFFF',      // Very hot, blue-white
        blueWhite: '#AAFFFF',      // Hot, blue-white  
        white: '#FFFFFF',          // Hot white
        yellowWhite: '#FFFFAA',    // Like our Sun
        yellow: '#FFFF44',         // Cooler yellow
        orange: '#FFAA44',         // Cool orange
        red: '#FF4444',            // Cool red
        
        // Exotic star types  
        neutronStar: '#DD44FF',    // Purple/magenta for exotic matter
        whiteDwarf: '#EEEEFF',     // Very white with blue tint
        redGiant: '#FF6644',       // Large, cooler red
        
        // Binary star complements
        binaryPrimary: '#FFFF88',
        binarySecondary: '#88FFFF',
    },
    
    // Planet color schemes by type
    planets: {
        rocky: ['#8B4513', '#A0522D', '#CD853F', '#D2691E'],
        ocean: ['#1E90FF', '#4169E1', '#0000CD', '#191970'],
        desert: ['#F4A460', '#DAA520', '#B8860B', '#CD853F'],
        volcanic: ['#FF4500', '#FF6347', '#DC143C', '#B22222'],
        frozen: ['#F0F8FF', '#E6E6FA', '#D8BFD8', '#DDA0DD'],
        gasGiant: ['#FF7F50', '#FFA500', '#FFD700', '#FFFF00'],
        exotic: ['#9370DB', '#8A2BE2', '#7B68EE', '#6495ED'],
    },
    
    // Nebula color schemes by type
    nebulae: {
        emission: ['#FF1493', '#FF69B4', '#FF6347', '#FF4500'],
        reflection: ['#4169E1', '#1E90FF', '#00BFFF', '#87CEEB'],
        planetary: ['#32CD32', '#7FFF00', '#ADFF2F', '#9AFF9A'],
        dark: ['#2F4F4F', '#696969', '#778899', '#708090'],
    },
    
    // UI color scheme
    ui: {
        primary: '#FFFFFF',
        secondary: '#CCCCCC',
        accent: '#00FFFF',
        warning: '#FF6600',
        error: '#FF0000',
        success: '#00FF00',
        background: 'rgba(0, 0, 0, 0.8)',
        border: '#444444',
    }
};

// Particle and effect configurations
export const ParticleEffects = {
    // Ship thrust particles
    thrust: {
        spawnRate: 8,
        velocitySpread: 40,
        baseVelocity: 80,
        lifeRange: { min: 0.5, max: 0.8 },
        colors: ['#FF4444', '#FF6644', '#FFAA44', '#FFFF44'],
        sizes: {
            large: { size: 3, chance: 0.15 },
            medium: { size: 2, chance: 0.15 },
            small: { size: 1, chance: 0.7 },
        }
    },
    
    // Stellar corona particles
    stellarCorona: {
        baseSpawnRate: 0.2,
        speedRange: { min: 3, max: 9 },
        directionRandomness: 0.4,
        radiusMultiplier: { min: 0.8, max: 1.1 },
        brightnessRange: { min: 0.4, max: 0.7 },
        lifeRange: { min: 1.0, max: 1.8 },
        sizes: {
            large: { size: 3, chance: 0.15 },
            medium: { size: 2, chance: 0.15 },
            small: { size: 1, chance: 0.7 },
        }
    },
    
    // Nebula particles
    nebula: {
        particleCount: { min: 150, max: 300 },
        sizeRange: { min: 1, max: 4 },
        brightnessRange: { min: 0.2, max: 0.8 },
        driftSpeed: { min: 0.1, max: 0.3 },
        layerCount: 3,
    },
    
    // Asteroid sparkle effects
    asteroidSparkle: {
        sparkleChance: 0.3,
        sparkleLifetime: 1.5,
        sparkleColors: ['#FFFFFF', '#FFFFAA', '#AAFFFF'],
        twinkleSpeed: 2.0,
    }
};

// Parallax and background configuration
export const ParallaxConfig = {
    // Background parallax stars
    regionSize: 2000,
    
    // Parallax layers (back to front)
    layers: [
        {
            depth: 0.1,
            density: 4,
            brightnesRange: [0.1, 0.3],
            sizeRange: [1, 1],
            colors: ['#ffffff', '#ffffcc', '#ccccff']
        },
        {
            depth: 0.3,
            density: 6,
            brightnesRange: [0.2, 0.5],
            sizeRange: [1, 2],
            colors: ['#ffffff', '#ffddaa', '#aaddff']
        },
        {
            depth: 0.6,
            density: 3,
            brightnesRange: [0.4, 0.8],
            sizeRange: [1, 2],
            colors: ['#ffffff', '#ffaa88', '#88aaff', '#ffddaa']
        }
    ],
    
    // Cosmic dust effects
    cosmicDust: {
        fadeDistance: 200,
        alphaMultiplier: 0.8,
        colors: ['#444444', '#666666', '#888888'],
    }
};

// Lighting and atmospheric effects
export const LightingConfig = {
    // Ambient lighting
    ambient: {
        intensity: 0.2,
        color: '#111133',
    },
    
    // Star lighting effects
    starLighting: {
        coronaGlow: {
            enabled: true,
            intensity: 0.8,
            falloffDistance: 200,
        },
        lensFlare: {
            enabled: true,
            rays: 6,
            intensity: 0.6,
        }
    },
    
    // Nebula lighting
    nebulaLighting: {
        innerGlow: {
            intensity: 1.2,
            falloffDistance: 150,
        },
        scattering: {
            enabled: true,
            intensity: 0.4,
        }
    },
    
    // Planet atmospheric effects
    atmospheric: {
        oceanWorlds: {
            shimmer: true,
            waveIntensity: 0.3,
        },
        gasGiants: {
            bands: true,
            stormSystems: true,
        },
        volcanic: {
            glow: true,
            emberParticles: true,
        }
    }
};

// UI visual settings
export const UIVisualConfig = {
    // Panel styling
    panels: {
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        borderColor: '#444444',
        borderWidth: 2,
        borderRadius: 8,
        shadowBlur: 20,
        shadowColor: 'rgba(0, 0, 0, 0.5)',
    },
    
    // Text styling
    text: {
        primaryFont: 'Arial, sans-serif',
        primaryColor: '#FFFFFF',
        secondaryColor: '#CCCCCC',
        accentColor: '#00FFFF',
        warningColor: '#FF6600',
        errorColor: '#FF0000',
        successColor: '#00FF00',
        
        sizes: {
            small: 12,
            medium: 14,
            large: 16,
            title: 20,
        }
    },
    
    // Animation settings
    animations: {
        fadeIn: { duration: 0.3, easing: 'ease-out' },
        fadeOut: { duration: 0.2, easing: 'ease-in' },
        slideIn: { duration: 0.4, easing: 'ease-out' },
        slideOut: { duration: 0.3, easing: 'ease-in' },
        pulse: { duration: 1.0, easing: 'ease-in-out' },
    },
    
    // Discovery notifications
    notifications: {
        displayDuration: 4.0,
        fadeOutDuration: 1.0,
        maxVisible: 5,
        spacing: 8,
    },
    
    // Stellar map styling
    stellarMap: {
        backgroundColor: 'rgba(0, 0, 15, 0.9)',
        gridColor: '#223344',
        gridOpacity: 0.3,
        objectColors: {
            star: '#FFFF88',
            planet: '#88AAFF',
            moon: '#AAAAAA',
            nebula: '#FF88AA',
            wormhole: '#AA88FF',
            blackhole: '#FF4444',
            asteroids: '#FFAA88',
        }
    }
};

// Rendering quality settings
export const RenderingConfig = {
    // Quality levels
    quality: {
        low: {
            particleLimit: 500,
            starDetail: 'basic',
            nebulaeDetail: 'low',
            antialiasing: false,
        },
        medium: {
            particleLimit: 1000,
            starDetail: 'enhanced',
            nebulaeDetail: 'medium',
            antialiasing: true,
        },
        high: {
            particleLimit: 2000,
            starDetail: 'full',
            nebulaeDetail: 'high',
            antialiasing: true,
        }
    },
    
    // Performance-based adaptive settings
    adaptive: {
        enabled: true,
        targetFPS: 60,
        adjustmentThreshold: 45,
        qualityStepDelay: 2.0, // seconds
    },
    
    // Culling and optimization
    culling: {
        frustumCulling: true,
        distanceCulling: true,
        maxRenderDistance: 3000,
        lodDistances: [500, 1000, 2000],
    }
};

// Combined visual configuration export
export const VisualConfig = {
    colors: ColorSchemes,
    particles: ParticleEffects,
    parallax: ParallaxConfig,
    lighting: LightingConfig,
    ui: UIVisualConfig,
    rendering: RenderingConfig,
};

export default VisualConfig;