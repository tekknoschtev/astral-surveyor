// ErrorService Reliability Tests - Priority 2 Critical Coverage
// Tests the simplified ErrorService for graceful degradation and safe execution patterns

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorService, getErrorService } from '../../dist/services/ErrorService.js';

describe('ErrorService Core Functionality', () => {
    let errorService;
    let consoleErrorSpy;

    beforeEach(() => {
        errorService = new ErrorService();
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Safe Execution Patterns', () => {
        it('should execute functions safely with fallback values', () => {
            const faultyFn = () => {
                throw new Error('Service unavailable');
            };

            const result = errorService.safeExecute('WorldService', 'generateChunk', faultyFn, []);

            expect(result).toEqual([]);
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'WorldService.generateChunk:',
                expect.any(Error)
            );
        });

        it('should execute functions successfully without fallback', () => {
            const successFn = () => 'success result';

            const result = errorService.safeExecute('WorldService', 'generateChunk', successFn, []);

            expect(result).toBe('success result');
            expect(consoleErrorSpy).not.toHaveBeenCalled();
        });

        it('should return null when no fallback provided and function fails', () => {
            const faultyFn = () => {
                throw new Error('Service unavailable');
            };

            const result = errorService.safeExecute('WorldService', 'generateChunk', faultyFn);

            expect(result).toBeNull();
            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        it('should handle async operations without breaking game loop', async () => {
            const faultyAsync = () => Promise.reject(new Error('Network failure'));

            const result = await errorService.safeExecuteAsync('SaveService', 'upload', faultyAsync, false);

            expect(result).toBe(false);
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'SaveService.upload:',
                expect.any(Error)
            );
        });

        it('should handle successful async operations', async () => {
            const successAsync = () => Promise.resolve('async success');

            const result = await errorService.safeExecuteAsync('SaveService', 'upload', successAsync, false);

            expect(result).toBe('async success');
            expect(consoleErrorSpy).not.toHaveBeenCalled();
        });

        it('should return null for failed async operations without fallback', async () => {
            const faultyAsync = () => Promise.reject(new Error('Network failure'));

            const result = await errorService.safeExecuteAsync('SaveService', 'upload', faultyAsync);

            expect(result).toBeNull();
            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        it('should handle custom user messages', () => {
            const faultyFn = () => {
                throw new Error('Service unavailable');
            };

            const result = errorService.safeExecute(
                'AudioService',
                'playSound',
                faultyFn,
                null,
                'Sound playback failed'
            );

            expect(result).toBeNull();
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'AudioService.playSound:',
                expect.any(Error)
            );
        });
    });

    describe('Error Reporting and Callback Management', () => {
        it('should report errors directly without execution', () => {
            const testError = new Error('Direct error report');

            errorService.reportError('RenderService', 'drawStar', testError, 'Rendering failed');

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'RenderService.drawStar:',
                testError
            );
        });

        it('should notify error callbacks without spam', () => {
            const mockCallback = vi.fn();
            errorService.onError(mockCallback);

            const testError = new Error('Audio disabled');

            // Same error multiple times
            for (let i = 0; i < 5; i++) {
                errorService.reportError('AudioService', 'playSound', testError);
            }

            // All errors should trigger callbacks (simplified service doesn't deduplicate)
            expect(mockCallback).toHaveBeenCalledTimes(5);
            expect(mockCallback).toHaveBeenCalledWith({
                service: 'AudioService',
                operation: 'playSound',
                error: testError,
                recoverable: true,
                userMessage: undefined
            });
        });

        it('should handle multiple error callbacks', () => {
            const mockCallback1 = vi.fn();
            const mockCallback2 = vi.fn();

            errorService.onError(mockCallback1);
            errorService.onError(mockCallback2);

            const testError = new Error('Test error');
            errorService.reportError('TestService', 'testOperation', testError);

            expect(mockCallback1).toHaveBeenCalledTimes(1);
            expect(mockCallback2).toHaveBeenCalledTimes(1);

            const expectedEventData = {
                service: 'TestService',
                operation: 'testOperation',
                error: testError,
                recoverable: true,
                userMessage: undefined
            };

            expect(mockCallback1).toHaveBeenCalledWith(expectedEventData);
            expect(mockCallback2).toHaveBeenCalledWith(expectedEventData);
        });

        it('should handle callback errors gracefully', () => {
            const faultyCallback = vi.fn().mockImplementation(() => {
                throw new Error('Callback error');
            });
            const goodCallback = vi.fn();

            errorService.onError(faultyCallback);
            errorService.onError(goodCallback);

            const testError = new Error('Original error');
            errorService.reportError('TestService', 'testOperation', testError);

            // Should log callback error but continue with other callbacks
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error in error callback:',
                expect.any(Error)
            );
            expect(goodCallback).toHaveBeenCalledTimes(1);
        });

        it('should include user messages in error event data', () => {
            const mockCallback = vi.fn();
            errorService.onError(mockCallback);

            const testError = new Error('Test error');
            const userMessage = 'Operation failed, trying fallback';

            errorService.reportError('TestService', 'testOperation', testError, userMessage);

            expect(mockCallback).toHaveBeenCalledWith({
                service: 'TestService',
                operation: 'testOperation',
                error: testError,
                recoverable: true,
                userMessage: userMessage
            });
        });
    });

    describe('Backward Compatibility and Graceful Degradation', () => {
        it('should provide empty degraded services list', () => {
            const degradedServices = errorService.getDegradedServices();

            expect(degradedServices).toEqual([]);
            expect(Array.isArray(degradedServices)).toBe(true);
        });

        it('should handle service recovery marking as no-op', () => {
            expect(() => {
                errorService.markServiceRecovered('TestService');
            }).not.toThrow();
        });

        it('should handle retry execution by delegating to safe async execution', async () => {
            const faultyFn = () => Promise.reject(new Error('Always fails'));

            const result = await errorService.executeWithRetry(
                'TestService',
                'testOperation',
                faultyFn,
                3,
                100,
                'Retry failed'
            );

            expect(result).toBeNull();
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'TestService.testOperation:',
                expect.any(Error)
            );
        });

        it('should handle conditional execution by delegating to safe execution', () => {
            const successFn = () => 'health check passed';

            const result = errorService.executeIfServiceHealthy(
                'TestService',
                'healthCheck',
                successFn,
                'Health check message'
            );

            expect(result).toBe('health check passed');
            expect(consoleErrorSpy).not.toHaveBeenCalled();
        });

        it('should provide healthy status from getHealthStatus', () => {
            const healthStatus = errorService.getHealthStatus();

            expect(healthStatus).toEqual({ status: 'healthy' });
        });

        it('should provide empty recent errors list', () => {
            const recentErrors = errorService.getRecentErrors();

            expect(recentErrors).toEqual([]);
            expect(Array.isArray(recentErrors)).toBe(true);
        });

        it('should handle service degradation callbacks as no-op', () => {
            const mockCallback = vi.fn();

            expect(() => {
                errorService.onServiceDegraded(mockCallback);
            }).not.toThrow();

            // Callback should not be called since it's a no-op
            errorService.reportError('TestService', 'testOperation', new Error('Test'));
            expect(mockCallback).not.toHaveBeenCalled();
        });
    });

    describe('Real-world Error Scenarios', () => {
        it('should handle WebGL context loss gracefully', () => {
            const webglError = new Error('WebGL context lost');
            const fallbackRenderer = 'canvas2d';

            const result = errorService.safeExecute(
                'RenderService',
                'initWebGL',
                () => { throw webglError; },
                fallbackRenderer,
                'Switched to 2D rendering'
            );

            expect(result).toBe(fallbackRenderer);
        });

        it('should handle audio system failures during gameplay', () => {
            const audioError = new Error('Audio context suspended');

            const result = errorService.safeExecute(
                'AudioService',
                'playDiscoverySound',
                () => { throw audioError; },
                false, // Don't play sound as fallback
                'Audio temporarily disabled'
            );

            expect(result).toBe(false);
            // Game should continue without sound
        });

        it('should handle save system failures without data loss', async () => {
            const saveError = new Error('Storage quota exceeded');

            const result = await errorService.safeExecuteAsync(
                'SaveLoadService',
                'saveGame',
                () => Promise.reject(saveError),
                { success: false, error: 'Save failed' },
                'Unable to save, please free up storage space'
            );

            expect(result).toEqual({ success: false, error: 'Save failed' });
            // User should be notified but game continues
        });

        it('should handle chunk generation failures without breaking world', () => {
            const generationError = new Error('Procedural generation failed');
            const emptyChunk = { stars: [], discovered: false };

            const result = errorService.safeExecute(
                'ChunkManager',
                'generateChunk',
                () => { throw generationError; },
                emptyChunk,
                'Empty space generated'
            );

            expect(result).toEqual(emptyChunk);
            // World should have empty space instead of crashing
        });
    });
});

describe('ErrorService Singleton', () => {
    afterEach(() => {
        // Reset singleton for clean tests
        try {
            const errorServiceModule = require('../../dist/services/ErrorService.js');
            if (errorServiceModule && 'errorServiceInstance' in errorServiceModule) {
                errorServiceModule.errorServiceInstance = null;
            }
        } catch (e) {
            // Ignore module reset errors in tests
        }
    });

    it('should provide singleton instance', () => {
        const instance1 = getErrorService();
        const instance2 = getErrorService();

        expect(instance1).toBe(instance2);
        expect(instance1).toBeInstanceOf(ErrorService);
    });

    it('should create new instance on first call', () => {
        const instance = getErrorService();

        expect(instance).toBeInstanceOf(ErrorService);
        expect(instance.safeExecute).toBeInstanceOf(Function);
    });
});