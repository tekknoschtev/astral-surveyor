// Main game orchestration and loop - now uses modular components
// TypeScript conversion with comprehensive type definitions

// Import all dependencies
import { Renderer } from './graphics/renderer.js';
import { Input } from './input/input.js';
import { Camera } from './camera/camera.js';
import { ChunkManager, InfiniteStarField } from './world/world.js';
import { Ship, ThrusterParticles, StarParticles } from './ship/ship.js';
import { DiscoveryDisplay } from './ui/ui.js';
import { DiscoveryLogbook } from './ui/discoverylogbook.js';
import { StellarMap } from './ui/stellarmap.js';
import { NamingService } from './naming/naming.js';
import { TouchUI } from './ui/touchui.js';
import { SoundManager } from './audio/soundmanager.js';
import { GameConfig } from './config/gameConfig.js';
import { DiscoveryManager } from './services/DiscoveryManager.js';
import { StateManager } from './services/StateManager.js';
import { DebugSpawner } from './debug/debug-spawner.js';
import { DeveloperConsole } from './debug/DeveloperConsole.js';
import { CommandRegistry } from './debug/CommandRegistry.js';
import { AudioService } from './services/AudioService.js';
import { SettingsService } from './services/SettingsService.js';
import { SettingsMenu } from './ui/SettingsMenu.js';
import { StorageService } from './services/StorageService.js';
import { SaveLoadService } from './services/SaveLoadService.js';
import { EventDispatcher } from './services/EventSystem.js';
import { ConfirmationDialog } from './ui/ConfirmationDialog.js';
import { SeedInspectorService } from './debug/SeedInspectorService.js';
// Type imports will be cleaned up in Phase 2 when we extract celestial classes
import { 
    initializeUniverseSeed, 
    getStartingCoordinates, 
    generateShareableURL
} from './utils/random.js';
// Note: Will add proper types in future phases when we extract celestial classes

// Interface definitions
interface GameStartingPosition {
    x: number;
    y: number;
}

// Interface for objects in the active game world (these are class instances, not data)
interface CelestialObject {
    type: 'star' | 'planet' | 'moon' | 'nebula' | 'asteroids' | 'wormhole' | 'blackhole' | 'comet';
    x: number;
    y: number;
    id?: string;
    starTypeName?: string;
    planetTypeName?: string;
    nebulaTypeData?: { name: string };
    wormholeId?: string;
    designation?: 'alpha' | 'beta';
    pairId?: string;
    blackHoleTypeName?: string;
    twinX?: number;
    twinY?: number;
    uniqueId?: string;
    canTraverse?: boolean | ((camera: Camera) => boolean);
    nebulaType?: string;
    gardenType?: string;
    gardenTypeData?: { name: string };
    // Preview object properties (added dynamically)
    relativeX?: number;
    relativeY?: number;
    distance?: number;
    updatePosition?(deltaTime: number): void;
    update?(deltaTime: number): void;
    checkDiscovery?(camera: Camera, canvasWidth: number, canvasHeight: number): boolean;
    render?(renderer: Renderer, camera: Camera): void;
    getDestinationCoordinates?(velocityX: number, velocityY: number): { x: number; y: number };
}

interface ActiveObjects {
    planets: CelestialObject[];
    moons: CelestialObject[];
    celestialStars: CelestialObject[];
    nebulae: CelestialObject[];
    wormholes: CelestialObject[];
    blackholes: CelestialObject[];
    asteroidGardens: CelestialObject[];
    comets: CelestialObject[];
}


export class Game {
    renderer: Renderer;
    input: Input;
    camera: Camera;
    chunkManager: ChunkManager;
    starField: InfiniteStarField;
    ship: Ship;
    thrusterParticles: ThrusterParticles;
    starParticles: StarParticles;
    discoveryDisplay: DiscoveryDisplay;
    discoveryLogbook: DiscoveryLogbook;
    stellarMap: StellarMap;
    namingService: NamingService;
    touchUI: TouchUI;
    soundManager: SoundManager;
    discoveryManager: DiscoveryManager;
    stateManager: StateManager;
    commandRegistry: CommandRegistry;
    developerConsole: DeveloperConsole;
    audioService: AudioService;
    settingsService: SettingsService;
    storageService: StorageService;
    saveLoadService: SaveLoadService;
    eventSystem: EventDispatcher;
    confirmationDialog: ConfirmationDialog;
    seedInspectorService: SeedInspectorService;
    
    // Performance optimization: Cache active objects between update and render phases
    private cachedActiveObjects?: ActiveObjects;
    settingsMenu: SettingsMenu;
    
    // Expose properties for backward compatibility with tests
    get lastBlackHoleWarnings() {
        return this.discoveryManager['lastBlackHoleWarnings'];
    }
    
    // Expose state properties for backward compatibility with tests  
    get isTraversing() { return this.stateManager.isTraversing; }
    set isTraversing(value: boolean) { this.stateManager.isTraversing = value; }
    get traversalStartTime() { return this.stateManager.traversalStartTime; }
    set traversalStartTime(value: number) { this.stateManager.traversalStartTime = value; }
    get traversalDuration() { return this.stateManager.traversalDuration; }
    set traversalDuration(value: number) { this.stateManager.traversalDuration = value; }
    get traversalDestination() { return this.stateManager.traversalDestination; }
    set traversalDestination(value: any) { this.stateManager.traversalDestination = value; }
    get distanceSaveTimer() { return this.stateManager.distanceSaveTimer; }
    set distanceSaveTimer(value: number) { this.stateManager.distanceSaveTimer = value; }
    get distanceSaveInterval() { return this.stateManager.distanceSaveInterval; }
    get lastTime() { return this.stateManager.lastTime; }
    set lastTime(value: number) { this.stateManager.lastTime = value; }
    get animationId() { return this.stateManager.animationId; }
    set animationId(value: number) { this.stateManager.animationId = value; }
    get gameStartingPosition() { return this.stateManager.gameStartingPosition; }
    set gameStartingPosition(value: GameStartingPosition) { this.stateManager.gameStartingPosition = value; }
    get isResettingUniverse() { return this.stateManager.isResettingUniverse; }
    set isResettingUniverse(value: boolean) { this.stateManager.isResettingUniverse = value; }
    get resetStartTime() { return this.stateManager.resetStartTime; }
    set resetStartTime(value: number) { this.stateManager.resetStartTime = value; }
    get resetDuration() { return this.stateManager.resetDuration; }
    set resetDuration(value: number) { this.stateManager.resetDuration = value; }
    get debugModeEnabled() { return this.stateManager.debugModeEnabled; }
    get previousThrustState() { return this.stateManager.previousThrustState; }
    set previousThrustState(value: boolean) { this.stateManager.previousThrustState = value; }
    get previousBrakeState() { return this.stateManager.previousBrakeState; }
    set previousBrakeState(value: boolean) { this.stateManager.previousBrakeState = value; }

    constructor(canvas: HTMLCanvasElement) {
        this.renderer = new Renderer(canvas);
        this.input = new Input();
        this.camera = new Camera();
        this.chunkManager = new ChunkManager();
        this.starField = new InfiniteStarField(this.chunkManager);
        this.ship = new Ship();
        this.thrusterParticles = new ThrusterParticles();
        this.starParticles = new StarParticles();
        this.discoveryDisplay = new DiscoveryDisplay();
        this.discoveryLogbook = new DiscoveryLogbook();
        this.stellarMap = new StellarMap();
        this.namingService = new NamingService();
        this.stellarMap.setNamingService(this.namingService);
        this.touchUI = new TouchUI();
        this.soundManager = new SoundManager();
        
        // Initialize audio service wrapper and settings
        this.audioService = this.createAudioServiceWrapper();
        this.settingsService = new SettingsService(this.audioService);
        this.settingsMenu = new SettingsMenu(this.settingsService);
        
        // Initialize save/load services
        this.storageService = new StorageService();
        this.saveLoadService = new SaveLoadService(
            this.storageService,
            this.stateManager,
            this.camera,
            this.discoveryLogbook,
            this.chunkManager,
            undefined, // DiscoveryManager - will be set after initialization
            this.settingsService
        );
        this.confirmationDialog = new ConfirmationDialog();
        
        // Skip audio sync for now to avoid initialization issues
        
        // Set up callbacks for data management features
        this.settingsService.onDistanceReset = () => {
            this.camera.resetLifetimeDistance();
            this.discoveryDisplay.addNotification('Distance traveled has been reset');
        };
        
        this.settingsService.onDiscoveryHistoryClear = () => {
            this.discoveryLogbook.clearHistory();
            this.chunkManager.clearDiscoveryHistory();
            this.discoveryDisplay.addNotification('Discovery history has been cleared');
        };
        
        // Space drone will be started on first user interaction due to browser autoplay policies
        
        this.discoveryManager = new DiscoveryManager(
            this.soundManager,
            this.discoveryDisplay,
            this.discoveryLogbook,
            this.namingService
        );

        // Connect DiscoveryManager to SaveLoadService for persistence
        this.saveLoadService.setDiscoveryManager(this.discoveryManager);
        
        // Connect DiscoveryManager to DiscoveryLogbook for enhanced UI
        this.discoveryLogbook.setDiscoveryManager(this.discoveryManager);
        
        // Connect DiscoveryDisplay to DiscoveryLogbook for notifications
        this.discoveryLogbook.setDiscoveryDisplay(this.discoveryDisplay);
        
        // Initialize developer console
        this.commandRegistry = new CommandRegistry();
        this.developerConsole = new DeveloperConsole(
            this.commandRegistry,
            this.camera,
            this.chunkManager,
            this.stellarMap
        );
        
        // Connect naming service to stellar map
        this.stellarMap.setNamingService(this.namingService);
        
        this.setupCanvas();
        
        // Set camera position from URL parameters if provided
        const startingCoords = getStartingCoordinates();
        if (startingCoords) {
            this.camera.x = startingCoords.x;
            this.camera.y = startingCoords.y;
        }
        
        // Create starting position object for stellar map reference
        const startingPosition = {
            x: this.camera.x,
            y: this.camera.y
        };
        
        // Initialize state manager with starting position and discovery manager
        this.stateManager = new StateManager(startingPosition, this.discoveryManager);
        
        // Initialize event system and set up global access
        this.eventSystem = new EventDispatcher();
        (window as any).gameEventSystem = this.eventSystem;
        
        // Initialize seed inspector service for developer tools
        this.seedInspectorService = new SeedInspectorService(this.chunkManager);
        this.stellarMap.initInspectorMode(this.seedInspectorService);
        
        // Set up save/load event handlers
        this.setupSaveLoadEventHandlers();
        
        // Enable auto-save (5-minute intervals)
        this.saveLoadService.enableAutoSave(5);
        
        // Log lifetime distance traveled
        const lifetimeDistance = this.camera.getFormattedLifetimeDistance();
        if (lifetimeDistance !== '0 km') {
        }
        
        // Initialize chunks around starting position
        this.chunkManager.updateActiveChunks(this.camera.x, this.camera.y);
    }

    setupCanvas(): void {
        this.renderer.canvas.width = window.innerWidth;
        this.renderer.canvas.height = window.innerHeight;
        
        window.addEventListener('resize', () => {
            this.renderer.canvas.width = window.innerWidth;
            this.renderer.canvas.height = window.innerHeight;
        });
    }

    start(): void {
        // Check for existing save and prompt user
        this.checkForExistingSave();
        this.gameLoop(0);
    }

    /**
     * Check for existing save game and auto-load it for seamless experience
     */
    private async checkForExistingSave(): Promise<void> {
        try {
            const saveInfo = await this.saveLoadService.getSaveGameInfo();
            
            if (saveInfo.exists && saveInfo.timestamp) {
                const saveDate = new Date(saveInfo.timestamp).toLocaleString();
                const result = await this.saveLoadService.loadGame();
                
                if (result.success) {
                    // Force chunk reload at loaded position
                    this.chunkManager.clearAllChunks();
                    this.chunkManager.updateActiveChunks(this.camera.x, this.camera.y);
                    
                    // Restore discovery state for newly loaded objects
                    const activeObjects = this.chunkManager.getAllActiveObjects();
                    const flattenedObjects = [
                        ...activeObjects.stars,
                        ...activeObjects.planets, 
                        ...activeObjects.moons,
                        ...activeObjects.nebulae,
                        ...activeObjects.asteroidGardens,
                        ...activeObjects.wormholes,
                        ...activeObjects.blackholes,
                        ...activeObjects.comets
                    ].filter(obj => obj.hasOwnProperty('discovered'));
                    this.chunkManager.restoreDiscoveryState(flattenedObjects);
                    
                    // Center stellar map on loaded position
                    this.stellarMap.centerOnPosition(this.camera.x, this.camera.y);
                    
                    // Show subtle welcome back message with save info
                    this.discoveryDisplay.addNotification(`💾 Welcome back, explorer! (Restored from ${saveDate})`);
                } else {
                    // Graceful fallback to new game on load failure
                    console.warn('Auto-load failed, starting fresh:', result.error);
                    this.discoveryDisplay.addNotification('🌟 Starting fresh exploration!');
                }
            } else {
                // No save exists, start new game silently
                this.discoveryDisplay.addNotification('🌟 Welcome to the cosmos, explorer!');
            }
        } catch (error) {
            console.warn('Failed to check for existing save:', error);
            // Graceful fallback - start new game on any error
            this.discoveryDisplay.addNotification('🌟 Starting fresh exploration!');
        }
    }

    gameLoop = (currentTime: number): void => {
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        try {
            this.update(deltaTime);
            this.render();
        } catch (error) {
            console.error('🔥 Game loop error:', error);
            console.trace("🔍 ERROR STACK TRACE");
            // Don't request another frame if there's an error
            return;
        }

        this.animationId = requestAnimationFrame(this.gameLoop);
    };

    update(deltaTime: number): void {
        this.input.update(deltaTime);
        
        // Handle confirmation dialog input first (highest priority)
        if (this.confirmationDialog.handleInput(this.input)) {
            this.input.clearFrameState();
            return;
        }
        
        // Debug: Check initial state
        if (!this.stateManager) {
            console.error('❌ StateManager not initialized!');
            return;
        }
        
        // Handle wormhole traversal transition
        if (this.stateManager.isTraversing) {
            this.stateManager.updateTraversal(deltaTime, this.camera, this.stellarMap, this.discoveryDisplay, this.chunkManager);
            // Still clear frame state to prevent input corruption during traversal
            this.input.clearFrameState();
            return; // Skip normal updates during traversal
        }
        
        // Handle universe reset transition
        if (this.stateManager.isResettingUniverse) {
            this.stateManager.updateUniverseReset(
                deltaTime, 
                this.camera, 
                this.chunkManager, 
                this.discoveryLogbook,
                this.stellarMap,
                this.soundManager
            );
            // Still clear frame state to prevent input corruption during cosmic transition
            this.input.clearFrameState();
            return; // Skip normal updates during cosmic transition
        }
        
        // Resume audio context and start space drone on first user interaction (required by browsers)
        this.handleAudioContextActivation();
        
        // Handle coordinate copying (C key)
        if (this.input.wasJustPressed('KeyC')) {
            this.copyCurrentCoordinates();
        }
        
        // Handle developer console toggle (tilde key)
        if (this.input.isConsoleTogglePressed()) {
            this.developerConsole.toggle();
            // Route keyboard input to console when active
            if (this.developerConsole.isActive()) {
                this.input.setConsoleInputHandler((event: KeyboardEvent) => 
                    this.developerConsole.handleKeyInput(event)
                );
            } else {
                this.input.setConsoleInputHandler(null);
            }
        }
        
        // Handle map toggle (M key)
        if (this.input.wasJustPressed('KeyM')) {
            this.stellarMap.toggle();
        }
        
        // Handle logbook toggle (L key)
        if (this.input.wasJustPressed('KeyL')) {
            this.discoveryLogbook.toggle();
        }
        
        // H key mute removed - use settings menu instead
        
        // Handle debug commands (development builds only)
        this.handleDebugInput();
        
        // Handle settings menu keyboard shortcuts - consume input to prevent ship movement
        if (this.settingsMenu.isVisible()) {
            // Check for number key tab switches (currently only 1 for Audio)
            if (this.input.wasJustPressed('Digit1')) {
                this.settingsMenu.handleKeyPress('Digit1');
                this.input.consumeTouch(); // Prevent ship movement
            }
            // Future shortcuts (framework preserved):
            // } else if (this.input.wasJustPressed('Digit2')) {
            //     this.settingsMenu.handleKeyPress('Digit2');
            //     this.input.consumeTouch(); // Prevent ship movement
            // } else if (this.input.wasJustPressed('Digit3')) {
            //     this.settingsMenu.handleKeyPress('Digit3');
            //     this.input.consumeTouch(); // Prevent ship movement
        }
        
        // Handle settings menu toggle and close (Escape key)
        if (this.input.wasJustPressed('Escape')) {
            if (this.settingsMenu.isVisible()) {
                this.settingsMenu.handleKeyPress('Escape');
                this.input.consumeTouch(); // Consume escape when closing settings
            } else if (this.stellarMap.isVisible()) {
                this.stellarMap.toggle();
            } else if (this.discoveryLogbook.isVisible()) {
                this.discoveryLogbook.toggle();
            } else {
                // If no UI is open, show settings menu
                this.settingsMenu.show();
            }
        }
        
        // Handle mouse clicks/touch
        if (this.input.wasClicked()) {
            // Check if settings menu handled the input first
            if (this.settingsMenu.isVisible()) {
                this.settingsMenu.handleInput(this.input);
            } else {
                // Reset stellar map pan state on click release
                if (this.stellarMap.isVisible()) {
                    this.stellarMap.resetPanState();
                }
                
                // Check if discovery logbook handled the click first
                if (this.discoveryLogbook.isVisible()) {
                    const logbookHandled = this.discoveryLogbook.handleClick(
                        this.input.getMouseX(), 
                        this.input.getMouseY(), 
                        this.renderer.canvas.width, 
                        this.renderer.canvas.height,
                        this.camera
                    );
                    if (logbookHandled) {
                        this.input.consumeTouch();
                    }
                }
                
                // Check if touch hit any TouchUI buttons first
                const touchAction = this.touchUI.handleTouch(this.input.getMouseX(), this.input.getMouseY());
                if (touchAction) {
                    this.handleTouchAction(touchAction);
                    // Prevent the touch from affecting ship movement
                    this.input.consumeTouch();
                } else if (this.stellarMap.isVisible() && !this.input.isTouchConsumed()) {
                    // First check for statistics overlay clicks
                    const overlayClicked = this.stellarMap.handleStatisticsOverlayClick(
                        this.input.getMouseX(), 
                        this.input.getMouseY(), 
                        this.renderer.canvas
                    );
                    
                    if (!overlayClicked) {
                        // Handle stellar map interactions (simplified) - only if not panning
                        const discovered = this.getDiscoveredObjects();
                        this.stellarMap.handleStarSelection(this.input.getMouseX(), this.input.getMouseY(), discovered.stars, this.renderer.canvas, discovered.planets, discovered.nebulae, discovered.wormholes, discovered.asteroidGardens, discovered.blackHoles, discovered.comets, this.input);
                    }
                }
            }
        }
        
        // Handle continuous mouse/touch input for settings menu and map panning
        if (this.settingsMenu.isVisible() && (this.input.isMousePressed() || this.input.wasClicked())) {
            // Handle settings menu input (including slider dragging)
            this.settingsMenu.handleInput(this.input);
        } else if (this.stellarMap.isVisible() && this.input.isMousePressed()) {
            // Handle mouse movement for map panning
            this.stellarMap.handleMouseMove(this.input.getMouseX(), this.input.getMouseY(), this.renderer.canvas, this.input);
        }
        
        // Always update hover state when stellar map is visible (for cursor feedback)
        if (this.stellarMap.isVisible()) {
            const discovered = this.getDiscoveredObjects();
            this.stellarMap.detectHoverTarget(this.input.getMouseX(), this.input.getMouseY(), this.renderer.canvas, discovered.stars, discovered.planets, discovered.nebulae, discovered.wormholes, discovered.asteroidGardens, discovered.blackHoles, discovered.comets);
            
            // Also update statistics overlay hover state
            this.stellarMap.updateStatisticsOverlayHover(this.input.getMouseX(), this.input.getMouseY(), this.renderer.canvas);
        } else {
            // Reset cursor when map is not visible
            this.stellarMap.updateCursor(this.renderer.canvas);
        }

        // Handle discovery logbook hover effects
        if (this.discoveryLogbook.isVisible()) {
            this.discoveryLogbook.handleMouseMove(
                this.input.getMouseX(), 
                this.input.getMouseY(), 
                this.renderer.canvas.width, 
                this.renderer.canvas.height
            );
        }
        
        // Pinch zoom is now handled in stellarMap.update() via input system
        
        // Update chunk loading based on camera position
        this.chunkManager.updateActiveChunks(this.camera.x, this.camera.y);
        
        // Get active celestial objects for physics and discovery (cache for render phase)
        this.cachedActiveObjects = this.chunkManager.getAllActiveObjects();
        const activeObjects = this.cachedActiveObjects;
        const celestialObjects: CelestialObject[] = [...activeObjects.planets, ...activeObjects.moons, ...activeObjects.celestialStars, ...activeObjects.nebulae, ...activeObjects.asteroidGardens, ...activeObjects.wormholes, ...activeObjects.blackholes, ...activeObjects.comets];
        
        // Update orbital positions and animations for all celestial objects
        this.updateCelestialObjects(activeObjects, deltaTime);
        
        // Update black hole animations and apply gravitational effects
        this.updateBlackHoles(activeObjects.blackholes, deltaTime);
        
        // Restore discovery state for newly loaded objects
        this.chunkManager.restoreDiscoveryState(celestialObjects as any);
        
        this.camera.update(this.input, deltaTime, this.renderer.canvas.width, this.renderer.canvas.height, celestialObjects, this.stellarMap);
        
        // Check for wormhole traversal
        this.checkWormholeTraversal(activeObjects.wormholes);
        
        this.thrusterParticles.update(deltaTime, this.camera, this.ship);
        this.starParticles.update(deltaTime, activeObjects.celestialStars as any, this.camera);
        
        // Ambient sounds disabled for now - focusing on discovery chimes only
        // const velocity = Math.sqrt(this.camera.velocityX ** 2 + this.camera.velocityY ** 2);
        // this.soundManager.updateAmbientForVelocity(velocity, this.camera.isCoasting);
        
        // Ship movement sounds disabled for now - will be tweaked in future
        // this.updateShipAudio();
        this.discoveryDisplay.update(deltaTime);
        this.discoveryLogbook.update(deltaTime, this.input);
        this.stellarMap.update(deltaTime, this.camera, this.input);
        this.touchUI.update(deltaTime, this.renderer.canvas, this.stellarMap, this.discoveryLogbook);
        
        // Handle mouse wheel scrolling for logbook
        const wheelDelta = this.input.getWheelDelta();
        if (wheelDelta !== 0 && this.discoveryLogbook.isMouseOver(this.input.getMouseX(), this.input.getMouseY(), this.renderer.canvas.width, this.renderer.canvas.height)) {
            this.discoveryLogbook.handleMouseWheel(wheelDelta);
        }
        
        // Check for discoveries
        this.processDiscoveries(celestialObjects);
        
        // Periodically save distance traveled data
        this.stateManager.updateDistanceSaving(deltaTime, this.camera);
        
        // Clear frame state at end of update
        this.input.clearFrameState();
    }

    /**
     * Update orbital positions and animations for all celestial objects
     */
    private updateCelestialObjects(activeObjects: ActiveObjects, deltaTime: number): void {
        // Update orbital positions for planets and moons
        for (const planet of activeObjects.planets) {
            if (planet.updatePosition) {
                planet.updatePosition(deltaTime);
            }
        }
        for (const moon of activeObjects.moons) {
            if (moon.updatePosition) {
                moon.updatePosition(deltaTime);
            }
        }
        
        // Update comet orbital positions and visual properties
        for (const comet of activeObjects.comets) {
            if (comet.updatePosition) {
                comet.updatePosition(deltaTime);
            }
            if (comet.update) {
                comet.update(deltaTime);
            }
        }
        
        // Update wormhole animations and effects
        for (const wormhole of activeObjects.wormholes) {
            if (wormhole.update) {
                wormhole.update(deltaTime);
            }
        }
    }

    /**
     * Update black hole animations and handle gravitational effects
     */
    private updateBlackHoles(blackHoles: any[], deltaTime: number): void {
        for (const blackHole of blackHoles) {
            if (blackHole.update) {
                blackHole.update(deltaTime);
            }
            
            // Apply gravitational effects to camera/ship
            if (blackHole.updateGravitationalEffects) {
                const gravEffects = blackHole.updateGravitationalEffects(this.camera, deltaTime);
                
                // Apply gravitational pull to ship movement
                if (gravEffects.pullForceX !== 0 || gravEffects.pullForceY !== 0) {
                    this.camera.velocityX += gravEffects.pullForceX * deltaTime;
                    this.camera.velocityY += gravEffects.pullForceY * deltaTime;
                }
                
                // Handle proximity warnings - Phase 1 Safety System
                if (gravEffects.warningLevel > 0) {
                    const warningMessage = blackHole.getProximityWarning();
                    if (warningMessage) {
                        this.discoveryManager.displayBlackHoleWarning(warningMessage, gravEffects.warningLevel, gravEffects.isPastEventHorizon, blackHole.uniqueId);
                    }
                }
            }
            
            // Check for singularity collision (universe reset)
            if (blackHole.checkSingularityCollision && blackHole.checkSingularityCollision(this.camera)) {
                if (!this.stateManager.isResettingUniverse) {
                    this.stateManager.initiateUniverseReset();
                    this.discoveryDisplay.addNotification('🚨 Singularity Contact - Cosmic Rebirth Initiated');
                }
            }
        }
    }

    /**
     * Process discovery checks for all celestial objects
     */
    private processDiscoveries(celestialObjects: CelestialObject[]): void {
        for (const obj of celestialObjects) {
            if (obj.checkDiscovery && obj.checkDiscovery(this.camera, this.renderer.canvas.width, this.renderer.canvas.height)) {
                // Process discovery using DiscoveryManager
                this.discoveryManager.processDiscovery(obj, this.camera, this.chunkManager);
            }
        }
    }

    /**
     * Get all discovered objects from chunk manager
     */
    private getDiscoveredObjects() {
        return {
            stars: this.chunkManager.getDiscoveredStars(),
            planets: this.chunkManager.getDiscoveredPlanets(),
            nebulae: this.chunkManager.getDiscoveredNebulae(),
            wormholes: this.chunkManager.getDiscoveredWormholes(),
            asteroidGardens: this.chunkManager.getDiscoveredAsteroidGardens(),
            blackHoles: this.chunkManager.getDiscoveredBlackHoles(),
            comets: this.chunkManager.getDiscoveredComets()
        };
    }

    copyCurrentCoordinates(): void {
        const shareableURL = generateShareableURL(this.camera.x, this.camera.y);
        
        // Try to copy to clipboard
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareableURL).then(() => {
                this.discoveryDisplay.addNotification('Coordinates copied to clipboard!');
            }).catch(err => {
                console.warn('Failed to copy to clipboard:', err);
                this.showFallbackCopy(shareableURL);
            });
        } else {
            // Fallback for browsers without clipboard API
            this.showFallbackCopy(shareableURL);
        }
    }

    showFallbackCopy(_url: string): void {
        this.discoveryDisplay.addNotification('Copy URL from console to share coordinates');
    }


    // Delegate methods for backward compatibility with tests
    isRareDiscovery(obj: CelestialObject): boolean {
        return this.discoveryManager.isRareDiscovery(obj);
    }

    updateShipAudio(): void {
        const isThrusting = this.camera.isThrusting && !this.camera.isBraking;
        const isBraking = this.camera.isBraking;
        
        // Play thrust start sound when beginning to thrust
        if (isThrusting && !this.previousThrustState) {
            this.soundManager.playThrusterStart();
        }
        
        // Play brake sound when beginning to brake
        if (isBraking && !this.previousBrakeState) {
            this.soundManager.playBrake();
        }
        
        // Update previous states
        this.previousThrustState = isThrusting;
        this.previousBrakeState = isBraking;
    }




    handleDebugInput(): void {
        // Only process debug input if debug mode is enabled
        if (!this.debugModeEnabled) {
            return;
        }

        // Handle debug help (Shift + H)
        if (this.input.isDebugHelpRequested()) {
            DebugSpawner.showDebugHelp();
        }

        // Handle wormhole spawning (Shift + W)
        if (this.input.isDebugWormholeSpawn()) {
            DebugSpawner.spawnWormholePair(this.camera, this.chunkManager, this.debugModeEnabled);
            this.discoveryDisplay.addNotification('🌀 DEBUG: Wormhole pair spawned nearby');
        }

        // Handle black hole spawning (Shift + B)
        if (this.input.isDebugBlackHoleSpawn()) {
            DebugSpawner.spawnBlackHole(this.camera, this.chunkManager, undefined, this.debugModeEnabled);
            this.discoveryDisplay.addNotification('🕳️ DEBUG: Black hole spawned nearby - use caution!');
        }

        // Handle chunk inspection (Shift + I)
        if (this.input.isDebugInspectRequested()) {
            DebugSpawner.inspectCurrentChunk(this.camera, this.chunkManager);
        }
    }

    handleTouchAction(action: string): void {
        switch (action) {
            case 'toggleMap':
                this.stellarMap.toggle();
                if (this.stellarMap.isVisible()) {
                    this.touchUI.showMapControls(this.renderer.canvas);
                } else {
                    this.touchUI.hideMapControls();
                }
                break;
                
            case 'toggleLogbook':
                this.discoveryLogbook.toggle();
                break;
                
            case 'closeMap':
                this.stellarMap.toggle();
                this.touchUI.hideMapControls();
                break;
                
            case 'zoomIn':
                this.stellarMap.zoomIn();
                break;
                
            case 'zoomOut':
                this.stellarMap.zoomOut();
                break;
                
            case 'followShip':
                this.stellarMap.enableFollowPlayer(this.camera);
                break;
        }
    }

    checkWormholeTraversal(wormholes: CelestialObject[]): void {
        // Skip if already traversing
        if (this.isTraversing) {
            return;
        }

        for (const wormhole of wormholes) {
            if (wormhole.canTraverse && (typeof wormhole.canTraverse === 'function' ? wormhole.canTraverse(this.camera) : wormhole.canTraverse)) {
                // Ship is within wormhole - initiate traversal
                this.initiateWormholeTraversal(wormhole);
                return; // Only traverse one wormhole per frame
            }
        }
    }

    initiateWormholeTraversal(wormhole: CelestialObject): void {
        // Store destination and momentum (pass velocity for smart exit positioning)
        const destination = wormhole.getDestinationCoordinates(this.camera.velocityX, this.camera.velocityY);
        
        // Start traversal using StateManager
        this.stateManager.startTraversal(
            wormhole,
            destination.x,
            destination.y,
            this.camera,
            this.stellarMap
        );
        
        // Play dedicated wormhole traversal sound effect
        this.soundManager.playWormholeTraversal();
        
        // const destinationDesignation = wormhole.designation === 'alpha' ? 'β' : 'α';
    }

    private async handleAudioContextActivation(): Promise<void> {
        // Check for user interaction and resume audio context if needed
        const hasUserInteraction = this.input.keys.size > 0 || 
                                  this.input.isMousePressed() || 
                                  this.input.wasClicked() ||
                                  this.input.getTouchCount() > 0;
        
        if (hasUserInteraction && this.soundManager.getAudioContextState() === 'suspended') {
            const resumed = await this.soundManager.resumeAudioContext();
            if (resumed && !this.soundManager.isSpaceDronePlaying()) {
                // Start space drone after successful audio context resume
                this.soundManager.startSpaceDrone();
                this.discoveryDisplay.addNotification('🌌 Atmospheric audio enabled');
            }
        }
    }

    render(): void {
        this.renderer.clear();
        
        // Calculate fade alpha for traversal and universe reset effects
        const fadeAlpha = this.stateManager.calculateFadeAlpha();
        const isCosmicTransition = this.stateManager.isResettingUniverse;
        
        this.starField.render(this.renderer, this.camera);
        
        // Use cached active objects from update phase for performance
        const activeObjects = this.cachedActiveObjects || this.chunkManager.getAllActiveObjects();
        
        // Performance optimization: Calculate screen bounds for render culling
        const screenBounds = this.calculateScreenBounds();
        
        // Render nebulae first (background layer) - with culling disabled for now
        for (const obj of activeObjects.nebulae) {
            // if (this.isObjectInScreen(obj, screenBounds)) {
                obj.render(this.renderer, this.camera);
            // }
        }
        
        // Then render asteroid gardens (mid-background layer) - culling disabled
        for (const obj of activeObjects.asteroidGardens) {
            // if (this.isObjectInScreen(obj, screenBounds)) {
                obj.render(this.renderer, this.camera);
            // }
        }
        
        // Render comets (intermediate layer - after background, before stars) - culling disabled
        for (const obj of activeObjects.comets) {
            // if (this.isObjectInScreen(obj, screenBounds)) {
                obj.render(this.renderer, this.camera);
            // }
        }
        
        // Then render stars, planets, and moons (foreground layers) - culling disabled
        for (const obj of activeObjects.planets) {
            // if (this.isObjectInScreen(obj, screenBounds)) {
                obj.render(this.renderer, this.camera);
            // }
        }
        for (const obj of activeObjects.moons) {
            // if (this.isObjectInScreen(obj, screenBounds)) {
                obj.render(this.renderer, this.camera);
            // }
        }
        for (const obj of activeObjects.celestialStars) {
            // if (this.isObjectInScreen(obj, screenBounds)) {
                obj.render(this.renderer, this.camera);
            // }
        }
        
        // Render wormholes (prominent foreground layer, after stars)
        // EMERGENCY FIX: Remove duplicate beta wormholes if they still exist (should be rare now)
        const betaWormholes = activeObjects.wormholes.filter(w => w.designation === 'beta');
        if (betaWormholes.length > 1) {
            // Keep only the first beta wormhole, remove all others  
            // const keepBeta = betaWormholes[0];
            const removeBetas = betaWormholes.slice(1);
            
            // Remove duplicates from activeObjects.wormholes array
            activeObjects.wormholes = activeObjects.wormholes.filter(w => !removeBetas.includes(w));
        }
        
        for (const obj of activeObjects.wormholes) {
            // if (this.isObjectInScreen(obj, screenBounds)) {
                // Get destination preview objects for gravitational lensing
                const destinationPreview = this.getDestinationPreviewObjects(obj);
                (obj as any).render(this.renderer, this.camera, destinationPreview);
            // }
        }
        
        // Render black holes (ultra-prominent cosmic phenomena - dominating layer) - culling disabled
        for (const obj of activeObjects.blackholes) {
            // if (this.isObjectInScreen(obj, screenBounds)) {
                obj.render(this.renderer, this.camera);
            // }
        }
        
        // Render chunk boundaries (debug visualization)
        if (GameConfig.debug.enabled && GameConfig.debug.chunkBoundaries.enabled) {
            this.renderChunkBoundaries();
        }
        
        this.starParticles.render(this.renderer, this.camera);
        this.thrusterParticles.render(this.renderer);
        this.ship.render(this.renderer, this.camera.rotation, this.camera.x, this.camera.y, activeObjects.celestialStars as any);
        this.discoveryDisplay.render(this.renderer, this.camera);
        this.discoveryLogbook.render(this.renderer, this.camera);
        
        // Render stellar map overlay (renders on top of everything)
        const discovered = this.getDiscoveredObjects();
        this.stellarMap.render(this.renderer, this.camera, discovered.stars, this.gameStartingPosition, discovered.planets, discovered.nebulae, discovered.wormholes, discovered.asteroidGardens, discovered.blackHoles, discovered.comets);
        
        // Render touch UI (renders on top of everything else)
        this.touchUI.render(this.renderer);
        
        // Render settings menu (on top of touch UI)
        if (this.settingsMenu.isVisible()) {
            this.settingsMenu.render(this.renderer.ctx, this.renderer.canvas);
        }
        
        // Render confirmation dialog (on top of settings menu)
        this.confirmationDialog.render(this.renderer.ctx, this.renderer.canvas);
        
        // Render developer console (on top of everything else)
        this.developerConsole.render(this.renderer);
        
        // Render transition fade effects (on top of everything)
        if (fadeAlpha > 0) {
            const ctx = this.renderer.ctx;
            
            if (isCosmicTransition) {
                // Cosmic transition with deep space colors
                ctx.fillStyle = `rgba(8, 0, 20, ${fadeAlpha})`; // Deep cosmic purple-black
                ctx.fillRect(0, 0, this.renderer.canvas.width, this.renderer.canvas.height);
                
                // Add cosmic rebirth effect at peak fade
                if (fadeAlpha > 0.8) {
                    this.renderCosmicRebirth(ctx, fadeAlpha);
                }
            } else {
                // Wormhole traversal fade
                ctx.fillStyle = `rgba(0, 0, 15, ${fadeAlpha})`; // Very dark blue-black
                ctx.fillRect(0, 0, this.renderer.canvas.width, this.renderer.canvas.height);
                
                // Add subtle particle tunnel effect at peak fade
                if (fadeAlpha > 0.8) {
                    this.renderTraversalTunnel(ctx, fadeAlpha);
                }
            }
        }
    }

    renderTraversalTunnel(ctx: CanvasRenderingContext2D, intensity: number): void {
        const centerX = this.renderer.canvas.width / 2;
        const centerY = this.renderer.canvas.height / 2;
        const time = this.stateManager.getTraversalAnimationTime(); // Speed up animation
        
        // Draw subtle tunnel particles
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2 + time;
            const radius = 50 + (i * 15);
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            const particleAlpha = (intensity - 0.8) * 5 * (1 - i / 20); // Fade outer particles
            ctx.fillStyle = `rgba(100, 150, 255, ${particleAlpha})`;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderCosmicRebirth(ctx: CanvasRenderingContext2D, intensity: number): void {
        const centerX = this.renderer.canvas.width / 2;
        const centerY = this.renderer.canvas.height / 2;
        const time = this.stateManager.resetStartTime * 2; // Slower, more majestic animation
        
        // Cosmic background with swirling energies
        const cosmicAlpha = (intensity - 0.8) * 5; // Scale from 0.8-1.0 to 0-1.0
        
        // Draw expanding cosmic rings (Big Bang effect)
        for (let i = 0; i < 8; i++) {
            const radius = 30 + (i * 40) + (time * 20);
            const ringAlpha = cosmicAlpha * (1 - i / 8) * 0.3;
            
            // Cosmic colors: deep purples, blues, and hints of gold
            const colors = [
                `rgba(120, 80, 255, ${ringAlpha})`, // Cosmic purple
                `rgba(80, 120, 255, ${ringAlpha})`, // Deep blue  
                `rgba(255, 200, 80, ${ringAlpha})`, // Cosmic gold
                `rgba(180, 100, 255, ${ringAlpha})` // Magenta
            ];
            
            ctx.strokeStyle = colors[i % colors.length];
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Central cosmic singularity point
        const singularityAlpha = cosmicAlpha * Math.sin(time * 3) * 0.5 + cosmicAlpha * 0.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${singularityAlpha})`;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Radiating cosmic energy particles
        for (let i = 0; i < 30; i++) {
            const angle = (i / 30) * Math.PI * 2 + time * 0.5;
            const distance = 20 + (time * 40) + Math.sin(time * 2 + i) * 20;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            const particleAlpha = cosmicAlpha * (1 - (distance / 200)) * 0.8;
            
            // Alternate cosmic colors for particles
            const particleColors = [
                `rgba(255, 180, 255, ${particleAlpha})`, // Pink
                `rgba(180, 255, 255, ${particleAlpha})`, // Cyan
                `rgba(255, 255, 180, ${particleAlpha})`, // Light yellow
            ];
            
            ctx.fillStyle = particleColors[i % particleColors.length];
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    getDestinationPreviewObjects(wormhole: CelestialObject): CelestialObject[] {
        // Get objects near the destination wormhole for gravitational lensing preview
        if (!wormhole.twinX || !wormhole.twinY) return [];
        
        const destinationX = wormhole.twinX;
        const destinationY = wormhole.twinY;
        const previewRadius = 300; // 300 pixel radius around destination
        
        // Get all objects from chunks near the destination
        const destinationObjects: CelestialObject[] = [];
        
        // Sample objects from chunks around destination area
        const chunkSize = 2000; // Should match ChunkManager.CHUNK_SIZE
        const chunksToCheck = [
            { x: Math.floor(destinationX / chunkSize), y: Math.floor(destinationY / chunkSize) },
            { x: Math.floor((destinationX - chunkSize) / chunkSize), y: Math.floor(destinationY / chunkSize) },
            { x: Math.floor((destinationX + chunkSize) / chunkSize), y: Math.floor(destinationY / chunkSize) },
            { x: Math.floor(destinationX / chunkSize), y: Math.floor((destinationY - chunkSize) / chunkSize) },
            { x: Math.floor(destinationX / chunkSize), y: Math.floor((destinationY + chunkSize) / chunkSize) },
        ];
        
        for (const chunkCoord of chunksToCheck) {
            const chunkKey = `${chunkCoord.x},${chunkCoord.y}`;
            
            // Ensure chunk exists for preview
            this.chunkManager.ensureChunkExists(chunkCoord.x, chunkCoord.y);
            const chunk = this.chunkManager.getChunk(chunkKey);
            
            if (chunk) {
                // Check all object types within preview radius
                const allObjects = [
                    ...chunk.celestialStars,
                    ...chunk.planets, 
                    ...chunk.moons,
                    ...chunk.nebulae,
                    ...chunk.asteroidGardens,
                    ...chunk.wormholes.filter(w => w.uniqueId !== wormhole.uniqueId) // Exclude self
                ];
                
                for (const obj of allObjects) {
                    const distance = Math.sqrt(
                        Math.pow(obj.x - destinationX, 2) + Math.pow(obj.y - destinationY, 2)
                    );
                    
                    if (distance <= previewRadius) {
                        // Create preview object with relative positioning
                        const relativeX = obj.x - destinationX;
                        const relativeY = obj.y - destinationY;
                        
                        destinationObjects.push({
                            ...obj,
                            relativeX,
                            relativeY,
                            distance,
                            type: obj.type
                        } as CelestialObject);
                    }
                }
            }
        }
        
        // Sort by distance (closest first) and limit to prevent performance issues
        return destinationObjects
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 8); // Limit to 8 objects for performance
    }

    renderChunkBoundaries(): void {
        const config = GameConfig.debug.chunkBoundaries;
        const chunkSize = this.chunkManager.chunkSize;
        
        // Get viewport bounds in world coordinates
        const viewLeft = this.camera.x - this.renderer.canvas.width / 2;
        const viewRight = this.camera.x + this.renderer.canvas.width / 2;
        const viewTop = this.camera.y - this.renderer.canvas.height / 2;
        const viewBottom = this.camera.y + this.renderer.canvas.height / 2;
        
        // Find chunk coordinates that intersect with the viewport
        const leftChunk = Math.floor(viewLeft / chunkSize);
        const rightChunk = Math.floor(viewRight / chunkSize);
        const topChunk = Math.floor(viewTop / chunkSize);
        const bottomChunk = Math.floor(viewBottom / chunkSize);
        
        // Draw chunk boundaries and crosshairs
        for (let chunkX = leftChunk; chunkX <= rightChunk + 1; chunkX++) {
            for (let chunkY = topChunk; chunkY <= bottomChunk + 1; chunkY++) {
                // Calculate chunk corner position in world coordinates
                const worldX = chunkX * chunkSize;
                const worldY = chunkY * chunkSize;
                
                // Convert to screen coordinates
                const screenX = worldX - this.camera.x + this.renderer.canvas.width / 2;
                const screenY = worldY - this.camera.y + this.renderer.canvas.height / 2;
                
                // Only draw if on screen
                if (screenX >= -config.crosshairSize && screenX <= this.renderer.canvas.width + config.crosshairSize &&
                    screenY >= -config.crosshairSize && screenY <= this.renderer.canvas.height + config.crosshairSize) {
                    
                    // Draw crosshair at chunk corner
                    this.renderer.drawCrosshair(
                        screenX, screenY, 
                        config.crosshairSize, 
                        config.color, 
                        config.lineWidth, 
                        config.opacity
                    );
                }
            }
        }
        
        // Draw subdivision markers along chunk edges if enabled
        if (config.subdivisions.enabled) {
            const subdivisionCount = Math.floor(1 / config.subdivisions.interval) - 1; // 9 marks for 10% intervals
            
            // Vertical chunk boundaries with subdivisions
            for (let chunkX = leftChunk; chunkX <= rightChunk + 1; chunkX++) {
                const worldX = chunkX * chunkSize;
                const screenX = worldX - this.camera.x + this.renderer.canvas.width / 2;
                
                if (screenX >= -config.subdivisions.dashLength && screenX <= this.renderer.canvas.width + config.subdivisions.dashLength) {
                    // Calculate the viewport range for this vertical line
                    const viewTopWorldY = this.camera.y - this.renderer.canvas.height / 2;
                    const viewBottomWorldY = this.camera.y + this.renderer.canvas.height / 2;
                    
                    // Find the range of chunks this vertical line intersects with in the viewport
                    const topVisibleChunk = Math.floor(viewTopWorldY / chunkSize);
                    const bottomVisibleChunk = Math.floor(viewBottomWorldY / chunkSize);
                    
                    // Draw subdivision marks only within the visible chunk range
                    for (let chunkY = topVisibleChunk; chunkY <= bottomVisibleChunk; chunkY++) {
                        const chunkTopY = chunkY * chunkSize;
                        
                        for (let i = 1; i <= subdivisionCount; i++) {
                            const subdivisionY = chunkTopY + (chunkSize * i * config.subdivisions.interval);
                            const screenY = subdivisionY - this.camera.y + this.renderer.canvas.height / 2;
                            
                            // Only draw if the subdivision mark is actually visible
                            if (screenY >= -config.subdivisions.dashLength && screenY <= this.renderer.canvas.height + config.subdivisions.dashLength) {
                                this.renderer.drawDash(
                                    screenX, screenY,
                                    config.subdivisions.dashLength,
                                    config.subdivisions.color,
                                    0, // Horizontal dash (perpendicular to vertical boundary)
                                    config.subdivisions.lineWidth,
                                    config.subdivisions.opacity
                                );
                            }
                        }
                    }
                }
            }
            
            // Horizontal chunk boundaries with subdivisions
            for (let chunkY = topChunk; chunkY <= bottomChunk + 1; chunkY++) {
                const worldY = chunkY * chunkSize;
                const screenY = worldY - this.camera.y + this.renderer.canvas.height / 2;
                
                if (screenY >= -config.subdivisions.dashLength && screenY <= this.renderer.canvas.height + config.subdivisions.dashLength) {
                    // Calculate the viewport range for this horizontal line
                    const viewLeftWorldX = this.camera.x - this.renderer.canvas.width / 2;
                    const viewRightWorldX = this.camera.x + this.renderer.canvas.width / 2;
                    
                    // Find the range of chunks this horizontal line intersects with in the viewport
                    const leftVisibleChunk = Math.floor(viewLeftWorldX / chunkSize);
                    const rightVisibleChunk = Math.floor(viewRightWorldX / chunkSize);
                    
                    // Draw subdivision marks only within the visible chunk range
                    for (let chunkX = leftVisibleChunk; chunkX <= rightVisibleChunk; chunkX++) {
                        const chunkLeftX = chunkX * chunkSize;
                        
                        for (let i = 1; i <= subdivisionCount; i++) {
                            const subdivisionX = chunkLeftX + (chunkSize * i * config.subdivisions.interval);
                            const screenX = subdivisionX - this.camera.x + this.renderer.canvas.width / 2;
                            
                            // Only draw if the subdivision mark is actually visible
                            if (screenX >= -config.subdivisions.dashLength && screenX <= this.renderer.canvas.width + config.subdivisions.dashLength) {
                                this.renderer.drawDash(
                                    screenX, screenY,
                                    config.subdivisions.dashLength,
                                    config.subdivisions.color,
                                    Math.PI / 2, // Vertical dash (perpendicular to horizontal boundary)
                                    config.subdivisions.lineWidth,
                                    config.subdivisions.opacity
                                );
                            }
                        }
                    }
                }
            }
        }
    }

    private createAudioServiceWrapper(): any {
        // Real audio wrapper that uses SoundManager's granular controls
        return {
            setMasterVolume: (volume: number) => {
                // SettingsService already converts from 0-100 to 0-1 range, so use directly
                this.soundManager.setMasterVolume(volume);
            },
            setAmbientVolume: (volume: number) => {
                // SettingsService already converts from 0-100 to 0-1 range, so use directly
                this.soundManager.setAmbientVolume(volume);
            },
            setDiscoveryVolume: (volume: number) => {
                // SettingsService already converts from 0-100 to 0-1 range, so use directly
                this.soundManager.setDiscoveryVolume(volume);
            },
            setEffectsVolume: (volume: number) => {
                // SettingsService already converts from 0-100 to 0-1 range, so use directly
                this.soundManager.setDiscoveryVolume(volume);
            },
            setMuted: (muted: boolean) => {
                // Use the existing working toggle method
                const currentlyMuted = this.soundManager.isMuted();
                if (muted !== currentlyMuted) {
                    this.soundManager.toggleMute();
                }
            },
            setMasterMuted: (muted: boolean) => {
                this.soundManager.setMasterMuted(muted);
            },
            setAmbientMuted: (muted: boolean) => {
                this.soundManager.setAmbientMuted(muted);
            },
            setDiscoveryMuted: (muted: boolean) => {
                this.soundManager.setDiscoveryMuted(muted);
            },
            // Return actual values from SoundManager (converted back to 0-100 range)
            getMasterVolume: () => Math.round(this.soundManager.getMasterVolume() * 100),
            getAmbientVolume: () => Math.round(this.soundManager.getAmbientVolume() * 100),
            getDiscoveryVolume: () => Math.round(this.soundManager.getDiscoveryVolume() * 100),
            getEffectsVolume: () => Math.round(this.soundManager.getDiscoveryVolume() * 100),
            isMuted: () => this.soundManager.isMuted(),
            // Individual mute state getters
            isMasterMuted: () => this.soundManager.isMasterMuted(),
            isAmbientMuted: () => this.soundManager.isAmbientMuted(),
            isDiscoveryMuted: () => this.soundManager.isDiscoveryMuted()
        };
    }

    // Performance optimization helpers
    
    /**
     * Calculate screen bounds for render culling
     */
    private calculateScreenBounds(): { left: number; right: number; top: number; bottom: number } {
        const margin = 100; // Extra margin to account for object sizes
        return {
            left: this.camera.x - (this.renderer.canvas.width / 2) - margin,
            right: this.camera.x + (this.renderer.canvas.width / 2) + margin,
            top: this.camera.y - (this.renderer.canvas.height / 2) - margin,
            bottom: this.camera.y + (this.renderer.canvas.height / 2) + margin
        };
    }

    /**
     * Check if an object is within screen bounds for render culling
     */
    private isObjectInScreen(obj: CelestialObject, screenBounds: { left: number; right: number; top: number; bottom: number }): boolean {
        // Get object bounds with some padding for visual effects
        const padding = (obj as any).radius || 50; // Use object radius or default padding
        
        return obj.x + padding >= screenBounds.left &&
               obj.x - padding <= screenBounds.right &&
               obj.y + padding >= screenBounds.top &&
               obj.y - padding <= screenBounds.bottom;
    }

    /**
     * Set up event handlers for save/load functionality
     */
    private setupSaveLoadEventHandlers(): void {
        this.eventSystem.on('save.game.requested', async () => {
            // Check for existing save and confirm overwrite
            const saveInfo = await this.saveLoadService.getSaveGameInfo();
            
            if (saveInfo.exists) {
                const saveDate = new Date(saveInfo.timestamp!).toLocaleString();
                this.confirmationDialog.show({
                    title: 'Confirm Save',
                    message: `Overwrite existing save from ${saveDate}?`,
                    confirmText: 'Overwrite',
                    cancelText: 'Cancel',
                    onConfirm: async () => {
                        const result = await this.saveLoadService.saveGame();
                        if (result.success) {
                            this.discoveryDisplay.addNotification('💾 Game saved successfully');
                        } else {
                            this.discoveryDisplay.addNotification(`❌ Save failed: ${result.error}`);
                        }
                    },
                    onCancel: () => {
                        this.discoveryDisplay.addNotification('💾 Save cancelled');
                    }
                });
            } else {
                // No existing save, save directly
                const result = await this.saveLoadService.saveGame();
                if (result.success) {
                    this.discoveryDisplay.addNotification('💾 Game saved successfully');
                } else {
                    this.discoveryDisplay.addNotification(`❌ Save failed: ${result.error}`);
                }
            }
        });

        this.eventSystem.on('load.game.requested', async () => {
            const result = await this.saveLoadService.loadGame();
            if (result.success) {
                // Force chunk reload at new position
                this.chunkManager.clearAllChunks();
                this.chunkManager.updateActiveChunks(this.camera.x, this.camera.y);
                
                // Restore discovery state for newly loaded objects
                const activeObjects = this.chunkManager.getAllActiveObjects();
                const flattenedObjects = [
                    ...activeObjects.stars,
                    ...activeObjects.planets, 
                    ...activeObjects.moons,
                    ...activeObjects.nebulae,
                    ...activeObjects.asteroidGardens,
                    ...activeObjects.wormholes,
                    ...activeObjects.blackholes,
                    ...activeObjects.comets
                ].filter(obj => obj.hasOwnProperty('discovered'));
                this.chunkManager.restoreDiscoveryState(flattenedObjects);
                
                // Center stellar map on loaded position
                this.stellarMap.centerOnPosition(this.camera.x, this.camera.y);
                
                this.discoveryDisplay.addNotification('💾 Game loaded successfully');
            } else {
                this.discoveryDisplay.addNotification(`❌ Load failed: ${result.error}`);
            }
        });

        this.eventSystem.on('new.game.requested', () => {
            this.confirmationDialog.show({
                title: 'Start New Game',
                message: 'Start a new game? This will reset your current progress and discoveries.',
                confirmText: 'New Game',
                cancelText: 'Cancel',
                onConfirm: () => {
                    this.startNewGame();
                },
                onCancel: () => {
                    this.discoveryDisplay.addNotification('🌟 New game cancelled');
                }
            });
        });

        // Auto-save on discoveries
        this.eventSystem.on('object.discovered', async () => {
            await this.saveLoadService.saveOnDiscovery();
        });
    }

    /**
     * Start a new game by resetting state and position
     */
    private startNewGame(): void {
        // Clear saved game
        this.saveLoadService.deleteSavedGame();
        
        // Reset discovery history
        this.discoveryLogbook.clearHistory();
        this.chunkManager.clearDiscoveryHistory();
        
        // Reset camera position to starting coordinates
        const startingCoords = getStartingCoordinates();
        if (startingCoords) {
            this.camera.x = startingCoords.x;
            this.camera.y = startingCoords.y;
        }
        this.camera.velocityX = 0;
        this.camera.velocityY = 0;
        
        // Reset state manager
        this.stateManager.reset();
        
        // Force chunk regeneration
        this.chunkManager.clearAllChunks();
        this.chunkManager.updateActiveChunks(this.camera.x, this.camera.y);
        
        // Center stellar map
        this.stellarMap.centerOnPosition(this.camera.x, this.camera.y);
        
        this.discoveryDisplay.addNotification('🌟 New game started - welcome to the cosmos!');
    }

    // Removed syncInitialAudioSettings to avoid audio issues
}

// Initialize the game
window.addEventListener('DOMContentLoaded', () => {
    // Initialize universe seed before creating the game
    initializeUniverseSeed();
    
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) {
        throw new Error('Game canvas not found');
    }
    
    const game = new Game(canvas);
    game.start();
});