class DiscoveryDisplay {
    constructor() {
        this.discoveries = [];
        this.notifications = [];
        this.maxDisplayed = 5; // Show last 5 discoveries
        this.displayDuration = 15000; // 15 seconds per discovery
        this.notificationDuration = 3000; // 3 seconds for notifications
    }

    addDiscovery(objectType) {
        const now = new Date();
        const timestamp = now.getFullYear() + '-' + 
                         String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                         String(now.getDate()).padStart(2, '0') + ' ' +
                         String(now.getHours()).padStart(2, '0') + ':' + 
                         String(now.getMinutes()).padStart(2, '0') + ':' + 
                         String(now.getSeconds()).padStart(2, '0');
        
        const discovery = {
            message: `${timestamp} - New ${objectType} discovered!`,
            timestamp: Date.now(),
            id: Math.random().toString(36).substr(2, 9)
        };
        
        this.discoveries.push(discovery); // Add to end (newest at bottom)
        
        // Remove oldest discoveries if we have too many
        if (this.discoveries.length > this.maxDisplayed) {
            this.discoveries.shift(); // Remove from beginning (oldest)
        }
    }

    addNotification(message) {
        const notification = {
            message: message,
            timestamp: Date.now(),
            id: Math.random().toString(36).substr(2, 9)
        };
        
        this.notifications.push(notification);
    }

    update(deltaTime) {
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

    render(renderer, camera = null) {
        this.renderDiscoveries(renderer);
        this.renderNotifications(renderer);
        if (camera) {
            this.renderCoordinates(renderer, camera);
        }
    }

    renderDiscoveries(renderer) {
        const padding = 20;
        const lineHeight = 24;
        const startY = renderer.canvas.height - padding - (this.discoveries.length * lineHeight);
        
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
    }

    renderNotifications(renderer) {
        const padding = 20;
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

    renderCoordinates(renderer, camera) {
        const padding = 20;
        const x = Math.round(camera.x);
        const y = Math.round(camera.y);
        const coordText = `Position: (${x}, ${y})`;
        
        // Set up font to match game UI (Courier New, 12px)
        renderer.ctx.font = '12px "Courier New", monospace';
        
        // Calculate width for right alignment
        const coordWidth = renderer.ctx.measureText(coordText).width;
        
        // Position on the right side of screen
        const rightX = renderer.canvas.width - coordWidth - padding;
        
        // Draw coordinates (minimal, no background or instructions)
        renderer.ctx.fillStyle = '#b0c4d4'; // Soft blue-white to match new UI
        renderer.ctx.fillText(coordText, rightX, padding + 10);
    }
}

// Export for use in other modules
window.DiscoveryDisplay = DiscoveryDisplay;