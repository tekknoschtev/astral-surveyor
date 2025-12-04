// TouchUI System Tests - Mobile Interface and Touch Controls
// Testing the TouchUI class for touch device detection and basic functionality

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TouchUI } from '../../dist/ui/touchui.js';

describe('TouchUI System', () => {
  let touchUI;
  let mockRenderer;

  beforeEach(() => {
    // Mock navigator for touch detection tests
    Object.defineProperty(global, 'navigator', {
      value: {
        maxTouchPoints: 1,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
      },
      writable: true
    });

    // Mock window and screen
    Object.defineProperty(global, 'window', {
      value: {
        ontouchstart: {},
        screen: { width: 800 }
      },
      writable: true
    });

    touchUI = new TouchUI();

    // Mock renderer object
    mockRenderer = {
      ctx: {
        fillStyle: '',
        globalAlpha: 1,
        font: '',
        textAlign: 'center',
        textBaseline: 'middle',
        fillText: vi.fn(),
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        strokeStyle: '',
        lineWidth: 0,
        stroke: vi.fn(),
        save: vi.fn(),
        restore: vi.fn()
      },
      canvas: {
        width: 800,
        height: 600
      }
    };
  });

  describe('Touch Device Detection', () => {
    it('should detect touch devices correctly', () => {
      expect(touchUI.isTouchDevice).toBe(true);
    });

    it('should detect desktop devices correctly', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          maxTouchPoints: 0,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        writable: true
      });

      Object.defineProperty(global, 'window', {
        value: {
          screen: { width: 1920 }
        },
        writable: true
      });

      const desktopUI = new TouchUI();
      expect(desktopUI.isTouchDevice).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete update cycle', () => {
      const mockCanvas = {
        width: 800,
        height: 600
      };

      const mockStellarMap = {
        isVisible: () => true,
        isFollowingPlayer: () => false
      };
      const mockLogbook = {
        isVisible: () => false
      };

      // Complete cycle: update, render, handle input
      expect(() => {
        touchUI.update(0.016, mockCanvas, mockStellarMap, mockLogbook);
        touchUI.render(mockRenderer);
        touchUI.handleTouch(100, 100);
      }).not.toThrow();
    });
  });
});
