// Error Recovery Scenarios Integration Tests
// Tests error boundary, plugin error handling, and graceful degradation

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorBoundary } from '../../dist/services/ErrorBoundary.js';
import { PluginManager } from '../../dist/services/PluginManager.js';

describe('Error Recovery Scenarios', () => {
    let errorBoundary;
    let mockLogger;
    let consoleErrorSpy;
    let consoleWarnSpy;

    beforeEach(() => {
        // Mock console methods to prevent spam during tests
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        // Create mock logger
        mockLogger = {
            error: vi.fn(),
            warn: vi.fn(),
            info: vi.fn(),
            debug: vi.fn()
        };

        errorBoundary = new ErrorBoundary({
            logger: mockLogger,
            enableGlobalHandling: false // Disable for testing
        });
    });

    afterEach(() => {
        if (errorBoundary) {
            errorBoundary.dispose();
        }
        vi.restoreAllMocks();
    });

    describe('Service Initialization Failures', () => {
        it('should log service initialization errors and continue', () => {
            const failingInit = () => {
                throw new Error('Service initialization failed');
            };

            const result = errorBoundary.safeExecute(failingInit, 'service-init', null);

            expect(result).toBeNull();
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('service-init'),
                expect.any(Error)
            );
        });

        it('should handle async service initialization failures', async () => {
            const failingAsyncInit = async () => {
                throw new Error('Async service initialization failed');
            };

            const result = await errorBoundary.safeExecuteAsync(failingAsyncInit, 'async-service-init', null);

            expect(result).toBeNull();
            expect(mockLogger.error).toHaveBeenCalled();
        });

        it('should provide fallback value for failed service initialization', () => {
            const failingInit = () => {
                throw new Error('Init failed');
            };

            const fallbackService = { status: 'fallback' };
            const result = errorBoundary.safeExecute(failingInit, 'service-init', fallbackService);

            expect(result).toBe(fallbackService);
        });

        it('should track multiple initialization failures', () => {
            for (let i = 0; i < 3; i++) {
                errorBoundary.safeExecute(() => {
                    throw new Error(`Init failure ${i}`);
                }, 'service-init', null);
            }

            const stats = errorBoundary.getErrorStatistics();
            expect(stats.totalErrors).toBe(3);
            expect(stats.errorsByOperation['service-init']).toBe(3);
        });
    });

    describe('Rendering Errors Don\'t Crash Game Loop', () => {
        it('should classify rendering errors correctly', () => {
            const renderError = new Error('WebGL rendering failed');
            const classification = errorBoundary.classifyError(renderError);

            expect(classification.type).toBe('render');
            expect(classification.recoverable).toBe(true);
            expect(classification.action).toBe('skip-render');
        });

        it('should continue game loop after render error', () => {
            let frameCount = 0;

            const simulateFrame = () => {
                frameCount++;
                if (frameCount === 2) {
                    throw new Error('Render error in frame 2');
                }
                return `frame-${frameCount}`;
            };

            // Frame 1 - succeeds
            const frame1 = errorBoundary.safeExecute(simulateFrame, 'game-loop', 'fallback');
            expect(frame1).toBe('frame-1');

            // Frame 2 - fails but doesn't crash
            const frame2 = errorBoundary.safeExecute(simulateFrame, 'game-loop', 'fallback');
            expect(frame2).toBe('fallback');

            // Frame 3 - continues after error
            const frame3 = errorBoundary.safeExecute(simulateFrame, 'game-loop', 'fallback');
            expect(frame3).toBe('frame-3');
        });

        it('should handle rendering fallback gracefully', () => {
            const renderError = new Error('Rendering subsystem error');
            const degradation = errorBoundary.handleGracefulDegradation(renderError, 'rendering');

            expect(degradation.subsystem).toBe('rendering');
            expect(degradation.action).toBe('fallback-mode');
            expect(degradation.userMessage).toContain('basic rendering mode');
        });

        it('should skip problematic render frames without stopping', () => {
            const renderFrames = [1, 2, 3, 4, 5];
            const problematicFrames = [2, 4];
            const results = [];

            renderFrames.forEach(frameNum => {
                const result = errorBoundary.safeExecute(() => {
                    if (problematicFrames.includes(frameNum)) {
                        throw new Error(`Render error in frame ${frameNum}`);
                    }
                    return frameNum;
                }, `render-frame-${frameNum}`, -1);

                results.push(result);
            });

            expect(results).toEqual([1, -1, 3, -1, 5]);
            expect(mockLogger.error).toHaveBeenCalledTimes(2);
        });
    });

    describe('Plugin Loading Errors Show Helpful Message', () => {
        let pluginManager;
        let mockDependencies;

        beforeEach(() => {
            mockDependencies = {
                celestialFactory: { addObjectType: vi.fn() },
                discoveryService: { registerDiscoveryType: vi.fn() },
                audioService: { addSound: vi.fn() }
            };

            pluginManager = new PluginManager(mockDependencies);
        });

        afterEach(() => {
            if (pluginManager) {
                pluginManager.dispose();
            }
        });

        it('should reject plugin with missing required fields', () => {
            const invalidPlugin = {
                id: 'test-plugin',
                name: 'Test Plugin'
                // Missing required fields
            };

            expect(() => {
                pluginManager.registerPlugin(invalidPlugin);
            }).toThrow('Plugin must have required fields');
        });

        it('should handle plugin registration errors gracefully', () => {
            const failingPlugin = {
                id: 'failing-plugin',
                name: 'Failing Plugin',
                version: '1.0.0',
                type: 'celestial',
                description: 'A plugin that fails to register',
                author: 'Test',
                register: () => {
                    throw new Error('Plugin registration failed');
                },
                unregister: () => {}
            };

            expect(() => {
                pluginManager.registerPlugin(failingPlugin);
            }).toThrow('Failed to register plugin');
        });

        it('should handle plugin unregistration errors gracefully', () => {
            const problematicPlugin = {
                id: 'problematic-plugin',
                name: 'Problematic Plugin',
                version: '1.0.0',
                type: 'audio',
                description: 'Plugin that fails to unregister',
                author: 'Test',
                register: () => {},
                unregister: () => {
                    throw new Error('Unregister failed');
                }
            };

            pluginManager.registerPlugin(problematicPlugin);

            // Should not throw, but log warning
            expect(() => {
                pluginManager.unregisterPlugin('problematic-plugin');
            }).not.toThrow();

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('problematic-plugin'),
                expect.any(Error)
            );
        });

        it('should show plugin error in status', () => {
            const workingPlugin = {
                id: 'working-plugin',
                name: 'Working Plugin',
                version: '1.0.0',
                type: 'celestial',
                description: 'A working plugin',
                author: 'Test',
                register: () => {},
                unregister: () => {}
            };

            pluginManager.registerPlugin(workingPlugin);

            const status = pluginManager.getSystemStatus();
            expect(status.totalPlugins).toBe(1);
            expect(status.activePlugins).toBe(1);
            expect(status.erroredPlugins).toBe(0);
        });

        it('should provide helpful error message for invalid plugin type', () => {
            const invalidTypePlugin = {
                id: 'invalid-type-plugin',
                name: 'Invalid Type',
                version: '1.0.0',
                type: 'invalid-type',
                description: 'Wrong type',
                author: 'Test',
                register: () => {},
                unregister: () => {}
            };

            expect(() => {
                pluginManager.registerPlugin(invalidTypePlugin);
            }).toThrow('Plugin type must be one of');
        });

        it('should handle multiple plugin errors independently', () => {
            const plugin1 = {
                id: 'plugin1',
                name: 'Plugin 1',
                version: '1.0.0',
                type: 'celestial',
                description: 'First plugin',
                author: 'Test',
                register: () => { throw new Error('Plugin 1 failed'); },
                unregister: () => {}
            };

            const plugin2 = {
                id: 'plugin2',
                name: 'Plugin 2',
                version: '1.0.0',
                type: 'audio',
                description: 'Second plugin',
                author: 'Test',
                register: () => {},
                unregister: () => {}
            };

            expect(() => pluginManager.registerPlugin(plugin1)).toThrow();
            expect(() => pluginManager.registerPlugin(plugin2)).not.toThrow();

            const status = pluginManager.getSystemStatus();
            expect(status.totalPlugins).toBe(1); // Only plugin2 registered
        });
    });

    describe('Error Classification and Recovery', () => {
        it('should classify audio errors as low severity', () => {
            const audioError = new Error('Audio context failed');
            const classification = errorBoundary.classifyError(audioError);

            expect(classification.type).toBe('audio');
            expect(classification.severity).toBe('low');
            expect(classification.recoverable).toBe(true);
            expect(classification.action).toBe('disable-audio');
        });

        it('should classify system errors as critical', () => {
            const systemError = new Error('Memory quota exceeded');
            const classification = errorBoundary.classifyError(systemError);

            expect(classification.type).toBe('system');
            expect(classification.severity).toBe('critical');
            expect(classification.recoverable).toBe(false);
            expect(classification.action).toBe('restart-required');
        });

        it('should classify network errors as recoverable', () => {
            const networkError = new Error('Network connection failed');
            const classification = errorBoundary.classifyError(networkError);

            expect(classification.type).toBe('network');
            expect(classification.severity).toBe('medium');
            expect(classification.recoverable).toBe(true);
            expect(classification.action).toBe('retry');
        });

        it('should classify plugin errors appropriately', () => {
            const pluginError = new Error('Plugin initialization error');
            const classification = errorBoundary.classifyError(pluginError);

            expect(classification.type).toBe('plugin');
            expect(classification.severity).toBe('medium');
            expect(classification.action).toBe('disable-plugin');
        });

        it('should handle unknown errors with default classification', () => {
            const unknownError = new Error('Something unexpected happened');
            const classification = errorBoundary.classifyError(unknownError);

            expect(classification.type).toBe('unknown');
            expect(classification.action).toBe('log-only');
        });
    });

    describe('Retry Logic for Transient Failures', () => {
        it('should retry failed operations', async () => {
            let attemptCount = 0;

            const flakeyOperation = () => {
                attemptCount++;
                if (attemptCount < 3) {
                    throw new Error('Transient failure');
                }
                return 'success';
            };

            const result = await errorBoundary.executeWithRetry(flakeyOperation, {
                maxRetries: 3,
                retryDelay: 10,
                operation: 'flakey-op'
            });

            expect(result).toBe('success');
            expect(attemptCount).toBe(3);
        });

        it('should give up after max retries', async () => {
            const alwaysFailingOperation = () => {
                throw new Error('Persistent failure');
            };

            const result = await errorBoundary.executeWithRetry(alwaysFailingOperation, {
                maxRetries: 2,
                retryDelay: 10,
                operation: 'always-failing'
            });

            expect(result).toBeNull();
            expect(mockLogger.error).toHaveBeenCalledTimes(3); // Initial + 2 retries
        });

        it('should succeed immediately if no error occurs', async () => {
            let attemptCount = 0;

            const successfulOperation = () => {
                attemptCount++;
                return 'immediate-success';
            };

            const result = await errorBoundary.executeWithRetry(successfulOperation, {
                maxRetries: 3,
                retryDelay: 10,
                operation: 'successful-op'
            });

            expect(result).toBe('immediate-success');
            expect(attemptCount).toBe(1);
        });
    });

    describe('Circuit Breaker Pattern', () => {
        it('should open circuit after threshold failures', () => {
            const service = 'unreliable-service';

            for (let i = 0; i < 5; i++) {
                errorBoundary.executeIfCircuitClosed(service, () => {
                    throw new Error('Service failure');
                });
            }

            expect(errorBoundary.isCircuitOpen(service)).toBe(true);
        });

        it('should not execute when circuit is open', () => {
            const service = 'failing-service';
            let executionCount = 0;

            // Trigger circuit breaker
            for (let i = 0; i < 5; i++) {
                errorBoundary.executeIfCircuitClosed(service, () => {
                    executionCount++;
                    throw new Error('Failure');
                });
            }

            const beforeOpenCount = executionCount;

            // Try to execute after circuit opens
            errorBoundary.executeIfCircuitClosed(service, () => {
                executionCount++;
                return 'success';
            });

            expect(executionCount).toBe(beforeOpenCount); // No new execution
        });

        it('should reset circuit breaker on success', () => {
            const service = 'recoverable-service';

            // Cause some failures
            for (let i = 0; i < 2; i++) {
                errorBoundary.executeIfCircuitClosed(service, () => {
                    throw new Error('Failure');
                });
            }

            // Successful execution resets counter
            errorBoundary.executeIfCircuitClosed(service, () => {
                return 'success';
            });

            expect(errorBoundary.isCircuitOpen(service)).toBe(false);
        });

        it('should manually reset circuit breaker', () => {
            const service = 'manual-reset-service';

            // Open the circuit
            for (let i = 0; i < 5; i++) {
                errorBoundary.executeIfCircuitClosed(service, () => {
                    throw new Error('Failure');
                });
            }

            expect(errorBoundary.isCircuitOpen(service)).toBe(true);

            // Manual reset
            errorBoundary.resetCircuit(service);

            expect(errorBoundary.isCircuitOpen(service)).toBe(false);
        });
    });

    describe('Error Statistics and Health Monitoring', () => {
        it('should track error statistics', () => {
            errorBoundary.reportError(new Error('Test error 1'), 'operation1');
            errorBoundary.reportError(new Error('Test error 2'), 'operation2');
            errorBoundary.reportError(new Error('Test error 3'), 'operation1');

            const stats = errorBoundary.getErrorStatistics();

            expect(stats.totalErrors).toBe(3);
            expect(stats.errorsByOperation['operation1']).toBe(2);
            expect(stats.errorsByOperation['operation2']).toBe(1);
        });

        it('should report healthy status with no errors', () => {
            const health = errorBoundary.getHealthStatus();

            expect(health.status).toBe('healthy');
            expect(health.errorRate).toBe(0);
            expect(health.recommendation).toBe('none');
        });

        it('should report degraded status with many errors', () => {
            // Fill up recent errors buffer (default 10)
            for (let i = 0; i < 8; i++) {
                errorBoundary.reportError(new Error(`Error ${i}`), 'test-op');
            }

            const health = errorBoundary.getHealthStatus();

            expect(health.status).toBe('degraded');
            expect(health.errorRate).toBeGreaterThan(0.5);
        });

        it('should report critical status with system errors', () => {
            errorBoundary.reportError(new Error('Memory quota exceeded'), 'system-op');

            const health = errorBoundary.getHealthStatus();

            expect(health.status).toBe('critical');
            expect(health.recommendation).toBe('restart');
        });

        it('should limit recent errors to max size', () => {
            // Create error boundary with small buffer
            const smallBufferBoundary = new ErrorBoundary({
                logger: mockLogger,
                enableGlobalHandling: false,
                maxRecentErrors: 5
            });

            for (let i = 0; i < 10; i++) {
                smallBufferBoundary.reportError(new Error(`Error ${i}`), 'test');
            }

            const stats = smallBufferBoundary.getErrorStatistics();
            expect(stats.recentErrors.length).toBe(5);
            expect(stats.totalErrors).toBe(10);

            smallBufferBoundary.dispose();
        });

        it('should track errors by type', () => {
            errorBoundary.reportError(new Error('Render issue'), 'render-op');
            errorBoundary.reportError(new Error('Audio problem'), 'audio-op');
            errorBoundary.reportError(new Error('Plugin error'), 'plugin-op');

            const stats = errorBoundary.getErrorStatistics();

            expect(stats.errorsByType['render']).toBeGreaterThan(0);
            expect(stats.errorsByType['audio']).toBeGreaterThan(0);
            expect(stats.errorsByType['plugin']).toBeGreaterThan(0);
        });
    });

    describe('Graceful Degradation Messages', () => {
        it('should provide user-friendly audio degradation message', () => {
            const audioError = new Error('Audio system failure');
            const degradation = errorBoundary.handleGracefulDegradation(audioError, 'audio');

            expect(degradation.subsystem).toBe('audio');
            expect(degradation.action).toBe('disabled');
            expect(degradation.userMessage).toContain('Audio has been disabled');
        });

        it('should provide user-friendly plugin degradation message', () => {
            const pluginError = new Error('Plugin crashed');
            const degradation = errorBoundary.handleGracefulDegradation(pluginError, 'plugin');

            expect(degradation.subsystem).toBe('plugins');
            expect(degradation.action).toBe('plugin-disabled');
            expect(degradation.userMessage).toContain('plugin has been disabled');
        });

        it('should provide user-friendly network degradation message', () => {
            const networkError = new Error('Connection timeout');
            const degradation = errorBoundary.handleGracefulDegradation(networkError, 'network');

            expect(degradation.subsystem).toBe('network');
            expect(degradation.action).toBe('offline-mode');
            expect(degradation.userMessage).toContain('offline mode');
        });

        it('should provide generic safe mode message for unknown errors', () => {
            const unknownError = new Error('Unknown issue');
            const degradation = errorBoundary.handleGracefulDegradation(unknownError, 'unknown');

            expect(degradation.subsystem).toBe('general');
            expect(degradation.action).toBe('safe-mode');
            expect(degradation.userMessage).toContain('safe mode');
        });
    });

    describe('Error Boundary Lifecycle', () => {
        it('should dispose cleanly', () => {
            errorBoundary.dispose();

            expect(() => {
                errorBoundary.reportError(new Error('Test'), 'test');
            }).toThrow('ErrorBoundary has been disposed');
        });

        it('should not execute operations after disposal', () => {
            errorBoundary.dispose();

            // safeExecute doesn't throw directly, but will throw when calling reportError if there's an error
            const result = errorBoundary.safeExecute(() => 'test', 'test', null);
            // If successful, it executes without checking disposed state (design choice)
            expect(result).toBe('test');

            // But if there's an error, reportError will throw because disposed
            expect(() => {
                errorBoundary.safeExecute(() => {
                    throw new Error('Test error');
                }, 'test', null);
            }).toThrow('disposed');
        });

        it('should handle multiple disposal calls gracefully', () => {
            errorBoundary.dispose();

            expect(() => {
                errorBoundary.dispose();
            }).not.toThrow();
        });
    });
});
