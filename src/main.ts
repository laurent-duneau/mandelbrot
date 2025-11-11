import Phaser from 'phaser';
import { MandelbrotRenderer, ViewBounds } from './MandelbrotRenderer';

class GameScene extends Phaser.Scene {
    private mandelbrotRenderer: MandelbrotRenderer | null = null;
    private loadingText: Phaser.GameObjects.Text | null = null;
    private mandelbrotImage: Phaser.GameObjects.Image | null = null;
    private selectionSquare: Phaser.GameObjects.Graphics | null = null;
    private isDrawing: boolean = false;
    private startX: number = 0;
    private startY: number = 0;
    private currentSquareSize: number = 0;
    private currentSquareX: number = 0;
    private currentSquareY: number = 0;
    private currentViewBounds: ViewBounds;
    private zoomHistory: ViewBounds[] = []; // Stack to track zoom history

    constructor() {
        super({ key: 'GameScene' });
        // Initialize with default bounds (full Mandelbrot set)
        this.currentViewBounds = {
            realMin: -2.5,
            realMax: 1.5,
            imagMin: -2.0,
            imagMax: 2.0
        };
    }

    create() {
        // Get the actual camera dimensions (should be square and maximally sized)
        // The game is initialized with square dimensions that fit the window
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Show loading text centered in the square
        this.loadingText = this.add.text(
            width / 2,
            height / 2,
            'Rendering Mandelbrot Set...',
            {
                fontSize: '24px',
                color: '#ffffff',
                align: 'center'
            }
        ).setOrigin(0.5);

        // Render Mandelbrot set asynchronously to avoid blocking
        this.time.delayedCall(100, () => {
            this.renderMandelbrotSet(width, height);
        });
        
        // Listen for resize events to re-render when window is resized
        this.scale.on('resize', this.handleResize, this);
    }
    
    private handleResize(_gameSize: Phaser.Structs.Size): void {
        // Get the new camera dimensions after resize
        // The game should maintain square aspect ratio (width == height)
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Clear selection square if visible
        if (this.selectionSquare) {
            this.selectionSquare.clear();
        }
        
        // Show loading text
        if (this.loadingText) {
            this.loadingText.destroy();
        }
        this.loadingText = this.add.text(
            width / 2,
            height / 2,
            'Rendering...',
            {
                fontSize: '24px',
                color: '#ffffff',
                align: 'center'
            }
        ).setOrigin(0.5);
        
        // Re-render with current view bounds but new size
        // Use a small delay to ensure the resize is complete
        this.time.delayedCall(100, () => {
            this.renderMandelbrotSet(width, height);
        });
    }

    private renderMandelbrotSet(width: number, height: number): void {
        // Use the provided dimensions to render the Mandelbrot set
        // These should be square dimensions that maximize the available window space
        const renderWidth = Math.floor(width);
        const renderHeight = Math.floor(height);
        
        // Ensure we're rendering a square (take the minimum to maintain square aspect)
        const squareSize = Math.min(renderWidth, renderHeight);
        
        // Create renderer with square dimensions and current view bounds
        // The renderer will maintain aspect ratio and center the Mandelbrot set within the bounds
        this.mandelbrotRenderer = new MandelbrotRenderer(
            squareSize, 
            squareSize, 
            100, 
            this.currentViewBounds
        );
        
        // Render the Mandelbrot set
        this.mandelbrotRenderer.render();
        
        const textureKey = 'mandelbrot';
        
        // Remove old image if it exists
        if (this.mandelbrotImage) {
            this.mandelbrotImage.destroy();
            this.mandelbrotImage = null;
        }
        
        // Remove old texture if it exists
        if (this.textures.exists(textureKey)) {
            this.textures.remove(textureKey);
        }
        
        // Create texture from rendered data
        this.mandelbrotRenderer.createTexture(this, textureKey);
        
        // Remove loading text
        if (this.loadingText) {
            this.loadingText.destroy();
            this.loadingText = null;
        }
        
        // Display the Mandelbrot set centered in the square panel
        // The image is positioned at the center of the camera/viewport
        // Since the texture is square and the viewport should be square, it will be perfectly centered
        const centerX = width / 2;
        const centerY = height / 2;
        
        this.mandelbrotImage = this.add.image(
            centerX,
            centerY,
            textureKey
        );
        
        // Set origin to center (0.5, 0.5) so the image is properly centered
        // This ensures the Mandelbrot set is centered regardless of texture size
        this.mandelbrotImage.setOrigin(0.5, 0.5);
        
        // Set up mouse input for square drawing (only on first render)
        if (!this.selectionSquare) {
            this.setupMouseInput();
        }
    }

    private setupMouseInput(): void {
        // Create graphics object for drawing the square
        this.selectionSquare = this.add.graphics();
        this.selectionSquare.setDepth(1000); // Draw on top of everything
        
        // Mouse button down - handle left (selection) and right (zoom out)
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.leftButtonDown()) {
                this.isDrawing = true;
                this.startX = pointer.x;
                this.startY = pointer.y;
            } else if (pointer.rightButtonDown()) {
                this.zoomOut();
            }
        });

        // Mouse move with left button down - update square size
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.isDrawing && pointer.isDown) {
                this.updateSelectionSquare(pointer.x, pointer.y);
            }
        });

        // Left mouse button up - finish drawing and zoom
        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (pointer.leftButtonReleased() && this.isDrawing) {
                this.isDrawing = false;
                
                // Only zoom if square has meaningful size
                if (this.currentSquareSize > 10) {
                    this.zoomToSelection();
                } else {
                    // Clear selection if too small
                    if (this.selectionSquare) {
                        this.selectionSquare.clear();
                    }
                }
            }
        });
    }

    private updateSelectionSquare(currentX: number, currentY: number): void {
        if (!this.selectionSquare) return;

        // Clear previous drawing
        this.selectionSquare.clear();

        // Calculate dimensions
        const width = currentX - this.startX;
        const height = currentY - this.startY;
        
        // Use the smaller absolute dimension to make it a square
        const size = Math.min(Math.abs(width), Math.abs(height));
        
        // Calculate position based on direction of mouse movement
        // Always draw from the click point, expanding in the direction of mouse movement
        let x = this.startX;
        let y = this.startY;
        
        // Adjust position if mouse moved left or up
        if (width < 0) {
            x = this.startX - size;
        }
        if (height < 0) {
            y = this.startY - size;
        }

        // Store current square properties for zoom calculation
        this.currentSquareX = x;
        this.currentSquareY = y;
        this.currentSquareSize = size;

        // Draw square outline
        this.selectionSquare.lineStyle(2, 0xffffff, 1);
        this.selectionSquare.strokeRect(x, y, size, size);
    }

    private zoomToSelection(): void {
        if (!this.mandelbrotRenderer || !this.mandelbrotImage) return;

        // Get current view bounds
        const currentBounds = this.currentViewBounds;
        
        // Get the actual texture dimensions from the image's frame
        // Since the image uses the texture at 1:1 scale, we can use the frame dimensions
        const textureWidth = this.mandelbrotImage.width;
        const textureHeight = this.mandelbrotImage.height;
        
        // The image is displayed at its natural size (1:1 scale) since panel is square
        const imageX = this.mandelbrotImage.x;
        const imageY = this.mandelbrotImage.y;
        
        // Calculate the top-left corner of the displayed image
        const imageLeft = imageX - textureWidth / 2;
        const imageTop = imageY - textureHeight / 2;
        
        // Convert screen coordinates to texture pixel coordinates
        const squareLeftInTexture = this.currentSquareX - imageLeft;
        const squareTopInTexture = this.currentSquareY - imageTop;
        
        // Normalize to 0-1 range within the texture (pixel coordinates)
        const normX = squareLeftInTexture / textureWidth;
        const normY = squareTopInTexture / textureHeight;
        
        // Calculate the normalized size of the square
        const normSize = this.currentSquareSize / textureWidth;
        
        // Calculate the center of the square in normalized coordinates (0-1)
        const centerNormX = normX + normSize / 2;
        const centerNormY = normY + normSize / 2;
        
        // Calculate adjusted bounds (same logic as in MandelbrotRenderer)
        // This accounts for aspect ratio adjustments made during rendering
        const realRange = currentBounds.realMax - currentBounds.realMin;
        const imagRange = currentBounds.imagMax - currentBounds.imagMin;
        const canvasAspect = textureWidth / textureHeight;
        const setAspect = realRange / imagRange;
        
        let adjustedRealMin = currentBounds.realMin;
        let adjustedRealMax = currentBounds.realMax;
        let adjustedImagMin = currentBounds.imagMin;
        let adjustedImagMax = currentBounds.imagMax;
        
        if (canvasAspect > setAspect) {
            // Canvas is wider, adjust real axis
            const centerReal = (currentBounds.realMin + currentBounds.realMax) / 2;
            const adjustedRealRange = imagRange * canvasAspect;
            adjustedRealMin = centerReal - adjustedRealRange / 2;
            adjustedRealMax = centerReal + adjustedRealRange / 2;
        } else {
            // Canvas is taller, adjust imaginary axis
            const centerImag = (currentBounds.imagMin + currentBounds.imagMax) / 2;
            const adjustedImagRange = realRange / canvasAspect;
            adjustedImagMin = centerImag - adjustedImagRange / 2;
            adjustedImagMax = centerImag + adjustedImagRange / 2;
        }
        
        // Convert normalized texture coordinates to complex plane coordinates
        // using the ADJUSTED bounds (same as renderer uses)
        const adjustedRealRange = adjustedRealMax - adjustedRealMin;
        const adjustedImagRange = adjustedImagMax - adjustedImagMin;
        
        const centerReal = adjustedRealMin + centerNormX * adjustedRealRange;
        const centerImag = adjustedImagMin + centerNormY * adjustedImagRange;
        
        // Calculate new bounds: the square content should fit the entire panel
        // The square represents a portion of the current view, so we need to zoom in
        const zoomFactor = 1 / normSize; // How much we need to zoom
        
        // Calculate new ranges based on the square size
        const newRealRange = adjustedRealRange / zoomFactor;
        const newImagRange = adjustedImagRange / zoomFactor;
        
        // Create new bounds centered on the square center
        const newBounds: ViewBounds = {
            realMin: centerReal - newRealRange / 2,
            realMax: centerReal + newRealRange / 2,
            imagMin: centerImag - newImagRange / 2,
            imagMax: centerImag + newImagRange / 2
        };
        
        // Save current view to history before zooming in
        this.zoomHistory.push({ ...this.currentViewBounds });
        
        // Update current view bounds
        this.currentViewBounds = newBounds;
        
        // Clear selection square
        if (this.selectionSquare) {
            this.selectionSquare.clear();
        }
        
        // Show loading text
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        this.loadingText = this.add.text(
            width / 2,
            height / 2,
            'Rendering...',
            {
                fontSize: '24px',
                color: '#ffffff',
                align: 'center'
            }
        ).setOrigin(0.5);
        
        // Re-render with new bounds
        this.time.delayedCall(100, () => {
            this.renderMandelbrotSet(width, height);
        });
    }

    private zoomOut(): void {
        // Check if there's a previous view in history
        if (this.zoomHistory.length === 0) {
            return; // Already at the initial view, nothing to zoom out to
        }

        // Restore the previous view from history
        const previousBounds = this.zoomHistory.pop()!;
        this.currentViewBounds = previousBounds;

        // Clear any selection square
        if (this.selectionSquare) {
            this.selectionSquare.clear();
        }

        // Show loading text
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        this.loadingText = this.add.text(
            width / 2,
            height / 2,
            'Rendering...',
            {
                fontSize: '24px',
                color: '#ffffff',
                align: 'center'
            }
        ).setOrigin(0.5);

        // Re-render with previous bounds
        this.time.delayedCall(100, () => {
            this.renderMandelbrotSet(width, height);
        });
    }
}

// Calculate initial square size that fits the window
const getSquareSize = (): number => {
    return Math.min(window.innerWidth, window.innerHeight);
};

// Initialize the game after DOM is ready to ensure accurate window dimensions
const initGame = () => {
    // Calculate initial square size based on current window dimensions
    // This ensures the Mandelbrot set is displayed in the largest possible square
    const initialSize = getSquareSize();
    
    const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: initialSize,
        height: initialSize,
        parent: 'game-container',
        backgroundColor: '#2d2d2d',
        scene: GameScene,
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { x: 0, y: 0 },
                debug: false
            }
        },
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH
        }
    };
    
    const game = new Phaser.Game(config);
    
    // Handle window resize to maintain square aspect ratio
    // The scene will handle the resize event and re-render accordingly
    window.addEventListener('resize', () => {
        const newSize = getSquareSize();
        game.scale.resize(newSize, newSize);
        // Note: The scene's handleResize method will be called automatically
        // by Phaser's scale manager when the resize event is triggered
    });
};

// Initialize when DOM is ready to ensure window dimensions are accurate
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}

