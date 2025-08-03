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
        this.lastTime = 0;
        this.animationId = 0;
        
        this.setupCanvas();
        
        // Initialize chunks around starting position
        this.chunkManager.updateActiveChunks(0, 0);
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
        
        // Check for discoveries
        for (const obj of celestialObjects) {
            if (obj.checkDiscovery(this.camera)) {
                // Use specific type names for both planets and stars
                let discoveryType;
                if (obj.type === 'planet') {
                    discoveryType = obj.planetTypeName;
                } else if (obj.type === 'star') {
                    discoveryType = obj.starTypeName;
                } else {
                    discoveryType = obj.type; // Fallback for other object types
                }
                this.discoveryDisplay.addDiscovery(discoveryType);
                this.chunkManager.markObjectDiscovered(obj);
            }
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
        for (const obj of activeObjects.celestialStars) {
            obj.render(this.renderer, this.camera);
        }
        
        this.starParticles.render(this.renderer, this.camera);
        this.thrusterParticles.render(this.renderer);
        this.ship.render(this.renderer, this.camera.rotation);
        this.discoveryDisplay.render(this.renderer);
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