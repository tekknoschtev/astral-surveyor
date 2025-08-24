// SettingsService Tests - TDD approach
// Tests for user preference management and persistence

import { SettingsService } from '../../dist/services/SettingsService.js';

describe('SettingsService', () => {
    let settingsService;
    let mockAudioService;
    let mockLocalStorage;

    beforeEach(() => {
        // Mock AudioService
        mockAudioService = {
            getMasterVolume: vi.fn().mockReturnValue(0.8),
            setMasterVolume: vi.fn(),
            getAmbientVolume: vi.fn().mockReturnValue(0.6),
            setAmbientVolume: vi.fn(),
            getEffectsVolume: vi.fn().mockReturnValue(0.7),
            setEffectsVolume: vi.fn(),
            isMuted: vi.fn().mockReturnValue(false),
            setMuted: vi.fn(),
            // Individual channel mute methods
            isMasterMuted: vi.fn().mockReturnValue(false),
            setMasterMuted: vi.fn(),
            isAmbientMuted: vi.fn().mockReturnValue(false),
            setAmbientMuted: vi.fn(),
            isDiscoveryMuted: vi.fn().mockReturnValue(false),
            setDiscoveryMuted: vi.fn()
        };

        // Mock localStorage
        mockLocalStorage = {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn()
        };

        // Replace global localStorage
        Object.defineProperty(window, 'localStorage', {
            value: mockLocalStorage,
            writable: true
        });

        settingsService = new SettingsService(mockAudioService);
    });

    describe('Initialization', () => {
        it('should initialize with default settings', () => {
            expect(settingsService).toBeDefined();
            expect(settingsService.getAmbientVolume()).toBe(60); // Default 60%
            expect(settingsService.getDiscoveryVolume()).toBe(70); // Default 70%
            expect(settingsService.getMasterVolume()).toBe(80); // Default 80%
            expect(settingsService.getShowCoordinates()).toBe(false); // Default false
            expect(settingsService.getUIScale()).toBe(1.0); // Default 100%
        });

        it('should load settings from localStorage on initialization', () => {
            const savedSettings = JSON.stringify({
                ambientVolume: 45,
                discoveryVolume: 85,
                masterVolume: 90,
                ambientMuted: true,
                discoveryMuted: false,
                masterMuted: false,
                showCoordinates: true,
                uiScale: 1.2
            });

            mockLocalStorage.getItem.mockReturnValue(savedSettings);
            
            const service = new SettingsService(mockAudioService);
            
            expect(service.getAmbientVolume()).toBe(0); // Returns 0 when ambientMuted is true
            expect(service.getDiscoveryVolume()).toBe(85); // Not muted, returns actual volume
            expect(service.getMasterVolume()).toBe(90); // Not muted (masterMuted: false), returns actual volume
            expect(service.isAmbientMuted()).toBe(true);
            expect(service.isDiscoveryMuted()).toBe(false);
            expect(service.isMasterMuted()).toBe(false);
            expect(service.getShowCoordinates()).toBe(true);
            expect(service.getUIScale()).toBe(1.2);
        });

        it('should handle corrupted localStorage gracefully', () => {
            mockLocalStorage.getItem.mockReturnValue('invalid json');
            
            expect(() => new SettingsService(mockAudioService)).not.toThrow();
            
            const service = new SettingsService(mockAudioService);
            expect(service.getAmbientVolume()).toBe(60); // Should use defaults
        });
    });

    describe('Audio Volume Management', () => {
        it('should get and set ambient volume', () => {
            expect(settingsService.getAmbientVolume()).toBe(60);
            
            settingsService.setAmbientVolume(75);
            expect(settingsService.getAmbientVolume()).toBe(75);
        });

        it('should validate volume range (0-100)', () => {
            expect(() => settingsService.setAmbientVolume(-10)).toThrow('Volume must be between 0 and 100');
            expect(() => settingsService.setAmbientVolume(150)).toThrow('Volume must be between 0 and 100');
            expect(() => settingsService.setAmbientVolume(50)).not.toThrow();
        });

        it('should sync with AudioService when setting volumes', () => {
            settingsService.setAmbientVolume(75);
            expect(mockAudioService.setAmbientVolume).toHaveBeenCalledWith(0.75);

            settingsService.setDiscoveryVolume(85);
            expect(mockAudioService.setEffectsVolume).toHaveBeenCalledWith(0.85);

            settingsService.setMasterVolume(90);
            expect(mockAudioService.setMasterVolume).toHaveBeenCalledWith(0.90);
        });

        it('should get and set discovery volume', () => {
            expect(settingsService.getDiscoveryVolume()).toBe(70);
            
            settingsService.setDiscoveryVolume(85);
            expect(settingsService.getDiscoveryVolume()).toBe(85);
        });

        it('should get and set master volume', () => {
            expect(settingsService.getMasterVolume()).toBe(80);
            
            settingsService.setMasterVolume(90);
            expect(settingsService.getMasterVolume()).toBe(90);
        });
    });

    describe('Audio Mute Management', () => {
        it('should handle ambient mute/unmute', () => {
            expect(settingsService.isAmbientMuted()).toBe(false);
            
            settingsService.setAmbientMuted(true);
            expect(settingsService.isAmbientMuted()).toBe(true);
        });

        it('should remember previous volume when unmuting', () => {
            settingsService.setAmbientVolume(75);
            settingsService.setAmbientMuted(true);
            
            expect(settingsService.getAmbientVolume()).toBe(0); // Should be 0 when muted
            
            settingsService.setAmbientMuted(false);
            expect(settingsService.getAmbientVolume()).toBe(75); // Should restore previous
        });

        it('should handle discovery mute/unmute with volume restoration', () => {
            settingsService.setDiscoveryVolume(85);
            settingsService.setDiscoveryMuted(true);
            
            expect(settingsService.getDiscoveryVolume()).toBe(0);
            
            settingsService.setDiscoveryMuted(false);
            expect(settingsService.getDiscoveryVolume()).toBe(85);
        });

        it('should sync mute state with AudioService', () => {
            settingsService.setMasterMuted(true);
            expect(mockAudioService.setMasterMuted).toHaveBeenCalledWith(true);
            
            settingsService.setMasterMuted(false);
            expect(mockAudioService.setMasterMuted).toHaveBeenCalledWith(false);
        });
    });

    describe('Display Settings', () => {
        it('should get and set coordinate display', () => {
            expect(settingsService.getShowCoordinates()).toBe(false);
            
            settingsService.setShowCoordinates(true);
            expect(settingsService.getShowCoordinates()).toBe(true);
        });

        it('should get and set UI scale', () => {
            expect(settingsService.getUIScale()).toBe(1.0);
            
            settingsService.setUIScale(1.5);
            expect(settingsService.getUIScale()).toBe(1.5);
        });

        it('should validate UI scale range (0.5-2.0)', () => {
            expect(() => settingsService.setUIScale(0.3)).toThrow('UI scale must be between 0.5 and 2.0');
            expect(() => settingsService.setUIScale(2.5)).toThrow('UI scale must be between 0.5 and 2.0');
            expect(() => settingsService.setUIScale(1.2)).not.toThrow();
        });

        it('should handle fullscreen toggle', () => {
            expect(settingsService.isFullscreen()).toBe(false);
            
            settingsService.setFullscreen(true);
            expect(settingsService.isFullscreen()).toBe(true);
        });
    });

    describe('Data Management', () => {
        it('should export save data as JSON', () => {
            settingsService.setAmbientVolume(75);
            settingsService.setShowCoordinates(true);
            
            const exportData = settingsService.exportSaveData();
            const parsed = JSON.parse(exportData);
            
            expect(parsed.settings).toBeDefined();
            expect(parsed.settings.ambientVolume).toBe(75);
            expect(parsed.settings.showCoordinates).toBe(true);
            expect(parsed.exportDate).toBeDefined();
            expect(parsed.version).toBeDefined();
        });

        it('should include user stats in export data', () => {
            const exportData = settingsService.exportSaveData();
            const parsed = JSON.parse(exportData);
            
            expect(parsed.userStats).toBeDefined();
            expect(parsed.userStats.distanceTraveled).toBeDefined();
            expect(parsed.userStats.discoveryCount).toBeDefined();
        });

        it('should reset distance traveled', () => {
            const resetSpy = vi.fn();
            settingsService.onDistanceReset = resetSpy;
            
            settingsService.resetDistanceTraveled();
            expect(resetSpy).toHaveBeenCalled();
        });

        it('should clear discovery history with callback', () => {
            const clearSpy = vi.fn();
            settingsService.onDiscoveryHistoryClear = clearSpy;
            
            settingsService.clearDiscoveryHistory();
            expect(clearSpy).toHaveBeenCalled();
        });
    });

    describe('Settings Persistence', () => {
        it('should save settings to localStorage when changed', () => {
            settingsService.setAmbientVolume(75);
            
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'astralSurveyor_settings',
                expect.stringContaining('"ambientVolume":75')
            );
        });

        it('should save all settings in correct format', () => {
            settingsService.setAmbientVolume(75);
            settingsService.setShowCoordinates(true);
            settingsService.setAmbientMuted(true);
            
            const lastCall = mockLocalStorage.setItem.mock.calls[mockLocalStorage.setItem.mock.calls.length - 1];
            const savedData = JSON.parse(lastCall[1]);
            
            expect(savedData.ambientVolume).toBe(75);
            expect(savedData.showCoordinates).toBe(true);
            expect(savedData.ambientMuted).toBe(true);
            expect(savedData.version).toBeDefined();
        });

        it('should handle localStorage save errors gracefully', () => {
            mockLocalStorage.setItem.mockImplementation(() => {
                throw new Error('Storage full');
            });
            
            expect(() => settingsService.setAmbientVolume(75)).not.toThrow();
        });
    });

    describe('Event System', () => {
        it('should emit events when settings change', () => {
            const listener = vi.fn();
            settingsService.addEventListener('settingsChanged', listener);
            
            settingsService.setAmbientVolume(75);
            
            expect(listener).toHaveBeenCalledWith({
                type: 'settingsChanged',
                setting: 'ambientVolume',
                value: 75,
                previousValue: 60
            });
        });

        it('should support multiple event listeners', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();
            
            settingsService.addEventListener('settingsChanged', listener1);
            settingsService.addEventListener('settingsChanged', listener2);
            
            settingsService.setShowCoordinates(true);
            
            expect(listener1).toHaveBeenCalled();
            expect(listener2).toHaveBeenCalled();
        });

        it('should support removing event listeners', () => {
            const listener = vi.fn();
            settingsService.addEventListener('settingsChanged', listener);
            settingsService.removeEventListener('settingsChanged', listener);
            
            settingsService.setAmbientVolume(75);
            
            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('should require AudioService dependency', () => {
            expect(() => new SettingsService(null)).toThrow('AudioService is required');
        });

        it('should validate setting types', () => {
            expect(() => settingsService.setAmbientVolume('invalid')).toThrow('Volume must be a number');
            expect(() => settingsService.setShowCoordinates('invalid')).toThrow('Show coordinates must be a boolean');
        });

        it('should handle missing localStorage gracefully', () => {
            Object.defineProperty(window, 'localStorage', {
                value: null,
                writable: true
            });
            
            expect(() => new SettingsService(mockAudioService)).not.toThrow();
        });
    });
});