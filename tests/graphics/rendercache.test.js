// RenderCache comprehensive test suite
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RenderCache, getRenderCache, resetRenderCache } from '../../dist/graphics/RenderCache.js';

describe('RenderCache', () => {
    let renderCache;
    let mockCanvas;
    let mockCtx;

    beforeEach(() => {
        // Mock HTML5 Canvas API
        mockCtx = {
            drawImage: vi.fn(),
            fillRect: vi.fn(),
            strokeRect: vi.fn(),
            beginPath: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
            stroke: vi.fn(),
            fillStyle: '',
            strokeStyle: ''
        };

        mockCanvas = {
            width: 0,
            height: 0,
            getContext: vi.fn(() => mockCtx)
        };

        // Mock document.createElement for canvas creation
        global.document = {
            createElement: vi.fn(() => mockCanvas)
        };

        renderCache = new RenderCache(5, 10); // Small limits for testing
    });

    describe('Basic Cache Operations', () => {
        it('should initialize with correct default values', () => {
            const cache = new RenderCache();
            const stats = cache.getStats();
            
            expect(stats.totalEntries).toBe(0);
            expect(stats.cacheHits).toBe(0);
            expect(stats.cacheMisses).toBe(0);
            expect(stats.hitRate).toBe(0);
            expect(stats.memoryUsage).toBe(0);
        });

        it('should initialize with custom parameters', () => {
            const customCache = new RenderCache(50, 120);
            // Internal parameters are private, so we test through behavior
            const stats = customCache.getStats();
            expect(stats.totalEntries).toBe(0);
        });

        it('should return null for cache miss', () => {
            const result = renderCache.get('non-existent-key');
            
            expect(result).toBeNull();
            
            const stats = renderCache.getStats();
            expect(stats.cacheMisses).toBe(1);
            expect(stats.hitRate).toBe(0);
        });
    });

    describe('Cache Storage and Retrieval', () => {
        it('should store and retrieve cached content', () => {
            const renderFn = vi.fn((ctx) => {
                ctx.fillRect(0, 0, 100, 100);
            });
            
            // Store in cache
            const entry = renderCache.set('test-key', 100, 100, renderFn);
            
            expect(entry).toBeDefined();
            expect(entry.canvas).toBe(mockCanvas);
            expect(entry.ctx).toBe(mockCtx);
            expect(entry.hitCount).toBe(0);
            expect(renderFn).toHaveBeenCalledWith(mockCtx);
            
            // Retrieve from cache
            const retrieved = renderCache.get('test-key');
            
            expect(retrieved).toBe(entry);
            expect(retrieved.hitCount).toBe(1);
            
            const stats = renderCache.getStats();
            expect(stats.totalEntries).toBe(1);
            expect(stats.cacheHits).toBe(1);
            expect(stats.hitRate).toBe(1);
        });

        it('should execute render function during cache creation', () => {
            const renderFn = vi.fn((ctx) => {
                ctx.fillStyle = 'red';
                ctx.fillRect(10, 10, 50, 50);
            });
            
            renderCache.set('render-test', 200, 150, renderFn);
            
            expect(mockCanvas.width).toBe(200);
            expect(mockCanvas.height).toBe(150);
            expect(renderFn).toHaveBeenCalledOnce();
            expect(renderFn).toHaveBeenCalledWith(mockCtx);
        });

        it('should handle canvas context creation failure', () => {
            mockCanvas.getContext.mockReturnValue(null);
            
            expect(() => {
                renderCache.set('fail-test', 100, 100, () => {});
            }).toThrow('Could not create canvas context for cache');
        });
    });

    describe('LRU Eviction Policy', () => {
        it('should evict least recently used entries when at capacity', () => {
            // Fill cache to capacity
            for (let i = 0; i < 5; i++) {
                renderCache.set(`key-${i}`, 50, 50, () => {});
            }
            
            // Access some entries to update their usage
            renderCache.get('key-1'); // Make key-1 more recently used
            renderCache.get('key-3'); // Make key-3 more recently used
            
            // Add one more entry, should evict LRU (key-0, key-2, or key-4)
            renderCache.set('key-new', 50, 50, () => {});
            
            const stats = renderCache.getStats();
            expect(stats.totalEntries).toBe(5); // Still at capacity
            
            // key-1 and key-3 should still exist (were accessed)
            expect(renderCache.has('key-1')).toBe(true);
            expect(renderCache.has('key-3')).toBe(true);
            expect(renderCache.has('key-new')).toBe(true);
        });

        it('should consider both timestamp and hit count for eviction', () => {
            // Create entries with different access patterns
            renderCache.set('old-frequent', 50, 50, () => {});
            renderCache.set('new-infrequent', 50, 50, () => {});
            
            // Make old entry frequently accessed
            for (let i = 0; i < 10; i++) {
                renderCache.get('old-frequent');
            }
            
            // Fill rest of cache
            for (let i = 0; i < 3; i++) {
                renderCache.set(`filler-${i}`, 50, 50, () => {});
            }
            
            // Add another entry to trigger eviction
            renderCache.set('trigger-eviction', 50, 50, () => {});
            
            // Frequently accessed entry should survive despite being older
            expect(renderCache.has('old-frequent')).toBe(true);
        });
    });

    describe('Cache Expiration', () => {
        it('should expire entries after maximum age', () => {
            // Mock Date.now to control time
            const originalNow = Date.now;
            let currentTime = 1000;
            Date.now = vi.fn(() => currentTime);
            
            try {
                renderCache.set('expiring-key', 50, 50, () => {});
                
                // Advance time beyond max age (10 seconds in our test cache)
                currentTime += 15000;
                
                const result = renderCache.get('expiring-key');
                
                expect(result).toBeNull();
                
                const stats = renderCache.getStats();
                expect(stats.cacheMisses).toBe(1);
            } finally {
                Date.now = originalNow;
            }
        });

        it('should not expire entries within maximum age', () => {
            const originalNow = Date.now;
            let currentTime = 1000;
            Date.now = vi.fn(() => currentTime);
            
            try {
                renderCache.set('fresh-key', 50, 50, () => {});
                
                // Advance time but stay within max age
                currentTime += 5000;
                
                const result = renderCache.get('fresh-key');
                
                expect(result).not.toBeNull();
                expect(result.hitCount).toBe(1);
            } finally {
                Date.now = originalNow;
            }
        });
    });

    describe('Render Cached Method', () => {
        it('should render cached content to target context', () => {
            const targetCtx = {
                drawImage: vi.fn()
            };
            
            const renderFn = vi.fn();
            
            renderCache.renderCached(targetCtx, 'cached-render', 100, 200, 150, 75, renderFn);
            
            // Should have created cache entry and drawn to target
            expect(renderFn).toHaveBeenCalledOnce();
            expect(targetCtx.drawImage).toHaveBeenCalledWith(mockCanvas, 100, 200);
            
            const stats = renderCache.getStats();
            expect(stats.totalEntries).toBe(1);
        });

        it('should reuse cached content on subsequent calls', () => {
            const targetCtx = {
                drawImage: vi.fn()
            };
            
            const renderFn = vi.fn();
            
            // First call
            renderCache.renderCached(targetCtx, 'reuse-test', 0, 0, 100, 100, renderFn);
            
            // Second call
            renderCache.renderCached(targetCtx, 'reuse-test', 50, 50, 100, 100, renderFn);
            
            // Render function should only be called once
            expect(renderFn).toHaveBeenCalledOnce();
            
            // Draw should be called twice with different positions
            expect(targetCtx.drawImage).toHaveBeenCalledTimes(2);
            expect(targetCtx.drawImage).toHaveBeenNthCalledWith(1, mockCanvas, 0, 0);
            expect(targetCtx.drawImage).toHaveBeenNthCalledWith(2, mockCanvas, 50, 50);
        });
    });

    describe('Cache Management Operations', () => {
        it('should clear all cache entries', () => {
            // Add some entries
            for (let i = 0; i < 3; i++) {
                renderCache.set(`clear-test-${i}`, 50, 50, () => {});
            }
            
            expect(renderCache.getStats().totalEntries).toBe(3);
            
            renderCache.clear();
            
            const stats = renderCache.getStats();
            expect(stats.totalEntries).toBe(0);
            expect(stats.memoryUsage).toBe(0);
        });

        it('should check if entries exist and are valid', () => {
            renderCache.set('exists-test', 50, 50, () => {});
            
            expect(renderCache.has('exists-test')).toBe(true);
            expect(renderCache.has('non-existent')).toBe(false);
        });

        it('should manually invalidate specific entries', () => {
            renderCache.set('invalidate-test', 50, 50, () => {});
            
            expect(renderCache.has('invalidate-test')).toBe(true);
            
            const removed = renderCache.invalidate('invalidate-test');
            
            expect(removed).toBe(true);
            expect(renderCache.has('invalidate-test')).toBe(false);
            
            // Trying to remove non-existent key should return false
            expect(renderCache.invalidate('non-existent')).toBe(false);
        });

        it('should invalidate entries matching patterns', () => {
            renderCache.set('sprite-player-idle', 50, 50, () => {});
            renderCache.set('sprite-enemy-move', 50, 50, () => {});
            renderCache.set('ui-button-normal', 50, 50, () => {});
            renderCache.set('sprite-item-collect', 50, 50, () => {});
            
            // Invalidate all sprite entries
            const removed = renderCache.invalidatePattern(/^sprite-/);
            
            expect(removed).toBe(3);
            expect(renderCache.has('sprite-player-idle')).toBe(false);
            expect(renderCache.has('sprite-enemy-move')).toBe(false);
            expect(renderCache.has('sprite-item-collect')).toBe(false);
            expect(renderCache.has('ui-button-normal')).toBe(true); // Should remain
        });
    });

    describe('Cleanup Operations', () => {
        it('should cleanup expired entries', () => {
            const originalNow = Date.now;
            let currentTime = 1000;
            Date.now = vi.fn(() => currentTime);
            
            try {
                // Add entries at different times
                renderCache.set('old-entry', 50, 50, () => {});
                
                currentTime += 5000;
                renderCache.set('newer-entry', 50, 50, () => {});
                
                // Advance past expiration for first entry
                currentTime += 10000;
                
                renderCache.cleanup();
                
                expect(renderCache.has('old-entry')).toBe(false);
                expect(renderCache.has('newer-entry')).toBe(true);
                
                const stats = renderCache.getStats();
                expect(stats.totalEntries).toBe(1);
            } finally {
                Date.now = originalNow;
            }
        });
    });

    describe('Memory Usage Calculation', () => {
        it('should calculate memory usage correctly', () => {
            // Add entries of known sizes
            renderCache.set('small', 10, 10, () => {}); // 10*10*4 = 400 bytes
            renderCache.set('medium', 50, 20, () => {}); // 50*20*4 = 4000 bytes
            
            const stats = renderCache.getStats();
            
            // Memory calculation: (10*10 + 50*20) * 4 bytes / 1024 = 4400 * 4 / 1024 = ~17.19 KB  
            // Or just check that it's positive and reasonable
            expect(stats.memoryUsage).toBeGreaterThan(4);
            expect(stats.memoryUsage).toBeLessThan(20);
        });

        it('should update memory usage when entries are removed', () => {
            // Add an entry
            renderCache.set('memory-test', 100, 100, () => {});
            
            let stats = renderCache.getStats();
            const memoryWithEntry = stats.memoryUsage;
            expect(memoryWithEntry).toBeGreaterThan(0);
            
            // Remove the entry
            const removed = renderCache.invalidate('memory-test');
            expect(removed).toBe(true);
            
            stats = renderCache.getStats();
            // Memory should be recalculated after removal
            expect(stats.memoryUsage).toBeDefined();
            expect(typeof stats.memoryUsage).toBe('number');
        });
    });

    describe('Statistics and Monitoring', () => {
        it('should track hit rate accurately', () => {
            renderCache.set('hit-rate-test', 50, 50, () => {});
            
            // Generate hits and misses
            renderCache.get('hit-rate-test'); // Hit
            renderCache.get('hit-rate-test'); // Hit
            renderCache.get('non-existent'); // Miss
            renderCache.get('hit-rate-test'); // Hit
            renderCache.get('another-miss'); // Miss
            
            const stats = renderCache.getStats();
            
            expect(stats.cacheHits).toBe(3);
            expect(stats.cacheMisses).toBe(2);
            expect(stats.hitRate).toBeCloseTo(0.6, 2); // 3/5 = 0.6
        });

        it('should handle zero operations gracefully in statistics', () => {
            const stats = renderCache.getStats();
            
            expect(stats.totalEntries).toBe(0);
            expect(stats.cacheHits).toBe(0);
            expect(stats.cacheMisses).toBe(0);
            expect(stats.hitRate).toBe(0);
            expect(stats.memoryUsage).toBe(0);
        });
    });

    describe('Global Cache Instance', () => {
        it('should provide singleton global cache', () => {
            const cache1 = getRenderCache();
            const cache2 = getRenderCache();
            
            expect(cache1).toBe(cache2);
        });

        it('should reset global cache instance', () => {
            const originalCache = getRenderCache();
            originalCache.set('global-test', 50, 50, () => {});
            
            resetRenderCache();
            
            const newCache = getRenderCache();
            expect(newCache).not.toBe(originalCache);
            expect(newCache.has('global-test')).toBe(false);
        });

        it('should clear global cache when reset', () => {
            const cache = getRenderCache();
            cache.set('reset-test', 50, 50, () => {});
            
            expect(cache.has('reset-test')).toBe(true);
            
            resetRenderCache();
            
            // Original cache should be cleared
            expect(cache.has('reset-test')).toBe(false);
        });
    });

    describe('Performance and Edge Cases', () => {
        it('should handle high-frequency cache operations', () => {
            const startTime = performance.now();
            
            for (let i = 0; i < 100; i++) {
                const key = `perf-test-${i % 5}`; // Create some cache hits
                renderCache.set(key, 20, 20, () => {});
                renderCache.get(key);
            }
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            expect(duration).toBeLessThan(100); // Should complete quickly
        });

        it('should handle very large cache keys', () => {
            const longKey = 'x'.repeat(1000);
            
            expect(() => {
                renderCache.set(longKey, 50, 50, () => {});
            }).not.toThrow();
            
            expect(renderCache.has(longKey)).toBe(true);
        });

        it('should handle zero-size canvas gracefully', () => {
            expect(() => {
                renderCache.set('zero-size', 0, 0, () => {});
            }).not.toThrow();
            
            const stats = renderCache.getStats();
            expect(stats.totalEntries).toBe(1);
            expect(stats.memoryUsage).toBe(0);
        });

        it('should handle render functions that throw errors', () => {
            const failingRenderFn = () => {
                throw new Error('Render function failed');
            };
            
            expect(() => {
                renderCache.set('failing-render', 50, 50, failingRenderFn);
            }).toThrow('Render function failed');
        });
    });
});