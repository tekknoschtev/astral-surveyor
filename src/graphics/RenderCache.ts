// RenderCache - Caches rendered sprites and graphics for better performance
// Reduces CPU overhead for frequently rendered static objects

export interface CacheEntry {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    timestamp: number;
    hitCount: number;
}

export interface RenderCacheStats {
    totalEntries: number;
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
    memoryUsage: number; // Estimated in KB
}

/**
 * Simple LRU cache for rendered graphics to improve performance
 */
export class RenderCache {
    private cache = new Map<string, CacheEntry>();
    private maxEntries: number;
    private maxAge: number; // milliseconds
    private stats: RenderCacheStats;

    constructor(maxEntries = 100, maxAgeSeconds = 30) {
        this.maxEntries = maxEntries;
        this.maxAge = maxAgeSeconds * 1000;
        this.stats = {
            totalEntries: 0,
            cacheHits: 0,
            cacheMisses: 0,
            hitRate: 0,
            memoryUsage: 0
        };
    }

    /**
     * Get cached render or return null if not found/expired
     */
    get(key: string): CacheEntry | null {
        const entry = this.cache.get(key);
        
        if (!entry) {
            this.stats.cacheMisses++;
            this.updateHitRate();
            return null;
        }

        // Check if entry is expired
        const age = Date.now() - entry.timestamp;
        if (age > this.maxAge) {
            this.cache.delete(key);
            this.stats.cacheMisses++;
            this.updateHitRate();
            return null;
        }

        // Update hit count and statistics
        entry.hitCount++;
        this.stats.cacheHits++;
        this.updateHitRate();
        
        return entry;
    }

    /**
     * Store rendered content in cache
     */
    set(key: string, width: number, height: number, renderFn: (ctx: CanvasRenderingContext2D) => void): CacheEntry {
        // Clean up if at max capacity
        if (this.cache.size >= this.maxEntries) {
            this.evictLRU();
        }

        // Create offscreen canvas for caching
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
            throw new Error('Could not create canvas context for cache');
        }

        // Render content to cache
        renderFn(ctx);

        const entry: CacheEntry = {
            canvas,
            ctx,
            timestamp: Date.now(),
            hitCount: 0
        };

        this.cache.set(key, entry);
        this.stats.totalEntries = this.cache.size;
        this.updateMemoryUsage();

        return entry;
    }

    /**
     * Render cached content to target context, or create cache entry if missing
     */
    renderCached(
        targetCtx: CanvasRenderingContext2D,
        key: string,
        x: number,
        y: number,
        width: number,
        height: number,
        renderFn: (ctx: CanvasRenderingContext2D) => void
    ): void {
        let entry = this.get(key);
        
        if (!entry) {
            entry = this.set(key, width, height, renderFn);
        }

        // Draw cached content to target
        targetCtx.drawImage(entry.canvas, x, y);
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
        this.stats.totalEntries = 0;
        this.stats.memoryUsage = 0;
    }

    /**
     * Remove expired entries
     */
    cleanup(): void {
        const now = Date.now();
        const expiredKeys: string[] = [];

        for (const [key, entry] of this.cache) {
            if (now - entry.timestamp > this.maxAge) {
                expiredKeys.push(key);
            }
        }

        for (const key of expiredKeys) {
            this.cache.delete(key);
        }

        this.stats.totalEntries = this.cache.size;
        this.updateMemoryUsage();
    }

    /**
     * Get cache performance statistics
     */
    getStats(): RenderCacheStats {
        return { ...this.stats };
    }

    /**
     * Check if an entry exists and is valid
     */
    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;
        
        const age = Date.now() - entry.timestamp;
        return age <= this.maxAge;
    }

    /**
     * Manually invalidate a cache entry
     */
    invalidate(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * Invalidate all entries matching a pattern
     */
    invalidatePattern(pattern: RegExp): number {
        let removed = 0;
        const keysToRemove: string[] = [];

        for (const key of this.cache.keys()) {
            if (pattern.test(key)) {
                keysToRemove.push(key);
            }
        }

        for (const key of keysToRemove) {
            this.cache.delete(key);
            removed++;
        }

        this.stats.totalEntries = this.cache.size;
        this.updateMemoryUsage();
        return removed;
    }

    // Private helper methods

    private evictLRU(): void {
        // Find entry with oldest timestamp and lowest hit count
        let oldestKey: string | null = null;
        let oldestTime = Infinity;
        let lowestHits = Infinity;

        for (const [key, entry] of this.cache) {
            if (entry.timestamp < oldestTime || 
                (entry.timestamp === oldestTime && entry.hitCount < lowestHits)) {
                oldestKey = key;
                oldestTime = entry.timestamp;
                lowestHits = entry.hitCount;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }

    private updateHitRate(): void {
        const total = this.stats.cacheHits + this.stats.cacheMisses;
        this.stats.hitRate = total > 0 ? this.stats.cacheHits / total : 0;
    }

    private updateMemoryUsage(): void {
        let totalPixels = 0;
        
        for (const entry of this.cache.values()) {
            totalPixels += entry.canvas.width * entry.canvas.height;
        }

        // Rough estimate: 4 bytes per pixel (RGBA)
        this.stats.memoryUsage = (totalPixels * 4) / 1024; // KB
    }
}

// Global cache instance for easy access
let globalRenderCache: RenderCache | null = null;

export function getRenderCache(): RenderCache {
    if (!globalRenderCache) {
        globalRenderCache = new RenderCache(50, 60); // 50 entries, 60 second TTL
    }
    return globalRenderCache;
}

export function resetRenderCache(): void {
    if (globalRenderCache) {
        globalRenderCache.clear();
    }
    globalRenderCache = null;
}