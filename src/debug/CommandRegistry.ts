// Command registry system for developer console
// Provides extensible command infrastructure with parameter validation and auto-completion

import { DebugSpawner } from './debug-spawner.js';

interface ParameterDefinition {
    name: string;
    type: 'string' | 'number' | 'enum';
    optional: boolean;
    values?: string[]; // For enum types
    description: string;
}

interface CommandDefinition {
    name: string;
    description: string;
    parameters: ParameterDefinition[];
    execute: (params: any[], context: CommandContext) => void;
    autocomplete?: (partial: string) => string[];
}

export interface CommandContext {
    camera: any; // TODO: Import Camera type when available
    chunkManager: any; // TODO: Import ChunkManager type when available
    debugSpawner?: any; // TODO: Import DebugSpawner type when available
}

interface ParsedCommand {
    command: string;
    parameters: string[];
    isValid: boolean;
    error?: string;
}

export class CommandRegistry {
    private commands: Map<string, CommandDefinition> = new Map();
    
    constructor() {
        this.registerDefaultCommands();
    }
    
    register(command: CommandDefinition): void {
        this.commands.set(command.name, command);
    }
    
    execute(input: string, context: CommandContext): string {
        const parsed = this.parseCommand(input);
        
        if (!parsed.isValid) {
            return `❌ ${parsed.error}`;
        }
        
        const command = this.commands.get(parsed.command);
        if (!command) {
            return `❌ Unknown command: ${parsed.command}. Type 'help' for available commands.`;
        }
        
        // Validate parameters
        const validation = this.validateParameters(command, parsed.parameters);
        if (!validation.isValid) {
            return `❌ ${validation.error}`;
        }
        
        try {
            command.execute(parsed.parameters, context);
            return ''; // Success - no message needed
        } catch (error) {
            return `❌ Command failed: ${error.message}`;
        }
    }
    
    getCommand(name: string): CommandDefinition | undefined {
        return this.commands.get(name);
    }
    
    getAllCommands(): CommandDefinition[] {
        return Array.from(this.commands.values());
    }
    
    getAutocompleteSuggestions(input: string): string[] {
        const trimmed = input.trim();
        if (!trimmed) {
            return Array.from(this.commands.keys()).slice(0, 5);
        }
        
        const words = trimmed.split(' ');
        const commandName = words[0];
        
        if (words.length === 1) {
            // Completing command name
            return Array.from(this.commands.keys())
                .filter(cmd => cmd.startsWith(commandName))
                .slice(0, 5);
        }
        
        // Completing parameters
        const command = this.commands.get(commandName);
        if (command && command.autocomplete) {
            const partial = words.slice(1).join(' ');
            return command.autocomplete(partial);
        }
        
        return [];
    }
    
    private parseCommand(input: string): ParsedCommand {
        const trimmed = input.trim();
        if (!trimmed) {
            return {
                command: '',
                parameters: [],
                isValid: false,
                error: 'Empty command'
            };
        }
        
        const parts = trimmed.split(/\s+/);
        const command = parts[0];
        const parameters = parts.slice(1);
        
        return {
            command,
            parameters,
            isValid: true
        };
    }
    
    private validateParameters(command: CommandDefinition, params: string[]): { isValid: boolean; error?: string } {
        const requiredParams = command.parameters.filter(p => !p.optional);
        
        if (params.length < requiredParams.length) {
            return {
                isValid: false,
                error: `Missing required parameters. Expected: ${command.parameters.map(p => p.optional ? `[${p.name}]` : p.name).join(' ')}`
            };
        }
        
        if (params.length > command.parameters.length) {
            return {
                isValid: false,
                error: `Too many parameters. Expected: ${command.parameters.map(p => p.optional ? `[${p.name}]` : p.name).join(' ')}`
            };
        }
        
        // Type validation
        for (let i = 0; i < params.length; i++) {
            const param = params[i];
            const definition = command.parameters[i];
            
            if (definition.type === 'number') {
                const num = parseFloat(param);
                if (isNaN(num)) {
                    return {
                        isValid: false,
                        error: `Parameter '${definition.name}' must be a number, got: ${param}`
                    };
                }
            } else if (definition.type === 'enum' && definition.values) {
                if (!definition.values.includes(param)) {
                    return {
                        isValid: false,
                        error: `Parameter '${definition.name}' must be one of: ${definition.values.join(', ')}`
                    };
                }
            }
        }
        
        return { isValid: true };
    }
    
    private registerDefaultCommands(): void {
        // Help command
        this.register({
            name: 'help',
            description: 'Show available commands or detailed help for a specific command',
            parameters: [
                { name: 'command', type: 'string', optional: true, description: 'Command to get help for' }
            ],
            execute: (params: string[], context: CommandContext) => {
                if (params.length === 0) {
                    this.showGeneralHelp();
                } else {
                    this.showCommandHelp(params[0]);
                }
            },
            autocomplete: (partial: string) => {
                return Array.from(this.commands.keys())
                    .filter(cmd => cmd.startsWith(partial))
                    .slice(0, 5);
            }
        });
        
        // List command
        this.register({
            name: 'list',
            description: 'Show available types for spawning objects',
            parameters: [
                { name: 'object_type', type: 'enum', optional: false, 
                  values: ['star', 'planet', 'nebula', 'asteroid', 'blackhole', 'comet', 'wormhole'],
                  description: 'Object type to list variants for' }
            ],
            execute: (params: string[], context: CommandContext) => {
                this.showObjectTypesList(params[0]);
            },
            autocomplete: (partial: string) => {
                const types = ['star', 'planet', 'nebula', 'asteroid', 'blackhole', 'comet', 'wormhole'];
                return types.filter(type => type.startsWith(partial));
            }
        });
        
        // Inspect command
        this.register({
            name: 'inspect',
            description: 'Inspect current chunk contents',
            parameters: [],
            execute: (params: string[], context: CommandContext) => {
                this.inspectCurrentChunk(context);
            }
        });
        
        // Clear command
        this.register({
            name: 'clear',
            description: 'Clear debug objects from current chunk',
            parameters: [
                { name: 'scope', type: 'enum', optional: true, 
                  values: ['all'], description: 'Clear all debug objects in loaded chunks' }
            ],
            execute: (params: string[], context: CommandContext) => {
                this.clearDebugObjects(context, params[0] === 'all');
            }
        });
        
        // Spawn command
        this.register({
            name: 'spawn',
            description: 'Spawn celestial objects for testing',
            parameters: [
                { name: 'object_type', type: 'enum', optional: false,
                  values: ['star', 'planet', 'nebula', 'asteroid', 'blackhole', 'comet', 'wormhole'],
                  description: 'Type of object to spawn' },
                { name: 'variant', type: 'string', optional: true,
                  description: 'Specific variant (use "list <type>" to see options)' },
                { name: 'distance', type: 'number', optional: true,
                  description: 'Distance from player in pixels' }
            ],
            execute: (params: string[], context: CommandContext) => {
                this.spawnObject(params, context);
            },
            autocomplete: (partial: string) => {
                const words = partial.split(' ');
                if (words.length === 1) {
                    // Complete object type
                    const types = ['star', 'planet', 'nebula', 'asteroid', 'blackhole', 'comet', 'wormhole'];
                    return types.filter(type => type.startsWith(words[0]));
                } else if (words.length === 2) {
                    // Complete variant based on object type
                    return this.getVariantsForType(words[0]).filter(variant => 
                        variant.startsWith(words[1])
                    );
                }
                return [];
            }
        });
    }
    
    private showGeneralHelp(): void {
        console.log('🛠️ Developer Console Commands:');
        console.log('Available commands:');
        
        for (const [name, command] of this.commands) {
            const paramStr = command.parameters
                .map(p => p.optional ? `[${p.name}]` : p.name)
                .join(' ');
            console.log(`  ${name} ${paramStr} - ${command.description}`);
        }
        
        console.log('');
        console.log('Use "help <command>" for detailed information about a specific command.');
    }
    
    private showCommandHelp(commandName: string): void {
        const command = this.commands.get(commandName);
        if (!command) {
            console.log(`❌ Unknown command: ${commandName}`);
            return;
        }
        
        console.log(`📖 Help for '${commandName}':`);
        console.log(`  ${command.description}`);
        
        if (command.parameters.length > 0) {
            console.log('  Parameters:');
            for (const param of command.parameters) {
                const optional = param.optional ? ' (optional)' : '';
                const values = param.values ? ` - Options: ${param.values.join(', ')}` : '';
                console.log(`    ${param.name}: ${param.description}${optional}${values}`);
            }
        } else {
            console.log('  No parameters required.');
        }
    }
    
    private showObjectTypesList(objectType: string): void {
        const types = {
            star: ['red-giant', 'blue-giant', 'white-dwarf', 'yellow-dwarf', 'orange-dwarf', 'red-dwarf'],
            planet: ['rocky', 'gas-giant', 'ocean', 'desert', 'volcanic', 'frozen', 'exotic'],
            nebula: ['emission', 'reflection', 'planetary', 'dark'],
            asteroid: ['metallic', 'carbonaceous', 'ice', 'mixed'],
            blackhole: ['stellar', 'intermediate', 'supermassive'],
            comet: ['short-period', 'long-period', 'non-periodic'],
            wormhole: ['(no variants - generates linked pair)']
        };
        
        const variants = types[objectType];
        if (variants) {
            console.log(`📋 Available ${objectType} types:`);
            variants.forEach(variant => console.log(`  - ${variant}`));
        } else {
            console.log(`❌ Unknown object type: ${objectType}`);
        }
    }
    
    private inspectCurrentChunk(context: CommandContext): void {
        // Import DebugSpawner functionality
        if (context.camera && context.chunkManager) {
            // Use existing inspect functionality from DebugSpawner
            DebugSpawner.inspectCurrentChunk(context.camera, context.chunkManager);
        } else {
            console.log('❌ Camera or ChunkManager not available');
        }
    }
    
    private clearDebugObjects(context: CommandContext, clearAll: boolean): void {
        if (!context.chunkManager) {
            console.log('❌ ChunkManager not available');
            return;
        }
        
        const chunkManager = context.chunkManager;
        let clearedCount = 0;
        
        if (clearAll) {
            // Clear debug objects from all loaded chunks
            for (const [chunkKey, chunk] of chunkManager.activeChunks) {
                if (chunkManager.debugObjects) {
                    const beforeCount = chunkManager.debugObjects.length;
                    chunkManager.debugObjects = chunkManager.debugObjects.filter(obj => {
                        const objChunkCoords = chunkManager.getChunkCoords(obj.x, obj.y);
                        const objChunkKey = chunkManager.getChunkKey(objChunkCoords.x, objChunkCoords.y);
                        return objChunkKey !== chunkKey;
                    });
                    clearedCount += beforeCount - chunkManager.debugObjects.length;
                }
            }
            console.log(`🗑️ Cleared ${clearedCount} debug objects from all loaded chunks`);
        } else {
            // Clear debug objects from current chunk only
            if (context.camera && chunkManager.debugObjects) {
                const playerChunkCoords = chunkManager.getChunkCoords(context.camera.x, context.camera.y);
                const playerChunkKey = chunkManager.getChunkKey(playerChunkCoords.x, playerChunkCoords.y);
                
                const beforeCount = chunkManager.debugObjects.length;
                chunkManager.debugObjects = chunkManager.debugObjects.filter(obj => {
                    const objChunkCoords = chunkManager.getChunkCoords(obj.x, obj.y);
                    const objChunkKey = chunkManager.getChunkKey(objChunkCoords.x, objChunkCoords.y);
                    return objChunkKey !== playerChunkKey;
                });
                clearedCount = beforeCount - chunkManager.debugObjects.length;
                console.log(`🗑️ Cleared ${clearedCount} debug objects from current chunk`);
            }
        }
    }
    
    private spawnObject(params: string[], context: CommandContext): void {
        if (!context.camera || !context.chunkManager) {
            console.log('❌ Camera or ChunkManager not available');
            return;
        }
        
        const objectType = params[0];
        const variant = params[1] || null;
        const distance = params[2] ? parseFloat(params[2]) : null;
        
        // Use imported DebugSpawner
        
        try {
            switch (objectType) {
                case 'wormhole':
                    DebugSpawner.spawnWormholePair(context.camera, context.chunkManager, true);
                    console.log('🌀 Spawned wormhole pair for testing');
                    break;
                    
                case 'blackhole':
                    DebugSpawner.spawnBlackHole(context.camera, context.chunkManager, true);
                    console.log('🕳️ Spawned black hole for testing');
                    break;
                    
                case 'star':
                case 'planet':
                case 'nebula':
                case 'asteroid':
                case 'comet':
                    // Enhanced spawning will be implemented in Phase 2 enhancement
                    console.log(`📋 Enhanced spawning for ${objectType} not yet implemented`);
                    console.log(`   Use existing debug hotkeys: Shift+W (wormhole), Shift+B (blackhole)`);
                    break;
                    
                default:
                    console.log(`❌ Unknown object type: ${objectType}`);
                    break;
            }
        } catch (error) {
            console.log(`❌ Failed to spawn ${objectType}: ${error.message}`);
        }
    }
    
    private getVariantsForType(objectType: string): string[] {
        const variants = {
            star: ['red-giant', 'blue-giant', 'white-dwarf', 'yellow-dwarf', 'orange-dwarf', 'red-dwarf'],
            planet: ['rocky', 'gas-giant', 'ocean', 'desert', 'volcanic', 'frozen', 'exotic'],
            nebula: ['emission', 'reflection', 'planetary', 'dark'],
            asteroid: ['metallic', 'carbonaceous', 'ice', 'mixed'],
            blackhole: ['stellar', 'intermediate', 'supermassive'],
            comet: ['short-period', 'long-period', 'non-periodic'],
            wormhole: []
        };
        
        return variants[objectType] || [];
    }
}