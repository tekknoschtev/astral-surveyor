// EventSystem Tests - Test-driven development for pub/sub event management
// Following Phase 4 clean architecture patterns

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventDispatcher, GameEvent } from '../../dist/services/EventSystem.js';

describe('EventSystem', () => {
    let eventDispatcher;

    beforeEach(() => {
        eventDispatcher = new EventDispatcher();
    });

    afterEach(() => {
        if (eventDispatcher && typeof eventDispatcher.dispose === 'function') {
            eventDispatcher.dispose();
        }
    });

    describe('Event Registration and Unregistration', () => {
        it('should register event listeners', () => {
            const handler = vi.fn();
            
            eventDispatcher.on('test-event', handler);
            expect(eventDispatcher.hasListeners('test-event')).toBe(true);
        });

        it('should support multiple listeners for same event', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            
            eventDispatcher.on('test-event', handler1);
            eventDispatcher.on('test-event', handler2);
            
            expect(eventDispatcher.getListenerCount('test-event')).toBe(2);
        });

        it('should unregister specific event listeners', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            
            eventDispatcher.on('test-event', handler1);
            eventDispatcher.on('test-event', handler2);
            
            eventDispatcher.off('test-event', handler1);
            expect(eventDispatcher.getListenerCount('test-event')).toBe(1);
        });

        it('should unregister all listeners for an event type', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            
            eventDispatcher.on('test-event', handler1);
            eventDispatcher.on('test-event', handler2);
            
            eventDispatcher.off('test-event');
            expect(eventDispatcher.hasListeners('test-event')).toBe(false);
        });

        it('should register one-time listeners', () => {
            const handler = vi.fn();
            
            eventDispatcher.once('test-event', handler);
            
            eventDispatcher.emit('test-event', {});
            eventDispatcher.emit('test-event', {});
            
            expect(handler).toHaveBeenCalledTimes(1);
            expect(eventDispatcher.hasListeners('test-event')).toBe(false);
        });
    });

    describe('Event Emission and Handling', () => {
        it('should emit events to registered listeners', () => {
            const handler = vi.fn();
            const eventData = { id: 'test', value: 42 };
            
            eventDispatcher.on('test-event', handler);
            eventDispatcher.emit('test-event', eventData);
            
            expect(handler).toHaveBeenCalledWith(eventData, expect.any(Object));
        });

        it('should emit events to multiple listeners in order', () => {
            const callOrder = [];
            const handler1 = vi.fn(() => callOrder.push('handler1'));
            const handler2 = vi.fn(() => callOrder.push('handler2'));
            
            eventDispatcher.on('test-event', handler1);
            eventDispatcher.on('test-event', handler2);
            eventDispatcher.emit('test-event', {});
            
            expect(callOrder).toEqual(['handler1', 'handler2']);
        });

        it('should handle events with different data types', () => {
            const handler = vi.fn();
            
            eventDispatcher.on('string-event', handler);
            eventDispatcher.on('number-event', handler);
            eventDispatcher.on('object-event', handler);
            
            eventDispatcher.emit('string-event', 'test string');
            eventDispatcher.emit('number-event', 123);
            eventDispatcher.emit('object-event', { key: 'value' });
            
            expect(handler).toHaveBeenCalledTimes(3);
            expect(handler).toHaveBeenNthCalledWith(1, 'test string', expect.any(Object));
            expect(handler).toHaveBeenNthCalledWith(2, 123, expect.any(Object));
            expect(handler).toHaveBeenNthCalledWith(3, { key: 'value' }, expect.any(Object));
        });

        it('should not throw when emitting events with no listeners', () => {
            expect(() => {
                eventDispatcher.emit('non-existent-event', {});
            }).not.toThrow();
        });

        it('should handle listener errors gracefully', () => {
            const errorHandler = vi.fn(() => { throw new Error('Handler error'); });
            const successHandler = vi.fn();
            
            eventDispatcher.on('test-event', errorHandler);
            eventDispatcher.on('test-event', successHandler);
            
            expect(() => {
                eventDispatcher.emit('test-event', {});
            }).not.toThrow();
            
            expect(successHandler).toHaveBeenCalled();
        });
    });

    describe('Game-Specific Events', () => {
        it('should handle object discovery events', () => {
            const handler = vi.fn();
            const discoveryData = {
                type: 'discovery',
                objectType: 'star',
                objectId: 'star_100_200',
                position: { x: 100, y: 200 },
                timestamp: Date.now()
            };
            
            eventDispatcher.on('object.discovered', handler);
            eventDispatcher.emit('object.discovered', discoveryData);
            
            expect(handler).toHaveBeenCalledWith(discoveryData, expect.any(Object));
        });

        it('should handle world generation events', () => {
            const handler = vi.fn();
            const chunkData = {
                type: 'world',
                action: 'chunk.generated',
                chunkCoords: { x: 0, y: 0 },
                objectCount: 15
            };
            
            eventDispatcher.on('world.chunk.generated', handler);
            eventDispatcher.emit('world.chunk.generated', chunkData);
            
            expect(handler).toHaveBeenCalledWith(chunkData, expect.any(Object));
        });

        it('should handle audio events', () => {
            const handler = vi.fn();
            const audioData = {
                type: 'audio',
                action: 'play.discovery',
                soundType: 'star',
                volume: 0.8
            };
            
            eventDispatcher.on('audio.play.discovery', handler);
            eventDispatcher.emit('audio.play.discovery', audioData);
            
            expect(handler).toHaveBeenCalledWith(audioData, expect.any(Object));
        });

        it('should handle configuration change events', () => {
            const handler = vi.fn();
            const configData = {
                type: 'config',
                action: 'changed',
                key: 'audio.volume.master',
                oldValue: 0.8,
                newValue: 0.6
            };
            
            eventDispatcher.on('config.changed', handler);
            eventDispatcher.emit('config.changed', configData);
            
            expect(handler).toHaveBeenCalledWith(configData, expect.any(Object));
        });
    });

    describe('Event Priorities and Ordering', () => {
        it('should support priority-based event handling', () => {
            const callOrder = [];
            const lowPriorityHandler = vi.fn(() => callOrder.push('low'));
            const highPriorityHandler = vi.fn(() => callOrder.push('high'));
            const mediumPriorityHandler = vi.fn(() => callOrder.push('medium'));
            
            eventDispatcher.on('test-event', lowPriorityHandler, { priority: 1 });
            eventDispatcher.on('test-event', mediumPriorityHandler, { priority: 5 });
            eventDispatcher.on('test-event', highPriorityHandler, { priority: 10 });
            
            eventDispatcher.emit('test-event', {});
            
            expect(callOrder).toEqual(['high', 'medium', 'low']);
        });

        it('should handle same priority listeners in registration order', () => {
            const callOrder = [];
            const handler1 = vi.fn(() => callOrder.push('first'));
            const handler2 = vi.fn(() => callOrder.push('second'));
            
            eventDispatcher.on('test-event', handler1, { priority: 5 });
            eventDispatcher.on('test-event', handler2, { priority: 5 });
            
            eventDispatcher.emit('test-event', {});
            
            expect(callOrder).toEqual(['first', 'second']);
        });
    });

    describe('Event Filtering and Conditions', () => {
        it('should support conditional event handlers', () => {
            const handler = vi.fn();
            const condition = (data) => data.value > 10;
            
            eventDispatcher.on('test-event', handler, { condition });
            
            eventDispatcher.emit('test-event', { value: 5 });
            eventDispatcher.emit('test-event', { value: 15 });
            
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith({ value: 15 }, expect.any(Object));
        });

        it('should support context-based filtering', () => {
            const handler = vi.fn();
            const context = 'gameplay';
            
            eventDispatcher.on('test-event', handler, { context });
            
            eventDispatcher.emit('test-event', {}, { context: 'menu' });
            eventDispatcher.emit('test-event', {}, { context: 'gameplay' });
            
            expect(handler).toHaveBeenCalledTimes(1);
        });
    });

    describe('Event Propagation Control', () => {
        it('should support stopping event propagation', () => {
            const handler1 = vi.fn((data, event) => event.stopPropagation());
            const handler2 = vi.fn();
            
            eventDispatcher.on('test-event', handler1);
            eventDispatcher.on('test-event', handler2);
            
            eventDispatcher.emit('test-event', {});
            
            expect(handler1).toHaveBeenCalled();
            expect(handler2).not.toHaveBeenCalled();
        });

        it('should support preventing default behavior', () => {
            const handler = vi.fn((data, event) => event.preventDefault());
            
            eventDispatcher.on('test-event', handler);
            const eventResult = eventDispatcher.emit('test-event', {});
            
            expect(eventResult.defaultPrevented).toBe(true);
        });
    });

    describe('Performance and Memory Management', () => {
        it('should handle many rapid events efficiently', () => {
            const handler = vi.fn();
            eventDispatcher.on('rapid-event', handler);
            
            const start = performance.now();
            
            for (let i = 0; i < 1000; i++) {
                eventDispatcher.emit('rapid-event', { index: i });
            }
            
            const end = performance.now();
            const duration = end - start;
            
            expect(duration).toBeLessThan(100); // Should handle 1000 events in < 100ms
            expect(handler).toHaveBeenCalledTimes(1000);
        });

        it('should clean up listeners on disposal', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            
            eventDispatcher.on('event1', handler1);
            eventDispatcher.on('event2', handler2);
            
            expect(eventDispatcher.getTotalListenerCount()).toBe(2);
            
            eventDispatcher.dispose();
            
            expect(eventDispatcher.getTotalListenerCount()).toBe(0);
        });

        it('should handle memory cleanup for removed listeners', () => {
            const handlers = [];
            
            // Register many handlers
            for (let i = 0; i < 100; i++) {
                const handler = vi.fn();
                handlers.push(handler);
                eventDispatcher.on('test-event', handler);
            }
            
            expect(eventDispatcher.getListenerCount('test-event')).toBe(100);
            
            // Remove all handlers
            handlers.forEach(handler => {
                eventDispatcher.off('test-event', handler);
            });
            
            expect(eventDispatcher.getListenerCount('test-event')).toBe(0);
        });
    });

    describe('Event History and Debugging', () => {
        it('should track event emission history when debugging enabled', () => {
            eventDispatcher.setDebugging(true);
            
            eventDispatcher.emit('event1', { data: 'first' });
            eventDispatcher.emit('event2', { data: 'second' });
            
            const history = eventDispatcher.getEventHistory();
            expect(history).toHaveLength(2);
            expect(history[0].eventType).toBe('event1');
            expect(history[1].eventType).toBe('event2');
        });

        it('should limit event history size', () => {
            eventDispatcher.setDebugging(true);
            eventDispatcher.setMaxHistorySize(5);
            
            for (let i = 0; i < 10; i++) {
                eventDispatcher.emit('test-event', { index: i });
            }
            
            const history = eventDispatcher.getEventHistory();
            expect(history).toHaveLength(5);
            expect(history[0].data.index).toBe(5); // Should keep most recent 5
        });

        it('should provide listener introspection', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            
            eventDispatcher.on('event1', handler1);
            eventDispatcher.on('event2', handler2);
            
            const eventTypes = eventDispatcher.getRegisteredEventTypes();
            expect(eventTypes).toContain('event1');
            expect(eventTypes).toContain('event2');
            expect(eventTypes).toHaveLength(2);
        });
    });

    describe('Error Handling and Resilience', () => {
        it('should handle invalid event types gracefully', () => {
            expect(() => {
                eventDispatcher.on(null, vi.fn());
            }).toThrow('Event type must be a non-empty string');
            
            expect(() => {
                eventDispatcher.on('', vi.fn());
            }).toThrow('Event type must be a non-empty string');
        });

        it('should handle invalid handlers gracefully', () => {
            expect(() => {
                eventDispatcher.on('test-event', null);
            }).toThrow('Event handler must be a function');
            
            expect(() => {
                eventDispatcher.on('test-event', 'not a function');
            }).toThrow('Event handler must be a function');
        });

        it('should continue processing after handler errors', () => {
            const errorHandler = vi.fn(() => { throw new Error('Handler failed'); });
            const successHandler = vi.fn();
            
            eventDispatcher.on('test-event', errorHandler);
            eventDispatcher.on('test-event', successHandler);
            
            const errorSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            
            eventDispatcher.emit('test-event', {});
            
            expect(errorHandler).toHaveBeenCalled();
            expect(successHandler).toHaveBeenCalled();
            expect(errorSpy).toHaveBeenCalled();
            
            errorSpy.mockRestore();
        });

        it('should handle disposal errors gracefully', () => {
            const problematicHandler = vi.fn();
            // Make the handler throw during cleanup
            problematicHandler.dispose = vi.fn(() => { throw new Error('Cleanup failed'); });
            
            eventDispatcher.on('test-event', problematicHandler);
            
            expect(() => {
                eventDispatcher.dispose();
            }).not.toThrow();
        });
    });

    describe('GameEvent Class', () => {
        it('should create game events with proper structure', () => {
            const eventData = { value: 42 };
            const gameEvent = new GameEvent('test-type', eventData);
            
            expect(gameEvent.type).toBe('test-type');
            expect(gameEvent.data).toBe(eventData);
            expect(gameEvent.timestamp).toBeTypeOf('number');
            expect(gameEvent.defaultPrevented).toBe(false);
            expect(gameEvent.propagationStopped).toBe(false);
        });

        it('should support event control methods', () => {
            const gameEvent = new GameEvent('test-type', {});
            
            gameEvent.preventDefault();
            expect(gameEvent.defaultPrevented).toBe(true);
            
            gameEvent.stopPropagation();
            expect(gameEvent.propagationStopped).toBe(true);
        });

        it('should include metadata in events', () => {
            const metadata = { source: 'test', context: 'unit-test' };
            const gameEvent = new GameEvent('test-type', {}, metadata);
            
            expect(gameEvent.metadata).toMatchObject(metadata);
        });
    });
});