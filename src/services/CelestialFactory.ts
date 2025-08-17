// CelestialFactory - Factory pattern implementation for celestial object creation
// Replaces switch statements with polymorphic factory classes

import { Star, StarTypes } from '../celestial/Star.js';
import { Planet, PlanetTypes } from '../celestial/Planet.js';
import { Moon } from '../celestial/Moon.js';
import { Nebula } from '../celestial/nebulae.js';
import { SeededRandom } from '../utils/random.js';
import type { ConfigService } from '../config/ConfigService.js';

// Factory capability description interface
export interface FactoryCapabilities {
    type: string;
    canCreate: boolean;
    requiredParameters: string[];
    optionalParameters: string[];
}

// Batch creation request interface
export interface BatchCreationRequest {
    type: string;
    x: number;
    y: number;
    objectType?: string;
    parent?: any;
}

// Base factory interface
export interface ICelestialObjectFactory {
    create(x: number, y: number, objectType?: string, parent?: any): any;
    dispose(): void;
}

// Specific factory interfaces
export interface IStarFactory extends ICelestialObjectFactory {
    create(x: number, y: number, starType?: string, seed?: number): Star;
}

export interface IPlanetFactory extends ICelestialObjectFactory {
    create(x: number, y: number, planetType?: string, parentStar?: any): Planet;
}

export interface IMoonFactory extends ICelestialObjectFactory {
    create(x: number, y: number, moonType?: undefined, parentPlanet?: any): Moon;
}

export interface INebulaFactory extends ICelestialObjectFactory {
    create(x: number, y: number, nebulaType?: string, seed?: number): Nebula;
}

/**
 * Star factory implementation
 */
export class StarFactory implements IStarFactory {
    private validStarTypes = [
        'G-Type Star', 'M-Type Star', 'K-Type Star', 
        'Red Giant', 'Blue Giant', 'White Dwarf', 'Neutron Star'
    ];

    create(x: number, y: number, starType?: string, seed?: number): Star {
        this.validateCoordinates(x, y);
        
        // Use default type if none provided
        const finalStarType = starType || 'G-Type Star';
        
        // Validate star type
        if (!this.validStarTypes.includes(finalStarType)) {
            throw new Error(`Invalid star type: ${finalStarType}`);
        }

        // Find the correct StarType object from StarTypes
        const starTypeObj = Object.values(StarTypes).find(st => st.name === finalStarType);
        if (!starTypeObj) {
            throw new Error(`Star type not found: ${finalStarType}`);
        }

        const star = new Star(x, y, starTypeObj);
        
        // Initialize with seed if provided
        if (seed !== undefined) {
            const rng = new SeededRandom(seed);
            star.initWithSeed(rng, starTypeObj);
        }
        
        return star;
    }

    dispose(): void {
        // No resources to clean up for star factory
    }

    private validateCoordinates(x: number, y: number): void {
        if (typeof x !== 'number' || typeof y !== 'number') {
            throw new Error('Invalid coordinates: x and y must be numbers');
        }
        if (!isFinite(x) || !isFinite(y)) {
            throw new Error('Invalid coordinates: x and y must be finite numbers');
        }
    }
}

/**
 * Planet factory implementation
 */
export class PlanetFactory implements IPlanetFactory {
    private validPlanetTypes = [
        'Rocky Planet', 'Gas Giant', 'Ice Giant', 
        'Volcanic World', 'Frozen World', 'Exotic World'
    ];

    create(x: number, y: number, planetType?: string, parentStar?: any): Planet {
        this.validateCoordinates(x, y);
        
        if (!parentStar) {
            throw new Error('Parent star is required for planet creation');
        }

        // Use default type if none provided
        const finalPlanetType = planetType || 'Rocky Planet';
        
        // Validate planet type
        if (!this.validPlanetTypes.includes(finalPlanetType)) {
            throw new Error(`Invalid planet type: ${finalPlanetType}`);
        }

        // Calculate orbital parameters
        const orbitalDistance = this.calculateOrbitalDistance(parentStar, x, y);
        const orbitalAngle = this.calculateOrbitalAngle(parentStar, x, y);
        const orbitalSpeed = this.calculateOrbitalSpeed(orbitalDistance);

        // Find the correct PlanetType object from PlanetTypes
        const planetTypeObj = Object.values(PlanetTypes).find(pt => pt.name === finalPlanetType);
        if (!planetTypeObj) {
            throw new Error(`Planet type not found: ${finalPlanetType}`);
        }

        return new Planet(x, y, parentStar, orbitalDistance, orbitalAngle, orbitalSpeed, planetTypeObj);
    }

    dispose(): void {
        // No resources to clean up for planet factory
    }

    private validateCoordinates(x: number, y: number): void {
        if (typeof x !== 'number' || typeof y !== 'number') {
            throw new Error('Invalid coordinates: x and y must be numbers');
        }
    }

    private calculateOrbitalDistance(parentStar: any, x: number, y: number): number {
        const dx = x - parentStar.x;
        const dy = y - parentStar.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    private calculateOrbitalAngle(parentStar: any, x: number, y: number): number {
        const dx = x - parentStar.x;
        const dy = y - parentStar.y;
        return Math.atan2(dy, dx);
    }

    private calculateOrbitalSpeed(distance: number): number {
        // Kepler's third law approximation - closer planets orbit faster
        return Math.max(0.1, 2.0 / Math.sqrt(distance / 50));
    }
}

/**
 * Moon factory implementation
 */
export class MoonFactory implements IMoonFactory {
    create(x: number, y: number, moonType?: undefined, parentPlanet?: any): Moon {
        this.validateCoordinates(x, y);
        
        if (!parentPlanet) {
            throw new Error('Parent planet is required for moon creation');
        }

        // Calculate orbital parameters (smaller than planets)
        const orbitalDistance = this.calculateOrbitalDistance(parentPlanet, x, y);
        const orbitalAngle = this.calculateOrbitalAngle(parentPlanet, x, y);
        const orbitalSpeed = this.calculateOrbitalSpeed(orbitalDistance);

        return new Moon(x, y, parentPlanet, orbitalDistance, orbitalAngle, orbitalSpeed);
    }

    dispose(): void {
        // No resources to clean up for moon factory
    }

    private validateCoordinates(x: number, y: number): void {
        if (typeof x !== 'number' || typeof y !== 'number') {
            throw new Error('Invalid coordinates: x and y must be numbers');
        }
    }

    private calculateOrbitalDistance(parentPlanet: any, x: number, y: number): number {
        const dx = x - parentPlanet.x;
        const dy = y - parentPlanet.y;
        return Math.min(80, Math.sqrt(dx * dx + dy * dy)); // Cap moon orbital distance
    }

    private calculateOrbitalAngle(parentPlanet: any, x: number, y: number): number {
        const dx = x - parentPlanet.x;
        const dy = y - parentPlanet.y;
        return Math.atan2(dy, dx);
    }

    private calculateOrbitalSpeed(distance: number): number {
        // Moons orbit faster than planets due to smaller distances
        return Math.max(0.5, 5.0 / Math.sqrt(distance / 20));
    }
}

/**
 * Nebula factory implementation
 */
export class NebulaFactory implements INebulaFactory {
    private validNebulaTypes = [
        'emission', 'reflection', 'planetary', 'dark'
    ];

    create(x: number, y: number, nebulaType?: string, seed?: number): Nebula {
        this.validateCoordinates(x, y);
        
        // Use default type if none provided
        const finalNebulaType = nebulaType || 'emission';
        
        // Validate nebula type
        if (!this.validNebulaTypes.includes(finalNebulaType)) {
            throw new Error(`Invalid nebula type: ${finalNebulaType}`);
        }

        // Create proper SeededRandom for nebula
        const rng = seed !== undefined ? new SeededRandom(seed) : new SeededRandom(Date.now());

        return new Nebula(x, y, finalNebulaType, rng);
    }

    dispose(): void {
        // No resources to clean up for nebula factory
    }

    private validateCoordinates(x: number, y: number): void {
        if (typeof x !== 'number' || typeof y !== 'number') {
            throw new Error('Invalid coordinates: x and y must be numbers');
        }
    }
}

/**
 * Main celestial factory orchestrator
 */
export class CelestialFactory {
    private factories: Map<string, ICelestialObjectFactory> = new Map();
    private configService: ConfigService;
    private disposed: boolean = false;

    constructor(configService: ConfigService) {
        this.configService = configService;
        this.initializeFactories();
    }

    /**
     * Register a factory for a specific celestial object type
     */
    registerFactory(type: string, factory: ICelestialObjectFactory): void {
        this.ensureNotDisposed();
        
        // Dispose old factory if it exists
        const oldFactory = this.factories.get(type);
        if (oldFactory) {
            oldFactory.dispose();
        }
        
        this.factories.set(type, factory);
    }

    /**
     * Check if a factory is registered for the given type
     */
    hasFactory(type: string): boolean {
        return this.factories.has(type);
    }

    /**
     * Get factory instance for the given type
     */
    getFactory(type: string): ICelestialObjectFactory | undefined {
        return this.factories.get(type);
    }

    /**
     * Create a celestial object of the specified type
     */
    create(type: string, x: number, y: number, objectType?: string, parent?: any): any {
        this.ensureNotDisposed();
        this.validateCoordinates(x, y);
        
        const factory = this.factories.get(type);
        if (!factory) {
            throw new Error(`No factory registered for type: ${type}`);
        }

        try {
            return factory.create(x, y, objectType, parent);
        } catch (error) {
            // Re-throw factory errors with context
            throw new Error(`Failed to create ${type} at (${x}, ${y}): ${error.message}`);
        }
    }

    /**
     * Create multiple celestial objects in batch
     */
    createBatch(requests: BatchCreationRequest[]): any[] {
        this.ensureNotDisposed();
        
        const results: any[] = [];
        
        for (const request of requests) {
            try {
                const object = this.create(request.type, request.x, request.y, request.objectType, request.parent);
                results.push(object);
            } catch (error) {
                console.warn(`Failed to create ${request.type} in batch:`, error);
                // Continue processing other objects
            }
        }
        
        return results;
    }

    /**
     * Get list of available celestial object types
     */
    getAvailableTypes(): string[] {
        return Array.from(this.factories.keys());
    }

    /**
     * Get capabilities of a specific factory
     */
    getFactoryCapabilities(type: string): FactoryCapabilities {
        const hasFactory = this.hasFactory(type);
        
        // Define capabilities based on type
        const capabilities: Record<string, FactoryCapabilities> = {
            star: {
                type: 'star',
                canCreate: hasFactory,
                requiredParameters: ['x', 'y'],
                optionalParameters: ['starType', 'seed']
            },
            planet: {
                type: 'planet',
                canCreate: hasFactory,
                requiredParameters: ['x', 'y', 'parentStar'],
                optionalParameters: ['planetType']
            },
            moon: {
                type: 'moon',
                canCreate: hasFactory,
                requiredParameters: ['x', 'y', 'parentPlanet'],
                optionalParameters: []
            },
            nebula: {
                type: 'nebula',
                canCreate: hasFactory,
                requiredParameters: ['x', 'y'],
                optionalParameters: ['nebulaType', 'seed']
            }
        };
        
        return capabilities[type] || {
            type,
            canCreate: hasFactory,
            requiredParameters: ['x', 'y'],
            optionalParameters: []
        };
    }

    /**
     * Reload configuration and update factories
     */
    reloadConfiguration(): void {
        this.ensureNotDisposed();
        
        try {
            const config = this.configService.getCelestialConfig();
            this.validateConfiguration(config);
            // Configuration reloaded successfully
        } catch (error) {
            throw new Error(`Invalid celestial configuration: ${error.message}`);
        }
    }

    /**
     * Dispose of all factories and clean up resources
     */
    dispose(): void {
        if (this.disposed) return;
        
        // Dispose all registered factories
        for (const factory of this.factories.values()) {
            try {
                factory.dispose();
            } catch (error) {
                console.warn('Error disposing factory:', error);
            }
        }
        
        this.factories.clear();
        this.disposed = true;
    }

    // Private helper methods

    private initializeFactories(): void {
        this.registerFactory('star', new StarFactory());
        this.registerFactory('planet', new PlanetFactory());
        this.registerFactory('moon', new MoonFactory());
        this.registerFactory('nebula', new NebulaFactory());
    }

    private validateCoordinates(x: number, y: number): void {
        if (typeof x !== 'number' || typeof y !== 'number') {
            throw new Error('Invalid coordinates: x and y must be numbers');
        }
    }

    private validateConfiguration(config: any): void {
        // Validate configuration structure
        if (!config || typeof config !== 'object') {
            throw new Error('Configuration must be an object');
        }

        // Validate density values
        for (const [key, value] of Object.entries(config)) {
            if (value && typeof value === 'object' && 'density' in value) {
                const density = (value as any).density;
                if (typeof density === 'number' && (density < 0 || density > 1)) {
                    throw new Error(`Invalid density for ${key}: must be between 0 and 1`);
                }
            }
        }
    }

    private ensureNotDisposed(): void {
        if (this.disposed) {
            throw new Error('CelestialFactory has been disposed');
        }
    }
}