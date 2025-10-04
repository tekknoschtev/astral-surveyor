// InfoPanelRenderer Test Suite
// Tests for the extracted info panel rendering system

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InfoPanelRenderer } from '../../dist/ui/stellarmap/InfoPanelRenderer.js';

describe('InfoPanelRenderer', () => {
  let renderer;
  let mockCtx;
  let mockCanvas;
  let mockNamingService;

  beforeEach(() => {
    renderer = new InfoPanelRenderer();

    // Mock canvas context
    mockCtx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 100 })),
      save: vi.fn(),
      restore: vi.fn()
    };

    // Mock canvas
    mockCanvas = {
      width: 1920,
      height: 1080
    };

    // Mock naming service
    mockNamingService = {
      generateFullDesignation: vi.fn((obj) => ({
        catalog: 'TEST-001',
        coordinate: 'X-100-Y-200',
        type: 'Main Sequence Star',
        classification: 'G2V'
      })),
      generateDisplayName: vi.fn(() => 'Test Object Name')
    };

    renderer.setNamingService(mockNamingService);
  });

  describe('Initialization', () => {
    it('should create a new InfoPanelRenderer instance', () => {
      expect(renderer).toBeDefined();
      expect(renderer).toBeInstanceOf(InfoPanelRenderer);
    });

    it('should accept a naming service', () => {
      const newRenderer = new InfoPanelRenderer();
      newRenderer.setNamingService(mockNamingService);
      expect(() => newRenderer.renderStarInfoPanel(mockCtx, mockCanvas, { x: 0, y: 0 })).not.toThrow();
    });
  });

  describe('renderStarInfoPanel', () => {
    it('should render star info panel with full designation', () => {
      const star = {
        x: 1000,
        y: 2000,
        starTypeName: 'Main Sequence',
        timestamp: Date.now()
      };

      renderer.renderStarInfoPanel(mockCtx, mockCanvas, star);

      // Should call naming service
      expect(mockNamingService.generateFullDesignation).toHaveBeenCalledWith(star);

      // Should draw panel background
      expect(mockCtx.fillRect).toHaveBeenCalled();
      expect(mockCtx.strokeRect).toHaveBeenCalled();

      // Should draw text labels
      expect(mockCtx.fillText).toHaveBeenCalled();
      const fillTextCalls = mockCtx.fillText.mock.calls;
      expect(fillTextCalls.some(call => call[0].includes('Designation:'))).toBe(true);
      expect(fillTextCalls.some(call => call[0].includes('Coordinates:'))).toBe(true);
      expect(fillTextCalls.some(call => call[0].includes('Type:'))).toBe(true);
      expect(fillTextCalls.some(call => call[0].includes('Position:'))).toBe(true);
    });

    it('should not render if star is null', () => {
      renderer.renderStarInfoPanel(mockCtx, mockCanvas, null);
      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });

    it('should not render if naming service is not set', () => {
      const newRenderer = new InfoPanelRenderer();
      const star = { x: 0, y: 0 };
      newRenderer.renderStarInfoPanel(mockCtx, mockCanvas, star);
      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });

    it('should handle missing designation gracefully', () => {
      mockNamingService.generateFullDesignation.mockReturnValue(null);
      const star = { x: 0, y: 0 };

      renderer.renderStarInfoPanel(mockCtx, mockCanvas, star);

      // Should not draw anything if designation fails
      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });

    it('should display discovery timestamp when available', () => {
      const timestamp = Date.now();
      const star = {
        x: 1000,
        y: 2000,
        timestamp: timestamp
      };

      renderer.renderStarInfoPanel(mockCtx, mockCanvas, star);

      const fillTextCalls = mockCtx.fillText.mock.calls;
      expect(fillTextCalls.some(call => call[0].includes('Discovered:'))).toBe(true);
    });
  });

  describe('renderPlanetInfoPanel', () => {
    it('should render planet info panel with stored name', () => {
      const planet = {
        objectName: 'Stored Planet Name',
        x: 1050,
        y: 2050,
        parentStarX: 1000,
        parentStarY: 2000,
        planetTypeName: 'Rocky Planet',
        planetIndex: 2
      };

      renderer.renderPlanetInfoPanel(mockCtx, mockCanvas, planet);

      expect(mockCtx.fillRect).toHaveBeenCalled();
      const fillTextCalls = mockCtx.fillText.mock.calls;
      expect(fillTextCalls.some(call => call[0].includes('Stored Planet Name'))).toBe(true);
      expect(fillTextCalls.some(call => call[0].includes('Rocky Planet'))).toBe(true);
      expect(fillTextCalls.some(call => call[0].includes('Orbits Star:'))).toBe(true);
    });

    it('should use naming service when no stored name', () => {
      const planet = {
        objectName: null,
        x: 1050,
        y: 2050,
        parentStarX: 1000,
        parentStarY: 2000,
        planetTypeName: 'Rocky Planet',
        planetIndex: 2
      };

      renderer.renderPlanetInfoPanel(mockCtx, mockCanvas, planet);

      expect(mockNamingService.generateDisplayName).toHaveBeenCalled();
      const fillTextCalls = mockCtx.fillText.mock.calls;
      expect(fillTextCalls.some(call => call[0].includes('Test Object Name'))).toBe(true);
    });

    it('should fallback to basic name when naming service fails', () => {
      mockNamingService.generateDisplayName.mockImplementation(() => {
        throw new Error('Naming service error');
      });

      const planet = {
        objectName: null,
        parentStarX: 1000,
        parentStarY: 2000,
        planetTypeName: 'Rocky Planet',
        planetIndex: 3
      };

      renderer.renderPlanetInfoPanel(mockCtx, mockCanvas, planet);

      const fillTextCalls = mockCtx.fillText.mock.calls;
      expect(fillTextCalls.some(call => call[0].includes('Planet 4'))).toBe(true); // planetIndex + 1
    });

    it('should not render if planet is null', () => {
      renderer.renderPlanetInfoPanel(mockCtx, mockCanvas, null);
      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });
  });

  describe('renderNebulaInfoPanel', () => {
    it('should render nebula info panel', () => {
      const nebula = {
        objectName: 'Test Nebula',
        x: 3000,
        y: 4000,
        nebulaType: 'Emission Nebula',
        timestamp: Date.now()
      };

      renderer.renderNebulaInfoPanel(mockCtx, mockCanvas, nebula);

      expect(mockCtx.fillRect).toHaveBeenCalled();
      const fillTextCalls = mockCtx.fillText.mock.calls;
      expect(fillTextCalls.some(call => call[0].includes('Test Nebula'))).toBe(true);
      expect(fillTextCalls.some(call => call[0].includes('Emission Nebula'))).toBe(true);
    });

    it('should use naming service when no stored name', () => {
      const nebula = {
        x: 3000,
        y: 4000,
        nebulaType: 'Emission Nebula'
      };

      renderer.renderNebulaInfoPanel(mockCtx, mockCanvas, nebula);

      expect(mockNamingService.generateDisplayName).toHaveBeenCalled();
    });

    it('should fallback to "Nebula" when naming fails', () => {
      mockNamingService.generateDisplayName.mockImplementation(() => {
        throw new Error('Naming error');
      });

      const nebula = {
        x: 3000,
        y: 4000,
        nebulaType: 'Emission Nebula'
      };

      renderer.renderNebulaInfoPanel(mockCtx, mockCanvas, nebula);

      const fillTextCalls = mockCtx.fillText.mock.calls;
      expect(fillTextCalls.some(call => call[0].includes('Nebula'))).toBe(true);
    });
  });

  describe('renderWormholeInfoPanel', () => {
    it('should render wormhole info panel with alpha designation', () => {
      const wormhole = {
        x: 5000,
        y: 6000,
        twinX: 7000,
        twinY: 8000,
        designation: 'alpha',
        wormholeId: 'WH-001',
        timestamp: Date.now()
      };

      renderer.renderWormholeInfoPanel(mockCtx, mockCanvas, wormhole);

      expect(mockCtx.fillRect).toHaveBeenCalled();
      const fillTextCalls = mockCtx.fillText.mock.calls;
      expect(fillTextCalls.some(call => call[0].includes('α (Primary)'))).toBe(true);
      expect(fillTextCalls.some(call => call[0].includes('Twin Location:'))).toBe(true);
      expect(fillTextCalls.some(call => call[0].includes('WH-001'))).toBe(true);
    });

    it('should render wormhole info panel with beta designation', () => {
      const wormhole = {
        x: 5000,
        y: 6000,
        twinX: 7000,
        twinY: 8000,
        designation: 'beta',
        wormholeId: 'WH-001'
      };

      renderer.renderWormholeInfoPanel(mockCtx, mockCanvas, wormhole);

      const fillTextCalls = mockCtx.fillText.mock.calls;
      expect(fillTextCalls.some(call => call[0].includes('β (Secondary)'))).toBe(true);
    });

    it('should use stored object name when available', () => {
      const wormhole = {
        objectName: 'The Gateway',
        x: 5000,
        y: 6000,
        twinX: 7000,
        twinY: 8000,
        designation: 'alpha',
        wormholeId: 'WH-001'
      };

      renderer.renderWormholeInfoPanel(mockCtx, mockCanvas, wormhole);

      const fillTextCalls = mockCtx.fillText.mock.calls;
      expect(fillTextCalls.some(call => call[0].includes('The Gateway'))).toBe(true);
    });
  });

  describe('renderBlackHoleInfoPanel', () => {
    it('should render supermassive black hole info panel', () => {
      const blackHole = {
        x: 9000,
        y: 10000,
        blackHoleTypeName: 'supermassive',
        timestamp: Date.now()
      };

      renderer.renderBlackHoleInfoPanel(mockCtx, mockCanvas, blackHole);

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.fillRect).toHaveBeenCalled();
      const fillTextCalls = mockCtx.fillText.mock.calls;
      expect(fillTextCalls.some(call => call[0].includes('Supermassive'))).toBe(true);
      expect(fillTextCalls.some(call => call[0].includes('Event Horizon:'))).toBe(true);
    });

    it('should render stellar black hole info panel', () => {
      const blackHole = {
        x: 9000,
        y: 10000,
        blackHoleTypeName: 'stellar'
      };

      renderer.renderBlackHoleInfoPanel(mockCtx, mockCanvas, blackHole);

      const fillTextCalls = mockCtx.fillText.mock.calls;
      expect(fillTextCalls.some(call => call[0].includes('Stellar'))).toBe(true);
    });

    it('should use stored object name when available', () => {
      const blackHole = {
        objectName: 'The Void',
        x: 9000,
        y: 10000,
        blackHoleTypeName: 'supermassive'
      };

      renderer.renderBlackHoleInfoPanel(mockCtx, mockCanvas, blackHole);

      const fillTextCalls = mockCtx.fillText.mock.calls;
      expect(fillTextCalls.some(call => call[0].includes('The Void'))).toBe(true);
    });
  });

  describe('renderCometInfoPanel', () => {
    it('should render comet info panel', () => {
      const comet = {
        x: 11000,
        y: 12000,
        parentStarX: 10000,
        parentStarY: 11000,
        cometType: {
          name: 'Long-period Comet'
        },
        timestamp: Date.now()
      };

      renderer.renderCometInfoPanel(mockCtx, mockCanvas, comet);

      expect(mockCtx.fillRect).toHaveBeenCalled();
      const fillTextCalls = mockCtx.fillText.mock.calls;
      expect(fillTextCalls.some(call => call[0].includes('Long-period Comet'))).toBe(true);
      expect(fillTextCalls.some(call => call[0].includes('Current Distance:'))).toBe(true);
      expect(fillTextCalls.some(call => call[0].includes('Composition:'))).toBe(true);
    });

    it('should use stored object name when available', () => {
      const comet = {
        objectName: 'Halley',
        x: 11000,
        y: 12000,
        cometType: {
          name: 'Short-period Comet'
        }
      };

      renderer.renderCometInfoPanel(mockCtx, mockCanvas, comet);

      const fillTextCalls = mockCtx.fillText.mock.calls;
      expect(fillTextCalls.some(call => call[0].includes('Halley'))).toBe(true);
    });

    it('should fallback to "Comet" when type is missing', () => {
      const comet = {
        x: 11000,
        y: 12000
      };

      renderer.renderCometInfoPanel(mockCtx, mockCanvas, comet);

      const fillTextCalls = mockCtx.fillText.mock.calls;
      expect(fillTextCalls.some(call => call[0].includes('Comet'))).toBe(true);
    });
  });

  describe('renderAsteroidGardenInfoPanel', () => {
    it('should render asteroid garden info panel', () => {
      const asteroidGarden = {
        x: 13000,
        y: 14000,
        gardenType: 'metallic',
        gardenTypeData: {
          name: 'Metallic Asteroid Garden'
        },
        timestamp: Date.now()
      };

      renderer.renderAsteroidGardenInfoPanel(mockCtx, mockCanvas, asteroidGarden);

      expect(mockCtx.fillRect).toHaveBeenCalled();
      const fillTextCalls = mockCtx.fillText.mock.calls;
      expect(fillTextCalls.some(call => call[0].includes('Metallic Asteroid Garden'))).toBe(true);
    });

    it('should use naming service when no stored name', () => {
      const asteroidGarden = {
        x: 13000,
        y: 14000,
        gardenType: 'metallic'
      };

      renderer.renderAsteroidGardenInfoPanel(mockCtx, mockCanvas, asteroidGarden);

      expect(mockNamingService.generateDisplayName).toHaveBeenCalled();
    });
  });

  describe('renderRoguePlanetInfoPanel', () => {
    it('should render rogue planet info panel', () => {
      const roguePlanet = {
        x: 15000,
        y: 16000,
        variant: 'frozen',
        timestamp: Date.now()
      };

      renderer.renderRoguePlanetInfoPanel(mockCtx, mockCanvas, roguePlanet);

      expect(mockCtx.fillRect).toHaveBeenCalled();
      const fillTextCalls = mockCtx.fillText.mock.calls;
      expect(fillTextCalls.some(call => call[0].includes('Frozen Rogue Planet'))).toBe(true);
      expect(fillTextCalls.some(call => call[0].includes('Unbound'))).toBe(true);
    });

    it('should use naming service for display name', () => {
      const roguePlanet = {
        x: 15000,
        y: 16000,
        variant: 'frozen'
      };

      renderer.renderRoguePlanetInfoPanel(mockCtx, mockCanvas, roguePlanet);

      expect(mockNamingService.generateDisplayName).toHaveBeenCalled();
    });
  });

  describe('renderDarkNebulaInfoPanel', () => {
    it('should render dark nebula info panel', () => {
      const darkNebula = {
        x: 17000,
        y: 18000,
        variant: 'dense-cloud',
        occlusionStrength: 0.9,
        timestamp: Date.now()
      };

      renderer.renderDarkNebulaInfoPanel(mockCtx, mockCanvas, darkNebula);

      expect(mockCtx.fillRect).toHaveBeenCalled();
      const fillTextCalls = mockCtx.fillText.mock.calls;
      expect(fillTextCalls.some(call => call[0].includes('Dense cloud Dark Nebula'))).toBe(true);
      expect(fillTextCalls.some(call => call[0].includes('Star Occlusion: 90%'))).toBe(true);
    });

    it('should use naming service for display name', () => {
      const darkNebula = {
        x: 17000,
        y: 18000,
        variant: 'dense-cloud'
      };

      renderer.renderDarkNebulaInfoPanel(mockCtx, mockCanvas, darkNebula);

      expect(mockNamingService.generateDisplayName).toHaveBeenCalled();
    });
  });

  describe('renderCrystalGardenInfoPanel', () => {
    it('should render crystal garden info panel', () => {
      const crystalGarden = {
        x: 19000,
        y: 20000,
        variant: 'prismatic',
        crystalCount: 1500,
        refractionIndex: 2.42,
        primaryMineral: 'Crystalline Silicate',
        timestamp: Date.now()
      };

      renderer.renderCrystalGardenInfoPanel(mockCtx, mockCanvas, crystalGarden);

      expect(mockCtx.fillRect).toHaveBeenCalled();
      const fillTextCalls = mockCtx.fillText.mock.calls;
      expect(fillTextCalls.some(call => call[0].includes('Prismatic Crystal Garden'))).toBe(true);
      expect(fillTextCalls.some(call => call[0].includes('Crystal Formations: 1500'))).toBe(true);
      expect(fillTextCalls.some(call => call[0].includes('Refraction Index: 2.42'))).toBe(true);
      expect(fillTextCalls.some(call => call[0].includes('Primary Mineral: Crystalline Silicate'))).toBe(true);
    });

    it('should use naming service for display name', () => {
      const crystalGarden = {
        x: 19000,
        y: 20000,
        variant: 'prismatic'
      };

      renderer.renderCrystalGardenInfoPanel(mockCtx, mockCanvas, crystalGarden);

      expect(mockNamingService.generateDisplayName).toHaveBeenCalled();
    });
  });

  describe('renderProtostarInfoPanel', () => {
    it('should render protostar info panel with Class 1 features', () => {
      const protostar = {
        x: 21000,
        y: 22000,
        variant: 'class-1',
        stellarClassification: 'Class I Protostar',
        coreTemperature: 1000000,
        discoveryTimestamp: Date.now()
      };

      renderer.renderProtostarInfoPanel(mockCtx, mockCanvas, protostar);

      expect(mockCtx.fillRect).toHaveBeenCalled();
      const fillTextCalls = mockCtx.fillText.mock.calls;
      expect(fillTextCalls.some(call => call[0].includes('Class 1 Protostar'))).toBe(true);
      expect(fillTextCalls.some(call => call[0].includes('Core Temperature: 1000000K'))).toBe(true);
      expect(fillTextCalls.some(call => call[0].includes('Polar Jets Active'))).toBe(true);
    });

    it('should render protostar info panel with Class 3 features', () => {
      const protostar = {
        x: 21000,
        y: 22000,
        variant: 'class-3',
        stellarClassification: 'Class III Protostar',
        coreTemperature: 500000
      };

      renderer.renderProtostarInfoPanel(mockCtx, mockCanvas, protostar);

      const fillTextCalls = mockCtx.fillText.mock.calls;
      expect(fillTextCalls.some(call => call[0].includes('Accretion Disk'))).toBe(true);
    });

    it('should use naming service for display name', () => {
      const protostar = {
        x: 21000,
        y: 22000,
        variant: 'class-2'
      };

      renderer.renderProtostarInfoPanel(mockCtx, mockCanvas, protostar);

      expect(mockNamingService.generateDisplayName).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rendering without naming service gracefully', () => {
      const newRenderer = new InfoPanelRenderer();

      expect(() => {
        newRenderer.renderStarInfoPanel(mockCtx, mockCanvas, { x: 0, y: 0 });
        newRenderer.renderPlanetInfoPanel(mockCtx, mockCanvas, { x: 0, y: 0, planetIndex: 0, parentStarX: 0, parentStarY: 0, planetTypeName: 'test' });
        newRenderer.renderNebulaInfoPanel(mockCtx, mockCanvas, { x: 0, y: 0, nebulaType: 'test' });
      }).not.toThrow();
    });

    it('should handle objects with null positions gracefully', () => {
      const planet = {
        x: null,
        y: null,
        parentStarX: 1000,
        parentStarY: 2000,
        planetTypeName: 'Rocky Planet',
        planetIndex: 0
      };

      expect(() => {
        renderer.renderPlanetInfoPanel(mockCtx, mockCanvas, planet);
      }).not.toThrow();
    });

    it('should handle missing optional properties', () => {
      const minimalNebula = {
        x: 0,
        y: 0,
        nebulaType: 'Unknown'
      };

      expect(() => {
        renderer.renderNebulaInfoPanel(mockCtx, mockCanvas, minimalNebula);
      }).not.toThrow();
    });
  });
});
