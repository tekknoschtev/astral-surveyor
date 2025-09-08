// DiscoveryService - centralized discovery logic for all celestial objects
// Extracted from individual celestial object checkDiscovery methods

// Use a minimal camera interface to avoid circular dependencies
interface CameraInterface {
    x: number;
    y: number;
    worldToScreen(worldX: number, worldY: number, canvasWidth: number, canvasHeight: number): [number, number];
}

// Interface for objects that can be discovered
interface DiscoverableObject {
    x: number;
    y: number;
    type: 'star' | 'planet' | 'moon' | 'nebula' | 'asteroids' | 'wormhole' | 'blackhole' | 'comet' | 'rogue-planet' | 'dark-nebula' | 'crystal-garden';
    discoveryDistance?: number;
    radius?: number;
    discovered: boolean;
}

export class DiscoveryService {
    /**
     * Check if a celestial object should be discovered based on camera position and canvas size
     */
    checkDiscovery(
        object: DiscoverableObject, 
        camera: CameraInterface, 
        canvasWidth: number, 
        canvasHeight: number
    ): boolean {
        // Already discovered objects should not be discovered again
        if (object.discovered) {
            return false;
        }
        
        // Stars use screen visibility discovery (they're bright and visible from far away)
        if (object.type === 'star') {
            return this.checkStarDiscovery(object, camera, canvasWidth, canvasHeight);
        }
        
        // All other objects use distance-based discovery
        return this.checkDistanceBasedDiscovery(object, camera);
    }
    
    /**
     * Check star discovery based on screen visibility
     */
    private checkStarDiscovery(
        object: DiscoverableObject, 
        camera: CameraInterface, 
        canvasWidth: number, 
        canvasHeight: number
    ): boolean {
        const [screenX, screenY] = camera.worldToScreen(object.x, object.y, canvasWidth, canvasHeight);
        const radius = object.radius || 30; // Default star radius
        const margin = radius + 50; // Extra margin for discovery
        
        // Check if star is visible on screen (including margin for radius)
        return screenX >= -margin && 
               screenX <= canvasWidth + margin && 
               screenY >= -margin && 
               screenY <= canvasHeight + margin;
    }
    
    /**
     * Check discovery based on distance to camera
     */
    private checkDistanceBasedDiscovery(object: DiscoverableObject, camera: CameraInterface): boolean {
        // Use default only if discoveryDistance is undefined/null, not if it's 0
        const discoveryDistance = object.discoveryDistance !== undefined ? object.discoveryDistance : 50;
        
        // Special case: discoveryDistance = 0 means not discoverable at any distance
        if (discoveryDistance <= 0) {
            return false;
        }
        
        const distance = this.distanceToShip(object, camera);
        return distance <= discoveryDistance;
    }
    
    /**
     * Calculate distance between object and camera/ship
     */
    distanceToShip(object: DiscoverableObject, camera: CameraInterface): number {
        const dx = object.x - camera.x;
        const dy = object.y - camera.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}