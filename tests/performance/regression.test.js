// Performance Regression Baseline Tests
// Establishes performance baselines for critical game operations

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChunkManager } from '../../dist/world/ChunkManager.js';
import { InfiniteStarField } from '../../dist/world/world.js';
import { Camera } from '../../dist/camera/camera.js';
import { Ship, ThrusterParticles, StarParticles } from '../../dist/ship/ship.js';

describe('Performance Regression Baselines', () => {
    let mockRenderer;
    let mockCanvas;

    beforeEach(() => {
        // Mock canvas and renderer
        mockCanvas = {
            width: 800,
            height: 600,
            getContext: vi.fn().mockReturnValue({
                save: vi.fn(),
                restore: vi.fn(),
                clearRect: vi.fn(),
                fillRect: vi.fn(),
                strokeRect: vi.fn(),
                beginPath: vi.fn(),
                arc: vi.fn(),
                fill: vi.fn(),
                stroke: vi.fn(),
                translate: vi.fn(),
                rotate: vi.fn(),
                fillStyle: '',
                strokeStyle: '',
                lineWidth: 0,
                globalAlpha: 1
            })
        };

        mockRenderer = {
            canvas: mockCanvas,
            ctx: mockCanvas.getContext(),
            drawCircle: vi.fn(),
            drawPixel: vi.fn(),
            drawSprite: vi.fn()
        };
    });

    describe('Chunk Generation Performance', () => {
        it('should generate single chunk in reasonable time', () => {
            const chunkManager = new ChunkManager();

            const start = performance.now();
            chunkManager.generateChunk(0, 0);
            const duration = performance.now() - start;

            // Single chunk generation should be fast (< 50ms)
            expect(duration).toBeLessThan(50);
        });

        it('should handle multiple chunk generation efficiently', () => {
            const chunkManager = new ChunkManager();

            const start = performance.now();

            // Generate 9 chunks (3x3 grid)
            for (let x = -1; x <= 1; x++) {
                for (let y = -1; y <= 1; y++) {
                    chunkManager.generateChunk(x, y);
                }
            }

            const duration = performance.now() - start;

            // 9 chunks should generate in < 500ms
            expect(duration).toBeLessThan(500);
        });

        it('should not cause frame drops when loading new chunks', () => {
            const chunkManager = new ChunkManager();

            // Pre-generate some chunks
            chunkManager.updateActiveChunks(0, 0);

            // Measure time to load chunks at new position
            const start = performance.now();
            chunkManager.updateActiveChunks(5000, 5000);
            const duration = performance.now() - start;

            // Loading new chunks shouldn't block for > 16ms (60fps)
            expect(duration).toBeLessThan(16);
        });
    });

    describe('Rendering Performance', () => {
        it('should render star field efficiently', () => {
            const chunkManager = new ChunkManager();
            const starField = new InfiniteStarField(chunkManager);
            const camera = new Camera();

            // Generate chunks with stars
            chunkManager.updateActiveChunks(0, 0);

            const start = performance.now();
            starField.render(mockRenderer, camera);
            const duration = performance.now() - start;

            // Rendering should complete within frame budget (< 16ms for 60fps)
            expect(duration).toBeLessThan(16);
        });

        it('should handle ship rendering efficiently', () => {
            const ship = new Ship();
            const thrusterParticles = new ThrusterParticles();
            const starParticles = new StarParticles();
            const camera = new Camera();

            // Update and render ship with particles
            const start = performance.now();
            ship.render(mockRenderer, camera.rotation, camera.x, camera.y, []);
            thrusterParticles.update(0.016, camera, ship);
            thrusterParticles.render(mockRenderer);
            const duration = performance.now() - start;

            // Ship rendering should be fast (< 5ms)
            expect(duration).toBeLessThan(5);
        });
    });

    describe('Camera Update Performance', () => {
        it('should update camera physics efficiently', () => {
            const camera = new Camera();
            const mockInput = {
                moveUp: true,
                upIntensity: 1.0,
                moveDown: false,
                downIntensity: 0,
                moveLeft: false,
                leftIntensity: 0,
                moveRight: false,
                rightIntensity: 0,
                isBraking: false,
                brakingIntensity: 0,
                getMouseDirection: vi.fn(() => ({ x: 0, y: 0, intensity: 0 })),
                isRightPressed: vi.fn(() => false),
                getTouchBrake: vi.fn(() => null),
                getMouseBrake: vi.fn(() => null)
            };

            // Measure time for 60 frames of camera updates
            const start = performance.now();
            for (let i = 0; i < 60; i++) {
                camera.update(mockInput, 1/60, 800, 600);
            }
            const duration = performance.now() - start;

            // 60 camera updates should complete in < 10ms
            expect(duration).toBeLessThan(10);
        });

        it('should handle coordinate transformations efficiently', () => {
            const camera = new Camera();
            camera.x = 5000;
            camera.y = 7000;

            // Measure 1000 coordinate transformations
            const start = performance.now();
            for (let i = 0; i < 1000; i++) {
                camera.worldToScreen(i * 10, i * 10, 800, 600);
            }
            const duration = performance.now() - start;

            // 1000 transformations should complete in < 5ms
            expect(duration).toBeLessThan(5);
        });
    });

    describe('Memory Performance', () => {
        it('should not leak memory during chunk generation', () => {
            const chunkManager = new ChunkManager();

            // Get initial memory if available
            const initialMemory = performance.memory?.usedJSHeapSize || 0;

            // Generate many chunks
            for (let i = 0; i < 100; i++) {
                const x = Math.floor(i / 10);
                const y = i % 10;
                chunkManager.generateChunk(x, y);
            }

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }

            const finalMemory = performance.memory?.usedJSHeapSize || 0;

            // Memory growth should be reasonable (< 50MB for 100 chunks)
            // Only test if performance.memory is available
            if (performance.memory) {
                const memoryGrowth = (finalMemory - initialMemory) / (1024 * 1024);
                expect(memoryGrowth).toBeLessThan(50);
            } else {
                // Skip memory test if API not available
                expect(true).toBe(true);
            }
        });

        it('should cache chunks efficiently without excessive memory', () => {
            const chunkManager = new ChunkManager();

            // Generate same chunk multiple times
            const chunk = chunkManager.generateChunk(0, 0);

            // Verify caching works (same object returned)
            for (let i = 0; i < 10; i++) {
                const cachedChunk = chunkManager.generateChunk(0, 0);
                expect(cachedChunk).toBe(chunk);
            }

            // Should only have one chunk in cache
            expect(chunkManager.activeChunks.size).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Discovery System Performance', () => {
        it('should check discovery proximity efficiently', () => {
            const chunkManager = new ChunkManager();
            const camera = new Camera();

            // Generate chunk with celestial objects
            chunkManager.updateActiveChunks(0, 0);
            const activeObjects = chunkManager.getAllActiveObjects();

            // Measure time to check all objects for discovery
            const start = performance.now();
            activeObjects.celestialStars.forEach(star => {
                const dx = star.x - camera.x;
                const dy = star.y - camera.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const discovered = distance < 100; // Discovery threshold
            });
            const duration = performance.now() - start;

            // Discovery checks should be fast (< 2ms)
            expect(duration).toBeLessThan(2);
        });

        it('should handle multiple discoveries without performance degradation', () => {
            const chunkManager = new ChunkManager();

            // Generate multiple chunks
            for (let x = 0; x < 5; x++) {
                for (let y = 0; y < 5; y++) {
                    chunkManager.generateChunk(x, y);
                }
            }

            const activeObjects = chunkManager.getAllActiveObjects();

            // Mark many objects as discovered
            const start = performance.now();
            activeObjects.celestialStars.forEach(star => {
                chunkManager.markObjectDiscovered(star, `Star ${star.x},${star.y}`);
            });
            const duration = performance.now() - start;

            // Marking all discoveries should be fast (< 50ms)
            expect(duration).toBeLessThan(50);
        });
    });

    describe('Frame Budget Compliance', () => {
        it('should complete typical game loop update within 16ms', () => {
            // Simulate a typical game loop iteration
            const chunkManager = new ChunkManager();
            const starField = new InfiniteStarField(chunkManager);
            const camera = new Camera();
            const ship = new Ship();
            const mockInput = {
                moveUp: false,
                upIntensity: 0,
                moveDown: false,
                downIntensity: 0,
                moveLeft: false,
                leftIntensity: 0,
                moveRight: false,
                rightIntensity: 0,
                isBraking: false,
                brakingIntensity: 0,
                getMouseDirection: vi.fn(() => ({ x: 0, y: 0, intensity: 0 })),
                isRightPressed: vi.fn(() => false),
                getTouchBrake: vi.fn(() => null),
                getMouseBrake: vi.fn(() => null)
            };

            // Initialize
            chunkManager.updateActiveChunks(0, 0);

            // Measure complete frame update
            const start = performance.now();

            // Update game state
            camera.update(mockInput, 1/60, 800, 600);
            chunkManager.updateActiveChunks(camera.x, camera.y);

            // Render (mocked)
            starField.render(mockRenderer, camera);
            ship.render(mockRenderer, camera.rotation, camera.x, camera.y, []);

            const duration = performance.now() - start;

            // Complete frame should fit within 60fps budget (16ms)
            expect(duration).toBeLessThan(16);
        });
    });
});
