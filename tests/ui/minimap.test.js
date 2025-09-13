// Tests for LocalMinimap - local area object detection and visualization
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { LocalMinimap } from '../../dist/ui/minimap.js';

describe('LocalMinimap', () => {
    let mockChunkManager;
    let mockDiscoveryService;
    let mockCamera;
    let mockRenderer;
    
    beforeEach(() => {
        // Mock ChunkManager
        mockChunkManager = {
            chunkSize: 1000,
            getChunkCoords: (x, y) => ({ x: Math.floor(x / 1000), y: Math.floor(y / 1000) }),
            getChunkKey: (chunkX, chunkY) => `${chunkX},${chunkY}`,
            ensureChunkExists: () => {},
            getChunk: (key) => {
                // Return mock chunk data
                return {
                    x: 0, y: 0,
                    stars: [],
                    celestialStars: [
                        { x: 100, y: 200, discovered: false, starTypeName: 'Main Sequence' },
                        { x: 300, y: 400, discovered: true, starTypeName: 'Red Giant' }
                    ],
                    planets: [
                        { x: 150, y: 250, discovered: false, planetTypeName: 'Rocky World' },
                        { x: 350, y: 450, discovered: true, planetTypeName: 'Volcanic World' }
                    ],
                    moons: [
                        { x: 160, y: 260, discovered: false }
                    ],
                    nebulae: [
                        { x: 500, y: 600, discovered: false, nebulaType: 'Emission' }
                    ],
                    asteroidGardens: [
                        { x: 700, y: 800, discovered: false, gardenType: 'metallic' }
                    ],
                    wormholes: [],
                    blackholes: [
                        { x: 900, y: 1000, discovered: false, blackHoleTypeName: 'Stellar' }
                    ],
                    comets: [],
                    roguePlanets: [],
                    darkNebulae: [],
                    crystalGardens: [],
                    protostars: []
                };
            }
        };
        
        // Mock DiscoveryService
        mockDiscoveryService = {
            getDefaultDetectionDistance: () => 500,
            getDefaultDiscoveryDistance: () => 50
        };
        
        // Mock Camera
        mockCamera = {
            x: 500,
            y: 500,
            rotation: Math.PI / 4 // 45 degrees
        };
        
        // Mock Renderer
        mockRenderer = {
            canvas: { width: 800, height: 600 },
            ctx: {
                save: () => {},
                restore: () => {},
                fillStyle: '',
                strokeStyle: '',
                lineWidth: 0,
                globalAlpha: 1,
                fillRect: () => {},
                strokeRect: () => {},
                beginPath: () => {},
                moveTo: () => {},
                lineTo: () => {},
                arc: () => {},
                closePath: () => {},
                fill: () => {},
                stroke: () => {},
                translate: () => {},
                rotate: () => {},
                measureText: () => ({ width: 50 }),
                fillText: () => {}
            }
        };
    });

    describe('Construction and Basic Properties', () => {
        test('creates minimap with default configuration', () => {
            const minimap = new LocalMinimap();
            
            expect(minimap.isVisible()).toBe(true);
        });
        
        test('creates minimap with chunk manager and discovery service', () => {
            const minimap = new LocalMinimap(mockChunkManager, mockDiscoveryService);
            
            expect(minimap.isVisible()).toBe(true);
        });
    });

    describe('Visibility Toggle', () => {
        test('toggles visibility correctly', () => {
            const minimap = new LocalMinimap();
            
            expect(minimap.isVisible()).toBe(true);
            
            minimap.toggle();
            expect(minimap.isVisible()).toBe(false);
            
            minimap.toggle();
            expect(minimap.isVisible()).toBe(true);
        });
    });

    describe('Service Configuration', () => {
        test('sets chunk manager after construction', () => {
            const minimap = new LocalMinimap();
            minimap.setChunkManager(mockChunkManager);
            
            // Should not throw when rendering (implicitly tests chunk manager is set)
            expect(() => minimap.render(mockRenderer, mockCamera)).not.toThrow();
        });
        
        test('sets discovery service after construction', () => {
            const minimap = new LocalMinimap();
            minimap.setDiscoveryService(mockDiscoveryService);
            
            // Should not throw when rendering (implicitly tests service is set)
            expect(() => minimap.render(mockRenderer, mockCamera)).not.toThrow();
        });
    });

    describe('Bounds Calculation', () => {
        test('calculates minimap bounds correctly', () => {
            const minimap = new LocalMinimap();
            const bounds = minimap.getBounds(800, 600);
            
            expect(bounds).toEqual({
                x: 15, // padding
                y: 55, // padding + topOffset (40)
                width: 150,
                height: 150
            });
        });
    });

    describe('Object Detection and Processing', () => {
        test('detects objects in nearby chunks', () => {
            const minimap = new LocalMinimap(mockChunkManager, mockDiscoveryService);
            
            // Test that rendering completes without error (implicitly tests object detection)
            expect(() => minimap.render(mockRenderer, mockCamera)).not.toThrow();
            
            // Test that chunk methods are called (indicating object detection is working)
            const chunkSpy = vi.spyOn(mockChunkManager, 'ensureChunkExists');
            minimap.render(mockRenderer, mockCamera);
            
            expect(chunkSpy).toHaveBeenCalled();
            chunkSpy.mockRestore();
        });
        
        test('handles missing chunk manager gracefully', () => {
            const minimap = new LocalMinimap();
            
            expect(() => minimap.render(mockRenderer, mockCamera)).not.toThrow();
        });
    });

    describe('Rarity Determination', () => {
        // We can't directly test the private method, but we can test it indirectly
        test('processes different object types', () => {
            const minimap = new LocalMinimap(mockChunkManager, mockDiscoveryService);
            
            // Render should process all object types without error
            expect(() => minimap.render(mockRenderer, mockCamera)).not.toThrow();
        });
    });

    describe('Rendering', () => {
        test('renders when visible', () => {
            const minimap = new LocalMinimap(mockChunkManager, mockDiscoveryService);
            
            const ctxSpy = vi.spyOn(mockRenderer.ctx, 'save');
            
            minimap.render(mockRenderer, mockCamera);
            
            expect(ctxSpy).toHaveBeenCalled();
            
            ctxSpy.mockRestore();
        });
        
        test('does not render when hidden', () => {
            const minimap = new LocalMinimap(mockChunkManager, mockDiscoveryService);
            minimap.toggle(); // Hide it
            
            const ctxSpy = vi.spyOn(mockRenderer.ctx, 'save');
            
            minimap.render(mockRenderer, mockCamera);
            
            expect(ctxSpy).not.toHaveBeenCalled();
            
            ctxSpy.mockRestore();
        });
        
        test('renders player arrow with correct rotation', () => {
            const minimap = new LocalMinimap(mockChunkManager, mockDiscoveryService);
            
            const rotateSpy = vi.spyOn(mockRenderer.ctx, 'rotate');
            
            minimap.render(mockRenderer, mockCamera);
            
            expect(rotateSpy).toHaveBeenCalledWith(mockCamera.rotation);
            
            rotateSpy.mockRestore();
        });
    });

    describe('Update Method', () => {
        test('update method runs without error', () => {
            const minimap = new LocalMinimap(mockChunkManager, mockDiscoveryService);
            
            expect(() => minimap.update(16.67)).not.toThrow(); // 60 FPS delta
        });
    });

    describe('World to Minimap Coordinate Conversion', () => {
        test('coordinate conversion works with chunk-based scaling', () => {
            const minimap = new LocalMinimap(mockChunkManager, mockDiscoveryService);
            
            // Test rendering objects at various positions
            // (Indirectly tests worldToMinimap through object rendering)
            expect(() => minimap.render(mockRenderer, mockCamera)).not.toThrow();
        });
    });

    describe('Chunk Management Integration', () => {
        test('queries multiple chunks around player', () => {
            const chunkSpy = vi.spyOn(mockChunkManager, 'ensureChunkExists');
            
            const minimap = new LocalMinimap(mockChunkManager, mockDiscoveryService);
            minimap.render(mockRenderer, mockCamera);
            
            // Should call ensureChunkExists for chunks in 2-chunk radius
            // Camera at (500,500) with chunkSize 1000 means chunk (0,0)
            // 2-chunk radius means chunks from (-2,-2) to (2,2) = 25 chunks
            expect(chunkSpy).toHaveBeenCalledTimes(25);
            
            chunkSpy.mockRestore();
        });
        
        test('handles chunk data correctly', () => {
            const getChunkSpy = vi.spyOn(mockChunkManager, 'getChunk');
            
            const minimap = new LocalMinimap(mockChunkManager, mockDiscoveryService);
            minimap.render(mockRenderer, mockCamera);
            
            expect(getChunkSpy).toHaveBeenCalled();
            
            getChunkSpy.mockRestore();
        });
    });

    describe('Error Handling', () => {
        test('handles null chunk gracefully', () => {
            const faultyChunkManager = {
                ...mockChunkManager,
                getChunk: () => null
            };
            
            const minimap = new LocalMinimap(faultyChunkManager, mockDiscoveryService);
            
            expect(() => minimap.render(mockRenderer, mockCamera)).not.toThrow();
        });
        
        test('handles missing object arrays gracefully', () => {
            const emptyChunkManager = {
                ...mockChunkManager,
                getChunk: () => ({
                    x: 0, y: 0,
                    // Missing most object arrays
                    celestialStars: null,
                    planets: undefined
                })
            };
            
            const minimap = new LocalMinimap(emptyChunkManager, mockDiscoveryService);
            
            expect(() => minimap.render(mockRenderer, mockCamera)).not.toThrow();
        });
    });
});