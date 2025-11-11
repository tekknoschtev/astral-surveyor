// Discovery System Integration Tests
// Tests the complete discovery flow: detection → discovery → audio → visual → logging

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DiscoveryService } from '../../dist/services/DiscoveryService.js';
import { ObjectDiscovery } from '../../dist/services/ObjectDiscovery.js';
import { NamingService } from '../../dist/naming/naming.js';

describe('Discovery System Integration', () => {
    let discoveryService;
    let objectDiscovery;
    let namingService;
    let mockAudioCoordinator;
    let mockDiscoveryDisplay;
    let mockDiscoveryLogbook;
    let mockCamera;

    beforeEach(() => {
        // Set consistent universe seed
        window.UNIVERSE_SEED = 12345;

        // Create mock services
        mockAudioCoordinator = {
            playDiscoverySound: vi.fn()
        };

        mockDiscoveryDisplay = {
            addDiscovery: vi.fn()
        };

        mockDiscoveryLogbook = {
            addDiscovery: vi.fn()
        };

        mockCamera = {
            x: 0,
            y: 0,
            worldToScreen: (worldX, worldY, canvasWidth, canvasHeight) => {
                return [
                    worldX - mockCamera.x + canvasWidth / 2,
                    worldY - mockCamera.y + canvasHeight / 2
                ];
            }
        };

        // Create real services
        namingService = new NamingService();
        discoveryService = new DiscoveryService();
        objectDiscovery = new ObjectDiscovery(
            namingService,
            mockAudioCoordinator,
            mockDiscoveryDisplay,
            mockDiscoveryLogbook
        );
    });

    describe('Discovery Triggers Audio Feedback', () => {
        it('should play correct audio for star discoveries', () => {
            const star = {
                type: 'star',
                x: 100,
                y: 100,
                starTypeName: 'G-Type Star'
            };

            objectDiscovery.processObjectDiscovery(star, mockCamera);

            expect(mockAudioCoordinator.playDiscoverySound).toHaveBeenCalledWith({
                objectType: 'star',
                starType: 'G-Type Star',
                planetType: undefined,
                nebulaType: undefined,
                gardenType: undefined,
                isRare: false
            });
        });

        it('should play rare audio for neutron star discoveries', () => {
            const neutronStar = {
                type: 'star',
                x: 100,
                y: 100,
                starTypeName: 'Neutron Star'
            };

            objectDiscovery.processObjectDiscovery(neutronStar, mockCamera);

            expect(mockAudioCoordinator.playDiscoverySound).toHaveBeenCalledWith(
                expect.objectContaining({
                    objectType: 'star',
                    starType: 'Neutron Star',
                    isRare: true
                })
            );
        });

        it('should play audio for planet discoveries', () => {
            const planet = {
                type: 'planet',
                x: 200,
                y: 200,
                planetTypeName: 'Ocean World'
            };

            objectDiscovery.processObjectDiscovery(planet, mockCamera);

            expect(mockAudioCoordinator.playDiscoverySound).toHaveBeenCalledWith(
                expect.objectContaining({
                    objectType: 'planet',
                    planetType: 'Ocean World'
                })
            );
        });

        it('should play audio for nebula discoveries', () => {
            const nebula = {
                type: 'nebula',
                x: 300,
                y: 300,
                nebulaType: 'emission'
            };

            objectDiscovery.processObjectDiscovery(nebula, mockCamera);

            expect(mockAudioCoordinator.playDiscoverySound).toHaveBeenCalledWith(
                expect.objectContaining({
                    objectType: 'nebula',
                    nebulaType: 'emission'
                })
            );
        });
    });

    describe('Discovery Adds Entry to Log', () => {
        it('should add discovery to display and logbook', () => {
            const star = {
                type: 'star',
                x: 100,
                y: 100,
                starTypeName: 'K-Type Star'
            };

            objectDiscovery.processObjectDiscovery(star, mockCamera);

            expect(mockDiscoveryDisplay.addDiscovery).toHaveBeenCalled();
            expect(mockDiscoveryLogbook.addDiscovery).toHaveBeenCalled();

            const displayCall = mockDiscoveryDisplay.addDiscovery.mock.calls[0];
            const logbookCall = mockDiscoveryLogbook.addDiscovery.mock.calls[0];

            // Both should receive the same name and type
            expect(displayCall[0]).toContain('ASV-'); // Name contains catalog number
            expect(displayCall[1]).toBe('K-Type Star');
            expect(logbookCall[0]).toBe(displayCall[0]);
            expect(logbookCall[1]).toBe(displayCall[1]);
        });

        it('should create discovery entry with correct metadata', () => {
            // Planets need a parentStar for proper naming
            const parentStar = {
                type: 'star',
                x: 100,
                y: 200,
                starTypeName: 'G-Type Star',
                planets: []
            };

            const planet = {
                type: 'planet',
                x: 150,
                y: 250,
                planetTypeName: 'Volcanic World',
                parentStar: parentStar,
                orbitalDistance: 100
            };

            parentStar.planets.push(planet);

            mockCamera.x = 100;
            mockCamera.y = 200;

            const entry = objectDiscovery.processObjectDiscovery(planet, mockCamera);

            expect(entry).toMatchObject({
                name: expect.stringContaining('ASV-'),
                type: 'Volcanic World',
                objectType: 'planet',
                coordinates: { x: 150, y: 250 },
                rarity: 'rare',
                metadata: {
                    planetTypeName: 'Volcanic World',
                    isNotable: true
                }
            });
            expect(entry.id).toMatch(/^discovery_\d+_\d+$/);
            expect(entry.timestamp).toBeGreaterThan(0);
            expect(entry.shareableURL).toContain('150');
        });
    });

    describe('Duplicate Discoveries Prevention', () => {
        it('should not discover already-discovered objects', () => {
            const star = {
                type: 'star',
                x: 100,
                y: 100,
                starTypeName: 'G-Type Star',
                discovered: false
            };

            // First discovery should succeed
            const canDiscover1 = discoveryService.checkDiscovery(
                star,
                mockCamera,
                800,
                600
            );
            expect(canDiscover1).toBe(true);

            // Mark as discovered
            star.discovered = true;

            // Second discovery should fail
            const canDiscover2 = discoveryService.checkDiscovery(
                star,
                mockCamera,
                800,
                600
            );
            expect(canDiscover2).toBe(false);
        });

        it('should track discovery counter correctly', () => {
            const obj1 = { type: 'star', x: 100, y: 100, starTypeName: 'Star 1' };
            const obj2 = { type: 'star', x: 200, y: 200, starTypeName: 'Star 2' };

            expect(objectDiscovery.getDiscoveryCounter()).toBe(0);

            objectDiscovery.processObjectDiscovery(obj1, mockCamera);
            expect(objectDiscovery.getDiscoveryCounter()).toBe(1);

            objectDiscovery.processObjectDiscovery(obj2, mockCamera);
            expect(objectDiscovery.getDiscoveryCounter()).toBe(2);
        });

        it('should restore discovery counter for save/load', () => {
            objectDiscovery.setDiscoveryCounter(42);
            expect(objectDiscovery.getDiscoveryCounter()).toBe(42);

            const entry = objectDiscovery.processObjectDiscovery(
                { type: 'star', x: 100, y: 100 },
                mockCamera
            );

            expect(entry.id).toContain('discovery_43_'); // Counter incremented
        });
    });

    describe('Discovery Distance Thresholds', () => {
        it('should discover stars when visible on screen', () => {
            const star = {
                type: 'star',
                x: 100,
                y: 100,
                radius: 30,
                discovered: false
            };

            mockCamera.x = 0;
            mockCamera.y = 0;

            // Star at (100, 100) should be visible on 800x600 canvas centered at (0, 0)
            const canDiscover = discoveryService.checkDiscovery(
                star,
                mockCamera,
                800,
                600
            );

            expect(canDiscover).toBe(true);
        });

        it('should not discover stars when off-screen', () => {
            const star = {
                type: 'star',
                x: 5000,
                y: 5000,
                radius: 30,
                discovered: false
            };

            mockCamera.x = 0;
            mockCamera.y = 0;

            const canDiscover = discoveryService.checkDiscovery(
                star,
                mockCamera,
                800,
                600
            );

            expect(canDiscover).toBe(false);
        });

        it('should discover planets within distance threshold', () => {
            const planet = {
                type: 'planet',
                x: 30,
                y: 40,
                discoveryDistance: 50, // 50 units
                discovered: false
            };

            mockCamera.x = 0;
            mockCamera.y = 0;

            // Distance is sqrt(30^2 + 40^2) = 50, exactly at threshold
            const canDiscover = discoveryService.checkDiscovery(
                planet,
                mockCamera,
                800,
                600
            );

            expect(canDiscover).toBe(true);
        });

        it('should not discover planets beyond distance threshold', () => {
            const planet = {
                type: 'planet',
                x: 100,
                y: 0,
                discoveryDistance: 50,
                discovered: false
            };

            mockCamera.x = 0;
            mockCamera.y = 0;

            // Distance is 100, beyond threshold of 50
            const canDiscover = discoveryService.checkDiscovery(
                planet,
                mockCamera,
                800,
                600
            );

            expect(canDiscover).toBe(false);
        });

        it('should use default discovery distances when not specified', () => {
            const planet = {
                type: 'planet',
                x: 40,
                y: 30,
                discovered: false
                // No discoveryDistance specified, will use default
            };

            mockCamera.x = 0;
            mockCamera.y = 0;

            // Default planet distance is 50
            const canDiscover = discoveryService.checkDiscovery(
                planet,
                mockCamera,
                800,
                600
            );

            expect(canDiscover).toBe(true);
        });
    });

    describe('Notable Discoveries Special Effects', () => {
        it('should mark neutron stars as notable', () => {
            const neutronStar = {
                type: 'star',
                x: 100,
                y: 100,
                starTypeName: 'Neutron Star'
            };

            const entry = objectDiscovery.processObjectDiscovery(neutronStar, mockCamera);

            expect(entry.rarity).toBe('ultra-rare');
            expect(entry.metadata.isNotable).toBe(true);
            expect(mockAudioCoordinator.playDiscoverySound).toHaveBeenCalledWith(
                expect.objectContaining({ isRare: true })
            );
        });

        it('should mark black holes as notable', () => {
            const blackHole = {
                type: 'blackhole',
                x: 200,
                y: 200,
                blackHoleTypeName: 'Stellar Mass Black Hole'
            };

            const entry = objectDiscovery.processObjectDiscovery(blackHole, mockCamera);

            expect(entry.rarity).toBe('ultra-rare');
            expect(entry.metadata.isNotable).toBe(true);
        });

        it('should mark wormholes as notable', () => {
            const wormhole = {
                type: 'wormhole',
                x: 300,
                y: 300,
                wormholeId: 'WH-1234',
                designation: 'alpha'
            };

            const entry = objectDiscovery.processObjectDiscovery(wormhole, mockCamera);

            expect(entry.rarity).toBe('ultra-rare');
            expect(entry.metadata.isNotable).toBe(true);
        });

        it('should mark moons as notable', () => {
            const moon = {
                type: 'moon',
                x: 400,
                y: 400
            };

            const entry = objectDiscovery.processObjectDiscovery(moon, mockCamera);

            expect(entry.rarity).toBe('uncommon');
            expect(entry.metadata.isNotable).toBe(true); // Moons always notable
        });

        it('should not mark common stars as notable', () => {
            const commonStar = {
                type: 'star',
                x: 100,
                y: 100,
                starTypeName: 'G-Type Star'
            };

            const entry = objectDiscovery.processObjectDiscovery(commonStar, mockCamera);

            expect(entry.rarity).toBe('common');
            expect(entry.metadata.isNotable).toBe(false);
        });
    });

    describe('Detection vs Discovery', () => {
        it('should detect objects at longer range than discovery', () => {
            const planet = {
                type: 'planet',
                x: 150,
                y: 0,
                discoveryDistance: 50,
                detectionDistance: 200,
                discovered: false
            };

            mockCamera.x = 0;
            mockCamera.y = 0;

            // Distance is 150 - too far to discover but close enough to detect
            const canDiscover = discoveryService.checkDiscovery(
                planet,
                mockCamera,
                800,
                600
            );
            const canDetect = discoveryService.checkDetection(planet, mockCamera);

            expect(canDiscover).toBe(false);
            expect(canDetect).toBe(true);
        });

        it('should use appropriate default detection distances', () => {
            expect(discoveryService.getDefaultDetectionDistance('star')).toBe(2500);
            expect(discoveryService.getDefaultDetectionDistance('planet')).toBe(600);
            expect(discoveryService.getDefaultDetectionDistance('nebula')).toBe(800);
            expect(discoveryService.getDefaultDetectionDistance('blackhole')).toBe(900);
        });

        it('should use appropriate default discovery distances', () => {
            // Note: Stars don't use getDefaultDiscoveryDistance in practice - they use screen visibility
            // But the method returns 0 to indicate screen-based discovery
            const starDistance = discoveryService.getDefaultDiscoveryDistance('star');
            const planetDistance = discoveryService.getDefaultDiscoveryDistance('planet');
            const moonDistance = discoveryService.getDefaultDiscoveryDistance('moon');
            const blackholeDistance = discoveryService.getDefaultDiscoveryDistance('blackhole');

            // Stars use screen-based discovery (distance 0 means not distance-based)
            expect(starDistance).toBe(0);
            expect(planetDistance).toBe(50);
            expect(moonDistance).toBe(35);
            expect(blackholeDistance).toBe(100);
        });
    });

    describe('Rarity Classification', () => {
        const testCases = [
            { type: 'star', starTypeName: 'Neutron Star', expected: 'ultra-rare' },
            { type: 'star', starTypeName: 'White Dwarf', expected: 'rare' },
            { type: 'star', starTypeName: 'G-Type Star', expected: 'common' },
            { type: 'planet', planetTypeName: 'Exotic World', expected: 'ultra-rare' },
            { type: 'planet', planetTypeName: 'Volcanic World', expected: 'rare' },
            { type: 'planet', planetTypeName: 'Rocky World', expected: 'common' },
            { type: 'blackhole', expected: 'ultra-rare' },
            { type: 'wormhole', expected: 'ultra-rare' },
            { type: 'nebula', expected: 'rare' },
            { type: 'moon', expected: 'uncommon' }
        ];

        testCases.forEach(({ type, starTypeName, planetTypeName, expected }) => {
            it(`should classify ${type}${starTypeName ? ` (${starTypeName})` : ''}${planetTypeName ? ` (${planetTypeName})` : ''} as ${expected}`, () => {
                const obj = { type, x: 100, y: 100, starTypeName, planetTypeName };
                const entry = objectDiscovery.processObjectDiscovery(obj, mockCamera);
                expect(entry.rarity).toBe(expected);
            });
        });
    });
});
