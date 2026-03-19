const presets = {
  classic: {
    a: 0.95,
    b: 0.7,
    c: 0.6,
    d: 3.5,
    e: 0.25,
    f: 0.1,
    dt: 0.01,
    stepsPerFrame: 14,
    seed: { x: 0.1, y: 0, z: 0 }
  },
  airy: {
    a: 0.92,
    b: 0.62,
    c: 0.72,
    d: 3.6,
    e: 0.22,
    f: 0.08,
    dt: 0.009,
    stepsPerFrame: 12,
    seed: { x: 0.08, y: 0, z: 0.02 }
  },
  knotted: {
    a: 0.98,
    b: 0.68,
    c: 0.55,
    d: 3.8,
    e: 0.3,
    f: 0.12,
    dt: 0.0085,
    stepsPerFrame: 16,
    seed: { x: 0.12, y: 0.02, z: 0 }
  }
};

const state = {
  preset: "classic",
  maxPoints: 16000,
  fade: 18,
  rotationSpeed: 0.18,
  ...presets.classic
};

function derivatives(x, y, z) {
  return {
    dx: (z - state.b) * x - state.d * y,
    dy: state.d * x + (z - state.b) * y,
    dz:
      state.c +
      state.a * z -
      (z * z * z) / 3 -
      (x * x + y * y) * (1 + state.e * z) +
      state.f * z * x * x * x
  };
}

export function init(container) {
  const controls = document.createElement("div");
  controls.className = "project-controls";
  controls.innerHTML = `
    <div class="control-group">
      <label>Preset</label>
      <select id="preset">
        <option value="classic">Classic</option>
        <option value="airy">Airy</option>
        <option value="knotted">Knotted</option>
      </select>
    </div>
    <div class="control-group">
      <label>Points: <span id="points-val">${state.maxPoints}</span></label>
      <input type="range" id="points" min="3000" max="30000" step="1000" value="${state.maxPoints}">
    </div>
    <div class="control-group">
      <label>Trail Fade: <span id="fade-val">${state.fade}</span></label>
      <input type="range" id="fade" min="4" max="60" step="1" value="${state.fade}">
    </div>
    <div class="control-group">
      <label>Spin: <span id="spin-val">${state.rotationSpeed.toFixed(2)}</span></label>
      <input type="range" id="spin" min="0" max="60" step="1" value="${Math.round(state.rotationSpeed * 100)}">
    </div>
    <button id="reset">Reset Orbit</button>
  `;
  container.appendChild(controls);

  const presetSelect = controls.querySelector("#preset");
  const pointsSlider = controls.querySelector("#points");
  const fadeSlider = controls.querySelector("#fade");
  const spinSlider = controls.querySelector("#spin");
  const resetBtn = controls.querySelector("#reset");
  const pointsValue = controls.querySelector("#points-val");
  const fadeValue = controls.querySelector("#fade-val");
  const spinValue = controls.querySelector("#spin-val");

  const points = [];
  const current = { x: state.seed.x, y: state.seed.y, z: state.seed.z };
  const bounds = {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity
  };

  let renderScale = 16;

  const resetPath = () => {
    points.length = 0;
    current.x = state.seed.x;
    current.y = state.seed.y;
    current.z = state.seed.z;
    bounds.minX = Infinity;
    bounds.maxX = -Infinity;
    bounds.minY = Infinity;
    bounds.maxY = -Infinity;
    bounds.minZ = Infinity;
    bounds.maxZ = -Infinity;
  };

  const trimPoints = () => {
    if (points.length > state.maxPoints) {
      points.splice(0, points.length - state.maxPoints);
    }
  };

  const applyPreset = (key) => {
    const preset = presets[key];
    if (!preset) return;

    state.preset = key;
    state.a = preset.a;
    state.b = preset.b;
    state.c = preset.c;
    state.d = preset.d;
    state.e = preset.e;
    state.f = preset.f;
    state.dt = preset.dt;
    state.stepsPerFrame = preset.stepsPerFrame;
    state.seed = { ...preset.seed };
    resetPath();
  };

  const updateBounds = (x, y, z) => {
    bounds.minX = Math.min(bounds.minX, x);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxY = Math.max(bounds.maxY, y);
    bounds.minZ = Math.min(bounds.minZ, z);
    bounds.maxZ = Math.max(bounds.maxZ, z);
  };

  const stepSystem = () => {
    const { dx, dy, dz } = derivatives(current.x, current.y, current.z);
    current.x += dx * state.dt;
    current.y += dy * state.dt;
    current.z += dz * state.dt;
    points.push({ x: current.x, y: current.y, z: current.z });
    updateBounds(current.x, current.y, current.z);
  };

  presetSelect.onchange = (event) => {
    applyPreset(event.target.value);
  };

  pointsSlider.oninput = (event) => {
    state.maxPoints = parseInt(event.target.value, 10);
    pointsValue.textContent = state.maxPoints;
    trimPoints();
  };

  fadeSlider.oninput = (event) => {
    state.fade = parseInt(event.target.value, 10);
    fadeValue.textContent = state.fade;
  };

  spinSlider.oninput = (event) => {
    state.rotationSpeed = parseInt(event.target.value, 10) / 100;
    spinValue.textContent = state.rotationSpeed.toFixed(2);
  };

  resetBtn.onclick = () => {
    resetPath();
  };

  presetSelect.value = state.preset;

  return new p5((p) => {
    p.setup = () => {
      const canvas = p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);
      canvas.parent(container);
      p.pixelDensity(1);
      p.colorMode(p.HSB, 360, 100, 100, 100);
      resetPath();
    };

    p.draw = () => {
      p.background(225, 35, 7, state.fade);

      for (let i = 0; i < state.stepsPerFrame; i++) {
        stepSystem();
      }
      trimPoints();

      const spanX = bounds.maxX - bounds.minX;
      const spanY = bounds.maxY - bounds.minY;
      const spanZ = bounds.maxZ - bounds.minZ;
      const maxSpan = Math.max(spanX, spanY, spanZ, 1);
      const targetScale = Math.min(p.width, p.height) * 0.28 / maxSpan;
      renderScale = p.lerp(renderScale, targetScale, 0.08);

      p.rotateX(-0.45);
      p.rotateY(p.frameCount * state.rotationSpeed * 0.01);

      p.noFill();
      p.stroke(202, 65, 95, 64);
      p.strokeWeight(1.1);
      p.beginShape();
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        p.vertex(point.x * renderScale, point.y * renderScale, point.z * renderScale);
      }
      p.endShape();

      if (points.length > 0) {
        const point = points[points.length - 1];
        p.push();
        p.translate(point.x * renderScale, point.y * renderScale, point.z * renderScale);
        p.noStroke();
        p.fill(15, 30, 100, 100);
        p.sphere(2.4);
        p.pop();
      }
    };

    p.windowResized = () => {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
    };
  });
}
