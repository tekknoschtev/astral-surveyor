// Stellar Map System for Discovery Visualization
class StellarMap {
    constructor() {
        this.visible = false;
        this.zoomLevel = 1.0; // 1.0 = normal view, >1.0 = zoomed in
        this.centerX = 0; // Map center coordinates
        this.centerY = 0;
        this.gridSize = 2000; // Grid spacing in world units
        this.selectedStar = null;
        this.hoveredStar = null;
        this.selectedPlanet = null;
        this.namingService = null; // Will be injected
        
        // Interactive panning state
        this.followPlayer = true; // Whether map should follow player position
        this.isPanning = false; // Currently dragging to pan
        this.panStartX = 0; // Start position for pan gesture
        this.panStartY = 0;
        this.panStartMapX = 0; // Map center when pan started
        this.panStartMapY = 0;
        this.lastMouseX = 0; // For drag detection
        this.lastMouseY = 0;
        
        // Visual settings for subtle space aesthetic
        this.backgroundColor = '#000000F0'; // More opaque for better contrast
        this.gridColor = '#2a3a4a40'; // Very subtle dark blue-gray with transparency
        this.currentPositionColor = '#d4a574'; // Gentle amber accent
        this.starColors = {
            'G-Type Star': '#ffdd88',
            'K-Type Star': '#ffaa44', 
            'M-Type Star': '#ff6644',
            'Red Giant': '#ff4422',
            'Blue Giant': '#88ddff',
            'White Dwarf': '#ffffff',
            'Neutron Star': '#ddddff'
        };
    }

    toggle() {
        this.visible = !this.visible;
    }

    isVisible() {
        return this.visible;
    }

    centerOnPosition(x, y) {
        this.centerX = x;
        this.centerY = y;
    }

    update(deltaTime, camera, input) {
        if (this.visible) {
            // Only auto-center map on player position when following
            if (this.followPlayer && !this.isPanning) {
                this.centerOnPosition(camera.x, camera.y);
            }
            
            // Handle zoom controls when map is visible
            if (input) {
                // Mouse wheel zoom
                const wheelDelta = input.getWheelDelta();
                if (wheelDelta !== 0) {
                    if (wheelDelta < 0) {
                        this.zoomIn();
                    } else {
                        this.zoomOut();
                    }
                }
                
                // Pinch zoom for touch devices
                if (input.hasPinchZoomIn()) {
                    this.zoomIn();
                } else if (input.hasPinchZoomOut()) {
                    this.zoomOut();
                }
                
                // Keyboard zoom
                if (input.wasJustPressed('Equal') || input.wasJustPressed('NumpadAdd')) {
                    this.zoomIn();
                }
                if (input.wasJustPressed('Minus') || input.wasJustPressed('NumpadSubtract')) {
                    this.zoomOut();
                }
            }
        }
    }

    handleMouseMove(mouseX, mouseY, canvas, input) {
        if (!this.visible || !input.mousePressed || input.rightMousePressed) {
            return false;
        }
        
        // Initialize tracking if we haven't started
        if (this.lastMouseX === 0 && this.lastMouseY === 0) {
            const { mapX, mapY, mapWidth, mapHeight } = this.getMapBounds(canvas);
            const inBounds = mouseX >= mapX && mouseX <= mapX + mapWidth && 
                mouseY >= mapY && mouseY <= mapY + mapHeight;
            
            // Only start if mouse is in map bounds
            if (inBounds) {
                this.lastMouseX = mouseX;
                this.lastMouseY = mouseY;
                this.panStartX = mouseX;
                this.panStartY = mouseY;
            }
            return false;
        }
        
        // Calculate movement from last position
        const deltaX = mouseX - this.lastMouseX;
        const deltaY = mouseY - this.lastMouseY;
        
        // If there's any movement at all, apply it
        if (deltaX !== 0 || deltaY !== 0) {
            // Check if we should start panning (moved enough from start)
            if (!this.isPanning) {
                const totalMove = Math.abs(mouseX - this.panStartX) + Math.abs(mouseY - this.panStartY);
                if (totalMove > 3) {
                    this.isPanning = true;
                    this.followPlayer = false;
                }
            }
            
            // Apply linear panning if active (scales properly with zoom)
            if (this.isPanning) {
                const { mapWidth, mapHeight } = this.getMapBounds(canvas);
                // Linear conversion: screen pixels to world units, scaled by zoom
                const worldToMapScale = Math.min(mapWidth, mapHeight) / (this.gridSize * 4 / this.zoomLevel);
                
                // Simple 1:1 conversion with zoom scaling - no multiplication factor
                this.centerX -= deltaX / worldToMapScale;
                this.centerY -= deltaY / worldToMapScale;
            }
            
            // Always update last position
            this.lastMouseX = mouseX;
            this.lastMouseY = mouseY;
            
            return true; // Always consume when we have valid tracking and movement
        }
        
        return false;
    }
    
    // Reset panning state when mouse is released
    resetPanState() {
        this.isPanning = false;
        // Reset mouse positions so next drag starts fresh
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.panStartX = 0;
        this.panStartY = 0;
    }
    
    handleStarSelection(mouseX, mouseY, discoveredStars, canvas, discoveredPlanets = null) {
        if (!discoveredStars) return false;
        
        // Calculate map bounds
        const { mapX, mapY, mapWidth, mapHeight } = this.getMapBounds(canvas);
        const worldToMapScale = Math.min(mapWidth, mapHeight) / (this.gridSize * 4 / this.zoomLevel);
        
        // Check if click is within map bounds
        if (mouseX < mapX || mouseX > mapX + mapWidth || mouseY < mapY || mouseY > mapY + mapHeight) {
            this.selectedStar = null;
            this.selectedPlanet = null;
            return false;
        }
        
        // Find closest celestial object to click position (prioritize planets if in detail view)
        let closestStar = null;
        let closestPlanet = null;
        let closestStarDistance = Infinity;
        let closestPlanetDistance = Infinity;
        const clickThreshold = 10; // pixels
        
        // Check for planet clicks first (in detail view)
        if (this.zoomLevel > 3.0 && discoveredPlanets) {
            for (const planet of discoveredPlanets) {
                // Skip planets without position data
                if (planet.x === null || planet.y === null) continue;
                
                const planetMapX = mapX + mapWidth/2 + (planet.x - this.centerX) * worldToMapScale;
                const planetMapY = mapY + mapHeight/2 + (planet.y - this.centerY) * worldToMapScale;
                
                // Check if planet is within map bounds and click threshold
                if (planetMapX >= mapX && planetMapX <= mapX + mapWidth && 
                    planetMapY >= mapY && planetMapY <= mapY + mapHeight) {
                    
                    const distance = Math.sqrt((mouseX - planetMapX)**2 + (mouseY - planetMapY)**2);
                    if (distance <= clickThreshold && distance < closestPlanetDistance) {
                        closestPlanet = planet;
                        closestPlanetDistance = distance;
                    }
                }
            }
        }
        
        // Check for star clicks
        for (const star of discoveredStars) {
            const starMapX = mapX + mapWidth/2 + (star.x - this.centerX) * worldToMapScale;
            const starMapY = mapY + mapHeight/2 + (star.y - this.centerY) * worldToMapScale;
            
            // Check if star is within map bounds and click threshold
            if (starMapX >= mapX && starMapX <= mapX + mapWidth && 
                starMapY >= mapY && starMapY <= mapY + mapHeight) {
                
                const distance = Math.sqrt((mouseX - starMapX)**2 + (mouseY - starMapY)**2);
                if (distance <= clickThreshold && distance < closestStarDistance) {
                    closestStar = star;
                    closestStarDistance = distance;
                }
            }
        }
        
        // Select the closest object (prioritize planets if they're closer)
        if (closestPlanet && closestPlanetDistance <= closestStarDistance) {
            this.selectedPlanet = closestPlanet;
            this.selectedStar = null;
        } else if (closestStar) {
            this.selectedStar = closestStar;
            this.selectedPlanet = null;
        } else {
            this.selectedStar = null;
            this.selectedPlanet = null;
        }
        
        return true; // Consumed the event
    }
    
    getMapBounds(canvas) {
        // Responsive sizing logic from render method
        let mapWidthRatio = 0.8;
        let mapHeightRatio = 0.8;
        let marginRatio = 0.1;
        
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (isTouchDevice) {
            mapWidthRatio = 0.95;
            mapHeightRatio = 0.85;
            marginRatio = 0.025;
        }
        
        const mapWidth = canvas.width * mapWidthRatio;
        const mapHeight = canvas.height * mapHeightRatio;
        const mapX = canvas.width * marginRatio;
        const mapY = canvas.height * marginRatio;
        
        return { mapX, mapY, mapWidth, mapHeight };
    }

    setNamingService(namingService) {
        this.namingService = namingService;
    }
    
    // Enable following player position
    enableFollowPlayer(camera) {
        this.followPlayer = true;
        this.centerOnPosition(camera.x, camera.y);
    }
    
    // Check if currently following player
    isFollowingPlayer() {
        return this.followPlayer;
    }
    
    // Check if currently panning
    isCurrentlyPanning() {
        return this.isPanning;
    }

    zoomIn() {
        this.zoomLevel = Math.min(this.zoomLevel * 1.5, 10.0);
    }

    zoomOut() {
        this.zoomLevel = Math.max(this.zoomLevel / 1.5, 0.01);
    }

    render(renderer, camera, discoveredStars, gameStartingPosition = null, discoveredPlanets = null) {
        if (!this.visible) return;

        const { canvas, ctx } = renderer;
        
        // Save current context state
        ctx.save();
        
        // Draw semi-transparent background overlay
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Set up coordinate system for map - responsive sizing
        let mapWidthRatio = 0.8;
        let mapHeightRatio = 0.8;
        let marginRatio = 0.1;
        
        // Adjust for mobile devices (smaller screens need more space)
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (isTouchDevice) {
            mapWidthRatio = 0.95; // Use more screen space on mobile
            mapHeightRatio = 0.85; // Account for touch UI buttons
            marginRatio = 0.025;
        }
        
        const mapWidth = canvas.width * mapWidthRatio;
        const mapHeight = canvas.height * mapHeightRatio;
        const mapX = canvas.width * marginRatio;
        const mapY = canvas.height * marginRatio;
        
        // Calculate world-to-map coordinate conversion
        const worldToMapScale = Math.min(mapWidth, mapHeight) / (this.gridSize * 4 / this.zoomLevel);
        
        // Draw subtle map border
        ctx.strokeStyle = this.gridColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(mapX, mapY, mapWidth, mapHeight);
        
        // Draw coordinate grid
        this.renderGrid(ctx, mapX, mapY, mapWidth, mapHeight, worldToMapScale);
        
        // Draw discovered stars
        this.renderDiscoveredStars(ctx, mapX, mapY, mapWidth, mapHeight, worldToMapScale, discoveredStars);
        
        // Draw discovered planets (only in detail view)
        if (this.zoomLevel > 3.0 && discoveredPlanets) {
            this.renderDiscoveredPlanets(ctx, mapX, mapY, mapWidth, mapHeight, worldToMapScale, discoveredPlanets);
        }
        
        // Draw origin (0,0) marker
        this.renderOriginMarker(ctx, mapX, mapY, mapWidth, mapHeight, worldToMapScale);
        
        // Draw starting position marker (only if different from origin)
        if (gameStartingPosition) {
            this.renderStartingPositionMarker(ctx, mapX, mapY, mapWidth, mapHeight, worldToMapScale, gameStartingPosition);
        }
        
        // Draw current position marker
        this.renderCurrentPosition(ctx, mapX, mapY, mapWidth, mapHeight, worldToMapScale, camera);
        
        // Draw map UI
        this.renderMapUI(ctx, canvas);
        
        // Restore context state
        ctx.restore();
    }

    renderGrid(ctx, mapX, mapY, mapWidth, mapHeight, scale) {
        ctx.strokeStyle = this.gridColor;
        ctx.lineWidth = 0.5; // Even more subtle lines
        
        // Dynamic grid size based on zoom level
        let effectiveGridSize = this.gridSize;
        if (this.zoomLevel < 0.1) {
            // Galactic view: very large grid (20000 units)
            effectiveGridSize = this.gridSize * 10;
        } else if (this.zoomLevel < 0.5) {
            // Sector view: large grid (10000 units)
            effectiveGridSize = this.gridSize * 5;
        } else if (this.zoomLevel > 5.0) {
            // Detail view: small grid (500 units)
            effectiveGridSize = this.gridSize / 4;
        }
        
        // Calculate grid line spacing on screen
        const gridSpacing = effectiveGridSize * scale;
        
        // Skip grid rendering if spacing is too small or too large
        if (gridSpacing < 10 || gridSpacing > mapWidth) {
            return;
        }
        
        // Calculate offset based on map center
        const offsetX = (this.centerX % effectiveGridSize) * scale;
        const offsetY = (this.centerY % effectiveGridSize) * scale;
        
        // Draw vertical grid lines
        for (let x = mapX - offsetX; x <= mapX + mapWidth; x += gridSpacing) {
            if (x >= mapX && x <= mapX + mapWidth) {
                ctx.beginPath();
                ctx.moveTo(x, mapY);
                ctx.lineTo(x, mapY + mapHeight);
                ctx.stroke();
            }
        }
        
        // Draw horizontal grid lines
        for (let y = mapY - offsetY; y <= mapY + mapHeight; y += gridSpacing) {
            if (y >= mapY && y <= mapY + mapHeight) {
                ctx.beginPath();
                ctx.moveTo(mapX, y);
                ctx.lineTo(mapX + mapWidth, y);
                ctx.stroke();
            }
        }
    }

    renderDiscoveredStars(ctx, mapX, mapY, mapWidth, mapHeight, scale, discoveredStars) {
        if (!discoveredStars) return;

        // Performance optimization: reduce star detail at extreme zoom out
        const isExtremeZoomOut = this.zoomLevel < 0.1;
        const renderLabels = this.zoomLevel > 2.0 || (!isExtremeZoomOut && this.selectedStar);

        for (const star of discoveredStars) {
            // Convert world coordinates to map coordinates
            const starMapX = mapX + mapWidth/2 + (star.x - this.centerX) * scale;
            const starMapY = mapY + mapHeight/2 + (star.y - this.centerY) * scale;
            
            // Calculate proportional star size based on zoom level and star type
            const starSize = this.calculateStarSize(star, isExtremeZoomOut);
            
            // Expanded bounds check for better culling at extreme zoom
            const margin = isExtremeZoomOut ? 0 : 10; // No margin needed at extreme zoom
            if (starMapX >= mapX - margin && starMapX <= mapX + mapWidth + margin && 
                starMapY >= mapY - margin && starMapY <= mapY + mapHeight + margin) {
                
                // Get star color based on type
                const starColor = this.starColors[star.starTypeName] || '#ffffff';
                
                // Draw star as circle with proportional sizing
                ctx.fillStyle = starColor;
                ctx.beginPath();
                ctx.arc(starMapX, starMapY, starSize, 0, Math.PI * 2);
                ctx.fill();
                
                // Add selection highlight if this star is selected
                if (this.selectedStar === star) {
                    ctx.strokeStyle = this.currentPositionColor;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    // Scale selection highlight to be proportional to star size
                    const highlightRadius = Math.max(6, starSize + 2);
                    ctx.arc(starMapX, starMapY, highlightRadius, 0, Math.PI * 2);
                    ctx.stroke();
                }
                
                // Draw star name at higher zoom levels or when selected (optimized)
                if (renderLabels && (this.zoomLevel > 2.0 || this.selectedStar === star)) {
                    this.renderStarLabel(ctx, star, starMapX, starMapY);
                }
            }
        }
    }

    calculateStarSize(star, isExtremeZoomOut) {
        // At extreme zoom out, use minimal fixed size for performance
        if (isExtremeZoomOut) {
            return 1;
        }
        
        // Get the star's size multiplier from its star type (default 1.0 if not available)
        const sizeMultiplier = star.starType?.sizeMultiplier || 1.0;
        
        // Base size varies by zoom level to show more detail at higher zooms
        let baseSize;
        if (this.zoomLevel <= 0.2) {
            // Galactic/Sector View: minimal differences, focus on visibility
            baseSize = 2;
            return Math.max(1, baseSize * (0.8 + sizeMultiplier * 0.4)); // Range: ~1.6-3.2
        } else if (this.zoomLevel <= 1.0) {
            // Regional View: moderate size differences become visible
            baseSize = 3;
            return Math.max(2, baseSize * (0.6 + sizeMultiplier * 0.8)); // Range: ~1.8-5.4
        } else if (this.zoomLevel <= 3.0) {
            // Local View: significant size differences
            baseSize = 4;
            return Math.max(2, baseSize * (0.4 + sizeMultiplier * 1.2)); // Range: ~2.6-8.6
        } else {
            // Detail View: full proportional sizing - dramatic differences
            baseSize = 5;
            return Math.max(2, baseSize * (0.2 + sizeMultiplier * 1.6)); // Range: ~2.6-15.4
        }
    }

    renderDiscoveredPlanets(ctx, mapX, mapY, mapWidth, mapHeight, scale, discoveredPlanets) {
        if (!discoveredPlanets) return;

        // Group planets by their parent star for orbital rendering
        const planetsByStarId = new Map();
        
        for (const planet of discoveredPlanets) {
            // Only process planets that have current position data (are in active chunks)
            if (planet.x === null || planet.y === null) continue;
            
            const starId = `${planet.parentStarX}_${planet.parentStarY}`;
            if (!planetsByStarId.has(starId)) {
                planetsByStarId.set(starId, []);
            }
            planetsByStarId.get(starId).push(planet);
        }
        
        // Render orbital systems
        for (const [starId, planets] of planetsByStarId) {
            const [starX, starY] = starId.split('_').map(parseFloat);
            const starMapX = mapX + mapWidth/2 + (starX - this.centerX) * scale;
            const starMapY = mapY + mapHeight/2 + (starY - this.centerY) * scale;
            
            // Check if star system is within extended map bounds
            const systemMargin = 200 * scale; // Allow for large orbital systems
            if (starMapX >= mapX - systemMargin && starMapX <= mapX + mapWidth + systemMargin && 
                starMapY >= mapY - systemMargin && starMapY <= mapY + mapHeight + systemMargin) {
                
                // Draw orbital circles for each planet
                this.renderOrbitalCircles(ctx, starMapX, starMapY, planets, scale, mapX, mapY, mapWidth, mapHeight);
                
                // Draw planets on their orbits
                for (const planet of planets) {
                    const planetMapX = mapX + mapWidth/2 + (planet.x - this.centerX) * scale;
                    const planetMapY = mapY + mapHeight/2 + (planet.y - this.centerY) * scale;
                    
                    // Calculate proportional planet size (smaller than stars)
                    const planetSize = this.calculatePlanetSize(planet);
                    
                    // Get planet color based on type
                    const planetColor = this.getPlanetColor(planet);
                    
                    // Draw planet as circle
                    ctx.fillStyle = planetColor;
                    ctx.beginPath();
                    ctx.arc(planetMapX, planetMapY, planetSize, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Add subtle outline to differentiate from stars
                    ctx.strokeStyle = planetColor;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                    
                    // Add selection highlight if this planet is selected
                    if (this.selectedPlanet === planet) {
                        ctx.strokeStyle = this.currentPositionColor;
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        const highlightRadius = Math.max(4, planetSize + 1);
                        ctx.arc(planetMapX, planetMapY, highlightRadius, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                }
            }
        }
    }

    renderOrbitalCircles(ctx, starMapX, starMapY, planets, scale, mapX, mapY, mapWidth, mapHeight) {
        // Calculate unique orbital radii for this star system based on actual map positions
        const orbitalRadii = new Set();
        
        for (const planet of planets) {
            // Calculate the planet's actual position on the map
            const planetMapX = mapX + mapWidth/2 + (planet.x - this.centerX) * scale;
            const planetMapY = mapY + mapHeight/2 + (planet.y - this.centerY) * scale;
            
            // Calculate orbital radius directly from map coordinates
            const mapOrbitalRadius = Math.sqrt(
                Math.pow(planetMapX - starMapX, 2) + 
                Math.pow(planetMapY - starMapY, 2)
            );
            orbitalRadii.add(Math.round(mapOrbitalRadius)); // Round to avoid duplicate very close orbits
        }
        
        // Draw orbital circles
        ctx.strokeStyle = '#444444'; // Subtle dark gray
        ctx.lineWidth = 0.5;
        ctx.setLineDash([2, 3]); // Dashed line for subtle effect
        
        for (const radius of orbitalRadii) {
            // Only draw orbits that are reasonably visible and not too large
            if (radius > 2 && radius < 500) {
                ctx.beginPath();
                ctx.arc(starMapX, starMapY, radius, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        
        // Reset line dash for other rendering
        ctx.setLineDash([]);
    }

    calculatePlanetSize(planet) {
        // Get the planet's size multiplier from its planet type (default 1.0 if not available)
        const sizeMultiplier = planet.planetType?.sizeMultiplier || 1.0;
        
        // Base size for planets (smaller than stars)
        const baseSize = 1.5;
        
        // Scale planet size based on type, but keep them smaller than stars
        return Math.max(1, baseSize * (0.8 + sizeMultiplier * 0.4)); // Range: ~1.2-2.6
    }

    getPlanetColor(planet) {
        // Use planet type colors if available, otherwise default
        if (planet.planetType && planet.planetType.colors) {
            return planet.planetType.colors[0]; // Use first color from palette
        }
        // Fallback colors based on planet type name
        const colorMap = {
            'Rocky Planet': '#8B4513',
            'Ocean World': '#4169E1', 
            'Gas Giant': '#DAA520',
            'Desert World': '#FFE4B5',
            'Frozen World': '#87CEEB',
            'Volcanic World': '#DC143C',
            'Exotic World': '#DA70D6'
        };
        return colorMap[planet.planetTypeName] || '#888888';
    }

    renderStarLabel(ctx, star, starMapX, starMapY) {
        if (!this.namingService) return;
        
        // Generate star name
        const starName = this.namingService.generateDisplayName(star);
        
        // Set up text rendering to match game UI
        ctx.font = '12px "Courier New", monospace';
        ctx.fillStyle = '#b0c4d4';
        ctx.textAlign = 'center';
        
        // Draw text background for readability
        const textWidth = ctx.measureText(starName).width;
        const bgPadding = 2;
        ctx.fillStyle = '#000000C0';
        ctx.fillRect(starMapX - textWidth/2 - bgPadding, starMapY - 20, textWidth + bgPadding*2, 12);
        
        // Draw star name above the star
        ctx.fillStyle = '#b0c4d4';
        ctx.fillText(starName, starMapX, starMapY - 10);
        
        // Reset text alignment
        ctx.textAlign = 'left';
    }

    renderStartingPositionMarker(ctx, mapX, mapY, mapWidth, mapHeight, scale, startingPosition) {
        // Edge case: Don't render starting position marker if it's the same as origin (0,0)
        if (startingPosition.x === 0 && startingPosition.y === 0) {
            return;
        }
        
        // Convert starting position to map coordinates
        const startMapX = mapX + mapWidth/2 + (startingPosition.x - this.centerX) * scale;
        const startMapY = mapY + mapHeight/2 + (startingPosition.y - this.centerY) * scale;
        
        // Only draw if starting position is within map bounds
        if (startMapX >= mapX && startMapX <= mapX + mapWidth && 
            startMapY >= mapY && startMapY <= mapY + mapHeight) {
            
            // Use blue color for starting position
            ctx.strokeStyle = '#4488ff';
            ctx.fillStyle = '#4488ff40'; // Semi-transparent fill
            ctx.lineWidth = 2;
            
            // Scale marker size based on zoom level
            const markerSize = Math.max(4, Math.min(10, 6 / this.zoomLevel));
            
            // Draw diamond shape
            ctx.beginPath();
            ctx.moveTo(startMapX, startMapY - markerSize); // Top
            ctx.lineTo(startMapX + markerSize, startMapY); // Right
            ctx.lineTo(startMapX, startMapY + markerSize); // Bottom
            ctx.lineTo(startMapX - markerSize, startMapY); // Left
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Add label at lower zoom levels
            if (this.zoomLevel < 0.5) {
                ctx.fillStyle = '#4488ff';
                ctx.font = '12px "Courier New", monospace';
                ctx.textAlign = 'center';
                
                // Draw text background for readability
                const labelText = 'Start';
                const textWidth = ctx.measureText(labelText).width;
                const bgPadding = 2;
                ctx.fillStyle = '#000000C0';
                ctx.fillRect(startMapX - textWidth/2 - bgPadding, startMapY + markerSize + 5, textWidth + bgPadding*2, 12);
                
                // Draw label text
                ctx.fillStyle = '#4488ff';
                ctx.fillText(labelText, startMapX, startMapY + markerSize + 15);
                
                // Reset text alignment
                ctx.textAlign = 'left';
            }
        }
    }

    renderOriginMarker(ctx, mapX, mapY, mapWidth, mapHeight, scale) {
        // Convert origin (0,0) to map coordinates
        const originMapX = mapX + mapWidth/2 + (0 - this.centerX) * scale;
        const originMapY = mapY + mapHeight/2 + (0 - this.centerY) * scale;
        
        // Only draw if origin is within map bounds
        if (originMapX >= mapX && originMapX <= mapX + mapWidth && 
            originMapY >= mapY && originMapY <= mapY + mapHeight) {
            
            // Use distinctive red-orange color for origin
            ctx.strokeStyle = '#ff6644';
            ctx.fillStyle = '#ff664440'; // Semi-transparent fill
            ctx.lineWidth = 2;
            
            // Scale marker size based on zoom level (larger when zoomed out)
            const markerSize = Math.max(4, Math.min(12, 8 / this.zoomLevel));
            const crossSize = markerSize * 1.5;
            
            // Draw cross/plus symbol
            ctx.beginPath();
            // Horizontal line
            ctx.moveTo(originMapX - crossSize, originMapY);
            ctx.lineTo(originMapX + crossSize, originMapY);
            // Vertical line
            ctx.moveTo(originMapX, originMapY - crossSize);
            ctx.lineTo(originMapX, originMapY + crossSize);
            ctx.stroke();
            
            // Draw center circle
            ctx.beginPath();
            ctx.arc(originMapX, originMapY, markerSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Add label at lower zoom levels (when zoomed out and origin is more significant)
            if (this.zoomLevel < 0.5) {
                ctx.fillStyle = '#ff6644';
                ctx.font = '12px "Courier New", monospace';
                ctx.textAlign = 'center';
                
                // Draw text background for readability
                const labelText = '(0,0)';
                const textWidth = ctx.measureText(labelText).width;
                const bgPadding = 2;
                ctx.fillStyle = '#000000C0';
                ctx.fillRect(originMapX - textWidth/2 - bgPadding, originMapY + crossSize + 5, textWidth + bgPadding*2, 12);
                
                // Draw label text
                ctx.fillStyle = '#ff6644';
                ctx.fillText(labelText, originMapX, originMapY + crossSize + 15);
                
                // Reset text alignment
                ctx.textAlign = 'left';
            }
        }
    }

    renderCurrentPosition(ctx, mapX, mapY, mapWidth, mapHeight, scale, camera) {
        // Convert current position to map coordinates (same as other objects)
        const currentMapX = mapX + mapWidth/2 + (camera.x - this.centerX) * scale;
        const currentMapY = mapY + mapHeight/2 + (camera.y - this.centerY) * scale;
        
        // Only draw if current position is within map bounds (with some margin)
        const margin = 20; // Allow marker to be slightly outside visible area
        if (currentMapX >= mapX - margin && currentMapX <= mapX + mapWidth + margin && 
            currentMapY >= mapY - margin && currentMapY <= mapY + mapHeight + margin) {
            
            // Draw current position as gentle marker
            ctx.strokeStyle = this.currentPositionColor;
            ctx.fillStyle = this.currentPositionColor + '40'; // Semi-transparent fill
            ctx.lineWidth = 1;
            
            // Draw filled circle with subtle outline
            ctx.beginPath();
            ctx.arc(currentMapX, currentMapY, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Draw subtle outer ring
            ctx.beginPath();
            ctx.arc(currentMapX, currentMapY, 12, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    renderMapUI(ctx, canvas) {
        // Set font to match game UI
        ctx.font = '12px "Courier New", monospace';
        ctx.fillStyle = '#b0c4d4'; // Soft blue-white for text
        
        // Title
        const title = 'Stellar Map';
        const titleWidth = ctx.measureText(title).width;
        ctx.fillText(title, (canvas.width - titleWidth) / 2, 30);
        
        // Instructions - adapt for device type
        let instructions = [];
        // More specific touch device detection - check for mobile user agent patterns
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const hasTouchPoints = navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
        const isTouchDevice = isMobile || (hasTouchPoints && window.screen.width < 1024);
        
        if (isTouchDevice) {
            instructions = [
                'Pinch - Zoom In/Out',
                this.zoomLevel > 3.0 ? 'Tap Star/Planet - Select' : 'Tap Star - Select',
                'Tap Outside - Close'
            ];
        } else {
            instructions = [
                'M - Toggle Map',
                'ESC - Close Map',
                '+/- - Zoom In/Out'
            ];
        }
        
        let y = canvas.height - 80;
        for (const instruction of instructions) {
            ctx.fillText(instruction, 20, y);
            y += 15;
        }
        
        // Zoom info with descriptive labels
        let zoomLabel = '';
        if (this.zoomLevel <= 0.05) {
            zoomLabel = 'Galactic View';
        } else if (this.zoomLevel <= 0.2) {
            zoomLabel = 'Sector View';
        } else if (this.zoomLevel <= 1.0) {
            zoomLabel = 'Regional View';
        } else if (this.zoomLevel <= 3.0) {
            zoomLabel = 'Local View';
        } else {
            zoomLabel = 'Detail View';
        }
        
        const zoomText = `Zoom: ${this.zoomLevel.toFixed(2)}x (${zoomLabel})`;
        const zoomWidth = ctx.measureText(zoomText).width;
        ctx.fillText(zoomText, canvas.width - zoomWidth - 20, canvas.height - 65);
        
        // Center coordinates
        const coordText = `Center: (${Math.round(this.centerX)}, ${Math.round(this.centerY)})`;
        const coordWidth = ctx.measureText(coordText).width;
        ctx.fillText(coordText, canvas.width - coordWidth - 20, canvas.height - 50);
        
        // Information panel for selected star or planet
        if (this.selectedStar && this.namingService) {
            this.renderStarInfoPanel(ctx, canvas);
        } else if (this.selectedPlanet && this.namingService) {
            this.renderPlanetInfoPanel(ctx, canvas);
        }
    }

    renderStarInfoPanel(ctx, canvas) {
        if (!this.selectedStar || !this.namingService) return;
        
        // Generate full designation information
        const fullDesignation = this.namingService.generateFullDesignation(this.selectedStar);
        if (!fullDesignation) {
            console.warn('Could not generate designation for star:', this.selectedStar);
            return;
        }
        
        // Panel dimensions and position
        const panelWidth = 300;
        const panelHeight = 120;
        const panelX = canvas.width - panelWidth - 20;
        const panelY = 60;
        
        // Draw panel background
        ctx.fillStyle = '#000000E0';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        ctx.strokeStyle = '#2a3a4a';
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
        
        // Panel content
        ctx.fillStyle = '#b0c4d4';
        ctx.font = '12px "Courier New", monospace';
        
        let lineY = panelY + 20;
        const lineHeight = 14;
        
        // Star designation
        ctx.fillText(`Designation: ${fullDesignation.catalog}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Coordinate designation
        ctx.fillText(`Coordinates: ${fullDesignation.coordinate}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Star type
        ctx.fillText(`Type: ${fullDesignation.type}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Classification
        if (fullDesignation.classification) {
            ctx.fillText(`Class: ${fullDesignation.classification}`, panelX + 10, lineY);
            lineY += lineHeight;
        }
        
        // Position
        ctx.fillText(`Position: (${Math.round(this.selectedStar.x)}, ${Math.round(this.selectedStar.y)})`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Discovery timestamp if available
        if (this.selectedStar.timestamp) {
            const date = new Date(this.selectedStar.timestamp);
            const dateStr = date.toLocaleDateString();
            ctx.fillText(`Discovered: ${dateStr}`, panelX + 10, lineY);
        }
    }

    renderPlanetInfoPanel(ctx, canvas) {
        if (!this.selectedPlanet || !this.namingService) return;
        
        // Panel dimensions and position
        const panelWidth = 300;
        const panelHeight = 120;
        const panelX = canvas.width - panelWidth - 20;
        const panelY = 60;
        
        // Draw panel background
        ctx.fillStyle = '#000000E0';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        ctx.strokeStyle = '#2a3a4a';
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
        
        // Panel content
        ctx.fillStyle = '#b0c4d4';
        ctx.font = '12px "Courier New", monospace';
        
        let lineY = panelY + 20;
        const lineHeight = 14;
        
        // Planet designation using naming service
        const planetName = this.generatePlanetDisplayName(this.selectedPlanet);
        ctx.fillText(`Name: ${planetName}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Planet type
        ctx.fillText(`Type: ${this.selectedPlanet.planetTypeName}`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Parent star coordinates
        ctx.fillText(`Orbits Star: (${Math.round(this.selectedPlanet.parentStarX)}, ${Math.round(this.selectedPlanet.parentStarY)})`, panelX + 10, lineY);
        lineY += lineHeight;
        
        // Planet position (if available)
        if (this.selectedPlanet.x !== null && this.selectedPlanet.y !== null) {
            ctx.fillText(`Position: (${Math.round(this.selectedPlanet.x)}, ${Math.round(this.selectedPlanet.y)})`, panelX + 10, lineY);
            lineY += lineHeight;
        }
        
        // Discovery timestamp if available
        if (this.selectedPlanet.timestamp) {
            const date = new Date(this.selectedPlanet.timestamp);
            const dateStr = date.toLocaleDateString();
            ctx.fillText(`Discovered: ${dateStr}`, panelX + 10, lineY);
        }
    }

    generatePlanetDisplayName(planet) {
        // Use stored planet name from discovery data if available
        if (planet.objectName) {
            return planet.objectName;
        }

        // Fallback to naming service if no stored name
        if (!this.namingService) {
            return `Planet ${planet.planetIndex + 1}`;
        }

        try {
            // Construct a planet object with the properties the naming service expects
            const mockParentStar = {
                x: planet.parentStarX,
                y: planet.parentStarY,
                type: 'star'
            };

            const mockPlanet = {
                type: 'planet',
                parentStar: mockParentStar,
                planetTypeName: planet.planetTypeName,
                planetIndex: planet.planetIndex,
                x: planet.x || planet.parentStarX, // Fallback to star position if planet position not available
                y: planet.y || planet.parentStarY
            };

            return this.namingService.generateDisplayName(mockPlanet);
        } catch (error) {
            console.warn('Failed to generate planet name:', error);
            return `Planet ${planet.planetIndex + 1}`;
        }
    }
}

// Export for use in other modules
window.StellarMap = StellarMap;