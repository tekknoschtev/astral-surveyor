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
        
        // Set discovery distance from configuration
        this.discoveryDistance = DiscoveryConfig.distances.comet;
        
        // Generate unique identifier for this comet
        this.uniqueId = this.generateUniqueId();
        
        // Calculate initial position and visual properties
        this.updatePosition();
        this.updateVisualProperties();
    }
    
    // Generate unique identifier using star position and comet index
    generateUniqueId(): string {
        const starX = Math.floor(this.parentStar.x);
        const starY = Math.floor(this.parentStar.y);
        return `comet_${starX}_${starY}_${this.cometIndex}`;
    }
    
    // Calculate current position using deterministic universal time
    updatePosition(): void {
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
    private calculateUniversalTime(): number {
        // Use star position and comet index to create deterministic time
        const timeSeed = hashPosition(this.parentStar.x, this.parentStar.y) + this.cometIndex * 1000;
        return timeSeed % this.orbit.orbitalPeriod;
    }
    
    // Solve Kepler's equation: M = E - e*sin(E) for eccentric anomaly E
    // Uses Newton-Raphson iteration for accuracy
    private solveKeplersEquation(meanAnomaly: number, eccentricity: number): number {
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
        // TODO: Get actual outermost planet orbit from star system
        const visibilityThreshold = 500; // Placeholder - will be calculated from star system
        this.isVisible = this.currentDistance <= visibilityThreshold;
        
        if (!this.isVisible) {
            this.tailLength = 0;
            this.nucleusBrightness = 0.1;
            this.comaRadius = 0;
            return;
        }
        
        // Calculate brightness factor (closer = brighter)
        const brightnessFactor = this.orbit.perihelionDistance / this.currentDistance;
        
        // Update tail length (longer when closer to star)
        const baseTailLength = 30; // Minimum tail length when visible
        const maxTailLength = 120; // Maximum tail length at perihelion
        this.tailLength = baseTailLength + (maxTailLength - baseTailLength) * Math.min(brightnessFactor - 1, 2);
        
        // Update nucleus brightness
        this.nucleusBrightness = Math.min(brightnessFactor, 2.0);
        
        // Update coma radius (fuzzy glow around nucleus)
        this.comaRadius = 3 + 7 * Math.min(brightnessFactor - 1, 1);
        
        // Set discovery distance based on visibility
        this.discoveryDistance = this.isVisible ? Math.max(30, this.tailLength + 20) : 0;
    }
    
    // Render the comet with all visual effects
    render(renderer: Renderer, camera: Camera): void {
        // Don't render if not visible
        if (!this.isVisible) return;
        
        const [screenX, screenY] = camera.worldToScreen(this.x, this.y, renderer.canvas.width, renderer.canvas.height);
        
        // Only render if on screen (with margin for tail)
        const margin = this.tailLength + 50;
        if (screenX < -margin || screenX > renderer.canvas.width + margin ||
            screenY < -margin || screenY > renderer.canvas.height + margin) {
            return;
        }
        
        // Render tail first (behind nucleus)
        if (this.tailLength > 0) {
            this.renderTail(renderer, screenX, screenY);
        }
        
        // Render coma (fuzzy glow around nucleus)
        if (this.comaRadius > 0) {
            this.renderComa(renderer, screenX, screenY);
        }
        
        // Render nucleus (bright core)
        this.renderNucleus(renderer, screenX, screenY);
        
        // Render discovery indicator if discovered
        if (this.discovered) {
            this.renderDiscoveryIndicator(renderer, screenX, screenY);
        }
    }
    
    // Render the comet's tail pointing away from the star
    private renderTail(renderer: Renderer, screenX: number, screenY: number): void {
        const ctx = renderer.ctx;
        
        // Calculate tail end position
        const tailEndX = screenX + this.tailDirection.x * this.tailLength;
        const tailEndY = screenY + this.tailDirection.y * this.tailLength;
        
        // Create gradient from nucleus to tail end
        const gradient = ctx.createLinearGradient(screenX, screenY, tailEndX, tailEndY);
        
        // Use comet type colors for gradient
        const colors = this.cometType.tailColors;
        gradient.addColorStop(0, colors[0] + 'CC'); // Base color, ~80% opacity
        gradient.addColorStop(0.5, colors[1] + '88'); // Middle color, ~53% opacity
        gradient.addColorStop(1, colors[2] + '22'); // Tip color, ~13% opacity
        
        // Draw tail as thick line with gradient
        ctx.strokeStyle = gradient;
        ctx.lineWidth = Math.max(2, this.tailLength / 30);
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(tailEndX, tailEndY);
        ctx.stroke();
        
        // Add subtle particle effects for more visual interest
        this.renderTailParticles(ctx, screenX, screenY, tailEndX, tailEndY);
    }
    
    // Render particle effects along the tail
    private renderTailParticles(ctx: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number): void {
        const particleCount = Math.floor(this.cometType.tailParticleCount * (this.tailLength / 120));
        const baseColor = this.cometType.tailColors[0];
        
        // Use deterministic positioning for particles
        const particleSeed = hashPosition(this.x, this.y) + 12345;
        const rng = new SeededRandom(particleSeed);
        
        for (let i = 0; i < particleCount; i++) {
            const progress = (i + 1) / particleCount; // 0 to 1 along tail
            const particleX = startX + (endX - startX) * progress;
            const particleY = startY + (endY - startY) * progress;
            
            // Add slight random offset perpendicular to tail direction
            const perpX = -this.tailDirection.y * rng.nextFloat(-3, 3);
            const perpY = this.tailDirection.x * rng.nextFloat(-3, 3);
            
            const finalX = particleX + perpX;
            const finalY = particleY + perpY;
            
            // Particle size and opacity decrease toward tail end
            const size = Math.max(0.5, (1 - progress) * 2);
            const opacity = Math.floor((1 - progress * 0.7) * 255).toString(16).padStart(2, '0');
            
            ctx.fillStyle = baseColor + opacity;
            ctx.beginPath();
            ctx.arc(finalX, finalY, size, 0, Math.PI * 2);
            ctx.fill();
            
            // Add glitter effect for some particles
            if (rng.next() < this.cometType.glitterChance * (1 - progress)) {
                ctx.fillStyle = '#FFFFFF' + Math.floor(0.5 * 255).toString(16).padStart(2, '0');
                ctx.beginPath();
                ctx.arc(finalX, finalY, size * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    // Render fuzzy coma around the nucleus
    private renderComa(renderer: Renderer, screenX: number, screenY: number): void {
        const ctx = renderer.ctx;
        
        // Create radial gradient for coma
        const gradient = ctx.createRadialGradient(
            screenX, screenY, 0,
            screenX, screenY, this.comaRadius
        );
        
        const comaColor = this.cometType.nucleusColor;
        gradient.addColorStop(0, comaColor + '44'); // ~27% opacity at center
        gradient.addColorStop(0.7, comaColor + '22'); // ~13% opacity
        gradient.addColorStop(1, comaColor + '00'); // Fully transparent at edge
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.comaRadius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Render bright nucleus core
    private renderNucleus(renderer: Renderer, screenX: number, screenY: number): void {
        const nucleusRadius = 2 + this.nucleusBrightness * 1.5;
        const brightColor = this.cometType.nucleusColor;
        
        // Draw main nucleus
        renderer.ctx.fillStyle = brightColor;
        renderer.ctx.beginPath();
        renderer.ctx.arc(screenX, screenY, nucleusRadius, 0, Math.PI * 2);
        renderer.ctx.fill();
        
        // Add bright center dot
        if (this.nucleusBrightness > 1) {
            renderer.ctx.fillStyle = '#FFFFFF';
            renderer.ctx.beginPath();
            renderer.ctx.arc(screenX, screenY, nucleusRadius * 0.5, 0, Math.PI * 2);
            renderer.ctx.fill();
        }
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