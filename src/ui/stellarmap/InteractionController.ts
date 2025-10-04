// Interaction Controller for StellarMap
// Handles pan/drag, zoom, selection, and hover functionality

import type { Input } from '../../input/input.js';
import type { Camera } from '../../camera/camera.js';
import { StellarMapHoverSystem } from './StellarMapHoverSystem.js';

// Re-export interfaces that the controller needs
export interface CelestialSelectionConfig {
    type: string;
    displayName: string;
    clickThreshold: number;
    priority: number;
    minZoomLevel?: number;
    discoveredParam: string;
    selectedProperty: string;
    requiresNullCheck: boolean;
}

export interface ClosestObjectResult {
    object: any;
    distance: number;
}

export class InteractionController {
    // Zoom state
    public zoomLevel: number = 1.0;

    // Pan/Drag state
    public centerX: number = 0;
    public centerY: number = 0;
    public isPanning: boolean = false;
    public followPlayer: boolean = true;
    public lastMouseX: number = 0;
    public lastMouseY: number = 0;
    public panStartX: number = 0;
    public panStartY: number = 0;

    // Selection state (11 object types)
    public selectedStar: any = null;
    public selectedPlanet: any = null;
    public selectedNebula: any = null;
    public selectedWormhole: any = null;
    public selectedAsteroidGarden: any = null;
    public selectedBlackHole: any = null;
    public selectedComet: any = null;
    public selectedRoguePlanet: any = null;
    public selectedDarkNebula: any = null;
    public selectedCrystalGarden: any = null;
    public selectedProtostar: any = null;

    // Hover state (11 object types)
    public hoveredStar: any = null;
    public hoveredPlanet: any = null;
    public hoveredNebula: any = null;
    public hoveredWormhole: any = null;
    public hoveredAsteroidGarden: any = null;
    public hoveredBlackHole: any = null;
    public hoveredComet: any = null;
    public hoveredRoguePlanet: any = null;
    public hoveredDarkNebula: any = null;
    public hoveredCrystalGarden: any = null;
    public hoveredProtostar: any = null;

    // Hover system
    private hoverSystem: StellarMapHoverSystem;

    constructor() {
        this.hoverSystem = new StellarMapHoverSystem();
    }

    /**
     * Handle mouse movement for panning
     */
    handleMouseMove(
        mouseX: number,
        mouseY: number,
        canvas: HTMLCanvasElement | null,
        input: Input | undefined,
        visible: boolean,
        gridSize: number
    ): boolean {
        if (!visible || !input || !canvas) return false;
        if (!input.isMousePressed() || input.isRightPressed()) return false;

        // Get map bounds
        const { mapX, mapY, mapWidth, mapHeight } = this.getMapBounds(canvas);

        // Initialize tracking if we haven't started
        if (this.lastMouseX === 0 && this.lastMouseY === 0) {
            const inBounds = mouseX >= mapX && mouseX <= mapX + mapWidth &&
                            mouseY >= mapY && mouseY <= mapY + mapHeight;

            // Only start if mouse is in map bounds
            if (inBounds) {
                this.lastMouseX = mouseX;
                this.lastMouseY = mouseY;
                this.panStartX = mouseX;
                this.panStartY = mouseY;
            }
            return false;
        }

        // Calculate movement from last position
        const deltaX = mouseX - this.lastMouseX;
        const deltaY = mouseY - this.lastMouseY;

        // Always consume input when handling mouse movement over stellar map
        input.consumeTouch();

        // If there's any movement at all, apply it
        if (deltaX !== 0 || deltaY !== 0) {
            // Check if we should start panning (moved enough from start)
            if (!this.isPanning) {
                const totalMove = Math.abs(mouseX - this.panStartX) + Math.abs(mouseY - this.panStartY);
                if (totalMove > 3) {
                    this.isPanning = true;
                    this.followPlayer = false;
                }
            }

            // Apply linear panning if active (scales properly with zoom)
            if (this.isPanning) {
                const worldToMapScale = Math.min(mapWidth, mapHeight) / (gridSize * 4 / this.zoomLevel);

                // Simple 1:1 conversion with zoom scaling
                this.centerX -= deltaX / worldToMapScale;
                this.centerY -= deltaY / worldToMapScale;
            }

            // Always update last position
            this.lastMouseX = mouseX;
            this.lastMouseY = mouseY;
        }

        return true; // Always consume input when handling stellar map mouse movement
    }

    /**
     * Reset panning state when mouse is released
     */
    resetPanState(): void {
        this.isPanning = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.panStartX = 0;
        this.panStartY = 0;
    }

    /**
     * Check if currently panning
     */
    isCurrentlyPanning(): boolean {
        return this.isPanning;
    }

    /**
     * Zoom in by factor of 1.5
     */
    zoomIn(inspectorMode: boolean, inspectorZoomExtended: boolean): void {
        const maxZoom = inspectorMode && inspectorZoomExtended ? 50.0 : 10.0;
        this.zoomLevel = Math.min(this.zoomLevel * 1.5, maxZoom);
    }

    /**
     * Zoom out by factor of 1.5
     */
    zoomOut(inspectorMode: boolean, inspectorZoomExtended: boolean): void {
        const minZoom = inspectorMode && inspectorZoomExtended ? 0.001 : 0.01;
        this.zoomLevel = Math.max(this.zoomLevel / 1.5, minZoom);
    }

    /**
     * Enable following player position
     */
    enableFollowPlayer(camera: Camera): void {
        this.followPlayer = true;
        this.centerOnPosition(camera.x, camera.y);
    }

    /**
     * Check if currently following player
     */
    isFollowingPlayer(): boolean {
        return this.followPlayer;
    }

    /**
     * Center map on position
     */
    centerOnPosition(x: number, y: number): void {
        this.centerX = x;
        this.centerY = y;
    }

    /**
     * Clear all selections
     */
    clearAllSelections(): void {
        this.selectedStar = null;
        this.selectedPlanet = null;
        this.selectedNebula = null;
        this.selectedWormhole = null;
        this.selectedAsteroidGarden = null;
        this.selectedBlackHole = null;
        this.selectedComet = null;
        this.selectedRoguePlanet = null;
        this.selectedDarkNebula = null;
        this.selectedCrystalGarden = null;
        this.selectedProtostar = null;
    }

    /**
     * Find the closest object of a specific type to the click position
     */
    findClosestObjectOfType(
        config: CelestialSelectionConfig,
        mouseX: number,
        mouseY: number,
        mapX: number,
        mapY: number,
        mapWidth: number,
        mapHeight: number,
        worldToMapScale: number,
        centerX: number,
        centerY: number,
        objects: any[]
    ): ClosestObjectResult | null {
        if (!objects || objects.length === 0) return null;

        let closestObject: any = null;
        let closestDistance = Infinity;

        for (const obj of objects) {
            // Skip null coordinate check if needed
            if (config.requiresNullCheck && (obj.x === null || obj.y === null)) {
                continue;
            }

            // Convert world coordinates to map coordinates
            const objMapX = mapX + mapWidth / 2 + (obj.x - centerX) * worldToMapScale;
            const objMapY = mapY + mapHeight / 2 + (obj.y - centerY) * worldToMapScale;

            // Calculate distance from mouse to object
            const distance = Math.sqrt(
                Math.pow(mouseX - objMapX, 2) + Math.pow(mouseY - objMapY, 2)
            );

            // Check if within threshold and closer than previous
            if (distance < config.clickThreshold && distance < closestDistance) {
                closestObject = obj;
                closestDistance = distance;
            }
        }

        return closestObject ? { object: closestObject, distance: closestDistance } : null;
    }

    /**
     * Detect hover target
     */
    detectHoverTarget(
        mouseX: number,
        mouseY: number,
        canvas: HTMLCanvasElement,
        discoveredStars: any[],
        zoomLevel: number,
        discoveredPlanets?: any[] | null,
        discoveredNebulae?: any[] | null,
        discoveredWormholes?: any[] | null,
        discoveredAsteroidGardens?: any[] | null,
        discoveredBlackHoles?: any[] | null,
        discoveredComets?: any[] | null,
        discoveredRoguePlanets?: any[] | null,
        discoveredDarkNebulae?: any[] | null,
        discoveredCrystalGardens?: any[] | null,
        discoveredProtostars?: any[] | null
    ): void {
        // Build object lists
        const objectLists = {
            'celestialStar': (discoveredStars || []).map(obj => ({ ...obj, type: 'celestialStar' })),
            'planet': zoomLevel > 3.0 ? (discoveredPlanets || []).map(obj => ({ ...obj, type: 'planet' })) : [],
            'nebula': (discoveredNebulae || []).map(obj => ({ ...obj, type: 'nebula' })),
            'wormhole': (discoveredWormholes || []).map(obj => ({ ...obj, type: 'wormhole' })),
            'asteroidGarden': (discoveredAsteroidGardens || []).map(obj => ({ ...obj, type: 'asteroidGarden' })),
            'blackhole': (discoveredBlackHoles || []).map(obj => ({ ...obj, type: 'blackhole' })),
            'comet': (discoveredComets || []).map(obj => ({ ...obj, type: 'comet' })),
            'rogue-planet': (discoveredRoguePlanets || []).map(obj => ({ ...obj, type: 'rogue-planet' })),
            'dark-nebula': (discoveredDarkNebulae || []).map(obj => ({ ...obj, type: 'dark-nebula' })),
            'crystal-garden': (discoveredCrystalGardens || []).map(obj => ({ ...obj, type: 'crystal-garden' })),
            'protostar': (discoveredProtostars || []).map(obj => ({ ...obj, type: 'protostar' }))
        };

        // Use hover system to detect target
        const { mapX, mapY, mapWidth, mapHeight } = this.getMapBounds(canvas);
        const gridSize = 2000; // Default grid size
        const worldToMapScale = Math.min(mapWidth, mapHeight) / (gridSize * 4 / this.zoomLevel);

        // Detect hover using hover system
        this.hoverSystem.detectHover(
            mouseX,
            mouseY,
            mapX,
            mapY,
            mapWidth,
            mapHeight,
            worldToMapScale,
            this.centerX,
            this.centerY,
            objectLists
        );

        // Get result from hover system
        const { object, type } = this.hoverSystem.getHoveredObject();

        // Clear all hovers
        this.hoveredStar = null;
        this.hoveredPlanet = null;
        this.hoveredNebula = null;
        this.hoveredWormhole = null;
        this.hoveredAsteroidGarden = null;
        this.hoveredBlackHole = null;
        this.hoveredComet = null;
        this.hoveredRoguePlanet = null;
        this.hoveredDarkNebula = null;
        this.hoveredCrystalGarden = null;
        this.hoveredProtostar = null;

        // Set hovered object based on type
        if (object && type) {
            switch (type) {
                case 'celestialStar': this.hoveredStar = object; break;
                case 'planet': this.hoveredPlanet = object; break;
                case 'nebula': this.hoveredNebula = object; break;
                case 'wormhole': this.hoveredWormhole = object; break;
                case 'asteroidGarden': this.hoveredAsteroidGarden = object; break;
                case 'blackhole': this.hoveredBlackHole = object; break;
                case 'comet': this.hoveredComet = object; break;
                case 'rogue-planet': this.hoveredRoguePlanet = object; break;
                case 'dark-nebula': this.hoveredDarkNebula = object; break;
                case 'crystal-garden': this.hoveredCrystalGarden = object; break;
                case 'protostar': this.hoveredProtostar = object; break;
            }
        }
    }

    /**
     * Update cursor based on hover state
     */
    updateCursor(canvas: HTMLCanvasElement, visible: boolean): void {
        const isHovering = this.hoveredStar || this.hoveredPlanet || this.hoveredNebula ||
                          this.hoveredWormhole || this.hoveredAsteroidGarden || this.hoveredBlackHole ||
                          this.hoveredComet || this.hoveredRoguePlanet || this.hoveredDarkNebula ||
                          this.hoveredCrystalGarden || this.hoveredProtostar;

        if (isHovering) {
            canvas.style.cursor = 'pointer';
        } else if (visible) {
            canvas.style.cursor = 'crosshair';
        } else {
            canvas.style.cursor = 'default';
        }
    }

    /**
     * Get map bounds (helper method)
     */
    private getMapBounds(canvas: HTMLCanvasElement): {
        mapX: number;
        mapY: number;
        mapWidth: number;
        mapHeight: number;
    } {
        let mapWidthRatio = 0.8;
        let mapHeightRatio = 0.8;
        let marginRatio = 0.1;

        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (isTouchDevice) {
            mapWidthRatio = 0.95;
            mapHeightRatio = 0.85;
            marginRatio = 0.025;
        }

        const mapWidth = canvas.width * mapWidthRatio;
        const mapHeight = canvas.height * mapHeightRatio;
        const mapX = canvas.width * marginRatio;
        const mapY = canvas.height * marginRatio;

        return { mapX, mapY, mapWidth, mapHeight };
    }
}
