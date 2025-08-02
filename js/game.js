// Simple game classes

// Deterministic random number generator for consistent world generation
class SeededRandom {
    constructor(seed) {
        this.seed = seed % 2147483647;
        if (this.seed <= 0) this.seed += 2147483646;
    }

    next() {
        this.seed = (this.seed * 16807) % 2147483647;
        return (this.seed - 1) / 2147483646;
    }

    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    nextFloat(min, max) {
        return this.next() * (max - min) + min;
    }

    choice(array) {
        return array[this.nextInt(0, array.length - 1)];
    }
}

// Global universe seed for consistent world generation
let UNIVERSE_SEED = 0;

// Hash function for deterministic position-based seeds
function hashPosition(x, y) {
    const chunkX = Math.floor(x / 1000);
    const chunkY = Math.floor(y / 1000);
    
    // Combine universe seed with chunk coordinates for unique but consistent generation
    let hash = UNIVERSE_SEED;
    const str = `${chunkX},${chunkY}`;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

// Get seed from URL parameter or generate random one
function initializeUniverseSeed() {
    const urlParams = new URLSearchParams(window.location.search);
    const seedParam = urlParams.get('seed');
    
    if (seedParam) {
        // Use seed from URL
        UNIVERSE_SEED = parseInt(seedParam, 10);
        if (isNaN(UNIVERSE_SEED)) {
            // If invalid seed, use hash of the string
            UNIVERSE_SEED = 0;
            for (let i = 0; i < seedParam.length; i++) {
                const char = seedParam.charCodeAt(i);
                UNIVERSE_SEED = ((UNIVERSE_SEED << 5) - UNIVERSE_SEED) + char;
                UNIVERSE_SEED = UNIVERSE_SEED & UNIVERSE_SEED;
            }
            UNIVERSE_SEED = Math.abs(UNIVERSE_SEED);
        }
        console.log(`🌌 Universe loaded from seed: ${UNIVERSE_SEED} (from URL parameter)`);
    } else {
        // Generate random seed
        UNIVERSE_SEED = Math.floor(Math.random() * 2147483647);
        console.log(`🌌 Universe generated with seed: ${UNIVERSE_SEED}`);
    }
    
    console.log(`🔗 Share this universe: ${window.location.origin}${window.location.pathname}?seed=${UNIVERSE_SEED}`);
    return UNIVERSE_SEED;
}

// Chunk-based world management for infinite generation
class ChunkManager {
    constructor() {
        this.chunkSize = 1000; // 1000x1000 pixel chunks
        this.loadRadius = 1; // Load chunks in 3x3 grid around player
        this.activeChunks = new Map(); // Key: "x,y", Value: chunk data
        this.discoveredObjects = new Map(); // Key: "objId", Value: discovery state
    }

    getChunkCoords(worldX, worldY) {
        return {
            x: Math.floor(worldX / this.chunkSize),
            y: Math.floor(worldY / this.chunkSize)
        };
    }

    getChunkKey(chunkX, chunkY) {
        return `${chunkX},${chunkY}`;
    }

    getObjectId(x, y, type) {
        return `${type}_${Math.floor(x)}_${Math.floor(y)}`;
    }

    generateChunk(chunkX, chunkY) {
        const chunkKey = this.getChunkKey(chunkX, chunkY);
        if (this.activeChunks.has(chunkKey)) {
            return this.activeChunks.get(chunkKey);
        }

        const chunk = {
            x: chunkX,
            y: chunkY,
            stars: [],
            planets: []
        };

        // Generate stars for this chunk
        const starSeed = hashPosition(chunkX * this.chunkSize, chunkY * this.chunkSize) + 1;
        const starRng = new SeededRandom(starSeed);
        const starCount = starRng.nextInt(40, 80); // 40-80 stars per chunk

        for (let i = 0; i < starCount; i++) {
            const x = chunkX * this.chunkSize + starRng.nextFloat(0, this.chunkSize);
            const y = chunkY * this.chunkSize + starRng.nextFloat(0, this.chunkSize);
            
            chunk.stars.push({
                x: x,
                y: y,
                brightness: starRng.nextFloat(0.2, 1.0),
                size: starRng.next() > 0.9 ? 2 : 1,
                color: starRng.choice(['#ffffff', '#ffddaa', '#aaddff', '#ffaa88', '#88aaff'])
            });
        }

        // Generate planets for this chunk (rarer than stars)
        const planetSeed = hashPosition(chunkX * this.chunkSize, chunkY * this.chunkSize) + 2;
        const planetRng = new SeededRandom(planetSeed);
        const planetCount = planetRng.nextInt(0, 3); // 0-3 planets per chunk

        for (let i = 0; i < planetCount; i++) {
            const x = chunkX * this.chunkSize + planetRng.nextFloat(100, this.chunkSize - 100);
            const y = chunkY * this.chunkSize + planetRng.nextFloat(100, this.chunkSize - 100);
            
            const planet = new Planet(x, y);
            // Ensure planet uses the seeded random for consistent properties
            planet.initWithSeed(planetRng);
            
            chunk.planets.push(planet);
        }

        this.activeChunks.set(chunkKey, chunk);
        return chunk;
    }

    updateActiveChunks(playerX, playerY) {
        const playerChunk = this.getChunkCoords(playerX, playerY);
        const requiredChunks = new Set();

        // Determine which chunks should be loaded
        for (let dx = -this.loadRadius; dx <= this.loadRadius; dx++) {
            for (let dy = -this.loadRadius; dy <= this.loadRadius; dy++) {
                const chunkX = playerChunk.x + dx;
                const chunkY = playerChunk.y + dy;
                const chunkKey = this.getChunkKey(chunkX, chunkY);
                requiredChunks.add(chunkKey);
                
                // Generate chunk if it doesn't exist
                this.generateChunk(chunkX, chunkY);
            }
        }

        // Unload distant chunks to save memory
        for (const [chunkKey] of this.activeChunks) {
            if (!requiredChunks.has(chunkKey)) {
                this.activeChunks.delete(chunkKey);
            }
        }
    }

    getAllActiveObjects() {
        const objects = { stars: [], planets: [] };
        
        for (const chunk of this.activeChunks.values()) {
            objects.stars.push(...chunk.stars);
            objects.planets.push(...chunk.planets);
        }

        return objects;
    }

    markObjectDiscovered(object) {
        const objId = this.getObjectId(object.x, object.y, object.type);
        this.discoveredObjects.set(objId, {
            discovered: true,
            timestamp: Date.now()
        });
        object.discovered = true;
    }

    isObjectDiscovered(object) {
        const objId = this.getObjectId(object.x, object.y, object.type);
        return this.discoveredObjects.has(objId);
    }

    restoreDiscoveryState(objects) {
        for (const obj of objects) {
            if (this.isObjectDiscovered(obj)) {
                obj.discovered = true;
            }
        }
    }
}

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
        this.rightMousePressed = false;
        this.touchStartTime = null;
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


        window.addEventListener('mousemove', (e) => {
            this.updateMousePosition(e.clientX, e.clientY);
        });

        // Mouse brake (right-click)
        window.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Prevent context menu
        });

        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click
                this.mousePressed = true;
                this.rightMousePressed = false;
            } else if (e.button === 2) { // Right click
                this.rightMousePressed = true;
                this.mousePressed = false;
            }
            this.updateMousePosition(e.clientX, e.clientY);
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.mousePressed = false;
            } else if (e.button === 2) {
                this.rightMousePressed = false;
            }
        });

        // Touch events for mobile
        window.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                this.mousePressed = true;
                this.rightMousePressed = false;
                this.touchStartTime = Date.now();
            }
            const touch = e.touches[0];
            this.updateMousePosition(touch.clientX, touch.clientY);
        });

        window.addEventListener('touchend', (e) => {
            e.preventDefault();
            // Check for long press (brake)
            if (this.touchStartTime && Date.now() - this.touchStartTime > 500) {
                this.rightMousePressed = false;
            }
            this.mousePressed = false;
            this.touchStartTime = null;
        });

        window.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.updateMousePosition(touch.clientX, touch.clientY);
            
            // Convert long press to brake
            if (this.touchStartTime && Date.now() - this.touchStartTime > 500) {
                this.mousePressed = false;
                this.rightMousePressed = true;
            }
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

    get isBraking() {
        return this.isPressed('Space');
    }

    get brakingIntensity() {
        return this.getThrustIntensity('Space');
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

    // Mouse/touch braking input
    getMouseBrake(canvasWidth, canvasHeight) {
        if (!this.rightMousePressed) return null;
        
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const dx = this.mouseX - centerX;
        const dy = this.mouseY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Brake toward mouse position or just brake in place if close to center
        if (distance < 20) {
            return { mode: 'stop' }; // Stop in place
        } else {
            return { 
                mode: 'toward',
                x: dx / distance,
                y: dy / distance,
                intensity: Math.min(distance / (Math.min(canvasWidth, canvasHeight) / 3), 1.0)
            };
        }
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

    update(input, deltaTime, canvasWidth, canvasHeight, celestialObjects = []) {
        // Calculate thrust direction and intensity
        let thrustX = 0;
        let thrustY = 0;
        let isThrusting = false;
        let isBraking = false;
        let thrustIntensity = 1.0;

        // Check for braking input first
        const mouseBrake = input.getMouseBrake(canvasWidth, canvasHeight);
        if (mouseBrake) {
            isBraking = true;
            if (mouseBrake.mode === 'stop') {
                // Brake directly opposite to current velocity
                const currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
                if (currentSpeed > 0) {
                    thrustX = -this.velocityX / currentSpeed;
                    thrustY = -this.velocityY / currentSpeed;
                    thrustIntensity = 2.0; // Extra strong braking
                }
            } else {
                // Brake toward target position
                thrustX = mouseBrake.x;
                thrustY = mouseBrake.y;
                thrustIntensity = mouseBrake.intensity * 1.5; // Stronger for braking
            }
        } else if (input.isBraking) {
            // Keyboard braking (spacebar)
            isBraking = true;
            const currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
            if (currentSpeed > 0) {
                thrustX = -this.velocityX / currentSpeed;
                thrustY = -this.velocityY / currentSpeed;
                thrustIntensity = input.brakingIntensity * 2.0; // Strong braking
            }
        } else {
            // Check for mouse/touch input
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
        }

        // Auto-brake near celestial objects (more aggressive)
        if (!isBraking && !isThrusting) {
            for (const obj of celestialObjects) {
                const distance = obj.distanceToShip(this);
                const brakeDistance = obj.discoveryDistance + 80; // Start braking earlier
                
                if (distance < brakeDistance) {
                    const currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
                    if (currentSpeed > 20) { // Only brake if moving fast enough
                        const brakeIntensity = Math.min(1.0, (brakeDistance - distance) / brakeDistance);
                        thrustX = -this.velocityX / currentSpeed;
                        thrustY = -this.velocityY / currentSpeed;
                        thrustIntensity = brakeIntensity * 3.0; // Very aggressive auto-braking
                        isBraking = true;
                        break; // Only brake for the closest object
                    }
                }
            }
        }

        // Apply acceleration with variable intensity
        if (isThrusting || isBraking) {
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
        this.isThrusting = isThrusting || isBraking;
        this.isBraking = isBraking;
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

// Infinite starfield using chunk-based generation
class InfiniteStarField {
    constructor(chunkManager) {
        this.chunkManager = chunkManager;
    }

    render(renderer, camera) {
        const { canvas } = renderer;
        const activeObjects = this.chunkManager.getAllActiveObjects();
        
        for (const star of activeObjects.stars) {
            const [screenX, screenY] = camera.worldToScreen(star.x, star.y, canvas.width, canvas.height);
            
            // Only render stars that are on screen (with some margin)
            if (screenX >= -10 && screenX <= canvas.width + 10 && 
                screenY >= -10 && screenY <= canvas.height + 10) {
                
                // Calculate alpha based on brightness
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

class Game {
    constructor(canvas) {
        this.renderer = new Renderer(canvas);
        this.input = new Input();
        this.camera = new Camera();
        this.chunkManager = new ChunkManager();
        this.starField = new InfiniteStarField(this.chunkManager);
        this.ship = new Ship();
        this.thrusterParticles = new ThrusterParticles();
        this.lastTime = 0;
        this.animationId = 0;
        
        this.setupCanvas();
        
        // Initialize chunks around starting position
        this.chunkManager.updateActiveChunks(0, 0);
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
        
        // Update chunk loading based on camera position
        this.chunkManager.updateActiveChunks(this.camera.x, this.camera.y);
        
        // Get active celestial objects for physics and discovery
        const activeObjects = this.chunkManager.getAllActiveObjects();
        const celestialObjects = activeObjects.planets;
        
        // Restore discovery state for newly loaded objects
        this.chunkManager.restoreDiscoveryState(celestialObjects);
        
        this.camera.update(this.input, deltaTime, this.renderer.canvas.width, this.renderer.canvas.height, celestialObjects);
        this.thrusterParticles.update(deltaTime, this.camera, this.ship);
        
        // Check for discoveries
        for (const obj of celestialObjects) {
            if (obj.checkDiscovery(this.camera)) {
                console.log(`Discovered a ${obj.type}!`); // Simple discovery feedback for now
                this.chunkManager.markObjectDiscovered(obj);
            }
        }
    }

    render() {
        this.renderer.clear();
        this.starField.render(this.renderer, this.camera);
        
        // Render celestial objects from active chunks
        const activeObjects = this.chunkManager.getAllActiveObjects();
        for (const obj of activeObjects.planets) {
            obj.render(this.renderer, this.camera);
        }
        
        this.thrusterParticles.render(this.renderer);
        this.ship.render(this.renderer, this.camera.rotation);
    }
}

// Initialize the game
window.addEventListener('DOMContentLoaded', () => {
    // Initialize universe seed before creating the game
    initializeUniverseSeed();
    
    const canvas = document.getElementById('gameCanvas');
    const game = new Game(canvas);
    game.start();
});