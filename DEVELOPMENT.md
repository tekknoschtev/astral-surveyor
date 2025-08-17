# Astral Surveyor - Developer Guide

## 🏗️ Architecture Overview

Astral Surveyor uses a **TypeScript + ES6 modules** architecture with a build pipeline that compiles to JavaScript for browser compatibility.

### **Key Architectural Decisions**
- **TypeScript**: Full type safety with comprehensive interfaces
- **ES6 Modules**: Proper import/export instead of global window objects
- **Service-Oriented Architecture**: Dependency injection and event-driven communication
- **Plugin System**: Extensible architecture for community contributions
- **Build Pipeline**: Source in `src/`, compiled output in `dist/`
- **Test Strategy**: Tests run against compiled JavaScript for accurate coverage
- **Browser Compatibility**: Static deployment with no build-time dependencies

## 📁 Project Structure

```
src/                    # TypeScript source files
├── services/           # Service-oriented architecture
│   ├── AudioService.ts       # Audio management service
│   ├── CelestialService.ts   # Celestial object management
│   ├── DiscoveryService.ts   # Discovery logic service
│   ├── EventSystem.ts       # Event-driven communication
│   ├── PerformanceMonitor.ts # Performance tracking
│   ├── PluginManager.ts     # Plugin system management
│   ├── ServiceOrchestrator.ts # Service coordination
│   ├── StateManager.ts      # Game state management
│   └── WorldService.ts      # World generation service
├── types/              # Comprehensive type definitions
│   ├── CelestialTypes.ts    # Celestial object interfaces
│   ├── GameState.ts         # Game state types
│   ├── PluginTypes.ts       # Plugin system interfaces
│   ├── RendererTypes.ts     # Rendering system types
│   ├── UITypes.ts           # User interface types
│   └── index.ts            # Central type exports
├── celestial/          # Celestial object domain
│   ├── Star.ts             # Star class and types
│   ├── Planet.ts           # Planet class and types
│   ├── Moon.ts             # Moon class with orbital mechanics
│   ├── CelestialFactory.ts # Factory for object creation
│   └── celestial.ts        # Barrel export file
├── world/              # World generation domain
│   ├── ChunkManager.ts     # Chunk-based world management
│   ├── InfiniteStarField.ts # Star field generation
│   └── world.ts            # Barrel export file
├── config/             # Configuration management
│   ├── GameConstants.ts    # Game configuration constants
│   └── VisualConfig.ts     # Visual configuration settings
├── utils/
│   └── random.ts      # Seeded RNG & universe coordinates
├── graphics/
│   └── renderer.ts    # Canvas 2D rendering system
├── audio/
│   └── soundmanager.ts # Web Audio API sound system
├── input/
│   └── input.ts       # Keyboard/mouse/touch input
├── camera/
│   └── camera.ts      # Physics-based camera movement
├── naming/
│   └── naming.ts      # IAU-inspired astronomical naming
├── ship/
│   └── ship.ts        # Player ship + particle systems
├── ui/
│   ├── ui.ts          # Discovery display & HUD
│   ├── discoverylogbook.ts # Exploration history
│   ├── stellarmap.ts  # Interactive star map
│   └── touchui.ts     # Mobile touch interface
└── game.ts            # Main game orchestrator

dist/                   # Compiled JavaScript (auto-generated, gitignored)
tests/                  # Test suite (imports from dist/)
├── services/           # Service architecture tests
├── config/             # Configuration tests
├── celestial/          # Celestial object tests
└── ... (domain-organized tests)
```

## 🔧 Development Workflow

### **Setup**
```bash
npm install            # Install dependencies
npm run build          # Initial build
npm test              # Verify everything works
```

### **Daily Development**
```bash
npm run dev           # Start TypeScript watch mode
# Edit files in src/
npm run build         # Build when ready to test
npm test              # Run full test suite
```

### **Available Commands**
```bash
# Build & Development
npm run build         # Compile TypeScript + copy assets
npm run dev           # TypeScript watch mode
npm run clean         # Remove dist/ directory  
npm run rebuild       # Clean + build

# Testing
npm test              # Build + run all tests
npm run test:watch    # Build + watch mode testing
npm run test:coverage # Build + coverage report
npm run test:ui       # Build + visual test interface
```

## 🧪 Testing Strategy

### **Test Architecture**
- Tests import from compiled JavaScript in `dist/`
- **Coverage targets**: 80%+ on critical systems
- **Current coverage**: 88.54% naming, 93.54% random utilities

### **Test Organization**
```
tests/
├── services/                   # Service architecture tests
│   ├── audioservice.test.js          # Audio service functionality
│   ├── celestialservice.test.js      # Celestial service management
│   ├── discoveryservice.test.js      # Discovery logic testing
│   ├── eventsystem.test.js           # Event system validation
│   ├── performancemonitor.test.js    # Performance tracking tests
│   ├── pluginsystem.test.js          # Plugin system tests
│   ├── exampleplugin.test.js         # Plugin implementation examples
│   ├── serviceorchestrator.test.js   # Service coordination tests
│   ├── worldservice.test.js          # World generation service tests
│   └── integration.test.js           # Cross-service integration
├── config/                     # Configuration management tests
│   └── configservice.test.js         # Configuration validation
├── celestial/                  # Celestial object tests
│   └── celestial.test.js             # Discovery logic & physics
├── utils/random.test.js        # Seeded RNG & coordinate systems
├── naming/naming.test.js       # Astronomical naming conventions
├── naming/planet-moon-naming.test.js # Planet/moon designations
└── game/game.test.js          # Main game orchestration
```

### **What We Test**
- ✅ **Deterministic systems**: Random generation, naming, coordinates
- ✅ **Discovery logic**: Star/planet/moon detection ranges
- ✅ **Astronomical accuracy**: IAU naming conventions, orbital mechanics
- ✅ **Service architecture**: Dependency injection, event systems, service coordination
- ✅ **Plugin system**: Registration, lifecycle, API integration, error isolation
- ✅ **Performance monitoring**: Tracking, optimization, regression detection
- ✅ **Error handling**: Recovery strategies, circuit breakers, graceful degradation
- ❌ **UI/Rendering**: Mostly untested (by design - focus on core logic)

## 🎯 Core Systems

### **Service Architecture** (`src/services/`)
- **Dependency Injection**: Constructor-based service injection for testability
- **Event System**: Loose coupling through publish/subscribe patterns
- **Service Orchestration**: Centralized coordination of cross-service interactions
- **Plugin Management**: Extensible architecture for community contributions
- **Performance Monitoring**: Real-time tracking and optimization
- **Error Handling**: Comprehensive recovery strategies and graceful degradation

### **Plugin System** (`src/services/PluginManager.ts`)
- **Multiple Plugin Types**: Celestial, discovery, audio, visual, gameplay, data
- **Lifecycle Management**: Registration, activation, deactivation, cleanup
- **API Integration**: Safe access to core services through plugin API
- **Error Isolation**: Plugin failures don't crash the core system
- **Community Ready**: Example plugins and comprehensive documentation

### **Random Generation** (`src/utils/random.ts`)
- Seeded deterministic RNG for consistent universes
- Position-based hashing for infinite world generation
- URL parameter handling for shareable coordinates

### **Astronomical Naming** (`src/naming/naming.ts`) 
- IAU-inspired catalog designations (ASV-2847 G)
- Planet/moon naming with proper suffixes (b, c, I, II)
- Stellar classification integration

### **World Generation** (`src/services/WorldService.ts`, `src/world/`)
- Service-based world management with dependency injection
- Chunk-based infinite universe through ChunkManager
- Realistic star type distributions via InfiniteStarField
- Orbital mechanics following Kepler's laws

### **Discovery System** (`src/services/DiscoveryService.ts`, `src/celestial/`)
- Centralized discovery logic service
- Tiered discovery ranges (stars: 500px, planets: 40px, moons: 30px)
- Visual-based star discovery for navigation
- Distance-based planet/moon discovery for exploration
- Extensible through plugin system

## 📋 Development Guidelines

### **TypeScript Best Practices**
- Use comprehensive interfaces for all major systems
- Prefer `type` over `interface` for simple shapes
- Export classes/functions explicitly, avoid default exports
- Use `any` sparingly (current codebase has some legacy `any`)

### **File Organization**  
- Group by domain (`celestial/`, `services/`, `world/`) not type (`models/`, `utils/`)
- Extract services to dedicated files with clear responsibilities
- Use barrel exports for clean imports: `import { Star, Planet } from '../celestial/celestial.js'`
- Follow dependency injection patterns for service integration
- Use descriptive imports: `import { SeededRandom } from '../utils/random.js'`

### **Testing Approach**
- Test core logic, not UI rendering
- Focus on deterministic systems that can be reliably tested
- **Service-level testing**: Test each service in isolation with mocked dependencies
- **Integration testing**: Validate cross-service interactions and event flows
- **Plugin testing**: Ensure plugin registration, lifecycle, and API integration
- **Performance testing**: Monitor and validate optimization strategies
- Use descriptive test names explaining the behavior
- Mock external dependencies when necessary
- Follow TDD principles for new architectural changes

### **Git Workflow**
1. Create feature branch from main
2. Make changes in `src/` directory only (follow service architecture)
3. Write tests first for new services or architectural changes (TDD)
4. Run `npm run build && npm test` before committing (all 1,157+ tests must pass)
5. Exclude `dist/` from commits (it's auto-generated)
6. Create PR - GitHub Actions will verify build + tests
7. Consider performance impact and update documentation if needed

## 🚀 Deployment

### **GitHub Pages Setup**
- Game deploys from `dist/` directory after build
- `game.html` becomes `index.html` in dist
- CSS and assets copied directly
- No server-side processing required

### **Build Process**
1. TypeScript compilation: `src/*.ts` → `dist/*.js`
2. Asset copying: `game.html` → `dist/index.html`, `css/` → `dist/css/`
3. Cross-platform scripts use Node.js APIs for Windows/Unix compatibility

## 🔗 Key References

- **CLAUDE.md**: Core development values and updated workflows
- **tsconfig.json**: TypeScript compilation configuration
- **vitest.config.js**: Test framework configuration with coverage settings

---
