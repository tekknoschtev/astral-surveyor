class Input {
    constructor() {
        this.keys = new Set();
        this.keyHoldTimes = new Map(); // Track how long keys have been held
        this.keyPressed = new Map(); // Track single key presses
        this.mousePressed = false;
        this.rightMousePressed = false;
        this.mouseClicked = false; // Single click detection
        this.touchStartTime = null;
        this.touchConsumed = false; // Track if touch was consumed by UI
        this.mouseX = 0;
        this.mouseY = 0;
        this.wheelDeltaY = 0; // Mouse wheel delta
        
        // Multi-touch gesture support
        this.touches = new Map(); // Track multiple touches
        this.lastPinchDistance = 0;
        this.pinchGesture = null; // 'in' or 'out' or null
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Keyboard events
        window.addEventListener('keydown', (e) => {
            if (!this.keys.has(e.code)) {
                this.keys.add(e.code);
                this.keyHoldTimes.set(e.code, 0); // Start tracking hold time
                this.keyPressed.set(e.code, true); // Mark as just pressed
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys.delete(e.code);
            this.keyHoldTimes.delete(e.code);
            this.keyPressed.delete(e.code);
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
                this.mouseClicked = true; // Register click on mouse up
            } else if (e.button === 2) {
                this.rightMousePressed = false;
            }
        });

        // Mouse wheel events
        window.addEventListener('wheel', (e) => {
            this.wheelDeltaY = e.deltaY;
        });

        // Enhanced touch events for mobile with multi-touch support
        window.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.updateTouches(e.touches);
            
            if (e.touches.length === 1) {
                this.mousePressed = true;
                this.rightMousePressed = false;
                this.touchStartTime = Date.now();
                const touch = e.touches[0];
                this.updateMousePosition(touch.clientX, touch.clientY);
            } else if (e.touches.length === 2) {
                // Start pinch gesture tracking
                this.initPinchGesture(e.touches);
            }
        });

        window.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.updateTouches(e.touches);
            
            if (e.touches.length === 0) {
                // All touches ended
                if (this.touchStartTime && Date.now() - this.touchStartTime > 500) {
                    this.rightMousePressed = false;
                }
                this.mousePressed = false;
                this.mouseClicked = true; // Register touch as click
                this.touchStartTime = null;
                this.pinchGesture = null;
                this.lastPinchDistance = 0;
            } else if (e.touches.length === 1) {
                // Multi-touch ended, back to single touch
                this.pinchGesture = null;
                this.lastPinchDistance = 0;
                const touch = e.touches[0];
                this.updateMousePosition(touch.clientX, touch.clientY);
            }
        });

        window.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.updateTouches(e.touches);
            
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                this.updateMousePosition(touch.clientX, touch.clientY);
                
                // Convert long press to brake
                if (this.touchStartTime && Date.now() - this.touchStartTime > 500) {
                    this.mousePressed = false;
                    this.rightMousePressed = true;
                }
            } else if (e.touches.length === 2) {
                // Handle pinch gesture
                this.updatePinchGesture(e.touches);
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

    // Call this at the end of the game loop to clear single-frame key presses
    clearFrameState() {
        this.keyPressed.clear();
        this.mouseClicked = false;
        this.pinchGesture = null; // Clear pinch gesture each frame
        this.touchConsumed = false; // Reset touch consumption flag
        this.wheelDeltaY = 0; // Clear wheel delta each frame
    }

    wasClicked() {
        return this.mouseClicked;
    }

    getWheelDelta() {
        return this.wheelDeltaY;
    }

    // Multi-touch gesture methods
    updateTouches(touches) {
        this.touches.clear();
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            this.touches.set(touch.identifier, {
                x: touch.clientX,
                y: touch.clientY
            });
        }
    }

    initPinchGesture(touches) {
        if (touches.length >= 2) {
            const touch1 = touches[0];
            const touch2 = touches[1];
            this.lastPinchDistance = this.calculateDistance(
                touch1.clientX, touch1.clientY,
                touch2.clientX, touch2.clientY
            );
        }
    }

    updatePinchGesture(touches) {
        if (touches.length >= 2) {
            const touch1 = touches[0];
            const touch2 = touches[1];
            const currentDistance = this.calculateDistance(
                touch1.clientX, touch1.clientY,
                touch2.clientX, touch2.clientY
            );

            if (this.lastPinchDistance > 0) {
                const threshold = 10; // Minimum distance change to register gesture
                const distanceChange = currentDistance - this.lastPinchDistance;
                
                if (Math.abs(distanceChange) > threshold) {
                    this.pinchGesture = distanceChange > 0 ? 'out' : 'in';
                }
            }

            this.lastPinchDistance = currentDistance;
        }
    }

    calculateDistance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    getPinchGesture() {
        return this.pinchGesture;
    }

    hasPinchZoomOut() {
        return this.pinchGesture === 'out';
    }

    hasPinchZoomIn() {
        return this.pinchGesture === 'in';
    }

    consumeTouch() {
        // Prevent current touch from affecting other systems (like ship movement)
        this.mousePressed = false;
        this.rightMousePressed = false;
        this.mouseClicked = false;
        this.touchConsumed = true; // Flag to indicate touch was consumed
    }

    isPressed(key) {
        return this.keys.has(key);
    }

    wasJustPressed(key) {
        return this.keyPressed.has(key);
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
        if (!this.mousePressed || this.touchConsumed) return null;
        
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
        if (!this.rightMousePressed || this.touchConsumed) return null;
        
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

// Export for use in other modules
window.Input = Input;