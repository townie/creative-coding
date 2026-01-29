# Raw Sketches Support

## Overview

Add support for raw p5.js sketches that can be copy-pasted directly from the p5.js editor, OpenProcessing, or other sources without modification.

## Directory Structure

```
src/
├── projects/           # Complex projects (existing, unchanged)
│   ├── index.js        # Project registry
│   ├── boids/
│   └── reaction-diffusion/
│
└── sketches/           # Raw p5.js sketches (new)
    └── {folder-name}/  # Folder name = URL slug
        ├── meta.json   # Required: metadata
        ├── sketch.js   # Required: main sketch (global mode p5.js)
        ├── preview.png # Optional: thumbnail
        └── *.js        # Optional: supporting modules
```

## meta.json Format

```json
{
  "name": "Display Name",
  "description": "Optional description",
  "thumbnail": "./preview.png",
  "tags": ["tag1", "tag2"]
}
```

Only `name` is required. All other fields are optional.

## URL Scheme

- Projects: `/project/{slug}`
- Sketches: `/sketch/{folder-name}`

## Loading Behavior

### Simple Sketches (no imports)

Raw global-mode p5.js code:

```js
function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  background(0);
  ellipse(mouseX, mouseY, 50);
}
```

The wrapper fetches this as text and executes it in a context where p5 globals are available.

### Module Sketches (has imports)

If the sketch uses ES imports, it must export its functions:

```js
import { Creature } from './creature.js';

export function setup() {
  // ...
}

export function draw() {
  // ...
}
```

The wrapper detects imports and uses dynamic import instead.

## Implementation Files

1. **`src/sketches/index.js`** - Auto-discovery using `import.meta.glob`
2. **`src/sketchWrapper.js`** - Runtime wrapper for global-to-instance conversion
3. **`src/index.js`** - Add `/sketch/:slug` routing, merge into gallery

## Navigation

- No keyboard shortcuts (sketches may use key input)
- UI back button to return to gallery
- Browser back button works naturally

## Migration

Move `src/projects/fish-evo/` to `src/sketches/fish-evo/` and add `meta.json`.
