// ErrorService - Centralized error handling service integrating with ErrorBoundary
// Provides consistent error handling patterns across all services

import { ErrorBoundary, Logger, ErrorRecord, HealthStatus, GracefulDegradation } from './ErrorBoundary.js';
import { EventDispatcher, IEventDispatcher } from './EventSystem.js';
import { LoggerService, LogLevel } from './LoggerService.js';

// Standard error event types
export const ErrorEvents = {
    ERROR_OCCURRED: 'error.occurred',
    SERVICE_DEGRADED: 'error.service.degraded',
    SERVICE_RECOVERED: 'error.service.recovered',
    CRITICAL_ERROR: 'error.critical'
} as const;

export interface ErrorEventData {
    service: string;
    operation: string;
    error: Error;
    recoverable: boolean;
    userMessage?: string;
}

export interface ServiceDegradationData {
    service: string;
    degradation: GracefulDegradation;
    timestamp: Date;
}

/**
 * Structured Logger implementation for ErrorBoundary using LoggerService
 */
class StructuredLogger implements Logger {
    constructor(private loggerService: LoggerService) {}

    error(message: string, ...args: unknown[]): void {
        this.loggerService.error('ErrorBoundary', 'error', message, args[0] as Error, args.slice(1));
    }

    warn(message: string, ...args: unknown[]): void {
        this.loggerService.warn('ErrorBoundary', 'warn', message, args);
    }

    info(message: string, ...args: unknown[]): void {
        this.loggerService.info('ErrorBoundary', 'info', message, args);
    }

    debug(message: string, ...args: unknown[]): void {
        this.loggerService.debug('ErrorBoundary', 'debug', message, args);
    }
}

/**
 * ErrorService provides centralized, consistent error handling for all services
 */
export class ErrorService {
    private errorBoundary: ErrorBoundary;
    private eventDispatcher: IEventDispatcher;
    private loggerService: LoggerService;
    private disposed: boolean = false;
    private degradedServices: Set<string> = new Set();

    constructor(eventDispatcher?: IEventDispatcher, loggerService?: LoggerService) {
        this.eventDispatcher = eventDispatcher || new EventDispatcher();
        this.loggerService = loggerService || new LoggerService({
            minLevel: LogLevel.WARN, // Focus on warnings and errors for error handling
            enableConsole: true,
            enableStorage: true,
            includeGameState: false
        });
        
        this.errorBoundary = new ErrorBoundary({
            logger: new StructuredLogger(this.loggerService),
            enableGlobalHandling: true,
            maxRecentErrors: 20,
            circuitBreakerThreshold: 3,
            circuitBreakerTimeout: 30000 // 30 seconds
        });
    }

    /**
     * Execute a function safely with consistent error handling
     */
    safeExecute<T>(
        service: string, 
        operation: string, 
        fn: () => T, 
        fallback: T | null = null,
        userMessage?: string
    ): T | null {
        const result = this.errorBoundary.safeExecute(fn, `${service}.${operation}`, fallback);
        
        if (result === fallback && fallback !== fn()) {
            // An error occurred, emit event
            this.emitErrorEvent(service, operation, new Error('Safe execution failed'), true, userMessage);
        }
        
        return result;
    }

    /**
     * Execute an async function safely with consistent error handling
     */
    async safeExecuteAsync<T>(
        service: string, 
        operation: string, 
        fn: () => Promise<T>, 
        fallback: T | null = null,
        userMessage?: string
    ): Promise<T | null> {
        const result = await this.errorBoundary.safeExecuteAsync(fn, `${service}.${operation}`, fallback);
        
        if (result === fallback) {
            // An error occurred, emit event
            this.emitErrorEvent(service, operation, new Error('Safe async execution failed'), true, userMessage);
        }
        
        return result;
    }

    /**
     * Execute function with retry logic
     */
    async executeWithRetry<T>(
        service: string,
        operation: string, 
        fn: () => T | Promise<T>,
        maxRetries: number = 3,
        retryDelay: number = 1000,
        userMessage?: string
    ): Promise<T | null> {
        const result = await this.errorBoundary.executeWithRetry(fn, {
            maxRetries,
            retryDelay,
            operation: `${service}.${operation}`
        });
        
        if (result === null) {
            this.emitErrorEvent(service, operation, new Error('Retry execution failed'), false, userMessage);
        }
        
        return result;
    }

    /**
     * Execute function only if service is not circuit-broken
     */
    executeIfServiceHealthy<T>(
        service: string, 
        operation: string, 
        fn: () => T,
        userMessage?: string
    ): T | null {
        const result = this.errorBoundary.executeIfCircuitClosed(service, fn);
        
        if (result === null) {
            this.emitErrorEvent(service, operation, new Error('Service circuit breaker is open'), true, userMessage);
            this.handleServiceDegradation(service, operation);
        }
        
        return result;
    }

    /**
     * Report an error directly to the error boundary
     */
    reportError(service: string, operation: string, error: Error, userMessage?: string): void {
        this.ensureNotDisposed();
        
        this.errorBoundary.reportError(error, `${service}.${operation}`);
        
        const classification = this.errorBoundary.classifyError(error);
        this.emitErrorEvent(service, operation, error, classification.recoverable, userMessage);
        
        // Handle critical errors
        if (classification.severity === 'critical') {
            this.eventDispatcher.emit(ErrorEvents.CRITICAL_ERROR, {
                service,
                operation,
                error,
                recoverable: classification.recoverable,
                userMessage
            });
        }
    }

    /**
     * Get current health status of the error system
     */
    getHealthStatus(): HealthStatus {
        return this.errorBoundary.getHealthStatus();
    }

    /**
     * Get recent error records
     */
    getRecentErrors(): ErrorRecord[] {
        return this.errorBoundary.getErrorStatistics().recentErrors;
    }

    /**
     * Check if a service is currently degraded
     */
    isServiceDegraded(service: string): boolean {
        return this.degradedServices.has(service) || this.errorBoundary.isCircuitOpen(service);
    }

    /**
     * Get list of currently degraded services
     */
    getDegradedServices(): string[] {
        return Array.from(this.degradedServices);
    }

    /**
     * Mark a service as recovered
     */
    markServiceRecovered(service: string): void {
        if (this.degradedServices.has(service)) {
            this.degradedServices.delete(service);
            this.errorBoundary.resetCircuit(service);
            
            this.eventDispatcher.emit(ErrorEvents.SERVICE_RECOVERED, {
                service,
                timestamp: new Date()
            });
        }
    }

    /**
     * Get the event dispatcher for external use
     */
    getEventDispatcher(): IEventDispatcher {
        return this.eventDispatcher;
    }

    /**
     * Get the logger service for direct logging
     */
    getLogger(): LoggerService {
        return this.loggerService;
    }

    /**
     * Subscribe to error events
     */
    onError(callback: (data: ErrorEventData) => void): void {
        this.eventDispatcher.on(ErrorEvents.ERROR_OCCURRED, callback);
    }

    /**
     * Subscribe to service degradation events
     */
    onServiceDegraded(callback: (data: ServiceDegradationData) => void): void {
        this.eventDispatcher.on(ErrorEvents.SERVICE_DEGRADED, callback);
    }

    /**
     * Subscribe to critical error events
     */
    onCriticalError(callback: (data: ErrorEventData) => void): void {
        this.eventDispatcher.on(ErrorEvents.CRITICAL_ERROR, callback);
    }

    /**
     * Dispose error service and cleanup
     */
    dispose(): void {
        if (this.disposed) return;
        
        this.errorBoundary.dispose();
        this.eventDispatcher.dispose();
        this.loggerService.dispose();
        this.degradedServices.clear();
        this.disposed = true;
    }

    // Private methods

    private emitErrorEvent(
        service: string, 
        operation: string, 
        error: Error, 
        recoverable: boolean, 
        userMessage?: string
    ): void {
        const eventData: ErrorEventData = {
            service,
            operation,
            error,
            recoverable,
            userMessage
        };
        
        this.eventDispatcher.emit(ErrorEvents.ERROR_OCCURRED, eventData);
    }

    private handleServiceDegradation(service: string, operation: string): void {
        if (!this.degradedServices.has(service)) {
            this.degradedServices.add(service);
            
            const degradation = this.errorBoundary.handleGracefulDegradation(
                new Error(`Service ${service} degraded due to circuit breaker`),
                service
            );
            
            const degradationData: ServiceDegradationData = {
                service,
                degradation,
                timestamp: new Date()
            };
            
            this.eventDispatcher.emit(ErrorEvents.SERVICE_DEGRADED, degradationData);
        }
    }

    private ensureNotDisposed(): void {
        if (this.disposed) {
            throw new Error('ErrorService has been disposed');
        }
    }
}

// Singleton instance for easy access
let errorServiceInstance: ErrorService | null = null;

export function getErrorService(): ErrorService {
    if (!errorServiceInstance) {
        errorServiceInstance = new ErrorService();
    }
    return errorServiceInstance;
}

export function resetErrorService(): void {
    if (errorServiceInstance) {
        errorServiceInstance.dispose();
        errorServiceInstance = null;
    }
}