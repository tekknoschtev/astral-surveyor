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

class StarParticles {
    constructor() {
        this.particles = [];
        this.maxParticlesPerStar = 150; // Much denser particle effect
    }

    update(deltaTime, stars, camera) {
        // Spawn new particles for visible stars
        for (const star of stars) {
            const [screenX, screenY] = camera.worldToScreen(star.x, star.y, 9999, 9999); // Use large canvas size for distance check
            const distanceToCamera = Math.sqrt((star.x - camera.x) ** 2 + (star.y - camera.y) ** 2);
            
            // Only spawn particles for stars that are reasonably close
            if (distanceToCamera < 2000) {
                this.spawnParticles(star, deltaTime);
            }
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

    spawnParticles(star, deltaTime) {
        // Count existing particles for this star
        const starParticles = this.particles.filter(p => p.starId === `${star.x}_${star.y}`);
        if (starParticles.length >= this.maxParticlesPerStar) return;

        // Much higher spawn rate for very dense corona
        const spawnRate = (star.radius / 6) * 35; // Many more particles per second
        const particlesToSpawn = Math.floor(spawnRate * deltaTime) + (Math.random() < (spawnRate * deltaTime % 1) ? 1 : 0);

        for (let i = 0; i < particlesToSpawn; i++) {
            // Random position around star surface
            const angle = Math.random() * Math.PI * 2;
            const spawnRadius = star.radius * (0.8 + Math.random() * 0.3); // Spawn mostly on surface
            const spawnX = star.x + Math.cos(angle) * spawnRadius;
            const spawnY = star.y + Math.sin(angle) * spawnRadius;

            // Very slow particle velocity for majestic corona effect
            const speed = 3 + Math.random() * 6; // Much slower speed (3-9 vs 8-20)
            const velocityAngle = angle + (Math.random() - 0.5) * 0.4; // Slightly more random direction
            const velocityX = Math.cos(velocityAngle) * speed;
            const velocityY = Math.sin(velocityAngle) * speed;

            // Make particles brighter/lighter than the star itself
            const particleColor = this.lightenColor(star.color, 0.4 + Math.random() * 0.3); // 40-70% lighter

            // Add size variance - mostly 1px with some larger particles
            let particleSize = 1;
            const sizeRand = Math.random();
            if (sizeRand > 0.85) {
                particleSize = 3; // 15% chance of larger particles
            } else if (sizeRand > 0.7) {
                particleSize = 2; // 15% chance of medium particles
            }
            // 70% remain size 1

            this.particles.push({
                x: spawnX,
                y: spawnY,
                velocityX: velocityX,
                velocityY: velocityY,
                life: 1.0 + Math.random() * 0.8, // Shorter life = stay closer
                maxLife: 1.8,
                alpha: 1.0,
                color: particleColor,
                size: particleSize,
                starId: `${star.x}_${star.y}`
            });
        }
    }

    lightenColor(hex, amount) {
        // Parse hex color
        const colorNum = parseInt(hex.replace('#', ''), 16);
        const r = (colorNum >> 16) & 255;
        const g = (colorNum >> 8) & 255;
        const b = colorNum & 255;
        
        // Lighten by moving towards white
        const newR = Math.min(255, Math.floor(r + (255 - r) * amount));
        const newG = Math.min(255, Math.floor(g + (255 - g) * amount));
        const newB = Math.min(255, Math.floor(b + (255 - b) * amount));
        
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }

    render(renderer, camera) {
        for (const particle of this.particles) {
            const [screenX, screenY] = camera.worldToScreen(particle.x, particle.y, renderer.canvas.width, renderer.canvas.height);
            
            // Only render particles that are on screen
            if (screenX >= -5 && screenX <= renderer.canvas.width + 5 && 
                screenY >= -5 && screenY <= renderer.canvas.height + 5) {
                
                const alpha = Math.floor(particle.alpha * 255).toString(16).padStart(2, '0');
                const color = particle.color + alpha;
                
                // Use the particle's size for rendering
                renderer.drawPixel(screenX, screenY, color, particle.size);
            }
        }
    }
}

// Export for use in other modules
window.Ship = Ship;
window.ThrusterParticles = ThrusterParticles;
window.StarParticles = StarParticles;