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
}

interface CelestialObject {
    type: 'star' | 'planet' | 'moon' | 'nebula';
    x: number;
    y: number;
    starTypeName?: string;
    planetTypeName?: string;
    nebulaTypeData?: { name: string };
    updatePosition?(deltaTime: number): void;
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
        const celestialObjects: CelestialObject[] = [...activeObjects.planets, ...activeObjects.moons, ...activeObjects.celestialStars, ...activeObjects.nebulae];
        
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
        
        // Restore discovery state for newly loaded objects
        this.chunkManager.restoreDiscoveryState(celestialObjects);
        
        this.camera.update(this.input as any, deltaTime, this.renderer.canvas.width, this.renderer.canvas.height, celestialObjects, this.stellarMap);
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

    render(): void {
        this.renderer.clear();
        this.starField.render(this.renderer, this.camera);
        
        // Render celestial objects from active chunks
        const activeObjects = this.chunkManager.getAllActiveObjects();
        
        // Render nebulae first (background layer)
        for (const obj of activeObjects.nebulae) {
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
        
        this.starParticles.render(this.renderer, this.camera);
        this.thrusterParticles.render(this.renderer);
        this.ship.render(this.renderer, this.camera.rotation, this.camera.x, this.camera.y, activeObjects.celestialStars);
        this.discoveryDisplay.render(this.renderer, this.camera);
        this.discoveryLogbook.render(this.renderer, this.camera);
        
        // Render stellar map overlay (renders on top of everything)
        const discoveredStars = this.chunkManager.getDiscoveredStars();
        const discoveredPlanets = this.chunkManager.getDiscoveredPlanets();
        const discoveredNebulae = this.chunkManager.getDiscoveredNebulae();
        this.stellarMap.render(this.renderer, this.camera, discoveredStars, this.gameStartingPosition, discoveredPlanets, discoveredNebulae);
        
        // Render touch UI (renders on top of everything else)
        this.touchUI.render(this.renderer);
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