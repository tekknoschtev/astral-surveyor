// SimpleAudioCoordinator - Direct audio coordination for discoveries
// Replaces complex event-driven audio routing with simple method calls

import { SoundManager } from '../audio/soundmanager.js';

export interface DiscoveryAudioData {
    objectType: 'star' | 'planet' | 'moon' | 'nebula' | 'asteroids' | 'wormhole' | 'blackhole' | 'comet' | 'rogue-planet' | 'dark-nebula' | 'crystal-garden' | 'protostar';
    starType?: string;
    planetType?: string;
    nebulaType?: string;
    gardenType?: string;
    isRare?: boolean;
}

export class SimpleAudioCoordinator {
    constructor(private soundManager: SoundManager) {}

    /**
     * Play discovery sound for a celestial object
     */
    playDiscoverySound(data: DiscoveryAudioData): void {
        try {
            // Route discovery to appropriate SoundManager methods that tests expect
            switch (data.objectType) {
                case 'star':
                    if (typeof this.soundManager.playStarDiscovery === 'function') {
                        this.soundManager.playStarDiscovery(data.starType || 'G-Type Star');
                    }
                    break;

                case 'planet':
                    if (typeof this.soundManager.playPlanetDiscovery === 'function') {
                        this.soundManager.playPlanetDiscovery(data.planetType || 'Rocky Planet');
                    }
                    break;

                case 'nebula':
                    if (typeof this.soundManager.playNebulaDiscovery === 'function') {
                        this.soundManager.playNebulaDiscovery(data.nebulaType || 'emission');
                    }
                    break;

                case 'moon':
                    // Moons have their own discovery method
                    if (typeof this.soundManager.playMoonDiscovery === 'function') {
                        this.soundManager.playMoonDiscovery();
                    }
                    break;

                case 'asteroids':
                    // Asteroid gardens use planet discovery sound
                    if (typeof this.soundManager.playPlanetDiscovery === 'function') {
                        this.soundManager.playPlanetDiscovery('Asteroid Garden');
                    }
                    break;

                case 'crystal-garden':
                    // Crystal gardens have their own discovery sound
                    if (typeof this.soundManager.playCrystalGardenDiscovery === 'function') {
                        this.soundManager.playCrystalGardenDiscovery(data.gardenType || 'pure');
                    }
                    break;

                case 'wormhole':
                    // Wormholes have special discovery method
                    if (typeof this.soundManager.playWormholeDiscovery === 'function') {
                        this.soundManager.playWormholeDiscovery();
                    }
                    break;

                case 'blackhole':
                    // Black holes have special discovery method
                    if (typeof this.soundManager.playBlackHoleDiscovery === 'function') {
                        this.soundManager.playBlackHoleDiscovery();
                    }
                    break;

                case 'comet':
                case 'rogue-planet':
                case 'dark-nebula':
                case 'protostar':
                    // Use rare discovery sound for new object types
                    if (typeof this.soundManager.playRareDiscovery === 'function') {
                        this.soundManager.playRareDiscovery();
                    }
                    break;
            }

            // Play additional rare discovery sound for special objects
            if (data.isRare) {
                // Delay the rare sound slightly to layer with the primary discovery sound
                setTimeout(() => {
                    if (typeof this.soundManager.playRareDiscovery === 'function') {
                        this.soundManager.playRareDiscovery();
                    }
                }, 300);
            }
        } catch (error) {
            // Gracefully handle audio errors
            console.warn('Error playing discovery sound:', error);
        }
    }

    /**
     * Play discovery sound for regions
     */
    playRegionDiscoverySound(): void {
        // Use the rare discovery sound for regions as they are special discoveries
        if (typeof this.soundManager.playRareDiscovery === 'function') {
            this.soundManager.playRareDiscovery();
        }
    }
}