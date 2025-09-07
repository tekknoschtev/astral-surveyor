// Phase 1: Full RoguePlanet class with visual rendering system
// Supports three variants: ice, rock, and volcanic with distinct visual effects

import { CelestialObject } from './CelestialTypes.js';
import { DiscoveryVisualizationService } from '../services/DiscoveryVisualizationService.js';
import { SeededRandom, hashPosition } from '../utils/random.js';
import type { Renderer, Camera } from './CelestialTypes.js';

interface RoguePlanetVisualEffects {
    hasGlow?: boolean;
    hasCraters?: boolean;
    hasIceSheets?: boolean;
    hasLavaFlow?: boolean;
    hasCrystalline?: boolean;
    hasShimmer?: boolean;
}

export class RoguePlanet extends CelestialObject {
    variant: 'ice' | 'rock' | 'volcanic';
    radius: number;
    color: string;
    visualEffects: RoguePlanetVisualEffects;
    discoveryTimestamp?: number;
    
    // Pre-calculated visual features (deterministic based on position)
    craterPositions: Array<{x: number, y: number, size: number}> = [];
    iceSheetPositions: Array<{x: number, y: number, size: number, angle: number}> = [];

    constructor(x: number, y: number, variant: 'ice' | 'rock' | 'volcanic' = 'ice') {
        super(x, y, 'rogue-planet');
        this.variant = variant;
        this.initializeProperties();
    }

    private initializeProperties(): void {
        // Set properties based on variant
        switch (this.variant) {
            case 'ice':
                this.radius = 12;
                this.color = '#B0E0E6'; // Light steel blue
                this.visualEffects = {
                    hasGlow: true,
                    hasCrystalline: true,
                    hasIceSheets: true
                };
                this.discoveryDistance = 65;
                break;
            case 'rock':
                this.radius = 14;
                this.color = '#696969'; // Dim gray
                this.visualEffects = {
                    hasCraters: true
                };
                this.discoveryDistance = 60;
                break;
            case 'volcanic':
                this.radius = 13;
                this.color = '#8B0000'; // Dark red
                this.visualEffects = {
                    hasGlow: true,
                    hasLavaFlow: true,
                    hasShimmer: true
                };
                this.discoveryDistance = 70;
                break;
        }

        // Initialize visual features
        this.initializeVisualFeatures();
    }

    private initializeVisualFeatures(): void {
        // Use planet's world position to create deterministic patterns
        const baseSeed = hashPosition(this.x, this.y);
        
        // Initialize craters for rocky rogue planets
        if (this.visualEffects.hasCraters) {
            const craterRng = new SeededRandom(baseSeed + 1000);
            const craterCount = 2 + Math.floor(craterRng.next() * 4); // 2-5 craters
            
            for (let i = 0; i < craterCount; i++) {
                const angle = (i / craterCount) * Math.PI * 2 + craterRng.next() * 0.5;
                const distance = craterRng.next() * this.radius * 0.7;
                const craterX = Math.cos(angle) * distance;
                const craterY = Math.sin(angle) * distance;
                const craterSize = 1.5 + craterRng.next() * 2.5;
                
                this.craterPositions.push({
                    x: craterX,
                    y: craterY,
                    size: craterSize
                });
            }
        }

        // Initialize ice sheets for ice rogue planets
        if (this.visualEffects.hasIceSheets) {
            const iceRng = new SeededRandom(baseSeed + 2000);
            const iceSheetCount = 3 + Math.floor(iceRng.next() * 3); // 3-5 ice sheets
            
            for (let i = 0; i < iceSheetCount; i++) {
                const angle = (i / iceSheetCount) * Math.PI * 2 + iceRng.next() * 1.0;
                const distance = iceRng.next() * this.radius * 0.6;
                const iceX = Math.cos(angle) * distance;
                const iceY = Math.sin(angle) * distance;
                const iceSize = 2 + iceRng.next() * 4;
                const iceAngle = iceRng.next() * Math.PI * 2;
                
                this.iceSheetPositions.push({
                    x: iceX,
                    y: iceY,
                    size: iceSize,
                    angle: iceAngle
                });
            }
        }
    }

    render(renderer: Renderer, camera: Camera): void {
        const [screenX, screenY] = camera.worldToScreen(this.x, this.y, renderer.canvas.width, renderer.canvas.height);
        
        // Only render if on screen
        if (screenX >= -50 && screenX <= renderer.canvas.width + 50 && 
            screenY >= -50 && screenY <= renderer.canvas.height + 50) {
            
            // Draw glow effect if the rogue planet has one
            if (this.visualEffects.hasGlow) {
                this.drawGlow(renderer, screenX, screenY);
            }
            
            // Draw the main rogue planet body
            renderer.drawCircle(screenX, screenY, this.radius, this.color);
            
            // Draw visual effects on top of the planet
            this.drawVisualEffects(renderer, screenX, screenY);
            
            // Visual indicator if discovered
            if (this.discovered) {
                this.renderDiscoveryIndicator(renderer, screenX, screenY);
            }
        }
    }

    private drawGlow(renderer: Renderer, screenX: number, screenY: number): void {
        const ctx = renderer.ctx;
        let glowColor: string;
        
        // Determine glow color based on variant
        switch (this.variant) {
            case 'ice':
                glowColor = '#E0FFFF'; // Light cyan
                break;
            case 'volcanic':
                glowColor = '#FF4500'; // Orange-red
                break;
            default:
                return; // No glow for rock variant
        }
        
        // Create radial gradient for glow effect
        const gradient = ctx.createRadialGradient(
            screenX, screenY, this.radius,
            screenX, screenY, this.radius * 1.6
        );
        
        gradient.addColorStop(0, glowColor + '40'); // 40 = ~25% opacity
        gradient.addColorStop(1, glowColor + '00'); // Fully transparent
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.radius * 1.6, 0, Math.PI * 2);
        ctx.fill();
    }

    private drawVisualEffects(renderer: Renderer, screenX: number, screenY: number): void {
        const ctx = renderer.ctx;
        
        // Draw craters for rocky variants
        if (this.visualEffects.hasCraters) {
            this.drawCraters(ctx, screenX, screenY);
        }
        
        // Draw ice sheets for ice variants
        if (this.visualEffects.hasIceSheets) {
            this.drawIceSheets(ctx, screenX, screenY);
        }
        
        // Draw lava flows for volcanic variants
        if (this.visualEffects.hasLavaFlow) {
            this.drawLavaFlows(ctx, screenX, screenY);
        }
        
        // Draw crystalline patterns for ice variants
        if (this.visualEffects.hasCrystalline) {
            this.drawCrystallinePatterns(ctx, screenX, screenY);
        }
        
        // Draw shimmer effect for volcanic variants
        if (this.visualEffects.hasShimmer) {
            this.drawShimmerEffect(ctx, screenX, screenY);
        }
    }

    private drawCraters(ctx: CanvasRenderingContext2D, centerX: number, centerY: number): void {
        const craterColor = this.darkenColor(this.color, 0.4);
        ctx.fillStyle = craterColor;
        
        for (const crater of this.craterPositions) {
            const craterX = centerX + crater.x;
            const craterY = centerY + crater.y;
            
            ctx.beginPath();
            ctx.arc(craterX, craterY, crater.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    private drawIceSheets(ctx: CanvasRenderingContext2D, centerX: number, centerY: number): void {
        const iceColor = this.lightenColor(this.color, 0.3);
        ctx.fillStyle = iceColor;
        
        for (const ice of this.iceSheetPositions) {
            const iceX = centerX + ice.x;
            const iceY = centerY + ice.y;
            
            ctx.save();
            ctx.translate(iceX, iceY);
            ctx.rotate(ice.angle);
            
            // Draw elongated ice sheet
            ctx.beginPath();
            ctx.ellipse(0, 0, ice.size, ice.size * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
    }

    private drawLavaFlows(ctx: CanvasRenderingContext2D, centerX: number, centerY: number): void {
        const lavaColor = '#FF6347'; // Bright tomato red
        ctx.strokeStyle = lavaColor;
        ctx.lineWidth = 2;
        
        // Use deterministic positioning based on planet position
        const positionSeed = hashPosition(this.x, this.y);
        const rng = new SeededRandom(positionSeed + 3000);
        
        // Draw flowing lava streams
        for (let i = 0; i < 3; i++) {
            const startAngle = (i / 3) * Math.PI * 2;
            const startX = centerX + Math.cos(startAngle) * this.radius * 0.4;
            const startY = centerY + Math.sin(startAngle) * this.radius * 0.4;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            
            let currentX = startX;
            let currentY = startY;
            
            for (let j = 0; j < 4; j++) {
                currentX += (rng.next() - 0.5) * 6;
                currentY += (rng.next() - 0.5) * 6;
                
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

    private drawCrystallinePatterns(ctx: CanvasRenderingContext2D, centerX: number, centerY: number): void {
        const crystalColor = this.lightenColor(this.color, 0.4);
        ctx.strokeStyle = crystalColor;
        ctx.lineWidth = 1;
        
        // Use deterministic positioning
        const positionSeed = hashPosition(this.x, this.y);
        const rng = new SeededRandom(positionSeed + 4000);
        
        // Draw crystalline formations
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const distance = rng.next() * this.radius * 0.6;
            const crystalX = centerX + Math.cos(angle) * distance;
            const crystalY = centerY + Math.sin(angle) * distance;
            
            // Draw a crystal shape (star-like pattern)
            const crystalSize = 2 + rng.next() * 2;
            ctx.beginPath();
            for (let j = 0; j < 6; j++) {
                const starAngle = (j / 6) * Math.PI * 2;
                const pointX = crystalX + Math.cos(starAngle) * crystalSize;
                const pointY = crystalY + Math.sin(starAngle) * crystalSize;
                
                if (j === 0) {
                    ctx.moveTo(crystalX, crystalY);
                    ctx.lineTo(pointX, pointY);
                } else {
                    ctx.moveTo(crystalX, crystalY);
                    ctx.lineTo(pointX, pointY);
                }
            }
            ctx.stroke();
        }
    }

    private drawShimmerEffect(ctx: CanvasRenderingContext2D, centerX: number, centerY: number): void {
        const time = Date.now() * 0.001;
        const shimmerAlpha = Math.sin(time * 3) * 0.3 + 0.6; // Oscillate for volcanic activity
        
        // Create shimmer rings
        for (let i = 0; i < 2; i++) {
            const ringRadius = this.radius + i * 4;
            const ringAlpha = shimmerAlpha * (1 - i * 0.3);
            const alphaHex = Math.floor(ringAlpha * 255).toString(16).padStart(2, '0');
            
            ctx.strokeStyle = '#FF4500' + alphaHex; // Orange shimmer
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // Helper methods for color manipulation
    private lightenColor(hex: string, amount: number): string {
        const colorNum = parseInt(hex.replace('#', ''), 16);
        const r = (colorNum >> 16) & 255;
        const g = (colorNum >> 8) & 255;
        const b = colorNum & 255;
        
        const newR = Math.min(255, Math.floor(r + (255 - r) * amount));
        const newG = Math.min(255, Math.floor(g + (255 - g) * amount));
        const newB = Math.min(255, Math.floor(b + (255 - b) * amount));
        
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }
    
    private darkenColor(hex: string, amount: number): string {
        const colorNum = parseInt(hex.replace('#', ''), 16);
        const r = (colorNum >> 16) & 255;
        const g = (colorNum >> 8) & 255;
        const b = colorNum & 255;
        
        const newR = Math.max(0, Math.floor(r * (1 - amount)));
        const newG = Math.max(0, Math.floor(g * (1 - amount)));
        const newB = Math.max(0, Math.floor(b * (1 - amount)));
        
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }
    
    private renderDiscoveryIndicator(renderer: Renderer, screenX: number, screenY: number): void {
        // Use unified discovery visualization system
        const visualizationService = new DiscoveryVisualizationService();
        const objectId = `rogue-planet-${this.x}-${this.y}`;
        const currentTime = Date.now();
        
        const indicatorData = visualizationService.getDiscoveryIndicatorData(objectId, {
            x: screenX,
            y: screenY,
            baseRadius: this.radius + 8,
            rarity: visualizationService.getObjectRarity('rogue-planet'),
            objectType: 'rogue-planet',
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

// Phase 2: DarkNebula class with star occlusion rendering system
// Supports three variants: dense-core, wispy, and globular with unique visual effects

interface DarkNebulaVisualEffects {
    occludesStars?: boolean;
    hasWispyEdges?: boolean;
    hasStaticEffect?: boolean;
    hasIrregularShape?: boolean;
    hasBrownTones?: boolean;
}

export class DarkNebula extends CelestialObject {
    variant: 'dense-core' | 'wispy' | 'globular';
    radius: number;
    color: string;
    occlusionStrength: number; // 0.0 to 1.0, affects star dimming
    shape: 'circular' | 'irregular';
    visualEffects: DarkNebulaVisualEffects;
    discoveryTimestamp?: number;
    
    // Pre-calculated irregular shape vertices (deterministic based on position)
    shapeVertices: Array<{angle: number, radius: number}> = [];

    constructor(x: number, y: number, variant: 'dense-core' | 'wispy' | 'globular' = 'wispy') {
        super(x, y, 'dark-nebula');
        this.variant = variant;
        this.initializeProperties();
        this.initializeVisualFeatures();
    }

    private initializeProperties(): void {
        // Set properties based on variant
        switch (this.variant) {
            case 'dense-core':
                this.radius = 180; // Large, irregular areas
                this.color = '#2F1B14'; // Dark brown
                this.occlusionStrength = 1.0; // Complete star occlusion
                this.shape = 'irregular';
                this.visualEffects = {
                    occludesStars: true,
                    hasIrregularShape: true,
                    hasBrownTones: true
                };
                this.discoveryDistance = 80;
                this.discoveryValue = 35; // As per Phase 2 design document
                break;
            case 'wispy':
                this.radius = 220; // Larger but more diffuse
                this.color = '#3D2B1F'; // Lighter brown
                this.occlusionStrength = 0.6; // Partial star dimming
                this.shape = 'irregular';
                this.visualEffects = {
                    occludesStars: true,
                    hasWispyEdges: true,
                    hasIrregularShape: true,
                    hasBrownTones: true
                };
                this.discoveryDistance = 80;
                this.discoveryValue = 35; // As per Phase 2 design document
                break;
            case 'globular':
                this.radius = 160; // Medium, nearly perfect circle
                this.color = '#4A3420'; // Medium brown
                this.occlusionStrength = 0.8; // Strong star dimming
                this.shape = 'circular';
                this.visualEffects = {
                    occludesStars: true,
                    hasBrownTones: true
                };
                this.discoveryDistance = 80;
                this.discoveryValue = 35; // As per Phase 2 design document
                break;
        }
    }

    private initializeVisualFeatures(): void {
        // Generate deterministic irregular shape vertices if needed
        if (this.shape === 'irregular') {
            const positionSeed = hashPosition(this.x, this.y);
            const rng = new SeededRandom(positionSeed + 4000);
            
            const vertexCount = 16 + Math.floor(rng.next() * 8); // 16-24 vertices
            for (let i = 0; i < vertexCount; i++) {
                const angle = (i / vertexCount) * Math.PI * 2;
                const radiusVariation = 0.6 + rng.next() * 0.8; // 60%-140% of base radius
                this.shapeVertices.push({
                    angle: angle,
                    radius: this.radius * radiusVariation
                });
            }
        }
    }

    render(renderer: Renderer, camera: Camera): void {
        const ctx = renderer.ctx;
        const [screenX, screenY] = camera.worldToScreen(this.x, this.y, ctx.canvas.width, ctx.canvas.height);
        
        // Check if dark nebula is visible on screen (with larger margins due to size)
        const margin = this.radius + 100;
        if (screenX < -margin || screenX > ctx.canvas.width + margin || 
            screenY < -margin || screenY > ctx.canvas.height + margin) {
            return;
        }

        // Render star occlusion effect (dark void appearance)
        this.renderStarOcclusion(ctx, screenX, screenY);
        
        // Render subtle dust effects for wispy variants (much more subtle than before)
        if (this.variant === 'wispy') {
            this.renderSubtleDustEffects(ctx, screenX, screenY);
        }
        
        // Apply discovery indicator if applicable
        if (this.discovered) {
            this.renderDiscoveryIndicator(renderer, screenX, screenY);
        }
    }

    private renderStarOcclusion(ctx: CanvasRenderingContext2D, centerX: number, centerY: number): void {
        if (!this.visualEffects.occludesStars) return;
        
        ctx.save();
        
        // Use multiply blend mode to darken the background stars, creating the effect of dust blocking light
        ctx.globalCompositeOperation = 'multiply';
        
        if (this.shape === 'circular') {
            // Create circular darkness gradient
            const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, this.radius);
            
            // Dense core - very dark center fading to transparent edges
            const coreDarkness = 1.0 - this.occlusionStrength; // 0.0 = black, 1.0 = no effect
            gradient.addColorStop(0, `rgb(${Math.floor(coreDarkness * 255)}, ${Math.floor(coreDarkness * 255)}, ${Math.floor(coreDarkness * 255)})`);
            gradient.addColorStop(0.6, `rgb(${Math.floor((coreDarkness + 0.3) * 255)}, ${Math.floor((coreDarkness + 0.3) * 255)}, ${Math.floor((coreDarkness + 0.3) * 255)})`);
            gradient.addColorStop(1, 'rgb(255, 255, 255)'); // No darkening at edges
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, this.radius, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Create irregular darkness shape
            ctx.beginPath();
            for (let i = 0; i < this.shapeVertices.length; i++) {
                const vertex = this.shapeVertices[i];
                const x = centerX + Math.cos(vertex.angle) * vertex.radius;
                const y = centerY + Math.sin(vertex.angle) * vertex.radius;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            
            // Create gradient that follows the irregular shape
            const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, this.radius);
            
            const coreDarkness = 1.0 - this.occlusionStrength;
            gradient.addColorStop(0, `rgb(${Math.floor(coreDarkness * 255)}, ${Math.floor(coreDarkness * 255)}, ${Math.floor(coreDarkness * 255)})`);
            gradient.addColorStop(0.7, `rgb(${Math.floor((coreDarkness + 0.2) * 255)}, ${Math.floor((coreDarkness + 0.2) * 255)}, ${Math.floor((coreDarkness + 0.2) * 255)})`);
            gradient.addColorStop(1, 'rgb(255, 255, 255)');
            
            ctx.fillStyle = gradient;
            ctx.fill();
        }
        
        ctx.restore();
    }

    private renderSubtleDustEffects(ctx: CanvasRenderingContext2D, centerX: number, centerY: number): void {
        ctx.save();
        
        // Very subtle dust wisps only for the wispy variant
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.12; // Much more subtle than the original 0.4
        
        // Draw very faint wispy tendrils extending from the dark core
        const positionSeed = hashPosition(this.x, this.y);
        const rng = new SeededRandom(positionSeed + 5000);
        
        for (let i = 0; i < 6; i++) {
            const angle = rng.next() * Math.PI * 2;
            const length = this.radius * (0.2 + rng.next() * 0.3);
            const startX = centerX + Math.cos(angle) * this.radius * 0.7;
            const startY = centerY + Math.sin(angle) * this.radius * 0.7;
            const endX = startX + Math.cos(angle) * length;
            const endY = startY + Math.sin(angle) * length;
            
            const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
            gradient.addColorStop(0, '#4A3420'); // Very muted brown
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 3 + rng.next() * 2;
            ctx.lineCap = 'round';
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
        
        ctx.restore();
    }


    private renderDiscoveryIndicator(renderer: Renderer, screenX: number, screenY: number): void {
        // Use unified discovery visualization system
        const visualizationService = new DiscoveryVisualizationService();
        const objectId = `dark-nebula-${this.x}-${this.y}`;
        const currentTime = Date.now();
        
        const indicatorData = visualizationService.getDiscoveryIndicatorData(objectId, {
            x: screenX,
            y: screenY,
            baseRadius: this.radius + 8,
            rarity: visualizationService.getObjectRarity('dark-nebula'),
            objectType: 'dark-nebula',
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
    }

    // Utility method to lighten a color for gradients
    private lightenColor(color: string, factor: number): string {
        // Simple color lightening - converts hex to rgb and increases brightness
        const hex = color.replace('#', '');
        const r = Math.min(255, Math.floor(parseInt(hex.substr(0, 2), 16) * (1 + factor)));
        const g = Math.min(255, Math.floor(parseInt(hex.substr(2, 2), 16) * (1 + factor)));
        const b = Math.min(255, Math.floor(parseInt(hex.substr(4, 2), 16) * (1 + factor)));
        return `rgb(${r}, ${g}, ${b})`;
    }
}

