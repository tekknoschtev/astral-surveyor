// Touch UI System for Mobile Device Support
// TypeScript conversion with comprehensive type definitions

// Import dependencies
import type { Renderer } from '../graphics/renderer.js';

// Interface definitions
interface TouchButton {
    id: string;
    x: number;
    y: number;
    size: number;
    icon: string;
    visible: boolean;
    alpha: number;
    targetAlpha: number;
    action: string;
}

interface StellarMapLike {
    isVisible(): boolean;
    isFollowingPlayer(): boolean;
}

interface DiscoveryLogbookLike {
    isVisible(): boolean;
}

export class TouchUI {
    isTouchDevice: boolean;
    buttons: TouchButton[];
    fadeState: Record<string, any>;
    
    // Visual settings matching game aesthetic
    buttonColor: string;
    buttonBackground: string;
    buttonRadius: number;
    fadeSpeed: number;

    constructor() {
        this.isTouchDevice = this.detectTouchDevice();
        this.buttons = [];
        this.fadeState = {}; // Track fade animations for buttons
        
        // Visual settings matching game aesthetic
        this.buttonColor = '#b0c4d4';
        this.buttonBackground = '#000000C0'; // Semi-transparent black
        this.buttonRadius = 25; // 50px touch target diameter
        this.fadeSpeed = 5; // Fade animation speed
        
        this.setupButtons();
    }

    detectTouchDevice(): boolean {
        // More specific touch device detection - check for mobile user agent patterns
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const hasTouchPoints = navigator.maxTouchPoints > 0 || (navigator as any).msMaxTouchPoints > 0;
        return isMobile || (hasTouchPoints && window.screen.width < 1024);
    }

    setupButtons(): void {
        // Show map button on all devices as requested
        
        // Map toggle button (bottom-right corner)
        this.buttons.push({
            id: 'mapToggle',
            x: 0, // Will be calculated in render based on canvas size
            y: 0,
            size: this.buttonRadius,
            icon: 'map',
            visible: true, // Will be controlled by map visibility
            alpha: 0,
            targetAlpha: 1,
            action: 'toggleMap'
        });

        // Logbook toggle button (positioned left of map button)
        this.buttons.push({
            id: 'logbookToggle',
            x: 0, // Will be calculated in render based on canvas size
            y: 0,
            size: this.buttonRadius,
            icon: 'logbook',
            visible: true,
            alpha: 0,
            targetAlpha: 1,
            action: 'toggleLogbook'
        });
        
        // Follow ship button (shown when map is open and not following)
        this.buttons.push({
            id: 'followShip',
            x: 0, // Will be calculated in render based on canvas size
            y: 0,
            size: this.buttonRadius - 5, // Slightly smaller
            icon: 'target',
            visible: false,
            alpha: 0,
            targetAlpha: 0.9,
            action: 'followShip'
        });
    }

    update(deltaTime: number, canvas: HTMLCanvasElement, stellarMap: StellarMapLike, discoveryLogbook: DiscoveryLogbookLike): void {
        // Always update button positions and visibility for follow ship button
        this.updateButtonPositions(canvas);
        this.updateButtonVisibility(stellarMap, discoveryLogbook);
        this.updateFadeAnimations(deltaTime);
        
        // Touch device specific updates
        if (!this.isTouchDevice) return;
    }

    updateButtonPositions(canvas: HTMLCanvasElement): void {
        const margin = 20;
        const bottomMargin = 40; // Extra margin from bottom for comfort
        const buttonSpacing = 60; // Space between buttons
        
        for (const button of this.buttons) {
            if (button.id === 'mapToggle') {
                button.x = canvas.width - button.size - margin;
                button.y = canvas.height - button.size - bottomMargin;
            } else if (button.id === 'logbookToggle') {
                button.x = canvas.width - button.size - margin - buttonSpacing;
                button.y = canvas.height - button.size - bottomMargin;
            } else if (button.id === 'followShip') {
                // Position in bottom right above zoom level indicator
                button.x = canvas.width - button.size - margin;
                button.y = canvas.height - 120; // Above zoom info area (zoom info is at canvas.height - 65)
            }
        }
    }

    updateButtonVisibility(stellarMap: StellarMapLike, discoveryLogbook: DiscoveryLogbookLike): void {
        for (const button of this.buttons) {
            if (button.id === 'mapToggle') {
                // Show map button only when map is closed
                button.visible = !stellarMap.isVisible();
                button.targetAlpha = button.visible ? 1 : 0;
            } else if (button.id === 'logbookToggle') {
                // Hide logbook button when map is open to prevent text overlap
                button.visible = !stellarMap.isVisible();
                button.targetAlpha = button.visible ? 1 : 0;
            } else if (button.id === 'followShip') {
                // Show follow ship button only when map is open and not following player
                button.visible = stellarMap.isVisible() && !stellarMap.isFollowingPlayer();
                button.targetAlpha = button.visible ? 0.9 : 0;
            } else if (button.id === 'mapClose' || button.id === 'zoomIn' || button.id === 'zoomOut') {
                // Hide map control buttons when map is closed
                button.visible = stellarMap.isVisible();
                button.targetAlpha = button.visible ? (button.id === 'mapClose' ? 1 : 0.8) : 0;
            }
        }
    }

    updateFadeAnimations(deltaTime: number): void {
        for (const button of this.buttons) {
            // Smooth fade animation
            const fadeSpeed = this.fadeSpeed * deltaTime;
            if (button.alpha < button.targetAlpha) {
                button.alpha = Math.min(button.alpha + fadeSpeed, button.targetAlpha);
            } else if (button.alpha > button.targetAlpha) {
                button.alpha = Math.max(button.alpha - fadeSpeed, button.targetAlpha);
            }
        }
    }

    handleTouch(touchX: number, touchY: number): string | null {
        // Check if touch hits any visible button
        for (const button of this.buttons) {
            if (button.alpha > 0.1) { // Only check visible buttons
                // Check follow ship button and zoom buttons on all devices, other buttons only on touch devices
                if (button.id === 'followShip' || button.id === 'zoomIn' || button.id === 'zoomOut' || this.isTouchDevice) {
                    const distance = Math.sqrt(
                        Math.pow(touchX - button.x, 2) + 
                        Math.pow(touchY - button.y, 2)
                    );
                    
                    if (distance <= button.size) {
                        return button.action;
                    }
                }
            }
        }
        
        return null;
    }

    render(renderer: Renderer): void {
        const { ctx } = renderer;
        
        // Save context state
        ctx.save();
        
        // Render follow ship button and zoom buttons on all devices, other buttons only on touch devices
        for (const button of this.buttons) {
            if (button.alpha > 0.01) { // Only render visible buttons
                if (button.id === 'followShip' || button.id === 'zoomIn' || button.id === 'zoomOut' || this.isTouchDevice) {
                    this.renderButton(ctx, button);
                }
            }
        }
        
        // Restore context state
        ctx.restore();
    }
    
    // Render mobile braking feedback overlay
    renderBrakeFeedback(renderer: Renderer, input: { getTouchBrake(width: number, height: number): { mode: 'stop' | 'directional', x: number, y: number, intensity: number } | null }): void {
        if (!this.isTouchDevice) return;
        
        const brake = input.getTouchBrake(renderer.canvas.width, renderer.canvas.height);
        if (!brake) return;
        
        const { ctx, canvas } = renderer;
        
        // Save context state
        ctx.save();
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        if (brake.mode === 'stop') {
            // Show stop brake indicator
            ctx.fillStyle = '#ff4444dd'; // Red with transparency
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Draw background circle
            ctx.beginPath();
            ctx.arc(centerX, centerY - 100, 50, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw "BRAKE" text
            ctx.fillStyle = '#ffffff';
            ctx.fillText('BRAKE', centerX, centerY - 100);
            
        } else if (brake.mode === 'directional') {
            // Show directional brake indicator
            const alpha = Math.floor(brake.intensity * 150 + 50); // 50-200 alpha range
            ctx.fillStyle = `rgba(255, 165, 0, ${alpha / 255})`; // Orange with variable transparency
            
            // Draw direction arrow
            const arrowLength = 60 * brake.intensity;
            const endX = centerX + brake.x * arrowLength;
            const endY = centerY + brake.y * arrowLength;
            
            // Arrow shaft
            ctx.strokeStyle = `rgba(255, 165, 0, ${alpha / 255})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            // Arrow head
            const headLength = 15;
            const angle = Math.atan2(brake.y, brake.x);
            
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(
                endX - headLength * Math.cos(angle - Math.PI / 6),
                endY - headLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(endX, endY);
            ctx.lineTo(
                endX - headLength * Math.cos(angle + Math.PI / 6),
                endY - headLength * Math.sin(angle + Math.PI / 6)
            );
            ctx.stroke();
            
            // Intensity indicator
            ctx.fillStyle = `rgba(255, 165, 0, ${alpha / 255})`;
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`BRAKE ${Math.round(brake.intensity * 100)}%`, centerX, centerY + 80);
        }
        
        // Restore context state
        ctx.restore();
    }

    renderButton(ctx: CanvasRenderingContext2D, button: TouchButton): void {
        // Apply alpha for fade effect
        ctx.globalAlpha = button.alpha;
        
        // Draw button background
        ctx.fillStyle = this.buttonBackground;
        ctx.beginPath();
        ctx.arc(button.x, button.y, button.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw button border
        ctx.strokeStyle = this.buttonColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(button.x, button.y, button.size - 1, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw button icon
        ctx.fillStyle = this.buttonColor;
        ctx.font = '14px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let iconText = '';
        switch (button.icon) {
            case 'map':
                iconText = '⊞'; // Grid/map symbol
                break;
            case 'logbook':
                iconText = '📋'; // Logbook/clipboard symbol
                break;
            case 'target':
                iconText = '⊙'; // Target/follow symbol
                break;
            case 'close':
                iconText = '×'; // Close symbol
                break;
            case 'plus':
                iconText = '+';
                break;
            case 'minus':
                iconText = '−';
                break;
        }
        
        ctx.fillText(iconText, button.x, button.y);
        
        // Reset text alignment
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.globalAlpha = 1;
    }

    // Add map control buttons when map is open
    showMapControls(canvas: HTMLCanvasElement): void {
        // Show map controls on all devices now
        
        // Add close button if not already present
        const hasCloseButton = this.buttons.some(b => b.id === 'mapClose');
        if (!hasCloseButton) {
            const margin = 20;
            this.buttons.push({
                id: 'mapClose',
                x: canvas.width - 30 - margin,
                y: 30 + margin,
                size: 15,
                icon: 'close',
                visible: true,
                alpha: 0,
                targetAlpha: 1,
                action: 'closeMap'
            });
        }
        
        // Add zoom buttons if not present
        const hasZoomButtons = this.buttons.some(b => b.id === 'zoomIn');
        if (!hasZoomButtons) {
            const margin = 20;
            const buttonSize = 20;
            
            // Position zoom buttons on right side above zoom/center data for all devices
            // Zoom in button - positioned above zoom out button
            this.buttons.push({
                id: 'zoomIn',
                x: canvas.width - margin - buttonSize, // Right side alignment
                y: canvas.height - 140, // Above zoom data (zoom data is at canvas.height - 65)
                size: buttonSize,
                icon: 'plus',
                visible: true,
                alpha: 0,
                targetAlpha: 0.8, // Slightly transparent
                action: 'zoomIn'
            });
            
            // Zoom out button - positioned below zoom in, above zoom data
            this.buttons.push({
                id: 'zoomOut',
                x: canvas.width - margin - buttonSize, // Right side alignment
                y: canvas.height - 90, // Between zoom in button and zoom data
                size: buttonSize,
                icon: 'minus',
                visible: true,
                alpha: 0,
                targetAlpha: 0.8,
                action: 'zoomOut'
            });
        }
    }

    // Remove map control buttons when map is closed
    hideMapControls(): void {
        // Hide map controls on all devices
        
        // Set all map control buttons to fade out
        for (const button of this.buttons) {
            if (button.id === 'mapClose' || button.id === 'zoomIn' || button.id === 'zoomOut') {
                button.targetAlpha = 0;
                button.visible = false;
            }
        }
        
        // Remove buttons that have completely faded out after a delay
        setTimeout(() => {
            this.buttons = this.buttons.filter(b => 
                b.id === 'mapToggle' || b.alpha > 0.01
            );
        }, 200); // Allow time for fade animation
    }
}

// Export for use in other modules (maintain global compatibility)
declare global {
    interface Window {
        TouchUI: typeof TouchUI;
    }
}

if (typeof window !== 'undefined') {
    window.TouchUI = TouchUI;
}