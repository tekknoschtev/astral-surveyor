// Import dependencies
import { Input } from '../input/input.js';

// Type definitions
interface CelestialObject {
    x: number;
    y: number;
    type: string;
    distanceToShip(camera: Camera): number;
    brakingDistance?: number;
    discoveryDistance: number;
}

interface StellarMap {
    isVisible(): boolean;
}

interface MouseBrakeResult {
    mode: 'stop' | 'directional';
    x: number;
    y: number;
    intensity: number;
}

// Extend Input interface for camera-specific methods
interface CameraInput extends Input {
    moveUp: boolean;
    moveDown: boolean;  
    moveLeft: boolean;
    moveRight: boolean;
    upIntensity: number;
    downIntensity: number;
    leftIntensity: number;
    rightIntensity: number;
    isBraking: boolean;
    brakingIntensity: number;
    getMouseBrake(canvasWidth: number, canvasHeight: number): MouseBrakeResult | null;
    getTouchBrake(canvasWidth: number, canvasHeight: number): MouseBrakeResult | null;
}

export class Camera {
    x = 0;
    y = 0;
    
    // Physics properties
    velocityX = 0;
    velocityY = 0;
    acceleration = 50; // Thrust power (pixels/sec^2) - reduced for more gradual acceleration
    maxSpeed = 150; // Maximum velocity (pixels/sec) - increased for faster exploration
    friction = 0.9999; // Nearly 0% friction for true space coasting
    coastingFriction = 1.0; // No friction when coasting
    
    // Coasting and thruster states
    isCoasting = false;
    isThrusting = false;
    isBraking = false;
    thrustDirection = { x: 0, y: -1 };
    
    // Rotation properties
    rotation = 0; // Current rotation in radians
    targetRotation = 0; // Target rotation based on movement
    rotationSpeed = 8; // How fast to rotate (radians per second)
    
    // Distance tracking
    totalDistanceTraveled = 0; // Lifetime distance traveled in pixels
    sessionDistanceTraveled = 0; // Per-universe distance traveled in pixels
    distanceScale = 10000; // 1 pixel = 10,000 meters (10 km) - each displayed km represents 10 km
    
    constructor() {
        // Load saved lifetime distance
        this.loadDistanceTraveled();
    }

    update(input: CameraInput, deltaTime: number, canvasWidth: number, canvasHeight: number, celestialObjects: any[] = [], stellarMap: StellarMap | null = null): void {
        // Movement logic restored from working version
        let thrustX = 0;
        let thrustY = 0;
        let isThrusting = false;
        let isBraking = input.isBraking || input.isRightPressed(); // Space bar OR right-click
        let thrustIntensity = 1.0;

        // Handle braking first - overrides movement
        if (isBraking) {
            // Brake opposite to current velocity direction  
            const currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
            if (currentSpeed > 0) {
                thrustX = -this.velocityX / currentSpeed;
                thrustY = -this.velocityY / currentSpeed;
                thrustIntensity = input.isBraking ? input.brakingIntensity : 1.0; // Use braking intensity if Space, default for right-click
            }
        } else {
            // Handle mouse/touch input first
            const mouseDirection = input.getMouseDirection(canvasWidth, canvasHeight);
            if (mouseDirection.intensity > 0) {
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

        // Update camera states for particle systems (after auto-braking logic)
        this.isThrusting = isThrusting;
        this.isBraking = isBraking;
        this.thrustDirection = { x: thrustX, y: thrustY };

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

    private smoothRotate(deltaTime: number): void {
        // Smooth rotation interpolation
        let rotationDifference = this.targetRotation - this.rotation;
        
        // Handle angle wrapping (choose shortest rotation path)
        while (rotationDifference > Math.PI) rotationDifference -= 2 * Math.PI;
        while (rotationDifference < -Math.PI) rotationDifference += 2 * Math.PI;
        
        // Apply smooth rotation
        if (Math.abs(rotationDifference) > 0.01) {
            this.rotation += rotationDifference * this.rotationSpeed * deltaTime;
        }
        
        // Normalize rotation to [0, 2π]
        while (this.rotation < 0) this.rotation += 2 * Math.PI;
        while (this.rotation >= 2 * Math.PI) this.rotation -= 2 * Math.PI;
    }

    // Convert world coordinates to screen coordinates
    worldToScreen(worldX: number, worldY: number, canvasWidth: number, canvasHeight: number): [number, number] {
        const screenX = (worldX - this.x) + canvasWidth / 2;
        const screenY = (worldY - this.y) + canvasHeight / 2;
        return [screenX, screenY];
    }

    // Get formatted distance for UI display
    getFormattedDistance(): string {
        const kilometers = this.sessionDistanceTraveled * (this.distanceScale / 1000);
        
        // Convert to AU (1 AU ≈ 149.6 million km)
        const au = kilometers / 149597870.7;
        
        if (au < 0.5) {
            return `${kilometers.toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})} km`;
        } else if (au < 1000) {
            return `${au.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} AU`;
        } else {
            return `${(au / 1000).toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})} kAU`;
        }
    }

    // Get formatted lifetime distance for UI display
    getFormattedLifetimeDistance(): string {
        const kilometers = this.totalDistanceTraveled * (this.distanceScale / 1000);
        
        // Convert to AU (1 AU ≈ 149.6 million km)
        const au = kilometers / 149597870.7;
        
        if (au < 0.5) {
            return `${kilometers.toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})} km`;
        } else if (au < 1000) {
            return `${au.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} AU`;
        } else if (au < 1000000) {
            return `${(au / 1000).toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})} kAU`;
        } else {
            return `${(au / 1000000).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} MAU`;
        }
    }

    // Get current speed in pixels per second
    getCurrentSpeed(): number {
        return Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
    }

    // Get formatted speed for UI display (restored from working version)
    getFormattedSpeed(): string {
        const speedPixelsPerSecond = this.getCurrentSpeed();
        const kmPerSecond = speedPixelsPerSecond * (this.distanceScale / 1000);
        
        // Convert to different units based on magnitude
        if (kmPerSecond < 1) {
            // Show in km/h for very slow speeds
            const kmPerHour = kmPerSecond * 3600;
            if (kmPerHour < 1) {
                return `${(Math.round(kmPerHour * 10) / 10).toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})} km/h`;
            } else {
                return `${Math.round(kmPerHour).toLocaleString('en-US')} km/h`;
            }
        } else if (kmPerSecond < 100000) {
            // Show in km/s for moderate to high speeds
            return `${(Math.round(kmPerSecond * 10) / 10).toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})} km/s`;
        } else {
            // For very high speeds, show in AU/s
            const auPerSecond = kmPerSecond / 149597870.7;
            if (auPerSecond < 1) {
                return `${(Math.round(auPerSecond * 1000000) / 1000000).toLocaleString('en-US', {minimumFractionDigits: 6, maximumFractionDigits: 6})} AU/s`;
            } else {
                return `${(Math.round(auPerSecond * 100) / 100).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} AU/s`;
            }
        }
    }

    // Save distance to localStorage
    saveDistanceTraveled(): void {
        try {
            const gameData = {
                totalDistanceTraveled: this.totalDistanceTraveled,
                lastSaved: Date.now()
            };
            localStorage.setItem('astralSurveyor_gameData', JSON.stringify(gameData));
        } catch (error) {
            console.warn('Failed to save distance traveled:', error);
        }
    }

    // Load distance from localStorage
    private loadDistanceTraveled(): void {
        try {
            const savedData = localStorage.getItem('astralSurveyor_gameData');
            if (savedData) {
                const gameData = JSON.parse(savedData);
                this.totalDistanceTraveled = gameData.totalDistanceTraveled || 0;
            }
        } catch (error) {
            console.warn('Failed to load distance traveled:', error);
            this.totalDistanceTraveled = 0;
        }
    }

    // Reset session distance (called when starting new universe)
    resetSessionDistance(): void {
        this.sessionDistanceTraveled = 0;
    }

    // Getters for external access
    getX(): number { return this.x; }
    getY(): number { return this.y; }
    getVelocityX(): number { return this.velocityX; }
    getVelocityY(): number { return this.velocityY; }
    getRotation(): number { return this.rotation; }
    isCurrentlyCoasting(): boolean { return this.isCoasting; }
    getTotalDistance(): number { return this.totalDistanceTraveled; }
    getSessionDistance(): number { return this.sessionDistanceTraveled; }
}