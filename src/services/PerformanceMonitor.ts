// Performance Monitor Implementation
// Comprehensive performance monitoring and optimization for Astral Surveyor

export interface Logger {
    error(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    debug(message: string, ...args: unknown[]): void;
}

export interface PerformanceThresholds {
    frameTime: number;      // Maximum frame time in ms
    renderTime: number;     // Maximum render time in ms
    memoryUsage: number;    // Maximum memory usage in bytes
}

export interface OperationMetrics {
    count: number;
    totalTime: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
}

export interface FrameRateMetrics {
    current: number;
    average: number;
    min: number;
    max: number;
}

export interface MemoryMetrics {
    used: number;
    total: number;
    limit: number;
}

export interface PerformanceMetrics {
    operations: Record<string, OperationMetrics>;
    frameRate: FrameRateMetrics;
    memory: MemoryMetrics;
    timestamp: Date;
}

export interface OptimizationSuggestion {
    operation: string;
    issue: string;
    averageTime: number;
    suggestion: string;
}

export interface PerformanceRegression {
    operation: string;
    baselineTime: number;
    currentTime: number;
    regressionFactor: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface BudgetStatus {
    budget: number;
    actual: number;
    overBudget: boolean;
    utilizationPercent: number;
}

export interface PerformanceProfile {
    name: string;
    timestamp: Date;
    operations: Record<string, { averageTime: number; count: number }>;
    totalTime: number;
    frameRate: number;
}

export interface ProfileComparison {
    baselineProfile: string;
    currentProfile: string;
    operationChanges: Record<string, {
        baselineTime: number;
        currentTime: number;
        change: number;
        changePercent: number;
    }>;
    overallChange: {
        totalTimeChange: number;
        changePercent: number;
    };
}

export interface PerformanceReport {
    generatedAt: Date;
    monitoringDuration: number;
    frameRate: FrameRateMetrics;
    operations: Record<string, OperationMetrics>;
    memory: MemoryMetrics;
    alerts: string[];
    suggestions: OptimizationSuggestion[];
}

export interface PerformanceExportData {
    version: string;
    exportedAt: string;
    metrics: PerformanceMetrics;
    profiles: PerformanceProfile[];
    baselines: Record<string, OperationMetrics>;
}

interface PerformanceMonitorConfig {
    logger: Logger;
    sampleRate?: number;
    alertThresholds: PerformanceThresholds;
}

interface ActiveMeasurement {
    startTime: number;
    markName: string;
}

export class PerformanceMonitor {
    public readonly logger: Logger;
    public isMonitoring: boolean = false;

    private disposed: boolean = false;
    private sampleRate: number;
    private alertThresholds: PerformanceThresholds;
    
    private operations: Map<string, OperationMetrics> = new Map();
    private activeMeasurements: Map<string, ActiveMeasurement> = new Map();
    private frameTimestamps: number[] = [];
    private memoryMetrics: MemoryMetrics = { used: 0, total: 0, limit: 0 };
    private performanceBudget: Record<string, number> = {};
    private baselines: Map<string, OperationMetrics> = new Map();
    private profiles: PerformanceProfile[] = [];
    private alerts: string[] = [];
    private monitoringStartTime: number = 0;

    constructor(config: PerformanceMonitorConfig) {
        this.logger = config.logger;
        this.sampleRate = config.sampleRate ?? 60; // Default 60 samples per second
        this.alertThresholds = config.alertThresholds;
    }

    /**
     * Start performance monitoring
     */
    startMonitoring(): void {
        this.ensureNotDisposed();
        
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        this.monitoringStartTime = performance.now();
        this.logger.info('Performance monitoring started');
    }

    /**
     * Stop performance monitoring
     */
    stopMonitoring(): void {
        this.ensureNotDisposed();
        
        if (!this.isMonitoring) return;

        this.isMonitoring = false;
        this.logger.info('Performance monitoring stopped');
    }

    /**
     * Start measuring an operation
     */
    startMeasurement(operationName: string): void {
        this.ensureNotDisposed();
        
        if (!this.isMonitoring) return;

        const startTime = performance.now();
        const markName = `${operationName}-start-${Date.now()}`;
        
        if (typeof performance.mark === 'function') {
            performance.mark(markName);
        }

        this.activeMeasurements.set(operationName, {
            startTime,
            markName
        });
    }

    /**
     * End measuring an operation
     */
    endMeasurement(operationName: string): void {
        this.ensureNotDisposed();
        
        if (!this.isMonitoring) return;

        const measurement = this.activeMeasurements.get(operationName);
        if (!measurement) {
            this.logger.warn(`No active measurement found for operation: ${operationName}`);
            return;
        }

        const endTime = performance.now();
        const duration = endTime - measurement.startTime;

        this.recordOperationTime(operationName, duration);
        this.activeMeasurements.delete(operationName);

        // Check for performance alerts
        this.checkPerformanceAlert(operationName, duration);
    }

    /**
     * Record operation time directly
     */
    recordOperationTime(operationName: string, duration: number): void {
        this.ensureNotDisposed();

        const existing = this.operations.get(operationName) || {
            count: 0,
            totalTime: 0,
            averageTime: 0,
            minTime: Infinity,
            maxTime: 0
        };

        existing.count++;
        existing.totalTime += duration;
        existing.averageTime = existing.totalTime / existing.count;
        existing.minTime = Math.min(existing.minTime, duration);
        existing.maxTime = Math.max(existing.maxTime, duration);

        this.operations.set(operationName, existing);
    }

    /**
     * Record a frame for frame rate tracking
     */
    recordFrame(): void {
        this.ensureNotDisposed();
        
        if (!this.isMonitoring) return;

        const now = performance.now();
        this.frameTimestamps.push(now);

        // Keep only last 60 frames for rolling average
        if (this.frameTimestamps.length > 60) {
            this.frameTimestamps.shift();
        }

        // Check for low frame rate alert
        const frameRate = this.calculateCurrentFrameRate();
        if (frameRate < 20) { // Less than 20 FPS
            this.logger.warn(`Low frame rate detected: ${frameRate.toFixed(1)} FPS`);
        }
    }

    /**
     * Measure memory usage
     */
    measureMemory(): void {
        this.ensureNotDisposed();

        const perfMemory = (performance as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
        if (typeof perfMemory !== 'undefined') {
            this.memoryMetrics = {
                used: perfMemory.usedJSHeapSize,
                total: perfMemory.totalJSHeapSize,
                limit: perfMemory.jsHeapSizeLimit
            };

            // Check for high memory usage alert
            if (this.memoryMetrics.used > this.alertThresholds.memoryUsage) {
                const usedMB = Math.round(this.memoryMetrics.used / (1024 * 1024));
                const thresholdMB = Math.round(this.alertThresholds.memoryUsage / (1024 * 1024));
                this.logger.warn(`High memory usage detected: ${usedMB}MB (threshold: ${thresholdMB}MB)`);
            }
        } else {
            this.memoryMetrics = { used: 0, total: 0, limit: 0 };
        }
    }

    /**
     * Get current performance metrics
     */
    getMetrics(): PerformanceMetrics {
        this.ensureNotDisposed();

        return {
            operations: this.convertOperationsMapToObject(),
            frameRate: this.calculateFrameRateMetrics(),
            memory: { ...this.memoryMetrics },
            timestamp: new Date()
        };
    }

    /**
     * Set performance budget for operations
     */
    setPerformanceBudget(budget: Record<string, number>): void {
        this.ensureNotDisposed();
        this.performanceBudget = { ...budget };
    }

    /**
     * Get budget status for all operations
     */
    getBudgetStatus(): Record<string, BudgetStatus> {
        this.ensureNotDisposed();

        const status: Record<string, BudgetStatus> = {};

        for (const [operation, budget] of Object.entries(this.performanceBudget)) {
            const metrics = this.operations.get(operation);
            const actual = metrics ? metrics.averageTime : 0;

            status[operation] = {
                budget,
                actual,
                overBudget: actual > budget,
                utilizationPercent: Math.round((actual / budget) * 100)
            };
        }

        return status;
    }

    /**
     * Record baseline performance for regression detection
     */
    recordBaseline(): void {
        this.ensureNotDisposed();

        for (const [operation, metrics] of this.operations.entries()) {
            this.baselines.set(operation, { ...metrics });
        }

        this.logger.info('Performance baseline recorded');
    }

    /**
     * Detect performance regressions
     */
    detectRegressions(): PerformanceRegression[] {
        this.ensureNotDisposed();

        const regressions: PerformanceRegression[] = [];

        for (const [operation, baseline] of this.baselines.entries()) {
            const current = this.operations.get(operation);
            if (!current) continue;

            const regressionFactor = current.averageTime / baseline.averageTime;
            
            if (regressionFactor > 1.5) { // 50% slower is considered a regression
                let severity: PerformanceRegression['severity'] = 'low';
                
                if (regressionFactor > 3) severity = 'critical';
                else if (regressionFactor > 2) severity = 'high';
                else if (regressionFactor > 1.5) severity = 'medium';

                regressions.push({
                    operation,
                    baselineTime: baseline.averageTime,
                    currentTime: current.averageTime,
                    regressionFactor,
                    severity
                });
            }
        }

        return regressions;
    }

    /**
     * Get optimization suggestions
     */
    getOptimizationSuggestions(): OptimizationSuggestion[] {
        this.ensureNotDisposed();

        const suggestions: OptimizationSuggestion[] = [];

        for (const [operation, metrics] of this.operations.entries()) {
            if (metrics.averageTime > 20) { // Operations taking > 20ms
                suggestions.push({
                    operation,
                    issue: 'Consistently slow operation',
                    averageTime: metrics.averageTime,
                    suggestion: this.getSuggestionForOperation(operation)
                });
            }
        }

        return suggestions;
    }

    /**
     * Create a performance profile
     */
    createProfile(name: string): PerformanceProfile {
        this.ensureNotDisposed();

        const operations: Record<string, { averageTime: number; count: number }> = {};
        let totalTime = 0;

        for (const [op, metrics] of this.operations.entries()) {
            operations[op] = {
                averageTime: metrics.averageTime,
                count: metrics.count
            };
            totalTime += metrics.totalTime;
        }

        const profile: PerformanceProfile = {
            name,
            timestamp: new Date(),
            operations,
            totalTime,
            frameRate: this.calculateCurrentFrameRate()
        };

        this.profiles.push(profile);
        return profile;
    }

    /**
     * Compare two performance profiles
     */
    compareProfiles(baseline: PerformanceProfile, current: PerformanceProfile): ProfileComparison {
        this.ensureNotDisposed();

        const operationChanges: Record<string, { baselineTime: number; currentTime: number; change: number; changePercent: number }> = {};
        
        for (const [operation, currentMetrics] of Object.entries(current.operations)) {
            const baselineMetrics = baseline.operations[operation];
            if (baselineMetrics) {
                const change = currentMetrics.averageTime - baselineMetrics.averageTime;
                const changePercent = (change / baselineMetrics.averageTime) * 100;

                operationChanges[operation] = {
                    baselineTime: baselineMetrics.averageTime,
                    currentTime: currentMetrics.averageTime,
                    change,
                    changePercent: Math.round(changePercent)
                };
            }
        }

        const totalTimeChange = current.totalTime - baseline.totalTime;
        const changePercent = (totalTimeChange / baseline.totalTime) * 100;

        return {
            baselineProfile: baseline.name,
            currentProfile: current.name,
            operationChanges,
            overallChange: {
                totalTimeChange,
                changePercent: Math.round(changePercent)
            }
        };
    }

    /**
     * Generate comprehensive performance report
     */
    generateReport(): PerformanceReport {
        this.ensureNotDisposed();

        return {
            generatedAt: new Date(),
            monitoringDuration: performance.now() - this.monitoringStartTime,
            frameRate: this.calculateFrameRateMetrics(),
            operations: this.convertOperationsMapToObject(),
            memory: { ...this.memoryMetrics },
            alerts: [...this.alerts],
            suggestions: this.getOptimizationSuggestions()
        };
    }

    /**
     * Export performance data
     */
    exportData(): PerformanceExportData {
        this.ensureNotDisposed();

        return {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            metrics: this.getMetrics(),
            profiles: [...this.profiles],
            baselines: this.convertOperationsMapToObject(this.baselines)
        };
    }

    /**
     * Dispose performance monitor
     */
    dispose(): void {
        if (this.disposed) return;

        this.stopMonitoring();
        
        // Clear performance marks and measures
        if (typeof performance.clearMarks === 'function') {
            performance.clearMarks();
        }
        if (typeof performance.clearMeasures === 'function') {
            performance.clearMeasures();
        }

        this.operations.clear();
        this.activeMeasurements.clear();
        this.frameTimestamps.length = 0;
        this.baselines.clear();
        this.profiles.length = 0;
        this.alerts.length = 0;

        this.disposed = true;
    }

    /**
     * Check for performance alerts
     */
    private checkPerformanceAlert(operation: string, duration: number): void {
        const thresholdKey = operation.includes('frame') ? 'frameTime' : 
                           operation.includes('render') ? 'renderTime' : null;

        if (thresholdKey && this.alertThresholds[thresholdKey]) {
            const threshold = this.alertThresholds[thresholdKey];
            if (duration > threshold) {
                const alert = `Performance alert: ${operation} took ${duration}ms (threshold: ${threshold}ms)`;
                this.logger.warn(alert);
                this.alerts.push(alert);
            }
        }
    }

    /**
     * Calculate current frame rate
     */
    private calculateCurrentFrameRate(): number {
        if (this.frameTimestamps.length < 2) return 0;

        const timeSpan = this.frameTimestamps[this.frameTimestamps.length - 1] - this.frameTimestamps[0];
        const frameCount = this.frameTimestamps.length - 1;
        
        return frameCount / (timeSpan / 1000); // FPS
    }

    /**
     * Calculate frame rate metrics
     */
    private calculateFrameRateMetrics(): FrameRateMetrics {
        const current = this.calculateCurrentFrameRate();
        
        // For simplicity, using current as all values
        // In a real implementation, you'd track min/max over time
        return {
            current,
            average: current,
            min: current,
            max: current
        };
    }

    /**
     * Convert operations map to plain object
     */
    private convertOperationsMapToObject(map?: Map<string, OperationMetrics>): Record<string, OperationMetrics> {
        const source = map || this.operations;
        const result: Record<string, OperationMetrics> = {};
        
        for (const [key, value] of source.entries()) {
            result[key] = { ...value };
        }
        
        return result;
    }

    /**
     * Get optimization suggestion for specific operation
     */
    private getSuggestionForOperation(operation: string): string {
        if (operation.includes('render')) {
            return 'Consider optimizing rendering pipeline or reducing object complexity';
        }
        if (operation.includes('audio')) {
            return 'Consider reducing audio quality or implementing audio streaming';
        }
        if (operation.includes('physics') || operation.includes('update')) {
            return 'Consider reducing update frequency or optimizing calculations';
        }
        return 'Consider profiling this operation to identify bottlenecks';
    }

    /**
     * Ensure monitor is not disposed
     */
    private ensureNotDisposed(): void {
        if (this.disposed) {
            throw new Error('PerformanceMonitor has been disposed');
        }
    }
}