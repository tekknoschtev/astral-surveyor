// Nebulae System - Beautiful gas clouds for tranquil exploration
// Procedural generation of emission, reflection, planetary, and dark nebulae

// Import dependencies
import { SeededRandom, hashPosition } from '../utils/random.js';
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
    worldToScreen(worldX: number, worldY: number, canvasWidth: number, canvasHeight: number): [number, number];
}

interface NebulaParticle {
    offsetX: number;
    offsetY: number;
    radius: number;
    alpha: number;
    color: string;
    layer: number; // 0-2 for depth layering
}

interface NebulaType {
    name: string;
    colors: string[]; // [primary, secondary, accent]
    sizeRange: [number, number]; // [min, max] radius
    densityRange: [number, number]; // [min, max] particle density
    particleRange: [number, number]; // [min, max] particle count
    rarity: number; // 0-1, higher = rarer
    discoveryValue: number;
    description: string;
}

// Nebula type definitions
export const NebulaTypes: Record<string, NebulaType> = {
    emission: {
        name: 'Emission Nebula',
        colors: ['#ff6b6b', '#ff8e53', '#ff6b9d'], // Red-orange hydrogen emissions
        sizeRange: [200, 400], // Much larger for impressive visual impact
        densityRange: [0.6, 0.9],
        particleRange: [80, 150], // More particles for the larger size
        rarity: 0.4, // Most common
        discoveryValue: 25,
        description: 'Glowing clouds of ionized hydrogen gas'
    },
    reflection: {
        name: 'Reflection Nebula', 
        colors: ['#4ecdc4', '#45b7d1', '#96ceb4'], // Blue-white reflected starlight
        sizeRange: [150, 350], // Larger size range
        densityRange: [0.5, 0.8], 
        particleRange: [60, 120], // More particles for larger nebula
        rarity: 0.3,
        discoveryValue: 35,
        description: 'Dust clouds reflecting nearby starlight'
    },
    planetary: {
        name: 'Planetary Nebula',
        colors: ['#a8e6cf', '#7fcdcd', '#81ecec'], // Green-blue ionized gas
        sizeRange: [120, 250], // Smaller than others but still much larger than before
        densityRange: [0.8, 1.0],
        particleRange: [50, 100], // More particles for better density
        rarity: 0.2,
        discoveryValue: 60,
        description: 'Beautiful shells of gas from dying stars'
    },
    dark: {
        name: 'Dark Nebula',
        colors: ['#2c3e50', '#34495e', '#4a6741'], // Dark, muted colors
        sizeRange: [250, 500], // Largest nebulae for dramatic dark cloud effect
        densityRange: [0.3, 0.6],
        particleRange: [40, 80], // More particles despite lower density for coverage
        rarity: 0.1, // Rarest
        discoveryValue: 80,
        description: 'Dense clouds of dust blocking background light'
    }
};

export class Nebula extends CelestialObject {
    nebulaType: string;
    nebulaTypeData: NebulaType;
    radius: number;
    density: number;
    colors: string[];
    particles: NebulaParticle[];
    particleCount: number;
    id: string;

    constructor(x: number, y: number, nebulaType: string, random: SeededRandom) {
        super(x, y, 'nebula');
        
        this.nebulaType = nebulaType;
        this.nebulaTypeData = NebulaTypes[nebulaType];
        
        if (!this.nebulaTypeData) {
            throw new Error(`Unknown nebula type: ${nebulaType}`);
        }

        // Generate unique ID
        this.id = `nebula-${hashPosition(x, y)}-${nebulaType}`;
        
        // Generate procedural properties
        this.radius = random.nextFloat(
            this.nebulaTypeData.sizeRange[0], 
            this.nebulaTypeData.sizeRange[1]
        );
        
        this.density = random.nextFloat(
            this.nebulaTypeData.densityRange[0],
            this.nebulaTypeData.densityRange[1]
        );
        
        this.particleCount = Math.floor(random.nextFloat(
            this.nebulaTypeData.particleRange[0],
            this.nebulaTypeData.particleRange[1]
        ));

        // Select colors for this instance
        this.colors = [...this.nebulaTypeData.colors]; // Copy colors
        
        // Set discovery distance based on size
        this.discoveryDistance = Math.max(this.radius * 1.5, 75);
        
        // Generate particle cloud
        this.generateParticles(random);
    }

    private generateParticles(random: SeededRandom): void {
        this.particles = [];
        
        for (let i = 0; i < this.particleCount; i++) {
            // Generate random position within nebula using polar coordinates
            const angle = random.next() * Math.PI * 2;
            const distance = random.next() * this.radius;
            
            // Add some randomness to make it less perfect circle
            const distanceVariation = random.nextFloat(0.7, 1.3);
            const finalDistance = distance * distanceVariation;
            
            const offsetX = Math.cos(angle) * finalDistance;
            const offsetY = Math.sin(angle) * finalDistance;
            
            // Particle size varies with distance from center (smaller at edges)
            const distanceRatio = finalDistance / this.radius;
            const baseSize = random.nextFloat(2, 8);
            const particleRadius = baseSize * (1 - distanceRatio * 0.5);
            
            // Alpha varies with density and distance from center
            const baseAlpha = this.density * (1 - distanceRatio * 0.4);
            const alpha = Math.max(0.1, baseAlpha * random.nextFloat(0.6, 1.0));
            
            // Choose color from nebula's palette
            const colorIndex = Math.floor(random.next() * this.colors.length);
            const color = this.colors[colorIndex];
            
            // Assign layer for depth rendering (0 = background, 2 = foreground)
            const layer = Math.floor(random.next() * 3);
            
            this.particles.push({
                offsetX,
                offsetY,
                radius: particleRadius,
                alpha,
                color,
                layer
            });
        }
        
        // Sort particles by layer for proper rendering order
        this.particles.sort((a, b) => a.layer - b.layer);
    }

    checkDiscovery(camera: Camera, canvasWidth: number, canvasHeight: number): boolean {
        if (this.discovered) {
            return false;
        }

        // Nebulae use distance-based discovery (like planets/moons)
        const distance = Math.sqrt(
            Math.pow(camera.x - this.x, 2) + Math.pow(camera.y - this.y, 2)
        );

        if (distance <= this.discoveryDistance) {
            this.discovered = true;
            return true; // Newly discovered
        }
        
        return false;
    }
    
    shouldDiscover(ship: any, camera: Camera, canvasWidth: number, canvasHeight: number): boolean {
        if (this.discovered) {
            return false;
        }

        const distance = Math.sqrt(
            Math.pow(ship.x - this.x, 2) + Math.pow(ship.y - this.y, 2)
        );

        return distance <= this.discoveryDistance;
    }

    render(renderer: Renderer, camera: Camera): void {
        const [screenX, screenY] = camera.worldToScreen(
            this.x, 
            this.y, 
            renderer.canvas.width, 
            renderer.canvas.height
        );

        // Skip rendering if off screen (with margin for large nebulae)
        const margin = this.radius + 50;
        if (screenX < -margin || screenX > renderer.canvas.width + margin ||
            screenY < -margin || screenY > renderer.canvas.height + margin) {
            return;
        }

        renderer.ctx.save();

        // Render particles in layer order for depth
        for (const particle of this.particles) {
            const particleX = screenX + particle.offsetX;
            const particleY = screenY + particle.offsetY;
            
            // Skip particles that are off-screen
            if (particleX < -20 || particleX > renderer.canvas.width + 20 ||
                particleY < -20 || particleY > renderer.canvas.height + 20) {
                continue;
            }

            renderer.ctx.globalAlpha = particle.alpha;
            renderer.ctx.fillStyle = particle.color;
            
            // Create subtle glow effect for brighter particles
            if (particle.alpha > 0.6) {
                const gradient = renderer.ctx.createRadialGradient(
                    particleX, particleY, 0,
                    particleX, particleY, particle.radius * 2
                );
                gradient.addColorStop(0, particle.color);
                gradient.addColorStop(1, particle.color + '00'); // Transparent
                renderer.ctx.fillStyle = gradient;
            }
            
            renderer.ctx.beginPath();
            renderer.ctx.arc(particleX, particleY, particle.radius, 0, Math.PI * 2);
            renderer.ctx.fill();
        }

        // Render discovery indicator if discovered
        if (this.discovered) {
            renderer.ctx.globalAlpha = 0.8;
            renderer.ctx.strokeStyle = '#ffeaa7';
            renderer.ctx.lineWidth = 2;
            renderer.ctx.setLineDash([5, 5]);
            renderer.ctx.beginPath();
            renderer.ctx.arc(screenX, screenY, this.radius + 10, 0, Math.PI * 2);
            renderer.ctx.stroke();
            renderer.ctx.setLineDash([]); // Reset line dash
        }

        renderer.ctx.restore();
    }

    getDiscoveryData(): any {
        return {
            discovered: this.discovered,
            nebulaType: this.nebulaType,
            timestamp: Date.now(),
            discoveryValue: this.nebulaTypeData.discoveryValue
        };
    }
}

// Utility function to select a nebula type based on rarity
export function selectNebulaType(random: SeededRandom): string {
    const rand = random.next();
    let cumulativeRarity = 0;
    
    for (const [type, data] of Object.entries(NebulaTypes)) {
        cumulativeRarity += data.rarity;
        if (rand <= cumulativeRarity) {
            return type;
        }
    }
    
    // Fallback to most common type
    return 'emission';
}