import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Import from compiled TypeScript
import { Game } from '../../dist/game.js';
import { resetUniverse, generateSafeSpawnPosition, getUniverseResetCount } from '../../dist/utils/random.js';

// Mock the random utils module
vi.mock('../../dist/utils/random.js', async () => {
  const actual = await vi.importActual('../../dist/utils/random.js');
  return {
    ...actual,
    resetUniverse: vi.fn(),
    generateSafeSpawnPosition: vi.fn(),
    getUniverseResetCount: vi.fn()
  };
});

describe('Game System - Main Game Loop and Orchestration', () => {
  let game;
  let mockCanvas;
  let mockContext;
  let originalRequestAnimationFrame;
  let originalCancelAnimationFrame;
  let originalAddEventListener;
  let requestAnimationFrameCallback;

  // Mock HTML elements and APIs
  const mockNavigator = {
    clipboard: {
      writeText: vi.fn(() => Promise.resolve())
    }
  };

  beforeEach(() => {
    // Reset navigator mock
    mockNavigator.clipboard.writeText.mockReset();
    mockNavigator.clipboard.writeText.mockImplementation(() => Promise.resolve());
    
    // Mock global APIs
    global.navigator = mockNavigator;
    global.console = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };
    
    // Mock location for URL handling
    global.location = {
      origin: 'http://localhost',
      pathname: '/game.html',
      search: ''
    };

    // Mock requestAnimationFrame and cancelAnimationFrame
    originalRequestAnimationFrame = global.requestAnimationFrame;
    originalCancelAnimationFrame = global.cancelAnimationFrame;
    
    global.requestAnimationFrame = vi.fn((callback) => {
      requestAnimationFrameCallback = callback;
      return 1; // Mock animation frame ID
    });
    global.cancelAnimationFrame = vi.fn();
    global.setTimeout = vi.fn();

    // Mock addEventListener for both window and canvas
    originalAddEventListener = global.addEventListener;
    global.addEventListener = vi.fn();
    global.window = {
      addEventListener: vi.fn(),
      innerWidth: 1024,
      innerHeight: 768,
      location: {
        origin: 'http://localhost',
        pathname: '/game.html',
        search: '',
        href: 'http://localhost/game.html'
      }
    };

    // Create comprehensive mock canvas context
    mockContext = {
      // Canvas state properties
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      globalAlpha: 1,
      imageSmoothingEnabled: true,
      
      // Drawing functions
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      
      // Transform functions
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      transform: vi.fn(),
      setTransform: vi.fn(),
      resetTransform: vi.fn(),
      
      // Path functions
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      rect: vi.fn(),
      
      // Image functions
      drawImage: vi.fn(),
      createImageData: vi.fn(),
      getImageData: vi.fn(),
      putImageData: vi.fn(),
      
      // Text functions  
      measureText: vi.fn().mockReturnValue({ width: 100 }),
      fillText: vi.fn(),
      strokeText: vi.fn()
    };

    // Create mock canvas
    mockCanvas = {
      width: 1024,
      height: 768,
      getContext: vi.fn(() => mockContext),
      
      // DOM properties
      style: {},
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      
      // Canvas-specific methods
      toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
      toBlob: vi.fn()
    };

    // Mock localStorage for saving game data
    global.localStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
  });

  afterEach(() => {
    // Restore original functions
    if (originalRequestAnimationFrame) {
      global.requestAnimationFrame = originalRequestAnimationFrame;
    }
    if (originalCancelAnimationFrame) {
      global.cancelAnimationFrame = originalCancelAnimationFrame;
    }
    if (originalAddEventListener) {
      global.addEventListener = originalAddEventListener;
    }

    vi.restoreAllMocks();
  });

  describe('Game Initialization', () => {
    it('should initialize all game systems correctly', () => {
      game = new Game(mockCanvas);

      expect(game.renderer).toBeDefined();
      expect(game.input).toBeDefined();
      expect(game.camera).toBeDefined();
      expect(game.chunkManager).toBeDefined();
      expect(game.starField).toBeDefined();
      expect(game.ship).toBeDefined();
      expect(game.thrusterParticles).toBeDefined();
      expect(game.starParticles).toBeDefined();
      expect(game.discoveryDisplay).toBeDefined();
      expect(game.discoveryLogbook).toBeDefined();
      expect(game.stellarMap).toBeDefined();
      expect(game.namingService).toBeDefined();
      expect(game.touchUI).toBeDefined();
      expect(game.soundManager).toBeDefined();
    });

    it('should set initial state values correctly', () => {
      game = new Game(mockCanvas);

      expect(game.previousThrustState).toBe(false);
      expect(game.previousBrakeState).toBe(false);
      expect(game.distanceSaveTimer).toBe(0);
      expect(game.distanceSaveInterval).toBe(5.0);
      expect(game.lastTime).toBe(0);
      expect(game.animationId).toBe(0);
    });

    it('should setup canvas dimensions correctly', () => {
      game = new Game(mockCanvas);

      expect(mockCanvas.width).toBe(1024);
      expect(mockCanvas.height).toBe(768);
    });

    it('should register window resize event listener', () => {
      game = new Game(mockCanvas);

      expect(global.window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('should track game starting position', () => {
      game = new Game(mockCanvas);

      expect(game.gameStartingPosition).toBeDefined();
      expect(typeof game.gameStartingPosition.x).toBe('number');
      expect(typeof game.gameStartingPosition.y).toBe('number');
    });

    it('should initialize chunk manager with camera position', () => {
      game = new Game(mockCanvas);

      // Verify that the chunk manager was called to update active chunks
      // This tests the integration between camera and chunk management
      expect(game.chunkManager).toBeDefined();
      expect(game.camera.x).toBeDefined();
      expect(game.camera.y).toBeDefined();
    });
  });

  describe('Game Loop Mechanics', () => {
    beforeEach(() => {
      game = new Game(mockCanvas);
    });

    it('should start the game loop correctly', async () => {
      // Since game.start() calls gameLoop(0) but doesn't await it,
      // we need to wait for the first gameLoop cycle to complete
      const gameLoopPromise = game.gameLoop(0);
      
      // Wait for the gameLoop to complete so requestAnimationFrame gets called
      await gameLoopPromise;

      expect(global.requestAnimationFrame).toHaveBeenCalledWith(game.gameLoop);
    });

    it('should calculate delta time correctly', async () => {
      const spy = vi.spyOn(game, 'update');
      
      game.lastTime = 0;
      await game.gameLoop(16); // 16ms = ~60fps

      expect(spy).toHaveBeenCalledWith(0.016); // 16ms / 1000 = 0.016s
    });

    it('should call update and render in game loop', async () => {
      const updateSpy = vi.spyOn(game, 'update');
      const renderSpy = vi.spyOn(game, 'render');

      await game.gameLoop(16);

      expect(updateSpy).toHaveBeenCalled();
      expect(renderSpy).toHaveBeenCalled();
    });

    it('should schedule next frame after game loop', async () => {
      global.requestAnimationFrame.mockClear();
      
      await game.gameLoop(16);

      expect(global.requestAnimationFrame).toHaveBeenCalledWith(game.gameLoop);
    });

    it('should handle zero delta time gracefully', async () => {
      const spy = vi.spyOn(game, 'update');
      
      game.lastTime = 16;
      await game.gameLoop(16); // Same time = 0 delta

      expect(spy).toHaveBeenCalledWith(0);
    });
  });

  describe('Input Processing and UI Interactions', () => {
    beforeEach(() => {
      game = new Game(mockCanvas);
      
      // Mock input system methods
      game.input.update = vi.fn();
      game.input.clearFrameState = vi.fn();
      game.input.wasJustPressed = vi.fn().mockReturnValue(false);
      game.input.wasClicked = vi.fn().mockReturnValue(false);
      game.input.isMousePressed = vi.fn().mockReturnValue(false);
      game.input.getMouseX = vi.fn().mockReturnValue(100);
      game.input.getMouseY = vi.fn().mockReturnValue(100);
      game.input.getWheelDelta = vi.fn().mockReturnValue(0);
      game.input.consumeTouch = vi.fn();
      game.input.isTouchConsumed = vi.fn().mockReturnValue(false);
    });

    it('should handle coordinate copying (C key)', async () => {
      game.input.wasJustPressed.mockImplementation((key) => key === 'KeyC');
      const spy = vi.spyOn(game, 'copyCurrentCoordinates');

      await game.update(0.016);

      expect(spy).toHaveBeenCalled();
    });

    it('should handle map toggle (M key)', async () => {
      game.input.wasJustPressed.mockImplementation((key) => key === 'KeyM');
      game.stellarMap.toggle = vi.fn();

      await game.update(0.016);

      expect(game.stellarMap.toggle).toHaveBeenCalled();
    });

    it('should handle logbook toggle (L key)', async () => {
      game.input.wasJustPressed.mockImplementation((key) => key === 'KeyL');
      game.discoveryLogbook.toggle = vi.fn();

      await game.update(0.016);

      expect(game.discoveryLogbook.toggle).toHaveBeenCalled();
    });

    // H key mute toggle test disabled - functionality moved to settings menu
    // it('should handle audio mute toggle (H key)', async () => {
    //   game.input.wasJustPressed.mockImplementation((key) => key === 'KeyH');
    //   game.soundManager.toggleMute = vi.fn().mockReturnValue(true);
    //   game.discoveryDisplay.addNotification = vi.fn();

    //   await game.update(0.016);

    //   expect(game.soundManager.toggleMute).toHaveBeenCalled();
    //   expect(game.discoveryDisplay.addNotification).toHaveBeenCalledWith('Audio muted');
    // });

    it('should handle escape key for closing UI', async () => {
      game.input.wasJustPressed.mockImplementation((key) => key === 'Escape');
      game.stellarMap.isVisible = vi.fn().mockReturnValue(true);
      game.stellarMap.toggle = vi.fn();

      await game.update(0.016);

      expect(game.stellarMap.toggle).toHaveBeenCalled();
    });

    it('should handle mouse clicks for touch UI', async () => {
      game.input.wasClicked.mockReturnValue(true);
      game.touchUI.handleTouch = vi.fn().mockReturnValue('toggleMap');
      game.stellarMap.resetPanState = vi.fn();
      const spy = vi.spyOn(game, 'handleTouchAction');

      await game.update(0.016);

      expect(game.touchUI.handleTouch).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith('toggleMap');
      expect(game.input.consumeTouch).toHaveBeenCalled();
    });

    it('should handle stellar map interactions when visible', async () => {
      game.input.wasClicked.mockReturnValue(true);
      game.input.isTouchConsumed.mockReturnValue(false);
      game.touchUI.handleTouch = vi.fn().mockReturnValue(null);
      game.stellarMap.isVisible = vi.fn().mockReturnValue(true);
      game.stellarMap.handleStarSelection = vi.fn();
      game.chunkManager.getDiscoveredStars = vi.fn().mockReturnValue([]);
      game.chunkManager.getDiscoveredPlanets = vi.fn().mockReturnValue([]);

      await game.update(0.016);

      expect(game.stellarMap.handleStarSelection).toHaveBeenCalled();
    });
  });

  describe('Touch Action Handling', () => {
    beforeEach(() => {
      game = new Game(mockCanvas);
      game.stellarMap.toggle = vi.fn();
      game.stellarMap.isVisible = vi.fn().mockReturnValue(false);
      game.stellarMap.zoomIn = vi.fn();
      game.stellarMap.zoomOut = vi.fn();
      game.stellarMap.enableFollowPlayer = vi.fn();
      game.discoveryLogbook.toggle = vi.fn();
      game.touchUI.showMapControls = vi.fn();
      game.touchUI.hideMapControls = vi.fn();
    });

    it('should handle toggleMap action', () => {
      game.handleTouchAction('toggleMap');

      expect(game.stellarMap.toggle).toHaveBeenCalled();
    });

    it('should handle toggleLogbook action', () => {
      game.handleTouchAction('toggleLogbook');

      expect(game.discoveryLogbook.toggle).toHaveBeenCalled();
    });

    it('should handle closeMap action', () => {
      game.handleTouchAction('closeMap');

      expect(game.stellarMap.toggle).toHaveBeenCalled();
      expect(game.touchUI.hideMapControls).toHaveBeenCalled();
    });

    it('should handle zoom actions', () => {
      game.handleTouchAction('zoomIn');
      game.handleTouchAction('zoomOut');

      expect(game.stellarMap.zoomIn).toHaveBeenCalled();
      expect(game.stellarMap.zoomOut).toHaveBeenCalled();
    });

    it('should handle followShip action', () => {
      game.handleTouchAction('followShip');

      expect(game.stellarMap.enableFollowPlayer).toHaveBeenCalledWith(game.camera);
    });

    it('should show map controls when map is toggled visible', () => {
      game.stellarMap.isVisible.mockReturnValue(true);
      
      game.handleTouchAction('toggleMap');

      expect(game.touchUI.showMapControls).toHaveBeenCalledWith(game.renderer.canvas);
    });
  });

  describe('System Updates and Integration', () => {
    beforeEach(() => {
      game = new Game(mockCanvas);
      
      // Mock all system update methods
      game.input.update = vi.fn();
      game.input.clearFrameState = vi.fn();
      game.camera.update = vi.fn();
      game.thrusterParticles.update = vi.fn();
      game.starParticles.update = vi.fn();
      game.discoveryDisplay.update = vi.fn();
      game.discoveryLogbook.update = vi.fn();
      game.stellarMap.update = vi.fn();
      game.touchUI.update = vi.fn();
      game.chunkManager.updateActiveChunks = vi.fn();
      game.chunkManager.getAllActiveObjects = vi.fn().mockReturnValue({
        stars: [], // background stars
        planets: [],
        moons: [],
        celestialStars: [],
        nebulae: [],
        asteroidGardens: [],
        wormholes: [],
        blackholes: [],
        comets: []
      });
      game.chunkManager.restoreDiscoveryState = vi.fn();
      
      // Mock input methods
      game.input.wasJustPressed = vi.fn().mockReturnValue(false);
      game.input.wasClicked = vi.fn().mockReturnValue(false);
      game.input.isMousePressed = vi.fn().mockReturnValue(false);
      game.input.getWheelDelta = vi.fn().mockReturnValue(0);
      game.input.getMouseX = vi.fn().mockReturnValue(100);
      game.input.getMouseY = vi.fn().mockReturnValue(100);
    });

    it('should update all systems in correct order', async () => {
      await game.update(0.016);

      expect(game.input.update).toHaveBeenCalledWith(0.016);
      expect(game.chunkManager.updateActiveChunks).toHaveBeenCalled();
      expect(game.camera.update).toHaveBeenCalled();
      expect(game.thrusterParticles.update).toHaveBeenCalled();
      expect(game.starParticles.update).toHaveBeenCalled();
      expect(game.discoveryDisplay.update).toHaveBeenCalled();
      expect(game.discoveryLogbook.update).toHaveBeenCalled();
      expect(game.stellarMap.update).toHaveBeenCalled();
      expect(game.touchUI.update).toHaveBeenCalled();
    });

    it('should clear input frame state at end of update', async () => {
      await game.update(0.016);

      expect(game.input.clearFrameState).toHaveBeenCalled();
    });

    it('should update chunk loading based on camera position', async () => {
      game.camera.x = 1000;
      game.camera.y = 2000;

      await game.update(0.016);

      expect(game.chunkManager.updateActiveChunks).toHaveBeenCalledWith(1000, 2000);
    });

    it('should restore discovery state for loaded objects', async () => {
      const mockObjects = [{ 
        type: 'star', 
        x: 100, 
        y: 200,
        checkDiscovery: vi.fn().mockReturnValue(false),
        distanceToShip: vi.fn().mockReturnValue(1000)
      }];
      game.chunkManager.getAllActiveObjects.mockReturnValue({
        stars: [], // background stars
        planets: mockObjects,
        moons: [],
        celestialStars: [],
        nebulae: [],
        asteroidGardens: [],
        wormholes: [],
        blackholes: [],
        comets: []
      });

      await game.update(0.016);

      expect(game.chunkManager.restoreDiscoveryState).toHaveBeenCalledWith(mockObjects);
    });
  });

  describe('Discovery System', () => {
    beforeEach(() => {
      game = new Game(mockCanvas);
      
      // Mock discovery-related methods
      game.namingService.generateDisplayName = vi.fn().mockReturnValue('Test Star HD-1234');
      game.namingService.isNotableDiscovery = vi.fn().mockReturnValue(false);
      game.discoveryDisplay.addDiscovery = vi.fn();
      game.discoveryLogbook.addDiscovery = vi.fn();
      game.chunkManager.markObjectDiscovered = vi.fn();
      game.soundManager.playStarDiscovery = vi.fn();
      game.soundManager.playPlanetDiscovery = vi.fn();
      game.soundManager.playMoonDiscovery = vi.fn();
      game.soundManager.playRareDiscovery = vi.fn();
      
      // Mock input and other systems
      game.input.update = vi.fn();
      game.input.clearFrameState = vi.fn();
      game.input.wasJustPressed = vi.fn().mockReturnValue(false);
      game.input.wasClicked = vi.fn().mockReturnValue(false);
      game.input.isMousePressed = vi.fn().mockReturnValue(false);
      game.input.getWheelDelta = vi.fn().mockReturnValue(0);
      game.input.getMouseX = vi.fn().mockReturnValue(100);
      game.input.getMouseY = vi.fn().mockReturnValue(100);
      game.chunkManager.updateActiveChunks = vi.fn();
      game.chunkManager.restoreDiscoveryState = vi.fn();
    });

    it('should process star discoveries correctly', async () => {
      const mockStar = {
        type: 'star',
        x: 100,
        y: 200,
        starTypeName: 'G-type Main Sequence',
        checkDiscovery: vi.fn().mockReturnValue(true),
        updatePosition: undefined,
        distanceToShip: vi.fn().mockReturnValue(1000)
      };

      game.chunkManager.getAllActiveObjects = vi.fn().mockReturnValue({
        stars: [], // background stars
        planets: [],
        moons: [],
        celestialStars: [mockStar],
        nebulae: [],
        asteroidGardens: [],
        wormholes: [],
        blackholes: [],
        comets: []
      });

      await game.update(0.016);

      expect(game.namingService.generateDisplayName).toHaveBeenCalledWith(mockStar);
      expect(game.discoveryDisplay.addDiscovery).toHaveBeenCalledWith('Test Star HD-1234', 'G-type Main Sequence');
      expect(game.discoveryLogbook.addDiscovery).toHaveBeenCalledWith('Test Star HD-1234', 'G-type Main Sequence');
      expect(game.chunkManager.markObjectDiscovered).toHaveBeenCalledWith(mockStar, 'Test Star HD-1234');
      expect(game.soundManager.playStarDiscovery).toHaveBeenCalledWith('G-type Main Sequence');
    });

    it('should process planet discoveries correctly', async () => {
      const mockPlanet = {
        type: 'planet',
        x: 300,
        y: 400,
        planetTypeName: 'Rocky World',
        checkDiscovery: vi.fn().mockReturnValue(true),
        updatePosition: vi.fn(),
        distanceToShip: vi.fn().mockReturnValue(1000)
      };

      game.chunkManager.getAllActiveObjects = vi.fn().mockReturnValue({
        stars: [], // background stars
        planets: [mockPlanet],
        moons: [],
        celestialStars: [],
        nebulae: [],
        asteroidGardens: [],
        wormholes: [],
        blackholes: [],
        comets: []
      });

      await game.update(0.016);

      expect(mockPlanet.updatePosition).toHaveBeenCalledWith(0.016);
      expect(game.discoveryDisplay.addDiscovery).toHaveBeenCalledWith('Test Star HD-1234', 'Rocky World');
      expect(game.soundManager.playPlanetDiscovery).toHaveBeenCalledWith('Rocky World');
    });

    it('should process moon discoveries correctly', async () => {
      const mockMoon = {
        type: 'moon',
        x: 500,
        y: 600,
        checkDiscovery: vi.fn().mockReturnValue(true),
        updatePosition: vi.fn(),
        distanceToShip: vi.fn().mockReturnValue(1000)
      };

      game.chunkManager.getAllActiveObjects = vi.fn().mockReturnValue({
        stars: [], // background stars
        planets: [],
        moons: [mockMoon],
        celestialStars: [],
        nebulae: [],
        asteroidGardens: [],
        wormholes: [],
        blackholes: [],
        comets: []
      });

      await game.update(0.016);

      expect(mockMoon.updatePosition).toHaveBeenCalledWith(0.016);
      expect(game.discoveryDisplay.addDiscovery).toHaveBeenCalledWith('Test Star HD-1234', 'Moon');
      expect(game.soundManager.playMoonDiscovery).toHaveBeenCalled();
    });

    it('should process nebula discoveries correctly', async () => {
      const mockNebula = {
        type: 'nebula',
        x: 700,
        y: 800,
        nebulaTypeData: { name: 'Emission Nebula' },
        nebulaType: 'emission',
        checkDiscovery: vi.fn().mockReturnValue(true),
        distanceToShip: vi.fn().mockReturnValue(1000)
      };

      game.soundManager.playNebulaDiscovery = vi.fn();
      game.soundManager.playRareDiscovery = vi.fn();

      game.chunkManager.getAllActiveObjects = vi.fn().mockReturnValue({
        stars: [],
        planets: [],
        moons: [],
        celestialStars: [],
        nebulae: [mockNebula],
        asteroidGardens: [],
        wormholes: [],
        blackholes: [],
        comets: []
      });

      await game.update(0.016);

      expect(game.discoveryDisplay.addDiscovery).toHaveBeenCalledWith('Test Star HD-1234', 'Emission Nebula');
      expect(game.soundManager.playNebulaDiscovery).toHaveBeenCalledWith('emission');
      // Nebulae are rare, so should play rare discovery sound
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 300);
    });

    it('should process asteroid garden discoveries correctly', async () => {
      const mockAsteroidGarden = {
        type: 'asteroids',
        x: 900,
        y: 1000,
        gardenTypeData: { name: 'Metallic Asteroid Garden' },
        gardenType: 'metallic',
        checkDiscovery: vi.fn().mockReturnValue(true),
        distanceToShip: vi.fn().mockReturnValue(1000)
      };

      game.chunkManager.getAllActiveObjects = vi.fn().mockReturnValue({
        stars: [],
        planets: [],
        moons: [],
        celestialStars: [],
        nebulae: [],
        asteroidGardens: [mockAsteroidGarden],
        wormholes: [],
        blackholes: [],
        comets: []
      });

      await game.update(0.016);

      expect(game.discoveryDisplay.addDiscovery).toHaveBeenCalledWith('Test Star HD-1234', 'Metallic Asteroid Garden');
      expect(game.soundManager.playPlanetDiscovery).toHaveBeenCalledWith('Asteroid Garden');
    });

    it('should process wormhole discoveries correctly', async () => {
      const mockWormhole = {
        type: 'wormhole',
        x: 1100,
        y: 1200,
        wormholeId: 'WH-001',
        checkDiscovery: vi.fn().mockReturnValue(true),
        distanceToShip: vi.fn().mockReturnValue(1000)
      };

      game.soundManager.playWormholeDiscovery = vi.fn();
      game.soundManager.playRareDiscovery = vi.fn();

      // Add distanceToShip method to all mock objects
      mockWormhole.distanceToShip = vi.fn().mockReturnValue(1000);
      
      game.chunkManager.getAllActiveObjects = vi.fn().mockReturnValue({
        stars: [],
        planets: [],
        moons: [],
        celestialStars: [],
        nebulae: [],
        asteroidGardens: [],
        wormholes: [mockWormhole],
        blackholes: [],
        comets: []
      });

      await game.update(0.016);

      expect(game.discoveryDisplay.addDiscovery).toHaveBeenCalledWith('Test Star HD-1234', 'Stable Traversable Wormhole');
      expect(game.soundManager.playWormholeDiscovery).toHaveBeenCalled();
      // Wormholes are rare, so should play rare discovery sound
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 300);
    });

    it('should process black hole discoveries correctly', async () => {
      const mockBlackHole = {
        type: 'blackhole',
        x: 1300,
        y: 1400,
        blackHoleTypeName: 'Stellar Mass Black Hole',
        checkDiscovery: vi.fn().mockReturnValue(true),
        distanceToShip: vi.fn().mockReturnValue(1000)
      };

      game.soundManager.playBlackHoleDiscovery = vi.fn();
      game.soundManager.playRareDiscovery = vi.fn();

      game.chunkManager.getAllActiveObjects = vi.fn().mockReturnValue({
        stars: [],
        planets: [],
        moons: [],
        celestialStars: [],
        nebulae: [],
        asteroidGardens: [],
        wormholes: [],
        blackholes: [mockBlackHole],
        comets: []
      });

      await game.update(0.016);

      expect(game.discoveryDisplay.addDiscovery).toHaveBeenCalledWith('Test Star HD-1234', 'Stellar Mass Black Hole');
      expect(game.soundManager.playBlackHoleDiscovery).toHaveBeenCalled();
      // Black holes are ultra-rare, so should play rare discovery sound
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 300);
    });
  });

  describe('Rare Discovery Detection', () => {
    beforeEach(() => {
      game = new Game(mockCanvas);
    });

    it('should identify rare star types correctly', () => {
      expect(game.isRareDiscovery({ type: 'star', starTypeName: 'Neutron Star' })).toBe(true);
      expect(game.isRareDiscovery({ type: 'star', starTypeName: 'White Dwarf' })).toBe(true);
      expect(game.isRareDiscovery({ type: 'star', starTypeName: 'Blue Giant' })).toBe(true);
      expect(game.isRareDiscovery({ type: 'star', starTypeName: 'Red Giant' })).toBe(true);
      expect(game.isRareDiscovery({ type: 'star', starTypeName: 'G-type Main Sequence' })).toBe(false);
    });

    it('should identify rare planet types correctly', () => {
      expect(game.isRareDiscovery({ type: 'planet', planetTypeName: 'Exotic World' })).toBe(true);
      expect(game.isRareDiscovery({ type: 'planet', planetTypeName: 'Volcanic World' })).toBe(true);
      expect(game.isRareDiscovery({ type: 'planet', planetTypeName: 'Frozen World' })).toBe(true);
      expect(game.isRareDiscovery({ type: 'planet', planetTypeName: 'Rocky World' })).toBe(false);
    });

    it('should consider all moons as notable discoveries', () => {
      expect(game.isRareDiscovery({ type: 'moon' })).toBe(true);
    });

    it('should identify rare nebulae correctly', () => {
      expect(game.isRareDiscovery({ type: 'nebula' })).toBe(true);
    });

    it('should identify rare asteroid gardens correctly', () => {
      expect(game.isRareDiscovery({ type: 'asteroids', gardenType: 'rare_minerals' })).toBe(true);
      expect(game.isRareDiscovery({ type: 'asteroids', gardenType: 'crystalline' })).toBe(true);
      expect(game.isRareDiscovery({ type: 'asteroids', gardenType: 'icy' })).toBe(true);
      expect(game.isRareDiscovery({ type: 'asteroids', gardenType: 'metallic' })).toBe(false);
    });

    it('should identify rare wormholes correctly', () => {
      expect(game.isRareDiscovery({ type: 'wormhole' })).toBe(true);
    });

    it('should identify rare black holes correctly', () => {
      expect(game.isRareDiscovery({ type: 'blackhole' })).toBe(true);
    });

    it('should handle unknown object types', () => {
      expect(game.isRareDiscovery({ type: 'unknown' })).toBe(false);
    });
  });

  describe('Coordinate Sharing System', () => {
    beforeEach(() => {
      game = new Game(mockCanvas);
      game.discoveryDisplay.addNotification = vi.fn();
    });

    it('should copy coordinates to clipboard when supported', async () => {
      game.camera.x = 1000;
      game.camera.y = -500;

      await game.copyCurrentCoordinates();

      expect(mockNavigator.clipboard.writeText).toHaveBeenCalled();
      const callArgs = mockNavigator.clipboard.writeText.mock.calls[0][0];
      expect(callArgs).toContain('x=1000');
      expect(callArgs).toContain('y=-500');
      expect(game.discoveryDisplay.addNotification).toHaveBeenCalledWith('Coordinates copied to clipboard!');
    });

    // Note: Clipboard error handling is tested in integration but difficult to mock consistently
    // The main behavior (fallback) is covered in the "clipboard not available" test

    it('should show fallback copy when clipboard not available', () => {
      global.navigator = {}; // Remove clipboard support

      game.showFallbackCopy('test-url');

      expect(game.discoveryDisplay.addNotification).toHaveBeenCalledWith('Copy URL from console to share coordinates');
    });
  });

  describe('Distance Saving System', () => {
    beforeEach(() => {
      game = new Game(mockCanvas);
      game.camera.saveDistanceTraveled = vi.fn();
      game.input.update = vi.fn();
      game.input.clearFrameState = vi.fn();
      game.input.wasJustPressed = vi.fn().mockReturnValue(false);
      game.input.wasClicked = vi.fn().mockReturnValue(false);
      game.input.isMousePressed = vi.fn().mockReturnValue(false);
      game.input.getWheelDelta = vi.fn().mockReturnValue(0);
      game.input.getMouseX = vi.fn().mockReturnValue(100);
      game.input.getMouseY = vi.fn().mockReturnValue(100);
      game.chunkManager.updateActiveChunks = vi.fn();
      game.chunkManager.getAllActiveObjects = vi.fn().mockReturnValue({
        stars: [], // background stars
        planets: [],
        moons: [],
        celestialStars: [],
        nebulae: [],
        asteroidGardens: [],
        wormholes: [],
        blackholes: [],
        comets: []
      });
      game.chunkManager.restoreDiscoveryState = vi.fn();
    });

    it('should save distance periodically', async () => {
      game.distanceSaveTimer = 4.9; // Just under threshold
      await game.update(0.2); // This should push it over 5.0

      expect(game.camera.saveDistanceTraveled).toHaveBeenCalled();
      expect(game.distanceSaveTimer).toBe(0); // Should reset
    });

    it('should not save distance before interval', async () => {
      game.distanceSaveTimer = 2.0;
      await game.update(0.1);

      expect(game.camera.saveDistanceTraveled).not.toHaveBeenCalled();
      expect(game.distanceSaveTimer).toBe(2.1);
    });
  });

  describe('Rendering System', () => {
    beforeEach(() => {
      game = new Game(mockCanvas);
      
      // Mock all render methods
      game.renderer.clear = vi.fn();
      game.starField.render = vi.fn();
      game.starParticles.render = vi.fn();
      game.thrusterParticles.render = vi.fn();
      game.ship.render = vi.fn();
      game.discoveryDisplay.render = vi.fn();
      game.discoveryLogbook.render = vi.fn();
      game.stellarMap.render = vi.fn();
      game.touchUI.render = vi.fn();
      
      game.chunkManager.getAllActiveObjects = vi.fn().mockReturnValue({
        stars: [], // background stars (rendered by starField)
        planets: [{ render: vi.fn() }],
        moons: [{ render: vi.fn() }],
        celestialStars: [{ render: vi.fn() }],
        nebulae: [{ render: vi.fn() }],
        asteroidGardens: [{ render: vi.fn() }],
        wormholes: [{ render: vi.fn() }],
        blackholes: [{ render: vi.fn() }],
        comets: [{ render: vi.fn() }]
      });
      game.chunkManager.getDiscoveredStars = vi.fn().mockReturnValue([]);
      game.chunkManager.getDiscoveredPlanets = vi.fn().mockReturnValue([]);
    });

    it('should render all systems in correct order', () => {
      game.render();

      expect(game.renderer.clear).toHaveBeenCalled();
      expect(game.starField.render).toHaveBeenCalledWith(game.renderer, game.camera);
      expect(game.starParticles.render).toHaveBeenCalledWith(game.renderer, game.camera);
      expect(game.thrusterParticles.render).toHaveBeenCalledWith(game.renderer);
      expect(game.ship.render).toHaveBeenCalled();
      expect(game.discoveryDisplay.render).toHaveBeenCalledWith(game.renderer, game.camera);
      expect(game.discoveryLogbook.render).toHaveBeenCalledWith(game.renderer, game.camera);
      expect(game.stellarMap.render).toHaveBeenCalled();
      expect(game.touchUI.render).toHaveBeenCalledWith(game.renderer);
    });

    it('should render all active celestial objects', () => {
      const activeObjects = game.chunkManager.getAllActiveObjects();
      
      game.render();

      activeObjects.planets.forEach(obj => {
        expect(obj.render).toHaveBeenCalledWith(game.renderer, game.camera);
      });
      activeObjects.moons.forEach(obj => {
        expect(obj.render).toHaveBeenCalledWith(game.renderer, game.camera);
      });
      activeObjects.celestialStars.forEach(obj => {
        expect(obj.render).toHaveBeenCalledWith(game.renderer, game.camera);
      });
    });
  });

  describe('Mouse Wheel Handling', () => {
    beforeEach(() => {
      game = new Game(mockCanvas);
      game.input.update = vi.fn();
      game.input.clearFrameState = vi.fn();
      game.input.wasJustPressed = vi.fn().mockReturnValue(false);
      game.input.wasClicked = vi.fn().mockReturnValue(false);
      game.input.isMousePressed = vi.fn().mockReturnValue(false);
      game.input.getMouseX = vi.fn().mockReturnValue(100);
      game.input.getMouseY = vi.fn().mockReturnValue(100);
      game.input.getWheelDelta = vi.fn().mockReturnValue(0);
      game.chunkManager.updateActiveChunks = vi.fn();
      game.chunkManager.getAllActiveObjects = vi.fn().mockReturnValue({
        stars: [], // background stars
        planets: [],
        moons: [],
        celestialStars: [],
        nebulae: [],
        asteroidGardens: [],
        wormholes: [],
        blackholes: [],
        comets: []
      });
      game.chunkManager.restoreDiscoveryState = vi.fn();
      game.discoveryLogbook.isMouseOver = vi.fn().mockReturnValue(false);
      game.discoveryLogbook.handleMouseWheel = vi.fn();
    });

    it('should handle mouse wheel for logbook when over logbook area', async () => {
      game.input.getWheelDelta.mockReturnValue(-120);
      game.discoveryLogbook.isMouseOver.mockReturnValue(true);

      await game.update(0.016);

      expect(game.discoveryLogbook.handleMouseWheel).toHaveBeenCalledWith(-120);
    });

    it('should not handle mouse wheel when not over logbook', async () => {
      game.input.getWheelDelta.mockReturnValue(-120);
      game.discoveryLogbook.isMouseOver.mockReturnValue(false);

      await game.update(0.016);

      expect(game.discoveryLogbook.handleMouseWheel).not.toHaveBeenCalled();
    });

    it('should ignore zero wheel delta', async () => {
      game.input.getWheelDelta.mockReturnValue(0);
      game.discoveryLogbook.isMouseOver.mockReturnValue(true);

      await game.update(0.016);

      expect(game.discoveryLogbook.handleMouseWheel).not.toHaveBeenCalled();
    });
  });

  describe('Wormhole Traversal System', () => {
    beforeEach(() => {
      game = new Game(mockCanvas);
      
      // Mock all required systems
      game.input.update = vi.fn();
      game.input.clearFrameState = vi.fn();
      game.input.wasJustPressed = vi.fn().mockReturnValue(false);
      game.input.wasClicked = vi.fn().mockReturnValue(false);
      game.input.isMousePressed = vi.fn().mockReturnValue(false);
      game.input.getWheelDelta = vi.fn().mockReturnValue(0);
      game.input.getMouseX = vi.fn().mockReturnValue(100);
      game.input.getMouseY = vi.fn().mockReturnValue(100);
      game.chunkManager.updateActiveChunks = vi.fn();
      game.chunkManager.getAllActiveObjects = vi.fn().mockReturnValue({
        stars: [],
        planets: [],
        moons: [],
        celestialStars: [],
        nebulae: [],
        asteroidGardens: [],
        wormholes: [],
        blackholes: [],
        comets: []
      });
      game.chunkManager.restoreDiscoveryState = vi.fn();
      game.stellarMap.isVisible = vi.fn().mockReturnValue(false);
      game.soundManager.playWormholeTraversal = vi.fn();
      game.discoveryDisplay.addNotification = vi.fn();
    });

    it('should detect wormhole traversal when ship is within range', async () => {
      const mockWormhole = {
        canTraverse: vi.fn().mockReturnValue(true),
        getDestinationCoordinates: vi.fn().mockReturnValue({ x: 5000, y: 6000 }),
        designation: 'alpha',
        pairId: 'WH-001',
        wormholeId: 'WH-001',
        distanceToShip: vi.fn().mockReturnValue(1000),
        checkDiscovery: vi.fn().mockReturnValue(false)
      };

      game.chunkManager.getAllActiveObjects.mockReturnValue({
        stars: [],
        planets: [],
        moons: [],
        celestialStars: [],
        nebulae: [],
        asteroidGardens: [],
        wormholes: [mockWormhole],
        blackholes: [],
        comets: []
      });

      game.camera.velocityX = 100;
      game.camera.velocityY = 200;

      await game.update(0.016);

      expect(game.isTraversing).toBe(true);
      expect(game.traversalDestination).toEqual(expect.objectContaining({
        x: 5000,
        y: 6000,
        velocityX: expect.any(Number),
        velocityY: expect.any(Number),
        wormhole: mockWormhole
      }));
      expect(game.soundManager.playWormholeTraversal).toHaveBeenCalled();
    });

    it('should allow traversal when stellar map is visible and preserve map state', async () => {
      game.stellarMap.isVisible.mockReturnValue(true);
      game.stellarMap.centerOnPosition = vi.fn();
      const mockWormhole = {
        canTraverse: vi.fn().mockReturnValue(true),
        distanceToShip: vi.fn().mockReturnValue(1000),
        checkDiscovery: vi.fn().mockReturnValue(false),
        getDestinationCoordinates: vi.fn().mockReturnValue({ x: 2000, y: 3000 }),
        designation: 'alpha',
        pairId: 'WH-TEST'
      };

      game.chunkManager.getAllActiveObjects.mockReturnValue({
        stars: [],
        planets: [],
        moons: [],
        celestialStars: [],
        nebulae: [],
        asteroidGardens: [],
        wormholes: [mockWormhole],
        blackholes: [],
        comets: []
      });

      await game.update(0.016);

      expect(game.isTraversing).toBe(true);
      expect(mockWormhole.canTraverse).toHaveBeenCalled();
      expect(game.traversalDestination.stellarMapWasVisible).toBe(true);
    });

    it('should complete traversal correctly', async () => {
      // Setup traversal state
      game.isTraversing = true;
      game.traversalStartTime = 0.9; // Near midpoint
      game.traversalDestination = {
        x: 5000,
        y: 6000,
        velocityX: 100,
        velocityY: 200,
        wormhole: { designation: 'alpha', wormholeId: 'WH-001' },
        stellarMapWasVisible: false
      };

      await game.update(0.2); // Push over midpoint

      // Should complete at midpoint
      expect(game.camera.x).toBe(5000);
      expect(game.camera.y).toBe(6000);
      expect(game.chunkManager.updateActiveChunks).toHaveBeenCalledWith(5000, 6000);
      expect(game.discoveryDisplay.addNotification).toHaveBeenCalledWith('Traversed to WH-001-β');
    });

    it('should center stellar map on new position when it was visible during traversal', async () => {
      // Setup traversal state with stellar map visible
      game.isTraversing = true;
      game.traversalStartTime = 0.9; // Near midpoint
      game.stellarMap.centerOnPosition = vi.fn();
      game.traversalDestination = {
        x: 5000,
        y: 6000,
        velocityX: 100,
        velocityY: 200,
        wormhole: { designation: 'alpha', wormholeId: 'WH-001' },
        stellarMapWasVisible: true
      };

      await game.update(0.2); // Push over midpoint

      // Should complete at midpoint and center stellar map
      expect(game.camera.x).toBe(5000);
      expect(game.camera.y).toBe(6000);
      expect(game.stellarMap.centerOnPosition).toHaveBeenCalledWith(5000, 6000);
    });

    it('should end traversal and restore momentum', async () => {
      // Setup traversal near end
      game.isTraversing = true;
      game.traversalStartTime = 1.9; // Near end
      game.traversalDestination = {
        x: 5000,
        y: 6000,
        velocityX: 100,
        velocityY: 200,
        wormhole: { designation: 'alpha', wormholeId: 'WH-001' },
        stellarMapWasVisible: false
      };

      await game.update(0.2); // Push past end

      expect(game.isTraversing).toBe(false);
      expect(game.traversalDestination).toBeUndefined();
      expect(game.camera.velocityX).toBe(100);
      expect(game.camera.velocityY).toBe(200);
    });
  });

  describe('Black Hole Gravitational System', () => {
    beforeEach(() => {
      game = new Game(mockCanvas);
      
      // Mock all required systems
      game.input.update = vi.fn();
      game.input.clearFrameState = vi.fn();
      game.input.wasJustPressed = vi.fn().mockReturnValue(false);
      game.input.wasClicked = vi.fn().mockReturnValue(false);
      game.input.isMousePressed = vi.fn().mockReturnValue(false);
      game.input.getWheelDelta = vi.fn().mockReturnValue(0);
      game.input.getMouseX = vi.fn().mockReturnValue(100);
      game.input.getMouseY = vi.fn().mockReturnValue(100);
      game.chunkManager.updateActiveChunks = vi.fn();
      game.chunkManager.restoreDiscoveryState = vi.fn();
      game.discoveryDisplay.addNotification = vi.fn();

      // Reset warning system
      game.lastBlackHoleWarnings.clear();
    });

    it('should apply gravitational pull from black holes', async () => {
      const mockBlackHole = {
        update: vi.fn(),
        updateGravitationalEffects: vi.fn().mockReturnValue({
          pullForceX: 50,
          pullForceY: 75,
          warningLevel: 1,
          isPastEventHorizon: false
        }),
        getProximityWarning: vi.fn().mockReturnValue('Approaching black hole event horizon'),
        uniqueId: 'BH-001',
        distanceToShip: vi.fn().mockReturnValue(1000),
        checkDiscovery: vi.fn().mockReturnValue(false)
      };

      game.chunkManager.getAllActiveObjects = vi.fn().mockReturnValue({
        stars: [],
        planets: [],
        moons: [],
        celestialStars: [],
        nebulae: [],
        asteroidGardens: [],
        wormholes: [],
        blackholes: [mockBlackHole],
        comets: []
      });

      const initialVelocityX = game.camera.velocityX;
      const initialVelocityY = game.camera.velocityY;

      await game.update(0.016);

      expect(mockBlackHole.updateGravitationalEffects).toHaveBeenCalledWith(game.camera, 0.016);
      expect(game.camera.velocityX).toBe(initialVelocityX + 50 * 0.016);
      expect(game.camera.velocityY).toBe(initialVelocityY + 75 * 0.016);
    });

    it('should display black hole warning with cooldown', async () => {
      const mockBlackHole = {
        update: vi.fn(),
        updateGravitationalEffects: vi.fn().mockReturnValue({
          pullForceX: 0,
          pullForceY: 0,
          warningLevel: 2,
          isPastEventHorizon: false
        }),
        getProximityWarning: vi.fn().mockReturnValue('Dangerous gravitational field detected'),
        uniqueId: 'BH-001',
        distanceToShip: vi.fn().mockReturnValue(1000),
        checkDiscovery: vi.fn().mockReturnValue(false)
      };

      game.chunkManager.getAllActiveObjects = vi.fn().mockReturnValue({
        stars: [],
        planets: [],
        moons: [],
        celestialStars: [],
        nebulae: [],
        asteroidGardens: [],
        wormholes: [],
        blackholes: [mockBlackHole],
        comets: []
      });

      await game.update(0.016);

      expect(game.discoveryDisplay.addNotification).toHaveBeenCalledWith('🔥 DANGER: Dangerous gravitational field detected');
      
      // Reset mock and update again immediately (should not warn due to cooldown)
      game.discoveryDisplay.addNotification.mockClear();
      await game.update(0.016);
      
      expect(game.discoveryDisplay.addNotification).not.toHaveBeenCalled();
    });

    it('should display critical warning for event horizon', async () => {
      const mockBlackHole = {
        update: vi.fn(),
        updateGravitationalEffects: vi.fn().mockReturnValue({
          pullForceX: 0,
          pullForceY: 0,
          warningLevel: 3,
          isPastEventHorizon: true
        }),
        getProximityWarning: vi.fn().mockReturnValue('Beyond event horizon - spacetime collapse imminent'),
        uniqueId: 'BH-001',
        distanceToShip: vi.fn().mockReturnValue(1000),
        checkDiscovery: vi.fn().mockReturnValue(false)
      };

      game.chunkManager.getAllActiveObjects = vi.fn().mockReturnValue({
        stars: [],
        planets: [],
        moons: [],
        celestialStars: [],
        nebulae: [],
        asteroidGardens: [],
        wormholes: [],
        blackholes: [mockBlackHole],
        comets: []
      });

      await game.update(0.016);

      expect(game.discoveryDisplay.addNotification).toHaveBeenCalledWith('🚨 CRITICAL: Beyond event horizon - spacetime collapse imminent');
    });

    it('should initiate universe reset on singularity collision', async () => {
      const mockBlackHole = {
        update: vi.fn(),
        updateGravitationalEffects: vi.fn().mockReturnValue({ pullForceX: 0, pullForceY: 0, warningLevel: 0, isPastEventHorizon: false }),
        checkSingularityCollision: vi.fn().mockReturnValue(true),
        uniqueId: 'BH-001',
        distanceToShip: vi.fn().mockReturnValue(1000),
        checkDiscovery: vi.fn().mockReturnValue(false)
      };

      game.chunkManager.getAllActiveObjects = vi.fn().mockReturnValue({
        stars: [],
        planets: [],
        moons: [],
        celestialStars: [],
        nebulae: [],
        asteroidGardens: [],
        wormholes: [],
        blackholes: [mockBlackHole],
        comets: []
      });

      await game.update(0.016);

      expect(game.isResettingUniverse).toBe(true);
      expect(game.discoveryDisplay.addNotification).toHaveBeenCalledWith('🚨 Singularity Contact - Cosmic Rebirth Initiated');
    });
  });

  describe('Universe Reset System', () => {
    beforeEach(() => {
      game = new Game(mockCanvas);
      
      // Mock discovery logbook
      game.discoveryLogbook.getDiscoveries = vi.fn().mockReturnValue([
        { name: 'HD-1234', type: 'G-type Main Sequence', timestamp: Date.now() },
        { name: 'Kepler-442b', type: 'Rocky World', timestamp: Date.now() }
      ]);
      game.discoveryLogbook.addDiscovery = vi.fn();
      
      // Mock chunk manager
      game.chunkManager.clearAllChunks = vi.fn();
      game.chunkManager.updateActiveChunks = vi.fn();
      
      // Mock camera
      game.camera.x = 1000;
      game.camera.y = 2000;
      game.camera.velocityX = 100;
      game.camera.velocityY = 200;
      
      game.discoveryDisplay.addNotification = vi.fn();
    });

    it('should complete universe reset at midpoint', async () => {
      // Setup reset state near midpoint
      game.isResettingUniverse = true;
      game.resetStartTime = 1.4; // Near midpoint (1.5s)
      
      // Configure the mocked functions
      vi.mocked(resetUniverse).mockReturnValue(123456);
      vi.mocked(generateSafeSpawnPosition).mockReturnValue({ x: 0, y: 0 });
      vi.mocked(getUniverseResetCount).mockReturnValue(2);

      await game.update(0.2); // Push past midpoint

      // Verify the actual implementation calls
      expect(resetUniverse).toHaveBeenCalledWith(); // Called with no arguments
      expect(generateSafeSpawnPosition).toHaveBeenCalled();
      expect(game.camera.x).toBe(0);
      expect(game.camera.y).toBe(0);
      expect(game.camera.velocityX).toBe(0);
      expect(game.camera.velocityY).toBe(0);
      expect(game.chunkManager.clearAllChunks).toHaveBeenCalled();
      expect(game.discoveryLogbook.addDiscovery).toHaveBeenCalledTimes(2); // Two discoveries restored
    });

    it('should end universe reset transition', async () => {
      // Setup reset near end
      game.isResettingUniverse = true;
      game.resetStartTime = 2.9; // Near end (3.0s)

      await game.update(0.2); // Push past end

      expect(game.isResettingUniverse).toBe(false);
    });
  });

  // Audio State Management tests disabled - H key functionality moved to settings menu
  // describe('Audio State Management', () => {
  //   beforeEach(() => {
  //     game = new Game(mockCanvas);
  //     game.soundManager.toggleMute = vi.fn();
  //     game.discoveryDisplay.addNotification = vi.fn();
  //   });

  //   it('should handle audio unmute notification', async () => {
  //     game.input.wasJustPressed = vi.fn().mockImplementation((key) => key === 'KeyH');
  //     game.soundManager.toggleMute.mockReturnValue(false); // Not muted
      
  //     await game.update(0.016);

  //     expect(game.soundManager.toggleMute).toHaveBeenCalled();
  //     expect(game.discoveryDisplay.addNotification).toHaveBeenCalledWith('Audio unmuted');
  //   });
  // });

  describe('Destination Preview System', () => {
    beforeEach(() => {
      game = new Game(mockCanvas);
      
      // Mock chunk manager methods
      game.chunkManager.ensureChunkExists = vi.fn();
      game.chunkManager.getChunk = vi.fn();
    });

    it('should return empty array for wormhole without destination', () => {
      const wormhole = { twinX: null, twinY: null };
      const result = game.getDestinationPreviewObjects(wormhole);
      expect(result).toEqual([]);
    });

    it('should get destination preview objects', () => {
      const wormhole = { 
        twinX: 4000, 
        twinY: 5000,
        uniqueId: 'wh-1'
      };
      
      const mockChunk = {
        celestialStars: [{ x: 4100, y: 5100, type: 'star' }],
        planets: [{ x: 4200, y: 5000, type: 'planet' }],
        moons: [],
        nebulae: [],
        asteroidGardens: [],
        wormholes: [{ x: 4000, y: 5000, uniqueId: 'wh-1' }, { x: 4300, y: 5200, uniqueId: 'wh-2' }]
      };
      
      game.chunkManager.getChunk.mockReturnValue(mockChunk);
      
      const result = game.getDestinationPreviewObjects(wormhole);
      
      expect(game.chunkManager.ensureChunkExists).toHaveBeenCalled();
      expect(result.length).toBeGreaterThan(0); // Should return preview objects
      expect(result[0]).toEqual(expect.objectContaining({
        relativeX: 100,
        relativeY: 100,
        distance: expect.any(Number),
        type: 'star'
      }));
    });
  });

  describe('Rendering System Visual Effects', () => {
    beforeEach(() => {
      game = new Game(mockCanvas);
      
      // Mock renderer and context
      game.renderer.clear = vi.fn();
      game.renderer.ctx = mockContext;
      
      // Mock all render methods
      game.starField.render = vi.fn();
      game.starParticles.render = vi.fn();
      game.thrusterParticles.render = vi.fn();
      game.ship.render = vi.fn();
      game.discoveryDisplay.render = vi.fn();
      game.discoveryLogbook.render = vi.fn();
      game.stellarMap.render = vi.fn();
      game.touchUI.render = vi.fn();
      
      game.chunkManager.getAllActiveObjects = vi.fn().mockReturnValue({
        stars: [],
        planets: [],
        moons: [],
        celestialStars: [],
        nebulae: [],
        asteroidGardens: [],
        wormholes: [],
        blackholes: [],
        comets: []
      });
      game.chunkManager.getDiscoveredStars = vi.fn().mockReturnValue([]);
      game.chunkManager.getDiscoveredPlanets = vi.fn().mockReturnValue([]);
      game.chunkManager.getDiscoveredNebulae = vi.fn().mockReturnValue([]);
      game.chunkManager.getDiscoveredWormholes = vi.fn().mockReturnValue([]);
      game.chunkManager.getDiscoveredAsteroidGardens = vi.fn().mockReturnValue([]);
    });

    it('should render wormhole traversal effects', () => {
      game.isTraversing = true;
      game.traversalStartTime = 1.0; // Midpoint
      game.traversalDuration = 2.0;
      
      game.render();
      
      // Should render fade effect (may be particle colors)
      expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 1024, 768);
      // Verify some traversal visual effect was rendered
      expect(mockContext.arc).toHaveBeenCalled();
    });

    it('should render cosmic rebirth effects', () => {
      game.isResettingUniverse = true;
      game.resetStartTime = 1.5; // Midpoint
      game.resetDuration = 3.0;
      
      game.render();
      
      // Should render cosmic fade effect (may be particle colors)
      expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 1024, 768);
      // Verify some cosmic visual effect was rendered
      expect(mockContext.arc).toHaveBeenCalled();
    });

    it('should render traversal tunnel at peak intensity', () => {
      game.isTraversing = true;
      game.traversalStartTime = 1.0; // Peak intensity
      game.traversalDuration = 2.0;
      
      game.render();
      
      // Should call tunnel rendering with high intensity
      expect(mockContext.arc).toHaveBeenCalled(); // Tunnel particles
      expect(mockContext.fill).toHaveBeenCalled();
    });

    it('should render cosmic rebirth at peak intensity', () => {
      game.isResettingUniverse = true;
      game.resetStartTime = 1.5; // Peak intensity
      game.resetDuration = 3.0;
      
      game.render();
      
      // Should call cosmic rendering effects
      expect(mockContext.stroke).toHaveBeenCalled(); // Cosmic rings
      expect(mockContext.arc).toHaveBeenCalled(); // Cosmic particles
    });

    it('should render wormholes with destination preview', () => {
      const mockWormhole = {
        render: vi.fn()
      };
      
      game.chunkManager.getAllActiveObjects.mockReturnValue({
        stars: [],
        planets: [],
        moons: [],
        celestialStars: [],
        nebulae: [],
        asteroidGardens: [],
        wormholes: [mockWormhole],
        blackholes: [],
        comets: []
      });
      
      const destinationPreviewSpy = vi.spyOn(game, 'getDestinationPreviewObjects').mockReturnValue([]);
      
      game.render();
      
      expect(destinationPreviewSpy).toHaveBeenCalledWith(mockWormhole);
      expect(mockWormhole.render).toHaveBeenCalledWith(game.renderer, game.camera, []);
    });
  });

  describe('Integration and Edge Cases', () => {
    beforeEach(() => {
      game = new Game(mockCanvas);
    });

    it('should handle window resize correctly', () => {
      const resizeHandler = global.window.addEventListener.mock.calls.find(
        call => call[0] === 'resize'
      )[1];

      global.window.innerWidth = 1920;
      global.window.innerHeight = 1080;

      resizeHandler();

      expect(game.renderer.canvas.width).toBe(1920);
      expect(game.renderer.canvas.height).toBe(1080);
    });

    it('should handle objects without updatePosition method', async () => {
      const mockObject = {
        type: 'planet',
        checkDiscovery: vi.fn().mockReturnValue(false),
        distanceToShip: vi.fn().mockReturnValue(1000)
        // No updatePosition method
      };

      game.chunkManager.getAllActiveObjects = vi.fn().mockReturnValue({
        stars: [],
        planets: [mockObject],
        moons: [],
        celestialStars: [],
        nebulae: [],
        asteroidGardens: [],
        wormholes: [],
        blackholes: [],
        comets: []
      });

      expect(() => game.update(0.016)).not.toThrow();
    });

    it('should handle empty active objects correctly', async () => {
      game.chunkManager.getAllActiveObjects = vi.fn().mockReturnValue({
        stars: [], // background stars
        planets: [],
        moons: [],
        celestialStars: [],
        nebulae: [],
        asteroidGardens: [],
        wormholes: [],
        blackholes: [],
        comets: []
      });
      game.chunkManager.getDiscoveredStars = vi.fn().mockReturnValue([]);
      game.chunkManager.getDiscoveredPlanets = vi.fn().mockReturnValue([]);

      expect(() => game.update(0.016)).not.toThrow();
      expect(() => game.render()).not.toThrow();
    });
  });
});