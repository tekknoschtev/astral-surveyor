// Main game orchestration and loop - now uses modular components

class Game {
    constructor(canvas) {
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
        
        // Connect naming service to stellar map
        this.stellarMap.setNamingService(this.namingService);
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
        
        // Initialize chunks around starting position
        this.chunkManager.updateActiveChunks(this.camera.x, this.camera.y);
    }

    setupCanvas() {
        this.renderer.canvas.width = window.innerWidth;
        this.renderer.canvas.height = window.innerHeight;
        
        window.addEventListener('resize', () => {
            this.renderer.canvas.width = window.innerWidth;
            this.renderer.canvas.height = window.innerHeight;
        });
    }

    start() {
        this.gameLoop(0);
    }

    gameLoop = (currentTime) => {
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();

        this.animationId = requestAnimationFrame(this.gameLoop);
    };

    update(deltaTime) {
        this.input.update(deltaTime);
        
        // Resume audio context on first user interaction (required by browsers)
        if (this.soundManager.context && this.soundManager.context.state === 'suspended') {
            if (this.input.keys.size > 0 || this.input.mousePressed || this.input.wasClicked()) {
                this.soundManager.context.resume();
            }
        }
        
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
        
        // Handle mouse clicks on stellar map
        if (this.input.wasClicked()) {
            // Check if touch hit any TouchUI buttons first
            const touchAction = this.touchUI.handleTouch(this.input.mouseX, this.input.mouseY);
            if (touchAction) {
                this.handleTouchAction(touchAction);
                // Prevent the touch from affecting ship movement
                this.input.consumeTouch();
            } else if (this.stellarMap.isVisible()) {
                // Handle stellar map interactions
                const discoveredStars = this.chunkManager.getDiscoveredStars();
                this.stellarMap.handleClick(this.input.mouseX, this.input.mouseY, discoveredStars, this.renderer.canvas);
            }
        }
        
        // Handle pinch-to-zoom gestures on stellar map
        if (this.input.hasPinchZoomIn() && this.stellarMap.isVisible()) {
            this.stellarMap.zoomIn();
        } else if (this.input.hasPinchZoomOut() && this.stellarMap.isVisible()) {
            this.stellarMap.zoomOut();
        }
        
        // Update chunk loading based on camera position
        this.chunkManager.updateActiveChunks(this.camera.x, this.camera.y);
        
        // Get active celestial objects for physics and discovery
        const activeObjects = this.chunkManager.getAllActiveObjects();
        const celestialObjects = [...activeObjects.planets, ...activeObjects.moons, ...activeObjects.celestialStars];
        
        // Update orbital positions for all planets and moons
        for (const planet of activeObjects.planets) {
            planet.updatePosition(deltaTime);
        }
        for (const moon of activeObjects.moons) {
            moon.updatePosition(deltaTime);
        }
        
        // Restore discovery state for newly loaded objects
        this.chunkManager.restoreDiscoveryState(celestialObjects);
        
        this.camera.update(this.input, deltaTime, this.renderer.canvas.width, this.renderer.canvas.height, celestialObjects);
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
        this.touchUI.update(deltaTime, this.renderer.canvas, this.stellarMap);
        
        // Handle mouse wheel scrolling for logbook
        const wheelDelta = this.input.getWheelDelta();
        if (wheelDelta !== 0 && this.discoveryLogbook.isMouseOver(this.input.mouseX, this.input.mouseY, this.renderer.canvas.width, this.renderer.canvas.height)) {
            this.discoveryLogbook.handleMouseWheel(wheelDelta);
        }
        
        // Check for discoveries
        for (const obj of celestialObjects) {
            if (obj.checkDiscovery(this.camera)) {
                // Generate proper astronomical name for the discovery
                const objectName = this.namingService.generateDisplayName(obj);
                const objectType = obj.type === 'planet' ? obj.planetTypeName : 
                                  obj.type === 'moon' ? 'Moon' : obj.starTypeName;
                
                // Add discovery with proper name
                this.discoveryDisplay.addDiscovery(objectName, objectType);
                this.discoveryLogbook.addDiscovery(objectName, objectType);
                this.chunkManager.markObjectDiscovered(obj, objectName);
                
                // Play discovery sound based on object type
                this.playDiscoverySound(obj, objectType);
                
                // Log shareable URL for rare discoveries with proper designation
                if (this.isRareDiscovery(obj)) {
                    const shareableURL = generateShareableURL(this.camera.x, this.camera.y);
                    const isNotable = this.namingService.isNotableDiscovery(obj);
                    const logPrefix = isNotable ? '🌟 RARE DISCOVERY!' : '⭐ Discovery!';
                    console.log(`${logPrefix} Share ${objectName} (${objectType}): ${shareableURL}`);
                }
            }
        }
        
        // Clear frame state at end of update
        this.input.clearFrameState();
    }

    copyCurrentCoordinates() {
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

    showFallbackCopy(url) {
        console.log(`📋 Copy this URL to share coordinates: ${url}`);
        this.discoveryDisplay.addNotification('Copy URL from console to share coordinates');
    }

    isRareDiscovery(obj) {
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
        }
        return false;
    }

    updateShipAudio() {
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

    playDiscoverySound(obj, objectType) {
        if (obj.type === 'star') {
            this.soundManager.playStarDiscovery(obj.starTypeName);
        } else if (obj.type === 'planet') {
            this.soundManager.playPlanetDiscovery(obj.planetTypeName);
        } else if (obj.type === 'moon') {
            this.soundManager.playMoonDiscovery();
        }
        
        // Play additional rare discovery sound for special objects
        if (this.isRareDiscovery(obj)) {
            setTimeout(() => {
                this.soundManager.playRareDiscovery();
            }, 300); // Delay for layered effect
        }
    }

    handleTouchAction(action) {
        switch (action) {
            case 'toggleMap':
                this.stellarMap.toggle();
                if (this.stellarMap.isVisible()) {
                    this.touchUI.showMapControls(this.renderer.canvas);
                } else {
                    this.touchUI.hideMapControls();
                }
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
        }
    }

    render() {
        this.renderer.clear();
        this.starField.render(this.renderer, this.camera);
        
        // Render celestial objects from active chunks
        const activeObjects = this.chunkManager.getAllActiveObjects();
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
        this.stellarMap.render(this.renderer, this.camera, discoveredStars);
        
        // Render touch UI (renders on top of everything else)
        this.touchUI.render(this.renderer);
    }
}

// Initialize the game
window.addEventListener('DOMContentLoaded', () => {
    // Initialize universe seed before creating the game
    initializeUniverseSeed();
    
    const canvas = document.getElementById('gameCanvas');
    const game = new Game(canvas);
    game.start();
});