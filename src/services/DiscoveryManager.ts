// Discovery Manager - extracted from game.ts
// Handles discovery logic, rare discovery detection, and discovery sound coordination

import { Camera } from '../camera/camera.js';
import { SoundManager } from '../audio/soundmanager.js';
import { DiscoveryDisplay } from '../ui/ui.js';
import { DiscoveryLogbook } from '../ui/discoverylogbook.js';
import { NamingService } from '../naming/naming.js';
import { generateShareableURL } from '../utils/random.js';

// Enhanced discovery data structure with metadata
export interface DiscoveryEntry {
    id: string;
    name: string;
    type: string;
    objectType: 'star' | 'planet' | 'moon' | 'nebula' | 'asteroids' | 'wormhole' | 'blackhole' | 'comet' | 'region' | 'rogue-planet' | 'dark-nebula' | 'crystal-garden';
    coordinates: {
        x: number;
        y: number;
    };
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

// Discovery categories for filtering
export type DiscoveryCategory = 'all' | 'stellar' | 'planetary' | 'exotic' | 'rare' | 'notable';

// Discovery statistics interface
export interface DiscoveryStatistics {
    totalDiscoveries: number;
    byType: Record<string, number>;
    byRarity: Record<string, number>;
    byCategory: Record<DiscoveryCategory, number>;
    rareDiscoveryCount: number;
    notableDiscoveryCount: number;
    firstDiscoveryTimestamp?: number;
    lastDiscoveryTimestamp?: number;
}

// Discovery filter options
export interface DiscoveryFilter {
    category?: DiscoveryCategory;
    rarity?: 'common' | 'uncommon' | 'rare' | 'ultra-rare';
    objectType?: 'star' | 'planet' | 'moon' | 'nebula' | 'asteroids' | 'wormhole' | 'blackhole' | 'comet' | 'rogue-planet' | 'dark-nebula' | 'crystal-garden';
    hasNotes?: boolean;
    dateRange?: {
        start: number;
        end: number;
    };
}

// Interface for celestial objects in discovery context
interface CelestialObject {
    type: 'star' | 'planet' | 'moon' | 'nebula' | 'asteroids' | 'wormhole' | 'blackhole' | 'comet' | 'rogue-planet' | 'dark-nebula' | 'crystal-garden';
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
    variant?: string; // For region-specific objects (rogue planets, dark nebulae, crystal gardens)
    updatePosition?(deltaTime: number): void;
    update?(deltaTime: number): void;
    checkDiscovery?(camera: Camera, canvasWidth: number, canvasHeight: number): boolean;
}

// Black hole warning tracking interface
interface BlackHoleWarning {
    time: number;
    level: number;
}

export class DiscoveryManager {
    private soundManager: SoundManager;
    private discoveryDisplay: DiscoveryDisplay;
    private discoveryLogbook: DiscoveryLogbook;
    private namingService: NamingService;
    
    // Enhanced discovery tracking
    private discoveries: Map<string, DiscoveryEntry> = new Map();
    private discoveryIdCounter: number = 0;
    
    // Black hole warning tracking
    private lastBlackHoleWarnings: Map<string, BlackHoleWarning> = new Map();
    private readonly warningCooldown: number = 2.0; // 2 seconds between warnings

    constructor(
        soundManager: SoundManager,
        discoveryDisplay: DiscoveryDisplay,
        discoveryLogbook: DiscoveryLogbook,
        namingService: NamingService
    ) {
        this.soundManager = soundManager;
        this.discoveryDisplay = discoveryDisplay;
        this.discoveryLogbook = discoveryLogbook;
        this.namingService = namingService;
    }

    /**
     * Process a newly discovered object
     */
    processDiscovery(obj: CelestialObject, camera: Camera, chunkManager: any): void {
        const objectName = this.namingService.generateDisplayName(obj);
        const objectType = this.getObjectType(obj);
        const isNotable = this.namingService.isNotableDiscovery(obj);
        const shareableURL = generateShareableURL(camera.x, camera.y);
        
        // Create enhanced discovery entry
        const discoveryEntry = this.createDiscoveryEntry(obj, objectName, objectType, camera, isNotable, shareableURL);
        
        // Store in persistent discovery list
        this.discoveries.set(discoveryEntry.id, discoveryEntry);
        
        // Add to UI displays (maintain backward compatibility)
        this.discoveryDisplay.addDiscovery(objectName, objectType || 'Unknown');
        this.discoveryLogbook.addDiscovery(objectName, objectType || 'Unknown');
        chunkManager.markObjectDiscovered(obj, objectName);
        
        // Play discovery sound
        this.playDiscoverySound(obj, objectType || 'Unknown');
        
        // Handle rare discovery logging
        if (this.isRareDiscovery(obj)) {
            const logPrefix = isNotable ? '🌟 RARE DISCOVERY!' : '⭐ Discovery!';
            console.log(`${logPrefix} Share ${objectName} (${objectType}): ${shareableURL}`);
        }
    }

    /**
     * Process a newly discovered region
     */
    processRegionDiscovery(regionType: string, regionName: string, camera: Camera, influence: number, chunkManager?: any): void {
        // Check if this region has already been discovered
        const regionId = `region_${regionType}`;
        if (this.discoveries.has(regionId)) {
            return; // Already discovered
        }

        const shareableURL = generateShareableURL(camera.x, camera.y);
        const discoveryEntry = this.createRegionDiscoveryEntry(
            regionType,
            regionName,
            camera,
            influence,
            shareableURL
        );

        // Store in persistent discovery list
        this.discoveries.set(discoveryEntry.id, discoveryEntry);

        // Mark region as discovered in chunk manager
        if (chunkManager && chunkManager.markRegionDiscovered) {
            chunkManager.markRegionDiscovered(regionType, regionName, camera.x, camera.y, influence);
        }

        // Add to UI displays
        this.discoveryDisplay.addDiscovery(regionName, 'Cosmic Region');
        this.discoveryLogbook.addDiscovery(regionName, 'Cosmic Region');

        // Play discovery sound (soft discovery sound for regions)
        this.playRegionDiscoverySound();

        // Log region discovery
        console.log(`🌌 REGION DISCOVERY! You have entered ${regionName}. Share: ${shareableURL}`);
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
        const timestamp = Date.now();

        return {
            id: `region_${regionType}`,
            name: regionName,
            type: 'Cosmic Region',
            objectType: 'region',
            coordinates: {
                x: camera.x,
                y: camera.y
            },
            timestamp,
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

    /**
     * Play a soft discovery sound for regions
     */
    private playRegionDiscoverySound(): void {
        // Use the rare discovery sound for regions as they are special discoveries
        // The rare discovery sound is harmonically rich and appropriate for cosmic regions
        this.soundManager.playRareDiscovery();
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
        const timestamp = Date.now();
        const rarity = this.determineRarity(obj);
        
        return {
            id: this.generateDiscoveryId(),
            name: objectName,
            type: objectType,
            objectType: obj.type,
            coordinates: { x: obj.x, y: obj.y },
            timestamp,
            rarity,
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
     * Generate unique discovery ID
     */
    private generateDiscoveryId(): string {
        return `discovery_${++this.discoveryIdCounter}_${Date.now()}`;
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
            if (starType === 'White Dwarf' || starType === 'Blue Giant') return 'rare';
            if (starType === 'Red Giant') return 'uncommon';
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
            // Rogue planets are rare discoveries since they're uncommon (8% spawn rate) and drift in deep space
            const variant = obj.variant || 'rock';
            if (variant === 'volcanic') {
                return 'ultra-rare'; // Volcanic rogue planets with internal heat are extremely rare
            }
            return 'rare'; // Ice and rock variants are rare but not ultra-rare
        }
        if (obj.type === 'dark-nebula') {
            // Dark nebulae are uncommon discoveries in Void regions
            const variant = obj.variant || 'wispy';
            if (variant === 'dense-core') {
                return 'rare'; // Dense-core nebulae completely occlude stars
            }
            return 'uncommon';
        }
        if (obj.type === 'crystal-garden') {
            // Crystal gardens are uncommon discoveries in Asteroid Graveyard regions
            const variant = obj.variant || 'mixed';
            if (variant === 'rare-earth') {
                return 'ultra-rare'; // Rare-earth crystals with spectacular light effects
            }
            return 'uncommon'; // Pure and mixed variants
        }
        return 'common';
    }

    /**
     * Calculate approximate discovery radius for metadata
     */
    private calculateDiscoveryRadius(obj: CelestialObject, camera: Camera): number {
        const distance = Math.sqrt((obj.x - camera.x) ** 2 + (obj.y - camera.y) ** 2);
        return Math.round(distance * 100) / 100; // Round to 2 decimal places
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
            // Convert variant to display name using same logic as naming service
            const variant = obj.variant || 'rock';
            switch (variant) {
                case 'ice':
                    return 'Frozen Rogue Planet';
                case 'volcanic':
                    return 'Volcanic Rogue Planet';
                case 'rock':
                default:
                    return 'Rocky Rogue Planet';
            }
        } else if (obj.type === 'dark-nebula') {
            const variant = obj.variant || 'wispy';
            switch (variant) {
                case 'dense-core':
                    return 'Dense-Core Dark Nebula';
                case 'globular':
                    return 'Globular Dark Nebula';
                case 'wispy':
                default:
                    return 'Wispy Dark Nebula';
            }
        } else if (obj.type === 'crystal-garden') {
            const variant = obj.variant || 'mixed';
            switch (variant) {
                case 'pure':
                    return 'Pure Crystal Garden';
                case 'rare-earth':
                    return 'Rare-Earth Crystal Garden';
                case 'mixed':
                default:
                    return 'Mixed Crystal Garden';
            }
        }
        return 'Unknown';
    }

    /**
     * Determine if a celestial object qualifies as a rare discovery
     */
    isRareDiscovery(obj: CelestialObject): boolean {
        if (obj.type === 'star') {
            // Consider Neutron Stars, White Dwarfs, Blue Giants, and Red Giants as rare
            return obj.starTypeName === 'Neutron Star' || 
                   obj.starTypeName === 'White Dwarf' || 
                   obj.starTypeName === 'Blue Giant' ||
                   obj.starTypeName === 'Red Giant';
        } else if (obj.type === 'planet') {
            // Rare planet types are notable discoveries
            return obj.planetTypeName === 'Exotic World' || 
                   obj.planetTypeName === 'Volcanic World' || 
                   obj.planetTypeName === 'Frozen World';
        } else if (obj.type === 'moon') {
            // All moon discoveries are notable due to smaller discovery radius
            return true;
        } else if (obj.type === 'nebula') {
            // All nebulae are rare and notable discoveries
            return true;
        } else if (obj.type === 'asteroids') {
            // Rare mineral and crystalline asteroid gardens are notable
            const gardenType = 'gardenType' in obj && typeof obj.gardenType === 'string' ? obj.gardenType : undefined;
            return gardenType === 'rare_minerals' || gardenType === 'crystalline' || gardenType === 'icy';
        } else if (obj.type === 'wormhole') {
            // All wormholes are extremely rare and notable discoveries
            return true;
        } else if (obj.type === 'blackhole') {
            // All black holes are ultra-rare, cosmic discoveries of ultimate significance
            return true;
        } else if (obj.type === 'rogue-planet') {
            // All rogue planets are rare discoveries - lonely worlds drifting in deep space
            return true;
        }
        return false;
    }

    /**
     * Play appropriate discovery sound based on object type
     */
    private playDiscoverySound(obj: CelestialObject, objectType: string): void {
        if (obj.type === 'star') {
            this.soundManager.playStarDiscovery(obj.starTypeName);
        } else if (obj.type === 'planet') {
            this.soundManager.playPlanetDiscovery(obj.planetTypeName);
        } else if (obj.type === 'moon') {
            this.soundManager.playMoonDiscovery();
        } else if (obj.type === 'nebula') {
            // Play special sparkly nebula discovery sound
            const nebulaType = 'nebulaType' in obj && typeof obj.nebulaType === 'string' ? obj.nebulaType : 'emission';
            this.soundManager.playNebulaDiscovery(nebulaType);
        } else if (obj.type === 'asteroids') {
            // Play asteroid garden discovery sound (use planet discovery as base sound)
            this.soundManager.playPlanetDiscovery('Asteroid Garden');
        } else if (obj.type === 'wormhole') {
            // Play unique wormhole discovery sound - deep, resonant, otherworldly
            this.soundManager.playWormholeDiscovery();
        } else if (obj.type === 'blackhole') {
            // Play ultra-rare black hole discovery sound - deep, ominous, cosmic
            this.soundManager.playBlackHoleDiscovery();
        } else if (obj.type === 'comet') {
            // Play comet discovery sound - bright, swift, crystalline
            this.soundManager.playCometDiscovery();
        } else if (obj.type === 'rogue-planet') {
            // Play rogue planet discovery sound - use planet discovery with variant-specific tone
            const variant = obj.variant || 'rock';
            const displayType = variant === 'ice' ? 'Frozen World' : 
                               variant === 'volcanic' ? 'Volcanic World' : 'Rocky World';
            this.soundManager.playPlanetDiscovery(displayType);
        } else if (obj.type === 'crystal-garden') {
            // Play unique crystal garden discovery sound - crystalline chimes, harmonic resonance
            this.soundManager.playCrystalGardenDiscovery(obj.variant || 'pure');
        }
        
        // Play additional rare discovery sound for special objects
        if (this.isRareDiscovery(obj)) {
            setTimeout(() => {
                this.soundManager.playRareDiscovery();
            }, 300); // Delay for layered effect
        }
    }

    /**
     * Display black hole proximity warnings with cooldown management
     */
    displayBlackHoleWarning(message: string, warningLevel: number, isPastEventHorizon: boolean, blackHoleId: string): void {
        const currentTime = Date.now() / 1000; // Convert to seconds
        const lastWarning = this.lastBlackHoleWarnings.get(blackHoleId);
        
        // Check if we should show warning (different level or enough time passed)
        const shouldShowWarning = !lastWarning || 
                                 lastWarning.level !== warningLevel ||
                                 (currentTime - lastWarning.time) >= this.warningCooldown;
        
        if (shouldShowWarning) {
            // Display proximity warning with appropriate urgency indicators
            if (isPastEventHorizon) {
                // Critical warning - past event horizon
                this.discoveryDisplay.addNotification(`🚨 CRITICAL: ${message}`);
            } else if (warningLevel >= 2) {
                // High danger warning
                this.discoveryDisplay.addNotification(`🔥 DANGER: ${message}`);
            } else {
                // Caution level warning
                this.discoveryDisplay.addNotification(`⚠️ CAUTION: ${message}`);
            }
            
            // Update warning tracking
            this.lastBlackHoleWarnings.set(blackHoleId, {
                time: currentTime,
                level: warningLevel
            });
        }
    }

    // === Discovery List Management ===

    /**
     * Get all discoveries, optionally filtered
     */
    getDiscoveries(filter?: DiscoveryFilter): DiscoveryEntry[] {
        let discoveries = Array.from(this.discoveries.values());

        if (!filter) {
            return discoveries.sort((a, b) => b.timestamp - a.timestamp);
        }

        // Apply filters
        if (filter.category && filter.category !== 'all') {
            discoveries = discoveries.filter(d => this.matchesCategory(d, filter.category!));
        }

        if (filter.rarity) {
            discoveries = discoveries.filter(d => d.rarity === filter.rarity);
        }

        if (filter.objectType) {
            discoveries = discoveries.filter(d => d.objectType === filter.objectType);
        }

        if (filter.hasNotes !== undefined) {
            discoveries = discoveries.filter(d => filter.hasNotes ? !!d.notes : !d.notes);
        }

        if (filter.dateRange) {
            discoveries = discoveries.filter(d => 
                d.timestamp >= filter.dateRange!.start && 
                d.timestamp <= filter.dateRange!.end
            );
        }

        return discoveries.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Get discovery statistics
     */
    getStatistics(): DiscoveryStatistics {
        const discoveries = Array.from(this.discoveries.values());
        const stats: DiscoveryStatistics = {
            totalDiscoveries: discoveries.length,
            byType: {},
            byRarity: {},
            byCategory: {
                all: discoveries.length,
                stellar: 0,
                planetary: 0,
                exotic: 0,
                rare: 0,
                notable: 0
            },
            rareDiscoveryCount: 0,
            notableDiscoveryCount: 0
        };

        if (discoveries.length > 0) {
            stats.firstDiscoveryTimestamp = Math.min(...discoveries.map(d => d.timestamp));
            stats.lastDiscoveryTimestamp = Math.max(...discoveries.map(d => d.timestamp));
        }

        // Calculate statistics
        for (const discovery of discoveries) {
            // By type
            stats.byType[discovery.type] = (stats.byType[discovery.type] || 0) + 1;
            
            // By rarity
            stats.byRarity[discovery.rarity] = (stats.byRarity[discovery.rarity] || 0) + 1;
            
            // By category
            const category = this.getDiscoveryCategory(discovery);
            if (category !== 'all') {
                stats.byCategory[category]++;
            }

            // Rare and notable counts
            if (discovery.rarity === 'rare' || discovery.rarity === 'ultra-rare') {
                stats.rareDiscoveryCount++;
            }
            
            if (discovery.metadata.isNotable) {
                stats.notableDiscoveryCount++;
            }
        }

        return stats;
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
     * Check if a discovery matches a category
     */
    private matchesCategory(discovery: DiscoveryEntry, category: DiscoveryCategory): boolean {
        switch (category) {
            case 'all':
                return true;
            case 'stellar':
                return discovery.objectType === 'star';
            case 'planetary':
                return discovery.objectType === 'planet' || discovery.objectType === 'moon';
            case 'exotic':
                return discovery.objectType === 'nebula' || discovery.objectType === 'asteroids' || 
                       discovery.objectType === 'wormhole' || discovery.objectType === 'blackhole' || 
                       discovery.objectType === 'comet';
            case 'rare':
                return discovery.rarity === 'rare' || discovery.rarity === 'ultra-rare';
            case 'notable':
                return discovery.metadata.isNotable;
            default:
                return false;
        }
    }

    /**
     * Get the primary category for a discovery
     */
    private getDiscoveryCategory(discovery: DiscoveryEntry): DiscoveryCategory {
        if (discovery.metadata.isNotable) return 'notable';
        if (discovery.rarity === 'rare' || discovery.rarity === 'ultra-rare') return 'rare';
        if (discovery.objectType === 'star') return 'stellar';
        if (discovery.objectType === 'planet' || discovery.objectType === 'moon') return 'planetary';
        return 'exotic';
    }

    /**
     * Export discovery data for save/load integration
     */
    exportDiscoveryData(): { discoveries: DiscoveryEntry[], idCounter: number } {
        return {
            discoveries: Array.from(this.discoveries.values()),
            idCounter: this.discoveryIdCounter
        };
    }

    /**
     * Import discovery data from save/load system
     */
    importDiscoveryData(data: { discoveries: DiscoveryEntry[], idCounter: number }): void {
        this.discoveries.clear();
        this.discoveryIdCounter = data.idCounter || 0;
        
        for (const discovery of data.discoveries) {
            this.discoveries.set(discovery.id, discovery);
        }
    }
}