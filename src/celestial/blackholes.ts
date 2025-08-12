// Black Holes - Ultra-rare cosmic phenomena with universe reset mechanics
// TypeScript implementation with comprehensive gravitational physics
//
// 🕳️ IMPLEMENTATION STATUS:
// ✅ Phase 1 COMPLETE: Foundation & Core System
//    - BlackHole class with full gravitational physics
//    - Ultra-rare spawning (0.0001% chance - 1 per million chunks)  
//    - Two types: Stellar Mass (95%) and Supermassive (5%)
//    - Progressive warning system (4 levels: Safe → Caution → Danger → Event Horizon)
//    - Proximity alerts with throttling to prevent notification spam
//    - Singularity collision detection for universe reset
//    - Complete integration: discovery, naming, world generation, game loop
//    - Scientific naming: BH-1234 SMH (Stellar Mass) / BH-1234 SMBH (Supermassive)
//
// 🚧 Phase 2 Pending: Visual Rendering & Effects
//    - Accretion disk animation with layered depth effects
//    - Corona flickering and pulsing at event horizon edge
//    - Event horizon void rendering with gravitational lensing
//    - Dynamic particle effects around disk rim
//    - Scale-appropriate rendering for massive cosmic objects
//
// 🚧 Phase 4 Pending: Universe Reset Mechanics  
//    - Singularity collision → universe seed regeneration
//    - Discovery logbook preservation across resets
//    - Cosmic transition sequence (fade to cosmic colors → Big Bang emergence)
//    - Reset statistics tracking (universes explored)
//    - Safe respawn positioning in new universe

import { SeededRandom } from '../utils/random.js';
import { CelestialObject } from './celestial.js';

// Interface definitions
interface Renderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    drawCircle(x: number, y: number, radius: number, color: string): void;
}

interface Camera {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    worldToScreen(worldX: number, worldY: number, canvasWidth: number, canvasHeight: number): [number, number];
}

// Black hole type definition with gravitational and visual properties
interface BlackHoleType {
    name: string;
    description: string;
    // Size properties
    eventHorizonRadius: number;      // Event horizon size (200-400px)
    accretionDiskRadius: number;     // Visible accretion disk size
    singularityRadius: number;       // Collision detection radius for singularity (very small)
    
    // Gravitational properties
    gravitationalInfluence: number;  // Distance where gravity affects ship (800-1000px)
    gravitationalStrength: number;   // Pull force multiplier
    
    // Visual properties
    colors: {
        eventHorizon: string;        // Pure black void
        accretionDisk: string[];     // Bright, energetic colors
        corona: string[];            // Bright ring/halo colors
        singularity: string;         // Tiny bright point
    };
    
    // Animation properties  
    diskRotationSpeed: number;       // Accretion disk spin rate
    coronaFlickerRate: number;       // Corona intensity variation
    particleIntensity: number;       // Particle effect density
}

// Black hole visual effects configuration
interface AccretionDiskConfig {
    innerRadius: number;             // Multiple of event horizon radius
    outerRadius: number;             // Multiple of event horizon radius  
    layers: number;                  // Number of disk layers for depth
    rotationSpeed: number;           // Animation speed
    brightness: number;              // Overall brightness multiplier
    colors: string[];                // Color palette for disk
}

interface CoronaConfig {
    radius: number;                  // Multiple of event horizon radius
    intensity: number;               // Brightness intensity
    flickerSpeed: number;            // Pulsing/flickering rate
    colors: string[];                // Corona light colors
}

// Main BlackHole class extending CelestialObject
export class BlackHole extends CelestialObject {
    // Black hole type and properties
    blackHoleType: BlackHoleType;
    blackHoleTypeName: string;
    
    // Size and collision properties
    eventHorizonRadius: number;
    accretionDiskRadius: number;
    singularityRadius: number;
    gravitationalInfluence: number;
    
    // Physics properties
    gravitationalStrength: number;
    mass: number;                    // Relative mass for physics calculations
    
    // Visual configuration
    accretionDiskConfig: AccretionDiskConfig;
    coronaConfig: CoronaConfig;
    
    // Animation state
    diskRotation: number = 0;        // Current disk rotation angle
    coronaPhase: number = 0;         // Corona flickering phase
    
    // Warning and safety state
    isPlayerInDangerZone: boolean = false;
    isPlayerPastEventHorizon: boolean = false;
    warningLevel: number = 0;        // 0-3 progressive warning intensity
    
    // Universe reset state
    canTriggerReset: boolean = true;
    
    // Identification
    uniqueId: string;

    constructor(x: number, y: number, blackHoleType?: BlackHoleType) {
        super(x, y, 'blackhole');
        
        // Black hole type and properties
        this.blackHoleType = blackHoleType || BlackHoleTypes.STELLAR_MASS;
        this.blackHoleTypeName = this.blackHoleType.name;
        
        // Generate unique identifier
        this.uniqueId = this.generateUniqueId();
        
        // Initialize properties based on black hole type
        this.initializeBlackHoleProperties();
    }
    
    initializeBlackHoleProperties(): void {
        // Size properties from type definition
        this.eventHorizonRadius = this.blackHoleType.eventHorizonRadius;
        this.accretionDiskRadius = this.blackHoleType.accretionDiskRadius;
        this.singularityRadius = this.blackHoleType.singularityRadius;
        this.gravitationalInfluence = this.blackHoleType.gravitationalInfluence;
        
        // Discovery happens at maximum distance due to massive gravitational effects
        this.discoveryDistance = this.gravitationalInfluence;
        
        // Physics properties
        this.gravitationalStrength = this.blackHoleType.gravitationalStrength;
        this.mass = this.eventHorizonRadius * this.gravitationalStrength; // Mass proxy
        
        // Initialize visual configurations
        this.initializeVisualConfigurations();
    }

    initializeVisualConfigurations(): void {
        // Accretion disk configuration
        this.accretionDiskConfig = {
            innerRadius: 1.1,           // Just outside event horizon
            outerRadius: 2.5,           // 2.5x event horizon radius
            layers: 5,                  // Multiple layers for depth
            rotationSpeed: this.blackHoleType.diskRotationSpeed,
            brightness: 0.8,
            colors: this.blackHoleType.colors.accretionDisk
        };
        
        // Corona configuration
        this.coronaConfig = {
            radius: 1.05,               // Just at event horizon edge
            intensity: 0.9,
            flickerSpeed: this.blackHoleType.coronaFlickerRate,
            colors: this.blackHoleType.colors.corona
        };
    }

    // Initialize with seeded random for deterministic generation
    initWithSeed(rng: SeededRandom, blackHoleType?: BlackHoleType): void {
        // Update black hole type if provided
        if (blackHoleType) {
            this.blackHoleType = blackHoleType;
            this.blackHoleTypeName = this.blackHoleType.name;
        }
        
        // Add slight variations using seeded random while maintaining core properties
        const sizeVariation = rng.nextFloat(0.9, 1.1); // ±10% size variation
        this.eventHorizonRadius *= sizeVariation;
        this.accretionDiskRadius *= sizeVariation;
        this.gravitationalInfluence *= sizeVariation;
        
        // Re-initialize properties with variations
        this.initializeBlackHoleProperties();
    }

    generateUniqueId(): string {
        // Create unique identifier based on position
        return `blackhole_${Math.floor(this.x)}_${Math.floor(this.y)}`;
    }

    update(deltaTime: number): void {
        // Update animation states
        this.diskRotation += this.accretionDiskConfig.rotationSpeed * deltaTime;
        if (this.diskRotation > Math.PI * 2) {
            this.diskRotation -= Math.PI * 2;
        }
        
        this.coronaPhase += this.coronaConfig.flickerSpeed * deltaTime;
        if (this.coronaPhase > Math.PI * 2) {
            this.coronaPhase -= Math.PI * 2;
        }
    }

    // Check if ship is within gravitational influence and apply effects
    updateGravitationalEffects(camera: Camera, deltaTime: number): GravitationalEffects {
        const distance = this.distanceToShip(camera);
        
        // Reset states
        this.isPlayerInDangerZone = false;
        this.isPlayerPastEventHorizon = false;
        this.warningLevel = 0;
        
        // No effects if too far away
        if (distance > this.gravitationalInfluence) {
            return {
                pullForceX: 0,
                pullForceY: 0,
                warningLevel: 0,
                isInDangerZone: false,
                isPastEventHorizon: false
            };
        }
        
        // Calculate gravitational pull direction
        const dx = this.x - camera.x;
        const dy = this.y - camera.y;
        const pullDirection = Math.sqrt(dx * dx + dy * dy);
        const normalizedDx = dx / pullDirection;
        const normalizedDy = dy / pullDirection;
        
        // Calculate pull strength based on inverse square law (simplified)
        const influenceRatio = 1 - (distance / this.gravitationalInfluence);
        const pullStrength = this.gravitationalStrength * influenceRatio * influenceRatio;
        
        // Apply gravitational acceleration
        const pullForceX = normalizedDx * pullStrength;
        const pullForceY = normalizedDy * pullStrength;
        
        // Determine warning levels and danger states
        if (distance <= this.eventHorizonRadius) {
            this.isPlayerPastEventHorizon = true;
            this.warningLevel = 3; // Maximum danger
        } else if (distance <= this.eventHorizonRadius * 2) {
            this.isPlayerInDangerZone = true;
            this.warningLevel = 2; // High danger
        } else if (distance <= this.eventHorizonRadius * 4) {
            this.warningLevel = 1; // Caution
        }
        
        return {
            pullForceX,
            pullForceY,
            warningLevel: this.warningLevel,
            isInDangerZone: this.isPlayerInDangerZone,
            isPastEventHorizon: this.isPlayerPastEventHorizon
        };
    }

    // Check for singularity collision (universe reset trigger)
    checkSingularityCollision(camera: Camera): boolean {
        const distance = this.distanceToShip(camera);
        return distance <= this.singularityRadius && this.canTriggerReset;
    }

    // Get warning message based on proximity
    getProximityWarning(): string | null {
        switch (this.warningLevel) {
            case 1:
                return "Gravitational anomaly detected";
            case 2:
                return "Warning: Uncharted Gravity Well - Unknown Effects Beyond This Point";
            case 3:
                return "DANGER: Event Horizon Crossed - Singularity Ahead";
            default:
                return null;
        }
    }

    render(renderer: Renderer, camera: Camera): void {
        const [screenX, screenY] = camera.worldToScreen(this.x, this.y, renderer.canvas.width, renderer.canvas.height);
        
        // Calculate render bounds (much larger than normal objects)
        const renderBounds = this.accretionDiskRadius + 50;
        
        // Only render if on screen (with generous bounds)
        if (screenX >= -renderBounds && screenX <= renderer.canvas.width + renderBounds && 
            screenY >= -renderBounds && screenY <= renderer.canvas.height + renderBounds) {
            
            // Render accretion disk layers (behind event horizon)
            this.renderAccretionDisk(renderer, screenX, screenY);
            
            // Render event horizon (main black hole void)
            this.renderEventHorizon(renderer, screenX, screenY);
            
            // Render corona (bright ring at edge)
            this.renderCorona(renderer, screenX, screenY);
            
            // Render singularity point (tiny bright center)
            this.renderSingularity(renderer, screenX, screenY);
            
            // Render discovery indicator if discovered
            if (this.discovered) {
                this.renderDiscoveryIndicator(renderer, screenX, screenY);
            }
        }
    }

    private renderAccretionDisk(renderer: Renderer, centerX: number, centerY: number): void {
        const ctx = renderer.ctx;
        const time = Date.now() * 0.001;
        
        // Render multiple disk layers for depth
        for (let layer = 0; layer < this.accretionDiskConfig.layers; layer++) {
            const layerProgress = layer / (this.accretionDiskConfig.layers - 1);
            const innerRadius = this.eventHorizonRadius * (this.accretionDiskConfig.innerRadius + layerProgress * 0.1);
            const outerRadius = this.eventHorizonRadius * (this.accretionDiskConfig.innerRadius + layerProgress * 
                (this.accretionDiskConfig.outerRadius - this.accretionDiskConfig.innerRadius));
            
            // Color for this layer
            const colorIndex = Math.floor(layerProgress * (this.accretionDiskConfig.colors.length - 1));
            const layerColor = this.accretionDiskConfig.colors[colorIndex];
            
            // Brightness decreases with outer layers
            const brightness = this.accretionDiskConfig.brightness * (1 - layerProgress * 0.3);
            const alpha = Math.floor(brightness * 255).toString(16).padStart(2, '0');
            
            // Create gradient for disk layer
            const gradient = ctx.createRadialGradient(
                centerX, centerY, innerRadius,
                centerX, centerY, outerRadius
            );
            
            // Add rotation effect by varying opacity
            const rotationOffset = this.diskRotation + layer * 0.5;
            const rotationIntensity = (Math.sin(rotationOffset) * 0.3 + 0.7);
            const dynamicAlpha = Math.floor(brightness * rotationIntensity * 255).toString(16).padStart(2, '0');
            
            gradient.addColorStop(0, layerColor + dynamicAlpha);
            gradient.addColorStop(0.7, layerColor + Math.floor(brightness * 0.5 * 255).toString(16).padStart(2, '0'));
            gradient.addColorStop(1, layerColor + '00');
            
            // Draw disk layer
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
            ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2, true); // Cut out inner hole
            ctx.fill();
        }
    }

    private renderEventHorizon(renderer: Renderer, centerX: number, centerY: number): void {
        const ctx = renderer.ctx;
        
        // Render as pure black void - nothing escapes
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.eventHorizonRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add subtle edge gradient to show boundary
        const edgeGradient = ctx.createRadialGradient(
            centerX, centerY, this.eventHorizonRadius * 0.95,
            centerX, centerY, this.eventHorizonRadius * 1.05
        );
        edgeGradient.addColorStop(0, '#000000FF');
        edgeGradient.addColorStop(1, '#00000000');
        
        ctx.fillStyle = edgeGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.eventHorizonRadius * 1.05, 0, Math.PI * 2);
        ctx.fill();
    }

    private renderCorona(renderer: Renderer, centerX: number, centerY: number): void {
        const ctx = renderer.ctx;
        const coronaRadius = this.eventHorizonRadius * this.coronaConfig.radius;
        
        // Calculate flickering intensity
        const flickerIntensity = Math.sin(this.coronaPhase) * 0.3 + 0.7;
        const intensity = this.coronaConfig.intensity * flickerIntensity;
        
        // Render corona as bright ring at event horizon edge
        for (let i = 0; i < this.coronaConfig.colors.length; i++) {
            const color = this.coronaConfig.colors[i];
            const layerRadius = coronaRadius + i * 2;
            const layerIntensity = intensity * (1 - i * 0.2);
            
            const alpha = Math.floor(layerIntensity * 255).toString(16).padStart(2, '0');
            
            ctx.strokeStyle = color + alpha;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(centerX, centerY, layerRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    private renderSingularity(renderer: Renderer, centerX: number, centerY: number): void {
        const ctx = renderer.ctx;
        
        // Render tiny bright point at absolute center - the singularity
        const singularityColor = this.blackHoleType.colors.singularity;
        
        // Pulsing bright point
        const pulse = Math.sin(Date.now() * 0.005) * 0.5 + 1.0;
        const alpha = Math.floor(pulse * 255).toString(16).padStart(2, '0');
        
        ctx.fillStyle = singularityColor + alpha;
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.singularityRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add subtle glow around singularity
        const glowGradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, this.singularityRadius * 3
        );
        glowGradient.addColorStop(0, singularityColor + alpha);
        glowGradient.addColorStop(1, singularityColor + '00');
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.singularityRadius * 3, 0, Math.PI * 2);
        ctx.fill();
    }

    private renderDiscoveryIndicator(renderer: Renderer, centerX: number, centerY: number): void {
        const ctx = renderer.ctx;
        const time = Date.now() * 0.003;
        
        // Special discovery indicator for black holes - pulsing danger ring
        const indicatorRadius = this.eventHorizonRadius + 20 + Math.sin(time) * 5;
        const alpha = (Math.sin(time * 2) * 0.5 + 0.5) * 0.8;
        const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0');
        
        ctx.strokeStyle = '#ff0000' + alphaHex; // Red danger indicator
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, indicatorRadius, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// Gravitational effects interface
interface GravitationalEffects {
    pullForceX: number;
    pullForceY: number;
    warningLevel: number;        // 0-3 progressive warning
    isInDangerZone: boolean;
    isPastEventHorizon: boolean;
}

// Black hole type definitions
export const BlackHoleTypes: Record<string, BlackHoleType> = {
    STELLAR_MASS: {
        name: 'Stellar Mass Black Hole',
        description: 'A black hole formed from the collapse of a massive star',
        eventHorizonRadius: 250,     // Large and imposing
        accretionDiskRadius: 600,    // Massive visible disk
        singularityRadius: 3,        // Tiny collision point
        gravitationalInfluence: 900, // Wide gravitational field
        gravitationalStrength: 120,  // Strong pull
        colors: {
            eventHorizon: '#000000',
            accretionDisk: ['#ff6600', '#ffaa00', '#ffdd44', '#ffffff'],
            corona: ['#ffffff', '#aaeeff', '#66ccff'],
            singularity: '#ffffff'
        },
        diskRotationSpeed: 1.2,
        coronaFlickerRate: 2.0,
        particleIntensity: 0.8
    },
    
    SUPERMASSIVE: {
        name: 'Supermassive Black Hole',
        description: 'A massive black hole typically found at galactic centers',
        eventHorizonRadius: 400,     // Enormous and dominating
        accretionDiskRadius: 1000,   // Vast accretion disk
        singularityRadius: 5,        // Slightly larger collision point
        gravitationalInfluence: 1200, // Massive gravitational field
        gravitationalStrength: 200,   // Extremely strong pull
        colors: {
            eventHorizon: '#000000',
            accretionDisk: ['#ff0044', '#ff4400', '#ffaa00', '#ffff88', '#ffffff'],
            corona: ['#ffffff', '#ffdddd', '#88aaff'],
            singularity: '#ffffff'
        },
        diskRotationSpeed: 0.8,      // Slower, more majestic rotation
        coronaFlickerRate: 1.5,
        particleIntensity: 1.0
    }
};

// Export utility function for black hole generation (will be used by world generation)
export function generateBlackHole(x: number, y: number, rng: SeededRandom): BlackHole {
    // Ultra-rare black holes - most are stellar mass, very few supermassive
    const blackHoleType = rng.next() < 0.95 ? BlackHoleTypes.STELLAR_MASS : BlackHoleTypes.SUPERMASSIVE;
    
    const blackHole = new BlackHole(x, y, blackHoleType);
    blackHole.initWithSeed(rng, blackHoleType);
    
    return blackHole;
}