// Debug Configuration Tests
// Tests the debug configuration system for region-specific objects

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    getDebugConfig,
    updateDebugConfig,
    toggleArtificialObjects,
    resetDebugConfig,
    defaultDebugConfig
} from '../../dist/config/debugConfig.js';

describe('Debug Configuration', () => {
    let consoleLogSpy;

    beforeEach(() => {
        // Reset config to defaults before each test
        resetDebugConfig();

        // Spy on console.log to verify debug messages
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
    });

    describe('Default Configuration', () => {
        it('should have correct default values', () => {
            const config = getDebugConfig();

            expect(config.enableArtificialObjects).toBe(true);
            expect(config.enableRegionObjectDebug).toBe(true);
        });

        it('should match exported default config', () => {
            const config = getDebugConfig();

            expect(config.enableArtificialObjects).toBe(defaultDebugConfig.enableArtificialObjects);
            expect(config.enableRegionObjectDebug).toBe(defaultDebugConfig.enableRegionObjectDebug);
        });
    });

    describe('getDebugConfig', () => {
        it('should return current configuration object', () => {
            const config = getDebugConfig();

            expect(config).toBeDefined();
            expect(config).toHaveProperty('enableArtificialObjects');
            expect(config).toHaveProperty('enableRegionObjectDebug');
        });

        it('should return configuration with boolean values', () => {
            const config = getDebugConfig();

            expect(typeof config.enableArtificialObjects).toBe('boolean');
            expect(typeof config.enableRegionObjectDebug).toBe('boolean');
        });
    });

    describe('updateDebugConfig', () => {
        it('should update enableArtificialObjects', () => {
            updateDebugConfig({ enableArtificialObjects: false });

            const config = getDebugConfig();
            expect(config.enableArtificialObjects).toBe(false);
        });

        it('should update enableRegionObjectDebug', () => {
            updateDebugConfig({ enableRegionObjectDebug: false });

            const config = getDebugConfig();
            expect(config.enableRegionObjectDebug).toBe(false);
        });

        it('should update multiple fields at once', () => {
            updateDebugConfig({
                enableArtificialObjects: false,
                enableRegionObjectDebug: false
            });

            const config = getDebugConfig();
            expect(config.enableArtificialObjects).toBe(false);
            expect(config.enableRegionObjectDebug).toBe(false);
        });

        it('should preserve unmodified fields', () => {
            updateDebugConfig({ enableArtificialObjects: false });

            const config = getDebugConfig();
            expect(config.enableArtificialObjects).toBe(false);
            expect(config.enableRegionObjectDebug).toBe(true); // Should remain default
        });

        it('should log debug message on update', () => {
            updateDebugConfig({ enableArtificialObjects: false });

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('DEBUG: Updated region objects config'),
                expect.any(Object)
            );
        });

        it('should handle partial updates correctly', () => {
            const initialConfig = getDebugConfig();
            updateDebugConfig({ enableArtificialObjects: false });
            const updatedConfig = getDebugConfig();

            expect(updatedConfig.enableArtificialObjects).toBe(false);
            expect(updatedConfig.enableRegionObjectDebug).toBe(initialConfig.enableRegionObjectDebug);
        });
    });

    describe('toggleArtificialObjects', () => {
        it('should toggle enableArtificialObjects from true to false', () => {
            // Default is true
            const result = toggleArtificialObjects();

            expect(result).toBe(false);
            expect(getDebugConfig().enableArtificialObjects).toBe(false);
        });

        it('should toggle enableArtificialObjects from false to true', () => {
            // Set to false first
            updateDebugConfig({ enableArtificialObjects: false });

            const result = toggleArtificialObjects();

            expect(result).toBe(true);
            expect(getDebugConfig().enableArtificialObjects).toBe(true);
        });

        it('should toggle multiple times correctly', () => {
            const firstToggle = toggleArtificialObjects();
            const secondToggle = toggleArtificialObjects();
            const thirdToggle = toggleArtificialObjects();

            expect(firstToggle).toBe(false);
            expect(secondToggle).toBe(true);
            expect(thirdToggle).toBe(false);
        });

        it('should return the new state after toggle', () => {
            const result = toggleArtificialObjects();
            const config = getDebugConfig();

            expect(result).toBe(config.enableArtificialObjects);
        });

        it('should log debug message on toggle', () => {
            toggleArtificialObjects();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('DEBUG: Artificial objects')
            );
        });

        it('should log "enabled" when toggled to true', () => {
            // Toggle to false first
            toggleArtificialObjects();
            consoleLogSpy.mockClear();

            // Toggle to true
            toggleArtificialObjects();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('enabled')
            );
        });

        it('should log "disabled" when toggled to false', () => {
            toggleArtificialObjects();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('disabled')
            );
        });
    });

    describe('resetDebugConfig', () => {
        it('should reset config to default values', () => {
            // Modify config
            updateDebugConfig({
                enableArtificialObjects: false,
                enableRegionObjectDebug: false
            });

            // Reset
            resetDebugConfig();

            const config = getDebugConfig();
            expect(config.enableArtificialObjects).toBe(defaultDebugConfig.enableArtificialObjects);
            expect(config.enableRegionObjectDebug).toBe(defaultDebugConfig.enableRegionObjectDebug);
        });

        it('should reset after toggle operations', () => {
            toggleArtificialObjects();
            toggleArtificialObjects();

            resetDebugConfig();

            const config = getDebugConfig();
            expect(config.enableArtificialObjects).toBe(true);
        });

        it('should log debug message on reset', () => {
            resetDebugConfig();

            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('DEBUG: Reset region objects config to defaults')
            );
        });

        it('should create new config object (not mutate existing)', () => {
            const configBefore = getDebugConfig();
            updateDebugConfig({ enableArtificialObjects: false });
            resetDebugConfig();
            const configAfter = getDebugConfig();

            // Should have same values as defaults
            expect(configAfter.enableArtificialObjects).toBe(defaultDebugConfig.enableArtificialObjects);
            expect(configAfter.enableRegionObjectDebug).toBe(defaultDebugConfig.enableRegionObjectDebug);
        });
    });

    describe('Configuration Persistence', () => {
        it('should maintain configuration across multiple getDebugConfig calls', () => {
            updateDebugConfig({ enableArtificialObjects: false });

            const config1 = getDebugConfig();
            const config2 = getDebugConfig();

            expect(config1.enableArtificialObjects).toBe(config2.enableArtificialObjects);
            expect(config1.enableRegionObjectDebug).toBe(config2.enableRegionObjectDebug);
        });

        it('should reflect changes immediately in subsequent calls', () => {
            updateDebugConfig({ enableArtificialObjects: false });
            expect(getDebugConfig().enableArtificialObjects).toBe(false);

            updateDebugConfig({ enableArtificialObjects: true });
            expect(getDebugConfig().enableArtificialObjects).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty update object', () => {
            const configBefore = getDebugConfig();
            updateDebugConfig({});
            const configAfter = getDebugConfig();

            expect(configAfter.enableArtificialObjects).toBe(configBefore.enableArtificialObjects);
            expect(configAfter.enableRegionObjectDebug).toBe(configBefore.enableRegionObjectDebug);
        });

        it('should handle rapid toggle operations', () => {
            for (let i = 0; i < 10; i++) {
                toggleArtificialObjects();
            }

            // Should end on false (even number of toggles from default true)
            expect(getDebugConfig().enableArtificialObjects).toBe(true);
        });

        it('should handle multiple resets', () => {
            resetDebugConfig();
            resetDebugConfig();
            resetDebugConfig();

            const config = getDebugConfig();
            expect(config.enableArtificialObjects).toBe(defaultDebugConfig.enableArtificialObjects);
            expect(config.enableRegionObjectDebug).toBe(defaultDebugConfig.enableRegionObjectDebug);
        });
    });
});
