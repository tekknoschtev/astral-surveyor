// LoggerService focused test suite - tests actual API
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LoggerService, LogLevel } from '../../dist/services/LoggerService.js';

describe('LoggerService', () => {
    let loggerService;
    let mockConsole;

    beforeEach(() => {
        // Mock console methods - include all methods LoggerService might use
        mockConsole = {
            log: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn()
        };
        global.console = mockConsole;

        // Mock localStorage
        global.localStorage = {
            getItem: vi.fn(() => null),
            setItem: vi.fn(),
            removeItem: vi.fn()
        };

        loggerService = new LoggerService();
    });

    describe('Basic Logging Functionality', () => {
        it('should provide debug logging method', () => {
            expect(typeof loggerService.debug).toBe('function');
            loggerService.debug('TestService', 'testOp', 'Debug message');
            // Just verify it doesn't throw
        });

        it('should provide info logging method', () => {
            expect(typeof loggerService.info).toBe('function');
            loggerService.info('TestService', 'testOp', 'Info message');
            // Just verify it doesn't throw
        });

        it('should provide warn logging method', () => {
            expect(typeof loggerService.warn).toBe('function');
            loggerService.warn('TestService', 'testOp', 'Warning message');
            // Just verify it doesn't throw
        });

        it('should provide error logging method', () => {
            expect(typeof loggerService.error).toBe('function');
            const testError = new Error('Test error');
            loggerService.error('TestService', 'testOp', 'Error message', testError);
            // Just verify it doesn't throw
        });

        it('should provide critical logging method', () => {
            expect(typeof loggerService.critical).toBe('function');
            const testError = new Error('Critical error');
            loggerService.critical('TestService', 'testOp', 'Critical message', testError);
            // Just verify it doesn't throw
        });
    });

    describe('Configuration', () => {
        it('should accept configuration options', () => {
            const config = {
                minLevel: LogLevel.WARN,
                maxEntries: 500,
                enableConsole: false
            };
            
            expect(() => {
                new LoggerService(config);
            }).not.toThrow();
        });

        it('should use LogLevel enum values', () => {
            expect(LogLevel.DEBUG).toBe(0);
            expect(LogLevel.INFO).toBe(1);
            expect(LogLevel.WARN).toBe(2);
            expect(LogLevel.ERROR).toBe(3);
            expect(LogLevel.CRITICAL).toBe(4);
        });
    });

    describe('Service Lifecycle', () => {
        it('should provide dispose method', () => {
            expect(typeof loggerService.dispose).toBe('function');
            
            expect(() => {
                loggerService.dispose();
            }).not.toThrow();
        });

        it('should prevent logging after disposal', () => {
            loggerService.dispose();
            
            expect(() => {
                loggerService.info('TestService', 'testOp', 'Should not log');
            }).toThrow();
        });
    });

    describe('Data Handling', () => {
        it('should handle structured data in logs', () => {
            const testData = { userId: 123, action: 'test-action' };
            
            expect(() => {
                loggerService.info('UserService', 'performAction', 'Action performed', testData);
            }).not.toThrow();
        });

        it('should handle null/undefined data gracefully', () => {
            expect(() => {
                loggerService.info('TestService', 'testOp', 'Message with null data', null);
                loggerService.info('TestService', 'testOp', 'Message with undefined data', undefined);
            }).not.toThrow();
        });

        it('should handle error objects', () => {
            const testError = new Error('Test error');
            testError.stack = 'Mock stack trace';
            
            expect(() => {
                loggerService.error('TestService', 'testOp', 'Error occurred', testError);
            }).not.toThrow();
        });
    });

    describe('Performance and Edge Cases', () => {
        it('should handle high-frequency logging', () => {
            const startTime = performance.now();
            
            for (let i = 0; i < 1000; i++) {
                loggerService.debug('PerfService', `op${i % 10}`, `High frequency log ${i}`);
            }
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            expect(duration).toBeLessThan(1000); // Should complete within 1 second
        });

        it('should handle very long messages', () => {
            const longMessage = 'x'.repeat(10000);
            
            expect(() => {
                loggerService.info('LongService', 'longOp', longMessage);
            }).not.toThrow();
        });

        it('should handle circular references in data', () => {
            const circularObj = { name: 'test' };
            circularObj.self = circularObj;
            
            expect(() => {
                loggerService.debug('CircularService', 'circularOp', 'Circular test', circularObj);
            }).not.toThrow();
        });
    });
});