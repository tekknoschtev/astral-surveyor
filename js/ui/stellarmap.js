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
        this.namingService = null; // Will be injected
        
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
        if (this.visible) {
            console.log('📊 Stellar Map opened');
        }
    }

    isVisible() {
        return this.visible;
    }

    centerOnPosition(x, y) {
        this.centerX = x;
        this.centerY = y;
    }

    update(deltaTime, camera, input) {
        // Auto-center map on player position when opened
        if (this.visible) {
            this.centerOnPosition(camera.x, camera.y);
            
            // Handle zoom controls when map is visible
            if (input) {
                if (input.wasJustPressed('Equal') || input.wasJustPressed('NumpadAdd')) {
                    this.zoomIn();
                }
                if (input.wasJustPressed('Minus') || input.wasJustPressed('NumpadSubtract')) {
                    this.zoomOut();
                }
            }
        }
    }

    handleClick(mouseX, mouseY, discoveredStars, canvas) {
        if (!this.visible || !discoveredStars) return;
        
        // Calculate map bounds
        const mapWidth = canvas.width * 0.8;
        const mapHeight = canvas.height * 0.8;
        const mapX = canvas.width * 0.1;
        const mapY = canvas.height * 0.1;
        const worldToMapScale = Math.min(mapWidth, mapHeight) / (this.gridSize * 4 / this.zoomLevel);
        
        // Check if click is within map bounds
        if (mouseX < mapX || mouseX > mapX + mapWidth || mouseY < mapY || mouseY > mapY + mapHeight) {
            this.selectedStar = null;
            return;
        }
        
        // Find closest star to click position
        let closestStar = null;
        let closestDistance = Infinity;
        const clickThreshold = 10; // pixels
        
        for (const star of discoveredStars) {
            const starMapX = mapX + mapWidth/2 + (star.x - this.centerX) * worldToMapScale;
            const starMapY = mapY + mapHeight/2 + (star.y - this.centerY) * worldToMapScale;
            
            // Check if star is within map bounds and click threshold
            if (starMapX >= mapX && starMapX <= mapX + mapWidth && 
                starMapY >= mapY && starMapY <= mapY + mapHeight) {
                
                const distance = Math.sqrt((mouseX - starMapX)**2 + (mouseY - starMapY)**2);
                if (distance <= clickThreshold && distance < closestDistance) {
                    closestStar = star;
                    closestDistance = distance;
                }
            }
        }
        
        this.selectedStar = closestStar;
    }

    setNamingService(namingService) {
        this.namingService = namingService;
    }

    zoomIn() {
        this.zoomLevel = Math.min(this.zoomLevel * 1.5, 10.0);
    }

    zoomOut() {
        this.zoomLevel = Math.max(this.zoomLevel / 1.5, 0.1);
    }

    render(renderer, camera, discoveredStars) {
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
        
        // Calculate grid line spacing on screen
        const gridSpacing = this.gridSize * scale;
        
        // Calculate offset based on map center
        const offsetX = (this.centerX % this.gridSize) * scale;
        const offsetY = (this.centerY % this.gridSize) * scale;
        
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

        for (const star of discoveredStars) {
            // Convert world coordinates to map coordinates
            const starMapX = mapX + mapWidth/2 + (star.x - this.centerX) * scale;
            const starMapY = mapY + mapHeight/2 + (star.y - this.centerY) * scale;
            
            // Only draw stars within map bounds
            if (starMapX >= mapX && starMapX <= mapX + mapWidth && 
                starMapY >= mapY && starMapY <= mapY + mapHeight) {
                
                // Get star color based on type
                const starColor = this.starColors[star.starTypeName] || '#ffffff';
                
                // Draw star as small circle
                ctx.fillStyle = starColor;
                ctx.beginPath();
                ctx.arc(starMapX, starMapY, 3, 0, Math.PI * 2);
                ctx.fill();
                
                // Add selection highlight if this star is selected
                if (this.selectedStar === star) {
                    ctx.strokeStyle = this.currentPositionColor;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(starMapX, starMapY, 6, 0, Math.PI * 2);
                    ctx.stroke();
                }
                
                // Draw star name at higher zoom levels or when selected
                if (this.zoomLevel > 2.0 || this.selectedStar === star) {
                    this.renderStarLabel(ctx, star, starMapX, starMapY);
                }
            }
        }
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

    renderCurrentPosition(ctx, mapX, mapY, mapWidth, mapHeight, scale, camera) {
        // Convert current position to map coordinates
        const currentMapX = mapX + mapWidth/2;
        const currentMapY = mapY + mapHeight/2;
        
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
                'Tap Star - Select',
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
        
        // Zoom info
        const zoomText = `Zoom: ${this.zoomLevel.toFixed(1)}x`;
        const zoomWidth = ctx.measureText(zoomText).width;
        ctx.fillText(zoomText, canvas.width - zoomWidth - 20, canvas.height - 65);
        
        // Center coordinates
        const coordText = `Center: (${Math.round(this.centerX)}, ${Math.round(this.centerY)})`;
        const coordWidth = ctx.measureText(coordText).width;
        ctx.fillText(coordText, canvas.width - coordWidth - 20, canvas.height - 50);
        
        // Information panel for selected star
        if (this.selectedStar && this.namingService) {
            this.renderStarInfoPanel(ctx, canvas);
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
}

// Export for use in other modules
window.StellarMap = StellarMap;