# Stellar Surface Particle Effects

This document describes the enhanced stellar particle system implemented to simulate realistic stellar surface phenomena.

## Overview

The stellar particle system creates star-type-specific visual effects by connecting to the `StarType.visualEffects` properties and applying realistic astrophysical behaviors to particles.

## Star Type Effects

### 🌟 **G-Type Stars** (Sun-like)
- **Effect**: Convection patterns with swirling motion
- **Physics**: Surface material rises from inner layers, creating circulation cells
- **Visual**: Medium-speed particles with organized swirl patterns
- **Properties**: `hasSwirling: true, swirlSpeed: 0.3`

### 🔴 **Red Giants** . 
- **Effect**: Slow, majestic convection with pulsing expansion
- **Physics**: Large convection cells due to expanded stellar envelope
- **Visual**: Slow particle movement with synchronized pulsing
- **Properties**: `hasPulsing: true, hasSwirling: true, swirlSpeed: 0.15`

### 🔵 **Blue Giants**
- **Effect**: Intense radiation streams and stellar winds
- **Physics**: High-energy particles ejected by strong stellar winds
- **Visual**: Fast-moving particles with longer lifespans
- **Properties**: `hasRadiation: true, radiationIntensity: 0.3`

### ⚪ **White Dwarfs**
- **Effect**: Surface shimmer from extreme surface temperatures
- **Physics**: Rapid surface oscillations due to degenerate matter
- **Visual**: Small, fast particles with short lifespans
- **Properties**: `hasShimmer: true`

### 💫 **Neutron Stars** (Pulsars)
- **Effect**: Highly collimated radiation beams
- **Physics**: Magnetic field acceleration creates narrow particle jets
- **Visual**: Rotating beams of high-velocity particles
- **Properties**: `hasRadiation: true, hasPulsing: true, radiationIntensity: 0.8`

### 🔶 **K-Type & M-Type Stars**
- **Effect**: Gentle convection patterns
- **Physics**: Cooler surface temperatures create slower convection
- **Visual**: Slower particle speeds, smaller convection cells
- **Properties**: `hasSwirling: true, swirlSpeed: 0.2-0.25`

## Physics Implementation

### **Convection Cells**
- Particles spawn from inner surface (0.7-0.9x radius)
- Rise outward with tangential swirl component
- Cool and slow down at greater distances
- Some particles "sink" back toward surface

### **Magnetic Field Effects**
- Radiation particles follow simplified dipole field lines
- Creates channeled streams rather than uniform emission
- Intermittent application simulates field line reconnection

### **Cooling Dynamics**
- Particles experience drag proportional to distance from star
- Very distant particles have chance to reverse direction
- Simulates convective cooling and downflow

### **Pulsing Synchronization**
- Variable stars use time-based sine waves
- All particles for a star pulse in sync
- Affects both velocity and size

## Performance Considerations

- **Distance Culling**: Particles only spawn for stars <2000px from camera
- **Particle Limits**: Maximum 150 particles per star
- **Smart Spawning**: Spawn rates adjusted by star type and visual effects
- **Efficient Physics**: Physics calculations only applied to relevant particle types

## Technical Architecture

```typescript
// Particle creation flow
spawnParticles() -> createStarParticle() -> [specific particle creator]
                                        -> createPulsarParticle()
                                        -> createRadiationParticle()
                                        -> createConvectionParticle()
                                        -> createShimmerParticle()
                                        -> createPulsingParticle()

// Physics update flow  
update() -> updateParticlePhysics() -> applyConvectionPhysics()
                                   -> applyMagneticFieldEffects()
                                   -> applyCoolingEffects()
                                   -> applyPulsingEffects()
```

## Visual Integration

The particle system seamlessly integrates with existing stellar rendering:
- Particles use star color as base, then lighten for visibility
- Particle size varies by star type and intensity
- Alpha blending creates realistic glow effects
- Respects existing corona and radiation ring rendering

This creates a cohesive visual experience where each star type has distinctive, scientifically-inspired surface behavior that enhances the sense of wonder and discovery in the game.