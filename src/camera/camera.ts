// Import dependencies
import { Input } from '../input/input.js';

// Type definitions
interface CelestialObject {
    x: number;
    y: number;
    type: string;
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
    
    // Coasting state
    isCoasting = false;
    
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

    update(input: CameraInput, deltaTime: number, canvasWidth: number, canvasHeight: number, celestialObjects: CelestialObject[] = [], stellarMap: StellarMap | null = null): void {
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
            } else if (brake.mode === 'directional') {
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
                } else {
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
                } else {
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
        } else {
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
        const kilometers = this.sessionDistanceTraveled / this.distanceScale;
        
        if (kilometers < 1) {
            return `${Math.round(kilometers * 1000)} m`;
        } else if (kilometers < 1000) {
            return `${kilometers.toFixed(1)} km`;
        } else {
            return `${(kilometers / 1000).toFixed(1)} Mm`; // Megameters (1000 km)
        }
    }

    // Get formatted lifetime distance for UI display
    getFormattedLifetimeDistance(): string {
        const kilometers = this.totalDistanceTraveled / this.distanceScale;
        
        if (kilometers < 1) {
            return `${Math.round(kilometers * 1000)} m`;
        } else if (kilometers < 1000) {
            return `${kilometers.toFixed(1)} km`;
        } else if (kilometers < 1000000) {
            return `${(kilometers / 1000).toFixed(1)} Mm`; // Megameters
        } else {
            return `${(kilometers / 1000000).toFixed(2)} Gm`; // Gigameters
        }
    }

    // Get current speed in pixels per second
    getCurrentSpeed(): number {
        return Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
    }

    // Get formatted speed for UI display
    getFormattedSpeed(): string {
        const pixelsPerSecond = this.getCurrentSpeed();
        const kilometersPerSecond = pixelsPerSecond / this.distanceScale;
        
        if (kilometersPerSecond < 0.001) {
            return `${Math.round(kilometersPerSecond * 1000000)} mm/s`;
        } else if (kilometersPerSecond < 1) {
            return `${Math.round(kilometersPerSecond * 1000)} m/s`;
        } else if (kilometersPerSecond < 1000) {
            return `${kilometersPerSecond.toFixed(2)} km/s`;
        } else {
            return `${(kilometersPerSecond / 1000).toFixed(3)} Mm/s`;
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