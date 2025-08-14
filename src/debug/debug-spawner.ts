// Debug object spawner for testing ultra-rare objects in development builds only
// This file should be completely excluded from production builds

import { SeededRandom } from '../utils/random.js';
import { generateWormholePair, Wormhole } from '../celestial/wormholes.js';
import { generateBlackHole, BlackHole } from '../celestial/blackholes.js';
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
        
        // Beta wormhole: 800-1200 pixels away in different direction
        const betaAngle = alphaAngle + Math.PI + (Math.random() - 0.5) * Math.PI; // Opposite side with variation
        const betaDistance = 800 + Math.random() * 400; // 800-1200 pixels
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
    static spawnBlackHole(camera: Camera, chunkManager: ChunkManager, debugModeEnabled: boolean = true): void {
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
            
            // Generate black hole using existing system
            const debugRng = new SeededRandom(Date.now());
            const blackHole = generateBlackHole(blackHoleX, blackHoleY, debugRng);
            
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
            
            // Force generation of the chunk containing the black hole
            const chunkCoords = chunkManager.getChunkCoords(blackHoleX, blackHoleY);
            chunkManager.generateChunk(chunkCoords.x, chunkCoords.y);
            
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
}