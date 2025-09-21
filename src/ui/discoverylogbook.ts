// Discovery Logbook System for tracking exploration history
// TypeScript conversion with comprehensive type definitions

// Import dependencies
import type { Renderer } from '../graphics/renderer.js';
import type { Camera } from '../camera/camera.js';
import type { Input } from '../input/input.js';
import type { SimplifiedDiscoveryService } from '../services/SimplifiedDiscoveryService.js';
import type { DiscoveryEntry } from '../services/ObjectDiscovery.js';
import type { DiscoveryFilter, DiscoveryCategory, DiscoveryStatistics } from '../services/DiscoveryStats.js';
import type { DiscoveryDisplay } from './ui.js';

// Legacy interface for backward compatibility
interface LegacyDiscoveryEntry {
    name: string;
    type: string;
    timestamp: number;
    displayTime: string;
}

interface DiscoveryData {
    name: string;
    type: string;
    timestamp: number;
}

// UI state interfaces
type SortField = 'timestamp' | 'name' | 'type' | 'rarity';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'list' | 'detail';

interface UIState {
    viewMode: ViewMode;
    selectedDiscoveryId?: string;
}

export class DiscoveryLogbook {
    visible: boolean;
    discoveries: LegacyDiscoveryEntry[]; // For backward compatibility
    scrollOffset: number;
    maxVisible: number;
    private savedScrollOffset: number; // Remember scroll position when entering detail view
    
    // Enhanced functionality
    private discoveryManager?: SimplifiedDiscoveryService;
    private discoveryDisplay?: DiscoveryDisplay;
    private uiState: UIState;
    
    // UI element tracking for click detection
    private copyLinkBounds?: { x: number; y: number; width: number; height: number };
    private backButtonBounds?: { x: number; y: number; width: number; height: number };
    private isHoveringCopyLink: boolean = false;
    private isHoveringBackButton: boolean = false;
    private hoveredEntryIndex: number = -1;
    
    // Visual settings to match game aesthetic
    backgroundColor: string;
    borderColor: string;
    textColor: string;
    headerColor: string;
    entrySpacing: number;
    fontSize: number;
    headerFontSize: number;
    
    // Panel dimensions and positioning
    panelWidth: number;
    panelHeight: number;
    padding: number;
    headerHeight: number;

    constructor() {
        this.visible = false;
        this.discoveries = []; // Array of legacy discovery entries
        this.scrollOffset = 0; // For scrollable list
        this.maxVisible = 12; // Maximum entries visible at once
        this.savedScrollOffset = 0; // Remember scroll position when entering detail view
        
        // Initialize UI state
        this.uiState = {
            viewMode: 'list'
        };
        
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

    /**
     * Connect the enhanced DiscoveryManager for advanced features
     */
    setDiscoveryManager(discoveryManager: SimplifiedDiscoveryService): void {
        this.discoveryManager = discoveryManager;
    }

    /**
     * Connect the DiscoveryDisplay for notifications
     */
    setDiscoveryDisplay(discoveryDisplay: DiscoveryDisplay): void {
        this.discoveryDisplay = discoveryDisplay;
    }

    toggle(): void {
        this.visible = !this.visible;
        if (this.visible) {
            // Start at bottom when opening to show newest discoveries
            this.scrollToBottom();
        }
    }

    isVisible(): boolean {
        return this.visible;
    }

    addDiscovery(objectName: string, objectType: string, timestamp: number = Date.now()): void {
        // Add new discovery to the end of the list (newest at bottom)
        const discovery: LegacyDiscoveryEntry = {
            name: objectName,
            type: objectType,
            timestamp: timestamp,
            displayTime: this.formatTimestamp(timestamp)
        };
        
        this.discoveries.push(discovery);
        
        // Auto-scroll to bottom when new discovery is added
        this.scrollToBottom();
    }

    formatTimestamp(timestamp: number): string {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
        
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

    formatDistance(distance: number): string {
        // Use the same distance formatting system as the game's camera
        // 1 game unit = 10,000 meters (10 km)
        const distanceScale = 10000; // Same as camera.distanceScale
        const kilometers = distance * (distanceScale / 1000);
        
        // Convert to AU (1 AU ≈ 149.6 million km)
        const au = kilometers / 149597870.7;
        
        if (au < 0.5) {
            return `${kilometers.toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})} km`;
        } else if (au < 1000) {
            return `${au.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} AU`;
        } else {
            return `${(au / 1000).toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})} kAU`;
        }
    }

    formatDetailTimestamp(timestamp: number): string {
        const date = new Date(timestamp);
        
        // Format as readable date and time
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        
        return date.toLocaleString('en-US', options);
    }

    handleScroll(direction: number): void {
        const discoveries = this.getEnhancedDiscoveries();
        if (!this.visible || discoveries.length <= this.maxVisible) {
            return; // No scrolling needed
        }

        const maxScroll = Math.max(0, discoveries.length - this.maxVisible);
        const scrollAmount = Math.abs(direction);
        
        if (direction > 0) { // Scroll down (towards newer entries)
            this.scrollOffset = Math.min(this.scrollOffset + scrollAmount, maxScroll);
        } else { // Scroll up (towards older entries)
            this.scrollOffset = Math.max(this.scrollOffset - scrollAmount, 0);
        }
    }

    scrollToBottom(): void {
        const discoveries = this.getEnhancedDiscoveries();
        if (discoveries.length <= this.maxVisible) {
            this.scrollOffset = 0;
        } else {
            this.scrollOffset = discoveries.length - this.maxVisible;
        }
    }

    update(deltaTime: number, input?: Input): void {
        if (!this.visible) return;

        // Handle scroll input (only when logbook is visible)
        if (input) {
            // Handle page up/down for faster scrolling
            if (input.wasJustPressed('PageUp')) {
                this.handleScroll(-5);
            } else if (input.wasJustPressed('PageDown')) {
                this.handleScroll(5);
            }
            
            // View mode controls
            if (input.wasJustPressed('Escape') && this.uiState.viewMode === 'detail') {
                this.setViewMode('list');
            }
        }

        // Update relative timestamps periodically
        if (Math.floor(Date.now() / 1000) % 30 === 0) { // Every 30 seconds
            this.updateTimestamps();
        }
    }

    // Handle mouse wheel scrolling (called from game when mouse is over logbook)
    handleMouseWheel(deltaY: number): void {
        if (!this.visible) return;
        
        // Normalize wheel delta and scroll
        const scrollDirection = deltaY > 0 ? 1 : -1;
        this.handleScroll(scrollDirection);
    }

    /**
     * Handle mouse movement for hover effects
     */
    handleMouseMove(mouseX: number, mouseY: number, canvasWidth: number, canvasHeight: number): void {
        if (!this.visible) return;

        // Reset hover states
        this.isHoveringCopyLink = false;
        this.isHoveringBackButton = false;
        this.hoveredEntryIndex = -1;

        // Check if mouse is over the logbook
        if (!this.isMouseOver(mouseX, mouseY, canvasWidth, canvasHeight)) {
            return;
        }

        const panelX = canvasWidth - this.panelWidth - 20;
        const panelY = 80;

        if (this.uiState.viewMode === 'detail') {
            // Check hover on back button
            if (this.backButtonBounds) {
                const bounds = this.backButtonBounds;
                if (mouseX >= bounds.x && mouseX <= bounds.x + bounds.width && 
                    mouseY >= bounds.y && mouseY <= bounds.y + bounds.height) {
                    this.isHoveringBackButton = true;
                }
            }
            
            // Check hover on copy link in detail view
            if (this.copyLinkBounds) {
                const bounds = this.copyLinkBounds;
                if (mouseX >= bounds.x && mouseX <= bounds.x + bounds.width && 
                    mouseY >= bounds.y && mouseY <= bounds.y + bounds.height) {
                    this.isHoveringCopyLink = true;
                }
            }
        } else {
            // Check hover on discovery entries in list view
            const discoveries = this.getEnhancedDiscoveries();
            const listStartY = panelY + this.headerHeight + this.padding;
            const entryIndex = Math.floor((mouseY - listStartY + 8) / this.entrySpacing);
            const adjustedIndex = entryIndex + this.scrollOffset;
            
            if (adjustedIndex >= 0 && adjustedIndex < discoveries.length) {
                this.hoveredEntryIndex = adjustedIndex;
            }
        }
    }

    // Check if mouse coordinates are over the logbook panel
    isMouseOver(mouseX: number, mouseY: number, canvasWidth: number, _canvasHeight: number): boolean {
        if (!this.visible) return false;
        
        const panelX = canvasWidth - this.panelWidth - 20;
        const panelY = 80;
        
        return mouseX >= panelX && mouseX <= panelX + this.panelWidth &&
               mouseY >= panelY && mouseY <= panelY + this.panelHeight;
    }

    updateTimestamps(): void {
        for (const discovery of this.discoveries) {
            discovery.displayTime = this.formatTimestamp(discovery.timestamp);
        }
    }

    render(renderer: Renderer, camera?: Camera): void {
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
        
        // Render based on current view mode
        if (this.uiState.viewMode === 'detail' && this.getSelectedDiscovery()) {
            this.renderDetailView(ctx, panelX, panelY, camera);
        } else {
            // Clear click bounds when not in detail view
            this.copyLinkBounds = undefined;
            this.backButtonBounds = undefined;
            
            // Draw header with filter/sort controls
            this.renderEnhancedHeader(ctx, panelX, panelY);
            
            // Draw discovery list
            this.renderEnhancedDiscoveries(ctx, panelX, panelY);
        }
        
        // Restore context state
        ctx.restore();
    }

    /**
     * Render enhanced header with controls and statistics
     */
    renderEnhancedHeader(ctx: CanvasRenderingContext2D, panelX: number, panelY: number): void {
        // Header background
        ctx.fillStyle = this.borderColor + '40'; // Semi-transparent
        ctx.fillRect(panelX, panelY, this.panelWidth, this.headerHeight);
        
        // Header text
        ctx.font = `${this.headerFontSize}px "Courier New", monospace`;
        ctx.fillStyle = this.headerColor;
        ctx.textAlign = 'center';
        ctx.fillText('Discovery Logbook', panelX + this.panelWidth / 2, panelY + 16);
        
        // Simple discovery count
        if (this.discoveryManager) {
            const discoveries = this.discoveryManager.getDiscoveries();
            ctx.font = `11px "Courier New", monospace`;
            ctx.fillStyle = this.textColor;
            ctx.textAlign = 'center';
            ctx.fillText(`${discoveries.length} discoveries`, panelX + this.panelWidth / 2, panelY + 32);
        }
        
        ctx.textAlign = 'left'; // Reset
    }

    /**
     * Render enhanced discovery list with rarity indicators
     */
    renderEnhancedDiscoveries(ctx: CanvasRenderingContext2D, panelX: number, panelY: number): void {
        const discoveries = this.getEnhancedDiscoveries();
        const listStartY = panelY + this.headerHeight + this.padding;
        const listWidth = this.panelWidth - (this.padding * 2);
        
        if (discoveries.length === 0) {
            // Show filtered empty state or general empty state
            ctx.fillStyle = this.textColor + '80';
            ctx.textAlign = 'center';
            ctx.font = `${this.fontSize}px "Courier New", monospace`;
            
            ctx.fillText('No discoveries yet...', panelX + this.panelWidth / 2, listStartY + 40);
            ctx.font = `11px "Courier New", monospace`;
            ctx.fillText('Explore space to find celestial objects!', panelX + this.panelWidth / 2, listStartY + 60);
            ctx.textAlign = 'left';
            return;
        }
        
        // Calculate visible entries
        const startIndex = this.scrollOffset;
        const endIndex = Math.min(startIndex + this.maxVisible, discoveries.length);
        
        ctx.font = `${this.fontSize}px "Courier New", monospace`;
        
        for (let i = startIndex; i < endIndex; i++) {
            const discovery = discoveries[i];
            const entryY = listStartY + (i - startIndex) * this.entrySpacing;
            
            this.renderDiscoveryEntry(ctx, discovery, panelX, entryY, listWidth, i - startIndex);
        }
        
        // Draw scroll indicators if needed
        if (discoveries.length > this.maxVisible) {
            this.renderScrollIndicators(ctx, panelX, panelY);
        }
    }

    /**
     * Render individual discovery entry with rarity styling
     */
    renderDiscoveryEntry(ctx: CanvasRenderingContext2D, discovery: DiscoveryEntry, panelX: number, entryY: number, listWidth: number, index: number): void {
        const adjustedIndex = index + this.scrollOffset;
        const isHovered = this.hoveredEntryIndex === adjustedIndex;
        
        // Background colors for readability with hover effect
        if (isHovered) {
            // Hover state - brighter background
            ctx.fillStyle = this.headerColor + '30';
            ctx.fillRect(panelX + this.padding, entryY - 8, listWidth, this.entrySpacing);
        } else if (index % 2 === 1) {
            // Alternate row background
            ctx.fillStyle = this.borderColor + '20';
            ctx.fillRect(panelX + this.padding, entryY - 8, listWidth, this.entrySpacing);
        }
        
        // Rarity indicator (left edge)
        const rarityColor = this.getRarityColor(discovery.rarity);
        ctx.fillStyle = rarityColor;
        ctx.fillRect(panelX + this.padding, entryY - 8, 3, this.entrySpacing);
        
        // Discovery name with rarity styling
        ctx.fillStyle = discovery.rarity === 'ultra-rare' ? rarityColor : this.textColor;
        ctx.font = `${this.fontSize}px "Courier New", monospace`;
        const nameText = this.truncateText(ctx, discovery.name, listWidth - 80);
        ctx.fillText(nameText, panelX + this.padding + 8, entryY + 4);
        
        // Discovery type
        ctx.font = `11px "Courier New", monospace`;
        ctx.fillStyle = this.textColor + 'A0';
        ctx.fillText(discovery.type, panelX + this.padding + 8, entryY + 16);
        
        // Timestamp (right-aligned)
        ctx.textAlign = 'right';
        ctx.font = `11px "Courier New", monospace`;
        const displayTime = this.formatTimestamp(discovery.timestamp);
        ctx.fillText(displayTime, panelX + this.panelWidth - this.padding, entryY + 4);
        
        
        ctx.textAlign = 'left';
    }

    /**
     * Render detailed view for selected discovery
     */
    renderDetailView(ctx: CanvasRenderingContext2D, panelX: number, panelY: number, camera?: Camera): void {
        const discovery = this.getSelectedDiscovery();
        if (!discovery) return;
        
        const contentY = panelY + this.padding;
        let currentY = contentY;
        
        // Back button indicator with hover effect
        ctx.font = `14px "Courier New", monospace`;
        const backButtonText = '← Back to List';
        const backButtonX = panelX + this.padding;
        const backButtonY = currentY;
        
        // Style based on hover state
        if (this.isHoveringBackButton) {
            ctx.fillStyle = '#ffffff'; // Bright white when hovering
            // Add underline for hover
            ctx.fillRect(backButtonX, backButtonY + 2, ctx.measureText(backButtonText).width, 1);
        } else {
            ctx.fillStyle = this.headerColor;
        }
        ctx.fillText(backButtonText, backButtonX, backButtonY);
        
        // Store bounds for click and hover detection
        // Note: backButtonY is the text baseline, so adjust bounds to cover actual text area
        const backButtonWidth = ctx.measureText(backButtonText).width;
        this.backButtonBounds = {
            x: backButtonX,
            y: backButtonY - 12, // Account for text height above baseline
            width: backButtonWidth,
            height: 16 // Cover text height plus small margin
        };
        
        currentY += 28;
        
        // Discovery name (title)
        ctx.font = `16px "Courier New", monospace`;
        ctx.fillStyle = this.getRarityColor(discovery.rarity);
        const wrappedName = this.wrapText(ctx, discovery.name, this.panelWidth - this.padding * 2);
        for (const line of wrappedName) {
            ctx.fillText(line, panelX + this.padding, currentY);
            currentY += 20;
        }
        currentY += 10;
        
        // Type and rarity
        ctx.font = `13px "Courier New", monospace`;
        ctx.fillStyle = this.textColor;
        ctx.fillText(`Type: ${discovery.type}`, panelX + this.padding, currentY);
        currentY += 18;
        ctx.fillText(`Rarity: ${discovery.rarity}`, panelX + this.padding, currentY);
        currentY += 22;
        
        // Coordinates and distance
        ctx.font = `12px "Courier New", monospace`;
        ctx.fillStyle = this.textColor + 'C0';
        ctx.fillText(`Location: (${discovery.coordinates.x.toFixed(1)}, ${discovery.coordinates.y.toFixed(1)})`, panelX + this.padding, currentY);
        currentY += 16;
        
        if (camera) {
            const distance = Math.sqrt((discovery.coordinates.x - camera.x) ** 2 + (discovery.coordinates.y - camera.y) ** 2);
            ctx.fillText(`Distance: ${this.formatDistance(distance)}`, panelX + this.padding, currentY);
            currentY += 16;
        }
        
        ctx.fillText(`Discovered: ${this.formatDetailTimestamp(discovery.timestamp)}`, panelX + this.padding, currentY);
        currentY += 22;
        
        // Share URL - Copy link
        ctx.font = `12px "Courier New", monospace`;
        ctx.fillStyle = this.textColor + 'C0';
        ctx.fillText('Share: ', panelX + this.padding, currentY);
        
        // Clickable "Copy Link" text with hover state
        const copyLinkText = 'Copy Link';
        const shareTextWidth = ctx.measureText('Share: ').width;
        const copyLinkX = panelX + this.padding + shareTextWidth;
        const copyLinkY = currentY;
        
        // Style based on hover state
        if (this.isHoveringCopyLink) {
            ctx.fillStyle = '#ffffff'; // Bright white when hovering
            // Add underline for hover
            ctx.fillRect(copyLinkX, copyLinkY + 2, ctx.measureText(copyLinkText).width, 1);
        } else {
            ctx.fillStyle = this.headerColor;
        }
        ctx.fillText(copyLinkText, copyLinkX, copyLinkY);
        
        // Store bounds for click detection
        const copyLinkWidth = ctx.measureText(copyLinkText).width;
        this.copyLinkBounds = {
            x: copyLinkX,
            y: copyLinkY - 12, // Account for text baseline
            width: copyLinkWidth,
            height: 16
        };
        
        currentY += 20;
        
    }

    /**
     * Render filter panel overlay
     */

    renderHeader(ctx: CanvasRenderingContext2D, panelX: number, panelY: number): void {
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

    renderDiscoveries(ctx: CanvasRenderingContext2D, panelX: number, panelY: number): void {
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

    renderScrollIndicators(ctx: CanvasRenderingContext2D, panelX: number, panelY: number): void {
        const discoveries = this.getEnhancedDiscoveries();
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
        if (this.scrollOffset < discoveries.length - this.maxVisible) {
            ctx.fillStyle = this.headerColor;
            ctx.beginPath();
            ctx.moveTo(indicatorX, listEndY);
            ctx.lineTo(indicatorX + 4, listEndY - 8);
            ctx.lineTo(indicatorX - 4, listEndY - 8);
            ctx.closePath();
            ctx.fill();
        }
    }

    truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
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
    getDiscoveryCount(): number {
        return this.discoveries.length;
    }

    // Get discoveries for external use (e.g., saving/loading)
    getDiscoveries(): LegacyDiscoveryEntry[] {
        return [...this.discoveries]; // Return a copy
    }

    // === Enhanced Discovery Methods ===

    /**
     * Get enhanced discoveries from DiscoveryManager with current filters and sorting
     */
    getEnhancedDiscoveries(): DiscoveryEntry[] {
        if (!this.discoveryManager) {
            return [];
        }

        // Simple chronological order (oldest to newest) to match traditional behavior
        return this.discoveryManager.getDiscoveries().sort((a, b) => a.timestamp - b.timestamp);
    }

    /**
     * Get discovery statistics from DiscoveryManager
     */
    getStatistics(): DiscoveryStatistics | null {
        return this.discoveryManager ? this.discoveryManager.getStatistics() : null;
    }

    /**
     * Set filter for discovery list
     */

    /**
     * Switch between list and detail view modes
     */
    setViewMode(mode: ViewMode): void {
        if (mode === 'detail') {
            // Save current scroll position before entering detail view
            this.savedScrollOffset = this.scrollOffset;
        } else if (mode === 'list') {
            // Restore scroll position when returning to list view
            this.scrollOffset = this.savedScrollOffset;
        }
        this.uiState.viewMode = mode;
    }

    /**
     * Select a discovery for detail view
     */
    selectDiscovery(discoveryId: string): void {
        this.uiState.selectedDiscoveryId = discoveryId;
        this.setViewMode('detail');
    }

    /**
     * Get currently selected discovery
     */
    getSelectedDiscovery(): DiscoveryEntry | null {
        if (!this.discoveryManager || !this.uiState.selectedDiscoveryId) {
            return null;
        }
        return this.discoveryManager.getDiscoveryById(this.uiState.selectedDiscoveryId) || null;
    }


    // === Utility Methods for Enhanced UI ===

    /**
     * Get rarity color for visual indicators
     */
    private getRarityColor(rarity: string): string {
        switch (rarity) {
            case 'common': return '#b0c4d4';
            case 'uncommon': return '#fff3cd';
            case 'rare': return '#ffa500';
            case 'ultra-rare': return '#ff6b6b';
            default: return this.textColor;
        }
    }


    /**
     * Wrap text to fit within specified width
     */
    private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }

    /**
     * Handle mouse clicks for interactive elements
     */
    handleClick(mouseX: number, mouseY: number, canvasWidth: number, canvasHeight: number, camera?: Camera): boolean {
        if (!this.visible) return false;
        
        const panelX = canvasWidth - this.panelWidth - 20;
        const panelY = 80;
        
        // Check if click is within panel
        if (!this.isMouseOver(mouseX, mouseY, canvasWidth, canvasHeight)) {
            return false;
        }
        
        if (this.uiState.viewMode === 'detail') {
            // Check for back button click using same bounds as hover detection
            if (this.backButtonBounds) {
                const bounds = this.backButtonBounds;
                if (mouseX >= bounds.x && mouseX <= bounds.x + bounds.width && 
                    mouseY >= bounds.y && mouseY <= bounds.y + bounds.height) {
                    this.setViewMode('list');
                    return true;
                }
            }
            
            // Check for copy link click
            const discovery = this.getSelectedDiscovery();
            if (discovery && this.copyLinkBounds) {
                const bounds = this.copyLinkBounds;
                if (mouseX >= bounds.x && mouseX <= bounds.x + bounds.width && 
                    mouseY >= bounds.y && mouseY <= bounds.y + bounds.height) {
                    this.copyToClipboard(discovery.shareableURL);
                    return true;
                }
            }
        } else {
            // List view - check for discovery entry clicks
            const discoveries = this.getEnhancedDiscoveries();
            const listStartY = panelY + this.headerHeight + this.padding;
            const entryIndex = Math.floor((mouseY - listStartY + 8) / this.entrySpacing);
            const adjustedIndex = entryIndex + this.scrollOffset;
            
            if (adjustedIndex >= 0 && adjustedIndex < discoveries.length) {
                this.selectDiscovery(discoveries[adjustedIndex].id);
                return true;
            }
        }
        
        return true; // Consume click even if no action
    }

    /**
     * Jump camera to discovery location
     */
    jumpToDiscovery(discoveryId: string, camera: Camera): boolean {
        if (!this.discoveryManager) return false;
        
        const discovery = this.discoveryManager.getDiscoveryById(discoveryId);
        if (discovery) {
            camera.x = discovery.coordinates.x;
            camera.y = discovery.coordinates.y;
            return true;
        }
        return false;
    }

    /**
     * Copy text to clipboard with fallback and notification
     */
    private async copyToClipboard(text: string): Promise<void> {
        try {
            // Modern clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                console.log('Share URL copied to clipboard:', text);
                this.showCopyConfirmation();
            } else {
                // Fallback for older browsers or non-secure contexts
                this.fallbackCopyToClipboard(text);
            }
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            // Show the URL in console as last resort
            console.log('Share URL (copy manually):', text);
        }
    }

    /**
     * Fallback clipboard method for older browsers
     */
    private fallbackCopyToClipboard(text: string): void {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            console.log('Share URL copied to clipboard (fallback):', text);
            this.showCopyConfirmation();
        } catch (err) {
            console.error('Fallback copy failed:', err);
            console.log('Share URL (copy manually):', text);
        } finally {
            document.body.removeChild(textArea);
        }
    }

    /**
     * Show confirmation that link was copied
     */
    private showCopyConfirmation(): void {
        // Use the same notification system as the 'C' key copy
        if (this.discoveryDisplay) {
            this.discoveryDisplay.addNotification('Discovery link copied to clipboard!');
        } else {
            // Fallback to console if no discovery display available
            console.log('Discovery link copied to clipboard!');
        }
    }

    // Load discoveries from external source
    loadDiscoveries(discoveryData: DiscoveryData[]): void {
        this.discoveries = discoveryData.map(entry => ({
            ...entry,
            displayTime: this.formatTimestamp(entry.timestamp)
        }));
        
        // Sort by timestamp (most recent first)
        this.discoveries.sort((a, b) => b.timestamp - a.timestamp);
    }

    // Clear all discovery history
    clearHistory(): void {
        this.discoveries = [];
        this.scrollOffset = 0;
    }
}

// Export for use in other modules (maintain global compatibility)
declare global {
    interface Window {
        DiscoveryLogbook: typeof DiscoveryLogbook;
    }
}

if (typeof window !== 'undefined') {
    window.DiscoveryLogbook = DiscoveryLogbook;
}