// Stellar Map System for Discovery Visualization
class StellarMap {
    constructor() {
        this.visible = false;
        this.zoomLevel = 1.0; // 1.0 = normal view, >1.0 = zoomed in
        this.centerX = 0; // Map center coordinates
        this.centerY = 0;
        this.gridSize = 2000; // Grid spacing in world units
        this.selectedStar = null;
        
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
        
        // Set up coordinate system for map
        const mapWidth = canvas.width * 0.8; // Leave margins
        const mapHeight = canvas.height * 0.8;
        const mapX = canvas.width * 0.1;
        const mapY = canvas.height * 0.1;
        
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
            }
        }
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
        const title = 'STELLAR CARTOGRAPHY';
        const titleWidth = ctx.measureText(title).width;
        ctx.fillText(title, (canvas.width - titleWidth) / 2, 30);
        
        // Instructions
        const instructions = [
            'M - Toggle Map',
            'ESC - Close Map',
            '+/- - Zoom In/Out'
        ];
        
        let y = canvas.height - 60;
        for (const instruction of instructions) {
            ctx.fillText(instruction, 20, y);
            y += 15;
        }
        
        // Zoom info
        const zoomText = `Zoom: ${this.zoomLevel.toFixed(1)}x`;
        const zoomWidth = ctx.measureText(zoomText).width;
        ctx.fillText(zoomText, canvas.width - zoomWidth - 20, canvas.height - 45);
        
        // Center coordinates
        const coordText = `Center: (${Math.round(this.centerX)}, ${Math.round(this.centerY)})`;
        const coordWidth = ctx.measureText(coordText).width;
        ctx.fillText(coordText, canvas.width - coordWidth - 20, canvas.height - 30);
    }
}

// Export for use in other modules
window.StellarMap = StellarMap;