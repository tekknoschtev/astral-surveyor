// InspectorModeController Tests
// Tests for seed inspection, chunk revelation, and statistics tracking

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InspectorModeController } from '../../dist/ui/stellarmap/InspectorModeController.js';

describe('InspectorModeController', () => {
    let controller;
    let mockInspectorService;

    beforeEach(() => {
        controller = new InspectorModeController();

        mockInspectorService = {
            getRegionObjects: vi.fn()
        };
    });

    describe('Constructor', () => {
        it('should initialize with default state', () => {
            expect(controller.inspectorMode).toBe(false);
            expect(controller.inspectorSeed).toBeNull();
            expect(controller.inspectorZoomExtended).toBe(false);
            expect(controller.inspectorObjects).toEqual([]);
        });

        it('should not have inspector service initialized', () => {
            expect(() => controller.enableInspectorMode(12345)).rejects.toThrow('Inspector service not initialized');
        });
    });

    describe('Inspector Mode Lifecycle', () => {
        beforeEach(() => {
            controller.initInspectorMode(mockInspectorService);
        });

        it('should initialize inspector service', () => {
            expect(controller.inspectorService).toBe(mockInspectorService);
        });

        it('should enable inspector mode with seed', async () => {
            await controller.enableInspectorMode(12345);

            expect(controller.inspectorMode).toBe(true);
            expect(controller.inspectorSeed).toBe(12345);
            expect(controller.inspectorZoomExtended).toBe(true);
        });

        it('should disable inspector mode', async () => {
            await controller.enableInspectorMode(12345);
            controller.disableInspectorMode();

            expect(controller.inspectorMode).toBe(false);
            expect(controller.inspectorSeed).toBeNull();
            expect(controller.inspectorZoomExtended).toBe(false);
            expect(controller.inspectorObjects).toEqual([]);
        });

        it('should toggle inspector mode on and off', async () => {
            await controller.enableInspectorMode(12345);
            expect(controller.inspectorMode).toBe(true);

            controller.toggleInspectorMode();
            expect(controller.inspectorMode).toBe(false);

            await controller.toggleInspectorMode();
            expect(controller.inspectorMode).toBe(true);
        });

        it('should report inspector mode status', async () => {
            expect(controller.isInspectorMode()).toBe(false);

            await controller.enableInspectorMode(12345);
            expect(controller.isInspectorMode()).toBe(true);

            controller.disableInspectorMode();
            expect(controller.isInspectorMode()).toBe(false);
        });
    });

    describe('Chunk Revelation System', () => {
        beforeEach(() => {
            controller.initInspectorMode(mockInspectorService);
        });

        it('should track revealed chunks per seed', () => {
            const objects1 = [{ x: 100, y: 200, type: 'celestialStar' }];
            const objects2 = [{ x: 300, y: 400, type: 'planet' }];

            controller.addRevealedChunk(12345, 0, 0, objects1);
            controller.addRevealedChunk(12345, 1, 0, objects2);

            const revealed = controller.getRevealedObjects(12345);
            expect(revealed).toHaveLength(2);
        });

        it('should separate revealed chunks by seed', () => {
            const objects1 = [{ x: 100, y: 200, type: 'celestialStar' }];
            const objects2 = [{ x: 300, y: 400, type: 'planet' }];

            controller.addRevealedChunk(12345, 0, 0, objects1);
            controller.addRevealedChunk(67890, 0, 0, objects2);

            const revealed1 = controller.getRevealedObjects(12345);
            const revealed2 = controller.getRevealedObjects(67890);

            expect(revealed1).toHaveLength(1);
            expect(revealed2).toHaveLength(1);
            expect(revealed1[0].x).toBe(100);
            expect(revealed2[0].x).toBe(300);
        });

        it('should not duplicate chunks', () => {
            const objects = [{ x: 100, y: 200, type: 'celestialStar' }];

            controller.addRevealedChunk(12345, 0, 0, objects);
            controller.addRevealedChunk(12345, 0, 0, objects); // Same chunk

            const revealed = controller.getRevealedObjects(12345);
            expect(revealed).toHaveLength(1); // Should only have one object
        });

        it('should count revealed chunks correctly', () => {
            controller.addRevealedChunk(12345, 0, 0, []);
            controller.addRevealedChunk(12345, 1, 0, []);
            controller.addRevealedChunk(12345, 0, 1, []);

            expect(controller.getRevealedChunkCount(12345)).toBe(3);
        });

        it('should return 0 for unrevealed seed', () => {
            expect(controller.getRevealedChunkCount(99999)).toBe(0);
        });
    });

    describe('Statistics Tracking', () => {
        beforeEach(() => {
            controller.initInspectorMode(mockInspectorService);
        });

        it('should track object type statistics', async () => {
            const objects = [
                { x: 100, y: 200, type: 'celestialStar' },
                { x: 200, y: 300, type: 'celestialStar' },
                { x: 300, y: 400, type: 'planet' }
            ];

            controller.addRevealedChunk(12345, 0, 0, objects);
            await controller.enableInspectorMode(12345);
            await controller.updateViewStatistics();

            const stats = controller.getStatistics();
            expect(stats.celestialStar).toBe(2);
            expect(stats.planet).toBe(1);
        });

        it('should update statistics when revealing new chunks', async () => {
            await controller.enableInspectorMode(12345);

            controller.addRevealedChunk(12345, 0, 0, [
                { x: 100, y: 200, type: 'celestialStar' }
            ]);
            await controller.updateViewStatistics();
            expect(controller.getStatistics().celestialStar).toBe(1);

            controller.addRevealedChunk(12345, 1, 0, [
                { x: 200, y: 300, type: 'celestialStar' }
            ]);
            await controller.updateViewStatistics();
            expect(controller.getStatistics().celestialStar).toBe(2);
        });
    });

    describe('Object Color Mapping', () => {
        it('should return correct colors for object types', () => {
            expect(controller.getInspectorObjectColor('celestialStar')).toBe('#ffdd88');
            expect(controller.getInspectorObjectColor('planet')).toBe('#88aa88');
            expect(controller.getInspectorObjectColor('nebula')).toBe('#ff88cc');
            expect(controller.getInspectorObjectColor('wormhole')).toBe('#8844ff');
            expect(controller.getInspectorObjectColor('blackhole')).toBe('#ff0000');
            expect(controller.getInspectorObjectColor('unknown')).toBe('#ffffff');
        });
    });

    describe('Edge Cases', () => {
        it('should handle enabling inspector mode without service', async () => {
            await expect(controller.enableInspectorMode(12345))
                .rejects.toThrow('Inspector service not initialized');
        });

        it('should handle toggle without prior enable', async () => {
            controller.initInspectorMode(mockInspectorService);

            // First toggle should do nothing (no seed to re-enable)
            await controller.toggleInspectorMode();
            expect(controller.inspectorMode).toBe(false);
        });

        it('should handle getting objects for non-existent seed', () => {
            const objects = controller.getRevealedObjects(99999);
            expect(objects).toEqual([]);
        });

        it('should handle statistics for seed with no objects', async () => {
            controller.initInspectorMode(mockInspectorService);
            await controller.enableInspectorMode(12345);
            await controller.updateViewStatistics();

            const stats = controller.getStatistics();
            expect(Object.keys(stats).length).toBeGreaterThanOrEqual(0);
        });
    });
});
