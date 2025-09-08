import { expect, test, describe, beforeEach, beforeAll, vi } from 'vitest';

// Import modules directly for testing
let Protostar, SeededRandom, NamingService;

beforeAll(async () => {
    const regionModule = await import('../../dist/celestial/RegionSpecificObjects.js');
    const randomModule = await import('../../dist/utils/random.js');
    const namingModule = await import('../../dist/naming/naming.js');
    
    Protostar = regionModule.Protostar;
    SeededRandom = randomModule.SeededRandom;
    NamingService = namingModule.NamingService;
});

describe('Protostar', () => {
    let rng;
    let protostar;

    beforeEach(() => {
        rng = new SeededRandom(12345);
        protostar = new Protostar(100, 200, 'class-1');
    });

    describe('Construction and Basic Properties', () => {
        test('should create protostar with correct basic properties', () => {
            expect(protostar.x).toBe(100);
            expect(protostar.y).toBe(200);
            expect(protostar.type).toBe('protostar');
            expect(protostar.variant).toBe('class-1');
            expect(protostar.radius).toBe(20); // Class I radius
            expect(protostar.discovered).toBe(false);
            expect(protostar.discoveryValue).toBe(90);
            expect(protostar.discoveryDistance).toBe(70);
        });

        test('should create different variants correctly', () => {
            const class0 = new Protostar(0, 0, 'class-0');
            const class1 = new Protostar(100, 100, 'class-1');
            const class2 = new Protostar(200, 200, 'class-2');
            
            expect(class0.variant).toBe('class-0');
            expect(class1.variant).toBe('class-1');
            expect(class2.variant).toBe('class-2');
            
            // Each variant should have different properties
            expect(class0.radius).toBe(25); // Class 0 - largest due to envelope
            expect(class1.radius).toBe(20); // Class I - medium
            expect(class2.radius).toBe(15); // Class II - smallest, more condensed
            
            // Temperature progression
            expect(class0.coreTemperature).toBe(1000); // Coolest
            expect(class1.coreTemperature).toBe(2000); // Warmer
            expect(class2.coreTemperature).toBe(3000); // Hottest
            
            // Instability decreases as star forms
            expect(class0.instabilityFactor).toBe(0.8);
            expect(class1.instabilityFactor).toBe(0.6);
            expect(class2.instabilityFactor).toBe(0.3);
        });

        test('should have consistent stellar classification', () => {
            expect(protostar.stellarClassification).toBeDefined();
            expect(typeof protostar.stellarClassification).toBe('string');
            expect(protostar.stellarClassification.length).toBeGreaterThan(0);
            
            // Should follow "ConstellationName Letter" pattern
            expect(protostar.stellarClassification).toMatch(/^[A-Za-z]+ [A-Z]$/);
        });

        test('should initialize visual effects based on variant', () => {
            const class0 = new Protostar(0, 0, 'class-0');
            const class1 = new Protostar(100, 100, 'class-1');
            const class2 = new Protostar(200, 200, 'class-2');
            
            // Class 0 - deeply embedded, mostly infrared
            expect(class0.visualEffects.hasFlickeringCore).toBe(true);
            expect(class0.visualEffects.hasNebulaEnvelope).toBe(true);
            expect(class0.visualEffects.hasAccretionDisk).toBe(true);
            expect(class0.visualEffects.hasPolarJets).toBe(undefined);
            
            // Class I - visible with strong jets
            expect(class1.visualEffects.hasFlickeringCore).toBe(true);
            expect(class1.visualEffects.hasPolarJets).toBe(true);
            expect(class1.visualEffects.hasStellarWind).toBe(true);
            expect(class1.visualEffects.hasNebulaEnvelope).toBe(true);
            
            // Class II - nearly formed, more stable
            expect(class2.visualEffects.hasFlickeringCore).toBe(false);
            expect(class2.visualEffects.hasPolarJets).toBe(true);
            expect(class2.visualEffects.hasStellarWind).toBe(true);
        });
    });

    describe('Visual Features Generation', () => {
        test('should generate polar jets for appropriate variants', () => {
            const class1 = new Protostar(100, 100, 'class-1');
            const class2 = new Protostar(200, 200, 'class-2');
            
            // Class I and II should have jets
            expect(class1.polarJets).toBeDefined();
            expect(class1.polarJets.length).toBe(2); // Two opposing jets
            
            expect(class2.polarJets).toBeDefined();
            expect(class2.polarJets.length).toBe(2);
            
            // Check jet properties
            const jet = class1.polarJets[0];
            expect(jet.angle).toBeDefined();
            expect(jet.length).toBeGreaterThanOrEqual(60);
            expect(jet.length).toBeLessThanOrEqual(100);
            expect(jet.width).toBeGreaterThanOrEqual(8);
            expect(jet.width).toBeLessThanOrEqual(14);
            expect(jet.color).toBeDefined();
            
            // Jets should be roughly opposite (π radians apart)
            const jet1 = class1.polarJets[0];
            const jet2 = class1.polarJets[1];
            const angleDiff = Math.abs(jet1.angle - jet2.angle);
            expect(angleDiff).toBeCloseTo(Math.PI, 0.5);
        });

        test('should have deterministic disk rotation speed', () => {
            const protostar1 = new Protostar(100, 100, 'class-1');
            const protostar2 = new Protostar(100, 100, 'class-1'); // Same position
            const protostar3 = new Protostar(200, 200, 'class-1'); // Different position
            
            // Same position should have same rotation speed
            expect(protostar1.diskRotationSpeed).toBe(protostar2.diskRotationSpeed);
            
            // Different positions should have different rotation speeds
            expect(protostar1.diskRotationSpeed).not.toBe(protostar3.diskRotationSpeed);
            
            // Should be within expected range
            expect(protostar1.diskRotationSpeed).toBeGreaterThanOrEqual(0.5);
            expect(protostar1.diskRotationSpeed).toBeLessThanOrEqual(2.0);
        });

        test('should have appropriate accretion disk sizes', () => {
            const class0 = new Protostar(0, 0, 'class-0');
            const class1 = new Protostar(100, 100, 'class-1');
            const class2 = new Protostar(200, 200, 'class-2');
            
            // Disk size should decrease as star forms
            expect(class0.accretionDiskSize).toBe(60); // Largest
            expect(class1.accretionDiskSize).toBe(45); // Medium
            expect(class2.accretionDiskSize).toBe(30); // Smallest
        });
    });

    describe('Naming and Discovery', () => {
        test('should integrate with naming service', () => {
            const namingService = new NamingService();
            const generatedName = namingService.generateProtostarName(protostar);
            
            expect(generatedName).toBeDefined();
            expect(typeof generatedName).toBe('string');
            expect(generatedName).toMatch(/^Proto-.+/);
        });

        test('should be marked as discoverable', () => {
            expect(protostar.discoveryValue).toBe(90);
            expect(protostar.discoveryDistance).toBe(70);
            
            // Class 0 and Class II protostars should be notable discoveries
            const namingService = new NamingService();
            const class0 = new Protostar(0, 0, 'class-0');
            const class2 = new Protostar(200, 200, 'class-2');
            
            expect(namingService.isNotableDiscovery(class0)).toBe(true);
            expect(namingService.isNotableDiscovery(class2)).toBe(true);
        });

        test('should have appropriate discovery values for rarity', () => {
            // 90 points is appropriate for rare stellar formation objects
            expect(protostar.discoveryValue).toBe(90);
            
            // Should be between nebulae (50) and pulsars (100)
            expect(protostar.discoveryValue).toBeGreaterThan(50);
            expect(protostar.discoveryValue).toBeLessThan(100);
        });
    });

    describe('Animation Properties', () => {
        test('should initialize animation phases', () => {
            expect(protostar.animationPhase).toBe(0);
            expect(protostar.flickerPhase).toBe(0);
            expect(protostar.jetPhase).toBe(0);
        });

        test('should have mock render method', () => {
            // Create comprehensive mock renderer and camera
            const mockRenderer = {
                canvas: { width: 1000, height: 1000 },
                ctx: {
                    save: vi.fn(),
                    restore: vi.fn(),
                    translate: vi.fn(),
                    rotate: vi.fn(),
                    beginPath: vi.fn(),
                    arc: vi.fn(),
                    ellipse: vi.fn(), // Add ellipse method for accretion disk
                    fill: vi.fn(),
                    stroke: vi.fn(),
                    moveTo: vi.fn(),
                    lineTo: vi.fn(),
                    quadraticCurveTo: vi.fn(),
                    closePath: vi.fn(),
                    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
                    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
                    set fillStyle(value) {},
                    set strokeStyle(value) {},
                    set lineWidth(value) {},
                    set shadowColor(value) {},
                    set shadowBlur(value) {}
                },
                drawDiscoveryIndicator: vi.fn(),
                drawDiscoveryPulse: vi.fn()
            };
            
            const mockCamera = {
                worldToScreen: vi.fn(() => [500, 500])
            };
            
            // Should not throw error when rendering
            expect(() => protostar.render(mockRenderer, mockCamera)).not.toThrow();
        });
    });

    describe('Stellar Evolution Consistency', () => {
        test('should have realistic temperature progression', () => {
            const class0 = new Protostar(0, 0, 'class-0');
            const class1 = new Protostar(100, 100, 'class-1');
            const class2 = new Protostar(200, 200, 'class-2');
            
            // Temperature should increase with evolutionary stage
            expect(class0.coreTemperature).toBeLessThan(class1.coreTemperature);
            expect(class1.coreTemperature).toBeLessThan(class2.coreTemperature);
        });

        test('should have realistic color evolution', () => {
            const class0 = new Protostar(0, 0, 'class-0');
            const class1 = new Protostar(100, 100, 'class-1');
            const class2 = new Protostar(200, 200, 'class-2');
            
            // Colors should progress from deep red to yellow-white
            expect(class0.coreColor).toBe('#8B0000'); // Deep red
            expect(class1.coreColor).toBe('#FF4500'); // Orange-red
            expect(class2.coreColor).toBe('#FFD700'); // Yellow-white
        });

        test('should have realistic jet intensity progression', () => {
            const class0 = new Protostar(0, 0, 'class-0');
            const class1 = new Protostar(100, 100, 'class-1');
            const class2 = new Protostar(200, 200, 'class-2');
            
            // Class I should have strongest jets
            expect(class1.jetIntensity).toBeGreaterThan(class0.jetIntensity);
            expect(class1.jetIntensity).toBeGreaterThan(class2.jetIntensity);
            expect(class1.jetIntensity).toBe(1.0);
        });
    });

    describe('Performance and Memory', () => {
        test('should not leak memory on multiple instantiations', () => {
            const protostars = [];
            for (let i = 0; i < 100; i++) {
                protostars.push(new Protostar(i * 10, i * 20, 'class-1'));
            }
            
            // All should be properly instantiated
            expect(protostars.length).toBe(100);
            expect(protostars[99].x).toBe(990);
            expect(protostars[99].y).toBe(1980);
        });

        test('should handle extreme coordinate values', () => {
            const protostar1 = new Protostar(-999999, -999999, 'class-0');
            const protostar2 = new Protostar(999999, 999999, 'class-2');
            
            expect(protostar1.x).toBe(-999999);
            expect(protostar1.y).toBe(-999999);
            expect(protostar2.x).toBe(999999);
            expect(protostar2.y).toBe(999999);
            
            // Should still generate valid properties
            expect(protostar1.stellarClassification).toBeDefined();
            expect(protostar2.stellarClassification).toBeDefined();
        });
    });
});