// Procedural Naming Service for Astronomical Objects
// Follows IAU (International Astronomical Union) inspired conventions

// Type definitions for celestial objects
interface CelestialObject {
    x: number;
    y: number;
    type: 'star' | 'planet' | 'moon' | 'nebula' | 'wormhole' | 'asteroids' | 'blackhole' | 'comet' | 'rogue-planet' | 'dark-nebula' | 'crystal-garden';
}

interface Star extends CelestialObject {
    type: 'star';
    starTypeName?: string;
    planets?: Planet[];
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

interface Nebula extends CelestialObject {
    type: 'nebula';
    nebulaType?: string;
    nebulaTypeData?: {
        name: string;
    };
}

interface Wormhole extends CelestialObject {
    type: 'wormhole';
    wormholeId?: string;
    designation?: 'alpha' | 'beta';
    pairId?: string;
}

interface BlackHole extends CelestialObject {
    type: 'blackhole';
    blackHoleTypeName?: string;
    uniqueId?: string;
}

interface AsteroidGarden extends CelestialObject {
    type: 'asteroids';
    gardenType?: string;
    gardenTypeData?: {
        name: string;
    };
}

interface Comet extends CelestialObject {
    type: 'comet';
    parentStar?: Star;
    cometIndex?: number;
    cometType?: {
        name: string;
        rarity: number;
        discoveryValue: number;
        description: string;
    };
}

interface RoguePlanet extends CelestialObject {
    type: 'rogue-planet';
    variant?: 'ice' | 'rock' | 'volcanic';
}

interface DarkNebula extends CelestialObject {
    type: 'dark-nebula';
    variant?: 'dense-core' | 'wispy' | 'globular';
}

interface CrystalGarden extends CelestialObject {
    type: 'crystal-garden';
    variant?: 'pure' | 'mixed' | 'rare-earth';
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

    // Famous nebula names for authentic astronomical feel
    private nebulaeNames = [
        // Classic nebulae names
        'Eagle', 'Orion', 'Horsehead', 'Crab', 'Ring', 'Cat\'s Eye', 'Helix', 'Rosette',
        'Veil', 'Lagoon', 'Trifid', 'Swan', 'Pelican', 'North America', 'Heart', 'Soul',
        'Flame', 'Cone', 'Fox Fur', 'Witch Head', 'California', 'Flaming Star',
        'Bubble', 'Cocoon', 'Elephant Trunk', 'Pacman', 'Wizard', 'Tulip',
        // Animal-inspired names  
        'Lion', 'Bear', 'Dragon', 'Serpent', 'Phoenix', 'Dolphin', 'Seahorse', 'Spider',
        'Butterfly', 'Jellyfish', 'Starfish', 'Octopus', 'Mantis', 'Scorpion',
        // Mythological and poetic names
        'Medusa', 'Perseus', 'Andromeda', 'Cassiopeia', 'Aurora', 'Celestial',
        'Ethereal', 'Mystic', 'Cosmic', 'Stellar', 'Galactic', 'Nebulous',
        // Colors and descriptive names
        'Crimson', 'Azure', 'Emerald', 'Golden', 'Silver', 'Violet', 'Amber',
        'Crystal', 'Opal', 'Ruby', 'Sapphire', 'Pearl', 'Diamond', 'Prism'
    ];

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
     * Generate nebula name following astronomical conventions
     * Combines famous nebula names with catalog numbers and type designations
     * Examples: "Eagle Nebula", "NGC 4532", "IC 1847"
     */
    generateNebulaName(nebula: Nebula): string {
        // Use deterministic selection based on nebula position
        const nameIndex = Math.abs(this.hashCoordinate(nebula.x) ^ this.hashCoordinate(nebula.y)) % this.nebulaeNames.length;
        const baseName = this.nebulaeNames[nameIndex];
        
        // 30% chance for famous name only, 70% chance for catalog designation
        const useSimpleName = (Math.abs(this.hashCoordinate(nebula.x + nebula.y)) % 100) < 30;
        
        if (useSimpleName) {
            return `${baseName} Nebula`;
        }
        
        // Generate catalog designation (NGC/IC style)
        const catalogNumber = this.generateNebulaCatalogNumber(nebula.x, nebula.y);
        const catalogType = catalogNumber > 7000 ? 'IC' : 'NGC';
        
        return `${catalogType} ${catalogNumber}`;
    }

    /**
     * Generate nebula catalog number in NGC/IC style (1-9999 range)
     */
    private generateNebulaCatalogNumber(x: number, y: number): number {
        const hash1 = this.hashCoordinate(x * 1.1); // Slight offset for different distribution
        const hash2 = this.hashCoordinate(y * 1.3);
        const combined = (hash1 ^ hash2) >>> 0;
        
        // NGC range: 1-7840, IC range: 7841-9999 (historically accurate ranges)
        return 1 + (combined % 9999);
    }

    /**
     * Generate wormhole name following scientific convention
     * Uses the wormholeId from the paired system with designation suffix
     * Examples: "WH-1234-α", "WH-1234-β"
     */
    generateWormholeName(wormhole: Wormhole): string {
        // Use the pairId if available (includes designation), otherwise construct it
        if (wormhole.pairId) {
            return wormhole.pairId;
        }
        
        // Fallback construction if pairId is not available
        if (wormhole.wormholeId && wormhole.designation) {
            const designationSymbol = wormhole.designation === 'alpha' ? 'α' : 'β';
            return `${wormhole.wormholeId}-${designationSymbol}`;
        }
        
        // Final fallback - generate from coordinates
        const catalogNumber = this.generateWormholeCatalogNumber(wormhole.x, wormhole.y);
        const designationSymbol = wormhole.designation === 'alpha' ? 'α' : 'β';
        return `WH-${catalogNumber}-${designationSymbol}`;
    }

    /**
     * Generate wormhole catalog number based on position
     */
    private generateWormholeCatalogNumber(x: number, y: number): number {
        const hash1 = this.hashCoordinate(x * 0.7); // Different multipliers for unique distribution
        const hash2 = this.hashCoordinate(y * 0.9);
        const combined = (hash1 ^ hash2) >>> 0;
        
        // Wormhole range: 1000-9999 (4-digit numbers for rarity)
        return 1000 + (combined % 9000);
    }

    /**
     * Generate black hole name following astronomical convention
     * Uses position-based catalog numbers with BH prefix
     * Examples: "BH-1234", "BH-8765 SMH" (Stellar Mass Hole), "BH-2345 SMBH" (Supermassive Black Hole)
     */
    generateBlackHoleName(blackHole: BlackHole): string {
        const catalogNumber = this.generateBlackHoleCatalogNumber(blackHole.x, blackHole.y);
        const baseName = `BH-${catalogNumber}`;
        
        // Add classification suffix for scientific accuracy
        if (blackHole.blackHoleTypeName) {
            let classification = '';
            if (blackHole.blackHoleTypeName === 'Stellar Mass Black Hole') {
                classification = ' SMH'; // Stellar Mass Hole
            } else if (blackHole.blackHoleTypeName === 'Supermassive Black Hole') {
                classification = ' SMBH'; // Supermassive Black Hole
            }
            return baseName + classification;
        }
        
        return baseName;
    }

    /**
     * Generate black hole catalog number based on position
     */
    private generateBlackHoleCatalogNumber(x: number, y: number): number {
        const hash1 = this.hashCoordinate(x * 0.3); // Different multipliers for unique distribution
        const hash2 = this.hashCoordinate(y * 0.5);
        const combined = (hash1 ^ hash2) >>> 0;
        
        // Black hole range: 1000-9999 (4-digit numbers for ultra-rarity)
        return 1000 + (combined % 9000);
    }

    /**
     * Generate asteroid garden name following astronomical field/belt naming conventions
     * Examples: "ASV-1234 Belt A", "ASV-1234 Field", "ASV-1234 Cluster"
     */
    generateAsteroidGardenName(garden: AsteroidGarden): string {
        // Generate base catalog number using star catalog system
        const catalogNumber = this.generateStarCatalogNumber(garden.x, garden.y);
        const baseName = `${this.catalogPrefix}-${catalogNumber}`;
        
        // Select designation suffix based on garden type
        let suffix: string;
        switch (garden.gardenType) {
            case 'metallic':
                suffix = 'Belt A'; // Classic asteroid belt designation
                break;
            case 'crystalline':
                suffix = 'Field C'; // Crystalline field
                break;
            case 'carbonaceous':
                suffix = 'Belt B'; // Secondary belt
                break;
            case 'icy':
                suffix = 'Ring'; // Ice ring system
                break;
            case 'rare_minerals':
                suffix = 'Cluster'; // Rare mineral cluster
                break;
            default:
                suffix = 'Field'; // Generic field designation
                break;
        }
        
        return `${baseName} ${suffix}`;
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
        if (!planet.parentStar || !planet.parentStar.planets) {
            return 0;
        }
        
        // Sort planets by orbital distance and find this planet's index
        const planets = planet.parentStar.planets;
        const sortedPlanets = [...planets].sort((a, b) => (a.orbitalDistance || 0) - (b.orbitalDistance || 0));
        return sortedPlanets.findIndex(p => p === planet);
    }

    /**
     * Generate short display name for UI contexts
     * Examples: "ASV-2847", "ASV-2847 b"
     */
    generateDisplayName(object: any): string {
        // Handle both full objects and discovered star data
        if (object.type === 'star' || ('starTypeName' in object && object.starTypeName)) {
            const catalogNumber = this.generateStarCatalogNumber(object.x, object.y);
            return `${this.catalogPrefix}-${catalogNumber}`;
        } else if (object.type === 'planet') {
            return this.generatePlanetName(object as Planet);
        } else if (object.type === 'moon') {
            return this.generateMoonName(object as Moon);
        } else if (object.type === 'nebula') {
            return this.generateNebulaName(object as Nebula);
        } else if (object.type === 'wormhole') {
            return this.generateWormholeName(object as Wormhole);
        } else if (object.type === 'blackhole') {
            return this.generateBlackHoleName(object as BlackHole);
        } else if (object.type === 'asteroids') {
            return this.generateAsteroidGardenName(object);
        } else if (object.type === 'comet') {
            return this.generateCometName(object);
        } else if (object.type === 'rogue-planet') {
            return this.generateRoguePlanetName(object as RoguePlanet);
        } else if (object.type === 'dark-nebula') {
            return this.generateDarkNebulaName(object as DarkNebula);
        } else if (object.type === 'crystal-garden') {
            return this.generateCrystalGardenName(object as CrystalGarden);
        }
        
        return 'Unknown Object';
    }

    /**
     * Generate full scientific designation with all details
     * Used for detailed information panels and exports
     */
    generateFullDesignation(object: any): FullDesignation | null {
        // Handle both full objects and discovered star data
        if (object.type === 'star' || ('starTypeName' in object && object.starTypeName)) {
            const standardName = this.generateStarName(object as Star);
            const coordName = this.generateCoordinateDesignation(object.x, object.y);
            const starTypeName = 'starTypeName' in object && typeof object.starTypeName === 'string' ? object.starTypeName : 'Unknown Star';
            return {
                catalog: standardName,
                coordinate: coordName,
                type: starTypeName,
                classification: this.getStarClassification(starTypeName === 'Unknown Star' ? '' : starTypeName)
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
        } else if (object.type === 'nebula') {
            const nebula = object as Nebula;
            const nebulaName = this.generateNebulaName(nebula);
            const coordName = this.generateCoordinateDesignation(nebula.x, nebula.y);
            return {
                catalog: nebulaName,
                coordinate: coordName,
                type: nebula.nebulaTypeData?.name || 'Unknown Nebula',
                classification: this.getNebulaClassification(nebula.nebulaType)
            };
        } else if (object.type === 'wormhole') {
            const wormhole = object as Wormhole;
            const wormholeName = this.generateWormholeName(wormhole);
            const coordName = this.generateCoordinateDesignation(wormhole.x, wormhole.y);
            const twinDesignation = wormhole.designation === 'alpha' ? 'β' : 'α';
            return {
                catalog: wormholeName,
                coordinate: coordName,
                type: 'Stable Traversable Wormhole',
                classification: `Einstein-Rosen Bridge (Paired with ${wormhole.wormholeId}-${twinDesignation})`
            };
        } else if (object.type === 'blackhole') {
            const blackHole = object as BlackHole;
            const blackHoleName = this.generateBlackHoleName(blackHole);
            const coordName = this.generateCoordinateDesignation(blackHole.x, blackHole.y);
            const massClass = blackHole.blackHoleTypeName === 'Supermassive Black Hole' ? 'Supermassive' : 'Stellar Mass';
            return {
                catalog: blackHoleName,
                coordinate: coordName,
                type: blackHole.blackHoleTypeName || 'Black Hole',
                classification: `${massClass} Gravitational Singularity (Universe Reset Point)`
            };
        } else if (object.type === 'asteroids') {
            const garden = object;
            const gardenName = this.generateAsteroidGardenName(garden);
            const coordName = this.generateCoordinateDesignation(garden.x, garden.y);
            return {
                catalog: gardenName,
                coordinate: coordName,
                type: garden.gardenTypeData?.name || 'Asteroid Garden',
                classification: this.getAsteroidGardenClassification(garden.gardenType)
            };
        } else if (object.type === 'comet') {
            const comet = object as Comet;
            const cometName = this.generateCometName(comet);
            const coordName = this.generateCoordinateDesignation(comet.x, comet.y);
            const parentStarName = comet.parentStar ? this.generateDisplayName(comet.parentStar) : 'Unknown Star';
            return {
                catalog: cometName,
                coordinate: coordName,
                type: comet.cometType?.name || 'Comet',
                classification: this.getCometClassification(comet.cometType?.name),
                parentStar: parentStarName
            };
        } else if (object.type === 'rogue-planet') {
            const roguePlanet = object as RoguePlanet;
            const roguePlanetName = this.generateRoguePlanetName(roguePlanet);
            const coordName = this.generateCoordinateDesignation(roguePlanet.x, roguePlanet.y);
            const variantType = this.getRoguePlanetVariantName(roguePlanet.variant);
            return {
                catalog: roguePlanetName,
                coordinate: coordName,
                type: 'Rogue Planet',
                classification: `Free-floating ${variantType} planet`
            };
        } else if (object.type === 'dark-nebula') {
            const darkNebula = object as DarkNebula;
            const darkNebulaName = this.generateDarkNebulaName(darkNebula);
            const coordName = this.generateCoordinateDesignation(darkNebula.x, darkNebula.y);
            const variantType = this.getDarkNebulaVariantName(darkNebula.variant);
            return {
                catalog: darkNebulaName,
                coordinate: coordName,
                type: 'Dark Nebula',
                classification: `${variantType} dust cloud with stellar occlusion`
            };
        } else if (object.type === 'crystal-garden') {
            const crystalGarden = object as CrystalGarden;
            const crystalGardenName = this.generateCrystalGardenName(crystalGarden);
            const coordName = this.generateCoordinateDesignation(crystalGarden.x, crystalGarden.y);
            const variantType = this.getCrystalGardenVariantName(crystalGarden.variant);
            return {
                catalog: crystalGardenName,
                coordinate: coordName,
                type: 'Crystal Garden',
                classification: `${variantType} crystalline formation with light refraction`
            };
        }
        
        return null;
    }

    /**
     * Check if an object deserves special recognition (rare discoveries)
     */
    isNotableDiscovery(object: any): boolean {
        if (object.type === 'star') {
            const rareStars = ['Neutron Star', 'White Dwarf', 'Blue Giant', 'Red Giant'];
            return rareStars.includes(object.starTypeName);
        } else if (object.type === 'planet') {
            const rarePlanets = ['Exotic World', 'Volcanic World', 'Frozen World'];
            return rarePlanets.includes(object.planetTypeName);
        } else if (object.type === 'nebula') {
            // All nebulae are notable due to their rarity (5% spawn chance)
            return true;
        } else if (object.type === 'wormhole') {
            // All wormholes are extremely notable due to ultra-rarity (0.0005% spawn chance)
            return true;
        } else if (object.type === 'blackhole') {
            // All black holes are ultra-notable due to extreme rarity (0.0001% spawn chance) and cosmic significance
            return true;
        } else if (object.type === 'asteroids') {
            // Rare mineral, crystalline, and icy gardens are notable
            const rareGardens = ['rare_minerals', 'crystalline', 'icy'];
            return rareGardens.includes(object.gardenType);
        } else if (object.type === 'comet') {
            // Organic comets are rare and notable, others are uncommon but significant
            return object.cometType?.name === 'Organic Comet';
        } else if (object.type === 'rogue-planet') {
            // Volcanic rogue planets are notable due to their rare internal heat source
            return object.variant === 'volcanic';
        } else if (object.type === 'dark-nebula') {
            // Dense-core dark nebulae are notable due to complete stellar occlusion
            return object.variant === 'dense-core';
        } else if (object.type === 'crystal-garden') {
            // Rare-earth crystal gardens are notable due to exotic formations and spectacular light effects
            return object.variant === 'rare-earth';
        }
        
        return false;
    }

    /**
     * Get nebula classification for scientific designation
     */
    private getNebulaClassification(nebulaType?: string): string | null {
        const classifications: Record<string, string> = {
            'emission': 'H II Region',
            'reflection': 'Reflection Cloud', 
            'planetary': 'Planetary Nebula',
            'dark': 'Dark Cloud'
        };
        
        return nebulaType ? classifications[nebulaType] || null : null;
    }

    /**
     * Get asteroid garden classification for scientific designation
     */
    private getAsteroidGardenClassification(gardenType?: string): string | null {
        const classifications: Record<string, string> = {
            'metallic': 'M-Type Belt',
            'crystalline': 'C-Type Field',
            'carbonaceous': 'C-Type Belt',
            'icy': 'K-Type Ring',
            'rare_minerals': 'X-Type Cluster'
        };
        
        return gardenType ? classifications[gardenType] || null : null;
    }

    /**
     * Get comet classification for scientific designation
     */
    private getCometClassification(cometTypeName?: string): string | null {
        const classifications: Record<string, string> = {
            'Ice Comet': 'H2O-Rich (Periodic Visitor)',
            'Dust Comet': 'Silicate-Rich (Debris Trail)',
            'Rocky Comet': 'Metal-Rich (Dense Core)',
            'Organic Comet': 'Carbon-Rich (Primordial Composition)'
        };
        
        return cometTypeName ? classifications[cometTypeName] || null : null;
    }
    
    /**
     * Generate comet designation following real astronomical conventions
     * Format: C/YEAR-SNN (e.g., C/2024-S02)
     */
    generateCometName(comet: any): string {
        // Use parent star position and comet index to create consistent designation
        const starX = comet.parentStar?.x || comet.x;
        const starY = comet.parentStar?.y || comet.y;
        const cometIndex = comet.cometIndex || 0;
        
        // Generate year from coordinate hash (keeps names consistent)
        const coordHash = Math.abs(this.hashCoordinate(starX) ^ this.hashCoordinate(starY));
        const year = 2020 + (coordHash % 10); // Years 2020-2029
        
        // Generate sequence number (S01, S02, etc.)
        const sequenceNumber = (cometIndex + 1).toString().padStart(2, '0');
        
        return `C/${year}-S${sequenceNumber}`;
    }

    /**
     * Generate rogue planet designation following planetary nomenclature convention
     * Examples: "RP-1234", "RP-5678-ICE", "RP-9876-VOL"
     */
    generateRoguePlanetName(roguePlanet: RoguePlanet): string {
        // Generate catalog number based on position
        const catalogNumber = this.generateRoguePlanetCatalogNumber(roguePlanet.x, roguePlanet.y);
        const baseName = `RP-${catalogNumber}`;
        
        // Add variant suffix for volcanic variants (most notable)
        if (roguePlanet.variant === 'volcanic') {
            return `${baseName}-VOL`;
        } else if (roguePlanet.variant === 'ice') {
            return `${baseName}-ICE`;
        }
        
        // Rock variants use base name only
        return baseName;
    }

    /**
     * Generate rogue planet catalog number (RP range: 1000-9999)
     */
    private generateRoguePlanetCatalogNumber(x: number, y: number): number {
        const hash1 = this.hashCoordinate(x * 1.7); // Different multiplier from other objects
        const hash2 = this.hashCoordinate(y * 2.1);
        const combined = (hash1 ^ hash2) >>> 0;
        
        // Rogue Planet range: 1000-9999 to distinguish from regular planets
        return 1000 + (combined % 9000);
    }

    /**
     * Generate dark nebula name following the format "[Descriptor] Dark Cloud"
     * Examples: "Serpent Dark Cloud", "Hooded Dark Cloud", "Veil Dark Cloud"
     */
    generateDarkNebulaName(darkNebula: DarkNebula): string {
        // Use predefined descriptors that evoke mystery and darkness
        const descriptors = [
            'Serpent', 'Hooded', 'Veil', 'Shadow', 'Phantom', 'Wraith', 'Ghost', 'Shroud',
            'Cloak', 'Mask', 'Midnight', 'Raven', 'Obsidian', 'Void', 'Eclipse', 'Shade',
            'Specter', 'Umbra', 'Dusk', 'Gloom', 'Mist', 'Fog', 'Haze', 'Soot', 'Ash',
            'Coal', 'Jet', 'Onyx', 'Ebony', 'Pitch', 'Ink', 'Carbon', 'Charcoal'
        ];
        
        // Generate deterministic descriptor based on position
        const catalogNumber = this.generateDarkNebulaCatalogNumber(darkNebula.x, darkNebula.y);
        const descriptorIndex = catalogNumber % descriptors.length;
        const descriptor = descriptors[descriptorIndex];
        
        return `${descriptor} Dark Cloud`;
    }

    /**
     * Generate dark nebula catalog number for deterministic naming
     */
    private generateDarkNebulaCatalogNumber(x: number, y: number): number {
        const hash1 = this.hashCoordinate(x * 2.3); // Different multiplier for dark nebulae  
        const hash2 = this.hashCoordinate(y * 1.9);
        const combined = (hash1 ^ hash2) >>> 0;
        
        // Use full range for descriptor selection
        return combined % 1000000;
    }

    /**
     * Get readable variant name for rogue planet classification
     */
    private getRoguePlanetVariantName(variant?: 'ice' | 'rock' | 'volcanic'): string {
        switch (variant) {
            case 'ice':
                return 'frozen';
            case 'volcanic':
                return 'volcanic';
            case 'rock':
            default:
                return 'rocky';
        }
    }

    /**
     * Get readable variant name for dark nebula classification
     */
    private getDarkNebulaVariantName(variant?: 'dense-core' | 'wispy' | 'globular'): string {
        switch (variant) {
            case 'dense-core':
                return 'dense-core';
            case 'globular':
                return 'globular';
            case 'wispy':
            default:
                return 'wispy';
        }
    }

    /**
     * Generate crystal garden designation following mineral nomenclature convention
     * Examples: "Quartz Crystal Garden", "Amethyst Crystal Garden", "Olivine Crystal Garden"
     */
    generateCrystalGardenName(crystalGarden: CrystalGarden): string {
        // Generate deterministic mineral name based on position
        const mineralName = this.generateMineralName(crystalGarden.x, crystalGarden.y, crystalGarden.variant);
        return `${mineralName} Crystal Garden`;
    }

    /**
     * Get readable variant name for crystal garden classification
     */
    private getCrystalGardenVariantName(variant?: 'pure' | 'mixed' | 'rare-earth'): string {
        switch (variant) {
            case 'pure':
                return 'pure-form';
            case 'rare-earth':
                return 'rare-earth';
            case 'mixed':
            default:
                return 'mixed-composition';
        }
    }

    /**
     * Generate mineral name for crystal gardens based on position and variant
     */
    private generateMineralName(x: number, y: number, variant?: 'pure' | 'mixed' | 'rare-earth'): string {
        const positionSeed = Math.abs(Math.floor(x / 100) * 73 + Math.floor(y / 100) * 37) % 1000;
        
        let mineralList: string[];
        
        switch (variant) {
            case 'pure':
                // Pure crystal types - common single minerals
                mineralList = [
                    'Quartz', 'Calcite', 'Fluorite', 'Gypsum', 'Barite', 'Celestine',
                    'Pyrite', 'Galena', 'Sphalerite', 'Hematite', 'Magnetite', 'Malachite'
                ];
                break;
            case 'mixed':
                // Mixed crystal types - common combinations and colored variants
                mineralList = [
                    'Amethyst', 'Citrine', 'Rose Quartz', 'Smoky Quartz', 'Tiger\'s Eye', 'Agate',
                    'Jasper', 'Carnelian', 'Onyx', 'Chalcedony', 'Aventurine', 'Amazonite',
                    'Sodalite', 'Lapis Lazuli', 'Turquoise', 'Malachite', 'Azurite', 'Chrysocolla'
                ];
                break;
            case 'rare-earth':
                // Rare earth and exotic minerals
                mineralList = [
                    'Moldavite', 'Labradorite', 'Moonstone', 'Sunstone', 'Spectrolite', 'Ammolite',
                    'Bixbite', 'Painite', 'Jadeite', 'Red Beryl', 'Taaffeite', 'Jeremejevite',
                    'Benitoite', 'Padparadscha', 'Alexandrite', 'Tanzanite', 'Olivine', 'Peridot'
                ];
                break;
            default:
                mineralList = ['Quartz', 'Calcite', 'Fluorite'];
        }
        
        const mineralIndex = positionSeed % mineralList.length;
        return mineralList[mineralIndex];
    }
}