# Development Guidelines

This document provides detailed implementation guidelines and explanations for key features of the Mandelbrot visualization project. It complements the [specification.md](./specification.md) by explaining **how** things are implemented, rather than **what** they should do.

---

## Table of Contents

1. [Initial State Setup](#initial-state-setup)
2. [Zoom In Functionality](#zoom-in-functionality)
3. [Coordinate System Transformations](#coordinate-system-transformations)
4. [Aspect Ratio Handling](#aspect-ratio-handling)
5. [Zoom History Management](#zoom-history-management)
6. [Window Resize Handling](#window-resize-handling)

---

## Initial State Setup

### Overview

The application initializes with the Mandelbrot set displayed in a square panel that is maximally sized and centered within the browser window. The square size is calculated to be the largest square that fits within the window dimensions.

### Initialization Process

#### 1. Square Size Calculation

The square size is calculated based on the window dimensions:

```typescript
const getSquareSize = (): number => {
    return Math.min(window.innerWidth, window.innerHeight);
};
```

**Key Points:**
- Uses the minimum of window width and height to ensure the square fits
- This ensures the square is as large as possible while maintaining square aspect ratio
- The calculation happens after the DOM is ready to ensure accurate window dimensions

#### 2. Phaser Game Configuration

The Phaser game is configured with:

```typescript
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: initialSize,  // Square dimensions
    height: initialSize, // Square dimensions
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};
```

**Configuration Details:**
- **Width and Height**: Both set to the calculated square size
- **Scale Mode**: `RESIZE` allows the game to resize when the window changes
- **Auto Center**: `CENTER_BOTH` centers the game canvas both horizontally and vertically
- **Parent**: The game is rendered in a container that is centered via CSS flexbox

#### 3. Scene Initialization

When the scene is created:

```typescript
create() {
    // Get the actual camera dimensions (should be square and maximally sized)
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Show loading text centered in the square
    this.loadingText = this.add.text(width / 2, height / 2, 'Rendering...');
    
    // Render Mandelbrot set with current view bounds
    this.renderMandelbrotSet(width, height);
}
```

**Initial Render:**
- Uses camera dimensions (which match the square size)
- Centers all UI elements (loading text, Mandelbrot image) at `(width/2, height/2)`
- Renders the Mandelbrot set with default view bounds showing the full set

#### 4. Image Centering

The Mandelbrot set image is displayed centered:

```typescript
this.mandelbrotImage = this.add.image(
    width / 2,    // Center X
    height / 2,   // Center Y
    textureKey
);
this.mandelbrotImage.setOrigin(0.5, 0.5); // Center the origin
```

**Centering Details:**
- Image is positioned at the center of the camera/viewport
- Origin is set to `(0.5, 0.5)` which means the image's center is at the position
- This ensures the Mandelbrot set is perfectly centered regardless of texture size

### CSS Centering

The HTML container also uses CSS to center the game:

```css
body {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
}

#game-container {
    display: flex;
    justify-content: center;
    align-items: center;
}
```

This provides additional centering at the HTML level, working together with Phaser's centering.

### Initial View Bounds

The initial view bounds display the complete Mandelbrot set:

```typescript
this.currentViewBounds = {
    realMin: -2.5,
    realMax: 1.5,
    imagMin: -2.0,
    imagMax: 2.0
};
```

These bounds show the classic view of the Mandelbrot set, centered around the origin of the complex plane.

---

## Zoom In Functionality

### Overview

The zoom in functionality allows users to select a region of the Mandelbrot set by drawing a square and then zoom into that region. This involves complex coordinate transformations between screen space, texture space, and the complex plane.

### Step-by-Step Algorithm

The zoom operation (`zoomToSelection()` method) follows these steps:

#### 1. Screen to Texture Coordinate Conversion

When a user draws a selection square, the coordinates are in **screen space** (pixels on the canvas). The first step is to convert these to **texture coordinates** (pixels within the rendered Mandelbrot texture).

```typescript
// Calculate the top-left corner of the displayed image
const imageLeft = imageX - textureWidth / 2;
const imageTop = imageY - textureHeight / 2;

// Convert screen coordinates to texture pixel coordinates
const squareLeftInTexture = this.currentSquareX - imageLeft;
const squareTopInTexture = this.currentSquareY - imageTop;
```

**Key Points:**
- The Mandelbrot image is centered on the canvas
- The image position (`imageX`, `imageY`) is at the center
- To get texture coordinates, we subtract the image's top-left corner from the screen coordinates

#### 2. Normalization to [0, 1] Range

The texture coordinates are normalized to a [0, 1] range to make calculations independent of texture resolution:

```typescript
const normX = squareLeftInTexture / textureWidth;
const normY = squareTopInTexture / textureHeight;
const normSize = this.currentSquareSize / textureWidth;
```

**Why normalize?**
- Makes calculations resolution-independent
- Easier to map to complex plane coordinates
- Simplifies zoom factor calculations

#### 3. Aspect Ratio Adjustment

The current view bounds may have been adjusted during rendering to maintain aspect ratio. We need to account for these adjustments:

```typescript
const canvasAspect = textureWidth / textureHeight;
const setAspect = realRange / imagRange;

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
    adjustedImagRange = centerImag + adjustedImagRange / 2;
}
```

**Important:** The zoom calculation must use the **adjusted bounds**, not the original bounds, because the renderer uses adjusted bounds when creating the texture.

#### 4. Normalized Coordinates to Complex Plane

Convert the normalized texture coordinates to complex plane coordinates using the adjusted bounds:

```typescript
const adjustedRealRange = adjustedRealMax - adjustedRealMin;
const adjustedImagRange = adjustedImagMax - adjustedImagMin;

const centerReal = adjustedRealMin + centerNormX * adjustedRealRange;
const centerImag = adjustedImagMin + centerNormY * adjustedImagRange;
```

**Mathematical Relationship:**
- `centerNormX` and `centerNormY` are in [0, 1] range
- Multiplying by the range gives the offset from the minimum
- Adding to the minimum gives the absolute coordinate

#### 5. Calculate Zoom Factor

The zoom factor determines how much we need to zoom in:

```typescript
const zoomFactor = 1 / normSize;
```

**Explanation:**
- `normSize` is the normalized size of the selection square (e.g., 0.5 means the square covers 50% of the texture width)
- If `normSize = 0.5`, then `zoomFactor = 2`, meaning we need to zoom in by 2x
- If `normSize = 0.25`, then `zoomFactor = 4`, meaning we need to zoom in by 4x

#### 6. Calculate New View Bounds

The new bounds are calculated such that the selected region fills the entire viewport:

```typescript
const newRealRange = adjustedRealRange / zoomFactor;
const newImagRange = adjustedImagRange / zoomFactor;

const newBounds: ViewBounds = {
    realMin: centerReal - newRealRange / 2,
    realMax: centerReal + newRealRange / 2,
    imagMin: centerImag - newImagRange / 2,
    imagMax: centerImag + newImagRange / 2
};
```

**Key Points:**
- The new range is the old range divided by the zoom factor
- The bounds are centered on the selected region's center
- This ensures the selected square's content will fill the entire panel after zoom

#### 7. Save to History and Re-render

Before updating the view, save the current view to history for zoom-out functionality:

```typescript
this.zoomHistory.push({ ...this.currentViewBounds });
this.currentViewBounds = newBounds;
```

Then trigger a re-render with the new bounds.

---

## Coordinate System Transformations

### Three Coordinate Systems

The zoom functionality involves transformations between three coordinate systems:

1. **Screen Coordinates**: Pixel coordinates on the canvas/window
2. **Texture Coordinates**: Pixel coordinates within the rendered Mandelbrot texture
3. **Complex Plane Coordinates**: Real and imaginary coordinates in the Mandelbrot set

### Transformation Chain

```
Screen Coordinates
    ↓ (subtract image offset)
Texture Coordinates
    ↓ (normalize by texture dimensions)
Normalized Coordinates [0, 1]
    ↓ (multiply by adjusted bounds range, add minimum)
Complex Plane Coordinates
```

### Example

Suppose:
- Screen click at (400, 300)
- Image centered at (512, 512)
- Texture size: 1024x1024
- Current bounds: realMin=-2.5, realMax=1.5, imagMin=-2.0, imagMax=2.0
- Adjusted bounds (after aspect ratio): same as above

**Step 1: Screen to Texture**
```
imageLeft = 512 - 1024/2 = 0
imageTop = 512 - 1024/2 = 0
textureX = 400 - 0 = 400
textureY = 300 - 0 = 300
```

**Step 2: Normalize**
```
normX = 400 / 1024 = 0.390625
normY = 300 / 1024 = 0.29296875
```

**Step 3: To Complex Plane**
```
realRange = 1.5 - (-2.5) = 4.0
imagRange = 2.0 - (-2.0) = 4.0
centerReal = -2.5 + 0.390625 * 4.0 = -0.9375
centerImag = -2.0 + 0.29296875 * 4.0 = -0.828125
```

---

## Aspect Ratio Handling

### The Problem

The Mandelbrot set has a natural aspect ratio determined by the view bounds. However, the canvas/texture may have a different aspect ratio. To prevent distortion, the renderer adjusts the bounds to match the canvas aspect ratio.

### Adjustment Logic

The adjustment is done in `MandelbrotRenderer.ts` during rendering, but the same logic must be applied in `zoomToSelection()` to ensure consistency:

```typescript
const canvasAspect = textureWidth / textureHeight;
const setAspect = realRange / imagRange;

if (canvasAspect > setAspect) {
    // Canvas is wider than the set
    // Expand the real axis to fill the width
    adjustedRealRange = imagRange * canvasAspect;
} else {
    // Canvas is taller than the set
    // Expand the imaginary axis to fill the height
    adjustedImagRange = realRange / canvasAspect;
}
```

### Why This Matters for Zoom

When calculating zoom, we must use the **adjusted bounds**, not the original bounds, because:
1. The texture is rendered using adjusted bounds
2. Screen coordinates map to texture coordinates, which represent the adjusted view
3. Using original bounds would result in incorrect zoom calculations

---

## Zoom History Management

### Data Structure

Zoom history is stored as a stack (array) of `ViewBounds` objects:

```typescript
private zoomHistory: ViewBounds[] = [];
```

### Push Operation (Zoom In)

When zooming in, the current view is saved before updating:

```typescript
this.zoomHistory.push({ ...this.currentViewBounds });
```

**Why use spread operator?**
- Creates a deep copy of the bounds object
- Prevents reference issues if bounds are modified later
- Ensures each history entry is independent

### Pop Operation (Zoom Out)

When zooming out, the most recent view is restored:

```typescript
const previousBounds = this.zoomHistory.pop()!;
this.currentViewBounds = previousBounds;
```

### Edge Cases

- **Empty History**: If history is empty, zoom out has no effect (already at initial view)
- **Initial View**: The initial view is not stored in history (it's the default state)

### Future Enhancements

Potential improvements:
- Limit history size to prevent memory issues
- Add navigation through history (not just last entry)
- Visual indicator of zoom depth
- Save/load zoom history

---

## Best Practices

### 1. Coordinate Transformations

- Always trace through all coordinate systems when debugging
- Use descriptive variable names (`normX`, `textureX`, `screenX`)
- Add comments explaining the purpose of each transformation

### 2. Aspect Ratio Consistency

- Always use adjusted bounds when mapping between screen and complex plane
- Ensure the same adjustment logic is used in renderer and zoom calculations
- Test with different canvas sizes to verify aspect ratio handling

### 3. History Management

- Always create copies when storing in history (use spread operator)
- Check for empty history before popping
- Consider memory limits for deep zoom scenarios

### 4. Performance Considerations

- Zoom operations trigger re-rendering, which can be expensive
- Consider debouncing rapid zoom operations
- Show loading indicators during rendering
- Consider progressive rendering for very deep zooms

### 5. Testing

- Test with squares of different sizes
- Test with squares at different positions (center, edges, corners)
- Test zoom out from various zoom levels
- Test with different window sizes (aspect ratios)
- Test rapid zoom in/out operations

---

## Common Pitfalls

### 1. Using Original Bounds Instead of Adjusted Bounds

**Problem:** Calculating zoom using original bounds when texture was rendered with adjusted bounds.

**Solution:** Always recalculate adjusted bounds using the same logic as the renderer.

### 2. Incorrect Image Offset Calculation

**Problem:** Forgetting that the image is centered, not positioned at (0, 0).

**Solution:** Always calculate image offset from center: `imageLeft = imageX - textureWidth / 2`

### 3. Aspect Ratio Mismatch

**Problem:** Not accounting for aspect ratio adjustments when converting coordinates.

**Solution:** Use adjusted bounds for all coordinate transformations.

### 4. History Reference Issues

**Problem:** Storing references instead of copies, causing history entries to change when current view changes.

**Solution:** Use spread operator: `{ ...this.currentViewBounds }`

---

## Debugging Tips

### Visualizing Coordinate Transformations

Add console logs at each transformation step:

```typescript
console.log('Screen:', this.currentSquareX, this.currentSquareY);
console.log('Texture:', squareLeftInTexture, squareTopInTexture);
console.log('Normalized:', normX, normY);
console.log('Complex:', centerReal, centerImag);
console.log('Zoom Factor:', zoomFactor);
console.log('New Bounds:', newBounds);
```

### Verifying Aspect Ratio

Log both original and adjusted bounds:

```typescript
console.log('Original Bounds:', currentBounds);
console.log('Adjusted Bounds:', adjustedRealMin, adjustedRealMax, adjustedImagMin, adjustedImagMax);
```

### Checking History

Log history before and after operations:

```typescript
console.log('History before:', this.zoomHistory.length);
this.zoomHistory.push({ ...this.currentViewBounds });
console.log('History after:', this.zoomHistory.length);
```

---

## Window Resize Handling

### Overview

When the browser window is resized, the application must recalculate the square size and re-render the Mandelbrot set to maintain the maximal square size and proper centering.

### Resize Flow

#### 1. Window Resize Event

The window resize event is handled at the application level:

```typescript
window.addEventListener('resize', () => {
    const newSize = getSquareSize();
    game.scale.resize(newSize, newSize);
});
```

**Process:**
- Calculates the new square size based on updated window dimensions
- Resizes the Phaser game to maintain square aspect ratio
- Phaser's scale manager triggers a resize event on the scene

#### 2. Scene Resize Handler

The scene listens for resize events from Phaser's scale manager:

```typescript
this.scale.on('resize', this.handleResize, this);

private handleResize(_gameSize: Phaser.Structs.Size): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    // Clear selection square if visible
    if (this.selectionSquare) {
        this.selectionSquare.clear();
    }
    
    // Show loading text
    this.loadingText = this.add.text(width / 2, height / 2, 'Rendering...');
    
    // Re-render with current view bounds but new size
    this.time.delayedCall(100, () => {
        this.renderMandelbrotSet(width, height);
    });
}
```

**Resize Handler Details:**
- Gets new camera dimensions (which reflect the resized square)
- Clears any active selection square
- Shows loading indicator during re-render
- Re-renders the Mandelbrot set with the same view bounds but new dimensions
- Uses a small delay to ensure the resize is complete before rendering

### Maintaining View During Resize

**Important:** The view bounds (zoom level and position) are maintained during resize. Only the render dimensions change.

**Example:**
- User zooms into a specific region
- User resizes the window
- The same region is re-rendered at the new square size
- The zoom level and position remain the same

### Performance Considerations

- Resize events can fire frequently during window resizing
- The delay in `handleResize` helps debounce rapid resize events
- Re-rendering is expensive, so it's only done after the resize is complete
- The loading indicator provides visual feedback during re-render

---

## References

- [specification.md](./specification.md) - Functional requirements and specifications
- `src/main.ts` - Main implementation file
- `src/MandelbrotRenderer.ts` - Mandelbrot rendering implementation

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Initial | Initial guidelines document with zoom functionality explanation |

