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
// Type imports will be cleaned up in Phase 2 when we extract celestial classes
import { 
    initializeUniverseSeed, 
    getStartingCoordinates, 
    generateShareableURL,
    resetUniverse,
    generateSafeSpawnPosition,
    getUniverseResetCount
} from './utils/random.js';
// Note: Will add proper types in future phases when we extract celestial classes

// Debug spawner import (development builds only)
let DebugSpawner: typeof import('./debug/debug-spawner.js').DebugSpawner | null = null;

// Interface definitions
interface GameStartingPosition {
    x: number;
    y: number;
}

// Interface for objects in the active game world (these are class instances, not data)
interface CelestialObject {
    type: 'star' | 'planet' | 'moon' | 'nebula' | 'asteroids' | 'wormhole' | 'blackhole';
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
}

interface TraversalDestination {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    wormhole: CelestialObject;
    stellarMapWasVisible: boolean;
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
        this.discoveryManager = new DiscoveryManager(
            this.soundManager,
            this.discoveryDisplay,
            this.discoveryLogbook,
            this.namingService
        );
        
        // Connect naming service to stellar map
        // TODO: Fix interface mismatch between StellarMap and NamingService in Phase 2
        // this.stellarMap.setNamingService(this.namingService);
        
        this.setupCanvas();
        
        // Set camera position from URL parameters if provided
        const startingCoords = getStartingCoordinates();
        if (startingCoords) {
            this.camera.x = startingCoords.x;
            this.camera.y = startingCoords.y;
            console.log(`📍 Camera positioned at shared coordinates: (${startingCoords.x}, ${startingCoords.y})`);
        }
        
        // Create starting position object for stellar map reference
        const startingPosition = {
            x: this.camera.x,
            y: this.camera.y
        };
        
        // Initialize state manager with starting position
        this.stateManager = new StateManager(startingPosition);
        
        // Log lifetime distance traveled
        const lifetimeDistance = this.camera.getFormattedLifetimeDistance();
        if (lifetimeDistance !== '0 km') {
            console.log(`🚀 Lifetime distance traveled: ${lifetimeDistance}`);
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
        this.gameLoop(0);
    }

    private gameLoopCallCount = 0;
    private maxGameLoopCalls = 100;

    gameLoop = (currentTime: number): void => {
        this.gameLoopCallCount++;
        
        // CRITICAL: Detect infinite recursion and break it
        if (this.gameLoopCallCount > this.maxGameLoopCalls) {
            console.error(`🔥 INFINITE RECURSION DETECTED! Game loop called ${this.gameLoopCallCount} times. Breaking loop.`);
            console.trace("🔍 RECURSION BREAK POINT");
            return; // Stop the recursion
        }
        
        // Reset counter on new animation frame (different timestamp)
        const timeDiff = Math.abs(currentTime - this.lastTime);
        if (timeDiff > 1) { // New frame if time difference > 1ms
            this.gameLoopCallCount = 1;
        }

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
        
        // Resume audio context on first user interaction (required by browsers)
        // Note: This functionality is temporarily disabled to fix TypeScript compilation
        // TODO: Add public methods to SoundManager and Input classes for context access
        /*
        if (this.soundManager.context && this.soundManager.context.state === 'suspended') {
            if (this.input.keys.size > 0 || this.input.isMousePressed() || this.input.wasClicked()) {
                this.soundManager.context.resume();
            }
        }
        */
        
        // Handle coordinate copying (C key)
        if (this.input.wasJustPressed('KeyC')) {
            this.copyCurrentCoordinates();
        }
        
        // Handle map toggle (M key)
        if (this.input.wasJustPressed('KeyM')) {
            this.stellarMap.toggle();
        }
        
        // Handle logbook toggle (L key)
        if (this.input.wasJustPressed('KeyL')) {
            this.discoveryLogbook.toggle();
        }
        
        // Handle audio mute toggle (H key for "Hush")
        if (this.input.wasJustPressed('KeyH')) {
            const isMuted = this.soundManager.toggleMute();
            this.discoveryDisplay.addNotification(isMuted ? 'Audio muted' : 'Audio unmuted');
        }
        
        // Handle debug commands (development builds only)
        this.handleDebugInput().catch(err => console.error('Debug input error:', err));
        
        // Handle map/logbook close (Escape key)
        if (this.input.wasJustPressed('Escape')) {
            if (this.stellarMap.isVisible()) {
                this.stellarMap.toggle();
            } else if (this.discoveryLogbook.isVisible()) {
                this.discoveryLogbook.toggle();
            }
        }
        
        // Handle mouse clicks/touch
        if (this.input.wasClicked()) {
            // Reset stellar map pan state on click release
            if (this.stellarMap.isVisible()) {
                this.stellarMap.resetPanState();
            }
            
            // Check if touch hit any TouchUI buttons first
            const touchAction = this.touchUI.handleTouch(this.input.getMouseX(), this.input.getMouseY());
            if (touchAction) {
                this.handleTouchAction(touchAction);
                // Prevent the touch from affecting ship movement
                this.input.consumeTouch();
            } else if (this.stellarMap.isVisible() && !this.input.isTouchConsumed()) {
                // Handle stellar map interactions (simplified) - only if not panning
                const discovered = this.getDiscoveredObjects();
                this.stellarMap.handleStarSelection(this.input.getMouseX(), this.input.getMouseY(), discovered.stars, this.renderer.canvas, discovered.planets, discovered.nebulae, discovered.wormholes, discovered.asteroidGardens, discovered.blackHoles);
            }
        }
        
        // Handle continuous mouse/touch input for map panning
        if (this.stellarMap.isVisible() && this.input.isMousePressed()) {
            // Handle mouse movement for map panning
            this.stellarMap.handleMouseMove(this.input.getMouseX(), this.input.getMouseY(), this.renderer.canvas, this.input);
        }
        
        // Always update hover state when stellar map is visible (for cursor feedback)
        if (this.stellarMap.isVisible()) {
            const discovered = this.getDiscoveredObjects();
            this.stellarMap.detectHoverTarget(this.input.getMouseX(), this.input.getMouseY(), this.renderer.canvas, discovered.stars, discovered.planets, discovered.nebulae, discovered.asteroidGardens, discovered.blackHoles);
        } else {
            // Reset cursor when map is not visible
            this.stellarMap.updateCursor(this.renderer.canvas);
        }
        
        // Pinch zoom is now handled in stellarMap.update() via input system
        
        // Update chunk loading based on camera position
        this.chunkManager.updateActiveChunks(this.camera.x, this.camera.y);
        
        // Get active celestial objects for physics and discovery
        const activeObjects = this.chunkManager.getAllActiveObjects();
        const celestialObjects: CelestialObject[] = [...activeObjects.planets, ...activeObjects.moons, ...activeObjects.celestialStars, ...activeObjects.nebulae, ...activeObjects.asteroidGardens, ...activeObjects.wormholes, ...activeObjects.blackholes];
        
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
        this.starParticles.update(deltaTime, activeObjects.celestialStars, this.camera);
        
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
            blackHoles: this.chunkManager.getDiscoveredBlackHoles()
        };
    }

    copyCurrentCoordinates(): void {
        const shareableURL = generateShareableURL(this.camera.x, this.camera.y);
        
        // Try to copy to clipboard
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareableURL).then(() => {
                console.log(`📋 Coordinates copied to clipboard: (${Math.round(this.camera.x)}, ${Math.round(this.camera.y)})`);
                console.log(`🔗 Shareable URL: ${shareableURL}`);
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

    showFallbackCopy(url: string): void {
        console.log(`📋 Copy this URL to share coordinates: ${url}`);
        this.discoveryDisplay.addNotification('Copy URL from console to share coordinates');
    }


    // Delegate methods for backward compatibility with tests
    isRareDiscovery(obj: CelestialObject): boolean {
        return this.discoveryManager.isRareDiscovery(obj);
    }

    updateShipAudio(): void {
        // Note: This functionality is temporarily disabled to fix TypeScript compilation
        // TODO: Add public methods to Camera class for thruster state access
        /*
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
        */
    }




    async handleDebugInput(): Promise<void> {
        // Only process debug input if debug mode is enabled
        if (!this.debugModeEnabled) {
            return;
        }

        // Lazy load debug spawner only when needed
        if (!DebugSpawner) {
            try {
                DebugSpawner = (await import('./debug/debug-spawner.js')).DebugSpawner;
            } catch (error) {
                console.warn('Failed to load debug spawner:', error);
                return;
            }
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
            DebugSpawner.spawnBlackHole(this.camera, this.chunkManager, this.debugModeEnabled);
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
        
        const destinationDesignation = wormhole.designation === 'alpha' ? 'β' : 'α';
        console.log(`🌀 Starting wormhole traversal: ${wormhole.pairId} → destination ${destinationDesignation}`);
    }



    private renderCallCount = 0;
    private lastRenderFrame = 0;

    render(): void {
        this.renderCallCount++;
        const currentFrame = performance.now();
        
        // DEBUG: Detect multiple render calls per frame
        if (currentFrame - this.lastRenderFrame < 16) { // Same frame
            if (this.renderCallCount > 1) {
                console.warn(`🎨 MULTIPLE RENDER CALLS: render() called ${this.renderCallCount} times in same frame`);
            }
        } else {
            // New frame
            this.renderCallCount = 1;
            this.lastRenderFrame = currentFrame;
        }
        
        this.renderer.clear();
        
        // Calculate fade alpha for traversal and universe reset effects
        const fadeAlpha = this.stateManager.calculateFadeAlpha();
        const isCosmicTransition = this.stateManager.isResettingUniverse;
        
        this.starField.render(this.renderer, this.camera);
        
        // Render celestial objects from active chunks
        const activeObjects = this.chunkManager.getAllActiveObjects();
        
        // Render nebulae first (background layer)
        for (const obj of activeObjects.nebulae) {
            obj.render(this.renderer, this.camera);
        }
        
        // Then render asteroid gardens (mid-background layer)
        for (const obj of activeObjects.asteroidGardens) {
            obj.render(this.renderer, this.camera);
        }
        
        // Then render stars, planets, and moons (foreground layers)
        for (const obj of activeObjects.planets) {
            obj.render(this.renderer, this.camera);
        }
        for (const obj of activeObjects.moons) {
            obj.render(this.renderer, this.camera);
        }
        for (const obj of activeObjects.celestialStars) {
            obj.render(this.renderer, this.camera);
        }
        
        // Render wormholes (prominent foreground layer, after stars)
        // CRITICAL FIX: Remove duplicate beta wormholes immediately 
        const betaWormholes = activeObjects.wormholes.filter(w => w.designation === 'beta');
        if (betaWormholes.length > 1) {
            console.error(`🔥 BETA DUPLICATION DETECTED: ${betaWormholes.length} beta wormholes found - REMOVING DUPLICATES NOW`);
            
            // Keep only the first beta wormhole, remove all others
            const keepBeta = betaWormholes[0];
            const removeBetas = betaWormholes.slice(1);
            
            // Remove duplicates from activeObjects.wormholes array
            activeObjects.wormholes = activeObjects.wormholes.filter(w => !removeBetas.includes(w));
            
            console.warn(`🧹 EMERGENCY CLEANUP: Removed ${removeBetas.length} duplicate beta wormholes from render loop`);
            console.log(`✅ FIXED: Now rendering ${activeObjects.wormholes.filter(w => w.designation === 'beta').length} beta wormhole(s)`);
        }
        
        for (const obj of activeObjects.wormholes) {
            // Get destination preview objects for gravitational lensing
            const destinationPreview = this.getDestinationPreviewObjects(obj);
            obj.render(this.renderer, this.camera, destinationPreview);
        }
        
        // Render black holes (ultra-prominent cosmic phenomena - dominating layer)
        for (const obj of activeObjects.blackholes) {
            obj.render(this.renderer, this.camera);
        }
        
        this.starParticles.render(this.renderer, this.camera);
        this.thrusterParticles.render(this.renderer);
        this.ship.render(this.renderer, this.camera.rotation, this.camera.x, this.camera.y, activeObjects.celestialStars);
        this.discoveryDisplay.render(this.renderer, this.camera);
        this.discoveryLogbook.render(this.renderer, this.camera);
        
        // Render stellar map overlay (renders on top of everything)
        const discovered = this.getDiscoveredObjects();
        this.stellarMap.render(this.renderer, this.camera, discovered.stars, this.gameStartingPosition, discovered.planets, discovered.nebulae, discovered.wormholes, discovered.asteroidGardens, discovered.blackHoles);
        
        // Render touch UI (renders on top of everything else)
        this.touchUI.render(this.renderer);
        
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