// Game state and coordination types
// Provides strong typing for game orchestration and state management

import type { AnyCelestialData } from './CelestialTypes.js';

// Main game state interface
export interface GameState {
    isRunning: boolean;
    isPaused: boolean;
    isResettingUniverse: boolean;
    isTraversing: boolean;
    currentSeed: string;
    universeResetCount: number;
    lastFrameTime: number;
    deltaTime: number;
}

// Player position and movement
export interface PlayerState {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    thrusterState: ThrusterState;
}

export interface ThrusterState {
    isActive: boolean;
    intensity: number;
    direction: { x: number; y: number };
    particles: ParticleData[];
}

export interface ParticleData {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    life: number;
    maxLife: number;
    size: number;
    color: string;
    opacity: number;
}

// Camera state and control
export interface CameraState {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    zoom: number;
    smoothing: number;
    isTracking: boolean;
}

// Input handling types
export interface InputState {
    keys: Map<string, KeyState>;
    mouse: MouseState;
    touch: TouchState;
    gamepad?: GamepadState;
}

export interface KeyState {
    isPressed: boolean;
    wasJustPressed: boolean;
    pressTime: number;
    holdDuration: number;
}

export interface MouseState {
    x: number;
    y: number;
    leftButton: boolean;
    rightButton: boolean;
    wheelDelta: number;
    isOverCanvas: boolean;
}

export interface TouchState {
    touches: TouchPoint[];
    gestureState: GestureState;
}

export interface TouchPoint {
    id: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
    startTime: number;
    isActive: boolean;
}

export interface GestureState {
    isPinching: boolean;
    pinchDistance: number;
    pinchCenter: { x: number; y: number };
    gestureStartDistance: number;
}

export interface GamepadState {
    connected: boolean;
    axes: number[];
    buttons: boolean[];
}

// UI state management
export interface UIState {
    stellarMapVisible: boolean;
    discoveryLogbookVisible: boolean;
    touchUIVisible: boolean;
    debugInfoVisible: boolean;
    audioMuted: boolean;
    fullscreenActive: boolean;
}

// Discovery and progression state
export interface DiscoveryProgress {
    totalDiscoveries: number;
    starDiscoveries: number;
    planetDiscoveries: number;
    moonDiscoveries: number;
    nebulaDiscoveries: number;
    wormholeDiscoveries: number;
    blackHoleDiscoveries: number;
    asteroidDiscoveries: number;
    notableDiscoveries: number;
    firstDiscoveryTime?: number;
    lastDiscoveryTime?: number;
}

// Audio system state
export interface AudioState {
    isMuted: boolean;
    masterVolume: number;
    soundEnabled: boolean;
    context?: AudioContext;
    activeNodes: AudioNode[];
}

// World generation state
export interface WorldState {
    currentChunks: Map<string, ChunkData>;
    loadedChunkCount: number;
    generationSeed: string;
    chunkSize: number;
    loadRadius: number;
    unloadRadius: number;
}

export interface ChunkData {
    x: number;
    y: number;
    isLoaded: boolean;
    objects: AnyCelestialData[];
    lastAccessTime: number;
}

// Performance monitoring
export interface PerformanceMetrics {
    fps: number;
    frameTime: number;
    renderTime: number;
    updateTime: number;
    memoryUsage?: number;
    objectCount: number;
    chunkCount: number;
}

// Event system types
export interface GameEvent {
    type: string;
    timestamp: number;
    data: any;
}

export interface EventHandler<T = any> {
    (event: GameEvent & { data: T }): void;
}

// Configuration and settings
export interface GameConfig {
    graphics: GraphicsConfig;
    audio: AudioConfig;
    input: InputConfig;
    world: WorldConfig;
    debug: DebugConfig;
}

export interface GraphicsConfig {
    targetFPS: number;
    enableVSync: boolean;
    particleLimit: number;
    renderDistance: number;
    effectQuality: 'low' | 'medium' | 'high';
}

export interface AudioConfig {
    masterVolume: number;
    soundEffectVolume: number;
    enableReverb: boolean;
    audioContext?: AudioContext;
}

export interface InputConfig {
    keyboardEnabled: boolean;
    mouseEnabled: boolean;
    touchEnabled: boolean;
    gamepadEnabled: boolean;
    mouseSensitivity: number;
    touchSensitivity: number;
}

export interface WorldConfig {
    chunkSize: number;
    loadRadius: number;
    unloadRadius: number;
    generationDensity: number;
    maxObjectsPerChunk: number;
}

export interface DebugConfig {
    enabled: boolean;
    showFPS: boolean;
    showChunkBounds: boolean;
    showObjectBounds: boolean;
    enableDebugSpawning: boolean;
}