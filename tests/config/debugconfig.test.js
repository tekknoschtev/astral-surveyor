// Debug Configuration Tests
// Tests the debug configuration system for region-specific objects

import { describe, it, expect, beforeEach } from 'vitest';
import {
    getDebugConfig,
    updateDebugConfig,
    toggleArtificialObjects,
    resetDebugConfig,
    defaultDebugConfig
} from '../../dist/config/debugConfig.js';

describe('Debug Configuration', () => {
    beforeEach(() => {
        // Reset config to defaults before each test
        resetDebugConfig();
    });

    describe('Default Configuration', () => {
        it('should have correct default values', () => {
            const config = getDebugConfig();

            expect(config.enableArtificialObjects).toBe(true);
            expect(config.enableRegionObjectDebug).toBe(true);
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
});
