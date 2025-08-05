# Astral Surveyor
*A tranquil space exploration game of infinite wonder*

Astral Surveyor is a peaceful, 2D space exploration game where you chart the vast unknown of a procedurally generated universe. Step into the role of a lone surveyor, drifting through star systems in search of undiscovered planets, stars, and celestial phenomena.

With no combat or time pressure, your mission is one of peaceful curiosity: catalog rare stellar formations, discover exotic worlds, track orbiting moons, and build your own comprehensive star chart of the cosmos. Navigate using intuitive controls and professional-grade astronomical tools, accompanied by the serene silence of deep space.

Whether you discover a pulsing neutron star, encounter a binary system with swirling energy patterns, or find a gas giant with four orbiting moons, every discovery is a moment of wonder that's yours to catalog and share.

## Demo
You can play the game here:  <https://tekknoschtev.github.io/astral-surveyor/game.html>

## ✨ Key Features

### 🌟 **Advanced Discovery System**
- **Professional Astronomical Catalog**: IAU-inspired naming conventions with designations like "ASV-2847 G" and "ASV-1920 b II"
- **Tiered Discovery Ranges**: Stars discoverable from great distances for navigation, planets and moons requiring closer exploration
- **Discovery Logbook**: Comprehensive tracking of all your finds with timestamps and exploration history
- **Shareable Coordinates**: Generate URLs to share your most interesting discoveries with others

### 🌌 **Sophisticated Stellar Systems**
- **7 Distinct Star Types**: From common G-Type stars to ultra-rare Neutron Stars, each with unique visual effects
- **Binary Star Systems**: 10% of systems feature companion stars with realistic stellar evolution
- **Dynamic Visual Effects**: Swirling energy patterns, coronas, radiation fields, and stellar pulsing
- **Authentic Classification**: Proper stellar designations based on real astronomical science

### 🪐 **Rich Planetary Exploration**
- **7 Planet Types**: Rocky worlds, Ocean planets, Gas Giants, Desert worlds, Frozen planets, Volcanic worlds, and mysterious Exotic worlds
- **Spectacular Ring Systems**: Gas giants feature beautiful golden rings, frozen worlds may have icy rings, and exotic worlds display colorful shimmering rings
- **Moon Systems**: Gas giants and large planets can host up to 4 orbiting moons with fast orbital periods
- **Orbital Mechanics**: Planets and moons follow Kepler's laws with realistic orbital speeds and distances
- **Visual Variety**: Each world type features unique atmospheric effects, surface patterns, ring systems, and discovery rewards

### 🗺️ **Professional Cartography Tools**
- **Interactive Stellar Map**: Toggle with 'M' to view your expanding chart of discovered systems
- **Zoom Controls**: Scale from close planetary detail to vast galactic overview (0.1x to 10x zoom)
- **Grid Navigation**: 2000-unit coordinate system for precise navigation and location sharing
- **Discovery Tracking**: Visual indicators show which systems you've explored and cataloged

### 🚀 **Intuitive Space Physics**
- **Realistic Movement**: True space physics with momentum, coasting, and variable thrust intensity
- **Auto-Braking System**: Smooth automatic deceleration when approaching celestial objects
- **Multiple Control Schemes**: Full keyboard, mouse, and touch support for any device
- **Emergency Controls**: Instant braking and precise maneuvering for careful exploration

### 🎵 **Immersive Audio Design**
- **Ambient Space Atmosphere**: Subtle cosmic background that adapts to your velocity and movement state
- **Discovery Chimes**: Unique audio signatures for each celestial object type - from deep stellar tones to delicate moon chimes
- **Ship Audio Feedback**: Gentle thruster and braking sounds that respond to your piloting
- **Tranquil Sound Design**: All audio designed to enhance calm exploration without overwhelming the peaceful experience
- **Full Control**: Toggle mute instantly or customize your audio experience

## 🎮 Controls & Interface

### **Desktop Controls**
- **WASD** or **Arrow Keys**: Directional thrust (hold longer for more intensity)
- **Space**: Emergency braking
- **M**: Toggle stellar map
- **L**: Toggle discovery logbook
- **C**: Copy current coordinates to clipboard for sharing
- **H**: Toggle audio mute/unmute ("Hush")
- **ESC**: Close open interfaces
- **J/K**: Scroll through logbook entries (vim-style navigation)
- **+/-**: Zoom stellar map in/out
- **Mouse Wheel**: Scroll through discovery logbook when hovering

### **Mouse Controls**
- **Left Click**: Thrust toward cursor position
- **Right Click**: Brake toward cursor or full stop
- **Click on Map**: When stellar map is open, click stars for detailed information

### **Touch/Mobile Controls**
- **Touch**: Thrust toward touch position
- **Long Press**: Brake toward position or full stop
- **Pinch Gestures**: Zoom in/out on stellar map
- **Touch UI Buttons**: Map toggle and zoom controls appear when map is open

## 🔬 Game Mechanics

### **Discovery System**
The universe reveals its secrets at different scales:

- **🌟 Stars**: Discoverable from 480-540+ pixels away - perfect for long-range navigation and ensuring you never miss a system while cruising at high speeds
- **🪐 Planets**: Discoverable from ~38-50 pixels - requiring closer approach for detailed study
- **🌙 Moons**: Discoverable from ~27-30 pixels - intimate encounters with the smallest worlds

### **Astronomical Naming**
Every discovery receives a professional IAU-inspired designation:
- **Stars**: "ASV-2847 G" (Astral Survey Vessel catalog number + stellar classification)
- **Planets**: "ASV-2847 b", "ASV-2847 c" (system + orbital designation)
- **Moons**: "ASV-2847 b I", "ASV-2847 c II" (planet + Roman numeral)

### **Procedural Generation**
The universe is deterministically generated using seeded algorithms:
- **Infinite Worlds**: Chunk-based system loads content dynamically as you explore
- **Consistent Universe**: Same seed produces identical star systems for all players
- **Realistic Distribution**: Star and planet types follow astronomical frequency distributions
- **Orbital Physics**: Planets orbit their stars following Kepler's laws for realistic motion

### **Star System Types**
Encounter 7 different stellar classifications, each with unique properties:

| Star Type | Rarity | Description | Visual Effects |
|-----------|--------|-------------|----------------|
| **G-Type** | 30% | Sun-like yellow stars | Steady corona, gentle swirling |
| **K-Type** | 25% | Orange dwarf stars | Moderate corona, stable |
| **M-Type** | 25% | Red dwarf stars | Dim but long-lived |
| **Red Giant** | 10% | Evolved giant stars | Slow pulsing, majestic swirls |
| **Blue Giant** | 5% | Massive hot stars | Intense radiation, fast swirls |
| **White Dwarf** | 4% | Dense stellar remnants | Brilliant shimmer effects |
| **Neutron Star** | 1% | Ultra-dense pulsars | Rapid pulsing, extreme radiation |

### **Planetary Worlds**
Discover 7 distinct world types, each with unique characteristics:

| Planet Type | Rarity | Features | Discovery Value |
|-------------|--------|----------|-----------------|
| **Rocky** | 35% | Cratered surfaces, no atmosphere | Standard |
| **Ocean** | 20% | Blue worlds with atmospheric bands | High |
| **Gas Giant** | 15% | Swirling bands, moons, **40% have golden ring systems** | High |
| **Desert** | 15% | Dune patterns, arid landscapes | Standard |
| **Frozen** | 8% | Crystalline formations, glow, **30% have icy rings** | Rare |
| **Volcanic** | 5% | Lava flows, intense glow effects | Rare |
| **Exotic** | 2% | Purple shimmer, **50% have colorful rings** | Ultra-rare |

## 🛠️ Technical Features

### **Browser-First Architecture**
- **No Installation Required**: Runs directly in any modern web browser
- **Cross-Platform**: Works seamlessly on desktop, tablet, and mobile devices
- **Offline Capable**: All universe generation happens client-side
- **No Backend**: Completely serverless architecture for maximum accessibility

### **Performance & Scalability**
- **Infinite Universe**: Chunk-based loading system supports unlimited exploration
- **Memory Efficient**: Automatic unloading of distant areas to maintain performance
- **60fps Target**: Smooth animations and responsive controls across all devices
- **Optimized Rendering**: Only draws visible objects to maintain high framerates

### **Save & Share System**
- **Local Storage Ready**: Prepared for browser-based save/load functionality
- **Coordinate Sharing**: Generate shareable URLs for interesting discoveries
- **Deterministic Generation**: Shared coordinates lead to identical systems for all players
- **Privacy Focused**: All data remains local to your device

## 🌌 Getting Started

1. **Launch**: Open the game in any modern web browser
2. **Learn Controls**: Use WASD or touch controls to start moving
3. **First Discovery**: Find your first star and watch it get cataloged
4. **Open Your Map**: Press 'M' to see your growing star chart
5. **Explore**: Coast between systems and let the auto-braking guide your approaches
6. **Share**: Copy coordinates ('C' key) to share amazing discoveries with friends

## 🎯 Perfect For

- **Relaxation Seekers**: No combat, no time pressure, just peaceful exploration
- **Astronomy Enthusiasts**: Realistic stellar mechanics and professional naming conventions
- **Discovery Lovers**: Hundreds of unique worlds and systems to catalog
- **Casual Gamers**: Pick up and play anytime, exploration at your own pace
- **Mobile Users**: Full touch support for gaming on any device

---

*"In the vastness of space, every star has a story, every planet holds mysteries, and every discovery belongs to you."*

