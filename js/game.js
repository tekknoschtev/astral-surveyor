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
        this.stellarMap = new StellarMap();
        this.namingService = new NamingService();
        
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
        
        // Handle coordinate copying (C key)
        if (this.input.wasJustPressed('KeyC')) {
            this.copyCurrentCoordinates();
        }
        
        // Handle map toggle (M key)
        if (this.input.wasJustPressed('KeyM')) {
            this.stellarMap.toggle();
        }
        
        // Handle map close (Escape key)
        if (this.input.wasJustPressed('Escape') && this.stellarMap.isVisible()) {
            this.stellarMap.toggle();
        }
        
        // Handle mouse clicks on stellar map
        if (this.input.wasClicked() && this.stellarMap.isVisible()) {
            const discoveredStars = this.chunkManager.getDiscoveredStars();
            this.stellarMap.handleClick(this.input.mouseX, this.input.mouseY, discoveredStars, this.renderer.canvas);
        }
        
        // Update chunk loading based on camera position
        this.chunkManager.updateActiveChunks(this.camera.x, this.camera.y);
        
        // Get active celestial objects for physics and discovery
        const activeObjects = this.chunkManager.getAllActiveObjects();
        const celestialObjects = [...activeObjects.planets, ...activeObjects.celestialStars];
        
        // Update orbital positions for all planets
        for (const planet of activeObjects.planets) {
            planet.updatePosition(deltaTime);
        }
        
        // Restore discovery state for newly loaded objects
        this.chunkManager.restoreDiscoveryState(celestialObjects);
        
        this.camera.update(this.input, deltaTime, this.renderer.canvas.width, this.renderer.canvas.height, celestialObjects);
        this.thrusterParticles.update(deltaTime, this.camera, this.ship);
        this.starParticles.update(deltaTime, activeObjects.celestialStars, this.camera);
        this.discoveryDisplay.update(deltaTime);
        this.stellarMap.update(deltaTime, this.camera, this.input);
        
        // Check for discoveries
        for (const obj of celestialObjects) {
            if (obj.checkDiscovery(this.camera)) {
                // Generate proper astronomical name for the discovery
                const objectName = this.namingService.generateDisplayName(obj);
                const objectType = obj.type === 'planet' ? obj.planetTypeName : obj.starTypeName;
                
                // Add discovery with proper name
                this.discoveryDisplay.addDiscovery(objectName, objectType);
                this.chunkManager.markObjectDiscovered(obj, objectName);
                
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
        }
        return false;
    }

    render() {
        this.renderer.clear();
        this.starField.render(this.renderer, this.camera);
        
        // Render celestial objects from active chunks
        const activeObjects = this.chunkManager.getAllActiveObjects();
        for (const obj of activeObjects.planets) {
            obj.render(this.renderer, this.camera);
        }
        for (const obj of activeObjects.celestialStars) {
            obj.render(this.renderer, this.camera);
        }
        
        this.starParticles.render(this.renderer, this.camera);
        this.thrusterParticles.render(this.renderer);
        this.ship.render(this.renderer, this.camera.rotation);
        this.discoveryDisplay.render(this.renderer, this.camera);
        
        // Render stellar map overlay (renders on top of everything)
        const discoveredStars = this.chunkManager.getDiscoveredStars();
        this.stellarMap.render(this.renderer, this.camera, discoveredStars);
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