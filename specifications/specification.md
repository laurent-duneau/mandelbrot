# Project Specification

## 1. Overview

### 1.1 Project Description
The Mandelbrot project is an interactive visualization application that displays the Mandelbrot set fractal. Users can explore the fractal by drawing selection squares and zooming into specific regions.

### 1.2 Purpose
This application provides an interactive way to explore the Mandelbrot set fractal with real-time rendering and zoom capabilities.

---

## 2. Technology Stack

| Component | Technology |
|-----------|-----------|
| Game Framework | Phaser 3 |
| Programming Language | TypeScript |
| Build Tool | Vite |
| Package Manager | npm |

---

## 3. Project Structure

```
mandelbrot/
├── src/
│   ├── main.ts              # Main game entry point and scene management
│   └── MandelbrotRenderer.ts # Mandelbrot set computation and rendering
├── specifications/          # Project specifications and documentation
├── index.html               # HTML entry point
├── package.json             # Dependencies and npm scripts
├── tsconfig.json            # TypeScript compiler configuration
├── vite.config.ts           # Vite build configuration
└── README.md                # Project documentation and setup instructions
```

---

## 4. Functional Requirements

### 4.1 Mandelbrot Set Display

**FR-1: Mandelbrot Set Visualization**
- The Mandelbrot set must be displayed in the main panel
- The visualization must maintain aspect ratio (no deformation)
- Initial scale must display the complete Mandelbrot set within the viewport
- The same scale must be applied on both X and Y axes

**FR-2: Main Panel Layout**
- The main panel must be resizable
- The main panel must be the largest square that fits within the window
- The Mandelbrot set must be centered within the main panel

### 4.2 Interactive Selection

**FR-3: Square Selection Drawing**
- Users must be able to draw a square on the main panel using mouse input
- **Initialization**: Left mouse click sets the upper left corner of the selection square
- **Drawing**: Mouse movement with left button held down defines the size of the square
- The square must be drawn as a perfect square (equal width and height)
- Visual feedback must be provided during drawing (outline visible)

**FR-4: Zoom In Functionality**
- When the selection square is completed (left mouse button released):
  - The application must zoom into the region defined by the square
  - The center of the square becomes the new viewport center
  - The Mandelbrot set must be re-rendered at a new scale
  - The new scale must be calculated such that the content of the square fits the entire main panel
  - Aspect ratio must be maintained during zoom operations
  - The previous view (center and scale) must be saved to zoom history

**FR-5: Zoom Out Functionality**
- Right mouse click must perform zoom-out operation
- Zoom-out must restore the view (center and scale) as it was before the last zoom-in
- The application must maintain a history of previous views
- When zooming out, the Mandelbrot set must be re-rendered with the previous view bounds
- If already at the initial view (no zoom history), zoom-out has no effect

---

## 5. Non-Functional Requirements

### 5.1 Performance
- [ ] Rendering should complete within acceptable time limits
- [ ] Application should remain responsive during computation

### 5.2 Usability
- [ ] Interface should be intuitive and easy to use
- [ ] Visual feedback should be clear and immediate

### 5.3 Maintainability
- [ ] Code should follow TypeScript best practices
- [ ] Code should be well-documented and maintainable

---

## 6. User Interface Specifications

### 6.1 Main Panel
- **Type**: Square container
- **Behavior**: Resizable, maintains square aspect ratio
- **Content**: Mandelbrot set visualization

### 6.2 Selection Square
- **Visual Style**: White outline, 2px stroke width
- **Behavior**: Drawn dynamically during mouse drag
- **Constraints**: Always maintains square shape

### 6.3 Interaction Model
1. **Zoom In**:
   - User clicks and holds left mouse button → Selection starts
   - User drags mouse → Square size updates in real-time
   - User releases left mouse button → Zoom in operation triggers, previous view saved to history
2. **Zoom Out**:
   - User right-clicks → Zoom out operation triggers, restores previous view from history

---

## 7. Technical Specifications

### 7.1 Rendering
- Mandelbrot set computation using iterative algorithm
- Maximum iterations: Configurable (default: 100)
- Color mapping: Smooth gradient based on iteration count
- Rendering method: Canvas-based texture generation

### 7.2 Coordinate System
- Complex plane mapping to screen coordinates
- Aspect ratio preservation during transformations
- Zoom calculations based on selection square bounds

---

## 8. Development Guidelines

### 8.1 Code Style
- Use TypeScript strict mode
- Follow Phaser 3 best practices and patterns
- Maintain clean, readable, and well-documented code
- Use meaningful variable and function names

### 8.2 Build & Deployment

**Development**
```bash
npm run dev
```
- Starts development server with hot reload
- Opens application in browser automatically

**Production Build**
```bash
npm run build
```
- Compiles TypeScript to JavaScript
- Bundles assets using Vite
- Output directory: `dist/`

**Preview**
```bash
npm run preview
```
- Serves production build locally for testing

---

## 9. Future Enhancements

### 9.1 Planned Features
- [ ] Pan functionality (drag without selection)
- [ ] Zoom out / reset view
- [ ] Iteration count adjustment
- [ ] Color scheme selection
- [ ] Export image functionality
- [ ] Performance optimizations (Web Workers, GPU acceleration)

### 9.2 Potential Improvements
- [ ] Undo/redo zoom history
- [ ] Bookmark favorite locations
- [ ] Share zoom coordinates
- [ ] Animation/recording capabilities

---

## 10. Notes

- This specification document is a living document and will be updated as the project evolves
- All requirements should be traceable to implementation
- Breaking changes to specifications should be documented with version history

---

## 11. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Initial | Initial specification structure |
| 1.1 | Current | Added zoom functionality and improved structure |
