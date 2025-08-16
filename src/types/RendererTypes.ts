// Rendering system interfaces and types
// Provides strong typing for graphics rendering and visual effects

// Core renderer interface
export interface Renderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    
    // Basic drawing methods
    drawCircle(x: number, y: number, radius: number, color: string): void;
    drawRectangle(x: number, y: number, width: number, height: number, color: string): void;
    drawLine(x1: number, y1: number, x2: number, y2: number, color: string, lineWidth?: number): void;
    drawText(text: string, x: number, y: number, color: string, font?: string): void;
    
    // Advanced drawing methods
    drawGradientCircle(x: number, y: number, radius: number, gradient: CanvasGradient): void;
    drawImage(image: HTMLImageElement, x: number, y: number, width?: number, height?: number): void;
    
    // Utility methods
    clear(): void;
    save(): void;
    restore(): void;
    setTransform(transform: Transform2D): void;
    worldToScreen(worldX: number, worldY: number): ScreenCoordinates;
    screenToWorld(screenX: number, screenY: number): WorldCoordinates;
}

// Coordinate system types
export interface WorldCoordinates {
    x: number;
    y: number;
}

export interface ScreenCoordinates {
    x: number;
    y: number;
}

export interface Transform2D {
    translateX: number;
    translateY: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
    originX: number;
    originY: number;
}

// Camera interface for rendering
export interface Camera {
    x: number;
    y: number;
    zoom: number;
    rotation: number;
    
    // Camera methods
    worldToScreen(worldX: number, worldY: number, canvasWidth: number, canvasHeight: number): [number, number];
    screenToWorld(screenX: number, screenY: number, canvasWidth: number, canvasHeight: number): [number, number];
    isVisible(worldX: number, worldY: number, radius: number, canvasWidth: number, canvasHeight: number): boolean;
    update(deltaTime: number): void;
}

// Color and visual effect types
export interface Color {
    r: number; // 0-255
    g: number; // 0-255
    b: number; // 0-255
    a?: number; // 0-1
}

export interface HSLColor {
    h: number; // 0-360
    s: number; // 0-100
    l: number; // 0-100
    a?: number; // 0-1
}

export interface GradientStop {
    offset: number; // 0-1
    color: string;
}

export interface LinearGradient {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    stops: GradientStop[];
}

export interface RadialGradient {
    x1: number;
    y1: number;
    r1: number;
    x2: number;
    y2: number;
    r2: number;
    stops: GradientStop[];
}

// Particle system types
export interface Particle {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    accelerationX: number;
    accelerationY: number;
    life: number;
    maxLife: number;
    size: number;
    startSize: number;
    endSize: number;
    color: Color;
    startColor: Color;
    endColor: Color;
    opacity: number;
    rotation: number;
    rotationSpeed: number;
}

export interface ParticleSystem {
    particles: Particle[];
    maxParticles: number;
    emissionRate: number;
    emissionPosition: WorldCoordinates;
    emissionRadius: number;
    gravity: { x: number; y: number };
    wind: { x: number; y: number };
    
    update(deltaTime: number): void;
    render(renderer: Renderer, camera: Camera): void;
    emit(count: number): void;
    clear(): void;
}

// Visual effects configuration
export interface VisualEffectConfig {
    enabled: boolean;
    intensity: number; // 0-1
    duration?: number;
    startTime?: number;
    loop?: boolean;
}

export interface GlowEffect extends VisualEffectConfig {
    color: string;
    radius: number;
    blur: number;
}

export interface PulseEffect extends VisualEffectConfig {
    minScale: number;
    maxScale: number;
    frequency: number;
    phase: number;
}

export interface ShimmerEffect extends VisualEffectConfig {
    colors: string[];
    speed: number;
    amplitude: number;
}

export interface TrailEffect extends VisualEffectConfig {
    length: number;
    fadeRate: number;
    points: WorldCoordinates[];
}

// Rendering performance types
export interface RenderStats {
    frameCount: number;
    averageFPS: number;
    currentFPS: number;
    frameTime: number;
    drawCalls: number;
    triangles: number;
    vertices: number;
    textureMemory: number;
}

export interface RenderOptions {
    enableAntialiasing: boolean;
    enableBlending: boolean;
    cullBackFaces: boolean;
    depthTesting: boolean;
    wireframe: boolean;
    showBounds: boolean;
    showNormals: boolean;
    quality: 'low' | 'medium' | 'high' | 'ultra';
}

// Shader and material types (for future WebGL implementation)
export interface Material {
    id: string;
    shader: string;
    uniforms: Record<string, any>;
    textures: Record<string, HTMLImageElement | HTMLCanvasElement>;
    blendMode: 'normal' | 'add' | 'multiply' | 'screen' | 'overlay';
    transparent: boolean;
    doubleSided: boolean;
}

export interface Mesh {
    vertices: Float32Array;
    indices: Uint16Array;
    normals?: Float32Array;
    uvs?: Float32Array;
    colors?: Float32Array;
    material: Material;
}

// Animation types
export interface Keyframe<T> {
    time: number; // 0-1
    value: T;
    easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bezier';
    easingParams?: number[];
}

export interface Animation<T> {
    keyframes: Keyframe<T>[];
    duration: number;
    loop: boolean;
    pingPong: boolean;
    startTime: number;
    endTime?: number;
}

export interface AnimationChannel {
    target: any;
    property: string;
    animation: Animation<any>;
    isActive: boolean;
}

// Lighting system types
export interface Light {
    type: 'directional' | 'point' | 'spot' | 'ambient';
    position: WorldCoordinates;
    direction?: { x: number; y: number };
    color: Color;
    intensity: number;
    range?: number;
    falloff?: number;
    castShadows: boolean;
}

export interface LightingConfig {
    enabled: boolean;
    ambientColor: Color;
    ambientIntensity: number;
    lights: Light[];
    shadowQuality: 'low' | 'medium' | 'high';
    shadowDistance: number;
}

// Texture and sprite types
export interface Texture {
    image: HTMLImageElement | HTMLCanvasElement;
    width: number;
    height: number;
    format: 'rgba' | 'rgb' | 'alpha' | 'luminance';
    wrapS: 'repeat' | 'clamp' | 'mirror';
    wrapT: 'repeat' | 'clamp' | 'mirror';
    filterMin: 'nearest' | 'linear' | 'mipmap';
    filterMag: 'nearest' | 'linear';
}

export interface Sprite {
    texture: Texture;
    x: number;
    y: number;
    width: number;
    height: number;
    originX: number;
    originY: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
    opacity: number;
    tint: Color;
}

// Font and text rendering types
export interface Font {
    family: string;
    size: number;
    weight: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
    style: 'normal' | 'italic' | 'oblique';
    variant: 'normal' | 'small-caps';
}

export interface TextStyle {
    font: Font;
    color: string;
    strokeColor?: string;
    strokeWidth?: number;
    shadowColor?: string;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    shadowBlur?: number;
    align: 'left' | 'center' | 'right';
    baseline: 'top' | 'middle' | 'bottom' | 'alphabetic' | 'hanging';
}

export interface TextMetrics {
    width: number;
    height: number;
    actualBoundingBoxLeft: number;
    actualBoundingBoxRight: number;
    actualBoundingBoxAscent: number;
    actualBoundingBoxDescent: number;
}