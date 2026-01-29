# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Creative coding portfolio site built with VanJS and p5.js.

## Commands

```bash
npm run dev      # Start dev server (Vite)
npm run build    # Build for production
npm run preview  # Preview production build
```

p5.js is loaded via CDN in index.html, not as an npm dependency.

## Structure

```
src/
├── index.js          # Main app, routing, UI
├── index.css         # Global styles
├── sketches.js       # Single-file quick sketches (inline loading)
└── projects/
    ├── index.js      # Project registry
    └── {name}/       # Multi-file project folders
        └── index.js  # Must export init(container) → p5 instance
```

## Adding a Simple Sketch

Add to `src/sketches.js`:

```js
{
  name: "My Sketch",
  setup: (p) => {
    // p5 setup code
  },
  draw: (p) => {
    // p5 draw code
  }
}
```

Sketches load inline and cycle with arrow keys / spacebar.

## Adding a Complex Project

1. Create folder: `src/projects/my-project/`

2. Create `src/projects/my-project/index.js`:

```js
export function init(container) {
  // Optional: add custom controls
  const controls = document.createElement("div");
  controls.className = "project-controls";
  controls.innerHTML = `<div class="control-group">...</div>`;
  container.appendChild(controls);

  // Create and return p5 instance
  return new p5((p) => {
    p.setup = () => {
      const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
      canvas.parent(container);
    };
    p.draw = () => {
      // draw code
    };
    p.windowResized = () => {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
    };
  });
}
```

3. Register in `src/projects/index.js`:

```js
export const projects = [
  {
    name: "My Project",
    slug: "my-project",           // URL: /project/my-project
    description: "Optional desc",
    thumbnail: "/path/to/img",    // Optional static thumbnail
    load: () => import("./my-project/index.js")
  }
];
```

## Project Controls

Projects can add a control panel using the `.project-controls` class:

```html
<div class="project-controls">
  <div class="control-group">
    <label>Param: <span id="val">0</span></label>
    <input type="range" id="slider" min="0" max="100" value="50">
  </div>
  <button id="reset">Reset</button>
</div>
```

Available control styles: `input[type="range"]`, `select`, `button`

## Navigation

- `Space` / `→` - next sketch
- `←` - previous sketch
- `M` - toggle menu
- `Esc` - close menu / back to sketches (from project)
