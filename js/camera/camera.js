class Camera {
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
        this.distanceScale = 10000; // 1 pixel = 10,0000 meters (10 km) - each displayed km represents 10 km
        
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
            // Check for mouse/touch input (but not if stellar map is actively panning)
            const mapIsPanning = stellarMap && stellarMap.isCurrentlyPanning && stellarMap.isCurrentlyPanning();
            const mouseDirection = input.getMouseDirection(canvasWidth, canvasHeight);
            if (mouseDirection && !mapIsPanning) {
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
                // Use separate braking distance for stars, or fall back to discovery distance + 40 for other objects
                const brakeDistance = obj.brakingDistance ? obj.brakingDistance + 40 : obj.discoveryDistance + 40;
                
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
        const deltaX = this.velocityX * deltaTime;
        const deltaY = this.velocityY * deltaTime;
        this.x += deltaX;
        this.y += deltaY;
        
        // Track distance traveled (both session and lifetime)
        const distanceMoved = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        this.totalDistanceTraveled += distanceMoved;
        this.sessionDistanceTraveled += distanceMoved;

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

    // Distance tracking and conversion methods
    getFormattedDistance() {
        // Convert pixels to kilometers directly (1 pixel = 1 km now) - using session distance
        const kilometers = this.sessionDistanceTraveled * this.distanceScale / 1000;
        
        // Convert to AU (1 AU ≈ 149.6 million km)
        const au = kilometers / 149597870.7;
        
        if (au < 0.5) {
            // Show in whole kilometers with comma separators
            return `${Math.round(kilometers).toLocaleString()} km`;
        } else if (au < 50) {
            // Show in AU with hundredths precision
            return `${Math.round(au * 100) / 100} AU`;
        } else {
            // Convert to light years (1 ly ≈ 9.461 trillion km)
            const lightYears = kilometers / 9461000000000;
            return `${Math.round(lightYears * 100) / 100} ly`;
        }
    }

    // Get formatted lifetime distance for console logging
    getFormattedLifetimeDistance() {
        // Convert pixels to kilometers directly (1 pixel = 1 km now) - using lifetime distance
        const kilometers = this.totalDistanceTraveled * this.distanceScale / 1000;
        
        // Convert to AU (1 AU ≈ 149.6 million km)
        const au = kilometers / 149597870.7;
        
        if (au < 0.5) {
            // Show in whole kilometers with comma separators
            return `${Math.round(kilometers).toLocaleString()} km`;
        } else if (au < 50) {
            // Show in AU with hundredths precision
            return `${Math.round(au * 100) / 100} AU`;
        } else {
            // Convert to light years (1 ly ≈ 9.461 trillion km)
            const lightYears = kilometers / 9461000000000;
            return `${Math.round(lightYears * 100) / 100} ly`;
        }
    }

    // Get current speed in pixels per second
    getCurrentSpeed() {
        return Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
    }

    // Get formatted speed for display
    getFormattedSpeed() {
        // Convert pixels/second to km using same scale as distance, but show per second for reasonable values
        const speedPixelsPerSecond = this.getCurrentSpeed();
        const kmPerSecond = speedPixelsPerSecond * (this.distanceScale / 1000); // Convert to km/s
        
        // Convert to different units based on magnitude
        if (kmPerSecond < 1) {
            // Show in km/h for very slow speeds
            const kmPerHour = kmPerSecond * 3600;
            if (kmPerHour < 1) {
                return `${Math.round(kmPerHour * 10) / 10} km/h`;
            } else {
                return `${Math.round(kmPerHour).toLocaleString()} km/h`;
            }
        } else if (kmPerSecond < 100000) {
            // Show in km/s for moderate to high speeds
            return `${Math.round(kmPerSecond * 10) / 10} km/s`;
        } else {
            // For very high speeds, show in AU/s
            const auPerSecond = kmPerSecond / 149597870.7;
            if (auPerSecond < 1) {
                return `${Math.round(auPerSecond * 1000000) / 1000000} AU/s`;
            } else {
                return `${Math.round(auPerSecond * 100) / 100} AU/s`;
            }
        }
    }

    saveDistanceTraveled() {
        try {
            // Save lifetime distance with new key name
            localStorage.setItem('astralSurveyor_lifetimeDistance', this.totalDistanceTraveled.toString());
        } catch (error) {
            console.warn('Could not save lifetime distance:', error);
        }
    }

    loadDistanceTraveled() {
        try {
            // Try to load from new lifetime distance key first
            let saved = localStorage.getItem('astralSurveyor_lifetimeDistance');
            let isLegacyData = false;
            
            // If not found, try legacy key for backward compatibility
            if (saved === null) {
                saved = localStorage.getItem('astralSurveyor_distanceTraveled');
                isLegacyData = true;
            }
            
            if (saved !== null) {
                const savedDistance = parseFloat(saved) || 0;
                
                // Handle legacy data conversion
                if (isLegacyData) {
                    const scaleVersion = localStorage.getItem('astralSurveyor_distanceScale');
                    
                    // Check if this is old data with the previous scale (100m/pixel)
                    if (scaleVersion !== '1000') {
                        // Convert old distance from 100m/pixel scale to new 1000m/pixel scale
                        this.totalDistanceTraveled = savedDistance * 0.1;
                    } else {
                        this.totalDistanceTraveled = savedDistance;
                    }
                    
                    // Migrate to new storage key and clean up old keys
                    this.saveDistanceTraveled();
                    localStorage.removeItem('astralSurveyor_distanceTraveled');
                    localStorage.removeItem('astralSurveyor_distanceScale');
                } else {
                    // Normal loading from new key
                    this.totalDistanceTraveled = savedDistance;
                }
            }
            
            // Session distance always starts at 0
            this.sessionDistanceTraveled = 0;
            
        } catch (error) {
            console.warn('Could not load lifetime distance:', error);
        }
    }
}

// Export for use in other modules
window.Camera = Camera;