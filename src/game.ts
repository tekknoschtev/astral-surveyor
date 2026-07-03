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
import { StellarMap } from './ui/StellarMap.js';
import { LocalMinimap } from './ui/minimap.js';
import { DiscoveryService } from './services/DiscoveryService.js';
import { NamingService } from './naming/naming.js';
import { TouchUI } from './ui/touchui.js';
import { SoundManager } from './audio/soundmanager.js';
import { SimplifiedDiscoveryService } from './services/SimplifiedDiscoveryService.js';
import { createDiscoveryService } from './services/DiscoveryServiceFactory.js';
import { StateManager } from './services/StateManager.js';
import { DebugSpawner } from './debug/debug-spawner.js';
import { DeveloperConsole } from './debug/DeveloperConsole.js';
import { createGameComponents, GameComponents } from './services/GameFactory.js';
import { CommandRegistry } from './debug/CommandRegistry.js';
import { AudioService } from './services/AudioService.js';
import { SettingsService } from './services/SettingsService.js';
import { SettingsMenu } from './ui/SettingsMenu.js';
import { StorageService } from './services/StorageService.js';
import { SaveLoadService } from './services/SaveLoadService.js';
import { ConfirmationDialog } from './ui/ConfirmationDialog.js';
import { SeedInspectorService } from './debug/SeedInspectorService.js';
import { GameRenderer } from './graphics/GameRenderer.js';
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
export interface CelestialObject {
    type: 'star' | 'planet' | 'moon' | 'nebula' | 'asteroids' | 'wormhole' | 'blackhole' | 'comet' | 'rogue-planet' | 'dark-nebula' | 'crystal-garden' | 'protostar';
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

export interface ActiveObjects {
    planets: CelestialObject[];
    moons: CelestialObject[];
    celestialStars: CelestialObject[];
    nebulae: CelestialObject[];
    wormholes: CelestialObject[];
    blackholes: CelestialObject[];
    asteroidGardens: CelestialObject[];
    comets: CelestialObject[];
    // Region-specific objects
    roguePlanets: CelestialObject[];
    darkNebulae: CelestialObject[];
    crystalGardens: CelestialObject[];
    protostars: CelestialObject[];
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
    localMinimap: LocalMinimap;
    discoveryService: DiscoveryService;
    namingService: NamingService;
    touchUI: TouchUI;
    soundManager: SoundManager;
    discoveryManager: SimplifiedDiscoveryService;
    stateManager: StateManager;
    commandRegistry: CommandRegistry;
    developerConsole: DeveloperConsole;
    audioService: AudioService;
    settingsService: SettingsService;
    storageService: StorageService;
    saveLoadService: SaveLoadService;
    confirmationDialog: ConfirmationDialog;
    seedInspectorService: SeedInspectorService;
    gameRenderer: GameRenderer;
    
    // Performance optimization: Cache active objects between update and render phases
    cachedActiveObjects?: ActiveObjects;
    settingsMenu: SettingsMenu;
    
    // Region discovery tracking
    private currentRegionType: string | null = null;
    
    // Dark nebula ambient audio tracking
    private baseAmbientVolume: number = 0.8; // Store the original ambient volume
    private currentAmbientReduction: number = 0; // Current reduction amount (0 = no reduction)
    
    
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
        // Use factory to create all components with proper initialization
        const components = createGameComponents(canvas);

        // Assign components to instance properties
        Object.assign(this, components);

        this.gameRenderer = new GameRenderer(this);

        // Update settings menu with proper game callbacks now that the game instance exists
        this.settingsMenu.updateGameActions({
            onSaveGame: () => this.saveGame(),
            onLoadGame: () => this.loadGame(),
            onNewGame: () => this.requestNewGame()
        });

        this.setupCanvas();
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
                        ...activeObjects.comets,
                        ...activeObjects.roguePlanets,
                        ...activeObjects.darkNebulae,
                        ...activeObjects.protostars
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

    gameLoop = async (currentTime: number): Promise<void> => {
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        try {
            await this.update(deltaTime);
            this.render();
        } catch (error) {
            console.error('🔥 Game loop error:', error);
            console.trace("🔍 ERROR STACK TRACE");
            // Don't request another frame if there's an error
            return;
        }

        this.animationId = requestAnimationFrame(this.gameLoop);
    };

    async update(deltaTime: number): Promise<void> {
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
        
        // Handle minimap toggle (N key)
        if (this.input.wasJustPressed('KeyN')) {
            this.localMinimap.toggle();
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
                        this.stellarMap.handleStarSelection(this.input.getMouseX(), this.input.getMouseY(), discovered.stars, this.renderer.canvas, discovered.planets, discovered.nebulae, discovered.wormholes, discovered.asteroidGardens, discovered.blackHoles, discovered.comets, discovered.roguePlanets, discovered.darkNebulae, discovered.crystalGardens, discovered.protostars, this.input);
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
            this.stellarMap.detectHoverTarget(this.input.getMouseX(), this.input.getMouseY(), this.renderer.canvas, discovered.stars, discovered.planets, discovered.nebulae, discovered.wormholes, discovered.asteroidGardens, discovered.blackHoles, discovered.comets, discovered.roguePlanets, discovered.darkNebulae, discovered.crystalGardens, discovered.protostars);
            
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
        const celestialObjects: CelestialObject[] = [...activeObjects.planets, ...activeObjects.moons, ...activeObjects.celestialStars, ...activeObjects.nebulae, ...activeObjects.asteroidGardens, ...activeObjects.wormholes, ...activeObjects.blackholes, ...activeObjects.comets, ...activeObjects.roguePlanets, ...activeObjects.darkNebulae, ...activeObjects.crystalGardens, ...activeObjects.protostars];
        
        // Update orbital positions and animations for all celestial objects
        this.updateCelestialObjects(activeObjects, deltaTime);
        
        // Update black hole animations and apply gravitational effects
        this.updateBlackHoles(activeObjects.blackholes, deltaTime);
        
        // Restore discovery state for newly loaded objects
        this.chunkManager.restoreDiscoveryState(celestialObjects as any);
        
        this.camera.update(this.input, deltaTime, this.renderer.canvas.width, this.renderer.canvas.height, celestialObjects, this.stellarMap);
        
        // Check for region discovery
        this.checkRegionDiscovery();
        
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
        this.localMinimap.update(deltaTime);
        this.discoveryLogbook.update(deltaTime, this.input);
        this.stellarMap.update(deltaTime, this.camera, this.input);
        this.touchUI.update(deltaTime, this.renderer.canvas, this.stellarMap, this.discoveryLogbook);
        
        // Handle mouse wheel scrolling for logbook
        const wheelDelta = this.input.getWheelDelta();
        if (wheelDelta !== 0 && this.discoveryLogbook.isMouseOver(this.input.getMouseX(), this.input.getMouseY(), this.renderer.canvas.width, this.renderer.canvas.height)) {
            this.discoveryLogbook.handleMouseWheel(wheelDelta);
        }
        
        // Check for discoveries
        await this.processDiscoveries(celestialObjects);
        
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
        
        // Update Dark Nebula ambient sound reduction based on proximity
        this.updateDarkNebulaAmbientEffects(activeObjects.darkNebulae);
    }

    /**
     * Update Dark Nebula ambient sound effects based on ship proximity
     * Creates "dead zone" audio effect by reducing ambient volume near Dark Nebulae
     */
    private updateDarkNebulaAmbientEffects(darkNebulae: any[]): void {
        if (!darkNebulae || darkNebulae.length === 0) {
            // No dark nebulae nearby, restore full ambient volume if it was reduced
            if (this.currentAmbientReduction > 0) {
                this.currentAmbientReduction = Math.max(0, this.currentAmbientReduction - 0.02); // Gradual restoration
                const newVolume = this.baseAmbientVolume * (1 - this.currentAmbientReduction);
                this.soundManager.setAmbientVolume(newVolume);
            }
            return;
        }

        // Find the closest Dark Nebula and calculate sound reduction
        let closestDistance = Infinity;
        let maxReduction = 0;

        for (const darkNebula of darkNebulae) {
            const distance = Math.sqrt(
                Math.pow(this.camera.x - darkNebula.x, 2) + 
                Math.pow(this.camera.y - darkNebula.y, 2)
            );

            if (distance < closestDistance) {
                closestDistance = distance;
                
                // Calculate reduction based on proximity and nebula properties
                const effectRadius = darkNebula.radius * 1.5; // Effective audio range is larger than visual
                const occlusionStrength = darkNebula.occlusionStrength || 0.6; // Default if not set
                
                if (distance <= effectRadius) {
                    // Calculate reduction: stronger at center, fading to edges
                    const proximityFactor = 1 - (distance / effectRadius);
                    maxReduction = Math.max(maxReduction, proximityFactor * occlusionStrength * 0.8); // Max 80% reduction
                }
            }
        }

        // Smoothly transition ambient volume based on the strongest effect
        const targetReduction = maxReduction;
        const transitionSpeed = 0.02; // Gradual transition for smooth audio

        if (targetReduction > this.currentAmbientReduction) {
            // Entering nebula - gradual sound reduction
            this.currentAmbientReduction = Math.min(targetReduction, this.currentAmbientReduction + transitionSpeed);
        } else if (targetReduction < this.currentAmbientReduction) {
            // Leaving nebula - gradual sound restoration
            this.currentAmbientReduction = Math.max(targetReduction, this.currentAmbientReduction - transitionSpeed);
        }

        // Apply the ambient volume reduction
        const newVolume = this.baseAmbientVolume * (1 - this.currentAmbientReduction);
        this.soundManager.setAmbientVolume(newVolume);
        
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
    private async processDiscoveries(celestialObjects: CelestialObject[]): Promise<void> {
        for (const obj of celestialObjects) {
            if (obj.checkDiscovery && obj.checkDiscovery(this.camera, this.renderer.canvas.width, this.renderer.canvas.height)) {
                // Process discovery using SimplifiedDiscoveryService
                const discoveryEntry = this.discoveryManager.processObjectDiscovery(obj, this.camera);

                // Mark object as discovered in chunk manager (for test compatibility)
                this.chunkManager.markObjectDiscovered(obj, discoveryEntry.name);

                // Auto-save on discovery
                await this.onDiscovery();
            }
        }
    }

    /**
     * Get all discovered objects from chunk manager
     */
    getDiscoveredObjects() {
        return {
            stars: this.chunkManager.getDiscoveredStars(),
            planets: this.chunkManager.getDiscoveredPlanets(),
            nebulae: this.chunkManager.getDiscoveredNebulae(),
            wormholes: this.chunkManager.getDiscoveredWormholes(),
            asteroidGardens: this.chunkManager.getDiscoveredAsteroidGardens(),
            blackHoles: this.chunkManager.getDiscoveredBlackHoles(),
            comets: this.chunkManager.getDiscoveredComets(),
            roguePlanets: this.chunkManager.getDiscoveredRoguePlanets(),
            darkNebulae: this.chunkManager.getDiscoveredDarkNebulae(),
            crystalGardens: this.chunkManager.getDiscoveredCrystalGardens(),
            protostars: this.chunkManager.getDiscoveredProtostars(),
            regions: this.chunkManager.getDiscoveredRegions()
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
        // Use the same logic as ObjectDiscovery to determine rarity
        const rarity = this.determineRarity(obj);
        return rarity === 'rare' || rarity === 'ultra-rare' || obj.type === 'moon';
    }

    private determineRarity(obj: CelestialObject & { variant?: string }): 'common' | 'uncommon' | 'rare' | 'ultra-rare' {
        if (obj.type === 'blackhole' || obj.type === 'wormhole') {
            return 'ultra-rare';
        }
        if (obj.type === 'nebula' || obj.type === 'comet') {
            return 'rare';
        }
        if (obj.type === 'moon') {
            return 'uncommon';
        }
        if (obj.type === 'star') {
            const starType = obj.starTypeName;
            if (starType === 'Neutron Star') return 'ultra-rare';
            if (starType === 'White Dwarf' || starType === 'Blue Giant' || starType === 'Red Giant') return 'rare';
            return 'common';
        }
        if (obj.type === 'planet') {
            const planetType = obj.planetTypeName;
            if (planetType === 'Exotic World') return 'ultra-rare';
            if (planetType === 'Volcanic World' || planetType === 'Frozen World') return 'rare';
            return 'common';
        }
        if (obj.type === 'asteroids') {
            const gardenType = obj.gardenType;
            if (gardenType === 'rare_minerals' || gardenType === 'crystalline' || gardenType === 'icy') {
                return 'rare';
            }
            return 'uncommon';
        }
        if (obj.type === 'rogue-planet') {
            const variant = obj.variant || 'rock';
            if (variant === 'volcanic') {
                return 'ultra-rare';
            }
            return 'rare';
        }
        if (obj.type === 'dark-nebula') {
            const variant = obj.variant || 'wispy';
            if (variant === 'dense-core') {
                return 'rare';
            }
            return 'uncommon';
        }
        if (obj.type === 'crystal-garden') {
            const variant = obj.variant || 'mixed';
            if (variant === 'rare-earth') {
                return 'ultra-rare';
            }
            return 'uncommon';
        }
        if (obj.type === 'protostar') {
            const variant = obj.variant || 'class-1';
            if (variant === 'class-2') {
                return 'ultra-rare';
            }
            return 'rare';
        }
        return 'common';
    }

    // Backwards compatibility for tests - expose black hole warnings
    get lastBlackHoleWarnings() {
        // Return a mock Map interface for test compatibility
        return {
            clear: () => {
                // Clear warnings through the discovery service
                this.discoveryManager.clearWarnings?.();
            }
        };
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

    checkRegionDiscovery(): void {
        try {
            // Get current position
            const chunkX = Math.floor(this.camera.x / this.chunkManager.chunkSize);
            const chunkY = Math.floor(this.camera.y / this.chunkManager.chunkSize);
            
            // Get region information at current position
            const regionInfo = this.chunkManager.getChunkRegion(chunkX, chunkY);
            
            if (regionInfo && regionInfo.definition && regionInfo.influence > 0.5) {
                // Only trigger discovery if influence is significant (> 50%)
                
                if (this.currentRegionType !== regionInfo.regionType) {
                    // Player has entered a new region
                    this.currentRegionType = regionInfo.regionType;
                    
                    // Process the region discovery
                    this.discoveryManager.processRegionDiscovery(
                        regionInfo.regionType,
                        regionInfo.definition.name,
                        this.camera,
                        regionInfo.influence,
                        this.chunkManager
                    );
                    
                    // Update ambient music for the new region
                    if (this.soundManager.isSpaceDronePlaying()) {
                        this.soundManager.stopSpaceDrone();
                        // Brief delay for smooth transition
                        setTimeout(() => {
                            this.soundManager.startSpaceDrone(regionInfo.regionType);
                        }, 500);
                    }
                }
            } else {
                // Player is in a transition area or no strong regional influence
                // Only clear current region if we're really in a low influence area
                if (regionInfo && regionInfo.influence < 0.1) {
                    this.currentRegionType = null;
                }
            }
        } catch (error) {
            // Silently handle region lookup errors
            console.warn('Region discovery check failed:', error);
        }
    }

    getCurrentRegionType(): string | undefined {
        try {
            // Get current position
            const chunkX = Math.floor(this.camera.x / this.chunkManager.chunkSize);
            const chunkY = Math.floor(this.camera.y / this.chunkManager.chunkSize);
            
            // Get region information at current position
            const regionInfo = this.chunkManager.getChunkRegion(chunkX, chunkY);
            
            if (regionInfo && regionInfo.definition && regionInfo.influence > 0.3) {
                return regionInfo.regionType;
            }
        } catch (error) {
            // Silently handle region lookup errors
        }
        return undefined;
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
                // Get current region for regional soundscape
                const currentRegion = this.getCurrentRegionType();
                this.soundManager.startSpaceDrone(currentRegion);
                this.discoveryDisplay.addNotification('🌌 Atmospheric audio enabled');
            }
        }
    }

    render(): void {
        this.gameRenderer.render();
    }

    renderTraversalTunnel(ctx: CanvasRenderingContext2D, intensity: number): void {
        this.gameRenderer.renderTraversalTunnel(ctx, intensity);
    }

    renderCosmicRebirth(ctx: CanvasRenderingContext2D, intensity: number): void {
        this.gameRenderer.renderCosmicRebirth(ctx, intensity);
    }

    getDestinationPreviewObjects(wormhole: CelestialObject): CelestialObject[] {
        return this.gameRenderer.getDestinationPreviewObjects(wormhole);
    }

    renderChunkBoundaries(): void {
        this.gameRenderer.renderChunkBoundaries();
    }

    /**
     * Save game with confirmation if save exists
     */
    async saveGame(): Promise<void> {
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
    }

    /**
     * Load game
     */
    async loadGame(): Promise<void> {
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
                ...activeObjects.comets,
                ...activeObjects.roguePlanets,
                ...activeObjects.darkNebulae,
                ...activeObjects.protostars
            ].filter(obj => obj.hasOwnProperty('discovered'));
            this.chunkManager.restoreDiscoveryState(flattenedObjects);

            // Center stellar map on loaded position
            this.stellarMap.centerOnPosition(this.camera.x, this.camera.y);

            this.discoveryDisplay.addNotification('💾 Game loaded successfully');
        } else {
            this.discoveryDisplay.addNotification(`❌ Load failed: ${result.error}`);
        }
    }

    /**
     * Start new game with confirmation
     */
    requestNewGame(): void {
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
    }

    /**
     * Auto-save on discovery
     */
    async onDiscovery(): Promise<void> {
        await this.saveLoadService.saveOnDiscovery();
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