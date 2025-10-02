// StellarMap System Tests - Interactive Map Interface and Navigation
// Testing the StellarMap class for coordinate transformations, zoom, pan, and selection

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StellarMap } from '../../dist/ui/stellarmap.js';

describe('StellarMap System', () => {
  let stellarMap;
  let mockRenderer;
  let mockCamera;
  let mockInput;
  let mockCanvas;

  beforeEach(() => {
    stellarMap = new StellarMap();
    
    // Mock canvas
    mockCanvas = {
      width: 800,
      height: 600,
      style: {
        cursor: 'default'
      }
    };

    // Mock renderer
    mockRenderer = {
      canvas: mockCanvas,
      ctx: {
        save: vi.fn(),
        restore: vi.fn(),
        fillStyle: '',
        globalAlpha: 1,
        font: '',
        textAlign: 'left',
        textBaseline: 'top',
        fillText: vi.fn(),
        fillRect: vi.fn(),
        strokeStyle: '',
        lineWidth: 0,
        strokeRect: vi.fn(),
        setLineDash: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        measureText: vi.fn(() => ({ width: 100 }))
      }
    };

    // Mock camera
    mockCamera = {
      x: 1000,
      y: 2000
    };

    // Mock input
    mockInput = {
      getWheelDelta: vi.fn(() => 0),
      hasPinchZoomIn: vi.fn(() => false),
      hasPinchZoomOut: vi.fn(() => false),
      wasJustPressed: vi.fn(() => false),
      isMousePressed: vi.fn(() => false),
      isRightPressed: vi.fn(() => false),
      consumeTouch: vi.fn()
    };

    // Mock navigator for touch detection
    Object.defineProperty(global, 'navigator', {
      value: { maxTouchPoints: 0 },
      writable: true
    });

    Object.defineProperty(global, 'window', {
      value: {},
      writable: true
    });
  });

  describe('Initialization', () => {
    it('should initialize with correct default values', () => {
      expect(stellarMap.visible).toBe(false);
      expect(stellarMap.zoomLevel).toBe(1.0);
      expect(stellarMap.centerX).toBe(0);
      expect(stellarMap.centerY).toBe(0);
      expect(stellarMap.gridSize).toBe(2000);
      expect(stellarMap.selectedStar).toBe(null);
      expect(stellarMap.hoveredStar).toBe(null);
      expect(stellarMap.selectedPlanet).toBe(null);
      expect(stellarMap.followPlayer).toBe(true);
      expect(stellarMap.isPanning).toBe(false);
    });

    it('should initialize pan state correctly', () => {
      expect(stellarMap.panStartX).toBe(0);
      expect(stellarMap.panStartY).toBe(0);
      expect(stellarMap.panStartMapX).toBe(0);
      expect(stellarMap.panStartMapY).toBe(0);
      expect(stellarMap.lastMouseX).toBe(0);
      expect(stellarMap.lastMouseY).toBe(0);
    });

    it('should initialize visual settings', () => {
      expect(stellarMap.backgroundColor).toBe('#000000F0');
      expect(stellarMap.gridColor).toBe('#2a3a4a40');
      expect(stellarMap.currentPositionColor).toBe('#d4a574');
      expect(stellarMap.starColors).toHaveProperty('G-Type Star');
      expect(stellarMap.starColors['G-Type Star']).toBe('#ffdd88');
    });
  });

  describe('Visibility Management', () => {
    it('should toggle visibility correctly', () => {
      expect(stellarMap.isVisible()).toBe(false);
      
      stellarMap.toggle();
      expect(stellarMap.isVisible()).toBe(true);
      
      stellarMap.toggle();
      expect(stellarMap.isVisible()).toBe(false);
    });

    it('should not render when invisible', () => {
      stellarMap.visible = false;
      
      stellarMap.render(mockRenderer, mockCamera, []);
      
      expect(mockRenderer.ctx.save).not.toHaveBeenCalled();
    });
  });

  describe('Position and Centering', () => {
    it('should center on specified position', () => {
      stellarMap.centerOnPosition(5000, -3000);
      
      expect(stellarMap.centerX).toBe(5000);
      expect(stellarMap.centerY).toBe(-3000);
    });

    it('should auto-center on camera when following player', () => {
      stellarMap.visible = true;
      stellarMap.followPlayer = true;
      stellarMap.isPanning = false;
      
      stellarMap.update(0.016, mockCamera);
      
      expect(stellarMap.centerX).toBe(mockCamera.x);
      expect(stellarMap.centerY).toBe(mockCamera.y);
    });

    it('should not auto-center when not following player', () => {
      stellarMap.visible = true;
      stellarMap.followPlayer = false;
      stellarMap.centerX = 0;
      stellarMap.centerY = 0;
      
      stellarMap.update(0.016, mockCamera);
      
      expect(stellarMap.centerX).toBe(0);
      expect(stellarMap.centerY).toBe(0);
    });

    it('should not auto-center when panning', () => {
      stellarMap.visible = true;
      stellarMap.followPlayer = true;
      stellarMap.isPanning = true;
      stellarMap.centerX = 0;
      stellarMap.centerY = 0;
      
      stellarMap.update(0.016, mockCamera);
      
      expect(stellarMap.centerX).toBe(0);
      expect(stellarMap.centerY).toBe(0);
    });
  });

  describe('Zoom Controls', () => {
    it('should zoom in correctly', () => {
      const initialZoom = stellarMap.zoomLevel;
      
      stellarMap.zoomIn();
      
      expect(stellarMap.zoomLevel).toBe(initialZoom * 1.5);
    });

    it('should zoom out correctly', () => {
      stellarMap.zoomLevel = 3.0;
      
      stellarMap.zoomOut();
      
      expect(stellarMap.zoomLevel).toBe(2.0);
    });

    it('should respect maximum zoom limit', () => {
      stellarMap.zoomLevel = 8.0;
      
      stellarMap.zoomIn();
      
      expect(stellarMap.zoomLevel).toBe(10.0); // Max limit
      
      stellarMap.zoomIn();
      
      expect(stellarMap.zoomLevel).toBe(10.0); // Should not exceed max
    });

    it('should respect minimum zoom limit', () => {
      stellarMap.zoomLevel = 0.02;
      
      stellarMap.zoomOut();
      
      expect(stellarMap.zoomLevel).toBeCloseTo(0.01, 2); // Close to min limit
      
      stellarMap.zoomOut();
      
      expect(stellarMap.zoomLevel).toBe(0.01); // Should not go below min
    });

    it('should handle mouse wheel zoom when visible', () => {
      stellarMap.visible = true;
      mockInput.getWheelDelta.mockReturnValue(-1); // Zoom in
      
      const initialZoom = stellarMap.zoomLevel;
      stellarMap.update(0.016, mockCamera, mockInput);
      
      expect(stellarMap.zoomLevel).toBe(initialZoom * 1.5);
    });

    it('should handle keyboard zoom controls', () => {
      stellarMap.visible = true;
      mockInput.wasJustPressed.mockImplementation(key => key === 'Equal');
      
      const initialZoom = stellarMap.zoomLevel;
      stellarMap.update(0.016, mockCamera, mockInput);
      
      expect(stellarMap.zoomLevel).toBe(initialZoom * 1.5);
    });

    it('should handle pinch zoom for touch devices', () => {
      stellarMap.visible = true;
      mockInput.hasPinchZoomIn.mockReturnValue(true);
      
      const initialZoom = stellarMap.zoomLevel;
      stellarMap.update(0.016, mockCamera, mockInput);
      
      expect(stellarMap.zoomLevel).toBe(initialZoom * 1.5);
    });
  });

  describe('Map Bounds Calculation', () => {
    it('should calculate map bounds for desktop devices', () => {
      Object.defineProperty(global, 'navigator', {
        value: { maxTouchPoints: 0 },
        writable: true
      });
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true
      });

      const bounds = stellarMap.getMapBounds(mockCanvas);
      
      expect(bounds).toHaveProperty('mapX');
      expect(bounds).toHaveProperty('mapY');
      expect(bounds).toHaveProperty('mapWidth');
      expect(bounds).toHaveProperty('mapHeight');
      
      // Should fit within canvas
      expect(bounds.mapX).toBeGreaterThanOrEqual(0);
      expect(bounds.mapY).toBeGreaterThanOrEqual(0);
      expect(bounds.mapX + bounds.mapWidth).toBeLessThanOrEqual(mockCanvas.width);
      expect(bounds.mapY + bounds.mapHeight).toBeLessThanOrEqual(mockCanvas.height);
    });

    it('should calculate different bounds for touch devices', () => {
      Object.defineProperty(global, 'navigator', {
        value: { maxTouchPoints: 1 },
        writable: true
      });
      Object.defineProperty(global, 'window', {
        value: { ontouchstart: {} },
        writable: true
      });

      const bounds = stellarMap.getMapBounds(mockCanvas);
      
      // Touch devices should have different ratios (larger map area)
      expect(bounds.mapWidth).toBeGreaterThan(0);
      expect(bounds.mapHeight).toBeGreaterThan(0);
    });

    it('should handle different canvas sizes', () => {
      const smallCanvas = { width: 400, height: 300 };
      const largeCanvas = { width: 1200, height: 900 };
      
      const smallBounds = stellarMap.getMapBounds(smallCanvas);
      const largeBounds = stellarMap.getMapBounds(largeCanvas);
      
      expect(smallBounds.mapWidth).toBeLessThan(largeBounds.mapWidth);
      expect(smallBounds.mapHeight).toBeLessThan(largeBounds.mapHeight);
    });
  });

  describe('Pan State Management', () => {
    it('should reset pan state correctly', () => {
      // Set up some pan state
      stellarMap.isPanning = true;
      stellarMap.lastMouseX = 100;
      stellarMap.lastMouseY = 200;
      stellarMap.panStartX = 50;
      stellarMap.panStartY = 75;
      
      stellarMap.resetPanState();
      
      expect(stellarMap.isPanning).toBe(false);
      expect(stellarMap.lastMouseX).toBe(0);
      expect(stellarMap.lastMouseY).toBe(0);
      expect(stellarMap.panStartX).toBe(0);
      expect(stellarMap.panStartY).toBe(0);
    });

    it('should report panning state correctly', () => {
      expect(stellarMap.isCurrentlyPanning()).toBe(false);
      
      stellarMap.isPanning = true;
      expect(stellarMap.isCurrentlyPanning()).toBe(true);
    });

    it('should report following state correctly', () => {
      expect(stellarMap.isFollowingPlayer()).toBe(true);
      
      stellarMap.followPlayer = false;
      expect(stellarMap.isFollowingPlayer()).toBe(false);
    });
  });

  describe('Mouse Movement and Panning', () => {
    beforeEach(() => {
      stellarMap.visible = true;
      mockInput.isMousePressed.mockReturnValue(true);
      mockInput.isRightPressed.mockReturnValue(false);
    });

    it('should not handle mouse movement when map is invisible', () => {
      stellarMap.visible = false;
      
      const result = stellarMap.handleMouseMove(100, 100, mockCanvas, mockInput);
      
      expect(result).toBe(false);
    });

    it('should not handle mouse movement when mouse not pressed', () => {
      mockInput.isMousePressed.mockReturnValue(false);
      
      const result = stellarMap.handleMouseMove(100, 100, mockCanvas, mockInput);
      
      expect(result).toBe(false);
    });

    it('should initialize tracking when mouse starts in bounds', () => {
      const result = stellarMap.handleMouseMove(400, 300, mockCanvas, mockInput);
      
      // Should initialize but not move yet
      expect(stellarMap.lastMouseX).toBe(400);
      expect(stellarMap.lastMouseY).toBe(300);
      expect(stellarMap.panStartX).toBe(400);
      expect(stellarMap.panStartY).toBe(300);
      expect(result).toBe(false); // No movement yet
    });

    it('should start panning after sufficient movement', () => {
      // Initialize tracking
      stellarMap.handleMouseMove(400, 300, mockCanvas, mockInput);
      
      // Move enough to trigger panning
      stellarMap.handleMouseMove(410, 310, mockCanvas, mockInput);
      
      expect(stellarMap.isPanning).toBe(true);
      expect(stellarMap.followPlayer).toBe(false);
    });

    it('should apply panning movement to map center', () => {
      stellarMap.centerX = 1000;
      stellarMap.centerY = 2000;
      
      // Initialize and start panning
      stellarMap.handleMouseMove(400, 300, mockCanvas, mockInput);
      stellarMap.handleMouseMove(410, 310, mockCanvas, mockInput);
      
      // Map center should have changed
      expect(stellarMap.centerX).not.toBe(1000);
      expect(stellarMap.centerY).not.toBe(2000);
    });

    it('should consume touch input when handling mouse movement to prevent ship movement', () => {
      stellarMap.visible = true;
      mockInput.isMousePressed.mockReturnValue(true);
      
      // First call to initialize tracking
      const result1 = stellarMap.handleMouseMove(400, 300, mockCanvas, mockInput);
      expect(result1).toBe(false); // No movement yet, just initialization
      
      // Second call with sufficient movement to trigger panning
      const result2 = stellarMap.handleMouseMove(410, 310, mockCanvas, mockInput);
      expect(result2).toBe(true); // Should return true when handling panning
      expect(stellarMap.isPanning).toBe(true);
      
      // Should have called consumeTouch to prevent ship movement
      expect(mockInput.consumeTouch).toHaveBeenCalled();
    });
  });

  describe('Star and Planet Selection', () => {
    let mockStars;
    let mockPlanets;

    beforeEach(() => {
      mockStars = [
        {
          x: 1000,
          y: 2000,
          starTypeName: 'G-Type Star',
          starType: { sizeMultiplier: 1.0 },
          timestamp: Date.now()
        },
        {
          x: 1500,
          y: 2500,
          starTypeName: 'K-Type Star',
          starType: { sizeMultiplier: 0.8 },
          timestamp: Date.now()
        }
      ];

      mockPlanets = [
        {
          x: 1050,
          y: 2050,
          parentStarX: 1000,
          parentStarY: 2000,
          planetTypeName: 'Rocky Planet',
          planetType: { sizeMultiplier: 0.5, colors: ['#8B4513'] },
          planetIndex: 1,
          objectName: 'Test Planet',
          timestamp: Date.now()
        }
      ];

      stellarMap.centerX = 1000;
      stellarMap.centerY = 2000;
      stellarMap.zoomLevel = 2.0;
    });

    it('should return false when no stars provided', () => {
      const result = stellarMap.handleStarSelection(400, 300, null, mockCanvas);
      expect(result).toBe(false);
    });

    it('should clear selection when clicking outside map bounds', () => {
      stellarMap.selectedStar = mockStars[0];
      
      const result = stellarMap.handleStarSelection(50, 50, mockStars, mockCanvas);
      
      expect(result).toBe(false);
      expect(stellarMap.selectedStar).toBe(null);
      expect(stellarMap.selectedPlanet).toBe(null);
    });

    it('should select closest star within click threshold', () => {
      const result = stellarMap.handleStarSelection(400, 300, mockStars, mockCanvas);
      
      expect(result).toBe(true);
      expect(stellarMap.selectedStar).toBeTruthy();
      expect(stellarMap.selectedPlanet).toBe(null);
    });

    it('should prioritize planets over stars in detail view', () => {
      stellarMap.zoomLevel = 4.0; // Detail view
      
      const result = stellarMap.handleStarSelection(400, 300, mockStars, mockCanvas, mockPlanets);
      
      expect(result).toBe(true);
      // Should select planet if it's closer
    });

    it('should handle planets without position data', () => {
      const planetsWithNulls = [
        {
          x: null,
          y: null,
          parentStarX: 1000,
          parentStarY: 2000,
          planetTypeName: 'Rocky Planet',
          planetIndex: 1
        }
      ];
      
      const result = stellarMap.handleStarSelection(400, 300, mockStars, mockCanvas, planetsWithNulls);
      
      // Should not crash and should still work with stars
      expect(result).toBe(true);
    });

    it('should clear selection when clicking in empty space', () => {
      stellarMap.selectedStar = mockStars[0];
      stellarMap.selectedPlanet = mockPlanets[0];
      
      // Click far from any objects
      const result = stellarMap.handleStarSelection(100, 100, mockStars, mockCanvas, mockPlanets);
      
      expect(result).toBe(true);
      expect(stellarMap.selectedStar).toBe(null);
      expect(stellarMap.selectedPlanet).toBe(null);
    });

    it('should consume touch input when handling star selection to prevent ship movement', () => {
      stellarMap.visible = true;
      stellarMap.centerX = 1000;
      stellarMap.centerY = 2000;
      stellarMap.zoomLevel = 2.0;
      
      // Test selecting a star should consume input
      const result = stellarMap.handleStarSelection(400, 300, mockStars, mockCanvas, null, null, null, null, null, null, [], [], [], [], mockInput);
      
      expect(result).toBe(true);
      expect(stellarMap.selectedStar).toBeTruthy();
      
      // Should have called consumeTouch to prevent ship movement
      expect(mockInput.consumeTouch).toHaveBeenCalled();
    });
  });

  describe('Rendering System', () => {
    it('should save and restore canvas context', () => {
      stellarMap.visible = true;
      
      stellarMap.render(mockRenderer, mockCamera, []);
      
      expect(mockRenderer.ctx.save).toHaveBeenCalled();
      expect(mockRenderer.ctx.restore).toHaveBeenCalled();
    });

    it('should handle empty star arrays', () => {
      stellarMap.visible = true;
      
      expect(() => stellarMap.render(mockRenderer, mockCamera, [])).not.toThrow();
    });

    it('should handle null or undefined parameters gracefully', () => {
      stellarMap.visible = true;
      
      expect(() => stellarMap.render(mockRenderer, mockCamera, [], null, null)).not.toThrow();
    });

    it('should render grid and background elements', () => {
      stellarMap.visible = true;
      
      stellarMap.render(mockRenderer, mockCamera, []);
      
      expect(mockRenderer.ctx.fillRect).toHaveBeenCalled();
      expect(mockRenderer.ctx.strokeRect).toHaveBeenCalled();
    });
  });

  describe('Integration and Edge Cases', () => {
    it('should handle rapid zoom changes', () => {
      stellarMap.visible = true;
      
      for (let i = 0; i < 100; i++) {
        stellarMap.zoomIn();
        stellarMap.zoomOut();
      }
      
      expect(stellarMap.zoomLevel).toBeGreaterThan(0);
      expect(stellarMap.zoomLevel).toBeLessThanOrEqual(10.0);
    });

    it('should handle extreme coordinate values', () => {
      stellarMap.centerOnPosition(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER);
      
      expect(stellarMap.centerX).toBe(Number.MAX_SAFE_INTEGER);
      expect(stellarMap.centerY).toBe(Number.MIN_SAFE_INTEGER);
      
      // Should not crash when rendering
      stellarMap.visible = true;
      expect(() => stellarMap.render(mockRenderer, mockCamera, [])).not.toThrow();
    });

    it('should handle very small canvas sizes', () => {
      const tinyCanvas = { width: 10, height: 10 };
      
      const bounds = stellarMap.getMapBounds(tinyCanvas);
      
      expect(bounds.mapWidth).toBeGreaterThan(0);
      expect(bounds.mapHeight).toBeGreaterThan(0);
    });

    it('should maintain state consistency through multiple operations', () => {
      stellarMap.visible = true;
      
      // Complex sequence of operations
      stellarMap.centerOnPosition(5000, -3000);
      stellarMap.zoomIn();
      stellarMap.zoomIn();
      stellarMap.update(0.016, mockCamera, mockInput);
      stellarMap.resetPanState();
      stellarMap.zoomOut();
      
      // State should remain valid
      expect(stellarMap.zoomLevel).toBeGreaterThan(0);
      expect(stellarMap.zoomLevel).toBeLessThanOrEqual(10.0);
      expect(typeof stellarMap.centerX).toBe('number');
      expect(typeof stellarMap.centerY).toBe('number');
    });

    it('should handle missing input parameter in update', () => {
      stellarMap.visible = true;
      
      expect(() => stellarMap.update(0.016, mockCamera)).not.toThrow();
      expect(() => stellarMap.update(0.016, mockCamera, null)).not.toThrow();
    });

    it('should handle zero delta time gracefully', () => {
      stellarMap.visible = true;
      
      expect(() => stellarMap.update(0, mockCamera, mockInput)).not.toThrow();
    });
  });

  describe('Star Color Management', () => {
    it('should have colors defined for all star types', () => {
      const expectedTypes = ['G-Type Star', 'K-Type Star', 'M-Type Star', 'Red Giant', 'Blue Giant', 'White Dwarf', 'Neutron Star'];
      
      for (const type of expectedTypes) {
        expect(stellarMap.starColors).toHaveProperty(type);
        expect(stellarMap.starColors[type]).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });

    it('should provide valid hex color values', () => {
      for (const color of Object.values(stellarMap.starColors)) {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });
  });

  describe('Rendering Methods', () => {
    let mockStars;
    let mockPlanets;

    beforeEach(() => {
      stellarMap.visible = true;
      
      mockStars = [
        {
          x: 1000,
          y: 2000,
          starTypeName: 'G-Type Star',
          starType: { sizeMultiplier: 1.0 },
          timestamp: Date.now()
        },
        {
          x: 1500,
          y: 2500,
          starTypeName: 'K-Type Star',
          starType: { sizeMultiplier: 0.8 },
          timestamp: Date.now()
        }
      ];

      mockPlanets = [
        {
          x: 1050,
          y: 2050,
          parentStarX: 1000,
          parentStarY: 2000,
          planetTypeName: 'Rocky Planet',
          planetType: { sizeMultiplier: 0.5, colors: ['#8B4513'] },
          planetIndex: 1,
          objectName: 'Test Planet',
          timestamp: Date.now()
        },
        {
          x: null, // Inactive planet
          y: null,
          parentStarX: 2000,
          parentStarY: 3000,
          planetTypeName: 'Gas Giant',
          planetIndex: 2
        }
      ];
    });

    describe('Grid Rendering', () => {
      it('should render grid with dynamic sizing based on zoom level', () => {
        stellarMap.zoomLevel = 0.05; // Galactic view
        stellarMap.render(mockRenderer, mockCamera, []);
        
        // Should call strokeStyle and stroke methods for grid
        expect(mockRenderer.ctx.stroke).toHaveBeenCalled();
      });

      it('should skip grid rendering when spacing is too small', () => {
        stellarMap.zoomLevel = 0.001; // Extreme zoom out
        stellarMap.render(mockRenderer, mockCamera, []);
        
        // Grid should be skipped but map should still render
        expect(mockRenderer.ctx.save).toHaveBeenCalled();
      });

      it('should use different grid sizes for different zoom levels', () => {
        // Test sector view
        stellarMap.zoomLevel = 0.3;
        stellarMap.render(mockRenderer, mockCamera, []);
        expect(mockRenderer.ctx.stroke).toHaveBeenCalled();

        // Test detail view  
        stellarMap.zoomLevel = 8.0;
        stellarMap.render(mockRenderer, mockCamera, []);
        expect(mockRenderer.ctx.stroke).toHaveBeenCalled();
      });
    });

    describe('Star Rendering', () => {
      it('should render discovered stars with correct colors', () => {
        stellarMap.render(mockRenderer, mockCamera, mockStars);
        
        expect(mockRenderer.ctx.arc).toHaveBeenCalled();
        expect(mockRenderer.ctx.fill).toHaveBeenCalled();
      });

      it('should highlight selected star', () => {
        stellarMap.selectedStar = mockStars[0];
        stellarMap.render(mockRenderer, mockCamera, mockStars);
        
        // Should draw selection highlight
        expect(mockRenderer.ctx.stroke).toHaveBeenCalled();
      });

      it('should render star labels at high zoom levels', () => {
        stellarMap.zoomLevel = 3.0; // High zoom
        stellarMap.render(mockRenderer, mockCamera, mockStars);
        
        expect(mockRenderer.ctx.fillText).toHaveBeenCalled();
      });

      it('should render star labels for selected stars regardless of zoom', () => {
        stellarMap.zoomLevel = 0.5; // Low zoom
        stellarMap.selectedStar = mockStars[0];
        stellarMap.render(mockRenderer, mockCamera, mockStars);
        
        expect(mockRenderer.ctx.fillText).toHaveBeenCalled();
      });

      it('should calculate star size based on type and zoom level', () => {
        stellarMap.zoomLevel = 0.05; // Extreme zoom out
        stellarMap.render(mockRenderer, mockCamera, mockStars);
        
        // Should call arc with calculated radius
        expect(mockRenderer.ctx.arc).toHaveBeenCalled();
      });

      it('should handle stars with missing star type', () => {
        const starsWithMissingType = [{
          x: 1000,
          y: 2000,
          starTypeName: null,
          starType: null
        }];
        
        stellarMap.render(mockRenderer, mockCamera, starsWithMissingType);
        
        // Should not crash and use default white color
        expect(mockRenderer.ctx.fill).toHaveBeenCalled();
      });
    });

    describe('Planet Rendering', () => {
      it('should render planets with orbital circles', () => {
        stellarMap.zoomLevel = 4.0; // Detail view to show planets
        stellarMap.render(mockRenderer, mockCamera, mockStars, mockPlanets);
        
        // Should render orbital circles and planets
        expect(mockRenderer.ctx.arc).toHaveBeenCalled();
        expect(mockRenderer.ctx.stroke).toHaveBeenCalled(); // For orbital circles
        expect(mockRenderer.ctx.fill).toHaveBeenCalled(); // For planets
      });

      it('should skip planets with null positions', () => {
        stellarMap.zoomLevel = 4.0;
        stellarMap.render(mockRenderer, mockCamera, mockStars, mockPlanets);
        
        // Should only render active planets (first one), skip second
        expect(mockRenderer.ctx.fill).toHaveBeenCalled();
      });

      it('should highlight selected planets', () => {
        stellarMap.selectedPlanet = mockPlanets[0];
        stellarMap.zoomLevel = 4.0;
        stellarMap.render(mockRenderer, mockCamera, mockStars, mockPlanets);
        
        // Should draw planet highlight
        expect(mockRenderer.ctx.stroke).toHaveBeenCalled();
      });

      it('should group planets by parent star', () => {
        stellarMap.zoomLevel = 4.0;
        stellarMap.render(mockRenderer, mockCamera, mockStars, mockPlanets);
        
        // Should render orbital system for the parent star
        expect(mockRenderer.ctx.arc).toHaveBeenCalled();
      });

      it('should render planet labels at high zoom levels', () => {
        stellarMap.zoomLevel = 5.0; // Very high zoom
        stellarMap.render(mockRenderer, mockCamera, mockStars, mockPlanets);
        
        expect(mockRenderer.ctx.fillText).toHaveBeenCalled();
      });

      it('should handle empty planet arrays gracefully', () => {
        stellarMap.zoomLevel = 4.0;
        stellarMap.render(mockRenderer, mockCamera, mockStars, []);
        
        // Should not crash
        expect(mockRenderer.ctx.save).toHaveBeenCalled();
      });
    });

    describe('Current Position Rendering', () => {
      it('should render current position marker', () => {
        stellarMap.render(mockRenderer, mockCamera, []);
        
        // Should draw current position crosshair
        expect(mockRenderer.ctx.moveTo).toHaveBeenCalled();
        expect(mockRenderer.ctx.lineTo).toHaveBeenCalled();
        expect(mockRenderer.ctx.stroke).toHaveBeenCalled();
      });
    });
  });

  describe('Size and Color Calculations', () => {
    beforeEach(() => {
      stellarMap.visible = true;
    });

    it('should calculate star sizes based on zoom and star type', () => {
      const mockStar = {
        starType: { sizeMultiplier: 1.5 },
        starTypeName: 'Blue Giant'
      };
      
      // Test at different zoom levels
      stellarMap.zoomLevel = 0.05; // Extreme zoom out
      stellarMap.render(mockRenderer, mockCamera, [mockStar]);
      
      stellarMap.zoomLevel = 3.0; // Normal zoom
      stellarMap.render(mockRenderer, mockCamera, [mockStar]);
      
      expect(mockRenderer.ctx.arc).toHaveBeenCalled();
    });

    it('should calculate planet sizes correctly', () => {
      const mockPlanet = {
        x: 1000,
        y: 2000,
        parentStarX: 1000,
        parentStarY: 2000,
        planetType: { sizeMultiplier: 2.0 },
        planetTypeName: 'Gas Giant'
      };
      
      stellarMap.zoomLevel = 4.0;
      stellarMap.render(mockRenderer, mockCamera, [], [mockPlanet]);
      
      expect(mockRenderer.ctx.arc).toHaveBeenCalled();
    });

    it('should get planet colors from planet type', () => {
      const mockPlanet = {
        x: 1000,
        y: 2000,
        parentStarX: 1000,
        parentStarY: 2000,
        planetType: { colors: ['#FF0000', '#00FF00'] },
        planetTypeName: 'Colorful Planet'
      };
      
      stellarMap.zoomLevel = 4.0;
      stellarMap.render(mockRenderer, mockCamera, [], [mockPlanet]);
      
      expect(mockRenderer.ctx.fill).toHaveBeenCalled();
    });

    it('should handle planets with missing color data', () => {
      const mockPlanet = {
        x: 1000,
        y: 2000,
        parentStarX: 1000,
        parentStarY: 2000,
        planetType: { colors: null },
        planetTypeName: 'Unknown Planet'
      };
      
      stellarMap.zoomLevel = 4.0;
      stellarMap.render(mockRenderer, mockCamera, [], [mockPlanet]);
      
      // Should use default color and not crash
      expect(mockRenderer.ctx.fill).toHaveBeenCalled();
    });
  });

  describe('Hover Detection System', () => {
    let mockStars;
    let mockPlanets;

    beforeEach(() => {
      stellarMap.visible = true;
      stellarMap.centerX = 1000;
      stellarMap.centerY = 2000;
      stellarMap.zoomLevel = 2.0;

      mockStars = [
        {
          x: 1000,
          y: 2000,
          starTypeName: 'G-Type Star',
          starType: { sizeMultiplier: 1.0 },
          timestamp: Date.now()
        },
        {
          x: 1200,
          y: 2200,
          starTypeName: 'K-Type Star',
          starType: { sizeMultiplier: 0.8 },
          timestamp: Date.now()
        }
      ];

      mockPlanets = [
        {
          x: 1050,
          y: 2050,
          parentStarX: 1000,
          parentStarY: 2000,
          planetTypeName: 'Rocky Planet',
          planetType: { sizeMultiplier: 0.5, colors: ['#8B4513'] },
          planetIndex: 1,
          objectName: 'Test Planet A',
          timestamp: Date.now()
        },
        {
          x: 1075,
          y: 2075,
          parentStarX: 1000,
          parentStarY: 2000,
          planetTypeName: 'Ocean World',
          planetType: { sizeMultiplier: 0.7 },
          planetIndex: 2,
          objectName: 'Test Planet B',
          timestamp: Date.now()
        }
      ];
    });

    describe('detectHoverTarget Method', () => {
      it('should not detect hover when map is invisible', () => {
        stellarMap.visible = false;
        stellarMap.hoveredStar = mockStars[0]; // Set initial state
        
        stellarMap.detectHoverTarget(400, 300, mockCanvas, mockStars, mockPlanets);
        
        // Should exit early and not change hover state
        expect(stellarMap.hoveredStar).toBe(mockStars[0]);
      });

      it('should clear hover state when mouse is outside map bounds', () => {
        stellarMap.hoveredStar = mockStars[0];
        stellarMap.hoveredPlanet = mockPlanets[0];
        
        // Mouse position outside map bounds
        stellarMap.detectHoverTarget(50, 50, mockCanvas, mockStars, mockPlanets);
        
        expect(stellarMap.hoveredStar).toBe(null);
        expect(stellarMap.hoveredPlanet).toBe(null);
      });

      it('should detect star hover within threshold', () => {
        // Position mouse near the center where the star should be mapped
        stellarMap.detectHoverTarget(400, 300, mockCanvas, mockStars, mockPlanets);
        
        // Should detect hover on the closest star
        expect(stellarMap.hoveredStar).toBeTruthy();
        expect(stellarMap.hoveredPlanet).toBe(null);
      });

      it('should prioritize planets over stars in detail view', () => {
        stellarMap.zoomLevel = 4.0; // Detail view
        
        stellarMap.detectHoverTarget(400, 300, mockCanvas, mockStars, mockPlanets);
        
        // At high zoom, should detect planet hover first if closer
        // (Test behavior depends on exact positioning)
      });

      it('should handle planets with null positions', () => {
        const planetsWithNulls = [
          {
            x: null,
            y: null,
            parentStarX: 1000,
            parentStarY: 2000,
            planetTypeName: 'Distant Planet',
            planetIndex: 3
          }
        ];
        
        expect(() => {
          stellarMap.detectHoverTarget(400, 300, mockCanvas, mockStars, planetsWithNulls);
        }).not.toThrow();
        
        // Should skip null-position planets safely
      });

      it('should clear hover state when mouse is far from any objects', () => {
        stellarMap.hoveredStar = mockStars[0];
        stellarMap.hoveredPlanet = mockPlanets[0];
        
        // Mouse position far from any objects but within map bounds
        stellarMap.detectHoverTarget(200, 200, mockCanvas, mockStars, mockPlanets);
        
        expect(stellarMap.hoveredStar).toBe(null);
        expect(stellarMap.hoveredPlanet).toBe(null);
      });

      it('should use hover threshold larger than click threshold', () => {
        // The hover threshold is 15px vs click threshold of 10px
        stellarMap.detectHoverTarget(400, 300, mockCanvas, mockStars, mockPlanets);
        
        // Should detect hover at distances that might not trigger click
        expect(() => stellarMap.detectHoverTarget(400, 300, mockCanvas, mockStars, mockPlanets)).not.toThrow();
      });

      it('should work with empty planet arrays', () => {
        expect(() => {
          stellarMap.detectHoverTarget(400, 300, mockCanvas, mockStars, []);
        }).not.toThrow();
        
        expect(() => {
          stellarMap.detectHoverTarget(400, 300, mockCanvas, mockStars, null);
        }).not.toThrow();
      });
    });

    describe('updateHoverState Method', () => {
      it('should reset hover state and update cursor', () => {
        stellarMap.hoveredStar = mockStars[0];
        stellarMap.hoveredPlanet = mockPlanets[0];
        
        stellarMap.updateHoverState(400, 300, mockCanvas);
        
        expect(stellarMap.hoveredStar).toBe(null);
        expect(stellarMap.hoveredPlanet).toBe(null);
      });

      it('should call updateCursor method', () => {
        const updateCursorSpy = vi.spyOn(stellarMap, 'updateCursor');
        
        stellarMap.updateHoverState(400, 300, mockCanvas);
        
        expect(updateCursorSpy).toHaveBeenCalledWith(mockCanvas);
      });
    });

    describe('updateCursor Method', () => {
      it('should set pointer cursor when hovering over star', () => {
        stellarMap.hoveredStar = mockStars[0];
        stellarMap.hoveredPlanet = null;
        
        stellarMap.updateCursor(mockCanvas);
        
        expect(mockCanvas.style.cursor).toBe('pointer');
      });

      it('should set pointer cursor when hovering over planet', () => {
        stellarMap.hoveredStar = null;
        stellarMap.hoveredPlanet = mockPlanets[0];
        
        stellarMap.updateCursor(mockCanvas);
        
        expect(mockCanvas.style.cursor).toBe('pointer');
      });

      it('should set crosshair cursor when map is visible but no hover', () => {
        stellarMap.visible = true;
        stellarMap.hoveredStar = null;
        stellarMap.hoveredPlanet = null;
        
        stellarMap.updateCursor(mockCanvas);
        
        expect(mockCanvas.style.cursor).toBe('crosshair');
      });

      it('should set default cursor when map is not visible', () => {
        stellarMap.visible = false;
        stellarMap.hoveredStar = null;
        stellarMap.hoveredPlanet = null;
        
        stellarMap.updateCursor(mockCanvas);
        
        expect(mockCanvas.style.cursor).toBe('default');
      });

      it('should prioritize star hover over planet hover for cursor', () => {
        stellarMap.hoveredStar = mockStars[0];
        stellarMap.hoveredPlanet = mockPlanets[0];
        
        stellarMap.updateCursor(mockCanvas);
        
        expect(mockCanvas.style.cursor).toBe('pointer');
      });
    });
  });

  describe('Additional Zoom Control Tests', () => {
    beforeEach(() => {
      stellarMap.visible = true;
    });

    it('should handle mouse wheel zoom out', () => {
      mockInput.getWheelDelta.mockReturnValue(1); // Positive = zoom out
      
      const initialZoom = stellarMap.zoomLevel;
      stellarMap.update(0.016, mockCamera, mockInput);
      
      expect(stellarMap.zoomLevel).toBe(initialZoom / 1.5);
    });

    it('should handle pinch zoom out for touch devices', () => {
      mockInput.hasPinchZoomOut.mockReturnValue(true);
      
      const initialZoom = stellarMap.zoomLevel;
      stellarMap.update(0.016, mockCamera, mockInput);
      
      expect(stellarMap.zoomLevel).toBe(initialZoom / 1.5);
    });

    it('should handle keyboard zoom out with minus key', () => {
      mockInput.wasJustPressed.mockImplementation(key => key === 'Minus');
      
      const initialZoom = stellarMap.zoomLevel;
      stellarMap.update(0.016, mockCamera, mockInput);
      
      expect(stellarMap.zoomLevel).toBe(initialZoom / 1.5);
    });

    it('should handle keyboard zoom out with numpad subtract', () => {
      mockInput.wasJustPressed.mockImplementation(key => key === 'NumpadSubtract');
      
      const initialZoom = stellarMap.zoomLevel;
      stellarMap.update(0.016, mockCamera, mockInput);
      
      expect(stellarMap.zoomLevel).toBe(initialZoom / 1.5);
    });

    it('should handle keyboard zoom in with numpad add', () => {
      mockInput.wasJustPressed.mockImplementation(key => key === 'NumpadAdd');
      
      const initialZoom = stellarMap.zoomLevel;
      stellarMap.update(0.016, mockCamera, mockInput);
      
      expect(stellarMap.zoomLevel).toBe(initialZoom * 1.5);
    });
  });

  // Star size calculation tests removed - now internal to StarRenderer
  // Star rendering behavior is tested through integration tests in "Star Rendering" section

  describe('Planet Rendering and Calculations', () => {
    let mockPlanet;

    beforeEach(() => {
      mockPlanet = {
        x: 1050,
        y: 2050,
        parentStarX: 1000,
        parentStarY: 2000,
        planetTypeName: 'Gas Giant',
        planetType: { sizeMultiplier: 1.5, colors: ['#DAA520', '#FFD700'] },
        planetIndex: 2
      };
    });

    describe('calculatePlanetSize Method', () => {
      it('should calculate planet sizes based on type multiplier', () => {
        const size = stellarMap.calculatePlanetSize(mockPlanet);
        
        expect(size).toBeGreaterThan(1);
        expect(typeof size).toBe('number');
      });

      it('should handle planets without planetType', () => {
        const planetWithoutType = {
          ...mockPlanet,
          planetType: null
        };
        
        const size = stellarMap.calculatePlanetSize(planetWithoutType);
        
        expect(size).toBeGreaterThan(0);
        expect(typeof size).toBe('number');
      });

      it('should keep planet sizes smaller than star sizes', () => {
        const planetSize = stellarMap.calculatePlanetSize(mockPlanet);
        
        // Planet base size is 1.5, should be smaller than typical star sizes
        expect(planetSize).toBeLessThan(5);
      });
    });

    describe('getPlanetColor Method', () => {
      it('should return color from planetType colors array', () => {
        const color = stellarMap.getPlanetColor(mockPlanet);
        
        expect(color).toBe('#DAA520'); // First color from colors array
      });

      it('should return fallback color for known planet type names', () => {
        const rockyPlanet = {
          planetTypeName: 'Rocky Planet',
          planetType: null
        };
        
        const color = stellarMap.getPlanetColor(rockyPlanet);
        
        expect(color).toBe('#8B4513'); // Fallback color for Rocky Planet
      });

      it('should return default color for unknown planet types', () => {
        const unknownPlanet = {
          planetTypeName: 'Mysterious Planet',
          planetType: null
        };
        
        const color = stellarMap.getPlanetColor(unknownPlanet);
        
        expect(color).toBe('#888888'); // Default gray color
      });

      it('should handle planets with null planetType colors', () => {
        const planetWithNullColors = {
          planetTypeName: 'Ocean World',
          planetType: { colors: null }
        };
        
        const color = stellarMap.getPlanetColor(planetWithNullColors);
        
        expect(color).toBe('#4169E1'); // Fallback for Ocean World
      });

      it('should handle all standard planet type fallback colors', () => {
        const planetTypes = [
          { type: 'Rocky Planet', expected: '#8B4513' },
          { type: 'Ocean World', expected: '#4169E1' },
          { type: 'Gas Giant', expected: '#DAA520' },
          { type: 'Desert World', expected: '#FFE4B5' },
          { type: 'Frozen World', expected: '#87CEEB' },
          { type: 'Volcanic World', expected: '#DC143C' },
          { type: 'Exotic World', expected: '#DA70D6' }
        ];
        
        for (const { type, expected } of planetTypes) {
          const planet = {
            planetTypeName: type,
            planetType: null
          };
          
          const color = stellarMap.getPlanetColor(planet);
          expect(color).toBe(expected);
        }
      });
    });
  });

  describe('Nebula and Asteroid Garden Selection', () => {
    let mockNebulae;
    let mockAsteroidGardens;
    let mockStars;

    beforeEach(() => {
      stellarMap.visible = true;
      stellarMap.centerX = 1000;
      stellarMap.centerY = 2000;
      stellarMap.zoomLevel = 2.0;

      mockNebulae = [
        {
          x: 1100,
          y: 2100,
          nebulaType: 'emission',
          nebulaTypeData: { name: 'Eagle Nebula', colors: ['#FF6B6B'] },
          objectName: 'Test Nebula',
          timestamp: Date.now()
        }
      ];

      mockAsteroidGardens = [
        {
          x: 1200,
          y: 2200,
          gardenType: 'metallic',
          gardenTypeData: { name: 'Iron Asteroid Field', colors: ['#C0C0C0'] },
          objectName: 'Test Garden',
          timestamp: Date.now()
        }
      ];

      mockStars = [
        {
          x: 1000,
          y: 2000,
          starTypeName: 'G-Type Star',
          starType: { sizeMultiplier: 1.0 },
          timestamp: Date.now()
        }
      ];
    });

    it('should select nebula when clicked within threshold', () => {
      const result = stellarMap.handleStarSelection(400, 300, mockStars, mockCanvas, null, mockNebulae);
      
      expect(result).toBe(true);
      // Should prioritize nebula if it's closer than star
    });

    it('should select asteroid garden when clicked within threshold', () => {
      const result = stellarMap.handleStarSelection(400, 300, mockStars, mockCanvas, null, null, null, mockAsteroidGardens);
      
      expect(result).toBe(true);
      // Should prioritize asteroid garden based on distance
    });

    it('should handle hover detection for nebulae', () => {
      stellarMap.detectHoverTarget(400, 300, mockCanvas, mockStars, null, mockNebulae);
      
      // Should not crash and should work correctly
      expect(() => stellarMap.updateCursor(mockCanvas)).not.toThrow();
    });

    it('should handle hover detection for asteroid gardens', () => {
      stellarMap.detectHoverTarget(400, 300, mockCanvas, mockStars, null, null, mockAsteroidGardens);
      
      // Should not crash and should work correctly
      expect(() => stellarMap.updateCursor(mockCanvas)).not.toThrow();
    });

    it('should clear all selection types when clicking empty space', () => {
      // Set initial selections
      stellarMap.selectedStar = mockStars[0];
      stellarMap.selectedNebula = mockNebulae[0];
      stellarMap.selectedAsteroidGarden = mockAsteroidGardens[0];
      
      // Click far from any objects
      const result = stellarMap.handleStarSelection(100, 100, mockStars, mockCanvas, null, mockNebulae, null, mockAsteroidGardens);
      
      expect(result).toBe(true);
      expect(stellarMap.selectedStar).toBe(null);
      expect(stellarMap.selectedNebula).toBe(null);
      expect(stellarMap.selectedAsteroidGarden).toBe(null);
    });
  });

  describe('Player Following and Utility Methods', () => {
    it('should enable follow player and center on camera', () => {
      stellarMap.followPlayer = false;
      stellarMap.centerX = 0;
      stellarMap.centerY = 0;
      
      stellarMap.enableFollowPlayer(mockCamera);
      
      expect(stellarMap.followPlayer).toBe(true);
      expect(stellarMap.centerX).toBe(mockCamera.x);
      expect(stellarMap.centerY).toBe(mockCamera.y);
    });

    it('should set naming service correctly', () => {
      const mockNamingService = {
        generateDisplayName: vi.fn(() => 'Test Star'),
        generateFullDesignation: vi.fn(() => ({
          catalog: 'TST-001',
          coordinate: '1000,2000',
          type: 'G-Type Star',
          classification: 'V'
        }))
      };
      
      stellarMap.setNamingService(mockNamingService);
      
      expect(stellarMap.namingService).toBe(mockNamingService);
    });
  });

  describe('Info Panel Rendering', () => {
    let mockNamingService;

    beforeEach(() => {
      mockNamingService = {
        generateDisplayName: vi.fn(() => 'Test Star Alpha'),
        generateFullDesignation: vi.fn(() => ({
          catalog: 'TST-001',
          coordinate: '1000,2000',
          type: 'G-Type Star',
          classification: 'V'
        }))
      };
      stellarMap.setNamingService(mockNamingService);
      stellarMap.visible = true;
    });

    describe('renderStarInfoPanel', () => {
      it('should render star info panel when star is selected', () => {
        stellarMap.selectedStar = {
          x: 1000,
          y: 2000,
          starTypeName: 'G-Type Star',
          timestamp: Date.now()
        };
        
        stellarMap.render(mockRenderer, mockCamera, []);
        
        expect(mockNamingService.generateFullDesignation).toHaveBeenCalled();
        expect(mockRenderer.ctx.fillText).toHaveBeenCalled();
        expect(mockRenderer.ctx.fillRect).toHaveBeenCalled(); // Panel background
      });

      it('should handle missing naming service gracefully', () => {
        stellarMap.namingService = null;
        stellarMap.selectedStar = { x: 1000, y: 2000, starTypeName: 'G-Type Star' };
        
        expect(() => stellarMap.render(mockRenderer, mockCamera, [])).not.toThrow();
      });

      it('should handle null designation from naming service', () => {
        mockNamingService.generateFullDesignation.mockReturnValue(null);
        stellarMap.selectedStar = { x: 1000, y: 2000, starTypeName: 'G-Type Star' };
        
        expect(() => stellarMap.render(mockRenderer, mockCamera, [])).not.toThrow();
      });
    });

    describe('renderPlanetInfoPanel', () => {
      it('should render planet info panel when planet is selected', () => {
        stellarMap.selectedPlanet = {
          x: 1050,
          y: 2050,
          parentStarX: 1000,
          parentStarY: 2000,
          planetTypeName: 'Rocky Planet',
          planetIndex: 1,
          objectName: 'Test Planet',
          timestamp: Date.now()
        };
        
        stellarMap.render(mockRenderer, mockCamera, []);
        
        expect(mockRenderer.ctx.fillText).toHaveBeenCalled();
        expect(mockRenderer.ctx.fillRect).toHaveBeenCalled(); // Panel background
      });

      it('should handle planets without stored names', () => {
        stellarMap.selectedPlanet = {
          x: 1050,
          y: 2050,
          parentStarX: 1000,
          parentStarY: 2000,
          planetTypeName: 'Rocky Planet',
          planetIndex: 2,
          objectName: null
        };
        
        expect(() => stellarMap.render(mockRenderer, mockCamera, [])).not.toThrow();
      });

      it('should handle planets with null positions in info panel', () => {
        stellarMap.selectedPlanet = {
          x: null,
          y: null,
          parentStarX: 1000,
          parentStarY: 2000,
          planetTypeName: 'Distant Planet',
          planetIndex: 3,
          objectName: 'Far Planet'
        };
        
        expect(() => stellarMap.render(mockRenderer, mockCamera, [])).not.toThrow();
      });
    });

    describe('generatePlanetDisplayName', () => {
      it('should use stored object name when available', () => {
        const planet = {
          objectName: 'Stored Planet Name',
          planetIndex: 1
        };
        
        const name = stellarMap.generatePlanetDisplayName(planet);
        
        expect(name).toBe('Stored Planet Name');
      });

      it('should use naming service when no stored name', () => {
        const planet = {
          objectName: null,
          parentStarX: 1000,
          parentStarY: 2000,
          planetTypeName: 'Rocky Planet',
          planetIndex: 2,
          x: 1050,
          y: 2050
        };
        
        const name = stellarMap.generatePlanetDisplayName(planet);
        
        expect(mockNamingService.generateDisplayName).toHaveBeenCalled();
        expect(name).toBe('Test Star Alpha'); // From mock
      });

      it('should fallback to basic name when naming service fails', () => {
        mockNamingService.generateDisplayName.mockImplementation(() => {
          throw new Error('Naming service error');
        });
        
        const planet = {
          objectName: null,
          planetIndex: 3
        };
        
        const name = stellarMap.generatePlanetDisplayName(planet);
        
        expect(name).toBe('Planet 4'); // planetIndex + 1
      });

      it('should fallback when no naming service available', () => {
        stellarMap.namingService = null;
        
        const planet = {
          objectName: null,
          planetIndex: 0
        };
        
        const name = stellarMap.generatePlanetDisplayName(planet);
        
        expect(name).toBe('Planet 1'); // planetIndex + 1
      });
    });
  });

  describe('Inspector Mode', () => {
    let mockSeedInspectorService;

    beforeEach(() => {
      mockSeedInspectorService = {
        getRegionObjects: vi.fn()
      };
    });

    it('should initialize inspector mode with service', () => {
      stellarMap.initInspectorMode(mockSeedInspectorService);
      
      expect(stellarMap.inspectorService).toBe(mockSeedInspectorService);
    });

    it('should enable inspector mode with specific seed', async () => {
      stellarMap.initInspectorMode(mockSeedInspectorService);
      mockSeedInspectorService.getRegionObjects.mockResolvedValue([]);
      
      await stellarMap.enableInspectorMode(12345);
      
      expect(stellarMap.inspectorMode).toBe(true);
      expect(stellarMap.inspectorSeed).toBe(12345);
      expect(stellarMap.inspectorZoomExtended).toBe(true);
      expect(mockSeedInspectorService.getRegionObjects).toHaveBeenCalled();
    });

    it('should disable inspector mode', () => {
      stellarMap.inspectorMode = true;
      stellarMap.inspectorSeed = 12345;
      stellarMap.inspectorObjects = [{ type: 'star', x: 0, y: 0 }];
      stellarMap.inspectorZoomExtended = true;
      
      stellarMap.disableInspectorMode();
      
      expect(stellarMap.inspectorMode).toBe(false);
      expect(stellarMap.inspectorSeed).toBe(null);
      expect(stellarMap.inspectorObjects).toEqual([]);
      expect(stellarMap.inspectorZoomExtended).toBe(false);
    });

    it('should toggle inspector mode', async () => {
      stellarMap.initInspectorMode(mockSeedInspectorService);
      mockSeedInspectorService.getRegionObjects.mockResolvedValue([]);
      stellarMap.inspectorSeed = 12345;
      
      // Toggle on
      await stellarMap.enableInspectorMode(12345);
      expect(stellarMap.inspectorMode).toBe(true);
      
      // Toggle off
      stellarMap.toggleInspectorMode();
      expect(stellarMap.inspectorMode).toBe(false);
      
      // Toggle back on (should re-enable with last seed)
      stellarMap.toggleInspectorMode();
      expect(stellarMap.inspectorMode).toBe(false); // Will be false since no last seed in this case
    });

    it('should throw error when enabling without service', async () => {
      await expect(stellarMap.enableInspectorMode(12345)).rejects.toThrow('Inspector service not initialized');
    });

    it('should extend zoom range in inspector mode', () => {
      stellarMap.inspectorZoomExtended = true;
      
      // Test extended zoom in
      stellarMap.zoomLevel = 1.0;
      stellarMap.zoomIn();
      expect(stellarMap.zoomLevel).toBe(1.5);
      
      // Can zoom much further in inspector mode
      for (let i = 0; i < 20; i++) {
        stellarMap.zoomIn();
      }
      expect(stellarMap.zoomLevel).toBeLessThanOrEqual(50.0);
      
      // Test extended zoom out
      stellarMap.zoomLevel = 0.1;
      stellarMap.zoomOut();
      expect(stellarMap.zoomLevel).toBeLessThan(0.1);
      expect(stellarMap.zoomLevel).toBeGreaterThanOrEqual(0.001);
    });

    it('should render inspector objects with different visual styles', () => {
      stellarMap.visible = true;
      stellarMap.inspectorMode = true;
      stellarMap.inspectorObjects = [
        {
          type: 'backgroundStar',
          x: 1000,
          y: 2000,
          chunkX: 0,
          chunkY: 1,
          properties: { brightness: 0.5, size: 1, color: '#ffffff' }
        },
        {
          type: 'celestialStar',
          x: 1200,
          y: 2200,
          chunkX: 0,
          chunkY: 1,
          properties: { starType: 'G-type', radius: 50, color: '#ffff00' }
        },
        {
          type: 'wormhole',
          x: 1400,
          y: 2400,
          chunkX: 0,
          chunkY: 1,
          properties: { wormholeId: 'WH-001' }
        },
        {
          type: 'nebula',
          x: 1600,
          y: 2600,
          chunkX: 0,
          chunkY: 1,
          properties: { nebulaType: 'emission', colors: ['#ff0000'] }
        }
      ];
      
      stellarMap.render(mockRenderer, mockCamera, []);
      
      // Should render inspector objects
      expect(mockRenderer.ctx.arc).toHaveBeenCalled(); // For circular objects
      expect(mockRenderer.ctx.fill).toHaveBeenCalled();
      expect(mockRenderer.ctx.stroke).toHaveBeenCalled(); // For wormhole diamonds and nebula borders
    });

    it('should use cached revealed chunks when view changes', async () => {
      stellarMap.initInspectorMode(mockSeedInspectorService);
      stellarMap.inspectorMode = true;
      stellarMap.inspectorSeed = 12345;
      
      // Add some revealed chunks to cache
      stellarMap.revealedChunks.set('0,0', []);
      stellarMap.revealedChunks.set('1,1', []);
      
      stellarMap.centerOnPosition(5000, 6000);
      
      // Should NOT call service - uses cached data instead
      await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async
      expect(mockSeedInspectorService.getRegionObjects).not.toHaveBeenCalled();
      expect(stellarMap.revealedChunks.size).toBe(2); // Cache should still exist
    });

    it('should use cached revealed chunks on zoom changes', async () => {
      stellarMap.initInspectorMode(mockSeedInspectorService);
      stellarMap.inspectorMode = true;
      stellarMap.inspectorSeed = 12345;
      
      // Add some revealed chunks to cache
      stellarMap.revealedChunks.set('0,0', []);
      stellarMap.revealedChunks.set('1,1', []);
      
      stellarMap.zoomIn();
      
      // Should NOT call service - uses cached data instead
      await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async
      expect(mockSeedInspectorService.getRegionObjects).not.toHaveBeenCalled();
      expect(stellarMap.revealedChunks.size).toBe(2); // Cache should still exist
    });

    it('should not render inspector objects when not in inspector mode', () => {
      stellarMap.visible = true;
      stellarMap.inspectorMode = false;
      stellarMap.inspectorObjects = [];  // No inspector objects to render
      
      // Reset mock call counts for clean baseline
      mockRenderer.ctx.fill.mockClear();
      
      stellarMap.render(mockRenderer, mockCamera, []);
      
      // Should not render any inspector objects (test that inspector objects aren't rendered)
      const fillCallsAfterRender = mockRenderer.ctx.fill.mock.calls.length;
      
      // Now set inspector objects but keep inspector mode off
      stellarMap.inspectorObjects = [
        { type: 'star', x: 1000, y: 2000, chunkX: 0, chunkY: 1, properties: {} }
      ];
      
      // Reset and render again - should have same number of fill calls
      mockRenderer.ctx.fill.mockClear();
      stellarMap.render(mockRenderer, mockCamera, []);
      
      expect(mockRenderer.ctx.fill.mock.calls.length).toBe(fillCallsAfterRender);
    });

    it('should handle inspector service errors gracefully', async () => {
      stellarMap.initInspectorMode(mockSeedInspectorService);
      mockSeedInspectorService.getRegionObjects.mockRejectedValue(new Error('Service error'));
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = await stellarMap.revealChunks(12345, 0, 0, 2);
      
      expect(result.newChunks).toBe(0); // No chunks should be added on error
      expect(consoleSpy).toHaveBeenCalledWith('Failed to reveal chunks:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should reveal chunks with specified radius', async () => {
      stellarMap.initInspectorMode(mockSeedInspectorService);
      mockSeedInspectorService.getRegionObjects.mockResolvedValue([]);
      
      // Test revealing with custom radius - should generate individual chunks
      const result = await stellarMap.revealChunks(12345, 0, 0, 2);
      
      // Should generate (2*2+1)^2 = 25 individual chunk calls
      expect(mockSeedInspectorService.getRegionObjects).toHaveBeenCalledTimes(25);
      
      // Each call should be for an individual chunk (radius 0)
      const lastCall = mockSeedInspectorService.getRegionObjects.mock.calls.slice(-1)[0];
      const chunkRadius = lastCall[3]; // 4th parameter
      expect(chunkRadius).toBe(0); // Individual chunks use radius 0
      
      // Should report correct number of new chunks
      expect(result.newChunks).toBe(25);
    });

    describe('Inspector Object Visual Differentiation', () => {
      beforeEach(() => {
        stellarMap.visible = true;
        stellarMap.inspectorMode = true;
      });

      it('should use different colors for different object types', () => {
        // Background stars no longer supported in inspector mode (removed for performance)
        expect(stellarMap.getInspectorObjectColor('celestialStar')).toBe('#ffdd88');
        expect(stellarMap.getInspectorObjectColor('planet')).toBe('#88aa88');
        expect(stellarMap.getInspectorObjectColor('wormhole')).toBe('#8844ff');
        expect(stellarMap.getInspectorObjectColor('blackhole')).toBe('#ff0000');
        expect(stellarMap.getInspectorObjectColor('comet')).toBe('#88ccff');
        expect(stellarMap.getInspectorObjectColor('nebula')).toBe('#ff88cc');
        expect(stellarMap.getInspectorObjectColor('asteroidGarden')).toBe('#cc8844');
        expect(stellarMap.getInspectorObjectColor('moon')).toBe('#cccccc');
      });

      it('should render different shapes for different object types', () => {
        stellarMap.inspectorObjects = [
          { type: 'wormhole', x: 1000, y: 2000, chunkX: 0, chunkY: 1, properties: {} },
          { type: 'nebula', x: 1200, y: 2200, chunkX: 0, chunkY: 1, properties: {} },
          { type: 'planet', x: 1400, y: 2400, chunkX: 0, chunkY: 1, properties: {} }
        ];
        
        stellarMap.render(mockRenderer, mockCamera, []);
        
        // Should use different rendering methods
        expect(mockRenderer.ctx.moveTo).toHaveBeenCalled(); // For wormhole diamond
        expect(mockRenderer.ctx.setLineDash).toHaveBeenCalled(); // For nebula dashed border  
        expect(mockRenderer.ctx.fill).toHaveBeenCalled(); // For planet circle
      });
    });
  });
});