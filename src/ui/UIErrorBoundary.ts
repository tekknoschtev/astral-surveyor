// UI Error Boundary - Handles UI component errors with graceful degradation
// Provides user-friendly error messages and fallback UI when components fail

import { ErrorService, ErrorEvents, ErrorEventData, ServiceDegradationData } from '../services/ErrorService.js';
import { GameConfig } from '../config/gameConfig.js';

export interface UIErrorState {
    hasError: boolean;
    errorMessage: string;
    errorType: 'render' | 'interaction' | 'data' | 'unknown';
    affectedComponent: string;
    timestamp: Date;
    recoverable: boolean;
}

export interface UIFallbackOptions {
    showErrorDetails: boolean;
    enableRecovery: boolean;
    fallbackMessage?: string;
    retryCallback?: () => void;
}

/**
 * UI Error Boundary handles component-level errors with graceful degradation
 */
export class UIErrorBoundary {
    private errorService: ErrorService;
    private errorStates: Map<string, UIErrorState> = new Map();
    private fallbackOptions: UIFallbackOptions;
    private disposed: boolean = false;

    constructor(errorService: ErrorService, options?: Partial<UIFallbackOptions>) {
        this.errorService = errorService;
        this.fallbackOptions = {
            showErrorDetails: GameConfig.debug?.enabled || false,
            enableRecovery: true,
            fallbackMessage: 'This feature is temporarily unavailable.',
            ...options
        };

        this.setupErrorHandling();
    }

    /**
     * Wrap a UI component operation with error handling
     */
    wrapComponent<T>(
        componentName: string,
        operation: () => T,
        fallback: T | (() => T) = null as T
    ): T | null {
        if (this.hasActiveError(componentName)) {
            return this.getFallbackValue(fallback);
        }

        return this.errorService.safeExecute(
            'UI',
            componentName,
            operation,
            this.getFallbackValue(fallback),
            `UI component "${componentName}" encountered an error`
        );
    }

    /**
     * Wrap an async UI operation with error handling
     */
    async wrapComponentAsync<T>(
        componentName: string,
        operation: () => Promise<T>,
        fallback: T | (() => T) = null as T
    ): Promise<T | null> {
        if (this.hasActiveError(componentName)) {
            return this.getFallbackValue(fallback);
        }

        return await this.errorService.safeExecuteAsync(
            'UI',
            componentName,
            operation,
            this.getFallbackValue(fallback),
            `UI component "${componentName}" encountered an async error`
        );
    }

    /**
     * Wrap DOM manipulation with error handling
     */
    safeDOMOperation(
        componentName: string,
        operation: () => void,
        errorMessage?: string
    ): boolean {
        const result = this.errorService.safeExecute(
            'UI',
            `${componentName}.DOM`,
            () => {
                operation();
                return true; // Operation succeeded
            },
            false, // Fallback on error
            errorMessage || `DOM operation failed in component "${componentName}"`
        );
        
        return result === true;
    }

    /**
     * Wrap event handler with error handling
     */
    safeEventHandler<T extends Event>(
        componentName: string,
        handler: (event: T) => void
    ): (event: T) => void {
        return (event: T) => {
            this.errorService.safeExecute(
                'UI',
                `${componentName}.eventHandler`,
                () => handler(event),
                undefined,
                `Event handler failed in component "${componentName}"`
            );
        };
    }

    /**
     * Check if a component currently has an active error
     */
    hasActiveError(componentName: string): boolean {
        const errorState = this.errorStates.get(componentName);
        return errorState?.hasError || false;
    }

    /**
     * Get error state for a specific component
     */
    getErrorState(componentName: string): UIErrorState | null {
        return this.errorStates.get(componentName) || null;
    }

    /**
     * Clear error state for a component (manual recovery)
     */
    clearError(componentName: string): void {
        this.errorStates.delete(componentName);
        this.errorService.markServiceRecovered(`UI.${componentName}`);
    }

    /**
     * Clear all error states
     */
    clearAllErrors(): void {
        for (const componentName of this.errorStates.keys()) {
            this.errorService.markServiceRecovered(`UI.${componentName}`);
        }
        this.errorStates.clear();
    }

    /**
     * Create error display element for failed components
     */
    createErrorDisplay(componentName: string): HTMLElement {
        const errorState = this.errorStates.get(componentName);
        const container = document.createElement('div');
        container.className = 'ui-error-boundary';
        container.style.cssText = `
            padding: 12px;
            margin: 8px;
            background: rgba(139, 69, 19, 0.15);
            border: 1px solid rgba(139, 69, 19, 0.4);
            border-radius: 4px;
            color: #D2B48C;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            text-align: center;
        `;

        const message = document.createElement('div');
        message.textContent = errorState?.errorMessage || this.fallbackOptions.fallbackMessage || 'Component temporarily unavailable';
        container.appendChild(message);

        if (this.fallbackOptions.enableRecovery && errorState?.recoverable) {
            const retryButton = document.createElement('button');
            retryButton.textContent = 'Retry';
            retryButton.style.cssText = `
                margin-top: 8px;
                padding: 4px 12px;
                background: rgba(139, 69, 19, 0.3);
                border: 1px solid rgba(139, 69, 19, 0.6);
                border-radius: 3px;
                color: #D2B48C;
                cursor: pointer;
                font-family: inherit;
                font-size: 11px;
            `;
            
            retryButton.addEventListener('click', () => {
                this.clearError(componentName);
                if (this.fallbackOptions.retryCallback) {
                    this.fallbackOptions.retryCallback();
                }
            });
            
            container.appendChild(retryButton);
        }

        if (this.fallbackOptions.showErrorDetails && errorState) {
            const details = document.createElement('div');
            details.style.cssText = 'margin-top: 8px; font-size: 10px; opacity: 0.7;';
            details.textContent = `Error: ${errorState.errorType} in ${errorState.affectedComponent}`;
            container.appendChild(details);
        }

        return container;
    }

    /**
     * Replace a failed component with error display
     */
    replaceWithErrorDisplay(element: HTMLElement, componentName: string): void {
        const errorDisplay = this.createErrorDisplay(componentName);
        
        if (element.parentNode) {
            element.parentNode.replaceChild(errorDisplay, element);
        }
    }

    /**
     * Get list of components with active errors
     */
    getFailedComponents(): string[] {
        return Array.from(this.errorStates.keys()).filter(name => 
            this.errorStates.get(name)?.hasError
        );
    }

    /**
     * Dispose error boundary and cleanup
     */
    dispose(): void {
        if (this.disposed) return;
        
        this.errorStates.clear();
        this.disposed = true;
    }

    // Private methods

    private setupErrorHandling(): void {
        // Listen for error events from ErrorService
        this.errorService.onError((data: ErrorEventData) => {
            if (data.service === 'UI') {
                this.handleUIError(data);
            }
        });

        this.errorService.onServiceDegraded((data: ServiceDegradationData) => {
            if (data.service.startsWith('UI.')) {
                const componentName = data.service.replace('UI.', '');
                this.markComponentDegraded(componentName, data.degradation.userMessage);
            }
        });
    }

    private handleUIError(errorData: ErrorEventData): void {
        const componentName = errorData.operation;
        const errorType = this.classifyUIError(errorData.error);
        
        const errorState: UIErrorState = {
            hasError: true,
            errorMessage: errorData.userMessage || `Component "${componentName}" encountered an error`,
            errorType,
            affectedComponent: componentName,
            timestamp: new Date(),
            recoverable: errorData.recoverable
        };

        this.errorStates.set(componentName, errorState);
    }

    private markComponentDegraded(componentName: string, userMessage: string): void {
        if (!this.errorStates.has(componentName)) {
            const errorState: UIErrorState = {
                hasError: true,
                errorMessage: userMessage,
                errorType: 'unknown',
                affectedComponent: componentName,
                timestamp: new Date(),
                recoverable: true
            };

            this.errorStates.set(componentName, errorState);
        }
    }

    private classifyUIError(error: Error): UIErrorState['errorType'] {
        const message = error.message.toLowerCase();
        
        if (message.includes('render') || message.includes('draw') || message.includes('canvas')) {
            return 'render';
        }
        
        if (message.includes('click') || message.includes('event') || message.includes('handler')) {
            return 'interaction';
        }
        
        if (message.includes('data') || message.includes('fetch') || message.includes('load')) {
            return 'data';
        }
        
        return 'unknown';
    }

    private getFallbackValue<T>(fallback: T | (() => T)): T | null {
        if (typeof fallback === 'function') {
            try {
                return (fallback as () => T)();
            } catch {
                return null;
            }
        }
        return fallback;
    }

    private ensureNotDisposed(): void {
        if (this.disposed) {
            throw new Error('UIErrorBoundary has been disposed');
        }
    }
}