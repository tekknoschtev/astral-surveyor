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
    type: 'star' | 'planet' | 'moon' | 'nebula' | 'asteroids' | 'wormhole' | 'blackhole' | 'comet' | 'rogue-planet' | 'dark-nebula' | 'crystal-garden' | 'protostar';
    discoveryDistance?: number;
    detectionDistance?: number; // New: larger radius for detection before discovery
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
    
    /**
     * Check if a celestial object should be detectable (but not necessarily discovered)
     * Detection ranges are larger than discovery ranges to create points of interest
     */
    checkDetection(object: DiscoverableObject, camera: CameraInterface): boolean {
        // Stars are detectable at very long ranges due to their brightness
        if (object.type === 'star') {
            return this.checkStarDetection(object, camera);
        }
        
        // All other objects use distance-based detection
        return this.checkDistanceBasedDetection(object, camera);
    }
    
    /**
     * Check star detection based on extended range
     * Stars are always detectable at long range due to their brightness
     */
    private checkStarDetection(object: DiscoverableObject, camera: CameraInterface): boolean {
        const detectionDistance = object.detectionDistance !== undefined ? object.detectionDistance : 1500;
        const distance = this.distanceToShip(object, camera);
        const isDetectable = distance <= detectionDistance;
        
        // Debug logging can be enabled for troubleshooting if needed
        // if (distance <= 500) {
        //     console.log(`Star detection: distance=${distance.toFixed(1)}, threshold=${detectionDistance}, detectable=${isDetectable}`);
        // }
        
        return isDetectable;
    }
    
    /**
     * Check detection based on distance to camera (larger range than discovery)
     */
    private checkDistanceBasedDetection(object: DiscoverableObject, camera: CameraInterface): boolean {
        const detectionDistance = object.detectionDistance !== undefined ? object.detectionDistance : 200;
        
        // Special case: detectionDistance = 0 means not detectable at any distance
        if (detectionDistance <= 0) {
            return false;
        }
        
        const distance = this.distanceToShip(object, camera);
        const isDetectable = distance <= detectionDistance;
        
        // Debug logging can be enabled for troubleshooting if needed
        // if (distance <= 300) {
        //     console.log(`${object.type} detection: distance=${distance.toFixed(1)}, threshold=${detectionDistance}, detectable=${isDetectable}`);
        // }
        
        return isDetectable;
    }
    
    /**
     * Get default detection distance for object type
     * These are much larger than discovery distances to show on minimap at wider range
     */
    getDefaultDetectionDistance(type: string): number {
        const detectionRanges: Record<string, number> = {
            'star': 2500,           // Very long range due to brightness
            'planet': 600,          // Wide range for minimap
            'moon': 400,            // Medium range due to size
            'nebula': 800,          // Large structures visible from very far
            'asteroids': 500,       // Wide range for interesting objects
            'wormhole': 700,        // Exotic objects detectable further
            'blackhole': 900,       // Gravitational effects detectable very far
            'comet': 600,           // Visible tail/coma from far
            'rogue-planet': 500,    // Harder to detect but still wide range
            'dark-nebula': 700,     // Large but subtle
            'crystal-garden': 450,  // Beautiful objects worth seeking
            'protostar': 650        // Forming stars, wide range
        };
        
        return detectionRanges[type] || 500; // Default fallback - much larger than before
    }
    
    /**
     * Get default discovery distance for object type
     * These are the existing smaller ranges for actual discovery
     */
    getDefaultDiscoveryDistance(type: string): number {
        const discoveryRanges: Record<string, number> = {
            'star': 0,              // Stars use screen visibility, not distance
            'planet': 50,           // Close approach needed
            'moon': 35,             // Very close approach needed
            'nebula': 80,           // Medium range for large structures
            'asteroids': 60,        // Medium range
            'wormhole': 70,         // Exotic effects closer range
            'blackhole': 100,       // Gravitational effects
            'comet': 55,            // Need to see details
            'rogue-planet': 45,     // Hard to spot without star
            'dark-nebula': 70,      // Subtle, need closer approach
            'crystal-garden': 40,   // Beautiful details need proximity
            'protostar': 60         // Forming star features
        };

        return discoveryRanges[type] ?? 50; // Default fallback (use ?? to allow 0)
    }
}