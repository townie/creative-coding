// Sketch wrapper for global-to-instance mode conversion
// Handles raw p5.js sketches by temporarily setting up global context

/**
 * Load and run a raw p5.js sketch in instance mode
 * @param {string} sketchPath - Path to the sketch.js file
 * @param {HTMLElement} container - Container element for the canvas
 * @returns {Promise<p5>} - The p5 instance
 */
export async function loadSketch(sketchPath, container) {
  // Fetch the sketch source
  const response = await fetch(sketchPath);
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
 * Load a module-style sketch that exports setup/draw/etc
 */
async function loadModuleSketch(sketchPath, container) {
  const module = await import(/* @vite-ignore */ sketchPath);

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
      'keyTyped', 'touchStarted', 'touchMoved', 'touchEnded'
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
  const p5Globals = [
    // Structure
    'setup', 'draw', 'preload', 'windowResized',
    // Events
    'mousePressed', 'mouseReleased', 'mouseMoved', 'mouseDragged',
    'mouseClicked', 'doubleClicked', 'mouseWheel',
    'keyPressed', 'keyReleased', 'keyTyped',
    'touchStarted', 'touchMoved', 'touchEnded',
    // Canvas
    'createCanvas', 'resizeCanvas', 'noCanvas', 'createGraphics',
    // Drawing
    'background', 'clear', 'fill', 'noFill', 'stroke', 'noStroke',
    'strokeWeight', 'rect', 'ellipse', 'circle', 'line', 'point',
    'triangle', 'quad', 'arc', 'beginShape', 'endShape', 'vertex',
    'curveVertex', 'bezierVertex', 'quadraticVertex', 'bezier', 'curve',
    // Color
    'color', 'lerpColor', 'red', 'green', 'blue', 'alpha', 'hue',
    'saturation', 'brightness', 'colorMode',
    // Transform
    'push', 'pop', 'translate', 'rotate', 'scale', 'shearX', 'shearY',
    'applyMatrix', 'resetMatrix',
    // Math
    'random', 'randomSeed', 'noise', 'noiseSeed', 'noiseDetail',
    'randomGaussian', 'map', 'lerp', 'constrain', 'dist', 'mag',
    'norm', 'sq', 'sqrt', 'pow', 'exp', 'log', 'floor', 'ceil',
    'round', 'abs', 'min', 'max', 'sin', 'cos', 'tan', 'asin',
    'acos', 'atan', 'atan2', 'degrees', 'radians', 'angleMode',
    // Vector
    'createVector',
    // Typography
    'text', 'textFont', 'textSize', 'textWidth', 'textAscent',
    'textDescent', 'textAlign', 'textLeading', 'textStyle', 'textWrap',
    // Image
    'loadImage', 'image', 'tint', 'noTint', 'imageMode', 'createImage',
    'saveCanvas', 'saveFrames', 'loadPixels', 'updatePixels', 'get', 'set', 'pixels',
    // Shape modes
    'rectMode', 'ellipseMode', 'strokeCap', 'strokeJoin',
    // Environment
    'cursor', 'noCursor', 'frameRate', 'fullscreen', 'pixelDensity',
    'displayDensity', 'getURL', 'getURLPath', 'getURLParams',
    // Time
    'day', 'hour', 'minute', 'month', 'second', 'year', 'millis',
    // Loop control
    'loop', 'noLoop', 'redraw', 'isLooping',
    // Structure/properties (these need special handling as they're not methods)
    'print',
  ];

  // Properties that change dynamically and need getters
  const dynamicProps = [
    'mouseX', 'mouseY', 'pmouseX', 'pmouseY', 'movedX', 'movedY',
    'mouseButton', 'mouseIsPressed', 'keyIsPressed', 'key', 'keyCode',
    'width', 'height', 'displayWidth', 'displayHeight',
    'windowWidth', 'windowHeight', 'frameCount', 'deltaTime', 'focused',
  ];

  // Constants
  const constants = [
    'PI', 'HALF_PI', 'QUARTER_PI', 'TWO_PI', 'TAU', 'DEGREES', 'RADIANS',
    'CORNER', 'CORNERS', 'CENTER', 'RADIUS', 'RIGHT', 'LEFT', 'TOP',
    'BOTTOM', 'BASELINE', 'POINTS', 'LINES', 'LINE_STRIP', 'LINE_LOOP',
    'TRIANGLES', 'TRIANGLE_FAN', 'TRIANGLE_STRIP', 'QUADS', 'QUAD_STRIP',
    'CLOSE', 'OPEN', 'CHORD', 'PIE', 'PROJECT', 'SQUARE', 'ROUND',
    'BEVEL', 'MITER', 'RGB', 'HSB', 'HSL', 'BLEND', 'ADD', 'DARKEST',
    'LIGHTEST', 'DIFFERENCE', 'SUBTRACT', 'EXCLUSION', 'MULTIPLY',
    'SCREEN', 'REPLACE', 'OVERLAY', 'HARD_LIGHT', 'SOFT_LIGHT',
    'DODGE', 'BURN', 'NORMAL', 'ITALIC', 'BOLD', 'BOLDITALIC',
    'LANDSCAPE', 'PORTRAIT', 'GRID', 'AXES', 'ARROW', 'CROSS', 'HAND', 'MOVE', 'TEXT', 'WAIT',
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
        }
      }
    };

    // Execute the sketch source code via script element (runs in global scope)
    const executeSketch = () => {
      try {
        const script = document.createElement('script');
        script.textContent = source;
        document.head.appendChild(script);
        document.head.removeChild(script);
      } catch (e) {
        console.error('Error executing sketch:', e);
      }
    };

    // Set up globals and execute sketch
    setupGlobals();
    executeSketch();

    // Now hook up the user-defined functions to the p5 instance
    const lifecycleFuncs = [
      'setup', 'draw', 'preload', 'windowResized',
      'mousePressed', 'mouseReleased', 'mouseMoved', 'mouseDragged',
      'mouseClicked', 'doubleClicked', 'mouseWheel',
      'keyPressed', 'keyReleased', 'keyTyped',
      'touchStarted', 'touchMoved', 'touchEnded'
    ];

    for (const name of lifecycleFuncs) {
      if (typeof window[name] === 'function') {
        p[name] = window[name];
      }
    }
  }, container);

  // Override remove to clean up globals
  const originalRemove = p5Instance.remove.bind(p5Instance);
  p5Instance.remove = () => {
    // Restore saved globals
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
    originalRemove();
  };

  return p5Instance;
}
