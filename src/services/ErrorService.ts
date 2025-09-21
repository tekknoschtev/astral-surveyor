// ErrorService - Simple error handling and logging
// Provides basic error logging without enterprise complexity

export interface ErrorEventData {
    service: string;
    operation: string;
    error: Error;
    recoverable: boolean;
    userMessage?: string;
}

export interface ServiceDegradationData {
    service: string;
    degradation: any;
    timestamp: Date;
}

export const ErrorEvents = {
    ERROR_OCCURRED: 'error.occurred',
    SERVICE_DEGRADED: 'error.service.degraded',
    SERVICE_RECOVERED: 'error.service.recovered',
    CRITICAL_ERROR: 'error.critical'
} as const;

export class ErrorService {
    private errorCallbacks: ((data: ErrorEventData) => void)[] = [];

    // Safe execution with fallback
    safeExecute<T>(
        service: string,
        operation: string,
        fn: () => T,
        fallback: T | null = null,
        userMessage?: string
    ): T | null {
        try {
            return fn();
        } catch (error) {
            this.logError(service, operation, error as Error, userMessage);
            return fallback;
        }
    }

    // Safe async execution
    async safeExecuteAsync<T>(
        service: string,
        operation: string,
        fn: () => Promise<T>,
        fallback: T | null = null,
        userMessage?: string
    ): Promise<T | null> {
        try {
            return await fn();
        } catch (error) {
            this.logError(service, operation, error as Error, userMessage);
            return fallback;
        }
    }

    // Report error directly
    reportError(service: string, operation: string, error: Error, userMessage?: string): void {
        this.logError(service, operation, error, userMessage);
    }

    // Subscribe to error events
    onError(callback: (data: ErrorEventData) => void): void {
        this.errorCallbacks.push(callback);
    }

    // Backward compatibility stubs for deleted complex methods
    getDegradedServices(): string[] { return []; }
    markServiceRecovered(service: string): void { /* simplified - no op */ }
    executeWithRetry<T>(
        service: string,
        operation: string,
        fn: () => T | Promise<T>,
        maxRetries?: number,
        retryDelay?: number,
        userMessage?: string
    ): Promise<T | null> {
        return this.safeExecuteAsync(service, operation, fn as () => Promise<T>, null, userMessage);
    }
    executeIfServiceHealthy<T>(service: string, operation: string, fn: () => T, userMessage?: string): T | null {
        return this.safeExecute(service, operation, fn, null, userMessage);
    }
    getHealthStatus(): any { return { status: 'healthy' }; }
    getRecentErrors(): any[] { return []; }
    onServiceDegraded(callback: (data: ServiceDegradationData) => void): void { /* no op */ }

    // Private method to log and emit errors
    private logError(service: string, operation: string, error: Error, userMessage?: string): void {
        console.error(`${service}.${operation}:`, error);

        const eventData: ErrorEventData = {
            service,
            operation,
            error,
            recoverable: true,
            userMessage
        };

        // Notify callbacks
        this.errorCallbacks.forEach(callback => {
            try {
                callback(eventData);
            } catch (callbackError) {
                console.error('Error in error callback:', callbackError);
            }
        });
    }
}

// Simple singleton for easy access
let errorServiceInstance: ErrorService | null = null;

export function getErrorService(): ErrorService {
    if (!errorServiceInstance) {
        errorServiceInstance = new ErrorService();
    }
    return errorServiceInstance;
}