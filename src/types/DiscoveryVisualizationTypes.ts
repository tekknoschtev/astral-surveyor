// Discovery Visualization Type Definitions
// Unified system for consistent discovery indicator rendering

export type DiscoveryRarity = 'common' | 'uncommon' | 'rare' | 'ultra-rare';

export interface DiscoveryVisualizationConfig {
    color: string;
    lineWidth: number;
    opacity: number;
    dashPattern: number[] | null; // null for solid lines
    hasDiscoveryPulse: boolean;
    hasOngoingPulse: boolean;
    pulseColor?: string; // Optional override for pulse color
    specialBehavior?: 'danger' | 'exotic' | 'ftl'; // For ultra-rare special cases
}

export interface DiscoveryPulseState {
    isActive: boolean;
    startTime: number;
    duration: number; // in milliseconds
    maxRadius: number;
    pulseType: 'discovery' | 'ongoing';
}

export interface DiscoveryIndicatorOptions {
    x: number;
    y: number;
    baseRadius: number;
    rarity: DiscoveryRarity;
    objectType: string;
    discoveryTimestamp?: number; // When the object was discovered
    currentTime: number; // Current game time for animations
    colorOverride?: string; // Optional color override for special objects
}

export interface DiscoveryAnimationState {
    discoveryPulse?: DiscoveryPulseState;
    ongoingPulse?: DiscoveryPulseState;
}

// Configuration for different rarity tiers
export const DISCOVERY_RARITY_CONFIGS: Record<DiscoveryRarity, DiscoveryVisualizationConfig> = {
    common: {
        color: '#e8f4f8',
        lineWidth: 1,
        opacity: 0.6,
        dashPattern: [8, 4],
        hasDiscoveryPulse: false,
        hasOngoingPulse: false
    },
    uncommon: {
        color: '#fff3cd',
        lineWidth: 1.5,
        opacity: 0.7,
        dashPattern: null, // Solid line
        hasDiscoveryPulse: false,
        hasOngoingPulse: false
    },
    rare: {
        color: '#ffa500',
        lineWidth: 2,
        opacity: 0.8,
        dashPattern: null, // Solid line
        hasDiscoveryPulse: true,
        hasOngoingPulse: false
    },
    'ultra-rare': {
        color: '#ff6b6b', // Default ultra-rare color, can be overridden
        lineWidth: 3,
        opacity: 0.9,
        dashPattern: null, // Solid line
        hasDiscoveryPulse: true,
        hasOngoingPulse: true
    }
};

// Special color overrides for ultra-rare objects
export const ULTRA_RARE_COLORS: Record<string, string> = {
    'neutron-star': '#00ffff', // Bright cyan for neutron stars
    'black-hole': '#ff0000',   // Red danger for black holes
    'wormhole': '#8b5cf6',     // Purple for spacetime distortion
    'exotic-planet': '#a855f7', // Purple for exotic worlds
    'binary-star': '#ffd700'   // Gold for binary systems
};

// Default discovery pulse settings
export const DISCOVERY_PULSE_CONFIG = {
    duration: 2500, // 2.5 seconds
    maxRadiusMultiplier: 2.5, // Pulse expands to 2.5x the base radius
    fadeOutStart: 0.3 // Start fading when pulse is 30% complete
};

export const ONGOING_PULSE_CONFIG = {
    duration: 4000, // 4 second cycle
    maxRadiusMultiplier: 1.3, // Subtle expansion
    minOpacity: 0.3, // Minimum opacity during pulse
    maxOpacity: 0.9  // Maximum opacity during pulse
};

// Object type to rarity mapping
export const OBJECT_RARITY_MAP: Record<string, DiscoveryRarity> = {
    // Common Objects (70%+ frequency)
    'G_TYPE': 'common',
    'K_TYPE': 'common', 
    'M_TYPE': 'common',
    'ROCKY': 'common',
    'DESERT': 'common',
    
    // Uncommon Objects (10-30% frequency)
    'RED_GIANT': 'uncommon',
    'OCEAN': 'uncommon',
    'GAS_GIANT': 'uncommon',
    'FROZEN': 'uncommon',
    
    // Rare Objects (1-10% frequency)
    'BLUE_GIANT': 'rare',
    'WHITE_DWARF': 'rare',
    'VOLCANIC': 'rare',
    'binary-star': 'rare', // Special case for binary systems
    'asteroid-garden': 'rare',
    'nebula': 'rare',
    
    // Ultra-Rare Objects (<1% frequency)
    'NEUTRON_STAR': 'ultra-rare',
    'black-hole': 'ultra-rare',
    'wormhole': 'ultra-rare',
    'EXOTIC': 'ultra-rare'
};