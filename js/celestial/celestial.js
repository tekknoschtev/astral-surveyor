class CelestialObject {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.discovered = false;
        this.discoveryDistance = 50; // How close ship needs to be for discovery
    }

    distanceToShip(camera) {
        const dx = this.x - camera.x;
        const dy = this.y - camera.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    checkDiscovery(camera) {
        if (!this.discovered && this.distanceToShip(camera) <= this.discoveryDistance) {
            this.discovered = true;
            return true; // Newly discovered
        }
        return false;
    }

    render(renderer, camera) {
        // To be overridden by subclasses
    }
}

class Planet extends CelestialObject {
    constructor(x, y, parentStar = null, orbitalDistance = 0, orbitalAngle = 0, orbitalSpeed = 0, planetType = null) {
        super(x, y, 'planet');
        
        // Orbital properties
        this.parentStar = parentStar;
        this.orbitalDistance = orbitalDistance;
        this.orbitalAngle = orbitalAngle; // Current angle in radians
        this.orbitalSpeed = orbitalSpeed; // Radians per second
        
        // Planet type and properties
        this.planetType = planetType || PlanetTypes.ROCKY; // Default to rocky if not specified
        this.planetTypeName = this.planetType.name;
        
        // Initialize properties based on planet type
        this.initializePlanetProperties();
    }
    
    initializePlanetProperties() {
        // Set size based on planet type
        const baseRadius = 8 + Math.random() * 12; // 8-20 pixels base
        this.radius = baseRadius * this.planetType.sizeMultiplier;
        this.discoveryDistance = this.radius + 30;
        
        // Set color from planet type's color palette
        this.color = this.planetType.colors[Math.floor(Math.random() * this.planetType.colors.length)];
        
        // Set visual effects based on planet type
        this.visualEffects = { ...this.planetType.visualEffects };
        
        // Initialize stripe color if planet has stripes
        if (this.visualEffects.hasStripes) {
            this.stripeColor = this.darkenColor(this.color, 0.3);
        }
        
        // Initialize glow color if planet has glow
        if (this.visualEffects.hasGlow) {
            this.glowColor = this.lightenColor(this.color, 0.3);
        }
    }

    // Initialize planet with seeded random for deterministic generation
    initWithSeed(rng, parentStar = null, orbitalDistance = 0, orbitalAngle = 0, orbitalSpeed = 0, planetType = null) {
        // Update orbital properties if provided
        if (parentStar) {
            this.parentStar = parentStar;
            this.orbitalDistance = orbitalDistance;
            this.orbitalAngle = orbitalAngle;
            this.orbitalSpeed = orbitalSpeed;
        }
        
        // Update planet type if provided
        if (planetType) {
            this.planetType = planetType;
            this.planetTypeName = this.planetType.name;
        }
        
        // Generate unique identifier for this planet using the same system as discovery
        this.uniqueId = this.generateUniqueId();
        
        // Set size based on planet type using seeded random
        const baseRadius = rng.nextFloat(8, 20); // 8-20 pixels base
        this.radius = baseRadius * this.planetType.sizeMultiplier;
        this.discoveryDistance = this.radius + 30;
        
        // Set color from planet type's color palette using seeded random
        this.color = rng.choice(this.planetType.colors);
        
        // Set visual effects based on planet type
        this.visualEffects = { ...this.planetType.visualEffects };
        
        // Initialize stripe color if planet has stripes
        if (this.visualEffects.hasStripes) {
            this.stripeColor = this.darkenColor(this.color, 0.3);
        }
        
        // Initialize glow color if planet has glow
        if (this.visualEffects.hasGlow) {
            this.glowColor = this.lightenColor(this.color, 0.3);
        }
    }

    generateUniqueId() {
        // Use the same logic as the world manager's getObjectId for consistency
        if (this.parentStar) {
            const starX = Math.floor(this.parentStar.x);
            const starY = Math.floor(this.parentStar.y);
            const orbitalDistance = Math.floor(this.orbitalDistance);
            return `planet_${starX}_${starY}_orbit_${orbitalDistance}`;
        }
        // Fallback for planets without parent stars
        return `planet_${Math.floor(this.x)}_${Math.floor(this.y)}`;
    }

    // Simple hash function to convert string ID to numeric seed
    hashStringToNumber(str, offset = 0) {
        let hash = offset;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash) % 1000000; // Return positive number
    }

    updatePosition(deltaTime) {
        // Update orbital position if planet has a parent star
        if (this.parentStar && this.orbitalDistance > 0) {
            // Update orbital angle based on orbital speed
            this.orbitalAngle += this.orbitalSpeed * deltaTime;
            
            // Keep angle within 0 to 2π range
            if (this.orbitalAngle >= Math.PI * 2) {
                this.orbitalAngle -= Math.PI * 2;
            }
            
            // Calculate new position based on orbital parameters
            this.x = this.parentStar.x + Math.cos(this.orbitalAngle) * this.orbitalDistance;
            this.y = this.parentStar.y + Math.sin(this.orbitalAngle) * this.orbitalDistance;
        }
    }

    darkenColor(hex, amount) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, Math.floor((num >> 16) * (1 - amount)));
        const g = Math.max(0, Math.floor(((num >> 8) & 0x00FF) * (1 - amount)));
        const b = Math.max(0, Math.floor((num & 0x0000FF) * (1 - amount)));
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }

    lightenColor(hex, amount) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, Math.floor((num >> 16) + (255 - (num >> 16)) * amount));
        const g = Math.min(255, Math.floor(((num >> 8) & 0x00FF) + (255 - ((num >> 8) & 0x00FF)) * amount));
        const b = Math.min(255, Math.floor((num & 0x0000FF) + (255 - (num & 0x0000FF)) * amount));
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }

    render(renderer, camera) {
        const [screenX, screenY] = camera.worldToScreen(this.x, this.y, renderer.canvas.width, renderer.canvas.height);
        
        // Only render if on screen
        if (screenX >= -this.radius - 20 && screenX <= renderer.canvas.width + this.radius + 20 && 
            screenY >= -this.radius - 20 && screenY <= renderer.canvas.height + this.radius + 20) {
            
            // Draw glow effect if planet has glow (before main planet)
            if (this.visualEffects.hasGlow) {
                const glowRadius = this.radius + 8;
                const gradient = renderer.ctx.createRadialGradient(
                    screenX, screenY, this.radius,
                    screenX, screenY, glowRadius
                );
                gradient.addColorStop(0, this.glowColor + '40'); // Semi-transparent
                gradient.addColorStop(1, this.glowColor + '00'); // Fully transparent
                
                renderer.ctx.fillStyle = gradient;
                renderer.ctx.beginPath();
                renderer.ctx.arc(screenX, screenY, glowRadius, 0, Math.PI * 2);
                renderer.ctx.fill();
            }
            
            // Draw atmosphere if planet has one
            if (this.visualEffects.hasAtmosphere) {
                const atmosphereRadius = this.radius + 3;
                const atmosphereColor = this.lightenColor(this.color, 0.4);
                renderer.ctx.strokeStyle = atmosphereColor + '80'; // Semi-transparent
                renderer.ctx.lineWidth = 2;
                renderer.ctx.beginPath();
                renderer.ctx.arc(screenX, screenY, atmosphereRadius, 0, Math.PI * 2);
                renderer.ctx.stroke();
            }
            
            // Draw main planet
            renderer.drawCircle(screenX, screenY, this.radius, this.color);
            
            // Draw type-specific visual effects
            this.renderVisualEffects(renderer, screenX, screenY);
            
            // Visual indicator if discovered
            if (this.discovered) {
                renderer.ctx.strokeStyle = '#00ff88';
                renderer.ctx.lineWidth = 2;
                renderer.ctx.beginPath();
                renderer.ctx.arc(screenX, screenY, this.radius + 5, 0, Math.PI * 2);
                renderer.ctx.stroke();
            }
        }
    }

    renderVisualEffects(renderer, screenX, screenY) {
        const ctx = renderer.ctx;
        
        // Draw stripes (atmospheric bands for gas giants, ocean currents for ocean worlds)
        if (this.visualEffects.hasStripes) {
            const stripeCount = this.planetType === PlanetTypes.GAS_GIANT ? 5 : 3;
            for (let i = 0; i < stripeCount; i++) {
                const stripeY = screenY - this.radius + (this.radius * 2 / (stripeCount + 1)) * (i + 1);
                const stripeWidth = Math.sqrt(this.radius * this.radius - Math.pow(stripeY - screenY, 2)) * 2;
                
                if (stripeWidth > 0) {
                    ctx.fillStyle = this.stripeColor;
                    const stripeHeight = this.planetType === PlanetTypes.GAS_GIANT ? 3 : 2;
                    ctx.fillRect(
                        screenX - stripeWidth / 2, 
                        stripeY - stripeHeight / 2, 
                        stripeWidth, 
                        stripeHeight
                    );
                }
            }
        }
        
        // Draw swirls for gas giants
        if (this.visualEffects.hasSwirls) {
            ctx.strokeStyle = this.stripeColor;
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 2; i++) {
                const swirleRadius = this.radius * 0.7;
                const offsetX = (i === 0 ? -1 : 1) * this.radius * 0.3;
                ctx.beginPath();
                ctx.arc(screenX + offsetX, screenY, swirleRadius * 0.3, 0, Math.PI);
                ctx.stroke();
            }
        }
        
        // Draw craters for rocky/desert/frozen worlds
        if (this.visualEffects.hasCraters) {
            ctx.fillStyle = this.darkenColor(this.color, 0.4);
            // More generous crater scaling - larger planets get significantly more craters
            const baseCraterCount = Math.floor(this.radius / 6); // Increased from /8 to /6
            const bonusCraters = Math.floor((this.radius - 10) / 4); // Extra craters for larger planets
            const craterCount = Math.max(2, baseCraterCount + bonusCraters); // Minimum 2 craters
            
            for (let i = 0; i < craterCount; i++) {
                // Use unique planet ID for consistent but varied crater patterns
                const baseHash = this.hashStringToNumber(this.uniqueId || 'default');
                
                // Generate random but consistent angle for each crater
                const angleSeed = (baseHash + i * 50) % 1000 / 1000;
                const angle = angleSeed * Math.PI * 2;
                
                // Generate random but consistent distance from center
                const distanceSeed = (baseHash + i * 100 + 12345) % 1000 / 1000;
                const distance = this.radius * 0.7 * distanceSeed;
                
                const craterX = screenX + Math.cos(angle) * distance;
                const craterY = screenY + Math.sin(angle) * distance;
                
                // Generate consistent crater size
                const sizeSeed = (baseHash + i * 200 + 67890) % 1000 / 1000;
                const craterSize = 1 + sizeSeed * 2;
                
                ctx.beginPath();
                ctx.arc(craterX, craterY, craterSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Draw dune patterns for desert worlds
        if (this.visualEffects.hasDunePatterns) {
            ctx.strokeStyle = this.darkenColor(this.color, 0.2);
            ctx.lineWidth = 1;
            const baseHash = this.hashStringToNumber(this.uniqueId || 'default', 5000);
            const duneCount = 3 + Math.floor((baseHash % 100) / 50); // 3-4 dunes
            
            for (let i = 0; i < duneCount; i++) {
                // Add slight variation to dune positions using unique ID
                const positionSeed = (baseHash + i * 300) % 1000 / 1000;
                const yOffset = (positionSeed - 0.5) * this.radius * 0.2; // Small random offset
                const y = screenY - this.radius * 0.6 + (i * this.radius * 0.4) + yOffset;
                
                const width = Math.sqrt(this.radius * this.radius - Math.pow(y - screenY, 2)) * 1.5;
                if (width > 0) {
                    // Add slight curve variation
                    const curveSeed = (baseHash + i * 400) % 1000 / 1000;
                    const curveHeight = 2 + curveSeed * 3; // 2-5 pixel curve height
                    
                    ctx.beginPath();
                    ctx.moveTo(screenX - width / 2, y);
                    ctx.quadraticCurveTo(screenX, y - curveHeight, screenX + width / 2, y);
                    ctx.stroke();
                }
            }
        }
        
        // Draw crystalline patterns for frozen worlds
        if (this.visualEffects.hasCrystalline) {
            ctx.strokeStyle = this.lightenColor(this.color, 0.5);
            ctx.lineWidth = 1;
            const baseHash = this.hashStringToNumber(this.uniqueId || 'default', 7000);
            const crystalCount = 4 + Math.floor((baseHash % 100) / 25); // 4-7 crystal lines
            
            for (let i = 0; i < crystalCount; i++) {
                // Add variation to crystal angles using unique ID
                const angleSeed = (baseHash + i * 500) % 1000 / 1000;
                const baseAngle = (i / crystalCount) * Math.PI * 2;
                const angleVariation = (angleSeed - 0.5) * 0.3; // ±0.15 radian variation
                const angle = baseAngle + angleVariation;
                
                // Add variation to crystal lengths
                const lengthSeed = (baseHash + i * 600) % 1000 / 1000;
                const startRadius = 0.2 + lengthSeed * 0.2; // 0.2-0.4
                const endRadius = 0.6 + lengthSeed * 0.3;   // 0.6-0.9
                
                const startX = screenX + Math.cos(angle) * this.radius * startRadius;
                const startY = screenY + Math.sin(angle) * this.radius * startRadius;
                const endX = screenX + Math.cos(angle) * this.radius * endRadius;
                const endY = screenY + Math.sin(angle) * this.radius * endRadius;
                
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }
        
        // Draw lava flows for volcanic worlds
        if (this.visualEffects.hasLavaFlow) {
            ctx.strokeStyle = this.lightenColor(this.color, 0.3);
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                const angle = (i / 3) * Math.PI * 2;
                const startRadius = this.radius * 0.2;
                const endRadius = this.radius * 0.9;
                
                ctx.beginPath();
                ctx.moveTo(
                    screenX + Math.cos(angle) * startRadius,
                    screenY + Math.sin(angle) * startRadius
                );
                ctx.lineTo(
                    screenX + Math.cos(angle) * endRadius,
                    screenY + Math.sin(angle) * endRadius
                );
                ctx.stroke();
            }
        }
        
        // Draw shimmer effect for exotic worlds
        if (this.visualEffects.hasShimmer) {
            const time = Date.now() * 0.001; // Convert to seconds
            const shimmerAlpha = Math.sin(time * 2) * 0.3 + 0.7; // Oscillate between 0.4 and 1.0
            ctx.strokeStyle = this.lightenColor(this.color, 0.6) + Math.floor(shimmerAlpha * 255).toString(16).padStart(2, '0');
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.radius + 2, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

class Star extends CelestialObject {
    constructor(x, y, starType = null) {
        super(x, y, 'star');
        
        // Array to track planets orbiting this star
        this.planets = [];
        
        // Star type and properties
        this.starType = starType || StarTypes.G_TYPE; // Default to G-type if not specified
        this.starTypeName = this.starType.name;
        
        // Initialize properties based on star type
        this.initializeStarProperties();
    }
    
    initializeStarProperties() {
        // Set size based on star type
        const baseRadius = 80 + Math.random() * 60; // 80-140 pixels base
        this.radius = baseRadius * this.starType.sizeMultiplier;
        this.discoveryDistance = this.radius + 80;
        
        // Set color from star type's color palette
        this.color = this.starType.colors[Math.floor(Math.random() * this.starType.colors.length)];
        
        // Set visual effects based on star type
        this.visualEffects = { ...this.starType.visualEffects };
        
        // Full brightness for all stars
        this.brightness = 1.0;
    }

    // Initialize star with seeded random for deterministic generation
    initWithSeed(rng, starType = null) {
        // Update star type if provided
        if (starType) {
            this.starType = starType;
            this.starTypeName = this.starType.name;
        }
        
        // Generate unique identifier for this star
        this.uniqueId = this.generateUniqueId();
        
        // Set size based on star type using seeded random
        const baseRadius = rng.nextFloat(80, 140); // 80-140 pixels base
        this.radius = baseRadius * this.starType.sizeMultiplier;
        this.discoveryDistance = this.radius + 80;
        
        // Set color from star type's color palette using seeded random
        this.color = rng.choice(this.starType.colors);
        
        // Set visual effects based on star type
        this.visualEffects = { ...this.starType.visualEffects };
        
        // Full brightness for all stars
        this.brightness = 1.0;
    }

    generateUniqueId() {
        // Create unique identifier for this star based on position
        return `star_${Math.floor(this.x)}_${Math.floor(this.y)}`;
    }

    // Simple hash function to convert string ID to numeric seed (same as planets)
    hashStringToNumber(str, offset = 0) {
        let hash = offset;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash) % 1000000; // Return positive number
    }

    addPlanet(planet) {
        this.planets.push(planet);
    }

    render(renderer, camera) {
        const [screenX, screenY] = camera.worldToScreen(this.x, this.y, renderer.canvas.width, renderer.canvas.height);
        
        // Expand render bounds for corona and radiation effects
        const renderBounds = this.radius + 30;
        
        // Only render if on screen
        if (screenX >= -renderBounds && screenX <= renderer.canvas.width + renderBounds && 
            screenY >= -renderBounds && screenY <= renderer.canvas.height + renderBounds) {
            
            // Draw type-specific visual effects before the main star
            this.renderVisualEffects(renderer, screenX, screenY);
            
            // Draw the main star with enhanced luminosity
            this.drawStarWithLuminosity(renderer, screenX, screenY, this.radius);
            
            // Visual indicator if discovered
            if (this.discovered) {
                renderer.ctx.strokeStyle = '#00ff88';
                renderer.ctx.lineWidth = 3;
                renderer.ctx.beginPath();
                renderer.ctx.arc(screenX, screenY, this.radius + 8, 0, Math.PI * 2);
                renderer.ctx.stroke();
            }
        }
    }

    renderVisualEffects(renderer, screenX, screenY) {
        const ctx = renderer.ctx;
        
        // Draw corona effect
        if (this.visualEffects.hasCorona) {
            const coronaRadius = this.radius * this.visualEffects.coronaSize;
            const gradient = ctx.createRadialGradient(
                screenX, screenY, this.radius,
                screenX, screenY, coronaRadius
            );
            gradient.addColorStop(0, this.color + '20'); // Semi-transparent
            gradient.addColorStop(1, this.color + '00'); // Fully transparent
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(screenX, screenY, coronaRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw radiation effects for high-energy stars
        if (this.visualEffects.hasRadiation) {
            const intensity = this.visualEffects.radiationIntensity || 0.3;
            const radiationRadius = this.radius + 15;
            
            // Create multiple radiation rings
            for (let i = 0; i < 3; i++) {
                const time = Date.now() * 0.001;
                const offset = i * Math.PI * 0.67; // Offset each ring
                const alpha = (Math.sin(time * 2 + offset) * 0.3 + 0.7) * intensity;
                const alphaHex = Math.floor(alpha * 255).toString(16).padStart(2, '0');
                
                ctx.strokeStyle = this.color + alphaHex;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(screenX, screenY, radiationRadius + i * 5, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        
        // Draw shimmer effect for white dwarfs
        if (this.visualEffects.hasShimmer) {
            const time = Date.now() * 0.001;
            const shimmerAlpha = Math.sin(time * 3) * 0.2 + 0.8; // Oscillate between 0.6 and 1.0
            const alphaHex = Math.floor(shimmerAlpha * 255).toString(16).padStart(2, '0');
            
            ctx.strokeStyle = '#ffffff' + alphaHex;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.radius + 3, 0, Math.PI * 2);
            ctx.stroke();
            
            // Additional inner shimmer
            ctx.strokeStyle = this.color + alphaHex;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.radius * 0.8, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Draw swirling effects for dynamic stars
        if (this.visualEffects.hasSwirling && this.visualEffects.swirlSpeed > 0) {
            const time = Date.now() * 0.001;
            const swirlSpeed = this.visualEffects.swirlSpeed;
            
            // Create multiple swirling layers for depth
            for (let layer = 0; layer < 3; layer++) {
                const layerOffset = layer * Math.PI * 0.67; // Offset each layer
                const layerRadius = this.radius * (0.3 + layer * 0.2); // Inner to outer layers
                const rotationSpeed = swirlSpeed * (1 + layer * 0.3); // Different speeds per layer
                
                // Draw swirling arcs
                for (let i = 0; i < 6; i++) {
                    const angleOffset = (i / 6) * Math.PI * 2;
                    const rotation = time * rotationSpeed + angleOffset + layerOffset;
                    
                    // Calculate swirl path
                    const startAngle = rotation;
                    const endAngle = rotation + Math.PI * 0.4; // Arc length
                    
                    // Vary opacity based on time for undulating effect
                    const opacity = (Math.sin(time * 2 + angleOffset + layerOffset) * 0.3 + 0.7) * (0.2 - layer * 0.05);
                    const opacityHex = Math.floor(opacity * 255).toString(16).padStart(2, '0');
                    
                    // Use a brighter version of the star color for swirls
                    const swirlColor = this.lightenColor(this.color, 0.3) + opacityHex;
                    
                    ctx.strokeStyle = swirlColor;
                    ctx.lineWidth = 2 - layer * 0.3; // Thinner for outer layers
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, layerRadius, startAngle, endAngle);
                    ctx.stroke();
                }
            }
        }
    }
    
    // Helper method for lightening colors
    lightenColor(hex, amount) {
        // Parse hex color
        const colorNum = parseInt(hex.replace('#', ''), 16);
        const r = (colorNum >> 16) & 255;
        const g = (colorNum >> 8) & 255;
        const b = colorNum & 255;
        
        // Lighten by moving towards white
        const newR = Math.min(255, Math.floor(r + (255 - r) * amount));
        const newG = Math.min(255, Math.floor(g + (255 - g) * amount));
        const newB = Math.min(255, Math.floor(b + (255 - b) * amount));
        
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }
    
    // Enhanced star rendering with simple solid colors and pulsing
    drawStarWithLuminosity(renderer, screenX, screenY, baseRadius) {
        const time = Date.now() * 0.001;
        
        // Calculate effective radius (with pulsing if applicable)
        let effectiveRadius = baseRadius;
        if (this.visualEffects.hasPulsing) {
            const pulseSpeed = this.visualEffects.pulseSpeed || 1.0;
            const pulse = Math.sin(time * pulseSpeed) * 0.03 + 0.97;
            effectiveRadius = baseRadius * pulse;
        }
        
        // Draw simple solid star - no gradients or luminosity effects
        renderer.drawCircle(screenX, screenY, effectiveRadius, this.color);
    }
    
    // Helper method for darkening colors
    darkenColor(hex, amount) {
        // Parse hex color
        const colorNum = parseInt(hex.replace('#', ''), 16);
        const r = (colorNum >> 16) & 255;
        const g = (colorNum >> 8) & 255;
        const b = colorNum & 255;
        
        // Darken by moving towards black
        const newR = Math.max(0, Math.floor(r * (1 - amount)));
        const newG = Math.max(0, Math.floor(g * (1 - amount)));
        const newB = Math.max(0, Math.floor(b * (1 - amount)));
        
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }
}

class Moon extends CelestialObject {
    constructor(x, y, parentPlanet = null, orbitalDistance = 0, orbitalAngle = 0, orbitalSpeed = 0) {
        super(x, y, 'moon');
        
        // Orbital properties
        this.parentPlanet = parentPlanet;
        this.orbitalDistance = orbitalDistance;
        this.orbitalAngle = orbitalAngle; // Current angle in radians
        this.orbitalSpeed = orbitalSpeed; // Radians per second
        
        // Initialize moon properties
        this.initializeMoonProperties();
    }
    
    initializeMoonProperties() {
        // Set size based on parent planet (much smaller)
        if (this.parentPlanet) {
            this.radius = Math.max(2, this.parentPlanet.radius * 0.15); // 15% of parent size, minimum 2px
        } else {
            this.radius = 3; // Fallback size
        }
        this.discoveryDistance = this.radius + 25; // Closer discovery distance
        
        // Set muted color based on parent planet or neutral grays
        this.color = this.generateMoonColor();
    }

    // Initialize moon with seeded random for deterministic generation
    initWithSeed(rng, parentPlanet = null, orbitalDistance = 0, orbitalAngle = 0, orbitalSpeed = 0) {
        // Update orbital properties if provided
        if (parentPlanet) {
            this.parentPlanet = parentPlanet;
            this.orbitalDistance = orbitalDistance;
            this.orbitalAngle = orbitalAngle;
            this.orbitalSpeed = orbitalSpeed;
        }
        
        // Generate unique identifier for this moon
        this.uniqueId = this.generateUniqueId();
        
        // Set size based on parent planet using seeded random
        if (this.parentPlanet) {
            const sizeVariation = rng.nextFloat(0.1, 0.2); // 10-20% of parent size
            this.radius = Math.max(2, Math.floor(this.parentPlanet.radius * sizeVariation));
        } else {
            this.radius = rng.nextInt(2, 4); // 2-4 pixels fallback
        }
        this.discoveryDistance = this.radius + 25;
        
        // Set color using seeded random
        this.color = this.generateMoonColor(rng);
    }

    generateUniqueId() {
        // Use parent planet's position and orbital distance for stable ID
        if (this.parentPlanet) {
            const planetX = Math.floor(this.parentPlanet.x);
            const planetY = Math.floor(this.parentPlanet.y);
            const orbitalDistance = Math.floor(this.orbitalDistance);
            return `moon_${planetX}_${planetY}_orbit_${orbitalDistance}`;
        }
        // Fallback for moons without parent planets
        return `moon_${Math.floor(this.x)}_${Math.floor(this.y)}`;
    }

    generateMoonColor(rng = null) {
        // Generate muted colors - either neutral grays or darkened planet colors
        const moonColors = [
            '#808080', // Gray
            '#A0A0A0', // Light gray
            '#696969', // Dim gray
            '#778899', // Light slate gray
            '#708090'  // Slate gray
        ];
        
        if (rng) {
            // Use seeded random for deterministic color selection
            const useParentColor = rng.next() < 0.3; // 30% chance to use parent color
            if (useParentColor && this.parentPlanet) {
                return this.darkenColor(this.parentPlanet.color, 0.4);
            } else {
                return rng.choice(moonColors);
            }
        } else {
            // Fallback random selection
            if (Math.random() < 0.3 && this.parentPlanet) {
                return this.darkenColor(this.parentPlanet.color, 0.4);
            } else {
                return moonColors[Math.floor(Math.random() * moonColors.length)];
            }
        }
    }

    updatePosition(deltaTime) {
        // Update orbital position if moon has a parent planet
        if (this.parentPlanet && this.orbitalDistance > 0) {
            // Update orbital angle based on orbital speed
            this.orbitalAngle += this.orbitalSpeed * deltaTime;
            
            // Keep angle within 0 to 2π range
            if (this.orbitalAngle >= Math.PI * 2) {
                this.orbitalAngle -= Math.PI * 2;
            }
            
            // Calculate new position based on orbital parameters
            this.x = this.parentPlanet.x + Math.cos(this.orbitalAngle) * this.orbitalDistance;
            this.y = this.parentPlanet.y + Math.sin(this.orbitalAngle) * this.orbitalDistance;
        }
    }

    darkenColor(hex, amount) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, Math.floor((num >> 16) * (1 - amount)));
        const g = Math.max(0, Math.floor(((num >> 8) & 0x00FF) * (1 - amount)));
        const b = Math.max(0, Math.floor((num & 0x0000FF) * (1 - amount)));
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
    }

    render(renderer, camera) {
        const [screenX, screenY] = camera.worldToScreen(this.x, this.y, renderer.canvas.width, renderer.canvas.height);
        
        // Only render if parent planet is reasonably close (avoid visual clutter)
        const parentDistance = this.parentPlanet ? 
            Math.sqrt(Math.pow(this.parentPlanet.x - camera.x, 2) + Math.pow(this.parentPlanet.y - camera.y, 2)) : 0;
        const maxRenderDistance = 800; // Only show moons when parent planet is within 800 pixels of camera
        
        if (parentDistance > maxRenderDistance) {
            return; // Don't render distant moons to avoid clutter
        }
        
        // Only render if on screen
        if (screenX >= -this.radius - 10 && screenX <= renderer.canvas.width + this.radius + 10 && 
            screenY >= -this.radius - 10 && screenY <= renderer.canvas.height + this.radius + 10) {
            
            // Draw simple moon - just a solid circle
            renderer.drawCircle(screenX, screenY, this.radius, this.color);
            
            // Visual indicator if discovered
            if (this.discovered) {
                renderer.ctx.strokeStyle = '#00ff88';
                renderer.ctx.lineWidth = 1;
                renderer.ctx.beginPath();
                renderer.ctx.arc(screenX, screenY, this.radius + 3, 0, Math.PI * 2);
                renderer.ctx.stroke();
            }
        }
    }
}

// Planet type definitions with properties and visual characteristics
const PlanetTypes = {
    ROCKY: {
        name: 'Rocky Planet',
        colors: ['#8B4513', '#708090', '#A0522D'], // Brown, gray, darker brown
        sizeMultiplier: 0.8, // Smaller than average
        discoveryValue: 1,
        rarity: 0.35, // 35% of planets
        visualEffects: {
            hasAtmosphere: false,
            hasCraters: true,
            hasStripes: false
        }
    },
    OCEAN: {
        name: 'Ocean World',
        colors: ['#4169E1', '#1E90FF', '#0047AB'], // Various blues
        sizeMultiplier: 1.0, // Average size
        discoveryValue: 2,
        rarity: 0.20, // 20% of planets
        visualEffects: {
            hasAtmosphere: true,
            hasCraters: false,
            hasStripes: true // Represents currents/weather patterns
        }
    },
    GAS_GIANT: {
        name: 'Gas Giant',
        colors: ['#DAA520', '#CD853F', '#F4A460'], // Tan/golden colors
        sizeMultiplier: 1.8, // Much larger
        discoveryValue: 3,
        rarity: 0.15, // 15% of planets
        visualEffects: {
            hasAtmosphere: true,
            hasCraters: false,
            hasStripes: true, // Atmospheric bands
            hasSwirls: true
        }
    },
    DESERT: {
        name: 'Desert World',
        colors: ['#FFE4B5', '#FF6347', '#DEB887'], // Tan, orange, sandy
        sizeMultiplier: 0.9,
        discoveryValue: 1,
        rarity: 0.15, // 15% of planets
        visualEffects: {
            hasAtmosphere: false,
            hasCraters: true,
            hasStripes: false,
            hasDunePatterns: true
        }
    },
    FROZEN: {
        name: 'Frozen World',
        colors: ['#87CEEB', '#ADD8E6', '#E0FFFF'], // Light blue, icy colors
        sizeMultiplier: 0.85,
        discoveryValue: 2,
        rarity: 0.08, // 8% of planets (rare)
        visualEffects: {
            hasAtmosphere: false,
            hasCraters: true,
            hasStripes: false,
            hasCrystalline: true,
            hasGlow: true // Subtle ice glow
        }
    },
    VOLCANIC: {
        name: 'Volcanic World',
        colors: ['#DC143C', '#FF4500', '#8B0000'], // Red, orange-red, dark red
        sizeMultiplier: 0.9,
        discoveryValue: 2,
        rarity: 0.05, // 5% of planets (rare)
        visualEffects: {
            hasAtmosphere: false,
            hasCraters: false,
            hasStripes: false,
            hasGlow: true, // Volcanic glow
            hasLavaFlow: true
        }
    },
    EXOTIC: {
        name: 'Exotic World',
        colors: ['#DA70D6', '#9370DB', '#8A2BE2'], // Purple variants
        sizeMultiplier: 1.1,
        discoveryValue: 4,
        rarity: 0.02, // 2% of planets (very rare)
        visualEffects: {
            hasAtmosphere: true,
            hasCraters: false,
            hasStripes: false,
            hasGlow: true, // Mysterious glow
            hasShimmer: true // Special effect
        }
    }
};

// Star type definitions with properties and visual characteristics
const StarTypes = {
    G_TYPE: {
        name: 'G-Type Star',
        description: 'Sun-like yellow star',
        colors: ['#ffdd88', '#ffaa44', '#ffcc66'], // Yellow variants
        sizeMultiplier: 1.0, // Average size
        temperature: 'medium', // Affects planet type distributions
        discoveryValue: 1,
        rarity: 0.30, // 30% - most common along with K-type
        visualEffects: {
            hasCorona: true,
            hasPulsing: false,
            hasRadiation: false,
            coronaSize: 1.2,
            hasSwirling: true,
            swirlSpeed: 0.3
        }
    },
    K_TYPE: {
        name: 'K-Type Star',
        description: 'Orange dwarf star',
        colors: ['#ffaa44', '#ff8844', '#ff9955'], // Orange variants
        sizeMultiplier: 0.9, // Slightly smaller
        temperature: 'medium-cool',
        discoveryValue: 1,
        rarity: 0.25, // 25% - very common and stable
        visualEffects: {
            hasCorona: true,
            hasPulsing: false,
            hasRadiation: false,
            coronaSize: 1.1,
            hasSwirling: true,
            swirlSpeed: 0.25
        }
    },
    M_TYPE: {
        name: 'M-Type Star',
        description: 'Red dwarf star',
        colors: ['#ff6644', '#ff4422', '#cc3311'], // Red variants
        sizeMultiplier: 0.7, // Smaller but common
        temperature: 'cool',
        discoveryValue: 1,
        rarity: 0.25, // 25% - very common in reality
        visualEffects: {
            hasCorona: false, // Dimmer corona
            hasPulsing: false,
            hasRadiation: false,
            coronaSize: 1.0,
            hasSwirling: true,
            swirlSpeed: 0.2
        }
    },
    RED_GIANT: {
        name: 'Red Giant',
        description: 'Evolved red giant star',
        colors: ['#ff4422', '#ff6644', '#ff5533'], // Deep red variants
        sizeMultiplier: 1.6, // Much larger
        temperature: 'cool-surface-hot-core',
        discoveryValue: 3,
        rarity: 0.10, // 10% - evolved stars
        visualEffects: {
            hasCorona: true,
            hasPulsing: true, // Variable star
            hasRadiation: false,
            coronaSize: 1.5,
            pulseSpeed: 0.5, // Much slower, more tranquil
            hasSwirling: true,
            swirlSpeed: 0.15 // Slow, majestic swirls
        }
    },
    BLUE_GIANT: {
        name: 'Blue Giant',
        description: 'Massive blue giant star',
        colors: ['#88ddff', '#66ccff', '#aaeeff'], // Blue-white variants
        sizeMultiplier: 1.8, // Very large and massive
        temperature: 'very-hot',
        discoveryValue: 4,
        rarity: 0.05, // 5% - rare massive stars
        visualEffects: {
            hasCorona: true,
            hasPulsing: false,
            hasRadiation: true, // Strong stellar wind
            coronaSize: 1.8,
            radiationIntensity: 0.3,
            hasSwirling: true,
            swirlSpeed: 0.5 // Fast, energetic swirls
        }
    },
    WHITE_DWARF: {
        name: 'White Dwarf',
        description: 'Dense white dwarf remnant',
        colors: ['#ffffff', '#eeeeff', '#ddddff'], // White/blue-white
        sizeMultiplier: 0.4, // Very small but dense
        temperature: 'very-hot-surface',
        discoveryValue: 3,
        rarity: 0.04, // 4% - stellar remnants
        visualEffects: {
            hasCorona: false,
            hasPulsing: false,
            hasRadiation: false,
            coronaSize: 0.8,
            hasShimmer: true, // Hot surface effects
            hasSwirling: false, // Too small for visible swirls
            swirlSpeed: 0
        }
    },
    NEUTRON_STAR: {
        name: 'Neutron Star',
        description: 'Ultra-dense neutron star',
        colors: ['#ddddff', '#bbbbff', '#9999ff'], // Blue-white with purple tint
        sizeMultiplier: 0.2, // Extremely small but ultra-dense
        temperature: 'extreme',
        discoveryValue: 5,
        rarity: 0.01, // 1% - ultra-rare stellar remnants
        visualEffects: {
            hasCorona: false,
            hasPulsing: true, // Pulsar effects
            hasRadiation: true, // Intense radiation
            coronaSize: 0.5,
            pulseSpeed: 1.2, // Still faster than others but much more gentle
            radiationIntensity: 0.8,
            hasSwirling: false, // Too small and too extreme
            swirlSpeed: 0
        }
    }
};

// Export for use in other modules
window.StarTypes = StarTypes;
window.PlanetTypes = PlanetTypes;
window.CelestialObject = CelestialObject;
window.Planet = Planet;
window.Star = Star;
window.Moon = Moon;