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
    
    // Beta wormhole creation tracking to prevent multiple calls
    private betaCreationInProgress: boolean = false;
    private traversalMidpointReached: boolean = false;
    
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
        
        // Ensure clean initial state
        this.reset();
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
        this.traversalMidpointReached = false; // Reset for new traversal
        this.betaCreationInProgress = false; // Reset for new traversal
        
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
        
        // Safety check to prevent infinite traversal
        if (this.traversalStartTime > this.traversalDuration * 2) {
            console.warn('🌀 Traversal timeout - forcing completion');
            this.isTraversing = false;
            this.traversalDestination = undefined;
            return;
        }
        
        // Complete traversal at midpoint (1 second in) - but only once!
        if (this.traversalStartTime >= this.traversalDuration / 2 && 
            this.traversalStartTime - deltaTime < this.traversalDuration / 2 &&
            !this.traversalMidpointReached) {
            
            this.traversalMidpointReached = true; // Prevent multiple executions
            
            // Teleport to destination at midpoint
            camera.x = this.traversalDestination.x;
            camera.y = this.traversalDestination.y;
            
            // Update chunks for new location FIRST so beta existence check works properly
            chunkManager.updateActiveChunks(camera.x, camera.y);
            
            // CRITICAL FIX: Create beta wormhole AFTER updating chunks to prevent duplication
            this.ensureBetaWormholeExists(camera, chunkManager).catch(err => {
                console.error('Failed to create beta wormhole:', err);
            });
            
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
     * Ensure the beta wormhole exists at the current destination
     */
    private async ensureBetaWormholeExists(camera: any, chunkManager: any): Promise<void> {
        if (!this.traversalDestination) return;
        
        // CRITICAL: Prevent multiple simultaneous calls
        if (this.betaCreationInProgress) {
            console.log(`🌀 DEBUG: Beta creation already in progress, skipping duplicate call`);
            return;
        }
        
        this.betaCreationInProgress = true;
        
        
        const sourceWormhole = this.traversalDestination.wormhole;
        const destChunkX = Math.floor(camera.x / 2000);
        const destChunkY = Math.floor(camera.y / 2000);
        
        const betaChunkX = Math.floor(sourceWormhole.twinX / 2000);
        const betaChunkY = Math.floor(sourceWormhole.twinY / 2000);
        
        // Get or generate the destination chunk
        const destChunk = chunkManager.generateChunk(destChunkX, destChunkY);
        if (!destChunk) {
            return;
        }
        
        // Check if the beta wormhole already exists ANYWHERE in active objects
        const expectedDesignation = sourceWormhole.designation === 'alpha' ? 'beta' : 'alpha';
        
        // CRITICAL: Check in all active objects to prevent duplication
        const allActiveObjects = chunkManager.getAllActiveObjects();
        const betaExistsAnywhere = allActiveObjects.wormholes.some((w: any) => 
            w.wormholeId === sourceWormhole.wormholeId && w.designation === expectedDesignation
        );
        
        if (betaExistsAnywhere) {
            // CRITICAL: Clean up duplicate beta wormholes if they exist
            const duplicateBetas = allActiveObjects.wormholes.filter(w => 
                w.wormholeId === sourceWormhole.wormholeId && w.designation === expectedDesignation
            );
            
            if (duplicateBetas.length > 1) {
                this.cleanupDuplicateBetaWormholes(duplicateBetas, chunkManager);
            }
            
            this.betaCreationInProgress = false; // Reset flag
            return; // Don't create another one!
        }
        
        // If we get here, the beta wormhole doesn't exist anywhere, so create it
        
        // Create the missing beta wormhole at the expected location
        // Import the classes dynamically 
        const wormholesModule = await import('../celestial/wormholes.js');
        const randomModule = await import('../utils/random.js');
        const { Wormhole } = wormholesModule;
        const { SeededRandom, hashPosition } = randomModule;
        
        // Use the source wormhole's twin coordinates (where it thinks the beta should be)
        const betaX = sourceWormhole.twinX;
        const betaY = sourceWormhole.twinY;
        const betaRng = new SeededRandom(hashPosition(betaX, betaY));
        
        const betaWormhole = new Wormhole(
            betaX,
            betaY,
            sourceWormhole.wormholeId,
            expectedDesignation,
            sourceWormhole.x,
            sourceWormhole.y,
            betaRng
        );
        
        // Link the wormholes
        betaWormhole.twinWormhole = sourceWormhole;
        sourceWormhole.twinWormhole = betaWormhole;
        
        // Inherit discovery state from alpha wormhole
        if (sourceWormhole.discovered) {
            betaWormhole.discovered = true;
            betaWormhole.discoveryTimestamp = sourceWormhole.discoveryTimestamp;
        }
        
        // CRITICAL: Reset animation state to prevent rendering corruption
        // The beta wormhole should start with a clean rendering state
        betaWormhole.vortexRotation = 0;
        betaWormhole.energyPulse = 0;
        
        // Add to the chunk
        destChunk.wormholes.push(betaWormhole);
        
        
        // Reset the flag when done
        this.betaCreationInProgress = false;
    }

    /**
     * Clean up duplicate beta wormholes by keeping only the first one
     */
    private cleanupDuplicateBetaWormholes(duplicateBetas: any[], chunkManager: any): void {
        // Keep the first one, remove the rest
        const keepWormhole = duplicateBetas[0];
        const removeWormholes = duplicateBetas.slice(1);
        
        // Get all chunks and remove duplicates from each chunk
        let totalRemoved = 0;
        
        for (const chunk of chunkManager.activeChunks.values()) {
            if (chunk.wormholes) {
                const originalLength = chunk.wormholes.length;
                
                // Remove duplicates but keep the first occurrence
                chunk.wormholes = chunk.wormholes.filter(w => {
                    if (removeWormholes.includes(w)) {
                        return false; // Remove this duplicate
                    }
                    return true; // Keep this wormhole
                });
                
                const removed = originalLength - chunk.wormholes.length;
                if (removed > 0) {
                    totalRemoved += removed;
                }
            }
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
        let fadeAlpha = 0.0; // No fade by default
        
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