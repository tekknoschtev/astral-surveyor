// Stellar Map Type Definitions
// Extracted from stellarmap.ts to improve code organization

// Base interfaces for celestial objects as they appear in the stellar map
export interface StarLike {
    x: number;
    y: number;
    starTypeName?: string;
    starType?: {
        sizeMultiplier: number;
    };
    timestamp?: number;
}

export interface PlanetLike {
    x: number | null;
    y: number | null;
    parentStarX: number;
    parentStarY: number;
    planetTypeName: string;
    planetType?: {
        sizeMultiplier: number;
        colors?: string[];
    };
    planetIndex: number;
    objectName?: string;
    timestamp?: number;
}

export interface NebulaLike {
    x: number;
    y: number;
    nebulaType: string;
    nebulaTypeData?: {
        name: string;
        colors?: string[];
    };
    objectName?: string;
    timestamp?: number;
}

export interface WormholeLike {
    x: number;
    y: number;
    wormholeId: string;
    designation: 'alpha' | 'beta';
    pairId: string;
    twinX: number;
    twinY: number;
    objectName?: string;
    timestamp?: number;
}

export interface AsteroidGardenLike {
    x: number;
    y: number;
    gardenType: string;
    gardenTypeData?: {
        name: string;
        colors?: string[];
        accentColors?: string[];
    };
    objectName?: string;
    timestamp?: number;
}

export interface BlackHoleLike {
    x: number;
    y: number;
    blackHoleTypeName: string;
    objectName?: string;
    timestamp?: number;
}

export interface CometLike {
    x: number;
    y: number;
    cometType?: {
        name: string;
        tailColors?: string[];
        nucleusColor?: string;
    };
    parentStarX?: number;
    parentStarY?: number;
    orbit?: {
        semiMajorAxis: number;
        eccentricity: number;
        perihelionDistance: number;
        aphelionDistance: number;
        argumentOfPerihelion: number;
    };
    objectName?: string;
    timestamp?: number;
}

// Union type for all discoverable objects
export type DiscoverableObject = StarLike | PlanetLike | NebulaLike | WormholeLike | AsteroidGardenLike | BlackHoleLike | CometLike;

// Hover system interfaces
export interface HoverableObject {
    type: string;
    x: number;
    y: number;
    // Optional properties that may exist on different object types
    radius?: number;
    [key: string]: any; // Allow other properties
}

export interface HoverConfig {
    threshold: number;
    renderSize: number;
    priority: number; // Lower number = higher priority
}

// Game position interface
export interface GameStartingPosition {
    x: number;
    y: number;
}

// Map rendering configuration
export interface MapRenderContext {
    ctx: CanvasRenderingContext2D;
    mapX: number;
    mapY: number;
    mapWidth: number;
    mapHeight: number;
    worldToMapScale: number;
    centerX: number;
    centerY: number;
}

// Statistics interface for object tracking
export interface ViewStatistics {
    objectCounts: Record<string, number>;
    totalObjects: number;
    density: number;
    regionArea: number;
}