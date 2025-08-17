// Dependency Injection Container
// Provides type-safe dependency injection with lifecycle management

export type ServiceFactory<T = any> = (dependencies: Record<string, any>) => T;
export type ServiceInstance = any;
export type ServiceName = string;

interface ServiceRegistration {
    type: 'instance' | 'factory' | 'singleton';
    value: ServiceInstance | ServiceFactory;
    dependencies?: ServiceName[];
    instance?: ServiceInstance; // For singletons
}

export class DIContainer {
    private services = new Map<ServiceName, ServiceRegistration>();
    private resolving = new Set<ServiceName>(); // For circular dependency detection
    
    /**
     * Register a service instance directly
     */
    register(name: ServiceName, instance: ServiceInstance): void {
        this.checkDuplicate(name);
        this.services.set(name, {
            type: 'instance',
            value: instance
        });
    }
    
    /**
     * Register a factory function that creates new instances each time
     */
    registerFactory<T>(
        name: ServiceName, 
        factory: ServiceFactory<T>, 
        dependencies: ServiceName[] = []
    ): void {
        this.checkDuplicate(name);
        this.services.set(name, {
            type: 'factory',
            value: factory,
            dependencies
        });
    }
    
    /**
     * Register a singleton factory (creates instance once, reuses thereafter)
     */
    registerSingleton<T>(
        name: ServiceName,
        factory: ServiceFactory<T>,
        dependencies: ServiceName[] = []
    ): void {
        this.checkDuplicate(name);
        this.services.set(name, {
            type: 'singleton',
            value: factory,
            dependencies
        });
    }
    
    /**
     * Get a service instance by name
     */
    get<T = any>(name: ServiceName): T {
        return this.resolve(name);
    }
    
    /**
     * Check if a service is registered
     */
    has(name: ServiceName): boolean {
        return this.services.has(name);
    }
    
    /**
     * Get list of all registered service names
     */
    getRegisteredServices(): ServiceName[] {
        return Array.from(this.services.keys());
    }
    
    /**
     * Dispose all services and clear container
     */
    dispose(): void {
        // Dispose services that have a dispose method
        for (const [name, registration] of this.services) {
            try {
                let instance: any = null;
                
                if (registration.type === 'instance') {
                    instance = registration.value;
                } else if (registration.type === 'singleton' && registration.instance) {
                    instance = registration.instance;
                }
                
                if (instance && typeof instance.dispose === 'function') {
                    instance.dispose();
                }
            } catch (error) {
                // Log error but don't throw - we want to dispose all services
                console.warn(`Error disposing service "${name}":`, error);
            }
        }
        
        // Clear all registrations
        this.services.clear();
        this.resolving.clear();
    }
    
    // Private helper methods
    
    private checkDuplicate(name: ServiceName): void {
        if (this.services.has(name)) {
            throw new Error(`Service "${name}" is already registered`);
        }
    }
    
    private resolve<T>(name: ServiceName): T {
        // Check if service exists
        const registration = this.services.get(name);
        if (!registration) {
            throw new Error(`Service "${name}" is not registered`);
        }
        
        // Handle direct instances
        if (registration.type === 'instance') {
            return registration.value as T;
        }
        
        // Handle singletons (check if already created)
        if (registration.type === 'singleton' && registration.instance) {
            return registration.instance as T;
        }
        
        // Check for circular dependencies
        if (this.resolving.has(name)) {
            throw new Error(`Circular dependency detected involving service "${name}"`);
        }
        
        // Mark as resolving
        this.resolving.add(name);
        
        try {
            // Resolve dependencies
            const dependencies = this.resolveDependencies(name, registration.dependencies || []);
            
            // Create instance using factory
            const factory = registration.value as ServiceFactory<T>;
            let instance: T;
            
            try {
                instance = factory(dependencies);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                throw new Error(`Failed to create service "${name}": ${message}`);
            }
            
            // Store singleton instance
            if (registration.type === 'singleton') {
                registration.instance = instance;
            }
            
            return instance;
        } finally {
            // Always clean up resolving state
            this.resolving.delete(name);
        }
    }
    
    private resolveDependencies(requester: ServiceName, dependencies: ServiceName[]): Record<string, any> {
        const resolved: Record<string, any> = {};
        
        for (const dep of dependencies) {
            if (!this.services.has(dep)) {
                throw new Error(`Service "${dep}" is not registered (required by "${requester}")`);
            }
            resolved[dep] = this.resolve(dep);
        }
        
        return resolved;
    }
}