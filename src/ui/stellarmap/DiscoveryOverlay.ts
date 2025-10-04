// Discovery Overlay Renderer
// Handles discovery highlighting, timestamps, and coordinate sharing UI

import { BaseRenderer } from './renderers/BaseRenderer.js';
import type { MapRenderContext } from './StellarMapTypes.js';
import type { DiscoveryVisualizationService } from '../../services/DiscoveryVisualizationService.js';

interface DiscoverableObject {
    x: number;
    y: number;
    timestamp?: number;
    [key: string]: any;
}

export class DiscoveryOverlay extends BaseRenderer {
    public showTimestamps: boolean = false;
    public coordinateShareEnabled: boolean = false;
    public visualizationService: DiscoveryVisualizationService;

    constructor(visualizationService: DiscoveryVisualizationService) {
        super();
        this.visualizationService = visualizationService;
    }

    /**
     * Render discovery pulse animations for newly discovered objects
     */
    renderDiscoveryPulses(
        context: MapRenderContext,
        objects: DiscoverableObject[],
        objectType: string
    ): void {
        if (!objects || objects.length === 0) return;

        const currentTime = Date.now();
        const ctx = context.ctx;

        ctx.save();

        for (const obj of objects) {
            if (!obj.x || !obj.y) continue;

            // Convert world coordinates to map coordinates
            const mapCoords = this.worldToMapCoords(obj.x, obj.y, context);

            // Skip if outside bounds
            if (!this.isInBounds(mapCoords.x, mapCoords.y, context, 50)) continue;

            // Get discovery indicator data from visualization service
            const rarity = this.visualizationService.getObjectRarity(objectType);
            const baseRadius = this.getObjectBaseRadius(objectType, context.worldToMapScale);

            const indicatorData = this.visualizationService.getDiscoveryIndicatorData(
                this.getObjectId(obj, objectType),
                {
                    x: obj.x,
                    y: obj.y,
                    rarity,
                    objectType,
                    currentTime,
                    discoveryTimestamp: obj.timestamp,
                    baseRadius
                }
            );

            // Render discovery pulse (one-time effect)
            if (indicatorData.discoveryPulse?.isVisible) {
                this.renderPulse(
                    ctx,
                    mapCoords.x,
                    mapCoords.y,
                    indicatorData.discoveryPulse.radius,
                    indicatorData.discoveryPulse.opacity,
                    indicatorData.config.pulseColor
                );
            }

            // Render ongoing pulse (continuous effect for ultra-rare objects)
            if (indicatorData.ongoingPulse?.isVisible) {
                this.renderPulse(
                    ctx,
                    mapCoords.x,
                    mapCoords.y,
                    indicatorData.ongoingPulse.radius,
                    indicatorData.ongoingPulse.opacity,
                    indicatorData.config.pulseColor
                );
            }
        }

        ctx.restore();
    }

    /**
     * Render discovery timestamps for objects
     */
    renderTimestamps(
        context: MapRenderContext,
        objects: DiscoverableObject[]
    ): void {
        if (!this.showTimestamps || !objects || objects.length === 0) return;

        const ctx = context.ctx;
        ctx.save();

        ctx.font = '10px "Courier New", monospace';
        ctx.textAlign = 'center';

        for (const obj of objects) {
            if (!obj.timestamp || !obj.x || !obj.y) continue;

            const mapCoords = this.worldToMapCoords(obj.x, obj.y, context);

            if (!this.isInBounds(mapCoords.x, mapCoords.y, context)) continue;

            const timeText = this.getFormattedTimestamp(obj.timestamp);

            ctx.fillStyle = 'rgba(212, 165, 116, 0.7)';
            ctx.fillText(timeText, mapCoords.x, mapCoords.y - 15);
        }

        ctx.restore();
    }

    /**
     * Render coordinate sharing UI overlay
     */
    renderCoordinateShareUI(
        context: MapRenderContext,
        selectedObject: DiscoverableObject | null
    ): void {
        if (!this.coordinateShareEnabled || !selectedObject) return;

        const ctx = context.ctx;
        ctx.save();

        // Draw coordinate share button/panel
        const panelWidth = 250;
        const panelHeight = 80;
        const panelX = context.mapX + context.mapWidth - panelWidth - 20;
        const panelY = context.mapY + 20;

        // Background panel
        ctx.fillStyle = 'rgba(20, 20, 30, 0.9)';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

        // Border
        ctx.strokeStyle = '#d4a574';
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

        // Title
        ctx.font = 'bold 12px "Courier New", monospace';
        ctx.fillStyle = '#d4a574';
        ctx.textAlign = 'left';
        ctx.fillText('Share Coordinates', panelX + 10, panelY + 20);

        // Coordinates
        ctx.font = '11px "Courier New", monospace';
        ctx.fillStyle = '#c0c0c0';
        const coordText = `X: ${Math.round(selectedObject.x)}, Y: ${Math.round(selectedObject.y)}`;
        ctx.fillText(coordText, panelX + 10, panelY + 45);

        // Copy button hint
        ctx.font = '10px "Courier New", monospace';
        ctx.fillStyle = 'rgba(212, 165, 116, 0.7)';
        ctx.fillText('[Click to copy]', panelX + 10, panelY + 65);

        ctx.restore();
    }

    /**
     * Get formatted timestamp string
     */
    getFormattedTimestamp(timestamp: number): string {
        const now = Date.now();
        const diff = now - timestamp;

        if (diff < 1000) return 'just now';

        const seconds = Math.floor(diff / 1000);
        if (seconds < 60) return `${seconds}s ago`;

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;

        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    /**
     * Toggle timestamp display
     */
    toggleTimestampDisplay(): void {
        this.showTimestamps = !this.showTimestamps;
    }

    /**
     * Toggle coordinate sharing UI
     */
    toggleCoordinateSharing(): void {
        this.coordinateShareEnabled = !this.coordinateShareEnabled;
    }

    /**
     * Get coordinate share text for an object
     */
    getCoordinateShareText(obj: DiscoverableObject, objectType?: string): string {
        const typeText = objectType ? `[${objectType}] ` : '';
        return `${typeText}X: ${Math.round(obj.x)}, Y: ${Math.round(obj.y)}`;
    }

    /**
     * Render a pulse effect
     */
    private renderPulse(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        radius: number,
        opacity: number,
        color: string
    ): void {
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Get object ID for tracking animation state
     */
    private getObjectId(obj: DiscoverableObject, objectType: string): string {
        return `${objectType}-${obj.x}-${obj.y}`;
    }

    /**
     * Get base radius for object type
     */
    private getObjectBaseRadius(objectType: string, scale: number): number {
        // Base radii for different object types (in map coordinates)
        const baseRadii: Record<string, number> = {
            'celestialStar': 3,
            'planet': 2,
            'nebula': 8,
            'wormhole': 5,
            'black-hole': 5,
            'comet': 3,
            'asteroidGarden': 4,
            'rogue-planet': 2.5,
            'dark-nebula': 7,
            'crystal-garden': 3.5,
            'protostar': 4
        };

        return (baseRadii[objectType] || 3) * Math.min(scale * 10, 1);
    }
}
