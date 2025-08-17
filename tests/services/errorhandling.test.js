// Error Handling and Recovery Tests - Test-driven development for robust error management
// Following Phase 5 future-proofing patterns

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorBoundary } from '../../dist/services/ErrorBoundary.js';

describe('ErrorBoundary', () => {
    let errorBoundary;
    let mockLogger;

    beforeEach(() => {
        // Mock console methods to avoid test noise
        mockLogger = {
            error: vi.fn(),
            warn: vi.fn(),
            info: vi.fn(),
            debug: vi.fn()
        };

        // Mock global error handling
        global.window = {
            addEventListener: vi.fn(),
            removeEventListener: vi.fn()
        };

        errorBoundary = new ErrorBoundary({
            logger: mockLogger,
            enableGlobalHandling: true
        });
    });

    afterEach(() => {
        if (errorBoundary && typeof errorBoundary.dispose === 'function') {
            errorBoundary.dispose();
        }
        vi.restoreAllMocks();
        delete global.window;
    });

    describe('Initialization', () => {
        it('should initialize with proper configuration', () => {
            expect(errorBoundary).toBeDefined();
            expect(errorBoundary.logger).toBe(mockLogger);
        });

        it('should set up global error handlers when enabled', () => {
            expect(global.window.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
            expect(global.window.addEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
        });

        it('should not set up global handlers when disabled', () => {
            vi.clearAllMocks();
            
            new ErrorBoundary({
                logger: mockLogger,
                enableGlobalHandling: false
            });

            expect(global.window.addEventListener).not.toHaveBeenCalled();
        });
    });

    describe('Error Catching and Recovery', () => {
        it('should catch and handle synchronous errors', () => {
            const faultyFunction = () => {
                throw new Error('Test error');
            };

            const result = errorBoundary.safeExecute(faultyFunction, 'test-operation');

            expect(result).toBeNull();
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error in test-operation:', 
                expect.any(Error)
            );
        });

        it('should return result when function succeeds', () => {
            const successFunction = () => 'success result';

            const result = errorBoundary.safeExecute(successFunction, 'test-operation');

            expect(result).toBe('success result');
            expect(mockLogger.error).not.toHaveBeenCalled();
        });

        it('should provide fallback values for failed operations', () => {
            const faultyFunction = () => {
                throw new Error('Test error');
            };

            const fallbackValue = 'fallback result';
            const result = errorBoundary.safeExecute(faultyFunction, 'test-operation', fallbackValue);

            expect(result).toBe(fallbackValue);
            expect(mockLogger.error).toHaveBeenCalled();
        });

        it('should handle async operations', async () => {
            const faultyAsyncFunction = async () => {
                throw new Error('Async test error');
            };

            const result = await errorBoundary.safeExecuteAsync(faultyAsyncFunction, 'async-operation');

            expect(result).toBeNull();
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error in async-operation:', 
                expect.any(Error)
            );
        });

        it('should provide async fallback values', async () => {
            const faultyAsyncFunction = async () => {
                throw new Error('Async test error');
            };

            const fallbackValue = 'async fallback';
            const result = await errorBoundary.safeExecuteAsync(faultyAsyncFunction, 'async-operation', fallbackValue);

            expect(result).toBe(fallbackValue);
        });
    });

    describe('Error Classification and Response', () => {
        it('should classify render errors appropriately', () => {
            const renderError = new Error('Failed to render star at position (100, 200)');
            renderError.name = 'RenderError';

            const classification = errorBoundary.classifyError(renderError);

            expect(classification).toEqual({
                type: 'render',
                severity: 'medium',
                recoverable: true,
                action: 'skip-render'
            });
        });

        it('should classify audio errors appropriately', () => {
            const audioError = new Error('Failed to load sound file');
            audioError.name = 'AudioError';

            const classification = errorBoundary.classifyError(audioError);

            expect(classification).toEqual({
                type: 'audio',
                severity: 'low',
                recoverable: true,
                action: 'disable-audio'
            });
        });

        it('should classify plugin errors appropriately', () => {
            const pluginError = new Error('Plugin initialization failed');
            pluginError.name = 'PluginError';

            const classification = errorBoundary.classifyError(pluginError);

            expect(classification).toEqual({
                type: 'plugin',
                severity: 'medium',
                recoverable: true,
                action: 'disable-plugin'
            });
        });

        it('should classify critical system errors', () => {
            const systemError = new Error('Out of memory');
            systemError.name = 'SystemError';

            const classification = errorBoundary.classifyError(systemError);

            expect(classification).toEqual({
                type: 'system',
                severity: 'critical',
                recoverable: false,
                action: 'restart-required'
            });
        });

        it('should handle unknown error types', () => {
            const unknownError = new Error('Unknown error');

            const classification = errorBoundary.classifyError(unknownError);

            expect(classification).toEqual({
                type: 'unknown',
                severity: 'medium',
                recoverable: true,
                action: 'log-only'
            });
        });
    });

    describe('Error Recovery Strategies', () => {
        it('should implement retry strategy for recoverable errors', async () => {
            let attemptCount = 0;
            const flakyFunction = () => {
                attemptCount++;
                if (attemptCount < 3) {
                    throw new Error('Temporary failure');
                }
                return 'success after retries';
            };

            const result = await errorBoundary.executeWithRetry(flakyFunction, {
                maxRetries: 3,
                retryDelay: 10,
                operation: 'flaky-operation'
            });

            expect(result).toBe('success after retries');
            expect(attemptCount).toBe(3);
        });

        it('should fail after max retries are exhausted', async () => {
            const alwaysFailFunction = () => {
                throw new Error('Always fails');
            };

            const result = await errorBoundary.executeWithRetry(alwaysFailFunction, {
                maxRetries: 2,
                retryDelay: 10,
                operation: 'always-fail'
            });

            expect(result).toBeNull();
            expect(mockLogger.error).toHaveBeenCalledTimes(3); // Initial + 2 retries
        });

        it('should implement circuit breaker for repeated failures', () => {
            // Simulate repeated failures
            for (let i = 0; i < 5; i++) {
                errorBoundary.recordFailure('test-service');
            }

            expect(errorBoundary.isCircuitOpen('test-service')).toBe(true);
            
            // Should not execute when circuit is open
            const result = errorBoundary.executeIfCircuitClosed('test-service', () => 'should not execute');
            
            expect(result).toBeNull();
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Circuit breaker is open for service: test-service'
            );
        });

        it('should reset circuit breaker after timeout', () => {
            // Simulate failures to open circuit
            for (let i = 0; i < 5; i++) {
                errorBoundary.recordFailure('test-service');
            }

            expect(errorBoundary.isCircuitOpen('test-service')).toBe(true);

            // Manually reset for testing
            errorBoundary.resetCircuit('test-service');

            expect(errorBoundary.isCircuitOpen('test-service')).toBe(false);
            
            const result = errorBoundary.executeIfCircuitClosed('test-service', () => 'circuit reset');
            expect(result).toBe('circuit reset');
        });
    });

    describe('Error Reporting and Monitoring', () => {
        it('should track error statistics', () => {
            errorBoundary.reportError(new Error('Test error 1'), 'operation-1');
            errorBoundary.reportError(new Error('Test error 2'), 'operation-1');
            errorBoundary.reportError(new Error('Test error 3'), 'operation-2');

            const stats = errorBoundary.getErrorStatistics();

            expect(stats).toEqual({
                totalErrors: 3,
                errorsByOperation: {
                    'operation-1': 2,
                    'operation-2': 1
                },
                errorsByType: {
                    'unknown': 3
                },
                recentErrors: expect.any(Array)
            });

            expect(stats.recentErrors).toHaveLength(3);
        });

        it('should limit recent error history', () => {
            // Report more errors than the limit
            for (let i = 0; i < 15; i++) {
                errorBoundary.reportError(new Error(`Error ${i}`), 'test-operation');
            }

            const stats = errorBoundary.getErrorStatistics();
            
            // Should only keep last 10 errors
            expect(stats.recentErrors).toHaveLength(10);
            expect(stats.totalErrors).toBe(15);
        });

        it('should provide error health status', () => {
            // No errors - healthy
            expect(errorBoundary.getHealthStatus()).toEqual({
                status: 'healthy',
                errorRate: 0,
                criticalErrors: 0,
                recommendation: 'none'
            });

            // Some errors - degraded
            for (let i = 0; i < 3; i++) {
                errorBoundary.reportError(new Error('Test error'), 'test-operation');
            }

            const degradedStatus = errorBoundary.getHealthStatus();
            expect(degradedStatus.status).toBe('degraded');
            expect(degradedStatus.errorRate).toBeGreaterThan(0);
        });
    });

    describe('Graceful Degradation', () => {
        it('should disable audio subsystem on audio errors', () => {
            const audioError = new Error('Audio system failed');
            audioError.name = 'AudioError';

            const degradation = errorBoundary.handleGracefulDegradation(audioError, 'audio-service');

            expect(degradation).toEqual({
                subsystem: 'audio',
                action: 'disabled',
                impact: 'Audio features are temporarily unavailable',
                userMessage: 'Audio has been disabled due to technical issues'
            });
        });

        it('should fall back to basic rendering on render errors', () => {
            const renderError = new Error('WebGL context lost');
            renderError.name = 'RenderError';

            const degradation = errorBoundary.handleGracefulDegradation(renderError, 'render-service');

            expect(degradation).toEqual({
                subsystem: 'rendering',
                action: 'fallback-mode',
                impact: 'Reduced visual quality',
                userMessage: 'Switched to basic rendering mode for stability'
            });
        });

        it('should isolate plugin failures', () => {
            const pluginError = new Error('Plugin crashed');
            pluginError.name = 'PluginError';

            const degradation = errorBoundary.handleGracefulDegradation(pluginError, 'quasar-plugin');

            expect(degradation).toEqual({
                subsystem: 'plugins',
                action: 'plugin-disabled',
                impact: 'Plugin features unavailable',
                userMessage: 'A plugin has been disabled due to an error'
            });
        });
    });

    describe('Error Boundary Disposal', () => {
        it('should clean up global event listeners on disposal', () => {
            errorBoundary.dispose();

            expect(global.window.removeEventListener).toHaveBeenCalledWith('error', expect.any(Function));
            expect(global.window.removeEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
        });

        it('should clear error statistics on disposal', () => {
            errorBoundary.reportError(new Error('Test error'), 'test-operation');
            
            expect(errorBoundary.getErrorStatistics().totalErrors).toBe(1);
            
            errorBoundary.dispose();
            
            // Should not be able to get stats after disposal
            expect(() => errorBoundary.getErrorStatistics()).toThrow('ErrorBoundary has been disposed');
        });
    });
});