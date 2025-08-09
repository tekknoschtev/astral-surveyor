export class Input {
    constructor() {
        this.keys = new Set(); // Public for game state detection
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
        this.pinchGesture = null;
        // Mobile braking support
        this.twoFingerTapStartTime = null;
        this.twoFingerTapTriggered = false;
        this.twoFingerDragActive = false;
        this.twoFingerStartCenter = { x: 0, y: 0 };
        this.twoFingerCurrentCenter = { x: 0, y: 0 };
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
            // Prevent native drag behavior when dragging on canvas
            if (this.mousePressed && e.target?.tagName === 'CANVAS') {
                e.preventDefault();
            }
        });
        // Mouse brake (right-click)
        window.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Prevent context menu
        });
        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click
                this.mousePressed = true;
                this.mouseClicked = true; // Mark for single click detection
            }
            else if (e.button === 2) { // Right click
                this.rightMousePressed = true;
            }
        });
        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) { // Left click
                this.mousePressed = false;
            }
            else if (e.button === 2) { // Right click
                this.rightMousePressed = false;
            }
        });
        // Mouse wheel for zoom
        window.addEventListener('wheel', (e) => {
            this.wheelDeltaY = e.deltaY;
            e.preventDefault(); // Prevent page scroll
        });
        // Touch events for mobile
        window.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent scrolling and zooming
            this.updateTouches(e.touches);
            this.touchStartTime = Date.now();
            this.touchConsumed = false; // Reset consumption flag
            if (e.touches.length === 2) {
                this.initPinchGesture(e.touches);
                this.initTwoFingerBraking(e.touches);
            }
        });
        window.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.updateTouches(e.touches);
            if (e.touches.length === 2) {
                this.updatePinchGesture(e.touches);
                this.updateTwoFingerBraking(e.touches);
            }
            else if (e.touches.length === 1 && !this.touchConsumed) {
                // Single touch - update mouse position for dragging
                const touch = e.touches[0];
                this.updateMousePosition(touch.clientX, touch.clientY);
                this.mousePressed = true; // Treat as mouse drag
            }
        });
        window.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.updateTouches(e.touches);
            // Check for two-finger tap completion
            if (e.touches.length === 0 && this.twoFingerTapStartTime) {
                const tapDuration = Date.now() - this.twoFingerTapStartTime;
                if (tapDuration < 300) { // Quick two-finger tap
                    this.twoFingerTapTriggered = true;
                }
            }
            // If this was a short touch and not consumed by UI, treat as click
            if (this.touchStartTime && !this.touchConsumed) {
                const touchDuration = Date.now() - this.touchStartTime;
                if (touchDuration < 200) { // Short tap
                    this.mouseClicked = true;
                }
            }
            this.mousePressed = false; // End drag
            this.touchStartTime = null;
            if (e.touches.length < 2) {
                this.pinchGesture = null;
                this.lastPinchDistance = 0;
                this.resetTwoFingerBraking();
            }
        });
        window.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.touches.clear();
            this.mousePressed = false;
            this.pinchGesture = null;
            this.lastPinchDistance = 0;
            this.touchConsumed = false;
            this.resetTwoFingerBraking();
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
    clearFrameState() {
        // Clear single-frame events
        this.mouseClicked = false;
        this.wheelDeltaY = 0;
        this.keyPressed.clear(); // Clear just-pressed flags
        this.twoFingerTapTriggered = false; // Clear mobile brake tap
    }
    wasClicked() {
        return this.mouseClicked;
    }
    getWheelDelta() {
        return this.wheelDeltaY;
    }
    updateTouches(touchList) {
        // Clear existing touches
        this.touches.clear();
        // Add current touches
        for (let i = 0; i < touchList.length; i++) {
            const touch = touchList[i];
            this.touches.set(touch.identifier, {
                id: touch.identifier,
                x: touch.clientX,
                y: touch.clientY
            });
        }
    }
    initPinchGesture(touches) {
        if (touches.length === 2) {
            const touch1 = touches[0];
            const touch2 = touches[1];
            this.lastPinchDistance = this.calculateDistance(touch1.clientX, touch1.clientY, touch2.clientX, touch2.clientY);
        }
    }
    updatePinchGesture(touches) {
        if (touches.length === 2) {
            const touch1 = touches[0];
            const touch2 = touches[1];
            const currentDistance = this.calculateDistance(touch1.clientX, touch1.clientY, touch2.clientX, touch2.clientY);
            if (this.lastPinchDistance > 0) {
                const distanceChange = currentDistance - this.lastPinchDistance;
                const threshold = 10; // Minimum movement to register gesture
                if (distanceChange > threshold) {
                    this.pinchGesture = 'out'; // Zoom out
                }
                else if (distanceChange < -threshold) {
                    this.pinchGesture = 'in'; // Zoom in
                }
            }
            this.lastPinchDistance = currentDistance;
        }
    }
    calculateDistance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
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
        // Mark touch as consumed by UI to prevent game actions
        this.touchConsumed = true;
        this.mouseClicked = false; // Don't treat consumed touch as click
    }
    isTouchConsumed() {
        return this.touchConsumed;
    }
    isPressed(key) {
        return this.keys.has(key);
    }
    wasJustPressed(key) {
        return this.keyPressed.has(key) || false;
    }
    getKeyHoldTime(key) {
        return this.keyHoldTimes.get(key) || 0;
    }
    // Get thrust intensity based on key hold time (0.0 to 1.0)
    getThrustIntensity(key) {
        if (!this.isPressed(key))
            return 0;
        const holdTime = this.getKeyHoldTime(key);
        const rampUpTime = 0.5; // Time to reach full intensity
        // Smooth ramp-up using easing function
        let intensity = Math.min(holdTime / rampUpTime, 1.0);
        // Apply smooth curve (ease-out)
        intensity = 1 - Math.pow(1 - intensity, 3);
        return intensity;
    }
    // Movement input methods
    isThrustPressed() {
        return this.isPressed('KeyW') || this.isPressed('ArrowUp') || this.isPressed('Space');
    }
    isBrakePressed() {
        return this.isPressed('KeyS') || this.isPressed('ArrowDown') || this.rightMousePressed;
    }
    isLeftPressed() {
        return this.isPressed('KeyA') || this.isPressed('ArrowLeft');
    }
    isRightPressed() {
        return this.isPressed('KeyD') || this.isPressed('ArrowRight');
    }
    // UI input methods
    isMapTogglePressed() {
        return this.wasJustPressed('KeyM') || this.wasJustPressed('Tab');
    }
    isLogbookTogglePressed() {
        return this.wasJustPressed('KeyL');
    }
    isFullscreenTogglePressed() {
        return this.wasJustPressed('KeyF') || this.wasJustPressed('F11');
    }
    isMuteTogglePressed() {
        return this.wasJustPressed('KeyQ');
    }
    // Mouse/touch input for movement
    isMousePressed() {
        return this.mousePressed;
    }
    getMouseX() {
        return this.mouseX;
    }
    getMouseY() {
        return this.mouseY;
    }
    // Get direction and intensity from mouse/touch position relative to screen center
    getMouseDirection(canvasWidth, canvasHeight) {
        if (!this.mousePressed) {
            return { x: 0, y: 0, intensity: 0 };
        }
        // Calculate direction from center of screen
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const deltaX = this.mouseX - centerX;
        const deltaY = this.mouseY - centerY;
        // Calculate distance and normalize
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (distance === 0) {
            return { x: 0, y: 0, intensity: 0 };
        }
        // Normalize direction
        const directionX = deltaX / distance;
        const directionY = deltaY / distance;
        // Calculate intensity based on distance from center (max at 1/3 of screen)
        const maxDistance = Math.min(canvasWidth, canvasHeight) / 3;
        const intensity = Math.min(distance / maxDistance, 1.0);
        return {
            x: directionX,
            y: directionY,
            intensity: intensity
        };
    }
    // Mouse brake functionality for camera system
    getMouseBrake(canvasWidth, canvasHeight) {
        if (!this.rightMousePressed) {
            return null;
        }
        // Calculate direction from center of screen for directional braking
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const deltaX = this.mouseX - centerX;
        const deltaY = this.mouseY - centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        // If near center, use stop braking
        const stopThreshold = Math.min(canvasWidth, canvasHeight) / 8;
        if (distance < stopThreshold) {
            return {
                mode: 'stop',
                x: 0,
                y: 0,
                intensity: 1.0
            };
        }
        // Otherwise use directional braking
        const directionX = distance > 0 ? deltaX / distance : 0;
        const directionY = distance > 0 ? deltaY / distance : 0;
        const maxDistance = Math.min(canvasWidth, canvasHeight) / 3;
        const intensity = Math.min(distance / maxDistance, 1.0);
        return {
            mode: 'directional',
            x: directionX,
            y: directionY,
            intensity: intensity
        };
    }
    // Mobile brake functionality for camera system
    getTouchBrake(canvasWidth, canvasHeight) {
        // Check for two-finger tap (stop braking)
        if (this.twoFingerTapTriggered) {
            return {
                mode: 'stop',
                x: 0,
                y: 0,
                intensity: 1.0
            };
        }
        // Check for two-finger drag (directional braking)
        if (this.twoFingerDragActive && this.touches.size === 2) {
            // Calculate direction from center of screen to current two-finger center
            const centerX = canvasWidth / 2;
            const centerY = canvasHeight / 2;
            const deltaX = this.twoFingerCurrentCenter.x - centerX;
            const deltaY = this.twoFingerCurrentCenter.y - centerY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            // Minimum distance threshold to prevent accidental activation
            const minThreshold = Math.min(canvasWidth, canvasHeight) / 20;
            if (distance < minThreshold) {
                return null;
            }
            // Calculate normalized direction
            const directionX = distance > 0 ? deltaX / distance : 0;
            const directionY = distance > 0 ? deltaY / distance : 0;
            // Calculate intensity based on distance from center
            const maxDistance = Math.min(canvasWidth, canvasHeight) / 3;
            const intensity = Math.min(distance / maxDistance, 1.0);
            return {
                mode: 'directional',
                x: directionX,
                y: directionY,
                intensity: intensity
            };
        }
        return null;
    }
    initTwoFingerBraking(touches) {
        if (touches.length === 2) {
            this.twoFingerTapStartTime = Date.now();
            this.twoFingerTapTriggered = false;
            this.twoFingerDragActive = false;
            // Calculate initial center of two fingers
            const touch1 = touches[0];
            const touch2 = touches[1];
            this.twoFingerStartCenter = {
                x: (touch1.clientX + touch2.clientX) / 2,
                y: (touch1.clientY + touch2.clientY) / 2
            };
            this.twoFingerCurrentCenter = { ...this.twoFingerStartCenter };
        }
    }
    updateTwoFingerBraking(touches) {
        if (touches.length === 2) {
            // Update current center position
            const touch1 = touches[0];
            const touch2 = touches[1];
            this.twoFingerCurrentCenter = {
                x: (touch1.clientX + touch2.clientX) / 2,
                y: (touch1.clientY + touch2.clientY) / 2
            };
            // Check if we've moved enough to activate drag mode
            const dragDistance = Math.sqrt(Math.pow(this.twoFingerCurrentCenter.x - this.twoFingerStartCenter.x, 2) +
                Math.pow(this.twoFingerCurrentCenter.y - this.twoFingerStartCenter.y, 2));
            if (dragDistance > 15) { // Minimum drag distance to activate
                this.twoFingerDragActive = true;
                this.twoFingerTapStartTime = null; // Cancel tap mode
            }
        }
    }
    resetTwoFingerBraking() {
        this.twoFingerTapStartTime = null;
        this.twoFingerTapTriggered = false;
        this.twoFingerDragActive = false;
        this.twoFingerStartCenter = { x: 0, y: 0 };
        this.twoFingerCurrentCenter = { x: 0, y: 0 };
    }
    // Touch-specific methods
    getTouchCount() {
        return this.touches.size;
    }
    hasTouches() {
        return this.touches.size > 0;
    }
    // Test helper methods - only use in tests
    _testSetTwoFingerTap() {
        this.twoFingerTapTriggered = true;
    }
    _testSetTwoFingerDrag(centerX, centerY, active = true) {
        this.twoFingerDragActive = active;
        this.twoFingerCurrentCenter = { x: centerX, y: centerY };
        if (active) {
            // Set up some fake touches for the size check
            this.touches.set(0, { id: 0, x: centerX - 10, y: centerY - 10 });
            this.touches.set(1, { id: 1, x: centerX + 10, y: centerY + 10 });
        }
    }
    _testResetBrakingState() {
        this.resetTwoFingerBraking();
        this.touches.clear();
    }
    // Test getter methods for mouse position
    _testGetMouseX() {
        return this.mouseX;
    }
    _testGetMouseY() {
        return this.mouseY;
    }
    _testSetMousePosition(x, y) {
        this.mouseX = x;
        this.mouseY = y;
    }
}
//# sourceMappingURL=input.js.map