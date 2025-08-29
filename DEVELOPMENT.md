# Astral Surveyor - Developer Guide

*Complete technical documentation for developers, contributors, and architects*

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
│   ├── AudioService.ts           # Audio management service
│   ├── CelestialFactory.ts       # Factory for celestial object creation
│   ├── CelestialService.ts       # Celestial object management
│   ├── DIContainer.ts            # Dependency injection container
│   ├── DiscoveryManager.ts       # Discovery management service
│   ├── DiscoveryService.ts       # Discovery logic service
│   ├── DiscoveryVisualizationService.ts # Enhanced discovery feedback
│   ├── ErrorBoundary.ts          # Error handling and recovery
│   ├── EventSystem.ts            # Event-driven communication
│   ├── PerformanceMonitor.ts     # Performance tracking and optimization
│   ├── PluginManager.ts          # Plugin system management
│   ├── ServiceFactory.ts         # Service factory pattern
│   ├── ServiceOrchestrator.ts    # Service coordination and lifecycle
│   ├── StateManager.ts           # Game state management
│   └── WorldService.ts           # World generation service
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
│   ├── asteroids.ts        # Asteroid garden systems
│   ├── blackholes.ts       # Black hole celestial objects
│   ├── comets.ts           # Comet system with advanced visual effects
│   ├── nebulae.ts          # Nebula generation and types
│   ├── wormholes.ts        # Wormhole discovery objects
│   ├── CelestialTypes.ts   # Type definitions for all celestial objects
│   └── celestial.ts        # Barrel export file
├── world/              # World generation domain
│   ├── ChunkManager.ts     # Chunk-based world management
│   ├── InfiniteStarField.ts # Star field generation
│   └── world.ts            # Barrel export file
├── config/             # Configuration management
│   ├── ConfigService.ts    # Configuration service management
│   ├── GameConstants.ts    # Game configuration constants
│   ├── VisualConfig.ts     # Visual configuration settings
│   └── gameConfig.ts       # Game configuration utilities
├── debug/              # Developer tools and debugging
│   ├── CommandRegistry.ts  # Debug command registration system
│   ├── DeveloperConsole.ts # In-game developer console
│   └── debug-spawner.ts    # Debug spawning system (Shift+W, Shift+B)
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

## 🚀 Quick Start

### **Prerequisites**
- Node.js 16+ and npm
- Modern web browser for testing
- Git for version control

### **Initial Setup**
```bash
git clone <repository-url>
cd astral-surveyor
npm install            # Install dependencies
npm run build          # Initial build
npm test              # Verify everything works (1,500+ tests)
```

### **Daily Development Workflow**
```bash
npm run dev           # Start TypeScript watch mode
# Edit files in src/ directory
npm run build         # Build when ready to test
npm test              # Run full test suite
npm run serve         # Test locally on localhost:3000
```

### **Available Commands**
```bash
# Build & Development
npm run build         # Compile TypeScript + copy assets
npm run dev           # TypeScript watch mode
npm run clean         # Remove dist/ directory  
npm run rebuild       # Clean + build

# Code Quality
npm run lint          # Check for code quality issues
npm run lint:fix      # Auto-fix linting problems
npm run format        # Format code with Prettier
npm run format:check  # Verify formatting compliance

# Testing
npm test              # Build + run all tests
npm run test:watch    # Build + watch mode testing
npm run test:coverage # Build + coverage report
npm run test:ui       # Build + visual test interface

# Local Development Server
npm run serve         # Start local development server on port 3000
```

## 🧪 Testing Strategy

### **Test Architecture**
- Tests import from compiled JavaScript in `dist/`
- **Coverage targets**: 80%+ on critical systems
- **Current test count**: 1,500+ comprehensive tests covering all major systems
- **Coverage**: High coverage on core logic (naming, random utilities, services)

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
│   ├── asteroids.test.js            # Asteroid garden testing
│   ├── celestial.test.js            # Core celestial discovery logic & physics
│   ├── comets.test.js               # Comet system comprehensive testing
│   ├── comet-*.test.js              # Specialized comet feature tests
│   ├── nebulae.test.js              # Nebula generation testing
│   └── wormholes.test.js            # Wormhole system testing
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

### **Developer Tools and Debugging** (`src/debug/`)
- **Developer Console**: In-game console accessible during development
- **Command Registry**: Extensible system for registering debug commands
- **Debug Spawning**: Quick object spawning with Shift+W (wormholes) and Shift+B (black holes)
- **Error Boundary**: Production-ready error handling with graceful recovery
- **Performance Monitor**: Real-time performance tracking and optimization alerts

### **Service Architecture** (`src/services/`)
- **Dependency Injection**: Constructor-based service injection for testability (DIContainer)
- **Event System**: Loose coupling through publish/subscribe patterns
- **Service Orchestration**: Centralized coordination of cross-service interactions
- **Plugin Management**: Extensible architecture for community contributions
- **Performance Monitoring**: Real-time tracking and optimization
- **Error Handling**: Comprehensive recovery strategies and graceful degradation
- **Discovery Visualization**: Enhanced user feedback for celestial discoveries

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

### **Celestial Object System** (`src/celestial/`)
- **Complete Object Types**: Stars, planets, moons, comets, nebulae, wormholes, black holes, asteroid gardens
- **Comet System**: Advanced visual effects with dynamic tails and specialized discovery mechanics
- **Procedural Generation**: Realistic distributions and physical plausibility
- **Orbital Mechanics**: Following Kepler's laws for planets and moons

### **Discovery System** (`src/services/DiscoveryService.ts`, `src/celestial/`)
- Centralized discovery logic service with enhanced visualization
- Tiered discovery ranges (stars: 500px, planets: 40px, moons: 30px)
- Visual-based star discovery for navigation
- Distance-based planet/moon discovery for exploration
- Specialized discovery mechanics for comets and rare celestial objects
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
4. Run `npm run build && npm test` before committing (all 2,400+ tests must pass)
4a. Run `npm run lint` to ensure code quality standards are met
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

## 🤝 Contributing Guidelines

### **Development Philosophy**
Follow the principles outlined in `CLAUDE.md`:
- **Testability First**: Structure code for easy unit and integration testing
- **TDD Approach**: Think through test cases before coding critical systems
- **Service Architecture**: Use dependency injection for modularity and testability
- **Plugin System**: Extend functionality through plugins rather than modifying core files

### **Code Quality Standards**
```bash
npm run lint          # Check for code quality issues
npm run lint:fix      # Auto-fix linting problems
npm run format        # Format code with Prettier
npm run format:check  # Verify formatting compliance
```

All code must pass linting and formatting checks before merge - enforced by CI.

### **Pull Request Process**
1. **Branch Strategy**: Create feature branch from main (`git checkout -b feature/your-feature`)
2. **Development**: Make changes in `src/` directory only (never edit `dist/`)
3. **Testing**: Write tests first for new services or architectural changes (TDD)
4. **Validation**: Run `npm run build && npm test && npm run lint` (all 1,500+ tests must pass)
5. **Commit**: Exclude `dist/` from commits (it's auto-generated)
6. **PR Creation**: GitHub Actions will verify build + tests automatically
7. **Review**: Consider performance impact and update documentation if needed

### **Git Workflow Best Practices**
```bash
# Start new feature
git checkout main && git pull origin main
git checkout -b feature/your-feature

# During development
npm run build && npm test  # Validate before committing
git add src/               # Only add source files
git commit -m "descriptive message"

# Before PR
npm run lint              # Ensure code quality
git push -u origin feature/your-feature
gh pr create             # Create pull request
```

## 📦 Plugin Development

### **Plugin System Architecture**
Astral Surveyor features an extensible plugin system that allows developers to add new celestial objects, discovery types, audio content, visual effects, and gameplay mechanics without modifying core files.

### **Plugin Types Supported**
- **Celestial**: New celestial object types (custom stars, planets, exotic phenomena)
- **Discovery**: Custom discovery conditions and lore content
- **Audio**: Soundscapes and ambient audio for specific zones or discoveries
- **Visual**: Rendering effects and visual enhancements
- **Gameplay**: New mechanics and interactions
- **Data**: Save/load formats and data processing extensions

### **Creating a Plugin**
1. **Interface**: Implement the plugin interface in `src/types/PluginTypes.ts`
2. **Lifecycle**: Handle registration, activation, deactivation, and cleanup properly
3. **Error Handling**: Ensure graceful failure without crashing the core system
4. **Testing**: Write comprehensive tests following patterns in `tests/services/exampleplugin.test.js`
5. **Documentation**: Document plugin APIs and provide usage examples

### **Plugin Integration Guidelines**
- Use dependency injection to access core services safely
- Follow event-driven patterns for loose coupling
- Maintain service boundaries and avoid tight coupling with core systems
- Use the ServiceOrchestrator for cross-service coordination when needed
- Test plugin integration thoroughly with both success and failure scenarios

### **Example Plugin Structure**
```typescript
export class MyCustomPlugin implements CelestialPlugin {
  name = "my-custom-plugin";
  version = "1.0.0";
  
  register(api: PluginAPI): void {
    // Plugin registration logic
  }
  
  unregister(): void {
    // Cleanup logic
  }
  
  // Plugin-specific methods
}
```

## 🌐 Deployment & Distribution

### **Browser-First Architecture**
- **No Installation**: Runs directly in any modern web browser
- **Cross-Platform**: Works on desktop, tablet, and mobile devices
- **Offline Capable**: All universe generation happens client-side
- **No Backend**: Completely serverless architecture for maximum accessibility
- **Performance**: 60fps target with optimized rendering and memory management

### **GitHub Pages Deployment**
- Game deploys from `dist/` directory after successful build
- `game.html` becomes `index.html` in distribution
- CSS and assets are copied directly with cross-platform build scripts
- No server-side processing required - purely static deployment

### **Build Process Details**
1. **TypeScript Compilation**: `src/*.ts` → `dist/*.js` with full type checking
2. **Asset Pipeline**: `game.html` → `dist/index.html`, `css/` → `dist/css/`
3. **Cross-Platform**: Build scripts use Node.js APIs for Windows/Unix compatibility
4. **Optimization**: Production builds are optimized for size and performance

### **Performance & Scalability**
- **Infinite Universe**: Chunk-based loading system supports unlimited exploration
- **Memory Efficient**: Automatic unloading of distant areas to maintain performance  
- **Responsive Controls**: Smooth animations and 60fps target across all devices
- **Optimized Rendering**: Only draws visible objects to maintain high framerates

## 🔗 Key References & Configuration

- **README.md**: Player-focused game features and gameplay information
- **CLAUDE.md**: Core development values, principles, and team guidelines
- **package.json**: Node.js dependencies, scripts, and project metadata
- **tsconfig.json**: TypeScript compilation configuration and build settings
- **vitest.config.js**: Test framework configuration with coverage settings and test organization
- **game.html**: Main HTML entry point (becomes index.html in dist)

---

*For game features, controls, and player information, see [README.md](README.md)*
