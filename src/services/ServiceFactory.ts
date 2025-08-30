// Service Factory - Configures and provides access to all game services
// Uses dependency injection for proper decoupling and testability

import { DIContainer } from './DIContainer.js';
import { ConfigService } from '../config/ConfigService.js';
import { DiscoveryService } from './DiscoveryService.js';
import { WorldService } from './WorldService.js';
import { CelestialService } from './CelestialService.js';
import { StorageService } from './StorageService.js';
import { SaveLoadService } from './SaveLoadService.js';

export class ServiceFactory {
    private static instance: ServiceFactory | null = null;
    private container: DIContainer;
    private initialized = false;

    private constructor() {
        this.container = new DIContainer();
    }

    /**
     * Get the singleton instance of the service factory
     */
    static getInstance(): ServiceFactory {
        if (!ServiceFactory.instance) {
            ServiceFactory.instance = new ServiceFactory();
        }
        return ServiceFactory.instance;
    }

    /**
     * Initialize all services with proper dependency injection
     */
    initialize(): void {
        if (this.initialized) {
            return;
        }

        // Register core services
        this.registerCoreServices();

        this.initialized = true;
    }

    /**
     * Get a service by name
     */
    get<T>(serviceName: string): T {
        if (!this.initialized) {
            throw new Error('ServiceFactory must be initialized before getting services');
        }
        return this.container.get<T>(serviceName);
    }

    /**
     * Check if a service is registered
     */
    has(serviceName: string): boolean {
        return this.container.has(serviceName);
    }

    /**
     * Dispose all services and reset the factory
     */
    dispose(): void {
        this.container.dispose();
        this.initialized = false;
        ServiceFactory.instance = null;
    }

    /**
     * Register all core game services with proper dependencies
     */
    private registerCoreServices(): void {
        // Storage Service (no dependencies)
        this.container.registerSingleton('storage', () => {
            return new StorageService();
        });

        // Configuration Service (no dependencies)
        this.container.registerSingleton('config', () => {
            const configService = new ConfigService();
            configService.loadFromEnvironment();
            return configService;
        });

        // Discovery Service (no dependencies - uses minimal interfaces)
        this.container.registerSingleton('discovery', () => {
            return new DiscoveryService();
        });

        // World Service (depends on config and discovery)
        this.container.registerSingleton('world', (deps) => {
            return new WorldService(deps.config, deps.discovery);
        }, ['config', 'discovery']);

        // Celestial Service (depends on config, discovery, and world)
        this.container.registerSingleton('celestial', (deps) => {
            return new CelestialService(deps.config, deps.discovery, deps.world);
        }, ['config', 'discovery', 'world']);
    }

    /**
     * Register a custom service (for extensibility)
     */
    registerService<T>(
        name: string,
        factory: (deps: Record<string, any>) => T,
        dependencies: string[] = []
    ): void {
        this.container.registerSingleton(name, factory, dependencies);
    }

    /**
     * Get all registered service names (for debugging)
     */
    getRegisteredServices(): string[] {
        return this.container.getRegisteredServices();
    }
}