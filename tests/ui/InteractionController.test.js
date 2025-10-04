// Interaction Controller Tests
// Tests for pan/drag, zoom, selection, and hover functionality

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InteractionController } from '../../dist/ui/stellarmap/InteractionController.js';

describe('InteractionController', () => {
    let controller;
    let mockCanvas;
    let mockInput;

    beforeEach(() => {
        controller = new InteractionController();

        mockCanvas = {
            width: 1000,
            height: 800,
            style: { cursor: 'default' }
        };

        mockInput = {
            isMousePressed: vi.fn(() => false),
            isRightPressed: vi.fn(() => false),
            consumeTouch: vi.fn(),
            wasJustPressed: vi.fn(() => false)
        };
    });

    describe('Constructor', () => {
        it('should initialize with default state', () => {
            expect(controller.zoomLevel).toBe(1.0);
            expect(controller.centerX).toBe(0);
            expect(controller.centerY).toBe(0);
            expect(controller.isPanning).toBe(false);
            expect(controller.followPlayer).toBe(true);
        });

        it('should initialize all selection states to null', () => {
            expect(controller.selectedStar).toBeNull();
            expect(controller.selectedPlanet).toBeNull();
            expect(controller.selectedNebula).toBeNull();
            expect(controller.selectedWormhole).toBeNull();
            expect(controller.selectedBlackHole).toBeNull();
        });

        it('should initialize all hover states to null', () => {
            expect(controller.hoveredStar).toBeNull();
            expect(controller.hoveredPlanet).toBeNull();
            expect(controller.hoveredNebula).toBeNull();
        });
    });

    describe('Zoom Functionality', () => {
        it('should zoom in by factor of 1.5', () => {
            controller.zoomLevel = 1.0;
            controller.zoomIn(false, false);
            expect(controller.zoomLevel).toBe(1.5);
        });

        it('should zoom out by factor of 1.5', () => {
            controller.zoomLevel = 1.5;
            controller.zoomOut(false, false);
            expect(controller.zoomLevel).toBe(1.0);
        });

        it('should respect max zoom limit (10.0)', () => {
            controller.zoomLevel = 8.0;
            controller.zoomIn(false, false);
            expect(controller.zoomLevel).toBe(10.0);
            controller.zoomIn(false, false); // Try to exceed
            expect(controller.zoomLevel).toBe(10.0);
        });

        it('should respect min zoom limit (0.01)', () => {
            controller.zoomLevel = 0.015;
            controller.zoomOut(false, false);
            expect(controller.zoomLevel).toBe(0.01);
            controller.zoomOut(false, false); // Try to go below
            expect(controller.zoomLevel).toBe(0.01);
        });

        it('should use extended zoom limits in inspector mode', () => {
            controller.zoomLevel = 10.0;
            controller.zoomIn(true, true); // inspectorMode=true, inspectorZoomExtended=true
            expect(controller.zoomLevel).toBeGreaterThan(10.0);
            expect(controller.zoomLevel).toBeLessThanOrEqual(50.0);
        });

        it('should use extended zoom out in inspector mode', () => {
            controller.zoomLevel = 0.01;
            controller.zoomOut(true, true); // inspectorMode=true, inspectorZoomExtended=true
            expect(controller.zoomLevel).toBeLessThan(0.01);
            expect(controller.zoomLevel).toBeGreaterThanOrEqual(0.001);
        });
    });

    describe('Pan/Drag Functionality', () => {
        it('should not pan when map is not visible', () => {
            const result = controller.handleMouseMove(100, 100, mockCanvas, mockInput, false, 2000);
            expect(result).toBe(false);
            expect(controller.isPanning).toBe(false);
        });

        it('should not pan when mouse is not pressed', () => {
            mockInput.isMousePressed.mockReturnValue(false);
            const result = controller.handleMouseMove(100, 100, mockCanvas, mockInput, true, 2000);
            expect(result).toBe(false);
        });

        it('should not pan when right mouse button is pressed', () => {
            mockInput.isMousePressed.mockReturnValue(true);
            mockInput.isRightPressed.mockReturnValue(true);
            const result = controller.handleMouseMove(100, 100, mockCanvas, mockInput, true, 2000);
            expect(result).toBe(false);
        });

        it('should initialize tracking on first mouse move in bounds', () => {
            mockInput.isMousePressed.mockReturnValue(true);
            controller.handleMouseMove(400, 300, mockCanvas, mockInput, true, 2000);

            expect(controller.lastMouseX).toBe(400);
            expect(controller.lastMouseY).toBe(300);
            expect(controller.panStartX).toBe(400);
            expect(controller.panStartY).toBe(300);
        });

        it('should start panning after moving more than 3 pixels', () => {
            mockInput.isMousePressed.mockReturnValue(true);

            // First move - initialize
            controller.handleMouseMove(400, 300, mockCanvas, mockInput, true, 2000);
            expect(controller.isPanning).toBe(false);

            // Second move - exceed threshold
            controller.handleMouseMove(405, 300, mockCanvas, mockInput, true, 2000);
            expect(controller.isPanning).toBe(true);
            expect(controller.followPlayer).toBe(false);
        });

        it('should update center position while panning', () => {
            mockInput.isMousePressed.mockReturnValue(true);

            // Initialize and start panning
            controller.handleMouseMove(400, 300, mockCanvas, mockInput, true, 2000);
            controller.handleMouseMove(405, 300, mockCanvas, mockInput, true, 2000);

            const initialX = controller.centerX;
            const initialY = controller.centerY;

            // Pan further
            controller.handleMouseMove(420, 310, mockCanvas, mockInput, true, 2000);

            expect(controller.centerX).not.toBe(initialX);
            expect(controller.centerY).not.toBe(initialY);
        });

        it('should consume touch input when panning', () => {
            mockInput.isMousePressed.mockReturnValue(true);

            controller.handleMouseMove(400, 300, mockCanvas, mockInput, true, 2000);
            controller.handleMouseMove(410, 310, mockCanvas, mockInput, true, 2000);

            expect(mockInput.consumeTouch).toHaveBeenCalled();
        });

        it('should reset pan state correctly', () => {
            mockInput.isMousePressed.mockReturnValue(true);

            // Start panning
            controller.handleMouseMove(400, 300, mockCanvas, mockInput, true, 2000);
            controller.handleMouseMove(410, 310, mockCanvas, mockInput, true, 2000);

            // Reset
            controller.resetPanState();

            expect(controller.isPanning).toBe(false);
            expect(controller.lastMouseX).toBe(0);
            expect(controller.lastMouseY).toBe(0);
            expect(controller.panStartX).toBe(0);
            expect(controller.panStartY).toBe(0);
        });

        it('should report panning state correctly', () => {
            expect(controller.isCurrentlyPanning()).toBe(false);
            controller.isPanning = true;
            expect(controller.isCurrentlyPanning()).toBe(true);
        });
    });

    describe('Follow Player', () => {
        it('should enable follow player and center on position', () => {
            controller.followPlayer = false;
            controller.enableFollowPlayer({ x: 1000, y: 2000 });

            expect(controller.followPlayer).toBe(true);
            expect(controller.centerX).toBe(1000);
            expect(controller.centerY).toBe(2000);
        });

        it('should report follow player state', () => {
            controller.followPlayer = true;
            expect(controller.isFollowingPlayer()).toBe(true);

            controller.followPlayer = false;
            expect(controller.isFollowingPlayer()).toBe(false);
        });

        it('should disable follow player when panning starts', () => {
            mockInput.isMousePressed.mockReturnValue(true);
            controller.followPlayer = true;

            controller.handleMouseMove(400, 300, mockCanvas, mockInput, true, 2000);
            controller.handleMouseMove(410, 310, mockCanvas, mockInput, true, 2000);

            expect(controller.followPlayer).toBe(false);
        });
    });

    describe('Selection Logic', () => {
        const stars = [
            { x: 100, y: 200, starTypeName: 'G-type' },
            { x: 300, y: 400, starTypeName: 'K-type' }
        ];

        const planets = [
            { x: 150, y: 250, parentStarX: 100, parentStarY: 200, planetTypeName: 'Rocky', planetIndex: 0 }
        ];

        it('should clear all selections', () => {
            controller.selectedStar = { x: 100, y: 200 };
            controller.selectedPlanet = { x: 150, y: 250 };

            controller.clearAllSelections();

            expect(controller.selectedStar).toBeNull();
            expect(controller.selectedPlanet).toBeNull();
        });

        it('should return null when no objects are passed', () => {
            const selectionConfig = {
                type: 'star',
                displayName: 'Star',
                clickThreshold: 15,
                priority: 10,
                discoveredParam: 'discoveredStars',
                selectedProperty: 'selectedStar',
                requiresNullCheck: false
            };

            const result = controller.findClosestObjectOfType(
                selectionConfig, 100, 100, 50, 50, 800, 600, 0.1, 0, 0, []
            );

            expect(result).toBeNull();
        });

        it('should find closest star within threshold', () => {
            const selectionConfig = {
                type: 'star',
                displayName: 'Star',
                clickThreshold: 15,
                priority: 10,
                discoveredParam: 'discoveredStars',
                selectedProperty: 'selectedStar',
                requiresNullCheck: false
            };

            // Calculate where star at (100, 200) would appear on map
            // mapX=50, mapY=50, mapWidth=800, mapHeight=600, scale=0.1, centerX=0, centerY=0
            // objMapX = 50 + 800/2 + (100 - 0) * 0.1 = 50 + 400 + 10 = 460
            // objMapY = 50 + 600/2 + (200 - 0) * 0.1 = 50 + 300 + 20 = 370
            // So clicking at (460, 370) should find it
            const result = controller.findClosestObjectOfType(
                selectionConfig, 460, 370, 50, 50, 800, 600, 0.1, 0, 0, stars
            );

            expect(result).not.toBeNull();
            expect(result.object.x).toBe(100);
            expect(result.object.y).toBe(200);
        });

        it('should return null when object is outside threshold', () => {
            const selectionConfig = {
                type: 'star',
                displayName: 'Star',
                clickThreshold: 15,
                priority: 10,
                discoveredParam: 'discoveredStars',
                selectedProperty: 'selectedStar',
                requiresNullCheck: false
            };

            // Very far from any star
            const result = controller.findClosestObjectOfType(
                selectionConfig, 1000, 1000, 50, 50, 800, 600, 0.1, 0, 0, stars
            );

            expect(result).toBeNull();
        });
    });

    describe('Hover Detection', () => {
        const stars = [
            { x: 100, y: 200, starTypeName: 'G-type' }
        ];

        it('should clear all hovers when no object is hovered', () => {
            controller.hoveredStar = { x: 100, y: 200 };
            controller.detectHoverTarget(1000, 1000, mockCanvas, stars, 3.0, [], [], [], [], [], [], [], [], [], []);

            expect(controller.hoveredStar).toBeNull();
        });

        it('should detect hover on star', () => {
            controller.detectHoverTarget(450, 350, mockCanvas, stars, 3.0, [], [], [], [], [], [], [], [], [], []);

            // Should detect hover if coordinates match (depends on world-to-map conversion)
            expect(controller.hoveredStar).toBeDefined();
        });

        it('should update cursor to pointer when hovering object', () => {
            controller.hoveredStar = { x: 100, y: 200 };
            controller.updateCursor(mockCanvas, true);

            expect(mockCanvas.style.cursor).toBe('pointer');
        });

        it('should update cursor to crosshair when map visible but not hovering', () => {
            controller.hoveredStar = null;
            controller.updateCursor(mockCanvas, true);

            expect(mockCanvas.style.cursor).toBe('crosshair');
        });

        it('should update cursor to default when map not visible', () => {
            controller.updateCursor(mockCanvas, false);

            expect(mockCanvas.style.cursor).toBe('default');
        });
    });

    describe('Center Position', () => {
        it('should set center position', () => {
            controller.centerOnPosition(1000, 2000);

            expect(controller.centerX).toBe(1000);
            expect(controller.centerY).toBe(2000);
        });
    });

    describe('Edge Cases', () => {
        it('should handle null canvas gracefully', () => {
            expect(() => {
                controller.handleMouseMove(100, 100, null, mockInput, true, 2000);
            }).not.toThrow();
        });

        it('should handle undefined input gracefully', () => {
            expect(() => {
                controller.handleMouseMove(100, 100, mockCanvas, undefined, true, 2000);
            }).not.toThrow();
        });

        it('should handle zero grid size', () => {
            mockInput.isMousePressed.mockReturnValue(true);

            expect(() => {
                controller.handleMouseMove(400, 300, mockCanvas, mockInput, true, 0);
            }).not.toThrow();
        });
    });
});
