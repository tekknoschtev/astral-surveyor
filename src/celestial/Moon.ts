// Moon class - extracted from celestial.ts
// Manages moon rendering, orbital mechanics, and parent planet relationships

// Import dependencies
import { SeededRandom } from '../utils/random.js';
import { GameConfig } from '../config/gameConfig.js';
import { CelestialObject } from './CelestialTypes.js';
import { DiscoveryVisualizationService } from '../services/DiscoveryVisualizationService.js';
import type { 
    Renderer, 
    Camera 
} from './CelestialTypes.js';

// Import Planet class now that it's extracted
import type { Planet } from './Planet.js';

// Moon class
export class Moon extends CelestialObject {
    // Orbital properties
    parentPlanet?: Planet;
    orbitalDistance: number = 0;
    orbitalAngle: number = 0;
    orbitalSpeed: number = 0;
    
    // Moon properties
    radius: number = 3;
    color: string = '#808080';
    
    // Identification
    uniqueId?: string;
    moonIndex?: number;
    
    // Discovery timestamp for animation system
    discoveryTimestamp?: number;

    constructor(x: number, y: number, parentPlanet?: Planet, orbitalDistance: number = 0, orbitalAngle: number = 0, orbitalSpeed: number = 0) {
        super(x, y, 'moon');
        
        // Orbital properties
        this.parentPlanet = parentPlanet;
        this.orbitalDistance = orbitalDistance;
        this.orbitalAngle = orbitalAngle;
        this.orbitalSpeed = orbitalSpeed;
        
        // Initialize moon properties
        this.initializeMoonProperties();
    }
    
    initializeMoonProperties(): void {
        // Set size based on parent planet (much smaller)
        if (this.parentPlanet) {
            this.radius = Math.max(2, this.parentPlanet.radius * 0.15); // 15% of parent size, minimum 2px
        } else {
            this.radius = 3; // Fallback size
        }
        this.discoveryDistance = this.radius + 25; // Closer discovery distance
        
        // Set muted color based on parent planet or neutral grays
        this.color = this.generateMoonColor();
    }

    // Initialize moon with seeded random for deterministic generation
    initWithSeed(rng: SeededRandom, parentPlanet?: Planet, orbitalDistance: number = 0, orbitalAngle: number = 0, orbitalSpeed: number = 0, moonIndex?: number): void {
        // Update orbital properties if provided
        if (parentPlanet) {
            this.parentPlanet = parentPlanet;
            this.orbitalDistance = orbitalDistance;
            this.orbitalAngle = orbitalAngle;
            this.orbitalSpeed = orbitalSpeed;
        }
        
        // Store moon index for unique ID generation
        if (moonIndex !== undefined) {
            this.moonIndex = moonIndex;
        }
        
        // Generate unique identifier for this moon
        this.uniqueId = this.generateUniqueId();
        
        // Set size based on parent planet using seeded random
        if (this.parentPlanet) {
            const config = GameConfig.celestial.moons.sizeVariation;
            const sizeVariation = rng.nextFloat(config.min, config.max);
            this.radius = Math.max(2, Math.floor(this.parentPlanet.radius * sizeVariation));
        } else {
            this.radius = rng.nextInt(2, 4); // 2-4 pixels fallback
        }
        this.discoveryDistance = this.radius + 25;
        
        // Set color using seeded random
        this.color = this.generateMoonColor(rng);
    }

    generateUniqueId(): string {
        // Use parent planet's position and moon index for stable unique ID
        if (this.parentPlanet && this.moonIndex !== undefined) {
            const planetX = Math.floor(this.parentPlanet.x);
            const planetY = Math.floor(this.parentPlanet.y);
            return `moon_${planetX}_${planetY}_moon_${this.moonIndex}`;
        }
        // Fallback for moons without parent planets
        return `moon_${Math.floor(this.x)}_${Math.floor(this.y)}`;
    }

    generateMoonColor(rng?: SeededRandom): string {
        // Generate muted colors - either neutral grays or darkened planet colors
        const moonColors = [
            '#808080', // Gray
            '#A0A0A0', // Light gray
            '#696969', // Dim gray
            '#778899', // Light slate gray
            '#708090'  // Slate gray
        ];
        
        if (rng) {
            // Use seeded random for deterministic color selection
            const useParentColor = rng.next() < GameConfig.celestial.moons.parentColorChance;
            if (useParentColor && this.parentPlanet) {
                return this.darkenColor(this.parentPlanet.color, 0.4);
            } else {
                return rng.choice(moonColors);
            }
        } else {
            // Fallback random selection
            if (Math.random() < 0.3 && this.parentPlanet) {
                return this.darkenColor(this.parentPlanet.color, 0.4);
            } else {
                return moonColors[Math.floor(Math.random() * moonColors.length)];
            }
        }
    }

    updatePosition(deltaTime: number): void {
        // Update orbital position if moon has a parent planet
        if (this.parentPlanet && this.orbitalDistance > 0) {
            // Update orbital angle based on orbital speed
            this.orbitalAngle += this.orbitalSpeed * deltaTime;
            
            // Keep angle within 0 to 2π range
            if (this.orbitalAngle >= Math.PI * 2) {
                this.orbitalAngle -= Math.PI * 2;
            }
            
            // Calculate new position based on orbital parameters
            this.x = this.parentPlanet.x + Math.cos(this.orbitalAngle) * this.orbitalDistance;
            this.y = this.parentPlanet.y + Math.sin(this.orbitalAngle) * this.orbitalDistance;
        }
    }

    darkenColor(hex: string, amount: number): string {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, Math.floor((num >> 16) * (1 - amount)));
        const g = Math.max(0, Math.floor(((num >> 8) & 0x00FF) * (1 - amount)));
        const b = Math.max(0, Math.floor((num & 0x0000FF) * (1 - amount)));
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }

    render(renderer: Renderer, camera: Camera): void {
        const [screenX, screenY] = camera.worldToScreen(this.x, this.y, renderer.canvas.width, renderer.canvas.height);
        
        // Only render if parent planet is reasonably close (avoid visual clutter)
        const parentDistance = this.parentPlanet ? 
            Math.sqrt(Math.pow(this.parentPlanet.x - camera.x, 2) + Math.pow(this.parentPlanet.y - camera.y, 2)) : 0;
        const maxRenderDistance = 800; // Only show moons when parent planet is within 800 pixels of camera
        
        if (parentDistance > maxRenderDistance) {
            return; // Don't render distant moons to avoid clutter
        }
        
        // Only render if on screen
        if (screenX >= -this.radius - 10 && screenX <= renderer.canvas.width + this.radius + 10 && 
            screenY >= -this.radius - 10 && screenY <= renderer.canvas.height + this.radius + 10) {
            
            // Draw simple moon - just a solid circle
            renderer.drawCircle(screenX, screenY, this.radius, this.color);
            
            // Visual indicator if discovered using unified system
            if (this.discovered) {
                this.renderDiscoveryIndicator(renderer, screenX, screenY);
            }
        }
    }
    
    private renderDiscoveryIndicator(renderer: Renderer, screenX: number, screenY: number): void {
        // Use unified discovery visualization system
        const visualizationService = new DiscoveryVisualizationService();
        const objectId = `moon-${this.x}-${this.y}`;
        const currentTime = Date.now();
        
        const indicatorData = visualizationService.getDiscoveryIndicatorData(objectId, {
            x: screenX,
            y: screenY,
            baseRadius: this.radius + 3,
            rarity: visualizationService.getObjectRarity('moon'),
            objectType: 'moon',
            discoveryTimestamp: this.discoveryTimestamp || currentTime,
            currentTime: currentTime
        });

        // Render base discovery indicator
        renderer.drawDiscoveryIndicator(
            screenX, 
            screenY, 
            this.radius + 3,
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