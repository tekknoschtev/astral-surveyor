// Procedural Naming Service for Astronomical Objects
// Follows IAU (International Astronomical Union) inspired conventions

// Type definitions for celestial objects
interface CelestialObject {
    x: number;
    y: number;
    type: 'star' | 'planet' | 'moon';
}

interface Star extends CelestialObject {
    type: 'star';
    starTypeName?: string;
}

interface Planet extends CelestialObject {
    type: 'planet';
    parentStar?: Star;
    planetTypeName?: string;
    orbitalDistance?: number;
}

interface Moon extends CelestialObject {
    type: 'moon';
    parentPlanet?: Planet;
    orbitalDistance?: number;
}

// Full designation result for detailed information
interface FullDesignation {
    catalog?: string;
    coordinate?: string;
    designation?: string;
    type: string;
    classification?: string | null;
    parentStar?: string;
    orbitalIndex?: number;
}

export class NamingService {
    private catalogPrefix = 'ASV'; // Astral Surveyor
    private starCounter = new Map<string, number>(); // Cache for generated star numbers
    private planetLetters = 'bcdefghijklmnopqrstuvwxyz'; // 'a' reserved for star itself
    private rareDesignations: Record<string, string> = {
        'Neutron Star': 'NS',
        'White Dwarf': 'WD', 
        'Blue Giant': 'BG',
        'Red Giant': 'RG',
        'Exotic World': 'EX',
        'Volcanic World': 'VL',
        'Frozen World': 'FR'
    };

    /**
     * Generate a deterministic star catalog number based on coordinates
     * Uses a spatial hash to ensure consistent numbering across all players
     */
    generateStarCatalogNumber(x: number, y: number): number {
        // Create a unique key from coordinates
        const coordKey = `${Math.floor(x)},${Math.floor(y)}`;
        
        // Check if we've already generated a number for this position
        if (this.starCounter.has(coordKey)) {
            return this.starCounter.get(coordKey)!;
        }
        
        // Generate deterministic catalog number from coordinates
        // Use a spatial hash that distributes numbers relatively evenly
        const hash1 = this.hashCoordinate(x);
        const hash2 = this.hashCoordinate(y);
        const combined = (hash1 ^ hash2) >>> 0; // Unsigned 32-bit integer
        
        // Convert to 4-digit catalog number (1000-9999 range for authentic feel)
        const catalogNumber = 1000 + (combined % 9000);
        
        this.starCounter.set(coordKey, catalogNumber);
        return catalogNumber;
    }

    /**
     * Hash a coordinate value for deterministic number generation
     */
    private hashCoordinate(coord: number): number {
        // Simple but effective hash function for coordinates
        let hash = Math.abs(Math.floor(coord * 1000));
        hash ^= hash >>> 16;
        hash *= 0x85ebca6b;
        hash ^= hash >>> 13;
        hash *= 0xc2b2ae35;
        hash ^= hash >>> 16;
        return hash;
    }

    /**
     * Generate full star designation following IAU conventions
     * Examples: "ASV-2847", "ASV-2847 G", "ASV-2847 NS"
     */
    generateStarName(star: Star): string {
        const catalogNumber = this.generateStarCatalogNumber(star.x, star.y);
        const baseName = `${this.catalogPrefix}-${catalogNumber}`;
        
        // Add stellar classification for scientific accuracy
        if (star.starTypeName) {
            const stellarClass = this.getStarClassification(star.starTypeName);
            if (stellarClass) {
                return `${baseName} ${stellarClass}`;
            }
        }
        
        return baseName;
    }

    /**
     * Generate coordinate-based designation (alternative format)
     * Example: "ASV J1205+0341" (similar to real astronomical catalogs)
     */
    generateCoordinateDesignation(x: number, y: number): string {
        const xCoord = Math.abs(Math.floor(x)).toString().padStart(4, '0');
        const yCoord = Math.abs(Math.floor(y)).toString().padStart(4, '0');
        const xSign = x >= 0 ? '+' : '-';
        const ySign = y >= 0 ? '+' : '-';
        
        return `${this.catalogPrefix} J${xCoord}${xSign}${yCoord}${ySign}`;
    }

    /**
     * Convert star type to stellar classification
     */
    getStarClassification(starTypeName: string): string | null {
        const classifications: Record<string, string> = {
            'G-Type Star': 'G',
            'K-Type Star': 'K',
            'M-Type Star': 'M',
            'Red Giant': 'RG',
            'Blue Giant': 'BG',
            'White Dwarf': 'WD',
            'Neutron Star': 'NS'
        };
        
        return classifications[starTypeName] || null;
    }

    /**
     * Generate planet designation following IAU convention
     * Examples: "ASV-2847 b", "ASV-2847 c", "ASV-2847 EX" (for exotic worlds)
     */
    generatePlanetName(planet: Planet): string {
        if (!planet.parentStar) {
            return 'Unknown Planet'; // Shouldn't happen in normal gameplay
        }
        
        const starName = this.generateStarName(planet.parentStar);
        const baseName = starName.split(' ')[0]; // Remove stellar classification for planet naming
        
        // For rare planets, use special designation
        if (planet.planetTypeName && this.rareDesignations[planet.planetTypeName]) {
            const rareDesignation = this.rareDesignations[planet.planetTypeName];
            return `${baseName} ${rareDesignation}`;
        }
        
        // For regular planets, use letter designation based on orbital distance
        // Closer planets get earlier letters (b, c, d, etc.)
        const planetIndex = this.calculatePlanetIndex(planet);
        if (planetIndex < this.planetLetters.length) {
            const letter = this.planetLetters[planetIndex];
            return `${baseName} ${letter}`;
        }
        
        // Fallback for systems with too many planets
        return `${baseName} ${planetIndex + 2}`; // Numbers for planets beyond 'z'
    }

    /**
     * Generate moon designation following IAU convention
     * Examples: "ASV-2847 b I", "ASV-2847 c II", "ASV-2847 EX I"
     */
    generateMoonName(moon: Moon): string {
        if (!moon.parentPlanet) {
            return 'Unknown Moon'; // Shouldn't happen in normal gameplay
        }
        
        const planetName = this.generatePlanetName(moon.parentPlanet);
        
        // Calculate moon index based on orbital distance from parent planet
        const moonIndex = this.calculateMoonIndex(moon);
        const romanNumeral = this.toRomanNumeral(moonIndex + 1); // Start from I, not 0
        
        return `${planetName} ${romanNumeral}`;
    }

    /**
     * Calculate moon's index around its parent planet based on orbital distance
     */
    calculateMoonIndex(moon: Moon): number {
        if (!moon.parentPlanet) {
            return 0;
        }
        
        // Use orbital distance directly for moon index calculation
        // This ensures different distances get different indices
        const moonDistance = Math.floor(moon.orbitalDistance || 0);
        // Sort moons by distance and assign indices accordingly
        // For now, use a simple approach based on distance ranges
        if (moonDistance <= 10) return 0;
        else if (moonDistance <= 20) return 1;
        else if (moonDistance <= 30) return 2;
        else return 3;
    }

    /**
     * Convert number to Roman numeral (for moon designations)
     */
    toRomanNumeral(num: number): string {
        const romanNumerals = [
            '', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'
        ];
        return romanNumerals[num] || num.toString();
    }

    /**
     * Calculate planet's index in its star system based on orbital distance
     */
    calculatePlanetIndex(planet: Planet): number {
        if (!planet.parentStar || !(planet.parentStar as any).planets) {
            return 0;
        }
        
        // Sort planets by orbital distance and find this planet's index
        const planets = (planet.parentStar as any).planets as Planet[];
        const sortedPlanets = [...planets].sort((a, b) => (a.orbitalDistance || 0) - (b.orbitalDistance || 0));
        return sortedPlanets.findIndex(p => p === planet);
    }

    /**
     * Generate short display name for UI contexts
     * Examples: "ASV-2847", "ASV-2847 b"
     */
    generateDisplayName(object: Star | Planet | Moon | any): string {
        // Handle both full objects and discovered star data
        if (object.type === 'star' || object.starTypeName) {
            const catalogNumber = this.generateStarCatalogNumber(object.x, object.y);
            return `${this.catalogPrefix}-${catalogNumber}`;
        } else if (object.type === 'planet') {
            return this.generatePlanetName(object as Planet);
        } else if (object.type === 'moon') {
            return this.generateMoonName(object as Moon);
        }
        
        return 'Unknown Object';
    }

    /**
     * Generate full scientific designation with all details
     * Used for detailed information panels and exports
     */
    generateFullDesignation(object: Star | Planet | Moon | any): FullDesignation | null {
        // Handle both full objects and discovered star data
        if (object.type === 'star' || object.starTypeName) {
            const standardName = this.generateStarName(object as Star);
            const coordName = this.generateCoordinateDesignation(object.x, object.y);
            return {
                catalog: standardName,
                coordinate: coordName,
                type: object.starTypeName || 'Unknown Star',
                classification: this.getStarClassification(object.starTypeName)
            };
        } else if (object.type === 'planet') {
            const planet = object as Planet;
            const planetName = this.generatePlanetName(planet);
            return {
                designation: planetName,
                type: planet.planetTypeName || 'Unknown Planet',
                parentStar: planet.parentStar ? this.generateDisplayName(planet.parentStar) : 'Unknown Star',
                orbitalIndex: this.calculatePlanetIndex(planet) + 1
            };
        }
        
        return null;
    }

    /**
     * Check if an object deserves special recognition (rare discoveries)
     */
    isNotableDiscovery(object: Star | Planet | Moon | any): boolean {
        if (object.type === 'star') {
            const rareStars = ['Neutron Star', 'White Dwarf', 'Blue Giant', 'Red Giant'];
            return rareStars.includes(object.starTypeName);
        } else if (object.type === 'planet') {
            const rarePlanets = ['Exotic World', 'Volcanic World', 'Frozen World'];
            return rarePlanets.includes(object.planetTypeName);
        }
        
        return false;
    }
}