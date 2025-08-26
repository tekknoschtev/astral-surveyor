// ConfigService - Centralized configuration management with validation and event system
// Manages all game configuration with type safety and change notifications

import { GameConfig } from './gameConfig.js';
import { GameConstants, validateConstants } from './GameConstants.js';
import { VisualConfig } from './VisualConfig.js';

// Event listener types
type ConfigChangeListener = (path: string, value: unknown) => void;
type ConfigResetListener = () => void;

// Configuration path type for type safety
type ConfigPath = string;

export class ConfigService {
    private config: any;
    private defaultConfig: any;
    private changeListeners: ConfigChangeListener[] = [];
    private resetListeners: ConfigResetListener[] = [];
    
    constructor() {
        // Create deep copies to avoid mutating the original configs
        this.defaultConfig = this.deepClone({
            ...GameConfig,
            constants: GameConstants,
            visual: VisualConfig
        });
        this.config = this.deepClone(this.defaultConfig);
    }
    
    /**
     * Get a configuration value using dot notation
     */
    get(path: ConfigPath, defaultValue?: any): any {
        return this.getNestedValue(this.config, path, defaultValue);
    }
    
    /**
     * Set a configuration value using dot notation
     */
    set(path: ConfigPath, value: any): void {
        this.setNestedValue(this.config, path, value);
        this.notifyChange(path, value);
    }
    
    /**
     * Reset configuration to defaults
     */
    reset(section?: string): void {
        if (section) {
            // Reset specific section
            const defaultSectionValue = this.getNestedValue(this.defaultConfig, section);
            if (defaultSectionValue !== undefined) {
                this.setNestedValue(this.config, section, this.deepClone(defaultSectionValue));
            }
        } else {
            // Reset entire configuration
            this.config = this.deepClone(this.defaultConfig);
        }
        this.notifyReset();
    }
    
    /**
     * Validate configuration integrity
     */
    validate(section?: string): boolean {
        if (section) {
            return this.validateSection(section);
        }
        
        // Validate constants first
        const constantsValidation = validateConstants();
        if (!constantsValidation.isValid) {
            return false;
        }
        
        // Validate configuration structure
        return this.validateConfigStructure();
    }
    
    /**
     * Get validation errors
     */
    getValidationErrors(): string[] {
        const errors: string[] = [];
        
        // Check constants validation
        const constantsValidation = validateConstants();
        errors.push(...constantsValidation.errors);
        
        // Check configuration values using type guards
        const chunkSize = this.get('world.chunkSize');
        if (!this.isNumber(chunkSize) || chunkSize <= 0) {
            errors.push('world.chunkSize must be a positive number');
        }
        
        const debugEnabled = this.get('debug.enabled');
        if (!this.isBoolean(debugEnabled)) {
            errors.push('debug.enabled must be a boolean');
        }
        
        return errors;
    }
    
    /**
     * Subscribe to configuration change events
     */
    onChange(listener: ConfigChangeListener): () => void {
        this.changeListeners.push(listener);
        
        // Return unsubscribe function
        return () => {
            const index = this.changeListeners.indexOf(listener);
            if (index > -1) {
                this.changeListeners.splice(index, 1);
            }
        };
    }
    
    /**
     * Subscribe to configuration reset events
     */
    onReset(listener: ConfigResetListener): () => void {
        this.resetListeners.push(listener);
        
        // Return unsubscribe function
        return () => {
            const index = this.resetListeners.indexOf(listener);
            if (index > -1) {
                this.resetListeners.splice(index, 1);
            }
        };
    }
    
    /**
     * Get world configuration
     */
    getWorldConfig(): typeof GameConfig.world {
        return this.get('world') as typeof GameConfig.world;
    }
    
    /**
     * Get celestial configuration
     */
    getCelestialConfig(): typeof GameConfig.celestial {
        return this.get('celestial') as typeof GameConfig.celestial;
    }
    
    /**
     * Get discovery configuration
     */
    getDiscoveryConfig(): typeof GameConfig.discovery {
        return this.get('discovery') as typeof GameConfig.discovery;
    }
    
    /**
     * Get visual configuration
     */
    getVisualConfig(): typeof VisualConfig {
        return this.get('visual') as typeof VisualConfig;
    }
    
    /**
     * Get debug configuration
     */
    getDebugConfig(): typeof GameConfig.debug {
        return this.get('debug') as typeof GameConfig.debug;
    }
    
    /**
     * Get game constants (immutable)
     */
    getConstants(): typeof GameConstants {
        // Return a frozen copy to prevent mutations
        return Object.freeze(this.deepClone(GameConstants));
    }
    
    /**
     * Load configuration from environment variables
     */
    loadFromEnvironment(): void {
        // In a browser environment, this could load from localStorage or URL params
        // For now, just provide the interface
        try {
            const savedConfig = localStorage.getItem('astralSurveyorConfig');
            if (savedConfig) {
                const parsed = JSON.parse(savedConfig);
                this.importConfig(parsed);
            }
        } catch (error) {
            console.warn('Failed to load configuration from environment:', error);
        }
    }
    
    /**
     * Export configuration for debugging/backup
     */
    exportConfig(): Record<string, unknown> {
        return this.deepClone(this.config);
    }
    
    /**
     * Import configuration from object
     */
    importConfig(configObject: Record<string, unknown>): void {
        if (typeof configObject === 'object' && configObject !== null) {
            this.config = this.deepClone({
                ...this.defaultConfig,
                ...configObject
            });
            this.notifyReset();
        }
    }
    
    /**
     * Save configuration to localStorage
     */
    saveToEnvironment(): void {
        try {
            localStorage.setItem('astralSurveyorConfig', JSON.stringify(this.config));
        } catch (error) {
            console.warn('Failed to save configuration to environment:', error);
        }
    }
    
    /**
     * Type guard utilities for better config validation
     */
    isNumber(value: unknown): value is number {
        return typeof value === 'number' && !isNaN(value);
    }

    isBoolean(value: unknown): value is boolean {
        return typeof value === 'boolean';
    }

    isString(value: unknown): value is string {
        return typeof value === 'string';
    }

    isObject(value: unknown): value is Record<string, unknown> {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    // Private helper methods
    
    private getNestedValue(obj: any, path: string, defaultValue?: any): any {
        const keys = path.split('.');
        let current = obj;
        
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return defaultValue;
            }
        }
        
        return current;
    }
    
    private setNestedValue(obj: any, path: string, value: any): void {
        const keys = path.split('.');
        const lastKey = keys.pop();
        
        if (!lastKey) return;
        
        let current = obj;
        for (const key of keys) {
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[lastKey] = value;
    }
    
    private deepClone(obj: any): any {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        
        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item));
        }
        
        const cloned: any = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        
        return cloned;
    }
    
    private notifyChange(path: string, value: unknown): void {
        this.changeListeners.forEach(listener => {
            try {
                listener(path, value);
            } catch (error) {
                console.error('Error in config change listener:', error);
            }
        });
    }
    
    private notifyReset(): void {
        this.resetListeners.forEach(listener => {
            try {
                listener();
            } catch (error) {
                console.error('Error in config reset listener:', error);
            }
        });
    }
    
    private validateSection(section: string): boolean {
        const sectionValue = this.get(section);
        return sectionValue !== undefined && sectionValue !== null;
    }
    
    private validateConfigStructure(): boolean {
        // Basic structure validation
        const requiredSections = ['world', 'celestial', 'discovery', 'debug'];
        
        for (const section of requiredSections) {
            if (!this.validateSection(section)) {
                return false;
            }
        }
        
        // Additional validation checks
        const errors = this.getValidationErrors();
        return errors.length === 0;
    }
}