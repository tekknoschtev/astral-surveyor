// Types and interfaces basic test coverage
import { describe, it, expect } from 'vitest';

// Import type files to ensure they compile and export correctly
import * as CelestialTypes from '../../dist/types/CelestialTypes.js';
import * as GameStateTypes from '../../dist/types/GameState.js';
import * as PluginTypes from '../../dist/types/PluginTypes.js';
import * as RendererTypes from '../../dist/types/RendererTypes.js';
import * as UITypes from '../../dist/types/UITypes.js';
import * as DiscoveryVisualizationTypes from '../../dist/types/DiscoveryVisualizationTypes.js';

describe('Type Definitions', () => {
    describe('CelestialTypes', () => {
        it('should export CelestialTypes module', () => {
            expect(CelestialTypes).toBeDefined();
            expect(typeof CelestialTypes).toBe('object');
        });
    });

    describe('GameState Types', () => {
        it('should export GameState types module', () => {
            expect(GameStateTypes).toBeDefined();
            expect(typeof GameStateTypes).toBe('object');
        });
    });

    describe('Plugin Types', () => {
        it('should export PluginTypes module', () => {
            expect(PluginTypes).toBeDefined();
            expect(typeof PluginTypes).toBe('object');
        });
    });

    describe('Renderer Types', () => {
        it('should export RendererTypes module', () => {
            expect(RendererTypes).toBeDefined();
            expect(typeof RendererTypes).toBe('object');
        });
    });

    describe('UI Types', () => {
        it('should export UITypes module', () => {
            expect(UITypes).toBeDefined();
            expect(typeof UITypes).toBe('object');
        });
    });

    describe('DiscoveryVisualization Types', () => {
        it('should export DiscoveryVisualizationTypes module', () => {
            expect(DiscoveryVisualizationTypes).toBeDefined();
            expect(typeof DiscoveryVisualizationTypes).toBe('object');
        });
    });
});