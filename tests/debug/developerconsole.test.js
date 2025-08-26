// DeveloperConsole basic test coverage
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeveloperConsole } from '../../dist/debug/DeveloperConsole.js';

// Mock console to prevent interference with test output
const originalConsole = global.console;
global.console = {
    ...originalConsole,
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
};

describe('DeveloperConsole', () => {
    let developerConsole;
    let mockCommandRegistry;
    let mockCamera;
    let mockChunkManager;

    beforeEach(() => {
        mockCommandRegistry = {
            execute: vi.fn(() => 'Command executed successfully'),
            getAutocompleteSuggestions: vi.fn(() => ['suggestion1', 'suggestion2'])
        };

        mockCamera = {
            x: 1000,
            y: 2000
        };

        mockChunkManager = {
            updateActiveChunks: vi.fn()
        };

        developerConsole = new DeveloperConsole(mockCommandRegistry, mockCamera, mockChunkManager);
    });

    describe('Initialization', () => {
        it('should initialize DeveloperConsole', () => {
            expect(developerConsole).toBeDefined();
            expect(developerConsole.commandRegistry).toBe(mockCommandRegistry);
            expect(developerConsole.camera).toBe(mockCamera);
            expect(developerConsole.chunkManager).toBe(mockChunkManager);
        });

        it('should initialize with default state', () => {
            expect(developerConsole.isVisible).toBe(false);
            expect(developerConsole.inputText).toBe('');
            expect(Array.isArray(developerConsole.commandHistory)).toBe(true);
            expect(Array.isArray(developerConsole.messages)).toBe(true);
        });
    });

    describe('Visibility Toggle', () => {
        it('should toggle visibility', () => {
            expect(developerConsole.isVisible).toBe(false);
            
            developerConsole.toggle();
            expect(developerConsole.isVisible).toBe(true);
            
            developerConsole.toggle();
            expect(developerConsole.isVisible).toBe(false);
        });

        it('should report active state', () => {
            expect(developerConsole.isActive()).toBe(false);
            
            developerConsole.toggle();
            expect(developerConsole.isActive()).toBe(true);
        });
    });

    describe('Command Execution', () => {
        beforeEach(() => {
            developerConsole.toggle(); // Make console visible
        });

        it('should execute commands', () => {
            developerConsole.inputText = 'test command';
            developerConsole.executeCommand();
            
            expect(mockCommandRegistry.execute).toHaveBeenCalledWith('test command', {
                camera: mockCamera,
                chunkManager: mockChunkManager
            });
        });

        it('should clear input after command execution', () => {
            developerConsole.inputText = 'test command';
            developerConsole.executeCommand();
            
            expect(developerConsole.inputText).toBe('');
        });

        it('should add commands to history', () => {
            developerConsole.inputText = 'test command';
            developerConsole.executeCommand();
            
            expect(developerConsole.commandHistory).toContain('test command');
        });

        it('should not execute empty commands', () => {
            developerConsole.inputText = '';
            developerConsole.executeCommand();
            
            expect(mockCommandRegistry.execute).not.toHaveBeenCalled();
        });
    });

    describe('Key Input Handling', () => {
        beforeEach(() => {
            developerConsole.toggle(); // Make console visible
        });

        it('should handle text input', () => {
            const event = {
                preventDefault: vi.fn(),
                code: 'KeyA',
                key: 'a'
            };
            
            const handled = developerConsole.handleKeyInput(event);
            
            expect(handled).toBe(true);
            expect(developerConsole.inputText).toBe('a');
        });

        it('should handle Enter key to execute commands', () => {
            developerConsole.inputText = 'test';
            const event = {
                preventDefault: vi.fn(),
                code: 'Enter'
            };
            
            const handled = developerConsole.handleKeyInput(event);
            
            expect(handled).toBe(true);
            expect(mockCommandRegistry.execute).toHaveBeenCalled();
        });

        it('should handle Escape key to close console', () => {
            const event = {
                preventDefault: vi.fn(),
                code: 'Escape'
            };
            
            const handled = developerConsole.handleKeyInput(event);
            
            expect(handled).toBe(true);
            expect(developerConsole.isVisible).toBe(false);
        });

        it('should handle Backspace key', () => {
            developerConsole.inputText = 'test';
            const event = {
                preventDefault: vi.fn(),
                code: 'Backspace'
            };
            
            const handled = developerConsole.handleKeyInput(event);
            
            expect(handled).toBe(true);
            expect(developerConsole.inputText).toBe('tes');
        });

        it('should not handle input when console is not visible', () => {
            developerConsole.isVisible = false;
            const event = {
                preventDefault: vi.fn(),
                code: 'KeyA',
                key: 'a'
            };
            
            const handled = developerConsole.handleKeyInput(event);
            
            expect(handled).toBe(false);
            expect(event.preventDefault).not.toHaveBeenCalled();
        });
    });

    describe('Command History', () => {
        beforeEach(() => {
            developerConsole.toggle();
            // Add some commands to history
            developerConsole.inputText = 'command1';
            developerConsole.executeCommand();
            developerConsole.inputText = 'command2';
            developerConsole.executeCommand();
        });

        it('should navigate history with arrow keys', () => {
            const upEvent = {
                preventDefault: vi.fn(),
                code: 'ArrowUp'
            };
            
            const handled = developerConsole.handleKeyInput(upEvent);
            expect(handled).toBe(true);
            
            const downEvent = {
                preventDefault: vi.fn(),
                code: 'ArrowDown'
            };
            
            const handled2 = developerConsole.handleKeyInput(downEvent);
            expect(handled2).toBe(true);
        });

        it('should limit history size', () => {
            // Add many commands to test limit
            for (let i = 0; i < 25; i++) {
                developerConsole.inputText = `command${i}`;
                developerConsole.executeCommand();
            }
            
            expect(developerConsole.commandHistory.length).toBeLessThanOrEqual(20);
        });
    });

    describe('Message System', () => {
        it('should add messages', () => {
            const messageCount = developerConsole.messages.length;
            developerConsole.addMessage('Test message', 'output');
            
            expect(developerConsole.messages.length).toBe(messageCount + 1);
        });

        it('should limit message count', () => {
            // Add more messages than the limit
            for (let i = 0; i < 60; i++) {
                developerConsole.addMessage(`Message ${i}`, 'output');
            }
            
            expect(developerConsole.messages.length).toBeLessThanOrEqual(developerConsole.maxMessages);
        });
    });
});