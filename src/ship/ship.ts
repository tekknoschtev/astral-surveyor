// Ship and particle systems
// TypeScript conversion with comprehensive type definitions

// Import dependencies
import type { Renderer } from '../graphics/renderer.js';
import type { Camera } from '../camera/camera.js';

// Interface definitions
interface SpriteData {
    sprite: string[];
    colors: Record<string, string>;
}

interface StarLike {
    x: number;
    y: number;
    radius: number;
    color: string;
}

interface ThrusterParticle {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    life: number;
    maxLife: number;
    alpha: number;
    color: string;
}

interface StarParticle {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    life: number;
    maxLife: number;
    alpha: number;
    color: string;
    size: number;
    starId: string;
}

interface ThrustDirection {
    x: number;
    y: number;
}

// Extended camera interface for ship-specific properties
interface ShipCamera extends Camera {
    isThrusting: boolean;
    isBraking: boolean;
    thrustDirection: ThrustDirection;
    rotation: number;
}

export class Ship {
    sprite: string[];
    colors: Record<string, string>;
    scale: number;
    normalColor: string;
    silhouetteColor: string;

    constructor() {
        this.sprite = [
            '  #  ',
            ' ### ',
            '#####',
            ' # # '
        ];
        this.colors = {
            '#': '#00ff88'  // Nice green color matching the UI
        };
        this.scale = 2;
        this.normalColor = '#00ff88';  // Store normal color for silhouette calculations
        this.silhouetteColor = '#000000';  // Dark silhouette color
    }

    // Calculate silhouette effect when ship passes in front of stars
    calculateSilhouetteEffect(cameraX: number, cameraY: number, activeStars: StarLike[]): number {
        let maxDarkeningFactor = 0.0;
        
        // Check each active celestial star
        for (const star of activeStars) {
            // Calculate distance from ship (camera position) to star center
            const dx = cameraX - star.x;
            const dy = cameraY - star.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Start darkening effect when approaching star edge (extend radius by 30%)
            const effectRadius = star.radius * 1.3;
            
            // If ship is within the extended effect radius, calculate darkening
            if (distance < effectRadius) {
                // Calculate proximity factor (0.0 at effect edge, 1.0 at star center)
                const proximityFactor = Math.max(0.0, (effectRadius - distance) / effectRadius);
                
                // Apply more aggressive darkening curve for earlier effect
                const darkeningFactor = Math.pow(proximityFactor, 0.5); // Faster darkening as ship approaches
                
                // Use the strongest darkening effect if multiple stars overlap
                maxDarkeningFactor = Math.max(maxDarkeningFactor, darkeningFactor);
            }
        }
        
        return Math.min(1.0, maxDarkeningFactor); // Clamp to [0.0, 1.0]
    }

    // Interpolate between two hex colors
    interpolateColor(color1: string, color2: string, factor: number): string {
        // Parse hex colors
        const hex1 = color1.replace('#', '');
        const hex2 = color2.replace('#', '');
        
        const r1 = parseInt(hex1.substr(0, 2), 16);
        const g1 = parseInt(hex1.substr(2, 2), 16);
        const b1 = parseInt(hex1.substr(4, 2), 16);
        
        const r2 = parseInt(hex2.substr(0, 2), 16);
        const g2 = parseInt(hex2.substr(2, 2), 16);
        const b2 = parseInt(hex2.substr(4, 2), 16);
        
        // Interpolate each component
        const r = Math.round(r1 + (r2 - r1) * factor);
        const g = Math.round(g1 + (g2 - g1) * factor);
        const b = Math.round(b1 + (b2 - b1) * factor);
        
        // Convert back to hex
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    render(renderer: Renderer, rotation: number = 0, cameraX: number = 0, cameraY: number = 0, activeStars: StarLike[] = []): void {
        const centerX = Math.floor(renderer.canvas.width / 2) - 2 * this.scale;
        const centerY = Math.floor(renderer.canvas.height / 2) - 2 * this.scale;
        
        // Calculate silhouette effect based on proximity to stars
        const silhouetteFactor = this.calculateSilhouetteEffect(cameraX, cameraY, activeStars);
        
        // Determine the ship color based on silhouette effect
        const shipColor = this.interpolateColor(this.normalColor, this.silhouetteColor, silhouetteFactor);
        
        // Create sprite with current color (normal or silhouetted)
        const coloredSprite = this.sprite.map(row => 
            row.split('').map(char => char === '#' ? shipColor : char)
        );
        
        renderer.drawSprite(centerX, centerY, coloredSprite, this.scale, rotation);
    }
}

export class ThrusterParticles {
    particles: ThrusterParticle[];
    maxParticles: number;

    constructor() {
        this.particles = [];
        this.maxParticles = 50;
    }

    update(deltaTime: number, camera: ShipCamera, ship: Ship): void {
        // Spawn new particles if thrusting
        if (camera.isThrusting) {
            this.spawnParticles(camera, ship);
        }

        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update particle position and properties
            particle.x += particle.velocityX * deltaTime;
            particle.y += particle.velocityY * deltaTime;
            particle.life -= deltaTime;
            particle.alpha = particle.life / particle.maxLife;

            // Remove dead particles
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    spawnParticles(camera: ShipCamera, ship: Ship): void {
        // Don't spawn too many particles
        if (this.particles.length >= this.maxParticles) return;

        // Calculate thruster positions relative to ship center
        const thrusterOffsets = [
            { x: -1, y: 1.5 }, // Left thruster
            { x: 1, y: 1.5 }   // Right thruster
        ];

        thrusterOffsets.forEach(offset => {
            // Rotate offset based on ship rotation
            const cos = Math.cos(camera.rotation);
            const sin = Math.sin(camera.rotation);
            const rotatedX = offset.x * cos - offset.y * sin;
            const rotatedY = offset.x * sin + offset.y * cos;

            // Scale by ship size
            const scale = ship.scale;
            const thrusterX = rotatedX * scale;
            const thrusterY = rotatedY * scale;

            // Choose particle color based on braking
            const isBraking = camera.isBraking;
            const particleColor = isBraking 
                ? (Math.random() > 0.7 ? '#ff6666' : '#ff4444') // Red for braking
                : (Math.random() > 0.7 ? '#00ffaa' : '#00ff88'); // Green for thrusting

            // Get thrust direction or default
            const thrustDirection = camera.thrustDirection || { x: 0, y: -1 };

            // Spawn particle
            this.particles.push({
                x: thrusterX,
                y: thrusterY,
                velocityX: -thrustDirection.x * 80 + (Math.random() - 0.5) * 40,
                velocityY: -thrustDirection.y * 80 + (Math.random() - 0.5) * 40,
                life: 0.5 + Math.random() * 0.3,
                maxLife: 0.8,
                alpha: 1.0,
                color: particleColor
            });
        });
    }

    render(renderer: Renderer): void {
        const centerX = Math.floor(renderer.canvas.width / 2);
        const centerY = Math.floor(renderer.canvas.height / 2);

        for (const particle of this.particles) {
            const alpha = Math.floor(particle.alpha * 255).toString(16).padStart(2, '0');
            const color = particle.color + alpha;
            
            renderer.drawPixel(
                centerX + particle.x,
                centerY + particle.y,
                color,
                1
            );
        }
    }
}

export class StarParticles {
    particles: StarParticle[];
    maxParticlesPerStar: number;

    constructor() {
        this.particles = [];
        this.maxParticlesPerStar = 150; // Much denser particle effect
    }

    update(deltaTime: number, stars: StarLike[], camera: Camera): void {
        // Spawn new particles for visible stars
        for (const star of stars) {
            const [screenX, screenY] = camera.worldToScreen(star.x, star.y, 9999, 9999); // Use large canvas size for distance check
            const distanceToCamera = Math.sqrt((star.x - camera.x) ** 2 + (star.y - camera.y) ** 2);
            
            // Only spawn particles for stars that are reasonably close
            if (distanceToCamera < 2000) {
                this.spawnParticles(star, deltaTime);
            }
        }

        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update particle position and properties
            particle.x += particle.velocityX * deltaTime;
            particle.y += particle.velocityY * deltaTime;
            particle.life -= deltaTime;
            particle.alpha = particle.life / particle.maxLife;

            // Remove dead particles
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    spawnParticles(star: StarLike, deltaTime: number): void {
        // Count existing particles for this star
        const starParticles = this.particles.filter(p => p.starId === `${star.x}_${star.y}`);
        if (starParticles.length >= this.maxParticlesPerStar) return;

        // Much higher spawn rate for very dense corona
        const spawnRate = (star.radius / 6) * 35; // Many more particles per second
        const particlesToSpawn = Math.floor(spawnRate * deltaTime) + (Math.random() < (spawnRate * deltaTime % 1) ? 1 : 0);

        for (let i = 0; i < particlesToSpawn; i++) {
            // Random position around star surface
            const angle = Math.random() * Math.PI * 2;
            const spawnRadius = star.radius * (0.8 + Math.random() * 0.3); // Spawn mostly on surface
            const spawnX = star.x + Math.cos(angle) * spawnRadius;
            const spawnY = star.y + Math.sin(angle) * spawnRadius;

            // Very slow particle velocity for majestic corona effect
            const speed = 3 + Math.random() * 6; // Much slower speed (3-9 vs 8-20)
            const velocityAngle = angle + (Math.random() - 0.5) * 0.4; // Slightly more random direction
            const velocityX = Math.cos(velocityAngle) * speed;
            const velocityY = Math.sin(velocityAngle) * speed;

            // Make particles brighter/lighter than the star itself
            const particleColor = this.lightenColor(star.color, 0.4 + Math.random() * 0.3); // 40-70% lighter

            // Add size variance - mostly 1px with some larger particles
            let particleSize = 1;
            const sizeRand = Math.random();
            if (sizeRand > 0.85) {
                particleSize = 3; // 15% chance of larger particles
            } else if (sizeRand > 0.7) {
                particleSize = 2; // 15% chance of medium particles
            }
            // 70% remain size 1

            this.particles.push({
                x: spawnX,
                y: spawnY,
                velocityX: velocityX,
                velocityY: velocityY,
                life: 1.0 + Math.random() * 0.8, // Shorter life = stay closer
                maxLife: 1.8,
                alpha: 1.0,
                color: particleColor,
                size: particleSize,
                starId: `${star.x}_${star.y}`
            });
        }
    }

    lightenColor(hex: string, amount: number): string {
        // Parse hex color
        const colorNum = parseInt(hex.replace('#', ''), 16);
        const r = (colorNum >> 16) & 255;
        const g = (colorNum >> 8) & 255;
        const b = colorNum & 255;
        
        // Lighten by moving towards white
        const newR = Math.min(255, Math.floor(r + (255 - r) * amount));
        const newG = Math.min(255, Math.floor(g + (255 - g) * amount));
        const newB = Math.min(255, Math.floor(b + (255 - b) * amount));
        
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }

    render(renderer: Renderer, camera: Camera): void {
        for (const particle of this.particles) {
            const [screenX, screenY] = camera.worldToScreen(particle.x, particle.y, renderer.canvas.width, renderer.canvas.height);
            
            // Only render particles that are on screen
            if (screenX >= -5 && screenX <= renderer.canvas.width + 5 && 
                screenY >= -5 && screenY <= renderer.canvas.height + 5) {
                
                const alpha = Math.floor(particle.alpha * 255).toString(16).padStart(2, '0');
                const color = particle.color + alpha;
                
                // Use the particle's size for rendering
                renderer.drawPixel(screenX, screenY, color, particle.size);
            }
        }
    }
}