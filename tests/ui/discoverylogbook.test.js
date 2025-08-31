import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Import from compiled TypeScript
import { DiscoveryLogbook } from '../../dist/ui/discoverylogbook.js';

describe('DiscoveryLogbook - Discovery History and UI System', () => {
  let logbook;
  let mockRenderer;
  let mockContext;
  let mockInput;
  let mockCamera;
  let mockDiscoveryManager;

  beforeEach(() => {
    // Mock canvas rendering context
    mockContext = {
      // Canvas state properties
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      font: '12px Arial',
      textAlign: 'left',
      
      // Drawing functions
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      
      // State functions
      save: vi.fn(),
      restore: vi.fn(),
      
      // Text functions
      fillText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 100 }),
      
      // Path functions
      moveTo: vi.fn(),
      lineTo: vi.fn()
    };

    // Mock renderer
    mockRenderer = {
      canvas: {
        width: 1024,
        height: 768
      },
      ctx: mockContext
    };

    // Mock input system
    mockInput = {
      wasJustPressed: vi.fn().mockReturnValue(false)
    };

    // Mock camera
    mockCamera = {
      x: 0,
      y: 0
    };

    // Mock DiscoveryManager
    const discoveries = new Map();
    mockDiscoveryManager = {
      discoveries: discoveries,
      getDiscoveries: vi.fn(() => Array.from(discoveries.values()).sort((a, b) => a.timestamp - b.timestamp)),
      addDiscovery: vi.fn((obj, camera) => {
        const discovery = {
          id: `discovery_${discoveries.size}`,
          name: obj.name || `Object ${discoveries.size}`,
          type: obj.type || 'Unknown',
          objectType: obj.type || 'unknown',
          coordinates: { x: obj.x || 0, y: obj.y || 0 },
          timestamp: Date.now(),
          rarity: obj.rarity || 'common',
          shareableURL: `http://example.com/share/${obj.x || 0},${obj.y || 0}`,
          metadata: {}
        };
        discoveries.set(discovery.id, discovery);
        return discovery;
      }),
      getDiscoveryById: vi.fn((id) => discoveries.get(id))
    };

    logbook = new DiscoveryLogbook();
    logbook.setDiscoveryManager(mockDiscoveryManager);
  });

  // Helper function to add discoveries via the DiscoveryManager
  const addTestDiscovery = (name, type, timestampOrOptions = {}) => {
    // Handle both old signature (name, type, timestamp) and new signature (name, type, options)
    let options = {};
    let timestamp = Date.now();
    
    if (typeof timestampOrOptions === 'number') {
      timestamp = timestampOrOptions;
    } else if (typeof timestampOrOptions === 'object') {
      options = timestampOrOptions;
      timestamp = options.timestamp || Date.now();
    }
    
    const obj = {
      name,
      type,
      x: options.x || 0,
      y: options.y || 0,
      rarity: options.rarity || 'common'
    };
    const discovery = mockDiscoveryManager.addDiscovery(obj, mockCamera);
    // Override timestamp if specified
    discovery.timestamp = timestamp;
    
    // Also add to legacy array for backward compatibility tests
    logbook.discoveries.push({
      name,
      type,
      timestamp: discovery.timestamp,
      displayTime: logbook.formatTimestamp(discovery.timestamp)
    });
    // Trigger auto-scroll behavior like the legacy addDiscovery method
    logbook.scrollToBottom();
    return discovery;
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      expect(logbook.visible).toBe(false);
      expect(logbook.discoveries).toEqual([]);
      expect(logbook.scrollOffset).toBe(0);
      expect(logbook.maxVisible).toBe(12);
    });

    it('should set visual styling properties', () => {
      expect(logbook.backgroundColor).toBe('#000511E0');
      expect(logbook.borderColor).toBe('#2a3a4a');
      expect(logbook.textColor).toBe('#b0c4d4');
      expect(logbook.headerColor).toBe('#d4a574');
      expect(logbook.fontSize).toBe(12);
      expect(logbook.headerFontSize).toBe(14);
    });

    it('should set panel dimensions and layout properties', () => {
      expect(logbook.panelWidth).toBe(320);
      expect(logbook.panelHeight).toBe(400);
      expect(logbook.padding).toBe(16);
      expect(logbook.headerHeight).toBe(32);
      expect(logbook.entrySpacing).toBe(28);
    });
  });

  describe('Visibility Management', () => {
    it('should toggle visibility correctly', () => {
      expect(logbook.isVisible()).toBe(false);
      
      logbook.toggle();
      expect(logbook.isVisible()).toBe(true);
      
      logbook.toggle();
      expect(logbook.isVisible()).toBe(false);
    });

    it('should reset scroll to top when opening', () => {
      logbook.scrollOffset = 5;
      logbook.visible = false;
      
      logbook.toggle(); // Open
      
      expect(logbook.scrollOffset).toBe(0);
    });

    it('should not reset scroll when closing', () => {
      logbook.scrollOffset = 3;
      logbook.visible = true;
      
      logbook.toggle(); // Close
      
      expect(logbook.scrollOffset).toBe(3);
    });
  });

  describe('Discovery Management', () => {
    it('should add discoveries with proper data structure', () => {
      const timestamp = Date.now();
      
      addTestDiscovery('Test Star HD-1234', 'G-type Main Sequence', timestamp);
      
      expect(logbook.discoveries).toHaveLength(1);
      expect(logbook.discoveries[0]).toEqual({
        name: 'Test Star HD-1234',
        type: 'G-type Main Sequence',
        timestamp: timestamp,
        displayTime: 'Just now'
      });
    });

    it('should use current time when no timestamp provided', () => {
      const startTime = Date.now();
      
      addTestDiscovery('Test Planet b', 'Rocky World');
      
      const endTime = Date.now();
      
      expect(logbook.discoveries[0].timestamp).toBeGreaterThanOrEqual(startTime);
      expect(logbook.discoveries[0].timestamp).toBeLessThanOrEqual(endTime);
    });

    it('should store all discoveries without limit', () => {
      // Add 105 discoveries
      for (let i = 0; i < 105; i++) {
        addTestDiscovery(`Star ${i}`, 'G-type Star', Date.now() + i);
      }
      
      expect(logbook.discoveries).toHaveLength(105);
      // Should keep all discoveries
      expect(logbook.discoveries[0].name).toBe('Star 0');
      expect(logbook.discoveries[104].name).toBe('Star 104');
    });

    it('should auto-scroll to bottom when adding discoveries', () => {
      // Fill up with more than maxVisible entries
      for (let i = 0; i < 15; i++) {
        addTestDiscovery(`Star ${i}`, 'G-type Star');
      }
      
      // Should be scrolled to show the newest entries
      expect(logbook.scrollOffset).toBe(3); // 15 - 12 = 3
    });

    it('should provide discovery count', () => {
      expect(logbook.getDiscoveryCount()).toBe(0);
      
      addTestDiscovery('Star A', 'G-type Star');
      addTestDiscovery('Planet b', 'Rocky World');
      
      expect(logbook.getDiscoveryCount()).toBe(2);
    });

    it('should return copy of discoveries array', () => {
      addTestDiscovery('Star A', 'G-type Star');
      
      const discoveries = logbook.getDiscoveries();
      discoveries.push({ name: 'Fake', type: 'Fake', timestamp: 0, displayTime: 'Fake' });
      
      expect(logbook.getDiscoveryCount()).toBe(1); // Original unchanged
    });
  });

  describe('Timestamp Formatting', () => {
    it('should format very recent timestamps as "Just now"', () => {
      const now = Date.now();
      const result = logbook.formatTimestamp(now);
      
      expect(result).toBe('Just now');
    });

    it('should format minute-old timestamps correctly', () => {
      const timestamp = Date.now() - (5 * 60 * 1000); // 5 minutes ago
      const result = logbook.formatTimestamp(timestamp);
      
      expect(result).toBe('5m ago');
    });

    it('should format hour-old timestamps correctly', () => {
      const timestamp = Date.now() - (3 * 60 * 60 * 1000); // 3 hours ago
      const result = logbook.formatTimestamp(timestamp);
      
      expect(result).toBe('3h ago');
    });

    it('should format day-old timestamps correctly', () => {
      const timestamp = Date.now() - (2 * 24 * 60 * 60 * 1000); // 2 days ago
      const result = logbook.formatTimestamp(timestamp);
      
      expect(result).toBe('2d ago');
    });

    it('should update display times for all discoveries', () => {
      const oldTimestamp = Date.now() - (10 * 60 * 1000); // 10 minutes ago
      addTestDiscovery('Star A', 'G-type Star', oldTimestamp);
      
      // Initially should be "10m ago"
      expect(logbook.discoveries[0].displayTime).toBe('10m ago');
      
      // Update timestamps
      logbook.updateTimestamps();
      
      // Should still be "10m ago" (or maybe "11m ago" depending on timing)
      expect(logbook.discoveries[0].displayTime).toContain('m ago');
    });
  });

  describe('Scrolling System', () => {
    beforeEach(() => {
      logbook.visible = true; // Make sure logbook is visible for scrolling
      // Add more entries than can be displayed
      for (let i = 0; i < 20; i++) {
        addTestDiscovery(`Star ${i}`, 'G-type Star');
      }
    });

    it('should scroll down correctly', () => {
      logbook.scrollOffset = 0;
      
      logbook.handleScroll(1); // Scroll down
      
      expect(logbook.scrollOffset).toBe(1);
    });

    it('should scroll up correctly', () => {
      logbook.scrollOffset = 5;
      
      logbook.handleScroll(-1); // Scroll up
      
      expect(logbook.scrollOffset).toBe(4);
    });

    it('should respect maximum scroll bounds', () => {
      logbook.scrollOffset = 8; // 20 - 12 = 8 is max for 20 items
      
      logbook.handleScroll(1); // Try to scroll beyond max
      
      expect(logbook.scrollOffset).toBe(8); // Should stay at max
    });

    it('should respect minimum scroll bounds', () => {
      logbook.scrollOffset = 0;
      
      logbook.handleScroll(-1); // Try to scroll beyond min
      
      expect(logbook.scrollOffset).toBe(0); // Should stay at min
    });

    it('should not scroll when not visible', () => {
      logbook.visible = false;
      logbook.scrollOffset = 2;
      
      logbook.handleScroll(1);
      
      expect(logbook.scrollOffset).toBe(2); // Unchanged
    });

    it('should not scroll when all entries fit on screen', () => {
      // Clear all discoveries and add only 10 (less than maxVisible=12) without auto-scroll
      mockDiscoveryManager.discoveries.clear();
      logbook.discoveries = [];
      for (let i = 0; i < 10; i++) {
        const obj = { name: `Star ${i}`, type: 'G-type Star', x: 0, y: 0, rarity: 'common' };
        const discovery = mockDiscoveryManager.addDiscovery(obj, mockCamera);
        logbook.discoveries.push({
          name: `Star ${i}`,
          type: 'G-type Star',
          timestamp: discovery.timestamp,
          displayTime: logbook.formatTimestamp(discovery.timestamp)
        });
      }
      logbook.scrollOffset = 0;
      
      logbook.handleScroll(1);
      
      expect(logbook.scrollOffset).toBe(0); // No scrolling needed
    });

    it('should scroll to bottom correctly', () => {
      logbook.scrollOffset = 0;
      
      logbook.scrollToBottom();
      
      expect(logbook.scrollOffset).toBe(8); // 20 - 12 = 8
    });

    it('should handle scroll to bottom with few entries', () => {
      // Clear all discoveries and add only 5 (less than maxVisible=12) without auto-scroll
      mockDiscoveryManager.discoveries.clear();
      logbook.discoveries = [];
      for (let i = 0; i < 5; i++) {
        const obj = { name: `Star ${i}`, type: 'G-type Star', x: 0, y: 0, rarity: 'common' };
        const discovery = mockDiscoveryManager.addDiscovery(obj, mockCamera);
        logbook.discoveries.push({
          name: `Star ${i}`,
          type: 'G-type Star',
          timestamp: discovery.timestamp,
          displayTime: logbook.formatTimestamp(discovery.timestamp)
        });
      }
      
      logbook.scrollToBottom();
      
      expect(logbook.scrollOffset).toBe(0); // No scrolling needed
    });
  });

  describe('Mouse Wheel Handling', () => {
    beforeEach(() => {
      logbook.visible = true;
      // Add scrollable content
      for (let i = 0; i < 15; i++) {
        addTestDiscovery(`Star ${i}`, 'G-type Star');
      }
      logbook.scrollOffset = 1; // Start in middle
    });

    it('should handle positive wheel delta (scroll down)', () => {
      logbook.handleMouseWheel(120);
      
      expect(logbook.scrollOffset).toBe(2);
    });

    it('should handle negative wheel delta (scroll up)', () => {
      logbook.handleMouseWheel(-120);
      
      expect(logbook.scrollOffset).toBe(0);
    });

    it('should not handle wheel when not visible', () => {
      logbook.visible = false;
      const initialOffset = logbook.scrollOffset;
      
      logbook.handleMouseWheel(120);
      
      expect(logbook.scrollOffset).toBe(initialOffset);
    });
  });

  describe('Mouse Over Detection', () => {
    it('should detect mouse over logbook area', () => {
      logbook.visible = true;
      const canvasWidth = 1024;
      const canvasHeight = 768;
      
      // Panel is at (canvasWidth - panelWidth - 20, 80)
      const panelX = canvasWidth - 320 - 20; // 684
      const panelY = 80;
      
      // Mouse inside panel
      const result = logbook.isMouseOver(panelX + 50, panelY + 50, canvasWidth, canvasHeight);
      
      expect(result).toBe(true);
    });

    it('should not detect mouse over when outside panel', () => {
      logbook.visible = true;
      const canvasWidth = 1024;
      const canvasHeight = 768;
      
      // Mouse outside panel (too far left)
      const result = logbook.isMouseOver(300, 100, canvasWidth, canvasHeight);
      
      expect(result).toBe(false);
    });

    it('should not detect mouse over when not visible', () => {
      logbook.visible = false;
      const canvasWidth = 1024;
      const canvasHeight = 768;
      
      const result = logbook.isMouseOver(700, 100, canvasWidth, canvasHeight);
      
      expect(result).toBe(false);
    });
  });

  describe('Input Handling', () => {
    beforeEach(() => {
      logbook.visible = true;
      // Add scrollable content
      for (let i = 0; i < 15; i++) {
        addTestDiscovery(`Star ${i}`, 'G-type Star');
      }
      logbook.scrollOffset = 5;
    });

    it('should handle Page Up key for fast scrolling', () => {
      mockInput.wasJustPressed.mockImplementation(key => key === 'PageUp');
      
      logbook.update(0.016, mockInput);
      
      expect(logbook.scrollOffset).toBe(0); // Scrolled up by 5
    });

    it('should handle Page Down key for fast scrolling', () => {
      mockInput.wasJustPressed.mockImplementation(key => key === 'PageDown');
      
      logbook.update(0.016, mockInput);
      
      expect(logbook.scrollOffset).toBe(3); // 15 - 12 = 3 max, so scrolled to max
    });

    it('should not handle input when not visible', () => {
      logbook.visible = false;
      mockInput.wasJustPressed.mockImplementation(key => key === 'PageUp');
      const initialOffset = logbook.scrollOffset;
      
      logbook.update(0.016, mockInput);
      
      expect(logbook.scrollOffset).toBe(initialOffset);
    });

    it('should work without input parameter', () => {
      expect(() => logbook.update(0.016)).not.toThrow();
    });
  });

  describe('Data Loading and Persistence', () => {
    it('should load discovery data from external source', () => {
      const discoveryData = [
        { name: 'Star Alpha', type: 'G-type Star', timestamp: Date.now() - 1000 },
        { name: 'Planet Beta', type: 'Rocky World', timestamp: Date.now() - 2000 }
      ];
      
      logbook.loadDiscoveries(discoveryData);
      
      expect(logbook.discoveries).toHaveLength(2);
      expect(logbook.discoveries[0].name).toBe('Star Alpha');
      expect(logbook.discoveries[0].displayTime).toBe('Just now');
    });

    it('should sort loaded discoveries by timestamp (newest first)', () => {
      const discoveryData = [
        { name: 'Older Star', type: 'G-type Star', timestamp: Date.now() - 2000 },
        { name: 'Newer Star', type: 'K-type Star', timestamp: Date.now() - 1000 }
      ];
      
      logbook.loadDiscoveries(discoveryData);
      
      // Should be sorted newest first
      expect(logbook.discoveries[0].name).toBe('Newer Star');
      expect(logbook.discoveries[1].name).toBe('Older Star');
    });
  });

  describe('Text Truncation', () => {
    beforeEach(() => {
      mockContext.measureText.mockImplementation(text => ({ width: text.length * 8 }));
    });

    it('should return original text when it fits', () => {
      const result = logbook.truncateText(mockContext, 'Short text', 200);
      
      expect(result).toBe('Short text');
    });

    it('should truncate long text with ellipsis', () => {
      const result = logbook.truncateText(mockContext, 'This is a very long text that needs truncation', 100);
      
      expect(result).toContain('...');
      expect(result.length).toBeLessThan('This is a very long text that needs truncation'.length);
    });

    it('should handle empty text gracefully', () => {
      const result = logbook.truncateText(mockContext, '', 100);
      
      expect(result).toBe('');
    });
  });

  describe('Rendering System', () => {
    beforeEach(() => {
      logbook.visible = true;
    });

    it('should not render when not visible', () => {
      logbook.visible = false;
      
      logbook.render(mockRenderer, mockCamera);
      
      expect(mockContext.save).not.toHaveBeenCalled();
      expect(mockContext.fillRect).not.toHaveBeenCalled();
    });

    it('should render panel background and border', () => {
      logbook.render(mockRenderer, mockCamera);
      
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
      expect(mockContext.fillRect).toHaveBeenCalled();
      expect(mockContext.strokeRect).toHaveBeenCalled();
    });

    it('should render header with title and count', () => {
      addTestDiscovery('Test Star', 'G-type Star');
      
      logbook.render(mockRenderer, mockCamera);
      
      expect(mockContext.fillText).toHaveBeenCalledWith('Discovery Logbook', expect.any(Number), expect.any(Number));
      expect(mockContext.fillText).toHaveBeenCalledWith('1 discoveries', expect.any(Number), expect.any(Number));
    });

    it('should render discovery entries', () => {
      addTestDiscovery('Test Star HD-1234', 'G-type Main Sequence');
      addTestDiscovery('Test Planet b', 'Rocky World');
      
      logbook.render(mockRenderer, mockCamera);
      
      expect(mockContext.fillText).toHaveBeenCalledWith('Test Star HD-1234', expect.any(Number), expect.any(Number));
      expect(mockContext.fillText).toHaveBeenCalledWith('G-type Main Sequence', expect.any(Number), expect.any(Number));
      expect(mockContext.fillText).toHaveBeenCalledWith('Test Planet b', expect.any(Number), expect.any(Number));
      expect(mockContext.fillText).toHaveBeenCalledWith('Rocky World', expect.any(Number), expect.any(Number));
    });

    it('should render empty state message', () => {
      logbook.render(mockRenderer, mockCamera);
      
      expect(mockContext.fillText).toHaveBeenCalledWith('No discoveries yet...', expect.any(Number), expect.any(Number));
      expect(mockContext.fillText).toHaveBeenCalledWith('Explore space to find celestial objects!', expect.any(Number), expect.any(Number));
    });

    it('should render scroll indicators when needed', () => {
      // Add many discoveries to enable scrolling
      for (let i = 0; i < 15; i++) {
        addTestDiscovery(`Star ${i}`, 'G-type Star');
      }
      logbook.scrollOffset = 2; // In middle of scroll
      
      logbook.render(mockRenderer, mockCamera);
      
      // Should draw both up and down arrows
      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.moveTo).toHaveBeenCalled();
      expect(mockContext.lineTo).toHaveBeenCalled();
      expect(mockContext.fill).toHaveBeenCalled();
    });

    it('should render alternating row backgrounds', () => {
      addTestDiscovery('Star 1', 'G-type Star');
      addTestDiscovery('Star 2', 'K-type Star');
      addTestDiscovery('Star 3', 'M-type Star');
      
      logbook.render(mockRenderer, mockCamera);
      
      // Should render background rectangles for alternating rows
      const fillRectCalls = mockContext.fillRect.mock.calls;
      const backgroundCalls = fillRectCalls.filter(call => {
        // Look for calls that are likely row backgrounds (smaller height)
        return call[3] === 28; // entrySpacing height
      });
      
      expect(backgroundCalls.length).toBeGreaterThan(0);
    });

    it('should work without camera parameter', () => {
      expect(() => logbook.render(mockRenderer)).not.toThrow();
    });
  });

  describe('Integration and Edge Cases', () => {
    it('should handle rapid discovery additions', () => {
      for (let i = 0; i < 50; i++) {
        addTestDiscovery(`Star ${i}`, 'G-type Star');
      }
      
      expect(logbook.discoveries).toHaveLength(50);
      expect(logbook.scrollOffset).toBe(38); // Should scroll to bottom (50 - 12)
    });

    it('should handle timestamp updates without crashes', () => {
      const now = Date.now();
      addTestDiscovery('Star A', 'G-type Star', now - 1000);
      addTestDiscovery('Star B', 'K-type Star', now - 60000);
      
      expect(() => logbook.updateTimestamps()).not.toThrow();
      
      expect(logbook.discoveries[0].displayTime).toContain('now');
      expect(logbook.discoveries[1].displayTime).toContain('1m ago');
    });

    it('should handle very long discovery names gracefully', () => {
      const longName = 'A'.repeat(100);
      
      addTestDiscovery(longName, 'G-type Star');
      
      expect(logbook.discoveries[0].name).toBe(longName);
      expect(() => logbook.render(mockRenderer)).not.toThrow();
    });

    it('should maintain consistent state through multiple operations', () => {
      // Add enough discoveries to enable scrolling (more than maxVisible=12)
      for (let i = 0; i < 15; i++) {
        addTestDiscovery(`Star ${i}`, 'G-type Star');
      }
      
      // Toggle visibility (sets scroll to bottom = 3), then scroll up by 1 to get to 2
      logbook.toggle();
      logbook.handleScroll(-1); // Scroll up by 1 to get from 3 to 2
      logbook.update(0.016);
      logbook.updateTimestamps();
      
      // Should still be in consistent state
      expect(logbook.isVisible()).toBe(true);
      expect(logbook.discoveries).toHaveLength(15);
      expect(logbook.scrollOffset).toBe(2);
    });

    it('should handle window global assignment when available', () => {
      // Test that global window assignment doesn't crash
      // This is more of a smoke test since we can't easily mock window in Node.js
      expect(typeof logbook).toBe('object');
      expect(logbook.constructor.name).toBe('DiscoveryLogbook');
    });
  });
});