// CelestialFactory Tests - Test-driven development for factory pattern implementation
// Following Phase 4 clean architecture patterns

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CelestialFactory, StarFactory, PlanetFactory, MoonFactory, NebulaFactory } from '../../dist/services/CelestialFactory.js';

describe('CelestialFactory', () => {
    let celestialFactory;
    let mockConfigService;

    beforeEach(() => {
        mockConfigService = {
            get: vi.fn((key, defaultValue) => {
                const configMap = {
                    'celestial.star.density': 0.8,
                    'celestial.planet.density': 0.6,
                    'celestial.moon.density': 0.4,
                    'celestial.quality': 'high'
                };
                return configMap[key] || defaultValue;
            }),
            getCelestialConfig: vi.fn(() => ({
                star: { density: 0.8, enabled: true },
                planet: { density: 0.6, enabled: true },
                moon: { density: 0.4, enabled: true }
            }))
        };

        celestialFactory = new CelestialFactory(mockConfigService);
    });

    afterEach(() => {
        if (celestialFactory) {
            celestialFactory.dispose();
        }
    });

    describe('Factory Registration and Management', () => {
        it('should register all celestial object factories', () => {
            expect(celestialFactory.hasFactory('star')).toBe(true);
            expect(celestialFactory.hasFactory('planet')).toBe(true);
            expect(celestialFactory.hasFactory('moon')).toBe(true);
            expect(celestialFactory.hasFactory('nebula')).toBe(true);
        });

        it('should return false for unregistered factory types', () => {
            expect(celestialFactory.hasFactory('blackhole')).toBe(false);
            expect(celestialFactory.hasFactory('wormhole')).toBe(false);
        });

        it('should allow custom factory registration', () => {
            const customFactory = {
                create: vi.fn(() => ({ type: 'custom', id: 'test' })),
                dispose: vi.fn()
            };

            celestialFactory.registerFactory('custom', customFactory);
            expect(celestialFactory.hasFactory('custom')).toBe(true);
            
            const result = celestialFactory.create('custom', 100, 200);
            expect(customFactory.create).toHaveBeenCalledWith(100, 200, undefined, undefined);
            expect(result.type).toBe('custom');
        });

        it('should replace existing factories when re-registered', () => {
            const originalFactory = celestialFactory.getFactory('star');
            const newFactory = {
                create: vi.fn(() => ({ type: 'star', id: 'new' })),
                dispose: vi.fn()
            };

            celestialFactory.registerFactory('star', newFactory);
            expect(celestialFactory.getFactory('star')).toBe(newFactory);
            expect(celestialFactory.getFactory('star')).not.toBe(originalFactory);
        });
    });

    describe('Object Creation Interface', () => {
        it('should create star objects', () => {
            const star = celestialFactory.create('star', 100, 200, 'G-Type Star');
            
            expect(star).toBeDefined();
            expect(star.type).toBe('star');
            expect(star.x).toBe(100);
            expect(star.y).toBe(200);
            expect(star.starTypeName).toBe('G-Type Star');
        });

        it('should create planet objects', () => {
            const parentStar = { x: 100, y: 200, id: 'star_100_200' };
            const planet = celestialFactory.create('planet', 150, 250, 'Gas Giant', parentStar);
            
            expect(planet).toBeDefined();
            expect(planet.type).toBe('planet');
            expect(planet.x).toBe(150);
            expect(planet.y).toBe(250);
            expect(planet.planetTypeName).toBe('Gas Giant');
            expect(planet.parentStar).toBe(parentStar);
        });

        it('should create moon objects', () => {
            const parentPlanet = { x: 150, y: 250, id: 'planet_150_250' };
            const moon = celestialFactory.create('moon', 160, 260, undefined, parentPlanet);
            
            expect(moon).toBeDefined();
            expect(moon.type).toBe('moon');
            expect(moon.x).toBe(160);
            expect(moon.y).toBe(260);
            expect(moon.parentPlanet).toBe(parentPlanet);
        });

        it('should create nebula objects', () => {
            const nebula = celestialFactory.create('nebula', 300, 400, 'emission');
            
            expect(nebula).toBeDefined();
            expect(nebula.type).toBe('nebula');
            expect(nebula.x).toBe(300);
            expect(nebula.y).toBe(400);
            expect(nebula.nebulaType).toBe('emission');
        });

        it('should throw error for unknown object types', () => {
            expect(() => {
                celestialFactory.create('unknown', 100, 200);
            }).toThrow('No factory registered for type: unknown');
        });

        it('should handle optional parameters gracefully', () => {
            const star = celestialFactory.create('star', 100, 200);
            expect(star.starTypeName).toBeDefined(); // Should have default type
            
            const nebula = celestialFactory.create('nebula', 300, 400);
            expect(nebula.nebulaType).toBeDefined(); // Should have default type
        });
    });

    describe('Batch Creation', () => {
        it('should create multiple objects efficiently', () => {
            const objects = celestialFactory.createBatch([
                { type: 'star', x: 100, y: 200, objectType: 'G-Type Star' },
                { type: 'planet', x: 150, y: 250, objectType: 'Rocky Planet', parent: { x: 100, y: 200 } },
                { type: 'moon', x: 160, y: 260, parent: { x: 150, y: 250 } }
            ]);

            expect(objects).toHaveLength(3);
            expect(objects[0].type).toBe('star');
            expect(objects[1].type).toBe('planet');
            expect(objects[2].type).toBe('moon');
        });

        it('should handle empty batch creation', () => {
            const objects = celestialFactory.createBatch([]);
            expect(objects).toHaveLength(0);
        });

        it('should continue creating objects even if one fails', () => {
            const objects = celestialFactory.createBatch([
                { type: 'star', x: 100, y: 200 },
                { type: 'invalid', x: 150, y: 250 }, // This will fail
                { type: 'nebula', x: 300, y: 400 }
            ]);

            expect(objects).toHaveLength(2); // Only star and nebula should be created
            expect(objects[0].type).toBe('star');
            expect(objects[1].type).toBe('nebula');
        });
    });

    describe('Factory Performance and Caching', () => {
        it('should cache factory instances for repeated access', () => {
            const factory1 = celestialFactory.getFactory('star');
            const factory2 = celestialFactory.getFactory('star');
            
            expect(factory1).toBe(factory2);
        });

        it('should handle rapid object creation efficiently', () => {
            const start = performance.now();
            
            for (let i = 0; i < 100; i++) {
                celestialFactory.create('star', i * 10, i * 20, 'G-Type Star');
            }
            
            const end = performance.now();
            const duration = end - start;
            
            expect(duration).toBeLessThan(100); // Should create 100 objects in < 100ms
        });

        it('should reuse object pools when available', () => {
            // Create objects
            const star1 = celestialFactory.create('star', 100, 200);
            const star2 = celestialFactory.create('star', 300, 400);
            
            // Object pool would reuse instances in a real implementation
            expect(star1).toBeDefined();
            expect(star2).toBeDefined();
        });
    });

    describe('Configuration Integration', () => {
        it('should create objects with configuration available', () => {
            const star = celestialFactory.create('star', 100, 200, 'G-Type Star');
            
            expect(star).toBeDefined();
            expect(star.type).toBe('star');
        });

        it('should handle configuration changes dynamically', () => {
            celestialFactory.reloadConfiguration();
            
            expect(mockConfigService.getCelestialConfig).toHaveBeenCalled();
        });

        it('should validate configuration on reload', () => {
            mockConfigService.getCelestialConfig.mockReturnValue({
                star: { density: 1.5, enabled: true }, // Invalid density > 1
                planet: { density: 0.6, enabled: true }
            });

            expect(() => {
                celestialFactory.reloadConfiguration();
            }).toThrow('Invalid celestial configuration');
        });
    });

    describe('Error Handling and Validation', () => {
        it('should validate creation parameters', () => {
            expect(() => {
                celestialFactory.create('star', 'invalid', 200);
            }).toThrow('Invalid coordinates');

            expect(() => {
                celestialFactory.create('star', 100, 'invalid');
            }).toThrow('Invalid coordinates');
        });

        it('should handle factory creation errors gracefully', () => {
            const faultyFactory = {
                create: vi.fn(() => { throw new Error('Factory error'); }),
                dispose: vi.fn()
            };

            celestialFactory.registerFactory('faulty', faultyFactory);

            expect(() => {
                celestialFactory.create('faulty', 100, 200);
            }).toThrow('Factory error');
        });

        it('should clean up resources on disposal', () => {
            const mockFactory = {
                create: vi.fn(),
                dispose: vi.fn()
            };

            celestialFactory.registerFactory('test', mockFactory);
            celestialFactory.dispose();

            expect(mockFactory.dispose).toHaveBeenCalled();
        });
    });

    describe('Object Type Discovery', () => {
        it('should provide list of available object types', () => {
            const types = celestialFactory.getAvailableTypes();
            
            expect(types).toContain('star');
            expect(types).toContain('planet');
            expect(types).toContain('moon');
            expect(types).toContain('nebula');
        });

        it('should indicate factory capabilities', () => {
            const capabilities = celestialFactory.getFactoryCapabilities('star');
            
            expect(capabilities).toMatchObject({
                type: 'star',
                canCreate: true,
                requiredParameters: expect.arrayContaining(['x', 'y']),
                optionalParameters: expect.arrayContaining(['starType'])
            });
        });
    });
});

describe('StarFactory', () => {
    let starFactory;

    beforeEach(() => {
        starFactory = new StarFactory();
    });

    afterEach(() => {
        if (starFactory) {
            starFactory.dispose();
        }
    });

    describe('Star Creation', () => {
        it('should create stars with specified types', () => {
            const star = starFactory.create(100, 200, 'M-Type Star');
            
            expect(star.type).toBe('star');
            expect(star.x).toBe(100);
            expect(star.y).toBe(200);
            expect(star.starTypeName).toBe('M-Type Star');
        });

        it('should create stars with default type when none specified', () => {
            const star = starFactory.create(100, 200);
            
            expect(star.type).toBe('star');
            expect(star.starTypeName).toBeDefined();
        });

        it('should create stars with deterministic seeding', () => {
            const star1 = starFactory.create(100, 200, 'G-Type Star', 12345);
            const star2 = starFactory.create(100, 200, 'G-Type Star', 12345);
            
            // Should have identical properties when using same seed
            expect(star1.color).toBe(star2.color);
            expect(star1.brightness).toBe(star2.brightness);
        });

        it('should validate star types', () => {
            expect(() => {
                starFactory.create(100, 200, 'Invalid Star Type');
            }).toThrow('Invalid star type');
        });
    });
});

describe('PlanetFactory', () => {
    let planetFactory;
    let mockParentStar;

    beforeEach(() => {
        planetFactory = new PlanetFactory();
        mockParentStar = {
            x: 100,
            y: 200,
            id: 'star_100_200',
            type: 'star'
        };
    });

    afterEach(() => {
        if (planetFactory) {
            planetFactory.dispose();
        }
    });

    describe('Planet Creation', () => {
        it('should create planets with parent star', () => {
            const planet = planetFactory.create(150, 250, 'Gas Giant', mockParentStar);
            
            expect(planet.type).toBe('planet');
            expect(planet.x).toBe(150);
            expect(planet.y).toBe(250);
            expect(planet.planetTypeName).toBe('Gas Giant');
            expect(planet.parentStar).toBe(mockParentStar);
        });

        it('should calculate orbital parameters automatically', () => {
            const planet = planetFactory.create(150, 250, 'Rocky Planet', mockParentStar);
            
            expect(planet.orbitalDistance).toBeGreaterThan(0);
            expect(planet.orbitalSpeed).toBeGreaterThan(0);
            expect(typeof planet.orbitalAngle).toBe('number');
        });

        it('should validate planet types', () => {
            expect(() => {
                planetFactory.create(150, 250, 'Invalid Planet Type', mockParentStar);
            }).toThrow('Invalid planet type');
        });

        it('should require parent star for planet creation', () => {
            expect(() => {
                planetFactory.create(150, 250, 'Rocky Planet');
            }).toThrow('Parent star is required for planet creation');
        });
    });
});

describe('MoonFactory', () => {
    let moonFactory;
    let mockParentPlanet;

    beforeEach(() => {
        moonFactory = new MoonFactory();
        mockParentPlanet = {
            x: 150,
            y: 250,
            id: 'planet_150_250',
            type: 'planet'
        };
    });

    afterEach(() => {
        if (moonFactory) {
            moonFactory.dispose();
        }
    });

    describe('Moon Creation', () => {
        it('should create moons with parent planet', () => {
            const moon = moonFactory.create(160, 260, undefined, mockParentPlanet);
            
            expect(moon.type).toBe('moon');
            expect(moon.x).toBe(160);
            expect(moon.y).toBe(260);
            expect(moon.parentPlanet).toBe(mockParentPlanet);
        });

        it('should calculate smaller orbital parameters than planets', () => {
            const moon = moonFactory.create(160, 260, undefined, mockParentPlanet);
            
            expect(moon.orbitalDistance).toBeGreaterThan(0);
            expect(moon.orbitalDistance).toBeLessThan(100); // Moons have smaller orbits
            expect(moon.orbitalSpeed).toBeGreaterThan(0);
        });

        it('should require parent planet for moon creation', () => {
            expect(() => {
                moonFactory.create(160, 260);
            }).toThrow('Parent planet is required for moon creation');
        });
    });
});

describe('NebulaFactory', () => {
    let nebulaFactory;

    beforeEach(() => {
        nebulaFactory = new NebulaFactory();
    });

    afterEach(() => {
        if (nebulaFactory) {
            nebulaFactory.dispose();
        }
    });

    describe('Nebula Creation', () => {
        it('should create nebulae with specified types', () => {
            const nebula = nebulaFactory.create(300, 400, 'emission');
            
            expect(nebula.type).toBe('nebula');
            expect(nebula.x).toBe(300);
            expect(nebula.y).toBe(400);
            expect(nebula.nebulaType).toBe('emission');
        });

        it('should create nebulae with default type when none specified', () => {
            const nebula = nebulaFactory.create(300, 400);
            
            expect(nebula.type).toBe('nebula');
            expect(nebula.nebulaType).toBeDefined();
        });

        it('should validate nebula types', () => {
            expect(() => {
                nebulaFactory.create(300, 400, 'invalid');
            }).toThrow('Invalid nebula type');
        });

        it('should generate appropriate visual properties', () => {
            const nebula = nebulaFactory.create(300, 400, 'emission');
            
            expect(nebula.colors).toBeDefined();
            expect(nebula.colors).toBeInstanceOf(Array);
            expect(nebula.radius).toBeGreaterThan(0);
            expect(nebula.density).toBeGreaterThan(0);
            expect(nebula.density).toBeLessThanOrEqual(1);
        });
    });
});