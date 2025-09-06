// UI system for discoveries, notifications, and HUD elements
// TypeScript conversion with comprehensive type definitions

// Import dependencies
import type { Renderer } from '../graphics/renderer.js';
import type { Camera } from '../camera/camera.js';
import type { ChunkManager } from '../world/ChunkManager.js';

// Interface definitions
interface Discovery {
    message: string;
    timestamp: number;
    id: string;
    objectName: string;
    objectType: string;
}

interface Notification {
    message: string;
    timestamp: number;
    id: string;
}

export class DiscoveryDisplay {
    discoveries: Discovery[];
    notifications: Notification[];
    maxDisplayed: number;
    displayDuration: number;
    notificationDuration: number;
    private chunkManager: ChunkManager | null;

    constructor(chunkManager?: ChunkManager) {
        this.discoveries = [];
        this.notifications = [];
        this.maxDisplayed = 5; // Show last 5 discoveries
        this.displayDuration = 15000; // 15 seconds per discovery
        this.notificationDuration = 3000; // 3 seconds for notifications
        this.chunkManager = chunkManager || null;
    }

    private getRegionDescription(regionName: string, influence: number): string {
        // Convert influence to descriptive text based on strength
        let intensityDesc = '';
        if (influence >= 0.9) {
            intensityDesc = 'Deep in';
        } else if (influence >= 0.7) {
            intensityDesc = 'Within';
        } else if (influence >= 0.5) {
            intensityDesc = 'Entering';
        } else if (influence >= 0.3) {
            intensityDesc = 'Approaching';
        } else {
            intensityDesc = 'Near';
        }

        // Special handling for different region types to make them more atmospheric
        const regionSpecialNames: Record<string, string> = {
            'The Void': 'the Void',
            'Star-Forge Cluster': 'the Star-Forge Cluster',
            'Galactic Core': 'the Galactic Core',
            'Asteroid Graveyard': 'the Asteroid Graveyard',
            'Ancient Expanse': 'the Ancient Expanse',
            'Stellar Nursery': 'the Stellar Nursery'
        };

        const displayName = regionSpecialNames[regionName] || regionName.toLowerCase();
        return `${intensityDesc} ${displayName}`;
    }

    addDiscovery(objectName: string, objectType: string): void {
        const now = new Date();
        const timestamp = now.getFullYear() + '-' + 
                         String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                         String(now.getDate()).padStart(2, '0') + ' ' +
                         String(now.getHours()).padStart(2, '0') + ':' + 
                         String(now.getMinutes()).padStart(2, '0') + ':' + 
                         String(now.getSeconds()).padStart(2, '0');
        
        const discovery: Discovery = {
            message: `${timestamp} - ${objectName} (${objectType}) discovered!`,
            timestamp: Date.now(),
            id: Math.random().toString(36).substr(2, 9),
            objectName: objectName,
            objectType: objectType
        };
        
        this.discoveries.push(discovery); // Add to end (newest at bottom)
        
        // Remove oldest discoveries if we have too many
        if (this.discoveries.length > this.maxDisplayed) {
            this.discoveries.shift(); // Remove from beginning (oldest)
        }
    }

    addNotification(message: string): void {
        const notification: Notification = {
            message: message,
            timestamp: Date.now(),
            id: Math.random().toString(36).substr(2, 9)
        };
        
        this.notifications.push(notification);
    }

    update(_deltaTime: number): void {
        const currentTime = Date.now();
        
        // Remove expired discoveries
        this.discoveries = this.discoveries.filter(discovery => 
            currentTime - discovery.timestamp < this.displayDuration
        );
        
        // Remove expired notifications
        this.notifications = this.notifications.filter(notification => 
            currentTime - notification.timestamp < this.notificationDuration
        );
    }

    render(renderer: Renderer, camera: Camera | null = null): void {
        this.renderDiscoveries(renderer);
        this.renderNotifications(renderer);
        if (camera) {
            this.renderCoordinates(renderer, camera);
        }
    }

    renderDiscoveries(renderer: Renderer): void {
        // Save context state
        renderer.ctx.save();
        
        const padding = 20;
        const lineHeight = 24;
        const startY = renderer.canvas.height - padding - (this.discoveries.length * lineHeight);
        
        // Ensure left-aligned text
        renderer.ctx.textAlign = 'left';
        renderer.ctx.textBaseline = 'alphabetic';
        
        for (let i = 0; i < this.discoveries.length; i++) {
            const discovery = this.discoveries[i];
            const age = Date.now() - discovery.timestamp;
            const fadeProgress = age / this.displayDuration;
            
            // Calculate alpha for fade out effect
            let alpha = 1.0;
            if (fadeProgress > 0.7) {
                alpha = 1.0 - ((fadeProgress - 0.7) / 0.3);
            }
            alpha = Math.max(0, Math.min(1, alpha));
            
            const y = startY + (i * lineHeight);
            
            // Draw background box
            const alphaHex = Math.floor(alpha * 80).toString(16).padStart(2, '0');
            renderer.ctx.fillStyle = `#000000${alphaHex}`;
            renderer.ctx.fillRect(padding - 10, y - 15, 250, 20);
            
            // Draw discovery text
            const textAlphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0');
            renderer.ctx.fillStyle = `#b0c4d4${textAlphaHex}`;
            renderer.ctx.font = '12px "Courier New", monospace';
            renderer.ctx.fillText(discovery.message, padding, y);
        }
        
        // Restore context state
        renderer.ctx.restore();
    }

    renderNotifications(renderer: Renderer): void {
        // const padding = 20;
        const lineHeight = 30;
        const centerX = renderer.canvas.width / 2;
        const topY = 100;
        
        for (let i = 0; i < this.notifications.length; i++) {
            const notification = this.notifications[i];
            const age = Date.now() - notification.timestamp;
            const fadeProgress = age / this.notificationDuration;
            
            // Calculate alpha for fade effect
            let alpha = 1.0;
            if (fadeProgress > 0.7) {
                alpha = 1.0 - ((fadeProgress - 0.7) / 0.3);
            }
            alpha = Math.max(0, Math.min(1, alpha));
            
            const y = topY + (i * lineHeight);
            
            // Measure text width for centering
            renderer.ctx.font = '12px "Courier New", monospace';
            const textWidth = renderer.ctx.measureText(notification.message).width;
            
            // Draw background box
            const bgAlphaHex = Math.floor(alpha * 100).toString(16).padStart(2, '0');
            renderer.ctx.fillStyle = `#2a3a4a${bgAlphaHex}`;
            renderer.ctx.fillRect(centerX - textWidth/2 - 10, y - 18, textWidth + 20, 25);
            
            // Draw notification text
            const textAlphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0');
            renderer.ctx.fillStyle = `#b0c4d4${textAlphaHex}`;
            renderer.ctx.fillText(notification.message, centerX - textWidth/2, y);
        }
    }

    renderCoordinates(renderer: Renderer, camera: Camera): void {
        // Save context state
        renderer.ctx.save();
        
        const padding = 20;
        const x = Math.round(camera.x);
        const y = Math.round(camera.y);
        const coordText = `Position: (${x}, ${y})`;
        const distanceText = `Distance: ${camera.getFormattedDistance()}`;
        const speedText = `Speed: ${camera.getFormattedSpeed()}`;
        
        // Get region information if chunk manager is available
        let regionText = '';
        if (this.chunkManager) {
            try {
                const chunkX = Math.floor(x / this.chunkManager.chunkSize);
                const chunkY = Math.floor(y / this.chunkManager.chunkSize);
                const regionInfo = this.chunkManager.getChunkRegion(chunkX, chunkY);
                
                if (regionInfo && regionInfo.definition) {
                    regionText = this.getRegionDescription(regionInfo.definition.name, regionInfo.influence);
                }
            } catch (error) {
                // Silently handle any region lookup errors
                regionText = '';
            }
        }
        
        // Set up font to match game UI (Courier New, 12px)
        renderer.ctx.font = '12px "Courier New", monospace';
        renderer.ctx.textAlign = 'left';
        renderer.ctx.textBaseline = 'alphabetic';
        
        // Calculate widths for right alignment - include region text if available
        const coordWidth = renderer.ctx.measureText(coordText).width;
        const distanceWidth = renderer.ctx.measureText(distanceText).width;
        const speedWidth = renderer.ctx.measureText(speedText).width;
        const regionWidth = regionText ? renderer.ctx.measureText(regionText).width : 0;
        const maxWidth = Math.max(coordWidth, distanceWidth, speedWidth, regionWidth);
        
        // Position on the right side of screen
        const rightX = renderer.canvas.width - maxWidth - padding;
        
        // Draw coordinates, distance, speed, and region (minimal, no background or instructions)
        renderer.ctx.fillStyle = '#b0c4d4'; // Soft blue-white to match new UI
        renderer.ctx.fillText(coordText, rightX, padding + 10);
        renderer.ctx.fillText(distanceText, rightX, padding + 25); // 15px below coordinates
        renderer.ctx.fillText(speedText, rightX, padding + 40); // 15px below distance
        
        // Draw region information if available
        if (regionText) {
            renderer.ctx.fillText(regionText, rightX, padding + 55); // 15px below speed
        }
        
        // Restore context state
        renderer.ctx.restore();
    }
}

// Export for use in other modules (maintain global compatibility)
declare global {
    interface Window {
        DiscoveryDisplay: typeof DiscoveryDisplay;
    }
}

if (typeof window !== 'undefined') {
    window.DiscoveryDisplay = DiscoveryDisplay;
}