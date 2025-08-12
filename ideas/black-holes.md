# Black Holes 🕳️

Black holes in Astral Surveyor will be extremely rare celestial objects, appearing in only a tiny fraction of star systems. Their immense gravitational pull will be reflected in the game's physics, affecting the player's ship movement when they get close. They won't have planets orbiting them, and their presence will prevent any other celestial objects from spawning within their radius.

## Key Mechanics & Rules
- [ ] **Discovery:** Black holes, like stars, will be discoverable from a great distance (e.g., 500+ pixels), allowing players to navigate towards them safely.
- [ ] **Appearance:** A black hole will appear as a massive, dark sphere, surrounded by a bright, swirling accretion disk or corona of light at its edge. This visual effect will be dynamic, showcasing the bending of light and spacetime around the object. The interior will be a completely black void that extends for many chunks, with a very small bright point of light, the singularity, at its absolute center.
- [ ] **Safety Warning:** As a player approaches the event horizon (the edge of the black hole's visual corona), a prominent, non-obtrusive warning will appear on the screen. This warning, perhaps a message like "Warning: Uncharted Gravity Well - Unknown Effects Beyond This Point," will inform the player of the potential consequences of entering the black hole.
- [ ] **Singularity Encounter:** The singularity is the final point of no return. Touching this point will trigger a unique game event. Instead of ending the game, it will reset the universe's procedural generation seed, creating an entirely new cosmos to explore. The player, however, will retain their discovery logbook and all previously cataloged celestial objects, ensuring that their progress isn't lost. This feature adds a sense of cosmic rebirth and provides a way for players to "start fresh" in a new universe while keeping their exploration history.

## Stretch Goals
- [ ] **Event Horizon:** After crossing the event horizon, it becomes difficult, if not impossible, to escape the gravity of the black hole.  The only option for the player is to enter the singularity.

---

## **Detailed Implementation Plan**

### **Phase 1: Black Hole Core System & Type Definitions** ✅

#### 1.1 **Black Hole Class Foundation**
- [ ] Create `src/celestial/blackholes.ts` with `BlackHole` class extending `CelestialObject`
- [ ] Define `BlackHoleType` interface with gravitational and visual properties  
- [ ] Implement **massive discovery distance** (800-1000px for early warning)
- [ ] Add **gravitational influence zones**: Event Horizon and Singularity Point
- [ ] Set **enormous visual size** (200-400px radius) to convey massive scale

#### 1.2 **Physics & Gravitational Effects**
- [ ] Implement **gravitational pull mechanics** affecting ship movement when approaching
- [ ] Create **Event Horizon threshold** - point of no return (optional stretch goal)
- [ ] Add **Singularity collision detection** - final trigger point for universe reset
- [ ] Design **safe approach zone** with gentle warning systems (500px+ from event horizon)

#### 1.3 **Safety Warning System**
- [ ] Create **proximity warning UI** - "Warning: Uncharted Gravity Well - Unknown Effects Beyond This Point"
- [ ] Implement **progressive warning intensity** as player approaches event horizon
- [ ] Add **visual danger indicators** (screen edge effects, gravitational lensing)
- [ ] Design **non-obtrusive but clear** warning presentation

---

### **Phase 2: Visual Rendering & Effects System** ✨

#### 2.1 **Black Hole Appearance**
- [ ] Render **massive dark sphere** with completely black interior (void effect)
- [ ] Create **bright, dynamic accretion disk** with swirling energy around edge
- [ ] Implement **corona of light** - bright ring/halo effect at event horizon
- [ ] Add **gravitational lensing effects** - light bending around the black hole
- [ ] Design **scale-appropriate rendering** - should dominate view when close

#### 2.2 **Dynamic Visual Effects**
- [ ] Create **swirling accretion disk animation** with particle-like energy flows
- [ ] Implement **pulsing corona intensity** to show active feeding
- [ ] Add **subtle gravitational distortion** effects on nearby background stars
- [ ] Design **singularity point marker** - tiny bright point at absolute center
- [ ] Create **depth layering** - accretion disk behind/in front of event horizon

#### 2.3 **Environmental Effects**
- [ ] Implement **background star lensing** - stars appear curved around black hole
- [ ] Create **light absorption zones** - areas where background stars are dimmed/hidden
- [ ] Add **scale-based LOD** - different detail levels based on distance
- [ ] Design **discovery indicator** - specialized visual cue for discovered black holes

---

### **Phase 3: World Generation & Rarity System** 🌌

#### 3.1 **Ultra-Rare Spawning**
- [ ] Implement **extremely low spawn rate** (0.0001% chance per chunk = ~1 every 10,000 chunks)
- [ ] Create **deterministic placement** ensuring consistent universe generation
- [ ] Add **isolation requirements** - minimum 2000px from any celestial stars or major objects
- [ ] Implement **chunk exclusion zones** - black holes prevent other major objects nearby

#### 3.2 **World Integration**
- [ ] Add black hole generation to `src/world/world.ts` chunk system
- [ ] Create **gravitational exclusion mechanics** - no planets/moons/stations within influence
- [ ] Implement **discovery system integration** with appropriate naming
- [ ] Add **chunk loading optimization** for massive black hole objects

#### 3.3 **Naming & Classification**
- [ ] Extend `NamingService` with **astronomical black hole naming** (BH-1234, SGR A* style)
- [ ] Create **scientific classification** ("Stellar Mass Black Hole", "Galactic Core Object")
- [ ] Add **discovery significance** - all black holes are **ultra-rare notable discoveries**
- [ ] Implement **special logbook entries** with cosmic significance descriptions

---

### **Phase 4: Universe Reset & Seed Regeneration System** ♻️

#### 4.1 **Singularity Encounter Mechanics**
- [ ] Implement **singularity collision detection** (precise center point trigger)
- [ ] Create **cosmic transition sequence** - ethereal fade to cosmic background
- [ ] Design **universe regeneration logic** - new procedural seed generation
- [ ] Add **progress preservation** - maintain discovery logbook and statistics

#### 4.2 **Seed Management System**
- [ ] Extend `src/utils/random.ts` with **universe reset functionality**
- [ ] Create **new seed generation** method maintaining deterministic principles
- [ ] Implement **logbook preservation** across universe resets
- [ ] Add **reset statistics tracking** (number of universes explored)

#### 4.3 **Transition Experience**
- [ ] Design **serene cosmic transition** - gradual fade through cosmic colors
- [ ] Create **"Big Bang" emergence** - new universe fades in from cosmic background
- [ ] Add **notification system** - "Cosmic Rebirth Complete - New Universe Generated"
- [ ] Implement **starting position logic** - respawn away from immediate dangers

---

### **Phase 5: Navigation & UI Integration** 🗺️

#### 5.1 **Stellar Map Integration** 
- [ ] Add black holes to stellar map rendering with **distinctive cosmic symbols**
- [ ] Create **danger zone indicators** on map - red hazard zones around black holes
- [ ] Implement **gravitational influence visualization** - colored radius showing effect zones
- [ ] Add **hover information** showing mass, danger level, and approach warnings

#### 5.2 **Discovery & Warning Systems**
- [ ] Create **special discovery notifications** for ultra-rare black hole encounters
- [ ] Implement **proximity alert system** - progressive warnings as player approaches
- [ ] Add **logbook integration** with detailed scientific descriptions and lore
- [ ] Create **coordinate sharing** for black hole locations (for brave explorers)

---

### **Phase 6: Audio & Atmospheric Design** 🔊

#### 6.1 **Gravitational Audio Effects**
- [ ] Design **deep, ominous discovery sound** - very low frequency rumble (20-40Hz)
- [ ] Create **proximity audio** - increasing gravitational "hum" as approach continues
- [ ] Add **event horizon audio** - ethereal, otherworldly tones at point of no return  
- [ ] Implement **singularity sound** - cosmic "completion" tone for universe reset

#### 6.2 **Environmental Audio**
- [ ] Create **gravitational distortion effects** on ambient sounds near black holes
- [ ] Add **cosmic silence zones** - dampened audio within event horizon
- [ ] Design **transition audio sequence** - from cosmic silence to new universe emergence
- [ ] Implement **audio filtering** - realistic space audio dampening effects

---

### **Phase 7: Testing & Quality Assurance** 🧪

#### 7.1 **Comprehensive Test Suite**
- [ ] Create `tests/celestial/blackholes.test.js` with complete black hole logic testing
- [ ] Test **universe reset functionality** - seed regeneration, progress preservation
- [ ] Validate **gravitational physics** - approach mechanics, collision detection
- [ ] Create **integration tests** for world generation and discovery systems

#### 7.2 **Edge Case & Safety Testing**
- [ ] Test **rapid universe resets** - multiple singularity encounters
- [ ] Validate **logbook data persistence** across universe changes
- [ ] Test **coordinate sharing** and **multiplayer consistency** of black hole locations
- [ ] Performance testing for **massive visual rendering** and gravitational calculations

---

### **Phase 8: Documentation & Polish** 📚

#### 8.1 **Feature Documentation**
- [ ] Update `README.md` with **Black Holes** feature section
- [ ] Document **universe reset mechanics** and **discovery preservation**
- [ ] Create **safety warnings** and **approach guidance** for players
- [ ] Add **scientific accuracy notes** and **astronomical inspiration**

#### 8.2 **Lore & World Building**
- [ ] Create **discovery logbook entries** with cosmic significance descriptions
- [ ] Add **lore explanations** for universe reset mechanics ("cosmic rebirth")
- [ ] Design **achievement system** for black hole discoveries and universe resets
- [ ] Write **scientific descriptions** maintaining astronomical accuracy

---

## **🎯 Implementation Priority & Success Criteria**

### **Core Features (Must Have)**
- Black hole visual rendering with accretion disk and event horizon
- Ultra-rare spawning with proper world generation integration  
- Universe reset mechanics with discovery logbook preservation
- Safety warning system with clear danger indicators

### **Enhanced Features (Should Have)**
- Gravitational physics affecting ship movement
- Stellar map integration with danger zone visualization
- Audio design with gravitational effects and cosmic transition sounds
- Comprehensive testing and edge case validation

### **Polish Features (Nice to Have)**
- Event horizon mechanics with point of no return
- Advanced gravitational lensing effects
- Achievement system for cosmic exploration
- Performance optimization for massive object rendering

---

## **🚀 Expected Timeline & Milestones**

**Phase 1-2**: Core black hole rendering and visual effects (Foundation)
**Phase 3-4**: World generation integration and universe reset system (Core Mechanics)  
**Phase 5-6**: UI integration and audio design (User Experience)
**Phase 7-8**: Testing, documentation, and final polish (Quality Assurance)

This plan follows the successful pattern established by the wormhole implementation, ensuring **systematic development**, **comprehensive testing**, and **cohesive integration** with existing game systems while delivering the **tranquil cosmic wonder** that defines Astral Surveyor's exploration experience.

---
