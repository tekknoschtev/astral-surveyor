// StorageService Tests
// Comprehensive unit tests for localStorage abstraction service

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StorageService } from '../../dist/services/StorageService.js';

describe('StorageService', () => {
    let storageService;
    let mockStorage;

    beforeEach(() => {
        // Create simple mock localStorage
        mockStorage = new Map();
        
        const mockLocalStorage = {
            setItem: vi.fn((key, value) => {
                if (key === 'astralSurveyor_quota_exceeded_key') {
                    const error = new Error('QuotaExceededError: Storage quota exceeded');
                    error.name = 'QuotaExceededError';
                    throw error;
                }
                mockStorage.set(key, value);
            }),
            getItem: vi.fn((key) => mockStorage.get(key) || null),
            removeItem: vi.fn((key) => {
                mockStorage.delete(key);
                return true;
            }),
            clear: vi.fn(() => mockStorage.clear()),
            length: 0,
            key: vi.fn((index) => {
                const keys = Array.from(mockStorage.keys());
                return keys[index] || null;
            })
        };

        // Update length property dynamically
        Object.defineProperty(mockLocalStorage, 'length', {
            get: () => mockStorage.size
        });
        
        global.localStorage = mockLocalStorage;
        storageService = new StorageService();
    });

    afterEach(() => {
        vi.clearAllMocks();
        mockStorage.clear();
    });

    describe('setItem functionality', () => {
        it('should store data with version and timestamp', () => {
            const testData = { name: 'test', value: 42 };
            const result = storageService.setItem('testKey', testData);

            expect(result.success).toBe(true);
            expect(global.localStorage.setItem).toHaveBeenCalledWith(
                'astralSurveyor_testKey',
                expect.stringContaining('"data":{"name":"test","value":42}')
            );
        });

        it('should include version in stored data', () => {
            storageService.setItem('versionTest', { test: true });
            
            const storedValue = mockStorage.get('astralSurveyor_versionTest');
            const parsedData = JSON.parse(storedValue);
            
            expect(parsedData.version).toBe('1.0.0');
            expect(parsedData.timestamp).toBeTypeOf('number');
            expect(parsedData.data).toEqual({ test: true });
        });

        it('should handle quota exceeded error', () => {
            const result = storageService.setItem('quota_exceeded_key', { data: 'test' });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Storage quota exceeded');
        });
    });

    describe('getItem functionality', () => {
        it('should retrieve stored data correctly', () => {
            const testData = { name: 'test', items: [1, 2, 3] };
            storageService.setItem('retrieveTest', testData);
            
            const result = storageService.getItem('retrieveTest');
            
            expect(result.success).toBe(true);
            expect(result.data).toEqual(testData);
            expect(result.version).toBe('1.0.0');
        });

        it('should handle missing keys', () => {
            const result = storageService.getItem('nonExistentKey');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Key not found');
        });

        it('should handle corrupted data', () => {
            mockStorage.set('astralSurveyor_corruptedKey', 'invalid json {');
            
            const result = storageService.getItem('corruptedKey');
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Failed to retrieve data');
        });
    });

    describe('removeItem functionality', () => {
        it('should remove stored items', () => {
            storageService.setItem('removeTest', { data: 'value' });
            expect(mockStorage.has('astralSurveyor_removeTest')).toBe(true);
            
            const result = storageService.removeItem('removeTest');
            
            expect(result.success).toBe(true);
            expect(global.localStorage.removeItem).toHaveBeenCalledWith('astralSurveyor_removeTest');
        });
    });

    describe('clear functionality', () => {
        it('should clear only game-prefixed keys', () => {
            // Add some game keys and some non-game keys
            mockStorage.set('astralSurveyor_gameData', 'value1');
            mockStorage.set('astralSurveyor_settings', 'value2');
            mockStorage.set('otherApp_data', 'value3');
            
            const result = storageService.clear();
            
            expect(result.success).toBe(true);
            expect(mockStorage.has('astralSurveyor_gameData')).toBe(false);
            expect(mockStorage.has('astralSurveyor_settings')).toBe(false);
            expect(mockStorage.has('otherApp_data')).toBe(true);
        });
    });

    describe('getStorageInfo functionality', () => {
        it('should return availability when localStorage exists', () => {
            const info = storageService.getStorageInfo();
            
            expect(info.available).toBe(true);
            expect(info.quotaUsed).toBeTypeOf('number');
        });
    });

    describe('error handling', () => {
        it('should handle localStorage unavailable', () => {
            global.localStorage = undefined;
            const newService = new StorageService();
            
            const setResult = newService.setItem('test', { data: 'value' });
            const getResult = newService.getItem('test');
            
            expect(setResult.success).toBe(false);
            expect(setResult.error).toBe('localStorage not available');
            expect(getResult.success).toBe(false);
            expect(getResult.error).toBe('localStorage not available');
        });
    });
});