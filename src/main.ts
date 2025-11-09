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
    private panelSize: number = 0;

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
        // Calculate the largest square that fits in the window
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        this.panelSize = Math.min(windowWidth, windowHeight);
        
        // Resize the game to be square
        this.scale.resize(this.panelSize, this.panelSize);
        
        const width = this.panelSize;
        const height = this.panelSize;

        // Show loading text
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
    }

    private renderMandelbrotSet(width: number, height: number): void {
        // Create renderer with screen dimensions and current view bounds
        // Using full screen resolution for best quality
        const renderWidth = width;
        const renderHeight = height;
        
        this.mandelbrotRenderer = new MandelbrotRenderer(
            renderWidth, 
            renderHeight, 
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
        
        // Display the Mandelbrot set in the center
        // Since panel is square and we render square, no scaling needed
        this.mandelbrotImage = this.add.image(
            width / 2,
            height / 2,
            textureKey
        );
        
        this.mandelbrotImage.setOrigin(0.5);
        
        // Set up mouse input for square drawing (only on first render)
        if (!this.selectionSquare) {
            this.setupMouseInput();
        }
    }

    private setupMouseInput(): void {
        // Create graphics object for drawing the square
        this.selectionSquare = this.add.graphics();
        this.selectionSquare.setDepth(1000); // Draw on top of everything
        
        // Left mouse button down - set upper left corner
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.leftButtonDown()) {
                this.isDrawing = true;
                this.startX = pointer.x;
                this.startY = pointer.y;
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
        
        // Get the actual texture dimensions
        const texture = this.textures.get('mandelbrot');
        const textureWidth = texture.width;
        const textureHeight = texture.height;
        
        // The image is displayed at its natural size (1:1 scale) since panel is square
        const imageX = this.mandelbrotImage.x;
        const imageY = this.mandelbrotImage.y;
        
        // Calculate the top-left corner of the displayed image
        const imageLeft = imageX - textureWidth / 2;
        const imageTop = imageY - textureHeight / 2;
        
        // Convert screen coordinates to texture coordinates
        const squareLeftInImage = this.currentSquareX - imageLeft;
        const squareTopInImage = this.currentSquareY - imageTop;
        
        // Normalize to 0-1 range within the texture
        const normX = squareLeftInImage / textureWidth;
        const normY = squareTopInImage / textureHeight;
        
        // Calculate the normalized size of the square
        const normSize = this.currentSquareSize / textureWidth;
        
        // Calculate the center of the square in normalized coordinates
        const centerNormX = normX + normSize / 2;
        const centerNormY = normY + normSize / 2;
        
        // Convert normalized coordinates to complex plane coordinates
        const realRange = currentBounds.realMax - currentBounds.realMin;
        const imagRange = currentBounds.imagMax - currentBounds.imagMin;
        
        const centerReal = currentBounds.realMin + centerNormX * realRange;
        const centerImag = currentBounds.imagMin + centerNormY * imagRange;
        
        // Calculate new bounds: the square content should fit the entire panel
        // The square represents a portion of the current view, so we need to zoom in
        const zoomFactor = 1 / normSize; // How much we need to zoom
        
        const newRealRange = realRange / zoomFactor;
        const newImagRange = imagRange / zoomFactor;
        
        // Create new bounds centered on the square center
        const newBounds: ViewBounds = {
            realMin: centerReal - newRealRange / 2,
            realMax: centerReal + newRealRange / 2,
            imagMin: centerImag - newImagRange / 2,
            imagMax: centerImag + newImagRange / 2
        };
        
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
}

// Calculate initial square size that fits the window
const getSquareSize = (): number => {
    return Math.min(window.innerWidth, window.innerHeight);
};

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: getSquareSize(),
    height: getSquareSize(),
    parent: 'game-container',
    backgroundColor: '#2d2d2d',
    scene: GameScene,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
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
window.addEventListener('resize', () => {
    const newSize = getSquareSize();
    game.scale.resize(newSize, newSize);
});

