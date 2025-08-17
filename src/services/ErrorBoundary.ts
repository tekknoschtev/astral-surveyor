// Error Boundary Implementation
// Comprehensive error handling and recovery system for Astral Surveyor

export interface Logger {
    error(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
}

export interface ErrorClassification {
    type: 'render' | 'audio' | 'plugin' | 'system' | 'network' | 'unknown';
    severity: 'low' | 'medium' | 'high' | 'critical';
    recoverable: boolean;
    action: 'skip-render' | 'disable-audio' | 'disable-plugin' | 'restart-required' | 'log-only' | 'retry';
}

export interface RetryOptions {
    maxRetries: number;
    retryDelay: number;
    operation: string;
}

export interface ErrorStatistics {
    totalErrors: number;
    errorsByOperation: Record<string, number>;
    errorsByType: Record<string, number>;
    recentErrors: ErrorRecord[];
}

export interface ErrorRecord {
    timestamp: Date;
    error: Error;
    operation: string;
    classification: ErrorClassification;
}

export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'critical';
    errorRate: number;
    criticalErrors: number;
    recommendation: 'none' | 'restart' | 'check-logs' | 'contact-support';
}

export interface GracefulDegradation {
    subsystem: string;
    action: string;
    impact: string;
    userMessage: string;
}

interface CircuitBreakerState {
    failures: number;
    lastFailure: Date;
    isOpen: boolean;
}

interface ErrorBoundaryConfig {
    logger: Logger;
    enableGlobalHandling?: boolean;
    maxRecentErrors?: number;
    circuitBreakerThreshold?: number;
    circuitBreakerTimeout?: number;
}

export class ErrorBoundary {
    public readonly logger: Logger;
    
    private disposed: boolean = false;
    private enableGlobalHandling: boolean;
    private maxRecentErrors: number;
    private circuitBreakerThreshold: number;
    private circuitBreakerTimeout: number;
    
    private errorStatistics: ErrorStatistics;
    private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
    private globalErrorHandler?: (event: ErrorEvent) => void;
    private globalRejectionHandler?: (event: PromiseRejectionEvent) => void;

    constructor(config: ErrorBoundaryConfig) {
        this.logger = config.logger;
        this.enableGlobalHandling = config.enableGlobalHandling ?? true;
        this.maxRecentErrors = config.maxRecentErrors ?? 10;
        this.circuitBreakerThreshold = config.circuitBreakerThreshold ?? 5;
        this.circuitBreakerTimeout = config.circuitBreakerTimeout ?? 60000; // 1 minute

        this.errorStatistics = {
            totalErrors: 0,
            errorsByOperation: {},
            errorsByType: {},
            recentErrors: []
        };

        this.setupGlobalErrorHandling();
    }

    /**
     * Execute a function safely with error handling
     */
    safeExecute<T>(fn: () => T, operation: string, fallback: T | null = null): T | null {
        try {
            return fn();
        } catch (error) {
            this.reportError(error as Error, operation);
            return fallback;
        }
    }

    /**
     * Execute an async function safely with error handling
     */
    async safeExecuteAsync<T>(fn: () => Promise<T>, operation: string, fallback: T | null = null): Promise<T | null> {
        try {
            return await fn();
        } catch (error) {
            this.reportError(error as Error, operation);
            return fallback;
        }
    }

    /**
     * Execute function with retry logic
     */
    async executeWithRetry<T>(fn: () => T | Promise<T>, options: RetryOptions): Promise<T | null> {
        let lastError: Error | null = null;
        
        for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
            try {
                const result = await fn();
                return result;
            } catch (error) {
                lastError = error as Error;
                this.reportError(lastError, `${options.operation}-attempt-${attempt + 1}`);
                
                if (attempt < options.maxRetries) {
                    await this.delay(options.retryDelay);
                }
            }
        }
        
        return null;
    }

    /**
     * Execute function only if circuit breaker is closed
     */
    executeIfCircuitClosed<T>(service: string, fn: () => T): T | null {
        if (this.isCircuitOpen(service)) {
            this.logger.warn(`Circuit breaker is open for service: ${service}`);
            return null;
        }

        try {
            const result = fn();
            this.recordSuccess(service);
            return result;
        } catch (error) {
            this.recordFailure(service);
            this.reportError(error as Error, service);
            return null;
        }
    }

    /**
     * Classify error type and determine appropriate response
     */
    classifyError(error: Error): ErrorClassification {
        const errorName = error.name.toLowerCase();
        const errorMessage = error.message.toLowerCase();

        // Render errors
        if (errorName.includes('render') || errorMessage.includes('render') || errorMessage.includes('webgl')) {
            return {
                type: 'render',
                severity: 'medium',
                recoverable: true,
                action: 'skip-render'
            };
        }

        // Audio errors
        if (errorName.includes('audio') || errorMessage.includes('audio') || errorMessage.includes('sound')) {
            return {
                type: 'audio',
                severity: 'low',
                recoverable: true,
                action: 'disable-audio'
            };
        }

        // Plugin errors
        if (errorName.includes('plugin') || errorMessage.includes('plugin')) {
            return {
                type: 'plugin',
                severity: 'medium',
                recoverable: true,
                action: 'disable-plugin'
            };
        }

        // System errors
        if (errorName.includes('system') || errorMessage.includes('memory') || errorMessage.includes('quota')) {
            return {
                type: 'system',
                severity: 'critical',
                recoverable: false,
                action: 'restart-required'
            };
        }

        // Network errors
        if (errorName.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('connection')) {
            return {
                type: 'network',
                severity: 'medium',
                recoverable: true,
                action: 'retry'
            };
        }

        // Default classification
        return {
            type: 'unknown',
            severity: 'medium',
            recoverable: true,
            action: 'log-only'
        };
    }

    /**
     * Report an error and update statistics
     */
    reportError(error: Error, operation: string): void {
        this.ensureNotDisposed();

        const classification = this.classifyError(error);
        
        this.logger.error(`Error in ${operation}:`, error);

        // Update statistics
        this.errorStatistics.totalErrors++;
        this.errorStatistics.errorsByOperation[operation] = 
            (this.errorStatistics.errorsByOperation[operation] || 0) + 1;
        this.errorStatistics.errorsByType[classification.type] = 
            (this.errorStatistics.errorsByType[classification.type] || 0) + 1;

        // Add to recent errors (with limit)
        const errorRecord: ErrorRecord = {
            timestamp: new Date(),
            error,
            operation,
            classification
        };

        this.errorStatistics.recentErrors.push(errorRecord);
        if (this.errorStatistics.recentErrors.length > this.maxRecentErrors) {
            this.errorStatistics.recentErrors.shift();
        }
    }

    /**
     * Get error statistics
     */
    getErrorStatistics(): ErrorStatistics {
        this.ensureNotDisposed();
        
        // Return deep copy to prevent external modification
        return {
            totalErrors: this.errorStatistics.totalErrors,
            errorsByOperation: { ...this.errorStatistics.errorsByOperation },
            errorsByType: { ...this.errorStatistics.errorsByType },
            recentErrors: [...this.errorStatistics.recentErrors]
        };
    }

    /**
     * Get system health status
     */
    getHealthStatus(): HealthStatus {
        this.ensureNotDisposed();

        const totalErrors = this.errorStatistics.totalErrors;
        const criticalErrors = this.errorStatistics.errorsByType['system'] || 0;
        
        if (totalErrors === 0) {
            return {
                status: 'healthy',
                errorRate: 0,
                criticalErrors: 0,
                recommendation: 'none'
            };
        }

        const recentErrors = this.errorStatistics.recentErrors.length;
        const errorRate = recentErrors / this.maxRecentErrors;

        if (criticalErrors > 0) {
            return {
                status: 'critical',
                errorRate,
                criticalErrors,
                recommendation: 'restart'
            };
        }

        if (errorRate > 0.5) {
            return {
                status: 'degraded',
                errorRate,
                criticalErrors,
                recommendation: 'check-logs'
            };
        }

        return {
            status: 'degraded',
            errorRate,
            criticalErrors,
            recommendation: 'none'
        };
    }

    /**
     * Handle graceful degradation based on error type
     */
    handleGracefulDegradation(error: Error, service: string): GracefulDegradation {
        const classification = this.classifyError(error);

        switch (classification.type) {
            case 'audio':
                return {
                    subsystem: 'audio',
                    action: 'disabled',
                    impact: 'Audio features are temporarily unavailable',
                    userMessage: 'Audio has been disabled due to technical issues'
                };

            case 'render':
                return {
                    subsystem: 'rendering',
                    action: 'fallback-mode',
                    impact: 'Reduced visual quality',
                    userMessage: 'Switched to basic rendering mode for stability'
                };

            case 'plugin':
                return {
                    subsystem: 'plugins',
                    action: 'plugin-disabled',
                    impact: 'Plugin features unavailable',
                    userMessage: 'A plugin has been disabled due to an error'
                };

            case 'network':
                return {
                    subsystem: 'network',
                    action: 'offline-mode',
                    impact: 'Online features unavailable',
                    userMessage: 'Running in offline mode due to network issues'
                };

            default:
                return {
                    subsystem: 'general',
                    action: 'safe-mode',
                    impact: 'Reduced functionality',
                    userMessage: 'Running in safe mode due to technical issues'
                };
        }
    }

    /**
     * Check if circuit breaker is open for a service
     */
    isCircuitOpen(service: string): boolean {
        const state = this.circuitBreakers.get(service);
        if (!state) return false;

        if (state.isOpen) {
            // Check if timeout has elapsed
            const now = Date.now();
            const timeSinceLastFailure = now - state.lastFailure.getTime();
            
            if (timeSinceLastFailure > this.circuitBreakerTimeout) {
                this.resetCircuit(service);
                return false;
            }
        }

        return state.isOpen;
    }

    /**
     * Record a failure for circuit breaker
     */
    recordFailure(service: string): void {
        const state = this.circuitBreakers.get(service) || {
            failures: 0,
            lastFailure: new Date(),
            isOpen: false
        };

        state.failures++;
        state.lastFailure = new Date();

        if (state.failures >= this.circuitBreakerThreshold) {
            state.isOpen = true;
        }

        this.circuitBreakers.set(service, state);
    }

    /**
     * Record a success for circuit breaker
     */
    recordSuccess(service: string): void {
        const state = this.circuitBreakers.get(service);
        if (state) {
            state.failures = 0;
            state.isOpen = false;
            this.circuitBreakers.set(service, state);
        }
    }

    /**
     * Reset circuit breaker for a service
     */
    resetCircuit(service: string): void {
        this.circuitBreakers.delete(service);
    }

    /**
     * Dispose error boundary and clean up
     */
    dispose(): void {
        if (this.disposed) return;

        this.removeGlobalErrorHandling();
        this.circuitBreakers.clear();
        this.disposed = true;
    }

    /**
     * Set up global error handling
     */
    private setupGlobalErrorHandling(): void {
        if (!this.enableGlobalHandling || typeof window === 'undefined') {
            return;
        }

        this.globalErrorHandler = (event: ErrorEvent) => {
            this.reportError(event.error || new Error(event.message), 'global-error');
        };

        this.globalRejectionHandler = (event: PromiseRejectionEvent) => {
            const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
            this.reportError(error, 'unhandled-promise-rejection');
        };

        window.addEventListener('error', this.globalErrorHandler);
        window.addEventListener('unhandledrejection', this.globalRejectionHandler);
    }

    /**
     * Remove global error handling
     */
    private removeGlobalErrorHandling(): void {
        if (typeof window === 'undefined') return;

        if (this.globalErrorHandler) {
            window.removeEventListener('error', this.globalErrorHandler);
        }

        if (this.globalRejectionHandler) {
            window.removeEventListener('unhandledrejection', this.globalRejectionHandler);
        }
    }

    /**
     * Utility method for delays
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Ensure error boundary is not disposed
     */
    private ensureNotDisposed(): void {
        if (this.disposed) {
            throw new Error('ErrorBoundary has been disposed');
        }
    }
}