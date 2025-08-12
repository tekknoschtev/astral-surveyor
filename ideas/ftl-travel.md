# FTL Travel

## Wormholes 🌀
Wormholes will be extremely rare, naturally occurring phenomena that allow for instantaneous travel between two distant points in the universe. They will appear in pairs, with each wormhole leading to its twin, enabling players to travel back and forth between the two locations. This provides a tranquil method of long-distance travel, perfect for returning to previously discovered areas or quickly exploring a new region of the cosmos.

## Key Mechanics & Rules
- [x] **Discovery:** Similar to other stellar objects, wormholes will be discoverable from a set distance, ensuring players can spot them as they explore.
- [x] **Naming:** Follow plausible scientific naming schemes for wormholes.  A pair of wormhole will always be linked.  One will be {name}-α and the other will be {name}-β
- [x] **Visuals:** A wormhole will be a swirling vortex of light and energy. The most unique visual effect will be a gravitational lensing effect  in the area around the wormhole, where the image of the space on the other side is visible within its radius. This "window" to the destination will show what celestial objects, if any, are waiting on the other side.
- [x] **Travel:** To use a wormhole, the player simply needs to fly their ship into the vortex. Upon entry, the screen will go dark, with a visually serene transition effect, and the player's ship will instantly appear at the location of the paired wormhole, with its momentum maintained.
- [x] **Navigation:** The stellar map will be updated to show the location of both wormholes in a pair. This will allow players to use them as navigational tools, creating shortcuts across the expansive universe. The map will likely use a visual cue, such as a dashed line or a shared icon, to indicate which wormholes are connected.
- [ ] **Lore:** In keeping with the game's theme, the discovery logbook will catalog wormholes as "cosmic anomalies" with timestamps and exploration history. The description could mention their unpredictable nature and the incredible distances they traverse, adding to the game's sense of wonder.

## Stretch Goals
- [ ] **Moving Wormholes:** Identifying a mechanic to allow the player to reposition a wormhole end point would enhance the engagement, allowing the player to setup a network of wormholes to move around the universe.

---

## Detailed Implementation Plan

### 1. **Wormhole Class & Type System** 
- [x] Create `src/celestial/wormholes.ts` with `Wormhole` class extending `CelestialObject`
- [x] Define `WormholeType` interface with visual and physical properties
- [x] Implement pairing mechanism with shared wormhole IDs (`WH-1234-α` / `WH-1234-β`)
- [x] Add gravitational lensing preview system showing destination view within aperture
- [x] Set discovery distance: 100-120px (larger than planets, smaller than stars)

### 2. **World Generation Integration**
- [x] Add wormhole generation to chunk system (`src/world/world.ts`)
- [x] Implement extremely rare spawning (0.0005% chance per chunk = ~1 every 2000 chunks)
- [x] Create deterministic pair generation ensuring both wormholes always exist
- [x] Add smart placement avoiding star systems (minimum 500px from celestial stars)
- [x] Integrate with discovery and naming systems

### 3. **Visual Rendering System**
- [x] Create swirling vortex animation with layered spiral effects
- [x] Implement gravitational lensing preview showing destination objects within aperture
- [x] Add particle systems for energy field effects around wormhole rim
- [x] Create discovery indicators (golden rotating ring for discovered wormholes)
- [x] Design distinct α/β visual markers (Greek letter indicators)

### 4. **Travel Mechanics & Physics**
- [x] Implement collision detection for ship entry (radius-based trigger)
- [x] Create serene transition sequence: fade to black → particle tunnel → fade in at destination  
- [x] Preserve momentum through travel (maintain velocity/direction)
- [x] Add exit positioning system (spawn 50px from destination wormhole)
- [x] Integrate with camera system for smooth positioning

### 5. **Navigation & UI Integration**
- [x] Update stellar map to show wormhole pairs with connecting dashed lines
- [x] Create distinct wormhole icons on map (spiral symbol with α/β indicators)
- [x] Add interactive hover/selection support with proper cursor management
- [x] Implement smart labeling with names and twin coordinates at zoom levels
- [ ] Add wormhole filtering and zoom-to-wormhole functionality  
- [ ] Integrate with discovery logbook for travel history tracking
- [ ] Add coordinate sharing support for wormhole locations

### 6. **Naming & Discovery System**
- [x] Extend `NamingService` with astronomical wormhole naming (`WH-1234-α` / `WH-1234-β`)
- [x] Create classification system ("Einstein-Rosen Bridge", "Stable Traversable Wormhole")
- [x] Add both wormholes to notable discoveries (all wormholes are rare)
- [ ] Implement discovery linking (discovering one reveals both on map)
- [x] Add wormhole-specific discovery sounds (deep, resonant tones with harmonic richness)

### 7. **Testing & Quality Assurance**
- [x] Create comprehensive test suite (`tests/celestial/wormholes.test.js`)
- [x] Test pairing logic, travel mechanics, and visual effects
- [x] Validate world generation and chunk integration
- [x] Create integration tests for chunk management and discovery systems
- [x] Edge case testing (rapid entry, missing twins, extreme coordinates, etc.)
- [x] Add NamingService wormhole integration tests
- [ ] Performance testing for gravitational lensing effects

### 8. **Audio & Polish**
- [x] Design ambient wormhole sound effects (deep 55Hz resonant discovery tone)
- [x] Create travel transition audio (80Hz dimensional shift with perfect fifth harmony)
- [x] Add discovery chimes specific to wormhole encounters (sawtooth waveform with low-pass filter)
- [x] Implement audio effects during travel sequence (dedicated traversal sound)

