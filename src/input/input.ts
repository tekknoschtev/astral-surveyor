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
    private keys = new Set<string>();
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

    constructor() {
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Keyboard events
        window.addEventListener('keydown', (e: KeyboardEvent) => {
            if (!this.keys.has(e.code)) {
                this.keys.add(e.code);
                this.keyHoldTimes.set(e.code, 0); // Start tracking hold time
                this.keyPressed.set(e.code, true); // Mark as just pressed
            }
        });

        window.addEventListener('keyup', (e: KeyboardEvent) => {
            this.keys.delete(e.code);
            this.keyHoldTimes.delete(e.code);
            this.keyPressed.delete(e.code);
        });

        window.addEventListener('mousemove', (e: MouseEvent) => {
            this.updateMousePosition(e.clientX, e.clientY);
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
            }
        });

        window.addEventListener('touchmove', (e: TouchEvent) => {
            e.preventDefault();
            this.updateTouches(e.touches);
            
            if (e.touches.length === 2) {
                this.updatePinchGesture(e.touches);
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
            }
        });

        window.addEventListener('touchcancel', (e: TouchEvent) => {
            e.preventDefault();
            this.touches.clear();
            this.mousePressed = false;
            this.pinchGesture = null;
            this.lastPinchDistance = 0;
            this.touchConsumed = false;
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
    isThrustPressed(): boolean {
        return this.isPressed('KeyW') || this.isPressed('ArrowUp') || this.isPressed('Space');
    }

    isBrakePressed(): boolean {
        return this.isPressed('KeyS') || this.isPressed('ArrowDown') || this.rightMousePressed;
    }

    isLeftPressed(): boolean {
        return this.isPressed('KeyA') || this.isPressed('ArrowLeft');
    }

    isRightPressed(): boolean {
        return this.isPressed('KeyD') || this.isPressed('ArrowRight');
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

    // Touch-specific methods
    getTouchCount(): number {
        return this.touches.size;
    }

    hasTouches(): boolean {
        return this.touches.size > 0;
    }
}