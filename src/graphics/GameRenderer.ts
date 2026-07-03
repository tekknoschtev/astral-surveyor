// GameRenderer - draws the game world and UI overlays each frame
// Extracted from game.ts with the render logic moved verbatim. Reads game
// state through accessor mirrors so the original method bodies are unchanged.

import { GameConfig } from '../config/gameConfig.js';
import type { Game, CelestialObject } from '../game.js';

export class GameRenderer {
    private game: Game;

    constructor(game: Game) {
        this.game = game;
    }

    // Accessor mirrors over the game's component graph
    private get renderer() { return this.game.renderer; }
    private get camera() { return this.game.camera; }
    private get stateManager() { return this.game.stateManager; }
    private get starField() { return this.game.starField; }
    private get chunkManager() { return this.game.chunkManager; }
    private get cachedActiveObjects() { return this.game.cachedActiveObjects; }
    private get starParticles() { return this.game.starParticles; }
    private get thrusterParticles() { return this.game.thrusterParticles; }
    private get ship() { return this.game.ship; }
    private get discoveryDisplay() { return this.game.discoveryDisplay; }
    private get localMinimap() { return this.game.localMinimap; }
    private get discoveryLogbook() { return this.game.discoveryLogbook; }
    private get stellarMap() { return this.game.stellarMap; }
    private get touchUI() { return this.game.touchUI; }
    private get settingsMenu() { return this.game.settingsMenu; }
    private get confirmationDialog() { return this.game.confirmationDialog; }
    private get developerConsole() { return this.game.developerConsole; }
    private get gameStartingPosition() { return this.game.gameStartingPosition; }

    private getDiscoveredObjects() {
        return this.game.getDiscoveredObjects();
    }

    render(): void {
        this.renderer.clear();
        
        // Calculate fade alpha for traversal and universe reset effects
        const fadeAlpha = this.stateManager.calculateFadeAlpha();
        const isCosmicTransition = this.stateManager.isResettingUniverse;
        
        this.starField.render(this.renderer, this.camera);
        
        // Use cached active objects from update phase for performance
        const activeObjects = this.cachedActiveObjects || this.chunkManager.getAllActiveObjects();
        
        // Performance optimization: Calculate screen bounds for render culling
        const screenBounds = this.calculateScreenBounds();
        
        // Render nebulae first (background layer) - with culling disabled for now
        for (const obj of activeObjects.nebulae) {
            // if (this.isObjectInScreen(obj, screenBounds)) {
                obj.render(this.renderer, this.camera);
            // }
        }
        
        // Render dark nebulae (star-occluding layer - must render after starfield but before other objects) - culling disabled
        for (const obj of activeObjects.darkNebulae) {
            // if (this.isObjectInScreen(obj, screenBounds)) {
                obj.render(this.renderer, this.camera);
            // }
        }
        
        // Render crystal gardens (background sparkle layer) - culling disabled
        for (const obj of activeObjects.crystalGardens) {
            // if (this.isObjectInScreen(obj, screenBounds)) {
                obj.render(this.renderer, this.camera);
            // }
        }
        
        // Then render asteroid gardens (mid-background layer) - culling disabled
        for (const obj of activeObjects.asteroidGardens) {
            // if (this.isObjectInScreen(obj, screenBounds)) {
                obj.render(this.renderer, this.camera);
            // }
        }
        
        // Render comets (intermediate layer - after background, before stars) - culling disabled
        for (const obj of activeObjects.comets) {
            // if (this.isObjectInScreen(obj, screenBounds)) {
                obj.render(this.renderer, this.camera);
            // }
        }
        
        // Then render stars, planets, and moons (foreground layers) - culling disabled
        for (const obj of activeObjects.planets) {
            // if (this.isObjectInScreen(obj, screenBounds)) {
                obj.render(this.renderer, this.camera);
            // }
        }
        
        // Render rogue planets (wandering worlds - same layer as planets) - culling disabled
        for (const obj of activeObjects.roguePlanets) {
            // if (this.isObjectInScreen(obj, screenBounds)) {
                obj.render(this.renderer, this.camera);
            // }
        }
        
        for (const obj of activeObjects.moons) {
            // if (this.isObjectInScreen(obj, screenBounds)) {
                obj.render(this.renderer, this.camera);
            // }
        }
        for (const obj of activeObjects.celestialStars) {
            // if (this.isObjectInScreen(obj, screenBounds)) {
                obj.render(this.renderer, this.camera);
            // }
        }
        
        // Render wormholes (prominent foreground layer, after stars)
        // EMERGENCY FIX: Remove duplicate beta wormholes if they still exist (should be rare now)
        const betaWormholes = activeObjects.wormholes.filter(w => w.designation === 'beta');
        if (betaWormholes.length > 1) {
            // Keep only the first beta wormhole, remove all others  
            // const keepBeta = betaWormholes[0];
            const removeBetas = betaWormholes.slice(1);
            
            // Remove duplicates from activeObjects.wormholes array
            activeObjects.wormholes = activeObjects.wormholes.filter(w => !removeBetas.includes(w));
        }
        
        for (const obj of activeObjects.wormholes) {
            // if (this.isObjectInScreen(obj, screenBounds)) {
                // Get destination preview objects for gravitational lensing
                const destinationPreview = this.game.getDestinationPreviewObjects(obj);
                (obj as any).render(this.renderer, this.camera, destinationPreview);
            // }
        }
        
        // Render protostars (stellar formation objects - prominent with jets and disks) - culling disabled  
        for (const obj of activeObjects.protostars) {
            obj.render(this.renderer, this.camera);
        }
        
        // Render black holes (ultra-prominent cosmic phenomena - dominating layer) - culling disabled
        for (const obj of activeObjects.blackholes) {
            // if (this.isObjectInScreen(obj, screenBounds)) {
                obj.render(this.renderer, this.camera);
            // }
        }
        
        // Render chunk boundaries (debug visualization)
        if (GameConfig.debug.enabled && GameConfig.debug.chunkBoundaries.enabled) {
            this.renderChunkBoundaries();
        }
        
        this.starParticles.render(this.renderer, this.camera);
        this.thrusterParticles.render(this.renderer);
        this.ship.render(this.renderer, this.camera.rotation, this.camera.x, this.camera.y, activeObjects.celestialStars as any);
        this.discoveryDisplay.render(this.renderer, this.camera);
        this.localMinimap.render(this.renderer, this.camera);
        this.discoveryLogbook.render(this.renderer, this.camera);
        
        // Render stellar map overlay (renders on top of everything)
        const discovered = this.getDiscoveredObjects();
        this.stellarMap.render(this.renderer, this.camera, discovered.stars, this.gameStartingPosition, discovered.planets, discovered.nebulae, discovered.wormholes, discovered.asteroidGardens, discovered.blackHoles, discovered.comets, discovered.roguePlanets, discovered.darkNebulae, discovered.crystalGardens, discovered.protostars);
        
        // Render touch UI (renders on top of everything else)
        this.touchUI.render(this.renderer);
        
        // Render settings menu (on top of touch UI)
        if (this.settingsMenu.isVisible()) {
            this.settingsMenu.render(this.renderer.ctx, this.renderer.canvas);
        }
        
        // Render confirmation dialog (on top of settings menu)
        this.confirmationDialog.render(this.renderer.ctx, this.renderer.canvas);
        
        // Render developer console (on top of everything else)
        this.developerConsole.render(this.renderer);
        
        // Render transition fade effects (on top of everything)
        if (fadeAlpha > 0) {
            const ctx = this.renderer.ctx;
            
            if (isCosmicTransition) {
                // Cosmic transition with deep space colors
                ctx.fillStyle = `rgba(8, 0, 20, ${fadeAlpha})`; // Deep cosmic purple-black
                ctx.fillRect(0, 0, this.renderer.canvas.width, this.renderer.canvas.height);
                
                // Add cosmic rebirth effect at peak fade
                if (fadeAlpha > 0.8) {
                    this.renderCosmicRebirth(ctx, fadeAlpha);
                }
            } else {
                // Wormhole traversal fade
                ctx.fillStyle = `rgba(0, 0, 15, ${fadeAlpha})`; // Very dark blue-black
                ctx.fillRect(0, 0, this.renderer.canvas.width, this.renderer.canvas.height);
                
                // Add subtle particle tunnel effect at peak fade
                if (fadeAlpha > 0.8) {
                    this.renderTraversalTunnel(ctx, fadeAlpha);
                }
            }
        }
    }

    renderTraversalTunnel(ctx: CanvasRenderingContext2D, intensity: number): void {
        const centerX = this.renderer.canvas.width / 2;
        const centerY = this.renderer.canvas.height / 2;
        const time = this.stateManager.getTraversalAnimationTime(); // Speed up animation
        
        // Draw subtle tunnel particles
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2 + time;
            const radius = 50 + (i * 15);
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            const particleAlpha = (intensity - 0.8) * 5 * (1 - i / 20); // Fade outer particles
            ctx.fillStyle = `rgba(100, 150, 255, ${particleAlpha})`;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderCosmicRebirth(ctx: CanvasRenderingContext2D, intensity: number): void {
        const centerX = this.renderer.canvas.width / 2;
        const centerY = this.renderer.canvas.height / 2;
        const time = this.stateManager.resetStartTime * 2; // Slower, more majestic animation
        
        // Cosmic background with swirling energies
        const cosmicAlpha = (intensity - 0.8) * 5; // Scale from 0.8-1.0 to 0-1.0
        
        // Draw expanding cosmic rings (Big Bang effect)
        for (let i = 0; i < 8; i++) {
            const radius = 30 + (i * 40) + (time * 20);
            const ringAlpha = cosmicAlpha * (1 - i / 8) * 0.3;
            
            // Cosmic colors: deep purples, blues, and hints of gold
            const colors = [
                `rgba(120, 80, 255, ${ringAlpha})`, // Cosmic purple
                `rgba(80, 120, 255, ${ringAlpha})`, // Deep blue  
                `rgba(255, 200, 80, ${ringAlpha})`, // Cosmic gold
                `rgba(180, 100, 255, ${ringAlpha})` // Magenta
            ];
            
            ctx.strokeStyle = colors[i % colors.length];
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Central cosmic singularity point
        const singularityAlpha = cosmicAlpha * Math.sin(time * 3) * 0.5 + cosmicAlpha * 0.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${singularityAlpha})`;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Radiating cosmic energy particles
        for (let i = 0; i < 30; i++) {
            const angle = (i / 30) * Math.PI * 2 + time * 0.5;
            const distance = 20 + (time * 40) + Math.sin(time * 2 + i) * 20;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            const particleAlpha = cosmicAlpha * (1 - (distance / 200)) * 0.8;
            
            // Alternate cosmic colors for particles
            const particleColors = [
                `rgba(255, 180, 255, ${particleAlpha})`, // Pink
                `rgba(180, 255, 255, ${particleAlpha})`, // Cyan
                `rgba(255, 255, 180, ${particleAlpha})`, // Light yellow
            ];
            
            ctx.fillStyle = particleColors[i % particleColors.length];
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    getDestinationPreviewObjects(wormhole: CelestialObject): CelestialObject[] {
        // Get objects near the destination wormhole for gravitational lensing preview
        if (!wormhole.twinX || !wormhole.twinY) return [];
        
        const destinationX = wormhole.twinX;
        const destinationY = wormhole.twinY;
        const previewRadius = 300; // 300 pixel radius around destination
        
        // Get all objects from chunks near the destination
        const destinationObjects: CelestialObject[] = [];
        
        // Sample objects from chunks around destination area
        const chunkSize = 2000; // Should match ChunkManager.CHUNK_SIZE
        const chunksToCheck = [
            { x: Math.floor(destinationX / chunkSize), y: Math.floor(destinationY / chunkSize) },
            { x: Math.floor((destinationX - chunkSize) / chunkSize), y: Math.floor(destinationY / chunkSize) },
            { x: Math.floor((destinationX + chunkSize) / chunkSize), y: Math.floor(destinationY / chunkSize) },
            { x: Math.floor(destinationX / chunkSize), y: Math.floor((destinationY - chunkSize) / chunkSize) },
            { x: Math.floor(destinationX / chunkSize), y: Math.floor((destinationY + chunkSize) / chunkSize) },
        ];
        
        for (const chunkCoord of chunksToCheck) {
            const chunkKey = `${chunkCoord.x},${chunkCoord.y}`;
            
            // Ensure chunk exists for preview
            this.chunkManager.ensureChunkExists(chunkCoord.x, chunkCoord.y);
            const chunk = this.chunkManager.getChunk(chunkKey);
            
            if (chunk) {
                // Check all object types within preview radius
                const allObjects = [
                    ...chunk.celestialStars,
                    ...chunk.planets, 
                    ...chunk.moons,
                    ...chunk.nebulae,
                    ...chunk.asteroidGardens,
                    ...chunk.wormholes.filter(w => w.uniqueId !== wormhole.uniqueId) // Exclude self
                ];
                
                for (const obj of allObjects) {
                    const distance = Math.sqrt(
                        Math.pow(obj.x - destinationX, 2) + Math.pow(obj.y - destinationY, 2)
                    );
                    
                    if (distance <= previewRadius) {
                        // Create preview object with relative positioning
                        const relativeX = obj.x - destinationX;
                        const relativeY = obj.y - destinationY;
                        
                        destinationObjects.push({
                            ...obj,
                            relativeX,
                            relativeY,
                            distance,
                            type: obj.type
                        } as CelestialObject);
                    }
                }
            }
        }
        
        // Sort by distance (closest first) and limit to prevent performance issues
        return destinationObjects
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 8); // Limit to 8 objects for performance
    }

    renderChunkBoundaries(): void {
        const config = GameConfig.debug.chunkBoundaries;
        const chunkSize = this.chunkManager.chunkSize;
        
        // Get viewport bounds in world coordinates
        const viewLeft = this.camera.x - this.renderer.canvas.width / 2;
        const viewRight = this.camera.x + this.renderer.canvas.width / 2;
        const viewTop = this.camera.y - this.renderer.canvas.height / 2;
        const viewBottom = this.camera.y + this.renderer.canvas.height / 2;
        
        // Find chunk coordinates that intersect with the viewport
        const leftChunk = Math.floor(viewLeft / chunkSize);
        const rightChunk = Math.floor(viewRight / chunkSize);
        const topChunk = Math.floor(viewTop / chunkSize);
        const bottomChunk = Math.floor(viewBottom / chunkSize);
        
        // Draw chunk boundaries and crosshairs
        for (let chunkX = leftChunk; chunkX <= rightChunk + 1; chunkX++) {
            for (let chunkY = topChunk; chunkY <= bottomChunk + 1; chunkY++) {
                // Calculate chunk corner position in world coordinates
                const worldX = chunkX * chunkSize;
                const worldY = chunkY * chunkSize;
                
                // Convert to screen coordinates
                const screenX = worldX - this.camera.x + this.renderer.canvas.width / 2;
                const screenY = worldY - this.camera.y + this.renderer.canvas.height / 2;
                
                // Only draw if on screen
                if (screenX >= -config.crosshairSize && screenX <= this.renderer.canvas.width + config.crosshairSize &&
                    screenY >= -config.crosshairSize && screenY <= this.renderer.canvas.height + config.crosshairSize) {
                    
                    // Draw crosshair at chunk corner
                    this.renderer.drawCrosshair(
                        screenX, screenY, 
                        config.crosshairSize, 
                        config.color, 
                        config.lineWidth, 
                        config.opacity
                    );
                }
            }
        }
        
        // Draw subdivision markers along chunk edges if enabled
        if (config.subdivisions.enabled) {
            const subdivisionCount = Math.floor(1 / config.subdivisions.interval) - 1; // 9 marks for 10% intervals
            
            // Vertical chunk boundaries with subdivisions
            for (let chunkX = leftChunk; chunkX <= rightChunk + 1; chunkX++) {
                const worldX = chunkX * chunkSize;
                const screenX = worldX - this.camera.x + this.renderer.canvas.width / 2;
                
                if (screenX >= -config.subdivisions.dashLength && screenX <= this.renderer.canvas.width + config.subdivisions.dashLength) {
                    // Calculate the viewport range for this vertical line
                    const viewTopWorldY = this.camera.y - this.renderer.canvas.height / 2;
                    const viewBottomWorldY = this.camera.y + this.renderer.canvas.height / 2;
                    
                    // Find the range of chunks this vertical line intersects with in the viewport
                    const topVisibleChunk = Math.floor(viewTopWorldY / chunkSize);
                    const bottomVisibleChunk = Math.floor(viewBottomWorldY / chunkSize);
                    
                    // Draw subdivision marks only within the visible chunk range
                    for (let chunkY = topVisibleChunk; chunkY <= bottomVisibleChunk; chunkY++) {
                        const chunkTopY = chunkY * chunkSize;
                        
                        for (let i = 1; i <= subdivisionCount; i++) {
                            const subdivisionY = chunkTopY + (chunkSize * i * config.subdivisions.interval);
                            const screenY = subdivisionY - this.camera.y + this.renderer.canvas.height / 2;
                            
                            // Only draw if the subdivision mark is actually visible
                            if (screenY >= -config.subdivisions.dashLength && screenY <= this.renderer.canvas.height + config.subdivisions.dashLength) {
                                this.renderer.drawDash(
                                    screenX, screenY,
                                    config.subdivisions.dashLength,
                                    config.subdivisions.color,
                                    0, // Horizontal dash (perpendicular to vertical boundary)
                                    config.subdivisions.lineWidth,
                                    config.subdivisions.opacity
                                );
                            }
                        }
                    }
                }
            }
            
            // Horizontal chunk boundaries with subdivisions
            for (let chunkY = topChunk; chunkY <= bottomChunk + 1; chunkY++) {
                const worldY = chunkY * chunkSize;
                const screenY = worldY - this.camera.y + this.renderer.canvas.height / 2;
                
                if (screenY >= -config.subdivisions.dashLength && screenY <= this.renderer.canvas.height + config.subdivisions.dashLength) {
                    // Calculate the viewport range for this horizontal line
                    const viewLeftWorldX = this.camera.x - this.renderer.canvas.width / 2;
                    const viewRightWorldX = this.camera.x + this.renderer.canvas.width / 2;
                    
                    // Find the range of chunks this horizontal line intersects with in the viewport
                    const leftVisibleChunk = Math.floor(viewLeftWorldX / chunkSize);
                    const rightVisibleChunk = Math.floor(viewRightWorldX / chunkSize);
                    
                    // Draw subdivision marks only within the visible chunk range
                    for (let chunkX = leftVisibleChunk; chunkX <= rightVisibleChunk; chunkX++) {
                        const chunkLeftX = chunkX * chunkSize;
                        
                        for (let i = 1; i <= subdivisionCount; i++) {
                            const subdivisionX = chunkLeftX + (chunkSize * i * config.subdivisions.interval);
                            const screenX = subdivisionX - this.camera.x + this.renderer.canvas.width / 2;
                            
                            // Only draw if the subdivision mark is actually visible
                            if (screenX >= -config.subdivisions.dashLength && screenX <= this.renderer.canvas.width + config.subdivisions.dashLength) {
                                this.renderer.drawDash(
                                    screenX, screenY,
                                    config.subdivisions.dashLength,
                                    config.subdivisions.color,
                                    Math.PI / 2, // Vertical dash (perpendicular to horizontal boundary)
                                    config.subdivisions.lineWidth,
                                    config.subdivisions.opacity
                                );
                            }
                        }
                    }
                }
            }
        }
    }

    // Removed createAudioServiceWrapper - now handled by GameFactory

    // Performance optimization helpers
    
    /**
     * Calculate screen bounds for render culling
     */
    private calculateScreenBounds(): { left: number; right: number; top: number; bottom: number } {
        const margin = 100; // Extra margin to account for object sizes
        return {
            left: this.camera.x - (this.renderer.canvas.width / 2) - margin,
            right: this.camera.x + (this.renderer.canvas.width / 2) + margin,
            top: this.camera.y - (this.renderer.canvas.height / 2) - margin,
            bottom: this.camera.y + (this.renderer.canvas.height / 2) + margin
        };
    }

    /**
     * Check if an object is within screen bounds for render culling
     */
    private isObjectInScreen(obj: CelestialObject, screenBounds: { left: number; right: number; top: number; bottom: number }): boolean {
        // Get object bounds with some padding for visual effects
        const padding = (obj as any).radius || 50; // Use object radius or default padding
        
        return obj.x + padding >= screenBounds.left &&
               obj.x - padding <= screenBounds.right &&
               obj.y + padding >= screenBounds.top &&
               obj.y - padding <= screenBounds.bottom;
    }
}
