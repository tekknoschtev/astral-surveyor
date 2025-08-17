// Shared types and interfaces for celestial objects
// Extracted from celestial.ts for better modularity

// Import dependencies
import type { SeededRandom } from '../utils/random.js';
import { DiscoveryService } from '../services/DiscoveryService.js';

// Interface definitions for renderer and camera
export interface Renderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    drawCircle(x: number, y: number, radius: number, color: string): void;
    drawDiscoveryIndicator(x: number, y: number, radius: number, color: string, lineWidth?: number, opacity?: number, dashPattern?: number[] | null): void;
    drawDiscoveryPulse(x: number, y: number, radius: number, color: string, opacity?: number, lineWidth?: number): void;
}

export interface Camera {
    x: number;
    y: number;
    worldToScreen(worldX: number, worldY: number, canvasWidth: number, canvasHeight: number): [number, number];
}

// Visual effects configuration interfaces
export interface RingConfig {
    innerRadius: number;
    outerRadius: number;
    colors: string[];
    opacity: number;
    bandCount: number;
    hasShimmer?: boolean;
}

export interface AtmosphereConfig {
    layers: number;           // Number of haze layers
    thickness: number;        // How far atmosphere extends from planet
    density: number;          // Base opacity (0-1)
    color: string;           // Base atmospheric color
    hasWeatherPatterns?: boolean;  // Moving cloud effects
    hasAuroras?: boolean;     // Polar light effects
    auroraColors?: string[];  // Aurora color palette
    weatherSpeed?: number;    // Speed of weather animation
}

export interface PlanetVisualEffects {
    hasAtmosphere?: boolean;
    hasCraters?: boolean;
    hasStripes?: boolean;
    hasSwirls?: boolean;
    hasGlow?: boolean;
    hasDunePatterns?: boolean;
    hasCrystalline?: boolean;
    hasLavaFlow?: boolean;
    hasShimmer?: boolean;
    hasRings?: boolean | number;
    ringConfig?: RingConfig;
    atmosphereConfig?: AtmosphereConfig;  // Enhanced atmospheric effects
}

export interface Sunspot {
    angle: number;      // Position angle around star
    radius: number;     // Distance from star center
    size: number;       // Sunspot diameter
    intensity: number;  // Darkness intensity (0-1)
}

export interface CoronaConfig {
    layers: number;           // Number of corona layers (2-4)
    intensity: number;        // Base brightness multiplier (0.3-1.0)
    temperature: number;      // Color temperature modifier (0.5-2.0)
    asymmetry: number;        // Directional variation factor (0.0-0.5)
    fluctuation: number;      // Dynamic intensity variation (0.0-0.3)
    colors: string[];         // Corona color palette based on temperature
}

export interface StarVisualEffects {
    hasCorona?: boolean;
    hasPulsing?: boolean;
    hasRadiation?: boolean;
    hasShimmer?: boolean;
    hasSwirling?: boolean;
    hasSunspots?: boolean;
    coronaSize?: number;
    coronaConfig?: CoronaConfig;  // Enhanced corona configuration
    pulseSpeed?: number;
    radiationIntensity?: number;
    swirlSpeed?: number;
    maxSunspots?: number;
    sunspotRotationSpeed?: number;
}

// Planet and star type definitions
export interface PlanetType {
    name: string;
    colors: string[];
    sizeMultiplier: number;
    discoveryValue: number;
    rarity: number;
    visualEffects: PlanetVisualEffects;
}

export interface StarType {
    name: string;
    description: string;
    colors: string[];
    sizeMultiplier: number;
    temperature: string;
    discoveryValue: number;
    rarity: number;
    visualEffects: StarVisualEffects;
}

// Base celestial object class
export abstract class CelestialObject {
    x: number;
    y: number;
    type: 'star' | 'planet' | 'moon' | 'nebula' | 'asteroids' | 'wormhole' | 'blackhole';
    discovered: boolean = false;
    discoveryDistance: number = 50;

    constructor(x: number, y: number, type: 'star' | 'planet' | 'moon' | 'nebula' | 'asteroids' | 'wormhole' | 'blackhole') {
        this.x = x;
        this.y = y;
        this.type = type;
    }

    distanceToShip(camera: Camera): number {
        const dx = this.x - camera.x;
        const dy = this.y - camera.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    checkDiscovery(camera: Camera, canvasWidth: number, canvasHeight: number): boolean {
        if (this.discovered) return false;
        
        // Use the centralized DiscoveryService for consistent discovery logic
        const discoveryService = new DiscoveryService();
        const shouldDiscover = discoveryService.checkDiscovery(this, camera, canvasWidth, canvasHeight);
        
        if (shouldDiscover) {
            this.discovered = true;
            return true; // Newly discovered
        }
        
        return false;
    }

    abstract render(renderer: Renderer, camera: Camera): void;
}