/**
 * Tests for sketchWrapper.js
 *
 * These tests verify:
 * 1. Path validation security
 * 2. API completeness against p5.js reference
 * 3. Module detection logic
 * 4. Global setup and cleanup
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read the source file to extract API lists
const wrapperSource = readFileSync(join(__dirname, 'sketchWrapper.js'), 'utf-8');

// Helper to extract array from source
function extractArray(source, name) {
  const regex = new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`);
  const match = source.match(regex);
  if (!match) return [];

  // Extract string literals
  const items = match[1].match(/'([^']+)'/g);
  return items ? items.map(s => s.replace(/'/g, '')) : [];
}

// Extract the API lists from source
const p5Globals = extractArray(wrapperSource, 'p5Globals');
const dynamicProps = extractArray(wrapperSource, 'dynamicProps');
const constants = extractArray(wrapperSource, 'constants');

describe('sketchWrapper', () => {

  describe('Path Validation', () => {
    // Test the regex pattern used for validation
    const validPathPattern = /^\/src\/sketches\/.*\.js$/;

    it('should reject paths not starting with /src/sketches/', () => {
      expect(validPathPattern.test('/other/path/sketch.js')).toBe(false);
      expect(validPathPattern.test('/src/projects/test/sketch.js')).toBe(false);
      expect(validPathPattern.test('src/sketches/test/sketch.js')).toBe(false);
    });

    it('should reject paths not ending with .js', () => {
      expect(validPathPattern.test('/src/sketches/test/sketch.txt')).toBe(false);
      expect(validPathPattern.test('/src/sketches/test/sketch.ts')).toBe(false);
      expect(validPathPattern.test('/src/sketches/test/sketch')).toBe(false);
    });

    it('should accept valid sketch paths', () => {
      expect(validPathPattern.test('/src/sketches/test/sketch.js')).toBe(true);
      expect(validPathPattern.test('/src/sketches/my-sketch/index.js')).toBe(true);
      expect(validPathPattern.test('/src/sketches/fish-evo/sketch.js')).toBe(true);
    });

    it('should validate path format in loadSketch', async () => {
      const { loadSketch } = await import('./sketchWrapper.js');

      await expect(loadSketch('/other/path.js', document.createElement('div')))
        .rejects.toThrow('Invalid sketch path format');

      await expect(loadSketch('/src/sketches/test.txt', document.createElement('div')))
        .rejects.toThrow('Invalid sketch path format');
    });
  });

  describe('Module Detection', () => {
    const hasImportsRegex = /^\s*(import|export)\s/m;

    it('should detect ES6 import statements', () => {
      expect(hasImportsRegex.test('import { foo } from "bar";')).toBe(true);
      expect(hasImportsRegex.test('  import foo from "bar";')).toBe(true);
      expect(hasImportsRegex.test('\nimport foo from "bar";')).toBe(true);
    });

    it('should detect ES6 export statements', () => {
      expect(hasImportsRegex.test('export function foo() {}')).toBe(true);
      expect(hasImportsRegex.test('export default class {}')).toBe(true);
      expect(hasImportsRegex.test('export const x = 1;')).toBe(true);
    });

    it('should not match import/export in middle of line', () => {
      expect(hasImportsRegex.test('// import foo from "bar";')).toBe(false);
      expect(hasImportsRegex.test('const x = "import";')).toBe(false);
      expect(hasImportsRegex.test('/* export */ function foo() {}')).toBe(false);
    });

    it('should not match global mode sketches', () => {
      const globalSketch = `
        function setup() {
          createCanvas(400, 400);
          console.log("import this");
        }
        function draw() {
          background(220);
        }
      `;
      expect(hasImportsRegex.test(globalSketch)).toBe(false);
    });

    it('should match module sketches with leading whitespace', () => {
      const moduleSketch = `
        import { something } from './module.js';
        export function init() {}
      `;
      expect(hasImportsRegex.test(moduleSketch)).toBe(true);
    });
  });

  describe('API Completeness - Structure', () => {
    it('should include all lifecycle functions', () => {
      const required = ['setup', 'draw', 'preload', 'windowResized', 'remove'];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });
  });

  describe('API Completeness - Environment', () => {
    it('should include core environment functions', () => {
      const required = [
        'cursor', 'noCursor', 'frameRate', 'fullscreen',
        'pixelDensity', 'displayDensity'
      ];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });

    it('should include accessibility functions', () => {
      const required = ['describe', 'describeElement', 'gridOutput', 'textOutput'];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });
  });

  describe('API Completeness - Events', () => {
    it('should include all mouse event functions', () => {
      const required = [
        'mousePressed', 'mouseReleased', 'mouseMoved', 'mouseDragged',
        'mouseClicked', 'doubleClicked', 'mouseWheel'
      ];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });

    it('should include all keyboard event functions', () => {
      const required = ['keyPressed', 'keyReleased', 'keyTyped', 'keyIsDown'];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });

    it('should include all touch event functions', () => {
      const required = ['touchStarted', 'touchMoved', 'touchEnded'];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });

    it('should include device motion functions', () => {
      const required = ['deviceMoved', 'deviceShaken', 'deviceTurned'];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });
  });

  describe('API Completeness - Dynamic Properties', () => {
    it('should include all mouse properties', () => {
      const required = [
        'mouseX', 'mouseY', 'pmouseX', 'pmouseY',
        'movedX', 'movedY', 'mouseButton', 'mouseIsPressed',
        'winMouseX', 'winMouseY', 'pwinMouseX', 'pwinMouseY'
      ];
      for (const prop of required) {
        expect(dynamicProps, `Missing: ${prop}`).toContain(prop);
      }
    });

    it('should include keyboard properties', () => {
      const required = ['key', 'keyCode', 'keyIsPressed'];
      for (const prop of required) {
        expect(dynamicProps, `Missing: ${prop}`).toContain(prop);
      }
    });

    it('should include touch properties', () => {
      expect(dynamicProps).toContain('touches');
    });

    it('should include acceleration properties', () => {
      const required = [
        'accelerationX', 'accelerationY', 'accelerationZ',
        'rotationX', 'rotationY', 'rotationZ'
      ];
      for (const prop of required) {
        expect(dynamicProps, `Missing: ${prop}`).toContain(prop);
      }
    });

    it('should include canvas properties', () => {
      const required = ['drawingContext', 'canvas', 'width', 'height'];
      for (const prop of required) {
        expect(dynamicProps, `Missing: ${prop}`).toContain(prop);
      }
    });

    it('should include pixels array', () => {
      expect(dynamicProps).toContain('pixels');
    });
  });

  describe('API Completeness - Shapes', () => {
    it('should include all 2D primitives', () => {
      const required = [
        'arc', 'ellipse', 'circle', 'line', 'point',
        'quad', 'rect', 'square', 'triangle'
      ];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });

    it('should include curve functions', () => {
      const required = [
        'bezier', 'bezierDetail', 'bezierPoint', 'bezierTangent',
        'curve', 'curveDetail', 'curvePoint', 'curveTangent', 'curveTightness'
      ];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });

    it('should include 3D primitives', () => {
      const required = [
        'plane', 'box', 'sphere', 'cylinder', 'cone', 'ellipsoid', 'torus'
      ];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });

    it('should include vertex functions', () => {
      const required = [
        'beginShape', 'endShape', 'vertex',
        'curveVertex', 'bezierVertex', 'quadraticVertex',
        'beginContour', 'endContour', 'normal'
      ];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });

    it('should include shape attribute functions', () => {
      const required = [
        'strokeWeight', 'strokeCap', 'strokeJoin',
        'ellipseMode', 'rectMode', 'smooth', 'noSmooth'
      ];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });
  });

  describe('API Completeness - Color', () => {
    it('should include color setting functions', () => {
      const required = [
        'background', 'clear', 'fill', 'noFill',
        'stroke', 'noStroke', 'colorMode',
        'erase', 'noErase'
      ];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });

    it('should include color creation functions', () => {
      const required = [
        'color', 'lerpColor', 'red', 'green', 'blue', 'alpha',
        'hue', 'saturation', 'brightness', 'lightness'
      ];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });

    it('should include clipping functions', () => {
      const required = ['beginClip', 'endClip', 'clip'];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });
  });

  describe('API Completeness - Transform', () => {
    it('should include all transform functions', () => {
      const required = [
        'push', 'pop', 'translate', 'rotate', 'scale',
        'rotateX', 'rotateY', 'rotateZ',
        'shearX', 'shearY', 'applyMatrix', 'resetMatrix'
      ];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });
  });

  describe('API Completeness - Math', () => {
    it('should include calculation functions', () => {
      const required = [
        'abs', 'ceil', 'constrain', 'dist', 'exp', 'floor',
        'lerp', 'log', 'mag', 'map', 'max', 'min',
        'norm', 'pow', 'round', 'sq', 'sqrt', 'fract'
      ];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });

    it('should include trigonometry functions', () => {
      const required = [
        'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
        'degrees', 'radians', 'angleMode'
      ];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });

    it('should include random/noise functions', () => {
      const required = [
        'random', 'randomGaussian', 'randomSeed',
        'noise', 'noiseDetail', 'noiseSeed'
      ];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });

    it('should include vector creation', () => {
      expect(p5Globals).toContain('createVector');
    });
  });

  describe('API Completeness - Typography', () => {
    it('should include all typography functions', () => {
      const required = [
        'loadFont', 'text', 'textFont', 'textSize', 'textWidth',
        'textAscent', 'textDescent', 'textAlign', 'textLeading',
        'textStyle', 'textWrap'
      ];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });
  });

  describe('API Completeness - Image', () => {
    it('should include image loading/display functions', () => {
      const required = [
        'loadImage', 'image', 'imageMode', 'tint', 'noTint'
      ];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });

    it('should include pixel manipulation functions', () => {
      const required = [
        'loadPixels', 'updatePixels', 'get', 'set',
        'blend', 'copy', 'filter', 'createImage'
      ];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });
  });

  describe('API Completeness - IO', () => {
    it('should include data loading functions', () => {
      const required = [
        'loadJSON', 'loadStrings', 'loadTable', 'loadXML', 'loadBytes'
      ];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });

    it('should include HTTP functions', () => {
      const required = ['httpGet', 'httpPost', 'httpDo'];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });

    it('should include save functions', () => {
      const required = ['save', 'saveJSON', 'saveStrings', 'saveTable'];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });

    it('should include time/date functions', () => {
      const required = ['millis', 'second', 'minute', 'hour', 'day', 'month', 'year'];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });
  });

  describe('API Completeness - Data', () => {
    it('should include localStorage functions', () => {
      const required = ['storeItem', 'getItem', 'removeItem', 'clearStorage'];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });

    it('should include array functions', () => {
      const required = [
        'append', 'arrayCopy', 'concat', 'reverse',
        'shorten', 'shuffle', 'sort', 'splice', 'subset'
      ];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });

    it('should include string functions', () => {
      const required = [
        'join', 'match', 'matchAll', 'split', 'splitTokens', 'trim',
        'nf', 'nfc', 'nfp', 'nfs'
      ];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });

    it('should include conversion functions', () => {
      const required = [
        'boolean', 'byte', 'char', 'float', 'hex', 'int', 'str', 'unchar', 'unhex'
      ];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });
  });

  describe('API Completeness - Rendering', () => {
    it('should include canvas functions', () => {
      const required = [
        'createCanvas', 'resizeCanvas', 'noCanvas',
        'createGraphics', 'createFramebuffer'
      ];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });

    it('should include blend mode', () => {
      expect(p5Globals).toContain('blendMode');
    });
  });

  describe('API Completeness - DOM', () => {
    it('should include element creation functions', () => {
      const required = [
        'createDiv', 'createP', 'createSpan', 'createImg', 'createA',
        'createSlider', 'createButton', 'createCheckbox', 'createSelect',
        'createRadio', 'createInput', 'createFileInput', 'createColorPicker',
        'createVideo', 'createAudio', 'createCapture', 'createElement'
      ];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });

    it('should include DOM query functions', () => {
      const required = ['select', 'selectAll', 'removeElements'];
      for (const fn of required) {
        expect(p5Globals, `Missing: ${fn}`).toContain(fn);
      }
    });
  });

  describe('API Completeness - Constants', () => {
    it('should include math constants', () => {
      const required = ['PI', 'HALF_PI', 'QUARTER_PI', 'TWO_PI', 'TAU'];
      for (const c of required) {
        expect(constants, `Missing: ${c}`).toContain(c);
      }
    });

    it('should include shape mode constants', () => {
      const required = ['CORNER', 'CORNERS', 'CENTER', 'RADIUS'];
      for (const c of required) {
        expect(constants, `Missing: ${c}`).toContain(c);
      }
    });

    it('should include color mode constants', () => {
      const required = ['RGB', 'HSB', 'HSL'];
      for (const c of required) {
        expect(constants, `Missing: ${c}`).toContain(c);
      }
    });

    it('should include blend mode constants', () => {
      const required = [
        'BLEND', 'ADD', 'DARKEST', 'LIGHTEST', 'DIFFERENCE',
        'MULTIPLY', 'SCREEN', 'OVERLAY'
      ];
      for (const c of required) {
        expect(constants, `Missing: ${c}`).toContain(c);
      }
    });

    it('should include filter constants', () => {
      const required = [
        'THRESHOLD', 'GRAY', 'OPAQUE', 'INVERT',
        'POSTERIZE', 'BLUR', 'ERODE', 'DILATE'
      ];
      for (const c of required) {
        expect(constants, `Missing: ${c}`).toContain(c);
      }
    });

    it('should include renderer constants', () => {
      const required = ['P2D', 'WEBGL'];
      for (const c of required) {
        expect(constants, `Missing: ${c}`).toContain(c);
      }
    });

    it('should include beginShape mode constants', () => {
      const required = [
        'POINTS', 'LINES', 'TRIANGLES', 'TRIANGLE_FAN',
        'TRIANGLE_STRIP', 'QUADS', 'QUAD_STRIP'
      ];
      for (const c of required) {
        expect(constants, `Missing: ${c}`).toContain(c);
      }
    });

    it('should include text style constants', () => {
      const required = ['NORMAL', 'ITALIC', 'BOLD', 'BOLDITALIC'];
      for (const c of required) {
        expect(constants, `Missing: ${c}`).toContain(c);
      }
    });

    it('should include alignment constants', () => {
      const required = ['LEFT', 'RIGHT', 'CENTER', 'TOP', 'BOTTOM', 'BASELINE'];
      for (const c of required) {
        expect(constants, `Missing: ${c}`).toContain(c);
      }
    });
  });

  describe('Security', () => {
    it('should not include dangerous property names', () => {
      const dangerous = ['__proto__', 'constructor', 'prototype'];
      const allProps = [...p5Globals, ...dynamicProps, ...constants];

      for (const prop of dangerous) {
        expect(allProps, `Dangerous property found: ${prop}`).not.toContain(prop);
      }
    });

    it('should have cleanup in try-finally', () => {
      // Verify the source has try-finally for cleanup
      expect(wrapperSource).toContain('try {');
      expect(wrapperSource).toContain('} finally {');
      expect(wrapperSource).toContain('originalRemove()');
    });

    it('should validate response status', () => {
      expect(wrapperSource).toContain('response.ok');
      expect(wrapperSource).toContain('Failed to load sketch');
    });

    it('should have security documentation', () => {
      expect(wrapperSource).toContain('SECURITY NOTE');
      expect(wrapperSource).toContain('trusted sources');
    });
  });

  describe('API Statistics', () => {
    it('should have a comprehensive API', () => {
      console.log(`\nAPI Coverage Statistics:`);
      console.log(`  p5Globals: ${p5Globals.length} functions`);
      console.log(`  dynamicProps: ${dynamicProps.length} properties`);
      console.log(`  constants: ${constants.length} constants`);
      console.log(`  Total: ${p5Globals.length + dynamicProps.length + constants.length} items\n`);

      // Minimum thresholds based on p5.js API
      expect(p5Globals.length).toBeGreaterThan(150);
      expect(dynamicProps.length).toBeGreaterThan(25);
      expect(constants.length).toBeGreaterThan(50);
    });
  });
});

describe('Sketch Loading', () => {
  let container;
  let originalFetch;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    originalFetch = global.fetch;
  });

  afterEach(() => {
    document.body.removeChild(container);
    global.fetch = originalFetch;
  });

  it('should handle fetch errors gracefully', async () => {
    const { loadSketch } = await import('./sketchWrapper.js');

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404
    });

    await expect(loadSketch('/src/sketches/missing/sketch.js', container))
      .rejects.toThrow('Failed to load sketch: 404');
  });

  it('should handle network errors', async () => {
    const { loadSketch } = await import('./sketchWrapper.js');

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await expect(loadSketch('/src/sketches/test/sketch.js', container))
      .rejects.toThrow('Network error');
  });
});
