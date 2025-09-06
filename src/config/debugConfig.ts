// Debug configuration for region-specific objects
// Phase 0: Basic configuration support

export interface RegionObjectsDebugConfig {
    // Toggle artificial objects (derelict stations, mining remnants, etc.)
    enableArtificialObjects: boolean;
    
    // Enable debug spawning for region-specific objects
    enableRegionObjectDebug: boolean;
}

// Default configuration
export const defaultDebugConfig: RegionObjectsDebugConfig = {
    enableArtificialObjects: true,  // Default enabled for Phase 0 testing
    enableRegionObjectDebug: true,
};

// Global debug configuration instance
let debugConfig: RegionObjectsDebugConfig = { ...defaultDebugConfig };

// Configuration management functions
export function getDebugConfig(): RegionObjectsDebugConfig {
    return debugConfig;
}

export function updateDebugConfig(updates: Partial<RegionObjectsDebugConfig>): void {
    debugConfig = { ...debugConfig, ...updates };
    console.log('📝 DEBUG: Updated region objects config:', debugConfig);
}

export function toggleArtificialObjects(): boolean {
    debugConfig.enableArtificialObjects = !debugConfig.enableArtificialObjects;
    console.log(`🔧 DEBUG: Artificial objects ${debugConfig.enableArtificialObjects ? 'enabled' : 'disabled'}`);
    return debugConfig.enableArtificialObjects;
}

export function resetDebugConfig(): void {
    debugConfig = { ...defaultDebugConfig };
    console.log('🔄 DEBUG: Reset region objects config to defaults');
}