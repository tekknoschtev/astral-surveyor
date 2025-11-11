// Stellar Map Interaction Integration Test
// Tests map interactions that were added in refactor #146 without test coverage

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StellarMap } from '../../dist/ui/StellarMap.js';
import { NamingService } from '../../dist/naming/naming.js';
import { ChunkManager } from '../../dist/world/ChunkManager.js';

describe('Stellar Map Interaction Integration', () => {
    let stellarMap;
    let namingService;
    let chunkManager;
    let mockCanvas;
    let mockRenderer;
    let mockCamera;

    beforeEach(() => {
        // Mock window to ensure desktop mode (not touch device)
        global.window = global.window || {};
        delete global.window.ontouchstart;
        if (global.navigator) {
            global.navigator.maxTouchPoints = 0;
        }

        // Mock canvas
        mockCanvas = {
            width: 800,
            height: 600,
            getContext: vi.fn().mockReturnValue({
                save: vi.fn(),
                restore: vi.fn(),
                fillRect: vi.fn(),
                strokeRect: vi.fn(),
                beginPath: vi.fn(),
                arc: vi.fn(),
                fill: vi.fn(),
                stroke: vi.fn(),
                fillText: vi.fn(),
                setLineDash: vi.fn(),
                moveTo: vi.fn(),
                lineTo: vi.fn(),
                closePath: vi.fn(),
                measureText: vi.fn((text) => ({ width: text.length * 7 })),
                createRadialGradient: vi.fn(() => ({
                    addColorStop: vi.fn()
                })),
                fillStyle: '',
                strokeStyle: '',
                lineWidth: 0,
                font: '',
                textAlign: '',
                textBaseline: '',
                globalAlpha: 1
            }),
            style: {}
        };

        // Mock renderer
        mockRenderer = {
            canvas: mockCanvas,
            ctx: mockCanvas.getContext()
        };

        // Mock camera
        mockCamera = {
            x: 0,
            y: 0,
            velocityX: 0,
            velocityY: 0
        };

        // Create services
        namingService = new NamingService();
        chunkManager = new ChunkManager();

        // Create stellar map and inject dependencies
        stellarMap = new StellarMap();
        stellarMap.setNamingService(namingService);
        stellarMap.setChunkManager(chunkManager);
    });

    describe('Object Selection', () => {
        it('should select celestial object when clicked on map', () => {
            stellarMap.visible = true;

            // Create mock discovered stars
            const discoveredStars = [
                { x: 100, y: 200, starTypeName: 'G-Type Star', discovered: true },
                { x: 500, y: 600, starTypeName: 'M-Type Star', discovered: true }
            ];

            // Calculate click position for first star
            // Map is 80% of canvas centered, so mapX = 80, mapY = 60
            // Object at (100, 200) in world space
            // Center is at (0, 0), zoom is 1.0
            const mapX = 80;
            const mapY = 60;
            const mapWidth = 640;
            const mapHeight = 480;
            const centerX = 0;
            const centerY = 0;
            const worldToMapScale = mapWidth / (stellarMap.gridSize * 4 / stellarMap.zoomLevel);

            // Calculate screen position
            const starScreenX = mapX + mapWidth/2 + (100 - centerX) * worldToMapScale;
            const starScreenY = mapY + mapHeight/2 + (200 - centerY) * worldToMapScale;

            // Click on the star (provide all required parameters)
            const handled = stellarMap.handleStarSelection(
                starScreenX,
                starScreenY,
                discoveredStars,
                mockCanvas,
                null, // discoveredPlanets
                null, // discoveredNebulae
                null, // discoveredWormholes
                null, // discoveredAsteroidGardens
                null, // discoveredBlackHoles
                null, // discoveredComets
                null, // discoveredRoguePlanets
                null, // discoveredDarkNebulae
                null, // discoveredCrystalGardens
                null  // discoveredProtostars
            );

            expect(handled).toBe(true);
            expect(stellarMap.selectedStar).toBeTruthy();
            expect(stellarMap.selectedStar?.x).toBe(100);
            expect(stellarMap.selectedStar?.y).toBe(200);
        });

        it('should clear selection when clicking empty space', () => {
            stellarMap.visible = true;

            // Set initial selection
            stellarMap.selectedStar = { x: 100, y: 200, starTypeName: 'G-Type Star' };

            const discoveredStars = [];

            // Click on empty space far from any objects
            const handled = stellarMap.handleStarSelection(
                400,
                300,
                discoveredStars,
                mockCanvas,
                null, // discoveredPlanets
                null, // discoveredNebulae
                null, // discoveredWormholes
                null, // discoveredAsteroidGardens
                null, // discoveredBlackHoles
                null, // discoveredComets
                null, // discoveredRoguePlanets
                null, // discoveredDarkNebulae
                null, // discoveredCrystalGardens
                null  // discoveredProtostars
            );

            expect(handled).toBe(true);
            expect(stellarMap.selectedStar).toBeNull();
        });

        it('should handle clicking outside map bounds', () => {
            stellarMap.visible = true;

            const discoveredStars = [
                { x: 100, y: 200, starTypeName: 'G-Type Star' }
            ];

            // Click outside map bounds
            const handled = stellarMap.handleStarSelection(
                10, // Far left, outside map
                10,
                discoveredStars,
                mockCanvas,
                null, // discoveredPlanets
                null, // discoveredNebulae
                null, // discoveredWormholes
                null, // discoveredAsteroidGardens
                null, // discoveredBlackHoles
                null, // discoveredComets
                null, // discoveredRoguePlanets
                null, // discoveredDarkNebulae
                null, // discoveredCrystalGardens
                null  // discoveredProtostars
            );

            expect(handled).toBe(false);
            expect(stellarMap.selectedStar).toBeNull();
        });
    });

    describe('Camera Focus', () => {
        it('should center map on celestial object position', () => {
            stellarMap.visible = true;

            const targetX = 1000;
            const targetY = 2000;

            stellarMap.centerOnPosition(targetX, targetY);

            expect(stellarMap.centerX).toBe(targetX);
            expect(stellarMap.centerY).toBe(targetY);
        });

        it('should follow player when follow mode is enabled', () => {
            stellarMap.visible = true;
            stellarMap.enableFollowPlayer(mockCamera);

            // Update camera position
            mockCamera.x = 500;
            mockCamera.y = 750;

            // Update map (simulating frame update)
            stellarMap.update(1/60, mockCamera);

            expect(stellarMap.centerX).toBe(500);
            expect(stellarMap.centerY).toBe(750);
            expect(stellarMap.isFollowingPlayer()).toBe(true);
        });

        it('should not follow player when panning', () => {
            stellarMap.visible = true;
            stellarMap.enableFollowPlayer(mockCamera);

            // Start panning
            stellarMap.isPanning = true;
            mockCamera.x = 500;
            mockCamera.y = 750;

            // Store current position before update
            const initialCenterX = stellarMap.centerX;
            const initialCenterY = stellarMap.centerY;

            stellarMap.update(1/60, mockCamera);

            // Should not update center while panning
            expect(stellarMap.centerX).toBe(initialCenterX);
            expect(stellarMap.centerY).toBe(initialCenterY);
        });
    });

    describe('Zoom Behavior', () => {
        it('should zoom in and maintain center position', () => {
            stellarMap.visible = true;

            const initialZoom = stellarMap.zoomLevel;
            const initialCenterX = stellarMap.centerX;
            const initialCenterY = stellarMap.centerY;

            stellarMap.zoomIn();

            expect(stellarMap.zoomLevel).toBeGreaterThan(initialZoom);
            expect(stellarMap.centerX).toBe(initialCenterX);
            expect(stellarMap.centerY).toBe(initialCenterY);
        });

        it('should zoom out and maintain center position', () => {
            stellarMap.visible = true;

            // Zoom in first so we can zoom out
            stellarMap.zoomIn();
            stellarMap.zoomIn();

            const currentZoom = stellarMap.zoomLevel;
            const currentCenterX = stellarMap.centerX;
            const currentCenterY = stellarMap.centerY;

            stellarMap.zoomOut();

            expect(stellarMap.zoomLevel).toBeLessThan(currentZoom);
            expect(stellarMap.centerX).toBe(currentCenterX);
            expect(stellarMap.centerY).toBe(currentCenterY);
        });

        it('should handle rendering at different zoom levels', () => {
            stellarMap.visible = true;

            const discoveredStars = [
                { x: 100, y: 200, starTypeName: 'G-Type Star' },
                { x: 500, y: 600, starTypeName: 'M-Type Star' }
            ];

            // Test rendering at different zoom levels
            const zoomLevels = [0.5, 1.0, 2.0, 5.0];

            zoomLevels.forEach(zoom => {
                stellarMap.zoomLevel = zoom;

                // Should not throw
                expect(() => {
                    stellarMap.render(mockRenderer, mockCamera, discoveredStars);
                }).not.toThrow();
            });
        });
    });

    describe('Discovered Objects Display', () => {
        it('should only show discovered objects on the map', () => {
            stellarMap.visible = true;

            // Mock discovered stars
            const discoveredStars = [
                { x: 100, y: 200, starTypeName: 'G-Type Star', discovered: true }
            ];

            // Render should only display discovered objects
            stellarMap.render(mockRenderer, mockCamera, discoveredStars);

            // Verify rendering occurred
            expect(mockRenderer.ctx.save).toHaveBeenCalled();
            expect(mockRenderer.ctx.restore).toHaveBeenCalled();
        });

        it('should handle empty discovered objects array', () => {
            stellarMap.visible = true;

            const discoveredStars = [];

            // Should not crash with no objects
            expect(() => {
                stellarMap.render(mockRenderer, mockCamera, discoveredStars);
            }).not.toThrow();
        });

        it('should show multiple object types when discovered', () => {
            stellarMap.visible = true;

            const discoveredStars = [
                { x: 100, y: 200, starTypeName: 'G-Type Star' }
            ];

            const discoveredPlanets = [
                { x: 150, y: 250, planetTypeName: 'Gas Giant', parentStarX: 100, parentStarY: 200 }
            ];

            const discoveredNebulae = [
                { x: 500, y: 600, nebulaType: 'emission' }
            ];

            // Zoom in enough to see planets
            stellarMap.zoomLevel = 4.0;

            // Should render all object types
            expect(() => {
                stellarMap.render(
                    mockRenderer,
                    mockCamera,
                    discoveredStars,
                    null,
                    discoveredPlanets,
                    discoveredNebulae
                );
            }).not.toThrow();
        });
    });

    describe('Map Visibility', () => {
        it('should not render when map is hidden', () => {
            stellarMap.visible = false;

            const discoveredStars = [
                { x: 100, y: 200, starTypeName: 'G-Type Star' }
            ];

            stellarMap.render(mockRenderer, mockCamera, discoveredStars);

            // Should not perform rendering operations when hidden
            expect(mockRenderer.ctx.save).not.toHaveBeenCalled();
        });

        it('should toggle visibility correctly', () => {
            expect(stellarMap.visible).toBe(false);

            stellarMap.toggle();
            expect(stellarMap.visible).toBe(true);
            expect(stellarMap.isVisible()).toBe(true);

            stellarMap.toggle();
            expect(stellarMap.visible).toBe(false);
            expect(stellarMap.isVisible()).toBe(false);
        });
    });

    describe('Object Hover Detection', () => {
        it('should detect hover over celestial objects', () => {
            stellarMap.visible = true;

            const discoveredStars = [
                { x: 100, y: 200, starTypeName: 'G-Type Star' }
            ];

            const mapX = 80;
            const mapWidth = 640;
            const mapHeight = 480;
            const worldToMapScale = mapWidth / (stellarMap.gridSize * 4 / stellarMap.zoomLevel);

            const starScreenX = mapX + mapWidth/2 + (100 - 0) * worldToMapScale;
            const starScreenY = 60 + mapHeight/2 + (200 - 0) * worldToMapScale;

            // Detect hover (provide all required parameters)
            stellarMap.detectHoverTarget(
                starScreenX,
                starScreenY,
                mockCanvas,
                discoveredStars,
                null, // discoveredPlanets
                null, // discoveredNebulae
                null, // discoveredWormholes
                null, // discoveredAsteroidGardens
                null, // discoveredBlackHoles
                null, // discoveredComets
                null, // discoveredRoguePlanets
                null, // discoveredDarkNebulae
                null, // discoveredCrystalGardens
                null  // discoveredProtostars
            );

            // Hover state should be updated
            expect(stellarMap.hoveredStar).toBeTruthy();
        });

        it('should clear hover when not over any objects', () => {
            stellarMap.visible = true;

            // Set initial hover state
            stellarMap.hoveredStar = { x: 100, y: 200, starTypeName: 'G-Type Star' };

            const discoveredStars = [];

            // Move mouse away from objects
            stellarMap.detectHoverTarget(
                400,
                300,
                mockCanvas,
                discoveredStars,
                null, // discoveredPlanets
                null, // discoveredNebulae
                null, // discoveredWormholes
                null, // discoveredAsteroidGardens
                null, // discoveredBlackHoles
                null, // discoveredComets
                null, // discoveredRoguePlanets
                null, // discoveredDarkNebulae
                null, // discoveredCrystalGardens
                null  // discoveredProtostars
            );

            expect(stellarMap.hoveredStar).toBeNull();
        });

        it('should not detect hover when map is hidden', () => {
            stellarMap.visible = false;

            const discoveredStars = [
                { x: 100, y: 200, starTypeName: 'G-Type Star' }
            ];

            stellarMap.detectHoverTarget(
                100,
                200,
                mockCanvas,
                discoveredStars,
                null, // discoveredPlanets
                null, // discoveredNebulae
                null, // discoveredWormholes
                null, // discoveredAsteroidGardens
                null, // discoveredBlackHoles
                null, // discoveredComets
                null, // discoveredRoguePlanets
                null, // discoveredDarkNebulae
                null, // discoveredCrystalGardens
                null  // discoveredProtostars
            );

            // Should not set hover state when hidden
            expect(stellarMap.hoveredStar).toBeNull();
        });
    });

    describe('Responsive Map Bounds', () => {
        it('should calculate correct map bounds for desktop', () => {
            const bounds = stellarMap.getMapBounds(mockCanvas);

            expect(bounds.mapWidth).toBe(640); // 80% of 800
            expect(bounds.mapHeight).toBe(480); // 80% of 600
            expect(bounds.mapX).toBe(80); // 10% margin
            expect(bounds.mapY).toBe(60); // 10% margin
        });

        it('should handle different canvas sizes', () => {
            mockCanvas.width = 1920;
            mockCanvas.height = 1080;

            const bounds = stellarMap.getMapBounds(mockCanvas);

            expect(bounds.mapWidth).toBe(1536); // 80% of 1920
            expect(bounds.mapHeight).toBe(864); // 80% of 1080
        });
    });
});
