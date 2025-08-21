// Developer Console - Text-based debug interface for spawning and testing
// Replaces query parameter debug system with extensible command interface

import { CommandRegistry, CommandContext } from './CommandRegistry.js';

interface ConsoleMessage {
    text: string;
    timestamp: number;
    type: 'command' | 'output' | 'error';
}

export class DeveloperConsole {
    private isVisible: boolean = false;
    private inputText: string = '';
    private commandHistory: string[] = [];
    private historyIndex: number = -1;
    private suggestions: string[] = [];
    private messages: ConsoleMessage[] = [];
    private maxMessages: number = 50;
    private suggestionIndex: number = -1;
    
    constructor(
        private commandRegistry: CommandRegistry,
        private camera: any, // TODO: Import Camera type when available
        private chunkManager: any // TODO: Import ChunkManager type when available
    ) {
        // Capture console.log for output display
        this.interceptConsoleOutput();
    }
    
    toggle(): void {
        this.isVisible = !this.isVisible;
        if (this.isVisible) {
            this.addMessage('Developer Console activated. Type "help" for commands.', 'output');
        }
    }
    
    isActive(): boolean {
        return this.isVisible;
    }
    
    handleKeyInput(event: KeyboardEvent): boolean {
        if (!this.isVisible) {
            return false;
        }
        
        // Prevent default browser behavior for console keys
        event.preventDefault();
        
        switch (event.code) {
            case 'Enter':
                this.executeCommand();
                return true;
                
            case 'Escape':
                this.toggle();
                return true;
                
            case 'ArrowUp':
                this.navigateHistory(-1);
                return true;
                
            case 'ArrowDown':
                this.navigateHistory(1);
                return true;
                
            case 'Tab':
                this.applyAutocompletion();
                return true;
                
            case 'Backspace':
                if (this.inputText.length > 0) {
                    this.inputText = this.inputText.slice(0, -1);
                    this.updateSuggestions();
                }
                return true;
                
            default:
                // Handle text input
                if (event.key.length === 1) {
                    this.inputText += event.key;
                    this.updateSuggestions();
                }
                return true;
        }
    }
    
    private executeCommand(): void {
        const command = this.inputText.trim();
        if (!command) {
            return;
        }
        
        // Add to history
        this.commandHistory.unshift(command);
        if (this.commandHistory.length > 20) {
            this.commandHistory.pop();
        }
        this.historyIndex = -1;
        
        // Add command to message log
        this.addMessage(`> ${command}`, 'command');
        
        // Execute command
        const context: CommandContext = {
            camera: this.camera,
            chunkManager: this.chunkManager
        };
        
        const result = this.commandRegistry.execute(command, context);
        if (result) {
            this.addMessage(result, result.startsWith('❌') ? 'error' : 'output');
        }
        
        // Clear input
        this.inputText = '';
        this.suggestions = [];
        this.suggestionIndex = -1;
    }
    
    private navigateHistory(direction: number): void {
        if (this.commandHistory.length === 0) {
            return;
        }
        
        const newIndex = this.historyIndex + direction;
        if (newIndex >= -1 && newIndex < this.commandHistory.length) {
            this.historyIndex = newIndex;
            
            if (this.historyIndex === -1) {
                this.inputText = '';
            } else {
                this.inputText = this.commandHistory[this.historyIndex];
            }
            
            this.updateSuggestions();
        }
    }
    
    private updateSuggestions(): void {
        this.suggestions = this.commandRegistry.getAutocompleteSuggestions(this.inputText);
        this.suggestionIndex = -1;
    }
    
    private applyAutocompletion(): void {
        if (this.suggestions.length === 0) {
            return;
        }
        
        // Cycle through suggestions
        this.suggestionIndex = (this.suggestionIndex + 1) % this.suggestions.length;
        const suggestion = this.suggestions[this.suggestionIndex];
        
        // Apply suggestion based on current input
        const words = this.inputText.split(' ');
        if (words.length === 1) {
            // Completing command name
            this.inputText = suggestion + ' ';
        } else {
            // Completing parameters
            words[words.length - 1] = suggestion;
            this.inputText = words.join(' ') + ' ';
        }
        
        this.updateSuggestions();
    }
    
    private addMessage(text: string, type: 'command' | 'output' | 'error'): void {
        this.messages.push({
            text,
            timestamp: Date.now(),
            type
        });
        
        // Limit message history
        if (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }
    }
    
    private interceptConsoleOutput(): void {
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        
        console.log = (...args: any[]) => {
            if (this.isVisible) {
                const message = args.map(arg => 
                    typeof arg === 'string' ? arg : JSON.stringify(arg)
                ).join(' ');
                this.addMessage(message, 'output');
            }
            originalLog.apply(console, args);
        };
        
        console.error = (...args: any[]) => {
            if (this.isVisible) {
                const message = args.map(arg => 
                    typeof arg === 'string' ? arg : JSON.stringify(arg)
                ).join(' ');
                this.addMessage(message, 'error');
            }
            originalError.apply(console, args);
        };
        
        console.warn = (...args: any[]) => {
            if (this.isVisible) {
                const message = args.map(arg => 
                    typeof arg === 'string' ? arg : JSON.stringify(arg)
                ).join(' ');
                this.addMessage(message, 'error');
            }
            originalWarn.apply(console, args);
        };
    }
    
    render(renderer: any): void {
        if (!this.isVisible) {
            return;
        }
        
        const ctx = renderer.ctx;
        const canvas = renderer.canvas;
        
        // Console dimensions
        const consoleHeight = Math.min(canvas.height * 0.4, 400);
        const consoleY = canvas.height - consoleHeight;
        const padding = 10;
        const lineHeight = 16;
        const inputHeight = 24;
        
        // Semi-transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, consoleY, canvas.width, consoleHeight);
        
        // Border
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, consoleY, canvas.width, consoleHeight);
        
        // Message area
        const messageAreaHeight = consoleHeight - inputHeight - (padding * 3);
        const messageY = consoleY + padding;
        
        ctx.font = '12px Consolas, Monaco, monospace';
        ctx.textAlign = 'left';
        
        // Render messages (newest at bottom)
        const visibleMessages = this.getVisibleMessages(messageAreaHeight, lineHeight);
        let currentY = messageY + messageAreaHeight - (visibleMessages.length * lineHeight);
        
        for (const message of visibleMessages) {
            switch (message.type) {
                case 'command':
                    ctx.fillStyle = '#e8f4fd'; // Bright blue-white for commands (matches stellar map)
                    break;
                case 'output':
                    ctx.fillStyle = '#b0c4d4'; // Soft blue-white for output (matches main UI)
                    break;
                case 'error':
                    ctx.fillStyle = '#ff6b6b'; // Softer red for errors (less jarring)
                    break;
            }
            
            ctx.fillText(message.text, padding, currentY);
            currentY += lineHeight;
        }
        
        // Input area separator
        const inputY = consoleY + consoleHeight - inputHeight - padding;
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.3)';
        ctx.beginPath();
        ctx.moveTo(0, inputY - padding);
        ctx.lineTo(canvas.width, inputY - padding);
        ctx.stroke();
        
        // Input prompt and text
        ctx.fillStyle = '#e8f4fd'; // Bright blue-white for prompt (matches commands)
        ctx.font = '14px Consolas, Monaco, monospace';
        const promptText = '> ';
        const promptWidth = ctx.measureText(promptText).width;
        ctx.fillText(promptText, padding, inputY + 14);
        
        // Input text
        ctx.fillStyle = '#b0c4d4'; // Soft blue-white for input text (matches main UI)
        ctx.fillText(this.inputText, padding + promptWidth, inputY + 14);
        
        // Cursor
        const cursorX = padding + promptWidth + ctx.measureText(this.inputText).width;
        if (Math.floor(Date.now() / 500) % 2) { // Blinking cursor
            ctx.fillStyle = '#e8f4fd'; // Bright blue-white for cursor
            ctx.fillRect(cursorX, inputY + 2, 1, 12);
        }
        
        // Auto-completion suggestions
        if (this.suggestions.length > 0) {
            this.renderSuggestions(ctx, canvas, cursorX, inputY);
        }
    }
    
    private getVisibleMessages(areaHeight: number, lineHeight: number): ConsoleMessage[] {
        const maxLines = Math.floor(areaHeight / lineHeight);
        return this.messages.slice(-maxLines);
    }
    
    private renderSuggestions(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, x: number, y: number): void {
        if (this.suggestions.length === 0) {
            return;
        }
        
        const suggestionHeight = 20;
        const suggestionWidth = 200;
        const maxSuggestions = Math.min(5, this.suggestions.length);
        
        // Position suggestions above input
        const suggestionsY = y - (maxSuggestions * suggestionHeight) - 5;
        
        // Background
        ctx.fillStyle = 'rgba(40, 40, 40, 0.95)';
        ctx.fillRect(x, suggestionsY, suggestionWidth, maxSuggestions * suggestionHeight);
        
        // Border
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.5)';
        ctx.strokeRect(x, suggestionsY, suggestionWidth, maxSuggestions * suggestionHeight);
        
        // Render suggestions
        ctx.font = '12px Consolas, Monaco, monospace';
        for (let i = 0; i < maxSuggestions; i++) {
            const suggestion = this.suggestions[i];
            const itemY = suggestionsY + (i * suggestionHeight);
            
            // Highlight selected suggestion
            if (i === this.suggestionIndex) {
                ctx.fillStyle = 'rgba(100, 150, 255, 0.3)';
                ctx.fillRect(x, itemY, suggestionWidth, suggestionHeight);
            }
            
            // Suggestion text
            ctx.fillStyle = i === this.suggestionIndex ? '#e8f4fd' : '#b0c4d4'; // Match game UI colors
            ctx.fillText(suggestion, x + 5, itemY + 14);
        }
    }
}