// Sketch wrapper for global-to-instance mode conversion
// Handles raw p5.js sketches by temporarily setting up global context
//
// SECURITY NOTE: This module executes arbitrary JavaScript code.
// Only load sketches from trusted sources. See security audit for details.
// - Never allow user-uploaded sketch code without sandboxing
// - Always serve over HTTPS
// - Validate sketchPath against allowlist in production

/**
 * Load and run a raw p5.js sketch in instance mode
 * @param {string} sketchPath - Path to the sketch.js file
 * @param {HTMLElement} container - Container element for the canvas
 * @returns {Promise<p5>} - The p5 instance
 */
export async function loadSketch(sketchPath, container) {
  // Security: Validate path format (basic check)
  // Dev: /src/sketches/slug/sketch.js, Prod: /sketches/slug/sketch.js
  const validDevPath = sketchPath.startsWith('/src/sketches/') && sketchPath.endsWith('.js');
  const validProdPath = sketchPath.startsWith('/sketches/') && sketchPath.endsWith('.js');
  if (!validDevPath && !validProdPath) {
    throw new Error('Invalid sketch path format');
  }

  // Fetch the sketch source
  const response = await fetch(sketchPath);
  if (!response.ok) {
    throw new Error(`Failed to load sketch: ${response.status}`);
  }
  const source = await response.text();

  // Check if it has ES imports (module mode)
  const hasImports = /^\s*(import|export)\s/m.test(source);

  if (hasImports) {
    return loadModuleSketch(sketchPath, container);
  } else {
    return loadGlobalSketch(source, container);
  }
}

/**
 * Load a module-style sketch that exports init(container) or setup/draw/etc
 */
async function loadModuleSketch(sketchPath, container) {
  const module = await import(/* @vite-ignore */ sketchPath);

  // If module exports init(container), use that pattern (returns p5 instance)
  if (module.init) {
    return module.init(container);
  }

  // Otherwise, expect exported setup/draw/etc functions
  return new p5((p) => {
    if (module.setup) {
      p.setup = () => module.setup.call(p);
    }
    if (module.draw) {
      p.draw = () => module.draw.call(p);
    }
    if (module.windowResized) {
      p.windowResized = () => module.windowResized.call(p);
    }

    const eventHandlers = [
      'preload', 'mousePressed', 'mouseReleased', 'mouseMoved', 'mouseDragged',
      'mouseClicked', 'doubleClicked', 'mouseWheel', 'keyPressed', 'keyReleased',
      'keyTyped', 'touchStarted', 'touchMoved', 'touchEnded',
      'deviceMoved', 'deviceShaken', 'deviceTurned'
    ];

    for (const handler of eventHandlers) {
      if (module[handler]) {
        p[handler] = () => module[handler].call(p);
      }
    }
  }, container);
}

/**
 * Load a global-mode sketch by executing it with p5 globals on window
 */
function loadGlobalSketch(source, container) {
  // Store any existing globals we might overwrite
  const savedGlobals = {};

  // All p5 properties/methods we need to expose globally
  // Reference: https://p5js.org/reference/
  const p5Globals = [
    // === STRUCTURE ===
    'setup', 'draw', 'preload', 'windowResized', 'remove',
    'disableFriendlyErrors',

    // === ENVIRONMENT ===
    'cursor', 'noCursor', 'frameRate', 'getTargetFrameRate',
    'fullscreen', 'pixelDensity', 'displayDensity',
    'getURL', 'getURLPath', 'getURLParams',
    'describe', 'describeElement', 'gridOutput', 'textOutput',

    // === EVENTS - Mouse ===
    'mousePressed', 'mouseReleased', 'mouseMoved', 'mouseDragged',
    'mouseClicked', 'doubleClicked', 'mouseWheel',
    'requestPointerLock', 'exitPointerLock',

    // === EVENTS - Keyboard ===
    'keyPressed', 'keyReleased', 'keyTyped', 'keyIsDown',

    // === EVENTS - Touch ===
    'touchStarted', 'touchMoved', 'touchEnded',

    // === EVENTS - Acceleration ===
    'deviceMoved', 'deviceShaken', 'deviceTurned',
    'setMoveThreshold', 'setShakeThreshold',

    // === RENDERING ===
    'createCanvas', 'resizeCanvas', 'noCanvas',
    'createGraphics', 'createFramebuffer',
    'blendMode', 'setAttributes', 'clearDepth',

    // === COLOR - Setting ===
    'background', 'clear', 'fill', 'noFill', 'stroke', 'noStroke',
    'colorMode', 'erase', 'noErase',
    'beginClip', 'endClip', 'clip',

    // === COLOR - Creating & Reading ===
    'color', 'lerpColor', 'paletteLerp',
    'red', 'green', 'blue', 'alpha',
    'hue', 'saturation', 'brightness', 'lightness',

    // === SHAPE - 2D Primitives ===
    'arc', 'ellipse', 'circle', 'line', 'point',
    'quad', 'rect', 'square', 'triangle',

    // === SHAPE - Curves ===
    'bezier', 'bezierDetail', 'bezierPoint', 'bezierTangent',
    'curve', 'curveDetail', 'curvePoint', 'curveTangent', 'curveTightness',

    // === SHAPE - 3D Primitives ===
    'plane', 'box', 'sphere', 'cylinder', 'cone', 'ellipsoid', 'torus',
    'beginGeometry', 'endGeometry', 'buildGeometry', 'freeGeometry',

    // === 3D - Lights ===
    'ambientLight', 'directionalLight', 'pointLight', 'spotLight',
    'lights', 'lightFalloff', 'noLights',

    // === 3D - Materials ===
    'ambientMaterial', 'emissiveMaterial', 'specularMaterial', 'normalMaterial',
    'shininess', 'metalness',
    'texture', 'textureMode', 'textureWrap',

    // === 3D - Camera ===
    'camera', 'perspective', 'ortho', 'frustum',
    'createCamera', 'setCamera', 'orbitControl',

    // === SHAPE - Vertex ===
    'beginShape', 'endShape', 'vertex',
    'beginContour', 'endContour',
    'curveVertex', 'bezierVertex', 'quadraticVertex', 'normal',

    // === SHAPE - Attributes ===
    'strokeWeight', 'strokeCap', 'strokeJoin',
    'ellipseMode', 'rectMode',
    'smooth', 'noSmooth',

    // === TRANSFORM ===
    'push', 'pop',
    'translate', 'rotate', 'rotateX', 'rotateY', 'rotateZ',
    'scale', 'shearX', 'shearY',
    'applyMatrix', 'resetMatrix',

    // === MATH - Calculation ===
    'abs', 'ceil', 'constrain', 'dist', 'exp', 'floor', 'fract',
    'lerp', 'log', 'mag', 'map', 'max', 'min',
    'norm', 'pow', 'round', 'sq', 'sqrt',

    // === MATH - Trigonometry ===
    'acos', 'asin', 'atan', 'atan2', 'cos', 'sin', 'tan',
    'degrees', 'radians', 'angleMode',

    // === MATH - Random ===
    'random', 'randomGaussian', 'randomSeed',

    // === MATH - Noise ===
    'noise', 'noiseDetail', 'noiseSeed',

    // === MATH - Vector ===
    'createVector',

    // === TYPOGRAPHY ===
    'loadFont', 'text', 'textFont', 'textSize', 'textWidth',
    'textAscent', 'textDescent', 'textAlign', 'textLeading',
    'textStyle', 'textWrap',

    // === IMAGE - Loading & Displaying ===
    'loadImage', 'image', 'imageMode',
    'tint', 'noTint', 'saveGif',

    // === IMAGE - Pixels ===
    'loadPixels', 'updatePixels', 'get', 'set',
    'blend', 'copy', 'filter',
    'createImage', 'saveCanvas', 'saveFrames',

    // === IO - Input ===
    'loadJSON', 'loadStrings', 'loadTable', 'loadXML', 'loadBytes',
    'httpGet', 'httpPost', 'httpDo',

    // === IO - Output ===
    'save', 'saveJSON', 'saveStrings', 'saveTable',
    'createWriter',

    // === IO - Time & Date ===
    'day', 'hour', 'minute', 'month', 'second', 'year', 'millis',

    // === DATA - LocalStorage ===
    'storeItem', 'getItem', 'removeItem', 'clearStorage',

    // === DATA - Dictionary ===
    'createStringDict', 'createNumberDict',

    // === DATA - Array Functions ===
    'append', 'arrayCopy', 'concat', 'reverse', 'shorten',
    'shuffle', 'sort', 'splice', 'subset',

    // === DATA - String Functions ===
    'join', 'match', 'matchAll', 'split', 'splitTokens', 'trim',
    'nf', 'nfc', 'nfp', 'nfs',

    // === DATA - Conversion ===
    'boolean', 'byte', 'char', 'float', 'hex', 'int', 'str', 'unchar', 'unhex',

    // === LOOP CONTROL ===
    'loop', 'noLoop', 'redraw', 'isLooping',

    // === STRUCTURE/UTILITY ===
    'print',

    // === DOM ===
    'createDiv', 'createP', 'createSpan', 'createImg', 'createA',
    'createSlider', 'createButton', 'createCheckbox', 'createSelect',
    'createRadio', 'createInput', 'createFileInput', 'createColorPicker',
    'createVideo', 'createAudio', 'createCapture',
    'createElement', 'select', 'selectAll', 'removeElements',
    'changed', 'input',
  ];

  // Properties that change dynamically and need getters
  const dynamicProps = [
    // Mouse
    'mouseX', 'mouseY', 'pmouseX', 'pmouseY', 'movedX', 'movedY',
    'winMouseX', 'winMouseY', 'pwinMouseX', 'pwinMouseY',
    'mouseButton', 'mouseIsPressed',

    // Keyboard
    'key', 'keyCode', 'keyIsPressed',

    // Touch
    'touches',

    // Acceleration/Device
    'accelerationX', 'accelerationY', 'accelerationZ',
    'pAccelerationX', 'pAccelerationY', 'pAccelerationZ',
    'rotationX', 'rotationY', 'rotationZ',
    'pRotationX', 'pRotationY', 'pRotationZ',
    'turnAxis', 'deviceOrientation',

    // Environment
    'width', 'height',
    'displayWidth', 'displayHeight',
    'windowWidth', 'windowHeight',
    'frameCount', 'deltaTime', 'focused',
    'webglVersion',

    // Canvas/Context
    'drawingContext', 'canvas',

    // Pixels
    'pixels',
  ];

  // Constants
  const constants = [
    // Math constants
    'PI', 'HALF_PI', 'QUARTER_PI', 'TWO_PI', 'TAU',
    'DEGREES', 'RADIANS',

    // Shape modes
    'CORNER', 'CORNERS', 'CENTER', 'RADIUS',

    // Text alignment
    'RIGHT', 'LEFT', 'TOP', 'BOTTOM', 'BASELINE',

    // beginShape modes
    'POINTS', 'LINES', 'LINE_STRIP', 'LINE_LOOP',
    'TRIANGLES', 'TRIANGLE_FAN', 'TRIANGLE_STRIP',
    'QUADS', 'QUAD_STRIP', 'TESS',

    // endShape modes
    'CLOSE', 'OPEN',

    // Arc modes
    'CHORD', 'PIE',

    // Stroke cap/join
    'PROJECT', 'SQUARE', 'ROUND', 'BEVEL', 'MITER',

    // Color modes
    'RGB', 'HSB', 'HSL',

    // Blend modes
    'BLEND', 'ADD', 'DARKEST', 'LIGHTEST',
    'DIFFERENCE', 'SUBTRACT', 'EXCLUSION', 'MULTIPLY',
    'SCREEN', 'REPLACE', 'OVERLAY', 'HARD_LIGHT', 'SOFT_LIGHT',
    'DODGE', 'BURN',
    'REMOVE',

    // Filter modes
    'THRESHOLD', 'GRAY', 'OPAQUE', 'INVERT', 'POSTERIZE', 'BLUR', 'ERODE', 'DILATE',

    // Text style
    'NORMAL', 'ITALIC', 'BOLD', 'BOLDITALIC',

    // Device orientation
    'LANDSCAPE', 'PORTRAIT',

    // WebGL
    'WEBGL', 'P2D',
    'GRID', 'AXES',

    // Cursor types
    'ARROW', 'CROSS', 'HAND', 'MOVE', 'TEXT', 'WAIT',

    // Image modes
    'CLAMP', 'REPEAT', 'MIRROR',

    // Texture modes
    'IMAGE', 'NEAREST', 'LINEAR',

    // Audio
    'AUTO',
  ];

  let p5Instance = null;

  // Create p5 instance
  p5Instance = new p5((p) => {
    // Set up globals before executing sketch code
    const setupGlobals = () => {
      // Save and set methods
      for (const name of p5Globals) {
        if (name in window) savedGlobals[name] = window[name];
        if (typeof p[name] === 'function') {
          window[name] = p[name].bind(p);
        }
      }

      // Set up dynamic properties with getters
      for (const name of dynamicProps) {
        if (name in window) savedGlobals[name] = window[name];
        Object.defineProperty(window, name, {
          get: () => p[name],
          set: (v) => { p[name] = v; },
          configurable: true
        });
      }

      // Set constants
      for (const name of constants) {
        if (name in window) savedGlobals[name] = window[name];
        if (p[name] !== undefined) {
          window[name] = p[name];
        } else if (p5[name] !== undefined) {
          // Some constants are on p5 class, not instance
          window[name] = p5[name];
        }
      }
    };

    // p5 lifecycle functions that sketches may define
    const lifecycleFuncs = [
      'setup', 'draw', 'preload', 'windowResized',
      'mousePressed', 'mouseReleased', 'mouseMoved', 'mouseDragged',
      'mouseClicked', 'doubleClicked', 'mouseWheel',
      'keyPressed', 'keyReleased', 'keyTyped',
      'touchStarted', 'touchMoved', 'touchEnded',
      'deviceMoved', 'deviceShaken', 'deviceTurned'
    ];

    // Execute the sketch source code via script element
    // Wrap in IIFE to prevent const/let declarations from polluting global scope
    // and causing "already declared" errors when switching sketches
    const executeSketch = () => {
      try {
        const script = document.createElement('script');
        // Wrap source in IIFE so sketch-specific const/let/var don't become globals
        // After sketch code runs, explicitly expose any defined lifecycle functions to window
        const lifecycleExports = lifecycleFuncs.map(fn =>
          `if (typeof ${fn} === 'function') window.${fn} = ${fn};`
        ).join('\n');
        script.textContent = `(function() {\n${source}\n${lifecycleExports}\n})();`;
        document.head.appendChild(script);
        document.head.removeChild(script);
      } catch (e) {
        console.error('Error executing sketch:', e);
      }
    };

    // Set up globals and execute sketch
    setupGlobals();
    executeSketch();

    for (const name of lifecycleFuncs) {
      if (typeof window[name] === 'function') {
        p[name] = window[name];
      }
    }
  }, container);

  // Override remove to clean up globals
  const originalRemove = p5Instance.remove.bind(p5Instance);
  p5Instance.remove = () => {
    // Restore saved globals in try-finally to ensure cleanup
    try {
      for (const name of [...p5Globals, ...dynamicProps, ...constants]) {
        if (name in savedGlobals) {
          try {
            Object.defineProperty(window, name, {
              value: savedGlobals[name],
              writable: true,
              configurable: true
            });
          } catch (e) {
            window[name] = savedGlobals[name];
          }
        } else {
          try {
            delete window[name];
          } catch (e) {
            // Some properties can't be deleted
          }
        }
      }
    } finally {
      originalRemove();
    }
  };

  return p5Instance;
}
