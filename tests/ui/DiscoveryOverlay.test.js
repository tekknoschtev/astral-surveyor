// Discovery Overlay Tests
// Tests for discovery highlighting, timestamps, and coordinate sharing UI

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DiscoveryOverlay } from '../../dist/ui/stellarmap/DiscoveryOverlay.js';
import { DiscoveryVisualizationService } from '../../dist/services/DiscoveryVisualizationService.js';

describe('DiscoveryOverlay', () => {
    let overlay;
    let mockCtx;
    let mockVisualizationService;
    let mockRenderContext;

    beforeEach(() => {
        // Mock canvas context
        mockCtx = {
            save: vi.fn(),
            restore: vi.fn(),
            beginPath: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
            stroke: vi.fn(),
            fillRect: vi.fn(),
            strokeRect: vi.fn(),
            fillText: vi.fn(),
            measureText: vi.fn(() => ({ width: 100 })),
            setLineDash: vi.fn(),
            translate: vi.fn(),
            rotate: vi.fn()
        };

        // Mock DiscoveryVisualizationService
        mockVisualizationService = new DiscoveryVisualizationService();

        // Create overlay instance
        overlay = new DiscoveryOverlay(mockVisualizationService);

        // Mock render context
        mockRenderContext = {
            ctx: mockCtx,
            mapX: 50,
            mapY: 50,
            mapWidth: 800,
            mapHeight: 600,
            worldToMapScale: 0.1,
            centerX: 0,
            centerY: 0
        };
    });

    describe('Constructor', () => {
        it('should initialize with DiscoveryVisualizationService', () => {
            expect(overlay).toBeDefined();
            expect(overlay.visualizationService).toBe(mockVisualizationService);
        });

        it('should initialize with empty timestamp display state', () => {
            expect(overlay.showTimestamps).toBe(false);
        });

        it('should initialize with coordinate sharing disabled', () => {
            expect(overlay.coordinateShareEnabled).toBe(false);
        });
    });

    describe('renderDiscoveryPulses', () => {
        it('should render discovery pulse for newly discovered star', () => {
            const stars = [
                { x: 100, y: 200, timestamp: Date.now() - 1000, starTypeName: 'G-type' }
            ];

            overlay.renderDiscoveryPulses(mockRenderContext, stars, 'celestialStar');

            expect(mockCtx.save).toHaveBeenCalled();
            expect(mockCtx.restore).toHaveBeenCalled();
        });

        it('should not render pulse for old discoveries', () => {
            const stars = [
                { x: 100, y: 200, timestamp: Date.now() - 100000, starTypeName: 'G-type' }
            ];

            overlay.renderDiscoveryPulses(mockRenderContext, stars, 'celestialStar');

            // Should save/restore but not draw pulse
            expect(mockCtx.save).toHaveBeenCalled();
            expect(mockCtx.restore).toHaveBeenCalled();
        });

        it('should handle objects without timestamps', () => {
            const stars = [
                { x: 100, y: 200, starTypeName: 'G-type' }
            ];

            overlay.renderDiscoveryPulses(mockRenderContext, stars, 'celestialStar');

            expect(mockCtx.save).toHaveBeenCalled();
            expect(mockCtx.restore).toHaveBeenCalled();
        });

        it('should render ultra-rare ongoing pulse for black hole', () => {
            const blackHoles = [
                { x: 100, y: 200, timestamp: Date.now() - 1000, blackHoleTypeName: 'Stellar' }
            ];

            overlay.renderDiscoveryPulses(mockRenderContext, blackHoles, 'black-hole');

            expect(mockCtx.save).toHaveBeenCalled();
            expect(mockCtx.arc).toHaveBeenCalled();
            expect(mockCtx.restore).toHaveBeenCalled();
        });

        it('should filter objects outside map bounds', () => {
            const stars = [
                { x: -10000, y: -10000, timestamp: Date.now() - 1000, starTypeName: 'G-type' }
            ];

            overlay.renderDiscoveryPulses(mockRenderContext, stars, 'celestialStar');

            // Should not draw anything for out-of-bounds objects
            expect(mockCtx.arc).not.toHaveBeenCalled();
        });
    });

    describe('renderTimestamps', () => {
        beforeEach(() => {
            overlay.showTimestamps = true;
        });

        it('should render timestamp for discovered object', () => {
            const timestamp = Date.now() - 5000; // 5 seconds ago
            const objects = [
                { x: 100, y: 200, timestamp, starTypeName: 'G-type' }
            ];

            overlay.renderTimestamps(mockRenderContext, objects);

            expect(mockCtx.fillText).toHaveBeenCalled();
            const callArgs = mockCtx.fillText.mock.calls[0];
            expect(callArgs[0]).toMatch(/ago/); // Should contain "ago" in relative time
        });

        it('should not render timestamps when disabled', () => {
            overlay.showTimestamps = false;
            const objects = [
                { x: 100, y: 200, timestamp: Date.now(), starTypeName: 'G-type' }
            ];

            overlay.renderTimestamps(mockRenderContext, objects);

            expect(mockCtx.fillText).not.toHaveBeenCalled();
        });

        it('should format recent timestamps as "just now"', () => {
            const objects = [
                { x: 100, y: 200, timestamp: Date.now() - 100, starTypeName: 'G-type' }
            ];

            overlay.renderTimestamps(mockRenderContext, objects);

            const callArgs = mockCtx.fillText.mock.calls[0];
            expect(callArgs[0]).toBe('just now');
        });

        it('should format timestamps in seconds', () => {
            const objects = [
                { x: 100, y: 200, timestamp: Date.now() - 30000, starTypeName: 'G-type' }
            ];

            overlay.renderTimestamps(mockRenderContext, objects);

            const callArgs = mockCtx.fillText.mock.calls[0];
            expect(callArgs[0]).toMatch(/30s ago/);
        });

        it('should format timestamps in minutes', () => {
            const objects = [
                { x: 100, y: 200, timestamp: Date.now() - 120000, starTypeName: 'G-type' }
            ];

            overlay.renderTimestamps(mockRenderContext, objects);

            const callArgs = mockCtx.fillText.mock.calls[0];
            expect(callArgs[0]).toMatch(/2m ago/);
        });

        it('should skip objects without timestamps', () => {
            const objects = [
                { x: 100, y: 200, starTypeName: 'G-type' }
            ];

            overlay.renderTimestamps(mockRenderContext, objects);

            expect(mockCtx.fillText).not.toHaveBeenCalled();
        });
    });

    describe('renderCoordinateShareUI', () => {
        beforeEach(() => {
            overlay.coordinateShareEnabled = true;
        });

        it('should render coordinate share button when object selected', () => {
            const selectedObject = { x: 100, y: 200, starTypeName: 'G-type' };

            overlay.renderCoordinateShareUI(mockRenderContext, selectedObject);

            expect(mockCtx.fillRect).toHaveBeenCalled();
            expect(mockCtx.fillText).toHaveBeenCalled();
        });

        it('should not render UI when coordinate sharing disabled', () => {
            overlay.coordinateShareEnabled = false;
            const selectedObject = { x: 100, y: 200, starTypeName: 'G-type' };

            overlay.renderCoordinateShareUI(mockRenderContext, selectedObject);

            expect(mockCtx.fillRect).not.toHaveBeenCalled();
        });

        it('should not render UI when no object selected', () => {
            overlay.renderCoordinateShareUI(mockRenderContext, null);

            expect(mockCtx.fillRect).not.toHaveBeenCalled();
        });

        it('should display object coordinates in UI', () => {
            const selectedObject = { x: 1234, y: 5678, starTypeName: 'G-type' };

            overlay.renderCoordinateShareUI(mockRenderContext, selectedObject);

            const textCalls = mockCtx.fillText.mock.calls;
            const coordText = textCalls.find(call => call[0].includes('1234') && call[0].includes('5678'));
            expect(coordText).toBeDefined();
        });
    });

    describe('getFormattedTimestamp', () => {
        it('should return "just now" for very recent discoveries', () => {
            const timestamp = Date.now() - 500;
            const formatted = overlay.getFormattedTimestamp(timestamp);
            expect(formatted).toBe('just now');
        });

        it('should format seconds correctly', () => {
            const timestamp = Date.now() - 45000; // 45 seconds
            const formatted = overlay.getFormattedTimestamp(timestamp);
            expect(formatted).toBe('45s ago');
        });

        it('should format minutes correctly', () => {
            const timestamp = Date.now() - 180000; // 3 minutes
            const formatted = overlay.getFormattedTimestamp(timestamp);
            expect(formatted).toBe('3m ago');
        });

        it('should format hours correctly', () => {
            const timestamp = Date.now() - 7200000; // 2 hours
            const formatted = overlay.getFormattedTimestamp(timestamp);
            expect(formatted).toBe('2h ago');
        });

        it('should format days correctly', () => {
            const timestamp = Date.now() - 172800000; // 2 days
            const formatted = overlay.getFormattedTimestamp(timestamp);
            expect(formatted).toBe('2d ago');
        });
    });

    describe('toggleTimestampDisplay', () => {
        it('should toggle timestamps on', () => {
            overlay.showTimestamps = false;
            overlay.toggleTimestampDisplay();
            expect(overlay.showTimestamps).toBe(true);
        });

        it('should toggle timestamps off', () => {
            overlay.showTimestamps = true;
            overlay.toggleTimestampDisplay();
            expect(overlay.showTimestamps).toBe(false);
        });
    });

    describe('toggleCoordinateSharing', () => {
        it('should toggle coordinate sharing on', () => {
            overlay.coordinateShareEnabled = false;
            overlay.toggleCoordinateSharing();
            expect(overlay.coordinateShareEnabled).toBe(true);
        });

        it('should toggle coordinate sharing off', () => {
            overlay.coordinateShareEnabled = true;
            overlay.toggleCoordinateSharing();
            expect(overlay.coordinateShareEnabled).toBe(false);
        });
    });

    describe('getCoordinateShareText', () => {
        it('should format coordinate share text for star', () => {
            const object = { x: 1234, y: 5678, starTypeName: 'G-type' };
            const text = overlay.getCoordinateShareText(object);
            expect(text).toContain('1234');
            expect(text).toContain('5678');
        });

        it('should include object type in share text', () => {
            const object = { x: 100, y: 200, blackHoleTypeName: 'Stellar' };
            const text = overlay.getCoordinateShareText(object, 'black-hole');
            expect(text).toContain('black-hole');
        });

        it('should format negative coordinates correctly', () => {
            const object = { x: -1234, y: -5678, starTypeName: 'G-type' };
            const text = overlay.getCoordinateShareText(object);
            expect(text).toContain('-1234');
            expect(text).toContain('-5678');
        });
    });

    describe('Integration with DiscoveryVisualizationService', () => {
        it('should use visualization service for rarity-based pulses', () => {
            const blackHoles = [
                { x: 100, y: 200, timestamp: Date.now() - 1000, blackHoleTypeName: 'Stellar' }
            ];

            const spy = vi.spyOn(mockVisualizationService, 'getDiscoveryIndicatorData');

            overlay.renderDiscoveryPulses(mockRenderContext, blackHoles, 'black-hole');

            expect(spy).toHaveBeenCalled();
        });

        it('should render ongoing pulse for ultra-rare objects', () => {
            const wormholes = [
                { x: 100, y: 200, timestamp: Date.now() - 10000, wormholeId: 'wh-1' }
            ];

            overlay.renderDiscoveryPulses(mockRenderContext, wormholes, 'wormhole');

            // Should render ongoing pulse for ultra-rare wormhole
            expect(mockCtx.arc).toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty object arrays', () => {
            expect(() => {
                overlay.renderDiscoveryPulses(mockRenderContext, [], 'celestialStar');
            }).not.toThrow();
        });

        it('should handle null timestamp gracefully', () => {
            const objects = [{ x: 100, y: 200, timestamp: null }];
            expect(() => {
                overlay.renderTimestamps(mockRenderContext, objects);
            }).not.toThrow();
        });

        it('should handle undefined timestamp gracefully', () => {
            const objects = [{ x: 100, y: 200, timestamp: undefined }];
            expect(() => {
                overlay.renderTimestamps(mockRenderContext, objects);
            }).not.toThrow();
        });

        it('should handle objects without coordinates', () => {
            const objects = [{ timestamp: Date.now() }];
            expect(() => {
                overlay.renderDiscoveryPulses(mockRenderContext, objects, 'celestialStar');
            }).not.toThrow();
        });
    });
});
