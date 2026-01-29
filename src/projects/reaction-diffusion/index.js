// Gray-Scott Reaction Diffusion
// Based on Karl Sims' work

const params = {
  dA: 1.0,      // Diffusion rate A
  dB: 0.5,      // Diffusion rate B
  feed: 0.055,  // Feed rate
  kill: 0.062,  // Kill rate
  speed: 1      // Simulation speed
};

// Presets
const presets = {
  default: { feed: 0.055, kill: 0.062 },
  mitosis: { feed: 0.0367, kill: 0.0649 },
  coral: { feed: 0.0545, kill: 0.062 },
  maze: { feed: 0.029, kill: 0.057 },
  holes: { feed: 0.039, kill: 0.058 },
  chaos: { feed: 0.026, kill: 0.051 },
  spots: { feed: 0.014, kill: 0.054 }
};

let grid, next;

function laplacian(grid, x, y, width, height) {
  let sumA = 0, sumB = 0;
  const weights = [
    [0.05, 0.2, 0.05],
    [0.2, -1, 0.2],
    [0.05, 0.2, 0.05]
  ];

  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const xi = (x + i + width) % width;
      const yj = (y + j + height) % height;
      const cell = grid[xi][yj];
      sumA += cell.a * weights[i + 1][j + 1];
      sumB += cell.b * weights[i + 1][j + 1];
    }
  }

  return { a: sumA, b: sumB };
}

export function init(container) {
  // Create controls
  const controls = document.createElement("div");
  controls.className = "project-controls";
  controls.innerHTML = `
    <div class="control-group">
      <label>Preset</label>
      <select id="preset">
        ${Object.keys(presets).map(k => `<option value="${k}">${k}</option>`).join("")}
      </select>
    </div>
    <div class="control-group">
      <label>Feed: <span id="feed-val">${params.feed}</span></label>
      <input type="range" id="feed" min="0.01" max="0.1" step="0.001" value="${params.feed}">
    </div>
    <div class="control-group">
      <label>Kill: <span id="kill-val">${params.kill}</span></label>
      <input type="range" id="kill" min="0.03" max="0.07" step="0.001" value="${params.kill}">
    </div>
    <div class="control-group">
      <label>Speed: <span id="speed-val">${params.speed}</span></label>
      <input type="range" id="speed" min="1" max="10" value="${params.speed}">
    </div>
    <button id="reset">Reset</button>
  `;
  container.appendChild(controls);

  // Wire up controls
  const presetSelect = controls.querySelector("#preset");
  const feedSlider = controls.querySelector("#feed");
  const killSlider = controls.querySelector("#kill");
  const speedSlider = controls.querySelector("#speed");
  const resetBtn = controls.querySelector("#reset");

  presetSelect.onchange = (e) => {
    const preset = presets[e.target.value];
    params.feed = preset.feed;
    params.kill = preset.kill;
    feedSlider.value = preset.feed;
    killSlider.value = preset.kill;
    controls.querySelector("#feed-val").textContent = preset.feed.toFixed(3);
    controls.querySelector("#kill-val").textContent = preset.kill.toFixed(3);
  };

  feedSlider.oninput = (e) => {
    params.feed = parseFloat(e.target.value);
    controls.querySelector("#feed-val").textContent = params.feed.toFixed(3);
  };

  killSlider.oninput = (e) => {
    params.kill = parseFloat(e.target.value);
    controls.querySelector("#kill-val").textContent = params.kill.toFixed(3);
  };

  speedSlider.oninput = (e) => {
    params.speed = parseInt(e.target.value);
    controls.querySelector("#speed-val").textContent = params.speed;
  };

  let p5Inst;

  resetBtn.onclick = () => {
    initGrid(p5Inst);
  };

  function initGrid(p) {
    const scale = 2;
    const w = Math.floor(p.width / scale);
    const h = Math.floor(p.height / scale);

    grid = [];
    next = [];

    for (let x = 0; x < w; x++) {
      grid[x] = [];
      next[x] = [];
      for (let y = 0; y < h; y++) {
        grid[x][y] = { a: 1, b: 0 };
        next[x][y] = { a: 1, b: 0 };
      }
    }

    // Seed some B in the center
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);
    const seedSize = 20;

    for (let x = cx - seedSize; x < cx + seedSize; x++) {
      for (let y = cy - seedSize; y < cy + seedSize; y++) {
        if (x >= 0 && x < w && y >= 0 && y < h) {
          grid[x][y].b = 1;
        }
      }
    }
  }

  // Create p5 instance
  p5Inst = new p5((p) => {
    let pg;
    const scale = 2;

    p.setup = () => {
      const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
      canvas.parent(container);
      p.pixelDensity(1);
      pg = p.createGraphics(Math.floor(p.width / scale), Math.floor(p.height / scale));
      pg.pixelDensity(1);
      initGrid(p);
    };

    p.draw = () => {
      const w = pg.width;
      const h = pg.height;

      // Simulation steps
      for (let s = 0; s < params.speed; s++) {
        for (let x = 0; x < w; x++) {
          for (let y = 0; y < h; y++) {
            const cell = grid[x][y];
            const lap = laplacian(grid, x, y, w, h);

            const a = cell.a;
            const b = cell.b;
            const reaction = a * b * b;

            next[x][y].a = a + (params.dA * lap.a - reaction + params.feed * (1 - a));
            next[x][y].b = b + (params.dB * lap.b + reaction - (params.kill + params.feed) * b);

            next[x][y].a = p.constrain(next[x][y].a, 0, 1);
            next[x][y].b = p.constrain(next[x][y].b, 0, 1);
          }
        }

        // Swap grids
        [grid, next] = [next, grid];
      }

      // Render
      pg.loadPixels();
      for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
          const idx = (x + y * w) * 4;
          const c = Math.floor((grid[x][y].a - grid[x][y].b) * 255);
          pg.pixels[idx] = c;
          pg.pixels[idx + 1] = c;
          pg.pixels[idx + 2] = c;
          pg.pixels[idx + 3] = 255;
        }
      }
      pg.updatePixels();

      p.image(pg, 0, 0, p.width, p.height);
    };

    p.mousePressed = () => {
      // Add B chemical where mouse is pressed
      const w = pg.width;
      const h = pg.height;
      const mx = Math.floor(p.mouseX / scale);
      const my = Math.floor(p.mouseY / scale);
      const radius = 10;

      for (let x = mx - radius; x < mx + radius; x++) {
        for (let y = my - radius; y < my + radius; y++) {
          if (x >= 0 && x < w && y >= 0 && y < h) {
            const d = p.dist(mx, my, x, y);
            if (d < radius) {
              grid[x][y].b = 1;
            }
          }
        }
      }
    };

    p.mouseDragged = p.mousePressed;

    p.windowResized = () => {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
      pg = p.createGraphics(Math.floor(p.width / scale), Math.floor(p.height / scale));
      pg.pixelDensity(1);
      initGrid(p);
    };
  });

  return p5Inst;
}
