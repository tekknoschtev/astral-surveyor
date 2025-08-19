// Star class - extracted from celestial.ts
// Manages star rendering, visual effects, and planetary systems

// Import dependencies
import { SeededRandom } from '../utils/random.js';
import { GameConfig } from '../config/gameConfig.js';
import { CelestialObject } from './CelestialTypes.js';
import { DiscoveryVisualizationService } from '../services/DiscoveryVisualizationService.js';
import type { 
    Renderer, 
    Camera, 
    StarType, 
    StarVisualEffects, 
    Sunspot, 
    CoronaConfig 
} from './CelestialTypes.js';

// Import Planet class now that it's extracted
import type { Planet } from './Planet.js';

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
    
    // Discovery timestamp for animation system
    discoveryTimestamp?: number;

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
        const config = GameConfig.celestial.stars.baseRadius;
        const baseRadius = config.min + Math.random() * (config.max - config.min);
        this.radius = baseRadius * this.starType.sizeMultiplier;
        this.discoveryDistance = this.radius + 400;
        this.brakingDistance = this.radius + GameConfig.celestial.stars.brakingDistance;
        
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
        this.brakingDistance = this.radius + GameConfig.celestial.stars.brakingDistance;
        
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
        const config = GameConfig.celestial.stars.sunspots;
        if (rand < config.lowActivityChance) {
            sunspotCount = 0;        // Solar minimum
        } else if (rand < config.lowActivityChance * 2) {
            sunspotCount = rng.nextInt(1, 2);  // Low activity
        } else if (rand < config.lowActivityChance * 2 + config.moderateActivityChance) {
            const range = config.moderateRange;
            sunspotCount = rng.nextInt(range.min, range.max);  // Moderate activity  
        } else {
            const range = config.countRange;
            sunspotCount = rng.nextInt(range.min, range.max);  // High activity
        }
        
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
            
            // Visual indicator if discovered using unified system
            if (this.discovered) {
                this.renderDiscoveryIndicator(renderer, screenX, screenY);
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
    
    private renderDiscoveryIndicator(renderer: Renderer, screenX: number, screenY: number): void {
        // Use unified discovery visualization system
        const visualizationService = new DiscoveryVisualizationService();
        const objectId = `star-${this.x}-${this.y}`;
        const currentTime = Date.now();
        
        const indicatorData = visualizationService.getDiscoveryIndicatorData(objectId, {
            x: screenX,
            y: screenY,
            baseRadius: this.radius + 8,
            rarity: visualizationService.getObjectRarity('star'),
            objectType: 'star',
            discoveryTimestamp: this.discoveryTimestamp || currentTime,
            currentTime: currentTime
        });

        // Render base discovery indicator
        renderer.drawDiscoveryIndicator(
            screenX, 
            screenY, 
            this.radius + 8,
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

// Star types definition
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