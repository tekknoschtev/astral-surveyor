/**
 * @fileoverview ErrorService - Centralized error handling service integrating with ErrorBoundary
 * Provides circuit breaker patterns, retry logic, and error reporting for robust application behavior.
 * 
 * @author Astral Surveyor Development Team
 * @since 0.1.0
 */

import { ErrorBoundary, Logger, ErrorRecord, HealthStatus, GracefulDegradation } from './ErrorBoundary.js';
// Removed EventSystem dependency for simplified architecture
import { LoggerService, LogLevel } from './LoggerService.js';

/**
 * Standard error event types used throughout the application for consistent error communication.
 * @readonly
 * @enum {string}
 */
export const ErrorEvents = {
    /** Emitted when any error occurs in a service operation */
    ERROR_OCCURRED: 'error.occurred',
    /** Emitted when a service enters degraded mode */
    SERVICE_DEGRADED: 'error.service.degraded',
    /** Emitted when a service recovers from degraded mode */
    SERVICE_RECOVERED: 'error.service.recovered',
    /** Emitted for critical errors that require immediate attention */
    CRITICAL_ERROR: 'error.critical'
} as const;

/**
 * Event data structure for error-related events.
 * @interface
 */
export interface ErrorEventData {
    /** The service where the error occurred */
    service: string;
    /** The specific operation that failed */
    operation: string;
    /** The actual error object */
    error: Error;
    /** Whether the error can potentially be recovered from */
    recoverable: boolean;
    /** Optional user-friendly message to display */
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
 * ErrorService provides centralized, consistent error handling for all services using
 * circuit breaker patterns, retry logic, and graceful degradation strategies.
 * 
 * @class ErrorService
 * @description This service acts as the main coordinator for error handling across the application.
 * It integrates with ErrorBoundary for service-level error handling and provides:
 * - Circuit breaker pattern to prevent cascade failures
 * - Automatic retry logic with exponential backoff  
 * - Event-driven error reporting and recovery notifications
 * - Service degradation management with graceful fallbacks
 * 
 * @example
 * ```typescript
 * const errorService = new ErrorService(eventSystem);
 * 
 * // Safe execution with fallback
 * const result = errorService.safeExecute(
 *   'UserService', 
 *   'fetchUser', 
 *   () => userAPI.getUser(id),
 *   null, // fallback value
 *   'Unable to load user data' // user message
 * );
 * 
 * // Get error statistics
 * const stats = errorService.getErrorStats();
 * console.log(`Error rate: ${stats.errorRate * 100}%`);
 * ```
 * 
 * @since 0.1.0
 */
export class ErrorService {
    private errorBoundary: ErrorBoundary;
    private loggerService: LoggerService;
    private disposed: boolean = false;
    private degradedServices: Set<string> = new Set();

    // Simplified callback-based error notification
    private errorCallbacks: ((data: any) => void)[] = [];
    private criticalCallbacks: ((data: any) => void)[] = [];
    private degradedCallbacks: ((data: any) => void)[] = [];

    constructor(loggerService?: LoggerService) {
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
     * Execute a function safely with comprehensive error handling including circuit breakers,
     * retry logic, and event notifications.
     * 
     * @template T - The return type of the function being executed
     * @param {string} service - The name of the service executing this operation
     * @param {string} operation - The specific operation being performed
     * @param {() => T} fn - The function to execute safely
     * @param {T | null} [fallback=null] - Fallback value to return on error
     * @param {string} [userMessage] - Optional user-friendly error message
     * @returns {T | null} The function result, fallback value, or null on error
     * 
     * @example
     * ```typescript
     * const userData = errorService.safeExecute(
     *   'UserService',
     *   'fetchProfile', 
     *   () => api.getUserProfile(userId),
     *   { name: 'Unknown User' }, // fallback
     *   'Could not load user profile'
     * );
     * ```
     * 
     * @since 0.1.0
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
            // Notify critical error callbacks
            const criticalData = {
                service,
                operation,
                error,
                recoverable: classification.recoverable,
                userMessage
            };
            this.criticalCallbacks.forEach(callback => {
                try {
                    callback(criticalData);
                } catch (callbackError) {
                    console.error('Error in critical error callback:', callbackError);
                }
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
            
            // Could add recovery callbacks here if needed
        }
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
        this.errorCallbacks.push(callback);
    }

    /**
     * Subscribe to service degradation events
     */
    onServiceDegraded(callback: (data: ServiceDegradationData) => void): void {
        this.degradedCallbacks.push(callback);
    }

    /**
     * Subscribe to critical error events
     */
    onCriticalError(callback: (data: ErrorEventData) => void): void {
        this.criticalCallbacks.push(callback);
    }

    /**
     * Dispose error service and cleanup
     */
    dispose(): void {
        if (this.disposed) return;
        
        this.errorBoundary.dispose();
        // Clear all callbacks
        this.errorCallbacks.length = 0;
        this.criticalCallbacks.length = 0;
        this.degradedCallbacks.length = 0;
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
        
        // Notify error callbacks
        this.errorCallbacks.forEach(callback => {
            try {
                callback(eventData);
            } catch (callbackError) {
                console.error('Error in error callback:', callbackError);
            }
        });
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
            
            // Notify degraded service callbacks
            this.degradedCallbacks.forEach(callback => {
                try {
                    callback(degradationData);
                } catch (callbackError) {
                    console.error('Error in degraded service callback:', callbackError);
                }
            });
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