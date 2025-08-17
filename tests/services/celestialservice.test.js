// CelestialService Tests - Test-driven development for celestial object management
// Following Phase 4 clean architecture patterns

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CelestialService } from '../../dist/services/CelestialService.js';

describe('CelestialService', () => {
    let celestialService;
    let mockConfigService;
    let mockDiscoveryService;
    let mockWorldService;

    beforeEach(() => {
        // Mock dependencies
        mockConfigService = {
            get: (key, defaultValue) => {
                const configMap = {
                    'celestial.star.defaultRadius': 80,
                    'celestial.planet.defaultRadius': 20,
                    'celestial.moon.defaultRadius': 8,
                    'celestial.effects.corona.enabled': true,
                    'celestial.effects.sunspots.enabled': true
                };
                return configMap[key] || defaultValue;
            },
            getCelestialConfig: () => ({
                star: { defaultRadius: 80 },
                planet: { defaultRadius: 20 },
                effects: { corona: { enabled: true } }
            })
        };

        mockDiscoveryService = {
            checkDiscovery: () => false,
            isObjectDiscovered: () => false,
            markDiscovered: () => {}
        };

        mockWorldService = {
            getObjectId: (x, y, type, obj) => `${type}_${Math.floor(x)}_${Math.floor(y)}`,
            getDiscoveredObjects: () => new Map()
        };

        celestialService = new CelestialService(mockConfigService, mockDiscoveryService, mockWorldService);
    });

    afterEach(() => {
        if (celestialService && typeof celestialService.dispose === 'function') {
            celestialService.dispose();
        }
    });

    describe('Initialization', () => {
        it('should initialize with proper dependencies', () => {
            expect(celestialService).toBeDefined();
            expect(celestialService.configService).toBe(mockConfigService);
            expect(celestialService.discoveryService).toBe(mockDiscoveryService);
            expect(celestialService.worldService).toBe(mockWorldService);
        });

        it('should handle missing dependencies gracefully', () => {
            expect(() => {
                new CelestialService(null, mockDiscoveryService, mockWorldService);
            }).toThrow('ConfigService is required');

            expect(() => {
                new CelestialService(mockConfigService, null, mockWorldService);
            }).toThrow('DiscoveryService is required');

            expect(() => {
                new CelestialService(mockConfigService, mockDiscoveryService, null);
            }).toThrow('WorldService is required');
        });

        it('should initialize default object factories', () => {
            expect(celestialService.starFactory).toBeDefined();
            expect(celestialService.planetFactory).toBeDefined();
            expect(celestialService.moonFactory).toBeDefined();
        });
    });

    describe('Star Management', () => {
        it('should create stars with default properties', () => {
            const star = celestialService.createStar(100, 200);
            
            expect(star).toBeDefined();
            expect(star.x).toBe(100);
            expect(star.y).toBe(200);
            expect(star.type).toBe('star');
            expect(star.radius).toBe(80); // From config
            expect(typeof star.starType).toBe('object');
        });

        it('should create stars with specific types', () => {
            const mTypeStar = celestialService.createStar(100, 200, 'M_TYPE');
            const blueGiantStar = celestialService.createStar(300, 400, 'BLUE_GIANT');
            
            expect(mTypeStar.starTypeName).toBe('M-Type Star');
            expect(blueGiantStar.starTypeName).toBe('Blue Giant');
            expect(mTypeStar.color).not.toBe(blueGiantStar.color);
        });

        it('should initialize stars with seeded randomization', () => {
            const star1 = celestialService.createStar(100, 200, null, 12345);
            const star2 = celestialService.createStar(100, 200, null, 12345);
            
            // Same seed should produce identical properties
            expect(star1.radius).toBe(star2.radius);
            expect(star1.color).toBe(star2.color);
            expect(star1.brightness).toBe(star2.brightness);
        });

        it('should generate unique IDs for stars', () => {
            const star1 = celestialService.createStar(100, 200);
            const star2 = celestialService.createStar(100, 201);
            
            expect(star1.uniqueId).toBeDefined();
            expect(star2.uniqueId).toBeDefined();
            expect(star1.uniqueId).not.toBe(star2.uniqueId);
        });

        it('should handle star visual effects configuration', () => {
            mockConfigService.get = (key, defaultValue) => {
                if (key === 'celestial.effects.sunspots.enabled') return false;
                return defaultValue;
            };

            const serviceWithoutSunspots = new CelestialService(mockConfigService, mockDiscoveryService, mockWorldService);
            const star = serviceWithoutSunspots.createStar(100, 200, 'G_TYPE');
            
            expect(star.visualEffects.hasSunspots).toBe(false);
            
            serviceWithoutSunspots.dispose();
        });
    });

    describe('Planet Management', () => {
        it('should create planets with parent star relationships', () => {
            const parentStar = celestialService.createStar(100, 200);
            const planet = celestialService.createPlanet(150, 250, parentStar, 0);
            
            expect(planet).toBeDefined();
            expect(planet.x).toBe(150);
            expect(planet.y).toBe(250);
            expect(planet.type).toBe('planet');
            expect(planet.parentStar).toBe(parentStar);
            expect(planet.planetIndex).toBe(0);
        });

        it('should create planets with specific types', () => {
            const parentStar = celestialService.createStar(100, 200);
            const gasPlanet = celestialService.createPlanet(150, 250, parentStar, 0, 'GAS_GIANT');
            const rockPlanet = celestialService.createPlanet(180, 280, parentStar, 1, 'ROCKY');
            
            expect(gasPlanet.planetTypeName).toBe('Gas Giant');
            expect(rockPlanet.planetTypeName).toBe('Rocky Planet');
            expect(gasPlanet.radius).toBeGreaterThan(rockPlanet.radius);
        });

        it('should automatically add planets to parent star', () => {
            const parentStar = celestialService.createStar(100, 200);
            const planet = celestialService.createPlanet(150, 250, parentStar, 0);
            
            expect(parentStar.planets).toContain(planet);
            expect(parentStar.planets.length).toBe(1);
        });

        it('should calculate orbital distances correctly', () => {
            const parentStar = celestialService.createStar(100, 200);
            const planet = celestialService.createPlanet(150, 250, parentStar, 0);
            
            const distance = celestialService.calculateOrbitalDistance(planet, parentStar);
            const expectedDistance = Math.sqrt((150-100)**2 + (250-200)**2);
            
            expect(distance).toBeCloseTo(expectedDistance, 1);
        });
    });

    describe('Moon Management', () => {
        it('should create moons with parent planet relationships', () => {
            const parentStar = celestialService.createStar(100, 200);
            const parentPlanet = celestialService.createPlanet(150, 250, parentStar, 0);
            const moon = celestialService.createMoon(160, 260, parentPlanet, 0);
            
            expect(moon).toBeDefined();
            expect(moon.x).toBe(160);
            expect(moon.y).toBe(260);
            expect(moon.type).toBe('moon');
            expect(moon.parentPlanet).toBe(parentPlanet);
            expect(moon.moonIndex).toBe(0);
        });

        it('should set appropriate moon sizes relative to planets', () => {
            const parentStar = celestialService.createStar(100, 200);
            const parentPlanet = celestialService.createPlanet(150, 250, parentStar, 0);
            const moon = celestialService.createMoon(160, 260, parentPlanet, 0);
            
            expect(moon.radius).toBeLessThan(parentPlanet.radius);
            expect(moon.radius).toBeGreaterThan(0);
        });

        it('should handle multiple moons for same planet', () => {
            const parentStar = celestialService.createStar(100, 200);
            const parentPlanet = celestialService.createPlanet(150, 250, parentStar, 0);
            const moon1 = celestialService.createMoon(160, 260, parentPlanet, 0);
            const moon2 = celestialService.createMoon(140, 240, parentPlanet, 1);
            
            expect(moon1.moonIndex).toBe(0);
            expect(moon2.moonIndex).toBe(1);
            expect(moon1.parentPlanet).toBe(parentPlanet);
            expect(moon2.parentPlanet).toBe(parentPlanet);
        });
    });

    describe('Rendering Management', () => {
        let mockRenderer, mockCamera;

        beforeEach(() => {
            mockRenderer = {
                canvas: { width: 800, height: 600 },
                fillStyle: '',
                strokeStyle: '',
                lineWidth: 1,
                fillRect: () => {},
                strokeRect: () => {},
                beginPath: () => {},
                arc: () => {},
                fill: () => {},
                stroke: () => {},
                save: () => {},
                restore: () => {},
                drawCircle: () => {}
            };

            mockCamera = {
                x: 0,
                y: 0,
                worldToScreen: (worldX, worldY, canvasWidth, canvasHeight) => [
                    worldX - mockCamera.x + canvasWidth/2,
                    worldY - mockCamera.y + canvasHeight/2
                ]
            };
        });

        it('should render celestial objects within view', () => {
            const star = celestialService.createStar(100, 200);
            let renderCalled = false;
            
            // Mock the render method to track calls
            star.render = () => { renderCalled = true; };
            
            celestialService.renderObject(star, mockRenderer, mockCamera);
            expect(renderCalled).toBe(true);
        });

        it('should batch render multiple objects efficiently', () => {
            const objects = [
                celestialService.createStar(100, 100),
                celestialService.createStar(200, 200),
                celestialService.createStar(300, 300)
            ];

            let renderCount = 0;
            objects.forEach(obj => {
                obj.render = () => { renderCount++; };
            });

            celestialService.renderObjects(objects, mockRenderer, mockCamera);
            expect(renderCount).toBe(3);
        });

        it('should apply visual effects based on configuration', () => {
            const star = celestialService.createStar(100, 200, 'G_TYPE');
            let effectsRendered = false;
            
            star.renderVisualEffects = () => { effectsRendered = true; };
            
            celestialService.renderObjectWithEffects(star, mockRenderer, mockCamera);
            expect(effectsRendered).toBe(true);
        });

        it('should skip rendering for off-screen objects', () => {
            // Position star far off-screen
            const star = celestialService.createStar(10000, 10000);
            let renderCalled = false;
            
            star.render = () => { renderCalled = true; };
            
            celestialService.renderObject(star, mockRenderer, mockCamera);
            // Should not render objects that are clearly off-screen
            expect(renderCalled).toBe(false);
        });
    });

    describe('Discovery Integration', () => {
        let mockCamera;

        beforeEach(() => {
            mockCamera = {
                x: 0,
                y: 0,
                worldToScreen: (worldX, worldY, canvasWidth, canvasHeight) => [
                    worldX - mockCamera.x + canvasWidth/2,
                    worldY - mockCamera.y + canvasHeight/2
                ]
            };
        });

        it('should check object discovery status', () => {
            const star = celestialService.createStar(100, 200);
            
            mockDiscoveryService.checkDiscovery = () => true;
            
            const isDiscovered = celestialService.checkObjectDiscovery(star, mockCamera, 800, 600);
            expect(isDiscovered).toBe(true);
        });

        it('should mark objects as discovered', () => {
            const star = celestialService.createStar(100, 200);
            expect(star.discovered).toBe(false);
            
            celestialService.markObjectDiscovered(star);
            expect(star.discovered).toBe(true);
        });

        it('should integrate with world service for object IDs', () => {
            const star = celestialService.createStar(100, 200);
            
            const objectId = celestialService.getObjectId(star);
            expect(objectId).toBe('star_100_200');
        });
    });

    describe('Performance and Memory Management', () => {
        it('should create multiple objects efficiently', () => {
            const start = performance.now();
            
            // Create a small solar system
            const star = celestialService.createStar(100, 200);
            for (let i = 0; i < 5; i++) {
                const planet = celestialService.createPlanet(150 + i * 50, 250, star, i);
                for (let j = 0; j < 2; j++) {
                    celestialService.createMoon(planet.x + 20 + j * 10, planet.y + 10, planet, j);
                }
            }
            
            const end = performance.now();
            const duration = end - start;
            
            // Should create objects quickly
            expect(duration).toBeLessThan(100); // Less than 100ms
        });

        it('should properly dispose of resources', () => {
            const star = celestialService.createStar(100, 200);
            expect(star).toBeDefined();
            
            celestialService.dispose();
            
            // Should not be able to create objects after disposal
            expect(() => {
                celestialService.createStar(200, 300);
            }).toThrow('CelestialService has been disposed');
        });

        it('should handle large numbers of objects', () => {
            const objects = [];
            
            // Create many objects
            for (let i = 0; i < 100; i++) {
                objects.push(celestialService.createStar(i * 10, i * 10));
            }
            
            expect(objects.length).toBe(100);
            expect(objects.every(obj => obj.type === 'star')).toBe(true);
        });
    });

    describe('Configuration Integration', () => {
        it('should respond to configuration changes', () => {
            let currentRadius = 80;
            mockConfigService.get = (key, defaultValue) => {
                if (key === 'celestial.star.defaultRadius') return currentRadius;
                return defaultValue;
            };

            const star1 = celestialService.createStar(100, 200);
            expect(star1.radius).toBe(80);

            // Change configuration
            currentRadius = 120;
            celestialService.reloadConfiguration();

            const star2 = celestialService.createStar(300, 400);
            expect(star2.radius).toBe(120);
        });

        it('should validate configuration values', () => {
            mockConfigService.get = (key, defaultValue) => {
                if (key === 'celestial.star.defaultRadius') return -10; // Invalid
                return defaultValue;
            };

            expect(() => {
                celestialService.reloadConfiguration();
            }).toThrow('Invalid star radius');
        });
    });

    describe('Object Type Management', () => {
        it('should provide available star types', () => {
            const starTypes = celestialService.getAvailableStarTypes();
            
            expect(Array.isArray(starTypes)).toBe(true);
            expect(starTypes.length).toBeGreaterThan(0);
            expect(starTypes).toContain('G_TYPE');
            expect(starTypes).toContain('M_TYPE');
        });

        it('should provide available planet types', () => {
            const planetTypes = celestialService.getAvailablePlanetTypes();
            
            expect(Array.isArray(planetTypes)).toBe(true);
            expect(planetTypes.length).toBeGreaterThan(0);
            expect(planetTypes).toContain('ROCKY');
            expect(planetTypes).toContain('GAS_GIANT');
        });

        it('should validate object types', () => {
            expect(celestialService.isValidStarType('G_TYPE')).toBe(true);
            expect(celestialService.isValidStarType('INVALID_TYPE')).toBe(false);
            
            expect(celestialService.isValidPlanetType('ROCKY')).toBe(true);
            expect(celestialService.isValidPlanetType('INVALID_TYPE')).toBe(false);
        });
    });
});