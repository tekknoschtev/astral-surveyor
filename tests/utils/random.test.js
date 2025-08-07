import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import the game modules - we need to load them as global scripts since they use window
// We'll load the actual game files by executing them in the test context
const fs = await import('fs');
const path = await import('path');

// Load the random.js module by executing it in global context
const randomJsPath = path.resolve('./js/utils/random.js');
const randomJsContent = fs.readFileSync(randomJsPath, 'utf8');

// Execute the module in global context to set up window.SeededRandom etc
eval(randomJsContent);

// Access the globally defined classes
const { SeededRandom, hashPosition, initializeUniverseSeed, generateShareableURL } = window;

describe('SeededRandom', () => {
  it('should produce consistent outputs for the same seed', () => {
    const rng1 = new SeededRandom(12345);
    const rng2 = new SeededRandom(12345);
    
    // Generate several numbers from each RNG
    const values1 = [];
    const values2 = [];
    
    for (let i = 0; i < 10; i++) {
      values1.push(rng1.next());
      values2.push(rng2.next());
    }
    
    // Both should produce identical sequences
    expect(values1).toEqual(values2);
  });
  
  it('should produce different outputs for different seeds', () => {
    const rng1 = new SeededRandom(12345);
    const rng2 = new SeededRandom(54321);
    
    const values1 = [];
    const values2 = [];
    
    for (let i = 0; i < 5; i++) {
      values1.push(rng1.next());
      values2.push(rng2.next());
    }
    
    // Sequences should be different
    expect(values1).not.toEqual(values2);
  });
  
  it('should generate values between 0 and 1', () => {
    const rng = new SeededRandom(42);
    
    for (let i = 0; i < 100; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
  
  it('should generate integers within specified range', () => {
    const rng = new SeededRandom(42);
    
    for (let i = 0; i < 50; i++) {
      const value = rng.nextInt(5, 15);
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThanOrEqual(15);
      expect(Number.isInteger(value)).toBe(true);
    }
  });
  
  it('should generate floats within specified range', () => {
    const rng = new SeededRandom(42);
    
    for (let i = 0; i < 50; i++) {
      const value = rng.nextFloat(2.5, 7.8);
      expect(value).toBeGreaterThanOrEqual(2.5);
      expect(value).toBeLessThanOrEqual(7.8);
    }
  });
  
  it('should consistently choose from arrays', () => {
    const rng1 = new SeededRandom(123);
    const rng2 = new SeededRandom(123);
    const options = ['red', 'green', 'blue', 'yellow', 'purple'];
    
    const choices1 = [];
    const choices2 = [];
    
    for (let i = 0; i < 10; i++) {
      choices1.push(rng1.choice(options));
      choices2.push(rng2.choice(options));
    }
    
    expect(choices1).toEqual(choices2);
    
    // All choices should be from the original array
    choices1.forEach(choice => {
      expect(options).toContain(choice);
    });
  });
});

describe('hashPosition', () => {
  beforeEach(() => {
    // Set a known universe seed for consistent testing
    window.UNIVERSE_SEED = 12345;
    // Reset Math.random mock to avoid conflicts
    resetMockMathRandom();
  });
  
  it('should produce identical hashes for identical coordinates', () => {
    const hash1 = hashPosition(100.5, 200.7);
    const hash2 = hashPosition(100.5, 200.7);
    
    expect(hash1).toBe(hash2);
  });
  
  it('should produce different hashes for different coordinates', () => {
    const hash1 = hashPosition(100, 200);
    const hash2 = hashPosition(101, 200);
    const hash3 = hashPosition(100, 201);
    
    expect(hash1).not.toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash2).not.toBe(hash3);
  });
  
  it('should handle negative coordinates', () => {
    const hash1 = hashPosition(-50, -75);
    const hash2 = hashPosition(-50, -75);
    const hash3 = hashPosition(50, 75);
    
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });
  
  it('should produce reasonable distribution of hash values', () => {
    const hashes = new Set();
    
    // Generate hashes for a grid of coordinates
    for (let x = 0; x < 20; x++) {
      for (let y = 0; y < 20; y++) {
        hashes.add(hashPosition(x * 10, y * 10));
      }
    }
    
    // Should have good distribution (most coordinates should produce unique hashes)
    expect(hashes.size).toBeGreaterThan(350); // Out of 400 total coordinates
  });
  
  it('should treat coordinates as floored integers', () => {
    // These should produce the same hash since they floor to the same values
    const hash1 = hashPosition(100.1, 200.2);
    const hash2 = hashPosition(100.9, 200.8);
    
    expect(hash1).toBe(hash2);
  });
});

describe('URL and coordinate functions', () => {
  beforeEach(() => {
    // Reset Math.random mock to avoid conflicts with seeded random
    resetMockMathRandom();
    
    // Reset window.location mock
    window.location = {
      search: '',
      href: 'http://localhost/game.html',
      origin: 'http://localhost',
      pathname: '/game.html'
    };
    
    // Only reset global state for tests that don't explicitly set it
    // Individual tests can override these values after beforeEach runs
    if (window.setUniverseSeed) {
      window.setUniverseSeed(0);
    }
    window.STARTING_COORDINATES = null;
  });
  
  it('should initialize universe seed from URL parameter', () => {
    window.location.search = '?seed=98765';
    
    const seed = initializeUniverseSeed();
    
    expect(seed).toBe(98765);
    expect(window.getUniverseSeed()).toBe(98765);
  });
  
  it('should initialize starting coordinates from URL parameters', () => {
    window.location.search = '?seed=12345&x=500&y=-750';
    
    initializeUniverseSeed();
    
    const coords = window.getStartingCoordinates();
    expect(coords).toEqual({ x: 500, y: -750 });
  });
  
  it('should generate shareable URL with coordinates', () => {
    // Set the universe seed using the proper setter
    window.setUniverseSeed(54321);
    
    const url = generateShareableURL(123.7, -456.2);
    
    expect(url).toBe('http://localhost/game.html?seed=54321&x=124&y=-456');
  });
  
  it('should handle invalid seed parameter gracefully', () => {
    window.location.search = '?seed=invalid';
    
    const seed = initializeUniverseSeed();
    
    // Should generate a hash from the invalid string
    expect(typeof seed).toBe('number');
    expect(seed).toBeGreaterThan(0);
  });
  
  it('should generate random seed when no URL parameter provided', () => {
    // Mock Math.random to return a specific value
    setMockMathRandom(0.5);
    
    const seed = initializeUniverseSeed();
    
    // Should be approximately Math.floor(0.5 * 2147483647)
    expect(seed).toBe(1073741823);
  });
  
  it('should handle file:// URLs correctly', () => {
    window.location = {
      href: 'file:///C:/Users/test/game.html?old=params',
      origin: 'null',
      pathname: '/C:/Users/test/game.html'
    };
    window.setUniverseSeed(11111);
    
    const url = generateShareableURL(100, 200);
    
    expect(url).toBe('file:///C:/Users/test/game.html?seed=11111&x=100&y=200');
  });
});