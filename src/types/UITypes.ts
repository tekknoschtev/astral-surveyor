// User interface component types
// Provides strong typing for UI components and interactions

import type { AnyCelestialData, DiscoveryEvent } from './CelestialTypes.js';

// Base UI component interface
export interface UIComponent {
    isVisible: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
    render(ctx: CanvasRenderingContext2D): void;
    update(deltaTime: number): void;
}

// Stellar map specific types
export interface StellarMapState {
    isVisible: boolean;
    zoom: number;
    centerX: number;
    centerY: number;
    selectedObject?: AnyCelestialData;
    hoveredObject?: AnyCelestialData;
    showGrid: boolean;
    showCoordinates: boolean;
}

export interface StellarMapConfig {
    minZoom: number;
    maxZoom: number;
    gridSpacing: number;
    iconSize: number;
    selectionRadius: number;
    panSensitivity: number;
    zoomSensitivity: number;
}

// Discovery logbook types
export interface LogbookState {
    isVisible: boolean;
    currentPage: number;
    entriesPerPage: number;
    sortOrder: 'chronological' | 'alphabetical' | 'type';
    filterType: 'all' | 'stars' | 'planets' | 'moons' | 'nebulae' | 'wormholes' | 'blackholes' | 'asteroids';
    searchQuery: string;
    selectedEntry?: DiscoveryEvent;
}

export interface LogbookEntry {
    discovery: DiscoveryEvent;
    displayName: string;
    coordinates: string;
    timestamp: string;
    isNotable: boolean;
    category: string;
}

// Touch UI types
export interface TouchUIState {
    isVisible: boolean;
    buttonsVisible: boolean;
    gestureMode: 'navigation' | 'ui' | 'disabled';
    activeButton?: TouchButton;
}

export interface TouchButton {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    icon?: string;
    isPressed: boolean;
    isEnabled: boolean;
    action: () => void;
}

// Discovery display types
export interface DiscoveryDisplay {
    isVisible: boolean;
    currentDiscovery?: DiscoveryEvent;
    displayTime: number;
    maxDisplayTime: number;
    animationPhase: 'fadeIn' | 'display' | 'fadeOut';
    queuedDiscoveries: DiscoveryEvent[];
}

export interface DiscoveryAnimation {
    startTime: number;
    duration: number;
    easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
    properties: {
        opacity?: { from: number; to: number };
        scale?: { from: number; to: number };
        position?: { 
            from: { x: number; y: number }; 
            to: { x: number; y: number };
        };
    };
}

// UI interaction types
export interface UIInteraction {
    type: 'click' | 'hover' | 'drag' | 'pinch' | 'scroll';
    target: string;
    position: { x: number; y: number };
    startPosition?: { x: number; y: number };
    deltaPosition?: { x: number; y: number };
    button?: number;
    modifiers?: {
        shift: boolean;
        ctrl: boolean;
        alt: boolean;
    };
}

export interface UIEventHandler {
    (interaction: UIInteraction): boolean; // Return true if handled
}

// Theme and styling types
export interface UITheme {
    colors: {
        primary: string;
        secondary: string;
        background: string;
        text: string;
        accent: string;
        warning: string;
        error: string;
        success: string;
    };
    fonts: {
        primary: string;
        secondary: string;
        monospace: string;
    };
    sizes: {
        small: number;
        medium: number;
        large: number;
        extraLarge: number;
    };
    spacing: {
        small: number;
        medium: number;
        large: number;
    };
    borderRadius: number;
    opacity: {
        low: number;
        medium: number;
        high: number;
    };
}

// Layout types
export interface LayoutConstraints {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    aspectRatio?: number;
    margin?: {
        top?: number;
        right?: number;
        bottom?: number;
        left?: number;
    };
    padding?: {
        top?: number;
        right?: number;
        bottom?: number;
        left?: number;
    };
}

export interface ResponsiveLayout {
    breakpoints: {
        mobile: number;
        tablet: number;
        desktop: number;
    };
    layouts: {
        mobile: LayoutConstraints;
        tablet: LayoutConstraints;
        desktop: LayoutConstraints;
    };
}

// Panel and modal types
export interface Panel extends UIComponent {
    title: string;
    isDraggable: boolean;
    isResizable: boolean;
    isClosable: boolean;
    zIndex: number;
    content: UIComponent[];
}

export interface Modal extends Panel {
    isModal: true;
    backdrop: boolean;
    closeOnBackdropClick: boolean;
    closeOnEscape: boolean;
}

// Form and input types
export interface InputField {
    id: string;
    type: 'text' | 'number' | 'checkbox' | 'radio' | 'select' | 'slider';
    label: string;
    value: any;
    placeholder?: string;
    isRequired: boolean;
    isDisabled: boolean;
    validation?: (value: any) => boolean | string;
    onChange: (value: any) => void;
}

export interface FormData {
    fields: InputField[];
    isValid: boolean;
    errors: Map<string, string>;
    onSubmit: (data: Record<string, any>) => void;
    onCancel?: () => void;
}

// Animation and transition types
export interface UITransition {
    property: string;
    duration: number;
    easing: string;
    delay?: number;
}

export interface UIAnimation {
    keyframes: Array<{
        time: number; // 0-1
        values: Record<string, any>;
    }>;
    duration: number;
    loop?: boolean;
    direction?: 'normal' | 'reverse' | 'alternate';
}

// Accessibility types
export interface AccessibilityConfig {
    enableScreenReader: boolean;
    enableKeyboardNavigation: boolean;
    highContrast: boolean;
    reducedMotion: boolean;
    fontSize: 'small' | 'medium' | 'large' | 'extraLarge';
}