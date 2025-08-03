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
* Group files by **domain** (e.g., `navigation/`, `galaxy/`) not type (`utils/`, `models/`).

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
- Core values: testability, simplicity, emergent wonder

# Not YUet Prioritized 
Some things that **are not** priorities right now:
* Multiplayer or networking
* Backend services or logins
* Real-time simulation or physics 

