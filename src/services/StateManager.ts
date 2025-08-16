// StateManager - extracted from game.ts
// Manages all game state including traversal, universe reset, debug mode, and timing

import { Camera } from '../camera/camera.js';
import { StellarMap } from '../ui/stellarmap.js';
import { DiscoveryDisplay } from '../ui/ui.js';
import { GameConfig } from '../config/gameConfig.js';
import { resetUniverse, generateSafeSpawnPosition } from '../utils/random.js';

// Interface for wormhole traversal destination
interface TraversalDestination {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    wormhole: any; // CelestialObject but keeping loose for compatibility
    stellarMapWasVisible: boolean;
}

// Interface for game starting position  
interface GameStartingPosition {
    x: number;
    y: number;
}

export class StateManager {
    // Wormhole traversal state
    isTraversing: boolean = false;
    traversalStartTime: number = 0;
    traversalDuration: number = 2.0; // 2 second transition
    traversalDestination?: TraversalDestination;
    
    // Universe reset state
    isResettingUniverse: boolean = false;
    resetStartTime: number = 0;
    resetDuration: number = 3.0; // 3 seconds for cosmic transition
    
    // Debug mode state
    debugModeEnabled: boolean = false;
    
    // Distance saving state
    distanceSaveTimer: number = 0;
    distanceSaveInterval: number = 5.0; // Save every 5 seconds
    
    // Audio state tracking for ship sounds
    previousThrustState: boolean = false;
    previousBrakeState: boolean = false;
    
    // Game loop timing
    lastTime: number = 0;
    animationId: number = 0;
    gameStartingPosition: GameStartingPosition;

    constructor(gameStartingPosition: GameStartingPosition) {
        this.gameStartingPosition = gameStartingPosition;
        this.debugModeEnabled = this.checkDebugMode();
    }

    /**
     * Check URL parameters for debug mode activation
     */
    checkDebugMode(): boolean {
        // Check URL parameters for debug mode
        const urlParams = new URLSearchParams(window.location.search);
        const debugEnabled = urlParams.has('debug') || urlParams.get('debug') === 'true';
        
        if (debugEnabled) {
            // Enable the debug configuration when URL debug mode is active
            GameConfig.debug.enabled = true;
            console.log('🔧 Debug mode activated!');
            console.log('Debug controls:');
            console.log('  W: Spawn wormhole pair');
            console.log('  B: Spawn black hole');
            console.log('  Shift + H: Show debug help');
            console.log('  Note: Check console for additional debug output');
        }
        
        return debugEnabled;
    }

    /**
     * Start wormhole traversal transition
     */
    startTraversal(
        wormhole: any,
        destinationX: number,
        destinationY: number,
        camera: Camera,
        stellarMap: StellarMap
    ): void {
        this.isTraversing = true;
        this.traversalStartTime = 0;
        
        // Store traversal destination and current state
        this.traversalDestination = {
            x: destinationX,
            y: destinationY,
            velocityX: camera.velocityX,
            velocityY: camera.velocityY,
            wormhole: wormhole,
            stellarMapWasVisible: stellarMap.isVisible()
        };
        
        // Stop ship movement during traversal
        camera.velocityX = 0;
        camera.velocityY = 0;
    }

    /**
     * Update traversal state during transition
     */
    updateTraversal(deltaTime: number, camera: Camera, stellarMap: StellarMap, discoveryDisplay: DiscoveryDisplay, chunkManager: any): void {
        if (!this.traversalDestination) return;
        
        this.traversalStartTime += deltaTime;
        
        // Complete traversal at midpoint (1 second in)
        if (this.traversalStartTime >= this.traversalDuration / 2 && 
            this.traversalStartTime - deltaTime < this.traversalDuration / 2) {
            
            // Teleport to destination at midpoint
            camera.x = this.traversalDestination.x;
            camera.y = this.traversalDestination.y;
            
            // Update chunks for new location
            chunkManager.updateActiveChunks(camera.x, camera.y);
            
            // If stellar map was visible before traversal, center it on new position
            if (this.traversalDestination.stellarMapWasVisible) {
                stellarMap.centerOnPosition(camera.x, camera.y);
            }
            
            // Show traversal notification
            const destinationDesignation = this.traversalDestination.wormhole.designation === 'alpha' ? 'β' : 'α';
            discoveryDisplay.addNotification(`Traversed to ${this.traversalDestination.wormhole.wormholeId}-${destinationDesignation}`);
            
            console.log(`🌀 Completed wormhole traversal to ${destinationDesignation}`);
        }
        
        // End traversal
        if (this.traversalStartTime >= this.traversalDuration) {
            // Restore ship velocity
            camera.velocityX = this.traversalDestination.velocityX;
            camera.velocityY = this.traversalDestination.velocityY;
            
            // Reset traversal state
            this.isTraversing = false;
            this.traversalDestination = undefined;
        }
    }

    /**
     * Update distance saving timer
     */
    updateDistanceSaving(deltaTime: number, camera: Camera): void {
        this.distanceSaveTimer += deltaTime;
        if (this.distanceSaveTimer >= this.distanceSaveInterval) {
            camera.saveDistanceTraveled();
            this.distanceSaveTimer = 0;
        }
    }

    /**
     * Calculate fade alpha for visual effects during transitions
     */
    calculateFadeAlpha(): number {
        let fadeAlpha = 1.0;
        
        // Universe reset fade
        if (this.isResettingUniverse) {
            const progress = this.resetStartTime / this.resetDuration;
            // Cosmic transition: fade to cosmic colors, then fade from cosmic colors
            if (progress < 0.5) {
                fadeAlpha = progress * 2; // 0 to 1
            } else {
                fadeAlpha = 2 - (progress * 2); // 1 to 0
            }
            fadeAlpha = Math.min(1, Math.max(0, fadeAlpha));
        }
        
        // Wormhole traversal fade
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
        
        return Math.max(0, Math.min(1, fadeAlpha));
    }

    /**
     * Get traversal animation time for visual effects
     */
    getTraversalAnimationTime(): number {
        return this.traversalStartTime * 4; // Speed up animation
    }

    /**
     * Check if any transition state is active
     */
    isInTransition(): boolean {
        return this.isTraversing || this.isResettingUniverse;
    }

    /**
     * Update audio state tracking for ship sound triggers
     */
    updateAudioState(isThrusting: boolean, isBraking: boolean): { 
        thrustStarted: boolean; 
        brakeStarted: boolean; 
    } {
        const thrustStarted = isThrusting && !this.previousThrustState;
        const brakeStarted = isBraking && !this.previousBrakeState;
        
        this.previousThrustState = isThrusting;
        this.previousBrakeState = isBraking;
        
        return { thrustStarted, brakeStarted };
    }

    /**
     * Initiate universe reset sequence
     */
    initiateUniverseReset(): void {
        this.isResettingUniverse = true;
        this.resetStartTime = 0;
        console.log('🕳️ SINGULARITY COLLISION - Initiating cosmic rebirth...');
    }

    /**
     * Update universe reset state and handle cosmic rebirth
     */
    updateUniverseReset(
        deltaTime: number, 
        camera: Camera, 
        chunkManager: any, 
        discoveryLogbook: any,
        stellarMap: StellarMap,
        soundManager: any
    ): void {
        this.resetStartTime += deltaTime;
        
        // Complete reset at midpoint (1.5 seconds in)
        if (this.resetStartTime >= this.resetDuration / 2 && 
            this.resetStartTime - deltaTime < this.resetDuration / 2) {
            
            // Preserve discovery data
            const discoveries = discoveryLogbook.getDiscoveries();
            
            // Reset the universe seed for a new cosmic arrangement
            resetUniverse();
            
            // Generate safe spawn position far from any black holes
            const safePosition = generateSafeSpawnPosition();
            camera.x = safePosition.x;
            camera.y = safePosition.y;
            camera.velocityX = 0;
            camera.velocityY = 0;
            
            // Update starting position tracking
            this.gameStartingPosition.x = camera.x;
            this.gameStartingPosition.y = camera.y;
            
            // Force chunk regeneration at new location
            chunkManager.clearAllChunks();
            chunkManager.updateActiveChunks(camera.x, camera.y);
            
            // Restore discovery history (cosmic knowledge persists across rebirths)
            discoveries.forEach(discovery => discoveryLogbook.addDiscovery(discovery.objectName, discovery.objectType));
            
            // Center stellar map on new position
            stellarMap.centerOnPosition(camera.x, camera.y);
            
            // Play cosmic rebirth completion sound
            soundManager.playRareDiscovery(); // Temporary sound
            
            console.log(`🌌 Cosmic rebirth complete! New universe spawned at (${Math.floor(camera.x)}, ${Math.floor(camera.y)})`);
        }
        
        // End reset transition
        if (this.resetStartTime >= this.resetDuration) {
            this.isResettingUniverse = false;
        }
    }

    /**
     * Reset all state to initial values
     */
    reset(): void {
        this.isTraversing = false;
        this.traversalStartTime = 0;
        this.traversalDestination = undefined;
        this.isResettingUniverse = false;
        this.resetStartTime = 0;
        this.distanceSaveTimer = 0;
        this.previousThrustState = false;
        this.previousBrakeState = false;
    }
}