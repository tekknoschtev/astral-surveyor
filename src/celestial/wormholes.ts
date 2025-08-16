// Wormhole System - Paired traversable spacetime anomalies for FTL travel
// Extremely rare phenomena that enable instantaneous travel across vast cosmic distances

// Import dependencies
import { SeededRandom, hashPosition } from '../utils/random.js';
import { CelestialObject } from './celestial.js';

// Interface definitions
interface Renderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
}

interface Camera {
    x: number;
    y: number;
    worldToScreen(worldX: number, worldY: number, canvasWidth: number, canvasHeight: number): [number, number];
}

interface WormholeParticle {
    angle: number;
    radius: number;
    speed: number;
    brightness: number;
    color: string;
    size: number;
}

interface WormholeType {
    name: string;
    description: string;
    colors: string[]; // Base colors for the wormhole vortex
    accentColors: string[]; // Bright energy colors
    particleCount: number;
    vortexIntensity: number;
    energyField: {
        innerRadius: number; // Multiplier of wormhole radius
        outerRadius: number; // Multiplier of wormhole radius
        pulseSpeed: number;
        colors: string[];
    };
    rarity: number; // Not used for spawning, but for scientific classification
    discoveryValue: number;
}

// Wormhole type definitions (scientific classifications)
export const WormholeTypes: Record<string, WormholeType> = {
    stable: {
        name: 'Stable Traversable Wormhole',
        description: 'A naturally occurring Einstein-Rosen bridge with exotic matter stabilization',
        colors: ['#4169E1', '#1E90FF', '#0047AB'], // Blue spectrum - stable energy
        accentColors: ['#87CEEB', '#ADD8E6', '#E0FFFF'], // Light blue accents
        particleCount: 24,
        vortexIntensity: 0.8,
        energyField: {
            innerRadius: 1.2,
            outerRadius: 1.8,
            pulseSpeed: 0.5,
            colors: ['#4169E1', '#87CEEB', '#E0FFFF']
        },
        rarity: 1.0, // All wormholes are this type for now
        discoveryValue: 100 // Extremely valuable discovery
    }
};

export class Wormhole extends CelestialObject {
    // Wormhole identification and pairing
    wormholeId: string; // Shared ID for the pair (e.g., "WH-1234")
    designation: 'alpha' | 'beta'; // α or β designation
    pairId: string; // Full ID including designation (e.g., "WH-1234-α")
    
    // Twin wormhole reference
    twinX: number;
    twinY: number;
    twinWormhole?: Wormhole; // Reference to the paired wormhole
    
    // Physical properties
    radius: number = 40; // Base wormhole aperture radius
    wormholeType: WormholeType;
    
    // Visual properties
    particles: WormholeParticle[] = [];
    vortexRotation: number = 0;
    energyPulse: number = 0;
    
    // Travel mechanics
    isActive: boolean = true; // Whether wormhole can be traversed
    lastTraversal: number = 0; // Timestamp of last use (for cooldown if needed)
    
    // Unique identifier for this specific wormhole instance
    uniqueId: string;

    constructor(x: number, y: number, wormholeId: string, designation: 'alpha' | 'beta', twinX: number, twinY: number, random: SeededRandom) {
        super(x, y, 'wormhole'); // Wormhole type specification
        
        // Wormhole identification
        this.wormholeId = wormholeId;
        this.designation = designation;
        this.pairId = `${wormholeId}-${designation === 'alpha' ? 'α' : 'β'}`;
        
        // Twin location
        this.twinX = twinX;
        this.twinY = twinY;
        
        // Physical properties - wormholes are larger and more discoverable than planets
        this.radius = random.nextFloat(35, 45); // 35-45 pixel radius
        this.discoveryDistance = this.radius + 75; // 110-120 pixel discovery range
        
        // Set wormhole type (for now, all are stable)
        this.wormholeType = WormholeTypes.stable;
        
        // Generate unique identifier
        this.uniqueId = `wormhole_${Math.floor(x)}_${Math.floor(y)}_${designation}`;
        
        // Initialize visual system
        this.generateParticles(random);
        
        // Initialize animation states
        this.vortexRotation = random.next() * Math.PI * 2; // Random starting rotation
        this.energyPulse = random.next() * Math.PI * 2; // Random pulse phase
    }

    private generateParticles(random: SeededRandom): void {
        this.particles = [];
        const particleCount = this.wormholeType.particleCount;
        
        for (let i = 0; i < particleCount; i++) {
            // Generate particles in multiple spiral layers for depth
            const layerCount = 3;
            const layer = i % layerCount;
            const particlesPerLayer = Math.floor(particleCount / layerCount);
            const angleStep = (Math.PI * 2) / particlesPerLayer;
            const baseAngle = (Math.floor(i / layerCount)) * angleStep;
            
            // Add some random variation to angle and radius
            const angleVariation = random.nextFloat(-0.3, 0.3);
            const radiusVariation = random.nextFloat(0.8, 1.2);
            
            const particle: WormholeParticle = {
                angle: baseAngle + angleVariation + layer * 0.2, // Offset each layer
                radius: (0.2 + layer * 0.3) * this.radius * radiusVariation, // Inner to outer layers
                speed: random.nextFloat(0.3, 0.8) * (1 + layer * 0.2), // Outer layers rotate faster
                brightness: random.nextFloat(0.5, 1.0),
                color: random.choice(this.wormholeType.colors),
                size: random.nextFloat(1, 3) * (1 - layer * 0.2) // Inner particles larger
            };
            
            this.particles.push(particle);
        }
    }

    // Check if ship can traverse this wormhole
    canTraverse(camera: Camera): boolean {
        if (!this.isActive) return false;
        
        // Calculate distance from camera (ship) to wormhole center
        const distance = Math.sqrt(
            Math.pow(camera.x - this.x, 2) + Math.pow(camera.y - this.y, 2)
        );
        
        // Ship must be within the wormhole aperture to traverse
        return distance <= this.radius * 0.8; // Slightly smaller than visual radius
    }

    // Get traversal destination coordinates (with offset to avoid immediate re-entry)
    getDestinationCoordinates(shipVelocityX?: number, shipVelocityY?: number): { x: number, y: number } {
        let offsetAngle: number;
        const offsetDistance = 80; // Increased distance for better safety margin
        
        if (shipVelocityX !== undefined && shipVelocityY !== undefined) {
            // Calculate ship's velocity vector
            const velocityMagnitude = Math.sqrt(shipVelocityX * shipVelocityX + shipVelocityY * shipVelocityY);
            
            if (velocityMagnitude > 0.1) { // Only consider velocity if ship is moving
                // Get the angle of ship's movement
                const velocityAngle = Math.atan2(shipVelocityY, shipVelocityX);
                
                // Position ship so it exits in the same direction it was traveling
                // This prevents the ship from moving back toward the wormhole
                offsetAngle = velocityAngle;
            } else {
                // Ship has minimal velocity, use deterministic offset based on wormhole ID
                offsetAngle = this.getDeterministicAngle();
            }
        } else {
            // Fallback: use deterministic offset based on wormhole ID
            offsetAngle = this.getDeterministicAngle();
        }
        
        return {
            x: this.twinX + Math.cos(offsetAngle) * offsetDistance,
            y: this.twinY + Math.sin(offsetAngle) * offsetDistance
        };
    }

    // Get a deterministic angle based on wormhole properties
    private getDeterministicAngle(): number {
        // Create a simple hash from wormhole ID and position
        let hash = 0;
        const str = this.wormholeId + this.designation;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0xffffffff;
        }
        // Add position to make it more unique
        hash = (hash + Math.floor(this.x) + Math.floor(this.y)) & 0xffffffff;
        
        // Convert to angle between 0 and 2π
        return (Math.abs(hash) % 360) * (Math.PI / 180);
    }

    // Update wormhole animations and effects
    update(deltaTime: number): void {
        // Update vortex rotation
        this.vortexRotation += deltaTime * 0.5; // Slow, mesmerizing rotation
        if (this.vortexRotation >= Math.PI * 2) {
            this.vortexRotation -= Math.PI * 2;
        }
        
        // Update energy pulse
        this.energyPulse += deltaTime * this.wormholeType.energyField.pulseSpeed;
        if (this.energyPulse >= Math.PI * 2) {
            this.energyPulse -= Math.PI * 2;
        }
        
        // Update particle positions
        for (const particle of this.particles) {
            particle.angle += particle.speed * deltaTime;
            if (particle.angle >= Math.PI * 2) {
                particle.angle -= Math.PI * 2;
            }
        }
    }

    render(renderer: Renderer, camera: Camera, destinationPreview?: { x: number; y: number; type: string; relativeX?: number; relativeY?: number }[]): void {
        const [screenX, screenY] = camera.worldToScreen(
            this.x, 
            this.y, 
            renderer.canvas.width, 
            renderer.canvas.height
        );

        // Skip rendering if wormhole is way off screen
        const renderRadius = this.radius + 30;
        if (screenX < -renderRadius || screenX > renderer.canvas.width + renderRadius ||
            screenY < -renderRadius || screenY > renderer.canvas.height + renderRadius) {
            return;
        }

        const ctx = renderer.ctx;
        ctx.save();

        // Render energy field (background layer)
        this.renderEnergyField(ctx, screenX, screenY);
        
        // Render main vortex
        this.renderVortex(ctx, screenX, screenY);
        
        // Render swirling particles
        this.renderParticles(ctx, screenX, screenY);
        
        // Render central aperture (the "hole" effect with gravitational lensing)
        this.renderAperture(ctx, screenX, screenY, destinationPreview);
        
        // Render discovery indicator if discovered
        if (this.discovered) {
            this.renderDiscoveryIndicator(ctx, screenX, screenY);
        }

        ctx.restore();
    }

    private renderEnergyField(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
        const config = this.wormholeType.energyField;
        const innerRadius = this.radius * config.innerRadius;
        const outerRadius = this.radius * config.outerRadius;
        
        // Pulsing energy field
        const pulseIntensity = Math.sin(this.energyPulse) * 0.3 + 0.7;
        
        // Create radial gradient for energy field
        const gradient = ctx.createRadialGradient(
            screenX, screenY, innerRadius,
            screenX, screenY, outerRadius
        );
        
        const baseAlpha = 0.1 * pulseIntensity;
        const accentColor = this.wormholeType.accentColors[0];
        
        gradient.addColorStop(0, accentColor + Math.floor(baseAlpha * 255).toString(16).padStart(2, '0'));
        gradient.addColorStop(0.7, accentColor + Math.floor(baseAlpha * 0.5 * 255).toString(16).padStart(2, '0'));
        gradient.addColorStop(1, accentColor + '00'); // Transparent at edge
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, outerRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    private renderVortex(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
        // Create the main swirling vortex with multiple layers
        const layerCount = 4;
        
        for (let layer = 0; layer < layerCount; layer++) {
            const layerRadius = this.radius * (1 - layer * 0.15); // Concentric layers
            const layerRotation = this.vortexRotation + layer * 0.3; // Different rotation per layer
            const layerAlpha = (0.3 - layer * 0.05) * this.wormholeType.vortexIntensity;
            
            // Create spiral gradient
            const spiralGradient = ctx.createRadialGradient(
                screenX, screenY, layerRadius * 0.2,
                screenX, screenY, layerRadius
            );
            
            const color = this.wormholeType.colors[layer % this.wormholeType.colors.length];
            const alphaHex = Math.floor(layerAlpha * 255).toString(16).padStart(2, '0');
            
            spiralGradient.addColorStop(0, color + alphaHex);
            spiralGradient.addColorStop(0.5, color + Math.floor(layerAlpha * 0.6 * 255).toString(16).padStart(2, '0'));
            spiralGradient.addColorStop(1, color + '00');
            
            // Draw spiral arms
            ctx.fillStyle = spiralGradient;
            const armCount = 3; // Three-armed spiral
            
            for (let arm = 0; arm < armCount; arm++) {
                const armAngle = layerRotation + (arm * Math.PI * 2 / armCount);
                
                ctx.save();
                ctx.translate(screenX, screenY);
                ctx.rotate(armAngle);
                
                // Draw spiral arm as an elongated ellipse
                ctx.beginPath();
                ctx.ellipse(0, 0, layerRadius, layerRadius * 0.3, 0, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.restore();
            }
        }
    }

    private renderParticles(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
        for (const particle of this.particles) {
            const particleX = screenX + Math.cos(particle.angle + this.vortexRotation * 0.3) * particle.radius;
            const particleY = screenY + Math.sin(particle.angle + this.vortexRotation * 0.3) * particle.radius;
            
            // Dynamic brightness based on position and time
            const dynamicBrightness = particle.brightness * (Math.sin(this.energyPulse + particle.angle) * 0.3 + 0.7);
            const alpha = Math.floor(dynamicBrightness * 255).toString(16).padStart(2, '0');
            
            ctx.fillStyle = particle.color + alpha;
            ctx.beginPath();
            ctx.arc(particleX, particleY, particle.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Add bright core for larger particles
            if (particle.size > 2) {
                ctx.fillStyle = this.wormholeType.accentColors[0] + Math.floor(dynamicBrightness * 0.8 * 255).toString(16).padStart(2, '0');
                ctx.beginPath();
                ctx.arc(particleX, particleY, particle.size * 0.4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    private renderAperture(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, destinationPreview?: { x: number; y: number; type: string; relativeX?: number; relativeY?: number }[]): void {
        const apertureRadius = this.radius * 0.4;
        
        // Create clipping mask for the aperture
        ctx.save();
        ctx.beginPath();
        ctx.arc(screenX, screenY, apertureRadius, 0, Math.PI * 2);
        ctx.clip();
        
        // Render dark background first
        const gradient = ctx.createRadialGradient(
            screenX, screenY, 0,
            screenX, screenY, apertureRadius
        );
        
        gradient.addColorStop(0, '#000015'); // Very dark center
        gradient.addColorStop(0.8, '#000030');
        gradient.addColorStop(1, this.wormholeType.colors[0] + '40'); // Subtle edge glow
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, apertureRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Render gravitational lensing preview if destination objects are available
        if (destinationPreview && destinationPreview.length > 0) {
            this.renderLensingPreview(ctx, screenX, screenY, apertureRadius, destinationPreview);
        }
        
        ctx.restore();
        
        // Add subtle aperture rim glow
        ctx.strokeStyle = this.wormholeType.colors[0] + '60';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(screenX, screenY, apertureRadius, 0, Math.PI * 2);
        ctx.stroke();
    }

    private renderLensingPreview(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, apertureRadius: number, previewObjects: { x: number; y: number; type: string; relativeX?: number; relativeY?: number }[]): void {
        // Scale factor for rendering objects within the aperture
        const previewScale = apertureRadius / 150; // 150px preview area maps to aperture
        const maxDistance = 300; // Max distance we're previewing from destination
        
        ctx.save();
        
        // Slight transparency for lensing effect
        ctx.globalAlpha = 0.7;
        
        for (const obj of previewObjects) {
            // Calculate scaled position within aperture
            const scaledX = centerX + (obj.relativeX * previewScale);
            const scaledY = centerY + (obj.relativeY * previewScale);
            
            // Skip if object would be outside aperture (shouldn't happen with proper filtering)
            const distanceFromCenter = Math.sqrt(Math.pow(scaledX - centerX, 2) + Math.pow(scaledY - centerY, 2));
            if (distanceFromCenter > apertureRadius * 0.9) continue;
            
            // Render different object types with simplified visuals
            this.renderPreviewObject(ctx, scaledX, scaledY, obj, previewScale);
        }
        
        ctx.restore();
        
        // Add subtle lensing distortion effect
        this.renderLensingDistortion(ctx, centerX, centerY, apertureRadius);
    }

    private renderPreviewObject(ctx: CanvasRenderingContext2D, x: number, y: number, obj: { type: string; radius?: number; color?: string; nebulaType?: string }, scale: number): void {
        const size = Math.max(1, (obj.radius || 10) * scale * 0.3); // Scale down object sizes
        
        switch (obj.type) {
            case 'star':
                // Simplified star rendering
                ctx.fillStyle = obj.color || '#FFFFFF';
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
                
                // Add star glow
                ctx.fillStyle = (obj.color || '#FFFFFF') + '40';
                ctx.beginPath();
                ctx.arc(x, y, size * 2, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'planet':
                // Simplified planet rendering
                ctx.fillStyle = obj.color || '#8B4513';
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'nebula':
                // Simplified nebula rendering
                const nebulaColors = ['#FF69B4', '#9370DB', '#00CED1'];
                ctx.fillStyle = (nebulaColors[obj.nebulaType] || nebulaColors[0]) + '60';
                ctx.beginPath();
                ctx.arc(x, y, size * 2, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'wormhole':
                // Simplified wormhole rendering (just a swirl)
                ctx.strokeStyle = this.wormholeType.colors[0];
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.stroke();
                break;
                
            default:
                // Generic object (asteroids, moons, etc.)
                ctx.fillStyle = obj.color || '#888888';
                ctx.beginPath();
                ctx.arc(x, y, size * 0.7, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
    }

    private renderLensingDistortion(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, apertureRadius: number): void {
        // Add subtle concentric rings to show gravitational lensing effect
        ctx.strokeStyle = this.wormholeType.accentColors[0] + '20';
        ctx.lineWidth = 1;
        
        for (let i = 1; i <= 3; i++) {
            const ringRadius = (apertureRadius * i) / 4;
            ctx.beginPath();
            ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    private renderDiscoveryIndicator(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
        // Golden rotating ring for discovered wormholes
        const indicatorRadius = this.radius + 10;
        const rotationSpeed = this.vortexRotation * 2; // Rotate faster than vortex
        
        ctx.strokeStyle = '#FFD700'; // Gold
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]); // Dashed line
        
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(rotationSpeed);
        
        ctx.beginPath();
        ctx.arc(0, 0, indicatorRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
        ctx.setLineDash([]); // Reset line dash
        
        // Add designation marker (α or β)
        const designation = this.designation === 'alpha' ? 'α' : 'β';
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(designation, screenX + indicatorRadius + 15, screenY - 5);
    }

    // Get discovery data for saving/loading
    getDiscoveryData(): { discovered: boolean; wormholeId: string; designation: string; pairId: string; twinX: number; twinY: number; timestamp: number; discoveryValue?: number } {
        return {
            discovered: this.discovered,
            wormholeId: this.wormholeId,
            designation: this.designation,
            pairId: this.pairId,
            twinX: this.twinX,
            twinY: this.twinY,
            timestamp: Date.now(),
            discoveryValue: this.wormholeType.discoveryValue
        };
    }
}

// Utility function for generating wormhole pairs
export function generateWormholePair(pair1X: number, pair1Y: number, pair2X: number, pair2Y: number, wormholeId: string, random: SeededRandom): [Wormhole, Wormhole] {
    const alpha = new Wormhole(pair1X, pair1Y, wormholeId, 'alpha', pair2X, pair2Y, random);
    const beta = new Wormhole(pair2X, pair2Y, wormholeId, 'beta', pair1X, pair1Y, random);
    
    // Cross-reference the twins
    alpha.twinWormhole = beta;
    beta.twinWormhole = alpha;
    
    return [alpha, beta];
}