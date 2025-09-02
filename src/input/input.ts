// Touch tracking interface
interface TouchData {
    id: number;
    x: number;
    y: number;
}

// Mouse direction and intensity result
interface MouseDirection {
    x: number;
    y: number;
    intensity: number;
}

export class Input {
    keys = new Set<string>(); // Public for game state detection
    private keyHoldTimes = new Map<string, number>(); // Track how long keys have been held
    private keyPressed = new Map<string, boolean>(); // Track single key presses
    private mousePressed = false;
    private rightMousePressed = false;
    private mouseClicked = false; // Single click detection
    private touchStartTime: number | null = null;
    private touchConsumed = false; // Track if touch was consumed by UI
    private mouseX = 0;
    private mouseY = 0;
    private wheelDeltaY = 0; // Mouse wheel delta
    
    // Multi-touch gesture support
    private touches = new Map<number, TouchData>(); // Track multiple touches
    private lastPinchDistance = 0;
    private pinchGesture: 'in' | 'out' | null = null;
    
    // Mobile braking support
    private twoFingerTapStartTime: number | null = null;
    private twoFingerTapTriggered = false;
    private twoFingerDragActive = false;
    private twoFingerStartCenter = { x: 0, y: 0 };
    private twoFingerCurrentCenter = { x: 0, y: 0 };
    
    // Debug input safety - track modifier key states
    private shiftPressedFirst = false;
    
    // Developer console input routing
    private consoleInputHandler: ((event: KeyboardEvent) => boolean) | null = null;
    
    // Performance optimization: Throttle high-frequency events  
    private lastMouseMoveTime = 0;
    private mouseMoveThrottleMs = 8; // ~120fps max - less aggressive throttling

    constructor() {
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Keyboard events
        window.addEventListener('keydown', (e: KeyboardEvent) => {
            // Route to console if active (except for tilde key which toggles console)
            if (this.consoleInputHandler && e.code !== 'Backquote') {
                const handled = this.consoleInputHandler(e);
                if (handled) {
                    return; // Console handled the input
                }
            }
            
            if (!this.keys.has(e.code)) {
                this.keys.add(e.code);
                this.keyHoldTimes.set(e.code, 0); // Start tracking hold time
                this.keyPressed.set(e.code, true); // Mark as just pressed
                
                // Track debug key sequence safety - Shift must be pressed first
                if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                    this.shiftPressedFirst = true;
                } else if (this.shiftPressedFirst && (e.code === 'KeyW' || e.code === 'KeyB' || e.code === 'KeyH' || e.code === 'KeyI')) {
                    // Valid debug sequence - Shift was pressed first, then debug key
                } else if (e.code === 'KeyW' || e.code === 'KeyB' || e.code === 'KeyH' || e.code === 'KeyI') {
                    // Invalid sequence - debug key pressed without Shift first
                    this.shiftPressedFirst = false;
                }
            }
        });

        window.addEventListener('keyup', (e: KeyboardEvent) => {
            this.keys.delete(e.code);
            this.keyHoldTimes.delete(e.code);
            this.keyPressed.delete(e.code);
            
            // Reset debug sequence tracking when Shift is released
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                this.shiftPressedFirst = false;
            }
        });

        window.addEventListener('mousemove', (e: MouseEvent) => {
            // Throttle mousemove events for better performance (disabled in tests)
            // Use vitest global to detect test environment more reliably
            const isTestEnvironment = typeof globalThis !== 'undefined' && 
                                    (globalThis.__vitest__ || globalThis.describe || globalThis.it);
            
            if (isTestEnvironment) {
                // Always update immediately in tests
                this.updateMousePosition(e.clientX, e.clientY);
            } else {
                // Throttle in production
                const now = performance.now();
                if (now - this.lastMouseMoveTime >= this.mouseMoveThrottleMs) {
                    this.updateMousePosition(e.clientX, e.clientY);
                    this.lastMouseMoveTime = now;
                }
            }
            
            // Prevent native drag behavior when dragging on canvas
            if (this.mousePressed && (e.target as HTMLElement)?.tagName === 'CANVAS') {
                e.preventDefault();
            }
        });

        // Mouse brake (right-click)
        window.addEventListener('contextmenu', (e: Event) => {
            e.preventDefault(); // Prevent context menu
        });

        window.addEventListener('mousedown', (e: MouseEvent) => {
            if (e.button === 0) { // Left click
                this.mousePressed = true;
                this.mouseClicked = true; // Mark for single click detection
            } else if (e.button === 2) { // Right click
                this.rightMousePressed = true;
            }
        });

        window.addEventListener('mouseup', (e: MouseEvent) => {
            if (e.button === 0) { // Left click
                this.mousePressed = false;
            } else if (e.button === 2) { // Right click
                this.rightMousePressed = false;
            }
        });

        // Mouse wheel for zoom
        window.addEventListener('wheel', (e: WheelEvent) => {
            this.wheelDeltaY = e.deltaY;
            e.preventDefault(); // Prevent page scroll
        });

        // Touch events for mobile
        window.addEventListener('touchstart', (e: TouchEvent) => {
            e.preventDefault(); // Prevent scrolling and zooming
            this.updateTouches(e.touches);
            this.touchStartTime = Date.now();
            this.touchConsumed = false; // Reset consumption flag
            
            if (e.touches.length === 2) {
                this.initPinchGesture(e.touches);
                this.initTwoFingerBraking(e.touches);
            } else if (e.touches.length === 1) {
                // Update mouse position immediately for single touch (needed for TouchUI button detection)
                const touch = e.touches[0];
                this.updateMousePosition(touch.clientX, touch.clientY);
            }
        });

        window.addEventListener('touchmove', (e: TouchEvent) => {
            e.preventDefault();
            this.updateTouches(e.touches);
            
            if (e.touches.length === 2) {
                this.updatePinchGesture(e.touches);
                this.updateTwoFingerBraking(e.touches);
            } else if (e.touches.length === 1 && !this.touchConsumed) {
                // Single touch - update mouse position for dragging
                const touch = e.touches[0];
                this.updateMousePosition(touch.clientX, touch.clientY);
                this.mousePressed = true; // Treat as mouse drag
            }
        });

        window.addEventListener('touchend', (e: TouchEvent) => {
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

        window.addEventListener('touchcancel', (e: TouchEvent) => {
            e.preventDefault();
            this.touches.clear();
            this.mousePressed = false;
            this.pinchGesture = null;
            this.lastPinchDistance = 0;
            this.touchConsumed = false;
            this.resetTwoFingerBraking();
        });
    }

    private updateMousePosition(clientX: number, clientY: number): void {
        this.mouseX = clientX;
        this.mouseY = clientY;
    }

    update(deltaTime: number): void {
        // Update key hold times
        for (const [key, holdTime] of this.keyHoldTimes) {
            this.keyHoldTimes.set(key, holdTime + deltaTime);
        }
    }

    clearFrameState(): void {
        // Clear single-frame events
        this.mouseClicked = false;
        this.wheelDeltaY = 0;
        this.keyPressed.clear(); // Clear just-pressed flags
        this.twoFingerTapTriggered = false; // Clear mobile brake tap
        this.touchConsumed = false; // Reset input consumption for next frame
    }

    wasClicked(): boolean {
        return this.mouseClicked;
    }

    getWheelDelta(): number {
        return this.wheelDeltaY;
    }

    private updateTouches(touchList: TouchList): void {
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

    private initPinchGesture(touches: TouchList): void {
        if (touches.length === 2) {
            const touch1 = touches[0];
            const touch2 = touches[1];
            this.lastPinchDistance = this.calculateDistance(
                touch1.clientX, touch1.clientY,
                touch2.clientX, touch2.clientY
            );
        }
    }

    private updatePinchGesture(touches: TouchList): void {
        if (touches.length === 2) {
            const touch1 = touches[0];
            const touch2 = touches[1];
            const currentDistance = this.calculateDistance(
                touch1.clientX, touch1.clientY,
                touch2.clientX, touch2.clientY
            );
            
            if (this.lastPinchDistance > 0) {
                const distanceChange = currentDistance - this.lastPinchDistance;
                const threshold = 10; // Minimum movement to register gesture
                
                if (distanceChange > threshold) {
                    this.pinchGesture = 'out'; // Zoom out
                } else if (distanceChange < -threshold) {
                    this.pinchGesture = 'in'; // Zoom in
                }
            }
            
            this.lastPinchDistance = currentDistance;
        }
    }

    private calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
        return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    }

    getPinchGesture(): 'in' | 'out' | null {
        return this.pinchGesture;
    }

    hasPinchZoomOut(): boolean {
        return this.pinchGesture === 'out';
    }

    hasPinchZoomIn(): boolean {
        return this.pinchGesture === 'in';
    }

    consumeTouch(): void {
        // Mark touch as consumed by UI to prevent game actions
        this.touchConsumed = true;
        this.mouseClicked = false; // Don't treat consumed touch as click
    }

    isTouchConsumed(): boolean {
        return this.touchConsumed;
    }

    isPressed(key: string): boolean {
        return this.keys.has(key);
    }

    wasJustPressed(key: string): boolean {
        return this.keyPressed.has(key) || false;
    }

    getKeyHoldTime(key: string): number {
        return this.keyHoldTimes.get(key) || 0;
    }

    // Get thrust intensity based on key hold time (0.0 to 1.0)
    getThrustIntensity(key: string): number {
        if (!this.isPressed(key)) return 0;
        
        const holdTime = this.getKeyHoldTime(key);
        const rampUpTime = 0.5; // Time to reach full intensity
        
        // Smooth ramp-up using easing function
        let intensity = Math.min(holdTime / rampUpTime, 1.0);
        // Apply smooth curve (ease-out)
        intensity = 1 - Math.pow(1 - intensity, 3);
        
        return intensity;
    }

    // Movement input methods
    // Four-directional movement (restored from working version)
    get moveUp(): boolean {
        return this.isPressed('KeyW') || this.isPressed('ArrowUp');
    }

    get moveDown(): boolean {
        return this.isPressed('KeyS') || this.isPressed('ArrowDown');
    }

    get moveLeft(): boolean {
        return this.isPressed('KeyA') || this.isPressed('ArrowLeft');
    }

    get moveRight(): boolean {
        return this.isPressed('KeyD') || this.isPressed('ArrowRight');
    }

    // Movement intensities
    get upIntensity(): number {
        return Math.max(
            this.getThrustIntensity('KeyW'),
            this.getThrustIntensity('ArrowUp')
        );
    }

    get downIntensity(): number {
        return Math.max(
            this.getThrustIntensity('KeyS'),
            this.getThrustIntensity('ArrowDown')
        );
    }

    get leftIntensity(): number {
        return Math.max(
            this.getThrustIntensity('KeyA'),
            this.getThrustIntensity('ArrowLeft')
        );
    }

    get rightIntensity(): number {
        return Math.max(
            this.getThrustIntensity('KeyD'),
            this.getThrustIntensity('ArrowRight')
        );
    }

    // Braking system (Space bar only)
    get isBraking(): boolean {
        return this.isPressed('Space');
    }

    get brakingIntensity(): number {
        return this.getThrustIntensity('Space');
    }

    // Legacy method for compatibility
    isRightPressed(): boolean {
        return this.rightMousePressed;
    }

    // UI input methods
    isMapTogglePressed(): boolean {
        return this.wasJustPressed('KeyM') || this.wasJustPressed('Tab');
    }

    isLogbookTogglePressed(): boolean {
        return this.wasJustPressed('KeyL');
    }

    isFullscreenTogglePressed(): boolean {
        return this.wasJustPressed('KeyF') || this.wasJustPressed('F11');
    }

    isMuteTogglePressed(): boolean {
        return this.wasJustPressed('KeyQ');
    }

    // Debug input methods (development builds only)
    isShiftPressed(): boolean {
        return this.isPressed('ShiftLeft') || this.isPressed('ShiftRight');
    }

    isDebugWormholeSpawn(): boolean {
        // Always available in development builds (this code won't exist in production)
        // Require Shift to be pressed BEFORE W to prevent accidental spawning during movement
        return this.shiftPressedFirst && this.isShiftPressed() && this.wasJustPressed('KeyW');
    }

    isDebugBlackHoleSpawn(): boolean {
        // Always available in development builds (this code won't exist in production)
        // Require Shift to be pressed BEFORE B to prevent accidental spawning
        return this.shiftPressedFirst && this.isShiftPressed() && this.wasJustPressed('KeyB');
    }

    isDebugHelpRequested(): boolean {
        // Always available in development builds (this code won't exist in production)
        // Require Shift to be pressed BEFORE H to prevent accidental activation
        return this.shiftPressedFirst && this.isShiftPressed() && this.wasJustPressed('KeyH');
    }

    isDebugInspectRequested(): boolean {
        // Always available in development builds (this code won't exist in production)
        // Require Shift to be pressed BEFORE I to prevent accidental activation
        return this.shiftPressedFirst && this.isShiftPressed() && this.wasJustPressed('KeyI');
    }

    // Developer console toggle (tilde key)
    isConsoleTogglePressed(): boolean {
        return this.wasJustPressed('Backquote'); // Tilde/backtick key
    }
    
    // Set console input handler for routing keyboard events
    setConsoleInputHandler(handler: ((event: KeyboardEvent) => boolean) | null): void {
        this.consoleInputHandler = handler;
    }

    // Mouse/touch input for movement
    isMousePressed(): boolean {
        return this.mousePressed;
    }

    getMouseX(): number {
        return this.mouseX;
    }

    getMouseY(): number {
        return this.mouseY;
    }

    // Get direction and intensity from mouse/touch position relative to screen center
    getMouseDirection(canvasWidth: number, canvasHeight: number): MouseDirection {
        if (!this.mousePressed || this.touchConsumed) {
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
    getMouseBrake(canvasWidth: number, canvasHeight: number): { mode: 'stop' | 'directional', x: number, y: number, intensity: number } | null {
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
    getTouchBrake(canvasWidth: number, canvasHeight: number): { mode: 'stop' | 'directional', x: number, y: number, intensity: number } | null {
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
    
    private initTwoFingerBraking(touches: TouchList): void {
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
    
    private updateTwoFingerBraking(touches: TouchList): void {
        if (touches.length === 2) {
            // Update current center position
            const touch1 = touches[0];
            const touch2 = touches[1];
            this.twoFingerCurrentCenter = {
                x: (touch1.clientX + touch2.clientX) / 2,
                y: (touch1.clientY + touch2.clientY) / 2
            };
            
            // Check if we've moved enough to activate drag mode
            const dragDistance = Math.sqrt(
                Math.pow(this.twoFingerCurrentCenter.x - this.twoFingerStartCenter.x, 2) +
                Math.pow(this.twoFingerCurrentCenter.y - this.twoFingerStartCenter.y, 2)
            );
            
            if (dragDistance > 15) { // Minimum drag distance to activate
                this.twoFingerDragActive = true;
                this.twoFingerTapStartTime = null; // Cancel tap mode
            }
        }
    }
    
    private resetTwoFingerBraking(): void {
        this.twoFingerTapStartTime = null;
        this.twoFingerTapTriggered = false;
        this.twoFingerDragActive = false;
        this.twoFingerStartCenter = { x: 0, y: 0 };
        this.twoFingerCurrentCenter = { x: 0, y: 0 };
    }

    // Touch-specific methods
    getTouchCount(): number {
        return this.touches.size;
    }

    hasTouches(): boolean {
        return this.touches.size > 0;
    }
    
    // Test helper methods - only use in tests
    _testSetTwoFingerTap(): void {
        this.twoFingerTapTriggered = true;
    }
    
    _testSetTwoFingerDrag(centerX: number, centerY: number, active = true): void {
        this.twoFingerDragActive = active;
        this.twoFingerCurrentCenter = { x: centerX, y: centerY };
        if (active) {
            // Set up some fake touches for the size check
            this.touches.set(0, { id: 0, x: centerX - 10, y: centerY - 10 });
            this.touches.set(1, { id: 1, x: centerX + 10, y: centerY + 10 });
        }
    }
    
    _testResetBrakingState(): void {
        this.resetTwoFingerBraking();
        this.touches.clear();
    }
    
    // Test getter methods for mouse position
    _testGetMouseX(): number {
        return this.mouseX;
    }
    
    _testGetMouseY(): number {
        return this.mouseY;
    }
    
    _testSetMousePosition(x: number, y: number): void {
        this.mouseX = x;
        this.mouseY = y;
    }
}