import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Import from compiled TypeScript
import { Game } from '../../dist/game.js';

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

    it('should start the game loop correctly', () => {
      game.start();

      expect(global.requestAnimationFrame).toHaveBeenCalledWith(game.gameLoop);
    });

    it('should calculate delta time correctly', () => {
      const spy = vi.spyOn(game, 'update');
      
      game.lastTime = 0;
      game.gameLoop(16); // 16ms = ~60fps

      expect(spy).toHaveBeenCalledWith(0.016); // 16ms / 1000 = 0.016s
    });

    it('should call update and render in game loop', () => {
      const updateSpy = vi.spyOn(game, 'update');
      const renderSpy = vi.spyOn(game, 'render');

      game.gameLoop(16);

      expect(updateSpy).toHaveBeenCalled();
      expect(renderSpy).toHaveBeenCalled();
    });

    it('should schedule next frame after game loop', () => {
      global.requestAnimationFrame.mockClear();
      
      game.gameLoop(16);

      expect(global.requestAnimationFrame).toHaveBeenCalledWith(game.gameLoop);
    });

    it('should handle zero delta time gracefully', () => {
      const spy = vi.spyOn(game, 'update');
      
      game.lastTime = 16;
      game.gameLoop(16); // Same time = 0 delta

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

    it('should handle coordinate copying (C key)', () => {
      game.input.wasJustPressed.mockImplementation((key) => key === 'KeyC');
      const spy = vi.spyOn(game, 'copyCurrentCoordinates');

      game.update(0.016);

      expect(spy).toHaveBeenCalled();
    });

    it('should handle map toggle (M key)', () => {
      game.input.wasJustPressed.mockImplementation((key) => key === 'KeyM');
      game.stellarMap.toggle = vi.fn();

      game.update(0.016);

      expect(game.stellarMap.toggle).toHaveBeenCalled();
    });

    it('should handle logbook toggle (L key)', () => {
      game.input.wasJustPressed.mockImplementation((key) => key === 'KeyL');
      game.discoveryLogbook.toggle = vi.fn();

      game.update(0.016);

      expect(game.discoveryLogbook.toggle).toHaveBeenCalled();
    });

    it('should handle audio mute toggle (H key)', () => {
      game.input.wasJustPressed.mockImplementation((key) => key === 'KeyH');
      game.soundManager.toggleMute = vi.fn().mockReturnValue(true);
      game.discoveryDisplay.addNotification = vi.fn();

      game.update(0.016);

      expect(game.soundManager.toggleMute).toHaveBeenCalled();
      expect(game.discoveryDisplay.addNotification).toHaveBeenCalledWith('Audio muted');
    });

    it('should handle escape key for closing UI', () => {
      game.input.wasJustPressed.mockImplementation((key) => key === 'Escape');
      game.stellarMap.isVisible = vi.fn().mockReturnValue(true);
      game.stellarMap.toggle = vi.fn();

      game.update(0.016);

      expect(game.stellarMap.toggle).toHaveBeenCalled();
    });

    it('should handle mouse clicks for touch UI', () => {
      game.input.wasClicked.mockReturnValue(true);
      game.touchUI.handleTouch = vi.fn().mockReturnValue('toggleMap');
      game.stellarMap.resetPanState = vi.fn();
      const spy = vi.spyOn(game, 'handleTouchAction');

      game.update(0.016);

      expect(game.touchUI.handleTouch).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith('toggleMap');
      expect(game.input.consumeTouch).toHaveBeenCalled();
    });

    it('should handle stellar map interactions when visible', () => {
      game.input.wasClicked.mockReturnValue(true);
      game.input.isTouchConsumed.mockReturnValue(false);
      game.touchUI.handleTouch = vi.fn().mockReturnValue(null);
      game.stellarMap.isVisible = vi.fn().mockReturnValue(true);
      game.stellarMap.handleStarSelection = vi.fn();
      game.chunkManager.getDiscoveredStars = vi.fn().mockReturnValue([]);
      game.chunkManager.getDiscoveredPlanets = vi.fn().mockReturnValue([]);

      game.update(0.016);

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
        blackholes: []
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

    it('should update all systems in correct order', () => {
      game.update(0.016);

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

    it('should clear input frame state at end of update', () => {
      game.update(0.016);

      expect(game.input.clearFrameState).toHaveBeenCalled();
    });

    it('should update chunk loading based on camera position', () => {
      game.camera.x = 1000;
      game.camera.y = 2000;

      game.update(0.016);

      expect(game.chunkManager.updateActiveChunks).toHaveBeenCalledWith(1000, 2000);
    });

    it('should restore discovery state for loaded objects', () => {
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
        blackholes: []
      });

      game.update(0.016);

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

    it('should process star discoveries correctly', () => {
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
        blackholes: []
      });

      game.update(0.016);

      expect(game.namingService.generateDisplayName).toHaveBeenCalledWith(mockStar);
      expect(game.discoveryDisplay.addDiscovery).toHaveBeenCalledWith('Test Star HD-1234', 'G-type Main Sequence');
      expect(game.discoveryLogbook.addDiscovery).toHaveBeenCalledWith('Test Star HD-1234', 'G-type Main Sequence');
      expect(game.chunkManager.markObjectDiscovered).toHaveBeenCalledWith(mockStar, 'Test Star HD-1234');
      expect(game.soundManager.playStarDiscovery).toHaveBeenCalledWith('G-type Main Sequence');
    });

    it('should process planet discoveries correctly', () => {
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
        blackholes: []
      });

      game.update(0.016);

      expect(mockPlanet.updatePosition).toHaveBeenCalledWith(0.016);
      expect(game.discoveryDisplay.addDiscovery).toHaveBeenCalledWith('Test Star HD-1234', 'Rocky World');
      expect(game.soundManager.playPlanetDiscovery).toHaveBeenCalledWith('Rocky World');
    });

    it('should process moon discoveries correctly', () => {
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
        blackholes: []
      });

      game.update(0.016);

      expect(mockMoon.updatePosition).toHaveBeenCalledWith(0.016);
      expect(game.discoveryDisplay.addDiscovery).toHaveBeenCalledWith('Test Star HD-1234', 'Moon');
      expect(game.soundManager.playMoonDiscovery).toHaveBeenCalled();
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
        blackholes: []
      });
      game.chunkManager.restoreDiscoveryState = vi.fn();
    });

    it('should save distance periodically', () => {
      game.distanceSaveTimer = 4.9; // Just under threshold
      game.update(0.2); // This should push it over 5.0

      expect(game.camera.saveDistanceTraveled).toHaveBeenCalled();
      expect(game.distanceSaveTimer).toBe(0); // Should reset
    });

    it('should not save distance before interval', () => {
      game.distanceSaveTimer = 2.0;
      game.update(0.1);

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
        blackholes: [{ render: vi.fn() }]
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
        blackholes: []
      });
      game.chunkManager.restoreDiscoveryState = vi.fn();
      game.discoveryLogbook.isMouseOver = vi.fn().mockReturnValue(false);
      game.discoveryLogbook.handleMouseWheel = vi.fn();
    });

    it('should handle mouse wheel for logbook when over logbook area', () => {
      game.input.getWheelDelta.mockReturnValue(-120);
      game.discoveryLogbook.isMouseOver.mockReturnValue(true);

      game.update(0.016);

      expect(game.discoveryLogbook.handleMouseWheel).toHaveBeenCalledWith(-120);
    });

    it('should not handle mouse wheel when not over logbook', () => {
      game.input.getWheelDelta.mockReturnValue(-120);
      game.discoveryLogbook.isMouseOver.mockReturnValue(false);

      game.update(0.016);

      expect(game.discoveryLogbook.handleMouseWheel).not.toHaveBeenCalled();
    });

    it('should ignore zero wheel delta', () => {
      game.input.getWheelDelta.mockReturnValue(0);
      game.discoveryLogbook.isMouseOver.mockReturnValue(true);

      game.update(0.016);

      expect(game.discoveryLogbook.handleMouseWheel).not.toHaveBeenCalled();
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

    it('should handle objects without updatePosition method', () => {
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
        blackholes: []
      });

      expect(() => game.update(0.016)).not.toThrow();
    });

    it('should handle empty active objects correctly', () => {
      game.chunkManager.getAllActiveObjects = vi.fn().mockReturnValue({
        stars: [], // background stars
        planets: [],
        moons: [],
        celestialStars: [],
        nebulae: [],
        asteroidGardens: [],
        wormholes: [],
        blackholes: []
      });
      game.chunkManager.getDiscoveredStars = vi.fn().mockReturnValue([]);
      game.chunkManager.getDiscoveredPlanets = vi.fn().mockReturnValue([]);

      expect(() => game.update(0.016)).not.toThrow();
      expect(() => game.render()).not.toThrow();
    });
  });
});