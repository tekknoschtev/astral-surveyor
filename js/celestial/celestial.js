class CelestialObject {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.discovered = false;
        this.discoveryDistance = 50; // How close ship needs to be for discovery
    }

    distanceToShip(camera) {
        const dx = this.x - camera.x;
        const dy = this.y - camera.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    checkDiscovery(camera) {
        if (!this.discovered && this.distanceToShip(camera) <= this.discoveryDistance) {
            this.discovered = true;
            return true; // Newly discovered
        }
        return false;
    }

    render(renderer, camera) {
        // To be overridden by subclasses
    }
}

class Planet extends CelestialObject {
    constructor(x, y) {
        super(x, y, 'planet');
        
        // Default properties (will be overridden by initWithSeed if used)
        this.radius = 8 + Math.random() * 12; // 8-20 pixels
        this.discoveryDistance = this.radius + 30;
        
        // Random planet colors - realistic space colors
        const planetColors = [
            '#8B4513', // Brown (rocky)
            '#4169E1', // Blue (water world)
            '#DC143C', // Red (Mars-like)
            '#9ACD32', // Green (Earth-like)
            '#FFE4B5', // Tan (desert)
            '#708090', // Gray (moon-like)
            '#FF6347', // Orange (volcanic)
            '#DA70D6'  // Purple (exotic)
        ];
        
        this.color = planetColors[Math.floor(Math.random() * planetColors.length)];
        
        // Simple terrain pattern (optional stripes for variety)
        this.hasStripes = Math.random() > 0.7;
        if (this.hasStripes) {
            // Darker shade for stripes
            const baseColor = this.color;
            this.stripeColor = this.darkenColor(baseColor, 0.3);
        }
    }

    // Initialize planet with seeded random for deterministic generation
    initWithSeed(rng) {
        // Procedural planet properties using seeded random
        this.radius = rng.nextFloat(8, 20); // 8-20 pixels
        this.discoveryDistance = this.radius + 30;
        
        // Planet colors - realistic space colors
        const planetColors = [
            '#8B4513', // Brown (rocky)
            '#4169E1', // Blue (water world)
            '#DC143C', // Red (Mars-like)
            '#9ACD32', // Green (Earth-like)
            '#FFE4B5', // Tan (desert)
            '#708090', // Gray (moon-like)
            '#FF6347', // Orange (volcanic)
            '#DA70D6'  // Purple (exotic)
        ];
        
        this.color = rng.choice(planetColors);
        
        // Simple terrain pattern (optional stripes for variety)
        this.hasStripes = rng.next() > 0.7;
        if (this.hasStripes) {
            // Darker shade for stripes
            const baseColor = this.color;
            this.stripeColor = this.darkenColor(baseColor, 0.3);
        }
    }

    darkenColor(hex, amount) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, Math.floor((num >> 16) * (1 - amount)));
        const g = Math.max(0, Math.floor(((num >> 8) & 0x00FF) * (1 - amount)));
        const b = Math.max(0, Math.floor((num & 0x0000FF) * (1 - amount)));
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }

    render(renderer, camera) {
        const [screenX, screenY] = camera.worldToScreen(this.x, this.y, renderer.canvas.width, renderer.canvas.height);
        
        // Only render if on screen
        if (screenX >= -this.radius && screenX <= renderer.canvas.width + this.radius && 
            screenY >= -this.radius && screenY <= renderer.canvas.height + this.radius) {
            
            // Draw planet
            renderer.drawCircle(screenX, screenY, this.radius, this.color);
            
            // Draw simple stripes if planet has them
            if (this.hasStripes) {
                for (let i = 0; i < 3; i++) {
                    const stripeY = screenY - this.radius + (this.radius * 2 / 4) * (i + 1);
                    const stripeWidth = Math.sqrt(this.radius * this.radius - Math.pow(stripeY - screenY, 2)) * 2;
                    
                    if (stripeWidth > 0) {
                        renderer.ctx.fillStyle = this.stripeColor;
                        renderer.ctx.fillRect(
                            screenX - stripeWidth / 2, 
                            stripeY - 1, 
                            stripeWidth, 
                            2
                        );
                    }
                }
            }
            
            // Visual indicator if discovered
            if (this.discovered) {
                renderer.ctx.strokeStyle = '#00ff88';
                renderer.ctx.lineWidth = 2;
                renderer.ctx.beginPath();
                renderer.ctx.arc(screenX, screenY, this.radius + 5, 0, Math.PI * 2);
                renderer.ctx.stroke();
            }
        }
    }
}

// Export for use in other modules
window.CelestialObject = CelestialObject;
window.Planet = Planet;