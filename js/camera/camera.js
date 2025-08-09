export class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        // Physics properties
        this.velocityX = 0;
        this.velocityY = 0;
        this.acceleration = 50; // Thrust power (pixels/sec^2) - reduced for more gradual acceleration
        this.maxSpeed = 150; // Maximum velocity (pixels/sec) - increased for faster exploration
        this.friction = 0.9999; // Nearly 0% friction for true space coasting
        this.coastingFriction = 1.0; // No friction when coasting
        // Coasting state
        this.isCoasting = false;
        // Rotation properties
        this.rotation = 0; // Current rotation in radians
        this.targetRotation = 0; // Target rotation based on movement
        this.rotationSpeed = 8; // How fast to rotate (radians per second)
        // Distance tracking
        this.totalDistanceTraveled = 0; // Lifetime distance traveled in pixels
        this.sessionDistanceTraveled = 0; // Per-universe distance traveled in pixels
        this.distanceScale = 10000; // 1 pixel = 10,000 meters (10 km) - each displayed km represents 10 km
        // Load saved lifetime distance
        this.loadDistanceTraveled();
    }
    update(input, deltaTime, canvasWidth, canvasHeight, celestialObjects = [], stellarMap = null) {
        // Calculate thrust direction and intensity
        let thrustX = 0;
        let thrustY = 0;
        let isThrusting = false;
        let isBraking = false;
        let thrustIntensity = 1.0;
        // Check for braking input first (both mouse and touch)
        const mouseBrake = input.getMouseBrake(canvasWidth, canvasHeight);
        const touchBrake = input.getTouchBrake(canvasWidth, canvasHeight);
        const brake = mouseBrake || touchBrake;
        if (brake) {
            isBraking = true;
            if (brake.mode === 'stop') {
                // Brake directly opposite to current velocity
                const currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
                if (currentSpeed > 0) {
                    thrustX = -this.velocityX / currentSpeed;
                    thrustY = -this.velocityY / currentSpeed;
                    thrustIntensity = 2.0; // Extra strong braking
                }
            }
            else if (brake.mode === 'directional') {
                // Directional braking
                thrustX = brake.x;
                thrustY = brake.y;
                thrustIntensity = brake.intensity * 1.5; // Slightly stronger
            }
        }
        // If not braking, check for movement input
        if (!isBraking) {
            // Keyboard movement
            if (input.isThrustPressed()) {
                isThrusting = true;
                thrustY = -1; // Forward
                thrustIntensity = input.getThrustIntensity('KeyW') || input.getThrustIntensity('ArrowUp') || input.getThrustIntensity('Space');
            }
            if (input.isLeftPressed()) {
                isThrusting = true;
                thrustX = -1; // Left
                const leftIntensity = input.getThrustIntensity('KeyA') || input.getThrustIntensity('ArrowLeft');
                if (thrustY !== 0) {
                    // Diagonal movement - normalize but keep intensity
                    const magnitude = Math.sqrt(thrustX * thrustX + thrustY * thrustY);
                    thrustX = (thrustX / magnitude) * Math.max(thrustIntensity, leftIntensity);
                    thrustY = (thrustY / magnitude) * Math.max(thrustIntensity, leftIntensity);
                    thrustIntensity = Math.max(thrustIntensity, leftIntensity);
                }
                else {
                    thrustIntensity = leftIntensity;
                }
            }
            if (input.isRightPressed()) {
                isThrusting = true;
                thrustX = 1; // Right
                const rightIntensity = input.getThrustIntensity('KeyD') || input.getThrustIntensity('ArrowRight');
                if (thrustY !== 0) {
                    // Diagonal movement - normalize but keep intensity
                    const magnitude = Math.sqrt(thrustX * thrustX + thrustY * thrustY);
                    thrustX = (thrustX / magnitude) * Math.max(thrustIntensity, rightIntensity);
                    thrustY = (thrustY / magnitude) * Math.max(thrustIntensity, rightIntensity);
                    thrustIntensity = Math.max(thrustIntensity, rightIntensity);
                }
                else {
                    thrustIntensity = rightIntensity;
                }
            }
            // Mouse/touch movement
            const mouseDirection = input.getMouseDirection(canvasWidth, canvasHeight);
            if (mouseDirection.intensity > 0) {
                isThrusting = true;
                thrustX = mouseDirection.x;
                thrustY = mouseDirection.y;
                thrustIntensity = mouseDirection.intensity;
            }
        }
        // Apply thrust or braking
        if (isThrusting || isBraking) {
            this.velocityX += thrustX * this.acceleration * thrustIntensity * deltaTime;
            this.velocityY += thrustY * this.acceleration * thrustIntensity * deltaTime;
            this.isCoasting = false;
            // Update target rotation based on thrust direction (for visual effect)
            if (thrustX !== 0 || thrustY !== 0) {
                this.targetRotation = Math.atan2(thrustY, thrustX) + Math.PI / 2;
            }
        }
        else {
            this.isCoasting = true;
        }
        // Apply speed limit
        const currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        if (currentSpeed > this.maxSpeed) {
            this.velocityX = (this.velocityX / currentSpeed) * this.maxSpeed;
            this.velocityY = (this.velocityY / currentSpeed) * this.maxSpeed;
        }
        // Apply friction (very minimal in space)
        const frictionToApply = this.isCoasting ? this.coastingFriction : this.friction;
        this.velocityX *= Math.pow(frictionToApply, deltaTime);
        this.velocityY *= Math.pow(frictionToApply, deltaTime);
        // Calculate distance traveled this frame
        const frameDistance = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY) * deltaTime;
        this.totalDistanceTraveled += frameDistance;
        this.sessionDistanceTraveled += frameDistance;
        // Update position
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
        // Update rotation with smooth interpolation
        this.smoothRotate(deltaTime);
    }
    smoothRotate(deltaTime) {
        // Smooth rotation interpolation
        let rotationDifference = this.targetRotation - this.rotation;
        // Handle angle wrapping (choose shortest rotation path)
        while (rotationDifference > Math.PI)
            rotationDifference -= 2 * Math.PI;
        while (rotationDifference < -Math.PI)
            rotationDifference += 2 * Math.PI;
        // Apply smooth rotation
        if (Math.abs(rotationDifference) > 0.01) {
            this.rotation += rotationDifference * this.rotationSpeed * deltaTime;
        }
        // Normalize rotation to [0, 2π]
        while (this.rotation < 0)
            this.rotation += 2 * Math.PI;
        while (this.rotation >= 2 * Math.PI)
            this.rotation -= 2 * Math.PI;
    }
    // Convert world coordinates to screen coordinates
    worldToScreen(worldX, worldY, canvasWidth, canvasHeight) {
        const screenX = (worldX - this.x) + canvasWidth / 2;
        const screenY = (worldY - this.y) + canvasHeight / 2;
        return [screenX, screenY];
    }
    // Get formatted distance for UI display
    getFormattedDistance() {
        const kilometers = this.sessionDistanceTraveled / this.distanceScale;
        if (kilometers < 1) {
            return `${Math.round(kilometers * 1000)} m`;
        }
        else if (kilometers < 1000) {
            return `${kilometers.toFixed(1)} km`;
        }
        else {
            return `${(kilometers / 1000).toFixed(1)} Mm`; // Megameters (1000 km)
        }
    }
    // Get formatted lifetime distance for UI display
    getFormattedLifetimeDistance() {
        const kilometers = this.totalDistanceTraveled / this.distanceScale;
        if (kilometers < 1) {
            return `${Math.round(kilometers * 1000)} m`;
        }
        else if (kilometers < 1000) {
            return `${kilometers.toFixed(1)} km`;
        }
        else if (kilometers < 1000000) {
            return `${(kilometers / 1000).toFixed(1)} Mm`; // Megameters
        }
        else {
            return `${(kilometers / 1000000).toFixed(2)} Gm`; // Gigameters
        }
    }
    // Get current speed in pixels per second
    getCurrentSpeed() {
        return Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
    }
    // Get formatted speed for UI display
    getFormattedSpeed() {
        const pixelsPerSecond = this.getCurrentSpeed();
        const kilometersPerSecond = pixelsPerSecond / this.distanceScale;
        if (kilometersPerSecond < 0.001) {
            return `${Math.round(kilometersPerSecond * 1000000)} mm/s`;
        }
        else if (kilometersPerSecond < 1) {
            return `${Math.round(kilometersPerSecond * 1000)} m/s`;
        }
        else if (kilometersPerSecond < 1000) {
            return `${kilometersPerSecond.toFixed(2)} km/s`;
        }
        else {
            return `${(kilometersPerSecond / 1000).toFixed(3)} Mm/s`;
        }
    }
    // Save distance to localStorage
    saveDistanceTraveled() {
        try {
            const gameData = {
                totalDistanceTraveled: this.totalDistanceTraveled,
                lastSaved: Date.now()
            };
            localStorage.setItem('astralSurveyor_gameData', JSON.stringify(gameData));
        }
        catch (error) {
            console.warn('Failed to save distance traveled:', error);
        }
    }
    // Load distance from localStorage
    loadDistanceTraveled() {
        try {
            const savedData = localStorage.getItem('astralSurveyor_gameData');
            if (savedData) {
                const gameData = JSON.parse(savedData);
                this.totalDistanceTraveled = gameData.totalDistanceTraveled || 0;
            }
        }
        catch (error) {
            console.warn('Failed to load distance traveled:', error);
            this.totalDistanceTraveled = 0;
        }
    }
    // Reset session distance (called when starting new universe)
    resetSessionDistance() {
        this.sessionDistanceTraveled = 0;
    }
    // Getters for external access
    getX() { return this.x; }
    getY() { return this.y; }
    getVelocityX() { return this.velocityX; }
    getVelocityY() { return this.velocityY; }
    getRotation() { return this.rotation; }
    isCurrentlyCoasting() { return this.isCoasting; }
    getTotalDistance() { return this.totalDistanceTraveled; }
    getSessionDistance() { return this.sessionDistanceTraveled; }
}
//# sourceMappingURL=camera.js.map