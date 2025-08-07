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

// Global starting coordinates from URL parameters (if provided)
let STARTING_COORDINATES = null;

// Improved hash function for deterministic position-based seeds
// Uses proper bit mixing to eliminate patterns and artifacts
function hashPosition(x, y) {
    // Use coordinates directly without re-chunking (they're already chunked by caller)
    // Convert to integers to ensure consistent hashing
    const coordX = Math.floor(x);
    const coordY = Math.floor(y);
    
    // Start with universe seed for consistency
    let hash = UNIVERSE_SEED >>> 0; // Ensure unsigned 32-bit
    
    // Mix in X coordinate using bit manipulation (FNV-1a inspired)
    hash ^= coordX;
    hash = (hash * 0x9e3779b9) >>> 0; // Golden ratio based multiplier
    
    // Mix in Y coordinate with different multiplier
    hash ^= coordY;
    hash = (hash * 0x85ebca6b) >>> 0; // Different prime-like multiplier
    
    // Final mixing to eliminate patterns
    hash ^= hash >>> 16;
    hash = (hash * 0xc2b2ae35) >>> 0;
    hash ^= hash >>> 13;
    hash = (hash * 0xc2b2ae35) >>> 0;
    hash ^= hash >>> 16;
    
    return Math.abs(hash);
}

// Get seed and coordinates from URL parameters or generate random seed
function initializeUniverseSeed() {
    const urlParams = new URLSearchParams(window.location.search);
    const seedParam = urlParams.get('seed');
    const xParam = urlParams.get('x');
    const yParam = urlParams.get('y');
    
    // Parse coordinates if provided
    if (xParam !== null && yParam !== null) {
        const x = parseFloat(xParam);
        const y = parseFloat(yParam);
        if (!isNaN(x) && !isNaN(y)) {
            STARTING_COORDINATES = { x, y };
            console.log(`📍 Starting coordinates loaded: (${x}, ${y})`);
        }
    }
    
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
    
    // Generate shareable URL using the same logic as generateShareableURL
    let baseUrl;
    if (window.location.origin && window.location.origin !== 'null') {
        // Hosted scenario (http/https)
        baseUrl = `${window.location.origin}${window.location.pathname}`;
    } else {
        // Local file scenario (file://)
        baseUrl = window.location.href.split('?')[0];
    }
    
    if (STARTING_COORDINATES) {
        console.log(`🔗 Share this location: ${baseUrl}?seed=${UNIVERSE_SEED}&x=${STARTING_COORDINATES.x}&y=${STARTING_COORDINATES.y}`);
    } else {
        console.log(`🔗 Share this universe: ${baseUrl}?seed=${UNIVERSE_SEED}`);
    }
    
    return UNIVERSE_SEED;
}

// Generate shareable URL with current coordinates
function generateShareableURL(currentX, currentY) {
    // Handle both local file:// and hosted http:// scenarios
    let baseUrl;
    if (window.location.origin && window.location.origin !== 'null') {
        // Hosted scenario (http/https)
        baseUrl = `${window.location.origin}${window.location.pathname}`;
    } else {
        // Local file scenario (file://)
        baseUrl = window.location.href.split('?')[0]; // Remove any existing query params
    }
    
    return `${baseUrl}?seed=${UNIVERSE_SEED}&x=${Math.round(currentX)}&y=${Math.round(currentY)}`;
}

// Export for use in other modules
window.SeededRandom = SeededRandom;
window.hashPosition = hashPosition;
window.initializeUniverseSeed = initializeUniverseSeed;
window.getUniverseSeed = () => UNIVERSE_SEED;
window.setUniverseSeed = (seed) => { UNIVERSE_SEED = seed; };
window.getStartingCoordinates = () => STARTING_COORDINATES;
window.generateShareableURL = generateShareableURL;