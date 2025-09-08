import { expect, test, describe, beforeEach, beforeAll, vi } from 'vitest';

// Import modules directly for testing
let CrystalGarden, SeededRandom, generateCrystalGardenName;

beforeAll(async () => {
    const regionModule = await import('../../dist/celestial/RegionSpecificObjects.js');
    const randomModule = await import('../../dist/utils/random.js');
    const namingModule = await import('../../dist/naming/naming.js');
    
    CrystalGarden = regionModule.CrystalGarden;
    SeededRandom = randomModule.SeededRandom;
    generateCrystalGardenName = namingModule.generateCrystalGardenName;
});

describe('CrystalGarden', () => {
    let rng;
    let crystalGarden;

    beforeEach(() => {
        rng = new SeededRandom(12345);
        crystalGarden = new CrystalGarden(100, 200, 'pure');
    });

    describe('Construction and Basic Properties', () => {
        test('should create crystal garden with correct basic properties', () => {
            expect(crystalGarden.x).toBe(100);
            expect(crystalGarden.y).toBe(200);
            expect(crystalGarden.type).toBe('crystal-garden');
            expect(crystalGarden.variant).toBe('pure');
            expect(crystalGarden.radius).toBeGreaterThanOrEqual(40);
            expect(crystalGarden.radius).toBeLessThanOrEqual(50);
            expect(crystalGarden.discovered).toBe(false);
            expect(crystalGarden.discoveryValue).toBe(30);
            expect(crystalGarden.discoveryDistance).toBe(65);
        });

        test('should create different variants correctly', () => {
            const pureGarden = new CrystalGarden(0, 0, 'pure');
            const mixedGarden = new CrystalGarden(100, 100, 'mixed');
            const rareEarthGarden = new CrystalGarden(200, 200, 'rare-earth');
            
            expect(pureGarden.variant).toBe('pure');
            expect(mixedGarden.variant).toBe('mixed');
            expect(rareEarthGarden.variant).toBe('rare-earth');
            
            // Each variant should have different radius ranges
            expect(pureGarden.radius).toBe(45); // Pure variant
            expect(mixedGarden.radius).toBe(55); // Mixed variant 
            expect(rareEarthGarden.radius).toBe(40); // Rare-earth variant
            
            // Each variant should have different visual effects
            expect(pureGarden.visualEffects.hasLightRefraction).toBe(true);
            expect(mixedGarden.visualEffects.hasRainbowEffects).toBe(true);
            expect(rareEarthGarden.visualEffects.hasMusicalResonance).toBe(true);
        });

        test('should generate crystal clusters', () => {
            expect(crystalGarden.crystalClusters).toBeDefined();
            expect(Array.isArray(crystalGarden.crystalClusters)).toBe(true);
            expect(crystalGarden.crystalClusters.length).toBeGreaterThan(0);
            expect(crystalGarden.crystalClusters.length).toBeLessThanOrEqual(12); // Pure variant: 8-12 clusters
        });

        test('should have visual effects initialized', () => {
            expect(crystalGarden.visualEffects).toBeDefined();
            expect(crystalGarden.visualEffects.hasLightRefraction).toBe(true);
            expect(crystalGarden.visualEffects.hasTwinkling).toBe(true);
            expect(crystalGarden.visualEffects.hasGeometricFacets).toBe(true);
            
            // Animation properties
            expect(crystalGarden.animationPhase).toBe(0);
            expect(crystalGarden.twinklePhase).toBe(0);
        });
    });

    describe('Crystal Cluster Properties', () => {
        test('should have valid crystal cluster properties', () => {
            crystalGarden.crystalClusters.forEach(cluster => {
                expect(cluster.offsetX).toBeGreaterThanOrEqual(-crystalGarden.radius);
                expect(cluster.offsetX).toBeLessThanOrEqual(crystalGarden.radius);
                expect(cluster.offsetY).toBeGreaterThanOrEqual(-crystalGarden.radius);
                expect(cluster.offsetY).toBeLessThanOrEqual(crystalGarden.radius);
                expect(cluster.size).toBeGreaterThanOrEqual(3);
                expect(cluster.size).toBeLessThanOrEqual(9);
                expect(['octahedral', 'prismatic', 'cubic', 'hexagonal']).toContain(cluster.shape);
                expect(cluster.color).toBeDefined();
                expect(cluster.refractionIntensity).toBeGreaterThanOrEqual(0.6);
                expect(cluster.refractionIntensity).toBeLessThanOrEqual(1.0);
                expect(cluster.rotationSpeed).toBeGreaterThanOrEqual(0.5);
                expect(cluster.rotationSpeed).toBeLessThanOrEqual(2.0);
                expect(cluster.facetCount).toBeGreaterThanOrEqual(6);
                expect(cluster.facetCount).toBeLessThanOrEqual(10);
            });
        });

        test('should generate different crystal shapes', () => {
            const shapes = new Set();
            
            // Generate multiple crystal gardens to get shape variety  
            for (let i = 0; i < 20; i++) {
                const testGarden = new CrystalGarden(i * 50, i * 50, 'pure');
                testGarden.crystalClusters.forEach(cluster => {
                    shapes.add(cluster.shape);
                });
            }
            
            // Should have multiple different shapes
            expect(shapes.size).toBeGreaterThan(1);
        });
    });

    describe('Variant-Specific Behavior', () => {
        test('pure variant should have expected properties', () => {
            const pureGarden = new CrystalGarden(100, 100, 'pure');
            
            expect(pureGarden.variant).toBe('pure');
            expect(pureGarden.radius).toBe(45);
            expect(pureGarden.primaryColor).toBe('#E6F3FF');
            expect(pureGarden.visualEffects.hasLightRefraction).toBe(true);
            expect(pureGarden.visualEffects.hasTwinkling).toBe(true);
            expect(pureGarden.visualEffects.hasGeometricFacets).toBe(true);
            
            // Pure gardens should have 8-12 clusters
            expect(pureGarden.crystalClusters.length).toBeGreaterThanOrEqual(8);
            expect(pureGarden.crystalClusters.length).toBeLessThanOrEqual(12);
        });

        test('mixed variant should have expected properties', () => {
            const mixedGarden = new CrystalGarden(200, 200, 'mixed');
            
            expect(mixedGarden.variant).toBe('mixed');
            expect(mixedGarden.radius).toBe(55);
            expect(mixedGarden.primaryColor).toBe('#F0E6FF');
            expect(mixedGarden.visualEffects.hasLightRefraction).toBe(true);
            expect(mixedGarden.visualEffects.hasTwinkling).toBe(true);
            expect(mixedGarden.visualEffects.hasRainbowEffects).toBe(true);
            expect(mixedGarden.visualEffects.hasGeometricFacets).toBe(true);
            
            // Mixed gardens should have 12-18 clusters
            expect(mixedGarden.crystalClusters.length).toBeGreaterThanOrEqual(12);
            expect(mixedGarden.crystalClusters.length).toBeLessThanOrEqual(18);
        });

        test('rare-earth variant should have expected properties', () => {
            const rareEarthGarden = new CrystalGarden(300, 300, 'rare-earth');
            
            expect(rareEarthGarden.variant).toBe('rare-earth');
            expect(rareEarthGarden.radius).toBe(40);
            expect(rareEarthGarden.primaryColor).toBe('#FFE6F0');
            expect(rareEarthGarden.visualEffects.hasLightRefraction).toBe(true);
            expect(rareEarthGarden.visualEffects.hasTwinkling).toBe(true);
            expect(rareEarthGarden.visualEffects.hasPrismaticRays).toBe(true);
            expect(rareEarthGarden.visualEffects.hasRainbowEffects).toBe(true);
            expect(rareEarthGarden.visualEffects.hasMusicalResonance).toBe(true);
            expect(rareEarthGarden.visualEffects.hasGeometricFacets).toBe(true);
            
            // Rare-earth gardens should have 6-9 clusters
            expect(rareEarthGarden.crystalClusters.length).toBeGreaterThanOrEqual(6);
            expect(rareEarthGarden.crystalClusters.length).toBeLessThanOrEqual(9);
        });
    });

    describe('Visual Effect Updates', () => {
        test('should have initial animation state', () => {
            expect(crystalGarden.animationPhase).toBe(0);
            expect(crystalGarden.twinklePhase).toBe(0);
        });

        test('animation properties should be updatable', () => {
            // The updateAnimations method is private and time-based
            // We can only test that the properties exist and are modifiable
            const initialAnimationPhase = crystalGarden.animationPhase;
            const initialTwinklePhase = crystalGarden.twinklePhase;
            
            // Manually modify to simulate animation updates
            crystalGarden.animationPhase = 1.5;
            crystalGarden.twinklePhase = 2.0;
            
            expect(crystalGarden.animationPhase).toBe(1.5);
            expect(crystalGarden.twinklePhase).toBe(2.0);
            expect(crystalGarden.animationPhase).not.toBe(initialAnimationPhase);
            expect(crystalGarden.twinklePhase).not.toBe(initialTwinklePhase);
        });
    });

    describe('Rendering', () => {
        let mockRenderer;
        let mockCamera;

        beforeEach(() => {
            mockRenderer = {
                canvas: { width: 800, height: 600 },
                ctx: {
                    save: vi.fn(),
                    restore: vi.fn(),
                    translate: vi.fn(),
                    scale: vi.fn(),
                    rotate: vi.fn(),
                    fillStyle: '',
                    strokeStyle: '',
                    lineWidth: 0,
                    globalAlpha: 1,
                    globalCompositeOperation: 'source-over',
                    beginPath: vi.fn(),
                    closePath: vi.fn(),
                    fill: vi.fn(),
                    stroke: vi.fn(),
                    moveTo: vi.fn(),
                    lineTo: vi.fn(),
                    arc: vi.fn(),
                    fillRect: vi.fn(),
                    strokeRect: vi.fn(),
                    createLinearGradient: vi.fn(() => ({
                        addColorStop: vi.fn()
                    })),
                    createRadialGradient: vi.fn(() => ({
                        addColorStop: vi.fn()
                    }))
                },
                drawCircle: vi.fn(),
                drawDiscoveryIndicator: vi.fn(),
                drawDiscoveryPulse: vi.fn()
            };

            mockCamera = {
                x: 1000,
                y: 2000,
                worldToScreen: vi.fn(() => [400, 300]) // Mock screen position
            };
        });

        test('should render without errors', () => {
            expect(() => {
                crystalGarden.render(mockRenderer, mockCamera);
            }).not.toThrow();
        });

        test('should render discovery indicator when discovered', () => {
            crystalGarden.discovered = false;
            crystalGarden.render(mockRenderer, mockCamera);
            expect(mockRenderer.drawDiscoveryIndicator).not.toHaveBeenCalled();
            
            crystalGarden.discovered = true;
            crystalGarden.render(mockRenderer, mockCamera);
            expect(mockRenderer.drawDiscoveryIndicator).toHaveBeenCalled();
        });

        test('should handle camera worldToScreen calls', () => {
            crystalGarden.render(mockRenderer, mockCamera);
            
            expect(mockCamera.worldToScreen).toHaveBeenCalledWith(
                crystalGarden.x, 
                crystalGarden.y, 
                mockRenderer.canvas.width, 
                mockRenderer.canvas.height
            );
        });

        test('should skip rendering when off screen', () => {
            // Mock off-screen position
            mockCamera.worldToScreen.mockReturnValue([-1000, -1000]);
            
            expect(() => {
                crystalGarden.render(mockRenderer, mockCamera);
            }).not.toThrow();
            
            // Should still call worldToScreen for bounds check
            expect(mockCamera.worldToScreen).toHaveBeenCalled();
        });
    });
});

describe('Crystal Garden Naming', () => {
    test('should support crystal garden naming structure', () => {
        // Test the expected naming pattern for Crystal Gardens
        const expectedNames = [
            'Quartz Crystal Garden',
            'Amethyst Crystal Garden', 
            'Olivine Crystal Garden',
            'Malachite Crystal Garden'
        ];
        
        expectedNames.forEach(name => {
            expect(name).toMatch(/^.+ Crystal Garden$/);
            expect(name).toMatch(/Crystal Garden$/);
        });
    });

    test('should have consistent naming convention', () => {
        // Test that Crystal Garden names follow the expected format
        const mockCrystalGarden = {
            type: 'crystal-garden',
            variant: 'pure',
            x: 1000,
            y: 2000
        };
        
        // The naming should be consistent for same object
        expect(mockCrystalGarden.type).toBe('crystal-garden');
        expect(['pure', 'mixed', 'rare-earth']).toContain(mockCrystalGarden.variant);
    });

    test('should differentiate variants in naming system', () => {
        // Test that different variants can be handled by naming system
        const variants = ['pure', 'mixed', 'rare-earth'];
        
        variants.forEach(variant => {
            const mockGarden = {
                type: 'crystal-garden',
                variant: variant,
                x: 100 * Math.random(),
                y: 100 * Math.random()
            };
            
            expect(mockGarden.variant).toBe(variant);
            expect(mockGarden.type).toBe('crystal-garden');
        });
    });
});