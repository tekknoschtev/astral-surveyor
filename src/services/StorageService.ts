// StorageService - localStorage abstraction with error handling and versioning
// Provides reliable data persistence for game state and user preferences

export interface StorageOptions {
    compress?: boolean;
    version?: string;
}

export interface StorageResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    version?: string;
}

export interface IStorageService {
    setItem<T>(key: string, value: T, options?: StorageOptions): StorageResult<void>;
    getItem<T>(key: string): StorageResult<T>;
    removeItem(key: string): StorageResult<void>;
    clear(): StorageResult<void>;
    getStorageInfo(): { available: boolean; quotaUsed?: number; quotaRemaining?: number };
}

export class StorageService implements IStorageService {
    private readonly keyPrefix = 'astralSurveyor_';
    private readonly currentVersion = '1.0.0';

    constructor() {
        // Validate localStorage availability on construction
        if (!this.isStorageAvailable()) {
            console.warn('StorageService: localStorage not available, operating in memory-only mode');
        }
    }

    /**
     * Store data in localStorage with optional compression and versioning
     */
    setItem<T>(key: string, value: T, options: StorageOptions = {}): StorageResult<void> {
        if (!this.isStorageAvailable()) {
            return { success: false, error: 'localStorage not available' };
        }

        try {
            const storageData = {
                version: options.version || this.currentVersion,
                timestamp: Date.now(),
                data: value
            };

            const serialized = JSON.stringify(storageData);
            const finalKey = this.keyPrefix + key;

            localStorage.setItem(finalKey, serialized);
            
            return { success: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown storage error';
            
            // Handle specific localStorage errors
            if (errorMessage.includes('QuotaExceededError') || errorMessage.includes('quota')) {
                return { success: false, error: 'Storage quota exceeded' };
            }
            
            return { success: false, error: `Failed to store data: ${errorMessage}` };
        }
    }

    /**
     * Retrieve data from localStorage with version checking
     */
    getItem<T>(key: string): StorageResult<T> {
        if (!this.isStorageAvailable()) {
            return { success: false, error: 'localStorage not available' };
        }

        try {
            const finalKey = this.keyPrefix + key;
            const stored = localStorage.getItem(finalKey);
            
            if (stored === null) {
                return { success: false, error: 'Key not found' };
            }

            const storageData = JSON.parse(stored);
            
            // Validate storage data structure
            if (!storageData || typeof storageData !== 'object' || !storageData.hasOwnProperty('data')) {
                return { success: false, error: 'Invalid storage data format' };
            }

            return { 
                success: true, 
                data: storageData.data,
                version: storageData.version 
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
            return { success: false, error: `Failed to retrieve data: ${errorMessage}` };
        }
    }

    /**
     * Remove item from localStorage
     */
    removeItem(key: string): StorageResult<void> {
        if (!this.isStorageAvailable()) {
            return { success: false, error: 'localStorage not available' };
        }

        try {
            const finalKey = this.keyPrefix + key;
            localStorage.removeItem(finalKey);
            return { success: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: `Failed to remove data: ${errorMessage}` };
        }
    }

    /**
     * Clear all game-related localStorage data
     */
    clear(): StorageResult<void> {
        if (!this.isStorageAvailable()) {
            return { success: false, error: 'localStorage not available' };
        }

        try {
            const keysToRemove: string[] = [];
            
            // Find all keys with our prefix
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.keyPrefix)) {
                    keysToRemove.push(key);
                }
            }

            // Remove all found keys
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            return { success: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { success: false, error: `Failed to clear storage: ${errorMessage}` };
        }
    }

    /**
     * Get storage availability and quota information
     */
    getStorageInfo(): { available: boolean; quotaUsed?: number; quotaRemaining?: number } {
        if (!this.isStorageAvailable()) {
            return { available: false };
        }

        try {
            // Estimate storage usage
            let totalSize = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.keyPrefix)) {
                    const value = localStorage.getItem(key);
                    if (value) {
                        totalSize += key.length + value.length;
                    }
                }
            }

            return {
                available: true,
                quotaUsed: totalSize,
                // localStorage typically has ~5-10MB limit, but we can't reliably detect it
                quotaRemaining: undefined
            };
        } catch (error) {
            return { available: true }; // Available but couldn't calculate usage
        }
    }

    /**
     * Check if localStorage is available and functional
     */
    private isStorageAvailable(): boolean {
        try {
            if (typeof localStorage === 'undefined' || !localStorage) {
                return false;
            }

            // Test functionality with a temporary key
            const testKey = this.keyPrefix + 'test';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            
            return true;
        } catch (error) {
            return false;
        }
    }
}