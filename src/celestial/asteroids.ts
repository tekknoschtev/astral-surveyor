// Asteroid Gardens - Scattered fields of glittering rocks that catch starlight
// Beautiful sparse fields for tranquil exploration and wonder

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

interface AsteroidRock {
    offsetX: number;
    offsetY: number;
    size: number;
    brightness: number;
    color: string;
    rotationSpeed: number;
    baseRotation: number;
    glitterIntensity: number;
    shape: 'round' | 'angular' | 'irregular';
}

interface AsteroidGardenType {
    name: string;
    colors: string[]; // Base rock colors
    accentColors: string[]; // Glitter/reflection colors
    sizeRange: [number, number]; // [min, max] field radius
    densityRange: [number, number]; // [min, max] rock density
    rockCountRange: [number, number]; // [min, max] number of rocks
    rarity: number; // 0-1, higher = rarer
    discoveryValue: number;
    description: string;
    glitterChance: number; // 0-1, chance for rocks to have strong glitter
}

// Asteroid Garden type definitions
export const AsteroidGardenTypes: Record<string, AsteroidGardenType> = {
    metallic: {
        name: 'Metallic Asteroid Garden',
        colors: ['#8c8c8c', '#a0a0a0', '#7a7a7a'], // Metallic grays
        accentColors: ['#ffffff', '#e6e6e6', '#cccccc'], // Bright reflections
        sizeRange: [150, 300], // Medium-sized fields
        densityRange: [0.3, 0.7],
        rockCountRange: [25, 60],
        rarity: 0.35, // Most common
        discoveryValue: 20,
        description: 'Scattered metallic rocks that gleam with reflected starlight',
        glitterChance: 0.8 // High chance for metallic gleaming
    },
    crystalline: {
        name: 'Crystalline Asteroid Garden', 
        colors: ['#e6f3ff', '#ccddff', '#b3c7ff'], // Crystal blues
        accentColors: ['#ffffff', '#e6f7ff', '#ccebff'], // Bright crystal sparkles
        sizeRange: [120, 250],
        densityRange: [0.2, 0.5],
        rockCountRange: [15, 40], // Fewer but more spectacular
        rarity: 0.20,
        discoveryValue: 45,
        description: 'Crystalline formations that refract starlight into dazzling displays',
        glitterChance: 0.9 // Very high sparkle chance
    },
    carbonaceous: {
        name: 'Carbonaceous Asteroid Garden',
        colors: ['#2d2d2d', '#404040', '#1a1a1a'], // Dark carbon colors
        accentColors: ['#666666', '#808080', '#999999'], // Subtle reflections
        sizeRange: [200, 400], // Larger, more spread out fields
        densityRange: [0.4, 0.8],
        rockCountRange: [30, 80],
        rarity: 0.25,
        discoveryValue: 25,
        description: 'Dark carbonaceous rocks with subtle mineral gleams',
        glitterChance: 0.4 // Lower sparkle, more subdued
    },
    icy: {
        name: 'Icy Asteroid Garden',
        colors: ['#f0f8ff', '#e0f0ff', '#d0e8ff'], // Ice whites and blues
        accentColors: ['#ffffff', '#f8ffff', '#e8f8ff'], // Brilliant ice reflections
        sizeRange: [180, 350],
        densityRange: [0.3, 0.6],
        rockCountRange: [20, 50],
        rarity: 0.15,
        discoveryValue: 35,
        description: 'Frozen rocks and ice chunks that sparkle like diamonds',
        glitterChance: 0.85 // Very high sparkle for ice
    },
    rare_minerals: {
        name: 'Rare Mineral Garden',
        colors: ['#ff6b6b', '#66ff66', '#6666ff'], // Colorful minerals
        accentColors: ['#ffcccc', '#ccffcc', '#ccccff'], // Colorful glints
        sizeRange: [100, 200], // Smaller, concentrated fields
        densityRange: [0.6, 1.0],
        rockCountRange: [10, 25], // Few but precious
        rarity: 0.05, // Very rare
        discoveryValue: 80,
        description: 'Exotic mineral formations with otherworldly colors',
        glitterChance: 0.95 // Almost guaranteed spectacular effects
    }
};

export class AsteroidGarden extends CelestialObject {
    gardenType: string;
    gardenTypeData: AsteroidGardenType;
    fieldRadius: number;
    density: number;
    colors: string[];
    accentColors: string[];
    rocks: AsteroidRock[];
    rockCount: number;
    id: string;

    constructor(x: number, y: number, gardenType: string, random: SeededRandom) {
        super(x, y, 'asteroids');
        
        this.gardenType = gardenType;
        this.gardenTypeData = AsteroidGardenTypes[gardenType];
        
        if (!this.gardenTypeData) {
            throw new Error(`Unknown asteroid garden type: ${gardenType}`);
        }

        // Generate unique ID
        this.id = `asteroids-${hashPosition(x, y)}-${gardenType}`;
        
        // Generate procedural properties
        this.fieldRadius = random.nextFloat(
            this.gardenTypeData.sizeRange[0], 
            this.gardenTypeData.sizeRange[1]
        );
        
        this.density = random.nextFloat(
            this.gardenTypeData.densityRange[0],
            this.gardenTypeData.densityRange[1]
        );
        
        this.rockCount = Math.floor(random.nextFloat(
            this.gardenTypeData.rockCountRange[0],
            this.gardenTypeData.rockCountRange[1]
        ));

        // Copy colors for this instance
        this.colors = [...this.gardenTypeData.colors];
        this.accentColors = [...this.gardenTypeData.accentColors];
        
        // Set discovery distance based on field size
        this.discoveryDistance = Math.max(this.fieldRadius * 1.2, 80);
        
        // Generate asteroid rocks
        this.generateRocks(random);
    }

    private generateRocks(random: SeededRandom): void {
        this.rocks = [];
        
        for (let i = 0; i < this.rockCount; i++) {
            // Generate random position within field using various distribution patterns
            let offsetX: number, offsetY: number;
            
            // 60% of rocks use clustered distribution (realistic asteroid clustering)
            if (random.next() < 0.6) {
                // Clustered distribution - multiple small clusters
                const clusterAngle = random.next() * Math.PI * 2;
                const clusterDistance = random.next() * this.fieldRadius * 0.7; // Stay within 70% of field
                const clusterSpread = random.nextFloat(10, 30); // Small local spread around cluster center
                
                const clusterCenterX = Math.cos(clusterAngle) * clusterDistance;
                const clusterCenterY = Math.sin(clusterAngle) * clusterDistance;
                
                offsetX = clusterCenterX + (random.next() - 0.5) * clusterSpread;
                offsetY = clusterCenterY + (random.next() - 0.5) * clusterSpread;
            } else {
                // 40% use uniform distribution for scattered background rocks
                const angle = random.next() * Math.PI * 2;
                const distance = random.next() * this.fieldRadius;
                offsetX = Math.cos(angle) * distance;
                offsetY = Math.sin(angle) * distance;
            }
            
            // Rock size varies with distance from center and type
            const distanceRatio = Math.sqrt(offsetX * offsetX + offsetY * offsetY) / this.fieldRadius;
            const baseSize = random.nextFloat(1, 6);
            const size = baseSize * (1 - distanceRatio * 0.3); // Smaller rocks toward edges
            
            // Brightness varies with size and random factors
            const brightness = Math.min(1.0, (size / 6) * random.nextFloat(0.7, 1.3));
            
            // Choose color from garden's palette
            const colorIndex = Math.floor(random.next() * this.colors.length);
            const color = this.colors[colorIndex];
            
            // Rotation properties for subtle animation
            const rotationSpeed = random.nextFloat(-0.5, 0.5); // Slow rotation
            const baseRotation = random.next() * Math.PI * 2;
            
            // Glitter intensity based on garden type and randomness
            const glitterRoll = random.next();
            const glitterIntensity = glitterRoll < this.gardenTypeData.glitterChance ? 
                random.nextFloat(0.5, 1.0) : random.nextFloat(0.1, 0.3);
            
            // Rock shape affects rendering
            const shapeRoll = random.next();
            let shape: 'round' | 'angular' | 'irregular';
            if (shapeRoll < 0.4) shape = 'round';
            else if (shapeRoll < 0.8) shape = 'angular'; 
            else shape = 'irregular';
            
            this.rocks.push({
                offsetX,
                offsetY,
                size,
                brightness,
                color,
                rotationSpeed,
                baseRotation,
                glitterIntensity,
                shape
            });
        }
        
        // Sort rocks by distance for proper rendering depth
        this.rocks.sort((a, b) => {
            const distA = Math.sqrt(a.offsetX * a.offsetX + a.offsetY * a.offsetY);
            const distB = Math.sqrt(b.offsetX * b.offsetX + b.offsetY * b.offsetY);
            return distB - distA; // Render far rocks first
        });
    }

    checkDiscovery(camera: Camera, canvasWidth: number, canvasHeight: number): boolean {
        if (this.discovered) {
            return false;
        }

        // Asteroid gardens use distance-based discovery (like planets/moons/nebulae)
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

        // Skip rendering if field center is way off screen
        const margin = this.fieldRadius + 100;
        if (screenX < -margin || screenX > renderer.canvas.width + margin ||
            screenY < -margin || screenY > renderer.canvas.height + margin) {
            return;
        }

        renderer.ctx.save();
        
        const time = Date.now() * 0.001; // Current time in seconds
        
        // Render each asteroid rock
        for (const rock of this.rocks) {
            const rockX = screenX + rock.offsetX;
            const rockY = screenY + rock.offsetY;
            
            // Skip rocks that are off-screen  
            if (rockX < -20 || rockX > renderer.canvas.width + 20 ||
                rockY < -20 || rockY > renderer.canvas.height + 20) {
                continue;
            }

            // Calculate current rotation
            const rotation = rock.baseRotation + time * rock.rotationSpeed;
            
            // Base rock rendering
            renderer.ctx.globalAlpha = rock.brightness * 0.8;
            renderer.ctx.fillStyle = rock.color;
            
            // Render rock shape
            renderer.ctx.save();
            renderer.ctx.translate(rockX, rockY);
            renderer.ctx.rotate(rotation);
            
            renderer.ctx.beginPath();
            if (rock.shape === 'round') {
                renderer.ctx.arc(0, 0, rock.size, 0, Math.PI * 2);
            } else if (rock.shape === 'angular') {
                // Simple angular shape
                const sides = 6;
                for (let i = 0; i < sides; i++) {
                    const angle = (i / sides) * Math.PI * 2;
                    const radius = rock.size * (0.8 + Math.sin(angle * 3 + rotation) * 0.2);
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    if (i === 0) renderer.ctx.moveTo(x, y);
                    else renderer.ctx.lineTo(x, y);
                }
                renderer.ctx.closePath();
            } else { // irregular
                // Irregular blob shape
                const sides = 8;
                for (let i = 0; i < sides; i++) {
                    const angle = (i / sides) * Math.PI * 2;
                    const randomFactor = 0.6 + Math.sin(angle * 2 + rotation * 0.5) * 0.4;
                    const radius = rock.size * randomFactor;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    if (i === 0) renderer.ctx.moveTo(x, y);
                    else renderer.ctx.lineTo(x, y);
                }
                renderer.ctx.closePath();
            }
            renderer.ctx.fill();
            renderer.ctx.restore();
            
            // Add glitter/starlight reflection effect
            if (rock.glitterIntensity > 0.3) {
                // Glitter sparkles at varying intervals
                const sparklePhase = Math.sin(time * 2 + rock.baseRotation * 10) * 0.5 + 0.5;
                if (sparklePhase > 0.7) {
                    const accentColorIndex = Math.floor((rock.baseRotation * 7) % this.accentColors.length);
                    const accentColor = this.accentColors[accentColorIndex];
                    
                    renderer.ctx.globalAlpha = rock.glitterIntensity * sparklePhase;
                    renderer.ctx.fillStyle = accentColor;
                    renderer.ctx.beginPath();
                    renderer.ctx.arc(rockX, rockY, rock.size * 0.8, 0, Math.PI * 2);
                    renderer.ctx.fill();
                    
                    // Add bright sparkle points
                    renderer.ctx.globalAlpha = rock.glitterIntensity * 0.8;
                    renderer.ctx.fillStyle = '#ffffff';
                    for (let s = 0; s < 3; s++) {
                        const sparkleAngle = (rock.baseRotation + s * Math.PI * 0.67 + time) % (Math.PI * 2);
                        const sparkleDistance = rock.size * 0.6;
                        const sparkleX = rockX + Math.cos(sparkleAngle) * sparkleDistance;
                        const sparkleY = rockY + Math.sin(sparkleAngle) * sparkleDistance;
                        renderer.ctx.beginPath();
                        renderer.ctx.arc(sparkleX, sparkleY, 1, 0, Math.PI * 2);
                        renderer.ctx.fill();
                    }
                }
            }
        }

        // Render discovery indicator if discovered
        if (this.discovered) {
            renderer.ctx.globalAlpha = 0.8;
            renderer.ctx.strokeStyle = '#ffd700'; // Golden color for asteroid discovery
            renderer.ctx.lineWidth = 2;
            renderer.ctx.setLineDash([5, 5]);
            renderer.ctx.beginPath();
            renderer.ctx.arc(screenX, screenY, this.fieldRadius + 15, 0, Math.PI * 2);
            renderer.ctx.stroke();
            renderer.ctx.setLineDash([]); // Reset line dash
        }

        renderer.ctx.restore();
    }

    getDiscoveryData(): any {
        return {
            discovered: this.discovered,
            gardenType: this.gardenType,
            timestamp: Date.now(),
            discoveryValue: this.gardenTypeData.discoveryValue
        };
    }
}

// Utility function to select an asteroid garden type based on rarity
export function selectAsteroidGardenType(random: SeededRandom): string {
    const rand = random.next();
    let cumulativeRarity = 0;
    
    for (const [type, data] of Object.entries(AsteroidGardenTypes)) {
        cumulativeRarity += data.rarity;
        if (rand <= cumulativeRarity) {
            return type;
        }
    }
    
    // Fallback to most common type
    return 'metallic';
}