// Discovery Logbook System for tracking exploration history
class DiscoveryLogbook {
    constructor() {
        this.visible = false;
        this.discoveries = []; // Array of discovery entries
        this.scrollOffset = 0; // For scrollable list
        this.maxVisible = 12; // Maximum entries visible at once
        
        // Visual settings to match game aesthetic
        this.backgroundColor = '#000511E0'; // Semi-transparent dark blue
        this.borderColor = '#2a3a4a'; // Subtle border
        this.textColor = '#b0c4d4'; // Soft blue-gray text
        this.headerColor = '#d4a574'; // Gentle amber for headers
        this.entrySpacing = 28; // Spacing between entries (increased for larger text)
        this.fontSize = 12; // Match other UI components
        this.headerFontSize = 14; // Slightly larger for headers
        
        // Panel dimensions and positioning
        this.panelWidth = 320;
        this.panelHeight = 400;
        this.padding = 16;
        this.headerHeight = 32;
    }

    toggle() {
        this.visible = !this.visible;
        if (this.visible) {
            // Reset scroll to top when opening
            this.scrollOffset = 0;
        }
    }

    isVisible() {
        return this.visible;
    }

    addDiscovery(objectName, objectType, timestamp = Date.now()) {
        // Add new discovery to the end of the list (newest at bottom)
        const discovery = {
            name: objectName,
            type: objectType,
            timestamp: timestamp,
            displayTime: this.formatTimestamp(timestamp)
        };
        
        this.discoveries.push(discovery);
        
        // Limit total discoveries to prevent memory issues (keep last 100)
        if (this.discoveries.length > 100) {
            this.discoveries = this.discoveries.slice(-100); // Keep the most recent 100
        }
        
        // Auto-scroll to bottom when new discovery is added
        this.scrollToBottom();
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMinutes = Math.floor((now - date) / (1000 * 60));
        
        if (diffMinutes < 1) {
            return 'Just now';
        } else if (diffMinutes < 60) {
            return `${diffMinutes}m ago`;
        } else if (diffMinutes < 1440) { // Less than 24 hours
            const hours = Math.floor(diffMinutes / 60);
            return `${hours}h ago`;
        } else {
            const days = Math.floor(diffMinutes / 1440);
            return `${days}d ago`;
        }
    }

    handleScroll(direction) {
        if (!this.visible || this.discoveries.length <= this.maxVisible) {
            return; // No scrolling needed
        }

        const maxScroll = Math.max(0, this.discoveries.length - this.maxVisible);
        
        if (direction > 0) { // Scroll down (towards newer entries)
            this.scrollOffset = Math.min(this.scrollOffset + 1, maxScroll);
        } else { // Scroll up (towards older entries)
            this.scrollOffset = Math.max(this.scrollOffset - 1, 0);
        }
    }

    scrollToBottom() {
        if (this.discoveries.length <= this.maxVisible) {
            this.scrollOffset = 0;
        } else {
            this.scrollOffset = this.discoveries.length - this.maxVisible;
        }
    }

    update(deltaTime, input) {
        if (!this.visible) return;

        // Handle scroll input (only when logbook is visible)
        if (input) {
            // Use J/K keys for scrolling (vim-style, common in many applications)
            if (input.wasJustPressed('KeyJ')) {
                this.handleScroll(1); // J = scroll down
            } else if (input.wasJustPressed('KeyK')) {
                this.handleScroll(-1); // K = scroll up
            }
            
            // Handle page up/down for faster scrolling
            if (input.wasJustPressed('PageUp')) {
                this.handleScroll(-5);
            } else if (input.wasJustPressed('PageDown')) {
                this.handleScroll(5);
            }
        }

        // Update relative timestamps periodically
        // This ensures "2m ago" becomes "3m ago" etc.
        if (Math.floor(Date.now() / 1000) % 30 === 0) { // Every 30 seconds
            this.updateTimestamps();
        }
    }

    // Handle mouse wheel scrolling (called from game when mouse is over logbook)
    handleMouseWheel(deltaY) {
        if (!this.visible) return;
        
        // Normalize wheel delta and scroll
        const scrollDirection = deltaY > 0 ? 1 : -1;
        this.handleScroll(scrollDirection);
    }

    // Check if mouse coordinates are over the logbook panel
    isMouseOver(mouseX, mouseY, canvasWidth, canvasHeight) {
        if (!this.visible) return false;
        
        const panelX = canvasWidth - this.panelWidth - 20;
        const panelY = 80;
        
        return mouseX >= panelX && mouseX <= panelX + this.panelWidth &&
               mouseY >= panelY && mouseY <= panelY + this.panelHeight;
    }

    updateTimestamps() {
        for (const discovery of this.discoveries) {
            discovery.displayTime = this.formatTimestamp(discovery.timestamp);
        }
    }

    render(renderer, camera) {
        if (!this.visible) return;

        const { canvas, ctx } = renderer;
        
        // Save current context state
        ctx.save();
        
        // Calculate panel position (right side of screen with margin)
        const panelX = canvas.width - this.panelWidth - 20;
        const panelY = 80; // Leave space for other UI elements
        
        // Draw panel background
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(panelX, panelY, this.panelWidth, this.panelHeight);
        
        // Draw panel border
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX, panelY, this.panelWidth, this.panelHeight);
        
        // Draw header
        this.renderHeader(ctx, panelX, panelY);
        
        // Draw discovery entries
        this.renderDiscoveries(ctx, panelX, panelY);
        
        // Draw scroll indicators if needed
        if (this.discoveries.length > this.maxVisible) {
            this.renderScrollIndicators(ctx, panelX, panelY);
        }
        
        // Restore context state
        ctx.restore();
    }

    renderHeader(ctx, panelX, panelY) {
        // Header background
        ctx.fillStyle = this.borderColor + '40'; // Semi-transparent
        ctx.fillRect(panelX, panelY, this.panelWidth, this.headerHeight);
        
        // Header text
        ctx.font = `${this.headerFontSize}px "Courier New", monospace`;
        ctx.fillStyle = this.headerColor;
        ctx.textAlign = 'center';
        ctx.fillText('Discovery Logbook', panelX + this.panelWidth / 2, panelY + 20);
        
        // Discovery count
        ctx.font = `10px "Courier New", monospace`;
        ctx.fillStyle = this.textColor;
        ctx.fillText(`${this.discoveries.length} discoveries`, panelX + this.panelWidth / 2, panelY + this.headerHeight - 4);
        
        // Reset text alignment
        ctx.textAlign = 'left';
    }

    renderDiscoveries(ctx, panelX, panelY) {
        const listStartY = panelY + this.headerHeight + this.padding;
        const listWidth = this.panelWidth - (this.padding * 2);
        
        ctx.font = `${this.fontSize}px "Courier New", monospace`;
        
        // Calculate visible entries
        const startIndex = this.scrollOffset;
        const endIndex = Math.min(startIndex + this.maxVisible, this.discoveries.length);
        
        for (let i = startIndex; i < endIndex; i++) {
            const discovery = this.discoveries[i];
            const entryY = listStartY + (i - startIndex) * this.entrySpacing;
            
            // Alternate background colors for readability
            if ((i - startIndex) % 2 === 1) {
                ctx.fillStyle = this.borderColor + '20';
                ctx.fillRect(panelX + this.padding, entryY - 8, listWidth, this.entrySpacing);
            }
            
            // Discovery name (main text)
            ctx.fillStyle = this.textColor;
            const nameText = this.truncateText(ctx, discovery.name, listWidth - 80);
            ctx.fillText(nameText, panelX + this.padding, entryY + 4);
            
            // Discovery type (smaller, dimmed)
            ctx.font = `10px "Courier New", monospace`;
            ctx.fillStyle = this.textColor + 'A0'; // More transparent
            ctx.fillText(discovery.type, panelX + this.padding, entryY + 16);
            
            // Timestamp (right-aligned)
            ctx.textAlign = 'right';
            ctx.fillText(discovery.displayTime, panelX + this.panelWidth - this.padding, entryY + 4);
            ctx.textAlign = 'left';
            
            // Reset font for next entry
            ctx.font = `${this.fontSize}px "Courier New", monospace`;
        }
        
        // Show "No discoveries yet" message if empty
        if (this.discoveries.length === 0) {
            ctx.fillStyle = this.textColor + '80';
            ctx.textAlign = 'center';
            ctx.fillText('No discoveries yet...', panelX + this.panelWidth / 2, listStartY + 40);
            ctx.fillText('Explore space to find celestial objects!', panelX + this.panelWidth / 2, listStartY + 60);
            ctx.textAlign = 'left';
        }
    }

    renderScrollIndicators(ctx, panelX, panelY) {
        const indicatorX = panelX + this.panelWidth - 8;
        const listStartY = panelY + this.headerHeight + this.padding;
        const listEndY = panelY + this.panelHeight - this.padding;
        
        // Scroll up indicator
        if (this.scrollOffset > 0) {
            ctx.fillStyle = this.headerColor;
            ctx.beginPath();
            ctx.moveTo(indicatorX, listStartY);
            ctx.lineTo(indicatorX + 4, listStartY + 8);
            ctx.lineTo(indicatorX - 4, listStartY + 8);
            ctx.closePath();
            ctx.fill();
        }
        
        // Scroll down indicator
        if (this.scrollOffset < this.discoveries.length - this.maxVisible) {
            ctx.fillStyle = this.headerColor;
            ctx.beginPath();
            ctx.moveTo(indicatorX, listEndY);
            ctx.lineTo(indicatorX + 4, listEndY - 8);
            ctx.lineTo(indicatorX - 4, listEndY - 8);
            ctx.closePath();
            ctx.fill();
        }
    }

    truncateText(ctx, text, maxWidth) {
        if (ctx.measureText(text).width <= maxWidth) {
            return text;
        }
        
        let truncated = text;
        while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
            truncated = truncated.slice(0, -1);
        }
        
        return truncated + '...';
    }

    // Get discovery count for external use
    getDiscoveryCount() {
        return this.discoveries.length;
    }

    // Get discoveries for external use (e.g., saving/loading)
    getDiscoveries() {
        return [...this.discoveries]; // Return a copy
    }

    // Load discoveries from external source
    loadDiscoveries(discoveryData) {
        this.discoveries = discoveryData.map(entry => ({
            ...entry,
            displayTime: this.formatTimestamp(entry.timestamp)
        }));
        
        // Sort by timestamp (most recent first)
        this.discoveries.sort((a, b) => b.timestamp - a.timestamp);
    }
}

// Export for use in other modules
window.DiscoveryLogbook = DiscoveryLogbook;