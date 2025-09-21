// SimplifiedDiscoveryService - Coordinates focused discovery classes
// Replaces the monolithic DiscoveryManager with composition

import { Camera } from '../camera/camera.js';
import { ObjectDiscovery, DiscoveryEntry } from './ObjectDiscovery.js';
import { RegionDiscovery } from './RegionDiscovery.js';
import { DiscoveryStats, DiscoveryFilter, DiscoveryStatistics } from './DiscoveryStats.js';
import { BlackHoleWarnings } from './BlackHoleWarnings.js';

interface CelestialObject {
    type: 'star' | 'planet' | 'moon' | 'nebula' | 'asteroids' | 'wormhole' | 'blackhole' | 'comet' | 'rogue-planet' | 'dark-nebula' | 'crystal-garden' | 'protostar';
    x: number;
    y: number;
    [key: string]: any;
}

export class SimplifiedDiscoveryService {
    private discoveries = new Map<string, DiscoveryEntry>();

    constructor(
        private objectDiscovery: ObjectDiscovery,
        private regionDiscovery: RegionDiscovery,
        private discoveryStats: DiscoveryStats,
        private blackHoleWarnings: BlackHoleWarnings
    ) {}

    /**
     * Process a newly discovered celestial object
     */
    processObjectDiscovery(obj: CelestialObject, camera: Camera): DiscoveryEntry {
        const discoveryEntry = this.objectDiscovery.processObjectDiscovery(obj, camera);
        this.discoveries.set(discoveryEntry.id, discoveryEntry);
        return discoveryEntry;
    }

    /**
     * Process a newly discovered region
     */
    processRegionDiscovery(
        regionType: string,
        regionName: string,
        camera: Camera,
        influence: number,
        chunkManager?: any
    ): void {
        // Check if this region has already been discovered
        const regionId = `region_${regionType}`;
        if (this.discoveries.has(regionId)) {
            return; // Already discovered
        }

        const discoveryEntry = this.regionDiscovery.processRegionDiscovery(
            regionType,
            regionName,
            camera,
            influence,
            chunkManager
        );
        this.discoveries.set(discoveryEntry.id, discoveryEntry);
    }

    /**
     * Display black hole proximity warnings
     */
    displayBlackHoleWarning(
        message: string,
        warningLevel: number,
        isPastEventHorizon: boolean,
        blackHoleId: string
    ): void {
        this.blackHoleWarnings.displayBlackHoleWarning(
            message,
            warningLevel,
            isPastEventHorizon,
            blackHoleId
        );
    }

    /**
     * Get all discoveries, optionally filtered
     */
    getDiscoveries(filter?: DiscoveryFilter): DiscoveryEntry[] {
        const discoveries = Array.from(this.discoveries.values());
        return this.discoveryStats.filterDiscoveries(discoveries, filter);
    }

    /**
     * Get discovery statistics
     */
    getStatistics(): DiscoveryStatistics {
        const discoveries = Array.from(this.discoveries.values());
        return this.discoveryStats.generateStatistics(discoveries);
    }

    /**
     * Add or update notes for a discovery
     */
    addDiscoveryNotes(discoveryId: string, notes: string): boolean {
        const discovery = this.discoveries.get(discoveryId);
        if (discovery) {
            discovery.notes = notes;
            return true;
        }
        return false;
    }

    /**
     * Get discovery by ID
     */
    getDiscoveryById(discoveryId: string): DiscoveryEntry | undefined {
        return this.discoveries.get(discoveryId);
    }

    /**
     * Export discovery data for save/load integration
     */
    exportDiscoveryData(): { discoveries: DiscoveryEntry[], idCounter: number } {
        return {
            discoveries: Array.from(this.discoveries.values()),
            idCounter: this.objectDiscovery.getDiscoveryCounter()
        };
    }

    /**
     * Import discovery data from save/load system
     */
    importDiscoveryData(data: { discoveries: DiscoveryEntry[], idCounter: number }): void {
        this.discoveries.clear();
        this.objectDiscovery.setDiscoveryCounter(data.idCounter || 0);

        for (const discovery of data.discoveries) {
            this.discoveries.set(discovery.id, discovery);
        }
    }

    /**
     * Clear all discoveries (for new game)
     */
    clearDiscoveries(): void {
        this.discoveries.clear();
        this.objectDiscovery.setDiscoveryCounter(0);
        this.blackHoleWarnings.clearWarnings();
    }

    /**
     * Clear black hole warnings (for test compatibility)
     */
    clearWarnings(): void {
        this.blackHoleWarnings.clearWarnings();
    }
}