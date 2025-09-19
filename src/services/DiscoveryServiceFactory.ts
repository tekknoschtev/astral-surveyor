// DiscoveryServiceFactory - Creates the simplified discovery service with all dependencies
// Replaces complex dependency injection with simple factory pattern

import { NamingService } from '../naming/naming.js';
import { SoundManager } from '../audio/soundmanager.js';
import { DiscoveryDisplay } from '../ui/ui.js';
import { DiscoveryLogbook } from '../ui/discoverylogbook.js';

import { SimpleAudioCoordinator } from './SimpleAudioCoordinator.js';
import { ObjectDiscovery } from './ObjectDiscovery.js';
import { RegionDiscovery } from './RegionDiscovery.js';
import { DiscoveryStats } from './DiscoveryStats.js';
import { BlackHoleWarnings } from './BlackHoleWarnings.js';
import { SimplifiedDiscoveryService } from './SimplifiedDiscoveryService.js';

export function createDiscoveryService(
    namingService: NamingService,
    soundManager: SoundManager,
    discoveryDisplay: DiscoveryDisplay,
    discoveryLogbook: DiscoveryLogbook
): SimplifiedDiscoveryService {

    // Create coordinating services
    const audioCoordinator = new SimpleAudioCoordinator(soundManager);

    // Create focused discovery classes
    const objectDiscovery = new ObjectDiscovery(
        namingService,
        audioCoordinator,
        discoveryDisplay,
        discoveryLogbook
    );

    const regionDiscovery = new RegionDiscovery(
        audioCoordinator,
        discoveryDisplay,
        discoveryLogbook
    );

    const discoveryStats = new DiscoveryStats();
    const blackHoleWarnings = new BlackHoleWarnings(discoveryDisplay);

    // Create the main service
    return new SimplifiedDiscoveryService(
        objectDiscovery,
        regionDiscovery,
        discoveryStats,
        blackHoleWarnings
    );
}