// LoggerService - Centralized logging service with structured error tracking
// Provides consistent logging patterns and error aggregation for debugging

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    CRITICAL = 4
}

export interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    service: string;
    operation: string;
    message: string;
    data?: unknown;
    error?: Error;
    userAgent?: string;
    gameState?: {
        position?: { x: number; y: number };
        activeChunks?: number;
        discoveredObjects?: number;
    };
}

export interface LoggerConfig {
    minLevel: LogLevel;
    maxEntries: number;
    enableConsole: boolean;
    enableStorage: boolean;
    storageKey: string;
    includeGameState: boolean;
}

/**
 * Centralized logging service for consistent error tracking and debugging
 */
export class LoggerService {
    private config: LoggerConfig;
    private entries: LogEntry[] = [];
    private disposed: boolean = false;

    constructor(config?: Partial<LoggerConfig>) {
        this.config = {
            minLevel: LogLevel.INFO,
            maxEntries: 1000,
            enableConsole: true,
            enableStorage: true,
            storageKey: 'astralSurveyor_logs',
            includeGameState: false,
            ...config
        };

        this.loadStoredLogs();
    }

    /**
     * Log debug information
     */
    debug(service: string, operation: string, message: string, data?: unknown): void {
        this.log(LogLevel.DEBUG, service, operation, message, data);
    }

    /**
     * Log general information
     */
    info(service: string, operation: string, message: string, data?: unknown): void {
        this.log(LogLevel.INFO, service, operation, message, data);
    }

    /**
     * Log warnings
     */
    warn(service: string, operation: string, message: string, data?: unknown): void {
        this.log(LogLevel.WARN, service, operation, message, data);
    }

    /**
     * Log errors
     */
    error(service: string, operation: string, message: string, error?: Error, data?: unknown): void {
        this.log(LogLevel.ERROR, service, operation, message, data, error);
    }

    /**
     * Log critical errors
     */
    critical(service: string, operation: string, message: string, error?: Error, data?: unknown): void {
        this.log(LogLevel.CRITICAL, service, operation, message, data, error);
    }

    /**
     * Log an entry with specified level
     */
    private log(
        level: LogLevel,
        service: string,
        operation: string,
        message: string,
        data?: unknown,
        error?: Error
    ): void {
        this.ensureNotDisposed();

        // Check if level meets minimum threshold
        if (level < this.config.minLevel) {
            return;
        }

        const entry: LogEntry = {
            timestamp: new Date(),
            level,
            service,
            operation,
            message,
            data,
            error,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
        };

        // Add game state if enabled
        if (this.config.includeGameState) {
            entry.gameState = this.captureGameState();
        }

        // Add to entries
        this.entries.push(entry);

        // Maintain max entries limit
        if (this.entries.length > this.config.maxEntries) {
            this.entries.shift(); // Remove oldest entry
        }

        // Output to console if enabled
        if (this.config.enableConsole) {
            this.outputToConsole(entry);
        }

        // Store to localStorage if enabled
        if (this.config.enableStorage) {
            this.persistLogs();
        }
    }

    /**
     * Get all log entries
     */
    getEntries(minLevel?: LogLevel): LogEntry[] {
        const filterLevel = minLevel ?? LogLevel.DEBUG;
        return this.entries.filter(entry => entry.level >= filterLevel);
    }

    /**
     * Get recent log entries (last N entries)
     */
    getRecentEntries(count: number = 50, minLevel?: LogLevel): LogEntry[] {
        const filtered = this.getEntries(minLevel);
        return filtered.slice(-count);
    }

    /**
     * Get log entries for a specific service
     */
    getEntriesForService(service: string, minLevel?: LogLevel): LogEntry[] {
        return this.getEntries(minLevel).filter(entry => entry.service === service);
    }

    /**
     * Get log entries within a time range
     */
    getEntriesInRange(start: Date, end: Date, minLevel?: LogLevel): LogEntry[] {
        return this.getEntries(minLevel).filter(entry => 
            entry.timestamp >= start && entry.timestamp <= end
        );
    }

    /**
     * Get error statistics
     */
    getErrorStatistics(): {
        totalErrors: number;
        errorsByService: Record<string, number>;
        errorsByLevel: Record<LogLevel, number>;
        recentErrors: LogEntry[];
    } {
        const errors = this.getEntries(LogLevel.ERROR);
        
        const errorsByService: Record<string, number> = {};
        const errorsByLevel: Record<LogLevel, number> = {
            [LogLevel.DEBUG]: 0,
            [LogLevel.INFO]: 0,
            [LogLevel.WARN]: 0,
            [LogLevel.ERROR]: 0,
            [LogLevel.CRITICAL]: 0
        };

        for (const entry of errors) {
            errorsByService[entry.service] = (errorsByService[entry.service] || 0) + 1;
            errorsByLevel[entry.level]++;
        }

        return {
            totalErrors: errors.length,
            errorsByService,
            errorsByLevel,
            recentErrors: errors.slice(-10)
        };
    }

    /**
     * Export logs as JSON string
     */
    exportLogs(minLevel?: LogLevel): string {
        const entries = this.getEntries(minLevel);
        return JSON.stringify({
            exportTimestamp: new Date().toISOString(),
            config: this.config,
            entries
        }, null, 2);
    }

    /**
     * Clear all log entries
     */
    clearLogs(): void {
        this.entries = [];
        if (this.config.enableStorage) {
            this.clearStoredLogs();
        }
    }

    /**
     * Update logger configuration
     */
    updateConfig(newConfig: Partial<LoggerConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Dispose logger and cleanup
     */
    dispose(): void {
        if (this.disposed) return;

        if (this.config.enableStorage) {
            this.persistLogs();
        }
        
        this.entries = [];
        this.disposed = true;
    }

    // Private methods

    private outputToConsole(entry: LogEntry): void {
        const timestamp = entry.timestamp.toISOString();
        const prefix = `[${timestamp}] ${entry.service}.${entry.operation}`;
        
        switch (entry.level) {
            case LogLevel.DEBUG:
                console.debug(`${prefix} DEBUG: ${entry.message}`, entry.data);
                break;
            case LogLevel.INFO:
                console.info(`${prefix} INFO: ${entry.message}`, entry.data);
                break;
            case LogLevel.WARN:
                console.warn(`${prefix} WARN: ${entry.message}`, entry.data);
                break;
            case LogLevel.ERROR:
                console.error(`${prefix} ERROR: ${entry.message}`, entry.error || entry.data);
                break;
            case LogLevel.CRITICAL:
                console.error(`${prefix} CRITICAL: ${entry.message}`, entry.error || entry.data);
                break;
        }
    }

    private persistLogs(): void {
        try {
            if (typeof localStorage === 'undefined') return;
            
            const recentLogs = this.getRecentEntries(200); // Store only recent logs
            const logData = {
                timestamp: new Date().toISOString(),
                entries: recentLogs
            };
            
            localStorage.setItem(this.config.storageKey, JSON.stringify(logData));
        } catch (error) {
            // Silently fail if localStorage is not available
            console.warn('Failed to persist logs to localStorage:', error);
        }
    }

    private loadStoredLogs(): void {
        try {
            if (typeof localStorage === 'undefined') return;
            
            const stored = localStorage.getItem(this.config.storageKey);
            if (stored) {
                const logData = JSON.parse(stored);
                if (logData.entries && Array.isArray(logData.entries)) {
                    // Restore entries with proper Date objects
                    this.entries = logData.entries.map((entry: any) => ({
                        ...entry,
                        timestamp: new Date(entry.timestamp)
                    }));
                }
            }
        } catch (error) {
            console.warn('Failed to load stored logs:', error);
        }
    }

    private clearStoredLogs(): void {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem(this.config.storageKey);
            }
        } catch (error) {
            console.warn('Failed to clear stored logs:', error);
        }
    }

    private captureGameState(): LogEntry['gameState'] {
        // This would need to be injected or accessed via a game state manager
        // For now, return undefined
        return undefined;
    }

    private ensureNotDisposed(): void {
        if (this.disposed) {
            throw new Error('LoggerService has been disposed');
        }
    }
}

// Singleton instance for easy access
let loggerInstance: LoggerService | null = null;

export function getLogger(): LoggerService {
    if (!loggerInstance) {
        loggerInstance = new LoggerService({
            minLevel: LogLevel.INFO,
            enableConsole: true,
            enableStorage: true,
            includeGameState: false
        });
    }
    return loggerInstance;
}

export function resetLogger(): void {
    if (loggerInstance) {
        loggerInstance.dispose();
        loggerInstance = null;
    }
}