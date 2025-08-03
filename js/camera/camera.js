class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        
        // Physics properties
        this.velocityX = 0;
        this.velocityY = 0;
        this.acceleration = 200; // Thrust power (pixels/sec^2)
        this.maxSpeed = 150; // Maximum velocity (pixels/sec) - increased for faster exploration
        this.friction = 0.9999; // Nearly 0% friction for true space coasting
        this.coastingFriction = 1.0; // No friction when coasting
        
        // Coasting state
        this.isCoasting = false;
        
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

        // Detect coasting state (not actively controlling)
        this.isCoasting = !isBraking && !isThrusting;
        
        // Simple auto-braking for all celestial objects when coasting
        if (this.isCoasting) {
            for (const obj of celestialObjects) {
                const distance = obj.distanceToShip(this);
                const brakeDistance = obj.discoveryDistance + 40; // Start braking closer for natural approach
                
                if (distance < brakeDistance) {
                    const currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
                    if (currentSpeed > 35) { // Only brake if moving fairly fast
                        // Simple braking - slow down in the direction opposite to velocity
                        const brakeIntensity = Math.min(1.0, (brakeDistance - distance) / brakeDistance);
                        thrustX = -this.velocityX / currentSpeed;
                        thrustY = -this.velocityY / currentSpeed;
                        thrustIntensity = brakeIntensity * 2.0; // Smoother auto-braking
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

        // Apply friction - no friction when coasting, minimal when actively controlling
        const activeFriction = this.isCoasting ? this.coastingFriction : this.friction;
        this.velocityX *= activeFriction;
        this.velocityY *= activeFriction;

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

// Export for use in other modules
window.Camera = Camera;