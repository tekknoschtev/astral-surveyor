// ObjectDiscovery - Handles individual celestial object discovery logic
// Extracted from DiscoveryManager for focused responsibility

import { Camera } from '../camera/camera.js';
import { NamingService } from '../naming/naming.js';
import { generateShareableURL } from '../utils/random.js';
import { SimpleAudioCoordinator } from './SimpleAudioCoordinator.js';
import { DiscoveryDisplay } from '../ui/ui.js';
import { DiscoveryLogbook } from '../ui/discoverylogbook.js';

// Shared interfaces
export interface DiscoveryEntry {
    id: string;
    name: string;
    type: string;
    objectType: 'star' | 'planet' | 'moon' | 'nebula' | 'asteroids' | 'wormhole' | 'blackhole' | 'comet' | 'region' | 'rogue-planet' | 'dark-nebula' | 'crystal-garden' | 'protostar';
    coordinates: { x: number; y: number };
    timestamp: number;
    rarity: 'common' | 'uncommon' | 'rare' | 'ultra-rare';
    notes?: string;
    shareableURL: string;
    metadata: {
        starTypeName?: string;
        planetTypeName?: string;
        nebulaType?: string;
        gardenType?: string;
        blackHoleTypeName?: string;
        regionType?: string;
        regionInfluence?: number;
        isNotable: boolean;
        discoveryRadius?: number;
    };
}

interface CelestialObject {
    type: 'star' | 'planet' | 'moon' | 'nebula' | 'asteroids' | 'wormhole' | 'blackhole' | 'comet' | 'rogue-planet' | 'dark-nebula' | 'crystal-garden' | 'protostar';
    x: number;
    y: number;
    id?: string;
    starTypeName?: string;
    planetTypeName?: string;
    nebulaTypeData?: { name: string };
    wormholeId?: string;
    designation?: 'alpha' | 'beta';
    pairId?: string;
    blackHoleTypeName?: string;
    twinX?: number;
    twinY?: number;
    uniqueId?: string;
    canTraverse?: boolean | ((camera: Camera) => boolean);
    nebulaType?: string;
    gardenType?: string;
    gardenTypeData?: { name: string };
    variant?: string;
    updatePosition?(deltaTime: number): void;
    update?(deltaTime: number): void;
    checkDiscovery?(camera: Camera, canvasWidth: number, canvasHeight: number): boolean;
}

export class ObjectDiscovery {
    private discoveryIdCounter: number = 0;

    constructor(
        private namingService: NamingService,
        private audioCoordinator: SimpleAudioCoordinator,
        private discoveryDisplay: DiscoveryDisplay,
        private discoveryLogbook: DiscoveryLogbook
    ) {}

    /**
     * Process a newly discovered celestial object
     */
    processObjectDiscovery(obj: CelestialObject, camera: Camera): DiscoveryEntry {
        // Use the naming service to generate display name (for test compatibility)
        const objectName = this.namingService.generateDisplayName(obj);
        const objectType = this.getObjectType(obj);
        const isNotable = this.isRareDiscovery(obj);
        const shareableURL = generateShareableURL(obj.x, obj.y);

        const discoveryEntry = this.createDiscoveryEntry(
            obj,
            objectName,
            objectType,
            camera,
            isNotable,
            shareableURL
        );

        // Add to UI displays
        this.discoveryDisplay.addDiscovery(objectName, objectType);
        this.discoveryLogbook.addDiscovery(objectName, objectType);

        // Play discovery sound
        this.audioCoordinator.playDiscoverySound({
            objectType: obj.type,
            starType: obj.starTypeName,
            planetType: obj.planetTypeName,
            nebulaType: obj.nebulaType,
            gardenType: obj.gardenType,
            isRare: isNotable
        });

        // Log discovery
        console.log(`✨ DISCOVERY! ${objectName} - ${objectType}. Share: ${shareableURL}`);

        return discoveryEntry;
    }

    /**
     * Create a detailed discovery entry from a celestial object
     */
    private createDiscoveryEntry(
        obj: CelestialObject,
        objectName: string,
        objectType: string,
        camera: Camera,
        isNotable: boolean,
        shareableURL: string
    ): DiscoveryEntry {
        return {
            id: this.generateDiscoveryId(),
            name: objectName,
            type: objectType,
            objectType: obj.type,
            coordinates: { x: obj.x, y: obj.y },
            timestamp: Date.now(),
            rarity: this.determineRarity(obj),
            shareableURL,
            metadata: {
                starTypeName: obj.starTypeName,
                planetTypeName: obj.planetTypeName,
                nebulaType: obj.nebulaType,
                gardenType: obj.gardenType,
                blackHoleTypeName: obj.blackHoleTypeName,
                isNotable,
                discoveryRadius: this.calculateDiscoveryRadius(obj, camera)
            }
        };
    }

    /**
     * Determine rarity level for a celestial object
     */
    private determineRarity(obj: CelestialObject): 'common' | 'uncommon' | 'rare' | 'ultra-rare' {
        if (obj.type === 'blackhole' || obj.type === 'wormhole') {
            return 'ultra-rare';
        }
        if (obj.type === 'nebula' || obj.type === 'comet') {
            return 'rare';
        }
        if (obj.type === 'moon') {
            return 'uncommon';
        }
        if (obj.type === 'star') {
            const starType = obj.starTypeName;
            if (starType === 'Neutron Star') return 'ultra-rare';
            if (starType === 'White Dwarf' || starType === 'Blue Giant' || starType === 'Red Giant') return 'rare';
            return 'common';
        }
        if (obj.type === 'planet') {
            const planetType = obj.planetTypeName;
            if (planetType === 'Exotic World') return 'ultra-rare';
            if (planetType === 'Volcanic World' || planetType === 'Frozen World') return 'rare';
            return 'common';
        }
        if (obj.type === 'asteroids') {
            const gardenType = obj.gardenType;
            if (gardenType === 'rare_minerals' || gardenType === 'crystalline' || gardenType === 'icy') {
                return 'rare';
            }
            return 'uncommon';
        }
        if (obj.type === 'rogue-planet') {
            const variant = obj.variant || 'rock';
            if (variant === 'volcanic') {
                return 'ultra-rare';
            }
            return 'rare';
        }
        if (obj.type === 'dark-nebula') {
            const variant = obj.variant || 'wispy';
            if (variant === 'dense-core') {
                return 'rare';
            }
            return 'uncommon';
        }
        if (obj.type === 'crystal-garden') {
            const variant = obj.variant || 'mixed';
            if (variant === 'rare-earth') {
                return 'ultra-rare';
            }
            return 'uncommon';
        }
        if (obj.type === 'protostar') {
            const variant = obj.variant || 'class-1';
            if (variant === 'class-2') {
                return 'ultra-rare';
            }
            return 'rare';
        }
        return 'common';
    }

    /**
     * Determine if a celestial object qualifies as a rare discovery
     */
    isRareDiscovery(obj: CelestialObject): boolean {
        const rarity = this.determineRarity(obj);
        return rarity === 'rare' || rarity === 'ultra-rare' || obj.type === 'moon';
    }


    /**
     * Get the display type name for a celestial object
     */
    private getObjectType(obj: CelestialObject): string {
        if (obj.type === 'planet') {
            return obj.planetTypeName || 'Planet';
        } else if (obj.type === 'moon') {
            return 'Moon';
        } else if (obj.type === 'nebula') {
            return ('nebulaTypeData' in obj ? obj.nebulaTypeData?.name : undefined) || 'Nebula';
        } else if (obj.type === 'asteroids') {
            return ('gardenTypeData' in obj && obj.gardenTypeData?.name ? obj.gardenTypeData.name : 'Asteroid Garden');
        } else if (obj.type === 'wormhole') {
            return 'Stable Traversable Wormhole';
        } else if (obj.type === 'blackhole') {
            return obj.blackHoleTypeName || 'Black Hole';
        } else if (obj.type === 'star') {
            return obj.starTypeName || 'Star';
        } else if (obj.type === 'rogue-planet') {
            const variant = obj.variant || 'rock';
            switch (variant) {
                case 'ice': return 'Frozen Rogue Planet';
                case 'volcanic': return 'Volcanic Rogue Planet';
                case 'rock':
                default: return 'Rocky Rogue Planet';
            }
        } else if (obj.type === 'dark-nebula') {
            const variant = obj.variant || 'wispy';
            switch (variant) {
                case 'dense-core': return 'Dense-Core Dark Nebula';
                case 'globular': return 'Globular Dark Nebula';
                case 'wispy':
                default: return 'Wispy Dark Nebula';
            }
        } else if (obj.type === 'crystal-garden') {
            const variant = obj.variant || 'mixed';
            switch (variant) {
                case 'pure': return 'Pure Crystal Garden';
                case 'rare-earth': return 'Rare-Earth Crystal Garden';
                case 'mixed':
                default: return 'Mixed Crystal Garden';
            }
        } else if (obj.type === 'protostar') {
            const variant = obj.variant || 'class-1';
            switch (variant) {
                case 'class-0': return 'Class 0 Protostar';
                case 'class-2': return 'Class II Protostar';
                case 'class-1':
                default: return 'Class I Protostar';
            }
        }
        return 'Unknown';
    }

    /**
     * Calculate approximate discovery radius for metadata
     */
    private calculateDiscoveryRadius(obj: CelestialObject, camera: Camera): number {
        const distance = Math.sqrt((obj.x - camera.x) ** 2 + (obj.y - camera.y) ** 2);
        return Math.round(distance * 100) / 100;
    }

    /**
     * Generate unique discovery ID
     */
    private generateDiscoveryId(): string {
        return `discovery_${++this.discoveryIdCounter}_${Date.now()}`;
    }

    /**
     * Set the discovery counter (for save/load)
     */
    setDiscoveryCounter(counter: number): void {
        this.discoveryIdCounter = counter;
    }

    /**
     * Get the current discovery counter (for save/load)
     */
    getDiscoveryCounter(): number {
        return this.discoveryIdCounter;
    }
}