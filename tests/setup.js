// Test setup file to initialize browser-like globals and game modules

// Mock localStorage for browser environment
if (!global.localStorage) {
  global.localStorage = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  };
}

// Initialize global variables that game modules expect
global.window = global.window || {};
global.window.UNIVERSE_SEED = 0;
global.window.STARTING_COORDINATES = null;

// Mock window.location for URL parameter testing
if (!global.window) {
  global.window = {
    location: {
      search: '',
      href: 'http://localhost/game.html',
      origin: 'http://localhost',
      pathname: '/game.html'
    }
  };
}

// Set up URLSearchParams for coordinate URL testing
if (!global.URLSearchParams) {
  global.URLSearchParams = class URLSearchParams {
    constructor(search = '') {
      this.params = new Map();
      if (search.startsWith('?')) {
        search = search.slice(1);
      }
      if (search) {
        search.split('&').forEach(param => {
          const [key, value] = param.split('=');
          if (key && value !== undefined) {
            this.params.set(decodeURIComponent(key), decodeURIComponent(value));
          }
        });
      }
    }
    
    get(key) {
      return this.params.get(key) || null;
    }
    
    set(key, value) {
      this.params.set(key, value);
    }
    
    has(key) {
      return this.params.has(key);
    }
    
    toString() {
      const entries = Array.from(this.params.entries());
      return entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&');
    }
  };
}

// Make URLSearchParams available on window as well
global.window.URLSearchParams = global.URLSearchParams;

// Mock navigator for touch device detection
if (!global.navigator) {
  global.navigator = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    maxTouchPoints: 0
  };
}

// Mock canvas and 2D context for rendering tests
const mockCanvas = {
  width: 800,
  height: 600,
  getContext: vi.fn(() => ({
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn()
  }))
};

// Mock document for canvas element access
if (!global.document) {
  global.document = {
    getElementById: vi.fn(() => mockCanvas),
    createElement: vi.fn(() => mockCanvas)
  };
}

// Initialize Math.random with a known seed for consistent testing
// Store original Math.random for restoration if needed
global.originalMathRandom = Math.random;
let mockMathRandom = 0.5;

// Create a vi.fn mock that we can control
const mathRandomMock = vi.fn(() => mockMathRandom);
global.Math.random = mathRandomMock;

// Helper to set Math.random return value for tests
global.setMockMathRandom = (value) => {
  mockMathRandom = value;
  mathRandomMock.mockReturnValue(value);
};

// Helper to reset Math.random mock
global.resetMockMathRandom = () => {
  mathRandomMock.mockClear();
  mockMathRandom = 0.5;
  mathRandomMock.mockReturnValue(mockMathRandom);
};