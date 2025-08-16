# Astral Surveyor - Developer Guide

## 🏗️ Architecture Overview

Astral Surveyor uses a **TypeScript + ES6 modules** architecture with a build pipeline that compiles to JavaScript for browser compatibility.

### **Key Architectural Decisions**
- **TypeScript**: Full type safety with comprehensive interfaces
- **ES6 Modules**: Proper import/export instead of global window objects
- **Build Pipeline**: Source in `src/`, compiled output in `dist/`
- **Test Strategy**: Tests run against compiled JavaScript for accurate coverage
- **Browser Compatibility**: Static deployment with no build-time dependencies

## 📁 Project Structure

```
src/                    # TypeScript source files
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
├── celestial/
│   └── celestial.ts   # Stars, planets, moons (1038 lines)
├── ship/
│   └── ship.ts        # Player ship + particle systems
├── world/
│   └── world.ts       # Procedural world generation (1086 lines)
├── ui/
│   ├── ui.ts          # Discovery display & HUD
│   ├── discoverylogbook.ts # Exploration history
│   ├── stellarmap.ts  # Interactive star map (1060 lines)
│   └── touchui.ts     # Mobile touch interface
└── game.ts            # Main game loop & orchestration (466 lines)

dist/                   # Compiled JavaScript (auto-generated, gitignored)
tests/                  # Test suite (imports from dist/)
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
├── utils/random.test.js       # Seeded RNG & coordinate systems
├── naming/naming.test.js      # Astronomical naming conventions
├── naming/planet-moon-naming.test.js # Planet/moon designations  
└── celestial/celestial.test.js # Discovery logic & physics
```

### **What We Test**
- ✅ **Deterministic systems**: Random generation, naming, coordinates
- ✅ **Discovery logic**: Star/planet/moon detection ranges
- ✅ **Astronomical accuracy**: IAU naming conventions, orbital mechanics
- ❌ **UI/Rendering**: Mostly untested (by design - focus on core logic)

## 🎯 Core Systems

### **Random Generation** (`src/utils/random.ts`)
- Seeded deterministic RNG for consistent universes
- Position-based hashing for infinite world generation
- URL parameter handling for shareable coordinates

### **Astronomical Naming** (`src/naming/naming.ts`) 
- IAU-inspired catalog designations (ASV-2847 G)
- Planet/moon naming with proper suffixes (b, c, I, II)
- Stellar classification integration

### **World Generation** (`src/world/world.ts`)
- Chunk-based infinite universe
- Realistic star type distributions
- Orbital mechanics following Kepler's laws

### **Discovery System** (`src/celestial/celestial.ts`)
- Tiered discovery ranges (stars: 500px, planets: 40px, moons: 30px)
- Visual-based star discovery for navigation
- Distance-based planet/moon discovery for exploration

## 📋 Development Guidelines

### **TypeScript Best Practices**
- Use comprehensive interfaces for all major systems
- Prefer `type` over `interface` for simple shapes
- Export classes/functions explicitly, avoid default exports
- Use `any` sparingly (current codebase has some legacy `any`)

### **File Organization**  
- Group by domain (`celestial/`, `ui/`) not type (`models/`, `utils/`)
- Keep large systems in single files (celestial.ts, world.ts)
- Use descriptive imports: `import { SeededRandom } from '../utils/random.js'`

### **Testing Approach**
- Test core logic, not UI rendering
- Focus on deterministic systems that can be reliably tested
- Use descriptive test names explaining the behavior
- Mock external dependencies when necessary

### **Git Workflow**
1. Create feature branch from main
2. Make changes in `src/` directory only
3. Run `npm run build && npm test` before committing
4. Exclude `dist/` from commits (it's auto-generated)
5. Create PR - GitHub Actions will verify build + tests

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
