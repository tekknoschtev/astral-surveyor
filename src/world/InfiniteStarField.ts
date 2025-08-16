// Infinite starfield using chunk-based generation with parallax layers
// Extracted from world.ts for better modularity

// Import dependencies
import { SeededRandom, hashPosition } from '../utils/random.js';
import { GameConfig } from '../config/gameConfig.js';
import type { Renderer } from '../graphics/renderer.js';
import type { Camera } from '../camera/camera.js';
import type { ChunkManager, BackgroundStar } from './ChunkManager.js';

// Interface definitions for InfiniteStarField
interface ParallaxLayer {
    stars: Map<string, BackgroundStar[]>;
    depth: number;
    density: number;
    brightnesRange: [number, number];
    sizeRange: [number, number];
    colors: string[];
}

// Infinite starfield using chunk-based generation with parallax layers
export class InfiniteStarField {
    chunkManager: ChunkManager;
    parallaxLayers: ParallaxLayer[];
    lastCameraX: number = 0;
    lastCameraY: number = 0;

    constructor(chunkManager: ChunkManager) {
        this.chunkManager = chunkManager;
        
        // Create multiple parallax layers for depth effect
        this.parallaxLayers = [
            {
                stars: new Map(),
                depth: 0.1,
                density: 4, // Reduced from 8
                brightnesRange: [0.1, 0.3],
                sizeRange: [1, 1],
                colors: ['#ffffff', '#ffffcc', '#ccccff']
            },
            {
                stars: new Map(),
                depth: 0.3,
                density: 6, // Reduced from 12
                brightnesRange: [0.2, 0.5],
                sizeRange: [1, 2],
                colors: ['#ffffff', '#ffddaa', '#aaddff']
            },
            {
                stars: new Map(),
                depth: 0.6,
                density: 3, // Reduced from 6
                brightnesRange: [0.4, 0.8],
                sizeRange: [1, 2],
                colors: ['#ffffff', '#ffaa88', '#88aaff', '#ffddaa']
            }
        ];
    }

    update(playerX: number, playerY: number): void {
        this.chunkManager.updateActiveChunks(playerX, playerY);
        
        // Clear distant parallax regions to save memory
        this.cleanupDistantRegions(playerX, playerY);
    }

    cleanupDistantRegions(playerX: number, playerY: number): void {
        const maxDistance = GameConfig.visual.parallax.regionSize * 10; // Keep 10 regions around player
        
        for (const layer of this.parallaxLayers) {
            for (const [regionKey] of layer.stars) {
                const [regionX, regionY] = regionKey.split(',').map(Number);
                const distance = Math.sqrt(
                    Math.pow(regionX - playerX, 2) + Math.pow(regionY - playerY, 2)
                );
                
                if (distance > maxDistance) {
                    layer.stars.delete(regionKey);
                }
            }
        }
    }

    // Generate parallax stars for a given screen region
    generateParallaxStars(layer: ParallaxLayer, regionX: number, regionY: number, regionSize: number): BackgroundStar[] {
        const regionKey = `${regionX},${regionY}`;
        
        if (layer.stars.has(regionKey)) {
            return layer.stars.get(regionKey)!;
        }
        
        // Use seeded random based on region position and layer depth
        const seed = hashPosition(regionX, regionY) ^ Math.floor(layer.depth * 1000000);
        const rng = new SeededRandom(seed);
        
        const stars: BackgroundStar[] = [];
        const starCount = Math.floor(regionSize * regionSize * layer.density / 100000); // Density per 100k pixels
        
        for (let i = 0; i < starCount; i++) {
            stars.push({
                x: regionX + rng.nextFloat(0, regionSize),
                y: regionY + rng.nextFloat(0, regionSize),
                brightness: rng.nextFloat(layer.brightnesRange[0], layer.brightnesRange[1]),
                size: rng.nextInt(layer.sizeRange[0], layer.sizeRange[1]),
                color: rng.choice(layer.colors)
            });
        }
        
        layer.stars.set(regionKey, stars);
        return stars;
    }

    render(renderer: Renderer, camera: Camera): void {
        const { canvas } = renderer;
        
        // Render parallax background layers first (back to front)
        this.renderParallaxLayers(renderer, camera);
        
        // Then render the original chunk-based stars (these are "foreground" stars)
        this.renderChunkStars(renderer, camera);
        
        // Render debug chunk boundaries if enabled
        if (GameConfig.debug.enabled && GameConfig.debug.chunkBoundaries.enabled) {
            this.renderChunkBoundaries(renderer, camera);
        }
        
        // Update camera tracking
        this.lastCameraX = camera.x;
        this.lastCameraY = camera.y;
    }
    
    renderParallaxLayers(renderer: Renderer, camera: Camera): void {
        const { canvas } = renderer;
        const regionSize = GameConfig.visual.parallax.regionSize;
        
        // Calculate which regions we need to cover the screen for each parallax layer
        for (const layer of this.parallaxLayers) {
            // Calculate effective camera position for this depth layer
            const effectiveCameraX = camera.x * layer.depth;
            const effectiveCameraY = camera.y * layer.depth;
            
            // Determine region bounds to cover screen
            const leftRegion = Math.floor((effectiveCameraX - canvas.width * 0.5) / regionSize) * regionSize;
            const rightRegion = Math.floor((effectiveCameraX + canvas.width * 0.5) / regionSize) * regionSize;
            const topRegion = Math.floor((effectiveCameraY - canvas.height * 0.5) / regionSize) * regionSize;
            const bottomRegion = Math.floor((effectiveCameraY + canvas.height * 0.5) / regionSize) * regionSize;
            
            // Generate and render stars for each needed region
            for (let regionX = leftRegion; regionX <= rightRegion; regionX += regionSize) {
                for (let regionY = topRegion; regionY <= bottomRegion; regionY += regionSize) {
                    const stars = this.generateParallaxStars(layer, regionX, regionY, regionSize);
                    
                    for (const star of stars) {
                        // Convert star world position to screen position using effective camera
                        const screenX = canvas.width * 0.5 + (star.x - effectiveCameraX);
                        const screenY = canvas.height * 0.5 + (star.y - effectiveCameraY);
                        
                        // Only render stars that are on screen (with margin)
                        if (screenX >= -10 && screenX <= canvas.width + 10 && 
                            screenY >= -10 && screenY <= canvas.height + 10) {
                            
                            // Calculate alpha based on brightness
                            const alpha = Math.floor(star.brightness * 255).toString(16).padStart(2, '0');
                            const colorWithAlpha = star.color + alpha;
                            
                            if (star.size > 1) {
                                renderer.drawCircle(screenX, screenY, star.size, colorWithAlpha);
                            } else {
                                renderer.drawPixel(screenX, screenY, colorWithAlpha);
                            }
                        }
                    }
                }
            }
        }
    }
    
    renderChunkStars(renderer: Renderer, camera: Camera): void {
        const { canvas } = renderer;
        const activeObjects = this.chunkManager.getAllActiveObjects();
        
        for (const star of activeObjects.stars) {
            const [screenX, screenY] = camera.worldToScreen(
                star.x, 
                star.y, 
                canvas.width, 
                canvas.height
            );
            
            // Only render stars that are on screen
            if (screenX >= -10 && screenX <= canvas.width + 10 && 
                screenY >= -10 && screenY <= canvas.height + 10) {
                
                // Calculate alpha based on brightness
                const alpha = Math.floor(star.brightness * 255).toString(16).padStart(2, '0');
                const colorWithAlpha = star.color + alpha;
                
                if (star.size > 1) {
                    renderer.drawCircle(screenX, screenY, star.size, colorWithAlpha);
                } else {
                    renderer.drawPixel(screenX, screenY, colorWithAlpha);
                }
            }
        }
    }
    
    renderChunkBoundaries(renderer: Renderer, camera: Camera): void {
        const { canvas } = renderer;
        const chunkSize = this.chunkManager.chunkSize;
        
        // Determine which chunk lines we need to draw
        const leftChunk = Math.floor((camera.x - canvas.width * 0.5) / chunkSize);
        const rightChunk = Math.floor((camera.x + canvas.width * 0.5) / chunkSize) + 1;
        const topChunk = Math.floor((camera.y - canvas.height * 0.5) / chunkSize);
        const bottomChunk = Math.floor((camera.y + canvas.height * 0.5) / chunkSize) + 1;
        
        renderer.ctx.save();
        renderer.ctx.strokeStyle = GameConfig.debug.chunkBoundaries.color;
        renderer.ctx.lineWidth = GameConfig.debug.chunkBoundaries.lineWidth;
        renderer.ctx.globalAlpha = GameConfig.debug.chunkBoundaries.opacity;
        
        // Draw vertical lines
        for (let chunkX = leftChunk; chunkX <= rightChunk; chunkX++) {
            const worldX = chunkX * chunkSize;
            const [screenX] = camera.worldToScreen(worldX, 0, canvas.width, canvas.height);
            
            renderer.ctx.beginPath();
            renderer.ctx.moveTo(screenX, 0);
            renderer.ctx.lineTo(screenX, canvas.height);
            renderer.ctx.stroke();
        }
        
        // Draw horizontal lines
        for (let chunkY = topChunk; chunkY <= bottomChunk; chunkY++) {
            const worldY = chunkY * chunkSize;
            const [, screenY] = camera.worldToScreen(0, worldY, canvas.width, canvas.height);
            
            renderer.ctx.beginPath();
            renderer.ctx.moveTo(0, screenY);
            renderer.ctx.lineTo(canvas.width, screenY);
            renderer.ctx.stroke();
        }
        
        renderer.ctx.restore();
    }
}

// Export the ParallaxLayer interface for potential external use
export type { ParallaxLayer };