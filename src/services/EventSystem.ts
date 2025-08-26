// EventSystem - Clean architecture event management for decoupled communication
// Provides pub/sub patterns for loose coupling between services and components

// Event metadata interface
interface EventMetadata {
    source?: string;
    context?: string;
    timestamp?: number;
    [key: string]: unknown;
}

// Event listener options
interface ListenerOptions {
    priority?: number;
    condition?: (data: unknown) => boolean;
    context?: string;
    once?: boolean;
}

// Event listener internal structure
interface EventListener {
    handler: (data: unknown, event?: GameEvent) => void;
    options: ListenerOptions;
    id: string;
}

// Event history entry for debugging
interface EventHistoryEntry {
    eventType: string;
    data: unknown;
    metadata?: EventMetadata;
    timestamp: number;
    listenerCount: number;
}

// Event result interface
interface EventResult {
    defaultPrevented: boolean;
    propagationStopped: boolean;
    listenerCount: number;
}

export class GameEvent {
    public readonly type: string;
    public readonly data: unknown;
    public readonly metadata: EventMetadata;
    public readonly timestamp: number;
    
    private _defaultPrevented: boolean = false;
    private _propagationStopped: boolean = false;

    constructor(type: string, data: unknown, metadata: EventMetadata = {}) {
        this.type = type;
        this.data = data;
        this.metadata = { ...metadata, timestamp: Date.now() };
        this.timestamp = Date.now();
    }

    get defaultPrevented(): boolean {
        return this._defaultPrevented;
    }

    get propagationStopped(): boolean {
        return this._propagationStopped;
    }

    preventDefault(): void {
        this._defaultPrevented = true;
    }

    stopPropagation(): void {
        this._propagationStopped = true;
    }
}

export interface IEventDispatcher {
    // Event registration
    on(eventType: string, handler: (data: unknown, event?: GameEvent) => void, options?: ListenerOptions): void;
    once(eventType: string, handler: (data: unknown, event?: GameEvent) => void, options?: ListenerOptions): void;
    off(eventType: string, handler?: (data: unknown, event?: GameEvent) => void): void;
    
    // Event emission
    emit(eventType: string, data: unknown, metadata?: EventMetadata): EventResult;
    
    // Event introspection
    hasListeners(eventType: string): boolean;
    getListenerCount(eventType: string): number;
    getTotalListenerCount(): number;
    getRegisteredEventTypes(): string[];
    
    // Debugging
    setDebugging(enabled: boolean): void;
    setMaxHistorySize(size: number): void;
    getEventHistory(): EventHistoryEntry[];
    
    // Lifecycle
    dispose(): void;
}

export class EventDispatcher implements IEventDispatcher {
    private listeners: Map<string, EventListener[]> = new Map();
    private disposed: boolean = false;
    private debugging: boolean = false;
    private eventHistory: EventHistoryEntry[] = [];
    private maxHistorySize: number = 100;
    private nextListenerId: number = 0;

    /**
     * Register an event listener
     */
    on(eventType: string, handler: (data: unknown, event?: GameEvent) => void, options: ListenerOptions = {}): void {
        this.ensureNotDisposed();
        this.validateEventType(eventType);
        this.validateHandler(handler);

        const listener: EventListener = {
            handler,
            options: { ...options },
            id: `listener_${this.nextListenerId++}`
        };

        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }

        const listeners = this.listeners.get(eventType)!;
        listeners.push(listener);

        // Sort by priority (higher priority first)
        listeners.sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));
    }

    /**
     * Register a one-time event listener
     */
    once(eventType: string, handler: (data: unknown, event?: GameEvent) => void, options: ListenerOptions = {}): void {
        this.on(eventType, handler, { ...options, once: true });
    }

    /**
     * Unregister event listener(s)
     */
    off(eventType: string, handler?: (data: unknown, event?: GameEvent) => void): void {
        this.ensureNotDisposed();
        this.validateEventType(eventType);

        const listeners = this.listeners.get(eventType);
        if (!listeners) return;

        if (handler) {
            // Remove specific handler
            const index = listeners.findIndex(l => l.handler === handler);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        } else {
            // Remove all listeners for this event type
            listeners.length = 0;
        }

        // Clean up empty listener arrays
        if (listeners.length === 0) {
            this.listeners.delete(eventType);
        }
    }

    /**
     * Emit an event to all registered listeners
     */
    emit(eventType: string, data: unknown, metadata: EventMetadata = {}): EventResult {
        this.ensureNotDisposed();

        const listeners = this.listeners.get(eventType);
        const listenerCount = listeners?.length || 0;
        
        const gameEvent = new GameEvent(eventType, data, metadata);
        const result: EventResult = {
            defaultPrevented: false,
            propagationStopped: false,
            listenerCount
        };

        // Add to history if debugging
        if (this.debugging) {
            this.addToHistory({
                eventType,
                data,
                metadata,
                timestamp: Date.now(),
                listenerCount
            });
        }

        if (!listeners || listeners.length === 0) {
            return result;
        }

        // Create a copy to avoid issues with listeners being modified during emission
        const listenersToCall = [...listeners];

        for (const listener of listenersToCall) {
            try {
                // Check context filter
                if (listener.options.context && metadata.context !== listener.options.context) {
                    continue;
                }

                // Check condition filter
                if (listener.options.condition && !listener.options.condition(data)) {
                    continue;
                }

                // Call the handler with data and event (tests expect both parameters)
                listener.handler(data, gameEvent);

                // Remove one-time listeners
                if (listener.options.once) {
                    this.off(eventType, listener.handler);
                }

                // Check if propagation was stopped
                if (gameEvent.propagationStopped) {
                    result.propagationStopped = true;
                    break;
                }

            } catch (error) {
                console.warn(`Error in event listener for '${eventType}':`, error);
                // Continue processing other listeners
            }
        }

        result.defaultPrevented = gameEvent.defaultPrevented;
        return result;
    }

    /**
     * Check if event type has listeners
     */
    hasListeners(eventType: string): boolean {
        const listeners = this.listeners.get(eventType);
        return listeners ? listeners.length > 0 : false;
    }

    /**
     * Get listener count for specific event type
     */
    getListenerCount(eventType: string): number {
        const listeners = this.listeners.get(eventType);
        return listeners ? listeners.length : 0;
    }

    /**
     * Get total listener count across all event types
     */
    getTotalListenerCount(): number {
        let total = 0;
        for (const listeners of this.listeners.values()) {
            total += listeners.length;
        }
        return total;
    }

    /**
     * Get all registered event types
     */
    getRegisteredEventTypes(): string[] {
        return Array.from(this.listeners.keys()).filter(eventType => 
            this.hasListeners(eventType)
        );
    }

    /**
     * Enable/disable debugging mode
     */
    setDebugging(enabled: boolean): void {
        this.debugging = enabled;
        if (!enabled) {
            this.eventHistory.length = 0;
        }
    }

    /**
     * Set maximum history size for debugging
     */
    setMaxHistorySize(size: number): void {
        this.maxHistorySize = Math.max(1, size);
        
        // Trim existing history if needed
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
        }
    }

    /**
     * Get event emission history (debugging only)
     */
    getEventHistory(): EventHistoryEntry[] {
        return [...this.eventHistory];
    }

    /**
     * Dispose of all listeners and clean up resources
     */
    dispose(): void {
        if (this.disposed) return;

        // Clear all listeners
        for (const [/* eventType */, listeners] of this.listeners) {
            for (const listener of listeners) {
                try {
                    // If listener has a dispose method, call it
                    if (typeof (listener.handler as unknown as { dispose?: () => void }).dispose === 'function') {
                        (listener.handler as unknown as { dispose: () => void }).dispose();
                    }
                } catch (_error) {
                    // Ignore disposal errors
                }
            }
        }

        this.listeners.clear();
        this.eventHistory.length = 0;
        this.disposed = true;
    }

    // Private helper methods

    private ensureNotDisposed(): void {
        if (this.disposed) {
            throw new Error('EventDispatcher has been disposed');
        }
    }

    private validateEventType(eventType: string): void {
        if (!eventType || typeof eventType !== 'string' || eventType.trim() === '') {
            throw new Error('Event type must be a non-empty string');
        }
    }

    private validateHandler(handler: unknown): void {
        if (typeof handler !== 'function') {
            throw new Error('Event handler must be a function');
        }
    }

    private addToHistory(entry: EventHistoryEntry): void {
        this.eventHistory.push(entry);
        
        // Trim history if it exceeds max size
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
        }
    }
}