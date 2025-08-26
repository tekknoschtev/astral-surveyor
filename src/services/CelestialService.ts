// CelestialService - Clean architecture service for celestial object management
// Provides a unified interface for creating and managing celestial objects

import { Star, StarTypes } from '../celestial/Star.js';
import { Planet, PlanetTypes } from '../celestial/Planet.js';
import { Moon } from '../celestial/Moon.js';
import { SeededRandom } from '../utils/random.js';
import type { 
    Renderer, 
    Camera
} from '../celestial/CelestialTypes.js';
import type { ConfigService } from '../config/ConfigService.js';
import type { DiscoveryService } from './DiscoveryService.js';
import type { IWorldService } from './WorldService.js';

// Factory interfaces for creating celestial objects
interface StarFactory {
    create(x: number, y: number, starType?: string, seed?: number): Star;
}

interface PlanetFactory {
    create(x: number, y: number, parentStar: Star, planetIndex: number, planetType?: string, seed?: number): Planet;
}

interface MoonFactory {
    create(x: number, y: number, parentPlanet: Planet, moonIndex: number, seed?: number): Moon;
}

export interface ICelestialService {
    // Object creation
    createStar(x: number, y: number, starType?: string, seed?: number): Star;
    createPlanet(x: number, y: number, parentStar: Star, planetIndex: number, planetType?: string, seed?: number): Planet;
    createMoon(x: number, y: number, parentPlanet: Planet, moonIndex: number, seed?: number): Moon;
    
    // Rendering management
    renderObject(object: Star | Planet | Moon, renderer: Renderer, camera: Camera): void;
    renderObjects(objects: (Star | Planet | Moon)[], renderer: Renderer, camera: Camera): void;
    renderObjectWithEffects(object: Star | Planet | Moon, renderer: Renderer, camera: Camera): void;
    
    // Discovery integration
    checkObjectDiscovery(object: Star | Planet | Moon, camera: Camera, canvasWidth: number, canvasHeight: number): boolean;
    markObjectDiscovered(object: Star | Planet | Moon): void;
    getObjectId(object: Star | Planet | Moon): string;
    
    // Utility functions
    calculateOrbitalDistance(planet: Planet, star: Star): number;
    getAvailableStarTypes(): string[];
    getAvailablePlanetTypes(): string[];
    isValidStarType(type: string): boolean;
    isValidPlanetType(type: string): boolean;
    
    // Configuration
    reloadConfiguration(): void;
    
    // Lifecycle
    dispose(): void;
}

export class CelestialService implements ICelestialService {
    public readonly configService: ConfigService;
    public readonly discoveryService: DiscoveryService;
    public readonly worldService: IWorldService;
    
    public readonly starFactory: StarFactory;
    public readonly planetFactory: PlanetFactory;
    public readonly moonFactory: MoonFactory;
    
    private disposed: boolean = false;
    private configuration: any = {};

    constructor(configService: ConfigService, discoveryService: DiscoveryService, worldService: IWorldService) {
        if (!configService) {
            throw new Error('ConfigService is required');
        }
        if (!discoveryService) {
            throw new Error('DiscoveryService is required');
        }
        if (!worldService) {
            throw new Error('WorldService is required');
        }

        this.configService = configService;
        this.discoveryService = discoveryService;
        this.worldService = worldService;
        
        // Initialize factories
        this.starFactory = this.createStarFactory();
        this.planetFactory = this.createPlanetFactory();
        this.moonFactory = this.createMoonFactory();
        
        this.loadConfiguration();
    }

    /**
     * Create a new star
     */
    createStar(x: number, y: number, starType?: string, seed?: number): Star {
        this.ensureNotDisposed();
        return this.starFactory.create(x, y, starType, seed);
    }

    /**
     * Create a new planet
     */
    createPlanet(x: number, y: number, parentStar: Star, planetIndex: number, planetType?: string, seed?: number): Planet {
        this.ensureNotDisposed();
        const planet = this.planetFactory.create(x, y, parentStar, planetIndex, planetType, seed);
        
        // Automatically add to parent star
        parentStar.addPlanet(planet);
        
        return planet;
    }

    /**
     * Create a new moon
     */
    createMoon(x: number, y: number, parentPlanet: Planet, moonIndex: number, seed?: number): Moon {
        this.ensureNotDisposed();
        return this.moonFactory.create(x, y, parentPlanet, moonIndex, seed);
    }

    /**
     * Render a single celestial object
     */
    renderObject(object: Star | Planet | Moon, renderer: Renderer, camera: Camera): void {
        this.ensureNotDisposed();
        
        // Check if object is roughly on screen before rendering
        if (this.isObjectInViewport(object, renderer, camera)) {
            object.render(renderer, camera);
        }
    }

    /**
     * Render multiple celestial objects efficiently
     */
    renderObjects(objects: (Star | Planet | Moon)[], renderer: Renderer, camera: Camera): void {
        this.ensureNotDisposed();
        
        for (const object of objects) {
            this.renderObject(object, renderer, camera);
        }
    }

    /**
     * Render object with visual effects
     */
    renderObjectWithEffects(object: Star | Planet | Moon, renderer: Renderer, camera: Camera): void {
        this.ensureNotDisposed();
        
        if (this.isObjectInViewport(object, renderer, camera)) {
            object.render(renderer, camera);
            
            // Apply visual effects if the object supports them
            if ('renderVisualEffects' in object && typeof object.renderVisualEffects === 'function') {
                const [screenX, screenY] = camera.worldToScreen(object.x, object.y, renderer.canvas.width, renderer.canvas.height);
                object.renderVisualEffects(renderer, screenX, screenY);
            }
        }
    }

    /**
     * Check if an object should be discovered
     */
    checkObjectDiscovery(object: Star | Planet | Moon, camera: Camera, canvasWidth: number, canvasHeight: number): boolean {
        this.ensureNotDisposed();
        return this.discoveryService.checkDiscovery(object, camera, canvasWidth, canvasHeight);
    }

    /**
     * Mark an object as discovered
     */
    markObjectDiscovered(object: Star | Planet | Moon): void {
        this.ensureNotDisposed();
        object.discovered = true;
    }

    /**
     * Get unique ID for an object
     */
    getObjectId(object: Star | Planet | Moon): string {
        return this.worldService.getObjectId(object.x, object.y, object.type, object);
    }

    /**
     * Calculate orbital distance between planet and star
     */
    calculateOrbitalDistance(planet: Planet, star: Star): number {
        const dx = planet.x - star.x;
        const dy = planet.y - star.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Get all available star types
     */
    getAvailableStarTypes(): string[] {
        return Object.keys(StarTypes);
    }

    /**
     * Get all available planet types
     */
    getAvailablePlanetTypes(): string[] {
        return Object.keys(PlanetTypes);
    }

    /**
     * Check if a star type is valid
     */
    isValidStarType(type: string): boolean {
        return type in StarTypes;
    }

    /**
     * Check if a planet type is valid
     */
    isValidPlanetType(type: string): boolean {
        return type in PlanetTypes;
    }

    /**
     * Reload configuration from config service
     */
    reloadConfiguration(): void {
        this.loadConfiguration();
    }

    /**
     * Dispose resources and clean up
     */
    dispose(): void {
        this.disposed = true;
    }

    // Private helper methods

    private createStarFactory(): StarFactory {
        return {
            create: (x: number, y: number, starType?: string, seed?: number): Star => {
                const starTypeObj = starType && starType in StarTypes ? StarTypes[starType] : StarTypes.G_TYPE;
                const star = new Star(x, y, starTypeObj);
                
                if (seed !== undefined) {
                    const rng = new SeededRandom(seed);
                    star.initWithSeed(rng, starTypeObj);
                }
                
                // Apply configuration
                if (this.configuration.star && this.configuration.star.defaultRadius) {
                    star.radius = this.configuration.star.defaultRadius;
                }
                
                // Apply visual effects configuration
                if (this.configuration.effects && this.configuration.effects.sunspots) {
                    star.visualEffects.hasSunspots = this.configuration.effects.sunspots.enabled;
                }
                
                // Generate unique ID
                star.uniqueId = star.generateUniqueId();
                
                return star;
            }
        };
    }

    private createPlanetFactory(): PlanetFactory {
        return {
            create: (x: number, y: number, parentStar: Star, planetIndex: number, planetType?: string, seed?: number): Planet => {
                const planetTypeObj = planetType && planetType in PlanetTypes ? PlanetTypes[planetType] : PlanetTypes.ROCKY;
                
                // Calculate orbital distance from parent star
                const orbitalDistance = Math.sqrt((x - parentStar.x) ** 2 + (y - parentStar.y) ** 2);
                const orbitalAngle = Math.atan2(y - parentStar.y, x - parentStar.x);
                const orbitalSpeed = 0.001; // Default orbital speed
                
                const planet = new Planet(x, y, parentStar, orbitalDistance, orbitalAngle, orbitalSpeed, planetTypeObj);
                
                // Set planet index manually since it's not in constructor
                planet.planetIndex = planetIndex;
                
                if (seed !== undefined) {
                    const rng = new SeededRandom(seed);
                    planet.initWithSeed(rng, parentStar, orbitalDistance, orbitalAngle, orbitalSpeed, planetTypeObj, planetIndex);
                }
                
                // Apply configuration but allow type-specific radius to override
                if (this.configuration.planet && this.configuration.planet.defaultRadius && !planet.radius) {
                    planet.radius = this.configuration.planet.defaultRadius;
                }
                
                return planet;
            }
        };
    }

    private createMoonFactory(): MoonFactory {
        return {
            create: (x: number, y: number, parentPlanet: Planet, moonIndex: number, seed?: number): Moon => {
                // Calculate orbital distance from parent planet
                const orbitalDistance = Math.sqrt((x - parentPlanet.x) ** 2 + (y - parentPlanet.y) ** 2);
                const orbitalAngle = Math.atan2(y - parentPlanet.y, x - parentPlanet.x);
                const orbitalSpeed = 0.002; // Default orbital speed for moons
                
                const moon = new Moon(x, y, parentPlanet, orbitalDistance, orbitalAngle, orbitalSpeed);
                
                // Set moon index manually since it's not in constructor
                moon.moonIndex = moonIndex;
                
                if (seed !== undefined) {
                    const rng = new SeededRandom(seed);
                    moon.initWithSeed(rng);
                }
                
                // Apply configuration
                if (this.configuration.moon && this.configuration.moon.defaultRadius) {
                    moon.radius = this.configuration.moon.defaultRadius;
                }
                
                return moon;
            }
        };
    }

    private loadConfiguration(): void {
        this.configuration = {
            star: {
                defaultRadius: this.configService.get('celestial.star.defaultRadius', 80)
            },
            planet: {
                defaultRadius: this.configService.get('celestial.planet.defaultRadius', 20)
            },
            moon: {
                defaultRadius: this.configService.get('celestial.moon.defaultRadius', 8)
            },
            effects: {
                corona: {
                    enabled: this.configService.get('celestial.effects.corona.enabled', true)
                },
                sunspots: {
                    enabled: this.configService.get('celestial.effects.sunspots.enabled', true)
                }
            }
        };
        
        // Validate configuration
        if (this.configuration.star.defaultRadius <= 0) {
            throw new Error(`Invalid star radius: ${this.configuration.star.defaultRadius}`);
        }
    }

    private isObjectInViewport(object: Star | Planet | Moon, renderer: Renderer, camera: Camera): boolean {
        const [screenX, screenY] = camera.worldToScreen(object.x, object.y, renderer.canvas.width, renderer.canvas.height);
        const renderBounds = (object.radius || 20) + 50; // Add buffer for effects
        
        return screenX >= -renderBounds && 
               screenX <= renderer.canvas.width + renderBounds &&
               screenY >= -renderBounds && 
               screenY <= renderer.canvas.height + renderBounds;
    }

    private ensureNotDisposed(): void {
        if (this.disposed) {
            throw new Error('CelestialService has been disposed');
        }
    }
}