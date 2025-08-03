class DiscoveryDisplay {
    constructor() {
        this.discoveries = [];
        this.maxDisplayed = 5; // Show last 5 discoveries
        this.displayDuration = 15000; // 15 seconds per discovery
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

    update(deltaTime) {
        const currentTime = Date.now();
        
        // Remove expired discoveries
        this.discoveries = this.discoveries.filter(discovery => 
            currentTime - discovery.timestamp < this.displayDuration
        );
    }

    render(renderer) {
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
            renderer.ctx.fillStyle = `#00ff88${textAlphaHex}`;
            renderer.ctx.font = '14px monospace';
            renderer.ctx.fillText(discovery.message, padding, y);
        }
    }
}

// Export for use in other modules
window.DiscoveryDisplay = DiscoveryDisplay;