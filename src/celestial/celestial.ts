// Celestial Objects: Stars, Planets, and Moons
// TypeScript conversion with comprehensive type definitions

// Import dependencies
import { SeededRandom } from '../utils/random.js';

// Interface definitions for renderer and camera
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

// Visual effects configuration interfaces
interface RingConfig {
    innerRadius: number;
    outerRadius: number;
    colors: string[];
    opacity: number;
    bandCount: number;
    hasShimmer?: boolean;
}

interface AtmosphereConfig {
    layers: number;           // Number of haze layers
    thickness: number;        // How far atmosphere extends from planet
    density: number;          // Base opacity (0-1)
    color: string;           // Base atmospheric color
    hasWeatherPatterns?: boolean;  // Moving cloud effects
    hasAuroras?: boolean;     // Polar light effects
    auroraColors?: string[];  // Aurora color palette
    weatherSpeed?: number;    // Speed of weather animation
}

interface PlanetVisualEffects {
    hasAtmosphere?: boolean;
    hasCraters?: boolean;
    hasStripes?: boolean;
    hasSwirls?: boolean;
    hasGlow?: boolean;
    hasDunePatterns?: boolean;
    hasCrystalline?: boolean;
    hasLavaFlow?: boolean;
    hasShimmer?: boolean;
    hasRings?: boolean | number;
    ringConfig?: RingConfig;
    atmosphereConfig?: AtmosphereConfig;  // Enhanced atmospheric effects
}

interface Sunspot {
    angle: number;      // Position angle around star
    radius: number;     // Distance from star center
    size: number;       // Sunspot diameter
    intensity: number;  // Darkness intensity (0-1)
}

interface CoronaConfig {
    layers: number;           // Number of corona layers (2-4)
    intensity: number;        // Base brightness multiplier (0.3-1.0)
    temperature: number;      // Color temperature modifier (0.5-2.0)
    asymmetry: number;        // Directional variation factor (0.0-0.5)
    fluctuation: number;      // Dynamic intensity variation (0.0-0.3)
    colors: string[];         // Corona color palette based on temperature
}

interface StarVisualEffects {
    hasCorona?: boolean;
    hasPulsing?: boolean;
    hasRadiation?: boolean;
    hasShimmer?: boolean;
    hasSwirling?: boolean;
    hasSunspots?: boolean;
    coronaSize?: number;
    coronaConfig?: CoronaConfig;  // Enhanced corona configuration
    pulseSpeed?: number;
    radiationIntensity?: number;
    swirlSpeed?: number;
    maxSunspots?: number;
    sunspotRotationSpeed?: number;
}

// Planet and star type definitions
interface PlanetType {
    name: string;
    colors: string[];
    sizeMultiplier: number;
    discoveryValue: number;
    rarity: number;
    visualEffects: PlanetVisualEffects;
}

interface StarType {
    name: string;
    description: string;
    colors: string[];
    sizeMultiplier: number;
    temperature: string;
    discoveryValue: number;
    rarity: number;
    visualEffects: StarVisualEffects;
}

// Base celestial object class
export abstract class CelestialObject {
    x: number;
    y: number;
    type: 'star' | 'planet' | 'moon';
    discovered: boolean = false;
    discoveryDistance: number = 50;

    constructor(x: number, y: number, type: 'star' | 'planet' | 'moon') {
        this.x = x;
        this.y = y;
        this.type = type;
    }

    distanceToShip(camera: Camera): number {
        const dx = this.x - camera.x;
        const dy = this.y - camera.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    checkDiscovery(camera: Camera, canvasWidth: number, canvasHeight: number): boolean {
        if (this.discovered) return false;
        
        // For stars, discovery happens when they're visible on screen (since stars are so bright)
        if (this.type === 'star') {
            const [screenX, screenY] = camera.worldToScreen(this.x, this.y, canvasWidth, canvasHeight);
            const margin = Math.max((this as any).radius || 50, 50); // Use star radius or minimum 50px margin
            
            const isVisible = screenX >= -margin && screenX <= canvasWidth + margin && 
                             screenY >= -margin && screenY <= canvasHeight + margin;
            
            if (isVisible) {
                this.discovered = true;
                return true; // Newly discovered
            }
        } else {
            // For planets and moons, use the traditional distance-based discovery
            if (this.distanceToShip(camera) <= this.discoveryDistance) {
                this.discovered = true;
                return true; // Newly discovered
            }
        }
        return false;
    }

    abstract render(renderer: Renderer, camera: Camera): void;
}

// Planet class
export class Planet extends CelestialObject {
    // Orbital properties
    parentStar?: Star;
    orbitalDistance: number = 0;
    orbitalAngle: number = 0;
    orbitalSpeed: number = 0;
    
    // Planet type and properties
    planetType: PlanetType;
    planetTypeName: string;
    radius: number = 8;
    color: string = '#808080';
    visualEffects: PlanetVisualEffects = {};
    
    // Visual effect properties
    stripeColor?: string;
    glowColor?: string;
    hasRings: boolean = false;
    
    // Identification
    uniqueId?: string;
    planetIndex?: number;

    constructor(x: number, y: number, parentStar?: Star, orbitalDistance: number = 0, orbitalAngle: number = 0, orbitalSpeed: number = 0, planetType?: PlanetType) {
        super(x, y, 'planet');
        
        // Orbital properties
        this.parentStar = parentStar;
        this.orbitalDistance = orbitalDistance;
        this.orbitalAngle = orbitalAngle;
        this.orbitalSpeed = orbitalSpeed;
        
        // Planet type and properties
        this.planetType = planetType || PlanetTypes.ROCKY;
        this.planetTypeName = this.planetType.name;
        
        // Initialize properties based on planet type
        this.initializePlanetProperties();
    }
    
    initializePlanetProperties(): void {
        // Set size based on planet type
        const baseRadius = 8 + Math.random() * 12; // 8-20 pixels base
        this.radius = baseRadius * this.planetType.sizeMultiplier;
        this.discoveryDistance = this.radius + 30;
        
        // Set color from planet type's color palette
        this.color = this.planetType.colors[Math.floor(Math.random() * this.planetType.colors.length)];
        
        // Set visual effects based on planet type
        this.visualEffects = { ...this.planetType.visualEffects };
        
        // Initialize stripe color if planet has stripes
        if (this.visualEffects.hasStripes) {
            this.stripeColor = this.darkenColor(this.color, 0.3);
        }
        
        // Initialize glow color if planet has glow
        if (this.visualEffects.hasGlow) {
            this.glowColor = this.lightenColor(this.color, 0.3);
        }
        
        // Initialize ring system if planet has rings
        this.hasRings = this.determineRingSystem();
    }

    // Initialize planet with seeded random for deterministic generation
    initWithSeed(rng: SeededRandom, parentStar?: Star, orbitalDistance: number = 0, orbitalAngle: number = 0, orbitalSpeed: number = 0, planetType?: PlanetType, planetIndex?: number): void {
        // Update orbital properties if provided
        if (parentStar) {
            this.parentStar = parentStar;
            this.orbitalDistance = orbitalDistance;
            this.orbitalAngle = orbitalAngle;
            this.orbitalSpeed = orbitalSpeed;
        }
        
        // Store planet index for unique ID generation
        if (planetIndex !== undefined) {
            this.planetIndex = planetIndex;
        }
        
        // Update planet type if provided
        if (planetType) {
            this.planetType = planetType;
            this.planetTypeName = this.planetType.name;
        }
        
        // Generate unique identifier for this planet using the same system as discovery
        this.uniqueId = this.generateUniqueId();
        
        // Set size based on planet type using seeded random
        const baseRadius = rng.nextFloat(8, 20); // 8-20 pixels base
        this.radius = baseRadius * this.planetType.sizeMultiplier;
        this.discoveryDistance = this.radius + 30;
        
        // Set color from planet type's color palette using seeded random
        this.color = rng.choice(this.planetType.colors);
        
        // Set visual effects based on planet type
        this.visualEffects = { ...this.planetType.visualEffects };
        
        // Initialize stripe color if planet has stripes
        if (this.visualEffects.hasStripes) {
            this.stripeColor = this.darkenColor(this.color, 0.3);
        }
        
        // Initialize glow color if planet has glow
        if (this.visualEffects.hasGlow) {
            this.glowColor = this.lightenColor(this.color, 0.3);
        }
        
        // Initialize ring system if planet has rings
        this.hasRings = this.determineRingSystem(rng);
    }

    generateUniqueId(): string {
        // Use the same logic as the world manager's getObjectId for consistency
        if (this.parentStar && this.planetIndex !== undefined) {
            const starX = Math.floor(this.parentStar.x);
            const starY = Math.floor(this.parentStar.y);
            return `planet_${starX}_${starY}_planet_${this.planetIndex}`;
        }
        // Fallback for planets without parent stars
        return `planet_${Math.floor(this.x)}_${Math.floor(this.y)}`;
    }

    // Simple hash function to convert string ID to numeric seed
    hashStringToNumber(str: string, offset: number = 0): number {
        let hash = offset;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash) % 1000000; // Return positive number
    }

    // Determine if this planet should have rings based on type and probability
    determineRingSystem(rng?: SeededRandom): boolean {
        const ringChance = this.visualEffects.hasRings;
        
        // If hasRings is boolean true, planet always has rings
        if (ringChance === true) return true;
        
        // If hasRings is a number, it's a probability
        if (typeof ringChance === 'number') {
            if (rng) {
                return rng.next() < ringChance;
            } else {
                return Math.random() < ringChance;
            }
        }
        
        // Otherwise, no rings
        return false;
    }

    // Render ring system around the planet
    renderRings(renderer: Renderer, screenX: number, screenY: number): void {
        if (!this.hasRings || !this.visualEffects.ringConfig) return;
        
        const ctx = renderer.ctx;
        const config = this.visualEffects.ringConfig;
        
        // Ring dimensions
        const innerRadius = this.radius * config.innerRadius;
        const outerRadius = this.radius * config.outerRadius;
        
        // Draw rings in multiple bands for depth and realism
        for (let band = 0; band < config.bandCount; band++) {
            const bandProgress = band / (config.bandCount - 1); // 0.0 to 1.0
            const currentInner = innerRadius + (outerRadius - innerRadius) * bandProgress * 0.3;
            const currentOuter = innerRadius + (outerRadius - innerRadius) * (bandProgress * 0.7 + 0.3);
            
            // Calculate ring color for this band
            const colorIndex = Math.floor(bandProgress * (config.colors.length - 1));
            const ringColor = config.colors[colorIndex];
            
            // Apply opacity and shimmer effect if configured
            let alpha = config.opacity;
            if (config.hasShimmer) {
                const time = Date.now() * 0.001;
                const shimmer = Math.sin(time * 2 + band * 0.5) * 0.2 + 0.8;
                alpha *= shimmer;
            }
            
            const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0');
            
            // Draw ring segments as elliptical arcs for 3D appearance
            ctx.strokeStyle = ringColor + alphaHex;
            ctx.lineWidth = Math.max(1, (currentOuter - currentInner) / 3);
            
            // Draw multiple ring segments to create filled appearance
            const segmentCount = 8;
            for (let segment = 0; segment < segmentCount; segment++) {
                const startAngle = (segment / segmentCount) * Math.PI * 2;
                const endAngle = ((segment + 1) / segmentCount) * Math.PI * 2;
                
                // Draw outer ring edge
                ctx.beginPath();
                ctx.ellipse(screenX, screenY, currentOuter, currentOuter * 0.3, 0, startAngle, endAngle);
                ctx.stroke();
                
                // Draw inner ring edge for hollow appearance
                if (currentInner > 0) {
                    ctx.beginPath();
                    ctx.ellipse(screenX, screenY, currentInner, currentInner * 0.3, 0, startAngle, endAngle);
                    ctx.stroke();
                }
            }
        }
    }

    updatePosition(deltaTime: number): void {
        // Update orbital position if planet has a parent star
        if (this.parentStar && this.orbitalDistance > 0) {
            // Update orbital angle based on orbital speed
            this.orbitalAngle += this.orbitalSpeed * deltaTime;
            
            // Keep angle within 0 to 2π range
            if (this.orbitalAngle >= Math.PI * 2) {
                this.orbitalAngle -= Math.PI * 2;
            }
            
            // Calculate new position based on orbital parameters
            this.x = this.parentStar.x + Math.cos(this.orbitalAngle) * this.orbitalDistance;
            this.y = this.parentStar.y + Math.sin(this.orbitalAngle) * this.orbitalDistance;
        }
    }

    darkenColor(hex: string, amount: number): string {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, Math.floor((num >> 16) * (1 - amount)));
        const g = Math.max(0, Math.floor(((num >> 8) & 0x00FF) * (1 - amount)));
        const b = Math.max(0, Math.floor((num & 0x0000FF) * (1 - amount)));
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }

    lightenColor(hex: string, amount: number): string {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, Math.floor((num >> 16) + (255 - (num >> 16)) * amount));
        const g = Math.min(255, Math.floor(((num >> 8) & 0x00FF) + (255 - ((num >> 8) & 0x00FF)) * amount));
        const b = Math.min(255, Math.floor((num & 0x0000FF) + (255 - (num & 0x0000FF)) * amount));
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }

    render(renderer: Renderer, camera: Camera): void {
        const [screenX, screenY] = camera.worldToScreen(this.x, this.y, renderer.canvas.width, renderer.canvas.height);
        
        // Only render if on screen
        if (screenX >= -this.radius - 20 && screenX <= renderer.canvas.width + this.radius + 20 && 
            screenY >= -this.radius - 20 && screenY <= renderer.canvas.height + this.radius + 20) {
            
            // Draw glow effect if planet has glow (before main planet)
            if (this.visualEffects.hasGlow && this.glowColor) {
                const glowRadius = this.radius + 8;
                const gradient = renderer.ctx.createRadialGradient(
                    screenX, screenY, this.radius,
                    screenX, screenY, glowRadius
                );
                gradient.addColorStop(0, this.glowColor + '40'); // Semi-transparent
                gradient.addColorStop(1, this.glowColor + '00'); // Fully transparent
                
                renderer.ctx.fillStyle = gradient;
                renderer.ctx.beginPath();
                renderer.ctx.arc(screenX, screenY, glowRadius, 0, Math.PI * 2);
                renderer.ctx.fill();
            }
            
            // Draw back portion of rings (behind planet)
            if (this.hasRings) {
                renderer.ctx.save();
                // Clip to draw only the back portion
                renderer.ctx.beginPath();
                renderer.ctx.rect(screenX - this.radius * 3, screenY, this.radius * 6, this.radius * 3);
                renderer.ctx.clip();
                this.renderRings(renderer, screenX, screenY);
                renderer.ctx.restore();
            }
            
            // Draw enhanced atmosphere if planet has one
            if (this.visualEffects.hasAtmosphere) {
                this.renderEnhancedAtmosphere(renderer, screenX, screenY);
            }
            
            // Draw main planet
            renderer.drawCircle(screenX, screenY, this.radius, this.color);
            
            // Draw type-specific visual effects
            this.renderVisualEffects(renderer, screenX, screenY);
            
            // Draw front portion of rings (in front of planet)
            if (this.hasRings) {
                renderer.ctx.save();
                // Clip to draw only the front portion
                renderer.ctx.beginPath();
                renderer.ctx.rect(screenX - this.radius * 3, screenY - this.radius * 3, this.radius * 6, this.radius * 3);
                renderer.ctx.clip();
                this.renderRings(renderer, screenX, screenY);
                renderer.ctx.restore();
            }
            
            // Visual indicator if discovered
            if (this.discovered) {
                renderer.ctx.strokeStyle = '#00ff88';
                renderer.ctx.lineWidth = 2;
                renderer.ctx.beginPath();
                renderer.ctx.arc(screenX, screenY, this.radius + 5, 0, Math.PI * 2);
                renderer.ctx.stroke();
            }
        }
    }

    renderVisualEffects(renderer: Renderer, screenX: number, screenY: number): void {
        const ctx = renderer.ctx;
        
        // Draw stripes (atmospheric bands for gas giants, ocean currents for ocean worlds)
        if (this.visualEffects.hasStripes && this.stripeColor) {
            const stripeCount = this.planetType === PlanetTypes.GAS_GIANT ? 5 : 3;
            for (let i = 0; i < stripeCount; i++) {
                const stripeY = screenY - this.radius + (this.radius * 2 / (stripeCount + 1)) * (i + 1);
                const stripeWidth = Math.sqrt(this.radius * this.radius - Math.pow(stripeY - screenY, 2)) * 2;
                
                if (stripeWidth > 0) {
                    ctx.fillStyle = this.stripeColor;
                    const stripeHeight = this.planetType === PlanetTypes.GAS_GIANT ? 3 : 2;
                    ctx.fillRect(
                        screenX - stripeWidth / 2, 
                        stripeY - stripeHeight / 2, 
                        stripeWidth, 
                        stripeHeight
                    );
                }
            }
        }
        
        // Draw swirls for gas giants
        if (this.visualEffects.hasSwirls && this.stripeColor) {
            ctx.strokeStyle = this.stripeColor;
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 2; i++) {
                const swirleRadius = this.radius * 0.7;
                const offsetX = (i === 0 ? -1 : 1) * this.radius * 0.3;
                ctx.beginPath();
                ctx.arc(screenX + offsetX, screenY, swirleRadius * 0.3, 0, Math.PI);
                ctx.stroke();
            }
        }
        
        // Draw craters for rocky/desert/frozen worlds
        if (this.visualEffects.hasCraters) {
            ctx.fillStyle = this.darkenColor(this.color, 0.4);
            // More generous crater scaling - larger planets get significantly more craters
            const baseCraterCount = Math.floor(this.radius / 6); // Increased from /8 to /6
            const bonusCraters = Math.floor((this.radius - 10) / 4); // Extra craters for larger planets
            const craterCount = Math.max(2, baseCraterCount + bonusCraters); // Minimum 2 craters
            
            for (let i = 0; i < craterCount; i++) {
                // Use unique planet ID for consistent but varied crater patterns
                const baseHash = this.hashStringToNumber(this.uniqueId || 'default');
                
                // Generate random but consistent angle for each crater
                const angleSeed = (baseHash + i * 50) % 1000 / 1000;
                const angle = angleSeed * Math.PI * 2;
                
                // Generate random but consistent distance from center
                const distanceSeed = (baseHash + i * 100 + 12345) % 1000 / 1000;
                const distance = this.radius * 0.7 * distanceSeed;
                
                const craterX = screenX + Math.cos(angle) * distance;
                const craterY = screenY + Math.sin(angle) * distance;
                
                // Generate consistent crater size
                const sizeSeed = (baseHash + i * 200 + 67890) % 1000 / 1000;
                const craterSize = 1 + sizeSeed * 2;
                
                ctx.beginPath();
                ctx.arc(craterX, craterY, craterSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Draw dune patterns for desert worlds
        if (this.visualEffects.hasDunePatterns) {
            ctx.strokeStyle = this.darkenColor(this.color, 0.2);
            ctx.lineWidth = 1;
            const baseHash = this.hashStringToNumber(this.uniqueId || 'default', 5000);
            const duneCount = 3 + Math.floor((baseHash % 100) / 50); // 3-4 dunes
            
            for (let i = 0; i < duneCount; i++) {
                // Add slight variation to dune positions using unique ID
                const positionSeed = (baseHash + i * 300) % 1000 / 1000;
                const yOffset = (positionSeed - 0.5) * this.radius * 0.2; // Small random offset
                const y = screenY - this.radius * 0.6 + (i * this.radius * 0.4) + yOffset;
                
                const width = Math.sqrt(this.radius * this.radius - Math.pow(y - screenY, 2)) * 1.5;
                if (width > 0) {
                    // Add slight curve variation
                    const curveSeed = (baseHash + i * 400) % 1000 / 1000;
                    const curveHeight = 2 + curveSeed * 3; // 2-5 pixel curve height
                    
                    ctx.beginPath();
                    ctx.moveTo(screenX - width / 2, y);
                    ctx.quadraticCurveTo(screenX, y - curveHeight, screenX + width / 2, y);
                    ctx.stroke();
                }
            }
        }
        
        // Draw crystalline patterns for frozen worlds
        if (this.visualEffects.hasCrystalline) {
            ctx.strokeStyle = this.lightenColor(this.color, 0.5);
            ctx.lineWidth = 1;
            const baseHash = this.hashStringToNumber(this.uniqueId || 'default', 7000);
            const crystalCount = 4 + Math.floor((baseHash % 100) / 25); // 4-7 crystal lines
            
            for (let i = 0; i < crystalCount; i++) {
                // Add variation to crystal angles using unique ID
                const angleSeed = (baseHash + i * 500) % 1000 / 1000;
                const baseAngle = (i / crystalCount) * Math.PI * 2;
                const angleVariation = (angleSeed - 0.5) * 0.3; // ±0.15 radian variation
                const angle = baseAngle + angleVariation;
                
                // Add variation to crystal lengths
                const lengthSeed = (baseHash + i * 600) % 1000 / 1000;
                const startRadius = 0.2 + lengthSeed * 0.2; // 0.2-0.4
                const endRadius = 0.6 + lengthSeed * 0.3;   // 0.6-0.9
                
                const startX = screenX + Math.cos(angle) * this.radius * startRadius;
                const startY = screenY + Math.sin(angle) * this.radius * startRadius;
                const endX = screenX + Math.cos(angle) * this.radius * endRadius;
                const endY = screenY + Math.sin(angle) * this.radius * endRadius;
                
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }
        
        // Draw lava flows for volcanic worlds
        if (this.visualEffects.hasLavaFlow) {
            ctx.strokeStyle = this.lightenColor(this.color, 0.3);
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                const angle = (i / 3) * Math.PI * 2;
                const startRadius = this.radius * 0.2;
                const endRadius = this.radius * 0.9;
                
                ctx.beginPath();
                ctx.moveTo(
                    screenX + Math.cos(angle) * startRadius,
                    screenY + Math.sin(angle) * startRadius
                );
                ctx.lineTo(
                    screenX + Math.cos(angle) * endRadius,
                    screenY + Math.sin(angle) * endRadius
                );
                ctx.stroke();
            }
        }
        
        // Draw shimmer effect for exotic worlds
        if (this.visualEffects.hasShimmer) {
            const time = Date.now() * 0.001; // Convert to seconds
            const shimmerAlpha = Math.sin(time * 2) * 0.3 + 0.7; // Oscillate between 0.4 and 1.0
            ctx.strokeStyle = this.lightenColor(this.color, 0.6) + Math.floor(shimmerAlpha * 255).toString(16).padStart(2, '0');
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.radius + 2, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    renderEnhancedAtmosphere(renderer: Renderer, screenX: number, screenY: number): void {
        const ctx = renderer.ctx;
        const atmosphereConfig = this.visualEffects.atmosphereConfig;
        
        if (!atmosphereConfig) {
            // Fallback to simple atmosphere if no config
            const atmosphereRadius = this.radius + 3;
            const atmosphereColor = this.lightenColor(this.color, 0.4);
            ctx.strokeStyle = atmosphereColor + '80'; // Semi-transparent
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(screenX, screenY, atmosphereRadius, 0, Math.PI * 2);
            ctx.stroke();
            return;
        }

        // Multi-layer atmospheric haze
        this.renderAtmosphericLayers(ctx, screenX, screenY, atmosphereConfig);
        
        // Weather patterns (if enabled)
        if (atmosphereConfig.hasWeatherPatterns) {
            this.renderWeatherPatterns(ctx, screenX, screenY, atmosphereConfig);
        }
        
        // Aurora effects (if enabled)
        if (atmosphereConfig.hasAuroras && atmosphereConfig.auroraColors) {
            this.renderAuroras(ctx, screenX, screenY, atmosphereConfig);
        }
    }

    private renderAtmosphericLayers(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, config: AtmosphereConfig): void {
        for (let layer = 0; layer < config.layers; layer++) {
            const layerRadius = this.radius + (config.thickness * (layer + 1) / config.layers);
            const layerOpacity = config.density * (1 - layer / config.layers); // Fade outer layers
            
            // Create radial gradient for each layer
            const gradient = ctx.createRadialGradient(
                screenX, screenY, this.radius + (config.thickness * layer / config.layers),
                screenX, screenY, layerRadius
            );
            
            const opacityHex = Math.floor(layerOpacity * 255).toString(16).padStart(2, '0');
            gradient.addColorStop(0, config.color + opacityHex);
            gradient.addColorStop(1, config.color + '00'); // Fully transparent
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(screenX, screenY, layerRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    private renderWeatherPatterns(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, config: AtmosphereConfig): void {
        const time = Date.now() * 0.001; // Convert to seconds
        const weatherSpeed = config.weatherSpeed || 1.0;
        
        // Create subtle, slow-moving cloud-like patterns
        for (let i = 0; i < 3; i++) {
            const angle = (time * weatherSpeed * 0.1) + (i * Math.PI * 0.67); // Offset each pattern
            const patternRadius = this.radius + config.thickness * 0.7;
            const patternX = screenX + Math.cos(angle) * (this.radius * 0.3);
            const patternY = screenY + Math.sin(angle) * (this.radius * 0.3);
            
            // Create small cloud-like effects
            const gradient = ctx.createRadialGradient(
                patternX, patternY, 0,
                patternX, patternY, this.radius * 0.4
            );
            
            const alpha = (Math.sin(time * weatherSpeed + i) * 0.15 + 0.2) * config.density;
            const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0');
            gradient.addColorStop(0, config.color + alphaHex);
            gradient.addColorStop(1, config.color + '00');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(patternX, patternY, this.radius * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    private renderAuroras(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, config: AtmosphereConfig): void {
        if (!config.auroraColors) return;
        
        const time = Date.now() * 0.001;
        const auroraRadius = this.radius + config.thickness * 0.8;
        
        // Render auroras at polar regions (top and bottom of planet)
        for (let pole = 0; pole < 2; pole++) {
            const poleY = screenY + (pole === 0 ? -1 : 1) * this.radius * 0.8;
            
            // Multiple aurora bands
            for (let band = 0; band < config.auroraColors.length; band++) {
                const color = config.auroraColors[band];
                const bandOffset = band * 8; // Spread bands vertically
                const currentY = poleY + (pole === 0 ? bandOffset : -bandOffset);
                
                // Create shimmering aurora effect
                const intensity = Math.sin(time * 2 + band * Math.PI * 0.5) * 0.4 + 0.6;
                const alphaHex = Math.floor(intensity * 0.6 * 255).toString(16).padStart(2, '0');
                
                // Aurora shape - elongated horizontally like real auroras
                const gradient = ctx.createLinearGradient(
                    screenX - this.radius, currentY,
                    screenX + this.radius, currentY
                );
                gradient.addColorStop(0, color + '00');
                gradient.addColorStop(0.3, color + alphaHex);
                gradient.addColorStop(0.7, color + alphaHex);
                gradient.addColorStop(1, color + '00');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(
                    screenX - this.radius * 0.9, 
                    currentY - 2, 
                    this.radius * 1.8, 
                    4
                );
            }
        }
    }
}

// Star class
export class Star extends CelestialObject {
    // Array to track planets orbiting this star
    planets: Planet[] = [];
    
    // Star type and properties
    starType: StarType;
    starTypeName: string;
    radius: number = 80;
    color: string = '#ffdd88';
    visualEffects: StarVisualEffects = {};
    brightness: number = 1.0;
    
    // Braking distance for stars
    brakingDistance: number = 100;
    
    // Identification
    uniqueId?: string;
    
    // Sunspot data for G-type stars
    sunspots?: Sunspot[];

    constructor(x: number, y: number, starType?: StarType) {
        super(x, y, 'star');
        
        // Star type and properties
        this.starType = starType || StarTypes.G_TYPE;
        this.starTypeName = this.starType.name;
        
        // Initialize properties based on star type
        this.initializeStarProperties();
    }
    
    initializeStarProperties(): void {
        // Set size based on star type
        const baseRadius = 80 + Math.random() * 60; // 80-140 pixels base
        this.radius = baseRadius * this.starType.sizeMultiplier;
        this.discoveryDistance = this.radius + 400;
        this.brakingDistance = this.radius + 100; // Separate braking distance for stars
        
        // Set color from star type's color palette
        this.color = this.starType.colors[Math.floor(Math.random() * this.starType.colors.length)];
        
        // Set visual effects based on star type
        this.visualEffects = { ...this.starType.visualEffects };
        
        // Full brightness for all stars
        this.brightness = 1.0;
    }

    // Initialize star with seeded random for deterministic generation
    initWithSeed(rng: SeededRandom, starType?: StarType): void {
        // Update star type if provided
        if (starType) {
            this.starType = starType;
            this.starTypeName = this.starType.name;
        }
        
        // Generate unique identifier for this star
        this.uniqueId = this.generateUniqueId();
        
        // Set size based on star type using seeded random
        const baseRadius = rng.nextFloat(80, 140); // 80-140 pixels base
        this.radius = baseRadius * this.starType.sizeMultiplier;
        this.discoveryDistance = this.radius + 400;
        this.brakingDistance = this.radius + 100; // Separate braking distance for stars
        
        // Set color from star type's color palette using seeded random
        this.color = rng.choice(this.starType.colors);
        
        // Set visual effects based on star type
        this.visualEffects = { ...this.starType.visualEffects };
        
        // Generate sunspots for G-type stars
        if (this.visualEffects.hasSunspots) {
            this.generateSunspots(rng);
        }
        
        // Full brightness for all stars
        this.brightness = 1.0;
    }

    generateUniqueId(): string {
        // Create unique identifier for this star based on position
        return `star_${Math.floor(this.x)}_${Math.floor(this.y)}`;
    }

    // Simple hash function to convert string ID to numeric seed (same as planets)
    hashStringToNumber(str: string, offset: number = 0): number {
        let hash = offset;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash) % 1000000; // Return positive number
    }

    generateSunspots(rng: SeededRandom): void {
        this.sunspots = [];
        
        // Determine number of sunspots (0-6) with realistic probability distribution
        const rand = rng.next();
        let sunspotCount: number;
        if (rand < 0.2) sunspotCount = 0;        // 20% - solar minimum
        else if (rand < 0.4) sunspotCount = rng.nextInt(1, 2);  // 20% - low activity
        else if (rand < 0.7) sunspotCount = rng.nextInt(3, 4);  // 30% - moderate activity  
        else sunspotCount = rng.nextInt(5, 6);  // 30% - high activity
        
        // Generate individual sunspots
        for (let i = 0; i < sunspotCount; i++) {
            const sunspot = {
                angle: rng.next() * Math.PI * 2,  // Random angle around star
                radius: rng.nextFloat(0.3, 0.8) * this.radius,  // Distance from center (30-80% of star radius)
                size: rng.nextFloat(0.08, 0.15) * this.radius,  // Sunspot size (8-15% of star radius)
                intensity: rng.nextFloat(0.4, 0.7)  // How dark the sunspot appears (0.4-0.7)
            };
            this.sunspots.push(sunspot);
        }
    }

    addPlanet(planet: Planet): void {
        this.planets.push(planet);
    }

    render(renderer: Renderer, camera: Camera): void {
        const [screenX, screenY] = camera.worldToScreen(this.x, this.y, renderer.canvas.width, renderer.canvas.height);
        
        // Expand render bounds for corona and radiation effects
        const renderBounds = this.radius + 30;
        
        // Only render if on screen
        if (screenX >= -renderBounds && screenX <= renderer.canvas.width + renderBounds && 
            screenY >= -renderBounds && screenY <= renderer.canvas.height + renderBounds) {
            
            // Draw type-specific visual effects before the main star
            this.renderVisualEffects(renderer, screenX, screenY);
            
            // Draw the main star with enhanced luminosity
            this.drawStarWithLuminosity(renderer, screenX, screenY, this.radius);
            
            // Visual indicator if discovered
            if (this.discovered) {
                renderer.ctx.strokeStyle = '#00ff88';
                renderer.ctx.lineWidth = 3;
                renderer.ctx.beginPath();
                renderer.ctx.arc(screenX, screenY, this.radius + 8, 0, Math.PI * 2);
                renderer.ctx.stroke();
            }
        }
    }

    renderVisualEffects(renderer: Renderer, screenX: number, screenY: number): void {
        const ctx = renderer.ctx;
        
        // Draw enhanced corona effect
        if (this.visualEffects.hasCorona && this.visualEffects.coronaSize) {
            this.renderEnhancedCorona(ctx, screenX, screenY);
        }
        
        // Draw radiation effects for high-energy stars
        if (this.visualEffects.hasRadiation) {
            const intensity = this.visualEffects.radiationIntensity || 0.3;
            const radiationRadius = this.radius + 15;
            
            // Create multiple radiation rings
            for (let i = 0; i < 3; i++) {
                const time = Date.now() * 0.001;
                const offset = i * Math.PI * 0.67; // Offset each ring
                const alpha = (Math.sin(time * 2 + offset) * 0.3 + 0.7) * intensity;
                const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0');
                
                ctx.strokeStyle = this.color + alphaHex;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(screenX, screenY, radiationRadius + i * 5, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        
        // Draw shimmer effect for white dwarfs
        if (this.visualEffects.hasShimmer) {
            const time = Date.now() * 0.001;
            const shimmerAlpha = Math.sin(time * 3) * 0.2 + 0.8; // Oscillate between 0.6 and 1.0
            const alphaHex = Math.floor(shimmerAlpha * 255).toString(16).padStart(2, '0');
            
            ctx.strokeStyle = '#ffffff' + alphaHex;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.radius + 3, 0, Math.PI * 2);
            ctx.stroke();
            
            // Additional inner shimmer
            ctx.strokeStyle = this.color + alphaHex;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.radius * 0.8, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Draw swirling effects for dynamic stars
        if (this.visualEffects.hasSwirling && this.visualEffects.swirlSpeed && this.visualEffects.swirlSpeed > 0) {
            const time = Date.now() * 0.001;
            const swirlSpeed = this.visualEffects.swirlSpeed;
            
            // Create multiple swirling layers for depth
            for (let layer = 0; layer < 3; layer++) {
                const layerOffset = layer * Math.PI * 0.67; // Offset each layer
                const layerRadius = this.radius * (0.3 + layer * 0.2); // Inner to outer layers
                const rotationSpeed = swirlSpeed * (1 + layer * 0.3); // Different speeds per layer
                
                // Draw swirling arcs
                for (let i = 0; i < 6; i++) {
                    const angleOffset = (i / 6) * Math.PI * 2;
                    const rotation = time * rotationSpeed + angleOffset + layerOffset;
                    
                    // Calculate swirl path
                    const startAngle = rotation;
                    const endAngle = rotation + Math.PI * 0.4; // Arc length
                    
                    // Vary opacity based on time for undulating effect
                    const opacity = (Math.sin(time * 2 + angleOffset + layerOffset) * 0.3 + 0.7) * (0.2 - layer * 0.05);
                    const opacityHex = Math.floor(opacity * 255).toString(16).padStart(2, '0');
                    
                    // Use a brighter version of the star color for swirls
                    const swirlColor = this.lightenColor(this.color, 0.3) + opacityHex;
                    
                    ctx.strokeStyle = swirlColor;
                    ctx.lineWidth = 2 - layer * 0.3; // Thinner for outer layers
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, layerRadius, startAngle, endAngle);
                    ctx.stroke();
                }
            }
        }
        
        // Draw rotating sunspots for G-type stars
        if (this.visualEffects.hasSunspots && this.sunspots && this.sunspots.length > 0) {
            const time = Date.now() * 0.001;
            const rotationSpeed = this.visualEffects.sunspotRotationSpeed || 0.15;
            
            for (const sunspot of this.sunspots) {
                // Calculate current position with rotation
                const currentAngle = sunspot.angle + (time * rotationSpeed);
                const spotX = screenX + Math.cos(currentAngle) * sunspot.radius;
                const spotY = screenY + Math.sin(currentAngle) * sunspot.radius;
                
                // Calculate perspective foreshortening (spots fade near edges)
                const normalizedRadius = sunspot.radius / this.radius;
                const edgeFade = Math.cos(currentAngle) * 0.3 + 0.7; // Fade as spot approaches edges
                const perspectiveScale = 1.0 - (normalizedRadius * 0.3); // Smaller towards edges
                
                // Only render spots that are reasonably visible (front side of star)
                if (edgeFade > 0.4) {
                    // Create darkened color for sunspot
                    const sunspotColor = this.darkenColor(this.color, sunspot.intensity);
                    
                    // Draw elliptical sunspot with perspective
                    const spotSize = sunspot.size * perspectiveScale * edgeFade;
                    const ellipseWidth = spotSize;
                    const ellipseHeight = spotSize * Math.abs(Math.cos(currentAngle)) * 0.6 + spotSize * 0.4;
                    
                    ctx.fillStyle = sunspotColor;
                    ctx.beginPath();
                    ctx.ellipse(spotX, spotY, ellipseWidth, ellipseHeight, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }

    // Enhanced corona rendering with multi-layer effects
    renderEnhancedCorona(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
        const time = Date.now() * 0.001;
        const config = this.visualEffects.coronaConfig;
        const baseCoronaRadius = this.radius * (this.visualEffects.coronaSize || 1.2);
        
        // Use default configuration if none provided
        const coronaLayers = config?.layers || 3;
        const baseIntensity = config?.intensity || 0.6;
        const asymmetryFactor = config?.asymmetry || 0.02;
        const fluctuationAmount = config?.fluctuation || 0.1;
        
        // Calculate dynamic intensity variations
        const fluctuation = Math.sin(time * 0.5 + Math.cos(time * 0.3) * 0.5) * fluctuationAmount + 1.0;
        const intensity = baseIntensity * fluctuation;
        
        // Get corona colors (fallback to star color variants)
        const coronaColors = config?.colors || this.generateCoronaColors();
        
        // Calculate asymmetry offset for directional corona streams
        const asymmetryX = Math.cos(time * 0.2) * asymmetryFactor * this.radius;
        const asymmetryY = Math.sin(time * 0.15) * asymmetryFactor * this.radius;
        
        // Render corona layers from outermost to innermost
        for (let layer = coronaLayers - 1; layer >= 0; layer--) {
            const layerProgress = layer / (coronaLayers - 1); // 0.0 to 1.0 (inner to outer)
            const layerRadius = this.radius + (baseCoronaRadius - this.radius) * (0.3 + layerProgress * 0.7);
            const layerIntensity = intensity * (1.0 - layerProgress * 0.7); // Inner layers brighter
            
            // Choose color for this layer
            const colorIndex = Math.floor(layerProgress * (coronaColors.length - 1));
            const layerColor = coronaColors[colorIndex];
            
            // Create layer-specific asymmetry
            const layerAsymmetryX = asymmetryX * (1 + layerProgress * 0.5);
            const layerAsymmetryY = asymmetryY * (1 + layerProgress * 0.5);
            const coronaCenterX = screenX + layerAsymmetryX;
            const coronaCenterY = screenY + layerAsymmetryY;
            
            // Create radial gradient for this layer
            const gradient = ctx.createRadialGradient(
                coronaCenterX, coronaCenterY, this.radius * (0.8 + layerProgress * 0.2),
                coronaCenterX, coronaCenterY, layerRadius
            );
            
            // Dynamic opacity based on layer and intensity
            const innerOpacity = Math.floor(layerIntensity * 0.3 * 255).toString(16).padStart(2, '0');
            const outerOpacity = '00'; // Fully transparent
            
            gradient.addColorStop(0, layerColor + innerOpacity);
            gradient.addColorStop(0.6, layerColor + Math.floor(layerIntensity * 0.1 * 255).toString(16).padStart(2, '0'));
            gradient.addColorStop(1, layerColor + outerOpacity);
            
            // Render this corona layer
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(coronaCenterX, coronaCenterY, layerRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Add subtle corona streamers for outer layers
            if (layer >= coronaLayers - 2) {
                // Offset time for each layer to create variation
                const layerTimeOffset = layer * 1.3; // Different timing per layer
                this.renderCoronaStreamers(ctx, coronaCenterX, coronaCenterY, layerRadius, layerColor, layerIntensity * 0.4, time, layerTimeOffset, layer);
            }
        }
    }
    
    // Render subtle corona streamers for enhanced realism
    private renderCoronaStreamers(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number, color: string, intensity: number, time: number, layerTimeOffset: number = 0, layer: number = 0): void {
        // Determine streamer count and behavior based on star type
        let streamerCount = this.getStreamerCountForStarType();
        const layerTime = time + layerTimeOffset;
        
        // For sun-like stars, use probability-based streamer spawning
        if (this.shouldUseProbabilisticStreamers()) {
            streamerCount = this.getProbabilisticStreamerCount(layerTime, layer);
        }
        
        const baseOpacity = Math.floor(intensity * 255).toString(16).padStart(2, '0');
        
        for (let i = 0; i < streamerCount; i++) {
            // Add layer-specific angle offset to prevent perfect alignment
            const layerAngleOffset = layer * 0.7; // Different starting positions per layer
            const angle = (i / streamerCount) * Math.PI * 2 + layerTime * 0.1 + layerAngleOffset;
            const streamerLength = radius * (1.2 + Math.sin(layerTime * 0.8 + i + layer) * 0.3);
            const streamerWidth = 3 + Math.sin(layerTime * 0.6 + i * 0.5 + layer * 0.3) * 1;
            
            // Calculate streamer endpoints
            const innerRadius = radius * 0.9;
            const outerRadius = streamerLength;
            const startX = centerX + Math.cos(angle) * innerRadius;
            const startY = centerY + Math.sin(angle) * innerRadius;
            const endX = centerX + Math.cos(angle) * outerRadius;
            const endY = centerY + Math.sin(angle) * outerRadius;
            
            // Create linear gradient for streamer
            const streamerGradient = ctx.createLinearGradient(startX, startY, endX, endY);
            streamerGradient.addColorStop(0, color + baseOpacity);
            streamerGradient.addColorStop(0.7, color + Math.floor(intensity * 0.3 * 255).toString(16).padStart(2, '0'));
            streamerGradient.addColorStop(1, color + '00');
            
            // Draw streamer
            ctx.strokeStyle = streamerGradient;
            ctx.lineWidth = streamerWidth;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
    }
    
    // Determine streamer count based on star type
    private getStreamerCountForStarType(): number {
        switch (this.starTypeName) {
            case 'G-Type Star':         return 2; // Sun-like: rare streamers
            case 'K-Type Star':         return 2; // Orange dwarf: rare streamers  
            case 'M-Type Star':         return 1; // Red dwarf: very rare streamers
            case 'Red Giant':           return 4; // Large, complex magnetic field
            case 'Blue Giant':          return 6; // Energetic, many streamers
            case 'White Dwarf':         return 1; // Compact, minimal activity
            case 'Neutron Star':        return 0; // No streamers, just intense corona
            default:                    return 2; // Default for unknown types
        }
    }
    
    // Check if this star type should use probabilistic (rare) streamers  
    private shouldUseProbabilisticStreamers(): boolean {
        return ['G-Type Star', 'K-Type Star', 'M-Type Star'].includes(this.starTypeName);
    }
    
    // Get probabilistic streamer count for sun-like stars (simulate rare flares)
    private getProbabilisticStreamerCount(time: number, layer: number): number {
        const maxStreamers = this.getStreamerCountForStarType();
        
        // Use different random seeds for each layer to avoid identical patterns
        const seed = Math.sin(time * 0.05 + layer * 2.1) * Math.cos(time * 0.03 + layer * 1.7);
        
        // Only show streamers occasionally (like real solar flares)
        const probability = Math.abs(seed);
        if (probability < 0.7) return 0; // 70% of time: no streamers
        if (probability < 0.9) return 1; // 20% of time: 1 streamer  
        return maxStreamers;             // 10% of time: max streamers
    }
    
    // Generate corona colors based on star temperature and type
    generateCoronaColors(): string[] {
        const config = this.visualEffects.coronaConfig;
        const temperature = config?.temperature || 1.0;
        
        // Temperature-based color generation
        if (temperature >= 1.8) {
            // Very hot - blue-white corona (Blue Giants, White Dwarfs)
            return [this.lightenColor('#88ddff', 0.3), this.lightenColor('#aaeeff', 0.2), '#ffffff'];
        } else if (temperature >= 1.3) {
            // Hot - white-yellow corona (G-type stars)
            return [this.lightenColor(this.color, 0.4), this.lightenColor(this.color, 0.6), '#ffffcc'];
        } else if (temperature >= 0.8) {
            // Medium - yellow-orange corona (K-type stars)
            return [this.lightenColor(this.color, 0.3), this.lightenColor(this.color, 0.5), this.lightenColor('#ffaa44', 0.3)];
        } else {
            // Cool - red-orange corona (M-type, Red Giants)
            return [this.lightenColor(this.color, 0.2), this.lightenColor(this.color, 0.4), this.lightenColor('#ff6644', 0.2)];
        }
    }
    
    // Helper method for lightening colors
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
    
    // Enhanced star rendering with simple solid colors and pulsing
    drawStarWithLuminosity(renderer: Renderer, screenX: number, screenY: number, baseRadius: number): void {
        const time = Date.now() * 0.001;
        
        // Calculate effective radius (with pulsing if applicable)
        let effectiveRadius = baseRadius;
        if (this.visualEffects.hasPulsing && this.visualEffects.pulseSpeed) {
            const pulseSpeed = this.visualEffects.pulseSpeed;
            const pulse = Math.sin(time * pulseSpeed) * 0.03 + 0.97;
            effectiveRadius = baseRadius * pulse;
        }
        
        // Draw simple solid star - no gradients or luminosity effects
        renderer.drawCircle(screenX, screenY, effectiveRadius, this.color);
    }
    
    // Helper method for darkening colors
    darkenColor(hex: string, amount: number): string {
        // Parse hex color
        const colorNum = parseInt(hex.replace('#', ''), 16);
        const r = (colorNum >> 16) & 255;
        const g = (colorNum >> 8) & 255;
        const b = colorNum & 255;
        
        // Darken by moving towards black
        const newR = Math.max(0, Math.floor(r * (1 - amount)));
        const newG = Math.max(0, Math.floor(g * (1 - amount)));
        const newB = Math.max(0, Math.floor(b * (1 - amount)));
        
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }
}

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
            const sizeVariation = rng.nextFloat(0.1, 0.2); // 10-20% of parent size
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
            const useParentColor = rng.next() < 0.3; // 30% chance to use parent color
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
            
            // Visual indicator if discovered
            if (this.discovered) {
                renderer.ctx.strokeStyle = '#00ff88';
                renderer.ctx.lineWidth = 1;
                renderer.ctx.beginPath();
                renderer.ctx.arc(screenX, screenY, this.radius + 3, 0, Math.PI * 2);
                renderer.ctx.stroke();
            }
        }
    }
}

// Planet type definitions with properties and visual characteristics
export const PlanetTypes: Record<string, PlanetType> = {
    ROCKY: {
        name: 'Rocky Planet',
        colors: ['#8B4513', '#708090', '#A0522D'], // Brown, gray, darker brown
        sizeMultiplier: 0.8, // Smaller than average
        discoveryValue: 1,
        rarity: 0.35, // 35% of planets
        visualEffects: {
            hasAtmosphere: false,
            hasCraters: true,
            hasStripes: false
        }
    },
    OCEAN: {
        name: 'Ocean World',
        colors: ['#4169E1', '#1E90FF', '#0047AB'], // Various blues
        sizeMultiplier: 1.0, // Average size
        discoveryValue: 2,
        rarity: 0.20, // 20% of planets
        visualEffects: {
            hasAtmosphere: true,
            hasCraters: false,
            hasStripes: true, // Represents currents/weather patterns
            atmosphereConfig: {
                layers: 3,
                thickness: 12,
                density: 0.3,
                color: '#87CEEB', // Light blue atmospheric haze
                hasWeatherPatterns: true,
                hasAuroras: true,
                auroraColors: ['#00FFFF', '#40E0D0', '#1E90FF'], // Cyan, turquoise, blue
                weatherSpeed: 0.8
            }
        }
    },
    GAS_GIANT: {
        name: 'Gas Giant',
        colors: ['#DAA520', '#CD853F', '#F4A460'], // Tan/golden colors
        sizeMultiplier: 1.8, // Much larger
        discoveryValue: 3,
        rarity: 0.15, // 15% of planets
        visualEffects: {
            hasAtmosphere: true,
            hasCraters: false,
            hasStripes: true, // Atmospheric bands
            hasSwirls: true,
            hasRings: 0.4, // 40% of gas giants have ring systems
            ringConfig: {
                innerRadius: 1.4, // Multiple of planet radius
                outerRadius: 2.2,
                colors: ['#D4AF37', '#CD853F', '#B8860B'], // Golden/brown ring particles
                opacity: 0.7,
                bandCount: 3
            },
            atmosphereConfig: {
                layers: 4, // Thick atmosphere
                thickness: 20,
                density: 0.4,
                color: '#F4A460', // Sandy brown atmospheric haze
                hasWeatherPatterns: true,
                hasAuroras: false, // Gas giants typically don't have visible auroras
                weatherSpeed: 1.2 // Faster weather due to massive size
            }
        }
    },
    DESERT: {
        name: 'Desert World',
        colors: ['#FFE4B5', '#FF6347', '#DEB887'], // Tan, orange, sandy
        sizeMultiplier: 0.9,
        discoveryValue: 1,
        rarity: 0.15, // 15% of planets
        visualEffects: {
            hasAtmosphere: false,
            hasCraters: true,
            hasStripes: false,
            hasDunePatterns: true
        }
    },
    FROZEN: {
        name: 'Frozen World',
        colors: ['#87CEEB', '#ADD8E6', '#E0FFFF'], // Light blue, icy colors
        sizeMultiplier: 0.85,
        discoveryValue: 2,
        rarity: 0.08, // 8% of planets (rare)
        visualEffects: {
            hasAtmosphere: false,
            hasCraters: true,
            hasStripes: false,
            hasCrystalline: true,
            hasGlow: true, // Subtle ice glow
            hasRings: 0.3, // 30% chance of icy ring systems
            ringConfig: {
                innerRadius: 1.3,
                outerRadius: 1.8,
                colors: ['#E0FFFF', '#F0F8FF', '#B0E0E6'], // Icy blue-white particles
                opacity: 0.5,
                bandCount: 2
            }
        }
    },
    VOLCANIC: {
        name: 'Volcanic World',
        colors: ['#DC143C', '#FF4500', '#8B0000'], // Red, orange-red, dark red
        sizeMultiplier: 0.9,
        discoveryValue: 2,
        rarity: 0.05, // 5% of planets (rare)
        visualEffects: {
            hasAtmosphere: false,
            hasCraters: false,
            hasStripes: false,
            hasGlow: true, // Volcanic glow
            hasLavaFlow: true
        }
    },
    EXOTIC: {
        name: 'Exotic World',
        colors: ['#DA70D6', '#9370DB', '#8A2BE2'], // Purple variants
        sizeMultiplier: 1.1,
        discoveryValue: 4,
        rarity: 0.02, // 2% of planets (very rare)
        visualEffects: {
            hasAtmosphere: true,
            hasCraters: false,
            hasStripes: false,
            hasGlow: true, // Mysterious glow
            hasShimmer: true, // Special effect
            hasRings: 0.5, // 50% chance of exotic ring systems
            ringConfig: {
                innerRadius: 1.5,
                outerRadius: 2.5,
                colors: ['#FF69B4', '#9370DB', '#00FFFF'], // Colorful, mysterious particles
                opacity: 0.8,
                bandCount: 4,
                hasShimmer: true // Rings also shimmer
            },
            atmosphereConfig: {
                layers: 5, // Very complex atmosphere
                thickness: 15,
                density: 0.25, // Subtle, mysterious
                color: '#DA70D6', // Magenta atmospheric haze
                hasWeatherPatterns: true,
                hasAuroras: true,
                auroraColors: ['#FF69B4', '#00FFFF', '#9370DB', '#FFD700'], // Multi-colored exotic auroras
                weatherSpeed: 0.5 // Slower, more ethereal
            }
        }
    }
};

// Star type definitions with properties and visual characteristics
export const StarTypes: Record<string, StarType> = {
    G_TYPE: {
        name: 'G-Type Star',
        description: 'Sun-like yellow star',
        colors: ['#ffdd88', '#ffaa44', '#ffcc66'], // Yellow variants
        sizeMultiplier: 1.0, // Average size
        temperature: 'medium', // Affects planet type distributions
        discoveryValue: 1,
        rarity: 0.30, // 30% - most common along with K-type
        visualEffects: {
            hasCorona: true,
            hasPulsing: false,
            hasRadiation: false,
            coronaSize: 1.2,
            coronaConfig: {
                layers: 3,
                intensity: 0.7,
                temperature: 1.3,
                asymmetry: 0.03,
                fluctuation: 0.1,
                colors: ['#ffdd88', '#ffffcc', '#ffffff']
            },
            hasSwirling: true,
            swirlSpeed: 0.3,
            hasSunspots: true,
            maxSunspots: 6,
            sunspotRotationSpeed: 0.15 // Slow rotation for realistic 25-30 day period
        }
    },
    K_TYPE: {
        name: 'K-Type Star',
        description: 'Orange dwarf star',
        colors: ['#ffaa44', '#ff8844', '#ff9955'], // Orange variants
        sizeMultiplier: 0.9, // Slightly smaller
        temperature: 'medium-cool',
        discoveryValue: 1,
        rarity: 0.25, // 25% - very common and stable
        visualEffects: {
            hasCorona: true,
            hasPulsing: false,
            hasRadiation: false,
            coronaSize: 1.1,
            coronaConfig: {
                layers: 3,
                intensity: 0.6,
                temperature: 1.0,
                asymmetry: 0.02,
                fluctuation: 0.08,
                colors: ['#ffaa44', '#ffcc88', '#ffeeaa']
            },
            hasSwirling: true,
            swirlSpeed: 0.25
        }
    },
    M_TYPE: {
        name: 'M-Type Star',
        description: 'Red dwarf star',
        colors: ['#ff6644', '#ff4422', '#cc3311'], // Red variants
        sizeMultiplier: 0.7, // Smaller but common
        temperature: 'cool',
        discoveryValue: 1,
        rarity: 0.25, // 25% - very common in reality
        visualEffects: {
            hasCorona: true, // Subtle corona for red dwarfs
            hasPulsing: false,
            hasRadiation: false,
            coronaSize: 1.05,
            coronaConfig: {
                layers: 2,
                intensity: 0.4,
                temperature: 0.7,
                asymmetry: 0.02,
                fluctuation: 0.05,
                colors: ['#ff6644', '#ff8866', '#ffaa88']
            },
            hasSwirling: true,
            swirlSpeed: 0.2
        }
    },
    RED_GIANT: {
        name: 'Red Giant',
        description: 'Evolved red giant star',
        colors: ['#ff4422', '#ff6644', '#ff5533'], // Deep red variants
        sizeMultiplier: 1.6, // Much larger
        temperature: 'cool-surface-hot-core',
        discoveryValue: 3,
        rarity: 0.10, // 10% - evolved stars
        visualEffects: {
            hasCorona: true,
            hasPulsing: true, // Variable star
            hasRadiation: false,
            coronaSize: 1.5,
            coronaConfig: {
                layers: 4,
                intensity: 0.8,
                temperature: 0.8,
                asymmetry: 0.05,
                fluctuation: 0.15,
                colors: ['#ff4422', '#ff6644', '#ff8866', '#ffaa88']
            },
            pulseSpeed: 0.5, // Much slower, more tranquil
            hasSwirling: true,
            swirlSpeed: 0.15 // Slow, majestic swirls
        }
    },
    BLUE_GIANT: {
        name: 'Blue Giant',
        description: 'Massive blue giant star',
        colors: ['#88ddff', '#66ccff', '#aaeeff'], // Blue-white variants
        sizeMultiplier: 1.8, // Very large and massive
        temperature: 'very-hot',
        discoveryValue: 4,
        rarity: 0.05, // 5% - rare massive stars
        visualEffects: {
            hasCorona: true,
            hasPulsing: false,
            hasRadiation: true, // Strong stellar wind
            coronaSize: 1.8,
            coronaConfig: {
                layers: 4,
                intensity: 0.9,
                temperature: 2.0,
                asymmetry: 0.04,
                fluctuation: 0.12,
                colors: ['#88ddff', '#aaeeff', '#ccffff', '#ffffff']
            },
            radiationIntensity: 0.3,
            hasSwirling: true,
            swirlSpeed: 0.5 // Fast, energetic swirls
        }
    },
    WHITE_DWARF: {
        name: 'White Dwarf',
        description: 'Dense white dwarf remnant',
        colors: ['#ffffff', '#eeeeff', '#ddddff'], // White/blue-white
        sizeMultiplier: 0.4, // Very small but dense
        temperature: 'very-hot-surface',
        discoveryValue: 3,
        rarity: 0.04, // 4% - stellar remnants
        visualEffects: {
            hasCorona: true, // Intense but compact corona
            hasPulsing: false,
            hasRadiation: false,
            coronaSize: 0.8,
            coronaConfig: {
                layers: 2,
                intensity: 0.9,
                temperature: 2.0,
                asymmetry: 0.01,
                fluctuation: 0.08,
                colors: ['#ffffff', '#eeeeff', '#ddddff']
            },
            hasShimmer: true, // Hot surface effects
            hasSwirling: false, // Too small for visible swirls
            swirlSpeed: 0
        }
    },
    NEUTRON_STAR: {
        name: 'Neutron Star',
        description: 'Ultra-dense neutron star',
        colors: ['#ddddff', '#bbbbff', '#9999ff'], // Blue-white with purple tint
        sizeMultiplier: 0.2, // Extremely small but ultra-dense
        temperature: 'extreme',
        discoveryValue: 5,
        rarity: 0.01, // 1% - ultra-rare stellar remnants
        visualEffects: {
            hasCorona: true, // Minimal but extremely intense corona
            hasPulsing: true, // Pulsar effects
            hasRadiation: true, // Intense radiation
            coronaSize: 0.5,
            coronaConfig: {
                layers: 2,
                intensity: 1.0,
                temperature: 2.2,
                asymmetry: 0.01,
                fluctuation: 0.2,
                colors: ['#ddddff', '#bbbbff', '#9999ff']
            },
            pulseSpeed: 1.2, // Still faster than others but much more gentle
            radiationIntensity: 0.8,
            hasSwirling: false, // Too small and too extreme
            swirlSpeed: 0
        }
    }
};