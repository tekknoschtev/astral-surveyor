// Command registry system for developer console
// Provides extensible command infrastructure with parameter validation and auto-completion

import { DebugSpawner } from './debug-spawner.js';
import type { Camera } from '../camera/camera.js';
import type { ChunkManager } from '../world/ChunkManager.js';

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
    execute: (params: string[], context: CommandContext) => void;
    autocomplete?: (partial: string) => string[];
    customValidation?: (params: string[]) => { isValid: boolean; error?: string };
}

export interface CommandContext {
    camera: Camera;
    chunkManager: ChunkManager;
    debugSpawner?: typeof DebugSpawner;
    stellarMap?: any; // StellarMap instance for inspector commands
    getCurrentSeed?: () => number; // Function to get current universe seed
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
        // Use custom validation if available
        if (command.customValidation) {
            return command.customValidation(params);
        }
        
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
                  values: ['star', 'planet', 'nebula', 'asteroid', 'blackhole', 'comet', 'rogue-planet', 'dark-nebula', 'crystal-garden', 'wormhole'],
                  description: 'Object type to list variants for' }
            ],
            execute: (params: string[], context: CommandContext) => {
                this.showObjectTypesList(params[0]);
            },
            autocomplete: (partial: string) => {
                const types = ['star', 'planet', 'nebula', 'asteroid', 'blackhole', 'comet', 'rogue-planet', 'dark-nebula', 'crystal-garden', 'wormhole'];
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
                  values: ['star', 'planet', 'nebula', 'asteroid', 'blackhole', 'comet', 'rogue-planet', 'dark-nebula', 'crystal-garden', 'wormhole'],
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
                    const types = ['star', 'planet', 'nebula', 'asteroid', 'blackhole', 'comet', 'rogue-planet', 'dark-nebula', 'crystal-garden', 'wormhole'];
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
        
        // Set command for toggling debug settings
        this.register({
            name: 'set',
            description: 'Set debug configuration values (usage: set chunkBoundaries true)',
            parameters: [
                { name: 'setting', type: 'enum', optional: false,
                  values: ['chunkBoundaries'],
                  description: 'Setting to modify' },
                { name: 'value', type: 'enum', optional: false,
                  values: ['true', 'false'],
                  description: 'Value to set (true/false)' }
            ],
            execute: (params: string[], context: CommandContext) => {
                this.setSetting(params[0], params[1]);
            },
            autocomplete: (partial: string) => {
                const words = partial.split(' ');
                if (words.length === 1) {
                    // Complete setting name
                    const settings = ['chunkBoundaries'];
                    return settings.filter(setting => setting.startsWith(words[0]));
                } else if (words.length === 2) {
                    // Complete value
                    const values = ['true', 'false'];
                    return values.filter(value => value.startsWith(words[1]));
                }
                return [];
            }
        });

        // Seed inspector commands
        this.register({
            name: 'seed-inspect',
            description: 'Reveal inspector chunks. Usage: seed-inspect [seed] [-r radius]',
            parameters: [
                { name: 'seed', type: 'string', optional: true, description: 'Universe seed to inspect - text or number (defaults to current)' },
                { name: '-r radius', type: 'string', optional: true, description: 'Specify radius: -r 10 (default: 5 chunks)' }
            ],
            customValidation: (params: string[]) => {
                // Custom validation for flag-based parameters
                let i = 0;
                let foundSeed = false;
                let foundRadius = false;
                
                while (i < params.length) {
                    const param = params[i];
                    
                    if (param === '-r') {
                        if (foundRadius) {
                            return { isValid: false, error: 'Duplicate -r flag' };
                        }
                        if (i + 1 >= params.length) {
                            return { isValid: false, error: '-r flag requires a radius value' };
                        }
                        const radius = parseInt(params[i + 1]);
                        if (isNaN(radius) || radius < 0) {
                            return { isValid: false, error: 'Invalid radius - must be a positive number' };
                        }
                        foundRadius = true;
                        i += 2; // Skip both -r and radius value
                    } else {
                        if (foundSeed) {
                            return { isValid: false, error: 'Multiple seed values provided' };
                        }
                        // Accept both text and numeric seeds
                        foundSeed = true;
                        i++;
                    }
                }
                
                return { isValid: true };
            },
            execute: (params: string[], context: CommandContext) => {
                this.seedInspect(params, context);
            }
        });



        this.register({
            name: 'map-clear-revealed',
            description: 'Clear all revealed inspector chunks',
            parameters: [
                { name: 'seed', type: 'number', optional: true, description: 'Clear only chunks for specific seed' }
            ],
            execute: (params: string[], context: CommandContext) => {
                this.mapClearRevealed(params, context);
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
            comet: ['ice', 'dust', 'rocky', 'organic'],
            'rogue-planet': ['ice', 'rock', 'volcanic'],
            'dark-nebula': ['dense-core', 'wispy', 'globular'],
            'crystal-garden': ['pure', 'mixed', 'rare-earth'],
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
                    DebugSpawner.spawnBlackHole(context.camera, context.chunkManager, variant, true);
                    console.log(`🕳️ Spawned ${variant || 'random'} black hole for testing`);
                    break;
                    
                case 'star':
                    DebugSpawner.spawnStar(context.camera, context.chunkManager, variant, true);
                    console.log(`⭐ Spawned ${variant || 'random'} star for testing`);
                    break;
                    
                case 'planet':
                    DebugSpawner.spawnPlanet(context.camera, context.chunkManager, variant, true);
                    console.log(`🪐 Spawned ${variant || 'random'} planet for testing`);
                    break;
                    
                case 'nebula':
                    DebugSpawner.spawnNebula(context.camera, context.chunkManager, variant, true);
                    console.log(`🌌 Spawned ${variant || 'random'} nebula for testing`);
                    break;
                    
                case 'asteroid':
                    DebugSpawner.spawnAsteroidGarden(context.camera, context.chunkManager, variant, true);
                    console.log(`🪨 Spawned ${variant || 'random'} asteroid garden for testing`);
                    break;
                    
                case 'comet':
                    DebugSpawner.spawnComet(context.camera, context.chunkManager, variant, true);
                    console.log(`☄️ Spawned ${variant || 'random'} comet for testing`);
                    break;
                    
                case 'rogue-planet':
                    DebugSpawner.spawnRoguePlanet(context.camera, context.chunkManager, variant, true);
                    console.log(`🪐 Spawned ${variant || 'random'} rogue planet for testing`);
                    break;
                    
                case 'dark-nebula':
                    DebugSpawner.spawnDarkNebula(context.camera, context.chunkManager, variant, true);
                    console.log(`🌫️ Spawned ${variant || 'random'} dark nebula for testing`);
                    break;
                    
                case 'crystal-garden':
                    DebugSpawner.spawnCrystalGarden(context.camera, context.chunkManager, variant, true);
                    console.log(`💎 Spawned ${variant || 'random'} crystal garden for testing`);
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
            star: ['red-giant', 'blue-giant', 'white-dwarf', 'yellow-dwarf', 'orange-dwarf', 'red-dwarf', 'neutron-star'],
            planet: ['rocky', 'gas-giant', 'ocean', 'desert', 'volcanic', 'frozen', 'exotic'],
            nebula: ['emission', 'reflection', 'planetary', 'dark'],
            asteroid: ['metallic', 'crystalline', 'carbonaceous', 'icy'],
            blackhole: ['stellar-mass', 'supermassive'],
            comet: ['ice', 'dust', 'rocky', 'organic'],
            'rogue-planet': ['ice', 'rock', 'volcanic'],
            'dark-nebula': ['dense-core', 'wispy', 'globular'],
            'crystal-garden': ['pure', 'mixed', 'rare-earth'],
            wormhole: []
        };
        
        return variants[objectType] || [];
    }
    
    private setSetting(setting: string, value: string): void {
        // Import GameConfig dynamically to avoid circular dependencies
        import('../config/gameConfig.js').then(({ GameConfig }) => {
            const boolValue = value.toLowerCase() === 'true';
            
            switch (setting) {
                case 'chunkBoundaries':
                    // Enable debug mode when enabling chunk boundaries
                    if (boolValue && !GameConfig.debug.enabled) {
                        GameConfig.debug.enabled = true;
                        console.log(`🔧 Debug mode enabled for chunk boundaries`);
                    }
                    
                    GameConfig.debug.chunkBoundaries.enabled = boolValue;
                    console.log(`🔧 Chunk boundaries ${boolValue ? 'enabled' : 'disabled'}`);
                    
                    if (boolValue) {
                        console.log(`   Crosshairs: ${GameConfig.debug.chunkBoundaries.crosshairSize}px, Color: ${GameConfig.debug.chunkBoundaries.color}`);
                        console.log(`   Subdivisions: ${GameConfig.debug.chunkBoundaries.subdivisions.enabled ? 'enabled' : 'disabled'} (${(GameConfig.debug.chunkBoundaries.subdivisions.interval * 100)}% intervals)`);
                        console.log(`   Use 'set chunkBoundaries false' to disable`);
                    }
                    break;
                default:
                    console.log(`❌ Unknown setting: ${setting}`);
                    break;
            }
        });
    }

    /**
     * Handle seed-inspect command with positional parameters: [seed] [radius]
     */
    private async seedInspect(params: string[], context: CommandContext): Promise<void> {
        if (!context.stellarMap) {
            console.log('❌ Stellar map not available');
            return;
        }

        let seed: number;
        let radius: number = 5; // Default radius (matches old system ~121 chunks)
        
        // Parse parameters with support for -r flag
        let i = 0;
        while (i < params.length) {
            const param = params[i];
            
            if (param === '-r') {
                // Next parameter should be the radius
                if (i + 1 >= params.length) {
                    console.log('❌ -r flag requires a radius value');
                    return;
                }
                radius = parseInt(params[i + 1]);
                if (isNaN(radius) || radius < 0) {
                    console.log('❌ Invalid radius - must be a positive number');
                    return;
                }
                i += 2; // Skip both -r and the radius value
            } else {
                // This should be the seed (text or number)
                const parsedSeed = parseInt(param);
                if (isNaN(parsedSeed)) {
                    // Hash the string seed like the game does
                    seed = 0;
                    for (let j = 0; j < param.length; j++) {
                        const char = param.charCodeAt(j);
                        seed = ((seed << 5) - seed) + char;
                        seed = seed & seed;
                    }
                    seed = Math.abs(seed);
                } else {
                    seed = parsedSeed;
                }
                i++;
            }
        }
        
        // If no seed was provided, use current game seed
        if (seed === undefined) {
            if (!context.getCurrentSeed) {
                console.log('❌ Cannot access current game seed');
                return;
            }
            seed = context.getCurrentSeed();
        }

        // Performance warning for large areas
        if (radius > 20) {
            const totalChunks = (radius * 2 + 1) * (radius * 2 + 1);
            console.log(`⚠️ Large radius requested: ${totalChunks} chunks. This may take a while...`);
        }

        try {
            // Enable inspector mode if not already active
            if (!context.stellarMap.isInspectorMode() || context.stellarMap.inspectorSeed !== seed) {
                await context.stellarMap.enableInspectorMode(seed);
            }

            // Reveal chunks around current position
            const result = await context.stellarMap.revealChunks(
                seed, 
                context.camera.x, 
                context.camera.y, 
                radius
            );

            const seedSource = params.length >= 1 ? 'provided' : 'current game';
            const totalChunks = (radius * 2 + 1) * (radius * 2 + 1);
            console.log(`🔍 Revealed ${result.newChunks} new chunks for ${seedSource} seed ${seed}`);
            console.log(`📊 ${radius}-chunk radius covers ${totalChunks} total chunks`);
            
            if (result.newChunks === 0) {
                console.log('💡 All chunks in this area were already revealed');
            }
        } catch (error) {
            console.log(`❌ Failed to reveal chunks: ${error.message}`);
        }
    }




    /**
     * Handle map-clear-revealed command
     */
    private mapClearRevealed(params: string[], context: CommandContext): void {
        if (!context.stellarMap) {
            console.log('❌ Stellar map not available');
            return;
        }

        try {
            let seed: number | undefined;
            
            if (params.length > 0) {
                seed = parseInt(params[0]);
                if (isNaN(seed)) {
                    console.log('❌ Invalid seed number');
                    return;
                }
            }

            context.stellarMap.clearRevealedChunks(seed);
            
            // Clear inspector objects if clearing current seed
            if (!seed || (context.stellarMap.inspectorSeed === seed)) {
                context.stellarMap.inspectorObjects = [];
            }
        } catch (error) {
            console.log(`❌ Failed to clear revealed chunks: ${error.message}`);
        }
    }
}