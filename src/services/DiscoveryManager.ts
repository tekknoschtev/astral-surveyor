// Discovery Manager - extracted from game.ts
// Handles discovery logic, rare discovery detection, and discovery sound coordination

import { Camera } from '../camera/camera.js';
import { SoundManager } from '../audio/soundmanager.js';
import { DiscoveryDisplay } from '../ui/ui.js';
import { DiscoveryLogbook } from '../ui/discoverylogbook.js';
import { NamingService } from '../naming/naming.js';
import { generateShareableURL } from '../utils/random.js';

// Interface for celestial objects in discovery context
interface CelestialObject {
    type: 'star' | 'planet' | 'moon' | 'nebula' | 'asteroids' | 'wormhole' | 'blackhole' | 'comet';
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
        
        // Add to UI displays
        this.discoveryDisplay.addDiscovery(objectName, objectType || 'Unknown');
        this.discoveryLogbook.addDiscovery(objectName, objectType || 'Unknown');
        chunkManager.markObjectDiscovered(obj, objectName);
        
        // Play discovery sound
        this.playDiscoverySound(obj, objectType || 'Unknown');
        
        // Handle rare discovery logging
        if (this.isRareDiscovery(obj)) {
            const shareableURL = generateShareableURL(camera.x, camera.y);
            const isNotable = this.namingService.isNotableDiscovery(obj);
            const logPrefix = isNotable ? '🌟 RARE DISCOVERY!' : '⭐ Discovery!';
            console.log(`${logPrefix} Share ${objectName} (${objectType}): ${shareableURL}`);
        }
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
}