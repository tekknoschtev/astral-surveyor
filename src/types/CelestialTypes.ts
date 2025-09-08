// Comprehensive type definitions for celestial objects
// Eliminates 'any' types and provides strong typing throughout the system

// Base celestial object interface
export interface CelestialObjectData {
    type: 'star' | 'planet' | 'moon' | 'nebula' | 'asteroids' | 'wormhole' | 'blackhole' | 'comet' | 'rogue-planet' | 'dark-nebula' | 'crystal-garden' | 'protostar';
    x: number;
    y: number;
    id?: string;
    discovered?: boolean;
    discoveryTime?: number;
}

// Star-specific types
export interface StarData extends CelestialObjectData {
    type: 'star';
    starTypeName: string;
    size: number;
    temperature?: number;
    luminosity?: number;
    planets?: PlanetData[];
}

// Planet-specific types
export interface PlanetData extends CelestialObjectData {
    type: 'planet';
    planetTypeName: string;
    size: number;
    parentStar?: StarData;
    orbitDistance?: number;
    orbitAngle?: number;
    orbitSpeed?: number;
    hasRings?: boolean;
    moons?: MoonData[];
}

// Moon-specific types
export interface MoonData extends CelestialObjectData {
    type: 'moon';
    size: number;
    parentPlanet?: PlanetData;
    orbitDistance?: number;
    orbitAngle?: number;
    orbitSpeed?: number;
    color?: string;
}

// Nebula-specific types
export interface NebulaData extends CelestialObjectData {
    type: 'nebula';
    nebulaTypeData: {
        name: string;
        type?: string;
        size?: number;
        color?: string;
    };
}

// Asteroid garden types
export interface AsteroidData extends CelestialObjectData {
    type: 'asteroids';
    asteroidType?: string;
    density?: number;
    size?: number;
}

// Wormhole-specific types
export interface WormholeData extends CelestialObjectData {
    type: 'wormhole';
    wormholeId: string;
    pairId?: string;
    designation?: 'α' | 'β';
    destinationX?: number;
    destinationY?: number;
}

// Black hole-specific types
export interface BlackHoleData extends CelestialObjectData {
    type: 'blackhole';
    mass?: number;
    blackHoleType?: string;
    eventHorizonRadius?: number;
}

// Region-specific object types (Phase 0: rogue-planet only)

export interface RoguePlanetData extends CelestialObjectData {
    type: 'rogue-planet';
    variant: 'ice' | 'rock' | 'volcanic';
    size: number;
    hasMoons?: boolean;
    surfaceTemperature?: number;
}

export interface DarkNebulaData extends CelestialObjectData {
    type: 'dark-nebula';
    variant: 'dense-core' | 'wispy' | 'globular';
    size: number;
    occlusionStrength: number; // 0.0 to 1.0, affects star dimming
    shape: 'circular' | 'irregular';
    dustDensity?: number;
}

export interface CrystalGardenData extends CelestialObjectData {
    type: 'crystal-garden';
    variant: 'pure' | 'mixed' | 'rare-earth';
    size: number;
    mineralType?: string;
    refractionIntensity?: number;
}

export interface ProtostarData extends CelestialObjectData {
    type: 'protostar';
    variant: 'class-0' | 'class-1' | 'class-2';
    stellarClassification: string;
    size: number;
    coreTemperature?: number;
    jetIntensity?: number;
    accretionDiskSize?: number;
    instabilityFactor?: number;
}

// Union type for all celestial objects
export type AnyCelestialData = StarData | PlanetData | MoonData | NebulaData | AsteroidData | WormholeData | BlackHoleData | RoguePlanetData | DarkNebulaData | CrystalGardenData | ProtostarData;

// Discovery-related types
export interface DiscoveryEvent {
    object: AnyCelestialData;
    timestamp: number;
    coordinates: { x: number; y: number };
    isNotable: boolean;
}

export interface DiscoveryState {
    discoveries: Map<string, DiscoveryEvent>;
    totalCount: number;
    notableCount: number;
}

// Visual effects types
export interface RingConfig {
    innerRadius: number;
    outerRadius: number;
    colors: string[];
    opacity: number;
    bandCount: number;
    hasShimmer?: boolean;
}

export interface AtmosphereConfig {
    layers: number;
    thickness: number;
    density: number;
    color: string;
    hasWeatherPatterns?: boolean;
    hasAuroras?: boolean;
    auroraColors?: string[];
    weatherSpeed?: number;
}

export interface CoronaConfig {
    size: number;
    intensity: number;
    colors: string[];
    streamers?: number;
    pulsing?: boolean;
    asymmetry?: number;
}

// Rendering-related types  
export interface RenderingContext {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    camera: CameraState;
    time: number;
}

export interface CameraState {
    x: number;
    y: number;
    zoom?: number;
    screenWidth: number;
    screenHeight: number;
}

// Collection types for active objects
export interface ActiveObjects {
    planets: PlanetData[];
    moons: MoonData[];
    celestialStars: StarData[];
    nebulae: NebulaData[];
    wormholes: WormholeData[];
    blackholes: BlackHoleData[];
    asteroidGardens: AsteroidData[];
    // Region-specific objects
    roguePlanets: RoguePlanetData[];
    darkNebulae: DarkNebulaData[];
    crystalGardens: CrystalGardenData[];
    protostars: ProtostarData[];
}