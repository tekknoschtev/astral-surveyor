import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use jsdom environment to simulate browser globals
    environment: 'jsdom',
    
    // Define global variables that the game code expects
    globals: true,
    
    // Setup file to initialize browser-like environment
    setupFiles: ['./tests/setup.js'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'tests/**',
        'coverage/**',
        '**/*.config.js'
      ]
    },
    
    // Test file patterns
    include: ['tests/**/*.test.js'],
    
    // Timeout for long-running tests
    testTimeout: 10000,
    
    // Better error output
    reporter: ['verbose']
  },
  
  // Configure module resolution for the game's structure
  resolve: {
    alias: {
      '@': new URL('./js', import.meta.url).pathname
    }
  }
});