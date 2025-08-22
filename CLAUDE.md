This document defines the **guiding principles and values** for building _Astral Surveyor_.
It exists to help current and future contributors - including future-me - make good decisions, stay focused, and build with care.

# Core Values
**Testability and Quality**
* Favor **testable code**, even for UI or rendering logic.
* Write code ** with testing in mind**.  Structure it for unit and integration testing.
Avoid relying on side effects or global state - keep behavior predictable.

**TDD is King**
* Strive for a **test-first mindset** - at least thinking through test cases before coding.
* Not all code needs full test coverage, but **core logic** should be covered.
* Use lightweight testing libraries or simple assertion helpers

# Design Philosophy 
* If a solution seems clever, pause.  Ask:  Is this easier to read, maintain, or extend?
* Prefer boring, understandable code.
* Avoid abstractions unless they remove repetition _and_ improve clarity.
* Group files by **domain** (e.g., `celestial/`, `services/`, `world/`) not type (`utils/`, `models/`).
* Follow **service-oriented architecture** with dependency injection for testability and modularity.
* Use **event-driven patterns** for loose coupling between services.

# Game Intent
**Chill, Non-violent Exploration**
* Designed to be peaceful, tranquil, ambient, and curiosity-driven.
* Avoid elements that require time pressure, micromanagement, or resource stress.
* Every system should reinforce a sense of **wonder and calm**.

**Procedural but Meaningful**
* Randomness should be constrained by **logic and structure** (e.g., star types obey physical plausibility).
* Strive for **emergent patterns** that players can learn to recognize.

# Development Practices
* Use **version control early and often** - commit frequently with meaningful messages.
* Keep branches short-lived and delete them once merged.
* Maintain a small `docs/` folder for explaining procedural algorithms, star/planet/object classification, HUD structure, etc.
* Prefer **plain data** (e.g., JSON, YAML) for defining object types, palettes, or lore entries where possible.

# Browser-focused Build
* The game is intended to run in-browser, without a backend
* Save/load uses **localStorage** or **IndexedDB** - respect user privacy and don't transmit data.
* Keep bundle size reasonable to support offline use

## Project Context to Remember
- Game focuses on tranquil, non-violent exploration
- Browser-based with localStorage saves
- Uses deterministic seeded generation for consistent universes
- Chunk-based loading for infinite world generation
- **Service-oriented architecture** with dependency injection and event-driven communication
- **Plugin system** enables community extensibility for celestial objects, discovery types, and audio content
- **Error resilience** with comprehensive error handling and graceful degradation
- **Performance monitoring** for optimization and regression detection
- **Developer tooling** with in-game console, debug commands, and quality assurance systems
- Core values: testability, simplicity, emergent wonder, extensibility

## Current Service Architecture
* **ServiceOrchestrator** coordinates cross-service interactions and lifecycle management
* **EventSystem** enables loose coupling between components with pub/sub patterns
* **PerformanceMonitor** tracks optimization opportunities and performance regressions
* **ErrorBoundary** provides graceful error handling and recovery mechanisms
* **DiscoveryVisualizationService** enhances user feedback for celestial discoveries
* **CelestialFactory** and **CelestialService** manage procedural object generation
* **AudioService** provides immersive soundscapes and discovery audio feedback
* **WorldService** handles infinite world generation with chunk-based loading

# Not Yet Prioritized 
Some things that **are not** priorities right now:
* Multiplayer or networking
* Backend services or logins
* Real-time simulation or physics 

# Code Quality Standards
**Linting and Formatting**
* Use `npm run lint` to check for code quality issues
* Use `npm run lint:fix` to auto-fix linting problems
* Use `npm run format` to format code with Prettier
* Use `npm run format:check` to verify formatting compliance
* All code must pass linting before merge - enforced by CI

# Testing Strategy
**Automated Unit Testing with Vitest**
* Use `npm test` to run the test suite during development
* Use `npm run test:watch` for continuous testing during coding
* Use `npm run test:coverage` to generate coverage reports
* Focus tests on **deterministic systems** (random generation, naming, discovery logic)
* GitHub Actions automatically run tests on all PRs - **tests must pass to merge**

**Test Organization**
* Tests are in `tests/` directory testing TypeScript-compiled code in `dist/`
* Test files end with `.test.js` and import from compiled JavaScript modules
* Source code is in `src/` directory with TypeScript files (`.ts`)
* Critical systems tested: random generation, naming service, celestial discovery, service architecture
* **Service-level testing**: Comprehensive tests for all services (WorldService, CelestialService, AudioService)
* **Plugin system testing**: Tests for plugin registration, lifecycle, and API integration
* **Integration tests**: Cross-service interactions and event system validation
* **Performance tests**: Monitoring, optimization, and regression detection

**Testing Commands**
```bash
npm run build         # Build TypeScript to dist/ (required first)
npm test              # Build + run all tests once  
npm run test:watch    # Build + run tests in watch mode
npm run test:coverage # Build + generate coverage report
npm run test:ui       # Build + open Vitest UI in browser
npm run dev           # TypeScript watch mode for development
```

# Developer Tools and Debugging
**Developer Console**
* Built-in developer console accessible in-game
* Command registry system for extensible debug commands
* Debug spawning system (Shift+W, Shift+B) for testing celestial objects
* Error boundary and performance monitoring for production resilience

**Quality Assurance**
* PerformanceMonitor tracks optimization opportunities and regression detection
* ErrorBoundary provides graceful error handling without crashes
* Comprehensive logging for debugging complex procedural generation issues

# TypeScript Development Workflow

## Source Code Structure
* **Source files**: Edit `.ts` files in `src/` directory (TypeScript)
* **Build output**: Compiled `.js` files generated in `dist/` directory  
* **Tests**: Run against compiled JavaScript in `dist/` for accurate coverage
* **Service architecture**: Services in `src/services/` with dependency injection
* **Type definitions**: Comprehensive types in `src/types/` for all major systems
* **Domain organization**: Related functionality grouped in domain folders (`celestial/`, `world/`, `ui/`)

## Development Commands
* **Build**: `npm run build` - Compile TypeScript + copy assets
* **Watch mode**: `npm run dev` - Auto-rebuild on file changes
* **Clean**: `npm run clean` - Remove dist/ directory
* **Rebuild**: `npm run rebuild` - Clean + build from scratch

# Desired GIT workflow
When starting a new feature or refactor branch, try to follow the steps below:
1. Sync local main before making changes: `git pull origin main`
2. Start a new branch: `git checkout -b {{branch-name}}`
3. Make changes to `.ts` files in `src/` directory (never edit `js/` files - they're legacy)
4. **Build and test**: `npm run build && npm test` to ensure no regressions
5. Save work: `git add` all modified files (exclude `dist/` - it's auto-generated)
6. Commit: `git commit` with a descriptive message
7. Push to GitHub: `git push -u origin {{branch-name}}`
8. Submit a PR: `gh pr create` with a descriptive message and all validations
9. **Wait for CI**: GitHub Actions will run TypeScript compilation + tests automatically
10. Merge and delete branch: `git checkout main` then `git pull origin main` then `git branch -d {{feature-name}}`
11. Final sync: `git fetch -p`

# Plugin Development Guidelines

**Creating New Plugins**
* Follow the plugin interface in `src/types/PluginTypes.ts`
* Support proper lifecycle management (register/unregister)
* Handle errors gracefully without crashing the core system
* Write comprehensive tests following the patterns in `tests/services/exampleplugin.test.js`
* Document plugin APIs and provide usage examples

**Plugin Types Supported**
* **Celestial**: New celestial object types (quasars, artifacts, etc.)
* **Discovery**: Custom discovery conditions and lore content
* **Audio**: Soundscapes and ambient audio for specific zones
* **Visual**: Rendering effects and visual enhancements
* **Gameplay**: New mechanics and interactions
* **Data**: Save/load formats and data processing

**Service Integration Guidelines**
* Use dependency injection for service access
* Follow event-driven patterns for service communication
* Write service tests before implementation (TDD approach)
* Maintain service boundaries and avoid tight coupling
* Use the ServiceOrchestrator for cross-service coordination

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

**Architecture Considerations**
* Follow the established service-oriented architecture
* Use the plugin system for extensibility rather than modifying core files
* Maintain comprehensive test coverage for all new functionality
* Consider performance impact and use PerformanceMonitor for optimization