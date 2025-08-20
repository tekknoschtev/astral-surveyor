import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import from compiled TypeScript
import { Comet, CometTypes } from '../../dist/celestial/comets.js';
import { Star, StarTypes } from '../../dist/celestial/Star.js';

describe('Comet Type Visual Specializations (Phase 4.3)', () => {
  let mockStar;
  let mockRenderer;
  let mockCamera;
  let testOrbit;
  
  beforeEach(() => {
    mockStar = new Star(100, 100, StarTypes.G_TYPE, 0);
    
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
    
    mockCamera = {
      x: 200,
      y: 200,
      worldToScreen: (worldX, worldY, canvasWidth, canvasHeight) => {
        return [(worldX - mockCamera.x) + canvasWidth / 2, (worldY - mockCamera.y) + canvasHeight / 2];
      }
    };
    
    const mockCtx = {
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
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
  
  describe('Ice Comet Specializations', () => {
    it('should render crystalline sparkle effects', () => {
      const iceComet = new Comet(200, 200, mockStar, testOrbit, CometTypes.ICE, 0);
      vi.spyOn(iceComet, 'calculateUniversalTime').mockReturnValue(0);
      iceComet.updatePosition();
      iceComet.updateVisualProperties();
      
      if (iceComet.isVisible) {
        iceComet.render(mockRenderer, mockCamera);
        
        // Ice comets should have high glitter chance (0.7)
        expect(CometTypes.ICE.glitterChance).toBe(0.7);
        
        // Should render white sparkle effects
        expect(mockRenderer.ctx.fill).toHaveBeenCalled();
        
        // Should have fast particle animation speed (60 pixels/second)
        expect(iceComet.particleAnimationSpeed).toBe(60);
      }
    });
    
    it('should implement ice crystal tail effects', () => {
      const iceComet = new Comet(200, 200, mockStar, testOrbit, CometTypes.ICE, 0);
      vi.spyOn(iceComet, 'calculateUniversalTime').mockReturnValue(0);
      iceComet.updatePosition();
      iceComet.updateVisualProperties();
      
      if (iceComet.isVisible) {
        // Ice comet should have blue-white colors
        expect(CometTypes.ICE.tailColors).toEqual(['#87CEEB', '#B0E0E6', '#E0FFFF']);
        expect(CometTypes.ICE.nucleusColor).toBe('#E0FFFF');
        
        // Should have smaller, crystalline particles
        expect(iceComet.getParticleBaseSize()).toBe(1.8);
        
        // Should have bright glitter intensity
        expect(iceComet.getGlitterIntensity()).toBe(0.8);
      }
    });
    
    it('should create frost-like nucleus glow for bright ice comets', () => {
      const iceComet = new Comet(200, 200, mockStar, testOrbit, CometTypes.ICE, 0);
      vi.spyOn(iceComet, 'calculateUniversalTime').mockReturnValue(0);
      iceComet.updatePosition();
      iceComet.updateVisualProperties();
      
      if (iceComet.isVisible && iceComet.nucleusBrightness > 1.2) {
        iceComet.render(mockRenderer, mockCamera);
        
        // Should create radial gradients for corona/glow effects
        expect(mockRenderer.ctx.createRadialGradient).toHaveBeenCalled();
        
        // Should render multiple nucleus layers
        const arcCalls = mockRenderer.ctx.arc.mock.calls;
        expect(arcCalls.length).toBeGreaterThan(2); // Coma + nucleus + particles
      }
    });
    
    it('should implement ice-specific particle behavior', () => {
      const iceComet = new Comet(200, 200, mockStar, testOrbit, CometTypes.ICE, 0);
      vi.spyOn(iceComet, 'calculateUniversalTime').mockReturnValue(0);
      iceComet.updatePosition();
      iceComet.updateVisualProperties();
      
      if (iceComet.isVisible) {
        // Ice comets should have 25 particles per 120px of tail
        expect(CometTypes.ICE.tailParticleCount).toBe(25);
        
        // Should have fast particle animation for crystalline effect
        expect(iceComet.particleAnimationSpeed).toBe(60);
        
        // Ice particles should be smaller and more numerous
        const expectedParticleSize = 1.8; // Base size for ice
        expect(iceComet.getParticleBaseSize()).toBe(expectedParticleSize);
      }
    });
  });
  
  describe('Dust Comet Specializations', () => {
    it('should render flowing dust trail effects', () => {
      const dustComet = new Comet(200, 200, mockStar, testOrbit, CometTypes.DUST, 0);
      vi.spyOn(dustComet, 'calculateUniversalTime').mockReturnValue(0);
      dustComet.updatePosition();
      dustComet.updateVisualProperties();
      
      if (dustComet.isVisible) {
        dustComet.render(mockRenderer, mockCamera);
        
        // Dust comets should have golden-brown colors
        expect(CometTypes.DUST.tailColors).toEqual(['#DAA520', '#DEB887', '#F4A460']);
        expect(CometTypes.DUST.nucleusColor).toBe('#F4A460');
        
        // Should have medium particle animation speed (40 pixels/second)
        expect(dustComet.particleAnimationSpeed).toBe(40);
        
        // Should have most particles (30 per 120px)
        expect(CometTypes.DUST.tailParticleCount).toBe(30);
      }
    });
    
    it('should implement dust cloud density effects', () => {
      const dustComet = new Comet(200, 200, mockStar, testOrbit, CometTypes.DUST, 0);
      vi.spyOn(dustComet, 'calculateUniversalTime').mockReturnValue(0);
      dustComet.updatePosition();
      dustComet.updateVisualProperties();
      
      if (dustComet.isVisible) {
        // Dust particles should be medium-sized for density effect
        expect(dustComet.getParticleBaseSize()).toBe(2.2);
        
        // Should have moderate glitter chance (0.4) for metallic dust
        expect(CometTypes.DUST.glitterChance).toBe(0.4);
        expect(dustComet.getGlitterIntensity()).toBe(0.4);
        
        // Should render many particles for dust cloud effect
        const particleCount = Math.floor(CometTypes.DUST.tailParticleCount * (dustComet.tailLength / 120));
        expect(particleCount).toBeGreaterThan(0);
      }
    });
    
    it('should create dusty coma with dispersed edges', () => {
      const dustComet = new Comet(200, 200, mockStar, testOrbit, CometTypes.DUST, 0);
      vi.spyOn(dustComet, 'calculateUniversalTime').mockReturnValue(0);
      dustComet.updatePosition();
      dustComet.updateVisualProperties();
      
      if (dustComet.isVisible && dustComet.comaRadius > 0) {
        dustComet.render(mockRenderer, mockCamera);
        
        // Should create radial gradient for coma
        expect(mockRenderer.ctx.createRadialGradient).toHaveBeenCalled();
        
        // Should render coma with dusty golden color
        expect(dustComet.cometType.nucleusColor).toBe('#F4A460');
      }
    });
  });
  
  describe('Rocky Comet Specializations', () => {
    it('should render chunky debris particle effects', () => {
      const rockyComet = new Comet(200, 200, mockStar, testOrbit, CometTypes.ROCKY, 0);
      vi.spyOn(rockyComet, 'calculateUniversalTime').mockReturnValue(0);
      rockyComet.updatePosition();
      rockyComet.updateVisualProperties();
      
      if (rockyComet.isVisible) {
        rockyComet.render(mockRenderer, mockCamera);
        
        // Rocky comets should have gray colors
        expect(CometTypes.ROCKY.tailColors).toEqual(['#A9A9A9', '#C0C0C0', '#DCDCDC']);
        expect(CometTypes.ROCKY.nucleusColor).toBe('#C0C0C0');
        
        // Should have slow particle animation (25 pixels/second) for heavy debris
        expect(rockyComet.particleAnimationSpeed).toBe(25);
        
        // Should have fewer but larger particles (20 per 120px)
        expect(CometTypes.ROCKY.tailParticleCount).toBe(20);
      }
    });
    
    it('should implement metallic debris characteristics', () => {
      const rockyComet = new Comet(200, 200, mockStar, testOrbit, CometTypes.ROCKY, 0);
      vi.spyOn(rockyComet, 'calculateUniversalTime').mockReturnValue(0);
      rockyComet.updatePosition();
      rockyComet.updateVisualProperties();
      
      if (rockyComet.isVisible) {
        // Rocky particles should be largest for chunky debris effect
        expect(rockyComet.getParticleBaseSize()).toBe(2.8);
        
        // Should have moderate glitter chance (0.5) for metallic reflection
        expect(CometTypes.ROCKY.glitterChance).toBe(0.5);
        expect(rockyComet.getGlitterIntensity()).toBe(0.5);
        
        // Should have gray/silver appearance
        expect(rockyComet.cometType.nucleusColor).toBe('#C0C0C0');
      }
    });
    
    it('should create dense rocky nucleus with metallic sheen', () => {
      const rockyComet = new Comet(200, 200, mockStar, testOrbit, CometTypes.ROCKY, 0);
      vi.spyOn(rockyComet, 'calculateUniversalTime').mockReturnValue(0);
      rockyComet.updatePosition();
      rockyComet.updateVisualProperties();
      
      if (rockyComet.isVisible) {
        rockyComet.render(mockRenderer, mockCamera);
        
        // Should render with silver/gray nucleus
        expect(rockyComet.cometType.nucleusColor).toBe('#C0C0C0');
        
        // Should have rendered nucleus
        expect(mockRenderer.ctx.arc).toHaveBeenCalled();
        expect(mockRenderer.ctx.fill).toHaveBeenCalled();
      }
    });
  });
  
  describe('Organic Comet Specializations', () => {
    it('should render ethereal wispy tail effects', () => {
      const organicComet = new Comet(200, 200, mockStar, testOrbit, CometTypes.ORGANIC, 0);
      vi.spyOn(organicComet, 'calculateUniversalTime').mockReturnValue(0);
      organicComet.updatePosition();
      organicComet.updateVisualProperties();
      
      if (organicComet.isVisible) {
        organicComet.render(mockRenderer, mockCamera);
        
        // Organic comets should have green-yellow colors
        expect(CometTypes.ORGANIC.tailColors).toEqual(['#9ACD32', '#ADFF2F', '#FFFF00']);
        expect(CometTypes.ORGANIC.nucleusColor).toBe('#ADFF2F');
        
        // Should have medium-slow particle animation (35 pixels/second) for ethereal effect
        expect(organicComet.particleAnimationSpeed).toBe(35);
        
        // Should have many wispy particles (35 per 120px)
        expect(CometTypes.ORGANIC.tailParticleCount).toBe(35);
      }
    });
    
    it('should implement bio-luminescent glow effects', () => {
      const organicComet = new Comet(200, 200, mockStar, testOrbit, CometTypes.ORGANIC, 0);
      vi.spyOn(organicComet, 'calculateUniversalTime').mockReturnValue(0);
      organicComet.updatePosition();
      organicComet.updateVisualProperties();
      
      if (organicComet.isVisible) {
        // Organic particles should be smallest for wispy effect
        expect(organicComet.getParticleBaseSize()).toBe(1.5);
        
        // Should have highest glitter chance (0.8) for bio-luminescence
        expect(CometTypes.ORGANIC.glitterChance).toBe(0.8);
        expect(organicComet.getGlitterIntensity()).toBe(0.6);
        
        // Should have green-yellow appearance
        expect(organicComet.cometType.nucleusColor).toBe('#ADFF2F');
      }
    });
    
    it('should create organic compound undulation effects', () => {
      const organicComet = new Comet(200, 200, mockStar, testOrbit, CometTypes.ORGANIC, 0);
      vi.spyOn(organicComet, 'calculateUniversalTime').mockReturnValue(0);
      organicComet.updatePosition();
      organicComet.updateVisualProperties();
      
      if (organicComet.isVisible) {
        organicComet.render(mockRenderer, mockCamera);
        
        // Should render with green-yellow nucleus
        expect(organicComet.cometType.nucleusColor).toBe('#ADFF2F');
        
        // Should have most valuable discovery (30 points)
        expect(CometTypes.ORGANIC.discoveryValue).toBe(30);
        
        // Should be rarest type (0.1 probability)
        expect(CometTypes.ORGANIC.rarity).toBe(0.1);
      }
    });
    
    it('should implement ethereal particle behavior', () => {
      const organicComet = new Comet(200, 200, mockStar, testOrbit, CometTypes.ORGANIC, 0);
      vi.spyOn(organicComet, 'calculateUniversalTime').mockReturnValue(0);
      organicComet.updatePosition();
      organicComet.updateVisualProperties();
      
      if (organicComet.isVisible) {
        // Should have wispy particles with high count
        expect(CometTypes.ORGANIC.tailParticleCount).toBe(35);
        
        // Should have ethereal animation speed
        expect(organicComet.particleAnimationSpeed).toBe(35);
        
        // Should have small, wispy particles
        expect(organicComet.getParticleBaseSize()).toBe(1.5);
        
        // Should have high bio-luminescent glitter
        expect(organicComet.getGlitterIntensity()).toBe(0.6);
      }
    });
  });
  
  describe('Cross-Type Comparisons', () => {
    it('should have distinct particle animation speeds across types', () => {
      const cometTypes = [
        { type: CometTypes.ICE, expectedSpeed: 60 },
        { type: CometTypes.DUST, expectedSpeed: 40 },
        { type: CometTypes.ROCKY, expectedSpeed: 25 },
        { type: CometTypes.ORGANIC, expectedSpeed: 35 }
      ];
      
      cometTypes.forEach(({ type, expectedSpeed }, index) => {
        const comet = new Comet(200, 200, mockStar, testOrbit, type, index);
        expect(comet.particleAnimationSpeed).toBe(expectedSpeed);
      });
      
      // Verify speed ordering: Ice (fastest) > Dust > Organic > Rocky (slowest)
      expect(60).toBeGreaterThan(40); // Ice > Dust
      expect(40).toBeGreaterThan(35); // Dust > Organic  
      expect(35).toBeGreaterThan(25); // Organic > Rocky
    });
    
    it('should have distinct particle sizes across types', () => {
      const cometTypes = [
        { type: CometTypes.ICE, expectedSize: 1.8 },
        { type: CometTypes.DUST, expectedSize: 2.2 },
        { type: CometTypes.ROCKY, expectedSize: 2.8 },
        { type: CometTypes.ORGANIC, expectedSize: 1.5 }
      ];
      
      cometTypes.forEach(({ type, expectedSize }, index) => {
        const comet = new Comet(200, 200, mockStar, testOrbit, type, index);
        expect(comet.getParticleBaseSize()).toBe(expectedSize);
      });
      
      // Verify size ordering: Rocky (largest) > Dust > Ice > Organic (smallest)
      expect(2.8).toBeGreaterThan(2.2); // Rocky > Dust
      expect(2.2).toBeGreaterThan(1.8); // Dust > Ice
      expect(1.8).toBeGreaterThan(1.5); // Ice > Organic
    });
    
    it('should have distinct color schemes across types', () => {
      const colorSchemes = [
        { type: CometTypes.ICE, colors: ['#87CEEB', '#B0E0E6', '#E0FFFF'], nucleus: '#E0FFFF' },
        { type: CometTypes.DUST, colors: ['#DAA520', '#DEB887', '#F4A460'], nucleus: '#F4A460' },
        { type: CometTypes.ROCKY, colors: ['#A9A9A9', '#C0C0C0', '#DCDCDC'], nucleus: '#C0C0C0' },
        { type: CometTypes.ORGANIC, colors: ['#9ACD32', '#ADFF2F', '#FFFF00'], nucleus: '#ADFF2F' }
      ];
      
      colorSchemes.forEach(({ type, colors, nucleus }) => {
        expect(type.tailColors).toEqual(colors);
        expect(type.nucleusColor).toBe(nucleus);
      });
      
      // Verify all color schemes are unique
      const allNucleusColors = colorSchemes.map(s => s.nucleus);
      const uniqueColors = new Set(allNucleusColors);
      expect(uniqueColors.size).toBe(4);
    });
    
    it('should have distinct discovery values and rarity', () => {
      const rarityData = [
        { type: CometTypes.ICE, rarity: 0.4, value: 20 },
        { type: CometTypes.DUST, rarity: 0.3, value: 22 },
        { type: CometTypes.ROCKY, rarity: 0.2, value: 25 },
        { type: CometTypes.ORGANIC, rarity: 0.1, value: 30 }
      ];
      
      rarityData.forEach(({ type, rarity, value }) => {
        expect(type.rarity).toBe(rarity);
        expect(type.discoveryValue).toBe(value);
      });
      
      // Verify inverse relationship: rarer = more valuable
      expect(0.1 < 0.2 && 30 > 25).toBe(true); // Organic: rarest, most valuable
      expect(0.4 > 0.3 && 20 < 22).toBe(true); // Ice: common, less valuable
    });
  });
});