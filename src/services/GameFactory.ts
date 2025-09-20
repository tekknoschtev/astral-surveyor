// GameFactory - Simple factory for game initialization
// Extracts complex setup logic from Game constructor

import { Renderer } from '../graphics/renderer.js';
import { Input } from '../input/input.js';
import { Camera } from '../camera/camera.js';
import { ChunkManager, InfiniteStarField } from '../world/world.js';
import { Ship, ThrusterParticles, StarParticles } from '../ship/ship.js';
import { DiscoveryDisplay } from '../ui/ui.js';
import { DiscoveryLogbook } from '../ui/discoverylogbook.js';
import { StellarMap } from '../ui/stellarmap.js';
import { LocalMinimap } from '../ui/minimap.js';
import { DiscoveryService } from './DiscoveryService.js';
import { NamingService } from '../naming/naming.js';
import { TouchUI } from '../ui/touchui.js';
import { SoundManager } from '../audio/soundmanager.js';
import { AudioService } from './AudioService.js';
import { SettingsService } from './SettingsService.js';
import { SettingsMenu } from '../ui/SettingsMenu.js';
import { StorageService } from './StorageService.js';
import { SaveLoadService } from './SaveLoadService.js';
import { ConfirmationDialog } from '../ui/ConfirmationDialog.js';
import { StateManager } from './StateManager.js';
import { createDiscoveryService } from './DiscoveryServiceFactory.js';
import { DeveloperConsole } from '../debug/DeveloperConsole.js';
import { CommandRegistry } from '../debug/CommandRegistry.js';
import { SeedInspectorService } from '../debug/SeedInspectorService.js';
import { getStartingCoordinates } from '../utils/random.js';

export interface GameComponents {
    // Core components
    renderer: Renderer;
    input: Input;
    camera: Camera;
    chunkManager: ChunkManager;
    starField: InfiniteStarField;
    ship: Ship;
    thrusterParticles: ThrusterParticles;
    starParticles: StarParticles;

    // UI components
    discoveryDisplay: DiscoveryDisplay;
    discoveryLogbook: DiscoveryLogbook;
    stellarMap: StellarMap;
    localMinimap: LocalMinimap;
    touchUI: TouchUI;
    settingsMenu: SettingsMenu;
    confirmationDialog: ConfirmationDialog;
    developerConsole: DeveloperConsole;

    // Services
    discoveryService: DiscoveryService;
    namingService: NamingService;
    soundManager: SoundManager;
    audioService: AudioService;
    settingsService: SettingsService;
    storageService: StorageService;
    saveLoadService: SaveLoadService;
    stateManager: StateManager;
    discoveryManager: any;
    commandRegistry: CommandRegistry;
    seedInspectorService: SeedInspectorService;
}

export function createGameComponents(canvas: HTMLCanvasElement): GameComponents {
    // Create core components
    const renderer = new Renderer(canvas);
    const input = new Input();
    const camera = new Camera();
    const chunkManager = new ChunkManager();
    const starField = new InfiniteStarField(chunkManager);
    const ship = new Ship();
    const thrusterParticles = new ThrusterParticles();
    const starParticles = new StarParticles();

    // Create UI components
    const discoveryDisplay = new DiscoveryDisplay(chunkManager);
    const discoveryLogbook = new DiscoveryLogbook();
    const stellarMap = new StellarMap();
    const discoveryService = new DiscoveryService();
    const localMinimap = new LocalMinimap(chunkManager, discoveryService);
    const touchUI = new TouchUI();
    const confirmationDialog = new ConfirmationDialog();

    // Create services
    const namingService = new NamingService();
    const soundManager = new SoundManager();
    const audioService = new AudioService({} as any, soundManager); // ConfigService not needed for simplified version
    const settingsService = new SettingsService(audioService);
    const storageService = new StorageService();

    // Create discovery manager first (needed by save/load service)
    const discoveryManager = createDiscoveryService(
        namingService,
        soundManager,
        discoveryDisplay,
        discoveryLogbook
    );

    // Create save/load service (StateManager will be created later)
    const saveLoadService = new SaveLoadService(
        storageService,
        {} as any, // StateManager - will be set later
        camera,
        discoveryLogbook,
        chunkManager
    );

    // Connect discovery manager to save/load service
    saveLoadService.setDiscoveryManager(discoveryManager);

    // Create settings menu with callbacks
    const settingsMenu = new SettingsMenu(settingsService, {
        onSaveGame: async () => { await saveLoadService.saveGame(); },
        onLoadGame: async () => { await saveLoadService.loadGame(); },
        onNewGame: () => window.location.reload() // Simple new game implementation
    });

    // Setup service connections
    stellarMap.setNamingService(namingService);
    stellarMap.setChunkManager(chunkManager);

    // Connect discovery services (discovery manager already created above)
    discoveryLogbook.setDiscoveryManager(discoveryManager);
    discoveryLogbook.setDiscoveryDisplay(discoveryDisplay);

    // Set camera position from URL if provided
    const startingCoords = getStartingCoordinates();
    if (startingCoords) {
        camera.x = startingCoords.x;
        camera.y = startingCoords.y;
    }

    // Create state manager with starting position
    const startingPosition = { x: camera.x, y: camera.y };
    const stateManager = new StateManager(startingPosition, discoveryManager);

    // Now set the state manager in save/load service
    (saveLoadService as any).stateManager = stateManager;

    // Create developer tools
    const commandRegistry = new CommandRegistry();
    const developerConsole = new DeveloperConsole(
        commandRegistry,
        camera,
        chunkManager,
        stellarMap
    );
    const seedInspectorService = new SeedInspectorService(chunkManager);
    stellarMap.initInspectorMode(seedInspectorService);

    // Setup settings callbacks
    settingsService.onDistanceReset = () => {
        camera.resetLifetimeDistance();
        discoveryDisplay.addNotification('Distance traveled has been reset');
    };

    settingsService.onDiscoveryHistoryClear = () => {
        discoveryLogbook.clearHistory();
        chunkManager.clearDiscoveryHistory();
        discoveryDisplay.addNotification('Discovery history has been cleared');
    };

    // Enable auto-save
    saveLoadService.enableAutoSave(5);

    // Initialize chunks around starting position
    chunkManager.updateActiveChunks(camera.x, camera.y);

    return {
        renderer,
        input,
        camera,
        chunkManager,
        starField,
        ship,
        thrusterParticles,
        starParticles,
        discoveryDisplay,
        discoveryLogbook,
        stellarMap,
        localMinimap,
        touchUI,
        settingsMenu,
        confirmationDialog,
        developerConsole,
        discoveryService,
        namingService,
        soundManager,
        audioService,
        settingsService,
        storageService,
        saveLoadService,
        stateManager,
        discoveryManager,
        commandRegistry,
        seedInspectorService
    };
}