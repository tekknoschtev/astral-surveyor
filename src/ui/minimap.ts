// Local Minimap System for nearby point-of-interest discovery
// Shows detectable objects in local area to encourage intentional exploration

// Import dependencies
import type { Renderer } from '../graphics/renderer.js';
import type { Camera } from '../camera/camera.js';
import type { ChunkManager } from '../world/ChunkManager.js';
import type { DiscoveryService } from '../services/DiscoveryService.js';

// Interface for detectable objects in local area
interface DetectableObject {
    x: number;
    y: number;
    type: 'star' | 'planet' | 'moon' | 'nebula' | 'asteroids' | 'wormhole' | 'blackhole' | 'comet' | 'rogue-planet' | 'dark-nebula' | 'crystal-garden' | 'protostar';
    rarity: 'common' | 'uncommon' | 'rare' | 'ultra-rare';
    discovered: boolean;
    detectable: boolean;
}

export class LocalMinimap {
    // Visual configuration
    private readonly size: number = 150;
    private readonly padding: number = 15;
    private readonly topOffset: number = 40; // Push down to avoid title overlap
    private readonly centerSize: number = 3; // Player indicator size
    private readonly chunkRadius: number = 2; // Show objects within 2 chunks of player (like seed inspector)
    
    // Colors matching discovery logbook rarity system
    private readonly rarityColors: Record<string, string> = {
        'common': '#b0c4d4',
        'uncommon': '#fff3cd', 
        'rare': '#ffa500',
        'ultra-rare': '#ff6b6b'
    };
    
    // UI state
    visible: boolean = true;
    private backgroundColor: string = '#000511E0'; // Match discovery logbook
    private borderColor: string = '#2a3a4a';
    private gridColor: string = '#1a2a3a';
    private playerColor: string = '#ffffff';
    
    // Services
    private chunkManager: ChunkManager | null = null;
    private discoveryService: DiscoveryService | null = null;
    
    constructor(chunkManager?: ChunkManager, discoveryService?: DiscoveryService) {
        this.chunkManager = chunkManager || null;
        this.discoveryService = discoveryService || null;
    }
    
    /**
     * Set chunk manager for object queries
     */
    setChunkManager(chunkManager: ChunkManager): void {
        this.chunkManager = chunkManager;
    }
    
    /**
     * Set discovery service for detection logic
     */
    setDiscoveryService(discoveryService: DiscoveryService): void {
        this.discoveryService = discoveryService;
    }
    
    /**
     * Toggle minimap visibility
     */
    toggle(): void {
        this.visible = !this.visible;
    }
    
    /**
     * Check if minimap is visible
     */
    isVisible(): boolean {
        return this.visible;
    }
    
    /**
     * Update minimap state - refresh object positions for orbital movement
     */
    update(deltaTime: number): void {
        // The minimap data is refreshed each render cycle, so orbital movement
        // should automatically be reflected. No additional state tracking needed.
    }
    
    /**
     * Get minimap bounds for click detection
     */
    getBounds(canvasWidth: number, canvasHeight: number): { x: number; y: number; width: number; height: number } {
        return {
            x: this.padding,
            y: this.padding + this.topOffset,
            width: this.size,
            height: this.size
        };
    }
    
    /**
     * Main render method
     */
    render(renderer: Renderer, camera: Camera): void {
        if (!this.visible) return;
        
        const { canvas, ctx } = renderer;
        
        // Save context state
        ctx.save();
        
        // Calculate minimap position (top-left corner, offset to avoid title)
        const mapX = this.padding;
        const mapY = this.padding + this.topOffset;
        
        // Draw background
        this.renderBackground(ctx, mapX, mapY);
        
        // Draw grid for spatial reference
        this.renderGrid(ctx, mapX, mapY);
        
        // Draw detectable objects
        this.renderObjects(ctx, mapX, mapY, camera);
        
        // Draw player indicator (always on top)
        this.renderPlayer(ctx, mapX, mapY, camera);
        
        // Draw border
        this.renderBorder(ctx, mapX, mapY);
        
        // Restore context state
        ctx.restore();
    }
    
    /**
     * Render minimap background
     */
    private renderBackground(ctx: CanvasRenderingContext2D, mapX: number, mapY: number): void {
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(mapX, mapY, this.size, this.size);
    }
    
    /**
     * Render subtle grid for spatial reference
     */
    private renderGrid(ctx: CanvasRenderingContext2D, mapX: number, mapY: number): void {
        const gridSize = this.size / 6; // 6x6 grid
        
        ctx.strokeStyle = this.gridColor;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        
        // Vertical lines
        for (let i = 1; i < 6; i++) {
            const x = mapX + i * gridSize;
            ctx.beginPath();
            ctx.moveTo(x, mapY);
            ctx.lineTo(x, mapY + this.size);
            ctx.stroke();
        }
        
        // Horizontal lines  
        for (let i = 1; i < 6; i++) {
            const y = mapY + i * gridSize;
            ctx.beginPath();
            ctx.moveTo(mapX, y);
            ctx.lineTo(mapX + this.size, y);
            ctx.stroke();
        }
        
        ctx.globalAlpha = 1.0;
    }
    
    /**
     * Render detectable objects as points of interest
     */
    private renderObjects(ctx: CanvasRenderingContext2D, mapX: number, mapY: number, camera: Camera): void {
        const objects = this.getDetectableObjects(camera);
        
        for (const obj of objects) {
            const screenPos = this.worldToMinimap(obj.x, obj.y, camera, mapX, mapY);
            
            // Add padding to account for circle radius when checking bounds
            const objectRadius = 3;
            if (this.isInMinimapBounds(screenPos.x, screenPos.y, mapX, mapY, objectRadius)) {
                this.renderObject(ctx, screenPos.x, screenPos.y, obj);
            }
        }
    }
    
    /**
     * Render individual object as point of interest
     */
    private renderObject(ctx: CanvasRenderingContext2D, x: number, y: number, obj: DetectableObject): void {
        const color = this.rarityColors[obj.rarity] || this.rarityColors.common;
        const radius = 3;
        
        if (obj.discovered) {
            // Filled circle for discovered objects (full opacity)
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Outline circle for detectable but undiscovered objects (more transparent)
            ctx.save();
            ctx.globalAlpha = 0.6; // Make undiscovered objects more transparent
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }
    
    /**
     * Render player indicator at center as directional arrow
     */
    private renderPlayer(ctx: CanvasRenderingContext2D, mapX: number, mapY: number, camera: Camera): void {
        const centerX = mapX + this.size / 2;
        const centerY = mapY + this.size / 2;
        const arrowSize = 5; // Slightly larger than the old circle
        
        // Get ship rotation (camera rotation represents ship facing direction)
        const rotation = camera.rotation;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation);
        
        // Draw arrow/triangle pointing "up" (will be rotated to face ship direction)
        ctx.fillStyle = this.playerColor;
        ctx.strokeStyle = '#000000'; // Black outline for better visibility
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        // Arrow pointing up (before rotation)
        ctx.moveTo(0, -arrowSize);      // Top point
        ctx.lineTo(-arrowSize * 0.6, arrowSize * 0.8);  // Bottom left
        ctx.lineTo(arrowSize * 0.6, arrowSize * 0.8);   // Bottom right
        ctx.closePath();
        
        // Fill and stroke the arrow
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
    }
    
    /**
     * Render minimap border
     */
    private renderBorder(ctx: CanvasRenderingContext2D, mapX: number, mapY: number): void {
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(mapX, mapY, this.size, this.size);
    }
    
    /**
     * Convert world coordinates to minimap screen coordinates
     */
    private worldToMinimap(worldX: number, worldY: number, camera: Camera, mapX: number, mapY: number): { x: number; y: number } {
        // Calculate relative position from camera
        const relativeX = worldX - camera.x;
        const relativeY = worldY - camera.y;
        
        // Calculate the world size we're showing (chunk radius * 2 * chunk size)
        // Assume chunk size is around 1000 units (will need to get actual value)
        const chunkSize = this.chunkManager?.chunkSize || 1000;
        const worldRadius = this.chunkRadius * chunkSize;
        
        // Scale to minimap size
        const scale = this.size / (worldRadius * 2);
        const screenX = mapX + this.size / 2 + relativeX * scale;
        const screenY = mapY + this.size / 2 + relativeY * scale;
        
        return { x: screenX, y: screenY };
    }
    
    /**
     * Check if coordinates are within minimap bounds, accounting for object radius
     */
    private isInMinimapBounds(x: number, y: number, mapX: number, mapY: number, radius: number = 0): boolean {
        return x >= mapX + radius && 
               x <= mapX + this.size - radius && 
               y >= mapY + radius && 
               y <= mapY + this.size - radius;
    }
    
    /**
     * Get all objects in nearby chunks (like seed inspector)
     */
    private getDetectableObjects(camera: Camera): DetectableObject[] {
        const objects: DetectableObject[] = [];
        
        if (!this.chunkManager) {
            return objects;
        }
        
        // Get player's current chunk coordinates
        const playerChunkCoords = this.chunkManager.getChunkCoords(camera.x, camera.y);
        
        let totalObjects = 0;
        let processedChunks = 0;
        
        // Query all chunks within radius (like seed inspector)
        for (let chunkX = playerChunkCoords.x - this.chunkRadius; chunkX <= playerChunkCoords.x + this.chunkRadius; chunkX++) {
            for (let chunkY = playerChunkCoords.y - this.chunkRadius; chunkY <= playerChunkCoords.y + this.chunkRadius; chunkY++) {
                // Ensure chunk exists (generate if needed, like seed inspector)
                this.chunkManager.ensureChunkExists(chunkX, chunkY);
                
                // Get chunk data
                const chunkKey = this.chunkManager.getChunkKey(chunkX, chunkY);
                const chunk = this.chunkManager.getChunk(chunkKey);
                
                if (chunk) {
                    processedChunks++;
                    
                    // Process all object types in this chunk
                    this.processChunkObjects(chunk.celestialStars, 'star', objects, camera);
                    this.processChunkObjects(chunk.planets, 'planet', objects, camera);
                    this.processChunkObjects(chunk.moons, 'moon', objects, camera);
                    this.processChunkObjects(chunk.nebulae, 'nebula', objects, camera);
                    this.processChunkObjects(chunk.asteroidGardens, 'asteroids', objects, camera);
                    this.processChunkObjects(chunk.wormholes, 'wormhole', objects, camera);
                    this.processChunkObjects(chunk.blackholes, 'blackhole', objects, camera);
                    this.processChunkObjects(chunk.comets, 'comet', objects, camera);
                    this.processChunkObjects(chunk.roguePlanets, 'rogue-planet', objects, camera);
                    this.processChunkObjects(chunk.darkNebulae, 'dark-nebula', objects, camera);
                    this.processChunkObjects(chunk.crystalGardens, 'crystal-garden', objects, camera);
                    this.processChunkObjects(chunk.protostars, 'protostar', objects, camera);
                    
                    totalObjects += Object.values(chunk).reduce((sum, arr) => {
                        return sum + (Array.isArray(arr) ? arr.length : 0);
                    }, 0);
                }
            }
        }
        
        // Debug logging can be uncommented if needed for troubleshooting
        // console.log(`Minimap: Scanned ${processedChunks} chunks, found ${totalObjects} total objects, showing ${objects.length} on minimap`);
        return objects;
    }
    
    /**
     * Process chunk objects - show ALL objects regardless of detection distance
     * Like seed inspector, this reveals what's available to discover
     */
    private processChunkObjects(
        objectArray: any[], 
        type: DetectableObject['type'], 
        result: DetectableObject[], 
        camera: Camera
    ): void {
        if (!objectArray || objectArray.length === 0) return;
        
        for (const obj of objectArray) {
            const isDiscovered = obj.discovered || false;
            
            const detectableObj: DetectableObject = {
                x: obj.x,
                y: obj.y,
                type: type,
                rarity: this.determineRarity(obj, type),
                discovered: isDiscovered,
                detectable: true // Always show as detectable (since we're revealing what's available)
            };
            
            result.push(detectableObj);
        }
    }
    
    /**
     * Calculate distance between object and camera
     */
    private distanceToCamera(obj: any, camera: Camera): number {
        const dx = obj.x - camera.x;
        const dy = obj.y - camera.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Determine rarity for an object - matches DiscoveryManager logic
     */
    private determineRarity(obj: any, type: DetectableObject['type']): DetectableObject['rarity'] {
        // Match DiscoveryManager's rarity determination logic
        if (type === 'blackhole' || type === 'wormhole') {
            return 'ultra-rare';
        }
        if (type === 'nebula' || type === 'comet') {
            return 'rare';
        }
        if (type === 'moon') {
            return 'uncommon';
        }
        if (type === 'star') {
            const starType = obj.starTypeName;
            if (starType === 'Neutron Star') return 'ultra-rare';
            if (starType === 'White Dwarf' || starType === 'Blue Giant') return 'rare';
            if (starType === 'Red Giant') return 'uncommon';
            return 'common';
        }
        if (type === 'planet') {
            const planetType = obj.planetTypeName;
            if (planetType === 'Exotic World') return 'ultra-rare';
            if (planetType === 'Volcanic World' || planetType === 'Frozen World') return 'rare';
            return 'common';
        }
        if (type === 'asteroids') {
            const gardenType = obj.gardenType;
            if (gardenType === 'rare_minerals' || gardenType === 'crystalline' || gardenType === 'icy') {
                return 'rare';
            }
            return 'uncommon';
        }
        // Handle region-specific objects
        if (type === 'crystal-garden' || type === 'dark-nebula' || type === 'rogue-planet' || type === 'protostar') {
            return 'rare'; // Region-specific objects are generally rare
        }
        
        return 'common'; // Default fallback
    }
}