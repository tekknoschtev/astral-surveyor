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
import { 
    initializeUniverseSeed, 
    getStartingCoordinates, 
    generateShareableURL 
} from './utils/random.js';

// Interface definitions
interface GameStartingPosition {
    x: number;
    y: number;
}

interface ActiveObjects {
    planets: any[];
    moons: any[];
    celestialStars: any[];
    nebulae: any[];
    wormholes: any[];
}

interface CelestialObject {
    type: 'star' | 'planet' | 'moon' | 'nebula' | 'asteroids' | 'wormhole';
    x: number;
    y: number;
    starTypeName?: string;
    planetTypeName?: string;
    nebulaTypeData?: { name: string };
    wormholeId?: string;
    designation?: 'alpha' | 'beta';
    pairId?: string;
    updatePosition?(deltaTime: number): void;
    update?(deltaTime: number): void;
    checkDiscovery(camera: Camera, canvasWidth: number, canvasHeight: number): boolean;
    render(renderer: Renderer, camera: Camera): void;
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
    
    // Track previous ship state for audio triggers
    previousThrustState: boolean;
    previousBrakeState: boolean;
    
    // Wormhole traversal transition state
    isTraversing: boolean;
    traversalStartTime: number;
    traversalDuration: number;
    traversalDestination?: { x: number; y: number; velocityX: number; velocityY: number; wormhole: any };
    
    // Distance saving timer (save every 5 seconds)
    distanceSaveTimer: number;
    distanceSaveInterval: number;
    
    lastTime: number;
    animationId: number;
    gameStartingPosition: GameStartingPosition;

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
        this.touchUI = new TouchUI();
        this.soundManager = new SoundManager();
        
        // Track previous ship state for audio triggers
        this.previousThrustState = false;
        this.previousBrakeState = false;
        
        // Initialize wormhole traversal state
        this.isTraversing = false;
        this.traversalStartTime = 0;
        this.traversalDuration = 2.0; // 2 second transition
        
        // Distance saving timer (save every 5 seconds)
        this.distanceSaveTimer = 0;
        this.distanceSaveInterval = 5.0;
        
        // Connect naming service to stellar map
        this.stellarMap.setNamingService(this.namingService as any);
        this.lastTime = 0;
        this.animationId = 0;
        
        this.setupCanvas();
        
        // Set camera position from URL parameters if provided
        const startingCoords = getStartingCoordinates();
        if (startingCoords) {
            this.camera.x = startingCoords.x;
            this.camera.y = startingCoords.y;
            console.log(`📍 Camera positioned at shared coordinates: (${startingCoords.x}, ${startingCoords.y})`);
        }
        
        // Track starting position for stellar map reference
        this.gameStartingPosition = {
            x: this.camera.x,
            y: this.camera.y
        };
        
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

    gameLoop = (currentTime: number): void => {
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();

        this.animationId = requestAnimationFrame(this.gameLoop);
    };

    update(deltaTime: number): void {
        this.input.update(deltaTime);
        
        // Handle wormhole traversal transition
        if (this.isTraversing) {
            this.updateTraversal(deltaTime);
            return; // Skip normal updates during traversal
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
                const discoveredStars = this.chunkManager.getDiscoveredStars();
                const discoveredPlanets = this.chunkManager.getDiscoveredPlanets();
                const discoveredNebulae = this.chunkManager.getDiscoveredNebulae();
                this.stellarMap.handleStarSelection(this.input.getMouseX(), this.input.getMouseY(), discoveredStars, this.renderer.canvas, discoveredPlanets, discoveredNebulae);
            }
        }
        
        // Handle continuous mouse/touch input for map panning
        if (this.stellarMap.isVisible() && this.input.isMousePressed()) {
            // Handle mouse movement for map panning
            this.stellarMap.handleMouseMove(this.input.getMouseX(), this.input.getMouseY(), this.renderer.canvas, this.input);
        }
        
        // Always update hover state when stellar map is visible (for cursor feedback)
        if (this.stellarMap.isVisible()) {
            const discoveredStars = this.chunkManager.getDiscoveredStars();
            const discoveredPlanets = this.chunkManager.getDiscoveredPlanets();
            const discoveredNebulae = this.chunkManager.getDiscoveredNebulae();
            this.stellarMap.detectHoverTarget(this.input.getMouseX(), this.input.getMouseY(), this.renderer.canvas, discoveredStars, discoveredPlanets, discoveredNebulae);
        } else {
            // Reset cursor when map is not visible
            this.stellarMap.updateCursor(this.renderer.canvas);
        }
        
        // Pinch zoom is now handled in stellarMap.update() via input system
        
        // Update chunk loading based on camera position
        this.chunkManager.updateActiveChunks(this.camera.x, this.camera.y);
        
        // Get active celestial objects for physics and discovery
        const activeObjects = this.chunkManager.getAllActiveObjects();
        const celestialObjects = [...activeObjects.planets, ...activeObjects.moons, ...activeObjects.celestialStars, ...activeObjects.nebulae, ...activeObjects.asteroidGardens, ...activeObjects.wormholes] as any[];
        
        // Update orbital positions for all planets and moons
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
        
        // Restore discovery state for newly loaded objects
        this.chunkManager.restoreDiscoveryState(celestialObjects);
        
        this.camera.update(this.input as any, deltaTime, this.renderer.canvas.width, this.renderer.canvas.height, celestialObjects, this.stellarMap);
        
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
        for (const obj of celestialObjects) {
            if (obj.checkDiscovery(this.camera, this.renderer.canvas.width, this.renderer.canvas.height)) {
                // Generate proper astronomical name for the discovery
                const objectName = this.namingService.generateDisplayName(obj);
                const objectType = obj.type === 'planet' ? obj.planetTypeName : 
                                  obj.type === 'moon' ? 'Moon' : 
                                  obj.type === 'nebula' ? (obj as any).nebulaTypeData?.name || 'Nebula' :
                                  obj.type === 'asteroids' ? (obj as any).gardenTypeData?.name || 'Asteroid Garden' :
                                  obj.type === 'wormhole' ? 'Stable Traversable Wormhole' :
                                  obj.starTypeName;
                
                // Add discovery with proper name
                this.discoveryDisplay.addDiscovery(objectName, objectType || 'Unknown');
                this.discoveryLogbook.addDiscovery(objectName, objectType || 'Unknown');
                this.chunkManager.markObjectDiscovered(obj, objectName);
                
                // Play discovery sound based on object type
                this.playDiscoverySound(obj, objectType || 'Unknown');
                
                // Log shareable URL for rare discoveries with proper designation
                if (this.isRareDiscovery(obj)) {
                    const shareableURL = generateShareableURL(this.camera.x, this.camera.y);
                    const isNotable = this.namingService.isNotableDiscovery(obj);
                    const logPrefix = isNotable ? '🌟 RARE DISCOVERY!' : '⭐ Discovery!';
                    console.log(`${logPrefix} Share ${objectName} (${objectType}): ${shareableURL}`);
                }
            }
        }
        
        // Periodically save distance traveled data
        this.distanceSaveTimer += deltaTime;
        if (this.distanceSaveTimer >= this.distanceSaveInterval) {
            this.camera.saveDistanceTraveled();
            this.distanceSaveTimer = 0;
        }
        
        // Clear frame state at end of update
        this.input.clearFrameState();
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

    isRareDiscovery(obj: CelestialObject): boolean {
        if (obj.type === 'star') {
            // Consider Neutron Stars, White Dwarfs, Blue Giants, and Red Giants as rare
            return obj.starTypeName === 'Neutron Star' || 
                   obj.starTypeName === 'White Dwarf' || 
                   obj.starTypeName === 'Blue Giant' ||
                   obj.starTypeName === 'Red Giant';
        } else if (obj.type === 'planet') {
            // Consider Exotic, Volcanic, and Frozen planets as rare
            return obj.planetTypeName === 'Exotic World' || 
                   obj.planetTypeName === 'Volcanic World' || 
                   obj.planetTypeName === 'Frozen World';
        } else if (obj.type === 'moon') {
            // All moon discoveries are notable due to smaller discovery radius
            return true;
        } else if (obj.type === 'nebula') {
            // All nebulae are rare and notable discoveries
            return true;
        } else if (obj.type === 'asteroids') {
            // Rare mineral and crystalline asteroid gardens are notable
            const gardenType = (obj as any).gardenType;
            return gardenType === 'rare_minerals' || gardenType === 'crystalline' || gardenType === 'icy';
        } else if (obj.type === 'wormhole') {
            // All wormholes are extremely rare and notable discoveries
            return true;
        }
        return false;
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

    playDiscoverySound(obj: CelestialObject, objectType: string): void {
        if (obj.type === 'star') {
            this.soundManager.playStarDiscovery(obj.starTypeName);
        } else if (obj.type === 'planet') {
            this.soundManager.playPlanetDiscovery(obj.planetTypeName);
        } else if (obj.type === 'moon') {
            this.soundManager.playMoonDiscovery();
        } else if (obj.type === 'nebula') {
            // Play special sparkly nebula discovery sound
            this.soundManager.playNebulaDiscovery((obj as any).nebulaType || 'emission');
        } else if (obj.type === 'asteroids') {
            // Play asteroid garden discovery sound (use planet discovery as base sound)
            this.soundManager.playPlanetDiscovery('Asteroid Garden');
        } else if (obj.type === 'wormhole') {
            // Play unique wormhole discovery sound (use nebula discovery as base)
            this.soundManager.playNebulaDiscovery('wormhole');
        }
        
        // Play additional rare discovery sound for special objects
        if (this.isRareDiscovery(obj)) {
            setTimeout(() => {
                this.soundManager.playRareDiscovery();
            }, 300); // Delay for layered effect
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

    checkWormholeTraversal(wormholes: any[]): void {
        // Skip if already traversing or if stellar map is open
        if (this.isTraversing || this.stellarMap.isVisible()) {
            return;
        }

        for (const wormhole of wormholes) {
            if (wormhole.canTraverse && wormhole.canTraverse(this.camera)) {
                // Ship is within wormhole - initiate traversal
                this.initiateWormholeTraversal(wormhole);
                return; // Only traverse one wormhole per frame
            }
        }
    }

    initiateWormholeTraversal(wormhole: any): void {
        // Start traversal transition
        this.isTraversing = true;
        this.traversalStartTime = 0;
        
        // Store destination and momentum
        const destination = wormhole.getDestinationCoordinates();
        this.traversalDestination = {
            x: destination.x,
            y: destination.y,
            velocityX: this.camera.velocityX,
            velocityY: this.camera.velocityY,
            wormhole: wormhole
        };
        
        // Stop ship movement during traversal
        this.camera.velocityX = 0;
        this.camera.velocityY = 0;
        
        // Play traversal sound effect (use rare discovery sound for now)
        this.soundManager.playRareDiscovery();
        
        const destinationDesignation = wormhole.designation === 'alpha' ? 'β' : 'α';
        console.log(`🌀 Starting wormhole traversal: ${wormhole.pairId} → destination ${destinationDesignation}`);
    }

    updateTraversal(deltaTime: number): void {
        if (!this.traversalDestination) return;
        
        this.traversalStartTime += deltaTime;
        
        // Complete traversal at midpoint (1 second in)
        if (this.traversalStartTime >= this.traversalDuration / 2 && this.traversalStartTime - deltaTime < this.traversalDuration / 2) {
            // Teleport to destination
            this.camera.x = this.traversalDestination.x;
            this.camera.y = this.traversalDestination.y;
            
            // Update chunks for new location
            this.chunkManager.updateActiveChunks(this.camera.x, this.camera.y);
            
            // Show traversal notification
            const destinationDesignation = this.traversalDestination.wormhole.designation === 'alpha' ? 'β' : 'α';
            this.discoveryDisplay.addNotification(`Traversed to ${this.traversalDestination.wormhole.wormholeId}-${destinationDesignation}`);
            
            console.log(`🌀 Completed wormhole traversal to ${destinationDesignation}`);
        }
        
        // End traversal
        if (this.traversalStartTime >= this.traversalDuration) {
            // Restore momentum
            this.camera.velocityX = this.traversalDestination.velocityX;
            this.camera.velocityY = this.traversalDestination.velocityY;
            
            // Reset traversal state
            this.isTraversing = false;
            this.traversalDestination = undefined;
        }
    }

    render(): void {
        this.renderer.clear();
        
        // Calculate fade alpha for traversal effect
        let fadeAlpha = 0;
        if (this.isTraversing) {
            const progress = this.traversalStartTime / this.traversalDuration;
            // Fade to black in first half, fade from black in second half
            if (progress < 0.5) {
                fadeAlpha = progress * 2; // 0 to 1
            } else {
                fadeAlpha = 2 - (progress * 2); // 1 to 0
            }
            fadeAlpha = Math.min(1, Math.max(0, fadeAlpha));
        }
        
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
        for (const obj of activeObjects.wormholes) {
            obj.render(this.renderer, this.camera);
        }
        
        this.starParticles.render(this.renderer, this.camera);
        this.thrusterParticles.render(this.renderer);
        this.ship.render(this.renderer, this.camera.rotation, this.camera.x, this.camera.y, activeObjects.celestialStars);
        this.discoveryDisplay.render(this.renderer, this.camera);
        this.discoveryLogbook.render(this.renderer, this.camera);
        
        // Render stellar map overlay (renders on top of everything)
        const discoveredStars = this.chunkManager.getDiscoveredStars();
        const discoveredPlanets = this.chunkManager.getDiscoveredPlanets();
        const discoveredNebulae = this.chunkManager.getDiscoveredNebulae();
        const discoveredWormholes = this.chunkManager.getDiscoveredWormholes();
        this.stellarMap.render(this.renderer, this.camera, discoveredStars, this.gameStartingPosition, discoveredPlanets, discoveredNebulae, discoveredWormholes);
        
        // Render touch UI (renders on top of everything else)
        this.touchUI.render(this.renderer);
        
        // Render traversal fade effect (on top of everything)
        if (fadeAlpha > 0) {
            const ctx = this.renderer.ctx;
            ctx.fillStyle = `rgba(0, 0, 15, ${fadeAlpha})`; // Very dark blue-black
            ctx.fillRect(0, 0, this.renderer.canvas.width, this.renderer.canvas.height);
            
            // Add subtle particle tunnel effect at peak fade
            if (fadeAlpha > 0.8) {
                this.renderTraversalTunnel(ctx, fadeAlpha);
            }
        }
    }

    renderTraversalTunnel(ctx: CanvasRenderingContext2D, intensity: number): void {
        const centerX = this.renderer.canvas.width / 2;
        const centerY = this.renderer.canvas.height / 2;
        const time = this.traversalStartTime * 4; // Speed up animation
        
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