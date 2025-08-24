// Discovery Visualization Service
// Centralized service for managing consistent discovery indicator rendering

import { 
    DiscoveryRarity, 
    DiscoveryVisualizationConfig, 
    DiscoveryIndicatorOptions,
    DiscoveryAnimationState,
    DiscoveryPulseState,
    DISCOVERY_RARITY_CONFIGS,
    ULTRA_RARE_COLORS,
    SPECIAL_DISCOVERY_EFFECTS,
    OBJECT_RARITY_MAP,
    DISCOVERY_PULSE_CONFIG,
    SPECIAL_PULSE_CONFIGS,
    ONGOING_PULSE_CONFIG
} from '../types/DiscoveryVisualizationTypes.js';

export class DiscoveryVisualizationService {
    private animationStates: Map<string, DiscoveryAnimationState> = new Map();

    constructor() {
        // Service initialization
    }

    /**
     * Get the rarity tier for a given object type
     */
    getObjectRarity(objectType: string): DiscoveryRarity {
        return OBJECT_RARITY_MAP[objectType] || 'common';
    }

    /**
     * Get the visualization configuration for a given rarity tier
     */
    getRarityConfig(rarity: DiscoveryRarity, objectType?: string): DiscoveryVisualizationConfig {
        const baseConfig = { ...DISCOVERY_RARITY_CONFIGS[rarity] };

        // Apply special color overrides for ultra-rare objects
        if (rarity === 'ultra-rare' && objectType) {
            const specialColor = ULTRA_RARE_COLORS[objectType];
            if (specialColor) {
                baseConfig.color = specialColor;
                baseConfig.pulseColor = specialColor;
            }
        }

        // Apply special discovery effects for specific object types
        if (objectType && SPECIAL_DISCOVERY_EFFECTS[objectType]) {
            const specialEffects = SPECIAL_DISCOVERY_EFFECTS[objectType];
            Object.assign(baseConfig, specialEffects);
        }

        return baseConfig;
    }

    /**
     * Create or update animation state for a discovered object
     */
    updateAnimationState(objectId: string, options: DiscoveryIndicatorOptions): DiscoveryAnimationState {
        const config = this.getRarityConfig(options.rarity, options.objectType);
        const animationState = this.animationStates.get(objectId) || {};

        // Handle discovery pulse (one-time effect)
        if (config.hasDiscoveryPulse && options.discoveryTimestamp) {
            // Get pulse config (use special config for specific object types if available)
            const pulseConfig = SPECIAL_PULSE_CONFIGS[options.objectType] ? 
                { ...DISCOVERY_PULSE_CONFIG, ...SPECIAL_PULSE_CONFIGS[options.objectType] } :
                DISCOVERY_PULSE_CONFIG;
            
            const timeSinceDiscovery = options.currentTime - options.discoveryTimestamp;
            
            if (timeSinceDiscovery <= pulseConfig.duration) {
                if (!animationState.discoveryPulse || !animationState.discoveryPulse.isActive) {
                    animationState.discoveryPulse = {
                        isActive: true,
                        startTime: options.discoveryTimestamp,
                        duration: pulseConfig.duration,
                        maxRadius: options.baseRadius * pulseConfig.maxRadiusMultiplier,
                        pulseType: 'discovery'
                    };
                }
            } else {
                // Discovery pulse has finished
                if (animationState.discoveryPulse) {
                    animationState.discoveryPulse.isActive = false;
                }
            }
        }

        // Handle ongoing pulse (continuous effect for ultra-rare objects)
        if (config.hasOngoingPulse) {
            if (!animationState.ongoingPulse) {
                animationState.ongoingPulse = {
                    isActive: true,
                    startTime: options.currentTime,
                    duration: ONGOING_PULSE_CONFIG.duration,
                    maxRadius: options.baseRadius * ONGOING_PULSE_CONFIG.maxRadiusMultiplier,
                    pulseType: 'ongoing'
                };
            } else {
                // Reset ongoing pulse cycle if it's completed
                const timeSinceStart = options.currentTime - animationState.ongoingPulse.startTime;
                if (timeSinceStart >= ONGOING_PULSE_CONFIG.duration) {
                    animationState.ongoingPulse.startTime = options.currentTime;
                }
            }
        }

        this.animationStates.set(objectId, animationState);
        return animationState;
    }

    /**
     * Calculate discovery pulse properties for rendering
     */
    getDiscoveryPulseProperties(pulse: DiscoveryPulseState, currentTime: number, objectType?: string): {
        radius: number;
        opacity: number;
        isVisible: boolean;
    } {
        if (!pulse.isActive) {
            return { radius: 0, opacity: 0, isVisible: false };
        }

        const timeElapsed = currentTime - pulse.startTime;
        const progress = Math.min(timeElapsed / pulse.duration, 1);

        if (progress >= 1) {
            return { radius: 0, opacity: 0, isVisible: false };
        }

        // Radius expands linearly
        const radius = pulse.maxRadius * progress;

        // Get fade out start point (use special config if available)
        const pulseConfig = SPECIAL_PULSE_CONFIGS[objectType || ''] ? 
            { ...DISCOVERY_PULSE_CONFIG, ...SPECIAL_PULSE_CONFIGS[objectType || ''] } :
            DISCOVERY_PULSE_CONFIG;

        // Opacity fades out after the fade start point
        let opacity = 1;
        if (progress > pulseConfig.fadeOutStart) {
            const fadeProgress = (progress - pulseConfig.fadeOutStart) / 
                               (1 - pulseConfig.fadeOutStart);
            opacity = 1 - fadeProgress;
        }

        return {
            radius,
            opacity: Math.max(0, opacity),
            isVisible: true
        };
    }

    /**
     * Calculate ongoing pulse properties for rendering
     */
    getOngoingPulseProperties(pulse: DiscoveryPulseState, currentTime: number): {
        radius: number;
        opacity: number;
        isVisible: boolean;
    } {
        if (!pulse.isActive) {
            return { radius: 0, opacity: 0, isVisible: false };
        }

        const timeElapsed = currentTime - pulse.startTime;
        const progress = (timeElapsed % pulse.duration) / pulse.duration;

        // Create a smooth sine wave for the pulse
        const sineProgress = Math.sin(progress * Math.PI * 2);
        
        // Radius oscillates between base radius and max radius
        const baseRadius = pulse.maxRadius / ONGOING_PULSE_CONFIG.maxRadiusMultiplier;
        const radiusRange = pulse.maxRadius - baseRadius;
        const radius = baseRadius + (radiusRange * (sineProgress * 0.5 + 0.5));

        // Opacity oscillates between min and max
        const opacityRange = ONGOING_PULSE_CONFIG.maxOpacity - ONGOING_PULSE_CONFIG.minOpacity;
        const opacity = ONGOING_PULSE_CONFIG.minOpacity + (opacityRange * (sineProgress * 0.5 + 0.5));

        return {
            radius,
            opacity,
            isVisible: true
        };
    }

    /**
     * Get complete rendering data for a discovery indicator
     */
    getDiscoveryIndicatorData(objectId: string, options: DiscoveryIndicatorOptions): {
        config: DiscoveryVisualizationConfig;
        animationState: DiscoveryAnimationState;
        discoveryPulse?: { radius: number; opacity: number; isVisible: boolean };
        ongoingPulse?: { radius: number; opacity: number; isVisible: boolean };
    } {
        const config = this.getRarityConfig(options.rarity, options.objectType);
        
        // Apply color override if provided
        if (options.colorOverride) {
            config.color = options.colorOverride;
            config.pulseColor = options.colorOverride;
        }
        
        const animationState = this.updateAnimationState(objectId, options);

        const result: any = {
            config,
            animationState
        };

        // Add discovery pulse data if active
        if (animationState.discoveryPulse) {
            result.discoveryPulse = this.getDiscoveryPulseProperties(
                animationState.discoveryPulse, 
                options.currentTime,
                options.objectType
            );
        }

        // Add ongoing pulse data if active
        if (animationState.ongoingPulse) {
            result.ongoingPulse = this.getOngoingPulseProperties(
                animationState.ongoingPulse, 
                options.currentTime
            );
        }

        return result;
    }

    /**
     * Clear animation state for an object (useful for cleanup)
     */
    clearAnimationState(objectId: string): void {
        this.animationStates.delete(objectId);
    }

    /**
     * Clear all animation states (useful for universe reset)
     */
    clearAllAnimationStates(): void {
        this.animationStates.clear();
    }

    /**
     * Get the number of active animations (for debugging/performance monitoring)
     */
    getActiveAnimationCount(): number {
        return Array.from(this.animationStates.values())
            .filter(state => 
                (state.discoveryPulse?.isActive) || 
                (state.ongoingPulse?.isActive)
            ).length;
    }

    /**
     * Check if an object should show special behavior indicators
     */
    getSpecialBehavior(objectType: string): 'danger' | 'exotic' | 'ftl' | null {
        switch (objectType) {
            case 'black-hole':
                return 'danger';
            case 'wormhole':
                return 'ftl';
            case 'EXOTIC':
                return 'exotic';
            default:
                return null;
        }
    }

    /**
     * Dispose of the service and cleanup resources
     */
    dispose(): void {
        this.clearAllAnimationStates();
    }
}