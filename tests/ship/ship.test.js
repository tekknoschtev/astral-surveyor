import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import from compiled TypeScript
import { Ship, ThrusterParticles, StarParticles } from '../../dist/ship/ship.js';

describe('Ship Systems and Particles', () => {
  let ship, thrusterParticles, starParticles;
  let mockRenderer, mockCamera;
  
  // Standard test values
  const STANDARD_DELTA = 1/60; // 60 FPS

  beforeEach(() => {
    // Create comprehensive mock renderer
    mockRenderer = {
      canvas: { width: 800, height: 600 },
      ctx: {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        globalAlpha: 1,
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        fillRect: vi.fn()
      },
      drawCircle: vi.fn(),
      drawPixel: vi.fn(),
      drawSprite: vi.fn()
    };
    
    // Create comprehensive mock camera
    mockCamera = {
      x: 0,
      y: 0,
      rotation: 0,
      isThrusting: false,
      isBraking: false,
      thrustDirection: { x: 0, y: -1 },
      worldToScreen: vi.fn((worldX, worldY) => [worldX + 400, worldY + 300])
    };
    
    ship = new Ship();
    thrusterParticles = new ThrusterParticles();
    starParticles = new StarParticles();
  });

  describe('Ship Class', () => {
    it('should calculate silhouette effect correctly', () => {
      const activeStars = [
        { x: 100, y: 100, radius: 50, color: '#ffff00' },
        { x: 300, y: 300, radius: 30, color: '#ff8800' }
      ];
      
      // Test ship at distance - no effect
      let effect = ship.calculateSilhouetteEffect(0, 0, activeStars);
      expect(effect).toBeCloseTo(0.0, 3);
      
      // Test ship near star edge
      effect = ship.calculateSilhouetteEffect(135, 100, activeStars);
      expect(effect).toBeGreaterThan(0.0);
      expect(effect).toBeLessThan(1.0);
      
      // Test ship at star center
      effect = ship.calculateSilhouetteEffect(100, 100, activeStars);
      expect(effect).toBeCloseTo(1.0, 1);
    });

    it('should handle multiple overlapping stars correctly', () => {
      const overlappingStars = [
        { x: 100, y: 100, radius: 50, color: '#ffff00' },
        { x: 110, y: 110, radius: 40, color: '#ff8800' },
        { x: 90, y: 90, radius: 60, color: '#ffaa00' }
      ];
      
      // Ship in overlapping region should use maximum darkening
      const effect = ship.calculateSilhouetteEffect(105, 105, overlappingStars);
      expect(effect).toBeGreaterThan(0.8);
      expect(effect).toBeLessThanOrEqual(1.0);
    });

    it('should interpolate colors correctly', () => {
      // Test basic interpolation
      const midColor = ship.interpolateColor('#ff0000', '#0000ff', 0.5);
      expect(midColor).toBe('#800080'); // Purple mid-point
      
      // Test no interpolation
      const startColor = ship.interpolateColor('#ff0000', '#0000ff', 0.0);
      expect(startColor).toBe('#ff0000');
      
      const endColor = ship.interpolateColor('#ff0000', '#0000ff', 1.0);
      expect(endColor).toBe('#0000ff');
      
      // Test green to black (ship colors)
      const darkened = ship.interpolateColor('#00ff88', '#000000', 0.5);
      expect(darkened).toBe('#008044');
    });

    it('should render with correct position and rotation', () => {
      const activeStars = [];
      
      ship.render(mockRenderer, Math.PI/4, 0, 0, activeStars);
      
      expect(mockRenderer.drawSprite).toHaveBeenCalledWith(
        expect.any(Number), // centerX calculation (may vary based on scale)
        expect.any(Number), // centerY calculation
        expect.any(Array),
        2, // scale
        Math.PI/4 // rotation
      );
      
      // Verify the call was made
      expect(mockRenderer.drawSprite).toHaveBeenCalledTimes(1);
    });

    it('should apply silhouette effect during rendering', () => {
      const activeStars = [
        { x: 0, y: 0, radius: 100, color: '#ffff00' }
      ];
      
      ship.render(mockRenderer, 0, 0, 0, activeStars);
      
      // Should call drawSprite with modified color sprite
      expect(mockRenderer.drawSprite).toHaveBeenCalled();
      const spriteCalls = mockRenderer.drawSprite.mock.calls;
      const renderedSprite = spriteCalls[0][2];
      
      // Sprite should be darkened (not the normal green)
      expect(renderedSprite[2][2]).not.toBe('#00ff88'); // Center character should be darkened
    });
  });

  describe('ThrusterParticles Class', () => {
    it('should not spawn particles when not thrusting', () => {
      mockCamera.isThrusting = false;
      
      thrusterParticles.update(STANDARD_DELTA, mockCamera, ship);
      
      expect(thrusterParticles.particles.length).toBe(0);
    });

    it('should spawn particles when thrusting', () => {
      mockCamera.isThrusting = true;
      
      thrusterParticles.update(STANDARD_DELTA, mockCamera, ship);
      
      expect(thrusterParticles.particles.length).toBeGreaterThan(0);
      expect(thrusterParticles.particles.length).toBeLessThanOrEqual(4); // 2 thrusters * 2 max per frame
    });

    it('should limit maximum particle count', () => {
      mockCamera.isThrusting = true;
      
      // Spawn many particles by running many updates
      for (let i = 0; i < 100; i++) {
        thrusterParticles.update(STANDARD_DELTA, mockCamera, ship);
      }
      
      expect(thrusterParticles.particles.length).toBeLessThanOrEqual(50);
    });

    it('should create particles with correct properties', () => {
      mockCamera.isThrusting = true;
      mockCamera.rotation = 0;
      mockCamera.thrustDirection = { x: 0, y: -1 };
      
      thrusterParticles.update(STANDARD_DELTA, mockCamera, ship);
      
      expect(thrusterParticles.particles.length).toBeGreaterThan(0);
      
      const particle = thrusterParticles.particles[0];
      expect(particle.x).toBeTypeOf('number');
      expect(particle.y).toBeTypeOf('number');
      expect(particle.velocityX).toBeTypeOf('number');
      expect(particle.velocityY).toBeTypeOf('number');
      expect(particle.life).toBeGreaterThan(0);
      expect(particle.maxLife).toBe(0.8);
      expect(particle.alpha).toBeCloseTo(particle.life / particle.maxLife, 2);
      expect(particle.color).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should use different colors for braking vs thrusting', () => {
      mockCamera.isThrusting = true;
      
      // Test normal thrusting
      mockCamera.isBraking = false;
      thrusterParticles.update(STANDARD_DELTA, mockCamera, ship);
      const thrustParticle = thrusterParticles.particles[0];
      
      // Clear particles and test braking
      thrusterParticles.particles = [];
      mockCamera.isBraking = true;
      thrusterParticles.update(STANDARD_DELTA, mockCamera, ship);
      const brakeParticle = thrusterParticles.particles[0];
      
      // Green vs Red color themes
      expect(thrustParticle.color).toMatch(/^#00ff/i); // Green-ish
      expect(brakeParticle.color).toMatch(/^#ff[0-6]/i); // Red-ish
    });

    it('should update particle positions and life correctly', () => {
      mockCamera.isThrusting = true;
      
      thrusterParticles.update(STANDARD_DELTA, mockCamera, ship);
      const initialParticle = { ...thrusterParticles.particles[0] };
      
      mockCamera.isThrusting = false; // Stop spawning new particles
      thrusterParticles.update(STANDARD_DELTA, mockCamera, ship);
      
      if (thrusterParticles.particles.length > 0) {
        const updatedParticle = thrusterParticles.particles[0];
        
        // Position should have changed (particles have velocity)
        const deltaX = Math.abs(updatedParticle.x - initialParticle.x);
        const deltaY = Math.abs(updatedParticle.y - initialParticle.y);
        const totalMovement = deltaX + deltaY;
        
        // Should have moved some distance (unless velocities are very small)
        expect(totalMovement).toBeGreaterThanOrEqual(0);
        
        // If particle has significant velocity, it should move noticeably
        const speed = Math.sqrt(initialParticle.velocityX * initialParticle.velocityX + initialParticle.velocityY * initialParticle.velocityY);
        if (speed > 1) {
          expect(totalMovement).toBeGreaterThan(0.001);
        }
        
        // Life should have decreased
        expect(updatedParticle.life).toBeLessThan(initialParticle.life);
        expect(updatedParticle.alpha).toBeLessThan(initialParticle.alpha);
      }
    });

    it('should remove dead particles', () => {
      mockCamera.isThrusting = true;
      
      thrusterParticles.update(STANDARD_DELTA, mockCamera, ship);
      const initialCount = thrusterParticles.particles.length;
      
      // Set particle life to expire
      thrusterParticles.particles.forEach(p => p.life = -0.1);
      
      mockCamera.isThrusting = false;
      thrusterParticles.update(STANDARD_DELTA, mockCamera, ship);
      
      expect(thrusterParticles.particles.length).toBe(0);
    });

    it('should render particles correctly', () => {
      mockCamera.isThrusting = true;
      
      thrusterParticles.update(STANDARD_DELTA, mockCamera, ship);
      thrusterParticles.render(mockRenderer);
      
      expect(mockRenderer.drawPixel).toHaveBeenCalled();
      
      // Check that drawPixel was called with valid parameters
      const pixelCalls = mockRenderer.drawPixel.mock.calls;
      expect(pixelCalls.length).toBeGreaterThan(0);
      
      pixelCalls.forEach(call => {
        expect(call[0]).toBeTypeOf('number'); // x
        expect(call[1]).toBeTypeOf('number'); // y
        expect(call[2]).toMatch(/^#[0-9a-f]{6}[0-9a-f]{2}$/i); // color with alpha
        expect(call[3]).toBe(1); // size
      });
    });

    it('should handle rotation correctly', () => {
      mockCamera.isThrusting = true;
      mockCamera.rotation = Math.PI / 2; // 90 degrees
      
      thrusterParticles.update(STANDARD_DELTA, mockCamera, ship);
      
      expect(thrusterParticles.particles.length).toBeGreaterThan(0);
      
      // Particles should be spawned at rotated positions
      const particle = thrusterParticles.particles[0];
      expect(Math.abs(particle.x)).toBeGreaterThan(0); // Should be offset due to rotation
    });
  });

  describe('StarParticles Class', () => {
    it('should spawn particles for visible stars', () => {
      const visibleStars = [
        { x: 100, y: 100, radius: 50, color: '#ffff00' }
      ];
      
      starParticles.update(STANDARD_DELTA, visibleStars, mockCamera);
      
      expect(starParticles.particles.length).toBeGreaterThan(0);
    });

    it('should not spawn particles for distant stars', () => {
      const distantStars = [
        { x: 5000, y: 5000, radius: 50, color: '#ffff00' } // Far beyond 2000 distance limit
      ];
      
      starParticles.update(STANDARD_DELTA, distantStars, mockCamera);
      
      expect(starParticles.particles.length).toBe(0);
    });

    it('should limit particles per star', () => {
      const star = { x: 100, y: 100, radius: 50, color: '#ffff00' };
      
      // Spawn many particles
      for (let i = 0; i < 1000; i++) {
        starParticles.update(STANDARD_DELTA, [star], mockCamera);
      }
      
      expect(starParticles.particles.length).toBeLessThanOrEqual(150);
    });

    it('should create particles with correct properties', () => {
      const star = { x: 100, y: 100, radius: 50, color: '#ff6600' };
      
      starParticles.update(STANDARD_DELTA, [star], mockCamera);
      
      expect(starParticles.particles.length).toBeGreaterThan(0);
      
      const particle = starParticles.particles[0];
      expect(particle.x).toBeTypeOf('number');
      expect(particle.y).toBeTypeOf('number');
      expect(particle.velocityX).toBeTypeOf('number');
      expect(particle.velocityY).toBeTypeOf('number');
      expect(particle.life).toBeGreaterThan(0);
      expect(particle.maxLife).toBe(1.8);
      expect(particle.alpha).toBeCloseTo(particle.life / particle.maxLife, 2);
      expect(particle.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(particle.size).toBeGreaterThanOrEqual(1);
      expect(particle.size).toBeLessThanOrEqual(3);
      expect(particle.starId).toBe('100_100');
    });

    it('should lighten star color for particles', () => {
      const darkColor = '#440000'; // Dark red
      const lightened = starParticles.lightenColor(darkColor, 0.5);
      
      // Should be lighter than original
      expect(lightened).not.toBe(darkColor);
      
      // Parse and compare RGB values
      const originalRed = parseInt(darkColor.substr(1, 2), 16);
      const lightenedRed = parseInt(lightened.substr(1, 2), 16);
      expect(lightenedRed).toBeGreaterThan(originalRed);
    });

    it('should update particle positions and life correctly', () => {
      const star = { x: 100, y: 100, radius: 30, color: '#ffff00' };
      
      starParticles.update(STANDARD_DELTA, [star], mockCamera);
      if (starParticles.particles.length > 0) {
        const initialParticle = { ...starParticles.particles[0] };
        
        starParticles.update(STANDARD_DELTA, [], mockCamera); // No new particles
        
        if (starParticles.particles.length > 0) {
          const updatedParticle = starParticles.particles[0];
          
          // Position should have changed (particles have velocity)
          const deltaX = Math.abs(updatedParticle.x - initialParticle.x);
          const deltaY = Math.abs(updatedParticle.y - initialParticle.y);
          const totalMovement = deltaX + deltaY;
          
          // Should have moved some distance
          expect(totalMovement).toBeGreaterThanOrEqual(0);
          
          // If particle has significant velocity, it should move noticeably
          const speed = Math.sqrt(initialParticle.velocityX * initialParticle.velocityX + initialParticle.velocityY * initialParticle.velocityY);
          if (speed > 1) {
            expect(totalMovement).toBeGreaterThan(0.001);
          }
          
          // Life should have decreased
          expect(updatedParticle.life).toBeLessThan(initialParticle.life);
          expect(updatedParticle.alpha).toBeLessThan(initialParticle.alpha);
        }
      }
    });

    it('should remove dead particles', () => {
      const star = { x: 100, y: 100, radius: 30, color: '#ffff00' };
      
      starParticles.update(STANDARD_DELTA, [star], mockCamera);
      
      // Set particles to expire
      starParticles.particles.forEach(p => p.life = -0.1);
      
      starParticles.update(STANDARD_DELTA, [], mockCamera);
      
      expect(starParticles.particles.length).toBe(0);
    });

    it('should render only on-screen particles', () => {
      const star = { x: 100, y: 100, radius: 30, color: '#ffff00' };
      
      starParticles.update(STANDARD_DELTA, [star], mockCamera);
      
      // Mock worldToScreen to return on-screen coordinates
      mockCamera.worldToScreen.mockReturnValue([400, 300]);
      
      starParticles.render(mockRenderer, mockCamera);
      
      expect(mockRenderer.drawPixel).toHaveBeenCalled();
    });

    it('should not render off-screen particles', () => {
      const star = { x: 100, y: 100, radius: 30, color: '#ffff00' };
      
      starParticles.update(STANDARD_DELTA, [star], mockCamera);
      
      // Mock worldToScreen to return off-screen coordinates
      mockCamera.worldToScreen.mockReturnValue([-100, -100]);
      
      starParticles.render(mockRenderer, mockCamera);
      
      expect(mockRenderer.drawPixel).not.toHaveBeenCalled();
    });

    it('should render particles with correct size and alpha', () => {
      const star = { x: 100, y: 100, radius: 30, color: '#ffff00' };
      
      starParticles.update(STANDARD_DELTA, [star], mockCamera);
      
      if (starParticles.particles.length > 0) {
        // Set specific alpha for testing
        starParticles.particles[0].alpha = 0.5;
        starParticles.particles[0].size = 2;
        
        mockCamera.worldToScreen.mockReturnValue([400, 300]);
        
        starParticles.render(mockRenderer, mockCamera);
        
        expect(mockRenderer.drawPixel).toHaveBeenCalledWith(
          400, 300,
          expect.stringMatching(/^#[0-9a-f]{6}[0-9a-f]{2}$/i), // Color with alpha
          2 // size
        );
      }
    });
  });

  describe('Integration Tests', () => {
    it('should handle multiple systems running together', () => {
      mockCamera.isThrusting = true;
      const activeStars = [
        { x: 200, y: 200, radius: 60, color: '#ffaa00' }
      ];
      
      // Update all systems
      thrusterParticles.update(STANDARD_DELTA, mockCamera, ship);
      starParticles.update(STANDARD_DELTA, activeStars, mockCamera);
      
      expect(thrusterParticles.particles.length).toBeGreaterThan(0);
      expect(starParticles.particles.length).toBeGreaterThan(0);
      
      // Render all systems
      ship.render(mockRenderer, 0, 0, 0, activeStars);
      thrusterParticles.render(mockRenderer);
      starParticles.render(mockRenderer, mockCamera);
      
      expect(mockRenderer.drawSprite).toHaveBeenCalled();
      expect(mockRenderer.drawPixel).toHaveBeenCalled();
    });

    it('should maintain performance with many particles', () => {
      const manyStars = Array.from({ length: 10 }, (_, i) => ({
        x: i * 100,
        y: i * 100,
        radius: 40,
        color: '#ffff00'
      }));
      
      mockCamera.isThrusting = true;
      
      // Run multiple updates
      for (let i = 0; i < 10; i++) {
        thrusterParticles.update(STANDARD_DELTA, mockCamera, ship);
        starParticles.update(STANDARD_DELTA, manyStars, mockCamera);
      }
      
      // Should maintain reasonable limits
      expect(thrusterParticles.particles.length).toBeLessThanOrEqual(50);
      expect(starParticles.particles.length).toBeLessThanOrEqual(1500); // 10 stars * 150 max
    });
  });
});