Core Systems to Add:
1. Player Ship - Simple visual representation you can see moving
2. Celestial Objects - Planets, nebulae, asteroids to discover
   - Stars should glow 
   - Stars should be significantly larger than the planets that orbit them
   - Planets should orbit the star (meaning planets also are associated with a star/spawn around a star)
   - Long distance between stars (maybe only when implementing the signal received system)
   - Dual-star systems
   - New objects:
     - Comets
     - Black Hole
     - Neutron Star
     - Nebulae
3. Discovery System - Detect when you're near something interesting
   - Procedural naming (make some rules for stars vs. planets)
4. Basic Catalog - Simple UI to track what you've found
   - Show list of most recent 10 found items on the right
   - 
5. UI/UX
   - Zooming system
   - Mini map

Modular Approach:
- Each feature as its own class (Ship, Planet, Nebula, etc.)
- Discovery logic separate from rendering
- Catalog as independent UI component

1`