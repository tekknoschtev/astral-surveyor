// Simple game classes
class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        if (!this.ctx) {
            throw new Error('Could not get 2D rendering context');
        }
        this.ctx.imageSmoothingEnabled = false;
    }

    clear() {
        this.ctx.fillStyle = '#000511';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawPixel(x, y, color, size = 1) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
    }

    drawCircle(x, y, radius, color) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(Math.floor(x), Math.floor(y), radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawSprite(x, y, pixels, scale = 1, rotation = 0) {
        if (rotation === 0) {
            // Fast path for no rotation
            for (let row = 0; row < pixels.length; row++) {
                for (let col = 0; col < pixels[row].length; col++) {
                    const pixel = pixels[row][col];
                    if (pixel !== ' ') {
                        this.drawPixel(
                            x + col * scale, 
                            y + row * scale, 
                            pixel, 
                            scale
                        );
                    }
                }
            }
        } else {
            // Rotation path using canvas transforms
            const width = pixels[0].length * scale;
            const height = pixels.length * scale;
            const centerX = x + width / 2;
            const centerY = y + height / 2;

            this.ctx.save();
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(rotation);
            this.ctx.translate(-width / 2, -height / 2);

            for (let row = 0; row < pixels.length; row++) {
                for (let col = 0; col < pixels[row].length; col++) {
                    const pixel = pixels[row][col];
                    if (pixel !== ' ') {
                        this.ctx.fillStyle = pixel;
                        this.ctx.fillRect(col * scale, row * scale, scale, scale);
                    }
                }
            }

            this.ctx.restore();
        }
    }
}

class Input {
    constructor() {
        this.keys = new Set();
        this.keyHoldTimes = new Map(); // Track how long keys have been held
        this.mousePressed = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Keyboard events
        window.addEventListener('keydown', (e) => {
            if (!this.keys.has(e.code)) {
                this.keys.add(e.code);
                this.keyHoldTimes.set(e.code, 0); // Start tracking hold time
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys.delete(e.code);
            this.keyHoldTimes.delete(e.code);
        });

        // Mouse events
        window.addEventListener('mousedown', (e) => {
            this.mousePressed = true;
            this.updateMousePosition(e.clientX, e.clientY);
        });

        window.addEventListener('mouseup', () => {
            this.mousePressed = false;
        });

        window.addEventListener('mousemove', (e) => {
            this.updateMousePosition(e.clientX, e.clientY);
        });

        // Touch events for mobile
        window.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.mousePressed = true;
            const touch = e.touches[0];
            this.updateMousePosition(touch.clientX, touch.clientY);
        });

        window.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.mousePressed = false;
        });

        window.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.updateMousePosition(touch.clientX, touch.clientY);
        });
    }

    updateMousePosition(clientX, clientY) {
        this.mouseX = clientX;
        this.mouseY = clientY;
    }

    update(deltaTime) {
        // Update key hold times
        for (const [key, holdTime] of this.keyHoldTimes) {
            this.keyHoldTimes.set(key, holdTime + deltaTime);
        }
    }

    isPressed(key) {
        return this.keys.has(key);
    }

    getKeyHoldTime(key) {
        return this.keyHoldTimes.get(key) || 0;
    }

    // Variable thrust intensity based on hold duration
    getThrustIntensity(key) {
        if (!this.isPressed(key)) return 0;
        const holdTime = this.getKeyHoldTime(key);
        // Ramp up from 0.3 to 1.0 over 1 second
        return Math.min(0.3 + (holdTime * 0.7), 1.0);
    }

    get moveLeft() {
        return this.isPressed('KeyA') || this.isPressed('ArrowLeft');
    }

    get moveRight() {
        return this.isPressed('KeyD') || this.isPressed('ArrowRight');
    }

    get moveUp() {
        return this.isPressed('KeyW') || this.isPressed('ArrowUp');
    }

    get moveDown() {
        return this.isPressed('KeyS') || this.isPressed('ArrowDown');
    }

    get leftIntensity() {
        return Math.max(
            this.getThrustIntensity('KeyA'),
            this.getThrustIntensity('ArrowLeft')
        );
    }

    get rightIntensity() {
        return Math.max(
            this.getThrustIntensity('KeyD'),
            this.getThrustIntensity('ArrowRight')
        );
    }

    get upIntensity() {
        return Math.max(
            this.getThrustIntensity('KeyW'),
            this.getThrustIntensity('ArrowUp')
        );
    }

    get downIntensity() {
        return Math.max(
            this.getThrustIntensity('KeyS'),
            this.getThrustIntensity('ArrowDown')
        );
    }

    // Mouse/touch input for direction
    getMouseDirection(canvasWidth, canvasHeight) {
        if (!this.mousePressed) return null;
        
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const dx = this.mouseX - centerX;
        const dy = this.mouseY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Only thrust if mouse is away from center (deadzone of 20px)
        if (distance < 20) return null;
        
        // Normalize direction and calculate intensity based on distance
        const maxDistance = Math.min(canvasWidth, canvasHeight) / 3; // Max thrust at 1/3 screen distance
        const intensity = Math.min(distance / maxDistance, 1.0);
        
        return {
            x: dx / distance,
            y: dy / distance,
            intensity: intensity
        };
    }
}

class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        
        // Physics properties
        this.velocityX = 0;
        this.velocityY = 0;
        this.acceleration = 200; // Thrust power (pixels/sec^2)
        this.maxSpeed = 150; // Maximum velocity (pixels/sec)
        this.friction = 0.998; // Minimal space friction (0-1, closer to 1 = less friction)
        
        // Rotation properties
        this.rotation = 0; // Current rotation in radians
        this.targetRotation = 0; // Target rotation based on movement
        this.rotationSpeed = 8; // How fast to rotate (radians per second)
    }

    update(input, deltaTime, canvasWidth, canvasHeight) {
        // Calculate thrust direction and intensity
        let thrustX = 0;
        let thrustY = 0;
        let isThrusting = false;
        let thrustIntensity = 1.0;

        // Check for mouse/touch input first
        const mouseDirection = input.getMouseDirection(canvasWidth, canvasHeight);
        if (mouseDirection) {
            thrustX = mouseDirection.x;
            thrustY = mouseDirection.y;
            thrustIntensity = mouseDirection.intensity;
            isThrusting = true;
        } else {
            // Fall back to keyboard input with variable intensity
            if (input.moveLeft) { 
                thrustX -= input.leftIntensity; 
                isThrusting = true; 
            }
            if (input.moveRight) { 
                thrustX += input.rightIntensity; 
                isThrusting = true; 
            }
            if (input.moveUp) { 
                thrustY -= input.upIntensity; 
                isThrusting = true; 
            }
            if (input.moveDown) { 
                thrustY += input.downIntensity; 
                isThrusting = true; 
            }

            // For keyboard, calculate average intensity
            if (isThrusting) {
                const intensities = [];
                if (input.moveLeft) intensities.push(input.leftIntensity);
                if (input.moveRight) intensities.push(input.rightIntensity);
                if (input.moveUp) intensities.push(input.upIntensity);
                if (input.moveDown) intensities.push(input.downIntensity);
                thrustIntensity = intensities.reduce((sum, i) => sum + i, 0) / intensities.length;
            }

            // Normalize thrust vector for diagonal movement
            if (thrustX !== 0 && thrustY !== 0) {
                const length = Math.sqrt(thrustX * thrustX + thrustY * thrustY);
                thrustX /= length;
                thrustY /= length;
            }
        }

        // Apply acceleration with variable intensity
        if (isThrusting) {
            this.velocityX += thrustX * this.acceleration * thrustIntensity * deltaTime;
            this.velocityY += thrustY * this.acceleration * thrustIntensity * deltaTime;
            
            // Calculate target rotation based on thrust direction
            this.targetRotation = Math.atan2(thrustY, thrustX) + Math.PI / 2;
        }

        // Apply speed limit
        const currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        if (currentSpeed > this.maxSpeed) {
            this.velocityX = (this.velocityX / currentSpeed) * this.maxSpeed;
            this.velocityY = (this.velocityY / currentSpeed) * this.maxSpeed;
        }

        // Apply friction (space drag for chill gameplay)
        this.velocityX *= this.friction;
        this.velocityY *= this.friction;

        // Update position based on velocity
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;

        // Smoothly rotate towards target rotation
        this.smoothRotate(deltaTime);
        
        // Store thrust state for particle system
        this.isThrusting = isThrusting;
        this.thrustDirection = { x: thrustX, y: thrustY };
    }

    smoothRotate(deltaTime) {
        // Calculate the shortest rotation direction
        let rotationDiff = this.targetRotation - this.rotation;
        
        // Normalize to -π to π range
        while (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
        while (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;

        // Apply rotation smoothing
        const maxRotation = this.rotationSpeed * deltaTime;
        if (Math.abs(rotationDiff) < maxRotation) {
            this.rotation = this.targetRotation;
        } else {
            this.rotation += Math.sign(rotationDiff) * maxRotation;
        }
    }

    worldToScreen(worldX, worldY, canvasWidth, canvasHeight) {
        const screenX = worldX - this.x + canvasWidth / 2;
        const screenY = worldY - this.y + canvasHeight / 2;
        return [screenX, screenY];
    }
}

class StarField {
    constructor() {
        this.stars = [];
        this.starCount = 500;
        this.viewDistance = 2000;
        this.generateStars();
    }

    generateStars() {
        const colors = ['#ffffff', '#ffddaa', '#aaddff', '#ffaa88', '#88aaff'];

        for (let i = 0; i < this.starCount; i++) {
            this.stars.push({
                x: (Math.random() - 0.5) * this.viewDistance * 4,
                y: (Math.random() - 0.5) * this.viewDistance * 4,
                brightness: Math.random() * 0.8 + 0.2,
                size: Math.random() > 0.9 ? 2 : 1,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }
    }

    render(renderer, camera) {
        const { canvas } = renderer;
        
        for (const star of this.stars) {
            const [screenX, screenY] = camera.worldToScreen(star.x, star.y, canvas.width, canvas.height);
            
            if (screenX >= -10 && screenX <= canvas.width + 10 && 
                screenY >= -10 && screenY <= canvas.height + 10) {
                
                const alpha = Math.floor(star.brightness * 255).toString(16).padStart(2, '0');
                const colorWithAlpha = star.color + alpha;
                
                if (star.size > 1) {
                    renderer.drawCircle(screenX, screenY, star.size, colorWithAlpha);
                } else {
                    renderer.drawPixel(screenX, screenY, colorWithAlpha);
                }
            }
        }
    }
}

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

            // Spawn particle
            this.particles.push({
                x: thrusterX,
                y: thrusterY,
                velocityX: -camera.thrustDirection.x * 80 + (Math.random() - 0.5) * 40,
                velocityY: -camera.thrustDirection.y * 80 + (Math.random() - 0.5) * 40,
                life: 0.5 + Math.random() * 0.3,
                maxLife: 0.8,
                alpha: 1.0,
                color: Math.random() > 0.7 ? '#00ffaa' : '#00ff88'
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

class Game {
    constructor(canvas) {
        this.renderer = new Renderer(canvas);
        this.input = new Input();
        this.camera = new Camera();
        this.starField = new StarField();
        this.ship = new Ship();
        this.thrusterParticles = new ThrusterParticles();
        this.lastTime = 0;
        this.animationId = 0;
        
        this.setupCanvas();
    }

    setupCanvas() {
        this.renderer.canvas.width = window.innerWidth;
        this.renderer.canvas.height = window.innerHeight;
        
        window.addEventListener('resize', () => {
            this.renderer.canvas.width = window.innerWidth;
            this.renderer.canvas.height = window.innerHeight;
        });
    }

    start() {
        this.gameLoop(0);
    }

    gameLoop = (currentTime) => {
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();

        this.animationId = requestAnimationFrame(this.gameLoop);
    };

    update(deltaTime) {
        this.input.update(deltaTime);
        this.camera.update(this.input, deltaTime, this.renderer.canvas.width, this.renderer.canvas.height);
        this.thrusterParticles.update(deltaTime, this.camera, this.ship);
    }

    render() {
        this.renderer.clear();
        this.starField.render(this.renderer, this.camera);
        this.thrusterParticles.render(this.renderer);
        this.ship.render(this.renderer, this.camera.rotation);
    }
}

// Initialize the game
window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const game = new Game(canvas);
    game.start();
});