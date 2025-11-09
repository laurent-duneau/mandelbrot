export interface ViewBounds {
    realMin: number;
    realMax: number;
    imagMin: number;
    imagMax: number;
}

export class MandelbrotRenderer {
    private maxIterations: number = 100;
    private width: number;
    private height: number;
    private imageData: ImageData | null = null;
    private viewBounds: ViewBounds;

    constructor(width: number, height: number, maxIterations: number = 100, viewBounds?: ViewBounds) {
        this.width = width;
        this.height = height;
        this.maxIterations = maxIterations;
        
        // Default bounds show the full Mandelbrot set
        this.viewBounds = viewBounds || {
            realMin: -2.5,
            realMax: 1.5,
            imagMin: -2.0,
            imagMax: 2.0
        };
    }

    /**
     * Sets the view bounds for rendering
     */
    setViewBounds(bounds: ViewBounds): void {
        this.viewBounds = bounds;
    }

    /**
     * Gets the current view bounds
     */
    getViewBounds(): ViewBounds {
        return { ...this.viewBounds };
    }

    /**
     * Computes the Mandelbrot set and returns ImageData
     */
    render(): ImageData {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
            throw new Error('Could not get 2D context');
        }

        this.imageData = ctx.createImageData(this.width, this.height);
        
        // Use the current view bounds
        const realMin = this.viewBounds.realMin;
        const realMax = this.viewBounds.realMax;
        const imagMin = this.viewBounds.imagMin;
        const imagMax = this.viewBounds.imagMax;

        const realRange = realMax - realMin;
        const imagRange = imagMax - imagMin;

        // Calculate aspect ratios
        const canvasAspect = this.width / this.height;
        const setAspect = realRange / imagRange;

        let adjustedRealMin = realMin;
        let adjustedRealMax = realMax;
        let adjustedImagMin = imagMin;
        let adjustedImagMax = imagMax;

        // Adjust bounds to maintain aspect ratio without deformation
        if (canvasAspect > setAspect) {
            // Canvas is wider, adjust real axis
            const centerReal = (realMin + realMax) / 2;
            const adjustedRealRange = imagRange * canvasAspect;
            adjustedRealMin = centerReal - adjustedRealRange / 2;
            adjustedRealMax = centerReal + adjustedRealRange / 2;
        } else {
            // Canvas is taller, adjust imaginary axis
            const centerImag = (imagMin + imagMax) / 2;
            const adjustedImagRange = realRange / canvasAspect;
            adjustedImagMin = centerImag - adjustedImagRange / 2;
            adjustedImagMax = centerImag + adjustedImagRange / 2;
        }

        // Compute Mandelbrot set
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const real = adjustedRealMin + (x / this.width) * (adjustedRealMax - adjustedRealMin);
                const imag = adjustedImagMin + (y / this.height) * (adjustedImagMax - adjustedImagMin);
                
                const iterations = this.mandelbrotIterations(real, imag);
                const color = this.getColor(iterations);
                
                const index = (y * this.width + x) * 4;
                this.imageData.data[index] = color.r;     // R
                this.imageData.data[index + 1] = color.g; // G
                this.imageData.data[index + 2] = color.b; // B
                this.imageData.data[index + 3] = 255;     // A
            }
        }

        return this.imageData;
    }

    /**
     * Computes the number of iterations for a point in the Mandelbrot set
     */
    private mandelbrotIterations(real: number, imag: number): number {
        let zReal = 0;
        let zImag = 0;
        
        for (let i = 0; i < this.maxIterations; i++) {
            const zRealSquared = zReal * zReal;
            const zImagSquared = zImag * zImag;
            
            // Check if point has escaped
            if (zRealSquared + zImagSquared > 4) {
                return i;
            }
            
            // z = z^2 + c
            const newZReal = zRealSquared - zImagSquared + real;
            zImag = 2 * zReal * zImag + imag;
            zReal = newZReal;
        }
        
        return this.maxIterations; // Point is in the set
    }

    /**
     * Maps iteration count to a color
     */
    private getColor(iterations: number): { r: number; g: number; b: number } {
        if (iterations === this.maxIterations) {
            // Point is in the set - color it black
            return { r: 0, g: 0, b: 0 };
        }
        
        // Smooth coloring using normalized iteration count
        const normalized = iterations / this.maxIterations;
        
        // Create a smooth color gradient
        const hue = normalized * 360;
        const saturation = 0.8;
        const lightness = 0.5;
        
        return this.hslToRgb(hue, saturation, lightness);
    }

    /**
     * Converts HSL to RGB
     */
    private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
        h /= 360;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h * 6) % 2 - 1));
        const m = l - c / 2;
        
        let r = 0, g = 0, b = 0;
        
        if (h < 1/6) {
            r = c; g = x; b = 0;
        } else if (h < 2/6) {
            r = x; g = c; b = 0;
        } else if (h < 3/6) {
            r = 0; g = c; b = x;
        } else if (h < 4/6) {
            r = 0; g = x; b = c;
        } else if (h < 5/6) {
            r = x; g = 0; b = c;
        } else {
            r = c; g = 0; b = x;
        }
        
        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }

    /**
     * Creates a Phaser texture from the rendered ImageData
     */
    createTexture(scene: { textures: Phaser.Textures.TextureManager }, key: string): void {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx || !this.imageData) {
            throw new Error('Could not create texture');
        }
        
        ctx.putImageData(this.imageData, 0, 0);
        
        // Add texture to Phaser
        scene.textures.addCanvas(key, canvas);
    }
}

