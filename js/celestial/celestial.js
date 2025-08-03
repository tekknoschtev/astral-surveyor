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

class Star extends CelestialObject {
    constructor(x, y) {
        super(x, y, 'star');
        
        // Default properties (will be overridden by initWithSeed if used)
        this.radius = 60 + Math.random() * 40; // 60-100 pixels (MUCH larger than planets 8-20px)
        this.discoveryDistance = this.radius + 80;
        
        // Simple star color - single bright color
        this.color = '#ffaa44'; // Default orange
        this.brightness = 1.0; // Full brightness
    }

    // Initialize star with seeded random for deterministic generation
    initWithSeed(rng) {
        // Procedural star properties using seeded random
        const starType = rng.next();
        
        if (starType > 0.95) {
            // Supergiant stars (5% chance) - absolutely massive!
            this.radius = rng.nextFloat(120, 180);
        } else if (starType > 0.85) {
            // Giant stars (10% chance) - very large
            this.radius = rng.nextFloat(80, 120);
        } else {
            // Main sequence stars (85% chance) - still much larger than planets
            this.radius = rng.nextFloat(50, 90);
        }
        
        this.discoveryDistance = this.radius + 80;
        
        // Simple star colors - single bright colors
        const starColors = [
            '#ffaa44', // Orange (most common)
            '#ffdd88', // Yellow
            '#ff6644', // Red
            '#88ddff', // Blue
            '#ffffff'  // White
        ];
        
        this.color = rng.choice(starColors);
        this.brightness = 1.0; // Full brightness for all stars
    }

    render(renderer, camera) {
        const [screenX, screenY] = camera.worldToScreen(this.x, this.y, renderer.canvas.width, renderer.canvas.height);
        
        // Only render if on screen
        if (screenX >= -this.radius - 10 && screenX <= renderer.canvas.width + this.radius + 10 && 
            screenY >= -this.radius - 10 && screenY <= renderer.canvas.height + this.radius + 10) {
            
            // Draw the star as a simple solid circle
            renderer.drawCircle(screenX, screenY, this.radius, this.color);
            
            // Visual indicator if discovered
            if (this.discovered) {
                renderer.ctx.strokeStyle = '#00ff88';
                renderer.ctx.lineWidth = 3;
                renderer.ctx.beginPath();
                renderer.ctx.arc(screenX, screenY, this.radius + 8, 0, Math.PI * 2);
                renderer.ctx.stroke();
            }
        }
    }
}

// Export for use in other modules
window.CelestialObject = CelestialObject;
window.Planet = Planet;
window.Star = Star;