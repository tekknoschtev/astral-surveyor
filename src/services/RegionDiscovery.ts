// RegionDiscovery - Handles cosmic region discovery logic
// Extracted from DiscoveryManager for focused responsibility

import { Camera } from '../camera/camera.js';
import { generateShareableURL } from '../utils/random.js';
import { SimpleAudioCoordinator } from './SimpleAudioCoordinator.js';
import { DiscoveryDisplay } from '../ui/ui.js';
import { DiscoveryLogbook } from '../ui/discoverylogbook.js';
import { DiscoveryEntry } from './ObjectDiscovery.js';

export class RegionDiscovery {
    constructor(
        private audioCoordinator: SimpleAudioCoordinator,
        private discoveryDisplay: DiscoveryDisplay,
        private discoveryLogbook: DiscoveryLogbook
    ) {}

    /**
     * Process a newly discovered region
     */
    processRegionDiscovery(
        regionType: string,
        regionName: string,
        camera: Camera,
        influence: number,
        chunkManager?: any
    ): DiscoveryEntry {
        const shareableURL = generateShareableURL(camera.x, camera.y);
        const discoveryEntry = this.createRegionDiscoveryEntry(
            regionType,
            regionName,
            camera,
            influence,
            shareableURL
        );

        // Mark region as discovered in chunk manager
        if (chunkManager && chunkManager.markRegionDiscovered) {
            chunkManager.markRegionDiscovered(regionType, regionName, camera.x, camera.y, influence);
        }

        // Add to UI displays
        this.discoveryDisplay.addDiscovery(regionName, 'Cosmic Region');
        this.discoveryLogbook.addDiscovery(regionName, 'Cosmic Region');

        // Play discovery sound
        this.audioCoordinator.playRegionDiscoverySound();

        // Log region discovery
        console.log(`🌌 REGION DISCOVERY! You have entered ${regionName}. Share: ${shareableURL}`);

        return discoveryEntry;
    }

    /**
     * Create a detailed discovery entry for a region
     */
    private createRegionDiscoveryEntry(
        regionType: string,
        regionName: string,
        camera: Camera,
        influence: number,
        shareableURL: string
    ): DiscoveryEntry {
        return {
            id: `region_${regionType}`,
            name: regionName,
            type: 'Cosmic Region',
            objectType: 'region',
            coordinates: { x: camera.x, y: camera.y },
            timestamp: Date.now(),
            rarity: 'uncommon', // Regions are uncommon discoveries
            shareableURL,
            metadata: {
                regionType: regionType,
                regionInfluence: influence,
                isNotable: influence > 0.8, // High influence regions are notable
                discoveryRadius: 0 // Regions don't have discovery radius
            }
        };
    }
}