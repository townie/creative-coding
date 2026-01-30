let particles = [];
let springs = [];
let spider;
let radials = [];
const NUM_RADIALS = 14;
const PHYSICS_ITERATIONS = 5;

// State
let activeDrugs = new Set(); // Stores keys of active drugs
let uiContainer;
let resetButton;

// Drug Profiles
const DRUGS = {
  LSD:      { name: 'LSD',      hue: 280, sat: 90,  desc: 'Wavy, psychedelic, expanded' },
  CAFFEINE: { name: 'Caffeine', hue: 40,  sat: 90,  desc: 'Erratic, jagged, hasty' },
  THC:      { name: 'THC',      hue: 120, sat: 80,  desc: 'Lazy, wide spacing, unfinished' },
  MDMA:     { name: 'MDMA',     hue: 300, sat: 90,  desc: 'Symmetrical, hyper-connected, pulsing' },
  KETAMINE: { name: 'Ketamine', hue: 200, sat: 60,  desc: 'Disassociated, broken structure, floating' },
  NICOTINE: { name: 'Nicotine', hue: 20,  sat: 70,  desc: 'Simple, tight, anxious' },
  CRACK:    { name: 'Crack',    hue: 10,  sat: 85,  desc: 'Manic, torn, erratic gaps' }
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);

  createUI();
  resetSimulation();
}

function createUI() {
  if (uiContainer) uiContainer.remove();

  uiContainer = createDiv('');
  uiContainer.position(20, 20);
  uiContainer.style('display', 'flex');
  uiContainer.style('flex-direction', 'column');
  uiContainer.style('gap', '8px');
  uiContainer.style('font-family', 'sans-serif');
  uiContainer.style('z-index', '100');
  uiContainer.style('user-select', 'none');

  // Reset Button
  let btnReset = createButton('CLEAR WEB');
  styleButton(btnReset, 0, 0, true);
  btnReset.style('margin-bottom', '10px');
  btnReset.style('background', 'rgba(255, 50, 50, 0.4)');
  btnReset.mousePressed(resetSimulation);
  uiContainer.child(btnReset);

  // Normal / Clear Drugs Button
  let btnNormal = createButton('Normal (Reset Drugs)');
  styleButton(btnNormal, 0, 0);
  btnNormal.id('btn-NORMAL');
  btnNormal.mousePressed(() => {
    activeDrugs.clear();
    updateButtonVisuals();
  });
  uiContainer.child(btnNormal);

  // Drug Buttons
  for (let key in DRUGS) {
    let d = DRUGS[key];
    let btn = createButton(d.name);
    btn.id(`btn-${key}`);
    styleButton(btn, d.hue, d.sat);

    btn.mousePressed(() => {
      if (activeDrugs.has(key)) {
        activeDrugs.delete(key);
      } else {
        activeDrugs.add(key);
      }
      updateButtonVisuals();
    });

    uiContainer.child(btn);
  }
  updateButtonVisuals();
}

function styleButton(btn, h, s, isUtility = false) {
  btn.style('padding', '10px 15px');
  btn.style('background', 'rgba(0,0,0,0.6)');
  btn.style('color', 'white');
  btn.style('border', '1px solid #444');
  if (!isUtility) {
    btn.style('border-left', `4px solid hsl(${h}, ${s}%, 50%)`);
  }
  btn.style('cursor', 'pointer');
  btn.style('font-weight', 'bold');
  btn.style('transition', 'all 0.2s ease');
  btn.style('text-align', 'left');
  btn.style('width', '180px');
}

function updateButtonVisuals() {
  // Update Normal Button
  const btnNormal = select('#btn-NORMAL');
  if (activeDrugs.size === 0) {
    btnNormal.style('background', 'rgba(255,255,255,0.2)');
    btnNormal.style('box-shadow', '0 0 8px rgba(255,255,255,0.3)');
  } else {
    btnNormal.style('background', 'rgba(0,0,0,0.6)');
    btnNormal.style('box-shadow', 'none');
  }

  // Update Drug Buttons
  for (let key in DRUGS) {
    let btn = select(`#btn-${key}`);
    let d = DRUGS[key];
    if (activeDrugs.has(key)) {
      btn.style('background', `hsla(${d.hue}, ${d.sat}%, 30%, 0.8)`);
      btn.style('border-left', `4px solid hsl(${d.hue}, ${d.sat}%, 80%)`);
      btn.style('box-shadow', `0 0 10px hsla(${d.hue}, ${d.sat}%, 50%, 0.5)`);
      btn.style('padding-left', '25px'); // Indent effect
    } else {
      btn.style('background', 'rgba(0,0,0,0.6)');
      btn.style('border-left', `4px solid hsl(${d.hue}, ${d.sat}%, 50%)`);
      btn.style('box-shadow', 'none');
      btn.style('padding-left', '15px');
    }
  }
}

function resetSimulation() {
  particles = [];
  springs = [];
  radials = [];

  const cx = width / 2;
  const cy = height / 2;
  const centerNode = new Particle(cx, cy, true);
  particles.push(centerNode);

  // Frame Anchors
  for (let i = 0; i < NUM_RADIALS; i++) {
    const angle = (TWO_PI / NUM_RADIALS) * i;
    const dx = cos(angle);
    const dy = sin(angle);

    let t = Infinity;
    if (dx > 0) t = min(t, (width - cx) / dx);
    else if (dx < 0) t = min(t, -cx / dx);
    if (dy > 0) t = min(t, (height - cy) / dy);
    else if (dy < 0) t = min(t, -cy / dy);

    t *= 0.95;
    const ax = cx + dx * t;
    const ay = cy + dy * t;

    const anchor = new Particle(ax, ay, true);
    particles.push(anchor);
    radials.push([centerNode, anchor]);
  }

  spider = new Spider(centerNode, radials);
}

function draw() {
  // Background trail effect
  background(220, 10, 5, 40);

  // Display active drugs info
  noStroke();
  fill(255);
  textSize(16);
  textAlign(LEFT, TOP);

  let title = "Normal";
  if (activeDrugs.size > 0) {
    title = Array.from(activeDrugs).map(k => DRUGS[k].name).join(" + ");
  }

  text(`Current State: ${title}`, 220, 30);

  // Physics & Logic
  updatePhysics();
  spider.update();
  spider.draw();

  // Draw Web
  drawWeb();

  handleInteraction();
}

function drawWeb() {
  // Dynamic glow color based on active drugs
  let glowHue = 180; // Cyan default
  let glowSat = 80;

  if (activeDrugs.size > 0) {
    // Cycle through active drug hues over time for the glow
    let keys = Array.from(activeDrugs);
    let k = keys[Math.floor(frameCount / 60) % keys.length];
    glowHue = DRUGS[k].hue;
    glowSat = DRUGS[k].sat;
  } else {
    glowSat = 0; // White/Grey glow for normal
  }

  drawingContext.shadowBlur = 4;
  drawingContext.shadowColor = color(glowHue, glowSat, 100, 50);

  beginShape(LINES);
  for (let s of springs) {
    const d = dist(s.p1.pos.x, s.p1.pos.y, s.p2.pos.x, s.p2.pos.y);
    const strain = Math.abs(d - s.length) / s.length;

    // Determine strand color
    let h = 0, sat = 0, bri = 90;

    if (activeDrugs.size > 0) {
      // Spatial color blending based on position + active drugs
      let keys = Array.from(activeDrugs);
      // Use position to pick which drug controls this strand's color mostly
      let idx = Math.floor((s.p1.pos.x + s.p1.pos.y) * 0.01 + frameCount * 0.01) % keys.length;
      if (idx < 0) idx += keys.length;
      let drugKey = keys[idx];

      h = DRUGS[drugKey].hue;
      sat = DRUGS[drugKey].sat;

      if (activeDrugs.has('LSD')) {
        h = (h + frameCount * 2) % 360;
      }
    }

    if (strain > 0.4) {
        stroke(0, 80, 100, 90); // Red stress
        strokeWeight(1.5);
    } else {
        stroke(h, sat, bri, 70);
        strokeWeight(1);
    }

    vertex(s.p1.pos.x, s.p1.pos.y);
    vertex(s.p2.pos.x, s.p2.pos.y);
  }
  endShape();

  drawingContext.shadowBlur = 0;
}

function handleInteraction() {
  if (mouseIsPressed || dist(mouseX, mouseY, pmouseX, pmouseY) > 5) {
    const mousePos = createVector(mouseX, mouseY);
    for (let p of particles) {
      if (p.pinned) continue;
      const d = p5.Vector.dist(mousePos, p.pos);
      if (d < 150) {
        const force = p5.Vector.sub(p.pos, mousePos).normalize().mult((150 - d) * 0.08);
        p.pos.add(force);
      }
    }
  }
}

function updatePhysics() {
  // Combined Physics Parameters
  let gravity = 0.03;
  let jitterMag = 0;

  if (activeDrugs.has('THC')) gravity += 0.05;
  if (activeDrugs.has('KETAMINE')) gravity -= 0.025; // Float

  if (activeDrugs.has('CAFFEINE')) jitterMag += 0.5;
  if (activeDrugs.has('CRACK')) jitterMag += 1.5;

  for (let p of particles) {
    if (p.pinned) continue;
    const velocity = p5.Vector.sub(p.pos, p.oldPos).mult(0.97);
    p.oldPos.set(p.pos);
    p.pos.add(velocity);
    p.pos.add(createVector(0, gravity));

    // Apply Jitter
    if (jitterMag > 0 && frameCount % 2 === 0) {
        p.pos.add(p5.Vector.random2D().mult(jitterMag));
    }
  }

  for (let i = 0; i < PHYSICS_ITERATIONS; i++) {
    for (let s of springs) {
      const dx = s.p2.pos.x - s.p1.pos.x;
      const dy = s.p2.pos.y - s.p1.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) continue;

      const diff = s.length - dist;
      const percent = (diff / dist) / 2;
      const offsetX = dx * percent;
      const offsetY = dy * percent;

      if (!s.p1.pinned) {
        s.p1.pos.x -= offsetX;
        s.p1.pos.y -= offsetY;
      }
      if (!s.p2.pinned) {
        s.p2.pos.x += offsetX;
        s.p2.pos.y += offsetY;
      }
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  createUI();
  resetSimulation();
}

// --- Classes ---

class Particle {
  constructor(x, y, pinned = false) {
    this.pos = createVector(x, y);
    this.oldPos = createVector(x, y);
    this.pinned = pinned;
  }
}

class Spring {
  constructor(p1, p2, length = null) {
    this.p1 = p1;
    this.p2 = p2;
    this.length = length || p5.Vector.dist(p1.pos, p2.pos);

    // Initial looseness modifier based on active drugs at creation time
    if (activeDrugs.has('MDMA')) this.length *= 1.05;
    if (activeDrugs.has('THC')) this.length *= 1.1;
    if (activeDrugs.has('NICOTINE')) this.length *= 0.9;
  }
}

class Spider {
  constructor(centerNode, radialsRef) {
    this.radials = radialsRef;
    this.centerNode = centerNode;
    this.pos = createVector(0, 0);
    this.state = 'ENTER';
    this.supportIndex = 0;
    this.supportPhase = 'OUT';

    this.angle = 0;
    this.radius = 20;
    this.maxRadius = Math.max(width, height) * 0.6;
    this.lastSector = 0;
    this.active = true;
    this.baseSpeed = 15;
  }

  update() {
    if (!this.active) return;

    // Calculate current speed based on drugs
    let currentSpeed = this.baseSpeed;
    if (activeDrugs.has('CAFFEINE')) currentSpeed *= 2.0;
    if (activeDrugs.has('CRACK')) currentSpeed *= 3.0;
    if (activeDrugs.has('THC')) currentSpeed *= 0.6;
    if (activeDrugs.has('KETAMINE')) currentSpeed *= 0.4;

    if (this.state === 'ENTER') {
      this.moveTowards(this.centerNode.pos, currentSpeed);
      if (this.pos.dist(this.centerNode.pos) < 5) {
        this.state = 'BUILD_SUPPORTS';
        this.supportIndex = 0;
        this.supportPhase = 'OUT';
      }
    }
    else if (this.state === 'BUILD_SUPPORTS') {
      this.handleSupportBuilding(currentSpeed);
    }
    else if (this.state === 'BUILD_WEB') {
      this.handleWebBuilding();
    }
  }

  moveTowards(targetPos, speed) {
    const dir = p5.Vector.sub(targetPos, this.pos);
    const d = dir.mag();
    if (d < speed) {
      this.pos.set(targetPos);
      return true;
    } else {
      dir.normalize().mult(speed);
      this.pos.add(dir);
      return false;
    }
  }

  handleSupportBuilding(speed) {
    if (this.supportIndex >= this.radials.length) {
      this.state = 'BUILD_WEB';
      this.pos.set(this.centerNode.pos);
      return;
    }

    const currentRadial = this.radials[this.supportIndex];
    const anchor = currentRadial[1];

    if (activeDrugs.has('KETAMINE') && random() < 0.1) return; // Pause randomly

    if (this.supportPhase === 'OUT') {
      const reached = this.moveTowards(anchor.pos, speed);
      stroke(255, 100);
      line(this.centerNode.pos.x, this.centerNode.pos.y, this.pos.x, this.pos.y);

      if (reached) {
        springs.push(new Spring(this.centerNode, anchor));
        this.supportPhase = 'IN';
      }
    } else {
      const reached = this.moveTowards(this.centerNode.pos, speed);
      if (reached) {
        this.supportIndex++;
        this.supportPhase = 'OUT';
      }
    }
  }

  handleWebBuilding() {
    const SPIRAL_SPACING = 25;
    let baseAngleSpeed = 0.12;
    let drMult = 1.0;
    let angleSpeedMult = 1.0;

    // --- COMBINED DRUG LOGIC ---

    if (activeDrugs.has('LSD')) {
      drMult *= (1 + sin(this.angle * 4) * 0.5);
    }

    if (activeDrugs.has('CAFFEINE')) {
      angleSpeedMult *= 1.6;
      drMult *= 0.8;
      this.angle += random(-0.05, 0.05); // Jitter angle
    }

    if (activeDrugs.has('CRACK')) {
      angleSpeedMult *= 2.0;
      drMult *= random(0.5, 3.0);
      if (random() < 0.1) this.radius += 20; // Sudden jump
    }

    if (activeDrugs.has('THC')) {
      angleSpeedMult *= 0.7;
      drMult *= 1.8;
      if (random() < 0.1) return; // Pause
    }

    if (activeDrugs.has('NICOTINE')) {
      drMult *= 0.6;
      angleSpeedMult *= 1.2;
    }

    if (activeDrugs.has('MDMA')) {
      drMult *= (1 + sin(frameCount * 0.1) * 0.3);
    }

    if (activeDrugs.has('KETAMINE')) {
      angleSpeedMult = random(-0.1, 0.2); // Loss of direction
      drMult = random(-0.5, 1.5);
    }

    // Apply calculations
    let currentAngleSpeed = baseAngleSpeed * angleSpeedMult;
    let dr = (SPIRAL_SPACING / (TWO_PI / baseAngleSpeed)) * 0.15 * drMult;

    this.angle += currentAngleSpeed;
    this.radius += dr;

    if (this.radius > this.maxRadius) {
      this.active = false;
      return;
    }

    // Calculate position
    const cx = this.centerNode.pos.x;
    const cy = this.centerNode.pos.y;

    let xOff = 0, yOff = 0;
    if (activeDrugs.has('CAFFEINE') || activeDrugs.has('CRACK')) {
        xOff = random(-5, 5);
        yOff = random(-5, 5);
    }

    this.pos.x = cx + cos(this.angle) * this.radius + xOff;
    this.pos.y = cy + sin(this.angle) * this.radius + yOff;

    const sectorAngle = TWO_PI / NUM_RADIALS;
    const currentSector = Math.floor(((this.angle % TWO_PI) + TWO_PI) % TWO_PI / sectorAngle);

    if (this.lastSector !== currentSector) {
        // Skip logic
        let skipChance = 0;
        if (activeDrugs.has('THC')) skipChance += 0.2;
        if (activeDrugs.has('CRACK')) skipChance += 0.3;

        if (random() > skipChance) {
            this.buildSpiralNode(currentSector);
        }
    }
    this.lastSector = currentSector;
  }

  buildSpiralNode(sectorIdx) {
    if (sectorIdx < 0 || sectorIdx >= NUM_RADIALS) return;

    const radial = this.radials[sectorIdx];
    const innerNode = radial[radial.length - 2];
    const outerNode = radial[radial.length - 1];

    const p = new Particle(this.pos.x, this.pos.y);
    particles.push(p);

    const springIndex = springs.findIndex(s =>
      (s.p1 === innerNode && s.p2 === outerNode) ||
      (s.p1 === outerNode && s.p2 === innerNode)
    );
    if (springIndex !== -1) springs.splice(springIndex, 1);

    radial.splice(radial.length - 1, 0, p);

    springs.push(new Spring(innerNode, p));
    springs.push(new Spring(p, outerNode));

    // Connect to Neighbor
    let prevIdx = sectorIdx - 1;
    if (activeDrugs.has('KETAMINE') && random() < 0.3) {
        prevIdx = floor(random(NUM_RADIALS));
    }

    if (prevIdx < 0) prevIdx = NUM_RADIALS - 1;
    const prevRadial = this.radials[prevIdx];

    if (prevRadial.length > 2) {
      const neighbor = prevRadial[prevRadial.length - 2];

      let maxDist = this.radius * 2;
      if (activeDrugs.has('KETAMINE')) maxDist = width;
      if (activeDrugs.has('CRACK')) maxDist = this.radius * 3;

      if (p.pos.dist(neighbor.pos) < maxDist) {
        springs.push(new Spring(neighbor, p));
      }
    }
  }

  draw() {
    if (!this.active) return;

    push();
    translate(this.pos.x, this.pos.y);

    let angle = this.angle + PI/2;
    if (activeDrugs.has('KETAMINE')) angle += random(-0.5, 0.5);
    rotate(angle);

    // Determine Glow Color for Spider based on first active drug or Cyan
    let glowColor = color(180, 80, 100);
    if (activeDrugs.size > 0) {
        let firstKey = activeDrugs.values().next().value;
        glowColor = color(DRUGS[firstKey].hue, 80, 100);
    }

    drawingContext.shadowBlur = 10;
    drawingContext.shadowColor = glowColor;

    noStroke();
    fill(0, 0, 20);

    if (activeDrugs.has('CAFFEINE') || activeDrugs.has('CRACK')) {
        scale(random(0.9, 1.1));
    }

    ellipse(0, 0, 14, 18);
    fill(0, 0, 15);
    ellipse(0, -8, 10, 10);

    fill(glowColor);
    ellipse(-2, -10, 2, 2);
    ellipse(2, -10, 2, 2);

    stroke(0, 0, 20);
    strokeWeight(2);
    noFill();
    for(let i = -1; i <= 1; i+=2) {
      beginShape(); vertex(4*i, -4); vertex(12*i, -12); vertex(18*i, -4); endShape();
      beginShape(); vertex(4*i, -2); vertex(14*i, -6); vertex(20*i, 4); endShape();
      beginShape(); vertex(4*i, 2); vertex(14*i, 6); vertex(18*i, 14); endShape();
      beginShape(); vertex(4*i, 4); vertex(10*i, 12); vertex(14*i, 18); endShape();
    }
    pop();
  }
}
