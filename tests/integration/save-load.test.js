// Save/Load Edge Cases Integration Tests
// Tests critical data persistence scenarios and error handling

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StorageService } from '../../dist/services/StorageService.js';

describe('Save/Load Edge Cases', () => {
    let storageService;
    let mockLocalStorage;

    beforeEach(() => {
        // Create a fresh mock localStorage for each test
        mockLocalStorage = {
            data: {},
            getItem: vi.fn((key) => mockLocalStorage.data[key] || null),
            setItem: vi.fn((key, value) => { mockLocalStorage.data[key] = value; }),
            removeItem: vi.fn((key) => { delete mockLocalStorage.data[key]; }),
            clear: vi.fn(() => { mockLocalStorage.data = {}; }),
            key: vi.fn((index) => {
                const keys = Object.keys(mockLocalStorage.data);
                return keys[index] || null;
            }),
            get length() { return Object.keys(mockLocalStorage.data).length; }
        };

        // Replace global localStorage
        global.localStorage = mockLocalStorage;

        storageService = new StorageService();
    });

    afterEach(() => {
        // Clean up
        vi.restoreAllMocks();
    });

    describe('Corrupted Save Data Handling', () => {
        it('should handle corrupted JSON and trigger graceful fallback', () => {
            // Store corrupted data directly
            const key = 'gameData';
            mockLocalStorage.data['astralSurveyor_' + key] = 'this is not valid JSON {{{';

            // Attempt to load corrupted data
            const result = storageService.getItem(key);

            // Should fail gracefully
            expect(result.success).toBe(false);
            expect(result.error).toContain('Failed to retrieve data');
            expect(result.data).toBeUndefined();
        });

        it('should handle missing required fields in save data', () => {
            const key = 'gameData';
            // Store data without the required 'data' field
            mockLocalStorage.data['astralSurveyor_' + key] = JSON.stringify({
                version: '1.0.0',
                timestamp: Date.now()
                // Missing 'data' field
            });

            const result = storageService.getItem(key);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid storage data format');
        });

        it('should handle non-object storage data', () => {
            const key = 'gameData';
            // Store a primitive value instead of object
            mockLocalStorage.data['astralSurveyor_' + key] = JSON.stringify('just a string');

            const result = storageService.getItem(key);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid storage data format');
        });

        it('should handle null/undefined stored values', () => {
            const key = 'gameData';
            mockLocalStorage.data['astralSurveyor_' + key] = JSON.stringify(null);

            const result = storageService.getItem(key);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid storage data format');
        });
    });

    describe('Save Version Migration', () => {
        it('should successfully load old save version', () => {
            const key = 'gameData';
            const oldVersionData = {
                version: '0.9.0', // Old version
                timestamp: Date.now(),
                data: {
                    playerX: 100,
                    playerY: 200,
                    discoveries: ['star1', 'star2']
                }
            };

            mockLocalStorage.data['astralSurveyor_' + key] = JSON.stringify(oldVersionData);

            const result = storageService.getItem(key);

            expect(result.success).toBe(true);
            expect(result.version).toBe('0.9.0');
            expect(result.data).toEqual(oldVersionData.data);
        });

        it('should store data with current version when not specified', () => {
            const key = 'gameData';
            const saveData = {
                playerX: 100,
                playerY: 200,
                discoveries: ['star1']
            };

            storageService.setItem(key, saveData);

            // Retrieve and check version
            const stored = mockLocalStorage.data['astralSurveyor_' + key];
            const parsed = JSON.parse(stored);

            expect(parsed.version).toBe('1.0.0'); // Current version
            expect(parsed.data).toEqual(saveData);
        });

        it('should allow custom version when specified', () => {
            const key = 'gameData';
            const saveData = { player: 'data' };

            storageService.setItem(key, saveData, { version: '2.0.0' });

            const result = storageService.getItem(key);

            expect(result.success).toBe(true);
            expect(result.version).toBe('2.0.0');
        });
    });

    describe('localStorage Quota Handling', () => {
        it('should handle quota exceeded error gracefully', () => {
            // First, ensure localStorage is available by doing a successful operation
            storageService.setItem('test', { data: 'test' });

            // Now mock setItem to throw QuotaExceededError AFTER the test key is removed
            const originalSetItem = mockLocalStorage.setItem;
            mockLocalStorage.setItem = vi.fn((key, value) => {
                // Allow the test key operations to succeed
                if (key.includes('test')) {
                    originalSetItem(key, value);
                } else {
                    // Throw quota error for actual test
                    const error = new Error('QuotaExceededError: DOM Exception 22');
                    error.name = 'QuotaExceededError';
                    throw error;
                }
            });

            const result = storageService.setItem('gameData', { large: 'data' });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Storage quota exceeded');
        });

        it('should report storage usage information', () => {
            // Add some data
            storageService.setItem('game1', { data: 'test1' });
            storageService.setItem('game2', { data: 'test2' });

            const info = storageService.getStorageInfo();

            expect(info.available).toBe(true);
            expect(info.quotaUsed).toBeGreaterThan(0);
        });

        it('should handle unavailable localStorage', () => {
            // Make localStorage unavailable
            global.localStorage = undefined;
            const newService = new StorageService();

            const result = newService.setItem('test', { data: 'value' });

            expect(result.success).toBe(false);
            expect(result.error).toBe('localStorage not available');
        });
    });

    describe('Data Integrity and Edge Cases', () => {
        it('should handle empty string key', () => {
            const result = storageService.setItem('', { data: 'value' });
            expect(result.success).toBe(true);

            const retrieved = storageService.getItem('');
            expect(retrieved.success).toBe(true);
        });

        it('should handle special characters in keys', () => {
            const specialKey = 'game-data/save#1@test!';
            const data = { player: 'data' };

            storageService.setItem(specialKey, data);
            const result = storageService.getItem(specialKey);

            expect(result.success).toBe(true);
            expect(result.data).toEqual(data);
        });

        it('should handle nested complex objects', () => {
            const complexData = {
                player: {
                    position: { x: 100, y: 200 },
                    inventory: [
                        { id: 1, name: 'item1', properties: { rare: true } },
                        { id: 2, name: 'item2', properties: { rare: false } }
                    ]
                },
                discoveries: new Map([['star1', { name: 'Alpha' }]]) // Will be serialized
            };

            const result = storageService.setItem('gameData', complexData);
            expect(result.success).toBe(true);

            const retrieved = storageService.getItem('gameData');
            expect(retrieved.success).toBe(true);
            // Note: Map will become an object after serialization
        });

        it('should handle missing key on retrieval', () => {
            const result = storageService.getItem('nonexistent-key');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Key not found');
        });

        it('should clear all game data', () => {
            // Add multiple items
            storageService.setItem('game1', { data: 1 });
            storageService.setItem('game2', { data: 2 });
            storageService.setItem('settings', { sound: true });

            // Also add non-game data to ensure it's not cleared
            mockLocalStorage.data['other_app_data'] = 'should not be cleared';

            const result = storageService.clear();

            expect(result.success).toBe(true);
            expect(storageService.getItem('game1').success).toBe(false);
            expect(storageService.getItem('game2').success).toBe(false);
            expect(mockLocalStorage.data['other_app_data']).toBe('should not be cleared');
        });

        it('should remove specific items', () => {
            storageService.setItem('game1', { data: 1 });
            storageService.setItem('game2', { data: 2 });

            const removeResult = storageService.removeItem('game1');

            expect(removeResult.success).toBe(true);
            expect(storageService.getItem('game1').success).toBe(false);
            expect(storageService.getItem('game2').success).toBe(true);
        });
    });

    describe('Timestamp Tracking', () => {
        it('should include timestamp when saving data', () => {
            const beforeTime = Date.now();

            storageService.setItem('gameData', { player: 'data' });

            const afterTime = Date.now();
            const stored = mockLocalStorage.data['astralSurveyor_gameData'];
            const parsed = JSON.parse(stored);

            expect(parsed.timestamp).toBeGreaterThanOrEqual(beforeTime);
            expect(parsed.timestamp).toBeLessThanOrEqual(afterTime);
        });
    });

    describe('Error Recovery', () => {
        it('should handle concurrent save operations', () => {
            const data1 = { save: 'first' };
            const data2 = { save: 'second' };

            // Rapid saves to same key
            storageService.setItem('gameData', data1);
            storageService.setItem('gameData', data2);

            const result = storageService.getItem('gameData');

            expect(result.success).toBe(true);
            expect(result.data).toEqual(data2); // Last write wins
        });

        it('should handle storage becoming unavailable mid-operation', () => {
            // First save succeeds
            storageService.setItem('gameData', { data: 1 });

            // Simulate storage becoming unavailable
            global.localStorage = undefined;

            // Subsequent operation should fail gracefully
            const result = storageService.setItem('gameData', { data: 2 });

            expect(result.success).toBe(false);
            expect(result.error).toBe('localStorage not available');
        });
    });
});
