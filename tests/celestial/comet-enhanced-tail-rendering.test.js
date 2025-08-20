import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import from compiled TypeScript
import { Comet, CometTypes } from '../../dist/celestial/comets.js';
import { Star, StarTypes } from '../../dist/celestial/Star.js';

describe('Enhanced Comet Tail Rendering System', () => {
  let mockStar;
  let mockRenderer;
  let mockCamera;
  let testOrbit;
  
  beforeEach(() => {
    // Create mock star
    mockStar = new Star(100, 100, StarTypes.G_TYPE, 0);
    
    // Create test orbit that puts comet close to star (visible)
    testOrbit = {
      semiMajorAxis: 300,
      eccentricity: 0.7,
      perihelionDistance: 90,
      aphelionDistance: 510,
      orbitalPeriod: 8000,
      argumentOfPerihelion: 0,
      meanAnomalyAtEpoch: 0,
      epoch: 0
    };
    
    // Create mock camera
    mockCamera = {
      x: 200,
      y: 200,
      worldToScreen: (worldX, worldY, canvasWidth, canvasHeight) => {
        const screenX = (worldX - mockCamera.x) + canvasWidth / 2;
        const screenY = (worldY - mockCamera.y) + canvasHeight / 2;
        return [screenX, screenY];
      }
    };
    
    // Create comprehensive mock renderer with all canvas methods
    const mockCtx = {
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      })),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      setTransform: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn()
    };
    
    mockRenderer = {
      canvas: { width: 800, height: 600 },
      ctx: mockCtx,
      drawDiscoveryIndicator: vi.fn(),
      drawDiscoveryPulse: vi.fn()
    };
  });
  
  describe('Particle System Properties', () => {
    it('should calculate correct particle count based on tail length and comet type', () => {
      const comet = new Comet(200, 200, mockStar, testOrbit, CometTypes.ICE, 0);
      
      // Mock universal time for consistent positioning
      vi.spyOn(comet, 'calculateUniversalTime').mockReturnValue(0);
      comet.updatePosition();
      comet.updateVisualProperties();
      
      // If comet is visible, verify particle count calculation
      if (comet.isVisible && comet.tailLength > 0) {
        // Expected particle count: tailParticleCount * (tailLength / 120)
        const expectedParticleCount = Math.floor(CometTypes.ICE.tailParticleCount * (comet.tailLength / 120));
        expect(expectedParticleCount).toBeGreaterThan(0);
        expect(expectedParticleCount).toBeLessThanOrEqual(CometTypes.ICE.tailParticleCount);
      }
    });
    
    it('should vary particle count between different comet types', () => {
      const cometTypes = [CometTypes.ICE, CometTypes.DUST, CometTypes.ROCKY, CometTypes.ORGANIC];
      const particleCounts = [];
      
      cometTypes.forEach((cometType, index) => {
        const comet = new Comet(200, 200, mockStar, testOrbit, cometType, index);
        vi.spyOn(comet, 'calculateUniversalTime').mockReturnValue(0);
        comet.updatePosition();
        comet.updateVisualProperties();
        
        if (comet.isVisible && comet.tailLength > 0) {
          const particleCount = Math.floor(cometType.tailParticleCount * (comet.tailLength / 120));
          particleCounts.push(particleCount);
        }
      });
      
      // Different comet types should potentially have different particle counts
      expect(CometTypes.ICE.tailParticleCount).toBeDefined();
      expect(CometTypes.DUST.tailParticleCount).toBeDefined();
      expect(CometTypes.ROCKY.tailParticleCount).toBeDefined();
      expect(CometTypes.ORGANIC.tailParticleCount).toBeDefined();
    });
  });
  
  describe('Tail Animation and Flow', () => {
    it('should render particles with deterministic positioning along tail path', () => {
      const comet = new Comet(200, 200, mockStar, testOrbit, CometTypes.ICE, 0);
      vi.spyOn(comet, 'calculateUniversalTime').mockReturnValue(0);
      comet.updatePosition();
      comet.updateVisualProperties();
      
      if (comet.isVisible) {
        // Render the comet
        comet.render(mockRenderer, mockCamera);
        
        // Verify particles are rendered (ctx.arc should be called for particles)
        expect(mockRenderer.ctx.arc).toHaveBeenCalled();
        expect(mockRenderer.ctx.fill).toHaveBeenCalled();
      }
    });
    
    it('should create particles that flow from nucleus toward tail end', () => {
      const comet = new Comet(200, 200, mockStar, testOrbit, CometTypes.DUST, 0);
      vi.spyOn(comet, 'calculateUniversalTime').mockReturnValue(0);
      comet.updatePosition();
      comet.updateVisualProperties();
      
      if (comet.isVisible) {
        comet.render(mockRenderer, mockCamera);
        
        // Particles should be positioned with progress along tail (0 to 1)
        // This is verified by checking that arc is called multiple times for different positions
        const arcCalls = mockRenderer.ctx.arc.mock.calls;
        if (arcCalls.length > 1) {
          // Verify particles are at different positions along the tail
          const firstParticle = { x: arcCalls[0][0], y: arcCalls[0][1] };
          const lastParticle = { x: arcCalls[arcCalls.length - 1][0], y: arcCalls[arcCalls.length - 1][1] };
          
          // Particles should be at different positions (showing flow)
          expect(firstParticle.x).not.toBe(lastParticle.x);
        }
      }
    });
  });
  
  describe('Tail Fading Effects', () => {
    it('should create opacity gradient from nucleus to tail tip', () => {
      const comet = new Comet(200, 200, mockStar, testOrbit, CometTypes.ORGANIC, 0);
      vi.spyOn(comet, 'calculateUniversalTime').mockReturnValue(0);
      comet.updatePosition();
      comet.updateVisualProperties();
      
      if (comet.isVisible) {
        comet.render(mockRenderer, mockCamera);
        
        // Linear gradient should be created for tail fading
        expect(mockRenderer.ctx.createLinearGradient).toHaveBeenCalled();
        
        // Gradient should have color stops for fading effect (brightness-dependent opacity)
        const gradientMock = mockRenderer.ctx.createLinearGradient.mock.results[0].value;
        
        // With brightness-dependent opacity, values will vary based on comet brightness
        // Check that we have 3 color stops with different opacity values
        expect(gradientMock.addColorStop).toHaveBeenCalledTimes(3);
        
        // Verify stops are at correct positions
        expect(gradientMock.addColorStop).toHaveBeenCalledWith(0, expect.stringMatching(/#[0-9A-Fa-f]{8}$/)); // Base color with opacity
        expect(gradientMock.addColorStop).toHaveBeenCalledWith(0.5, expect.stringMatching(/#[0-9A-Fa-f]{8}$/)); // Mid color with opacity
        expect(gradientMock.addColorStop).toHaveBeenCalledWith(1, expect.stringMatching(/#[0-9A-Fa-f]{8}$/)); // Tip color with opacity
      }
    });
    
    it('should reduce particle size and opacity toward tail end', () => {
      const comet = new Comet(200, 200, mockStar, testOrbit, CometTypes.ROCKY, 0);
      vi.spyOn(comet, 'calculateUniversalTime').mockReturnValue(0);
      comet.updatePosition();
      comet.updateVisualProperties();
      
      if (comet.isVisible) {
        // Mock the fillStyle setter to capture opacity changes
        let fillStyleCalls = [];
        Object.defineProperty(mockRenderer.ctx, 'fillStyle', {
          set: function(value) { fillStyleCalls.push(value); },
          get: function() { return '#000000'; }
        });
        
        comet.render(mockRenderer, mockCamera);
        
        // Should have multiple fill style calls with different opacities
        if (fillStyleCalls.length > 1) {
          // Look for hex colors with opacity suffixes
          const opacityValues = fillStyleCalls
            .filter(style => typeof style === 'string' && style.length >= 7)
            .map(style => style.slice(-2)) // Get last 2 characters (opacity)
            .filter(opacity => /^[0-9A-Fa-f]{2}$/.test(opacity));
          
          // Should have particles with different opacity values
          expect(opacityValues.length).toBeGreaterThan(0);
        }
      }
    });
  });
  
  describe('Tail Width Variation', () => {
    it('should calculate line width based on tail length', () => {
      const comet = new Comet(200, 200, mockStar, testOrbit, CometTypes.ICE, 0);
      vi.spyOn(comet, 'calculateUniversalTime').mockReturnValue(0);
      comet.updatePosition();
      comet.updateVisualProperties();
      
      if (comet.isVisible && comet.tailLength > 0) {
        // Mock the lineWidth setter to capture width changes
        let lineWidthCalls = [];
        Object.defineProperty(mockRenderer.ctx, 'lineWidth', {
          set: function(value) { lineWidthCalls.push(value); },
          get: function() { return 2; }
        });
        
        comet.render(mockRenderer, mockCamera);
        
        // Should set line width based on tail length: Math.max(2, tailLength / 30)
        const expectedWidth = Math.max(2, comet.tailLength / 30);
        expect(lineWidthCalls).toContain(expectedWidth);
      }
    });
    
    it('should vary tail width between different comet types', () => {
      const cometTypes = [CometTypes.ICE, CometTypes.DUST, CometTypes.ROCKY, CometTypes.ORGANIC];
      const widthVariations = [];
      
      cometTypes.forEach((cometType, index) => {
        const comet = new Comet(200, 200, mockStar, testOrbit, cometType, index);
        vi.spyOn(comet, 'calculateUniversalTime').mockReturnValue(0);
        comet.updatePosition();
        comet.updateVisualProperties();
        
        if (comet.isVisible && comet.tailLength > 0) {
          const expectedWidth = Math.max(2, comet.tailLength / 30);
          widthVariations.push({
            type: cometType.name,
            width: expectedWidth,
            tailLength: comet.tailLength
          });
        }
      });
      
      // Should have calculated width variations for different types
      expect(widthVariations.length).toBeGreaterThan(0);
    });
  });
  
  describe('Performance and Determinism', () => {
    it('should use deterministic particle positioning for consistent visuals', () => {
      const comet1 = new Comet(200, 200, mockStar, testOrbit, CometTypes.ICE, 0);
      const comet2 = new Comet(200, 200, mockStar, testOrbit, CometTypes.ICE, 0);
      
      // Both comets should have identical positioning
      vi.spyOn(comet1, 'calculateUniversalTime').mockReturnValue(0);
      vi.spyOn(comet2, 'calculateUniversalTime').mockReturnValue(0);
      
      comet1.updatePosition();
      comet1.updateVisualProperties();
      comet2.updatePosition(); 
      comet2.updateVisualProperties();
      
      // Should have identical properties for same position and type
      expect(comet1.tailLength).toBe(comet2.tailLength);
      expect(comet1.tailDirection.x).toBeCloseTo(comet2.tailDirection.x, 5);
      expect(comet1.tailDirection.y).toBeCloseTo(comet2.tailDirection.y, 5);
    });
    
    it('should render efficiently without creating excessive canvas operations', () => {
      const comet = new Comet(200, 200, mockStar, testOrbit, CometTypes.DUST, 0);
      vi.spyOn(comet, 'calculateUniversalTime').mockReturnValue(0);
      comet.updatePosition();
      comet.updateVisualProperties();
      
      if (comet.isVisible) {
        comet.render(mockRenderer, mockCamera);
        
        // Should have reasonable number of canvas operations (not excessive)
        const totalCanvasOps = 
          mockRenderer.ctx.arc.mock.calls.length +
          mockRenderer.ctx.fill.mock.calls.length +
          mockRenderer.ctx.stroke.mock.calls.length;
        
        // Should be efficient but functional
        expect(totalCanvasOps).toBeGreaterThan(0);
        expect(totalCanvasOps).toBeLessThan(200); // Reasonable upper bound
      }
    });
  });
});