// SaveLoadService Tests
// Unit tests for game state persistence orchestration

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SaveLoadService } from '../../dist/services/SaveLoadService.js';

describe('SaveLoadService', () => {
    let saveLoadService;
    let mockStorageService;
    let mockStateManager;
    let mockCamera;
    let mockDiscoveryLogbook;
    let mockChunkManager;
    let mockSimplifiedDiscoveryService;
    let mockSettingsService;

    beforeEach(() => {
        // Mock storage service
        mockStorageService = {
            setItem: vi.fn(() => ({ success: true })),
            getItem: vi.fn(() => ({ success: false, error: 'Key not found' })),
            removeItem: vi.fn(() => ({ success: true }))
        };

        // Mock state manager
        mockStateManager = {
            isTraversing: false,
            isResettingUniverse: false
        };

        // Mock camera
        mockCamera = {
            x: 1000,
            y: 2000,
            velocityX: 5,
            velocityY: -3,
            distanceTraveled: 15000,
            sessionDistanceTraveled: 15000,
            getSessionDistance: vi.fn(() => 15000)
        };

        // Mock discovery logbook
        mockDiscoveryLogbook = {
            getDiscoveries: vi.fn(() => [
                { name: 'ASV-001 G', type: 'star', timestamp: 1640000000000 },
                { name: 'ASV-002 b', type: 'planet', timestamp: 1640000001000 }
            ]),
            clearHistory: vi.fn(),
            addDiscovery: vi.fn()
        };

        // Mock chunk manager with spy-able Map methods
        const discoveredObjectsMap = new Map([
            ['star_1000_2000', { timestamp: 1640000000000, type: 'star' }],
            ['planet_1000_2000_planet_0', { timestamp: 1640000001000, type: 'planet' }]
        ]);
        
        mockChunkManager = {
            discoveredObjects: {
                ...discoveredObjectsMap,
                clear: vi.fn(() => discoveredObjectsMap.clear()),
                set: vi.fn((key, value) => discoveredObjectsMap.set(key, value)),
                [Symbol.iterator]: () => discoveredObjectsMap[Symbol.iterator]()
            },
            getAllActiveObjects: vi.fn(() => []),
            restoreDiscoveryState: vi.fn()
        };

        // Mock simplified discovery service
        mockSimplifiedDiscoveryService = {
            exportDiscoveryData: vi.fn(() => ({
                discoveries: [
                    {
                        id: 'discovery_1',
                        name: 'ASV-001 G',
                        type: 'G-Type Star',
                        objectType: 'star',
                        coordinates: { x: 1000, y: 2000 },
                        timestamp: 1640000000000,
                        rarity: 'common',
                        shareableURL: 'http://example.com/share/1000,2000',
                        metadata: { starTypeName: 'G-Type Star', isNotable: false }
                    }
                ],
                idCounter: 1
            })),
            importDiscoveryData: vi.fn()
        };

        // Mock settings service
        mockSettingsService = {};

        saveLoadService = new SaveLoadService(
            mockStorageService,
            mockStateManager,
            mockCamera,
            mockDiscoveryLogbook,
            mockChunkManager,
            mockSimplifiedDiscoveryService,
            mockSettingsService
        );
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('saveGame', () => {
        it('should collect and save complete game state', async () => {
            const result = await saveLoadService.saveGame();

            expect(result.success).toBe(true);
            expect(mockStorageService.setItem).toHaveBeenCalledWith(
                'gameState',
                expect.objectContaining({
                    version: '1.0.0',
                    timestamp: expect.any(Number),
                    player: {
                        x: 1000,
                        y: 2000,
                        velocityX: 5,
                        velocityY: -3,
                        distanceTraveled: 15000
                    },
                    world: expect.objectContaining({
                        currentSeed: expect.any(String)
                    }),
                    discoveries: [
                        { name: 'ASV-001 G', type: 'star', timestamp: 1640000000000 },
                        { name: 'ASV-002 b', type: 'planet', timestamp: 1640000001000 }
                    ],
                    discoveryManager: expect.objectContaining({
                        discoveries: expect.any(Array),
                        idCounter: expect.any(Number)
                    }),
                    stats: expect.objectContaining({
                        sessionStartTime: expect.any(Number),
                        totalPlayTime: expect.any(Number)
                    })
                }),
                { version: '1.0.0' }
            );
        });

        it('should handle storage service errors', async () => {
            mockStorageService.setItem.mockReturnValue({ 
                success: false, 
                error: 'Storage quota exceeded' 
            });

            const result = await saveLoadService.saveGame();

            expect(result.success).toBe(false);
            expect(result.error).toBe('Storage quota exceeded');
        });
    });

    describe('loadGame', () => {
        it('should load and restore valid game state', async () => {
            const mockSaveData = {
                version: '1.0.0',
                timestamp: 1640000000000,
                player: {
                    x: 5000,
                    y: 6000,
                    velocityX: 10,
                    velocityY: -5,
                    distanceTraveled: 25000
                },
                world: {
                    currentSeed: 'test-seed-123',
                    universeResetCount: 2
                },
                discoveries: [
                    { name: 'ASV-100 G', type: 'star', timestamp: 1640000000000 }
                ],
                discoveredObjects: [],
                discoveryManager: {
                    discoveries: [
                        {
                            id: 'discovery_1',
                            name: 'ASV-100 G',
                            type: 'G-Type Star',
                            objectType: 'star',
                            coordinates: { x: 5000, y: 6000 },
                            timestamp: 1640000000000,
                            rarity: 'common',
                            shareableURL: 'http://example.com/share/5000,6000',
                            metadata: { starTypeName: 'G-Type Star', isNotable: false }
                        }
                    ],
                    idCounter: 1
                },
                stats: {
                    sessionStartTime: 1640000000000,
                    totalPlayTime: 120000,
                    firstDiscoveryTime: 1640000000000,
                    lastDiscoveryTime: 1640000001000
                }
            };

            mockStorageService.getItem.mockReturnValue({
                success: true,
                data: mockSaveData,
                version: '1.0.0'
            });

            const result = await saveLoadService.loadGame();

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockSaveData);
            
            // Verify state restoration
            expect(mockCamera.x).toBe(5000);
            expect(mockCamera.y).toBe(6000);
            expect(mockDiscoveryLogbook.clearHistory).toHaveBeenCalled();
            expect(mockDiscoveryLogbook.addDiscovery).toHaveBeenCalledWith(
                'ASV-100 G', 'star', 1640000000000
            );
            expect(mockSimplifiedDiscoveryService.importDiscoveryData).toHaveBeenCalledWith({
                discoveries: expect.any(Array),
                idCounter: 1
            });
        });

        it('should handle missing save data', async () => {
            mockStorageService.getItem.mockReturnValue({
                success: false,
                error: 'Key not found'
            });

            const result = await saveLoadService.loadGame();

            expect(result.success).toBe(false);
            expect(result.error).toBe('Key not found');
        });

        it('should validate save data structure', async () => {
            const invalidSaveData = {
                version: '1.0.0',
                // Missing required properties
                player: { x: 100 } // Missing y coordinate
            };

            mockStorageService.getItem.mockReturnValue({
                success: true,
                data: invalidSaveData
            });

            const result = await saveLoadService.loadGame();

            expect(result.success).toBe(false);
            expect(result.error).toBe('Save data validation failed');
        });
    });

    describe('hasSavedGame', () => {
        it('should return true when save exists', () => {
            mockStorageService.getItem.mockReturnValue({ success: true, data: {} });

            const result = saveLoadService.hasSavedGame();

            expect(result).toBe(true);
            expect(mockStorageService.getItem).toHaveBeenCalledWith('gameState');
        });

        it('should return false when no save exists', () => {
            mockStorageService.getItem.mockReturnValue({ success: false });

            const result = saveLoadService.hasSavedGame();

            expect(result).toBe(false);
        });
    });

    describe('deleteSavedGame', () => {
        it('should remove saved game data', () => {
            const result = saveLoadService.deleteSavedGame();

            expect(result.success).toBe(true);
            expect(mockStorageService.removeItem).toHaveBeenCalledWith('gameState');
        });
    });

    describe('getSaveGameInfo', () => {
        it('should return save info when save exists', async () => {
            const mockSaveData = {
                timestamp: 1640000000000,
                version: '1.0.0'
            };

            mockStorageService.getItem.mockReturnValue({
                success: true,
                data: mockSaveData,
                version: '1.0.0'
            });

            const info = await saveLoadService.getSaveGameInfo();

            expect(info.exists).toBe(true);
            expect(info.timestamp).toBe(1640000000000);
            expect(info.version).toBe('1.0.0');
        });

        it('should return non-existent when no save found', async () => {
            mockStorageService.getItem.mockReturnValue({ success: false });

            const info = await saveLoadService.getSaveGameInfo();

            expect(info.exists).toBe(false);
            expect(info.timestamp).toBeUndefined();
        });
    });

    describe('auto-save functionality', () => {
        it('should enable auto-save with custom interval', () => {
            // Test that auto-save is enabled without console output
            saveLoadService.enableAutoSave(2); // 2 minutes
            
            // Verify auto-save is enabled by checking internal state
            expect(saveLoadService.autoSaveTimer).toBeDefined();
        });

        it('should disable auto-save and clear timer', () => {
            saveLoadService.enableAutoSave(1);
            saveLoadService.disableAutoSave();
            
            // Verify auto-save is disabled by checking internal state
            expect(saveLoadService.autoSaveTimer).toBeUndefined();
        });

        it('should handle discovery auto-save', async () => {
            mockStorageService.setItem.mockReturnValue({ success: true });
            
            await saveLoadService.saveOnDiscovery();
            
            expect(mockStorageService.setItem).toHaveBeenCalledWith(
                'gameState',
                expect.any(Object),
                { version: '1.0.0' }
            );
        });
    });

    describe('save slot management', () => {
        it('should save to custom slot', async () => {
            const result = await saveLoadService.saveGame('customSlot');
            
            expect(result.success).toBe(true);
            expect(mockStorageService.setItem).toHaveBeenCalledWith(
                'customSlot',
                expect.any(Object),
                { version: '1.0.0' }
            );
        });

        it('should load from custom slot', async () => {
            const mockSaveData = {
                version: '1.0.0',
                timestamp: Date.now(),
                player: { x: 100, y: 200, velocityX: 0, velocityY: 0, distanceTraveled: 0 },
                world: { currentSeed: 'test-seed', universeResetCount: 0 },
                discoveries: [],
                discoveredObjects: [],
                stats: { sessionStartTime: Date.now(), totalPlayTime: 0 }
            };

            mockStorageService.getItem.mockReturnValue({
                success: true,
                data: mockSaveData,
                version: '1.0.0'
            });

            const result = await saveLoadService.loadGame('customSlot');
            
            expect(result.success).toBe(true);
            expect(mockStorageService.getItem).toHaveBeenCalledWith('customSlot');
        });

        it('should return available save slots', () => {
            mockStorageService.getItem.mockReturnValue({ success: true, data: {} });
            
            const slots = saveLoadService.getAvailableSaveSlots();
            
            expect(slots).toEqual(['gameState']);
        });
    });

    describe('save data validation', () => {
        it('should accept valid save data structure', async () => {
            const validSaveData = {
                version: '1.0.0',
                timestamp: Date.now(),
                player: { x: 100, y: 200, velocityX: 0, velocityY: 0, distanceTraveled: 0 },
                world: { currentSeed: 'test-seed', universeResetCount: 0 },
                discoveries: [],
                discoveredObjects: [],
                stats: { sessionStartTime: Date.now(), totalPlayTime: 0 }
            };

            mockStorageService.getItem.mockReturnValue({
                success: true,
                data: validSaveData
            });

            const result = await saveLoadService.loadGame();
            expect(result.success).toBe(true);
        });

        it('should handle null save data correctly', async () => {
            mockStorageService.getItem.mockReturnValue({
                success: true,
                data: null
            });

            const result = await saveLoadService.loadGame();
            expect(result.success).toBe(true); // Returns early without validation
            expect(result.data).toBe(null);
        });

        it('should reject invalid save data structures', async () => {
            const invalidCases = [
                { }, // Empty object
                { version: '1.0.0' }, // Missing required fields
                { version: '1.0.0', timestamp: Date.now(), player: { x: 'invalid' } }, // Wrong player type
                { version: '1.0.0', timestamp: Date.now(), player: { x: 100, y: 200 }, world: { } }, // Missing seed
                { version: '1.0.0', timestamp: Date.now(), player: { x: 100, y: 200 }, world: { currentSeed: 'test' }, discoveries: 'not-array', discoveredObjects: [] }, // discoveries wrong type
                { version: '1.0.0', timestamp: Date.now(), player: { x: 100, y: 200 }, world: { currentSeed: 'test' }, discoveries: [], discoveredObjects: 'not-array' } // discoveredObjects wrong type
            ];

            for (const invalidData of invalidCases) {
                mockStorageService.getItem.mockReturnValue({
                    success: true,
                    data: invalidData
                });

                const result = await saveLoadService.loadGame();
                expect(result.success).toBe(false);
                expect(result.error).toBe('Save data validation failed');
            }
        });
    });

    describe('discovery state persistence', () => {
        it('should save and restore ChunkManager discovered objects', async () => {
            // Test save includes discovered objects
            await saveLoadService.saveGame();
            const saveCall = mockStorageService.setItem.mock.calls[0];
            const savedGameData = saveCall[1];
            
            expect(savedGameData.discoveredObjects).toBeDefined();
            expect(savedGameData.discoveredObjects.length).toBe(2); // Should include our mock data
            expect(savedGameData.discoveredObjects[0].objectId).toBe('star_1000_2000');
            expect(savedGameData.discoveredObjects[1].objectId).toBe('planet_1000_2000_planet_0');
            
            // Test load restores discovered objects
            const savedData = {
                version: '1.0.0',
                timestamp: Date.now(),
                player: { x: 1000, y: 2000, velocityX: 5, velocityY: -3, distanceTraveled: 15000 },
                world: { currentSeed: '12345', universeResetCount: 0 },
                discoveries: [
                    { name: 'ASV-001 G', type: 'star', timestamp: 1640000000000 }
                ],
                discoveredObjects: [
                    { objectId: 'star_1000_2000', discoveryData: { timestamp: 1640000000000, type: 'star' } }
                ],
                stats: { sessionStartTime: Date.now(), totalPlayTime: 3600000 }
            };

            mockStorageService.getItem.mockReturnValue({
                success: true,
                data: savedData,
                version: '1.0.0'
            });
            
            const result = await saveLoadService.loadGame();
            expect(result.success).toBe(true);
            
            // Verify ChunkManager.discoveredObjects was restored
            expect(mockChunkManager.discoveredObjects.clear).toHaveBeenCalled();
            expect(mockChunkManager.discoveredObjects.set).toHaveBeenCalledWith(
                'star_1000_2000', 
                { timestamp: 1640000000000, type: 'star' }
            );
        });

        it('should save and restore distance traveled correctly', async () => {
            // Set up camera with some distance traveled
            const testDistance = 12345;
            mockCamera.getSessionDistance.mockReturnValue(testDistance);
            mockCamera.sessionDistanceTraveled = testDistance;
            
            // Save the game
            const saveResult = await saveLoadService.saveGame();
            expect(saveResult.success).toBe(true);
            
            // Verify the saved data includes correct distance
            const saveCall = mockStorageService.setItem.mock.calls[0];
            const savedData = saveCall[1];
            expect(savedData.player.distanceTraveled).toBe(testDistance);
            
            // Reset camera distance to 0 to simulate loading into fresh state
            mockCamera.sessionDistanceTraveled = 0;
            
            // Set up storage service to return the saved data
            mockStorageService.getItem.mockReturnValue({
                success: true,
                data: savedData,
                version: '1.0.0'
            });
            
            // Load the game
            const loadResult = await saveLoadService.loadGame();
            expect(loadResult.success).toBe(true);
            
            // Verify distance was restored to camera
            expect(mockCamera.sessionDistanceTraveled).toBe(testDistance);
        });

        it('should handle zero distance correctly', async () => {
            // Test with zero distance
            mockCamera.getSessionDistance.mockReturnValue(0);
            mockCamera.sessionDistanceTraveled = 0;
            
            const saveResult = await saveLoadService.saveGame();
            expect(saveResult.success).toBe(true);
            
            const saveCall = mockStorageService.setItem.mock.calls[0];
            const savedData = saveCall[1];
            expect(savedData.player.distanceTraveled).toBe(0);
            
            // Load and verify
            mockStorageService.getItem.mockReturnValue({
                success: true,
                data: savedData,
                version: '1.0.0'
            });
            
            const loadResult = await saveLoadService.loadGame();
            expect(loadResult.success).toBe(true);
            expect(mockCamera.sessionDistanceTraveled).toBe(0);
        });
    });
});