// Stellar Map Hover System
// Extracted from stellarmap.ts for better code organization

import type { HoverableObject, HoverConfig } from './StellarMapTypes.js';

export class StellarMapHoverSystem {
    private hoveredObject: HoverableObject | null = null;
    private hoveredObjectType: string | null = null;

    private readonly hoverConfigs: Record<string, HoverConfig> = {
        'planet': { threshold: 15, renderSize: 3, priority: 1 },
        'rogue-planet': { threshold: 15, renderSize: 3, priority: 2 },
        'dark-nebula': { threshold: 18, renderSize: 4, priority: 3 },
        'protostar': { threshold: 20, renderSize: 5, priority: 3.5 },
        'crystal-garden': { threshold: 16, renderSize: 4, priority: 4 },
        'nebula': { threshold: 20, renderSize: 5, priority: 5 },
        'wormhole': { threshold: 12, renderSize: 3, priority: 6 },
        'comet': { threshold: 12, renderSize: 2, priority: 7 },
        'blackhole': { threshold: 15, renderSize: 4, priority: 8 },
        'asteroidGarden': { threshold: 18, renderSize: 4, priority: 9 },
        'celestialStar': { threshold: 10, renderSize: 2, priority: 10 }
    };

    detectHover(mouseX: number, mouseY: number, mapX: number, mapY: number, mapWidth: number, mapHeight: number, 
                worldToMapScale: number, centerX: number, centerY: number, objectCollections: Record<string, HoverableObject[]>): void {
        
        let closestObject: HoverableObject | null = null;
        let closestDistance = Infinity;
        let closestType: string | null = null;

        // Check all object collections in priority order
        const sortedTypes = Object.keys(this.hoverConfigs).sort((a, b) => 
            this.hoverConfigs[a].priority - this.hoverConfigs[b].priority
        );

        for (const objectType of sortedTypes) {
            const objects = objectCollections[objectType];
            if (!objects || objects.length === 0) continue;

            const config = this.hoverConfigs[objectType];

            for (const obj of objects) {
                const objMapX = mapX + mapWidth/2 + (obj.x - centerX) * worldToMapScale;
                const objMapY = mapY + mapHeight/2 + (obj.y - centerY) * worldToMapScale;

                // Check if object is within map bounds
                if (objMapX >= mapX && objMapX <= mapX + mapWidth && 
                    objMapY >= mapY && objMapY <= mapY + mapHeight) {
                    
                    const distance = Math.sqrt((mouseX - objMapX)**2 + (mouseY - objMapY)**2);
                    if (distance <= config.threshold && distance < closestDistance) {
                        closestObject = obj;
                        closestDistance = distance;
                        closestType = objectType;
                    }
                }
            }

            // If we found something at this priority level, stop searching lower priorities
            if (closestObject) break;
        }

        this.hoveredObject = closestObject;
        this.hoveredObjectType = closestType;
    }

    getHoveredObject(): { object: HoverableObject | null, type: string | null } {
        return { object: this.hoveredObject, type: this.hoveredObjectType };
    }

    clearHover(): void {
        this.hoveredObject = null;
        this.hoveredObjectType = null;
    }

    renderHoverEffect(ctx: CanvasRenderingContext2D, mapX: number, mapY: number, mapWidth: number, mapHeight: number, 
                     worldToMapScale: number, centerX: number, centerY: number): void {
        if (!this.hoveredObject || !this.hoveredObjectType) return;

        const config = this.hoverConfigs[this.hoveredObjectType];
        if (!config) return;

        const objMapX = mapX + mapWidth/2 + (this.hoveredObject.x - centerX) * worldToMapScale;
        const objMapY = mapY + mapHeight/2 + (this.hoveredObject.y - centerY) * worldToMapScale;

        // Render hover effect (consistent with existing object hover styles)
        ctx.save();
        ctx.strokeStyle = '#d4a57480'; // Semi-transparent amber like other objects (currentPositionColor + '80')
        ctx.lineWidth = 1;
        ctx.beginPath();
        const hoverRadius = Math.max(5, config.renderSize + 1);
        ctx.arc(objMapX, objMapY, hoverRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}