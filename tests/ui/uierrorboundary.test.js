// UIErrorBoundary basic test coverage
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UIErrorBoundary } from '../../dist/ui/UIErrorBoundary.js';

// Mock DOM environment
global.document = {
    createElement: vi.fn((tagName) => ({
        tagName,
        className: '',
        style: { cssText: '' },
        textContent: '',
        appendChild: vi.fn(),
        addEventListener: vi.fn(),
        parentNode: {
            replaceChild: vi.fn()
        }
    }))
};

describe('UIErrorBoundary', () => {
    let uiErrorBoundary;
    let mockErrorService;

    beforeEach(() => {
        mockErrorService = {
            safeExecute: vi.fn((service, operation, fn, fallback) => {
                try {
                    return fn();
                } catch {
                    return fallback;
                }
            }),
            safeExecuteAsync: vi.fn(async (service, operation, fn, fallback) => {
                try {
                    return await fn();
                } catch {
                    return fallback;
                }
            }),
            markServiceRecovered: vi.fn(),
            onError: vi.fn(),
            onServiceDegraded: vi.fn()
        };

        uiErrorBoundary = new UIErrorBoundary(mockErrorService);
    });

    describe('Initialization', () => {
        it('should initialize UIErrorBoundary', () => {
            expect(uiErrorBoundary).toBeDefined();
            expect(uiErrorBoundary.errorService).toBe(mockErrorService);
        });

        it('should initialize with default fallback options', () => {
            expect(uiErrorBoundary.fallbackOptions).toBeDefined();
            expect(typeof uiErrorBoundary.fallbackOptions.enableRecovery).toBe('boolean');
        });
    });

    describe('Component Wrapping', () => {
        it('should wrap component operations', () => {
            const mockOperation = vi.fn(() => 'success');
            const result = uiErrorBoundary.wrapComponent('test-component', mockOperation);
            
            expect(mockErrorService.safeExecute).toHaveBeenCalled();
            expect(result).toBe('success');
        });

        it('should wrap async component operations', async () => {
            const mockAsyncOperation = vi.fn(async () => 'async-success');
            const result = await uiErrorBoundary.wrapComponentAsync('test-component', mockAsyncOperation);
            
            expect(mockErrorService.safeExecuteAsync).toHaveBeenCalled();
            expect(result).toBe('async-success');
        });
    });

    describe('DOM Operations', () => {
        it('should wrap DOM operations safely', () => {
            const mockDOMOperation = vi.fn();
            const result = uiErrorBoundary.safeDOMOperation('test-component', mockDOMOperation);
            
            expect(mockErrorService.safeExecute).toHaveBeenCalled();
        });
    });

    describe('Event Handlers', () => {
        it('should create safe event handlers', () => {
            const mockHandler = vi.fn();
            const safeHandler = uiErrorBoundary.safeEventHandler('test-component', mockHandler);
            
            expect(typeof safeHandler).toBe('function');
            
            const mockEvent = {};
            safeHandler(mockEvent);
            expect(mockErrorService.safeExecute).toHaveBeenCalled();
        });
    });

    describe('Error State Management', () => {
        it('should check for active errors', () => {
            const hasError = uiErrorBoundary.hasActiveError('test-component');
            expect(typeof hasError).toBe('boolean');
        });

        it('should get error state', () => {
            const errorState = uiErrorBoundary.getErrorState('test-component');
            expect(errorState).toBeNull(); // No error initially
        });

        it('should clear errors', () => {
            uiErrorBoundary.clearError('test-component');
            expect(mockErrorService.markServiceRecovered).toHaveBeenCalled();
        });

        it('should clear all errors', () => {
            uiErrorBoundary.clearAllErrors();
            // Should complete without throwing
            expect(true).toBe(true);
        });
    });

    describe('Error Display', () => {
        it('should create error display elements', () => {
            // Set up a mock error state
            uiErrorBoundary.errorStates.set('test-component', {
                hasError: true,
                errorMessage: 'Test error',
                recoverable: true
            });

            const errorDisplay = uiErrorBoundary.createErrorDisplay('test-component');
            expect(errorDisplay).toBeDefined();
            expect(document.createElement).toHaveBeenCalledWith('div');
        });

        it('should get list of failed components', () => {
            const failedComponents = uiErrorBoundary.getFailedComponents();
            expect(Array.isArray(failedComponents)).toBe(true);
        });
    });

    describe('Error Classification', () => {
        it('should classify UI errors', () => {
            const renderError = new Error('Render failed');
            const classification = uiErrorBoundary.classifyUIError(renderError);
            expect(classification).toBe('render');

            const eventError = new Error('Click handler failed');
            const eventClassification = uiErrorBoundary.classifyUIError(eventError);
            expect(eventClassification).toBe('interaction');

            const unknownError = new Error('Something went wrong');
            const unknownClassification = uiErrorBoundary.classifyUIError(unknownError);
            expect(unknownClassification).toBe('unknown');
        });
    });

    describe('Disposal', () => {
        it('should dispose properly', () => {
            uiErrorBoundary.dispose();
            expect(uiErrorBoundary.disposed).toBe(true);
        });

        it('should handle multiple disposal calls', () => {
            uiErrorBoundary.dispose();
            uiErrorBoundary.dispose();
            expect(uiErrorBoundary.disposed).toBe(true);
        });
    });
});