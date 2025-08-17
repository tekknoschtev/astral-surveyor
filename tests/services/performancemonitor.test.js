// Performance Monitor Tests - Test-driven development for performance optimization
// Following Phase 5 future-proofing patterns

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceMonitor } from '../../dist/services/PerformanceMonitor.js';

describe('PerformanceMonitor', () => {
    let performanceMonitor;
    let mockLogger;

    beforeEach(() => {
        // Mock performance API
        global.performance = {
            now: vi.fn(() => Date.now()),
            mark: vi.fn(),
            measure: vi.fn(),
            getEntriesByType: vi.fn(() => []),
            clearMarks: vi.fn(),
            clearMeasures: vi.fn()
        };

        mockLogger = {
            error: vi.fn(),
            warn: vi.fn(),
            info: vi.fn(),
            debug: vi.fn()
        };

        performanceMonitor = new PerformanceMonitor({
            logger: mockLogger,
            sampleRate: 100, // High sample rate for testing
            alertThresholds: {
                frameTime: 33, // 30 FPS
                renderTime: 16,
                memoryUsage: 100 * 1024 * 1024 // 100MB
            }
        });
    });

    afterEach(() => {
        if (performanceMonitor && typeof performanceMonitor.dispose === 'function') {
            performanceMonitor.dispose();
        }
        vi.restoreAllMocks();
        delete global.performance;
    });

    describe('Initialization', () => {
        it('should initialize with proper configuration', () => {
            expect(performanceMonitor).toBeDefined();
            expect(performanceMonitor.isMonitoring).toBe(false);
        });

        it('should start monitoring when requested', () => {
            performanceMonitor.startMonitoring();
            expect(performanceMonitor.isMonitoring).toBe(true);
        });

        it('should stop monitoring when requested', () => {
            performanceMonitor.startMonitoring();
            performanceMonitor.stopMonitoring();
            expect(performanceMonitor.isMonitoring).toBe(false);
        });
    });

    describe('Performance Measurement', () => {
        beforeEach(() => {
            performanceMonitor.startMonitoring();
        });

        it('should measure operation duration', () => {
            const operation = 'test-operation';
            
            // Mock performance.now to return different values for start and end
            global.performance.now = vi.fn()
                .mockReturnValueOnce(100) // start time
                .mockReturnValueOnce(150); // end time (50ms duration)
            
            performanceMonitor.startMeasurement(operation);
            performanceMonitor.endMeasurement(operation);

            const metrics = performanceMonitor.getMetrics();
            expect(metrics.operations[operation]).toBeDefined();
            expect(metrics.operations[operation].count).toBe(1);
            expect(metrics.operations[operation].totalTime).toBeGreaterThan(0);
        });

        it('should calculate average operation times', () => {
            const operation = 'render-frame';
            
            // Simulate multiple measurements with mock timing
            for (let i = 0; i < 5; i++) {
                global.performance.now = vi.fn()
                    .mockReturnValueOnce(i * 100) // start time
                    .mockReturnValueOnce(i * 100 + 10); // end time (10ms duration)
                
                performanceMonitor.startMeasurement(operation);
                performanceMonitor.endMeasurement(operation);
            }

            const metrics = performanceMonitor.getMetrics();
            expect(metrics.operations[operation].count).toBe(5);
            expect(metrics.operations[operation].averageTime).toBeGreaterThan(0);
        });

        it('should track frame rate', () => {
            // Simulate frame renders
            for (let i = 0; i < 10; i++) {
                performanceMonitor.recordFrame();
            }

            const metrics = performanceMonitor.getMetrics();
            expect(metrics.frameRate.current).toBeGreaterThan(0);
            expect(metrics.frameRate.average).toBeGreaterThan(0);
        });

        it('should measure memory usage', async () => {
            // Mock memory API
            global.performance.memory = {
                usedJSHeapSize: 50 * 1024 * 1024, // 50MB
                totalJSHeapSize: 100 * 1024 * 1024, // 100MB
                jsHeapSizeLimit: 1024 * 1024 * 1024 // 1GB
            };

            performanceMonitor.measureMemory();

            const metrics = performanceMonitor.getMetrics();
            expect(metrics.memory.used).toBe(50 * 1024 * 1024);
            expect(metrics.memory.total).toBe(100 * 1024 * 1024);
        });

        it('should handle missing memory API gracefully', () => {
            delete global.performance.memory;

            performanceMonitor.measureMemory();

            const metrics = performanceMonitor.getMetrics();
            expect(metrics.memory.used).toBe(0);
            expect(metrics.memory.total).toBe(0);
        });
    });

    describe('Performance Alerts', () => {
        beforeEach(() => {
            performanceMonitor.startMonitoring();
        });

        it('should alert on slow frame times', () => {
            // Mock slow frame
            global.performance.now = vi.fn()
                .mockReturnValueOnce(0)
                .mockReturnValueOnce(50); // 50ms frame time (> 33ms threshold)

            performanceMonitor.startMeasurement('frame');
            performanceMonitor.endMeasurement('frame');

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Performance alert: frame took 50ms (threshold: 33ms)'
            );
        });

        it('should alert on high memory usage', () => {
            global.performance.memory = {
                usedJSHeapSize: 150 * 1024 * 1024, // 150MB (> 100MB threshold)
                totalJSHeapSize: 200 * 1024 * 1024,
                jsHeapSizeLimit: 1024 * 1024 * 1024
            };

            performanceMonitor.measureMemory();

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'High memory usage detected: 150MB (threshold: 100MB)'
            );
        });

        it('should alert on low frame rate', () => {
            // Simulate very slow frames to trigger low FPS alert
            const slowTime = 100; // 100ms per frame = 10 FPS
            global.performance.now = vi.fn();
            
            for (let i = 0; i < 10; i++) {
                global.performance.now.mockReturnValueOnce(i * slowTime);
                performanceMonitor.recordFrame();
            }

            // Should trigger low FPS warning
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Low frame rate detected')
            );
        });
    });

    describe('Performance Optimization', () => {
        beforeEach(() => {
            performanceMonitor.startMonitoring();
        });

        it('should suggest optimizations for slow operations', () => {
            // Simulate consistently slow operation
            const operation = 'slow-render';
            
            for (let i = 0; i < 10; i++) {
                global.performance.now = vi.fn()
                    .mockReturnValueOnce(0)
                    .mockReturnValueOnce(25); // 25ms each time
                
                performanceMonitor.startMeasurement(operation);
                performanceMonitor.endMeasurement(operation);
            }

            const suggestions = performanceMonitor.getOptimizationSuggestions();
            
            expect(suggestions).toContainEqual({
                operation: 'slow-render',
                issue: 'Consistently slow operation',
                averageTime: 25,
                suggestion: 'Consider optimizing rendering pipeline or reducing object complexity'
            });
        });

        it('should detect performance regression', () => {
            const operation = 'render-stars';
            
            // Establish baseline
            for (let i = 0; i < 5; i++) {
                performanceMonitor.recordOperationTime(operation, 5); // 5ms baseline
            }

            // Record baseline
            performanceMonitor.recordBaseline();

            // Clear existing metrics to start fresh for regression test
            performanceMonitor.recordOperationTime(operation, 15); // Add one 15ms operation

            // After 5 operations of 5ms (total 25ms, avg 5ms) + 1 operation of 15ms
            // New average: (25 + 15) / 6 = 6.67ms
            // Regression factor: 6.67 / 5 = 1.33 (not enough for regression)
            // Let's add more 15ms operations to trigger regression
            for (let i = 0; i < 10; i++) {
                performanceMonitor.recordOperationTime(operation, 15);
            }

            const regressions = performanceMonitor.detectRegressions();
            
            expect(regressions).toContainEqual({
                operation: 'render-stars',
                baselineTime: 5,
                currentTime: expect.any(Number),
                regressionFactor: expect.any(Number),
                severity: expect.any(String)
            });
        });

        it('should provide performance budget tracking', () => {
            const budget = {
                'render-frame': 16, // 16ms budget for 60 FPS
                'update-physics': 5,
                'audio-processing': 2
            };

            performanceMonitor.setPerformanceBudget(budget);

            // Simulate operations within budget
            performanceMonitor.recordOperationTime('render-frame', 12);
            performanceMonitor.recordOperationTime('update-physics', 3);
            
            // Simulate operation over budget
            performanceMonitor.recordOperationTime('audio-processing', 5);

            const budgetStatus = performanceMonitor.getBudgetStatus();
            
            expect(budgetStatus['render-frame']).toEqual({
                budget: 16,
                actual: 12,
                overBudget: false,
                utilizationPercent: 75
            });

            expect(budgetStatus['audio-processing']).toEqual({
                budget: 2,
                actual: 5,
                overBudget: true,
                utilizationPercent: 250
            });
        });
    });

    describe('Performance Profiling', () => {
        it('should create performance profiles', () => {
            performanceMonitor.startMonitoring();

            // Simulate various operations
            performanceMonitor.recordOperationTime('render-stars', 5);
            performanceMonitor.recordOperationTime('render-planets', 3);
            performanceMonitor.recordOperationTime('update-camera', 1);
            performanceMonitor.recordOperationTime('process-input', 0.5);

            const profile = performanceMonitor.createProfile('test-scenario');

            expect(profile).toEqual({
                name: 'test-scenario',
                timestamp: expect.any(Date),
                operations: {
                    'render-stars': { averageTime: 5, count: 1 },
                    'render-planets': { averageTime: 3, count: 1 },
                    'update-camera': { averageTime: 1, count: 1 },
                    'process-input': { averageTime: 0.5, count: 1 }
                },
                totalTime: 9.5,
                frameRate: expect.any(Number)
            });
        });

        it('should compare performance profiles', () => {
            performanceMonitor.startMonitoring();

            // Create baseline profile with clean state
            performanceMonitor.recordOperationTime('render', 10);
            const baseline = performanceMonitor.createProfile('baseline');
            
            // Reset and create new profile for comparison
            performanceMonitor.recordOperationTime('render', 15);
            const current = performanceMonitor.createProfile('current');

            const comparison = performanceMonitor.compareProfiles(baseline, current);

            expect(comparison.baselineProfile).toBe('baseline');
            expect(comparison.currentProfile).toBe('current');
            expect(comparison.operationChanges.render).toBeDefined();
            expect(comparison.overallChange).toBeDefined();
        });
    });

    describe('Performance Reporting', () => {
        it('should generate performance reports', () => {
            performanceMonitor.startMonitoring();

            // Simulate performance data
            for (let i = 0; i < 100; i++) {
                performanceMonitor.recordFrame();
                performanceMonitor.recordOperationTime('render', Math.random() * 20);
            }

            const report = performanceMonitor.generateReport();

            expect(report).toEqual({
                generatedAt: expect.any(Date),
                monitoringDuration: expect.any(Number),
                frameRate: {
                    current: expect.any(Number),
                    average: expect.any(Number),
                    min: expect.any(Number),
                    max: expect.any(Number)
                },
                operations: expect.any(Object),
                memory: expect.any(Object),
                alerts: expect.any(Array),
                suggestions: expect.any(Array)
            });
        });

        it('should export performance data', () => {
            performanceMonitor.startMonitoring();

            // Add some data
            performanceMonitor.recordFrame();
            performanceMonitor.recordOperationTime('test', 5);

            const exportData = performanceMonitor.exportData();

            expect(exportData).toEqual({
                version: '1.0',
                exportedAt: expect.any(String),
                metrics: expect.any(Object),
                profiles: expect.any(Array),
                baselines: expect.any(Object)
            });
        });
    });

    describe('Performance Monitor Disposal', () => {
        it('should clean up resources on disposal', () => {
            performanceMonitor.startMonitoring();
            performanceMonitor.dispose();

            expect(performanceMonitor.isMonitoring).toBe(false);
            expect(() => performanceMonitor.getMetrics()).toThrow('PerformanceMonitor has been disposed');
        });

        it('should clear performance marks and measures', () => {
            performanceMonitor.startMonitoring();
            performanceMonitor.startMeasurement('test');
            performanceMonitor.dispose();

            expect(global.performance.clearMarks).toHaveBeenCalled();
            expect(global.performance.clearMeasures).toHaveBeenCalled();
        });
    });
});