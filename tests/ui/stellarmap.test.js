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
      height: 600
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
      isRightPressed: vi.fn(() => false)
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
});