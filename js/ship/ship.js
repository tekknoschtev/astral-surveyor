class Ship {
    constructor() {
        this.sprite = [
            '  #  ',
            ' ### ',
            '#####',
            ' # # '
        ];
        this.colors = {
            '#': '#00ff88'  // Nice green color matching the UI
        };
        this.scale = 2;
    }

    render(renderer, rotation = 0) {
        const centerX = Math.floor(renderer.canvas.width / 2) - 2 * this.scale;
        const centerY = Math.floor(renderer.canvas.height / 2) - 2 * this.scale;
        
        const coloredSprite = this.sprite.map(row => 
            row.split('').map(char => this.colors[char] || char)
        );
        
        renderer.drawSprite(centerX, centerY, coloredSprite, this.scale, rotation);
    }
}

class ThrusterParticles {
    constructor() {
        this.particles = [];
        this.maxParticles = 50;
    }

    update(deltaTime, camera, ship) {
        // Spawn new particles if thrusting
        if (camera.isThrusting) {
            this.spawnParticles(camera, ship);
        }

        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update particle position and properties
            particle.x += particle.velocityX * deltaTime;
            particle.y += particle.velocityY * deltaTime;
            particle.life -= deltaTime;
            particle.alpha = particle.life / particle.maxLife;

            // Remove dead particles
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    spawnParticles(camera, ship) {
        // Don't spawn too many particles
        if (this.particles.length >= this.maxParticles) return;

        // Calculate thruster positions relative to ship center
        const thrusterOffsets = [
            { x: -1, y: 1.5 }, // Left thruster
            { x: 1, y: 1.5 }   // Right thruster
        ];

        thrusterOffsets.forEach(offset => {
            // Rotate offset based on ship rotation
            const cos = Math.cos(camera.rotation);
            const sin = Math.sin(camera.rotation);
            const rotatedX = offset.x * cos - offset.y * sin;
            const rotatedY = offset.x * sin + offset.y * cos;

            // Scale by ship size
            const scale = ship.scale;
            const thrusterX = rotatedX * scale;
            const thrusterY = rotatedY * scale;

            // Choose particle color based on braking
            const isBraking = camera.isBraking;
            const particleColor = isBraking 
                ? (Math.random() > 0.7 ? '#ff6666' : '#ff4444') // Red for braking
                : (Math.random() > 0.7 ? '#00ffaa' : '#00ff88'); // Green for thrusting

            // Spawn particle
            this.particles.push({
                x: thrusterX,
                y: thrusterY,
                velocityX: -camera.thrustDirection.x * 80 + (Math.random() - 0.5) * 40,
                velocityY: -camera.thrustDirection.y * 80 + (Math.random() - 0.5) * 40,
                life: 0.5 + Math.random() * 0.3,
                maxLife: 0.8,
                alpha: 1.0,
                color: particleColor
            });
        });
    }

    render(renderer) {
        const centerX = Math.floor(renderer.canvas.width / 2);
        const centerY = Math.floor(renderer.canvas.height / 2);

        for (const particle of this.particles) {
            const alpha = Math.floor(particle.alpha * 255).toString(16).padStart(2, '0');
            const color = particle.color + alpha;
            
            renderer.drawPixel(
                centerX + particle.x,
                centerY + particle.y,
                color,
                1
            );
        }
    }
}

// Export for use in other modules
window.Ship = Ship;
window.ThrusterParticles = ThrusterParticles;