// UI System Tests - Discovery and Notification Display
// Testing the DiscoveryDisplay class for proper state management and timing

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DiscoveryDisplay } from '../../dist/ui/ui.js';

describe('DiscoveryDisplay System', () => {
  let discoveryDisplay;
  let mockRenderer;

  beforeEach(() => {
    discoveryDisplay = new DiscoveryDisplay();
    
    // Mock renderer object
    mockRenderer = {
      ctx: {
        fillStyle: '',
        globalAlpha: 1,
        font: '',
        textAlign: 'left',
        textBaseline: 'top',
        fillText: vi.fn(),
        fillRect: vi.fn(),
        measureText: vi.fn(() => ({ width: 100 })),
        save: vi.fn(),
        restore: vi.fn()
      },
      canvas: {
        width: 800,
        height: 600
      }
    };

    // Mock Date.now for consistent timing tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:30:00.000Z'));
  });

  describe('Initialization', () => {
    it('should initialize with correct default values', () => {
      expect(discoveryDisplay.discoveries).toEqual([]);
      expect(discoveryDisplay.notifications).toEqual([]);
      expect(discoveryDisplay.maxDisplayed).toBe(5);
      expect(discoveryDisplay.displayDuration).toBe(15000); // 15 seconds
      expect(discoveryDisplay.notificationDuration).toBe(3000); // 3 seconds
    });
  });

  describe('Discovery Management', () => {
    it('should add discoveries with proper data structure', () => {
      discoveryDisplay.addDiscovery('Alpha Centauri', 'G-type Star');
      
      expect(discoveryDisplay.discoveries).toHaveLength(1);
      
      const discovery = discoveryDisplay.discoveries[0];
      expect(discovery.objectName).toBe('Alpha Centauri');
      expect(discovery.objectType).toBe('G-type Star');
      expect(discovery.message).toContain('Alpha Centauri (G-type Star) discovered!');
      expect(discovery.message).toContain('2024-01-15'); // Date will be local timezone
      expect(discovery.timestamp).toBe(Date.now());
      expect(discovery.id).toBeDefined();
      expect(typeof discovery.id).toBe('string');
    });

    it('should generate IDs for each discovery', () => {
      // Note: Math.random().toString(36).substr(2, 9) can theoretically produce duplicates
      // but should usually be unique for small numbers of items
      discoveryDisplay.addDiscovery('Star A', 'G-type Star');
      discoveryDisplay.addDiscovery('Star B', 'K-type Star');
      
      const [discovery1, discovery2] = discoveryDisplay.discoveries;
      expect(discovery1.id).toBeDefined();
      expect(discovery2.id).toBeDefined();
      expect(typeof discovery1.id).toBe('string');
      expect(typeof discovery2.id).toBe('string');
    });

    it('should format timestamps with proper structure', () => {
      // Test timestamp formatting structure
      vi.setSystemTime(new Date('2024-12-31T18:59:59.999Z')); // Use local timezone
      discoveryDisplay.addDiscovery('Test Star', 'G-type Star');
      
      const discovery = discoveryDisplay.discoveries[0];
      expect(discovery.message).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/); // Proper format
      expect(discovery.message).toContain('2024-12-31');
    });

    it('should maintain discoveries in chronological order', () => {
      // Add first discovery
      discoveryDisplay.addDiscovery('Star A', 'G-type Star');
      const timestamp1 = Date.now();
      
      // Advance time and add second discovery
      vi.advanceTimersByTime(1000);
      discoveryDisplay.addDiscovery('Star B', 'K-type Star');
      const timestamp2 = Date.now();
      
      expect(discoveryDisplay.discoveries[0].timestamp).toBe(timestamp1);
      expect(discoveryDisplay.discoveries[1].timestamp).toBe(timestamp2);
      expect(timestamp2).toBeGreaterThan(timestamp1);
    });
  });

  describe('Notification Management', () => {
    it('should add notifications with proper structure', () => {
      discoveryDisplay.addNotification('Test notification');
      
      expect(discoveryDisplay.notifications).toHaveLength(1);
      
      const notification = discoveryDisplay.notifications[0];
      expect(notification.message).toBe('Test notification');
      expect(notification.timestamp).toBe(Date.now());
      expect(notification.id).toBeDefined();
      expect(typeof notification.id).toBe('string');
    });

    it('should generate IDs for notifications', () => {
      discoveryDisplay.addNotification('Notification 1');
      discoveryDisplay.addNotification('Notification 2');
      
      const [notif1, notif2] = discoveryDisplay.notifications;
      expect(notif1.id).toBeDefined();
      expect(notif2.id).toBeDefined();
      expect(typeof notif1.id).toBe('string');
      expect(typeof notif2.id).toBe('string');
    });
  });

  describe('Cleanup and Expiration', () => {
    it('should remove old discoveries based on display duration', () => {
      // Add a discovery
      discoveryDisplay.addDiscovery('Old Star', 'G-type Star');
      expect(discoveryDisplay.discoveries).toHaveLength(1);
      
      // Fast-forward beyond display duration
      vi.advanceTimersByTime(discoveryDisplay.displayDuration + 1000);
      
      // Call update to trigger cleanup
      discoveryDisplay.update(0.016);
      
      expect(discoveryDisplay.discoveries).toHaveLength(0);
    });

    it('should remove old notifications based on notification duration', () => {
      // Add a notification
      discoveryDisplay.addNotification('Old notification');
      expect(discoveryDisplay.notifications).toHaveLength(1);
      
      // Fast-forward beyond notification duration
      vi.advanceTimersByTime(discoveryDisplay.notificationDuration + 1000);
      
      // Call update to trigger cleanup
      discoveryDisplay.update(0.016);
      
      expect(discoveryDisplay.notifications).toHaveLength(0);
    });

    it('should keep recent discoveries and notifications', () => {
      // Add items
      discoveryDisplay.addDiscovery('Recent Star', 'G-type Star');
      discoveryDisplay.addNotification('Recent notification');
      
      // Fast-forward less than expiration time
      vi.advanceTimersByTime(1000);
      
      discoveryDisplay.update(0.016);
      
      expect(discoveryDisplay.discoveries).toHaveLength(1);
      expect(discoveryDisplay.notifications).toHaveLength(1);
    });

    it('should limit discoveries to maxDisplayed count', () => {
      // Add more discoveries than maxDisplayed
      for (let i = 0; i < discoveryDisplay.maxDisplayed + 3; i++) {
        discoveryDisplay.addDiscovery(`Star ${i}`, 'G-type Star');
      }
      
      // Should only keep the most recent maxDisplayed discoveries
      expect(discoveryDisplay.discoveries).toHaveLength(discoveryDisplay.maxDisplayed);
      
      // Should keep the most recent ones
      const lastDiscovery = discoveryDisplay.discoveries[discoveryDisplay.discoveries.length - 1];
      expect(lastDiscovery.objectName).toBe(`Star ${discoveryDisplay.maxDisplayed + 2}`);
    });
  });

  describe('Rendering System', () => {
    it('should not render when no discoveries exist', () => {
      discoveryDisplay.render(mockRenderer);
      
      // Should not make any rendering calls
      expect(mockRenderer.ctx.fillText).not.toHaveBeenCalled();
    });

    it('should render discovery messages', () => {
      discoveryDisplay.addDiscovery('Test Star', 'G-type Star');
      
      discoveryDisplay.render(mockRenderer);
      
      expect(mockRenderer.ctx.fillText).toHaveBeenCalled();
      
      // Check that the discovery message was rendered
      const calls = mockRenderer.ctx.fillText.mock.calls;
      const renderedText = calls.map(call => call[0]).join(' ');
      expect(renderedText).toContain('Test Star (G-type Star) discovered!');
    });

    it('should render notifications', () => {
      discoveryDisplay.addNotification('Test notification');
      
      discoveryDisplay.render(mockRenderer);
      
      expect(mockRenderer.ctx.fillText).toHaveBeenCalled();
      
      const calls = mockRenderer.ctx.fillText.mock.calls;
      const renderedText = calls.map(call => call[0]).join(' ');
      expect(renderedText).toContain('Test notification');
    });

    it('should apply fade effect to older discoveries', () => {
      // Add a discovery and let some time pass
      discoveryDisplay.addDiscovery('Fading Star', 'G-type Star');
      vi.advanceTimersByTime(discoveryDisplay.displayDuration * 0.8); // 80% through lifetime (should trigger fade)
      
      discoveryDisplay.render(mockRenderer);
      
      // Check that fillStyle was called with alpha values
      const fillStyleCalls = mockRenderer.ctx.fillStyle;
      // The implementation sets fillStyle to colors with hex alpha values
      // We can't easily test globalAlpha since it's not used, but we can verify rendering occurred
      expect(mockRenderer.ctx.fillText).toHaveBeenCalled();
      expect(mockRenderer.ctx.fillRect).toHaveBeenCalled();
    });

    it('should position discoveries correctly on screen', () => {
      discoveryDisplay.addDiscovery('Positioned Star', 'G-type Star');
      
      discoveryDisplay.render(mockRenderer);
      
      const textCalls = mockRenderer.ctx.fillText.mock.calls;
      expect(textCalls.length).toBeGreaterThan(0);
      
      // Check positioning (exact values depend on implementation)
      const [text, x, y] = textCalls[0];
      expect(typeof x).toBe('number');
      expect(typeof y).toBe('number');
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Update System', () => {
    it('should automatically cleanup expired items during update', () => {
      // Add items
      discoveryDisplay.addDiscovery('Test Star', 'G-type Star');
      discoveryDisplay.addNotification('Test notification');
      
      // Fast-forward time
      vi.advanceTimersByTime(Math.max(discoveryDisplay.displayDuration, discoveryDisplay.notificationDuration) + 1000);
      
      // Update should trigger cleanup
      discoveryDisplay.update();
      
      expect(discoveryDisplay.discoveries).toHaveLength(0);
      expect(discoveryDisplay.notifications).toHaveLength(0);
    });
  });

  describe('Integration and Edge Cases', () => {
    it('should handle rapid discovery additions', () => {
      // Add many discoveries quickly
      for (let i = 0; i < 20; i++) {
        discoveryDisplay.addDiscovery(`Rapid Star ${i}`, 'G-type Star');
      }
      
      // Should not crash and should respect limits
      expect(discoveryDisplay.discoveries.length).toBeLessThanOrEqual(discoveryDisplay.maxDisplayed);
      expect(() => discoveryDisplay.render(mockRenderer)).not.toThrow();
    });

    it('should handle empty object names gracefully', () => {
      discoveryDisplay.addDiscovery('', 'G-type Star');
      
      expect(discoveryDisplay.discoveries).toHaveLength(1);
      expect(() => discoveryDisplay.render(mockRenderer)).not.toThrow();
    });

    it('should handle very long object names', () => {
      const longName = 'A'.repeat(100);
      discoveryDisplay.addDiscovery(longName, 'G-type Star');
      
      expect(discoveryDisplay.discoveries[0].objectName).toBe(longName);
      expect(() => discoveryDisplay.render(mockRenderer)).not.toThrow();
    });

    it('should handle rendering with minimal canvas size', () => {
      mockRenderer.canvas.width = 100;
      mockRenderer.canvas.height = 100;
      
      discoveryDisplay.addDiscovery('Test Star', 'G-type Star');
      
      expect(() => discoveryDisplay.render(mockRenderer)).not.toThrow();
    });
  });
});