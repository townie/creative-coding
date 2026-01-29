# Sketch Wrapper Documentation

The sketch wrapper (`sketchWrapper.js`) enables running traditional p5.js global-mode sketches within the portfolio's module-based architecture. It creates a bridge between p5.js's global mode and instance mode.

## How It Works

1. **Fetch**: Loads the sketch source code via `fetch()`
2. **Detect Mode**: Checks if sketch uses ES6 imports/exports
3. **Execute**: Either imports as module or injects as global script
4. **Proxy Globals**: Sets up window properties that proxy to the p5 instance
5. **Cleanup**: Restores original window state when sketch is removed

## Supported p5.js API

The wrapper supports the complete p5.js API as documented at https://p5js.org/reference/

### Structure
| Function | Description |
|----------|-------------|
| `setup` | Called once at start |
| `draw` | Called every frame |
| `preload` | Called before setup for loading assets |
| `windowResized` | Called when window is resized |
| `remove` | Remove the sketch |
| `disableFriendlyErrors` | Disable p5's error messages |

### Environment
| Function/Property | Description |
|-------------------|-------------|
| `cursor`, `noCursor` | Set/hide cursor |
| `frameRate`, `getTargetFrameRate` | Control frame rate |
| `fullscreen` | Toggle fullscreen |
| `pixelDensity`, `displayDensity` | Pixel density control |
| `getURL`, `getURLPath`, `getURLParams` | URL utilities |
| `describe`, `describeElement` | Accessibility descriptions |
| `gridOutput`, `textOutput` | Accessibility outputs |
| `width`, `height` | Canvas dimensions |
| `windowWidth`, `windowHeight` | Window dimensions |
| `displayWidth`, `displayHeight` | Display dimensions |
| `frameCount` | Number of frames drawn |
| `deltaTime` | Time since last frame |
| `focused` | Whether window has focus |

### Events - Mouse
| Function/Property | Description |
|-------------------|-------------|
| `mousePressed`, `mouseReleased` | Mouse button events |
| `mouseMoved`, `mouseDragged` | Mouse movement events |
| `mouseClicked`, `doubleClicked` | Click events |
| `mouseWheel` | Scroll wheel event |
| `requestPointerLock`, `exitPointerLock` | Pointer lock API |
| `mouseX`, `mouseY` | Current mouse position |
| `pmouseX`, `pmouseY` | Previous mouse position |
| `movedX`, `movedY` | Mouse movement delta |
| `winMouseX`, `winMouseY` | Window-relative mouse position |
| `pwinMouseX`, `pwinMouseY` | Previous window-relative position |
| `mouseButton` | Which button is pressed |
| `mouseIsPressed` | Whether mouse is pressed |

### Events - Keyboard
| Function/Property | Description |
|-------------------|-------------|
| `keyPressed`, `keyReleased`, `keyTyped` | Keyboard events |
| `keyIsDown` | Check if specific key is pressed |
| `key` | Most recent key pressed |
| `keyCode` | Numeric key code |
| `keyIsPressed` | Whether any key is pressed |

### Events - Touch
| Function/Property | Description |
|-------------------|-------------|
| `touchStarted`, `touchMoved`, `touchEnded` | Touch events |
| `touches` | Array of current touches |

### Events - Device/Acceleration
| Function/Property | Description |
|-------------------|-------------|
| `deviceMoved`, `deviceShaken`, `deviceTurned` | Device motion events |
| `setMoveThreshold`, `setShakeThreshold` | Motion sensitivity |
| `accelerationX/Y/Z` | Device acceleration |
| `pAccelerationX/Y/Z` | Previous acceleration |
| `rotationX/Y/Z` | Device rotation |
| `pRotationX/Y/Z` | Previous rotation |
| `turnAxis` | Axis of rotation |
| `deviceOrientation` | Current orientation |

### Rendering
| Function/Property | Description |
|-------------------|-------------|
| `createCanvas` | Create the drawing canvas |
| `resizeCanvas` | Resize the canvas |
| `noCanvas` | Don't create a canvas |
| `createGraphics` | Create off-screen graphics buffer |
| `createFramebuffer` | Create WebGL framebuffer |
| `blendMode` | Set pixel blending mode |
| `setAttributes` | Set WebGL attributes |
| `clearDepth` | Clear WebGL depth buffer |
| `drawingContext` | Native canvas 2D/WebGL context |
| `canvas` | The canvas element |

### Color - Setting
| Function | Description |
|----------|-------------|
| `background` | Set background color |
| `clear` | Clear the canvas |
| `fill`, `noFill` | Set/disable fill color |
| `stroke`, `noStroke` | Set/disable stroke color |
| `colorMode` | Set color mode (RGB/HSB/HSL) |
| `erase`, `noErase` | Eraser mode |
| `beginClip`, `endClip`, `clip` | Clipping masks |

### Color - Creating & Reading
| Function | Description |
|----------|-------------|
| `color` | Create a color |
| `lerpColor` | Interpolate between colors |
| `paletteLerp` | Interpolate across palette |
| `red`, `green`, `blue`, `alpha` | Extract RGB components |
| `hue`, `saturation`, `brightness`, `lightness` | Extract HSB/HSL components |

### Shape - 2D Primitives
| Function | Description |
|----------|-------------|
| `arc` | Draw an arc |
| `ellipse`, `circle` | Draw ellipse/circle |
| `line` | Draw a line |
| `point` | Draw a point |
| `quad` | Draw a quadrilateral |
| `rect`, `square` | Draw rectangle/square |
| `triangle` | Draw a triangle |

### Shape - Curves
| Function | Description |
|----------|-------------|
| `bezier` | Draw Bezier curve |
| `bezierDetail`, `bezierPoint`, `bezierTangent` | Bezier utilities |
| `curve` | Draw Catmull-Rom curve |
| `curveDetail`, `curvePoint`, `curveTangent`, `curveTightness` | Curve utilities |

### Shape - 3D Primitives (WebGL)
| Function | Description |
|----------|-------------|
| `plane`, `box`, `sphere` | Basic 3D shapes |
| `cylinder`, `cone`, `ellipsoid`, `torus` | More 3D shapes |
| `beginGeometry`, `endGeometry` | Custom geometry |
| `buildGeometry`, `freeGeometry` | Geometry management |

### Shape - Vertex
| Function | Description |
|----------|-------------|
| `beginShape`, `endShape` | Start/end custom shape |
| `vertex` | Add vertex to shape |
| `beginContour`, `endContour` | Create holes in shapes |
| `curveVertex`, `bezierVertex`, `quadraticVertex` | Curved vertices |
| `normal` | Set vertex normal (WebGL) |

### Shape - Attributes
| Function | Description |
|----------|-------------|
| `strokeWeight` | Set line thickness |
| `strokeCap`, `strokeJoin` | Line end/join styles |
| `ellipseMode`, `rectMode` | Shape drawing modes |
| `smooth`, `noSmooth` | Anti-aliasing |

### Transform
| Function | Description |
|----------|-------------|
| `push`, `pop` | Save/restore transform state |
| `translate` | Move origin |
| `rotate`, `rotateX`, `rotateY`, `rotateZ` | Rotate |
| `scale` | Scale |
| `shearX`, `shearY` | Shear |
| `applyMatrix`, `resetMatrix` | Matrix operations |

### Math - Calculation
| Function | Description |
|----------|-------------|
| `abs`, `ceil`, `floor`, `round` | Rounding |
| `constrain`, `map`, `norm`, `lerp` | Value mapping |
| `dist`, `mag` | Distance/magnitude |
| `min`, `max` | Min/max values |
| `pow`, `sq`, `sqrt`, `exp`, `log` | Powers/roots |
| `fract` | Fractional part |

### Math - Trigonometry
| Function | Description |
|----------|-------------|
| `sin`, `cos`, `tan` | Trig functions |
| `asin`, `acos`, `atan`, `atan2` | Inverse trig |
| `degrees`, `radians` | Angle conversion |
| `angleMode` | Set angle mode |

### Math - Random & Noise
| Function | Description |
|----------|-------------|
| `random`, `randomGaussian`, `randomSeed` | Random numbers |
| `noise`, `noiseDetail`, `noiseSeed` | Perlin noise |

### Math - Vector
| Function | Description |
|----------|-------------|
| `createVector` | Create a p5.Vector |

### Typography
| Function | Description |
|----------|-------------|
| `loadFont` | Load a font file |
| `text` | Draw text |
| `textFont`, `textSize`, `textStyle` | Text appearance |
| `textAlign`, `textLeading`, `textWrap` | Text layout |
| `textWidth`, `textAscent`, `textDescent` | Text metrics |

### Image
| Function | Description |
|----------|-------------|
| `loadImage` | Load an image |
| `image` | Draw an image |
| `imageMode` | Image drawing mode |
| `tint`, `noTint` | Image tinting |
| `saveGif` | Save as animated GIF |
| `createImage` | Create empty image |
| `saveCanvas`, `saveFrames` | Save canvas |

### Image - Pixels
| Function/Property | Description |
|-------------------|-------------|
| `loadPixels`, `updatePixels` | Access pixel data |
| `get`, `set` | Get/set pixel color |
| `pixels` | Pixel array |
| `blend`, `copy` | Pixel operations |
| `filter` | Apply image filter |

### IO - Input
| Function | Description |
|----------|-------------|
| `loadJSON`, `loadStrings`, `loadTable`, `loadXML`, `loadBytes` | Load data files |
| `httpGet`, `httpPost`, `httpDo` | HTTP requests |

### IO - Output
| Function | Description |
|----------|-------------|
| `save`, `saveJSON`, `saveStrings`, `saveTable` | Save data |
| `createWriter` | Create file writer |

### IO - Time & Date
| Function | Description |
|----------|-------------|
| `millis` | Milliseconds since start |
| `second`, `minute`, `hour` | Current time |
| `day`, `month`, `year` | Current date |

### Data - LocalStorage
| Function | Description |
|----------|-------------|
| `storeItem`, `getItem`, `removeItem`, `clearStorage` | Browser storage |

### Data - Dictionary
| Function | Description |
|----------|-------------|
| `createStringDict`, `createNumberDict` | Create dictionaries |

### Data - Array Functions
| Function | Description |
|----------|-------------|
| `append`, `concat` | Add to array |
| `arrayCopy`, `subset` | Copy array |
| `reverse`, `shuffle`, `sort` | Reorder array |
| `shorten`, `splice` | Remove from array |

### Data - String Functions
| Function | Description |
|----------|-------------|
| `join`, `split`, `splitTokens` | String splitting/joining |
| `match`, `matchAll` | Pattern matching |
| `trim` | Remove whitespace |
| `nf`, `nfc`, `nfp`, `nfs` | Number formatting |

### Data - Conversion
| Function | Description |
|----------|-------------|
| `int`, `float`, `str`, `boolean` | Type conversion |
| `byte`, `char`, `unchar` | Character conversion |
| `hex`, `unhex` | Hexadecimal conversion |

### Loop Control
| Function | Description |
|----------|-------------|
| `loop`, `noLoop` | Start/stop draw loop |
| `redraw` | Redraw once |
| `isLooping` | Check if looping |

### DOM
| Function | Description |
|----------|-------------|
| `createDiv`, `createP`, `createSpan` | Create text elements |
| `createImg`, `createA` | Create media/links |
| `createSlider`, `createButton`, `createCheckbox` | Create inputs |
| `createSelect`, `createRadio`, `createInput` | More inputs |
| `createFileInput`, `createColorPicker` | File/color inputs |
| `createVideo`, `createAudio`, `createCapture` | Media elements |
| `createElement` | Generic element |
| `select`, `selectAll` | Query DOM |
| `removeElements` | Remove all created elements |
| `changed`, `input` | Event handlers |

### Constants

#### Math
`PI`, `HALF_PI`, `QUARTER_PI`, `TWO_PI`, `TAU`, `DEGREES`, `RADIANS`

#### Shape Modes
`CORNER`, `CORNERS`, `CENTER`, `RADIUS`

#### Text Alignment
`LEFT`, `RIGHT`, `CENTER`, `TOP`, `BOTTOM`, `BASELINE`

#### beginShape Modes
`POINTS`, `LINES`, `LINE_STRIP`, `LINE_LOOP`, `TRIANGLES`, `TRIANGLE_FAN`, `TRIANGLE_STRIP`, `QUADS`, `QUAD_STRIP`, `TESS`

#### endShape Modes
`CLOSE`, `OPEN`

#### Arc Modes
`CHORD`, `PIE`

#### Stroke Styles
`PROJECT`, `SQUARE`, `ROUND`, `BEVEL`, `MITER`

#### Color Modes
`RGB`, `HSB`, `HSL`

#### Blend Modes
`BLEND`, `ADD`, `DARKEST`, `LIGHTEST`, `DIFFERENCE`, `SUBTRACT`, `EXCLUSION`, `MULTIPLY`, `SCREEN`, `REPLACE`, `OVERLAY`, `HARD_LIGHT`, `SOFT_LIGHT`, `DODGE`, `BURN`, `REMOVE`

#### Filter Modes
`THRESHOLD`, `GRAY`, `OPAQUE`, `INVERT`, `POSTERIZE`, `BLUR`, `ERODE`, `DILATE`

#### Text Styles
`NORMAL`, `ITALIC`, `BOLD`, `BOLDITALIC`

#### Orientation
`LANDSCAPE`, `PORTRAIT`

#### Renderers
`P2D`, `WEBGL`

#### Cursor Types
`ARROW`, `CROSS`, `HAND`, `MOVE`, `TEXT`, `WAIT`

#### Image/Texture Modes
`CLAMP`, `REPEAT`, `MIRROR`, `IMAGE`, `NEAREST`, `LINEAR`

#### Other
`GRID`, `AXES`, `AUTO`

---

## Security Considerations

### Trust Model

**This wrapper executes arbitrary JavaScript code.** It is designed for trusted, first-party sketches only.

### Threat Assessment

| Severity | Issue | Mitigation |
|----------|-------|------------|
| **CRITICAL** | Code injection via script element | Only load sketches from trusted sources |
| **CRITICAL** | Dynamic import of sketch modules | Path validation enforced |
| **HIGH** | Full DOM access from sketches | By design - sketches need DOM for p5.dom |
| **HIGH** | Network access from sketches | By design - sketches may load assets |
| **MEDIUM** | Global namespace pollution | Cleanup on remove() with try-finally |
| **LOW** | Requires `unsafe-inline` CSP | Inherent to script injection approach |

### Security Measures Implemented

1. **Path Validation**: Only paths matching `/src/sketches/*.js` are allowed
2. **Response Validation**: HTTP response status is checked before processing
3. **Cleanup Guarantee**: try-finally ensures globals are restored even on error
4. **Documentation**: Security warnings in source code comments

### Never Do

- Allow user-uploaded sketch code without sandboxing
- Serve sketches over HTTP (use HTTPS only)
- Allow external URLs in sketchPath
- Trust sketch code from untrusted sources

### If Untrusted Code Support Is Needed

A complete architectural redesign would be required:

```javascript
// Example: iframe sandbox approach
const sandbox = document.createElement('iframe');
sandbox.sandbox = 'allow-scripts'; // NO allow-same-origin
sandbox.srcdoc = `
  <html>
    <script src="https://cdn.jsdelivr.net/npm/p5"></script>
    <script>${sketchCode}</script>
  </html>
`;
```

---

## Usage

Sketches are automatically discovered from `src/sketches/*/`:

```
src/sketches/
├── my-sketch/
│   ├── meta.json    # Required: { "name": "Display Name" }
│   └── sketch.js    # Required: p5.js global mode sketch
```

### meta.json Format

```json
{
  "name": "My Sketch",
  "description": "Optional description",
  "thumbnail": "/path/to/thumbnail.png",
  "tags": ["generative", "interactive"]
}
```

### sketch.js Format

Standard p5.js global mode:

```javascript
function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100);
}

function draw() {
  background(0);
  // Drawing code...
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
```

---

## Changelog

### 2026-01-29 - Comprehensive API Update

**Added Functions (70+):**
- Environment: `describe`, `describeElement`, `gridOutput`, `textOutput`, `getTargetFrameRate`
- Events: `requestPointerLock`, `exitPointerLock`, `keyIsDown`, device motion events
- Rendering: `blendMode`, `createFramebuffer`, `setAttributes`, `clearDepth`
- Color: `erase`, `noErase`, `beginClip`, `endClip`, `clip`, `lightness`, `paletteLerp`
- Shape 2D: `square`
- Shape Curves: All bezier/curve utility functions
- Shape 3D: All 3D primitives and geometry functions
- Shape Vertex: `beginContour`, `endContour`, `normal`
- Shape Attributes: `smooth`, `noSmooth`
- Transform: `rotateX`, `rotateY`, `rotateZ`
- Math: `fract`
- Typography: `loadFont`
- Image: `saveGif`, `blend`, `copy`, `filter`
- IO: All load/save functions, HTTP functions
- Data: LocalStorage, Dictionary, Array, String, Conversion functions
- DOM: `createColorPicker`, `removeElements`, `changed`, `input`

**Added Properties (25+):**
- Mouse: `winMouseX`, `winMouseY`, `pwinMouseX`, `pwinMouseY`
- Touch: `touches`
- Device: All acceleration and rotation properties
- Environment: `webglVersion`
- Pixels: `pixels` (moved to dynamic props)

**Added Constants (20+):**
- Shape: `TESS`
- Blend: `REMOVE`
- Filter: `THRESHOLD`, `GRAY`, `OPAQUE`, `INVERT`, `POSTERIZE`, `BLUR`, `ERODE`, `DILATE`
- Renderer: `WEBGL`, `P2D`
- Image: `CLAMP`, `REPEAT`, `MIRROR`, `IMAGE`, `NEAREST`, `LINEAR`
- Other: `AUTO`

**Security Fixes:**
- Added path validation for sketch loading
- Added HTTP response status checking
- Added try-finally for cleanup guarantee
- Added security documentation
- Added fallback for constants on p5 class
