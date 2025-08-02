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

// Export for use in other modules
window.Input = Input;