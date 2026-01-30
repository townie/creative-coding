/**
 * QUANTUM LENS: ADVANCED CAMERA CONTROL
 *
 * Features:
 * - Dynamic Camera Focus: Follow Atom A, Atom B, Midpoint, or Fixed World Origin.
 * - Decoupled Rotation: Free-look orbit control regardless of tracking target.
 * - "Close Up" macro for inspection.
 * - Responsive UI and Canvas.
 * - Strict Screen-Space Projection with Z-sorting.
 */

// --- GLOBAL STATE ---

let atoms = [];
let ui = {};

// Camera State System
const CAM = {
  pos: { x: 0, y: 0, z: 0 },       // Current world position of camera focus
  targetPos: { x: 0, y: 0, z: 0 }, // Where the camera wants to be
  rot: { x: -0.5, y: -0.6 },       // Pitch, Yaw
  zoom: 1.0,
  targetZoom: 1.0,
  focusMode: 'MID', // 'A', 'B', 'MID', 'WORLD'
  damping: 0.1
};

let draggedAtom = null;
let isMouseOverUI = false;

// Physics Constants
const PHYS = {
  nucleonRadius: 3.5,
  electronRadius: 1.2,
  shellBaseDist: 40,
  shellGrowthPower: 1.2,
  baseRepulsion: 4000,
  electronSpeed: 0.05
};

const ELEMENTS = [
  { n: 1, s: "H", name: "Hydrogen", mass: 1.008 },
  { n: 2, s: "He", name: "Helium", mass: 4.0026 },
  { n: 3, s: "Li", name: "Lithium", mass: 6.94 },
  { n: 6, s: "C", name: "Carbon", mass: 12.011 },
  { n: 8, s: "O", name: "Oxygen", mass: 15.999 },
  { n: 10, s: "Ne", name: "Neon", mass: 20.180 },
  { n: 26, s: "Fe", name: "Iron", mass: 55.845 },
  { n: 79, s: "Au", name: "Gold", mass: 196.97 }
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  textFont('Courier New');

  createUI();
  resetSimulation(0, 0); // Start with H-H
}

// --- UI SYSTEM ---

function createUI() {
  let container = createDiv('');
  container.style('position', 'absolute');
  container.style('bottom', '30px');
  container.style('left', '30px');
  container.style('width', '280px');
  container.style('font-family', 'Courier New');
  container.style('pointer-events', 'none');
  container.style('background', 'rgba(5, 10, 15, 0.9)');
  container.style('padding', '15px');
  container.style('border', '1px solid #0ff');
  container.style('border-radius', '4px');
  container.style('backdrop-filter', 'blur(5px)');
  container.style('box-shadow', '0 0 20px rgba(0, 255, 255, 0.1)');

  // Track UI mouse interaction to prevent click-through
  container.mouseOver(() => isMouseOverUI = true);
  container.mouseOut(() => isMouseOverUI = false);

  let title = createP('QUANTUM LENS v2.0');
  title.parent(container);
  title.style('margin', '0 0 10px 0');
  title.style('color', '#0ff');
  title.style('font-weight', 'bold');
  title.style('letter-spacing', '2px');
  title.style('border-bottom', '1px solid #0ff');

  // --- CAMERA CONTROLS ---
  createLabel(container, 'CAMERA TRACKING');
  let btnGroup = createDiv('').parent(container).style('display', 'flex').style('gap', '5px').style('margin-bottom', '5px');

  createBtn(btnGroup, 'ATOM A', () => setFocus('A'));
  createBtn(btnGroup, 'ATOM B', () => setFocus('B'));
  createBtn(btnGroup, 'BOTH', () => setFocus('MID'));

  let btnGroup2 = createDiv('').parent(container).style('display', 'flex').style('gap', '5px');
  createBtn(btnGroup2, 'FIX ROOT', () => setFocus('WORLD'));
  createBtn(btnGroup2, 'CLOSE UP', () => { setFocus('MID'); CAM.targetZoom = 2.5; });
  createBtn(btnGroup2, 'RESET', () => { setFocus('MID'); CAM.targetZoom = 1.0; CAM.rot = {x:-0.5, y:-0.6}; });

  createLabel(container, 'ZOOM LEVEL');
  ui.zoomSlider = createSlider(0.2, 4.0, 1.0, 0.01);
  styleInput(ui.zoomSlider);
  ui.zoomSlider.parent(container);
  ui.zoomSlider.input(() => CAM.targetZoom = ui.zoomSlider.value());

  createDiv('').parent(container).style('margin', '15px 0').style('border-top', '1px dashed #333');

  // --- ATOM CONTROLS ---
  createLabel(container, 'ELEMENT A');
  ui.sliderA = createSlider(0, ELEMENTS.length - 1, 0, 1);
  styleInput(ui.sliderA);
  setupSlider(ui.sliderA, container, 0);

  createLabel(container, 'ELEMENT B');
  ui.sliderB = createSlider(0, ELEMENTS.length - 1, 0, 1);
  styleInput(ui.sliderB);
  setupSlider(ui.sliderB, container, 1);
}

function createLabel(parent, txt) {
  let l = createP(txt);
  l.parent(parent);
  l.style('margin', '10px 0 4px 0');
  l.style('font-size', '10px');
  l.style('color', '#666');
  l.style('font-weight', 'bold');
}

function createBtn(parent, txt, callback) {
  let b = createButton(txt);
  b.parent(parent);
  b.style('flex', '1');
  b.style('background', '#000');
  b.style('color', '#0ff');
  b.style('border', '1px solid #333');
  b.style('padding', '5px 2px');
  b.style('cursor', 'pointer');

  b.style('font-size', '10px');
  b.style('transition', 'all 0.2s');
  b.mouseOver(() => b.style('background', '#003333'));
  b.mouseOut(() => b.style('background', '#000'));
  b.mousePressed(callback);
}

function styleInput(elt) {
  elt.style('width', '100%');
  elt.style('pointer-events', 'auto');
  elt.style('accent-color', '#0ff');
  elt.style('outline', 'none');
}

function setupSlider(slider, parent, atomIdx) {
  slider.parent(parent);
  slider.input(() => updateAtomType(atomIdx, slider.value()));
}

// --- LOGIC & SIMULATION ---

function setFocus(mode) {
  CAM.focusMode = mode;
}

function resetSimulation(idxA, idxB) {
  atoms = [];
  atoms.push(new Atom(ELEMENTS[idxA], createVector(-120, 0, 0)));
  atoms.push(new Atom(ELEMENTS[idxB], createVector(120, 0, 0)));
}

function updateAtomType(index, elementIdx) {
  let oldPos = atoms[index].pos.copy();
  atoms[index] = new Atom(ELEMENTS[elementIdx], oldPos);
}

function draw() {
  background(5, 5, 8);

  // 1. Update Camera Logic
  updateCamera();

  translate(width/2, height/2);

  // 2. Physics
  calculateForces();

  // 3. Render Pipeline
  drawGrid();

  let renderList = [];

  atoms.forEach(atom => {
    atom.update();
    // Project atom center for sorting
    let p = projectPoint(atom.pos.x, atom.pos.y, atom.pos.z);
    atom.screenPos = p;

    atom.particles.forEach(part => {
      part.calculateProjection(atom.pos);
      renderList.push(part);
    });
  });

  // Sort particles by Z-depth (Painter's Algorithm)
  renderList.sort((a, b) => a.z - b.z);

  drawFluxLines();

  // Draw Particles
  renderList.forEach(p => p.draw());

  // Overlays
  atoms.forEach(atom => atom.drawSelection());

  // HUD (Screen Space)
  resetMatrix();
  drawHUD();
}

function updateCamera() {
  // Determine Target Position based on Focus Mode
  let t = createVector(0,0,0);

  if (atoms.length >= 2) {
    if (CAM.focusMode === 'A') {
      t = atoms[0].pos.copy();
    } else if (CAM.focusMode === 'B') {
      t = atoms[1].pos.copy();
    } else if (CAM.focusMode === 'MID') {
      t = p5.Vector.lerp(atoms[0].pos, atoms[1].pos, 0.5);
    } else if (CAM.focusMode === 'WORLD') {
      t = createVector(0, 0, 0);
    }
  }

  CAM.targetPos = t;

  // Smooth Interpolation
  CAM.pos.x = lerp(CAM.pos.x, CAM.targetPos.x, CAM.damping);
  CAM.pos.y = lerp(CAM.pos.y, CAM.targetPos.y, CAM.damping);
  CAM.pos.z = lerp(CAM.pos.z, CAM.targetPos.z, CAM.damping);

  CAM.zoom = lerp(CAM.zoom, CAM.targetZoom, CAM.damping);
}

// --- PHYSICS ---

function calculateForces() {
  let a1 = atoms[0];
  let a2 = atoms[1];

  let dir = p5.Vector.sub(a2.pos, a1.pos);
  let distVal = dir.mag();
  dir.normalize();

  let r1 = a1.radius;
  let r2 = a2.radius;
  let sigma = (r1 + r2) * 0.9;
  let epsilon = PHYS.baseRepulsion;

  let force = 0;

  if (distVal < sigma * 2.5) {
    let r = Math.max(distVal, 1);
    let sr = sigma / r;
    let sr6 = Math.pow(sr, 6);
    let sr12 = sr6 * sr6;
    force = (epsilon / r) * (2 * sr12 - sr6);
    force = constrain(force, -200, 200);

    if (distVal < (r1 + r2) * 0.2) force += 500;
  } else {
    force = -0.05; // Weak gravity
  }

  let fVec = dir.mult(force);

  if (draggedAtom !== a1) a1.vel.add(p5.Vector.div(fVec, a1.data.mass).mult(-1));
  if (draggedAtom !== a2) a2.vel.add(p5.Vector.div(fVec, a2.data.mass));

  let stress = map(Math.abs(force), 0, 50, 0, 10, true);
  a1.stress = lerp(a1.stress, stress, 0.2);
  a2.stress = lerp(a2.stress, stress, 0.2);

  a1.polarize(a2.pos, distVal, r1 + r2);
  a2.polarize(a1.pos, distVal, r1 + r2);
}

// --- VISUALIZATION ---

function projectPoint(x, y, z) {
  // 1. Translate world relative to camera position
  let rx = x - CAM.pos.x;
  let ry = y - CAM.pos.y;
  let rz = z - CAM.pos.z;

  // 2. Rotate World around Camera (Pitch/Yaw)
  // Rotate Y (Yaw)
  let x1 = rx * cos(CAM.rot.y) - rz * sin(CAM.rot.y);
  let z1 = rx * sin(CAM.rot.y) + rz * cos(CAM.rot.y);

  // Rotate X (Pitch)
  let y2 = ry * cos(CAM.rot.x) - z1 * sin(CAM.rot.x);
  let z2 = ry * sin(CAM.rot.x) + z1 * cos(CAM.rot.x);

  // 3. Perspective Projection
  let fov = 800 * CAM.zoom;
  let depth = fov - z2;

  // Clip behind camera
  if (depth < 1) depth = 1;

  let scale = fov / depth;

  return {
    x: x1 * scale,
    y: y2 * scale,
    z: z2,
    s: scale
  };
}

function drawGrid() {
  stroke(220, 20, 20, 20);
  strokeWeight(1);
  let size = 1500;
  let step = 250;
  let yLevel = 400;

  // Grid lines are static in world space, but projected relative to camera
  for (let i = -size; i <= size; i += step) {
    let p1 = projectPoint(i, yLevel, -size);
    let p2 = projectPoint(i, yLevel, size);
    if (p1.s > 0 && p2.s > 0) line(p1.x, p1.y, p2.x, p2.y);

    let p3 = projectPoint(-size, yLevel, i);
    let p4 = projectPoint(size, yLevel, i);
    if (p3.s > 0 && p4.s > 0) line(p3.x, p3.y, p4.x, p4.y);
  }
}

function drawFluxLines() {
  let a1 = atoms[0];
  let a2 = atoms[1];
  let centerDist = p5.Vector.dist(a1.pos, a2.pos);
  let interactionDist = (a1.radius + a2.radius) * 1.5;

  if (centerDist > interactionDist * 1.5) return;

  let intensity = map(centerDist, interactionDist * 0.5, interactionDist * 1.5, 1, 0, true);
  if (intensity <= 0) return;

  noFill();
  strokeWeight(2);

  let lines = 8;
  for (let i = 0; i < lines; i++) {
    let t = i / lines;
    let angle = t * TWO_PI + (frameCount * 0.02);

    let startOff = createVector(0, a1.radius * 0.8, 0);
    rotateVector(startOff, angle, 0);

    let dir = p5.Vector.sub(a2.pos, a1.pos).normalize();
    let up = createVector(0, 1, 0);
    let right = p5.Vector.cross(up, dir).normalize();
    let newUp = p5.Vector.cross(dir, right).normalize();

    let worldOff = p5.Vector.add(p5.Vector.mult(right, startOff.x), p5.Vector.mult(newUp, startOff.y));

    let pStart = p5.Vector.add(a1.pos, worldOff);
    let pEnd = p5.Vector.sub(a2.pos, worldOff);

    let mid = p5.Vector.lerp(a1.pos, a2.pos, 0.5);
    let bulge = worldOff.copy().normalize().mult(centerDist * 0.3);
    let cp = p5.Vector.add(mid, bulge);

    let ps = projectPoint(pStart.x, pStart.y, pStart.z);
    let pe = projectPoint(pEnd.x, pEnd.y, pEnd.z);
    let pc = projectPoint(cp.x, cp.y, cp.z);

    if (ps.s > 0 && pe.s > 0) {
      let alpha = intensity * 40;
      let hue = map(a1.stress + a2.stress, 0, 10, 200, 0);
      stroke(hue, 80, 100, alpha);
      bezier(ps.x, ps.y, pc.x, pc.y, pc.x, pc.y, pe.x, pe.y);
    }
  }
}

function rotateVector(v, angle, axis) {
  let y = v.y * cos(angle) - v.z * sin(angle);
  let z = v.y * sin(angle) + v.z * cos(angle);
  v.y = y; v.z = z;
}

function drawHUD() {
  translate(width/2, height/2); // Center HUD

  atoms.forEach(a => {
    // HUD needs to follow the atom. Atom has already been projected in draw loop
    let p = a.screenPos;

    if (p && p.s > 0) {
      let yOff = -a.radius * p.s - 30;

      textAlign(CENTER);
      textSize(Math.max(10, 14 * p.s));
      fill(255);
      noStroke();
      text(a.data.s, p.x, p.y + yOff);

      textSize(Math.max(8, 10 * p.s));
      fill(200);
      text(a.data.name, p.x, p.y + yOff + 12 * p.s);

      if (a.stress > 0.1) {
        let w = 40 * p.s;
        let h = 3 * p.s;
        fill(0, 100, 50);
        rect(p.x - w/2, p.y + yOff + 20*p.s, w, h);
        fill(0, 100, 100);
        rect(p.x - w/2, p.y + yOff + 20*p.s, w * Math.min(a.stress/10, 1), h);
      }
    }
  });
}

// --- CLASSES ---

class Atom {
  constructor(data, pos) {
    this.data = data;
    this.pos = pos;
    this.vel = createVector(0, 0, 0);
    this.stress = 0;
    this.particles = [];
    this.radius = 0;
    this.screenPos = null;
    this.buildStructure();
  }

  buildStructure() {
    let nucleonCount = Math.round(this.data.mass);
    let phi = (Math.sqrt(5) + 1) / 2;
    let nucRadius = Math.pow(nucleonCount, 1/3) * PHYS.nucleonRadius * 1.2;

    for (let i = 0; i < nucleonCount; i++) {
      let z = 1 - (2 * i) / (nucleonCount - 1 || 1);
      let r = Math.sqrt(1 - z * z);
      let theta = 2 * PI * i * phi;
      let pos = createVector(r * Math.cos(theta), r * Math.sin(theta), z).mult(nucRadius);
      pos.add(p5.Vector.random3D().mult(0.5));
      let type = (i < this.data.n) ? 'PROTON' : 'NEUTRON';
      this.particles.push(new Nucleon(pos, type));
    }

    let electronsRemaining = this.data.n;
    let shellLevel = 1;
    while (electronsRemaining > 0) {
      let capacity = 2 * shellLevel * shellLevel;
      let count = Math.min(electronsRemaining, capacity);
      let shellR = PHYS.shellBaseDist * Math.pow(shellLevel, PHYS.shellGrowthPower);
      this.radius = shellR;

      for (let i = 0; i < count; i++) {
        let plane = {
          inc: random(PI),
          node: random(TWO_PI),
          speed: (PHYS.electronSpeed * 10) / Math.sqrt(shellLevel) * (random() > 0.5 ? 1 : -1)
        };
        this.particles.push(new Electron(shellR, (TWO_PI / count) * i, plane));
      }
      electronsRemaining -= count;
      shellLevel++;
    }
  }

  polarize(targetPos, dist, interactionRange) {
    if (dist > interactionRange) return;
    let pushDir = p5.Vector.sub(this.pos, targetPos).normalize();
    let strength = map(dist, 0, interactionRange, 20, 0, true);
    this.particles.forEach(p => {
      if (p instanceof Electron) p.offset.lerp(p5.Vector.mult(pushDir, strength), 0.1);
    });
  }

  update() {
    if (draggedAtom === this) {
      this.vel.mult(0);
    } else {
      this.vel.mult(0.9);
      this.pos.add(this.vel);
    }
    this.stress *= 0.95;
    this.particles.forEach(p => p.update(this.stress));
  }

  drawSelection() {
    if (draggedAtom === this && this.screenPos && this.screenPos.s > 0) {
      noFill();
      stroke(0, 0, 100);
      strokeWeight(1);
      drawingContext.setLineDash([4, 4]);
      let r = this.radius * this.screenPos.s * 2.2;
      r = Math.max(r, 20);
      ellipse(this.screenPos.x, this.screenPos.y, r);
      drawingContext.setLineDash([]);
    }
  }
}

class Particle {
  constructor() {
    this.localPos = createVector(0,0,0);
    this.screenX = 0; this.screenY = 0; this.z = 0; this.scale = 0; this.drawSize = 0;
  }
  calculateProjection(atomPos) {
    let worldPos = p5.Vector.add(atomPos, this.localPos);
    let p = projectPoint(worldPos.x, worldPos.y, worldPos.z);
    this.screenX = p.x; this.screenY = p.y; this.z = p.z; this.scale = p.s;
    this.drawSize = Math.max((this.radius * 2) * p.s, 1.0);
  }
  update() {}
  draw() {}
}

class Nucleon extends Particle {
  constructor(pos, type) {
    super();
    this.basePos = pos;
    this.localPos = pos.copy();
    this.type = type;
    this.radius = PHYS.nucleonRadius;
    this.noiseOffset = random(1000);
  }
  update(stress) {
    let amp = 0.2 + (stress * 0.5);
    this.noiseOffset += 0.1;
    let dx = (noise(this.noiseOffset) - 0.5) * amp;
    let dy = (noise(this.noiseOffset + 100) - 0.5) * amp;
    let dz = (noise(this.noiseOffset + 200) - 0.5) * amp;
    this.localPos.set(this.basePos.x + dx, this.basePos.y + dy, this.basePos.z + dz);
  }
  draw() {
    if (this.scale <= 0) return;
    noStroke();
    fill(this.type === 'PROTON' ? color(340, 80, 90) : color(200, 10, 80));
    ellipse(this.screenX, this.screenY, this.drawSize);
    if (this.drawSize > 3) {
      fill(255, 100);
      ellipse(this.screenX - this.drawSize*0.2, this.screenY - this.drawSize*0.2, this.drawSize*0.3);
    }
  }
}

class Electron extends Particle {
  constructor(orbitRadius, anomaly, plane) {
    super();
    this.orbitRadius = orbitRadius;
    this.anomaly = anomaly;
    this.plane = plane;
    this.radius = PHYS.electronRadius;
    this.offset = createVector(0,0,0);
  }
  update(stress) {
    this.anomaly += this.plane.speed;
    let x = this.orbitRadius * cos(this.anomaly);
    let y = this.orbitRadius * sin(this.anomaly);
    let z = 0;

    let y1 = y * cos(this.plane.inc) - z * sin(this.plane.inc);
    let z1 = y * sin(this.plane.inc) + z * cos(this.plane.inc);
    let x2 = x * cos(this.plane.node) - y1 * sin(this.plane.node);
    let y2 = x * sin(this.plane.node) + y1 * cos(this.plane.node);

    this.localPos.set(x2, y2, z1).add(this.offset);
  }
  draw() {
    if (this.scale <= 0) return;
    noStroke();
    fill(180, 80, 100);
    if (this.drawSize > 2) {
      drawingContext.shadowBlur = this.drawSize * 2;
      drawingContext.shadowColor = color(180, 100, 100);
    }
    ellipse(this.screenX, this.screenY, this.drawSize);
    drawingContext.shadowBlur = 0;
  }
}

// --- INPUT HANDLERS ---

function mousePressed() {
  if (isMouseOverUI) return;

  let closest = null;
  let minD = 1000;

  atoms.forEach(a => {
    let p = projectPoint(a.pos.x, a.pos.y, a.pos.z);
    let d = dist(mouseX - width/2, mouseY - height/2, p.x, p.y);
    if (d < Math.max(20, a.radius * p.s) && d < minD) {
      minD = d;
      closest = a;
    }
  });

  draggedAtom = closest;
}

function mouseDragged() {
  if (isMouseOverUI) return;

  if (draggedAtom) {
    // Move Atom
    let dx = (mouseX - pmouseX);
    let dy = (mouseY - pmouseY);
    let speed = 2.0 / CAM.zoom;

    // Move relative to camera view
    let moveX = dx * cos(CAM.rot.y) * speed;
    let moveZ = -dx * sin(CAM.rot.y) * speed;

    draggedAtom.pos.x += moveX;
    draggedAtom.pos.y += dy * speed;
    draggedAtom.pos.z += moveZ;
    draggedAtom.vel.mult(0);
  } else {
    // Rotate Camera (Free Look)
    let sens = 0.005;
    CAM.rot.y += (mouseX - pmouseX) * sens;
    CAM.rot.x += (mouseY - pmouseY) * sens;
    CAM.rot.x = constrain(CAM.rot.x, -PI/2, PI/2);
  }
}

function mouseReleased() {
  draggedAtom = null;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
