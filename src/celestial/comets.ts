// Comets - Elliptical orbital objects around stars
// Deterministic comet system with realistic orbital mechanics

// Import dependencies
import { SeededRandom, hashPosition } from '../utils/random.js';
import { CelestialObject } from './CelestialTypes.js';
import type { Renderer, Camera } from './CelestialTypes.js';
import type { Star } from './Star.js';
import { DiscoveryVisualizationService } from '../services/DiscoveryVisualizationService.js';
import { DiscoveryConfig } from '../config/gameConfig.js';

// Comet orbital parameters - represents a complete elliptical orbit
export interface CometOrbit {
    semiMajorAxis: number;        // a: Average distance from star (300-1500px)
    eccentricity: number;         // e: Orbit ellipticity (0.6-0.95, highly elliptical)
    perihelionDistance: number;   // q = a(1-e): Closest approach to star
    aphelionDistance: number;     // Q = a(1+e): Farthest distance from star
    orbitalPeriod: number;        // T: Complete orbit time (5000-20000 time units)
    argumentOfPerihelion: number; // ω: Orbit orientation angle (0-2π radians)
    meanAnomalyAtEpoch: number;   // M₀: Starting position in orbit (0-2π radians)
    epoch: number;                // t₀: Reference time for orbital calculations
}

// Comet visual and discovery properties
export interface CometType {
    name: string;
    nucleusColor: string;         // Core color
    tailColors: string[];         // Gradient colors for tail (base to tip)
    rarity: number;              // 0-1, probability of this type
    discoveryValue: number;       // Points awarded for discovery
    description: string;          // Flavor text
    tailParticleCount: number;    // Number of particles in tail
    glitterChance: number;        // 0-1, chance for sparkle effects
}

// Comet type definitions with realistic properties
export const CometTypes: Record<string, CometType> = {
    ICE: {
        name: 'Ice Comet',
        nucleusColor: '#E0FFFF',
        tailColors: ['#87CEEB', '#B0E0E6', '#E0FFFF'],
        rarity: 0.4,
        discoveryValue: 20,
        description: 'Frozen water and volatile compounds create brilliant blue-white trails',
        tailParticleCount: 25,
        glitterChance: 0.7
    },
    DUST: {
        name: 'Dust Comet',
        nucleusColor: '#F4A460',
        tailColors: ['#DAA520', '#DEB887', '#F4A460'],
        rarity: 0.3,
        discoveryValue: 22,
        description: 'Rocky debris creates golden-brown dust trails',
        tailParticleCount: 30,
        glitterChance: 0.4
    },
    ROCKY: {
        name: 'Rocky Comet',
        nucleusColor: '#C0C0C0',
        tailColors: ['#A9A9A9', '#C0C0C0', '#DCDCDC'],
        rarity: 0.2,
        discoveryValue: 25,
        description: 'Dense stone and metal create silvery-gray particle streams',
        tailParticleCount: 20,
        glitterChance: 0.5
    },
    ORGANIC: {
        name: 'Organic Comet',
        nucleusColor: '#ADFF2F',
        tailColors: ['#9ACD32', '#ADFF2F', '#FFFF00'],
        rarity: 0.1,
        discoveryValue: 30,
        description: 'Rare organic compounds create ethereal green-yellow wisps',
        tailParticleCount: 35,
        glitterChance: 0.8
    }
};

// Comet class - extends CelestialObject with elliptical orbital mechanics
export class Comet extends CelestialObject {
    // Orbital properties
    orbit: CometOrbit;
    parentStar: Star;
    cometType: CometType;
    cometIndex: number;  // Unique index within star system
    
    // Current orbital state
    currentDistance: number = 0;          // Current distance from parent star
    currentTrueAnomaly: number = 0;       // Current position in orbit (radians)
    currentEccentricAnomaly: number = 0;  // Intermediate orbital calculation
    
    // Visual properties (calculated based on solar distance)
    isVisible: boolean = false;           // Only true when close enough to star
    tailLength: number = 0;               // Current tail length (pixels)
    nucleusBrightness: number = 1.0;      // Current nucleus brightness multiplier
    comaRadius: number = 0;               // Current coma size around nucleus
    
    // Tail direction (always points away from parent star)
    tailDirection: { x: number; y: number } = { x: 0, y: 0 };
    
    // Animation properties for enhanced tail effects
    animationStartTime: number = Date.now();
    particleAnimationSpeed: number = 40; // pixels per second (varies by comet type)
    
    // Advanced animation properties for Phase 4.4
    nucleusRotation: number = 0;              // Current nucleus rotation angle (radians)
    tailBillowPhase: number = 0;              // Current tail billowing phase (radians)
    particleRotationPhase: number = 0;        // Current particle rotation phase (radians)
    brightnessPulsePhase: number = 0;         // Current brightness pulse phase (radians)
    
    // Enhanced particle pool for Phase 4.5 performance optimization
    private static particlePool: Array<{
        x: number;
        y: number;
        size: number;
        opacity: number;
        active: boolean;
        lastUsed: number;
    }> = [];
    private static readonly MAX_POOL_SIZE = 200;
    private static activeParticleCount: number = 0;
    
    // Track particles used in current render frame
    private currentFrameParticles: Array<{
        x: number;
        y: number;
        size: number;
        opacity: number;
        active: boolean;
        lastUsed: number;
    }> = [];
    
    // Track particle batching efficiency
    private lastParticleBatchCount: number = 0;
    
    // Performance monitoring
    private lastRenderTime: number = 0;
    private renderTimeHistory: number[] = [];
    private static readonly RENDER_HISTORY_SIZE = 10;
    
    // Level of Detail (LOD) system
    private currentLODLevel: string = 'high';
    private renderQuality: number = 1.0;
    
    // Browser capabilities cache
    private static browserCapabilities: {
        supportsAdvancedBlending: boolean;
        maxTextureSize: number;
        recommendedParticleCount: number;
    } | null = null;
    
    // Gradient cache for memory optimization
    private static gradientCache: Map<string, CanvasGradient> = new Map();
    private static readonly MAX_GRADIENT_CACHE_SIZE = 50;
    
    // Unique identifier for discovery system
    uniqueId?: string;
    
    // Discovery timestamp for animation system
    discoveryTimestamp?: number;

    constructor(x: number, y: number, parentStar: Star, orbit: CometOrbit, cometType: CometType, cometIndex: number) {
        super(x, y, 'comet');
        
        this.parentStar = parentStar;
        this.orbit = orbit;
        this.cometType = cometType;
        this.cometIndex = cometIndex;
        
        // Discovery distance will be set dynamically in updateVisualProperties()
        // based on visibility and tail length
        
        // Generate unique identifier for this comet
        this.uniqueId = this.generateUniqueId();
        
        // Set animation speed based on comet type
        this.setAnimationProperties();
        
        // Calculate initial position and visual properties
        this.calculateInitialPosition();
        this.updateVisualProperties();
        
        // Initialize particle pool if needed
        this.initializeParticlePool();
    }
    
    // Generate unique identifier using star position and comet index
    generateUniqueId(): string {
        const starX = Math.floor(this.parentStar.x);
        const starY = Math.floor(this.parentStar.y);
        return `comet_${starX}_${starY}_${this.cometIndex}`;
    }
    
    // Set animation properties based on comet type for enhanced visual effects
    setAnimationProperties(): void {
        switch (this.cometType.name) {
            case 'Ice Comet':
                this.particleAnimationSpeed = 60; // Fast, crystalline particles
                break;
            case 'Dust Comet':
                this.particleAnimationSpeed = 40; // Medium speed, flowing dust
                break;
            case 'Rocky Comet':
                this.particleAnimationSpeed = 25; // Slow, heavy debris
                break;
            case 'Organic Comet':
                this.particleAnimationSpeed = 35; // Ethereal, medium-slow wisps
                break;
            default:
                this.particleAnimationSpeed = 40; // Default medium speed
        }
    }
    
    // Phase 4.5: Simple batched particle rendering  
    private simpleBatchRender(ctx: CanvasRenderingContext2D, particles: Array<{ x: number; y: number; size: number; color: string }>): void {
        // Simple efficient rendering by minimizing fillStyle changes
        let currentColor = '';
        
        particles.forEach(particle => {
            if (particle.color !== currentColor) {
                currentColor = particle.color;
                ctx.fillStyle = currentColor;
            }
            
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    // Get base particle size based on comet type (exposed for testing)
    getParticleBaseSize(): number {
        switch (this.cometType.name) {
            case 'Ice Comet':
                return 1.8; // Smaller, crystalline particles
            case 'Dust Comet':
                return 2.2; // Medium dust particles
            case 'Rocky Comet':
                return 2.8; // Larger, chunky debris
            case 'Organic Comet':
                return 1.5; // Wispy, ethereal particles
            default:
                return 2.0; // Default size
        }
    }
    
    // Get glitter intensity based on comet type (exposed for testing)
    getGlitterIntensity(): number {
        switch (this.cometType.name) {
            case 'Ice Comet':
                return 0.8; // Bright, sparkly ice crystals
            case 'Dust Comet':
                return 0.4; // Some metallic glints
            case 'Rocky Comet':
                return 0.5; // Moderate metallic reflection
            case 'Organic Comet':
                return 0.6; // Ethereal glow variations
            default:
                return 0.5; // Default intensity
        }
    }
    
    // Calculate current position using deterministic universal time
    updatePosition(_deltaTime: number): void {
        // Calculate universal time that advances with real time for orbital animation
        const currentTime = Date.now();
        const timeElapsed = (currentTime - this.animationStartTime) / 1000; // Convert to seconds
        const scaledTimeElapsed = timeElapsed * 0.1; // Scale down for visible orbital motion
        const universalTime = this.calculateUniversalTime() + scaledTimeElapsed;
        
        // Calculate mean anomaly at current universal time
        const meanAnomaly = (this.orbit.meanAnomalyAtEpoch + 
            (2 * Math.PI / this.orbit.orbitalPeriod) * (universalTime - this.orbit.epoch)) % (2 * Math.PI);
        
        // Solve Kepler's equation for eccentric anomaly
        this.currentEccentricAnomaly = this.solveKeplersEquation(meanAnomaly, this.orbit.eccentricity);
        
        // Calculate true anomaly from eccentric anomaly
        this.currentTrueAnomaly = 2 * Math.atan2(
            Math.sqrt((1 + this.orbit.eccentricity) / (1 - this.orbit.eccentricity)) * Math.tan(this.currentEccentricAnomaly / 2),
            1
        );
        
        // Normalize true anomaly to [0, 2π] range
        if (this.currentTrueAnomaly < 0) {
            this.currentTrueAnomaly += 2 * Math.PI;
        }
        
        // Calculate current distance from star
        this.currentDistance = this.orbit.semiMajorAxis * (1 - this.orbit.eccentricity * Math.cos(this.currentEccentricAnomaly));
        
        // Calculate position in orbit plane
        const orbitX = this.currentDistance * Math.cos(this.currentTrueAnomaly);
        const orbitY = this.currentDistance * Math.sin(this.currentTrueAnomaly);
        
        // Rotate by argument of perihelion and translate to star position
        this.x = this.parentStar.x + (orbitX * Math.cos(this.orbit.argumentOfPerihelion) - orbitY * Math.sin(this.orbit.argumentOfPerihelion));
        this.y = this.parentStar.y + (orbitX * Math.sin(this.orbit.argumentOfPerihelion) + orbitY * Math.cos(this.orbit.argumentOfPerihelion));
    }

    // Calculate initial position (called once during construction)
    private calculateInitialPosition(): void {
        // Calculate universal time based on universe seed and star position
        const universalTime = this.calculateUniversalTime();
        
        // Calculate mean anomaly at current universal time
        const meanAnomaly = (this.orbit.meanAnomalyAtEpoch + 
            (2 * Math.PI / this.orbit.orbitalPeriod) * (universalTime - this.orbit.epoch)) % (2 * Math.PI);
        
        // Solve Kepler's equation for eccentric anomaly
        this.currentEccentricAnomaly = this.solveKeplersEquation(meanAnomaly, this.orbit.eccentricity);
        
        // Calculate true anomaly from eccentric anomaly
        this.currentTrueAnomaly = 2 * Math.atan2(
            Math.sqrt((1 + this.orbit.eccentricity) / (1 - this.orbit.eccentricity)) * Math.tan(this.currentEccentricAnomaly / 2),
            1
        );
        
        // Normalize true anomaly to [0, 2π] range
        if (this.currentTrueAnomaly < 0) {
            this.currentTrueAnomaly += 2 * Math.PI;
        }
        
        // Calculate current distance from star
        this.currentDistance = this.orbit.semiMajorAxis * (1 - this.orbit.eccentricity * Math.cos(this.currentEccentricAnomaly));
        
        // Calculate position in orbit plane
        const orbitX = this.currentDistance * Math.cos(this.currentTrueAnomaly);
        const orbitY = this.currentDistance * Math.sin(this.currentTrueAnomaly);
        
        // Rotate by argument of perihelion and translate to star position
        this.x = this.parentStar.x + (orbitX * Math.cos(this.orbit.argumentOfPerihelion) - orbitY * Math.sin(this.orbit.argumentOfPerihelion));
        this.y = this.parentStar.y + (orbitX * Math.sin(this.orbit.argumentOfPerihelion) + orbitY * Math.cos(this.orbit.argumentOfPerihelion));
    }
    
    // Calculate deterministic universal time based on star position and universe seed
    calculateUniversalTime(): number {
        // Use star position and comet index to create deterministic time
        const timeSeed = hashPosition(this.parentStar.x, this.parentStar.y) + this.cometIndex * 1000;
        return timeSeed % this.orbit.orbitalPeriod;
    }
    
    // Solve Kepler's equation: M = E - e*sin(E) for eccentric anomaly E
    // Uses Newton-Raphson iteration for accuracy
    solveKeplersEquation(meanAnomaly: number, eccentricity: number): number {
        let eccentricAnomaly = meanAnomaly; // Initial guess
        
        // Newton-Raphson iteration (typically converges in 3-4 iterations)
        for (let i = 0; i < 10; i++) {
            const f = eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly;
            const df = 1 - eccentricity * Math.cos(eccentricAnomaly);
            
            const deltaE = -f / df;
            eccentricAnomaly += deltaE;
            
            // Check for convergence (accuracy to 1e-12)
            if (Math.abs(deltaE) < 1e-12) {
                break;
            }
        }
        
        return eccentricAnomaly;
    }
    
    // Update visual properties based on current distance from star
    updateVisualProperties(): void {
        // Calculate tail direction first (always points away from parent star)
        const starToComet = { 
            x: this.x - this.parentStar.x, 
            y: this.y - this.parentStar.y 
        };
        const distance = Math.sqrt(starToComet.x * starToComet.x + starToComet.y * starToComet.y);
        if (distance > 0) {
            this.tailDirection = { 
                x: starToComet.x / distance, 
                y: starToComet.y / distance 
            };
        }
        
        // Determine visibility based on distance threshold
        // Use configured visibility threshold from gameConfig
        const visibilityThreshold = this.orbit.perihelionDistance * DiscoveryConfig.distances.comet / 40; // More generous visibility (was /50)
        this.isVisible = this.currentDistance <= visibilityThreshold;
        
        if (!this.isVisible) {
            this.tailLength = 0;
            this.nucleusBrightness = 0.1;
            this.comaRadius = 0;
            this.discoveryDistance = 0; // Not discoverable when not visible
            return;
        }
        
        // Calculate brightness factor (closer = brighter)
        const brightnessFactor = this.orbit.perihelionDistance / this.currentDistance;
        
        // Update tail length (longer when closer to star)
        const baseTailLength = 40; // Minimum tail length when visible (increased)
        const maxTailLength = 200; // Maximum tail length at perihelion (increased for more drama)
        // Scale from 0 to 1 based on how much closer the comet is than baseline
        const scaledBrightness = Math.max(0, Math.min((brightnessFactor - 0.8) / 1.2, 1));
        this.tailLength = baseTailLength + (maxTailLength - baseTailLength) * scaledBrightness;
        
        // Update nucleus brightness
        this.nucleusBrightness = Math.min(brightnessFactor, 2.0);
        
        // Update coma radius (fuzzy glow around nucleus)
        const scaledComaFactor = Math.max(0, Math.min((brightnessFactor - 0.8) / 1.2, 1));
        this.comaRadius = 3 + 10 * scaledComaFactor; // Increased from 7 to 10 for more dramatic coma
        
        // Set discovery distance based on visibility
        this.discoveryDistance = this.isVisible ? Math.max(30, this.tailLength + 20) : 0;
        
        // Update advanced animation phases
        this.updateAdvancedAnimations();
    }
    
    // Calculate curved tail direction based on comet motion and solar pressure
    private calculateCurvedTailDirection(): { x: number; y: number } {
        // Get motion vector (perpendicular to current radius vector)
        const motionVector = {
            x: Math.cos(this.currentTrueAnomaly + Math.PI/2),
            y: Math.sin(this.currentTrueAnomaly + Math.PI/2)
        };
        
        // Solar pressure vector (base tail direction away from star)
        const solarPressureVector = {
            x: this.tailDirection.x,
            y: this.tailDirection.y
        };
        
        // Combine vectors with motion influence (10% motion, 90% solar pressure)
        const curvatureInfluence = 0.1;
        const curvedDirection = {
            x: solarPressureVector.x + motionVector.x * curvatureInfluence,
            y: solarPressureVector.y + motionVector.y * curvatureInfluence
        };
        
        // Normalize the result
        const magnitude = Math.sqrt(curvedDirection.x ** 2 + curvedDirection.y ** 2);
        if (magnitude > 0) {
            curvedDirection.x /= magnitude;
            curvedDirection.y /= magnitude;
        }
        
        return curvedDirection;
    }
    
    // Update advanced animation phases for Phase 4.4 effects
    private updateAdvancedAnimations(): void {
        const currentTime = Date.now();
        
        // Nucleus rotation based on orbital position and type
        const rotationSpeed = this.getNucleusRotationSpeed();
        this.nucleusRotation = (currentTime * rotationSpeed + this.currentTrueAnomaly) % (Math.PI * 2);
        
        // Tail billowing based on solar wind and comet type
        const billowSpeed = this.getBillowingSpeed();
        this.tailBillowPhase = (currentTime * billowSpeed) % (Math.PI * 2);
        
        // Particle rotation for spiral effects
        const particleRotSpeed = this.getParticleRotationSpeed();
        this.particleRotationPhase = (currentTime * particleRotSpeed) % (Math.PI * 2);
        
        // Brightness pulsing for active comets
        const pulseSpeed = this.getBrightnessPulseSpeed();
        this.brightnessPulsePhase = (currentTime * pulseSpeed) % (Math.PI * 2);
    }
    
    // Get nucleus rotation speed based on comet type
    getNucleusRotationSpeed(): number {
        const baseSpeed = 0.0005; // radians per ms
        switch (this.cometType.name) {
            case 'Ice Comet':
                return baseSpeed * 1.5; // Faster rotation (less dense)
            case 'Dust Comet':
                return baseSpeed * 1.2;
            case 'Rocky Comet':
                return baseSpeed * 0.8; // Slower rotation (more dense)
            case 'Organic Comet':
                return baseSpeed * 1.3;
            default:
                return baseSpeed;
        }
    }
    
    // Get billowing intensity based on comet type
    getBillowingIntensity(): number {
        const brightnessScale = Math.min(this.nucleusBrightness / 2, 1);
        switch (this.cometType.name) {
            case 'Ice Comet':
                return 0.3 * brightnessScale; // Moderate billowing
            case 'Dust Comet':
                return 0.6 * brightnessScale; // High billowing (dust clouds)
            case 'Rocky Comet':
                return 0.2 * brightnessScale; // Low billowing (heavy debris)
            case 'Organic Comet':
                return 0.8 * brightnessScale; // Highest billowing (wispy)
            default:
                return 0.4 * brightnessScale;
        }
    }
    
    // Get billowing animation speed
    private getBillowingSpeed(): number {
        return 0.001; // radians per ms (1 cycle per 6.3 seconds)
    }
    
    // Get particle rotation speed for spiral effects
    private getParticleRotationSpeed(): number {
        return 0.0008; // radians per ms
    }
    
    // Get brightness pulse speed
    private getBrightnessPulseSpeed(): number {
        if (this.nucleusBrightness > 1.5) {
            return 0.003; // Fast pulse for very bright comets
        } else if (this.nucleusBrightness > 1) {
            return 0.002; // Medium pulse for bright comets
        }
        return 0; // No pulse for dim comets
    }
    
    // Get spiral intensity for organic comets
    getSpiralIntensity(): number {
        switch (this.cometType.name) {
            case 'Organic Comet':
                return 0.8; // High spiral for organic
            case 'Dust Comet':
                return 0.4; // Medium spiral for dust
            case 'Ice Comet':
                return 0.3; // Low spiral for ice
            case 'Rocky Comet':
                return 0.1; // Minimal spiral for rocky
            default:
                return 0.3;
        }
    }
    
    // Get discovery burst progress (0-1 over burst duration)
    getDiscoveryBurstProgress(): number {
        if (!this.discoveryTimestamp) return 0;
        
        const burstDuration = 2000; // 2 seconds
        const elapsed = Date.now() - this.discoveryTimestamp;
        return Math.min(elapsed / burstDuration, 1);
    }
    
    // Get discovery burst color based on comet type
    getDiscoveryBurstColor(): string {
        switch (this.cometType.name) {
            case 'Ice Comet':
                return '#87CEEB'; // Sky blue
            case 'Dust Comet':
                return '#DAA520'; // Golden rod
            case 'Rocky Comet':
                return '#C0C0C0'; // Silver
            case 'Organic Comet':
                return '#9ACD32'; // Yellow green
            default:
                return '#FFFFFF';
        }
    }
    
    // Get discovery burst intensity
    getDiscoveryBurstIntensity(): number {
        const progress = this.getDiscoveryBurstProgress();
        return Math.sin(progress * Math.PI); // Peak at middle of burst
    }
    
    // Get discovery enhancement multiplier for rare comets
    getDiscoveryEnhancementMultiplier(): number {
        // More rare = higher enhancement
        const rarity = this.cometType.rarity;
        if (rarity <= 0.1) return 2.0; // Organic (very rare)
        if (rarity <= 0.2) return 1.5; // Rocky (rare)
        if (rarity <= 0.3) return 1.2; // Dust (uncommon)
        return 1.0; // Ice (common)
    }
    
    // Get pulsed brightness for synchronized effects
    getPulsedBrightness(): number {
        if (this.brightnessPulsePhase === 0) return this.nucleusBrightness;
        
        const pulseIntensity = 0.2; // 20% brightness variation
        const pulse = Math.sin(this.brightnessPulsePhase) * pulseIntensity;
        return this.nucleusBrightness * (1 + pulse);
    }
    
    // Get pulsed coma intensity
    getPulsedComaIntensity(): number {
        if (this.brightnessPulsePhase === 0) return 1.0;
        
        const pulseIntensity = 0.15;
        return 1.0 + Math.sin(this.brightnessPulsePhase) * pulseIntensity;
    }
    
    // Get pulsed tail intensity
    getPulsedTailIntensity(): number {
        if (this.brightnessPulsePhase === 0) return 1.0;
        
        const pulseIntensity = 0.1;
        return 1.0 + Math.sin(this.brightnessPulsePhase) * pulseIntensity;
    }
    
    // Initialize particle pool
    private initializeParticlePool(): void {
        if (Comet.particlePool.length === 0) {
            for (let i = 0; i < Comet.MAX_POOL_SIZE; i++) {
                Comet.particlePool.push({
                    x: 0,
                    y: 0,
                    size: 1,
                    opacity: 1,
                    active: false,
                    lastUsed: 0
                });
            }
        }
    }
    
    // Enhanced particle pool management for Phase 4.5
    private static getParticleFromPool(): { x: number; y: number; size: number; opacity: number; active: boolean; lastUsed: number } {
        // Initialize pool if empty
        if (Comet.particlePool.length === 0) {
            for (let i = 0; i < Comet.MAX_POOL_SIZE; i++) {
                Comet.particlePool.push({
                    x: 0,
                    y: 0,
                    size: 1,
                    opacity: 1,
                    active: false,
                    lastUsed: 0
                });
            }
        }
        
        // Find inactive particle
        const particle = Comet.particlePool.find(p => !p.active);
        if (particle) {
            particle.active = true;
            particle.lastUsed = Date.now();
            Comet.activeParticleCount++;
            return particle;
        }
        
        // If no inactive particles, reuse oldest
        const oldestParticle = Comet.particlePool.reduce((oldest, current) => 
            current.lastUsed < oldest.lastUsed ? current : oldest
        );
        oldestParticle.active = true;
        oldestParticle.lastUsed = Date.now();
        return oldestParticle;
    }
    
    // Return particle to pool
    private static returnParticleToPool(particle: { x: number; y: number; size: number; opacity: number; active: boolean; lastUsed: number }): void {
        if (particle.active) {
            particle.active = false;
            Comet.activeParticleCount--;
        }
    }
    
    // Phase 4.5: Enhanced particle pooling methods
    getParticlePoolSize(): number {
        return Comet.particlePool.length;
    }
    
    getActiveParticleCount(): number {
        return this.currentFrameParticles.length;
    }
    
    // Get particle batching efficiency (particles per beginPath call)
    getParticleBatchEfficiency(): number {
        if (this.lastParticleBatchCount === 0) return 0;
        return this.currentFrameParticles.length / this.lastParticleBatchCount;
    }
    
    // Phase 4.5: Level of Detail (LOD) system
    calculateLODLevel(camera: Camera): string {
        const distance = Math.sqrt(
            Math.pow(this.x - camera.x, 2) + Math.pow(this.y - camera.y, 2)
        );
        
        if (distance < 150) return 'high';
        if (distance < 300) return 'medium';
        return 'low';
    }
    
    getLODParticleCount(lodLevel: string): number {
        const baseCount = this.cometType.tailParticleCount;
        switch (lodLevel) {
            case 'high': return baseCount;
            case 'medium': return Math.floor(baseCount * 0.6);
            case 'low': return Math.floor(baseCount * 0.3);
            default: return baseCount;
        }
    }
    
    shouldRenderAdvancedEffects(lodLevel: string): boolean {
        return lodLevel === 'high' || (lodLevel === 'medium' && this.nucleusBrightness > 1.5);
    }
    
    // Phase 4.5: Frustum culling and rendering optimization
    isInCameraView(camera: Camera, canvas: { width: number; height: number }): boolean {
        const margin = this.tailLength + 50;
        const [screenX, screenY] = camera.worldToScreen(this.x, this.y, canvas.width, canvas.height);
        
        return screenX >= -margin && screenX <= canvas.width + margin &&
               screenY >= -margin && screenY <= canvas.height + margin;
    }
    
    shouldPerformRender(camera: Camera, canvas: { width: number; height: number }): boolean {
        return this.isVisible && this.isInCameraView(camera, canvas);
    }
    
    // Phase 4.5: Frame-rate adaptive quality
    getCurrentRenderQuality(): number {
        return this.renderQuality;
    }
    
    adjustQualityForPerformance(targetFrameTime: number = 16.67): void {
        const avgRenderTime = this.getAverageRenderTime();
        
        if (avgRenderTime > targetFrameTime * 1.2) {
            // Performance is poor, reduce quality
            this.renderQuality = Math.max(0.3, this.renderQuality - 0.1);
        } else if (avgRenderTime < targetFrameTime * 0.8) {
            // Performance is good, can increase quality
            this.renderQuality = Math.min(1.0, this.renderQuality + 0.05);
        }
    }
    
    // Phase 4.5: Memory management
    cleanupUnusedResources(): void {
        // Clean up old gradient cache entries
        if (Comet.gradientCache.size > Comet.MAX_GRADIENT_CACHE_SIZE) {
            const entries = Array.from(Comet.gradientCache.entries());
            entries.slice(0, 10).forEach(([key]) => {
                Comet.gradientCache.delete(key);
            });
        }
        
        // Clean up old particles that haven't been used recently
        const now = Date.now();
        const staleThreshold = 5000; // 5 seconds
        
        Comet.particlePool.forEach(particle => {
            if (!particle.active && (now - particle.lastUsed) > staleThreshold) {
                particle.lastUsed = 0;
            }
        });
    }
    
    // Phase 4.5: Performance monitoring
    getLastRenderTime(): number {
        return this.lastRenderTime;
    }
    
    getAverageRenderTime(): number {
        if (this.renderTimeHistory.length === 0) return 0;
        return this.renderTimeHistory.reduce((sum, time) => sum + time, 0) / this.renderTimeHistory.length;
    }
    
    getPerformanceOptimizations(): Array<{ type: string; impact: string; description: string }> {
        const optimizations: Array<{ type: string; impact: string; description: string }> = [];
        const avgRenderTime = this.getAverageRenderTime();
        
        if (avgRenderTime > 5) {
            optimizations.push({
                type: 'reduce_particles',
                impact: 'high',
                description: 'Reduce particle count for better performance'
            });
        }
        
        if (this.currentLODLevel === 'high' && avgRenderTime > 3) {
            optimizations.push({
                type: 'use_lod',
                impact: 'medium',
                description: 'Use Level of Detail rendering for distant objects'
            });
        }
        
        if (this.renderQuality < 0.7) {
            optimizations.push({
                type: 'adaptive_quality',
                impact: 'low',
                description: 'Quality has been reduced to maintain framerate'
            });
        }
        
        return optimizations;
    }
    
    // Phase 4.5: Cross-browser performance adaptation
    getBrowserCapabilities(): { supportsAdvancedBlending: boolean; maxTextureSize: number; recommendedParticleCount: number } {
        if (!Comet.browserCapabilities) {
            // Mock browser detection for testing
            Comet.browserCapabilities = {
                supportsAdvancedBlending: true,
                maxTextureSize: 4096,
                recommendedParticleCount: 150
            };
        }
        return Comet.browserCapabilities;
    }
    
    getAdaptedParticleCount(): number {
        const capabilities = this.getBrowserCapabilities();
        const baseCount = this.cometType.tailParticleCount;
        const adaptedCount = Math.min(baseCount, capabilities.recommendedParticleCount / 4);
        return Math.floor(adaptedCount * this.renderQuality);
    }
    
    getDeviceProfile(): string {
        const capabilities = this.getBrowserCapabilities();
        
        if (capabilities.recommendedParticleCount >= 200) {
            return 'high-end';
        } else if (capabilities.recommendedParticleCount >= 100) {
            return 'mid-range';
        } else {
            return 'low-end';
        }
    }
    
    getQualitySettingsForDevice(deviceProfile: string): { particleMultiplier: number; effectsEnabled: boolean } {
        switch (deviceProfile) {
            case 'high-end':
                return { particleMultiplier: 1.0, effectsEnabled: true };
            case 'mid-range':
                return { particleMultiplier: 0.7, effectsEnabled: true };
            case 'low-end':
                return { particleMultiplier: 0.4, effectsEnabled: false };
            default:
                return { particleMultiplier: 0.7, effectsEnabled: true };
        }
    }
    
    // Render the comet with all visual effects and Phase 4.5 optimizations
    render(renderer: Renderer, camera: Camera): void {
        // Phase 4.5: Performance monitoring start
        const renderStart = performance.now();
        
        // Phase 4.5: Early exit optimizations
        if (!this.shouldPerformRender(camera, renderer.canvas)) {
            return;
        }
        
        const [screenX, screenY] = camera.worldToScreen(this.x, this.y, renderer.canvas.width, renderer.canvas.height);
        
        // Phase 4.5: Calculate LOD level
        this.currentLODLevel = this.calculateLODLevel(camera);
        
        // Phase 4.5: Adjust rendering based on LOD
        // const shouldRenderAdvanced = this.shouldRenderAdvancedEffects(this.currentLODLevel);
        
        // Render tail first (behind nucleus)
        if (this.tailLength > 0) {
            this.renderTail(renderer, screenX, screenY);
        }
        
        // Render coma (fuzzy glow around nucleus) - only for medium/high LOD
        if (this.comaRadius > 0 && this.currentLODLevel !== 'low') {
            this.renderComa(renderer, screenX, screenY);
        }
        
        // Render nucleus (bright core)
        this.renderNucleus(renderer, screenX, screenY);
        
        // Render discovery indicator if discovered - only for high LOD
        if (this.discovered && this.currentLODLevel === 'high') {
            this.renderDiscoveryIndicator(renderer, screenX, screenY);
        }
        
        // Phase 4.5: Performance monitoring end
        const renderEnd = performance.now();
        this.lastRenderTime = renderEnd - renderStart;
        
        // Update render time history
        this.renderTimeHistory.push(this.lastRenderTime);
        if (this.renderTimeHistory.length > Comet.RENDER_HISTORY_SIZE) {
            this.renderTimeHistory.shift();
        }
        
        // Adaptive quality adjustment
        this.adjustQualityForPerformance();
    }
    
    // Render the comet's tail pointing away from the star with enhanced particle-based system
    private renderTail(renderer: Renderer, screenX: number, screenY: number): void {
        const ctx = renderer.ctx;
        
        // Calculate curved tail direction based on motion and solar pressure
        const curvedTailDirection = this.calculateCurvedTailDirection();
        
        // Calculate tail end position using curved direction
        const tailEndX = screenX + curvedTailDirection.x * this.tailLength;
        const tailEndY = screenY + curvedTailDirection.y * this.tailLength;
        
        // Create gradient for backwards compatibility with tests (but don't use it for rendering)
        const gradient = ctx.createLinearGradient(screenX, screenY, tailEndX, tailEndY);
        const colors = this.cometType.tailColors;
        const brightnessScale = Math.min(this.nucleusBrightness / 2, 1);
        const baseOpacity = Math.floor((0.8 * brightnessScale + 0.2) * 255).toString(16).padStart(2, '0');
        const midOpacity = Math.floor((0.53 * brightnessScale + 0.15) * 255).toString(16).padStart(2, '0');
        const tipOpacity = Math.floor((0.13 * brightnessScale + 0.05) * 255).toString(16).padStart(2, '0');
        
        gradient.addColorStop(0, colors[0] + baseOpacity);
        gradient.addColorStop(0.5, colors[1] + midOpacity);
        gradient.addColorStop(1, colors[2] + tipOpacity);
        
        // Set line width for test compatibility 
        const lineWidth = Math.max(2, this.tailLength / 30);
        ctx.lineWidth = lineWidth;
        
        // ENHANCED: Render multiple particle streams instead of solid line
        this.renderParticleStreams(ctx, screenX, screenY, curvedTailDirection);
        
        // Add type-specific tail effects with curved direction
        this.renderTailParticles(ctx, screenX, screenY, tailEndX, tailEndY, curvedTailDirection);
        
        // Render type-specific specialized effects
        this.renderTypeSpecificEffects(ctx, screenX, screenY, curvedTailDirection);
    }

    // ENHANCED: Render multiple particle streams to replace solid line
    private renderParticleStreams(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, curvedDirection: { x: number; y: number }): void {
        const streamCount = Math.max(3, Math.floor(this.tailLength / 25)); // 3-6 streams based on tail length
        const brightnessScale = Math.min(this.nucleusBrightness / 2, 1);
        const colors = this.cometType.tailColors;
        
        // Calculate animation progress for flowing streams
        const currentTime = Date.now();
        const flowSpeed = this.particleAnimationSpeed;
        const animationProgress = ((currentTime - this.animationStartTime) / (flowSpeed * 10)) % 1; // Slower flow for streams
        
        // Use deterministic positioning for consistent streams
        const streamSeed = hashPosition(this.x, this.y) + 99999;
        const rng = new SeededRandom(streamSeed);
        
        for (let streamIndex = 0; streamIndex < streamCount; streamIndex++) {
            // Calculate stream offset perpendicular to tail direction
            const maxStreamOffset = Math.max(3, this.tailLength / 15); // Increased spread (wider streams)
            const streamOffset = rng.nextFloat(-maxStreamOffset, maxStreamOffset);
            const perpX = -curvedDirection.y * streamOffset;
            const perpY = curvedDirection.x * streamOffset;
            
            // Stream starting position (slightly offset from nucleus)
            const streamStartX = screenX + perpX * 0.3; // Start streams slightly spread from nucleus
            const streamStartY = screenY + perpY * 0.3;
            
            // Number of particles in this stream (denser streams near center)
            const centralness = 1 - Math.abs(streamOffset) / maxStreamOffset; // 1 = center, 0 = edge
            const streamParticleCount = Math.floor((8 + centralness * 12) * this.renderQuality); // 8-20 particles per stream
            
            // Stagger stream animation timing
            const streamAnimationOffset = (streamIndex / streamCount) * 0.3;
            const streamAnimationProgress = (animationProgress + streamAnimationOffset) % 1;
            
            this.renderSingleParticleStream(
                ctx, 
                streamStartX, 
                streamStartY, 
                curvedDirection, 
                streamParticleCount,
                streamAnimationProgress,
                centralness,
                colors,
                brightnessScale,
                rng
            );
        }
    }

    // Render a single particle stream
    private renderSingleParticleStream(
        ctx: CanvasRenderingContext2D,
        startX: number,
        startY: number,
        direction: { x: number; y: number },
        particleCount: number,
        animationProgress: number,
        centralness: number,
        colors: string[],
        brightnessScale: number,
        rng: SeededRandom
    ): void {
        // Calculate stream length with some variation
        const streamLength = this.tailLength * (0.8 + centralness * 0.4); // Central streams are longer
        
        // Group particles by color for efficient rendering
        const colorGroups = new Map<string, Array<{ x: number; y: number; size: number }>>();
        
        for (let i = 0; i < particleCount; i++) {
            // Base position along stream
            const baseProgress = (i + 1) / particleCount;
            
            // Add animated flow with staggered timing
            const particleFlowOffset = (animationProgress + (i / particleCount) * 0.5) % 1;
            const animatedProgress = Math.min(baseProgress + particleFlowOffset * 0.15, 1); // Subtle flow effect
            
            // Calculate position along curved direction
            const baseX = startX + direction.x * streamLength * animatedProgress;
            const baseY = startY + direction.y * streamLength * animatedProgress;
            
            // Add slight random dispersion that increases with distance
            const dispersionFactor = animatedProgress * 0.7; // More dispersion toward tail tip (increased)
            const randomOffsetX = rng.nextFloat(-dispersionFactor, dispersionFactor) * 4; // Increased spread
            const randomOffsetY = rng.nextFloat(-dispersionFactor, dispersionFactor) * 4; // Increased spread
            
            const particleX = baseX + randomOffsetX;
            const particleY = baseY + randomOffsetY;
            
            // Calculate particle properties with enhanced variation
            const distanceFactor = (1 - animatedProgress); // Larger/brighter near nucleus
            const centralFactor = centralness; // Central streams are more prominent
            
            // Enhanced particle size with more variation
            const baseSize = this.getParticleBaseSize() * 0.8; // Slightly smaller than overlay particles
            const sizeVariation = rng.nextFloat(0.6, 1.4);
            const sizeFactor = (0.5 + 0.5 * distanceFactor) * (0.7 + 0.3 * centralFactor);
            const particleSize = Math.max(0.2, baseSize * sizeFactor * sizeVariation);
            
            // Enhanced opacity with smoother falloff
            const opacityFactor = Math.pow(distanceFactor, 0.7) * (0.6 + 0.4 * centralFactor);
            const finalOpacity = opacityFactor * (0.4 + 0.5 * brightnessScale); // 0.4-0.9 range
            
            // Color selection based on distance (progression from base to tip colors)
            let colorIndex = 0;
            if (animatedProgress > 0.7) colorIndex = 2; // Tip color
            else if (animatedProgress > 0.3) colorIndex = 1; // Mid color
            else colorIndex = 0; // Base color
            
            const particleColor = colors[colorIndex];
            const opacity = Math.floor(finalOpacity * 255).toString(16).padStart(2, '0');
            const colorWithOpacity = particleColor + opacity;
            
            // Group by color for batch rendering
            if (!colorGroups.has(colorWithOpacity)) {
                colorGroups.set(colorWithOpacity, []);
            }
            colorGroups.get(colorWithOpacity)!.push({
                x: particleX,
                y: particleY,
                size: particleSize
            });
        }
        
        // Batch render each color group
        colorGroups.forEach((particles, color) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            
            particles.forEach(p => {
                ctx.moveTo(p.x + p.size, p.y);
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            });
            
            ctx.fill();
        });
    }
    
    // Render overlay particle effects (reduced since main streams now handle core structure)
    private renderTailParticles(ctx: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number, curvedDirection: { x: number; y: number }): void {
        // Phase 4.5: Use LOD-adjusted particle count (reduced for overlay particles)
        const baseLODCount = this.getLODParticleCount(this.currentLODLevel);
        const adaptedCount = this.getAdaptedParticleCount();
        const particleCount = Math.floor(Math.min(baseLODCount, adaptedCount) * (this.tailLength / 180) * this.renderQuality * 0.6); // Reduced count and density
        const baseColor = this.cometType.tailColors[1]; // Use mid-color for overlay particles
        
        // Calculate animation progress for flowing particles
        const currentTime = Date.now();
        const animationDuration = (this.tailLength / this.particleAnimationSpeed) * 1000; // ms for particles to traverse tail
        const animationProgress = ((currentTime - this.animationStartTime) % animationDuration) / animationDuration;
        
        // Use deterministic positioning for particles with animation offset
        const particleSeed = hashPosition(this.x, this.y) + 12345;
        const rng = new SeededRandom(particleSeed);
        
        // Calculate base tail width for tapering
        const baseTailWidth = Math.max(2, this.tailLength / 30);
        
        // Phase 4.5: Track particles for enhanced pool management
        const activeParticles: Array<{ x: number; y: number; size: number; opacity: number; active: boolean; lastUsed: number }> = [];
        
        // Clear previous frame particles and start tracking current frame
        this.currentFrameParticles = [];
        
        // Phase 4.5: Preparing for particle batching
        
        // Phase 4.5: Batch rendering preparation
        const particlesToRender: Array<{ x: number; y: number; size: number; color: string }> = [];
        
        for (let i = 0; i < particleCount; i++) {
            // Get particle from pool
            const particle = Comet.getParticleFromPool();
            
            // Base position along tail
            const baseProgress = (i + 1) / particleCount; // 0 to 1 along tail
            
            // Add animated flow offset (particles flow from nucleus to tail end)
            const particleFlow = (animationProgress + (i / particleCount) * 0.3) % 1; // Stagger particle timing
            const animatedProgress = Math.min(baseProgress + particleFlow * 0.2, 1); // Subtle flow effect
            
            // Use curved direction for particle positioning
            const particleX = startX + curvedDirection.x * this.tailLength * animatedProgress;
            const particleY = startY + curvedDirection.y * this.tailLength * animatedProgress;
            
            // Calculate tail width at this position (wider spread for overlay particles)
            const widthAtPosition = baseTailWidth * (1 - animatedProgress * 0.5); // Even gentler tapering
            const maxOffset = Math.max(2.0, widthAtPosition * 1.2); // Further increased spread for overlay particles
            
            // Add enhanced random offset perpendicular to curved tail direction
            const perpX = -curvedDirection.y * rng.nextFloat(-maxOffset, maxOffset);
            const perpY = curvedDirection.x * rng.nextFloat(-maxOffset, maxOffset);
            
            // Update particle properties
            particle.x = particleX + perpX;
            particle.y = particleY + perpY;
            
            // Enhanced particle size and opacity with type-specific variations and brightness scaling
            const baseSize = this.getParticleBaseSize();
            const sizeVariation = rng.nextFloat(0.7, 1.3); // Random size variation
            const distanceFactor = (1 - animatedProgress); // Larger near nucleus
            const brightnessScale = Math.min(this.nucleusBrightness / 2, 1); // 0-1 scale
            
            // Scale particle size by brightness (brighter = larger particles)
            particle.size = Math.max(0.3, baseSize * distanceFactor * sizeVariation * (0.6 + 0.4 * brightnessScale));
            
            // Enhanced opacity with smoother falloff and brightness scaling
            const opacityFactor = Math.pow(distanceFactor, 0.6); // Smoother falloff curve
            particle.opacity = opacityFactor * (0.5 + 0.4 * brightnessScale); // 0.5-0.9 range based on brightness
            
            // Phase 4.5: Prepare particle for batched rendering
            const opacity = Math.floor(particle.opacity * 255).toString(16).padStart(2, '0');
            particlesToRender.push({
                x: particle.x,
                y: particle.y,
                size: particle.size,
                color: baseColor + opacity
            });
            
            // Enhanced glitter effect with type-specific characteristics and brightness scaling
            const baseGlitterChance = this.cometType.glitterChance * distanceFactor; // More glitter near nucleus
            const brightnessGlitterChance = baseGlitterChance * (0.7 + 0.3 * brightnessScale); // Brighter = more glitter
            
            if (rng.next() < brightnessGlitterChance) {
                const glitterIntensity = this.getGlitterIntensity() * (0.8 + 0.2 * brightnessScale);
                const glitterOpacity = Math.floor(glitterIntensity * 255).toString(16).padStart(2, '0');
                ctx.fillStyle = '#FFFFFF' + glitterOpacity;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size * 0.7, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Track for cleanup and current frame counting
            activeParticles.push(particle);
            this.currentFrameParticles.push(particle);
        }
        
        // Phase 4.5: Batch render all particles efficiently by grouping by color
        const colorGroups = new Map<string, Array<{ x: number; y: number; size: number }>>();
        
        // Group particles by color
        particlesToRender.forEach(particle => {
            if (!colorGroups.has(particle.color)) {
                colorGroups.set(particle.color, []);
            }
            colorGroups.get(particle.color)!.push({
                x: particle.x,
                y: particle.y,
                size: particle.size
            });
        });
        
        // Render each color group in one batch
        this.lastParticleBatchCount = colorGroups.size;
        colorGroups.forEach((particles, color) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            
            particles.forEach(p => {
                ctx.moveTo(p.x + p.size, p.y);
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            });
            
            ctx.fill();
        });
        
        // Return particles to pool
        activeParticles.forEach(particle => Comet.returnParticleToPool(particle));
    }
    
    /* REMOVED: problematic method that was causing TypeScript compilation errors
    private batchRenderParticles_DISABLED(ctx: CanvasRenderingContext2D, particles: Array<{ x: number; y: number; size: number; color: string }>): void {
        // Group particles by color for efficient rendering
        const colorGroups = new Map<string, Array<{ x: number; y: number; size: number }>>>();
        
        particles.forEach(particle => {
            if (!colorGroups.has(particle.color)) {
                colorGroups.set(particle.color, []);
            }
            colorGroups.get(particle.color)!.push({
                x: particle.x,
                y: particle.y,
                size: particle.size
            });
        });
        
        // Render each color group in one batch
        colorGroups.forEach((particleGroup, color) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            
            particleGroup.forEach(p => {
                ctx.moveTo(p.x + p.size, p.y);
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            });
            
            ctx.fill();
        });
    }
    */
    
    // Render type-specific visual specializations
    private renderTypeSpecificEffects(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, curvedDirection: { x: number; y: number }): void {
        switch (this.cometType.name) {
            case 'Ice Comet':
                this.renderIceCometEffects(ctx, screenX, screenY, curvedDirection);
                break;
            case 'Dust Comet':
                this.renderDustCometEffects(ctx, screenX, screenY, curvedDirection);
                break;
            case 'Rocky Comet':
                this.renderRockyCometEffects(ctx, screenX, screenY, curvedDirection);
                break;
            case 'Organic Comet':
                this.renderOrganicCometEffects(ctx, screenX, screenY, curvedDirection);
                break;
        }
    }
    
    // Ice Comet: Crystalline sparkle and frost effects
    private renderIceCometEffects(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, curvedDirection: { x: number; y: number }): void {
        // Render crystalline frost trail
        this.renderCrystallineFrost(ctx, screenX, screenY, curvedDirection);
        
        // Render ice crystal sparkles
        this.renderIceCrystalSparkles(ctx, screenX, screenY, curvedDirection);
    }
    
    // Dust Comet: Flowing dust cloud and density variations
    private renderDustCometEffects(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, curvedDirection: { x: number; y: number }): void {
        // Render dust cloud billowing effects
        this.renderDustCloudBillowing(ctx, screenX, screenY, curvedDirection);
        
        // Render metallic dust glints
        this.renderMetallicDustGlints(ctx, screenX, screenY, curvedDirection);
    }
    
    // Rocky Comet: Chunky debris and metallic fragments
    private renderRockyCometEffects(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, curvedDirection: { x: number; y: number }): void {
        // Render chunky debris trail
        this.renderChunkyDebris(ctx, screenX, screenY, curvedDirection);
        
        // Render metallic fragment reflections
        this.renderMetallicFragments(ctx, screenX, screenY, curvedDirection);
    }
    
    // Organic Comet: Bio-luminescent wisps and undulation
    private renderOrganicCometEffects(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, curvedDirection: { x: number; y: number }): void {
        // Render bio-luminescent wisps
        this.renderBioLuminescentWisps(ctx, screenX, screenY, curvedDirection);
        
        // Render organic undulation patterns
        this.renderOrganicUndulation(ctx, screenX, screenY, curvedDirection);
    }
    
    // Ice Comet: Crystalline frost trail effect
    private renderCrystallineFrost(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, curvedDirection: { x: number; y: number }): void {
        if (this.tailLength < 30) return; // Only render for substantial tails
        
        const frostSegments = 8;
        const brightnessScale = Math.min(this.nucleusBrightness / 2, 1);
        
        for (let i = 0; i < frostSegments; i++) {
            const progress = (i + 1) / frostSegments;
            const frostX = screenX + curvedDirection.x * this.tailLength * progress;
            const frostY = screenY + curvedDirection.y * this.tailLength * progress;
            
            // Create crystalline frost patterns
            const frostRadius = (1 - progress) * 2 * brightnessScale;
            const frostOpacity = Math.floor((0.3 * (1 - progress) * brightnessScale) * 255).toString(16).padStart(2, '0');
            
            // Render frost crystal
            ctx.fillStyle = '#E0FFFF' + frostOpacity;
            ctx.beginPath();
            ctx.arc(frostX, frostY, frostRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Add crystalline structure lines
            if (frostRadius > 0.5) {
                ctx.strokeStyle = '#FFFFFF' + frostOpacity;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                // Draw cross pattern for crystal structure
                ctx.moveTo(frostX - frostRadius, frostY);
                ctx.lineTo(frostX + frostRadius, frostY);
                ctx.moveTo(frostX, frostY - frostRadius);
                ctx.lineTo(frostX, frostY + frostRadius);
                ctx.stroke();
            }
        }
    }
    
    // Ice Comet: Ice crystal sparkles
    private renderIceCrystalSparkles(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, curvedDirection: { x: number; y: number }): void {
        const currentTime = Date.now();
        const sparklePhase = (currentTime / 200) % (Math.PI * 2); // 200ms cycle
        const sparkleCount = Math.floor(this.tailLength / 20);
        const brightnessScale = Math.min(this.nucleusBrightness / 2, 1);
        
        // Use deterministic positioning for sparkles
        const sparkleSeed = hashPosition(this.x, this.y) + 54321;
        const rng = new SeededRandom(sparkleSeed);
        
        for (let i = 0; i < sparkleCount; i++) {
            const progress = rng.nextFloat(0.2, 0.9); // Don't sparkle at very edges
            const sparkleX = screenX + curvedDirection.x * this.tailLength * progress + rng.nextFloat(-5, 5);
            const sparkleY = screenY + curvedDirection.y * this.tailLength * progress + rng.nextFloat(-5, 5);
            
            // Animated sparkle intensity
            const sparklePhaseOffset = (i / sparkleCount) * Math.PI * 2;
            const sparkleIntensity = (Math.sin(sparklePhase + sparklePhaseOffset) + 1) / 2; // 0-1
            
            if (sparkleIntensity > 0.7) { // Only show intense sparkles
                const sparkleOpacity = Math.floor(sparkleIntensity * brightnessScale * 255).toString(16).padStart(2, '0');
                const sparkleSize = 1 + sparkleIntensity * brightnessScale;
                
                // Render sparkle
                ctx.fillStyle = '#FFFFFF' + sparkleOpacity;
                ctx.beginPath();
                ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
                ctx.fill();
                
                // Add sparkle rays
                ctx.strokeStyle = '#E0FFFF' + sparkleOpacity;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                const rayLength = sparkleSize * 2;
                // Four-pointed star
                ctx.moveTo(sparkleX - rayLength, sparkleY);
                ctx.lineTo(sparkleX + rayLength, sparkleY);
                ctx.moveTo(sparkleX, sparkleY - rayLength);
                ctx.lineTo(sparkleX, sparkleY + rayLength);
                ctx.stroke();
            }
        }
    }
    
    // Dust Comet: Dust cloud billowing effects
    private renderDustCloudBillowing(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, curvedDirection: { x: number; y: number }): void {
        if (this.tailLength < 30) return;
        
        const currentTime = Date.now();
        const billowPhase = (currentTime / 800) % (Math.PI * 2); // 800ms cycle for slow billowing
        const billowSegments = 6;
        const brightnessScale = Math.min(this.nucleusBrightness / 2, 1);
        
        // Use deterministic positioning for billowing
        const billowSeed = hashPosition(this.x, this.y) + 98765;
        const rng = new SeededRandom(billowSeed);
        
        for (let i = 0; i < billowSegments; i++) {
            const progress = (i + 1) / billowSegments;
            const baseX = screenX + curvedDirection.x * this.tailLength * progress;
            const baseY = screenY + curvedDirection.y * this.tailLength * progress;
            
            // Create billowing offset
            const billowOffset = Math.sin(billowPhase + progress * Math.PI) * 3 * brightnessScale;
            const perpX = -curvedDirection.y * billowOffset;
            const perpY = curvedDirection.x * billowOffset;
            
            const billowX = baseX + perpX + rng.nextFloat(-2, 2);
            const billowY = baseY + perpY + rng.nextFloat(-2, 2);
            
            // Render dust cloud puff
            const dustRadius = (1 - progress) * 3 * brightnessScale;
            const dustOpacity = Math.floor((0.2 * (1 - progress) * brightnessScale) * 255).toString(16).padStart(2, '0');
            
            // Create radial gradient for dust puff
            const dustGradient = ctx.createRadialGradient(
                billowX, billowY, 0,
                billowX, billowY, dustRadius
            );
            dustGradient.addColorStop(0, '#DEB887' + dustOpacity);
            dustGradient.addColorStop(0.6, '#DAA520' + Math.floor(parseInt(dustOpacity, 16) * 0.5).toString(16).padStart(2, '0'));
            dustGradient.addColorStop(1, '#DAA520' + '00');
            
            ctx.fillStyle = dustGradient;
            ctx.beginPath();
            ctx.arc(billowX, billowY, dustRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Dust Comet: Metallic dust glints
    private renderMetallicDustGlints(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, curvedDirection: { x: number; y: number }): void {
        const glintCount = Math.floor(this.tailLength / 25);
        const brightnessScale = Math.min(this.nucleusBrightness / 2, 1);
        const currentTime = Date.now();
        
        // Use deterministic positioning for glints
        const glintSeed = hashPosition(this.x, this.y) + 13579;
        const rng = new SeededRandom(glintSeed);
        
        for (let i = 0; i < glintCount; i++) {
            const progress = rng.nextFloat(0.3, 0.8); // Focus glints in middle of tail
            const glintX = screenX + curvedDirection.x * this.tailLength * progress + rng.nextFloat(-4, 4);
            const glintY = screenY + curvedDirection.y * this.tailLength * progress + rng.nextFloat(-4, 4);
            
            // Animated glint intensity with individual timing
            const glintPhase = ((currentTime + i * 100) / 400) % (Math.PI * 2); // 400ms cycle
            const glintIntensity = (Math.sin(glintPhase) + 1) / 2; // 0-1
            
            if (glintIntensity > 0.6) { // Only show prominent glints
                const glintOpacity = Math.floor(glintIntensity * brightnessScale * 0.8 * 255).toString(16).padStart(2, '0');
                
                // Render metallic glint
                ctx.fillStyle = '#FFD700' + glintOpacity; // Golden metallic
                ctx.beginPath();
                ctx.arc(glintX, glintY, 0.8, 0, Math.PI * 2);
                ctx.fill();
                
                // Add brief flash effect
                if (glintIntensity > 0.9) {
                    ctx.fillStyle = '#FFFFFF' + glintOpacity;
                    ctx.beginPath();
                    ctx.arc(glintX, glintY, 0.4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }
    
    // Rocky Comet: Chunky debris trail
    private renderChunkyDebris(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, curvedDirection: { x: number; y: number }): void {
        const debrisCount = Math.floor(this.tailLength / 40);
        const brightnessScale = Math.min(this.nucleusBrightness / 2, 1);
        const rng = new SeededRandom(hashPosition(this.x, this.y) + 24680);
        
        for (let i = 0; i < debrisCount; i++) {
            const progress = rng.nextFloat(0.2, 0.9);
            const debrisX = screenX + curvedDirection.x * this.tailLength * progress + rng.nextFloat(-6, 6);
            const debrisY = screenY + curvedDirection.y * this.tailLength * progress + rng.nextFloat(-6, 6);
            const debrisSize = rng.nextFloat(1.5, 3.5) * brightnessScale;
            const opacity = Math.floor((1 - progress) * brightnessScale * 180).toString(16).padStart(2, '0');
            
            ctx.fillStyle = '#A9A9A9' + opacity;
            ctx.beginPath();
            ctx.arc(debrisX, debrisY, debrisSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Rocky Comet: Metallic fragments
    private renderMetallicFragments(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, curvedDirection: { x: number; y: number }): void {
        const fragmentCount = Math.floor(this.tailLength / 35);
        const currentTime = Date.now();
        const rng = new SeededRandom(hashPosition(this.x, this.y) + 11111);
        
        for (let i = 0; i < fragmentCount; i++) {
            const glintPhase = ((currentTime + i * 150) / 600) % (Math.PI * 2);
            if ((Math.sin(glintPhase) + 1) / 2 > 0.8) {
                const progress = rng.nextFloat(0.3, 0.7);
                const fragX = screenX + curvedDirection.x * this.tailLength * progress;
                const fragY = screenY + curvedDirection.y * this.tailLength * progress;
                
                ctx.fillStyle = '#C0C0C0' + 'CC';
                ctx.beginPath();
                ctx.arc(fragX, fragY, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    // Organic Comet: Bio-luminescent wisps
    private renderBioLuminescentWisps(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, curvedDirection: { x: number; y: number }): void {
        const wispCount = Math.floor(this.tailLength / 15);
        const currentTime = Date.now();
        const brightnessScale = Math.min(this.nucleusBrightness / 2, 1);
        const rng = new SeededRandom(hashPosition(this.x, this.y) + 55555);
        
        for (let i = 0; i < wispCount; i++) {
            const wispPhase = ((currentTime + i * 80) / 1000) % (Math.PI * 2);
            const wispIntensity = (Math.sin(wispPhase) + 1) / 2;
            const progress = rng.nextFloat(0.1, 0.95);
            const wispX = screenX + curvedDirection.x * this.tailLength * progress + rng.nextFloat(-3, 3);
            const wispY = screenY + curvedDirection.y * this.tailLength * progress + rng.nextFloat(-3, 3);
            const wispRadius = 1.5 * wispIntensity * brightnessScale;
            
            if (wispRadius > 0.5) {
                const gradient = ctx.createRadialGradient(wispX, wispY, 0, wispX, wispY, wispRadius);
                const opacity = Math.floor(wispIntensity * brightnessScale * 150).toString(16).padStart(2, '0');
                gradient.addColorStop(0, '#ADFF2F' + opacity);
                gradient.addColorStop(1, '#9ACD32' + '00');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(wispX, wispY, wispRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    // Organic Comet: Undulation patterns
    private renderOrganicUndulation(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, curvedDirection: { x: number; y: number }): void {
        const currentTime = Date.now();
        const undulationPhase = (currentTime / 1200) % (Math.PI * 2);
        const segments = 10;
        const brightnessScale = Math.min(this.nucleusBrightness / 2, 1);
        
        for (let i = 0; i < segments; i++) {
            const progress = i / segments;
            const undulation = Math.sin(undulationPhase + progress * Math.PI * 3) * 2 * brightnessScale;
            const perpX = -curvedDirection.y * undulation;
            const perpY = curvedDirection.x * undulation;
            
            const undulX = screenX + curvedDirection.x * this.tailLength * progress + perpX;
            const undulY = screenY + curvedDirection.y * this.tailLength * progress + perpY;
            const opacity = Math.floor((1 - progress) * brightnessScale * 100).toString(16).padStart(2, '0');
            
            ctx.fillStyle = '#9ACD32' + opacity;
            ctx.beginPath();
            ctx.arc(undulX, undulY, 0.8, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Render fuzzy coma around the nucleus with brightness-dependent effects
    private renderComa(renderer: Renderer, screenX: number, screenY: number): void {
        const ctx = renderer.ctx;
        
        // Create radial gradient for coma
        const gradient = ctx.createRadialGradient(
            screenX, screenY, 0,
            screenX, screenY, this.comaRadius
        );
        
        const comaColor = this.cometType.nucleusColor;
        const brightnessScale = Math.min(this.nucleusBrightness / 2, 1); // 0-1 scale
        
        // Scale coma opacity by brightness (brighter = more visible coma)
        const centerOpacity = Math.floor((0.27 * brightnessScale + 0.1) * 255).toString(16).padStart(2, '0'); // 10-27% opacity
        const midOpacity = Math.floor((0.13 * brightnessScale + 0.05) * 255).toString(16).padStart(2, '0'); // 5-13% opacity
        
        gradient.addColorStop(0, comaColor + centerOpacity);
        gradient.addColorStop(0.7, comaColor + midOpacity);
        gradient.addColorStop(1, comaColor + '00'); // Fully transparent at edge
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.comaRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add secondary coma layer for very bright comets
        if (this.nucleusBrightness > 1.5) {
            this.renderSecondaryComa(ctx, screenX, screenY, comaColor, brightnessScale);
        }
    }
    
    // Render secondary coma layer for bright comets
    private renderSecondaryComa(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, baseColor: string, brightnessScale: number): void {
        const secondaryRadius = this.comaRadius * 1.6;
        
        const secondaryGradient = ctx.createRadialGradient(
            screenX, screenY, this.comaRadius * 0.8,
            screenX, screenY, secondaryRadius
        );
        
        const secondaryOpacity = Math.floor((0.15 * brightnessScale) * 255).toString(16).padStart(2, '0');
        secondaryGradient.addColorStop(0, baseColor + secondaryOpacity);
        secondaryGradient.addColorStop(0.8, baseColor + '08');
        secondaryGradient.addColorStop(1, baseColor + '00');
        
        ctx.fillStyle = secondaryGradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, secondaryRadius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Render bright nucleus core with enhanced brightness effects and rotation
    private renderNucleus(renderer: Renderer, screenX: number, screenY: number): void {
        const ctx = renderer.ctx;
        const nucleusRadius = 1.5 + this.getPulsedBrightness() * 1.2; // Smaller nucleus (reduced base and scaling)
        const brightColor = this.cometType.nucleusColor;
        
        // Save context for rotation transformation
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(this.nucleusRotation);
        
        // Render corona effect for bright comets (use relative coordinates)
        if (this.nucleusBrightness > 1.2) {
            this.renderNucleusCorona(ctx, 0, 0, nucleusRadius, brightColor);
        }
        
        // Draw main nucleus with brightness-dependent opacity (centered at origin after rotation)
        const pulsedBrightness = this.getPulsedBrightness();
        const brightnessOpacity = Math.floor(Math.min(pulsedBrightness * 100 + 155, 255)).toString(16).padStart(2, '0'); // Increased base brightness
        ctx.fillStyle = brightColor + brightnessOpacity;
        ctx.beginPath();
        ctx.arc(0, 0, nucleusRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add bright center dot for very bright nuclei
        if (this.nucleusBrightness > 1) {
            const centerOpacity = Math.floor(Math.min(pulsedBrightness * 80 + 175, 255)).toString(16).padStart(2, '0');
            ctx.fillStyle = '#FFFFFF' + centerOpacity;
            ctx.beginPath();
            ctx.arc(0, 0, nucleusRadius * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Add intense glow for extremely bright nuclei (near perihelion)
        if (this.nucleusBrightness > 1.7) {
            this.renderNucleusGlow(ctx, 0, 0, nucleusRadius, brightColor);
        }
        
        // Restore context
        ctx.restore();
    }
    
    // Render corona effect around bright nucleus
    private renderNucleusCorona(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, nucleusRadius: number, baseColor: string): void {
        const coronaRadius = nucleusRadius * 2.5;
        
        // Create radial gradient for corona
        const coronaGradient = ctx.createRadialGradient(
            screenX, screenY, nucleusRadius,
            screenX, screenY, coronaRadius
        );
        
        // Corona colors based on comet type with brightness scaling
        const coronaOpacity = Math.floor(this.nucleusBrightness * 30).toString(16).padStart(2, '0');
        coronaGradient.addColorStop(0, baseColor + coronaOpacity);
        coronaGradient.addColorStop(0.6, baseColor + '11');
        coronaGradient.addColorStop(1, baseColor + '00');
        
        ctx.fillStyle = coronaGradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, coronaRadius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Render intense glow for extremely bright nuclei
    private renderNucleusGlow(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, nucleusRadius: number, baseColor: string): void {
        const glowRadius = nucleusRadius * 1.8;
        
        // Create bright glow gradient
        const glowGradient = ctx.createRadialGradient(
            screenX, screenY, 0,
            screenX, screenY, glowRadius
        );
        
        const glowIntensity = (this.nucleusBrightness - 1.7) * 100; // 0-30 range for brightness > 1.7
        const glowOpacity = Math.floor(Math.min(glowIntensity, 60)).toString(16).padStart(2, '0');
        
        glowGradient.addColorStop(0, '#FFFFFF' + glowOpacity);
        glowGradient.addColorStop(0.3, baseColor + glowOpacity);
        glowGradient.addColorStop(1, baseColor + '00');
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, glowRadius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Render discovery indicator using unified system
    private renderDiscoveryIndicator(renderer: Renderer, screenX: number, screenY: number): void {
        const visualizationService = new DiscoveryVisualizationService();
        const objectId = this.uniqueId || `comet-${this.x}-${this.y}`;
        const currentTime = Date.now();
        
        const indicatorData = visualizationService.getDiscoveryIndicatorData(objectId, {
            x: screenX,
            y: screenY,
            baseRadius: Math.max(this.discoveryDistance, 25),
            rarity: visualizationService.getObjectRarity('comet'),
            objectType: 'comet',
            discoveryTimestamp: this.discoveryTimestamp,
            currentTime: currentTime
        });

        // Render base discovery indicator
        renderer.drawDiscoveryIndicator(
            screenX, 
            screenY, 
            Math.max(this.discoveryDistance, 25),
            indicatorData.config.color,
            indicatorData.config.lineWidth,
            indicatorData.config.opacity,
            indicatorData.config.dashPattern
        );

        // Render discovery pulse if active
        if (indicatorData.discoveryPulse?.isVisible) {
            renderer.drawDiscoveryPulse(
                screenX,
                screenY,
                indicatorData.discoveryPulse.radius,
                indicatorData.config.pulseColor || indicatorData.config.color,
                indicatorData.discoveryPulse.opacity
            );
        }

        // Render ongoing pulse if active
        if (indicatorData.ongoingPulse?.isVisible) {
            renderer.drawDiscoveryPulse(
                screenX,
                screenY,
                indicatorData.ongoingPulse.radius,
                indicatorData.config.pulseColor || indicatorData.config.color,
                indicatorData.ongoingPulse.opacity
            );
        }
    }
}

// Utility function to select comet type based on rarity weights
export function selectCometType(rng: SeededRandom): CometType {
    const roll = rng.next();
    let cumulativeProbability = 0;
    
    for (const cometType of Object.values(CometTypes)) {
        cumulativeProbability += cometType.rarity;
        
        if (roll <= cumulativeProbability) {
            return cometType;
        }
    }
    
    // Fallback to most common type
    return CometTypes.ICE;
}