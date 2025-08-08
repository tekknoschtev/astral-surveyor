import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Import from compiled TypeScript
import { Input } from '../../dist/input/input.js';

describe('Input System', () => {
  let input;
  let mockEventListeners;
  
  // Standard test values
  const STANDARD_DELTA = 1/60; // 60 FPS
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;

  beforeEach(() => {
    // Mock DOM event listeners
    mockEventListeners = new Map();
    
    // Mock window.addEventListener
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (!mockEventListeners.has(event)) {
        mockEventListeners.set(event, []);
      }
      mockEventListeners.get(event).push(handler);
    });

    // Mock Date.now for consistent time-based testing
    vi.spyOn(Date, 'now').mockReturnValue(1000);

    input = new Input();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper function to simulate events
  function simulateEvent(eventType, eventData = {}) {
    const handlers = mockEventListeners.get(eventType) || [];
    const mockEvent = {
      preventDefault: vi.fn(),
      ...eventData
    };
    
    handlers.forEach(handler => handler(mockEvent));
    return mockEvent;
  }

  describe('Initialization and Setup', () => {
    it('should initialize with correct default state', () => {
      expect(input.keys).toBeInstanceOf(Set);
      expect(input.keys.size).toBe(0);
      expect(input.isMousePressed()).toBe(false);
      expect(input.getTouchCount()).toBe(0);
      expect(input.getMouseX()).toBe(0);
      expect(input.getMouseY()).toBe(0);
    });

    it('should set up all required event listeners', () => {
      const expectedEvents = [
        'keydown', 'keyup', 'mousemove', 'contextmenu', 
        'mousedown', 'mouseup', 'wheel',
        'touchstart', 'touchmove', 'touchend', 'touchcancel'
      ];

      expectedEvents.forEach(event => {
        expect(mockEventListeners.has(event)).toBe(true);
        expect(mockEventListeners.get(event).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Keyboard Input Handling', () => {
    it('should track key press and release correctly', () => {
      expect(input.isPressed('KeyW')).toBe(false);

      simulateEvent('keydown', { code: 'KeyW' });
      expect(input.isPressed('KeyW')).toBe(true);
      expect(input.wasJustPressed('KeyW')).toBe(true);

      simulateEvent('keyup', { code: 'KeyW' });
      expect(input.isPressed('KeyW')).toBe(false);
      expect(input.wasJustPressed('KeyW')).toBe(false);
    });

    it('should track multiple simultaneous key presses', () => {
      simulateEvent('keydown', { code: 'KeyW' });
      simulateEvent('keydown', { code: 'KeyA' });
      simulateEvent('keydown', { code: 'KeyD' });

      expect(input.isPressed('KeyW')).toBe(true);
      expect(input.isPressed('KeyA')).toBe(true);
      expect(input.isPressed('KeyD')).toBe(true);
      expect(input.isPressed('KeyS')).toBe(false);

      simulateEvent('keyup', { code: 'KeyA' });
      expect(input.isPressed('KeyW')).toBe(true);
      expect(input.isPressed('KeyA')).toBe(false);
      expect(input.isPressed('KeyD')).toBe(true);
    });

    it('should not duplicate key presses when already held', () => {
      simulateEvent('keydown', { code: 'KeyW' });
      expect(input.wasJustPressed('KeyW')).toBe(true);

      // Simulate repeated keydown (key still held)
      simulateEvent('keydown', { code: 'KeyW' });
      expect(input.isPressed('KeyW')).toBe(true);
      expect(input.wasJustPressed('KeyW')).toBe(true); // Should still be true until cleared
    });

    it('should track key hold times correctly', () => {
      simulateEvent('keydown', { code: 'KeyW' });
      expect(input.getKeyHoldTime('KeyW')).toBe(0);

      input.update(STANDARD_DELTA);
      expect(input.getKeyHoldTime('KeyW')).toBeCloseTo(STANDARD_DELTA, 5);

      input.update(STANDARD_DELTA);
      expect(input.getKeyHoldTime('KeyW')).toBeCloseTo(STANDARD_DELTA * 2, 5);

      simulateEvent('keyup', { code: 'KeyW' });
      expect(input.getKeyHoldTime('KeyW')).toBe(0);
    });

    it('should calculate thrust intensity correctly', () => {
      expect(input.getThrustIntensity('KeyW')).toBe(0);

      simulateEvent('keydown', { code: 'KeyW' });
      // Initially, intensity is 0 because holdTime is 0
      expect(input.getThrustIntensity('KeyW')).toBe(0);
      
      // After some time, intensity should increase
      input.update(0.1);
      expect(input.getThrustIntensity('KeyW')).toBeGreaterThan(0);
      expect(input.getThrustIntensity('KeyW')).toBeLessThan(1);

      // Simulate 0.5 seconds of holding (should reach full intensity)
      input.update(0.4); // Total time now 0.5
      expect(input.getThrustIntensity('KeyW')).toBeCloseTo(1.0, 2);
      
      // Start fresh for easing curve test
      input.clearFrameState();
      simulateEvent('keyup', { code: 'KeyW' });
      simulateEvent('keydown', { code: 'KeyW' });
      
      // Test easing curve - intensity should increase smoothly over time
      input.update(0.1); // 0.1 total
      const intensity1 = input.getThrustIntensity('KeyW');
      
      input.update(0.1); // 0.2 total
      const intensity2 = input.getThrustIntensity('KeyW');
      
      expect(intensity1).toBeGreaterThan(0);
      expect(intensity2).toBeGreaterThan(intensity1);
    });

    it('should clear just-pressed flags on clearFrameState', () => {
      simulateEvent('keydown', { code: 'KeyW' });
      expect(input.wasJustPressed('KeyW')).toBe(true);

      input.clearFrameState();
      expect(input.wasJustPressed('KeyW')).toBe(false);
      expect(input.isPressed('KeyW')).toBe(true); // Should still be pressed
    });
  });

  describe('Mouse Input Handling', () => {
    it('should track mouse position correctly', () => {
      simulateEvent('mousemove', { clientX: 100, clientY: 200 });
      
      expect(input.getMouseX()).toBe(100);
      expect(input.getMouseY()).toBe(200);

      simulateEvent('mousemove', { clientX: 300, clientY: 400 });
      
      expect(input.getMouseX()).toBe(300);
      expect(input.getMouseY()).toBe(400);
    });

    it('should handle left mouse button correctly', () => {
      expect(input.isMousePressed()).toBe(false);
      expect(input.wasClicked()).toBe(false);

      simulateEvent('mousedown', { button: 0 }); // Left click
      expect(input.isMousePressed()).toBe(true);
      expect(input.wasClicked()).toBe(true);

      simulateEvent('mouseup', { button: 0 });
      expect(input.isMousePressed()).toBe(false);
      expect(input.wasClicked()).toBe(true); // Should persist until cleared

      input.clearFrameState();
      expect(input.wasClicked()).toBe(false);
    });

    it('should handle right mouse button correctly', () => {
      expect(input.isBrakePressed()).toBe(false);

      simulateEvent('mousedown', { button: 2 }); // Right click
      expect(input.isBrakePressed()).toBe(true);

      simulateEvent('mouseup', { button: 2 });
      expect(input.isBrakePressed()).toBe(false);
    });

    it('should prevent context menu on right click', () => {
      const mockEvent = simulateEvent('contextmenu');
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should handle mouse wheel correctly', () => {
      expect(input.getWheelDelta()).toBe(0);

      const mockEvent = simulateEvent('wheel', { deltaY: -120 }); // Scroll up
      expect(input.getWheelDelta()).toBe(-120);
      expect(mockEvent.preventDefault).toHaveBeenCalled();

      input.clearFrameState();
      expect(input.getWheelDelta()).toBe(0);
    });

    it('should calculate mouse direction correctly', () => {
      // Test no mouse pressed
      let direction = input.getMouseDirection(CANVAS_WIDTH, CANVAS_HEIGHT);
      expect(direction.x).toBe(0);
      expect(direction.y).toBe(0);
      expect(direction.intensity).toBe(0);

      // Test mouse at center
      simulateEvent('mousedown', { button: 0 });
      simulateEvent('mousemove', { clientX: CANVAS_WIDTH / 2, clientY: CANVAS_HEIGHT / 2 });
      
      direction = input.getMouseDirection(CANVAS_WIDTH, CANVAS_HEIGHT);
      expect(direction.x).toBe(0);
      expect(direction.y).toBe(0);
      expect(direction.intensity).toBe(0);

      // Test mouse at edge
      simulateEvent('mousemove', { clientX: CANVAS_WIDTH, clientY: CANVAS_HEIGHT / 2 });
      
      direction = input.getMouseDirection(CANVAS_WIDTH, CANVAS_HEIGHT);
      expect(direction.x).toBeCloseTo(1.0, 2); // Right direction
      expect(direction.y).toBe(0);
      expect(direction.intensity).toBeGreaterThan(0);

      // Test mouse diagonal
      simulateEvent('mousemove', { clientX: CANVAS_WIDTH / 2 + 100, clientY: CANVAS_HEIGHT / 2 + 100 });
      
      direction = input.getMouseDirection(CANVAS_WIDTH, CANVAS_HEIGHT);
      expect(direction.x).toBeCloseTo(0.707, 2); // Normalized diagonal
      expect(direction.y).toBeCloseTo(0.707, 2);
    });

    it('should prevent dragging on canvas elements', () => {
      simulateEvent('mousedown', { button: 0 });
      
      const mockEvent = simulateEvent('mousemove', {
        clientX: 100,
        clientY: 200,
        target: { tagName: 'CANVAS' }
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
  });

  describe('Mouse Brake Functionality', () => {
    it('should return null when right mouse is not pressed', () => {
      const brake = input.getMouseBrake(CANVAS_WIDTH, CANVAS_HEIGHT);
      expect(brake).toBeNull();
    });

    it('should return stop brake when near center', () => {
      simulateEvent('mousedown', { button: 2 }); // Right click
      simulateEvent('mousemove', { clientX: CANVAS_WIDTH / 2, clientY: CANVAS_HEIGHT / 2 });

      const brake = input.getMouseBrake(CANVAS_WIDTH, CANVAS_HEIGHT);
      expect(brake).not.toBeNull();
      expect(brake.mode).toBe('stop');
      expect(brake.x).toBe(0);
      expect(brake.y).toBe(0);
      expect(brake.intensity).toBe(1.0);
    });

    it('should return directional brake when away from center', () => {
      simulateEvent('mousedown', { button: 2 });
      simulateEvent('mousemove', { clientX: CANVAS_WIDTH, clientY: CANVAS_HEIGHT / 2 });

      const brake = input.getMouseBrake(CANVAS_WIDTH, CANVAS_HEIGHT);
      expect(brake).not.toBeNull();
      expect(brake.mode).toBe('directional');
      expect(brake.x).toBeCloseTo(1.0, 2); // Right direction
      expect(brake.y).toBe(0);
      expect(brake.intensity).toBeGreaterThan(0);
    });

    it('should calculate brake intensity based on distance from center', () => {
      simulateEvent('mousedown', { button: 2 });
      
      // Test near edge for high intensity
      simulateEvent('mousemove', { clientX: CANVAS_WIDTH * 0.75, clientY: CANVAS_HEIGHT / 2 });
      const farBrake = input.getMouseBrake(CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Test closer to center for lower intensity
      simulateEvent('mousemove', { clientX: CANVAS_WIDTH * 0.6, clientY: CANVAS_HEIGHT / 2 });
      const nearBrake = input.getMouseBrake(CANVAS_WIDTH, CANVAS_HEIGHT);
      
      expect(farBrake.intensity).toBeGreaterThan(nearBrake.intensity);
    });
  });

  describe('Touch Input Handling', () => {
    function createMockTouch(id, x, y) {
      return {
        identifier: id,
        clientX: x,
        clientY: y
      };
    }

    function createMockTouchList(touches) {
      const touchList = touches;
      touchList.length = touches.length;
      return touchList;
    }

    it('should track single touch correctly', () => {
      expect(input.getTouchCount()).toBe(0);
      expect(input.hasTouches()).toBe(false);

      const touch = createMockTouch(1, 100, 200);
      const touchList = createMockTouchList([touch]);

      const mockEvent = simulateEvent('touchstart', { touches: touchList });
      
      expect(input.getTouchCount()).toBe(1);
      expect(input.hasTouches()).toBe(true);
      expect(mockEvent.preventDefault).toHaveBeenCalled();

      simulateEvent('touchend', { touches: createMockTouchList([]) });
      
      expect(input.getTouchCount()).toBe(0);
      expect(input.hasTouches()).toBe(false);
    });

    it('should track multiple touches', () => {
      const touch1 = createMockTouch(1, 100, 200);
      const touch2 = createMockTouch(2, 300, 400);
      const touchList = createMockTouchList([touch1, touch2]);

      simulateEvent('touchstart', { touches: touchList });
      
      expect(input.getTouchCount()).toBe(2);
      expect(input.hasTouches()).toBe(true);
    });

    it('should handle touch to mouse translation', () => {
      const touch = createMockTouch(1, 150, 250);
      const touchList = createMockTouchList([touch]);

      simulateEvent('touchstart', { touches: touchList });
      simulateEvent('touchmove', { touches: touchList });
      
      expect(input.getMouseX()).toBe(150);
      expect(input.getMouseY()).toBe(250);
      expect(input.isMousePressed()).toBe(true);
    });

    it('should detect short tap as click', () => {
      vi.mocked(Date.now).mockReturnValue(1000);
      
      const touch = createMockTouch(1, 100, 200);
      simulateEvent('touchstart', { touches: createMockTouchList([touch]) });
      
      vi.mocked(Date.now).mockReturnValue(1150); // 150ms later
      simulateEvent('touchend', { touches: createMockTouchList([]) });
      
      expect(input.wasClicked()).toBe(true);
    });

    it('should not detect long press as click', () => {
      vi.mocked(Date.now).mockReturnValue(1000);
      
      const touch = createMockTouch(1, 100, 200);
      simulateEvent('touchstart', { touches: createMockTouchList([touch]) });
      
      vi.mocked(Date.now).mockReturnValue(1300); // 300ms later
      simulateEvent('touchend', { touches: createMockTouchList([]) });
      
      expect(input.wasClicked()).toBe(false);
    });

    it('should handle touch consumption', () => {
      expect(input.isTouchConsumed()).toBe(false);

      input.consumeTouch();
      expect(input.isTouchConsumed()).toBe(true);
      expect(input.wasClicked()).toBe(false);

      // Should reset on next touch
      simulateEvent('touchstart', { touches: createMockTouchList([createMockTouch(1, 0, 0)]) });
      expect(input.isTouchConsumed()).toBe(false);
    });

    it('should handle touch cancel correctly', () => {
      const touch = createMockTouch(1, 100, 200);
      simulateEvent('touchstart', { touches: createMockTouchList([touch]) });
      
      expect(input.getTouchCount()).toBe(1);
      // Touch start doesn't immediately set mousePressed true
      
      // Simulate touch move to trigger mouse pressed behavior
      simulateEvent('touchmove', { touches: createMockTouchList([touch]) });
      expect(input.isMousePressed()).toBe(true);

      const mockEvent = simulateEvent('touchcancel', { touches: createMockTouchList([]) });
      
      expect(input.getTouchCount()).toBe(0);
      expect(input.isMousePressed()).toBe(false);
      expect(input.isTouchConsumed()).toBe(false);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
  });

  describe('Pinch Gesture Recognition', () => {
    function createMockTouch(id, x, y) {
      return {
        identifier: id,
        clientX: x,
        clientY: y
      };
    }

    function createMockTouchList(touches) {
      const touchList = touches;
      touchList.length = touches.length;
      return touchList;
    }

    it('should initialize pinch gesture on two-finger touch', () => {
      const touch1 = createMockTouch(1, 100, 200);
      const touch2 = createMockTouch(2, 300, 400);
      const touchList = createMockTouchList([touch1, touch2]);

      simulateEvent('touchstart', { touches: touchList });
      
      expect(input.getPinchGesture()).toBeNull(); // No gesture yet, just initialized
    });

    it('should detect pinch out (zoom out) gesture', () => {
      const touch1 = createMockTouch(1, 200, 300);
      const touch2 = createMockTouch(2, 400, 300);
      let touchList = createMockTouchList([touch1, touch2]);

      // Initialize pinch
      simulateEvent('touchstart', { touches: touchList });
      
      // Move fingers apart
      touch1.clientX = 150; // Move left finger further left
      touch2.clientX = 450; // Move right finger further right
      touchList = createMockTouchList([touch1, touch2]);
      
      simulateEvent('touchmove', { touches: touchList });
      
      expect(input.getPinchGesture()).toBe('out');
      expect(input.hasPinchZoomOut()).toBe(true);
      expect(input.hasPinchZoomIn()).toBe(false);
    });

    it('should detect pinch in (zoom in) gesture', () => {
      const touch1 = createMockTouch(1, 150, 300);
      const touch2 = createMockTouch(2, 450, 300);
      let touchList = createMockTouchList([touch1, touch2]);

      // Initialize pinch
      simulateEvent('touchstart', { touches: touchList });
      
      // Move fingers closer
      touch1.clientX = 200; // Move left finger right
      touch2.clientX = 400; // Move right finger left
      touchList = createMockTouchList([touch1, touch2]);
      
      simulateEvent('touchmove', { touches: touchList });
      
      expect(input.getPinchGesture()).toBe('in');
      expect(input.hasPinchZoomIn()).toBe(true);
      expect(input.hasPinchZoomOut()).toBe(false);
    });

    it('should require minimum movement threshold for gesture detection', () => {
      const touch1 = createMockTouch(1, 200, 300);
      const touch2 = createMockTouch(2, 400, 300);
      let touchList = createMockTouchList([touch1, touch2]);

      simulateEvent('touchstart', { touches: touchList });
      
      // Small movement (below threshold)
      touch1.clientX = 202;
      touch2.clientX = 398;
      touchList = createMockTouchList([touch1, touch2]);
      
      simulateEvent('touchmove', { touches: touchList });
      
      expect(input.getPinchGesture()).toBeNull();
    });

    it('should clear pinch gesture when touch ends', () => {
      const touch1 = createMockTouch(1, 200, 300);
      const touch2 = createMockTouch(2, 400, 300);
      let touchList = createMockTouchList([touch1, touch2]);

      simulateEvent('touchstart', { touches: touchList });
      
      // Create pinch out gesture
      touch1.clientX = 150;
      touch2.clientX = 450;
      touchList = createMockTouchList([touch1, touch2]);
      simulateEvent('touchmove', { touches: touchList });
      
      expect(input.getPinchGesture()).toBe('out');
      
      // End touches
      simulateEvent('touchend', { touches: createMockTouchList([]) });
      
      expect(input.getPinchGesture()).toBeNull();
    });
  });

  describe('Game Control Methods', () => {
    it('should detect thrust input from multiple keys', () => {
      expect(input.isThrustPressed()).toBe(false);

      simulateEvent('keydown', { code: 'KeyW' });
      expect(input.isThrustPressed()).toBe(true);

      simulateEvent('keyup', { code: 'KeyW' });
      simulateEvent('keydown', { code: 'ArrowUp' });
      expect(input.isThrustPressed()).toBe(true);

      simulateEvent('keyup', { code: 'ArrowUp' });
      simulateEvent('keydown', { code: 'Space' });
      expect(input.isThrustPressed()).toBe(true);

      simulateEvent('keyup', { code: 'Space' });
      expect(input.isThrustPressed()).toBe(false);
    });

    it('should detect brake input from keyboard and mouse', () => {
      expect(input.isBrakePressed()).toBe(false);

      simulateEvent('keydown', { code: 'KeyS' });
      expect(input.isBrakePressed()).toBe(true);

      simulateEvent('keyup', { code: 'KeyS' });
      simulateEvent('keydown', { code: 'ArrowDown' });
      expect(input.isBrakePressed()).toBe(true);

      simulateEvent('keyup', { code: 'ArrowDown' });
      simulateEvent('mousedown', { button: 2 }); // Right mouse
      expect(input.isBrakePressed()).toBe(true);

      simulateEvent('mouseup', { button: 2 });
      expect(input.isBrakePressed()).toBe(false);
    });

    it('should detect left/right movement input', () => {
      expect(input.isLeftPressed()).toBe(false);
      expect(input.isRightPressed()).toBe(false);

      simulateEvent('keydown', { code: 'KeyA' });
      expect(input.isLeftPressed()).toBe(true);

      simulateEvent('keydown', { code: 'KeyD' });
      expect(input.isRightPressed()).toBe(true);

      simulateEvent('keyup', { code: 'KeyA' });
      simulateEvent('keydown', { code: 'ArrowLeft' });
      expect(input.isLeftPressed()).toBe(true);

      simulateEvent('keyup', { code: 'KeyD' });
      simulateEvent('keydown', { code: 'ArrowRight' });
      expect(input.isRightPressed()).toBe(true);
    });

    it('should detect UI toggle inputs', () => {
      expect(input.isMapTogglePressed()).toBe(false);

      simulateEvent('keydown', { code: 'KeyM' });
      expect(input.isMapTogglePressed()).toBe(true);

      input.clearFrameState();
      expect(input.isMapTogglePressed()).toBe(false);

      simulateEvent('keydown', { code: 'Tab' });
      expect(input.isMapTogglePressed()).toBe(true);
    });

    it('should detect logbook toggle', () => {
      simulateEvent('keydown', { code: 'KeyL' });
      expect(input.isLogbookTogglePressed()).toBe(true);

      input.clearFrameState();
      expect(input.isLogbookTogglePressed()).toBe(false);
    });

    it('should detect fullscreen toggle', () => {
      simulateEvent('keydown', { code: 'KeyF' });
      expect(input.isFullscreenTogglePressed()).toBe(true);

      input.clearFrameState();
      simulateEvent('keydown', { code: 'F11' });
      expect(input.isFullscreenTogglePressed()).toBe(true);
    });

    it('should detect mute toggle', () => {
      simulateEvent('keydown', { code: 'KeyQ' });
      expect(input.isMuteTogglePressed()).toBe(true);

      input.clearFrameState();
      expect(input.isMuteTogglePressed()).toBe(false);
    });
  });

  describe('Integration and Edge Cases', () => {
    it('should handle simultaneous keyboard and mouse input', () => {
      simulateEvent('keydown', { code: 'KeyW' });
      simulateEvent('mousedown', { button: 0 });
      simulateEvent('mousemove', { clientX: 100, clientY: 200 });

      expect(input.isThrustPressed()).toBe(true);
      expect(input.isMousePressed()).toBe(true);
      expect(input.getMouseX()).toBe(100);
      expect(input.getMouseY()).toBe(200);

      const direction = input.getMouseDirection(CANVAS_WIDTH, CANVAS_HEIGHT);
      expect(direction.intensity).toBeGreaterThan(0);
    });

    it('should handle multiple keys with different hold times', () => {
      simulateEvent('keydown', { code: 'KeyW' });
      input.update(0.1);

      simulateEvent('keydown', { code: 'KeyA' });
      input.update(0.1);

      expect(input.getKeyHoldTime('KeyW')).toBeCloseTo(0.2, 5);
      expect(input.getKeyHoldTime('KeyA')).toBeCloseTo(0.1, 5);

      expect(input.getThrustIntensity('KeyW')).toBeGreaterThan(input.getThrustIntensity('KeyA'));
    });

    it('should handle frame state clearing correctly', () => {
      simulateEvent('keydown', { code: 'KeyM' });
      simulateEvent('mousedown', { button: 0 });
      simulateEvent('wheel', { deltaY: 100 });

      expect(input.isMapTogglePressed()).toBe(true);
      expect(input.wasClicked()).toBe(true);
      expect(input.getWheelDelta()).toBe(100);

      input.clearFrameState();

      expect(input.isMapTogglePressed()).toBe(false);
      expect(input.wasClicked()).toBe(false);
      expect(input.getWheelDelta()).toBe(0);
      expect(input.isPressed('KeyM')).toBe(true); // Should still be pressed
    });

    it('should handle zero delta time gracefully', () => {
      simulateEvent('keydown', { code: 'KeyW' });
      
      input.update(0);
      expect(input.getKeyHoldTime('KeyW')).toBe(0);
      expect(input.getThrustIntensity('KeyW')).toBe(0); // No time = no intensity
      
      // After some time, should work normally
      input.update(0.1);
      expect(input.getThrustIntensity('KeyW')).toBeGreaterThan(0);
    });

    it('should handle very large delta times', () => {
      simulateEvent('keydown', { code: 'KeyW' });
      
      input.update(10.0); // 10 seconds
      expect(input.getKeyHoldTime('KeyW')).toBe(10.0);
      expect(input.getThrustIntensity('KeyW')).toBe(1.0); // Should max out
    });

    it('should handle touch and mouse conflicts correctly', () => {
      // Start with mouse
      simulateEvent('mousedown', { button: 0 });
      simulateEvent('mousemove', { clientX: 100, clientY: 200 });
      expect(input.isMousePressed()).toBe(true);

      // Touch should override mouse position but not interfere with mouse state
      const touch = { identifier: 1, clientX: 300, clientY: 400 };
      simulateEvent('touchstart', { touches: [touch] });
      simulateEvent('touchmove', { touches: [touch] });
      
      expect(input.getMouseX()).toBe(300);
      expect(input.getMouseY()).toBe(400);
      expect(input.isMousePressed()).toBe(true); // Touch sets this
    });
  });
});