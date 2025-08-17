// Plugin Manager Implementation
// Manages extensible plugin architecture for Astral Surveyor

import { 
    Plugin, 
    PluginAPI, 
    PluginInfo, 
    PluginType, 
    PluginSystemStatus,
    ICelestialFactory,
    IDiscoveryService,
    IAudioService
} from '../types/PluginTypes.js';

export interface IPluginManager {
    // Plugin registration
    registerPlugin(plugin: Plugin): void;
    unregisterPlugin(pluginId: string): void;
    
    // Plugin management
    enablePlugin(pluginId: string): void;
    disablePlugin(pluginId: string): void;
    getPluginInfo(pluginId: string): PluginInfo;
    
    // Plugin discovery
    getRegisteredPlugins(): string[];
    getPluginsByType(type: PluginType): PluginInfo[];
    getPluginCount(): number;
    
    // System status
    getSystemStatus(): PluginSystemStatus;
    
    // Lifecycle
    dispose(): void;
}

interface PluginManagerDependencies {
    celestialFactory: ICelestialFactory;
    discoveryService: IDiscoveryService;
    audioService: IAudioService;
}

interface RegisteredPlugin {
    plugin: Plugin;
    info: PluginInfo;
    api: PluginAPI;
}

export class PluginManager implements IPluginManager {
    public readonly celestialFactory: ICelestialFactory;
    public readonly discoveryService: IDiscoveryService;
    public readonly audioService: IAudioService;
    
    private plugins: Map<string, RegisteredPlugin> = new Map();
    private disposed: boolean = false;

    constructor(dependencies: PluginManagerDependencies) {
        if (!dependencies.celestialFactory) {
            throw new Error('CelestialFactory is required for plugin system');
        }
        if (!dependencies.discoveryService) {
            throw new Error('DiscoveryService is required for plugin system');
        }
        if (!dependencies.audioService) {
            throw new Error('AudioService is required for plugin system');
        }

        this.celestialFactory = dependencies.celestialFactory;
        this.discoveryService = dependencies.discoveryService;
        this.audioService = dependencies.audioService;
    }

    /**
     * Register a new plugin
     */
    registerPlugin(plugin: Plugin): void {
        this.ensureNotDisposed();
        this.validatePlugin(plugin);

        if (this.plugins.has(plugin.id)) {
            throw new Error(`Plugin with ID "${plugin.id}" is already registered`);
        }

        const api: PluginAPI = {
            celestialFactory: this.celestialFactory,
            discoveryService: this.discoveryService,
            audioService: this.audioService
        };

        try {
            // Register the plugin
            plugin.register(api);

            const pluginInfo: PluginInfo = {
                id: plugin.id,
                name: plugin.name,
                version: plugin.version,
                type: plugin.type,
                status: 'active',
                description: plugin.description,
                author: plugin.author,
                registeredAt: new Date()
            };

            this.plugins.set(plugin.id, {
                plugin,
                info: pluginInfo,
                api
            });

        } catch (error) {
            throw new Error(`Failed to register plugin "${plugin.id}": ${error.message}`);
        }
    }

    /**
     * Unregister a plugin
     */
    unregisterPlugin(pluginId: string): void {
        this.ensureNotDisposed();

        const registeredPlugin = this.plugins.get(pluginId);
        if (!registeredPlugin) {
            throw new Error(`Plugin with ID "${pluginId}" is not registered`);
        }

        try {
            // Unregister the plugin
            registeredPlugin.plugin.unregister(registeredPlugin.api);
        } catch (error) {
            console.warn(`Error during plugin unregistration for "${pluginId}":`, error);
        }

        this.plugins.delete(pluginId);
    }

    /**
     * Enable a disabled plugin
     */
    enablePlugin(pluginId: string): void {
        this.ensureNotDisposed();

        const registeredPlugin = this.plugins.get(pluginId);
        if (!registeredPlugin) {
            throw new Error(`Plugin with ID "${pluginId}" is not registered`);
        }

        if (registeredPlugin.info.status === 'disabled') {
            try {
                registeredPlugin.plugin.register(registeredPlugin.api);
                registeredPlugin.info.status = 'active';
                registeredPlugin.info.error = undefined;
            } catch (error) {
                registeredPlugin.info.status = 'error';
                registeredPlugin.info.error = error.message;
                throw new Error(`Failed to enable plugin "${pluginId}": ${error.message}`);
            }
        }
    }

    /**
     * Disable an active plugin
     */
    disablePlugin(pluginId: string): void {
        this.ensureNotDisposed();

        const registeredPlugin = this.plugins.get(pluginId);
        if (!registeredPlugin) {
            throw new Error(`Plugin with ID "${pluginId}" is not registered`);
        }

        if (registeredPlugin.info.status === 'active') {
            try {
                registeredPlugin.plugin.unregister(registeredPlugin.api);
                registeredPlugin.info.status = 'disabled';
            } catch (error) {
                console.warn(`Error disabling plugin "${pluginId}":`, error);
                registeredPlugin.info.status = 'error';
                registeredPlugin.info.error = error.message;
            }
        }
    }

    /**
     * Get plugin information
     */
    getPluginInfo(pluginId: string): PluginInfo {
        this.ensureNotDisposed();

        const registeredPlugin = this.plugins.get(pluginId);
        if (!registeredPlugin) {
            throw new Error(`Plugin with ID "${pluginId}" is not registered`);
        }

        // Return a copy to prevent external modification
        return { ...registeredPlugin.info };
    }

    /**
     * Get list of registered plugin IDs
     */
    getRegisteredPlugins(): string[] {
        this.ensureNotDisposed();
        return Array.from(this.plugins.keys());
    }

    /**
     * Get plugins by type
     */
    getPluginsByType(type: PluginType): PluginInfo[] {
        this.ensureNotDisposed();
        
        const result: PluginInfo[] = [];
        for (const registeredPlugin of this.plugins.values()) {
            if (registeredPlugin.info.type === type) {
                result.push({ ...registeredPlugin.info });
            }
        }
        return result;
    }

    /**
     * Get total plugin count
     */
    getPluginCount(): number {
        this.ensureNotDisposed();
        return this.plugins.size;
    }

    /**
     * Get system status
     */
    getSystemStatus(): PluginSystemStatus {
        this.ensureNotDisposed();

        const status: PluginSystemStatus = {
            totalPlugins: this.plugins.size,
            activePlugins: 0,
            disabledPlugins: 0,
            erroredPlugins: 0,
            pluginTypes: {
                celestial: 0,
                discovery: 0,
                audio: 0,
                visual: 0,
                gameplay: 0,
                data: 0
            }
        };

        for (const registeredPlugin of this.plugins.values()) {
            const info = registeredPlugin.info;
            
            switch (info.status) {
                case 'active':
                    status.activePlugins++;
                    break;
                case 'disabled':
                    status.disabledPlugins++;
                    break;
                case 'error':
                    status.erroredPlugins++;
                    break;
            }

            status.pluginTypes[info.type]++;
        }

        return status;
    }

    /**
     * Dispose all plugins and cleanup
     */
    dispose(): void {
        if (this.disposed) {
            return;
        }

        // Unregister all plugins
        const pluginIds = Array.from(this.plugins.keys());
        for (const pluginId of pluginIds) {
            try {
                this.unregisterPlugin(pluginId);
            } catch (error) {
                console.warn(`Error disposing plugin "${pluginId}":`, error);
            }
        }

        this.plugins.clear();
        this.disposed = true;
    }

    /**
     * Validate plugin structure
     */
    private validatePlugin(plugin: any): void {
        const requiredFields = ['id', 'name', 'version', 'type', 'register', 'unregister'];
        const missingFields = requiredFields.filter(field => !(field in plugin));

        if (missingFields.length > 0) {
            throw new Error(`Plugin must have required fields: ${requiredFields.join(', ')}`);
        }

        if (typeof plugin.register !== 'function') {
            throw new Error('Plugin register method must be a function');
        }

        if (typeof plugin.unregister !== 'function') {
            throw new Error('Plugin unregister method must be a function');
        }

        const validTypes: PluginType[] = ['celestial', 'discovery', 'audio', 'visual', 'gameplay', 'data'];
        if (!validTypes.includes(plugin.type)) {
            throw new Error(`Plugin type must be one of: ${validTypes.join(', ')}`);
        }
    }

    /**
     * Ensure manager is not disposed
     */
    private ensureNotDisposed(): void {
        if (this.disposed) {
            throw new Error('PluginManager has been disposed');
        }
    }
}