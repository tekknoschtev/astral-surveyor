// SettingsMenu - UI component for user preference management
// Canvas-based settings menu with tabbed interface matching game aesthetics

import type { SettingsService } from '../services/SettingsService.js';
import type { Input } from '../input/input.js';
import { UIErrorBoundary } from './UIErrorBoundary.js';
import { getErrorService } from '../services/ErrorService.js';

type TabName = 'audio' | 'display' | 'data';

interface MenuDimensions {
    x: number;
    y: number;
    width: number;
    height: number;
    tabHeight: number;
    contentY: number;
}

interface SliderState {
    x: number;
    y: number;
    width: number;
    height: number;
    value: number;
    dragging: boolean;
}

export class SettingsMenu {
    private readonly settingsService: SettingsService;
    private readonly errorBoundary: UIErrorBoundary;
    private visible: boolean = false;
    private currentTab: TabName = 'audio';
    private touchMode: boolean = false;
    private needsRedrawFlag: boolean = true;
    private dimensions: MenuDimensions;
    
    // Click debouncing to prevent double-clicks
    private lastClickTime: number = 0;
    private clickDebounceMs: number = 200;
    
    // Slider states for audio controls
    private ambientSlider: SliderState = { x: 0, y: 0, width: 0, height: 0, value: 0, dragging: false };
    private discoverySlider: SliderState = { x: 0, y: 0, width: 0, height: 0, value: 0, dragging: false };
    private masterSlider: SliderState = { x: 0, y: 0, width: 0, height: 0, value: 0, dragging: false };
    private uiScaleSlider: SliderState = { x: 0, y: 0, width: 0, height: 0, value: 0, dragging: false };
    
    // Settings change event handler
    private settingsChangeHandler: (event: any) => void;
    private disposed: boolean = false;

    constructor(settingsService: SettingsService) {
        if (!settingsService) {
            throw new Error('SettingsService is required');
        }
        
        this.settingsService = settingsService;
        this.errorBoundary = new UIErrorBoundary(getErrorService(), {
            showErrorDetails: true,
            enableRecovery: true,
            fallbackMessage: 'Settings menu temporarily unavailable'
        });
        this.dimensions = this.calculateDimensions({ width: 1024, height: 768 }); // Default dimensions
        
        // Set up settings change listener
        this.settingsChangeHandler = this.errorBoundary.safeEventHandler('SettingsMenu', (_event: any) => {
            this.needsRedrawFlag = true;
        });
        this.settingsService.addEventListener('settingsChanged', this.settingsChangeHandler);
    }

    private calculateDimensions(canvas: { width: number; height: number }): MenuDimensions {
        const baseWidth = this.touchMode ? 500 : 600;
        const baseHeight = this.touchMode ? 450 : 500;
        
        const width = Math.min(baseWidth, canvas.width * 0.8);
        const height = Math.min(baseHeight, canvas.height * 0.8);
        const x = (canvas.width - width) / 2;
        const y = (canvas.height - height) / 2;
        const tabHeight = this.touchMode ? 50 : 40;
        
        return {
            x, y, width, height,
            tabHeight,
            contentY: y + tabHeight
        };
    }

    // Visibility Management
    isVisible(): boolean {
        return this.visible;
    }

    show(): void {
        this.visible = true;
        this.currentTab = 'audio'; // Reset to audio tab when shown
        this.needsRedrawFlag = true;
        console.log('🎨 SHOW: Settings menu opened, needsRedrawFlag set to true');
    }

    hide(): void {
        this.visible = false;
        this.clearDragStates();
        this.needsRedrawFlag = true;
    }

    toggle(): void {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }

    private clearDragStates(): void {
        this.ambientSlider.dragging = false;
        this.discoverySlider.dragging = false;
        this.masterSlider.dragging = false;
        this.uiScaleSlider.dragging = false;
    }
    
    private isPointInMenu(mouseX: number, mouseY: number): boolean {
        const { x, y, width, height } = this.dimensions;
        return mouseX >= x && mouseX <= x + width && 
               mouseY >= y && mouseY <= y + height;
    }
    
    private isDragging(): boolean {
        return this.ambientSlider.dragging || 
               this.discoverySlider.dragging || 
               this.masterSlider.dragging || 
               this.uiScaleSlider.dragging;
    }
    
    handleKeyPress(key: string): boolean {
        if (!this.visible) {
            return false;
        }
        
        switch (key) {
            case 'Escape':
                this.hide();
                return true;
            case 'Digit1':
                this.setCurrentTab('audio');
                return true;
            // Future keyboard shortcuts (framework preserved):
            // case 'Digit2':
            //     this.setCurrentTab('display');
            //     return true;
            // case 'Digit3':
            //     this.setCurrentTab('data');
            //     return true;
            default:
                return false;
        }
    }

    // Tab Management
    getCurrentTab(): TabName {
        return this.currentTab;
    }

    setCurrentTab(tab: string): void {
        const validTabs: TabName[] = ['audio', 'display', 'data'];
        if (!validTabs.includes(tab as TabName)) {
            throw new Error(`Invalid tab: ${tab}`);
        }
        
        this.currentTab = tab as TabName;
        this.clearDragStates();
        this.needsRedrawFlag = true;
    }

    // Touch Mode
    setTouchMode(touchMode: boolean): void {
        this.touchMode = touchMode;
        this.needsRedrawFlag = true;
    }

    needsRedraw(): boolean {
        return this.needsRedrawFlag;
    }

    // Rendering
    render(ctx: CanvasRenderingContext2D, canvas: { width: number; height: number }): void {
        if (!this.visible) {
            return;
        }

        this.errorBoundary.wrapComponent('SettingsMenu.render', () => {
            console.log('🎨 RENDER: Settings menu render called, needsRedrawFlag:', this.needsRedrawFlag);
            // Always render for now - the optimization was causing issues
            // if (!this.needsRedrawFlag) {
            //     return;
            // }

            this.dimensions = this.calculateDimensions(canvas);
            
            ctx.save();
            
            // Render modal overlay
            this.renderOverlay(ctx, canvas);
            
            // Render settings panel
            this.renderPanel(ctx);
        
            // Render tabs
            this.renderTabs(ctx);
            
            // Render current tab content
            this.renderCurrentTabContent(ctx);
            
            ctx.restore();
            
            this.needsRedrawFlag = false;
        });
    }

    private renderOverlay(ctx: CanvasRenderingContext2D, canvas: { width: number; height: number }): void {
        // Match stellar map overlay style
        ctx.fillStyle = '#000000B0'; // Semi-transparent black
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    private renderPanel(ctx: CanvasRenderingContext2D): void {
        const { x, y, width, height } = this.dimensions;
        
        // Panel background - match logbook style  
        ctx.fillStyle = '#000511E0'; // Same as logbook: semi-transparent dark blue
        ctx.fillRect(x, y, width, height);
        
        // Panel border - match logbook style
        ctx.strokeStyle = '#2a3a4a'; // Same as logbook border
        ctx.lineWidth = 1; // Thinner, more subtle
        ctx.strokeRect(x, y, width, height);
    }

    private renderTabs(ctx: CanvasRenderingContext2D): void {
        const { x, y, width, tabHeight } = this.dimensions;
        
        // Currently only Audio tab is implemented - Display and Data tabs disabled for now
        const tabs: { name: TabName; label: string }[] = [
            { name: 'audio', label: 'Audio' }
            // Future tabs (framework preserved):
            // { name: 'display', label: 'Display' },
            // { name: 'data', label: 'Data' }
        ];
        
        const tabWidth = width / tabs.length;
        
        // Use monospace font like logbook
        ctx.font = this.touchMode ? '16px "Courier New", monospace' : '14px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        tabs.forEach((tab, index) => {
            const tabX = x + index * tabWidth;
            const isActive = tab.name === this.currentTab;
            
            // Tab background - darker, more subtle
            ctx.fillStyle = isActive ? '#2a3a4a' : '#1a2030'; // Dark blue-gray tones
            ctx.fillRect(tabX, y, tabWidth, tabHeight);
            
            // Tab border - match panel border
            ctx.strokeStyle = '#2a3a4a';
            ctx.lineWidth = 1;
            ctx.strokeRect(tabX, y, tabWidth, tabHeight);
            
            // Tab text - match logbook colors
            ctx.fillStyle = isActive ? '#d4a574' : '#b0c4d4'; // Amber for active, blue-gray for inactive
            ctx.fillText(tab.label, tabX + tabWidth / 2, y + tabHeight / 2);
        });
    }

    private renderCurrentTabContent(ctx: CanvasRenderingContext2D): void {
        switch (this.currentTab) {
            case 'audio':
                this.renderAudioTab(ctx);
                break;
            // Future tab renderers (framework preserved):
            // case 'display':
            //     this.renderDisplayTab(ctx);
            //     break;
            // case 'data':
            //     this.renderDataTab(ctx);
            //     break;
        }
    }

    private renderAudioTab(ctx: CanvasRenderingContext2D): void {
        const { x, contentY, width } = this.dimensions;
        const contentWidth = width - 40;
        const startX = x + 20;
        let currentY = contentY + 30;
        
        // Match logbook styling
        ctx.font = this.touchMode ? '14px "Courier New", monospace' : '12px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#b0c4d4'; // Soft blue-gray text like logbook
        
        // Ambient Volume
        ctx.fillText('Ambient Background Volume', startX, currentY);
        currentY += 30;
        
        const ambientValue = this.settingsService.getAmbientVolume();
        this.ambientSlider = this.renderVolumeSlider(ctx, startX, currentY, contentWidth - 120, ambientValue);
        
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(ambientValue).toString(), startX + contentWidth - 80, currentY + 10);
        
        // Ambient mute checkbox
        const ambientMuted = this.settingsService.isAmbientMuted();
        console.log('🔲 VISUAL DEBUG: About to render Ambient checkbox with muted state:', ambientMuted, 'from SettingsService instance:', (this.settingsService as any).instanceId);
        this.renderCheckbox(ctx, startX + contentWidth - 60, currentY + 2, ambientMuted);
        ctx.fillText('Mute', startX + contentWidth - 10, currentY + 10);
        
        currentY += 50;
        
        // Discovery Volume
        ctx.textAlign = 'left';
        ctx.fillStyle = '#b0c4d4'; // Ensure consistent text color
        ctx.fillText('Discovery Sounds Volume', startX, currentY);
        currentY += 30;
        
        const discoveryValue = this.settingsService.getDiscoveryVolume();
        this.discoverySlider = this.renderVolumeSlider(ctx, startX, currentY, contentWidth - 120, discoveryValue);
        
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(discoveryValue).toString(), startX + contentWidth - 80, currentY + 10);
        
        // Discovery mute checkbox
        this.renderCheckbox(ctx, startX + contentWidth - 60, currentY + 2, this.settingsService.isDiscoveryMuted());
        ctx.fillText('Mute', startX + contentWidth - 10, currentY + 10);
        
        currentY += 50;
        
        // Master Volume
        ctx.textAlign = 'left';
        ctx.fillStyle = '#b0c4d4'; // Ensure consistent text color
        ctx.fillText('Master Volume', startX, currentY);
        currentY += 30;
        
        const masterValue = this.settingsService.getMasterVolume();
        this.masterSlider = this.renderVolumeSlider(ctx, startX, currentY, contentWidth - 120, masterValue);
        
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(masterValue).toString(), startX + contentWidth - 80, currentY + 10);
        
        // Master mute checkbox
        this.renderCheckbox(ctx, startX + contentWidth - 60, currentY + 2, this.settingsService.isMasterMuted());
        ctx.fillText('Mute', startX + contentWidth - 10, currentY + 10);
    }

    private renderDisplayTab(ctx: CanvasRenderingContext2D): void {
        const { x, contentY, width } = this.dimensions;
        const contentWidth = width - 40;
        const startX = x + 20;
        let currentY = contentY + 30;
        
        // Match logbook styling
        ctx.font = this.touchMode ? '14px "Courier New", monospace' : '12px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#b0c4d4'; // Soft blue-gray text like logbook
        
        // Show Coordinates
        ctx.fillText('Show Coordinates', startX, currentY);
        this.renderCheckbox(ctx, startX + contentWidth - 60, currentY - 8, this.settingsService.getShowCoordinates());
        currentY += 50;
        
        // UI Scale
        ctx.fillText('UI Scale', startX, currentY);
        currentY += 30;
        
        const scaleValue = Math.round(this.settingsService.getUIScale() * 100);
        this.uiScaleSlider = this.renderScaleSlider(ctx, startX, currentY, contentWidth - 80, this.settingsService.getUIScale());
        
        ctx.textAlign = 'right';
        ctx.fillText(`${scaleValue}%`, startX + contentWidth - 10, currentY + 10);
        currentY += 50;
        
        // Fullscreen
        ctx.textAlign = 'left';
        ctx.fillText('Fullscreen', startX, currentY);
        this.renderCheckbox(ctx, startX + contentWidth - 60, currentY - 8, this.settingsService.isFullscreen());
    }

    private renderDataTab(ctx: CanvasRenderingContext2D): void {
        const { x, contentY, width } = this.dimensions;
        const startX = x + 20;
        let currentY = contentY + 50;
        
        // Match logbook styling for buttons
        ctx.font = this.touchMode ? '14px "Courier New", monospace' : '12px "Courier New", monospace';
        ctx.textAlign = 'center';
        
        // Export Save Data button - subtle colors
        this.renderButton(ctx, startX, currentY, width - 40, 40, 'Export Save Data', '#2a3a4a');
        currentY += 70;
        
        // Reset Distance Traveled button
        this.renderButton(ctx, startX, currentY, width - 40, 40, 'Reset Distance Traveled', '#3a2a1a');
        currentY += 70;
        
        // Clear Discovery History button
        this.renderButton(ctx, startX, currentY, width - 40, 40, 'Clear Discovery History', '#3a1a1a');
    }

    private renderVolumeSlider(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, value: number): SliderState {
        const height = this.touchMode ? 24 : 20;
        const handleRadius = this.touchMode ? 12 : 10;
        
        // Slider track - darker, more subtle
        ctx.fillStyle = '#2a3a4a'; // Match border color
        ctx.fillRect(x, y + height/2 - 2, width, 4);
        
        // Slider fill - gentle amber like logbook headers
        const fillWidth = (width * value) / 100;
        ctx.fillStyle = '#d4a574'; // Match logbook header color
        ctx.fillRect(x, y + height/2 - 2, fillWidth, 4);
        
        // Slider handle
        const handleX = x + fillWidth;
        const handleY = y + height/2;
        
        ctx.beginPath();
        ctx.arc(handleX, handleY, handleRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#b8956b'; // Slightly darker amber
        ctx.fill();
        ctx.strokeStyle = '#b0c4d4'; // Soft blue-gray border
        ctx.lineWidth = 1;
        ctx.stroke();
        
        return { x, y, width, height, value, dragging: false };
    }

    private renderScaleSlider(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, value: number): SliderState {
        const height = this.touchMode ? 24 : 20;
        const handleRadius = this.touchMode ? 12 : 10;
        
        // Convert scale (0.5-2.0) to percentage (0-100)
        const percentage = ((value - 0.5) / 1.5) * 100;
        
        // Slider track - darker, more subtle
        ctx.fillStyle = '#2a3a4a'; // Match border color
        ctx.fillRect(x, y + height/2 - 2, width, 4);
        
        // Slider fill - gentle amber like logbook headers
        const fillWidth = (width * percentage) / 100;
        ctx.fillStyle = '#d4a574'; // Match logbook header color
        ctx.fillRect(x, y + height/2 - 2, fillWidth, 4);
        
        // Slider handle
        const handleX = x + fillWidth;
        const handleY = y + height/2;
        
        ctx.beginPath();
        ctx.arc(handleX, handleY, handleRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#b8956b'; // Slightly darker amber
        ctx.fill();
        ctx.strokeStyle = '#b0c4d4'; // Soft blue-gray border
        ctx.lineWidth = 1;
        ctx.stroke();
        
        return { x, y, width, height, value: percentage, dragging: false };
    }

    private renderCheckbox(ctx: CanvasRenderingContext2D, x: number, y: number, checked: boolean): void {
        console.log('🔲 VISUAL DEBUG: renderCheckbox called with checked:', checked, 'at position:', x, y);
        const size = this.touchMode ? 20 : 16;
        
        // Checkbox background - more contrasting colors
        ctx.fillStyle = checked ? '#4a6a4a' : '#1a2030'; // Green tint when checked
        ctx.fillRect(x, y, size, size);
        
        // Checkbox border - soft blue-gray
        ctx.strokeStyle = '#b0c4d4';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, size, size);
        
        // Checkmark - amber like headers
        if (checked) {
            console.log('🔲 VISUAL DEBUG: Drawing checkmark at', x, y);
            ctx.strokeStyle = '#d4a574';
            ctx.lineWidth = 3; // Thicker for better visibility
            ctx.beginPath();
            ctx.moveTo(x + 4, y + size/2);
            ctx.lineTo(x + size/2, y + size - 4);
            ctx.lineTo(x + size - 4, y + 4);
            ctx.stroke();
        } else {
            console.log('🔲 VISUAL DEBUG: NOT drawing checkmark (unchecked)');
        }
    }

    private renderButton(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, text: string, color: string): void {
        // Button background - subtle dark colors
        ctx.fillStyle = color;
        ctx.fillRect(x, y, width, height);
        
        // Button border - soft blue-gray like logbook
        ctx.strokeStyle = '#2a3a4a';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);
        
        // Button text - soft blue-gray like logbook text
        ctx.fillStyle = '#b0c4d4';
        ctx.textAlign = 'center';
        ctx.fillText(text, x + width/2, y + height/2 + 5);
    }

    // Input Handling
    handleInput(input: Input): void {
        if (!this.visible) {
            return;
        }

        const mouseX = input.getMouseX();
        const mouseY = input.getMouseY();
        
        // Check if mouse is over the settings menu area
        const isOverMenu = this.isPointInMenu(mouseX, mouseY);
        const isDragging = this.isDragging();
        
        // Handle clicks - consume input if over menu or if dragging
        if (input.wasClicked()) {
            this.handleClick(mouseX, mouseY);
            
            // If click was over menu area or outside (closing menu), consume it
            if (isOverMenu || !this.visible) { // Menu might close in handleClick
                input.consumeTouch();
            }
        }
        
        // Handle mouse drag for sliders - always consume when dragging
        if (input.isMousePressed()) {
            this.handleMouseDrag(mouseX, mouseY);
            
            // Consume input if over menu or actively dragging sliders
            if (isOverMenu || isDragging) {
                input.consumeTouch();
            }
        } else {
            this.clearDragStates();
        }
    }

    private handleClick(mouseX: number, mouseY: number): void {
        const { x, y, width, tabHeight } = this.dimensions;
        
        // Check if clicking outside menu to close
        if (mouseX < x || mouseX > x + width || mouseY < y || mouseY > y + this.dimensions.height) {
            this.hide();
            return;
        }
        
        // Handle tab clicks (currently only Audio tab available)
        if (mouseY >= y && mouseY <= y + tabHeight) {
            const tabs: TabName[] = ['audio']; // Future tabs: 'display', 'data'
            const tabWidth = width / tabs.length;
            const tabIndex = Math.floor((mouseX - x) / tabWidth);
            
            if (tabIndex >= 0 && tabIndex < tabs.length) {
                this.setCurrentTab(tabs[tabIndex]);
                return;
            }
        }
        
        // Handle content area clicks based on current tab
        this.handleContentClick(mouseX, mouseY);
    }

    private handleContentClick(mouseX: number, mouseY: number): void {
        try {
            switch (this.currentTab) {
                case 'audio':
                    this.handleAudioTabClick(mouseX, mouseY);
                    break;
                // Future tab handlers (framework preserved):
                // case 'display':
                //     this.handleDisplayTabClick(mouseX, mouseY);
                //     break;
                // case 'data':
                //     this.handleDataTabClick(mouseX, mouseY);
                //     break;
            }
        } catch (error) {
            console.warn('Error handling content click:', error);
        }
    }

    private handleAudioTabClick(mouseX: number, mouseY: number): void {
        // Debounce clicks to prevent double-firing
        const now = Date.now();
        if (now - this.lastClickTime < this.clickDebounceMs) {
            return;
        }
        this.lastClickTime = now;
        
        // Check mute checkbox clicks using dynamic positioning like the renderer
        const { x, contentY, width } = this.dimensions;
        const contentWidth = width - 40;
        const startX = x + 20;
        let currentY = contentY + 30;
        
        console.log('🔲 CHECKBOX DEBUG: Dimensions - x:', x, 'contentY:', contentY, 'width:', width);
        console.log('🔲 CHECKBOX DEBUG: Calculated - contentWidth:', contentWidth, 'startX:', startX, 'currentY:', currentY);
        
        const checkboxSize = this.touchMode ? 20 : 16;
        console.log('🔲 CHECKBOX DEBUG: checkboxSize:', checkboxSize, 'touchMode:', this.touchMode);
        
        // Calculate actual checkbox positions to match rendering
        // Ambient checkbox
        currentY += 30; // After ambient label
        const ambientCheckboxX = startX + contentWidth - 60;
        const ambientCheckboxY = currentY + 2;
        
        console.log('🔲 CHECKBOX DEBUG: Ambient checkbox bounds:', 
            'X:', ambientCheckboxX, '-', ambientCheckboxX + checkboxSize, 
            'Y:', ambientCheckboxY, '-', ambientCheckboxY + checkboxSize);
        
        if (mouseX >= ambientCheckboxX && mouseX <= ambientCheckboxX + checkboxSize &&
            mouseY >= ambientCheckboxY && mouseY <= ambientCheckboxY + checkboxSize) {
            this.settingsService.setAmbientMuted(!this.settingsService.isAmbientMuted());
            this.needsRedrawFlag = true;
            return;
        }
        
        currentY += 50; // Move to discovery section
        currentY += 30; // After discovery label
        const discoveryCheckboxX = startX + contentWidth - 60;
        const discoveryCheckboxY = currentY + 2;
        
        console.log('🔲 CHECKBOX DEBUG: Discovery checkbox bounds:', 
            'X:', discoveryCheckboxX, '-', discoveryCheckboxX + checkboxSize, 
            'Y:', discoveryCheckboxY, '-', discoveryCheckboxY + checkboxSize);
        
        if (mouseX >= discoveryCheckboxX && mouseX <= discoveryCheckboxX + checkboxSize &&
            mouseY >= discoveryCheckboxY && mouseY <= discoveryCheckboxY + checkboxSize) {
            console.log('🔲 CHECKBOX DEBUG: Discovery checkbox CLICKED! Current state:', this.settingsService.isDiscoveryMuted());
            this.settingsService.setDiscoveryMuted(!this.settingsService.isDiscoveryMuted());
            console.log('🔲 CHECKBOX DEBUG: Discovery checkbox new state:', this.settingsService.isDiscoveryMuted());
            return;
        }
        
        currentY += 50; // Move to master section  
        currentY += 30; // After master label
        const masterCheckboxX = startX + contentWidth - 60;
        const masterCheckboxY = currentY + 2;
        
        console.log('🔲 CHECKBOX DEBUG: Master checkbox bounds:', 
            'X:', masterCheckboxX, '-', masterCheckboxX + checkboxSize, 
            'Y:', masterCheckboxY, '-', masterCheckboxY + checkboxSize);
        
        if (mouseX >= masterCheckboxX && mouseX <= masterCheckboxX + checkboxSize &&
            mouseY >= masterCheckboxY && mouseY <= masterCheckboxY + checkboxSize) {
            console.log('🔲 CHECKBOX DEBUG: Master checkbox CLICKED! Current state:', this.settingsService.isMasterMuted());
            this.settingsService.setMasterMuted(!this.settingsService.isMasterMuted());
            console.log('🔲 CHECKBOX DEBUG: Master checkbox new state:', this.settingsService.isMasterMuted());
            return;
        }
        
        console.log('🔲 CHECKBOX DEBUG: No checkbox was clicked - mouse outside all bounds');
    }

    private handleDisplayTabClick(mouseX: number, mouseY: number): void {
        const { x, width } = this.dimensions;
        const checkboxX = x + width - 80;
        const checkboxSize = this.touchMode ? 20 : 16;
        
        if (mouseX >= checkboxX && mouseX <= checkboxX + checkboxSize) {
            if (mouseY >= 290 && mouseY <= 310) { // Show coordinates
                this.settingsService.setShowCoordinates(!this.settingsService.getShowCoordinates());
            } else if (mouseY >= 410 && mouseY <= 430) { // Fullscreen
                this.settingsService.setFullscreen(!this.settingsService.isFullscreen());
            }
        }
    }

    private handleDataTabClick(mouseX: number, mouseY: number): void {
        const { x, width } = this.dimensions;
        const buttonWidth = width - 40;
        const buttonX = x + 20;
        
        if (mouseX >= buttonX && mouseX <= buttonX + buttonWidth) {
            if (mouseY >= 330 && mouseY <= 370) { // Export button
                this.handleExportClick();
            } else if (mouseY >= 400 && mouseY <= 440) { // Reset distance button
                this.settingsService.resetDistanceTraveled();
            } else if (mouseY >= 470 && mouseY <= 510) { // Clear history button
                this.settingsService.clearDiscoveryHistory();
            }
        }
    }

    private handleExportClick(): void {
        try {
            const saveData = this.settingsService.exportSaveData();
            
            // Create and trigger download
            if (typeof URL !== 'undefined' && typeof document !== 'undefined') {
                const blob = new Blob([saveData], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = url;
                link.download = `astral-surveyor-save-${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.warn('Failed to export save data:', error);
        }
    }

    private handleMouseDrag(mouseX: number, mouseY: number): void {
        if (this.currentTab === 'audio') {
            this.handleSliderDrag(mouseX, mouseY, this.ambientSlider, (value) => {
                this.settingsService.setAmbientVolume(Math.round(value));
            });
            this.handleSliderDrag(mouseX, mouseY, this.discoverySlider, (value) => {
                this.settingsService.setDiscoveryVolume(Math.round(value));
            });
            this.handleSliderDrag(mouseX, mouseY, this.masterSlider, (value) => {
                this.settingsService.setMasterVolume(Math.round(value));
            });
        } else if (this.currentTab === 'display') {
            this.handleSliderDrag(mouseX, mouseY, this.uiScaleSlider, (value) => {
                const scale = 0.5 + (value / 100) * 1.5; // Convert 0-100 to 0.5-2.0
                this.settingsService.setUIScale(scale);
            });
        }
    }

    private handleSliderDrag(mouseX: number, mouseY: number, slider: SliderState, callback: (value: number) => void): void {
        // Check if mouse is over slider area
        if (mouseX >= slider.x && mouseX <= slider.x + slider.width && 
            mouseY >= slider.y && mouseY <= slider.y + slider.height) {
            
            const percentage = Math.max(0, Math.min(100, ((mouseX - slider.x) / slider.width) * 100));
            callback(percentage);
            slider.dragging = true;
        }
    }


    // Cleanup
    dispose(): void {
        if (this.disposed) {
            return;
        }
        
        if (this.settingsChangeHandler) {
            this.settingsService.removeEventListener('settingsChanged', this.settingsChangeHandler);
        }
        
        this.errorBoundary.dispose();
        this.disposed = true;
    }
}