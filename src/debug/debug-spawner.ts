// Debug object spawner for testing ultra-rare objects in development builds only
// This file should be completely excluded from production builds

import { SeededRandom } from '../utils/random.js';
import { generateWormholePair, Wormhole } from '../celestial/wormholes.js';
import { generateBlackHole, BlackHole, BlackHoleTypes } from '../celestial/blackholes.js';
import { Star, Planet, StarTypes, PlanetTypes } from '../celestial/celestial.js';
import { Nebula, selectNebulaType } from '../celestial/nebulae.js';
import { AsteroidGarden, selectAsteroidGardenType } from '../celestial/asteroids.js';
import { Comet, selectCometType, CometTypes } from '../celestial/comets.js';
import { RoguePlanet } from '../celestial/RegionSpecificObjects.js';
import { NamingService } from '../naming/naming.js';
import type { Camera } from '../camera/camera.js';
import type { ChunkManager } from '../world/world.js';

export class DebugSpawner {
    /**
     * Spawn a linked wormhole pair near the player for testing
     * Creates both alpha and beta wormholes with proper linking
     */
    static spawnWormholePair(camera: Camera, chunkManager: ChunkManager, debugModeEnabled: boolean = true): void {
        // Only allow when debug mode is enabled
        if (!debugModeEnabled) {
            console.warn('Debug spawning requires debug mode to be enabled');
            return;
        }

        // Generate positions near player but not too close
        const playerX = camera.x;
        const playerY = camera.y;
        
        // Alpha wormhole: 300 pixels away at random angle
        const alphaAngle = Math.random() * Math.PI * 2;
        const alphaDistance = 300;
        const alphaX = playerX + Math.cos(alphaAngle) * alphaDistance;
        const alphaY = playerY + Math.sin(alphaAngle) * alphaDistance;
        
        // Beta wormhole: 10,000-50,000 pixels away in different direction (cosmic scale for testing)
        const betaAngle = alphaAngle + Math.PI + (Math.random() - 0.5) * Math.PI; // Opposite side with variation
        const betaDistance = 10000 + Math.random() * 40000; // 10,000-50,000 pixels (cosmic scale)
        const betaX = playerX + Math.cos(betaAngle) * betaDistance;
        const betaY = playerY + Math.sin(betaAngle) * betaDistance;
        
        // Create unique wormhole ID for this debug pair
        const debugId = `DEBUG-${Date.now()}`;
        
        // Generate the wormhole pair using existing system
        const debugRng = new SeededRandom(Date.now());
        const [alphaWormhole, betaWormhole] = generateWormholePair(
            alphaX, alphaY, 
            betaX, betaY, 
            debugId, 
            debugRng
        );
        
        // Auto-discover both wormholes for immediate testing
        alphaWormhole.discovered = true;
        betaWormhole.discovered = true;
        
        // Store the wormholes in debug registry for the world system
        if (!chunkManager.debugObjects) {
            chunkManager.debugObjects = [];
        }
        chunkManager.debugObjects.push({
            type: 'wormhole',
            object: alphaWormhole,
            x: alphaX,
            y: alphaY
        });
        chunkManager.debugObjects.push({
            type: 'wormhole',
            object: betaWormhole,
            x: betaX,
            y: betaY
        });
        
        // Generate proper names for the wormholes
        const namingService = new NamingService();
        const alphaName = namingService.generateWormholeName(alphaWormhole as any);
        const betaName = namingService.generateWormholeName(betaWormhole as any);
        
        // Save discovery state with proper naming
        const alphaId = chunkManager.getObjectId(alphaX, alphaY, 'wormhole', alphaWormhole);
        const betaId = chunkManager.getObjectId(betaX, betaY, 'wormhole', betaWormhole);
        
        chunkManager.discoveredObjects.set(alphaId, {
            discovered: true,
            timestamp: Date.now(),
            wormholeId: debugId,
            designation: 'alpha',
            objectName: alphaName
        });
        
        chunkManager.discoveredObjects.set(betaId, {
            discovered: true,
            timestamp: Date.now(),
            wormholeId: debugId,
            designation: 'beta',
            objectName: betaName
        });
        
        // Ensure wormholes are added to their respective chunks
        const alphaChunkCoords = chunkManager.getChunkCoords(alphaX, alphaY);
        const betaChunkCoords = chunkManager.getChunkCoords(betaX, betaY);
        
        // Directly add wormholes to existing chunks (generateChunk won't re-run generation for existing chunks)
        const alphaChunkKey = chunkManager.getChunkKey(alphaChunkCoords.x, alphaChunkCoords.y);
        const betaChunkKey = chunkManager.getChunkKey(betaChunkCoords.x, betaChunkCoords.y);
        
        let alphaChunk = chunkManager.activeChunks.get(alphaChunkKey);
        if (!alphaChunk) {
            alphaChunk = chunkManager.generateChunk(alphaChunkCoords.x, alphaChunkCoords.y);
        } else {
            alphaChunk.wormholes.push(alphaWormhole);
        }
        
        let betaChunk = chunkManager.activeChunks.get(betaChunkKey);
        if (!betaChunk) {
            betaChunk = chunkManager.generateChunk(betaChunkCoords.x, betaChunkCoords.y);
        } else {
            betaChunk.wormholes.push(betaWormhole);
        }

        console.log(`🌀 DEBUG: Spawned wormhole pair ${debugId}`);
        console.log(`  α (Alpha): (${Math.round(alphaX)}, ${Math.round(alphaY)})`);
        console.log(`  β (Beta): (${Math.round(betaX)}, ${Math.round(betaY)})`);
        console.log(`  Navigate to either coordinate to test FTL traversal`);
    }
    
    /**
     * Spawn a black hole near the player for testing gravitational effects
     */
    static spawnBlackHole(camera: Camera, chunkManager: ChunkManager, blackHoleType?: string, debugModeEnabled: boolean = true): void {
        // Only allow when debug mode is enabled
        if (!debugModeEnabled) {
            console.warn('Debug spawning requires debug mode to be enabled');
            return;
        }
        
        try {
            // Generate position near player but at safe distance
            const playerX = camera.x;
            const playerY = camera.y;
            
            // Spawn at safe distance but close enough to be in nearby chunks
            const angle = Math.random() * Math.PI * 2;
            const distance = 1800 + Math.random() * 400; // 1800-2200 pixels - safe but within 2-3 chunks
            const blackHoleX = playerX + Math.cos(angle) * distance;
            const blackHoleY = playerY + Math.sin(angle) * distance;
            
            // Generate black hole with optional type specification
            const debugRng = new SeededRandom(Date.now());
            let blackHole;
            
            if (blackHoleType) {
                // Map console-friendly names to BlackHoleTypes keys
                const blackHoleTypeMapping = {
                    'stellar-mass': 'STELLAR_MASS',
                    'supermassive': 'SUPERMASSIVE'
                };
                
                const mappedType = blackHoleTypeMapping[blackHoleType];
                if (mappedType && BlackHoleTypes[mappedType]) {
                    const selectedBlackHoleType = BlackHoleTypes[mappedType];
                    blackHole = new BlackHole(blackHoleX, blackHoleY, selectedBlackHoleType);
                    blackHole.initWithSeed(debugRng, selectedBlackHoleType);
                } else {
                    console.log(`❌ Unknown black hole type: ${blackHoleType}. Use 'list blackhole' to see valid types.`);
                    return;
                }
            } else {
                // Random black hole type (existing behavior)
                blackHole = generateBlackHole(blackHoleX, blackHoleY, debugRng);
            }
            
            // Auto-discover for immediate testing
            blackHole.discovered = true;
            
            // Store the black hole in debug registry for the world system
            if (!chunkManager.debugObjects) {
                chunkManager.debugObjects = [];
            }
            chunkManager.debugObjects.push({
                type: 'blackhole',
                object: blackHole,
                x: blackHoleX,
                y: blackHoleY
            });
            
            // Save discovery state
            const blackHoleId = chunkManager.getObjectId(blackHoleX, blackHoleY, 'blackhole', blackHole);
            chunkManager.discoveredObjects.set(blackHoleId, {
                discovered: true,
                timestamp: Date.now(),
                blackHoleTypeName: blackHole.blackHoleTypeName
            });
            
            // Ensure black hole is added to its chunk (handle existing chunks)
            const chunkCoords = chunkManager.getChunkCoords(blackHoleX, blackHoleY);
            const chunkKey = chunkManager.getChunkKey(chunkCoords.x, chunkCoords.y);
            
            let chunk = chunkManager.activeChunks.get(chunkKey);
            if (!chunk) {
                chunk = chunkManager.generateChunk(chunkCoords.x, chunkCoords.y);
            } else {
                chunk.blackholes.push(blackHole);
            }
            
            console.log(`🕳️ DEBUG: Spawned ${blackHole.blackHoleTypeName} at (${Math.round(blackHoleX)}, ${Math.round(blackHoleY)})`);
            console.log(`  Distance from player: ${Math.round(distance)} pixels - Safe to approach`);
            
        } catch (error) {
            console.error('❌ DEBUG: Error spawning black hole:', error);
            console.error(error.stack);
        }
    }
    
    /**
     * Check if debug spawning is available
     * For now, always return true since we're in development
     * In production builds, this entire file should be excluded
     */
    static isDebugModeAvailable(): boolean {
        // Simple browser-based check - assume debug mode if this code exists
        return true;
    }
    
    /**
     * Log debug help information
     */
    static showDebugHelp(): void {
        if (!this.isDebugModeAvailable()) {
            console.log('Debug mode is not available in production builds');
            return;
        }
        
        console.log('🛠️  DEBUG MODE ACTIVE');
        console.log('Available debug commands:');
        console.log('  Shift + W: Spawn wormhole pair for FTL testing');
        console.log('  Shift + B: Spawn black hole for gravity testing');
        console.log('  Shift + I: Inspect current chunk contents');
        console.log('  Note: Objects are auto-discovered and spawn near your current position');
    }

    /**
     * Inspect the current chunk for debugging
     */
    static inspectCurrentChunk(camera: Camera, chunkManager: ChunkManager): void {
        console.log('🔍 DEBUG: Inspecting current chunk...');
        
        const playerX = camera.x;
        const playerY = camera.y;
        const chunkCoords = chunkManager.getChunkCoords(playerX, playerY);
        const chunkKey = chunkManager.getChunkKey(chunkCoords.x, chunkCoords.y);
        
        console.log(`  Player position: (${Math.round(playerX)}, ${Math.round(playerY)})`);
        console.log(`  Current chunk: (${chunkCoords.x}, ${chunkCoords.y}) [Key: ${chunkKey}]`);
        
        // Also check which chunks are active
        console.log(`  Active chunk keys: [${Array.from(chunkManager.activeChunks.keys()).join(', ')}]`);
        
        const chunk = chunkManager.activeChunks.get(chunkKey);
        if (chunk) {
            console.log(`  Chunk contents:`);
            console.log(`    Stars: ${chunk.stars.length}`);
            console.log(`    Celestial Stars: ${chunk.celestialStars.length}`);
            console.log(`    Planets: ${chunk.planets.length}`);
            console.log(`    Moons: ${chunk.moons.length}`);
            console.log(`    Nebulae: ${chunk.nebulae.length}`);
            console.log(`    Asteroid Gardens: ${chunk.asteroidGardens.length}`);
            console.log(`    Wormholes: ${chunk.wormholes.length}`);
            console.log(`    Black Holes: ${chunk.blackholes.length}`);
            
            // List black holes in detail
            if (chunk.blackholes.length > 0) {
                console.log(`  Black hole details:`);
                chunk.blackholes.forEach((bh, index) => {
                    console.log(`    ${index + 1}. ${bh.blackHoleTypeName} at (${Math.round(bh.x)}, ${Math.round(bh.y)}) - Discovered: ${bh.discovered}`);
                });
            }
        } else {
            console.log('  Chunk not loaded!');
        }
        
        // Also check all active chunks for black holes
        console.log(`  Total active chunks: ${chunkManager.activeChunks.size}`);
        let totalBlackHoles = 0;
        console.log(`  Searching all active chunks for ultra-rare objects:`);
        let totalWormholes = 0;
        for (const [key, activeChunk] of chunkManager.activeChunks) {
            // Check for wormholes
            if (activeChunk.wormholes.length > 0) {
                console.log(`    Chunk ${key}: ${activeChunk.wormholes.length} wormholes`);
                activeChunk.wormholes.forEach((wh, index) => {
                    const distance = Math.sqrt((wh.x - playerX)**2 + (wh.y - playerY)**2);
                    console.log(`      ${index + 1}. Wormhole ${wh.designation} at (${Math.round(wh.x)}, ${Math.round(wh.y)}) - Distance: ${Math.round(distance)}px - Discovered: ${wh.discovered}`);
                });
            }
            totalWormholes += activeChunk.wormholes.length;
            
            // Check for black holes
            if (activeChunk.blackholes.length > 0) {
                console.log(`    Chunk ${key}: ${activeChunk.blackholes.length} black holes`);
                activeChunk.blackholes.forEach((bh, index) => {
                    const distance = Math.sqrt((bh.x - playerX)**2 + (bh.y - playerY)**2);
                    console.log(`      ${index + 1}. ${bh.blackHoleTypeName} at (${Math.round(bh.x)}, ${Math.round(bh.y)}) - Distance: ${Math.round(distance)}px - Discovered: ${bh.discovered}`);
                });
            }
            totalBlackHoles += activeChunk.blackholes.length;
        }
        console.log(`  Total wormholes in all active chunks: ${totalWormholes}`);
        console.log(`  Total black holes in all active chunks: ${totalBlackHoles}`);
    }

    /**
     * Spawn a star near the player for testing
     */
    static spawnStar(camera: Camera, chunkManager: ChunkManager, starType?: string, debugModeEnabled: boolean = true): void {
        if (!debugModeEnabled) {
            console.warn('Debug spawning requires debug mode to be enabled');
            return;
        }

        try {
            const playerX = camera.x;
            const playerY = camera.y;
            
            // Spawn at moderate distance 
            const angle = Math.random() * Math.PI * 2;
            const distance = 800 + Math.random() * 400; // 800-1200 pixels
            const starX = playerX + Math.cos(angle) * distance;
            const starY = playerY + Math.sin(angle) * distance;
            
            // Select star type with proper mapping from console names to StarTypes keys
            const debugRng = new SeededRandom(Date.now());
            let selectedStarType;
            
            if (starType) {
                // Map console-friendly names to StarTypes keys
                const starTypeMapping = {
                    'red-giant': 'RED_GIANT',
                    'blue-giant': 'BLUE_GIANT',
                    'white-dwarf': 'WHITE_DWARF',
                    'yellow-dwarf': 'G_TYPE',
                    'orange-dwarf': 'K_TYPE', 
                    'red-dwarf': 'M_TYPE',
                    'neutron-star': 'NEUTRON_STAR'
                };
                
                const mappedType = starTypeMapping[starType];
                if (mappedType && StarTypes[mappedType]) {
                    selectedStarType = StarTypes[mappedType];
                } else {
                    console.log(`❌ Unknown star type: ${starType}. Use 'list star' to see valid types.`);
                    return;
                }
            } else {
                // Random star type
                const starTypeNames = Object.keys(StarTypes);
                const randomTypeName = starTypeNames[Math.floor(debugRng.next() * starTypeNames.length)];
                selectedStarType = StarTypes[randomTypeName];
            }
            
            const star = new Star(starX, starY, selectedStarType);
            star.discovered = true;
            
            this.addObjectToChunk(chunkManager, 'star', star, starX, starY);
            
            console.log(`⭐ DEBUG: Spawned ${selectedStarType.name} at (${Math.round(starX)}, ${Math.round(starY)})`);
            console.log(`  Distance from player: ${Math.round(distance)} pixels`);
            
        } catch (error) {
            console.error('❌ DEBUG: Error spawning star:', error);
        }
    }

    /**
     * Spawn a planet near the player for testing
     */
    static spawnPlanet(camera: Camera, chunkManager: ChunkManager, planetType?: string, debugModeEnabled: boolean = true): void {
        if (!debugModeEnabled) {
            console.warn('Debug spawning requires debug mode to be enabled');
            return;
        }

        try {
            const playerX = camera.x;
            const playerY = camera.y;
            
            // Spawn at close distance for planet testing
            const angle = Math.random() * Math.PI * 2;
            const distance = 400 + Math.random() * 300; // 400-700 pixels
            const planetX = playerX + Math.cos(angle) * distance;
            const planetY = playerY + Math.sin(angle) * distance;
            
            // Create a dummy parent star for orbital mechanics
            const debugRng = new SeededRandom(Date.now());
            const dummyStarType = StarTypes.G_TYPE; // Yellow dwarf for planet testing
            const dummyStar = new Star(planetX, planetY, dummyStarType);
            
            // Select planet type with proper mapping
            let selectedPlanetType;
            
            if (planetType) {
                // Map console-friendly names to PlanetTypes keys
                const planetTypeMapping = {
                    'rocky': 'ROCKY',
                    'gas-giant': 'GAS_GIANT',
                    'ocean': 'OCEAN',
                    'desert': 'DESERT',
                    'volcanic': 'VOLCANIC',
                    'frozen': 'FROZEN',
                    'exotic': 'EXOTIC'
                };
                
                const mappedType = planetTypeMapping[planetType];
                if (mappedType && PlanetTypes[mappedType]) {
                    selectedPlanetType = PlanetTypes[mappedType];
                } else {
                    console.log(`❌ Unknown planet type: ${planetType}. Use 'list planet' to see valid types.`);
                    return;
                }
            } else {
                // Random planet type
                const planetTypeNames = Object.keys(PlanetTypes);
                const randomTypeName = planetTypeNames[Math.floor(debugRng.next() * planetTypeNames.length)];
                selectedPlanetType = PlanetTypes[randomTypeName];
            }
            
            // Create planet with basic orbital parameters
            const orbitalDistance = 50 + Math.random() * 100; // Small orbit for testing
            const orbitalAngle = Math.random() * Math.PI * 2;
            const orbitalSpeed = 0.001 + Math.random() * 0.002;
            
            const planet = new Planet(planetX, planetY, dummyStar, orbitalDistance, orbitalAngle, orbitalSpeed, selectedPlanetType);
            planet.discovered = true;
            
            this.addObjectToChunk(chunkManager, 'planet', planet, planetX, planetY);
            
            console.log(`🪐 DEBUG: Spawned ${selectedPlanetType.name} at (${Math.round(planetX)}, ${Math.round(planetY)})`);
            console.log(`  Distance from player: ${Math.round(distance)} pixels`);
            
        } catch (error) {
            console.error('❌ DEBUG: Error spawning planet:', error);
        }
    }

    /**
     * Spawn a nebula near the player for testing
     */
    static spawnNebula(camera: Camera, chunkManager: ChunkManager, nebulaType?: string, debugModeEnabled: boolean = true): void {
        if (!debugModeEnabled) {
            console.warn('Debug spawning requires debug mode to be enabled');
            return;
        }

        try {
            const playerX = camera.x;
            const playerY = camera.y;
            
            // Spawn at good viewing distance
            const angle = Math.random() * Math.PI * 2;
            const distance = 600 + Math.random() * 500; // 600-1100 pixels
            const nebulaX = playerX + Math.cos(angle) * distance;
            const nebulaY = playerY + Math.sin(angle) * distance;
            
            const debugRng = new SeededRandom(Date.now());
            const selectedNebulaType = nebulaType || selectNebulaType(debugRng);
            
            const nebula = new Nebula(nebulaX, nebulaY, selectedNebulaType, debugRng);
            nebula.discovered = true;
            
            this.addObjectToChunk(chunkManager, 'nebula', nebula, nebulaX, nebulaY);
            
            console.log(`🌌 DEBUG: Spawned ${selectedNebulaType} nebula at (${Math.round(nebulaX)}, ${Math.round(nebulaY)})`);
            console.log(`  Distance from player: ${Math.round(distance)} pixels`);
            
        } catch (error) {
            console.error('❌ DEBUG: Error spawning nebula:', error);
        }
    }

    /**
     * Spawn an asteroid garden near the player for testing
     */
    static spawnAsteroidGarden(camera: Camera, chunkManager: ChunkManager, asteroidType?: string, debugModeEnabled: boolean = true): void {
        if (!debugModeEnabled) {
            console.warn('Debug spawning requires debug mode to be enabled');
            return;
        }

        try {
            const playerX = camera.x;
            const playerY = camera.y;
            
            // Spawn at close distance for detailed viewing
            const angle = Math.random() * Math.PI * 2;
            const distance = 300 + Math.random() * 400; // 300-700 pixels
            const asteroidX = playerX + Math.cos(angle) * distance;
            const asteroidY = playerY + Math.sin(angle) * distance;
            
            const debugRng = new SeededRandom(Date.now());
            const selectedAsteroidType = asteroidType || selectAsteroidGardenType(debugRng);
            
            const asteroidGarden = new AsteroidGarden(asteroidX, asteroidY, selectedAsteroidType, debugRng);
            asteroidGarden.discovered = true;
            
            this.addObjectToChunk(chunkManager, 'asteroidGarden', asteroidGarden, asteroidX, asteroidY);
            
            console.log(`🪨 DEBUG: Spawned ${selectedAsteroidType} asteroid garden at (${Math.round(asteroidX)}, ${Math.round(asteroidY)})`);
            console.log(`  Distance from player: ${Math.round(distance)} pixels`);
            
        } catch (error) {
            console.error('❌ DEBUG: Error spawning asteroid garden:', error);
        }
    }

    /**
     * Spawn a comet near the player for testing
     */
    static spawnComet(camera: Camera, chunkManager: ChunkManager, cometType?: string, debugModeEnabled: boolean = true): void {
        if (!debugModeEnabled) {
            console.warn('Debug spawning requires debug mode to be enabled');
            return;
        }

        try {
            const playerX = camera.x;
            const playerY = camera.y;
            
            // Spawn at medium distance
            const angle = Math.random() * Math.PI * 2;
            const distance = 500 + Math.random() * 400; // 500-900 pixels
            const cometX = playerX + Math.cos(angle) * distance;
            const cometY = playerY + Math.sin(angle) * distance;
            
            // Create a dummy parent star for orbital mechanics
            const debugRng = new SeededRandom(Date.now());
            const dummyStarType = StarTypes.G_TYPE; // Yellow dwarf for comet testing
            
            // Place dummy star offset from comet position for realistic orbital mechanics
            const starOffset = 300; // Star distance from comet
            const starAngle = Math.random() * Math.PI * 2;
            const starX = cometX + Math.cos(starAngle) * starOffset;
            const starY = cometY + Math.sin(starAngle) * starOffset;
            const dummyStar = new Star(starX, starY, dummyStarType);
            
            // Select comet type with optional mapping
            let selectedCometType;
            
            if (cometType) {
                // Map console-friendly names to CometTypes keys
                const cometTypeMapping = {
                    'ice': 'ICE',
                    'dust': 'DUST', 
                    'rocky': 'ROCKY',
                    'organic': 'ORGANIC'
                };
                
                const mappedType = cometTypeMapping[cometType];
                if (mappedType && CometTypes[mappedType]) {
                    selectedCometType = CometTypes[mappedType];
                } else {
                    console.log(`❌ Unknown comet type: ${cometType}. Use 'list comet' to see valid types.`);
                    return;
                }
            } else {
                // Random comet type
                selectedCometType = selectCometType(debugRng);
            }
            
            // Create simple orbit for testing - match actual positioning for visibility
            // Since comet is 300px from star, set perihelion to be closer to guarantee visibility
            const actualDistance = starOffset; // 300px
            const perihelionDistance = actualDistance * 0.8; // Closer perihelion for visibility
            const semiMajorAxis = actualDistance * 1.2; // Slightly larger orbit
            const eccentricity = (semiMajorAxis - perihelionDistance) / semiMajorAxis;
            
            const orbit = {
                semiMajorAxis: semiMajorAxis,
                eccentricity: eccentricity,
                perihelionDistance: perihelionDistance,
                aphelionDistance: semiMajorAxis * (1 + eccentricity),
                orbitalPeriod: 1000 + Math.random() * 2000,
                argumentOfPerihelion: Math.random() * Math.PI * 2,
                meanAnomalyAtEpoch: Math.random() * Math.PI * 2,
                epoch: Date.now()
            };
            
            const comet = new Comet(cometX, cometY, dummyStar, orbit, selectedCometType, 0);
            comet.discovered = true;
            
            // Add both the dummy star and comet to chunks
            this.addObjectToChunk(chunkManager, 'star', dummyStar, starX, starY);
            this.addObjectToChunk(chunkManager, 'comet', comet, cometX, cometY);
            
            console.log(`☄️ DEBUG: Spawned ${selectedCometType.name} comet at (${Math.round(cometX)}, ${Math.round(cometY)})`);
            console.log(`  ⭐ DEBUG: Spawned dummy ${dummyStarType.name} star at (${Math.round(starX)}, ${Math.round(starY)})`);
            console.log(`  Distance from player: ${Math.round(distance)} pixels`);
            
        } catch (error) {
            console.error('❌ DEBUG: Error spawning comet:', error);
        }
    }

    // ===== REGION-SPECIFIC OBJECT SPAWN METHODS (Phase 0 Placeholders) =====

    /**
     * Spawn a rogue planet near the player for testing (Phase 1)
     */
    static spawnRoguePlanet(camera: Camera, chunkManager: ChunkManager, variant?: string, debugModeEnabled: boolean = true): void {
        if (!debugModeEnabled) {
            console.warn('Debug spawning requires debug mode to be enabled');
            return;
        }

        const distance = 150 + Math.random() * 100;
        const angle = Math.random() * Math.PI * 2;
        const x = camera.x + Math.cos(angle) * distance;
        const y = camera.y + Math.sin(angle) * distance;

        const validVariants: ('ice' | 'rock' | 'volcanic')[] = ['ice', 'rock', 'volcanic'];
        const selectedVariant = (variant && validVariants.includes(variant as any)) ? variant as 'ice' | 'rock' | 'volcanic' : validVariants[Math.floor(Math.random() * validVariants.length)];
        
        const roguePlanet = new RoguePlanet(x, y, selectedVariant);
        roguePlanet.discovered = true;

        this.addObjectToChunk(chunkManager, 'rogue-planet', roguePlanet, x, y);
        console.log(`🪐 DEBUG: Spawned ${selectedVariant} rogue planet at (${Math.round(x)}, ${Math.round(y)})`);
    }


    /**
     * Helper method to add objects to the appropriate chunk
     */
    private static addObjectToChunk(chunkManager: ChunkManager, objectType: string, object: any, x: number, y: number): void {
        // Store in debug registry
        if (!chunkManager.debugObjects) {
            chunkManager.debugObjects = [];
        }
        chunkManager.debugObjects.push({
            type: objectType,
            object: object,
            x: x,
            y: y
        });
        
        // Add to discovery state
        const objectId = chunkManager.getObjectId(x, y, objectType, object);
        chunkManager.discoveredObjects.set(objectId, {
            discovered: true,
            timestamp: Date.now()
        });
        
        // Add to appropriate chunk
        const chunkCoords = chunkManager.getChunkCoords(x, y);
        const chunkKey = chunkManager.getChunkKey(chunkCoords.x, chunkCoords.y);
        
        let chunk = chunkManager.activeChunks.get(chunkKey);
        if (!chunk) {
            chunk = chunkManager.generateChunk(chunkCoords.x, chunkCoords.y);
        } else {
            // Add to existing chunk
            switch (objectType) {
                case 'star':
                    chunk.celestialStars.push(object);
                    break;
                case 'planet':
                    chunk.planets.push(object);
                    break;
                case 'nebula':
                    chunk.nebulae.push(object);
                    break;
                case 'asteroidGarden':
                    chunk.asteroidGardens.push(object);
                    break;
                case 'comet':
                    chunk.comets.push(object);
                    break;
                case 'blackhole':
                    chunk.blackholes.push(object);
                    break;
                case 'wormhole':
                    chunk.wormholes.push(object);
                    break;
                // Region-specific objects (Phase 0: rogue-planet only)
                case 'rogue-planet':
                    chunk.roguePlanets.push(object);
                    break;
            }
        }
    }
}