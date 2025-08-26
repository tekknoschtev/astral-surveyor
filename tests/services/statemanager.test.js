// StateManager basic test coverage
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateManager } from '../../dist/services/StateManager.js';

// Mock window and URLSearchParams for browser environment
global.window = {
    location: { search: '' },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
};
global.URLSearchParams = class MockURLSearchParams {
    constructor() {}
    has() { return false; }
    get() { return null; }
};

describe('StateManager', () => {
    let stateManager;

    beforeEach(() => {
        const mockStartingPosition = { x: 0, y: 0 };
        stateManager = new StateManager(mockStartingPosition);
    });

    describe('Initialization', () => {
        it('should initialize StateManager', () => {
            expect(stateManager).toBeDefined();
            expect(typeof stateManager.checkDebugMode).toBe('function');
        });

        it('should initialize with starting position', () => {
            expect(stateManager.gameStartingPosition).toBeDefined();
        });
    });

    describe('Debug Mode', () => {
        it('should check debug mode', () => {
            const debugMode = stateManager.checkDebugMode();
            expect(typeof debugMode).toBe('boolean');
        });
    });

    describe('Traversal State', () => {
        it('should have traversal properties', () => {
            expect(typeof stateManager.isTraversing).toBe('boolean');
            expect(typeof stateManager.traversalStartTime).toBe('number');
        });
    });

    describe('Universe Reset', () => {
        it('should have reset properties', () => {
            expect(typeof stateManager.isResettingUniverse).toBe('boolean');
            expect(typeof stateManager.resetStartTime).toBe('number');
        });

        it('should initiate universe reset', () => {
            stateManager.initiateUniverseReset();
            expect(stateManager.isResettingUniverse).toBe(true);
        });
    });

    describe('Transition State', () => {
        it('should check if in transition', () => {
            const inTransition = stateManager.isInTransition();
            expect(typeof inTransition).toBe('boolean');
        });
    });

    describe('Fade Calculations', () => {
        it('should calculate fade alpha', () => {
            const fadeAlpha = stateManager.calculateFadeAlpha();
            expect(typeof fadeAlpha).toBe('number');
            expect(fadeAlpha).toBeGreaterThanOrEqual(0);
            expect(fadeAlpha).toBeLessThanOrEqual(1);
        });
    });

    describe('State Reset', () => {
        it('should reset state', () => {
            stateManager.reset();
            expect(stateManager.isTraversing).toBe(false);
            expect(stateManager.isResettingUniverse).toBe(false);
        });
    });
});