// Central export file for all type definitions
// This enables clean imports throughout the codebase

// Celestial object types
export type {
    CelestialObjectData,
    StarData,
    PlanetData,
    MoonData,
    NebulaData,
    AsteroidData,
    WormholeData,
    BlackHoleData,
    AnyCelestialData,
    DiscoveryEvent,
    DiscoveryState,
    RingConfig,
    AtmosphereConfig,
    CoronaConfig,
    RenderingContext,
    CameraState,
    ActiveObjects
} from './CelestialTypes.js';

// Game state types
export type {
    GameState,
    PlayerState,
    ThrusterState,
    ParticleData,
    CameraState as GameCameraState,
    InputState,
    KeyState,
    MouseState,
    TouchState,
    TouchPoint,
    GestureState,
    GamepadState,
    UIState,
    DiscoveryProgress,
    AudioState,
    WorldState,
    ChunkData,
    PerformanceMetrics,
    GameEvent,
    EventHandler,
    GameConfig,
    GraphicsConfig,
    AudioConfig,
    InputConfig,
    WorldConfig,
    DebugConfig
} from './GameState.js';

// UI component types
export type {
    UIComponent,
    StellarMapState,
    StellarMapConfig,
    LogbookState,
    LogbookEntry,
    TouchUIState,
    TouchButton,
    DiscoveryDisplay,
    DiscoveryAnimation,
    UIInteraction,
    UIEventHandler,
    UITheme,
    LayoutConstraints,
    ResponsiveLayout,
    Panel,
    Modal,
    InputField,
    FormData,
    UITransition,
    UIAnimation,
    AccessibilityConfig
} from './UITypes.js';

// Renderer types
export type {
    Renderer,
    WorldCoordinates,
    ScreenCoordinates,
    Transform2D,
    Camera,
    Color,
    HSLColor,
    GradientStop,
    LinearGradient,
    RadialGradient,
    Particle,
    ParticleSystem,
    VisualEffectConfig,
    GlowEffect,
    PulseEffect,
    ShimmerEffect,
    TrailEffect,
    RenderStats,
    RenderOptions,
    Material,
    Mesh,
    Keyframe,
    Animation,
    AnimationChannel,
    Light,
    LightingConfig,
    Texture,
    Sprite,
    Font,
    TextStyle,
    TextMetrics
} from './RendererTypes.js';