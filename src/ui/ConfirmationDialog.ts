// ConfirmationDialog - In-game modal dialog for confirmations
// Replaces browser alerts with immersive game UI

import type { Input } from '../input/input.js';

export interface ConfirmationOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
}

export class ConfirmationDialog {
    private visible: boolean = false;
    private currentOptions?: ConfirmationOptions;
    private confirmButtonHovered: boolean = false;
    private cancelButtonHovered: boolean = false;

    constructor() {}

    /**
     * Show confirmation dialog
     */
    show(options: ConfirmationOptions): void {
        this.currentOptions = options;
        this.visible = true;
        this.confirmButtonHovered = false;
        this.cancelButtonHovered = false;
    }

    /**
     * Hide dialog
     */
    hide(): void {
        this.visible = false;
        this.currentOptions = undefined;
    }

    /**
     * Check if dialog is visible
     */
    isVisible(): boolean {
        return this.visible;
    }

    /**
     * Handle user input
     */
    handleInput(input: Input): boolean {
        if (!this.visible || !this.currentOptions) return false;

        const mouseX = input.getMouseX();
        const mouseY = input.getMouseY();

        // Calculate dialog dimensions
        const dialogWidth = 400;
        const dialogHeight = 200;
        const canvasWidth = window.innerWidth;
        const canvasHeight = window.innerHeight;
        const dialogX = (canvasWidth - dialogWidth) / 2;
        const dialogY = (canvasHeight - dialogHeight) / 2;

        // Button dimensions (match render method)
        const buttonWidth = 120;
        const buttonHeight = 40;
        const padding = 20;
        const buttonSpacing = 10;
        const buttonY = dialogY + dialogHeight - buttonHeight - padding;
        const confirmButtonX = dialogX + dialogWidth - (2 * buttonWidth) - buttonSpacing - padding;
        const cancelButtonX = dialogX + dialogWidth - buttonWidth - padding;

        // Update hover states
        this.confirmButtonHovered = this.isPointInButton(mouseX, mouseY, confirmButtonX, buttonY, buttonWidth, buttonHeight);
        this.cancelButtonHovered = this.isPointInButton(mouseX, mouseY, cancelButtonX, buttonY, buttonWidth, buttonHeight);

        // Handle clicks
        if (input.wasClicked()) {
            if (this.confirmButtonHovered) {
                this.currentOptions.onConfirm();
                this.hide();
                return true; // Consume input
            } else if (this.cancelButtonHovered) {
                if (this.currentOptions.onCancel) {
                    this.currentOptions.onCancel();
                }
                this.hide();
                return true; // Consume input
            } else if (this.isPointInDialog(mouseX, mouseY, dialogX, dialogY, dialogWidth, dialogHeight)) {
                return true; // Consume input but don't close
            } else {
                // Click outside dialog - treat as cancel
                if (this.currentOptions.onCancel) {
                    this.currentOptions.onCancel();
                }
                this.hide();
                return true;
            }
        }

        // Handle escape key
        if (input.wasJustPressed('Escape')) {
            if (this.currentOptions.onCancel) {
                this.currentOptions.onCancel();
            }
            this.hide();
            return true;
        }

        return this.visible; // Consume all input when visible
    }

    /**
     * Render the confirmation dialog
     */
    render(ctx: CanvasRenderingContext2D, canvas: { width: number; height: number }): void {
        if (!this.visible || !this.currentOptions) return;

        // Save context state
        ctx.save();

        const dialogWidth = 400;
        const dialogHeight = 200;
        const padding = 20;
        const dialogX = (canvas.width - dialogWidth) / 2;
        const dialogY = (canvas.height - dialogHeight) / 2;

        // Render backdrop
        ctx.fillStyle = 'rgba(0, 5, 17, 0.8)'; // Semi-transparent dark blue
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Render dialog panel
        ctx.fillStyle = '#000511'; // Match game background
        ctx.fillRect(dialogX, dialogY, dialogWidth, dialogHeight);

        // Dialog border
        ctx.strokeStyle = '#2a3a4a'; // Match settings menu border
        ctx.lineWidth = 2;
        ctx.strokeRect(dialogX, dialogY, dialogWidth, dialogHeight);

        // Title with consistent padding
        ctx.fillStyle = '#d4a574'; // Amber header color
        ctx.font = '16px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.currentOptions.title, dialogX + dialogWidth / 2, dialogY + padding + 20);

        // Message with consistent padding
        ctx.fillStyle = '#b0c4d4'; // Soft blue-gray text
        ctx.font = '14px "Courier New", monospace';
        ctx.textAlign = 'center';
        
        // Word wrap message with proper padding
        const maxWidth = dialogWidth - (2 * padding);
        const lines = this.wrapText(ctx, this.currentOptions.message, maxWidth);
        const lineHeight = 20;
        const startY = dialogY + padding + 60;
        
        lines.forEach((line, index) => {
            ctx.fillText(line, dialogX + dialogWidth / 2, startY + index * lineHeight);
        });

        // Buttons with consistent padding
        const buttonWidth = 120;
        const buttonHeight = 40;
        const buttonSpacing = 10;
        const buttonY = dialogY + dialogHeight - buttonHeight - padding;
        
        // Confirm button (left button)
        const confirmButtonX = dialogX + dialogWidth - (2 * buttonWidth) - buttonSpacing - padding;
        const confirmText = this.currentOptions.confirmText || 'Confirm';
        this.renderButton(
            ctx, 
            confirmButtonX, 
            buttonY, 
            buttonWidth, 
            buttonHeight, 
            confirmText,
            this.confirmButtonHovered ? '#3a5a3a' : '#2a4a2a'
        );

        // Cancel button (right button)
        const cancelButtonX = dialogX + dialogWidth - buttonWidth - padding;
        const cancelText = this.currentOptions.cancelText || 'Cancel';
        this.renderButton(
            ctx, 
            cancelButtonX, 
            buttonY, 
            buttonWidth, 
            buttonHeight, 
            cancelText,
            this.cancelButtonHovered ? '#5a3a3a' : '#4a2a2a'
        );

        // Restore context state
        ctx.restore();
    }

    private renderButton(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, text: string, color: string): void {
        // Button background
        ctx.fillStyle = color;
        ctx.fillRect(x, y, width, height);

        // Button border
        ctx.strokeStyle = '#2a3a4a';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);

        // Button text
        ctx.fillStyle = '#b0c4d4';
        ctx.font = '12px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + width / 2, y + height / 2);
    }

    private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
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

    private isPointInButton(x: number, y: number, buttonX: number, buttonY: number, buttonWidth: number, buttonHeight: number): boolean {
        return x >= buttonX && x <= buttonX + buttonWidth && y >= buttonY && y <= buttonY + buttonHeight;
    }

    private isPointInDialog(x: number, y: number, dialogX: number, dialogY: number, dialogWidth: number, dialogHeight: number): boolean {
        return x >= dialogX && x <= dialogX + dialogWidth && y >= dialogY && y <= dialogY + dialogHeight;
    }
}