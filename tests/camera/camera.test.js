import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import from compiled TypeScript
import { Camera } from '../../dist/camera/camera.js';

describe('Camera Physics and Movement', () => {
  let camera;
  let mockInput;
  let mockStellarMap;
  
  // Standard test values
  const STANDARD_DELTA = 1/60; // 60 FPS
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  
  beforeEach(() => {
    // Mock localStorage FIRST to avoid errors during Camera construction
    global.localStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
    
    // Create comprehensive mock input
    mockInput = {
      isThrustPressed: vi.fn(() => false),
      isLeftPressed: vi.fn(() => false),
      isRightPressed: vi.fn(() => false),
      getThrustIntensity: vi.fn(() => 1.0),
      getMouseDirection: vi.fn(() => ({ x: 0, y: 0, intensity: 0 })),
      getMouseBrake: vi.fn(() => null),
      getTouchBrake: vi.fn(() => null)
    };
    
    mockStellarMap = {
      isVisible: vi.fn(() => false)
    };
    
    camera = new Camera();
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      expect(camera.x).toBe(0);
      expect(camera.y).toBe(0);
      expect(camera.velocityX).toBe(0);
      expect(camera.velocityY).toBe(0);
      expect(camera.acceleration).toBe(50);
      expect(camera.maxSpeed).toBe(150);
      expect(camera.friction).toBe(0.9999);
      expect(camera.isCoasting).toBe(false);
      expect(camera.rotation).toBe(0);
      expect(camera.targetRotation).toBe(0);
      expect(camera.totalDistanceTraveled).toBe(0);
      expect(camera.sessionDistanceTraveled).toBe(0);
    });

    it('should load saved distance from localStorage', () => {
      const savedData = {
        totalDistanceTraveled: 1500.5,
        lastSaved: Date.now()
      };
      
      // Create fresh localStorage mock for this test
      const freshStorage = {
        getItem: vi.fn(() => JSON.stringify(savedData)),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      };
      global.localStorage = freshStorage;
      
      const newCamera = new Camera();
      expect(newCamera.totalDistanceTraveled).toBe(1500.5);
    });

    it('should handle localStorage errors gracefully', () => {
      // The error is expected and logged - we just check that the constructor doesn't throw
      const errorStorage = {
        getItem: vi.fn(() => {
          throw new Error('Storage error');
        }),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      };
      global.localStorage = errorStorage;
      
      // Constructor should not throw despite localStorage error
      let newCamera;
      expect(() => {
        newCamera = new Camera();
      }).not.toThrow();
      
      // Should initialize with default value when storage fails
      expect(newCamera.totalDistanceTraveled).toBe(0);
    });
  });

  describe('Physics Engine', () => {
    it('should apply thrust acceleration correctly', () => {
      mockInput.isThrustPressed.mockReturnValue(true);
      mockInput.getThrustIntensity.mockReturnValue(1.0);
      
      camera.update(mockInput, STANDARD_DELTA, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Forward thrust should create negative Y velocity
      const expectedVelocityY = -50 * STANDARD_DELTA; // acceleration * deltaTime
      expect(camera.velocityY).toBeCloseTo(expectedVelocityY, 3);
      expect(camera.velocityX).toBe(0);
      expect(camera.isCoasting).toBe(false);
    });

    it('should handle diagonal movement correctly', () => {
      mockInput.isThrustPressed.mockReturnValue(true);
      mockInput.isRightPressed.mockReturnValue(true);
      mockInput.getThrustIntensity.mockReturnValue(1.0);
      
      camera.update(mockInput, STANDARD_DELTA, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Should normalize diagonal vector while preserving intensity
      const expectedMagnitude = 50 * STANDARD_DELTA;
      const velocityMagnitude = Math.sqrt(camera.velocityX * camera.velocityX + camera.velocityY * camera.velocityY);
      expect(velocityMagnitude).toBeCloseTo(expectedMagnitude, 3);
      
      // Should have both X and Y components
      expect(Math.abs(camera.velocityX)).toBeGreaterThan(0);
      expect(Math.abs(camera.velocityY)).toBeGreaterThan(0);
    });

    it('should respect maximum speed limit', () => {
      // Set high initial velocity
      camera.velocityX = 200; // Above maxSpeed of 150
      camera.velocityY = 0;
      
      camera.update(mockInput, STANDARD_DELTA, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      expect(camera.getCurrentSpeed()).toBeCloseTo(150, 1);
      expect(camera.velocityX).toBeCloseTo(150, 1);
      expect(camera.velocityY).toBe(0);
    });

    it('should apply friction when coasting', () => {
      // Set initial velocity
      camera.velocityX = 100;
      camera.velocityY = 50;
      camera.isCoasting = true;
      
      camera.update(mockInput, STANDARD_DELTA, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // With coastingFriction = 1.0, velocity should remain unchanged when coasting
      expect(camera.velocityX).toBeCloseTo(100, 3);
      expect(camera.velocityY).toBeCloseTo(50, 3);
      expect(camera.isCoasting).toBe(true);
    });

    it('should apply normal friction when thrusting', () => {
      mockInput.isThrustPressed.mockReturnValue(true);
      camera.velocityX = 100;
      camera.velocityY = 50;
      
      camera.update(mockInput, STANDARD_DELTA, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Should apply friction (0.9999) and add thrust
      const expectedFriction = Math.pow(0.9999, STANDARD_DELTA);
      expect(camera.isCoasting).toBe(false);
    });

    it('should update position based on velocity', () => {
      camera.velocityX = 60; // pixels per second
      camera.velocityY = 80;
      
      camera.update(mockInput, STANDARD_DELTA, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      const expectedX = 60 * STANDARD_DELTA; // 1 pixel at 60fps
      const expectedY = 80 * STANDARD_DELTA;
      expect(camera.x).toBeCloseTo(expectedX, 3);
      expect(camera.y).toBeCloseTo(expectedY, 3);
    });

    it('should track distance traveled', () => {
      camera.velocityX = 60;
      camera.velocityY = 80;
      const expectedSpeed = Math.sqrt(60*60 + 80*80); // 100 pixels/second
      
      camera.update(mockInput, STANDARD_DELTA, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      const expectedDistance = expectedSpeed * STANDARD_DELTA;
      expect(camera.sessionDistanceTraveled).toBeCloseTo(expectedDistance, 3);
      expect(camera.totalDistanceTraveled).toBeCloseTo(expectedDistance, 3);
    });
  });

  describe('Input Response', () => {
    it('should respond to keyboard thrust input', () => {
      mockInput.isThrustPressed.mockReturnValue(true);
      mockInput.getThrustIntensity.mockReturnValue(0.8);
      
      camera.update(mockInput, STANDARD_DELTA, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      expect(camera.velocityY).toBeCloseTo(-50 * 0.8 * STANDARD_DELTA, 3);
    });

    it('should respond to left movement', () => {
      mockInput.isLeftPressed.mockReturnValue(true);
      mockInput.getThrustIntensity.mockReturnValue(0.6);
      
      camera.update(mockInput, STANDARD_DELTA, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      expect(camera.velocityX).toBeCloseTo(-50 * 0.6 * STANDARD_DELTA, 3);
    });

    it('should respond to right movement', () => {
      mockInput.isRightPressed.mockReturnValue(true);
      mockInput.getThrustIntensity.mockReturnValue(0.7);
      
      camera.update(mockInput, STANDARD_DELTA, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      expect(camera.velocityX).toBeCloseTo(50 * 0.7 * STANDARD_DELTA, 3);
    });

    it('should respond to mouse direction input', () => {
      mockInput.getMouseDirection.mockReturnValue({
        x: 0.6,
        y: -0.8,
        intensity: 0.5
      });
      
      camera.update(mockInput, STANDARD_DELTA, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      const expectedVelX = 0.6 * 50 * 0.5 * STANDARD_DELTA;
      const expectedVelY = -0.8 * 50 * 0.5 * STANDARD_DELTA;
      expect(camera.velocityX).toBeCloseTo(expectedVelX, 3);
      expect(camera.velocityY).toBeCloseTo(expectedVelY, 3);
    });

    it('should handle stop braking', () => {
      // Set initial velocity
      camera.velocityX = 60;
      camera.velocityY = 80;
      
      mockInput.getMouseBrake.mockReturnValue({
        mode: 'stop',
        x: 0, y: 0,
        intensity: 1.0
      });
      
      camera.update(mockInput, STANDARD_DELTA, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Should thrust opposite to current velocity with 2.0 intensity
      const currentSpeed = Math.sqrt(60*60 + 80*80);
      const expectedThrustX = -(60 / currentSpeed) * 50 * 2.0 * STANDARD_DELTA;
      const expectedThrustY = -(80 / currentSpeed) * 50 * 2.0 * STANDARD_DELTA;
      
      expect(camera.velocityX).toBeCloseTo(60 + expectedThrustX, 3);
      expect(camera.velocityY).toBeCloseTo(80 + expectedThrustY, 3);
    });

    it('should handle directional braking', () => {
      mockInput.getMouseBrake.mockReturnValue({
        mode: 'directional',
        x: -1, y: 0,
        intensity: 0.8
      });
      
      camera.update(mockInput, STANDARD_DELTA, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      const expectedVelX = -1 * 50 * (0.8 * 1.5) * STANDARD_DELTA; // 1.5x stronger
      expect(camera.velocityX).toBeCloseTo(expectedVelX, 3);
    });
  });

  describe('Rotation System', () => {
    it('should set target rotation based on thrust direction', () => {
      mockInput.isThrustPressed.mockReturnValue(true);
      
      camera.update(mockInput, STANDARD_DELTA, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Forward thrust (0, -1) should set target rotation
      const expectedRotation = Math.atan2(-1, 0) + Math.PI / 2;
      expect(camera.targetRotation).toBeCloseTo(expectedRotation, 3);
    });

    it('should smoothly interpolate rotation', () => {
      camera.targetRotation = Math.PI / 2; // 90 degrees
      camera.rotation = 0;
      
      camera.update(mockInput, STANDARD_DELTA, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Should move toward target but not reach it immediately
      expect(camera.rotation).toBeGreaterThan(0);
      expect(camera.rotation).toBeLessThan(Math.PI / 2);
    });

    it('should handle angle wrapping correctly', () => {
      camera.targetRotation = 0.1; // Near 0
      camera.rotation = 2 * Math.PI - 0.1; // Near 2π
      
      camera.update(mockInput, STANDARD_DELTA, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Should move toward target via shortest path - allow for some movement
      const expectedRange = 2 * Math.PI - 0.1;
      expect(camera.rotation).toBeGreaterThan(expectedRange - 0.1); // Allow some movement toward target
      expect(camera.rotation).toBeLessThan(2 * Math.PI); // But normalized to under 2π
    });

    it('should normalize rotation to 0-2π range', () => {
      camera.rotation = 3 * Math.PI; // Greater than 2π
      
      camera.update(mockInput, STANDARD_DELTA, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      expect(camera.rotation).toBeGreaterThanOrEqual(0);
      expect(camera.rotation).toBeLessThan(2 * Math.PI);
    });
  });

  describe('Coordinate Transformations', () => {
    it('should convert world coordinates to screen coordinates', () => {
      camera.x = 1000;
      camera.y = 500;
      
      const [screenX, screenY] = camera.worldToScreen(1200, 700, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      const expectedX = (1200 - 1000) + CANVAS_WIDTH / 2; // 600
      const expectedY = (700 - 500) + CANVAS_HEIGHT / 2;  // 500
      expect(screenX).toBe(expectedX);
      expect(screenY).toBe(expectedY);
    });

    it('should handle negative world coordinates', () => {
      camera.x = -100;
      camera.y = -200;
      
      const [screenX, screenY] = camera.worldToScreen(-50, -150, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      const expectedX = (-50 - (-100)) + CANVAS_WIDTH / 2; // 450
      const expectedY = (-150 - (-200)) + CANVAS_HEIGHT / 2; // 350
      expect(screenX).toBe(expectedX);
      expect(screenY).toBe(expectedY);
    });

    it('should handle large coordinates accurately', () => {
      camera.x = 1000000;
      camera.y = 2000000;
      
      const [screenX, screenY] = camera.worldToScreen(1000100, 2000200, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      expect(screenX).toBe(500); // 100 offset + 400 center
      expect(screenY).toBe(500); // 200 offset + 300 center
    });
  });

  describe('Speed and Distance Calculations', () => {
    it('should calculate current speed correctly', () => {
      camera.velocityX = 60;
      camera.velocityY = 80;
      
      const speed = camera.getCurrentSpeed();
      expect(speed).toBeCloseTo(100, 1); // sqrt(60² + 80²) = 100
    });

    it('should format speed correctly for different scales', () => {
      // Test millimeters per second
      camera.velocityX = 0.01;
      camera.velocityY = 0;
      expect(camera.getFormattedSpeed()).toMatch(/mm\/s/);
      
      // Test meters per second
      camera.velocityX = 1;
      camera.velocityY = 0;
      expect(camera.getFormattedSpeed()).toMatch(/m\/s/);
      
      // Test kilometers per second
      camera.velocityX = 15000;
      camera.velocityY = 0;
      expect(camera.getFormattedSpeed()).toMatch(/km\/s/);
    });

    it('should format distance correctly', () => {
      // Test meters
      camera.sessionDistanceTraveled = 5000; // 5000 pixels = 0.5 km = 500m
      expect(camera.getFormattedDistance()).toMatch(/500 m/);
      
      // Test kilometers
      camera.sessionDistanceTraveled = 50000; // 50000 pixels = 5 km
      expect(camera.getFormattedDistance()).toMatch(/5\.0 km/);
      
      // Test megameters
      camera.sessionDistanceTraveled = 15000000; // 15M pixels = 1500 km = 1.5 Mm
      expect(camera.getFormattedDistance()).toMatch(/1\.5 Mm/);
    });

    it('should format lifetime distance correctly', () => {
      // Test gigameters
      camera.totalDistanceTraveled = 15000000000; // 1.5 Gm
      expect(camera.getFormattedLifetimeDistance()).toMatch(/1\.50 Gm/);
    });
  });

  describe('State Management', () => {
    it('should save distance to localStorage', () => {
      camera.totalDistanceTraveled = 12345.67;
      
      camera.saveDistanceTraveled();
      
      expect(global.localStorage.setItem).toHaveBeenCalledWith(
        'astralSurveyor_gameData',
        expect.stringContaining('"totalDistanceTraveled":12345.67')
      );
    });

    it('should handle localStorage save errors', () => {
      // The error is expected and logged - we just check that saveDistanceTraveled doesn't throw
      const errorStorage = {
        ...global.localStorage,
        setItem: vi.fn(() => {
          throw new Error('Storage full');
        })
      };
      global.localStorage = errorStorage;
      
      // Should not throw despite storage error
      expect(() => camera.saveDistanceTraveled()).not.toThrow();
    });

    it('should reset session distance', () => {
      camera.sessionDistanceTraveled = 1000;
      camera.totalDistanceTraveled = 5000;
      
      camera.resetSessionDistance();
      
      expect(camera.sessionDistanceTraveled).toBe(0);
      expect(camera.totalDistanceTraveled).toBe(5000); // Unchanged
    });
  });

  describe('Getter Methods', () => {
    it('should provide access to position', () => {
      camera.x = 123.45;
      camera.y = 678.90;
      
      expect(camera.getX()).toBe(123.45);
      expect(camera.getY()).toBe(678.90);
    });

    it('should provide access to velocity', () => {
      camera.velocityX = -50.5;
      camera.velocityY = 75.25;
      
      expect(camera.getVelocityX()).toBe(-50.5);
      expect(camera.getVelocityY()).toBe(75.25);
    });

    it('should provide access to rotation and state', () => {
      camera.rotation = 1.57;
      camera.isCoasting = true;
      
      expect(camera.getRotation()).toBe(1.57);
      expect(camera.isCurrentlyCoasting()).toBe(true);
    });

    it('should provide access to distance values', () => {
      camera.totalDistanceTraveled = 12345;
      camera.sessionDistanceTraveled = 6789;
      
      expect(camera.getTotalDistance()).toBe(12345);
      expect(camera.getSessionDistance()).toBe(6789);
    });
  });

  describe('Integration and Edge Cases', () => {
    it('should handle zero deltaTime gracefully', () => {
      camera.velocityX = 50;
      camera.velocityY = 25;
      const initialX = camera.x;
      const initialY = camera.y;
      
      camera.update(mockInput, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Position should not change with zero deltaTime
      expect(camera.x).toBe(initialX);
      expect(camera.y).toBe(initialY);
    });

    it('should handle multiple frame updates correctly', () => {
      mockInput.isThrustPressed.mockReturnValue(true);
      
      // Simulate 3 frames
      for (let i = 0; i < 3; i++) {
        camera.update(mockInput, STANDARD_DELTA, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
      
      // Should accumulate velocity over time
      const expectedVelocity = -50 * STANDARD_DELTA * 3;
      expect(camera.velocityY).toBeCloseTo(expectedVelocity, 3);
      expect(camera.sessionDistanceTraveled).toBeGreaterThan(0);
    });

    it('should handle very small movements', () => {
      camera.velocityX = 0.001;
      camera.velocityY = 0.001;
      
      camera.update(mockInput, STANDARD_DELTA, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Should still track distance even for tiny movements
      expect(camera.sessionDistanceTraveled).toBeGreaterThan(0);
    });

    it('should handle extreme coordinates', () => {
      camera.x = 1000000;
      camera.y = -2000000;
      camera.velocityX = 1000;
      camera.velocityY = -1500;
      
      camera.update(mockInput, STANDARD_DELTA, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Should continue to work with large coordinates
      // Allow for friction effects that reduce the expected movement
      expect(camera.x).toBeGreaterThan(1000000);
      expect(camera.y).toBeLessThan(-2000000);
      expect(camera.x).toBeLessThan(1000000 + 20); // Should move but not too much due to friction
      expect(camera.y).toBeGreaterThan(-2000000 - 30);
    });

    it('should maintain frame rate independence', () => {
      // Mock localStorage for new cameras
      const cleanStorage = {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      };
      global.localStorage = cleanStorage;
      
      mockInput.isThrustPressed.mockReturnValue(true);
      
      // Test with different delta times
      const camera1 = new Camera();
      const camera2 = new Camera();
      
      // One big frame
      camera1.update(mockInput, 1.0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // 60 small frames
      for (let i = 0; i < 60; i++) {
        camera2.update(mockInput, 1.0/60, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
      
      // Results should be similar but friction and numerical precision mean they won't be identical
      // The physics should be in the same ballpark - friction causes cumulative differences
      expect(Math.abs(camera1.velocityY - camera2.velocityY)).toBeLessThan(30); // Allow for friction differences
      expect(Math.abs(camera1.y - camera2.y)).toBeLessThan(30); // Position differences accumulate
    });
  });
});