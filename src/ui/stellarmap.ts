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

interface GameStartingPosition {
    x: number;
    y: number;
}

export class StellarMap {
    // Constants for consistent styling
    private static readonly LABEL_FONT_SIZE = 12;
    private static readonly LABEL_FONT_FAMILY = '"Courier New", monospace';
    
    visible: boolean;
    zoomLevel: number;
    centerX: number;
    centerY: number;
    gridSize: number;
    selectedStar: StarLike | null;
    hoveredStar: StarLike | null;
    selectedPlanet: PlanetLike | null;
    hoveredPlanet: PlanetLike | null;
    selectedNebula: NebulaLike | null;
    hoveredNebula: NebulaLike | null;
    selectedWormhole: WormholeLike | null;
    hoveredWormhole: WormholeLike | null;
    selectedAsteroidGarden: AsteroidGardenLike | null;
    hoveredAsteroidGarden: AsteroidGardenLike | null;
    selectedBlackHole: BlackHoleLike | null;
    hoveredBlackHole: BlackHoleLike | null;
    selectedComet: CometLike | null;
    hoveredComet: CometLike | null;
    selectedRoguePlanet: any | null;
    hoveredRoguePlanet: any | null;
    selectedDarkNebula: any | null;
    hoveredDarkNebula: any | null;
    selectedCrystalGarden: any | null;
    selectedProtostar: any | null;
    hoveredProtostar: any | null;
    hoveredCrystalGarden: any | null;
    namingService: NamingService | null;
    
    // Interactive panning state
    followPlayer: boolean;
    isPanning: boolean;
    panStartX: number;
    panStartY: number;
    panStartMapX: number;
    panStartMapY: number;
    lastMouseX: number;
    lastMouseY: number;
    
    // Visual settings for subtle space aesthetic
    backgroundColor: string;
    gridColor: string;
    currentPositionColor: string;
    starColors: Record<string, string>;
    
    // Inspector mode properties
    inspectorMode: boolean;
    inspectorSeed: number | null;
    inspectorService: SeedInspectorService | null;
    inspectorObjects: CelestialObjectData[];
    inspectorZoomExtended: boolean; // Whether extended zoom is enabled
    
    // Statistics overlay properties
    statisticsOverlayEnabled: boolean;
    currentViewStatistics: {
        objectCounts: Record<string, number>;
        totalObjects: number;
        density: number;
        regionArea: number;
    } | null;
    objectTypeVisibility: Record<string, boolean>;
    hoveredObjectTypeIndex: number;
    showDiscoveredObjects: boolean;
    
    // Centralized hover system
    private hoverSystem: StellarMapHoverSystem;

    // Renderers
    private starRenderer: StarRenderer;
    private planetRenderer: PlanetRenderer;
    private nebulaRenderer: NebulaRenderer;
    private wormholeRenderer: WormholeRenderer;
    private blackHoleRenderer: BlackHoleRenderer;
    private cometRenderer: CometRenderer;
    private asteroidRenderer: AsteroidRenderer;
    private regionObjectRenderer: RegionObjectRenderer;

    // Persistent revealed areas system
    revealedChunks: Map<string, CelestialObjectData[]>;
    revealedChunksMetadata: Map<string, { timestamp: number; seed: number; chunkX: number; chunkY: number }>;

    // Chunk Manager for region information
    chunkManager: ChunkManager | null;

    constructor() {
        this.visible = false;
        this.zoomLevel = 1.0; // 1.0 = normal view, >1.0 = zoomed in
        this.centerX = 0; // Map center coordinates
        this.centerY = 0;
        this.gridSize = 2000; // Grid spacing in world units
        this.selectedStar = null;
        this.hoveredStar = null;
        this.selectedPlanet = null;
        this.hoveredPlanet = null;
        this.selectedNebula = null;
        this.hoveredNebula = null;
        this.selectedWormhole = null;
        this.hoveredWormhole = null;
        this.selectedAsteroidGarden = null;
        this.hoveredAsteroidGarden = null;
        this.selectedBlackHole = null;
        this.hoveredBlackHole = null;
        this.selectedComet = null;
        this.hoveredComet = null;
        this.selectedRoguePlanet = null;
        this.hoveredRoguePlanet = null;
        this.selectedDarkNebula = null;
        this.hoveredDarkNebula = null;
        this.selectedCrystalGarden = null;
        this.selectedProtostar = null;
        this.hoveredProtostar = null;
        this.hoveredCrystalGarden = null;
        this.namingService = null; // Will be injected
        
        // Initialize centralized hover system
        this.hoverSystem = new StellarMapHoverSystem();
        
        // Interactive panning state
        this.followPlayer = true; // Whether map should follow player position
        this.isPanning = false; // Currently dragging to pan
        this.panStartX = 0; // Start position for pan gesture
        this.panStartY = 0;
        this.panStartMapX = 0; // Map center when pan started
        this.panStartMapY = 0;
        this.lastMouseX = 0; // For drag detection
        this.lastMouseY = 0;
        
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
        
        // Initialize inspector mode properties
        this.inspectorMode = false;
        this.inspectorSeed = null;
        this.inspectorService = null;
        this.inspectorObjects = [];
        this.inspectorZoomExtended = false;
        
        // Initialize statistics overlay properties
        this.statisticsOverlayEnabled = false;
        this.currentViewStatistics = null;
        this.objectTypeVisibility = {
            'celestialStar': true,
            'planet': true,
            'moon': true,
            'nebula': true,
            'asteroidGarden': true,
            'wormhole': true,
            'blackhole': true,
            'comet': true,
            'rogue-planet': true,
            'dark-nebula': true,
            'crystal-garden': true,
            'protostar': true
        };
        this.hoveredObjectTypeIndex = -1;
        this.showDiscoveredObjects = true;
        
        // Initialize persistent revealed areas system
        this.revealedChunks = new Map();
        this.revealedChunksMetadata = new Map();

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

    centerOnPosition(x: number, y: number): void {
        this.centerX = x;
        this.centerY = y;
        
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
        // Always check for hover state when map is visible
        if (this.visible) {
            this.updateHoverState(mouseX, mouseY, canvas);
        }
        
        if (!this.visible || !input.isMousePressed() || input.isRightPressed()) {
            return false;
        }
        
        // Initialize tracking if we haven't started
        if (this.lastMouseX === 0 && this.lastMouseY === 0) {
            const { mapX, mapY, mapWidth, mapHeight } = this.getMapBounds(canvas);
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
        
        // Always consume input when handling mouse movement over stellar map (like settings menu does)
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
                const { mapWidth, mapHeight } = this.getMapBounds(canvas);
                const worldToMapScale = Math.min(mapWidth, mapHeight) / (this.gridSize * 4 / this.zoomLevel);
                
                // Simple 1:1 conversion with zoom scaling - no multiplication factor
                this.centerX -= deltaX / worldToMapScale;
                this.centerY -= deltaY / worldToMapScale;
            }
            
            // Always update last position
            this.lastMouseX = mouseX;
            this.lastMouseY = mouseY;
        }
        
        return true; // Always consume input when handling stellar map mouse movement
        
        return false;
    }
    
    // Reset panning state when mouse is released
    resetPanState(): void {
        this.isPanning = false;
        // Reset mouse positions so next drag starts fresh
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.panStartX = 0;
        this.panStartY = 0;
    }
    
    handleStarSelection(mouseX: number, mouseY: number, discoveredStars: StarLike[], canvas: HTMLCanvasElement, discoveredPlanets?: PlanetLike[] | null, discoveredNebulae?: NebulaLike[] | null, discoveredWormholes?: WormholeLike[] | null, discoveredAsteroidGardens?: AsteroidGardenLike[] | null, discoveredBlackHoles?: BlackHoleLike[] | null, discoveredComets?: CometLike[] | null, discoveredRoguePlanets?: any[] | null, discoveredDarkNebulae?: any[] | null, discoveredCrystalGardens?: any[] | null, discoveredProtostars?: any[] | null, input?: Input): boolean {
        if (!discoveredStars) return false;
        
        // Calculate map bounds
        const { mapX, mapY, mapWidth, mapHeight } = this.getMapBounds(canvas);
        const worldToMapScale = Math.min(mapWidth, mapHeight) / (this.gridSize * 4 / this.zoomLevel);
        
        // Check if click is within map bounds
        if (mouseX < mapX || mouseX > mapX + mapWidth || mouseY < mapY || mouseY > mapY + mapHeight) {
            this.selectedStar = null;
            this.selectedPlanet = null;
            this.selectedNebula = null;
            this.selectedWormhole = null;
            this.selectedAsteroidGarden = null;
            this.selectedBlackHole = null;
            this.selectedComet = null;
            this.selectedRoguePlanet = null;
            return false;
        }
        
        // Find closest celestial object to click position (prioritize planets if in detail view)
        let closestStar: StarLike | null = null;
        let closestPlanet: PlanetLike | null = null;
        let closestNebula: NebulaLike | null = null;
        let closestAsteroidGarden: AsteroidGardenLike | null = null;
        let closestStarDistance = Infinity;
        let closestPlanetDistance = Infinity;
        let closestNebulaDistance = Infinity;
        let closestAsteroidGardenDistance = Infinity;
        const clickThreshold = 10; // pixels
        
        // Check for planet clicks first (in detail view)
        if (this.zoomLevel > 3.0 && discoveredPlanets) {
            for (const planet of discoveredPlanets) {
                // Skip planets without position data
                if (planet.x === null || planet.y === null) continue;
                
                const planetMapX = mapX + mapWidth/2 + (planet.x - this.centerX) * worldToMapScale;
                const planetMapY = mapY + mapHeight/2 + (planet.y - this.centerY) * worldToMapScale;
                
                // Check if planet is within map bounds and click threshold
                if (planetMapX >= mapX && planetMapX <= mapX + mapWidth && 
                    planetMapY >= mapY && planetMapY <= mapY + mapHeight) {
                    
                    const distance = Math.sqrt((mouseX - planetMapX)**2 + (mouseY - planetMapY)**2);
                    if (distance <= clickThreshold && distance < closestPlanetDistance) {
                        closestPlanet = planet;
                        closestPlanetDistance = distance;
                    }
                }
            }
        }
        
        // Check for star clicks
        for (const star of discoveredStars) {
            const starMapX = mapX + mapWidth/2 + (star.x - this.centerX) * worldToMapScale;
            const starMapY = mapY + mapHeight/2 + (star.y - this.centerY) * worldToMapScale;
            
            // Check if star is within map bounds and click threshold
            if (starMapX >= mapX && starMapX <= mapX + mapWidth && 
                starMapY >= mapY && starMapY <= mapY + mapHeight) {
                
                const distance = Math.sqrt((mouseX - starMapX)**2 + (mouseY - starMapY)**2);
                if (distance <= clickThreshold && distance < closestStarDistance) {
                    closestStar = star;
                    closestStarDistance = distance;
                }
            }
        }
        
        // Check for nebula clicks (visible at all zoom levels)
        if (discoveredNebulae) {
            for (const nebula of discoveredNebulae) {
                // Skip nebulae without position data
                if (nebula.x === null || nebula.y === null) continue;
                
                const nebulaMapX = mapX + mapWidth/2 + (nebula.x - this.centerX) * worldToMapScale;
                const nebulaMapY = mapY + mapHeight/2 + (nebula.y - this.centerY) * worldToMapScale;
                
                // Check if nebula is within map bounds and click threshold
                // Use larger threshold for nebulae since they're rendered as larger clouds
                const nebulaClickThreshold = Math.max(15, clickThreshold);
                if (nebulaMapX >= mapX && nebulaMapX <= mapX + mapWidth && 
                    nebulaMapY >= mapY && nebulaMapY <= mapY + mapHeight) {
                    
                    const distance = Math.sqrt((mouseX - nebulaMapX)**2 + (mouseY - nebulaMapY)**2);
                    if (distance <= nebulaClickThreshold && distance < closestNebulaDistance) {
                        closestNebula = nebula;
                        closestNebulaDistance = distance;
                    }
                }
            }
        }
        
        // Check for asteroid garden clicks
        if (discoveredAsteroidGardens) {
            for (const asteroidGarden of discoveredAsteroidGardens) {
                const gardenMapX = mapX + mapWidth/2 + (asteroidGarden.x - this.centerX) * worldToMapScale;
                const gardenMapY = mapY + mapHeight/2 + (asteroidGarden.y - this.centerY) * worldToMapScale;
                
                // Use larger click threshold for asteroid gardens since they're spread out
                const gardenClickThreshold = Math.max(20, clickThreshold);
                if (gardenMapX >= mapX && gardenMapX <= mapX + mapWidth && 
                    gardenMapY >= mapY && gardenMapY <= mapY + mapHeight) {
                    
                    const distance = Math.sqrt((mouseX - gardenMapX)**2 + (mouseY - gardenMapY)**2);
                    if (distance <= gardenClickThreshold && distance < closestAsteroidGardenDistance) {
                        closestAsteroidGarden = asteroidGarden;
                        closestAsteroidGardenDistance = distance;
                    }
                }
            }
        }
        
        // Check for wormhole clicks
        let closestWormhole: WormholeLike | null = null;
        let closestWormholeDistance = Infinity;
        
        if (discoveredWormholes) {
            for (const wormhole of discoveredWormholes) {
                const wormholeMapX = mapX + mapWidth/2 + (wormhole.x - this.centerX) * worldToMapScale;
                const wormholeMapY = mapY + mapHeight/2 + (wormhole.y - this.centerY) * worldToMapScale;
                
                // Use larger click threshold for wormholes due to their vortex effect
                const wormholeClickThreshold = Math.max(20, clickThreshold);
                if (wormholeMapX >= mapX && wormholeMapX <= mapX + mapWidth && 
                    wormholeMapY >= mapY && wormholeMapY <= mapY + mapHeight) {
                    
                    const distance = Math.sqrt((mouseX - wormholeMapX)**2 + (mouseY - wormholeMapY)**2);
                    if (distance <= wormholeClickThreshold && distance < closestWormholeDistance) {
                        closestWormhole = wormhole;
                        closestWormholeDistance = distance;
                    }
                }
            }
        }
        
        // Check for black hole clicks
        let closestBlackHole: BlackHoleLike | null = null;
        let closestBlackHoleDistance = Infinity;
        
        if (discoveredBlackHoles) {
            for (const blackHole of discoveredBlackHoles) {
                const blackHoleMapX = mapX + mapWidth/2 + (blackHole.x - this.centerX) * worldToMapScale;
                const blackHoleMapY = mapY + mapHeight/2 + (blackHole.y - this.centerY) * worldToMapScale;
                
                // Use larger click threshold for black holes due to their accretion disc
                const blackHoleClickThreshold = Math.max(25, clickThreshold);
                if (blackHoleMapX >= mapX && blackHoleMapX <= mapX + mapWidth && 
                    blackHoleMapY >= mapY && blackHoleMapY <= mapY + mapHeight) {
                    
                    const distance = Math.sqrt((mouseX - blackHoleMapX)**2 + (mouseY - blackHoleMapY)**2);
                    if (distance <= blackHoleClickThreshold && distance < closestBlackHoleDistance) {
                        closestBlackHole = blackHole;
                        closestBlackHoleDistance = distance;
                    }
                }
            }
        }

        // Check for comet clicks
        let closestComet: CometLike | null = null;
        let closestCometDistance = Infinity;

        if (discoveredComets) {
            for (const comet of discoveredComets) {
                const cometMapX = mapX + mapWidth/2 + (comet.x - this.centerX) * worldToMapScale;
                const cometMapY = mapY + mapHeight/2 + (comet.y - this.centerY) * worldToMapScale;

                // Use slightly larger click threshold for comets due to their tail
                const cometClickThreshold = Math.max(15, clickThreshold);
                if (cometMapX >= mapX && cometMapX <= mapX + mapWidth && 
                    cometMapY >= mapY && cometMapY <= mapY + mapHeight) {
                    
                    const distance = Math.sqrt((mouseX - cometMapX)**2 + (mouseY - cometMapY)**2);
                    if (distance <= cometClickThreshold && distance < closestCometDistance) {
                        closestComet = comet;
                        closestCometDistance = distance;
                    }
                }
            }
        }

        // Check for rogue planet clicks (wandering worlds visible at all zoom levels)
        let closestRoguePlanet: any | null = null;
        let closestRoguePlanetDistance = Infinity;

        if (discoveredRoguePlanets) {
            for (const roguePlanet of discoveredRoguePlanets) {
                const roguePlanetMapX = mapX + mapWidth/2 + (roguePlanet.x - this.centerX) * worldToMapScale;
                const roguePlanetMapY = mapY + mapHeight/2 + (roguePlanet.y - this.centerY) * worldToMapScale;

                // Use similar click threshold to regular planets
                const roguePlanetClickThreshold = Math.max(12, clickThreshold);
                if (roguePlanetMapX >= mapX && roguePlanetMapX <= mapX + mapWidth && 
                    roguePlanetMapY >= mapY && roguePlanetMapY <= mapY + mapHeight) {
                    
                    const distance = Math.sqrt((mouseX - roguePlanetMapX)**2 + (mouseY - roguePlanetMapY)**2);
                    if (distance <= roguePlanetClickThreshold && distance < closestRoguePlanetDistance) {
                        closestRoguePlanet = roguePlanet;
                        closestRoguePlanetDistance = distance;
                    }
                }
            }
        }

        // Check for dark nebula clicks (void region objects visible at all zoom levels)
        let closestDarkNebula: any | null = null;
        let closestDarkNebulaDistance = Infinity;

        if (discoveredDarkNebulae) {
            for (const darkNebula of discoveredDarkNebulae) {
                const darkNebulaMapX = mapX + mapWidth/2 + (darkNebula.x - this.centerX) * worldToMapScale;
                const darkNebulaMapY = mapY + mapHeight/2 + (darkNebula.y - this.centerY) * worldToMapScale;
                
                // Dark nebulae are larger objects, so use a bigger click threshold
                const darkNebulaClickThreshold = Math.max(15, clickThreshold * 1.2);
                if (darkNebulaMapX >= mapX && darkNebulaMapX <= mapX + mapWidth && 
                    darkNebulaMapY >= mapY && darkNebulaMapY <= mapY + mapHeight) {
                    
                    const distance = Math.sqrt((mouseX - darkNebulaMapX)**2 + (mouseY - darkNebulaMapY)**2);
                    if (distance <= darkNebulaClickThreshold && distance < closestDarkNebulaDistance) {
                        closestDarkNebula = darkNebula;
                        closestDarkNebulaDistance = distance;
                    }
                }
            }
        }

        // Check for crystal garden clicks
        let closestCrystalGarden: any | null = null;
        let closestCrystalGardenDistance = Infinity;

        if (discoveredCrystalGardens) {
            for (const crystalGarden of discoveredCrystalGardens) {
                const gardenMapX = mapX + mapWidth/2 + (crystalGarden.x - this.centerX) * worldToMapScale;
                const gardenMapY = mapY + mapHeight/2 + (crystalGarden.y - this.centerY) * worldToMapScale;
                
                // Crystal gardens are medium-sized objects
                const gardenClickThreshold = Math.max(12, clickThreshold * 1.1);
                if (gardenMapX >= mapX && gardenMapX <= mapX + mapWidth && 
                    gardenMapY >= mapY && gardenMapY <= mapY + mapHeight) {
                    
                    const distance = Math.sqrt((mouseX - gardenMapX)**2 + (mouseY - gardenMapY)**2);
                    if (distance <= gardenClickThreshold && distance < closestCrystalGardenDistance) {
                        closestCrystalGarden = crystalGarden;
                        closestCrystalGardenDistance = distance;
                    }
                }
            }
        }

        // Check for protostar clicks
        let closestProtostar: any | null = null;
        let closestProtostarDistance = Infinity;

        if (discoveredProtostars) {
            for (const protostar of discoveredProtostars) {
                const protostarMapX = mapX + mapWidth/2 + (protostar.x - this.centerX) * worldToMapScale;
                const protostarMapY = mapY + mapHeight/2 + (protostar.y - this.centerY) * worldToMapScale;
                
                // Protostars are medium-large objects with jets
                const protostarClickThreshold = Math.max(15, clickThreshold * 1.2);
                if (protostarMapX >= mapX && protostarMapX <= mapX + mapWidth && 
                    protostarMapY >= mapY && protostarMapY <= mapY + mapHeight) {
                    
                    const distance = Math.sqrt((mouseX - protostarMapX)**2 + (mouseY - protostarMapY)**2);
                    if (distance <= protostarClickThreshold && distance < closestProtostarDistance) {
                        closestProtostar = protostar;
                        closestProtostarDistance = distance;
                    }
                }
            }
        }
        
        // Select the closest object (prioritize order: planets > rogue planets > dark nebulae > protostars > crystal gardens > wormholes > nebulae > comets > black holes > asteroid gardens > stars)
        if (closestPlanet && closestPlanetDistance <= Math.min(closestStarDistance, closestNebulaDistance, closestWormholeDistance, closestBlackHoleDistance, closestAsteroidGardenDistance, closestCometDistance, closestRoguePlanetDistance, closestDarkNebulaDistance, closestProtostarDistance, closestCrystalGardenDistance)) {
            this.selectedPlanet = closestPlanet;
            this.selectedStar = null;
            this.selectedNebula = null;
            this.selectedWormhole = null;
            this.selectedBlackHole = null;
            this.selectedAsteroidGarden = null;
            this.selectedComet = null;
            this.selectedRoguePlanet = null;
            this.selectedDarkNebula = null;
            this.selectedProtostar = null;
            this.selectedProtostar = null;
            this.selectedCrystalGarden = null;
        } else if (closestRoguePlanet && closestRoguePlanetDistance <= Math.min(closestStarDistance, closestNebulaDistance, closestWormholeDistance, closestBlackHoleDistance, closestAsteroidGardenDistance, closestCometDistance, closestDarkNebulaDistance, closestProtostarDistance, closestCrystalGardenDistance)) {
            this.selectedRoguePlanet = closestRoguePlanet;
            this.selectedStar = null;
            this.selectedPlanet = null;
            this.selectedNebula = null;
            this.selectedWormhole = null;
            this.selectedBlackHole = null;
            this.selectedAsteroidGarden = null;
            this.selectedComet = null;
            this.selectedDarkNebula = null;
            this.selectedProtostar = null;
            this.selectedProtostar = null;
            this.selectedCrystalGarden = null;
        } else if (closestDarkNebula && closestDarkNebulaDistance <= Math.min(closestStarDistance, closestNebulaDistance, closestWormholeDistance, closestBlackHoleDistance, closestAsteroidGardenDistance, closestCometDistance, closestProtostarDistance, closestCrystalGardenDistance)) {
            this.selectedDarkNebula = closestDarkNebula;
            this.selectedStar = null;
            this.selectedPlanet = null;
            this.selectedNebula = null;
            this.selectedWormhole = null;
            this.selectedBlackHole = null;
            this.selectedAsteroidGarden = null;
            this.selectedComet = null;
            this.selectedRoguePlanet = null;
            this.selectedProtostar = null;
            this.selectedCrystalGarden = null;
        } else if (closestProtostar && closestProtostarDistance <= Math.min(closestStarDistance, closestNebulaDistance, closestWormholeDistance, closestBlackHoleDistance, closestAsteroidGardenDistance, closestCometDistance, closestCrystalGardenDistance)) {
            this.selectedProtostar = closestProtostar;
            this.selectedStar = null;
            this.selectedPlanet = null;
            this.selectedNebula = null;
            this.selectedWormhole = null;
            this.selectedBlackHole = null;
            this.selectedAsteroidGarden = null;
            this.selectedComet = null;
            this.selectedRoguePlanet = null;
            this.selectedDarkNebula = null;
            this.selectedCrystalGarden = null;
        } else if (closestCrystalGarden && closestCrystalGardenDistance <= Math.min(closestStarDistance, closestNebulaDistance, closestWormholeDistance, closestBlackHoleDistance, closestAsteroidGardenDistance, closestCometDistance)) {
            this.selectedCrystalGarden = closestCrystalGarden;
            this.selectedStar = null;
            this.selectedPlanet = null;
            this.selectedNebula = null;
            this.selectedWormhole = null;
            this.selectedBlackHole = null;
            this.selectedAsteroidGarden = null;
            this.selectedComet = null;
            this.selectedRoguePlanet = null;
            this.selectedDarkNebula = null;
            this.selectedProtostar = null;
        } else if (closestWormhole && closestWormholeDistance <= Math.min(closestStarDistance, closestNebulaDistance, closestBlackHoleDistance, closestAsteroidGardenDistance, closestCometDistance)) {
            this.selectedWormhole = closestWormhole;
            this.selectedStar = null;
            this.selectedPlanet = null;
            this.selectedNebula = null;
            this.selectedBlackHole = null;
            this.selectedAsteroidGarden = null;
            this.selectedComet = null;
            this.selectedRoguePlanet = null;
            this.selectedDarkNebula = null;
            this.selectedProtostar = null;
            this.selectedCrystalGarden = null;
        } else if (closestNebula && closestNebulaDistance <= Math.min(closestStarDistance, closestBlackHoleDistance, closestAsteroidGardenDistance, closestCometDistance)) {
            this.selectedNebula = closestNebula;
            this.selectedStar = null;
            this.selectedPlanet = null;
            this.selectedWormhole = null;
            this.selectedBlackHole = null;
            this.selectedAsteroidGarden = null;
            this.selectedComet = null;
            this.selectedRoguePlanet = null;
            this.selectedDarkNebula = null;
            this.selectedProtostar = null;
            this.selectedCrystalGarden = null;
        } else if (closestComet && closestCometDistance <= Math.min(closestStarDistance, closestBlackHoleDistance, closestAsteroidGardenDistance)) {
            this.selectedComet = closestComet;
            this.selectedStar = null;
            this.selectedPlanet = null;
            this.selectedNebula = null;
            this.selectedWormhole = null;
            this.selectedBlackHole = null;
            this.selectedAsteroidGarden = null;
            this.selectedRoguePlanet = null;
            this.selectedDarkNebula = null;
            this.selectedProtostar = null;
            this.selectedCrystalGarden = null;
        } else if (closestBlackHole && closestBlackHoleDistance <= Math.min(closestStarDistance, closestAsteroidGardenDistance)) {
            this.selectedBlackHole = closestBlackHole;
            this.selectedStar = null;
            this.selectedPlanet = null;
            this.selectedNebula = null;
            this.selectedWormhole = null;
            this.selectedAsteroidGarden = null;
            this.selectedComet = null;
            this.selectedRoguePlanet = null;
            this.selectedDarkNebula = null;
            this.selectedProtostar = null;
            this.selectedCrystalGarden = null;
        } else if (closestAsteroidGarden && closestAsteroidGardenDistance <= closestStarDistance) {
            this.selectedAsteroidGarden = closestAsteroidGarden;
            this.selectedStar = null;
            this.selectedPlanet = null;
            this.selectedNebula = null;
            this.selectedWormhole = null;
            this.selectedBlackHole = null;
            this.selectedComet = null;
            this.selectedRoguePlanet = null;
            this.selectedDarkNebula = null;
            this.selectedProtostar = null;
            this.selectedCrystalGarden = null;
        } else if (closestStar) {
            this.selectedStar = closestStar;
            this.selectedPlanet = null;
            this.selectedNebula = null;
            this.selectedWormhole = null;
            this.selectedBlackHole = null;
            this.selectedAsteroidGarden = null;
            this.selectedComet = null;
            this.selectedRoguePlanet = null;
            this.selectedDarkNebula = null;
            this.selectedProtostar = null;
            this.selectedCrystalGarden = null;
        } else {
            this.selectedStar = null;
            this.selectedPlanet = null;
            this.selectedWormhole = null;
            this.selectedNebula = null;
            this.selectedBlackHole = null;
            this.selectedAsteroidGarden = null;
            this.selectedComet = null;
            this.selectedRoguePlanet = null;
        }
        
        // Consume input to prevent ship movement when handling stellar map interactions
        if (input) {
            input.consumeTouch();
        }
        return true; // Consumed the event
    }
    
    updateHoverState(mouseX: number, mouseY: number, canvas: HTMLCanvasElement): void {
        // Get discovered objects from the chunk manager
        // Note: This requires discoveredStars and discoveredPlanets to be passed in
        // For now, we'll implement this as a separate method that game.ts can call
        // This is a placeholder to maintain the hover detection structure
        
        // Reset hover state - will be set by detectHoverTarget when called from game.ts
        this.hoveredStar = null;
        this.hoveredPlanet = null;
        this.hoveredNebula = null;
        this.hoveredWormhole = null;
        this.hoveredRoguePlanet = null;
        
        // Update cursor based on hover state
        this.updateCursor(canvas);
    }
    
    detectHoverTarget(mouseX: number, mouseY: number, canvas: HTMLCanvasElement, discoveredStars: StarLike[], discoveredPlanets?: PlanetLike[] | null, discoveredNebulae?: NebulaLike[] | null, discoveredWormholes?: WormholeLike[] | null, discoveredAsteroidGardens?: AsteroidGardenLike[] | null, discoveredBlackHoles?: BlackHoleLike[] | null, discoveredComets?: CometLike[] | null, discoveredRoguePlanets?: any[] | null, discoveredDarkNebulae?: any[] | null, discoveredCrystalGardens?: any[] | null, discoveredProtostars?: any[] | null): void {
        if (!this.visible) return;
        
        // Calculate map bounds and scaling
        const { mapX, mapY, mapWidth, mapHeight } = this.getMapBounds(canvas);
        const worldToMapScale = Math.min(mapWidth, mapHeight) / (this.gridSize * 4 / this.zoomLevel);
        
        // Check if mouse is within map bounds
        if (mouseX < mapX || mouseX > mapX + mapWidth || mouseY < mapY || mouseY > mapY + mapHeight) {
            this.hoverSystem.clearHover();
            this.clearAllOldHoverStates();
            this.updateCursor(canvas);
            return;
        }

        // Simple centralized approach: prepare data and let hover system handle it
        const objectCollections: Record<string, HoverableObject[]> = {
            'celestialStar': (discoveredStars || []).map(obj => ({...obj, type: 'celestialStar'})),
            'planet': this.zoomLevel > 3.0 ? (discoveredPlanets || []).map(obj => ({...obj, type: 'planet'})) : [],
            'nebula': (discoveredNebulae || []).map(obj => ({...obj, type: 'nebula'})),
            'wormhole': (discoveredWormholes || []).map(obj => ({...obj, type: 'wormhole'})),
            'asteroidGarden': (discoveredAsteroidGardens || []).map(obj => ({...obj, type: 'asteroidGarden'})),
            'blackhole': (discoveredBlackHoles || []).map(obj => ({...obj, type: 'blackhole'})),
            'comet': (discoveredComets || []).map(obj => ({...obj, type: 'comet'})),
            'rogue-planet': (discoveredRoguePlanets || []).map(obj => ({...obj, type: 'rogue-planet'})),
            'dark-nebula': (discoveredDarkNebulae || []).map(obj => ({...obj, type: 'dark-nebula'})),
            'crystal-garden': (discoveredCrystalGardens || []).map(obj => ({...obj, type: 'crystal-garden'})),
            'protostar': (discoveredProtostars || []).map(obj => ({...obj, type: 'protostar'}))
        };

        // Use centralized hover detection
        this.hoverSystem.detectHover(
            mouseX, mouseY, mapX, mapY, mapWidth, mapHeight,
            worldToMapScale, this.centerX, this.centerY, objectCollections
        );

        // Sync back to old properties for compatibility
        this.syncOldHoverStates();
        this.updateCursor(canvas);
    }

    // NEW: Centralized hover detection using the new hover system
    private detectHoverTargetNew(mouseX: number, mouseY: number, canvas: HTMLCanvasElement, discoveredStars: StarLike[], discoveredPlanets?: PlanetLike[] | null, discoveredNebulae?: NebulaLike[] | null, discoveredWormholes?: WormholeLike[] | null, discoveredAsteroidGardens?: AsteroidGardenLike[] | null, discoveredBlackHoles?: BlackHoleLike[] | null, discoveredComets?: CometLike[] | null, discoveredRoguePlanets?: any[] | null, discoveredDarkNebulae?: any[] | null, discoveredCrystalGardens?: any[] | null, discoveredProtostars?: any[] | null): void {
        if (!this.visible) return;
        
        // Calculate map bounds and scaling
        const { mapX, mapY, mapWidth, mapHeight } = this.getMapBounds(canvas);
        const worldToMapScale = Math.min(mapWidth, mapHeight) / (this.gridSize * 4 / this.zoomLevel);
        
        // Check if mouse is within map bounds
        if (mouseX < mapX || mouseX > mapX + mapWidth || mouseY < mapY || mouseY > mapY + mapHeight) {
            this.hoverSystem.clearHover();
            this.clearAllOldHoverStates();
            this.updateCursor(canvas);
            return;
        }

        // Prepare object collections for the new hover system
        const objectCollections: Record<string, HoverableObject[]> = {
            'celestialStar': (discoveredStars || []).map(obj => ({...obj, type: 'celestialStar'})),
            'planet': this.zoomLevel > 3.0 ? (discoveredPlanets || []).map(obj => ({...obj, type: 'planet'})) : [],
            'nebula': (discoveredNebulae || []).map(obj => ({...obj, type: 'nebula'})),
            'wormhole': (discoveredWormholes || []).map(obj => ({...obj, type: 'wormhole'})),
            'asteroidGarden': (discoveredAsteroidGardens || []).map(obj => ({...obj, type: 'asteroidGarden'})),
            'blackhole': (discoveredBlackHoles || []).map(obj => ({...obj, type: 'blackhole'})),
            'comet': (discoveredComets || []).map(obj => ({...obj, type: 'comet'})),
            'rogue-planet': (discoveredRoguePlanets || []).map(obj => ({...obj, type: 'rogue-planet'})),
            'dark-nebula': (discoveredDarkNebulae || []).map(obj => ({...obj, type: 'dark-nebula'})),
            'crystal-garden': (discoveredCrystalGardens || []).map(obj => ({...obj, type: 'crystal-garden'})),
            'protostar': (discoveredProtostars || []).map(obj => ({...obj, type: 'protostar'}))
        };

        // Use the new centralized hover system
        this.updateHoverStatesUsingCentralizedSystem(
            mouseX, mouseY, canvas, mapX, mapY, mapWidth, mapHeight, worldToMapScale, objectCollections
        );
    }

    private clearAllOldHoverStates(): void {
        this.hoveredStar = null;
        this.hoveredPlanet = null;
        this.hoveredNebula = null;
        this.hoveredWormhole = null;
        this.hoveredAsteroidGarden = null;
        this.hoveredBlackHole = null;
        this.hoveredComet = null;
        this.hoveredRoguePlanet = null;
        this.hoveredDarkNebula = null;
        this.hoveredProtostar = null;
        this.hoveredCrystalGarden = null;
    }

    private syncOldHoverStates(): void {
        const { object: hoveredObject, type: hoveredType } = this.hoverSystem.getHoveredObject();
        
        // Clear all old hover states first
        this.clearAllOldHoverStates();

        // Set the appropriate old property based on what was hovered
        if (hoveredObject && hoveredType) {
            switch (hoveredType) {
                case 'celestialStar':
                    this.hoveredStar = hoveredObject as unknown as StarLike;
                    break;
                case 'planet':
                    this.hoveredPlanet = hoveredObject as unknown as PlanetLike;
                    break;
                case 'nebula':
                    this.hoveredNebula = hoveredObject as unknown as NebulaLike;
                    break;
                case 'wormhole':
                    this.hoveredWormhole = hoveredObject as unknown as WormholeLike;
                    break;
                case 'asteroidGarden':
                    this.hoveredAsteroidGarden = hoveredObject as unknown as AsteroidGardenLike;
                    break;
                case 'blackhole':
                    this.hoveredBlackHole = hoveredObject as unknown as BlackHoleLike;
                    break;
                case 'comet':
                    this.hoveredComet = hoveredObject as unknown as CometLike;
                    break;
                case 'rogue-planet':
                    this.hoveredRoguePlanet = hoveredObject as unknown;
                    break;
                case 'dark-nebula':
                    this.hoveredDarkNebula = hoveredObject as unknown;
                    break;
                case 'crystal-garden':
                    this.hoveredCrystalGarden = hoveredObject as unknown;
                    break;
                case 'protostar':
                    this.hoveredProtostar = hoveredObject as unknown;
                    break;
            }
        }
    }

    private updateHoverStatesUsingCentralizedSystem(
        mouseX: number, 
        mouseY: number, 
        canvas: HTMLCanvasElement,
        mapX: number,
        mapY: number,
        mapWidth: number,
        mapHeight: number,
        worldToMapScale: number,
        objectCollections: Record<string, HoverableObject[]>
    ): void {
        // Use the centralized hover system to detect what object is being hovered
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
            objectCollections
        );

        // Update old system properties for backward compatibility
        this.syncOldHoverStates();
        this.updateCursor(canvas);
    }
    
    updateCursor(canvas: HTMLCanvasElement): void {
        if (this.hoveredStar || this.hoveredPlanet || this.hoveredNebula || this.hoveredWormhole || this.hoveredAsteroidGarden || this.hoveredBlackHole || this.hoveredComet || this.hoveredRoguePlanet || this.hoveredDarkNebula || this.hoveredCrystalGarden || this.hoveredProtostar) {
            canvas.style.cursor = 'pointer';
        } else if (this.visible) {
            // Use crosshair for map navigation when visible
            canvas.style.cursor = 'crosshair';
        } else {
            // Default cursor when map is not visible
            canvas.style.cursor = 'default';
        }
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
    }
    
    setChunkManager(chunkManager: ChunkManager): void {
        this.chunkManager = chunkManager;
    }
    
    // Enable following player position
    enableFollowPlayer(camera: Camera): void {
        this.followPlayer = true;
        this.centerOnPosition(camera.x, camera.y);
    }
    
    // Check if currently following player
    isFollowingPlayer(): boolean {
        return this.followPlayer;
    }
    
    // Check if currently panning
    isCurrentlyPanning(): boolean {
        return this.isPanning;
    }

    zoomIn(): void {
        const maxZoom = this.inspectorZoomExtended ? 50.0 : 10.0; // Extended zoom for inspector mode
        this.zoomLevel = Math.min(this.zoomLevel * 1.5, maxZoom);
        
        // Note: Inspector mode now uses persistent revealed chunks
        // No need to refresh data on zoom changes
    }

    zoomOut(): void {
        const minZoom = this.inspectorZoomExtended ? 0.001 : 0.01; // Extended zoom out for wide patterns
        this.zoomLevel = Math.max(this.zoomLevel / 1.5, minZoom);
        
        // Note: Inspector mode now uses persistent revealed chunks
        // No need to refresh data on zoom changes
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
        ctx.strokeStyle = this.gridColor;
        ctx.lineWidth = 0.5; // Even more subtle lines
        
        // Dynamic grid size based on zoom level
        let effectiveGridSize = this.gridSize;
        if (this.zoomLevel < 0.1) {
            // Galactic view: very large grid (20000 units)
            effectiveGridSize = this.gridSize * 10;
        } else if (this.zoomLevel < 0.5) {
            // Sector view: large grid (10000 units)
            effectiveGridSize = this.gridSize * 5;
        } else if (this.zoomLevel > 5.0) {
            // Detail view: small grid (500 units)
            effectiveGridSize = this.gridSize / 4;
        }
        
        // Calculate grid line spacing on screen
        const gridSpacing = effectiveGridSize * scale;
        
        // Skip grid rendering if spacing is too small or too large
        if (gridSpacing < 10 || gridSpacing > mapWidth) {
            return;
        }
        
        // Calculate offset based on map center
        const offsetX = (this.centerX % effectiveGridSize) * scale;
        const offsetY = (this.centerY % effectiveGridSize) * scale;
        
        // Draw vertical grid lines
        for (let x = mapX - offsetX; x <= mapX + mapWidth; x += gridSpacing) {
            if (x >= mapX && x <= mapX + mapWidth) {
                ctx.beginPath();
                ctx.moveTo(x, mapY);
                ctx.lineTo(x, mapY + mapHeight);
                ctx.stroke();
            }
        }
        
        // Draw horizontal grid lines
        for (let y = mapY - offsetY; y <= mapY + mapHeight; y += gridSpacing) {
            if (y >= mapY && y <= mapY + mapHeight) {
                ctx.beginPath();
                ctx.moveTo(mapX, y);
                ctx.lineTo(mapX + mapWidth, y);
                ctx.stroke();
            }
        }
    }

    renderCosmicRegions(ctx: CanvasRenderingContext2D, mapX: number, mapY: number, mapWidth: number, mapHeight: number, scale: number): void {
        // Completely disable all region display for now
        return;
    }

    private drawCleanRegionLabels(
        ctx: CanvasRenderingContext2D,
        regionCenters: Map<string, {x: number, y: number, name: string, count: number}>,
        mapX: number,
        mapY: number,
        mapWidth: number,
        mapHeight: number,
        scale: number
    ): void {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '14px "Courier New", monospace';
        
        const minDistance = 80; // Minimum distance between labels in screen pixels
        const drawnPositions: Array<{x: number, y: number}> = [];
        
        for (const [regionType, center] of regionCenters) {
            if (center.count < 2) continue; // Only show for regions with multiple sample points
            
            // Convert to screen coordinates
            const screenX = mapX + mapWidth/2 + (center.x - this.centerX) * scale;
            const screenY = mapY + mapHeight/2 + (center.y - this.centerY) * scale;
            
            // Check if this label would be too close to existing ones
            let tooClose = false;
            for (const pos of drawnPositions) {
                const distance = Math.sqrt((screenX - pos.x) ** 2 + (screenY - pos.y) ** 2);
                if (distance < minDistance) {
                    tooClose = true;
                    break;
                }
            }
            
            if (!tooClose && screenX >= mapX && screenX <= mapX + mapWidth && 
                screenY >= mapY && screenY <= mapY + mapHeight) {
                
                // Draw subtle background
                const textWidth = ctx.measureText(center.name).width;
                ctx.fillStyle = '#000000aa';
                ctx.fillRect(screenX - textWidth/2 - 8, screenY - 10, textWidth + 16, 20);
                
                // Draw region name
                ctx.fillStyle = '#b0c4d4';
                ctx.fillText(center.name, screenX, screenY);
                
                drawnPositions.push({x: screenX, y: screenY});
            }
        }
        
        ctx.restore();
    }

    private sampleRegionBoundaries(
        mapX: number,
        mapY: number,
        mapWidth: number,
        mapHeight: number,
        scale: number,
        sampleSpacing: number,
        regionColors: Record<string, string>
    ): Map<string, Array<{x: number, y: number}>> {
        const boundaryPoints = new Map<string, Array<{x: number, y: number}>>();
        
        // Sample in screen-space grid, not world chunks
        for (let screenX = mapX; screenX < mapX + mapWidth; screenX += sampleSpacing) {
            for (let screenY = mapY; screenY < mapY + mapHeight; screenY += sampleSpacing) {
                
                // Convert screen coordinates to world coordinates
                const worldX = this.centerX + (screenX - mapX - mapWidth/2) / scale;
                const worldY = this.centerY + (screenY - mapY - mapHeight/2) / scale;
                
                try {
                    // Sample region at this world point
                    const chunkX = Math.floor(worldX / this.chunkManager!.chunkSize);
                    const chunkY = Math.floor(worldY / this.chunkManager!.chunkSize);
                    const currentRegion = this.chunkManager!.getChunkRegion(chunkX, chunkY);
                    
                    if (!currentRegion || !currentRegion.definition) continue;
                    
                    // Only process discovered regions in normal view
                    const isDiscovered = this.chunkManager!.isRegionDiscovered(currentRegion.regionType);
                    if (!isDiscovered && !this.inspectorMode) continue;
                    
                    // Check neighboring samples for boundary detection
                    const neighbors = [
                        {dx: sampleSpacing, dy: 0},
                        {dx: 0, dy: sampleSpacing}
                    ];
                    
                    for (const {dx, dy} of neighbors) {
                        const neighScreenX = screenX + dx;
                        const neighScreenY = screenY + dy;
                        
                        // Skip if neighbor is outside screen bounds
                        if (neighScreenX >= mapX + mapWidth || neighScreenY >= mapY + mapHeight) continue;
                        
                        // Convert neighbor screen coordinates to world coordinates
                        const neighWorldX = this.centerX + (neighScreenX - mapX - mapWidth/2) / scale;
                        const neighWorldY = this.centerY + (neighScreenY - mapY - mapHeight/2) / scale;
                        
                        const neighChunkX = Math.floor(neighWorldX / this.chunkManager!.chunkSize);
                        const neighChunkY = Math.floor(neighWorldY / this.chunkManager!.chunkSize);
                        const neighborRegion = this.chunkManager!.getChunkRegion(neighChunkX, neighChunkY);
                        
                        if (!neighborRegion || !neighborRegion.definition) continue;
                        
                        // If neighbor region is different, this is a boundary point
                        if (neighborRegion.regionType !== currentRegion.regionType) {
                            const neighIsDiscovered = this.chunkManager!.isRegionDiscovered(neighborRegion.regionType);
                            if (!neighIsDiscovered && !this.inspectorMode) continue;
                            
                            // Use color from region with higher influence
                            const useCurrentColor = currentRegion.influence >= neighborRegion.influence;
                            const color = useCurrentColor ? 
                                regionColors[currentRegion.regionType] : 
                                regionColors[neighborRegion.regionType];
                            const colorKey = color || '#666666';
                            
                            if (!boundaryPoints.has(colorKey)) {
                                boundaryPoints.set(colorKey, []);
                            }
                            
                            // Record boundary point in world coordinates (for smooth curves)
                            boundaryPoints.get(colorKey)!.push({x: worldX, y: worldY});
                        }
                    }
                } catch (error) {
                    continue;
                }
            }
        }
        
        return boundaryPoints;
    }

    private renderContourBoundaries(
        ctx: CanvasRenderingContext2D,
        boundaryPoints: Map<string, Array<{x: number, y: number}>>,
        regionColors: Record<string, string>
    ): void {
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        for (const [color, points] of boundaryPoints) {
            if (points.length < 1) continue; // Draw even single points for debugging
            
            ctx.strokeStyle = color + 'CC'; // Much more opaque for visibility
            console.log(`Rendering ${points.length} boundary points with color ${color}`);
            
            // Simple approach: draw small circles at each boundary point for debugging
            for (const point of points) {
                const screenPoint = this.worldToScreenCoords(point);
                ctx.beginPath();
                ctx.arc(screenPoint.x, screenPoint.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Try multiple grouping tolerances and draw simple lines between nearby points
            if (points.length >= 2) {
                // Sort points for better connection
                const sortedPoints = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
                
                ctx.beginPath();
                let startPoint = this.worldToScreenCoords(sortedPoints[0]);
                ctx.moveTo(startPoint.x, startPoint.y);
                
                // Connect to nearby points within reasonable distance
                for (let i = 1; i < sortedPoints.length; i++) {
                    const currentScreen = this.worldToScreenCoords(sortedPoints[i]);
                    const prevScreen = this.worldToScreenCoords(sortedPoints[i-1]);
                    
                    // If points are reasonably close, connect them
                    const distance = Math.sqrt(
                        (currentScreen.x - prevScreen.x) ** 2 + 
                        (currentScreen.y - prevScreen.y) ** 2
                    );
                    
                    if (distance < 100) { // Screen pixels
                        ctx.lineTo(currentScreen.x, currentScreen.y);
                    } else {
                        // Start a new path segment
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(currentScreen.x, currentScreen.y);
                    }
                }
                
                ctx.stroke();
            }
        }
    }

    private groupNearbyPoints(points: Array<{x: number, y: number}>, tolerance: number): Array<Array<{x: number, y: number}>> {
        if (points.length === 0) return [];
        
        const paths: Array<Array<{x: number, y: number}>> = [];
        const used = new Set<number>();
        
        for (let i = 0; i < points.length; i++) {
            if (used.has(i)) continue;
            
            const currentPath = [points[i]];
            used.add(i);
            
            // Find nearby points to connect
            let found = true;
            while (found) {
                found = false;
                const lastPoint = currentPath[currentPath.length - 1];
                
                for (let j = 0; j < points.length; j++) {
                    if (used.has(j)) continue;
                    
                    const dx = points[j].x - lastPoint.x;
                    const dy = points[j].y - lastPoint.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance <= tolerance) {
                        currentPath.push(points[j]);
                        used.add(j);
                        found = true;
                        break;
                    }
                }
            }
            
            if (currentPath.length > 1) {
                paths.push(currentPath);
            }
        }
        
        return paths;
    }

    private worldToScreenCoords(worldPoint: {x: number, y: number}): {x: number, y: number} {
        // This method needs access to current rendering context - we'll need to pass it in
        // For now, using a simplified approach
        const mapBounds = this.getMapBounds(document.querySelector('canvas') as HTMLCanvasElement);
        const worldToMapScale = Math.min(mapBounds.mapWidth, mapBounds.mapHeight) / (this.gridSize * 4 / this.zoomLevel);
        
        return {
            x: mapBounds.mapX + mapBounds.mapWidth/2 + (worldPoint.x - this.centerX) * worldToMapScale,
            y: mapBounds.mapY + mapBounds.mapHeight/2 + (worldPoint.y - this.centerY) * worldToMapScale
        };
    }

    private drawRegionLabelsFromSamples(
        ctx: CanvasRenderingContext2D,
        mapX: number,
        mapY: number,
        mapWidth: number,
        mapHeight: number,
        scale: number,
        sampleSpacing: number
    ): void {
        // Only show labels at appropriate zoom levels
        if (this.zoomLevel < 0.1 || this.zoomLevel > 1.5) return;
        
        const regionCenters = new Map<string, {x: number, y: number, name: string, count: number}>();
        const minDistance = sampleSpacing * 3; // Minimum distance between labels
        
        // Sample region centers from sparse grid
        const labelSampleSpacing = sampleSpacing * 2;
        for (let screenX = mapX; screenX < mapX + mapWidth; screenX += labelSampleSpacing) {
            for (let screenY = mapY; screenY < mapY + mapHeight; screenY += labelSampleSpacing) {
                const worldX = this.centerX + (screenX - mapX - mapWidth/2) / scale;
                const worldY = this.centerY + (screenY - mapY - mapHeight/2) / scale;
                
                try {
                    const chunkX = Math.floor(worldX / this.chunkManager!.chunkSize);
                    const chunkY = Math.floor(worldY / this.chunkManager!.chunkSize);
                    const region = this.chunkManager!.getChunkRegion(chunkX, chunkY);
                    
                    if (!region || !region.definition) continue;
                    
                    const isDiscovered = this.chunkManager!.isRegionDiscovered(region.regionType);
                    if (!isDiscovered && !this.inspectorMode) continue;
                    
                    const regionKey = region.regionType;
                    if (!regionCenters.has(regionKey)) {
                        regionCenters.set(regionKey, {
                            x: screenX,
                            y: screenY,
                            name: region.definition.name,
                            count: 1
                        });
                    } else {
                        const center = regionCenters.get(regionKey)!;
                        center.x = (center.x * center.count + screenX) / (center.count + 1);
                        center.y = (center.y * center.count + screenY) / (center.count + 1);
                        center.count++;
                    }
                } catch (error) {
                    continue;
                }
            }
        }
        
        // Draw labels with spacing control
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '12px "Courier New", monospace';
        
        const drawnPositions: Array<{x: number, y: number}> = [];
        
        for (const [regionType, center] of regionCenters) {
            if (center.count < 3) continue; // Only show for significant regions
            
            // Check minimum distance from other labels
            let tooClose = false;
            for (const pos of drawnPositions) {
                const distance = Math.sqrt((center.x - pos.x) ** 2 + (center.y - pos.y) ** 2);
                if (distance < minDistance) {
                    tooClose = true;
                    break;
                }
            }
            
            if (!tooClose) {
                // Draw text background
                const textWidth = ctx.measureText(center.name).width;
                ctx.fillStyle = '#000000c0';
                ctx.fillRect(center.x - textWidth/2 - 4, center.y - 8, textWidth + 8, 16);
                
                // Draw label
                ctx.fillStyle = '#b0c4d4cc';
                ctx.fillText(center.name, center.x, center.y);
                
                drawnPositions.push({x: center.x, y: center.y});
            }
        }
        
        ctx.restore();
    }

    private isLineVisible(x1: number, y1: number, x2: number, y2: number, mapX: number, mapY: number, mapWidth: number, mapHeight: number): boolean {
        // Simple bounds check - if any part of the line is within screen bounds
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        
        return !(maxX < mapX || minX > mapX + mapWidth || maxY < mapY || minY > mapY + mapHeight);
    }

    private drawRegionLabels(
        ctx: CanvasRenderingContext2D,
        regionCenters: Map<string, {x: number, y: number, name: string, color: string, count: number}>,
        mapX: number,
        mapY: number,
        mapWidth: number,
        mapHeight: number,
        scale: number
    ): void {
        // Only show labels at appropriate zoom levels to avoid clutter
        if (this.zoomLevel < 0.1 || this.zoomLevel > 1.5) return;
        
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Calculate font size based on zoom level
        const fontSize = Math.max(10, Math.min(16, this.zoomLevel * 20));
        ctx.font = `${fontSize}px "Courier New", monospace`;
        
        // Minimum distance between labels to prevent overlap
        const minDistance = Math.max(50, 100 / this.zoomLevel);
        const drawnPositions: Array<{x: number, y: number}> = [];
        
        for (const [regionType, center] of regionCenters) {
            // Convert world coordinates to map coordinates
            const labelMapX = mapX + mapWidth/2 + (center.x - this.centerX) * scale;
            const labelMapY = mapY + mapHeight/2 + (center.y - this.centerY) * scale;
            
            // Only draw if label is within visible area
            if (labelMapX < mapX || labelMapX > mapX + mapWidth || 
                labelMapY < mapY || labelMapY > mapY + mapHeight) {
                continue;
            }
            
            // Check minimum distance from other labels
            let tooClose = false;
            for (const pos of drawnPositions) {
                const distance = Math.sqrt((labelMapX - pos.x) ** 2 + (labelMapY - pos.y) ** 2);
                if (distance < minDistance) {
                    tooClose = true;
                    break;
                }
            }
            
            if (!tooClose && center.count >= 3) { // Only show labels for regions with enough chunks
                // Draw text background for readability
                const textWidth = ctx.measureText(center.name).width;
                const textHeight = fontSize;
                const padding = 4;
                
                ctx.fillStyle = '#000000c0'; // Semi-transparent background
                ctx.fillRect(
                    labelMapX - textWidth/2 - padding,
                    labelMapY - textHeight/2 - padding,
                    textWidth + padding * 2,
                    textHeight + padding * 2
                );
                
                // Draw region label
                ctx.fillStyle = center.color + 'cc'; // Semi-transparent color
                ctx.fillText(center.name, labelMapX, labelMapY);
                
                drawnPositions.push({x: labelMapX, y: labelMapY});
            }
        }
        
        ctx.restore();
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
            this.currentPositionColor
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

    renderDarkNebulaInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
        if (!this.selectedDarkNebula || !this.namingService) return;
        
        // Panel dimensions and position (same as other panels)
        const panelWidth = 300;
        const panelHeight = 120;
        const panelX = canvas.width - panelWidth - 20;
        const panelY = 60;
        
        // Draw panel background (same style as other panels)
        ctx.fillStyle = '#000000E0';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        ctx.strokeStyle = '#2a3a4a';
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
        
        // Panel content (same style as other panels)
        ctx.fillStyle = '#b0c4d4';
        ctx.font = '12px "Courier New", monospace';
        
        let lineY = panelY + 20;
        const lineHeight = 14;
        
        // Dark nebula designation
        const darkNebulaName = this.generateDarkNebulaDisplayName(this.selectedDarkNebula);
        ctx.fillText(`Designation: ${darkNebulaName}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Dark nebula variant/type
        const variantName = this.selectedDarkNebula.variant ? 
            this.selectedDarkNebula.variant.charAt(0).toUpperCase() + this.selectedDarkNebula.variant.slice(1).replace('-', ' ') + ' Dark Nebula' :
            'Dark Nebula';
        ctx.fillText(`Type: ${variantName}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Special property: Star occlusion
        const occlusionPercent = Math.round((this.selectedDarkNebula.occlusionStrength || 0.8) * 100);
        ctx.fillText(`Star Occlusion: ${occlusionPercent}%`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Position
        ctx.fillText(`Position: (${Math.round(this.selectedDarkNebula.x)}, ${Math.round(this.selectedDarkNebula.y)})`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Discovery timestamp if available
        if (this.selectedDarkNebula.timestamp) {
            const date = new Date(this.selectedDarkNebula.timestamp);
            const dateStr = date.toLocaleDateString();
            ctx.fillText(`Discovered: ${dateStr}`, panelX + 10, lineY);
        }
    }

    generateDarkNebulaDisplayName(darkNebula: any): string {
        if (!this.namingService) return 'Unknown Dark Nebula';
        
        // Use the naming service to generate a consistent name
        return this.namingService.generateDisplayName(darkNebula);
    }

    renderCrystalGardenInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
        if (!this.selectedCrystalGarden || !this.namingService) return;
        
        // Panel dimensions and position (same as other panels)
        const panelWidth = 300;
        const panelHeight = 140;
        const panelX = canvas.width - panelWidth - 20;
        const panelY = 60;
        
        // Draw panel background (same style as other panels)
        ctx.fillStyle = '#000000E0';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        ctx.strokeStyle = '#2a3a4a';
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
        
        // Panel content (same style as other panels)
        ctx.fillStyle = '#b0c4d4';
        ctx.font = '12px "Courier New", monospace';
        
        let lineY = panelY + 20;
        const lineHeight = 14;
        
        // Crystal garden designation
        const gardenName = this.namingService.generateDisplayName(this.selectedCrystalGarden);
        ctx.fillText(`Designation: ${gardenName}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Crystal garden variant/type
        const variantName = this.selectedCrystalGarden.variant ? 
            this.selectedCrystalGarden.variant.charAt(0).toUpperCase() + this.selectedCrystalGarden.variant.slice(1).replace('-', ' ') + ' Crystal Garden' :
            'Crystal Garden';
        ctx.fillText(`Type: ${variantName}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Special properties: Crystal count and refraction index
        const crystalCount = this.selectedCrystalGarden.crystalCount || 'Unknown';
        ctx.fillText(`Crystal Formations: ${crystalCount}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        const refractionIndex = this.selectedCrystalGarden.refractionIndex || 'Unknown';
        ctx.fillText(`Refraction Index: ${refractionIndex}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Primary mineral composition
        const primaryMineral = this.selectedCrystalGarden.primaryMineral || 'Unknown';
        ctx.fillText(`Primary Mineral: ${primaryMineral}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Position
        ctx.fillText(`Position: (${Math.round(this.selectedCrystalGarden.x)}, ${Math.round(this.selectedCrystalGarden.y)})`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Discovery timestamp if available
        if (this.selectedCrystalGarden.timestamp) {
            const date = new Date(this.selectedCrystalGarden.timestamp);
            const dateStr = date.toLocaleDateString();
            ctx.fillText(`Discovered: ${dateStr}`, panelX + 10, lineY);
        }
    }

    renderProtostarInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
        if (!this.selectedProtostar || !this.namingService) return;
        
        // Panel dimensions and position (same as other panels)
        const panelWidth = 300;
        const panelHeight = 140;
        const panelX = canvas.width - panelWidth - 20;
        const panelY = 60;
        
        // Draw panel background (same style as other panels)
        ctx.fillStyle = '#000000E0';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        ctx.strokeStyle = '#2a3a4a';
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
        
        // Panel content (same style as other panels)
        ctx.fillStyle = '#b0c4d4';
        ctx.font = '12px "Courier New", monospace';
        
        let lineY = panelY + 20;
        const lineHeight = 14;
        
        // Protostar designation
        const protostarName = this.namingService.generateDisplayName(this.selectedProtostar);
        ctx.fillText(`Designation: ${protostarName}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Stellar classification
        const classification = this.selectedProtostar.stellarClassification || 'Unknown';
        ctx.fillText(`Classification: ${classification}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Protostar variant/evolutionary stage
        const variantName = this.selectedProtostar.variant ? 
            `Class ${this.selectedProtostar.variant.split('-')[1]} Protostar` :
            'Protostar';
        ctx.fillText(`Type: ${variantName}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Core temperature
        const temperature = this.selectedProtostar.coreTemperature || 'Unknown';
        ctx.fillText(`Core Temperature: ${temperature}K`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Special properties based on variant
        if (this.selectedProtostar.variant === 'class-1' || this.selectedProtostar.variant === 'class-2') {
            ctx.fillText(`Features: Polar Jets Active`, panelX + 10, lineY);
        } else {
            ctx.fillText(`Features: Accretion Disk`, panelX + 10, lineY);
        }
        lineY += lineHeight;
        
        // Position
        ctx.fillText(`Position: (${Math.round(this.selectedProtostar.x)}, ${Math.round(this.selectedProtostar.y)})`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Discovery timestamp if available
        if (this.selectedProtostar.discoveryTimestamp) {
            const date = new Date(this.selectedProtostar.discoveryTimestamp);
            const dateStr = date.toLocaleDateString();
            ctx.fillText(`Discovered: ${dateStr}`, panelX + 10, lineY);
        }
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
        // Edge case: Don't render starting position marker if it's the same as origin (0,0)
        if (startingPosition.x === 0 && startingPosition.y === 0) {
            return;
        }
        
        // Convert starting position to map coordinates
        const startMapX = mapX + mapWidth/2 + (startingPosition.x - this.centerX) * scale;
        const startMapY = mapY + mapHeight/2 + (startingPosition.y - this.centerY) * scale;
        
        // Only draw if starting position is within map bounds
        if (startMapX >= mapX && startMapX <= mapX + mapWidth && 
            startMapY >= mapY && startMapY <= mapY + mapHeight) {
            
            // Use blue color for starting position
            ctx.strokeStyle = '#4488ff';
            ctx.fillStyle = '#4488ff40'; // Semi-transparent fill
            ctx.lineWidth = 2;
            
            // Scale marker size based on zoom level
            const markerSize = Math.max(4, Math.min(10, 6 / this.zoomLevel));
            
            // Draw diamond shape
            ctx.beginPath();
            ctx.moveTo(startMapX, startMapY - markerSize); // Top
            ctx.lineTo(startMapX + markerSize, startMapY); // Right
            ctx.lineTo(startMapX, startMapY + markerSize); // Bottom
            ctx.lineTo(startMapX - markerSize, startMapY); // Left
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Add label at lower zoom levels
            if (this.zoomLevel < 0.5) {
                ctx.fillStyle = '#4488ff';
                ctx.font = '12px "Courier New", monospace';
                ctx.textAlign = 'center';
                
                // Draw text background for readability
                const labelText = 'Start';
                const textWidth = ctx.measureText(labelText).width;
                const bgPadding = 2;
                ctx.fillStyle = '#000000C0';
                ctx.fillRect(startMapX - textWidth/2 - bgPadding, startMapY + markerSize + 5, textWidth + bgPadding*2, 12);
                
                // Draw label text
                ctx.fillStyle = '#4488ff';
                ctx.fillText(labelText, startMapX, startMapY + markerSize + 15);
                
                // Reset text alignment
                ctx.textAlign = 'left';
            }
        }
    }

    renderOriginMarker(ctx: CanvasRenderingContext2D, mapX: number, mapY: number, mapWidth: number, mapHeight: number, scale: number): void {
        // Convert origin (0,0) to map coordinates
        const originMapX = mapX + mapWidth/2 + (0 - this.centerX) * scale;
        const originMapY = mapY + mapHeight/2 + (0 - this.centerY) * scale;
        
        // Only draw if origin is within map bounds
        if (originMapX >= mapX && originMapX <= mapX + mapWidth && 
            originMapY >= mapY && originMapY <= mapY + mapHeight) {
            
            // Use distinctive red-orange color for origin
            ctx.strokeStyle = '#ff6644';
            ctx.fillStyle = '#ff664440'; // Semi-transparent fill
            ctx.lineWidth = 2;
            
            // Scale marker size based on zoom level (larger when zoomed out)
            const markerSize = Math.max(4, Math.min(12, 8 / this.zoomLevel));
            const crossSize = markerSize * 1.5;
            
            // Draw cross/plus symbol
            ctx.beginPath();
            // Horizontal line
            ctx.moveTo(originMapX - crossSize, originMapY);
            ctx.lineTo(originMapX + crossSize, originMapY);
            // Vertical line
            ctx.moveTo(originMapX, originMapY - crossSize);
            ctx.lineTo(originMapX, originMapY + crossSize);
            ctx.stroke();
            
            // Draw center circle
            ctx.beginPath();
            ctx.arc(originMapX, originMapY, markerSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Add label at lower zoom levels (when zoomed out and origin is more significant)
            if (this.zoomLevel < 0.5) {
                ctx.fillStyle = '#ff6644';
                ctx.font = '12px "Courier New", monospace';
                ctx.textAlign = 'center';
                
                // Draw text background for readability
                const labelText = '(0,0)';
                const textWidth = ctx.measureText(labelText).width;
                const bgPadding = 2;
                ctx.fillStyle = '#000000C0';
                ctx.fillRect(originMapX - textWidth/2 - bgPadding, originMapY + crossSize + 5, textWidth + bgPadding*2, 12);
                
                // Draw label text
                ctx.fillStyle = '#ff6644';
                ctx.fillText(labelText, originMapX, originMapY + crossSize + 15);
                
                // Reset text alignment
                ctx.textAlign = 'left';
            }
        }
    }

    renderCurrentPosition(ctx: CanvasRenderingContext2D, mapX: number, mapY: number, mapWidth: number, mapHeight: number, scale: number, camera: Camera): void {
        // Convert current position to map coordinates (same as other objects)
        const currentMapX = mapX + mapWidth/2 + (camera.x - this.centerX) * scale;
        const currentMapY = mapY + mapHeight/2 + (camera.y - this.centerY) * scale;
        
        // Only draw if current position is within map bounds (with some margin)
        const margin = 20; // Allow marker to be slightly outside visible area
        if (currentMapX >= mapX - margin && currentMapX <= mapX + mapWidth + margin && 
            currentMapY >= mapY - margin && currentMapY <= mapY + mapHeight + margin) {
            
            // Draw current position as gentle marker
            ctx.strokeStyle = this.currentPositionColor;
            ctx.fillStyle = this.currentPositionColor + '40'; // Semi-transparent fill
            ctx.lineWidth = 1;
            
            // Draw filled circle with subtle outline
            ctx.beginPath();
            ctx.arc(currentMapX, currentMapY, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Draw subtle outer ring
            ctx.beginPath();
            ctx.arc(currentMapX, currentMapY, 12, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    renderMapUI(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
        // Set font to match game UI
        ctx.font = '12px "Courier New", monospace';
        ctx.fillStyle = '#b0c4d4'; // Soft blue-white for text
        
        // Title
        const title = 'Stellar Map';
        const titleWidth = ctx.measureText(title).width;
        ctx.fillText(title, (canvas.width - titleWidth) / 2, 30);
        
        // Instructions removed - map is intuitive enough without them
        
        // Zoom info with descriptive labels
        let zoomLabel = '';
        if (this.zoomLevel <= 0.05) {
            zoomLabel = 'Galactic View';
        } else if (this.zoomLevel <= 0.2) {
            zoomLabel = 'Sector View';
        } else if (this.zoomLevel <= 1.0) {
            zoomLabel = 'Regional View';
        } else if (this.zoomLevel <= 3.0) {
            zoomLabel = 'Local View';
        } else {
            zoomLabel = 'Detail View';
        }
        
        const zoomText = `Zoom: ${this.zoomLevel.toFixed(2)}x (${zoomLabel})`;
        const zoomWidth = ctx.measureText(zoomText).width;
        ctx.fillText(zoomText, canvas.width - zoomWidth - 20, canvas.height - 65);
        
        // Center coordinates
        const coordText = `Center: (${Math.round(this.centerX)}, ${Math.round(this.centerY)})`;
        const coordWidth = ctx.measureText(coordText).width;
        ctx.fillText(coordText, canvas.width - coordWidth - 20, canvas.height - 50);
        
        // Information panel for selected star, planet, nebula, wormhole, black hole, or asteroid garden
        if (this.selectedStar && this.namingService) {
            this.renderStarInfoPanel(ctx, canvas);
        } else if (this.selectedPlanet && this.namingService) {
            this.renderPlanetInfoPanel(ctx, canvas);
        } else if (this.selectedNebula && this.namingService) {
            this.renderNebulaInfoPanel(ctx, canvas);
        } else if (this.selectedWormhole && this.namingService) {
            this.renderWormholeInfoPanel(ctx, canvas);
        } else if (this.selectedBlackHole && this.namingService) {
            this.renderBlackHoleInfoPanel(ctx, canvas);
        } else if (this.selectedComet && this.namingService) {
            this.renderCometInfoPanel(ctx, canvas);
        } else if (this.selectedAsteroidGarden && this.namingService) {
            this.renderAsteroidGardenInfoPanel(ctx, canvas);
        } else if (this.selectedRoguePlanet && this.namingService) {
            this.renderRoguePlanetInfoPanel(ctx, canvas);
        } else if (this.selectedDarkNebula && this.namingService) {
            this.renderDarkNebulaInfoPanel(ctx, canvas);
        } else if (this.selectedProtostar && this.namingService) {
            this.renderProtostarInfoPanel(ctx, canvas);
        } else if (this.selectedCrystalGarden && this.namingService) {
            this.renderCrystalGardenInfoPanel(ctx, canvas);
        }
    }

    renderStarInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
        if (!this.selectedStar || !this.namingService) return;
        
        // Generate full designation information
        const fullDesignation = this.namingService.generateFullDesignation(this.selectedStar);
        if (!fullDesignation) {
            console.warn('Could not generate designation for star:', this.selectedStar);
            return;
        }
        
        // Panel dimensions and position
        const panelWidth = 300;
        const panelHeight = 120;
        const panelX = canvas.width - panelWidth - 20;
        const panelY = 60;
        
        // Draw panel background
        ctx.fillStyle = '#000000E0';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        ctx.strokeStyle = '#2a3a4a';
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
        
        // Panel content
        ctx.fillStyle = '#b0c4d4';
        ctx.font = '12px "Courier New", monospace';
        
        let lineY = panelY + 20;
        const lineHeight = 14;
        
        // Star designation
        ctx.fillText(`Designation: ${fullDesignation.catalog || 'Unknown'}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Coordinate designation
        ctx.fillText(`Coordinates: ${fullDesignation.coordinate || 'Unknown'}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Star type
        ctx.fillText(`Type: ${fullDesignation.type}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Classification
        if (fullDesignation.classification) {
            ctx.fillText(`Class: ${fullDesignation.classification}`, panelX + 10, lineY);
            lineY += lineHeight;
        }
        
        // Position
        ctx.fillText(`Position: (${Math.round(this.selectedStar.x)}, ${Math.round(this.selectedStar.y)})`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Discovery timestamp if available
        if (this.selectedStar.timestamp) {
            const date = new Date(this.selectedStar.timestamp);
            const dateStr = date.toLocaleDateString();
            ctx.fillText(`Discovered: ${dateStr}`, panelX + 10, lineY);
        }
    }

    renderPlanetInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
        if (!this.selectedPlanet || !this.namingService) return;
        
        // Panel dimensions and position
        const panelWidth = 300;
        const panelHeight = 120;
        const panelX = canvas.width - panelWidth - 20;
        const panelY = 60;
        
        // Draw panel background
        ctx.fillStyle = '#000000E0';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        ctx.strokeStyle = '#2a3a4a';
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
        
        // Panel content
        ctx.fillStyle = '#b0c4d4';
        ctx.font = '12px "Courier New", monospace';
        
        let lineY = panelY + 20;
        const lineHeight = 14;
        
        // Planet designation using naming service
        const planetName = this.generatePlanetDisplayName(this.selectedPlanet);
        ctx.fillText(`Designation: ${planetName}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Planet type
        ctx.fillText(`Type: ${this.selectedPlanet.planetTypeName}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Parent star coordinates
        ctx.fillText(`Orbits Star: (${Math.round(this.selectedPlanet.parentStarX)}, ${Math.round(this.selectedPlanet.parentStarY)})`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Planet position (if available)
        if (this.selectedPlanet.x !== null && this.selectedPlanet.y !== null) {
            ctx.fillText(`Position: (${Math.round(this.selectedPlanet.x)}, ${Math.round(this.selectedPlanet.y)})`, panelX + 10, lineY);
            lineY += lineHeight;
        }
        
        // Discovery timestamp if available
        if (this.selectedPlanet.timestamp) {
            const date = new Date(this.selectedPlanet.timestamp);
            const dateStr = date.toLocaleDateString();
            ctx.fillText(`Discovered: ${dateStr}`, panelX + 10, lineY);
        }
    }

    renderNebulaInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
        if (!this.selectedNebula || !this.namingService) return;
        
        // Panel dimensions and position
        const panelWidth = 300;
        const panelHeight = 120;
        const panelX = canvas.width - panelWidth - 20;
        const panelY = 60;
        
        // Draw panel background
        ctx.fillStyle = '#000000E0';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        ctx.strokeStyle = '#2a3a4a';
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
        
        // Panel content
        ctx.fillStyle = '#b0c4d4';
        ctx.font = '12px "Courier New", monospace';
        
        let lineY = panelY + 20;
        const lineHeight = 14;
        
        // Nebula designation using naming service
        const nebulaName = this.generateNebulaDisplayName(this.selectedNebula);
        ctx.fillText(`Designation: ${nebulaName}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Nebula type
        ctx.fillText(`Type: ${this.selectedNebula.nebulaType}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Nebula position
        if (this.selectedNebula.x !== null && this.selectedNebula.y !== null) {
            ctx.fillText(`Position: (${Math.round(this.selectedNebula.x)}, ${Math.round(this.selectedNebula.y)})`, panelX + 10, lineY);
            lineY += lineHeight;
        }
        
        // Discovery timestamp if available
        if (this.selectedNebula.timestamp) {
            const date = new Date(this.selectedNebula.timestamp);
            const dateStr = date.toLocaleDateString();
            ctx.fillText(`Discovered: ${dateStr}`, panelX + 10, lineY);
        }
    }

    renderBlackHoleInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
        if (!this.selectedBlackHole || !this.namingService) return;
        
        // Panel dimensions and position (consistent with other panels)
        const panelWidth = 300;
        const panelHeight = 140;
        const panelX = canvas.width - panelWidth - 20;
        const panelY = 60;
        
        // Draw panel background (consistent with other panels)
        ctx.save();
        ctx.fillStyle = '#000000E0';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        ctx.strokeStyle = '#2a3a4a';
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
        
        // Setup text
        ctx.font = '12px monospace';
        ctx.fillStyle = '#FFFFFF';
        let lineY = panelY + 20;
        const lineHeight = 18;
        
        // Black hole designation
        const blackHoleName = this.generateBlackHoleDisplayName(this.selectedBlackHole);
        ctx.fillText(`Designation: ${blackHoleName}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Black hole type with scientific description
        let typeDescription = this.selectedBlackHole.blackHoleTypeName;
        if (this.selectedBlackHole.blackHoleTypeName === 'supermassive') {
            typeDescription = 'Supermassive (10⁶-10¹⁰ M☉)';
        } else if (this.selectedBlackHole.blackHoleTypeName === 'stellar') {
            typeDescription = 'Stellar-mass (3-30 M☉)';
        }
        ctx.fillText(`Type: ${typeDescription}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Gravitational influence note
        ctx.fillText(`Event Horizon: Active`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Black hole position
        ctx.fillText(`Position: (${Math.round(this.selectedBlackHole.x)}, ${Math.round(this.selectedBlackHole.y)})`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Discovery timestamp if available
        if (this.selectedBlackHole.timestamp) {
            const date = new Date(this.selectedBlackHole.timestamp);
            const dateStr = date.toLocaleDateString();
            ctx.fillText(`Discovered: ${dateStr}`, panelX + 10, lineY);
        }
        
        ctx.restore();
    }

    generateNebulaDisplayName(nebula: NebulaLike): string {
        // Use stored nebula name from discovery data if available
        if (nebula.objectName) {
            return nebula.objectName;
        }

        // Fallback to naming service if no stored name
        if (!this.namingService) {
            return `Nebula`;
        }

        // Generate name using naming service
        try {
            return this.namingService.generateDisplayName(nebula);
        } catch (error) {
            console.warn('Failed to generate nebula name:', error);
            return `Nebula`;
        }
    }

    renderCometInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
        if (!this.selectedComet || !this.namingService) return;
        
        // Panel dimensions and position (consistent with other panels)
        const panelWidth = 320;
        const panelHeight = 140;
        const panelX = canvas.width - panelWidth - 20;
        const panelY = 60;
        
        // Draw panel background
        ctx.fillStyle = '#000000E0';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        ctx.strokeStyle = '#2a3a4a';
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
        
        // Panel content
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px "Courier New", monospace';
        
        let lineY = panelY + 20;
        const lineHeight = 18;
        
        // Comet designation
        const cometName = this.generateCometDisplayName(this.selectedComet);
        ctx.fillText(`Designation: ${cometName}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Comet type
        const cometTypeName = this.selectedComet.cometType?.name || 'Unknown Comet';
        ctx.fillText(`Type: ${cometTypeName}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Orbital characteristics if available
        if (this.selectedComet.parentStarX !== undefined && this.selectedComet.parentStarY !== undefined) {
            const distance = Math.sqrt(
                (this.selectedComet.x - this.selectedComet.parentStarX) ** 2 + 
                (this.selectedComet.y - this.selectedComet.parentStarY) ** 2
            );
            ctx.fillText(`Current Distance: ${distance.toFixed(1)} AU`, panelX + 10, lineY);
            lineY += lineHeight;
            
            // Show orbital data if available
            if ((this.selectedComet as any).orbit) {
                const orbit = (this.selectedComet as any).orbit;
                ctx.fillText(`Eccentricity: ${orbit.eccentricity.toFixed(3)}`, panelX + 10, lineY);
                lineY += lineHeight;
            }
        }
        
        // Composition note
        ctx.fillText(`Composition: Ice and Rock`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Comet position
        ctx.fillText(`Position: (${Math.round(this.selectedComet.x)}, ${Math.round(this.selectedComet.y)})`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Discovery timestamp if available
        if (this.selectedComet.timestamp) {
            const date = new Date(this.selectedComet.timestamp);
            const dateStr = date.toLocaleDateString();
            ctx.fillText(`Discovered: ${dateStr}`, panelX + 10, lineY);
        }
    }

    renderAsteroidGardenInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
        if (!this.selectedAsteroidGarden || !this.namingService) return;
        
        // Panel dimensions and position (same as other panels)
        const panelWidth = 300;
        const panelHeight = 120;
        const panelX = canvas.width - panelWidth - 20;
        const panelY = 60;
        
        // Draw panel background (same style as other panels)
        ctx.fillStyle = '#000000E0';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        ctx.strokeStyle = '#2a3a4a';
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
        
        // Panel content (same style as other panels)
        ctx.fillStyle = '#b0c4d4';
        ctx.font = '12px "Courier New", monospace';
        
        let lineY = panelY + 20;
        const lineHeight = 14;
        
        // Asteroid garden designation
        const gardenName = this.generateAsteroidGardenDisplayName(this.selectedAsteroidGarden);
        ctx.fillText(`Designation: ${gardenName}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Garden type
        const gardenTypeName = this.selectedAsteroidGarden.gardenTypeData?.name || this.selectedAsteroidGarden.gardenType;
        ctx.fillText(`Type: ${gardenTypeName}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Garden position
        ctx.fillText(`Position: (${this.selectedAsteroidGarden.x.toFixed(0)}, ${this.selectedAsteroidGarden.y.toFixed(0)})`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Discovery timestamp if available
        if (this.selectedAsteroidGarden.timestamp) {
            const date = new Date(this.selectedAsteroidGarden.timestamp);
            const dateStr = date.toLocaleDateString();
            ctx.fillText(`Discovered: ${dateStr}`, panelX + 10, lineY);
        }
    }

    renderRoguePlanetInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
        if (!this.selectedRoguePlanet || !this.namingService) return;
        
        // Panel dimensions and position (same as other panels)
        const panelWidth = 300;
        const panelHeight = 120;
        const panelX = canvas.width - panelWidth - 20;
        const panelY = 60;
        
        // Draw panel background (same style as other panels)
        ctx.fillStyle = '#000000E0';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        ctx.strokeStyle = '#2a3a4a';
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
        
        // Panel content (same style as other panels)
        ctx.fillStyle = '#b0c4d4';
        ctx.font = '12px "Courier New", monospace';
        
        let lineY = panelY + 20;
        const lineHeight = 14;
        
        // Rogue planet designation
        const roguePlanetName = this.generateRoguePlanetDisplayName(this.selectedRoguePlanet);
        ctx.fillText(`Designation: ${roguePlanetName}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Rogue planet variant/type
        const variantName = this.selectedRoguePlanet.variant ? 
            this.selectedRoguePlanet.variant.charAt(0).toUpperCase() + this.selectedRoguePlanet.variant.slice(1) + ' Rogue Planet' :
            'Rogue Planet';
        ctx.fillText(`Type: ${variantName}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Orbital status
        ctx.fillText(`Status: Unbound (No Parent Star)`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Position
        ctx.fillText(`Position: (${Math.round(this.selectedRoguePlanet.x)}, ${Math.round(this.selectedRoguePlanet.y)})`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Discovery timestamp if available
        if (this.selectedRoguePlanet.timestamp) {
            const date = new Date(this.selectedRoguePlanet.timestamp);
            const dateStr = date.toLocaleDateString();
            ctx.fillText(`Discovered: ${dateStr}`, panelX + 10, lineY);
        }
    }

    renderWormholeInfoPanel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
        if (!this.selectedWormhole || !this.namingService) return;
        
        // Panel dimensions and position (same as other panels)
        const panelWidth = 300;
        const panelHeight = 140; // Slightly taller for wormhole-specific info
        const panelX = canvas.width - panelWidth - 20;
        const panelY = 60;
        
        // Draw panel background (same style as other panels)
        ctx.fillStyle = '#000000E0';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        ctx.strokeStyle = '#2a3a4a';
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
        
        // Panel content (same style as other panels)
        ctx.fillStyle = '#b0c4d4';
        ctx.font = '12px "Courier New", monospace';
        
        let lineY = panelY + 20;
        const lineHeight = 14;
        
        // Wormhole designation
        const wormholeName = this.generateWormholeDisplayName(this.selectedWormhole);
        ctx.fillText(`Designation: ${wormholeName}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Wormhole type and designation
        const designation = this.selectedWormhole.designation === 'alpha' ? 'α (Primary)' : 'β (Secondary)';
        ctx.fillText(`Type: Stable Traversable (${designation})`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Twin coordinates
        ctx.fillText(`Twin Location: (${Math.round(this.selectedWormhole.twinX)}, ${Math.round(this.selectedWormhole.twinY)})`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Current position
        ctx.fillText(`Position: (${Math.round(this.selectedWormhole.x)}, ${Math.round(this.selectedWormhole.y)})`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Wormhole ID (for scientific reference)
        ctx.fillText(`ID: ${this.selectedWormhole.wormholeId}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Discovery timestamp if available
        if (this.selectedWormhole.timestamp) {
            const date = new Date(this.selectedWormhole.timestamp);
            const dateStr = date.toLocaleDateString();
            ctx.fillText(`Discovered: ${dateStr}`, panelX + 10, lineY);
        }
    }

    generateWormholeDisplayName(wormhole: WormholeLike): string {
        // Use stored wormhole name from discovery data if available
        if (wormhole.objectName) {
            return wormhole.objectName;
        }

        // Fallback to naming service if no stored name
        if (!this.namingService) {
            return `${wormhole.wormholeId}-${wormhole.designation === 'alpha' ? 'α' : 'β'}`;
        }

        const displayName = this.namingService.generateDisplayName(wormhole);
        return displayName || `${wormhole.wormholeId}-${wormhole.designation === 'alpha' ? 'α' : 'β'}`;
    }

    generateAsteroidGardenDisplayName(asteroidGarden: AsteroidGardenLike): string {
        // Use stored asteroid garden name from discovery data if available
        if (asteroidGarden.objectName) {
            return asteroidGarden.objectName;
        }

        // Fallback to naming service if no stored name
        if (!this.namingService) {
            return `Asteroid Garden`;
        }

        // Generate name using naming service
        try {
            return this.namingService.generateDisplayName(asteroidGarden);
        } catch (_error) {
            return `Asteroid Garden`;
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

    generateCometDisplayName(comet: CometLike): string {
        // Use stored comet name from discovery data if available
        if (comet.objectName) {
            return comet.objectName;
        }

        // Fallback based on comet type
        if (comet.cometType?.name) {
            return comet.cometType.name;
        } else {
            return 'Comet';
        }
    }

    generateBlackHoleDisplayName(blackHole: BlackHoleLike): string {
        // Use stored black hole name from discovery data if available
        if (blackHole.objectName) {
            return blackHole.objectName;
        }

        // Fallback based on black hole type
        if (blackHole.blackHoleTypeName === 'supermassive') {
            return 'Supermassive Black Hole';
        } else if (blackHole.blackHoleTypeName === 'stellar') {
            return 'Stellar Black Hole';
        } else {
            return 'Black Hole';
        }
    }

    generatePlanetDisplayName(planet: PlanetLike): string {
        // Use stored planet name from discovery data if available
        if (planet.objectName) {
            return planet.objectName;
        }

        // Fallback to naming service if no stored name
        if (!this.namingService) {
            return `Planet ${planet.planetIndex + 1}`;
        }

        try {
            // Construct a planet object with the properties the naming service expects
            const mockParentStar = {
                x: planet.parentStarX,
                y: planet.parentStarY,
                type: 'star'
            };

            const mockPlanet = {
                type: 'planet',
                parentStar: mockParentStar,
                planetTypeName: planet.planetTypeName,
                planetIndex: planet.planetIndex,
                x: planet.x || planet.parentStarX, // Fallback to star position if planet position not available
                y: planet.y || planet.parentStarY
            };

            return this.namingService.generateDisplayName(mockPlanet);
        } catch (error) {
            console.warn('Failed to generate planet name:', error);
            return `Planet ${planet.planetIndex + 1}`;
        }
    }

    // === INSPECTOR MODE METHODS ===

    /**
     * Initialize inspector mode with seed inspector service
     */
    initInspectorMode(seedInspectorService: SeedInspectorService): void {
        this.inspectorService = seedInspectorService;
    }

    /**
     * Enable inspector mode with a specific seed
     * @param seed - Universe seed to inspect
     */
    async enableInspectorMode(seed: number): Promise<void> {
        if (!this.inspectorService) {
            throw new Error('Inspector service not initialized. Call initInspectorMode() first.');
        }

        this.inspectorMode = true;
        this.inspectorSeed = seed;
        this.inspectorZoomExtended = true;
        this.statisticsOverlayEnabled = true;

        // Reveal initial area around current position
        const result = await this.revealChunks(seed, this.centerX, this.centerY, 2);
        if (result.newChunks > 0) {
            console.log(`📍 Revealed ${result.newChunks} new chunks (${result.totalChunks} total in area)`);
        } else {
            console.log(`📍 All ${result.totalChunks} chunks in area already revealed`);
        }
        console.log(`🔍 Inspector mode enabled for seed ${seed}`);
    }

    /**
     * Disable inspector mode and return to discovered-only view
     */
    disableInspectorMode(): void {
        this.inspectorMode = false;
        this.inspectorSeed = null;
        this.inspectorObjects = [];
        this.inspectorZoomExtended = false;
        console.log('🔍 Inspector mode disabled - showing discovered objects only');
    }

    /**
     * Toggle between inspector mode and normal mode
     */
    toggleInspectorMode(): void {
        if (this.inspectorMode) {
            this.disableInspectorMode();
        } else if (this.inspectorSeed) {
            // Re-enable with last used seed
            this.enableInspectorMode(this.inspectorSeed);
        }
    }

    /**
     * Check if inspector mode is active
     */
    isInspectorMode(): boolean {
        return this.inspectorMode;
    }

    /**
     * Legacy method - now using persistent revealed chunks system
     * This method is kept for backward compatibility but doesn't perform real-time generation
     */
    private async refreshInspectorData(): Promise<void> {
        // Inspector mode now uses persistent revealed chunks
        // Statistics are updated when chunks are revealed
        if (this.statisticsOverlayEnabled && this.inspectorSeed) {
            await this.updateViewStatistics();
        }
    }

    /**
     * Enable statistics overlay
     */
    enableStatisticsOverlay(): void {
        this.statisticsOverlayEnabled = true;
        if (this.inspectorMode) {
            this.updateViewStatistics();
        }
    }

    /**
     * Disable statistics overlay
     */
    disableStatisticsOverlay(): void {
        this.statisticsOverlayEnabled = false;
        this.currentViewStatistics = null;
    }

    /**
     * Toggle statistics overlay on/off
     */
    toggleStatisticsOverlay(): void {
        if (this.statisticsOverlayEnabled) {
            this.disableStatisticsOverlay();
        } else {
            this.enableStatisticsOverlay();
        }
    }

    /**
     * Generate unique key for chunk identification
     */
    private getChunkKey(seed: number, chunkX: number, chunkY: number): string {
        return `${seed}_${chunkX}_${chunkY}`;
    }

    /**
     * Check if a specific chunk is already revealed
     */
    isChunkRevealed(seed: number, chunkX: number, chunkY: number): boolean {
        return this.revealedChunks.has(this.getChunkKey(seed, chunkX, chunkY));
    }

    /**
     * Add chunk data to revealed areas
     */
    private addRevealedChunk(seed: number, chunkX: number, chunkY: number, objects: CelestialObjectData[]): void {
        const key = this.getChunkKey(seed, chunkX, chunkY);
        this.revealedChunks.set(key, objects);
        this.revealedChunksMetadata.set(key, {
            timestamp: Date.now(),
            seed: seed,
            chunkX: chunkX,
            chunkY: chunkY
        });
    }

    /**
     * Get all revealed objects for the current seed
     */
    private getRevealedObjects(seed: number): CelestialObjectData[] {
        const objects: CelestialObjectData[] = [];
        for (const [key, chunkObjects] of this.revealedChunks.entries()) {
            const metadata = this.revealedChunksMetadata.get(key);
            if (metadata && metadata.seed === seed) {
                objects.push(...chunkObjects);
            }
        }
        return objects;
    }

    /**
     * Clear all revealed chunks for current or specified seed
     */
    clearRevealedChunks(seed?: number): void {
        if (seed === undefined) {
            // Clear all revealed chunks
            this.revealedChunks.clear();
            this.revealedChunksMetadata.clear();
            console.log('🧹 Cleared all revealed chunks');
        } else {
            // Clear chunks for specific seed
            const keysToDelete: string[] = [];
            for (const [key, metadata] of this.revealedChunksMetadata.entries()) {
                if (metadata.seed === seed) {
                    keysToDelete.push(key);
                }
            }
            
            keysToDelete.forEach(key => {
                this.revealedChunks.delete(key);
                this.revealedChunksMetadata.delete(key);
            });
            
            console.log(`🧹 Cleared ${keysToDelete.length} revealed chunks for seed ${seed}`);
        }
    }

    /**
     * Reveal chunks around a center position with specified radius
     */
    async revealChunks(seed: number, centerWorldX: number, centerWorldY: number, chunkRadius: number = 2): Promise<{ newChunks: number; totalChunks: number }> {
        if (!this.inspectorService) {
            throw new Error('Inspector service not initialized');
        }

        // Convert world coordinates to chunk coordinates
        const chunkSize = GameConstants.DEFAULT_CHUNK_SIZE;
        const centerChunkX = Math.floor(centerWorldX / chunkSize);
        const centerChunkY = Math.floor(centerWorldY / chunkSize);

        let newChunksRevealed = 0;
        let totalChunksInArea = 0;

        // Performance warning for large areas
        const totalChunks = (chunkRadius * 2 + 1) * (chunkRadius * 2 + 1);
        if (totalChunks > 1000) {
            console.warn(`⚠️ Large reveal requested: ${totalChunks} chunks. This may take a while...`);
        }

        // Generate chunks in the specified radius
        for (let dx = -chunkRadius; dx <= chunkRadius; dx++) {
            for (let dy = -chunkRadius; dy <= chunkRadius; dy++) {
                const chunkX = centerChunkX + dx;
                const chunkY = centerChunkY + dy;
                totalChunksInArea++;

                // Skip if chunk is already revealed
                if (this.isChunkRevealed(seed, chunkX, chunkY)) {
                    continue;
                }

                // Generate objects for this chunk
                const chunkCenterX = chunkX * chunkSize + chunkSize / 2;
                const chunkCenterY = chunkY * chunkSize + chunkSize / 2;
                
                try {
                    // Generate single chunk (radius = 0 means just the center chunk)
                    const chunkObjects = await this.inspectorService.getRegionObjects(
                        seed,
                        chunkCenterX,
                        chunkCenterY,
                        0
                    );

                    // Add to revealed chunks
                    this.addRevealedChunk(seed, chunkX, chunkY, chunkObjects);
                    newChunksRevealed++;
                } catch (error) {
                    console.warn('Failed to reveal chunks:', error);
                    // Continue with other chunks even if one fails
                }
            }
        }

        // Update inspector objects to use all revealed chunks for current seed
        this.inspectorObjects = this.getRevealedObjects(seed);

        // Update statistics if new chunks were revealed
        if (newChunksRevealed > 0 && this.statisticsOverlayEnabled) {
            await this.updateViewStatistics();
        }

        return {
            newChunks: newChunksRevealed,
            totalChunks: totalChunksInArea
        };
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
     * Update statistics across all revealed chunks for current seed
     */
    private async updateViewStatistics(): Promise<void> {
        if (!this.inspectorSeed) return;

        try {
            // Get all revealed objects for current seed
            const revealedObjects = this.getRevealedObjects(this.inspectorSeed);
            console.log(`🎯 DEBUG: updateViewStatistics - Found ${revealedObjects.length} revealed objects total`);
            
            if (revealedObjects.length === 0) {
                this.currentViewStatistics = null;
                return;
            }

            // Count objects by type from revealed chunks
            const objectCounts: Record<string, number> = {
                'celestialStar': 0,
                'planet': 0,
                'moon': 0,
                'nebula': 0,
                'asteroidGarden': 0,
                'wormhole': 0,
                'blackhole': 0,
                'comet': 0,
                'rogue-planet': 0,
                'dark-nebula': 0,
                'crystal-garden': 0,
                'protostar': 0
            };

            // Count objects from revealed chunks
            const debugObjectCounts: Record<string, number> = {};
            for (const obj of revealedObjects) {
                // Track for debugging
                debugObjectCounts[obj.type] = (debugObjectCounts[obj.type] || 0) + 1;
                
                if (Object.prototype.hasOwnProperty.call(objectCounts, obj.type)) {
                    objectCounts[obj.type]++;
                } else {
                    objectCounts[obj.type] = 1;
                }
            }
            
            console.log(`📊 DEBUG: Raw object counts from revealed chunks:`, debugObjectCounts);
            console.log(`📊 DEBUG: Final object counts:`, objectCounts);

            // Calculate total meaningful objects (exclude background stars for density)
            const totalObjects = objectCounts.celestialStar + objectCounts.planet + 
                               objectCounts.moon + objectCounts.nebula + 
                               objectCounts.asteroidGarden + objectCounts.wormhole + 
                               objectCounts.blackhole + objectCounts.comet + 
                               objectCounts['rogue-planet'] + objectCounts['dark-nebula'] +
                               objectCounts['crystal-garden'] + objectCounts['protostar'];

            // Calculate area from revealed chunks count
            const revealedChunkCount = this.getRevealedChunkCount(this.inspectorSeed);
            const regionArea = revealedChunkCount * 1000000; // Each chunk is 1000x1000 units

            const density = totalObjects / (regionArea / 1000000); // Objects per million square units

            this.currentViewStatistics = {
                objectCounts,
                totalObjects,
                density,
                regionArea
            };
        } catch (error) {
            console.warn('Failed to update view statistics:', error);
            this.currentViewStatistics = null;
        }
    }

    /**
     * Get count of revealed chunks for a specific seed
     */
    private getRevealedChunkCount(seed: number): number {
        let count = 0;
        for (const metadata of this.revealedChunksMetadata.values()) {
            if (metadata.seed === seed) {
                count++;
            }
        }
        return count;
    }

    /**
     * Get inspector object color based on type and mode
     */
    private getInspectorObjectColor(objectType: string): string {
        const colors = {
            celestialStar: '#ffdd88',       // Bright yellow for discoverable stars  
            planet: '#88aa88',              // Green for planets
            moon: '#cccccc',                // Light gray for moons
            nebula: '#ff88cc',              // Pink for nebulae
            asteroidGarden: '#cc8844',      // Orange for asteroid gardens
            wormhole: '#8844ff',            // Purple for wormholes
            blackhole: '#ff0000',           // Red for black holes
            comet: '#88ccff',               // Light blue for comets
            'rogue-planet': '#cc88aa',      // Muted purple for rogue planets
            'dark-nebula': '#6a4a3a',       // Medium brown for dark nebulae (visible against black space)
            'crystal-garden': '#44ffcc',    // Cyan-green for crystal gardens (light refraction theme)
            'protostar': '#ffaa44'          // Orange-yellow for protostars (stellar formation theme)
        };
        return colors[objectType] || '#ffffff';
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

            const color = this.getInspectorObjectColor(obj.type);
            
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
            const color = this.getInspectorObjectColor(type);
            
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

    generateRoguePlanetDisplayName(roguePlanet: any): string {
        if (this.namingService) {
            return this.namingService.generateDisplayName(roguePlanet);
        }
        return `RP-Unknown`;
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