// ErrorBoundary basic test coverage
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorBoundary } from '../../dist/services/ErrorBoundary.js';

describe('ErrorBoundary', () => {
    let errorBoundary;
    let mockLogger;

    beforeEach(() => {
        mockLogger = {
            error: vi.fn(),
            warn: vi.fn(),
            info: vi.fn()
        };

        errorBoundary = new ErrorBoundary({
            logger: mockLogger
        });
    });

    describe('Initialization', () => {
        it('should initialize ErrorBoundary', () => {
            expect(errorBoundary).toBeDefined();
            expect(errorBoundary.logger).toBe(mockLogger);
        });
    });

    describe('Safe Execution', () => {
        it('should execute function successfully', () => {
            const mockFn = vi.fn(() => 'success');
            const result = errorBoundary.safeExecute(mockFn, 'test-operation');
            
            expect(result).toBe('success');
            expect(mockFn).toHaveBeenCalledOnce();
        });

        it('should catch errors and return fallback', () => {
            const mockFn = vi.fn(() => {
                throw new Error('Test error');
            });
            const result = errorBoundary.safeExecute(mockFn, 'test-operation', 'fallback');
            
            expect(result).toBe('fallback');
        });
    });

    describe('Error Statistics', () => {
        it('should provide error statistics', () => {
            const stats = errorBoundary.getErrorStatistics();
            expect(stats).toBeDefined();
            expect(typeof stats.totalErrors).toBe('number');
        });
    });

    describe('Health Status', () => {
        it('should provide health status', () => {
            const health = errorBoundary.getHealthStatus();
            expect(health).toBeDefined();
            expect(health.status).toBeDefined();
        });
    });

    describe('Error Classification', () => {
        it('should classify errors', () => {
            const error = new Error('Test error');
            const classification = errorBoundary.classifyError(error);
            
            expect(classification).toBeDefined();
            expect(classification.type).toBeDefined();
            expect(classification.severity).toBeDefined();
        });
    });

    describe('Circuit Breaker', () => {
        it('should check circuit breaker status', () => {
            const isOpen = errorBoundary.isCircuitOpen('test-service');
            expect(typeof isOpen).toBe('boolean');
        });
    });
});