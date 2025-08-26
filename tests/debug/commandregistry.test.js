// CommandRegistry basic test coverage
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the debug-spawner import
vi.mock('../../dist/debug/debug-spawner.js', () => ({
    DebugSpawner: vi.fn().mockImplementation(() => ({
        spawnStar: vi.fn(),
        spawnPlanet: vi.fn(),
        spawnAsteroid: vi.fn()
    }))
}));

import { CommandRegistry } from '../../dist/debug/CommandRegistry.js';

describe('CommandRegistry', () => {
    let commandRegistry;
    let mockCommand;
    let mockContext;

    beforeEach(() => {
        commandRegistry = new CommandRegistry();
        
        mockCommand = {
            name: 'test',
            description: 'Test command',
            parameters: [],
            execute: vi.fn()
        };

        mockContext = {
            camera: { x: 0, y: 0 },
            chunkManager: {}
        };
    });

    describe('Initialization', () => {
        it('should initialize CommandRegistry', () => {
            expect(commandRegistry).toBeDefined();
            expect(commandRegistry.commands).toBeDefined();
        });

        it('should register default commands', () => {
            const commands = commandRegistry.getAllCommands();
            expect(commands.length).toBeGreaterThan(0);
        });
    });

    describe('Command Registration', () => {
        it('should register commands', () => {
            commandRegistry.register(mockCommand);
            
            const retrievedCommand = commandRegistry.getCommand('test');
            expect(retrievedCommand).toBe(mockCommand);
        });

        it('should get all commands', () => {
            const initialCount = commandRegistry.getAllCommands().length;
            commandRegistry.register(mockCommand);
            
            const commands = commandRegistry.getAllCommands();
            expect(commands.length).toBe(initialCount + 1);
            expect(commands).toContain(mockCommand);
        });
    });

    describe('Command Execution', () => {
        beforeEach(() => {
            commandRegistry.register(mockCommand);
        });

        it('should execute valid commands', () => {
            const result = commandRegistry.execute('test', mockContext);
            
            expect(mockCommand.execute).toHaveBeenCalledWith([], mockContext);
            expect(result).toBe(''); // Success returns empty string
        });

        it('should handle unknown commands', () => {
            const result = commandRegistry.execute('unknown', mockContext);
            
            expect(result).toContain('❌ Unknown command');
            expect(result).toContain('unknown');
        });

        it('should handle command execution errors', () => {
            mockCommand.execute.mockImplementation(() => {
                throw new Error('Test error');
            });
            
            const result = commandRegistry.execute('test', mockContext);
            
            expect(result).toContain('❌ Command failed');
            expect(result).toContain('Test error');
        });

        it('should handle empty input', () => {
            const result = commandRegistry.execute('', mockContext);
            
            expect(result).toContain('❌');
        });

        it('should handle whitespace-only input', () => {
            const result = commandRegistry.execute('   ', mockContext);
            
            expect(result).toContain('❌');
        });
    });

    describe('Command Parsing', () => {
        it('should parse command input', () => {
            const parsed = commandRegistry.parseCommand('test arg1 arg2');
            
            expect(parsed).toBeDefined();
            expect(parsed.isValid).toBe(true);
            expect(parsed.command).toBe('test');
            expect(parsed.parameters).toEqual(['arg1', 'arg2']);
        });

        it('should parse parameters', () => {
            const parsed = commandRegistry.parseCommand('test arg1 arg2');
            
            expect(parsed.isValid).toBe(true);
            expect(parsed.parameters).toEqual(['arg1', 'arg2']);
        });

        it('should handle malformed input', () => {
            const parsed = commandRegistry.parseCommand('');
            
            expect(parsed.isValid).toBe(false);
            expect(parsed.error).toBeDefined();
        });
    });

    describe('Parameter Validation', () => {
        it('should validate command parameters', () => {
            const commandWithParams = {
                name: 'paramtest',
                description: 'Test with parameters',
                parameters: [
                    { name: 'required', type: 'string', required: true }
                ],
                execute: vi.fn()
            };

            commandRegistry.register(commandWithParams);
            
            const result = commandRegistry.execute('paramtest', mockContext);
            expect(result).toContain('❌'); // Should fail validation
        });

        it('should accept valid parameters', () => {
            const commandWithParams = {
                name: 'paramtest',
                description: 'Test with parameters',
                parameters: [
                    { name: 'required', type: 'string', required: true }
                ],
                execute: vi.fn()
            };

            commandRegistry.register(commandWithParams);
            
            const result = commandRegistry.execute('paramtest value', mockContext);
            expect(commandWithParams.execute).toHaveBeenCalled();
        });
    });

    describe('Autocompletion', () => {
        beforeEach(() => {
            commandRegistry.register(mockCommand);
            commandRegistry.register({
                name: 'testother',
                description: 'Another test command',
                parameters: [],
                execute: vi.fn()
            });
        });

        it('should provide autocompletion suggestions', () => {
            const suggestions = commandRegistry.getAutocompleteSuggestions('te');
            
            expect(Array.isArray(suggestions)).toBe(true);
            expect(suggestions.some(s => s.startsWith('te'))).toBe(true);
        });

        it('should return commands for empty input', () => {
            const suggestions = commandRegistry.getAutocompleteSuggestions('');
            
            expect(Array.isArray(suggestions)).toBe(true);
            expect(suggestions.length).toBeGreaterThan(0);
            expect(suggestions.length).toBeLessThanOrEqual(5);
        });

        it('should filter suggestions by prefix', () => {
            const suggestions = commandRegistry.getAutocompleteSuggestions('test');
            
            expect(suggestions.every(s => s.startsWith('test'))).toBe(true);
        });
    });

    describe('Built-in Commands', () => {
        it('should include help command', () => {
            const helpCommand = commandRegistry.getCommand('help');
            expect(helpCommand).toBeDefined();
        });

        it('should execute help command', () => {
            const result = commandRegistry.execute('help', mockContext);
            expect(result).toBe(''); // Help should execute successfully
        });

        it('should include clear command', () => {
            const clearCommand = commandRegistry.getCommand('clear');
            expect(clearCommand).toBeDefined();
        });
    });
});