// Planet class - extracted from celestial.ts
// Manages planet rendering, orbital mechanics, and visual effects

// Import dependencies
import { SeededRandom, hashPosition } from '../utils/random.js';
import { GameConfig } from '../config/gameConfig.js';
import { CelestialObject } from './CelestialTypes.js';
import type { 
    Renderer, 
    Camera, 
    PlanetType, 
    PlanetVisualEffects 
} from './CelestialTypes.js';

// Import Star class now that it's extracted
import type { Star } from './Star.js';

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
    
    // Pre-calculated crater positions (to avoid recalculating each frame)
    craterPositions: Array<{x: number, y: number, size: number}> = [];

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
        const config = GameConfig.celestial.planets.baseRadius;
        const baseRadius = config.min + Math.random() * (config.max - config.min);
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
        
        // Pre-calculate crater positions if planet has craters
        if (this.visualEffects.hasCraters) {
            this.initializeCraterPositions();
        }
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

    // Pre-calculate crater positions based on planet position
    initializeCraterPositions(): void {
        // Use planet's world position to create deterministic crater pattern
        const craterSeed = hashPosition(this.x, this.y) + 12345; // Add offset for crater-specific variation
        const rng = new SeededRandom(craterSeed);
        
        // Clear any existing crater positions
        this.craterPositions = [];
        
        // Generate 2-4 small craters (deterministic count)
        const craterCount = 2 + Math.floor(rng.next() * 3);
        for (let i = 0; i < craterCount; i++) {
            const angle = (i / craterCount) * Math.PI * 2 + rng.next() * 0.5;
            const distance = rng.next() * this.radius * 0.6;
            const craterX = Math.cos(angle) * distance; // Relative to planet center
            const craterY = Math.sin(angle) * distance; // Relative to planet center
            const craterSize = 1 + rng.next() * 3;
            
            this.craterPositions.push({
                x: craterX,
                y: craterY,
                size: craterSize
            });
        }
    }

    // Determine if this planet should have rings based on type and probability
    determineRingSystem(rng?: SeededRandom): boolean {
        const ringChance = this.visualEffects.hasRings;
        
        if (typeof ringChance === 'boolean') {
            return ringChance;
        } else if (typeof ringChance === 'number') {
            const chance = rng ? rng.next() : Math.random();
            return chance < ringChance;
        }
        
        return false;
    }

    render(renderer: Renderer, camera: Camera): void {
        const [screenX, screenY] = camera.worldToScreen(this.x, this.y, renderer.canvas.width, renderer.canvas.height);
        
        // Only render if on screen
        if (screenX >= -50 && screenX <= renderer.canvas.width + 50 && 
            screenY >= -50 && screenY <= renderer.canvas.height + 50) {
            
            // Draw atmosphere if the planet has one
            if (this.visualEffects.hasAtmosphere && this.visualEffects.atmosphereConfig) {
                this.drawAtmosphere(renderer, screenX, screenY);
            }
            
            // Draw ring system behind the planet if it has rings
            if (this.hasRings) {
                this.drawRings(renderer, screenX, screenY, false); // Back portion
            }
            
            // Draw glow effect if the planet has one
            if (this.visualEffects.hasGlow && this.glowColor) {
                this.drawGlow(renderer, screenX, screenY);
            }
            
            // Draw the main planet
            this.drawPlanet(renderer, screenX, screenY);
            
            // Draw visual effects on top of the planet
            this.drawVisualEffects(renderer, screenX, screenY);
            
            // Draw ring system in front of the planet if it has rings
            if (this.hasRings) {
                this.drawRings(renderer, screenX, screenY, true); // Front portion
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

    drawPlanet(renderer: Renderer, screenX: number, screenY: number): void {
        renderer.drawCircle(screenX, screenY, this.radius, this.color);
    }

    drawVisualEffects(renderer: Renderer, screenX: number, screenY: number): void {
        const ctx = renderer.ctx;
        
        // Draw crater patterns
        if (this.visualEffects.hasCraters) {
            this.drawCraters(ctx, screenX, screenY);
        }
        
        // Draw stripe patterns
        if (this.visualEffects.hasStripes && this.stripeColor) {
            this.drawStripes(ctx, screenX, screenY);
        }
        
        // Draw swirl patterns for gas giants
        if (this.visualEffects.hasSwirls) {
            this.drawSwirls(ctx, screenX, screenY);
        }
        
        // Draw dune patterns for desert worlds
        if (this.visualEffects.hasDunePatterns) {
            this.drawDunePatterns(ctx, screenX, screenY);
        }
        
        // Draw crystalline patterns for frozen worlds
        if (this.visualEffects.hasCrystalline) {
            this.drawCrystallinePatterns(ctx, screenX, screenY);
        }
        
        // Draw lava flows for volcanic worlds
        if (this.visualEffects.hasLavaFlow) {
            this.drawLavaFlows(ctx, screenX, screenY);
        }
        
        // Draw shimmer effect for exotic worlds
        if (this.visualEffects.hasShimmer) {
            this.drawShimmerEffect(ctx, screenX, screenY);
        }
    }

    drawCraters(ctx: CanvasRenderingContext2D, centerX: number, centerY: number): void {
        // Use pre-calculated crater positions
        const craterColor = this.darkenColor(this.color, 0.5);
        ctx.fillStyle = craterColor;
        
        for (const crater of this.craterPositions) {
            // Convert relative crater position to screen position
            const craterX = centerX + crater.x;
            const craterY = centerY + crater.y;
            
            ctx.beginPath();
            ctx.arc(craterX, craterY, crater.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawStripes(ctx: CanvasRenderingContext2D, centerX: number, centerY: number): void {
        if (!this.stripeColor) return;
        
        ctx.strokeStyle = this.stripeColor;
        ctx.lineWidth = 2;
        
        // Draw horizontal stripes across the planet
        const stripeCount = this.planetType === PlanetTypes.GAS_GIANT ? 5 : 3;
        for (let i = 0; i < stripeCount; i++) {
            const y = centerY - this.radius + (i + 1) * (this.radius * 2 / (stripeCount + 1));
            const stripeRadius = Math.sqrt(this.radius * this.radius - Math.pow(y - centerY, 2));
            
            if (stripeRadius > 0) {
                const stripeHeight = this.planetType === PlanetTypes.GAS_GIANT ? 3 : 2;
                for (let j = 0; j < stripeHeight; j++) {
                    ctx.beginPath();
                    ctx.moveTo(centerX - stripeRadius, y + j - Math.floor(stripeHeight / 2));
                    ctx.lineTo(centerX + stripeRadius, y + j - Math.floor(stripeHeight / 2));
                    ctx.stroke();
                }
            }
        }
    }

    drawSwirls(ctx: CanvasRenderingContext2D, centerX: number, centerY: number): void {
        // Draw atmospheric swirl patterns for gas giants
        const time = Date.now() * 0.001;
        ctx.strokeStyle = this.lightenColor(this.color, 0.2);
        ctx.lineWidth = 1;
        
        // Draw multiple swirl patterns
        for (let i = 0; i < 3; i++) {
            const swirl = {
                x: centerX + (Math.random() - 0.5) * this.radius,
                y: centerY + (Math.random() - 0.5) * this.radius,
                radius: 3 + Math.random() * 5,
                rotation: time * (0.1 + i * 0.05)
            };
            
            this.drawSpiralPattern(ctx, swirl.x, swirl.y, swirl.radius, swirl.rotation);
        }
    }

    drawSpiralPattern(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, maxRadius: number, rotation: number): void {
        ctx.beginPath();
        
        const steps = 20;
        let firstPoint = true;
        
        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            const angle = progress * Math.PI * 4 + rotation; // 2 full rotations
            const radius = progress * maxRadius;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            if (firstPoint) {
                ctx.moveTo(x, y);
                firstPoint = false;
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
    }

    drawDunePatterns(ctx: CanvasRenderingContext2D, centerX: number, centerY: number): void {
        // Draw wavy dune patterns for desert worlds
        const duneColor = this.lightenColor(this.color, 0.15);
        ctx.strokeStyle = duneColor;
        ctx.lineWidth = 1;
        
        // Draw 3-4 curved dune lines
        for (let i = 0; i < 4; i++) {
            const y = centerY - this.radius * 0.6 + i * (this.radius * 1.2 / 3);
            const amplitude = 3;
            const frequency = 0.3;
            
            ctx.beginPath();
            let startX = centerX - this.radius * 0.8;
            let startY = y + Math.sin(startX * frequency) * amplitude;
            ctx.moveTo(startX, startY);
            
            for (let x = startX; x <= centerX + this.radius * 0.8; x += 2) {
                const waveY = y + Math.sin(x * frequency) * amplitude;
                ctx.lineTo(x, waveY);
            }
            
            ctx.stroke();
        }
    }

    drawCrystallinePatterns(ctx: CanvasRenderingContext2D, centerX: number, centerY: number): void {
        // Draw crystalline ice patterns for frozen worlds
        const crystalColor = this.lightenColor(this.color, 0.3);
        ctx.strokeStyle = crystalColor;
        ctx.lineWidth = 1;
        
        // Draw several crystalline formations
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const distance = Math.random() * this.radius * 0.5;
            const crystalX = centerX + Math.cos(angle) * distance;
            const crystalY = centerY + Math.sin(angle) * distance;
            
            // Draw a simple crystal shape (diamond)
            const crystalSize = 2 + Math.random() * 3;
            ctx.beginPath();
            ctx.moveTo(crystalX, crystalY - crystalSize);
            ctx.lineTo(crystalX + crystalSize, crystalY);
            ctx.lineTo(crystalX, crystalY + crystalSize);
            ctx.lineTo(crystalX - crystalSize, crystalY);
            ctx.closePath();
            ctx.stroke();
        }
    }

    drawLavaFlows(ctx: CanvasRenderingContext2D, centerX: number, centerY: number): void {
        // Draw lava flow patterns for volcanic worlds
        const lavaColor = this.lightenColor(this.color, 0.2);
        ctx.strokeStyle = lavaColor;
        ctx.lineWidth = 2;
        
        // Draw flowing lava streams
        for (let i = 0; i < 3; i++) {
            const startAngle = (i / 3) * Math.PI * 2;
            const startX = centerX + Math.cos(startAngle) * this.radius * 0.3;
            const startY = centerY + Math.sin(startAngle) * this.radius * 0.3;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            
            // Create a flowing path
            let currentX = startX;
            let currentY = startY;
            
            for (let j = 0; j < 5; j++) {
                currentX += (Math.random() - 0.5) * 8;
                currentY += (Math.random() - 0.5) * 8;
                
                // Keep within planet bounds
                const distFromCenter = Math.sqrt((currentX - centerX) ** 2 + (currentY - centerY) ** 2);
                if (distFromCenter > this.radius * 0.8) {
                    const direction = Math.atan2(currentY - centerY, currentX - centerX);
                    currentX = centerX + Math.cos(direction) * this.radius * 0.8;
                    currentY = centerY + Math.sin(direction) * this.radius * 0.8;
                }
                
                ctx.lineTo(currentX, currentY);
            }
            
            ctx.stroke();
        }
    }

    drawShimmerEffect(ctx: CanvasRenderingContext2D, centerX: number, centerY: number): void {
        // Draw shimmer effect for exotic worlds
        const time = Date.now() * 0.001;
        const shimmerAlpha = Math.sin(time * 2) * 0.3 + 0.7; // Oscillate between 0.4 and 1.0
        const alphaHex = Math.floor(shimmerAlpha * 255).toString(16).padStart(2, '0');
        
        // Create multiple shimmer rings
        for (let i = 0; i < 3; i++) {
            const ringRadius = this.radius + i * 3;
            const ringAlpha = shimmerAlpha * (1 - i * 0.2);
            const ringAlphaHex = Math.floor(ringAlpha * 255).toString(16).padStart(2, '0');
            
            ctx.strokeStyle = this.lightenColor(this.color, 0.4) + ringAlphaHex;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    drawGlow(renderer: Renderer, screenX: number, screenY: number): void {
        if (!this.glowColor) return;
        
        const ctx = renderer.ctx;
        
        // Create radial gradient for glow effect
        const gradient = ctx.createRadialGradient(
            screenX, screenY, this.radius,
            screenX, screenY, this.radius * 1.5
        );
        
        gradient.addColorStop(0, this.glowColor + '60'); // 60 = ~37% opacity in hex
        gradient.addColorStop(1, this.glowColor + '00'); // Fully transparent
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    drawAtmosphere(renderer: Renderer, screenX: number, screenY: number): void {
        const config = this.visualEffects.atmosphereConfig;
        if (!config) return;
        
        const ctx = renderer.ctx;
        const time = Date.now() * 0.001;
        
        // Draw atmospheric layers
        for (let layer = 0; layer < config.layers; layer++) {
            const layerProgress = layer / (config.layers - 1); // 0.0 to 1.0
            const layerRadius = this.radius + (config.thickness * layerProgress);
            const layerDensity = config.density * (1.0 - layerProgress * 0.7); // Fade outward
            
            // Create radial gradient for atmospheric layer
            const gradient = ctx.createRadialGradient(
                screenX, screenY, this.radius,
                screenX, screenY, layerRadius
            );
            
            const innerOpacity = Math.floor(layerDensity * 255).toString(16).padStart(2, '0');
            const outerOpacity = '00'; // Fully transparent
            
            gradient.addColorStop(0, config.color + innerOpacity);
            gradient.addColorStop(1, config.color + outerOpacity);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(screenX, screenY, layerRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw auroras if configured
        if (config.hasAuroras && config.auroraColors) {
            this.drawAuroras(ctx, screenX, screenY, config, time);
        }
        
        // Draw weather patterns if configured
        if (config.hasWeatherPatterns) {
            this.drawWeatherPatterns(ctx, screenX, screenY, config, time);
        }
    }

    drawAuroras(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, config: any, time: number): void {
        if (!config.auroraColors) return;
        
        // Draw aurora effects near the poles
        const auroraRadius = this.radius + config.thickness * 0.3;
        
        for (let pole = 0; pole < 2; pole++) {
            const poleY = pole === 0 ? centerY - auroraRadius * 0.8 : centerY + auroraRadius * 0.8;
            const auroraColor = config.auroraColors[Math.floor(time * 0.5) % config.auroraColors.length];
            
            // Create flickering aurora effect
            const intensity = Math.sin(time * 3 + pole * Math.PI) * 0.3 + 0.7;
            const alphaHex = Math.floor(intensity * 0.6 * 255).toString(16).padStart(2, '0');
            
            ctx.strokeStyle = auroraColor + alphaHex;
            ctx.lineWidth = 2;
            
            // Draw wavy aurora lines
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                const startX = centerX - this.radius * 0.6 + i * this.radius * 0.6;
                const startY = poleY + Math.sin(time + i) * 3;
                ctx.moveTo(startX, startY);
                
                for (let x = startX; x <= startX + this.radius * 0.4; x += 3) {
                    const waveY = startY + Math.sin((x - startX) * 0.1 + time * 2) * 2;
                    ctx.lineTo(x, waveY);
                }
                
                ctx.stroke();
            }
        }
    }

    drawWeatherPatterns(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, config: any, time: number): void {
        const weatherSpeed = config.weatherSpeed || 1.0;
        const movingTime = time * weatherSpeed;
        
        // Draw moving cloud-like patterns
        ctx.strokeStyle = this.lightenColor(config.color, 0.3) + '40'; // Light, semi-transparent
        ctx.lineWidth = 1;
        
        for (let i = 0; i < 4; i++) {
            const y = centerY - this.radius * 0.6 + i * (this.radius * 1.2 / 3);
            const offset = Math.sin(movingTime + i) * this.radius * 0.2;
            
            ctx.beginPath();
            let startX = centerX - this.radius * 0.8 + offset;
            ctx.moveTo(startX, y);
            
            for (let x = startX; x <= startX + this.radius * 1.6; x += 4) {
                const waveY = y + Math.sin((x - startX) * 0.2 + movingTime) * 2;
                ctx.lineTo(x, waveY);
            }
            
            ctx.stroke();
        }
    }

    drawRings(renderer: Renderer, screenX: number, screenY: number, frontPortion: boolean): void {
        if (!this.hasRings) return;
        
        const ctx = renderer.ctx;
        const ringConfig = this.visualEffects.ringConfig;
        
        // Use default ring configuration if none specified
        const innerRadius = this.radius * (ringConfig?.innerRadius || 1.4);
        const outerRadius = this.radius * (ringConfig?.outerRadius || 2.0);
        const colors = ringConfig?.colors || [this.darkenColor(this.color, 0.3)];
        const opacity = ringConfig?.opacity || 0.6;
        const bandCount = ringConfig?.bandCount || 2;
        
        // Calculate which portion of the rings to draw
        const startAngle = frontPortion ? 0 : Math.PI;
        const endAngle = frontPortion ? Math.PI : Math.PI * 2;
        
        // Draw multiple ring bands
        for (let band = 0; band < bandCount; band++) {
            const bandProgress = band / bandCount;
            const bandInnerRadius = innerRadius + (outerRadius - innerRadius) * bandProgress;
            const bandOuterRadius = innerRadius + (outerRadius - innerRadius) * (bandProgress + 1 / bandCount);
            const bandColor = colors[band % colors.length];
            
            // Add shimmer effect if configured
            let finalOpacity = opacity;
            if (ringConfig?.hasShimmer) {
                const time = Date.now() * 0.001;
                const shimmer = Math.sin(time * 2 + band) * 0.2 + 0.8;
                finalOpacity *= shimmer;
            }
            
            const alphaHex = Math.floor(finalOpacity * 255).toString(16).padStart(2, '0');
            
            // Create gradient for ring band
            const gradient = ctx.createRadialGradient(
                screenX, screenY, bandInnerRadius,
                screenX, screenY, bandOuterRadius
            );
            
            gradient.addColorStop(0, bandColor + '00'); // Transparent inner edge
            gradient.addColorStop(0.3, bandColor + alphaHex); // Solid middle
            gradient.addColorStop(0.7, bandColor + alphaHex); // Solid middle
            gradient.addColorStop(1, bandColor + '00'); // Transparent outer edge
            
            // Draw ring arc
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(screenX, screenY, bandOuterRadius, startAngle, endAngle);
            ctx.arc(screenX, screenY, bandInnerRadius, endAngle, startAngle, true);
            ctx.closePath();
            ctx.fill();
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

// Planet types definition
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
            hasStripes: false,
            hasRings: GameConfig.celestial.planets.rings.rockyChance
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
            hasRings: GameConfig.celestial.planets.rings.oceanChance,
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
            hasRings: GameConfig.celestial.planets.rings.gasGiantChance,
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
            hasDunePatterns: true,
            hasRings: GameConfig.celestial.planets.rings.desertChance
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
            hasRings: GameConfig.celestial.planets.rings.frozenChance,
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
            hasLavaFlow: true,
            hasRings: GameConfig.celestial.planets.rings.volcanicChance
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
            hasRings: GameConfig.celestial.planets.rings.exoticChance,
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