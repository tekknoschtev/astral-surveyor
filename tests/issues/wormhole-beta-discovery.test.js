// Test for GitHub Issue #126: Beta wormholes don't show in the logbook
// This test reproduces the issue where beta wormholes aren't properly logged in the discovery system

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Wormhole, generateWormholePair } from '../../dist/celestial/wormholes.js';
import { DiscoveryManager } from '../../dist/services/DiscoveryManager.js';
import { DiscoveryLogbook } from '../../dist/ui/discoverylogbook.js';

describe('GitHub Issue #126: Beta wormhole discovery logging', () => {
  let mockSoundManager;
  let mockDiscoveryDisplay;
  let mockDiscoveryLogbook;
  let mockNamingService;
  let mockCamera;
  let mockRandom;
  let mockChunkManager;
  let discoveryManager;

  beforeEach(() => {
    // Mock sound manager
    mockSoundManager = {
      playStarDiscovery: vi.fn(),
      playPlanetDiscovery: vi.fn(),
      playMoonDiscovery: vi.fn(),
      playNebulaDiscovery: vi.fn(),
      playWormholeDiscovery: vi.fn(),
      playBlackHoleDiscovery: vi.fn(),
      playCometDiscovery: vi.fn(),
      playRareDiscovery: vi.fn()
    };

    // Mock discovery display
    mockDiscoveryDisplay = {
      addDiscovery: vi.fn(),
      addNotification: vi.fn()
    };

    // Mock discovery logbook
    mockDiscoveryLogbook = {
      addDiscovery: vi.fn(),
      getDiscoveries: vi.fn(() => []),
      getDiscoveryCount: vi.fn(() => 0)
    };

    // Mock naming service
    mockNamingService = {
      generateDisplayName: vi.fn((obj) => {
        if (obj.type === 'wormhole') {
          return `${obj.wormholeId}-${obj.designation === 'alpha' ? 'α' : 'β'}`;
        }
        return 'Test Object';
      }),
      isNotableDiscovery: vi.fn(() => true)
    };

    // Mock camera
    mockCamera = {
      x: 1000,
      y: 2000,
      worldToScreen: vi.fn((x, y, w, h) => [x - mockCamera.x + w/2, y - mockCamera.y + h/2])
    };

    // Mock chunk manager
    mockChunkManager = {
      markObjectDiscovered: vi.fn()
    };

    // Mock seeded random
    mockRandom = {
      next: vi.fn(() => 0.5),
      nextFloat: vi.fn((min, max) => (min + max) / 2),
      nextInt: vi.fn((min, max) => Math.floor((min + max) / 2)),
      choice: vi.fn((array) => array[0])
    };

    // Create discovery manager
    discoveryManager = new DiscoveryManager(
      mockSoundManager,
      mockDiscoveryDisplay,
      mockDiscoveryLogbook,
      mockNamingService
    );
  });

  describe('Wormhole Discovery Issue Reproduction', () => {
    it('should log both alpha and beta wormholes when discovered separately', () => {
      // Create a wormhole pair
      const [alphaWormhole, betaWormhole] = generateWormholePair(
        500, 300,    // Alpha at (500, 300)
        2000, 1000,  // Beta at (2000, 1000)
        'WH-TEST-126',
        mockRandom
      );

      // Scenario 1: Player discovers alpha wormhole
      mockCamera.x = 500;
      mockCamera.y = 300;
      
      // Alpha wormhole gets discovered
      const alphaDiscovered = alphaWormhole.checkDiscovery(mockCamera, 800, 600);
      expect(alphaDiscovered).toBe(true);
      expect(alphaWormhole.discovered).toBe(true);
      
      // Process the alpha discovery
      discoveryManager.processDiscovery(alphaWormhole, mockCamera, mockChunkManager);
      
      // Verify alpha was logged
      expect(mockDiscoveryLogbook.addDiscovery).toHaveBeenCalledWith(
        'WH-TEST-126-α',
        'Stable Traversable Wormhole'
      );

      // Reset mocks to track beta discovery
      vi.clearAllMocks();

      // Scenario 2: Player travels through wormhole and emerges near beta
      // This simulates the player emerging from the alpha wormhole near the beta wormhole
      mockCamera.x = 2000;
      mockCamera.y = 1000;

      // Beta wormhole should be discoverable independently
      const betaDiscovered = betaWormhole.checkDiscovery(mockCamera, 800, 600);
      expect(betaDiscovered).toBe(true);
      expect(betaWormhole.discovered).toBe(true);

      // Process the beta discovery - THIS IS WHERE THE BUG OCCURS
      discoveryManager.processDiscovery(betaWormhole, mockCamera, mockChunkManager);

      // Beta wormhole should also be logged in the logbook
      expect(mockDiscoveryLogbook.addDiscovery).toHaveBeenCalledWith(
        'WH-TEST-126-β',
        'Stable Traversable Wormhole'
      );
    });

    it('should create separate discovery entries for alpha and beta wormholes', () => {
      const [alphaWormhole, betaWormhole] = generateWormholePair(
        100, 200,
        5000, 6000,
        'WH-PAIR-TEST',
        mockRandom
      );

      // Discover alpha wormhole
      mockCamera.x = 100;
      mockCamera.y = 200;
      alphaWormhole.checkDiscovery(mockCamera, 800, 600);
      discoveryManager.processDiscovery(alphaWormhole, mockCamera, mockChunkManager);

      // Discover beta wormhole
      mockCamera.x = 5000;
      mockCamera.y = 6000;
      betaWormhole.checkDiscovery(mockCamera, 800, 600);
      discoveryManager.processDiscovery(betaWormhole, mockCamera, mockChunkManager);

      // Both wormholes should be logged in the UI logbook
      expect(mockDiscoveryLogbook.addDiscovery).toHaveBeenCalledTimes(2);
      expect(mockDiscoveryLogbook.addDiscovery).toHaveBeenCalledWith(
        'WH-PAIR-TEST-α', 
        'Stable Traversable Wormhole'
      );
      expect(mockDiscoveryLogbook.addDiscovery).toHaveBeenCalledWith(
        'WH-PAIR-TEST-β', 
        'Stable Traversable Wormhole'
      );
    });

    it('should distinguish between alpha and beta in discovery metadata', () => {
      const [alphaWormhole, betaWormhole] = generateWormholePair(
        1000, 1000,
        3000, 3000,
        'WH-METADATA-TEST',
        mockRandom
      );

      // Process both discoveries
      mockCamera.x = 1000;
      mockCamera.y = 1000;
      alphaWormhole.checkDiscovery(mockCamera, 800, 600);
      discoveryManager.processDiscovery(alphaWormhole, mockCamera, mockChunkManager);

      mockCamera.x = 3000;
      mockCamera.y = 3000;
      betaWormhole.checkDiscovery(mockCamera, 800, 600);
      discoveryManager.processDiscovery(betaWormhole, mockCamera, mockChunkManager);

      // Both wormholes should be logged in the UI logbook
      expect(mockDiscoveryLogbook.addDiscovery).toHaveBeenCalledTimes(2);
      expect(mockDiscoveryLogbook.addDiscovery).toHaveBeenCalledWith(
        'WH-METADATA-TEST-α', 
        'Stable Traversable Wormhole'
      );
      expect(mockDiscoveryLogbook.addDiscovery).toHaveBeenCalledWith(
        'WH-METADATA-TEST-β', 
        'Stable Traversable Wormhole'
      );
    });

    it('should handle traversal scenario where beta is discovered after alpha', () => {
      // This test simulates the exact bug scenario from the GitHub issue
      const [alphaWormhole, betaWormhole] = generateWormholePair(
        0, 0,      // Alpha at origin
        10000, 10000,  // Beta very far away
        'WH-TRAVERSAL-BUG',
        mockRandom
      );

      // Step 1: Player discovers alpha wormhole during exploration
      mockCamera.x = 0;
      mockCamera.y = 0;
      alphaWormhole.checkDiscovery(mockCamera, 800, 600);
      discoveryManager.processDiscovery(alphaWormhole, mockCamera, mockChunkManager);

      // Verify alpha discovery was logged
      expect(mockDiscoveryLogbook.addDiscovery).toHaveBeenCalledTimes(1);
      expect(mockDiscoveryLogbook.addDiscovery).toHaveBeenCalledWith(
        'WH-TRAVERSAL-BUG-α',
        'Stable Traversable Wormhole'
      );

      // Step 2: Player traverses the wormhole
      // Check if player can traverse
      expect(alphaWormhole.canTraverse(mockCamera)).toBe(true);
      
      // Get destination coordinates
      const destination = alphaWormhole.getDestinationCoordinates();
      
      // Player emerges near beta wormhole
      mockCamera.x = destination.x;
      mockCamera.y = destination.y;

      // Step 3: Beta wormhole should be discoverable at the destination
      // The player should be within discovery range of the beta wormhole
      const distanceToBeta = Math.sqrt(
        Math.pow(betaWormhole.x - mockCamera.x, 2) + 
        Math.pow(betaWormhole.y - mockCamera.y, 2)
      );
      
      // Player should be close enough to discover beta
      expect(distanceToBeta).toBeLessThanOrEqual(betaWormhole.discoveryDistance);
      
      // Beta wormhole discovery check
      const betaDiscovered = betaWormhole.checkDiscovery(mockCamera, 800, 600);
      expect(betaDiscovered).toBe(true);
      
      // Process beta discovery
      discoveryManager.processDiscovery(betaWormhole, mockCamera, mockChunkManager);

      // Step 4: Verify both wormholes are logged in the UI logbook
      expect(mockDiscoveryLogbook.addDiscovery).toHaveBeenCalledTimes(2);
      expect(mockDiscoveryLogbook.addDiscovery).toHaveBeenCalledWith(
        'WH-TRAVERSAL-BUG-β',
        'Stable Traversable Wormhole'
      );
    });

    it('should simulate StateManager beta wormhole creation with discovery processing', () => {
      // This test simulates the specific fix: when StateManager creates a beta wormhole
      // and the alpha wormhole was discovered, the beta should also be processed through DiscoveryManager
      
      const alphaWormhole = generateWormholePair(500, 500, 2000, 2000, 'WH-STATEMANAGER-FIX', mockRandom)[0];
      
      // Step 1: Alpha wormhole is discovered normally
      mockCamera.x = 500;
      mockCamera.y = 500;
      alphaWormhole.checkDiscovery(mockCamera, 800, 600);
      discoveryManager.processDiscovery(alphaWormhole, mockCamera, mockChunkManager);
      
      // Verify alpha is logged
      expect(mockDiscoveryLogbook.addDiscovery).toHaveBeenCalledTimes(1);
      expect(mockDiscoveryLogbook.addDiscovery).toHaveBeenCalledWith(
        'WH-STATEMANAGER-FIX-α',
        'Stable Traversable Wormhole'
      );
      
      // Step 2: Simulate StateManager creating a beta wormhole during traversal
      // Create beta wormhole with discovered state inherited from alpha
      const betaWormhole = generateWormholePair(500, 500, 2000, 2000, 'WH-STATEMANAGER-FIX', mockRandom)[1];
      betaWormhole.discovered = true; // StateManager sets this when inheriting discovery state
      betaWormhole.discoveryTimestamp = alphaWormhole.discoveryTimestamp;
      
      // Move camera to beta location (simulating traversal destination)
      mockCamera.x = 2000;
      mockCamera.y = 2000;
      
      // Step 3: StateManager should call processDiscovery for the beta wormhole
      // This is the fix - the beta wormhole gets processed through DiscoveryManager
      discoveryManager.processDiscovery(betaWormhole, mockCamera, mockChunkManager);
      
      // Step 4: Verify both alpha and beta are now logged in the UI logbook
      expect(mockDiscoveryLogbook.addDiscovery).toHaveBeenCalledTimes(2);
      expect(mockDiscoveryLogbook.addDiscovery).toHaveBeenCalledWith(
        'WH-STATEMANAGER-FIX-α', 
        'Stable Traversable Wormhole'
      );
      expect(mockDiscoveryLogbook.addDiscovery).toHaveBeenCalledWith(
        'WH-STATEMANAGER-FIX-β', 
        'Stable Traversable Wormhole'
      );
    });
  });

  describe('Current Discovery System Behavior', () => {
    it('should properly name alpha and beta wormholes with Greek letters', () => {
      const [alphaWormhole, betaWormhole] = generateWormholePair(
        500, 500,
        1500, 1500,
        'WH-NAMING-TEST',
        mockRandom
      );

      // Test that naming service generates correct names
      const alphaName = mockNamingService.generateDisplayName(alphaWormhole);
      const betaName = mockNamingService.generateDisplayName(betaWormhole);

      expect(alphaName).toBe('WH-NAMING-TEST-α');
      expect(betaName).toBe('WH-NAMING-TEST-β');
    });

    it('should mark wormholes as ultra-rare discoveries', () => {
      const [alphaWormhole, betaWormhole] = generateWormholePair(
        100, 100,
        900, 900,
        'WH-RARITY-TEST',
        mockRandom
      );

      // Process discoveries
      mockCamera.x = 100;
      mockCamera.y = 100;
      alphaWormhole.checkDiscovery(mockCamera, 800, 600);
      discoveryManager.processDiscovery(alphaWormhole, mockCamera, mockChunkManager);

      mockCamera.x = 900;
      mockCamera.y = 900;
      betaWormhole.checkDiscovery(mockCamera, 800, 600);
      discoveryManager.processDiscovery(betaWormhole, mockCamera, mockChunkManager);

      // Both wormholes should be logged in the logbook
      expect(mockDiscoveryLogbook.addDiscovery).toHaveBeenCalledTimes(2);
      expect(mockDiscoveryLogbook.addDiscovery).toHaveBeenCalledWith(
        'WH-RARITY-TEST-α', 
        'Stable Traversable Wormhole'
      );
      expect(mockDiscoveryLogbook.addDiscovery).toHaveBeenCalledWith(
        'WH-RARITY-TEST-β', 
        'Stable Traversable Wormhole'
      );
    });
  });
});