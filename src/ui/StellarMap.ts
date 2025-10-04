// Stellar Map System for Discovery Visualization
// TypeScript conversion with comprehensive type definitions

// Import dependencies
import type { Renderer } from '../graphics/renderer.js';
import type { Camera } from '../camera/camera.js';
import type { Input } from '../input/input.js';
import { NamingService } from '../naming/naming.js';
import type { SeedInspectorService, CelestialObjectData } from '../debug/SeedInspectorService.js';
import type { ChunkManager } from '../world/ChunkManager.js';
import { GameConstants } from '../config/GameConstants.js';
import { StarRenderer } from './stellarmap/renderers/StarRenderer.js';
import { PlanetRenderer } from './stellarmap/renderers/PlanetRenderer.js';
import { NebulaRenderer } from './stellarmap/renderers/NebulaRenderer.js';
import { WormholeRenderer } from './stellarmap/renderers/WormholeRenderer.js';
import { BlackHoleRenderer } from './stellarmap/renderers/BlackHoleRenderer.js';
import { CometRenderer } from './stellarmap/renderers/CometRenderer.js';
import { AsteroidRenderer } from './stellarmap/renderers/AsteroidRenderer.js';
import { RegionObjectRenderer } from './stellarmap/renderers/RegionObjectRenderer.js';
import { InfoPanelRenderer } from './stellarmap/InfoPanelRenderer.js';
import { DiscoveryOverlay } from './stellarmap/DiscoveryOverlay.js';
import { DiscoveryVisualizationService } from '../services/DiscoveryVisualizationService.js';
import { InteractionController } from './stellarmap/InteractionController.js';
import { InspectorModeController } from './stellarmap/InspectorModeController.js';
import { GridRenderer } from './stellarmap/GridRenderer.js';
import { MarkerRenderer, type GameStartingPosition as MarkerGameStartingPosition } from './stellarmap/MarkerRenderer.js';
import { MapUIRenderer } from './stellarmap/MapUIRenderer.js';

// Interface definitions
interface StarLike {
    x: number;
    y: number;
    starTypeName?: string;
    starType?: {
        sizeMultiplier: number;
    };
    timestamp?: number;
}

interface PlanetLike {
    x: number | null;
    y: number | null;
    parentStarX: number;
    parentStarY: number;
    planetTypeName: string;
    planetType?: {
        sizeMultiplier: number;
        colors?: string[];
    };
    planetIndex: number;
    objectName?: string;
    timestamp?: number;
}

interface NebulaLike {
    x: number;
    y: number;
    nebulaType: string;
    nebulaTypeData?: {
        name: string;
        colors?: string[];
        size?: number;
    };
    objectName?: string;
    timestamp?: number;
}

interface WormholeLike {
    x: number;
    y: number;
    wormholeId: string;
    designation: 'alpha' | 'beta';
    pairId: string;
    twinX: number;
    twinY: number;
    objectName?: string;
    timestamp?: number;
}

interface AsteroidGardenLike {
    x: number;
    y: number;
    gardenType: string;
    gardenTypeData?: {
        name: string;
        colors?: string[];
        accentColors?: string[];
    };
    objectName?: string;
    timestamp?: number;
}

interface BlackHoleLike {
    x: number;
    y: number;
    blackHoleTypeName: string;
    objectName?: string;
    timestamp?: number;
}

interface CometLike {
    x: number;
    y: number;
    cometType?: {
        name: string;
        tailColors?: string[];
        nucleusColor?: string;
    };
    parentStarX?: number;
    parentStarY?: number;
    orbit?: {
        semiMajorAxis: number;
        eccentricity: number;
        perihelionDistance: number;
        aphelionDistance: number;
        argumentOfPerihelion: number;
    };
    objectName?: string;
    timestamp?: number;
}

// Union type for all discoverable objects
type DiscoverableObject = StarLike | PlanetLike | NebulaLike | WormholeLike | AsteroidGardenLike | BlackHoleLike | CometLike;

// Centralized Hover System Interfaces
interface HoverableObject {
    type: string;
    x: number;
    y: number;
    // Optional properties that may exist on different object types
    radius?: number;
    [key: string]: any; // Allow other properties
}

interface HoverConfig {
    threshold: number;
    renderSize: number;
    priority: number; // Lower number = higher priority
}

// Selection System Interfaces
/**
 * Configuration for celestial object selection behavior
 */
interface CelestialSelectionConfig {
    /** Unique type identifier */
    type: 'planet' | 'roguePlanet' | 'darkNebula' | 'protostar' | 'crystalGarden' |
          'wormhole' | 'nebula' | 'comet' | 'blackHole' | 'asteroidGarden' | 'star';

    /** Display name for debugging */
    displayName: string;

    /** Base click threshold in pixels */
    clickThreshold: number;

    /** Selection priority (lower = higher priority, 1 is highest) */
    priority: number;

    /** Minimum zoom level required for selection (optional) */
    minZoomLevel?: number;

    /** Property name for discovered objects array parameter */
    discoveredParam: string;

    /** Property name for selected object on StellarMap class */
    selectedProperty: string;

    /** Whether to check for null x/y coordinates before processing */
    requiresNullCheck: boolean;
}

/**
 * Result from finding the closest object of a given type
 */
interface ClosestObjectResult {
    object: any | null;
    distance: number;
    type: string;
    priority: number;
    config: CelestialSelectionConfig;
}

class StellarMapHoverSystem {
    private hoveredObject: HoverableObject | null = null;
    private hoveredObjectType: string | null = null;

    private readonly hoverConfigs: Record<string, HoverConfig> = {
        'planet': { threshold: 15, renderSize: 3, priority: 1 },
        'rogue-planet': { threshold: 15, renderSize: 3, priority: 2 },
        'dark-nebula': { threshold: 18, renderSize: 4, priority: 3 },
        'protostar': { threshold: 20, renderSize: 5, priority: 3.5 },
        'crystal-garden': { threshold: 16, renderSize: 4, priority: 4 },
        'nebula': { threshold: 20, renderSize: 5, priority: 5 },
        'wormhole': { threshold: 12, renderSize: 3, priority: 6 },
        'comet': { threshold: 12, renderSize: 2, priority: 7 },
        'blackhole': { threshold: 15, renderSize: 4, priority: 8 },
        'asteroidGarden': { threshold: 18, renderSize: 4, priority: 9 },
        'celestialStar': { threshold: 10, renderSize: 2, priority: 10 }
    };

    detectHover(mouseX: number, mouseY: number, mapX: number, mapY: number, mapWidth: number, mapHeight: number, 
                worldToMapScale: number, centerX: number, centerY: number, objectCollections: Record<string, HoverableObject[]>): void {
        
        let closestObject: HoverableObject | null = null;
        let closestDistance = Infinity;
        let closestType: string | null = null;

        // Check all object collections in priority order
        const sortedTypes = Object.keys(this.hoverConfigs).sort((a, b) => 
            this.hoverConfigs[a].priority - this.hoverConfigs[b].priority
        );

        for (const objectType of sortedTypes) {
            const objects = objectCollections[objectType];
            if (!objects || objects.length === 0) continue;

            const config = this.hoverConfigs[objectType];

            for (const obj of objects) {
                const objMapX = mapX + mapWidth/2 + (obj.x - centerX) * worldToMapScale;
                const objMapY = mapY + mapHeight/2 + (obj.y - centerY) * worldToMapScale;

                // Check if object is within map bounds
                if (objMapX >= mapX && objMapX <= mapX + mapWidth && 
                    objMapY >= mapY && objMapY <= mapY + mapHeight) {
                    
                    const distance = Math.sqrt((mouseX - objMapX)**2 + (mouseY - objMapY)**2);
                    if (distance <= config.threshold && distance < closestDistance) {
                        closestObject = obj;
                        closestDistance = distance;
                        closestType = objectType;
                    }
                }
            }

            // If we found something at this priority level, stop searching lower priorities
            if (closestObject) break;
        }

        this.hoveredObject = closestObject;
        this.hoveredObjectType = closestType;
    }

    getHoveredObject(): { object: HoverableObject | null, type: string | null } {
        return { object: this.hoveredObject, type: this.hoveredObjectType };
    }

    clearHover(): void {
        this.hoveredObject = null;
        this.hoveredObjectType = null;
    }

    renderHoverEffect(ctx: CanvasRenderingContext2D, mapX: number, mapY: number, mapWidth: number, mapHeight: number, 
                     worldToMapScale: number, centerX: number, centerY: number): void {
        if (!this.hoveredObject || !this.hoveredObjectType) return;

        const config = this.hoverConfigs[this.hoveredObjectType];
        if (!config) return;

        const objMapX = mapX + mapWidth/2 + (this.hoveredObject.x - centerX) * worldToMapScale;
        const objMapY = mapY + mapHeight/2 + (this.hoveredObject.y - centerY) * worldToMapScale;

        // Render hover effect (consistent with existing object hover styles)
        ctx.save();
        ctx.strokeStyle = '#d4a57480'; // Semi-transparent amber like other objects (currentPositionColor + '80')
        ctx.lineWidth = 1;
        ctx.beginPath();
        const hoverRadius = Math.max(5, config.renderSize + 1);
        ctx.arc(objMapX, objMapY, hoverRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

/**
 * Centralized configuration for all celestial object selection behavior.
 * Objects are ordered by priority (highest first) for clarity.
 */
const CELESTIAL_SELECTION_CONFIG: CelestialSelectionConfig[] = [
    {
        type: 'planet',
        displayName: 'Planet',
        clickThreshold: 10,
        priority: 1,
        minZoomLevel: 3.0,
        discoveredParam: 'discoveredPlanets',
        selectedProperty: 'selectedPlanet',
        requiresNullCheck: true  // Planets can have null x/y
    },
    {
        type: 'roguePlanet',
        displayName: 'Rogue Planet',
        clickThreshold: 12,
        priority: 2,
        discoveredParam: 'discoveredRoguePlanets',
        selectedProperty: 'selectedRoguePlanet',
        requiresNullCheck: false
    },
    {
        type: 'darkNebula',
        displayName: 'Dark Nebula',
        clickThreshold: 12,
        priority: 3,
        discoveredParam: 'discoveredDarkNebulae',
        selectedProperty: 'selectedDarkNebula',
        requiresNullCheck: false
    },
    {
        type: 'protostar',
        displayName: 'Protostar',
        clickThreshold: 15,
        priority: 4,
        discoveredParam: 'discoveredProtostars',
        selectedProperty: 'selectedProtostar',
        requiresNullCheck: false
    },
    {
        type: 'crystalGarden',
        displayName: 'Crystal Garden',
        clickThreshold: 12,
        priority: 5,
        discoveredParam: 'discoveredCrystalGardens',
        selectedProperty: 'selectedCrystalGarden',
        requiresNullCheck: false
    },
    {
        type: 'wormhole',
        displayName: 'Wormhole',
        clickThreshold: 20,
        priority: 6,
        discoveredParam: 'discoveredWormholes',
        selectedProperty: 'selectedWormhole',
        requiresNullCheck: false
    },
    {
        type: 'nebula',
        displayName: 'Nebula',
        clickThreshold: 15,
        priority: 7,
        discoveredParam: 'discoveredNebulae',
        selectedProperty: 'selectedNebula',
        requiresNullCheck: true  // Nebulae can have null x/y
    },
    {
        type: 'comet',
        displayName: 'Comet',
        clickThreshold: 15,
        priority: 8,
        discoveredParam: 'discoveredComets',
        selectedProperty: 'selectedComet',
        requiresNullCheck: false
    },
    {
        type: 'blackHole',
        displayName: 'Black Hole',
        clickThreshold: 25,
        priority: 9,
        discoveredParam: 'discoveredBlackHoles',
        selectedProperty: 'selectedBlackHole',
        requiresNullCheck: false
    },
    {
        type: 'asteroidGarden',
        displayName: 'Asteroid Garden',
        clickThreshold: 20,
        priority: 10,
        discoveredParam: 'discoveredAsteroidGardens',
        selectedProperty: 'selectedAsteroidGarden',
        requiresNullCheck: false
    },
    {
        type: 'star',
        displayName: 'Star',
        clickThreshold: 10,
        priority: 11,
        discoveredParam: 'discoveredStars',
        selectedProperty: 'selectedStar',
        requiresNullCheck: false
    }
];

interface GameStartingPosition {
    x: number;
    y: number;
}

export class StellarMap {
    // Constants for consistent styling
    private static readonly LABEL_FONT_SIZE = 12;
    private static readonly LABEL_FONT_FAMILY = '"Courier New", monospace';
    
    visible: boolean;
    gridSize: number;
    namingService: NamingService | null;

    // Delegated properties to InteractionController
    get zoomLevel() { return this.interactionController.zoomLevel; }
    set zoomLevel(value: number) { this.interactionController.zoomLevel = value; }

    get centerX() { return this.interactionController.centerX; }
    set centerX(value: number) { this.interactionController.centerX = value; }

    get centerY() { return this.interactionController.centerY; }
    set centerY(value: number) { this.interactionController.centerY = value; }

    get selectedStar() { return this.interactionController.selectedStar; }
    set selectedStar(value: StarLike | null) { this.interactionController.selectedStar = value; }

    get hoveredStar() { return this.interactionController.hoveredStar; }
    set hoveredStar(value: StarLike | null) { this.interactionController.hoveredStar = value; }

    get selectedPlanet() { return this.interactionController.selectedPlanet; }
    set selectedPlanet(value: PlanetLike | null) { this.interactionController.selectedPlanet = value; }

    get hoveredPlanet() { return this.interactionController.hoveredPlanet; }
    set hoveredPlanet(value: PlanetLike | null) { this.interactionController.hoveredPlanet = value; }

    get selectedNebula() { return this.interactionController.selectedNebula; }
    set selectedNebula(value: NebulaLike | null) { this.interactionController.selectedNebula = value; }

    get hoveredNebula() { return this.interactionController.hoveredNebula; }
    set hoveredNebula(value: NebulaLike | null) { this.interactionController.hoveredNebula = value; }

    get selectedWormhole() { return this.interactionController.selectedWormhole; }
    set selectedWormhole(value: WormholeLike | null) { this.interactionController.selectedWormhole = value; }

    get hoveredWormhole() { return this.interactionController.hoveredWormhole; }
    set hoveredWormhole(value: WormholeLike | null) { this.interactionController.hoveredWormhole = value; }

    get selectedAsteroidGarden() { return this.interactionController.selectedAsteroidGarden; }
    set selectedAsteroidGarden(value: AsteroidGardenLike | null) { this.interactionController.selectedAsteroidGarden = value; }

    get hoveredAsteroidGarden() { return this.interactionController.hoveredAsteroidGarden; }
    set hoveredAsteroidGarden(value: AsteroidGardenLike | null) { this.interactionController.hoveredAsteroidGarden = value; }

    get selectedBlackHole() { return this.interactionController.selectedBlackHole; }
    set selectedBlackHole(value: BlackHoleLike | null) { this.interactionController.selectedBlackHole = value; }

    get hoveredBlackHole() { return this.interactionController.hoveredBlackHole; }
    set hoveredBlackHole(value: BlackHoleLike | null) { this.interactionController.hoveredBlackHole = value; }

    get selectedComet() { return this.interactionController.selectedComet; }
    set selectedComet(value: CometLike | null) { this.interactionController.selectedComet = value; }

    get hoveredComet() { return this.interactionController.hoveredComet; }
    set hoveredComet(value: CometLike | null) { this.interactionController.hoveredComet = value; }

    get selectedRoguePlanet() { return this.interactionController.selectedRoguePlanet; }
    set selectedRoguePlanet(value: any | null) { this.interactionController.selectedRoguePlanet = value; }

    get hoveredRoguePlanet() { return this.interactionController.hoveredRoguePlanet; }
    set hoveredRoguePlanet(value: any | null) { this.interactionController.hoveredRoguePlanet = value; }

    get selectedDarkNebula() { return this.interactionController.selectedDarkNebula; }
    set selectedDarkNebula(value: any | null) { this.interactionController.selectedDarkNebula = value; }

    get hoveredDarkNebula() { return this.interactionController.hoveredDarkNebula; }
    set hoveredDarkNebula(value: any | null) { this.interactionController.hoveredDarkNebula = value; }

    get selectedCrystalGarden() { return this.interactionController.selectedCrystalGarden; }
    set selectedCrystalGarden(value: any | null) { this.interactionController.selectedCrystalGarden = value; }

    get selectedProtostar() { return this.interactionController.selectedProtostar; }
    set selectedProtostar(value: any | null) { this.interactionController.selectedProtostar = value; }

    get hoveredProtostar() { return this.interactionController.hoveredProtostar; }
    set hoveredProtostar(value: any | null) { this.interactionController.hoveredProtostar = value; }

    get hoveredCrystalGarden() { return this.interactionController.hoveredCrystalGarden; }
    set hoveredCrystalGarden(value: any | null) { this.interactionController.hoveredCrystalGarden = value; }

    get followPlayer() { return this.interactionController.followPlayer; }
    set followPlayer(value: boolean) { this.interactionController.followPlayer = value; }

    get isPanning() { return this.interactionController.isPanning; }
    set isPanning(value: boolean) { this.interactionController.isPanning = value; }

    get panStartX() { return this.interactionController.panStartX; }
    set panStartX(value: number) { this.interactionController.panStartX = value; }

    get panStartY() { return this.interactionController.panStartY; }
    set panStartY(value: number) { this.interactionController.panStartY = value; }

    get lastMouseX() { return this.interactionController.lastMouseX; }
    set lastMouseX(value: number) { this.interactionController.lastMouseX = value; }

    get lastMouseY() { return this.interactionController.lastMouseY; }
    set lastMouseY(value: number) { this.interactionController.lastMouseY = value; }

    // Legacy properties (not in controller)
    panStartMapX: number;
    panStartMapY: number;
    
    // Visual settings for subtle space aesthetic
    backgroundColor: string;
    gridColor: string;
    currentPositionColor: string;
    starColors: Record<string, string>;
    
    // Inspector mode controller
    private inspectorController: InspectorModeController;

    // Inspector mode delegation getters/setters
    get inspectorMode(): boolean { return this.inspectorController.inspectorMode; }
    set inspectorMode(value: boolean) { this.inspectorController.inspectorMode = value; }

    get inspectorSeed(): number | null { return this.inspectorController.inspectorSeed; }
    set inspectorSeed(value: number | null) { this.inspectorController.inspectorSeed = value; }

    get inspectorService(): SeedInspectorService | null { return this.inspectorController.inspectorService; }
    set inspectorService(value: SeedInspectorService | null) { this.inspectorController.inspectorService = value; }

    get inspectorObjects(): CelestialObjectData[] { return this.inspectorController.inspectorObjects; }
    set inspectorObjects(value: CelestialObjectData[]) { this.inspectorController.inspectorObjects = value; }

    get inspectorZoomExtended(): boolean { return this.inspectorController.inspectorZoomExtended; }
    set inspectorZoomExtended(value: boolean) { this.inspectorController.inspectorZoomExtended = value; }

    get statisticsOverlayEnabled(): boolean { return this.inspectorController.statisticsOverlayEnabled; }
    set statisticsOverlayEnabled(value: boolean) { this.inspectorController.statisticsOverlayEnabled = value; }

    get currentViewStatistics() { return this.inspectorController.currentViewStatistics; }
    set currentViewStatistics(value: any) { this.inspectorController.currentViewStatistics = value; }

    get objectTypeVisibility(): Record<string, boolean> { return this.inspectorController.objectTypeVisibility; }
    set objectTypeVisibility(value: Record<string, boolean>) { this.inspectorController.objectTypeVisibility = value; }

    // Note: Tests directly access revealedChunks map - we need to expose the controller's private map
    // This is a temporary bridge for legacy test compatibility
    get revealedChunks() {
        // Access the private field through a type assertion for test compatibility
        // In production, tests should use the public API methods instead
        return (this.inspectorController as any).revealedChunks;
    }

    hoveredObjectTypeIndex: number;
    showDiscoveredObjects: boolean;

    // Renderers
    private starRenderer: StarRenderer;
    private planetRenderer: PlanetRenderer;
    private nebulaRenderer: NebulaRenderer;
    private wormholeRenderer: WormholeRenderer;
    private blackHoleRenderer: BlackHoleRenderer;
    private cometRenderer: CometRenderer;
    private asteroidRenderer: AsteroidRenderer;
    private regionObjectRenderer: RegionObjectRenderer;
    private infoPanelRenderer: InfoPanelRenderer;
    private discoveryOverlay: DiscoveryOverlay;
    private discoveryVisualizationService: DiscoveryVisualizationService;
    private gridRenderer: GridRenderer;
    private markerRenderer: MarkerRenderer;
    private mapUIRenderer: MapUIRenderer;

    // Interaction controller
    private interactionController: InteractionController;

    // Chunk Manager for region information
    chunkManager: ChunkManager | null;

    constructor() {
        // Initialize interaction controller first (it holds zoom, center, selection, hover, pan state)
        this.interactionController = new InteractionController();

        // Initialize inspector mode controller
        this.inspectorController = new InspectorModeController();

        this.visible = false;
        this.gridSize = 2000; // Grid spacing in world units
        this.namingService = null; // Will be injected

        // Legacy pan properties
        this.panStartMapX = 0; // Map center when pan started
        this.panStartMapY = 0;

        // Visual settings for subtle space aesthetic
        this.backgroundColor = '#000000F0'; // More opaque for better contrast
        this.gridColor = '#2a3a4a40'; // Very subtle dark blue-gray with transparency
        this.currentPositionColor = '#d4a574'; // Gentle amber accent
        this.starColors = {
            'G-Type Star': '#ffdd88',
            'K-Type Star': '#ffaa44',
            'M-Type Star': '#ff6644',
            'Red Giant': '#ff4422',
            'Blue Giant': '#88ddff',
            'White Dwarf': '#ffffff',
            'Neutron Star': '#ddddff'
        };

        this.hoveredObjectTypeIndex = -1;
        this.showDiscoveredObjects = true;

        // Initialize chunk manager
        this.chunkManager = null;

        // Initialize renderers
        this.starRenderer = new StarRenderer();
        this.planetRenderer = new PlanetRenderer();
        this.nebulaRenderer = new NebulaRenderer();
        this.wormholeRenderer = new WormholeRenderer();
        this.blackHoleRenderer = new BlackHoleRenderer();
        this.cometRenderer = new CometRenderer();
        this.asteroidRenderer = new AsteroidRenderer();
        this.regionObjectRenderer = new RegionObjectRenderer();
        this.infoPanelRenderer = new InfoPanelRenderer();
        this.gridRenderer = new GridRenderer(this.gridSize, this.gridColor);
        this.markerRenderer = new MarkerRenderer(this.currentPositionColor);
        this.mapUIRenderer = new MapUIRenderer();

        // Initialize discovery visualization
        this.discoveryVisualizationService = new DiscoveryVisualizationService();
        this.discoveryOverlay = new DiscoveryOverlay(this.discoveryVisualizationService);
    }

    private getLabelFont(): string {
        return `${StellarMap.LABEL_FONT_SIZE}px ${StellarMap.LABEL_FONT_FAMILY}`;
    }

    toggle(): void {
        this.visible = !this.visible;
    }

    isVisible(): boolean {
        return this.visible;
    }

    toggleDiscoveryTimestamps(): void {
        this.discoveryOverlay.toggleTimestampDisplay();
    }

    toggleCoordinateSharing(): void {
        this.discoveryOverlay.toggleCoordinateSharing();
    }

    isTimestampDisplayEnabled(): boolean {
        return this.discoveryOverlay.showTimestamps;
    }

    isCoordinateSharingEnabled(): boolean {
        return this.discoveryOverlay.coordinateShareEnabled;
    }

    centerOnPosition(x: number, y: number): void {
        this.interactionController.centerOnPosition(x, y);

        // Note: Inspector mode now uses persistent revealed chunks
        // No need to refresh data on position changes
    }

    update(deltaTime: number, camera: Camera, input?: Input): void {
        if (this.visible) {
            // Only auto-center map on player position when following
            if (this.followPlayer && !this.isPanning) {
                this.centerOnPosition(camera.x, camera.y);
            }
            
            // Handle zoom controls when map is visible
            if (input) {
                // Mouse wheel zoom
                const wheelDelta = input.getWheelDelta();
                if (wheelDelta !== 0) {
                    if (wheelDelta < 0) {
                        this.zoomIn();
                    } else {
                        this.zoomOut();
                    }
                }
                
                // Pinch zoom for touch devices
                if (input.hasPinchZoomIn()) {
                    this.zoomIn();
                } else if (input.hasPinchZoomOut()) {
                    this.zoomOut();
                }
                
                // Keyboard zoom
                if (input.wasJustPressed('Equal') || input.wasJustPressed('NumpadAdd')) {
                    this.zoomIn();
                }
                if (input.wasJustPressed('Minus') || input.wasJustPressed('NumpadSubtract')) {
                    this.zoomOut();
                }
            }
        }
    }

    handleMouseMove(mouseX: number, mouseY: number, canvas: HTMLCanvasElement, input: Input): boolean {
        // Hover state is handled by detectHoverTarget() which is called from game.ts
        return this.interactionController.handleMouseMove(mouseX, mouseY, canvas, input, this.visible, this.gridSize);
    }
    
    // Reset panning state when mouse is released
    resetPanState(): void {
        this.interactionController.resetPanState();
    }

    /**
     * Find the closest object of a specific type to the click position
     * @private
     */
    private findClosestObjectOfType(
        config: CelestialSelectionConfig,
        mouseX: number,
        mouseY: number,
        mapX: number,
        mapY: number,
        mapWidth: number,
        mapHeight: number,
        worldToMapScale: number,
        objects: any[] | null | undefined
    ): ClosestObjectResult | null {
        const result = this.interactionController.findClosestObjectOfType(
            config,
            mouseX,
            mouseY,
            mapX,
            mapY,
            mapWidth,
            mapHeight,
            worldToMapScale,
            this.centerX,
            this.centerY,
            objects
        );

        if (!result) {
            return null;
        }

        // Return result object with additional metadata for selection priority
        return {
            object: result.object,
            distance: result.distance,
            type: config.type,
            priority: config.priority,
            config: config
        };
    }

    /**
     * Clear all selection properties using the configuration array
     * @private
     */
    private clearAllSelections(): void {
        this.interactionController.clearAllSelections();
    }

    handleStarSelection(mouseX: number, mouseY: number, discoveredStars: StarLike[], canvas: HTMLCanvasElement, discoveredPlanets?: PlanetLike[] | null, discoveredNebulae?: NebulaLike[] | null, discoveredWormholes?: WormholeLike[] | null, discoveredAsteroidGardens?: AsteroidGardenLike[] | null, discoveredBlackHoles?: BlackHoleLike[] | null, discoveredComets?: CometLike[] | null, discoveredRoguePlanets?: any[] | null, discoveredDarkNebulae?: any[] | null, discoveredCrystalGardens?: any[] | null, discoveredProtostars?: any[] | null, input?: Input): boolean {
        if (!discoveredStars) return false;

        // Calculate map bounds
        const { mapX, mapY, mapWidth, mapHeight } = this.getMapBounds(canvas);
        const worldToMapScale = Math.min(mapWidth, mapHeight) / (this.gridSize * 4 / this.zoomLevel);

        // Check if click is within map bounds
        if (mouseX < mapX || mouseX > mapX + mapWidth || mouseY < mapY || mouseY > mapY + mapHeight) {
            this.clearAllSelections();
            return false;
        }

        // Map parameter names to actual discovered object arrays
        const discoveredObjectsMap: Record<string, any[] | null | undefined> = {
            'discoveredStars': discoveredStars,
            'discoveredPlanets': discoveredPlanets,
            'discoveredNebulae': discoveredNebulae,
            'discoveredWormholes': discoveredWormholes,
            'discoveredAsteroidGardens': discoveredAsteroidGardens,
            'discoveredBlackHoles': discoveredBlackHoles,
            'discoveredComets': discoveredComets,
            'discoveredRoguePlanets': discoveredRoguePlanets,
            'discoveredDarkNebulae': discoveredDarkNebulae,
            'discoveredCrystalGardens': discoveredCrystalGardens,
            'discoveredProtostars': discoveredProtostars
        };

        // Find closest objects for each type using the config array
        const candidates: ClosestObjectResult[] = [];

        for (const config of CELESTIAL_SELECTION_CONFIG) {
            // Skip planets if zoom level is too low
            if (config.minZoomLevel && this.zoomLevel < config.minZoomLevel) {
                continue;
            }

            // Get the discovered objects array for this type
            const objects = discoveredObjectsMap[config.discoveredParam];

            // Find closest object of this type
            const result = this.findClosestObjectOfType(
                config,
                mouseX,
                mouseY,
                mapX,
                mapY,
                mapWidth,
                mapHeight,
                worldToMapScale,
                objects
            );

            // Add to candidates if found
            if (result) {
                candidates.push(result);
            }
        }

        // Clear all selections first
        this.clearAllSelections();

        // Select the highest priority candidate (lowest priority number)
        if (candidates.length > 0) {
            // Sort by priority (ascending) then by distance (ascending)
            candidates.sort((a, b) => {
                if (a.priority !== b.priority) {
                    return a.priority - b.priority;
                }
                return a.distance - b.distance;
            });

            // Select the winner
            const winner = candidates[0];
            (this as any)[winner.config.selectedProperty] = winner.object;
        }

        // Consume input to prevent ship movement when handling stellar map interactions
        if (input) {
            input.consumeTouch();
        }
        return true; // Consumed the event
    }
    
    detectHoverTarget(mouseX: number, mouseY: number, canvas: HTMLCanvasElement, discoveredStars: StarLike[], discoveredPlanets?: PlanetLike[] | null, discoveredNebulae?: NebulaLike[] | null, discoveredWormholes?: WormholeLike[] | null, discoveredAsteroidGardens?: AsteroidGardenLike[] | null, discoveredBlackHoles?: BlackHoleLike[] | null, discoveredComets?: CometLike[] | null, discoveredRoguePlanets?: any[] | null, discoveredDarkNebulae?: any[] | null, discoveredCrystalGardens?: any[] | null, discoveredProtostars?: any[] | null): void {
        if (!this.visible) return;

        this.interactionController.detectHoverTarget(
            mouseX,
            mouseY,
            canvas,
            discoveredStars,
            this.zoomLevel,
            discoveredPlanets,
            discoveredNebulae,
            discoveredWormholes,
            discoveredAsteroidGardens,
            discoveredBlackHoles,
            discoveredComets,
            discoveredRoguePlanets,
            discoveredDarkNebulae,
            discoveredCrystalGardens,
            discoveredProtostars
        );
        this.updateCursor(canvas);
    }


    updateCursor(canvas: HTMLCanvasElement): void {
        this.interactionController.updateCursor(canvas, this.visible);
    }
    
    getMapBounds(canvas: HTMLCanvasElement): { mapX: number; mapY: number; mapWidth: number; mapHeight: number; } {
        // Responsive sizing logic from render method
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

    setNamingService(namingService: NamingService): void {
        this.namingService = namingService;
        this.starRenderer.setNamingService(namingService);
        this.nebulaRenderer.setNamingService(namingService);
        this.wormholeRenderer.setNamingService(namingService);
        this.asteroidRenderer.setNamingService(namingService);
        this.regionObjectRenderer.setNamingService(namingService);
        this.infoPanelRenderer.setNamingService(namingService);
    }
    
    setChunkManager(chunkManager: ChunkManager): void {
        this.chunkManager = chunkManager;
    }
    
    // Enable following player position
    enableFollowPlayer(camera: Camera): void {
        this.interactionController.enableFollowPlayer(camera);
    }

    // Check if currently following player
    isFollowingPlayer(): boolean {
        return this.interactionController.isFollowingPlayer();
    }

    // Check if currently panning
    isCurrentlyPanning(): boolean {
        return this.interactionController.isCurrentlyPanning();
    }

    zoomIn(): void {
        this.interactionController.zoomIn(this.inspectorMode, this.inspectorZoomExtended);
    }

    zoomOut(): void {
        this.interactionController.zoomOut(this.inspectorMode, this.inspectorZoomExtended);
    }

    render(renderer: Renderer, camera: Camera, discoveredStars: StarLike[], gameStartingPosition?: GameStartingPosition | null, discoveredPlanets?: PlanetLike[] | null, discoveredNebulae?: NebulaLike[] | null, discoveredWormholes?: WormholeLike[] | null, discoveredAsteroidGardens?: AsteroidGardenLike[] | null, discoveredBlackHoles?: BlackHoleLike[] | null, discoveredComets?: CometLike[] | null, discoveredRoguePlanets?: any[] | null, discoveredDarkNebulae?: any[] | null, discoveredCrystalGardens?: any[] | null, discoveredProtostars?: any[] | null): void {
        if (!this.visible) return;

        const { canvas, ctx } = renderer;
        
        // Save current context state
        ctx.save();
        
        // Draw semi-transparent background overlay
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Set up coordinate system for map - responsive sizing
        let mapWidthRatio = 0.8;
        let mapHeightRatio = 0.8;
        let marginRatio = 0.1;
        
        // Adjust for mobile devices (smaller screens need more space)
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (isTouchDevice) {
            mapWidthRatio = 0.95; // Use more screen space on mobile
            mapHeightRatio = 0.85; // Account for touch UI buttons
            marginRatio = 0.025;
        }
        
        const mapWidth = canvas.width * mapWidthRatio;
        const mapHeight = canvas.height * mapHeightRatio;
        const mapX = canvas.width * marginRatio;
        const mapY = canvas.height * marginRatio;
        
        // Calculate world-to-map coordinate conversion
        const worldToMapScale = Math.min(mapWidth, mapHeight) / (this.gridSize * 4 / this.zoomLevel);
        
        // Draw subtle map border
        ctx.strokeStyle = this.gridColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(mapX, mapY, mapWidth, mapHeight);
        
        // Draw coordinate grid
        this.renderGrid(ctx, mapX, mapY, mapWidth, mapHeight, worldToMapScale);
        
        // Cosmic regions display disabled
        
        // Draw discovered objects (conditionally in inspector mode)
        if (!this.inspectorMode || this.showDiscoveredObjects) {
            // Draw discovered stars
            this.renderDiscoveredStars(ctx, mapX, mapY, mapWidth, mapHeight, worldToMapScale, discoveredStars);
            
            // Draw discovered planets (only in detail view)
            if (this.zoomLevel > 3.0 && discoveredPlanets) {
                this.renderDiscoveredPlanets(ctx, mapX, mapY, mapWidth, mapHeight, worldToMapScale, discoveredPlanets);
            }

            // Draw discovered nebulae (larger scale objects, visible at all zoom levels)
            if (discoveredNebulae && discoveredNebulae.length > 0) {
                this.renderDiscoveredNebulae(ctx, mapX, mapY, mapWidth, mapHeight, worldToMapScale, discoveredNebulae);
            }

            // Draw discovered wormholes (ultra-rare spacetime anomalies with pair connections)
            if (discoveredWormholes && discoveredWormholes.length > 0) {
                this.renderDiscoveredWormholes(ctx, mapX, mapY, mapWidth, mapHeight, worldToMapScale, discoveredWormholes);
            }

            // Draw discovered asteroid gardens (scattered rock fields, visible at most zoom levels)
            if (discoveredAsteroidGardens && discoveredAsteroidGardens.length > 0) {
                this.renderDiscoveredAsteroidGardens(ctx, mapX, mapY, mapWidth, mapHeight, worldToMapScale, discoveredAsteroidGardens);
            }

            // Draw discovered black holes (gravitational anomalies with accretion discs)
            if (discoveredBlackHoles && discoveredBlackHoles.length > 0) {
                this.renderDiscoveredBlackHoles(ctx, mapX, mapY, mapWidth, mapHeight, worldToMapScale, discoveredBlackHoles);
            }

            // Draw discovered comets (elliptical orbital objects with visible tails)
            if (discoveredComets && discoveredComets.length > 0) {
                this.renderDiscoveredComets(ctx, mapX, mapY, mapWidth, mapHeight, worldToMapScale, discoveredComets);
            }

            // Draw discovered rogue planets (wandering worlds between stars)
            if (discoveredRoguePlanets && discoveredRoguePlanets.length > 0) {
                this.renderDiscoveredRoguePlanets(ctx, mapX, mapY, mapWidth, mapHeight, worldToMapScale, discoveredRoguePlanets);
            }

            // Draw discovered dark nebulae (void region objects that occlude stars)
            if (discoveredDarkNebulae && discoveredDarkNebulae.length > 0) {
                this.renderDiscoveredDarkNebulae(ctx, mapX, mapY, mapWidth, mapHeight, worldToMapScale, discoveredDarkNebulae);
            }

            // Draw discovered crystal gardens
            if (discoveredCrystalGardens && discoveredCrystalGardens.length > 0) {
                this.renderDiscoveredCrystalGardens(ctx, mapX, mapY, mapWidth, mapHeight, worldToMapScale, discoveredCrystalGardens);
            }

            // Draw discovered protostars
            if (discoveredProtostars && discoveredProtostars.length > 0) {
                this.renderDiscoveredProtostars(ctx, mapX, mapY, mapWidth, mapHeight, worldToMapScale, discoveredProtostars);
            }
        }

        // Draw inspector mode objects (all objects for seed analysis)
        if (this.inspectorMode) {
            this.renderInspectorObjects(ctx, mapX, mapY, mapWidth, mapHeight, worldToMapScale);
        }
        
        // Draw statistics overlay
        if (this.statisticsOverlayEnabled && this.inspectorMode) {
            this.renderStatisticsOverlay(ctx, mapX, mapY, mapWidth, mapHeight);
        }

        // Draw discovery overlay effects (pulses, timestamps)
        if (!this.inspectorMode || this.showDiscoveredObjects) {
            const renderContext = {
                ctx,
                mapX,
                mapY,
                mapWidth,
                mapHeight,
                worldToMapScale,
                centerX: this.centerX,
                centerY: this.centerY
            };

            // Render discovery pulses for all object types
            if (discoveredStars) {
                this.discoveryOverlay.renderDiscoveryPulses(renderContext, discoveredStars, 'celestialStar');
            }
            if (discoveredPlanets && this.zoomLevel > 3.0) {
                this.discoveryOverlay.renderDiscoveryPulses(renderContext, discoveredPlanets, 'planet');
            }
            if (discoveredNebulae) {
                this.discoveryOverlay.renderDiscoveryPulses(renderContext, discoveredNebulae, 'nebula');
            }
            if (discoveredWormholes) {
                this.discoveryOverlay.renderDiscoveryPulses(renderContext, discoveredWormholes, 'wormhole');
            }
            if (discoveredAsteroidGardens) {
                this.discoveryOverlay.renderDiscoveryPulses(renderContext, discoveredAsteroidGardens, 'asteroidGarden');
            }
            if (discoveredBlackHoles) {
                this.discoveryOverlay.renderDiscoveryPulses(renderContext, discoveredBlackHoles, 'black-hole');
            }
            if (discoveredComets) {
                this.discoveryOverlay.renderDiscoveryPulses(renderContext, discoveredComets, 'comet');
            }
            if (discoveredRoguePlanets) {
                this.discoveryOverlay.renderDiscoveryPulses(renderContext, discoveredRoguePlanets, 'rogue-planet');
            }
            if (discoveredDarkNebulae) {
                this.discoveryOverlay.renderDiscoveryPulses(renderContext, discoveredDarkNebulae, 'dark-nebula');
            }
            if (discoveredCrystalGardens) {
                this.discoveryOverlay.renderDiscoveryPulses(renderContext, discoveredCrystalGardens, 'crystal-garden');
            }
            if (discoveredProtostars) {
                this.discoveryOverlay.renderDiscoveryPulses(renderContext, discoveredProtostars, 'protostar');
            }

            // Render timestamps if enabled
            if (this.discoveryOverlay.showTimestamps) {
                const allObjects = [
                    ...(discoveredStars || []),
                    ...(discoveredPlanets || []),
                    ...(discoveredNebulae || []),
                    ...(discoveredWormholes || []),
                    ...(discoveredAsteroidGardens || []),
                    ...(discoveredBlackHoles || []),
                    ...(discoveredComets || []),
                    ...(discoveredRoguePlanets || []),
                    ...(discoveredDarkNebulae || []),
                    ...(discoveredCrystalGardens || []),
                    ...(discoveredProtostars || [])
                ];
                this.discoveryOverlay.renderTimestamps(renderContext, allObjects);
            }

            // Render coordinate sharing UI for selected object
            const selectedObject = this.selectedStar || this.selectedPlanet || this.selectedNebula ||
                                   this.selectedWormhole || this.selectedBlackHole || this.selectedComet ||
                                   this.selectedAsteroidGarden || this.selectedRoguePlanet ||
                                   this.selectedDarkNebula || this.selectedCrystalGarden || this.selectedProtostar;
            if (selectedObject && this.discoveryOverlay.coordinateShareEnabled) {
                this.discoveryOverlay.renderCoordinateShareUI(renderContext, selectedObject);
            }
        }

        // Draw origin (0,0) marker
        this.renderOriginMarker(ctx, mapX, mapY, mapWidth, mapHeight, worldToMapScale);
        
        // Draw starting position marker (only if different from origin)
        if (gameStartingPosition) {
            this.renderStartingPositionMarker(ctx, mapX, mapY, mapWidth, mapHeight, worldToMapScale, gameStartingPosition);
        }
        
        // Draw current position marker
        this.renderCurrentPosition(ctx, mapX, mapY, mapWidth, mapHeight, worldToMapScale, camera);
        
        // Draw map UI
        this.renderMapUI(ctx, canvas);
        
        // Note: Individual objects handle their own hover visual effects
        
        // Restore context state
        ctx.restore();
    }

    renderGrid(ctx: CanvasRenderingContext2D, mapX: number, mapY: number, mapWidth: number, mapHeight: number, scale: number): void {
        this.gridRenderer.renderGrid(ctx, mapX, mapY, mapWidth, mapHeight, scale, this.zoomLevel, this.centerX, this.centerY);
    }

    renderDiscoveredStars(ctx: CanvasRenderingContext2D, mapX: number, mapY: number, mapWidth: number, mapHeight: number, scale: number, discoveredStars: StarLike[]): void {
        // Delegate to StarRenderer
        const context = {
            ctx,
            mapX,
            mapY,
            mapWidth,
            mapHeight,
            worldToMapScale: scale,
            centerX: this.centerX,
            centerY: this.centerY
        };

        this.starRenderer.renderDiscoveredStars(
            context,
            discoveredStars,
            this.zoomLevel,
            this.selectedStar,
            this.hoveredStar,
            this.currentPositionColor
        );
    }

    calculateCometSize(): number {
        // Comets should be similar size to planets - small celestial objects
        // Match the planet size range of ~1.2-2.6 pixels
        const baseSize = 1.5; // Same base as planets
        
        if (this.zoomLevel <= 0.2) {
            // Galactic/Sector View: minimal size
            return Math.max(1, baseSize * 0.8); // ~1.2
        } else if (this.zoomLevel <= 1.0) {
            // Regional View: small but visible  
            return Math.max(1, baseSize * 1.0); // ~1.5
        } else {
            // Local/Detail View: cap at planet size range
            return Math.max(1.5, Math.min(2.6, baseSize * (0.8 + this.zoomLevel * 0.3))); // Range: 1.5-2.6
        }
    }

    renderDiscoveredPlanets(ctx: CanvasRenderingContext2D, mapX: number, mapY: number, mapWidth: number, mapHeight: number, scale: number, discoveredPlanets: PlanetLike[]): void {
        // Delegate to PlanetRenderer
        const context = {
            ctx,
            mapX,
            mapY,
            mapWidth,
            mapHeight,
            worldToMapScale: scale,
            centerX: this.centerX,
            centerY: this.centerY
        };

        this.planetRenderer.renderDiscoveredPlanets(
            context,
            discoveredPlanets,
            this.selectedPlanet,
            this.hoveredPlanet,
            this.currentPositionColor
        );
    }

    renderDiscoveredNebulae(ctx: CanvasRenderingContext2D, mapX: number, mapY: number, mapWidth: number, mapHeight: number, scale: number, discoveredNebulae: NebulaLike[]): void {
        const context = {
            ctx,
            mapX,
            mapY,
            mapWidth,
            mapHeight,
            worldToMapScale: scale,
            centerX: this.centerX,
            centerY: this.centerY
        };

        this.nebulaRenderer.renderDiscoveredNebulae(
            context,
            discoveredNebulae,
            this.selectedNebula,
            this.hoveredNebula,
            this.currentPositionColor,
            this.zoomLevel
        );
    }

    renderDiscoveredWormholes(ctx: CanvasRenderingContext2D, mapX: number, mapY: number, mapWidth: number, mapHeight: number, scale: number, discoveredWormholes: WormholeLike[]): void {
        const context = {
            ctx,
            mapX,
            mapY,
            mapWidth,
            mapHeight,
            worldToMapScale: scale,
            centerX: this.centerX,
            centerY: this.centerY
        };

        this.wormholeRenderer.renderDiscoveredWormholes(
            context,
            discoveredWormholes,
            this.selectedWormhole,
            this.hoveredWormhole,
            this.currentPositionColor,
            this.zoomLevel
        );
    }

    renderDiscoveredAsteroidGardens(ctx: CanvasRenderingContext2D, mapX: number, mapY: number, mapWidth: number, mapHeight: number, scale: number, discoveredAsteroidGardens: AsteroidGardenLike[]): void {
        const context = {
            ctx,
            mapX,
            mapY,
            mapWidth,
            mapHeight,
            worldToMapScale: scale,
            centerX: this.centerX,
            centerY: this.centerY
        };

        this.asteroidRenderer.renderDiscoveredAsteroidGardens(
            context,
            discoveredAsteroidGardens,
            this.selectedAsteroidGarden,
            this.hoveredAsteroidGarden,
            this.currentPositionColor,
            this.zoomLevel
        );
    }

    renderDiscoveredRoguePlanets(ctx: CanvasRenderingContext2D, mapX: number, mapY: number, mapWidth: number, mapHeight: number, scale: number, discoveredRoguePlanets: any[]): void {
        const context = { ctx, mapX, mapY, mapWidth, mapHeight, worldToMapScale: scale, centerX: this.centerX, centerY: this.centerY };
        this.regionObjectRenderer.renderDiscoveredRoguePlanets(context, discoveredRoguePlanets, this.zoomLevel);
    }

    renderDiscoveredDarkNebulae(ctx: CanvasRenderingContext2D, mapX: number, mapY: number, mapWidth: number, mapHeight: number, scale: number, discoveredDarkNebulae: any[]): void {
        const context = { ctx, mapX, mapY, mapWidth, mapHeight, worldToMapScale: scale, centerX: this.centerX, centerY: this.centerY };
        this.regionObjectRenderer.renderDiscoveredDarkNebulae(context, discoveredDarkNebulae, this.zoomLevel);
    }

    renderDiscoveredCrystalGardens(ctx: CanvasRenderingContext2D, mapX: number, mapY: number, mapWidth: number, mapHeight: number, scale: number, discoveredCrystalGardens: any[]): void {
        const context = { ctx, mapX, mapY, mapWidth, mapHeight, worldToMapScale: scale, centerX: this.centerX, centerY: this.centerY };
        this.regionObjectRenderer.renderDiscoveredCrystalGardens(context, discoveredCrystalGardens, this.zoomLevel);
    }

    renderDiscoveredProtostars(ctx: CanvasRenderingContext2D, mapX: number, mapY: number, mapWidth: number, mapHeight: number, scale: number, discoveredProtostars: any[]): void {
        const context = { ctx, mapX, mapY, mapWidth, mapHeight, worldToMapScale: scale, centerX: this.centerX, centerY: this.centerY };
        this.regionObjectRenderer.renderDiscoveredProtostars(
            context,
            discoveredProtostars,
            this.selectedProtostar,
            this.hoveredProtostar,
            this.currentPositionColor,
            this.zoomLevel
        );
    }


    renderStartingPositionMarker(ctx: CanvasRenderingContext2D, mapX: number, mapY: number, mapWidth: number, mapHeight: number, scale: number, startingPosition: GameStartingPosition): void{
        this.markerRenderer.renderStartingPositionMarker(ctx, mapX, mapY, mapWidth, mapHeight, scale, this.zoomLevel, this.centerX, this.centerY, startingPosition);
    }

    renderOriginMarker(ctx: CanvasRenderingContext2D, mapX: number, mapY: number, mapWidth: number, mapHeight: number, scale: number): void {
        this.markerRenderer.renderOriginMarker(ctx, mapX, mapY, mapWidth, mapHeight, scale, this.zoomLevel, this.centerX, this.centerY);
    }

    renderCurrentPosition(ctx: CanvasRenderingContext2D, mapX: number, mapY: number, mapWidth: number, mapHeight: number, scale: number, camera: Camera): void {
        this.markerRenderer.renderCurrentPosition(ctx, mapX, mapY, mapWidth, mapHeight, scale, this.centerX, this.centerY, camera);
    }

    renderMapUI(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
        // Render map overlay (title, zoom, coordinates)
        this.mapUIRenderer.renderMapOverlay(ctx, canvas, this.zoomLevel, this.centerX, this.centerY);

        // Information panel for selected star, planet, nebula, wormhole, black hole, or asteroid garden
        if (this.selectedStar && this.namingService) {
            this.infoPanelRenderer.renderStarInfoPanel(ctx, canvas, this.selectedStar);
        } else if (this.selectedPlanet && this.namingService) {
            this.infoPanelRenderer.renderPlanetInfoPanel(ctx, canvas, this.selectedPlanet);
        } else if (this.selectedNebula && this.namingService) {
            this.infoPanelRenderer.renderNebulaInfoPanel(ctx, canvas, this.selectedNebula);
        } else if (this.selectedWormhole && this.namingService) {
            this.infoPanelRenderer.renderWormholeInfoPanel(ctx, canvas, this.selectedWormhole);
        } else if (this.selectedBlackHole && this.namingService) {
            this.infoPanelRenderer.renderBlackHoleInfoPanel(ctx, canvas, this.selectedBlackHole);
        } else if (this.selectedComet && this.namingService) {
            this.infoPanelRenderer.renderCometInfoPanel(ctx, canvas, this.selectedComet);
        } else if (this.selectedAsteroidGarden && this.namingService) {
            this.infoPanelRenderer.renderAsteroidGardenInfoPanel(ctx, canvas, this.selectedAsteroidGarden);
        } else if (this.selectedRoguePlanet && this.namingService) {
            this.infoPanelRenderer.renderRoguePlanetInfoPanel(ctx, canvas, this.selectedRoguePlanet);
        } else if (this.selectedDarkNebula && this.namingService) {
            this.infoPanelRenderer.renderDarkNebulaInfoPanel(ctx, canvas, this.selectedDarkNebula);
        } else if (this.selectedProtostar && this.namingService) {
            this.infoPanelRenderer.renderProtostarInfoPanel(ctx, canvas, this.selectedProtostar);
        } else if (this.selectedCrystalGarden && this.namingService) {
            this.infoPanelRenderer.renderCrystalGardenInfoPanel(ctx, canvas, this.selectedCrystalGarden);
        }
    }

    renderDiscoveredBlackHoles(ctx: CanvasRenderingContext2D, mapX: number, mapY: number, mapWidth: number, mapHeight: number, scale: number, discoveredBlackHoles: BlackHoleLike[]): void {
        const context = {
            ctx,
            mapX,
            mapY,
            mapWidth,
            mapHeight,
            worldToMapScale: scale,
            centerX: this.centerX,
            centerY: this.centerY
        };

        this.blackHoleRenderer.renderDiscoveredBlackHoles(
            context,
            discoveredBlackHoles,
            this.selectedBlackHole,
            this.hoveredBlackHole,
            this.currentPositionColor,
            this.zoomLevel
        );
    }

    renderDiscoveredComets(ctx: CanvasRenderingContext2D, mapX: number, mapY: number, mapWidth: number, mapHeight: number, scale: number, discoveredComets: CometLike[]): void {
        const context = {
            ctx,
            mapX,
            mapY,
            mapWidth,
            mapHeight,
            worldToMapScale: scale,
            centerX: this.centerX,
            centerY: this.centerY
        };

        this.cometRenderer.renderDiscoveredComets(
            context,
            discoveredComets,
            this.selectedComet,
            this.hoveredComet,
            this.currentPositionColor,
            this.zoomLevel
        );
    }

    // === INSPECTOR MODE METHODS ===

    /**
     * Initialize inspector mode with seed inspector service
     */
    initInspectorMode(seedInspectorService: SeedInspectorService): void {
        this.inspectorController.initInspectorMode(seedInspectorService);
    }

    /**
     * Enable inspector mode with a specific seed
     * @param seed - Universe seed to inspect
     */
    async enableInspectorMode(seed: number): Promise<void> {
        await this.inspectorController.enableInspectorMode(seed);

        // Reveal initial area around current position
        const result = await this.inspectorController.revealChunks(seed, this.centerX, this.centerY, 2);
        if (result.newChunks > 0) {
            console.log(`📍 Revealed ${result.newChunks} new chunks (${result.totalChunks} total in area)`);
        } else {
            console.log(`📍 All ${result.totalChunks} chunks in area already revealed`);
        }
    }

    /**
     * Disable inspector mode and return to discovered-only view
     */
    disableInspectorMode(): void {
        this.inspectorController.disableInspectorMode();
    }

    /**
     * Toggle between inspector mode and normal mode
     */
    async toggleInspectorMode(): Promise<void> {
        await this.inspectorController.toggleInspectorMode();
    }

    /**
     * Check if inspector mode is active
     */
    isInspectorMode(): boolean {
        return this.inspectorController.isInspectorMode();
    }

    /**
     * Legacy method - now using persistent revealed chunks system
     * This method is kept for backward compatibility but doesn't perform real-time generation
     */
    private async refreshInspectorData(): Promise<void> {
        // Inspector mode now uses persistent revealed chunks
        // Statistics are updated when chunks are revealed
        if (this.statisticsOverlayEnabled && this.inspectorSeed) {
            await this.inspectorController.updateViewStatistics();
        }
    }

    /**
     * Enable statistics overlay
     */
    enableStatisticsOverlay(): void {
        this.inspectorController.enableStatisticsOverlay();
    }

    /**
     * Disable statistics overlay
     */
    disableStatisticsOverlay(): void {
        this.inspectorController.disableStatisticsOverlay();
    }

    /**
     * Toggle statistics overlay on/off
     */
    toggleStatisticsOverlay(): void {
        this.inspectorController.toggleStatisticsOverlay();
    }

    /**
     * Check if a specific chunk is already revealed
     */
    isChunkRevealed(seed: number, chunkX: number, chunkY: number): boolean {
        return this.inspectorController.isChunkRevealed(seed, chunkX, chunkY);
    }

    /**
     * Clear all revealed chunks for current or specified seed
     */
    clearRevealedChunks(seed?: number): void {
        this.inspectorController.clearRevealedChunks(seed);
    }

    /**
     * Reveal chunks around a center position with specified radius
     */
    async revealChunks(seed: number, centerWorldX: number, centerWorldY: number, chunkRadius: number = 2): Promise<{ newChunks: number; totalChunks: number }> {
        return await this.inspectorController.revealChunks(seed, centerWorldX, centerWorldY, chunkRadius);
    }

    /**
     * Get inspector object color based on type
     */
    getInspectorObjectColor(objectType: string): string {
        return this.inspectorController.getInspectorObjectColor(objectType);
    }

    /**
     * Handle clicks on the statistics overlay for toggling object types
     */
    handleStatisticsOverlayClick(mouseX: number, mouseY: number, canvas: HTMLCanvasElement): boolean {
        if (!this.statisticsOverlayEnabled || !this.currentViewStatistics || !this.visible) {
            return false;
        }

        const { mapX, mapY } = this.getMapBounds(canvas);
        const overlayX = mapX + 15;
        const overlayY = mapY + 15;
        const lineHeight = 14;
        const headerHeight = 35;
        const padding = 12;

        // Check if click is within overlay bounds
        const overlayWidth = 280;
        const objectTypes = Object.keys(this.currentViewStatistics.objectCounts);
        const contentLines = 3 + objectTypes.length;
        const overlayHeight = headerHeight + (contentLines * lineHeight) + padding * 2 + 25;

        if (mouseX < overlayX - padding || mouseX > overlayX + overlayWidth - padding ||
            mouseY < overlayY - padding || mouseY > overlayY + overlayHeight - padding) {
            return false;
        }

        // Calculate which line was clicked (skip header and info lines)
        const contentStartY = overlayY + headerHeight - padding;
        const clickY = mouseY - contentStartY;
        const headerInfoLines = 3; // seed + total + density
        const discoveredToggleIndex = Math.floor((clickY - (headerInfoLines * lineHeight) - 5) / lineHeight);
        
        // Check if discovered objects toggle was clicked
        if (discoveredToggleIndex === 0) {
            this.showDiscoveredObjects = !this.showDiscoveredObjects;
            console.log(`👁️ Discovered Objects: ${this.showDiscoveredObjects ? 'visible' : 'hidden'}`);
            return true;
        }
        
        // Check if object type was clicked (after discovered toggle + spacing)
        const objectTypeIndex = Math.floor((clickY - (headerInfoLines * lineHeight) - 5 - (lineHeight + 3)) / lineHeight);
        
        if (objectTypeIndex >= 0 && objectTypeIndex < objectTypes.length) {
            const objectType = objectTypes[objectTypeIndex];
            this.objectTypeVisibility[objectType] = !this.objectTypeVisibility[objectType];
            
            const visible = this.objectTypeVisibility[objectType];
            console.log(`👁️ ${objectType}: ${visible ? 'visible' : 'hidden'}`);
            return true;
        }

        return false;
    }

    /**
     * Handle hover over statistics overlay for visual feedback
     */
    updateStatisticsOverlayHover(mouseX: number, mouseY: number, canvas: HTMLCanvasElement): void {
        if (!this.statisticsOverlayEnabled || !this.currentViewStatistics || !this.visible) {
            this.hoveredObjectTypeIndex = -1;
            return;
        }

        const { mapX, mapY } = this.getMapBounds(canvas);
        const overlayX = mapX + 15;
        const overlayY = mapY + 15;
        const lineHeight = 14;
        const headerHeight = 35;
        const padding = 12;

        // Check if mouse is within overlay bounds
        const overlayWidth = 280;
        const objectTypes = Object.keys(this.currentViewStatistics.objectCounts);
        const contentLines = 3 + objectTypes.length;
        const overlayHeight = headerHeight + (contentLines * lineHeight) + padding * 2 + 25;

        if (mouseX < overlayX - padding || mouseX > overlayX + overlayWidth - padding ||
            mouseY < overlayY - padding || mouseY > overlayY + overlayHeight - padding) {
            this.hoveredObjectTypeIndex = -1;
            return;
        }

        // Calculate which line is being hovered (skip header and info lines)
        const contentStartY = overlayY + headerHeight - padding;
        const clickY = mouseY - contentStartY;
        const headerInfoLines = 3; // seed + total + density
        const discoveredToggleIndex = Math.floor((clickY - (headerInfoLines * lineHeight) - 5) / lineHeight);
        
        // Check if hovering over discovered objects toggle
        if (discoveredToggleIndex === 0) {
            this.hoveredObjectTypeIndex = -2; // Special index for discovered objects
        } else {
            // Check if hovering over object type (after discovered toggle + spacing)
            const objectTypeIndex = Math.floor((clickY - (headerInfoLines * lineHeight) - 5 - (lineHeight + 3)) / lineHeight);
            
            if (objectTypeIndex >= 0 && objectTypeIndex < objectTypes.length) {
                this.hoveredObjectTypeIndex = objectTypeIndex;
            } else {
                this.hoveredObjectTypeIndex = -1;
            }
        }
    }


    /**
     * Render inspector mode objects (all objects, not just discovered)
     */
    private renderInspectorObjects(ctx: CanvasRenderingContext2D, mapX: number, mapY: number, mapWidth: number, mapHeight: number, scale: number): void {
        if (!this.inspectorMode || this.inspectorObjects.length === 0) return;

        ctx.save();

        // Pre-filter objects for performance (avoid iterating through millions of background stars)
        const viewportWorldLeft = this.centerX - (mapWidth / scale) / 2;
        const viewportWorldRight = this.centerX + (mapWidth / scale) / 2;
        const viewportWorldTop = this.centerY - (mapHeight / scale) / 2;
        const viewportWorldBottom = this.centerY + (mapHeight / scale) / 2;
        
        
        const filteredObjects: typeof this.inspectorObjects = [];
        
        // Pre-filter to reduce loop size dramatically
        for (const obj of this.inspectorObjects) {
            // Skip objects that are toggled off
            if (!this.objectTypeVisibility[obj.type]) {
                continue;
            }
            
            
            // Viewport culling in world space  
            const buffer = 40 / scale; // Standard buffer for all discoverable objects
            if (obj.x < viewportWorldLeft - buffer || obj.x > viewportWorldRight + buffer ||
                obj.y < viewportWorldTop - buffer || obj.y > viewportWorldBottom + buffer) {
                continue;
            }
            
            filteredObjects.push(obj);
        }
        
        // Now render the much smaller filtered set
        for (const obj of filteredObjects) {
            const objMapX = mapX + ((obj.x - this.centerX) * scale) + mapWidth / 2;
            const objMapY = mapY + ((obj.y - this.centerY) * scale) + mapHeight / 2;

            const color = this.inspectorController.getInspectorObjectColor(obj.type);
            
            // Render discoverable objects with appropriate symbols
            const size = obj.type === 'blackhole' ? 4 : 
                       obj.type === 'celestialStar' ? 3 : 2;
                
            // Different shapes for different object types
            if (obj.type === 'wormhole') {
                    // Diamond shape for wormholes
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(objMapX, objMapY - size);
                    ctx.lineTo(objMapX + size, objMapY);
                    ctx.lineTo(objMapX, objMapY + size);
                    ctx.lineTo(objMapX - size, objMapY);
                    ctx.closePath();
                    ctx.stroke();
                } else if (obj.type === 'nebula') {
                    // Larger circle with dashed border for nebulae
                    ctx.strokeStyle = color + '60';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([2, 2]);
                    ctx.beginPath();
                    ctx.arc(objMapX, objMapY, size * 2, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                } else if (obj.type === 'dark-nebula') {
                    // Dark filled circle with thick border for dark nebulae
                    ctx.fillStyle = color + 'CC'; // Darker fill
                    ctx.beginPath();
                    ctx.arc(objMapX, objMapY, size * 2.5, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Thick border to make them visible
                    ctx.strokeStyle = color + 'FF';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                } else {
                    // Filled circles for other objects
                    ctx.fillStyle = color + '90'; // Semi-transparent
                    ctx.beginPath();
                    ctx.arc(objMapX, objMapY, size, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Add border for better visibility
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
        }

        ctx.restore();
    }

    /**
     * Render statistics overlay showing object counts, density, and region info
     */
    private renderStatisticsOverlay(ctx: CanvasRenderingContext2D, mapX: number, mapY: number, mapWidth: number, mapHeight: number): void {
        if (!this.statisticsOverlayEnabled || !this.currentViewStatistics) return;

        ctx.save();

        // Position overlay in top-left corner with padding
        const overlayX = mapX + 15;
        const overlayY = mapY + 15;
        const lineHeight = 14;
        const headerHeight = 35;
        const padding = 12;

        // Calculate overlay dimensions
        const stats = this.currentViewStatistics;
        const objectTypes = Object.keys(stats.objectCounts);
        const contentLines = 3 + 1 + objectTypes.length; // seed + total + density + discovered toggle + object counts
        const overlayHeight = headerHeight + (contentLines * lineHeight) + padding * 2 + 25; // +25 for instruction text
        const overlayWidth = 280;

        // Draw main background (matching logbook style)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(overlayX - padding, overlayY - padding, overlayWidth, overlayHeight);

        // Draw border (matching logbook style)
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 1;
        ctx.strokeRect(overlayX - padding, overlayY - padding, overlayWidth, overlayHeight);

        // Header background (matching logbook style)
        ctx.fillStyle = 'rgba(136, 136, 136, 0.25)'; // #888888 + 40 (semi-transparent)
        ctx.fillRect(overlayX - padding, overlayY - padding, overlayWidth, headerHeight);

        // Header text (centered, no emoji, proper case like logbook)
        ctx.font = '14px "Courier New", monospace';
        ctx.fillStyle = '#ffdd88';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('Seed Analysis', overlayX + overlayWidth/2 - padding, overlayY - 2);

        // Content area
        ctx.textAlign = 'left';
        ctx.fillStyle = '#cccccc';
        ctx.font = '11px "Courier New", monospace';
        let currentY = overlayY + headerHeight - padding;

        // Seed information
        ctx.fillText(`Seed: ${this.inspectorSeed || 'Unknown'}`, overlayX, currentY);
        currentY += lineHeight;

        // Total objects and density
        ctx.fillText(`Total Objects: ${stats.totalObjects}`, overlayX, currentY);
        currentY += lineHeight;
        ctx.fillText(`Density: ${stats.density.toFixed(2)}/M units²`, overlayX, currentY);
        currentY += lineHeight + 5;

        // Discovered objects toggle
        const discoveredHovered = this.hoveredObjectTypeIndex === -2; // Use -2 for discovered objects toggle
        let discoveredBgColor = 'rgba(255, 255, 255, 0.03)';
        if (discoveredHovered) {
            discoveredBgColor = 'rgba(255, 221, 136, 0.2)';
        } else if (this.showDiscoveredObjects) {
            discoveredBgColor = 'rgba(255, 255, 255, 0.08)';
        } else {
            discoveredBgColor = 'rgba(128, 128, 128, 0.15)';
        }
        
        ctx.fillStyle = discoveredBgColor;
        ctx.fillRect(overlayX - 8, currentY - 2, overlayWidth - 8, lineHeight);
        
        // Draw discovered objects toggle
        if (this.showDiscoveredObjects) {
            ctx.fillStyle = '#88dd88'; // Green for active
            ctx.fillText('● Discovered Objects', overlayX, currentY);
        } else {
            ctx.fillStyle = '#666666';
            ctx.fillText('○ Discovered Objects (hidden)', overlayX, currentY);
        }
        currentY += lineHeight + 3;

        // Object counts by type (clickable toggles)
        const renderObjectTypes = Object.keys(stats.objectCounts);
        for (let i = 0; i < renderObjectTypes.length; i++) {
            const type = renderObjectTypes[i];
            const count = stats.objectCounts[type];
            const isVisible = this.objectTypeVisibility[type];
            const isHovered = this.hoveredObjectTypeIndex === i;
            const color = this.inspectorController.getInspectorObjectColor(type);
            
            // Draw clickable background with hover effect
            let bgColor = 'rgba(255, 255, 255, 0.03)'; // Default subtle background
            if (isHovered) {
                bgColor = 'rgba(255, 221, 136, 0.2)'; // Hover effect (matching header color)
            } else if (isVisible) {
                bgColor = 'rgba(255, 255, 255, 0.08)';
            } else {
                bgColor = 'rgba(128, 128, 128, 0.15)';
            }
            
            ctx.fillStyle = bgColor;
            ctx.fillRect(overlayX - 8, currentY - 2, overlayWidth - 8, lineHeight);
            
            // Draw object type with visual state indicator
            if (isVisible) {
                ctx.fillStyle = color;
                ctx.fillText(`● ${type}: ${count}`, overlayX, currentY);
            } else {
                ctx.fillStyle = '#666666';
                ctx.fillText(`○ ${type}: ${count} (hidden)`, overlayX, currentY);
            }
            currentY += lineHeight;
        }
        
        // Add instruction text
        ctx.fillStyle = '#999999';
        ctx.font = '10px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Click object types to toggle visibility', overlayX + overlayWidth/2 - padding, currentY + 8);

        ctx.restore();
    }
}

// Export for use in other modules (maintain global compatibility)
declare global {
    interface Window {
        StellarMap: typeof StellarMap;
    }
}

if (typeof window !== 'undefined') {
    window.StellarMap = StellarMap;
}