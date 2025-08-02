// Deterministic random number generator for consistent world generation
class SeededRandom {
    constructor(seed) {
        this.seed = seed % 2147483647;
        if (this.seed <= 0) this.seed += 2147483646;
    }

    next() {
        this.seed = (this.seed * 16807) % 2147483647;
        return (this.seed - 1) / 2147483646;
    }

    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    nextFloat(min, max) {
        return this.next() * (max - min) + min;
    }

    choice(array) {
        return array[this.nextInt(0, array.length - 1)];
    }
}

// Global universe seed for consistent world generation
let UNIVERSE_SEED = 0;

// Hash function for deterministic position-based seeds
function hashPosition(x, y) {
    const chunkX = Math.floor(x / 1000);
    const chunkY = Math.floor(y / 1000);
    
    // Combine universe seed with chunk coordinates for unique but consistent generation
    let hash = UNIVERSE_SEED;
    const str = `${chunkX},${chunkY}`;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

// Get seed from URL parameter or generate random one
function initializeUniverseSeed() {
    const urlParams = new URLSearchParams(window.location.search);
    const seedParam = urlParams.get('seed');
    
    if (seedParam) {
        // Use seed from URL
        UNIVERSE_SEED = parseInt(seedParam, 10);
        if (isNaN(UNIVERSE_SEED)) {
            // If invalid seed, use hash of the string
            UNIVERSE_SEED = 0;
            for (let i = 0; i < seedParam.length; i++) {
                const char = seedParam.charCodeAt(i);
                UNIVERSE_SEED = ((UNIVERSE_SEED << 5) - UNIVERSE_SEED) + char;
                UNIVERSE_SEED = UNIVERSE_SEED & UNIVERSE_SEED;
            }
            UNIVERSE_SEED = Math.abs(UNIVERSE_SEED);
        }
        console.log(`🌌 Universe loaded from seed: ${UNIVERSE_SEED} (from URL parameter)`);
    } else {
        // Generate random seed
        UNIVERSE_SEED = Math.floor(Math.random() * 2147483647);
        console.log(`🌌 Universe generated with seed: ${UNIVERSE_SEED}`);
    }
    
    console.log(`🔗 Share this universe: ${window.location.origin}${window.location.pathname}?seed=${UNIVERSE_SEED}`);
    return UNIVERSE_SEED;
}

// Export for use in other modules
window.SeededRandom = SeededRandom;
window.hashPosition = hashPosition;
window.initializeUniverseSeed = initializeUniverseSeed;
window.getUniverseSeed = () => UNIVERSE_SEED;