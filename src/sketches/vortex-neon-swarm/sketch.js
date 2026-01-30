/**
 * NEON VORTEX // SYSTEM OVERRIDE v2.0
 *
 * Major Upgrades:
 * - High-performance Float32 particle system (Dynamic Capacity).
 * - HSB Color Mode for vibrant neon aesthetics.
 * - Vortex Physics: Click to create a gravitational black hole.
 * - Fluid Dynamics: Mouse movement creates ripples/repulsion.
 * - Particle Emitter: HOLD SPACEBAR to spawn particles at cursor.
 * - HUD Overlay: Sci-fi reticle and status text.
 * - Glitch & CRT Effects: Screen shake, scanlines, and chromatic aberration simulation.
 */

const MAX_PARTICLES = 8000; // Maximum allowed particles
const INITIAL_PARTICLES = 2500; // Starting count
const NOISE_SCALE = 0.003;
const MAX_SPEED = 6.0;
const FRICTION = 0.94;

// Particle Data: [x, y, vx, vy, prevX, prevY, hue, life]
const P_STRIDE = 8;
let particles;
let particleCount = INITIAL_PARTICLES;
let flowZ = 0;
let scanLineY = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  background(240, 30, 5); // Deep dark blue/black

  // Allocate max memory upfront
  particles = new Float32Array(MAX_PARTICLES * P_STRIDE);
  initParticles();

  textFont('Courier New');
  strokeCap(ROUND);
}

function initParticles() {
  particleCount = INITIAL_PARTICLES;
  for (let i = 0; i < particleCount; i++) {
    spawnParticle(i, random(width), random(height), true);
  }
}

function spawnParticle(i, x, y, fullReset = false) {
  let idx = i * P_STRIDE;
  particles[idx] = x;
  particles[idx + 1] = y;

  if (fullReset) {
    particles[idx + 2] = 0; // vx
    particles[idx + 3] = 0; // vy
    particles[idx + 4] = x; // prevX
    particles[idx + 5] = y; // prevY

    // Palette: Cyan (170) -> Blue (220) -> Purple (280) -> Pink (320)
    let r = random();
    if (r < 0.33) particles[idx + 6] = random(160, 190); // Cyan
    else if (r < 0.66) particles[idx + 6] = random(260, 290); // Purple
    else particles[idx + 6] = random(300, 340); // Pink

    particles[idx + 7] = random(50, 100); // life
  }
}

function draw() {
  // --- 1. TRAIL FADE EFFECT ---
  blendMode(BLEND);
  noStroke();
  fill(240, 40, 5, 20);
  rect(0, 0, width, height);

  // --- 2. INPUT & SPAWNING ---
  if (keyIsDown(32)) { // SPACE BAR
    let spawnRate = 20; // Particles per frame
    for (let k = 0; k < spawnRate; k++) {
      if (particleCount < MAX_PARTICLES) {
        let idx = particleCount * P_STRIDE;
        let angle = random(TWO_PI);
        let speed = random(2, 6);

        // Initialize manually for emitter effect (burst)
        particles[idx] = mouseX;
        particles[idx + 1] = mouseY;
        particles[idx + 2] = cos(angle) * speed;
        particles[idx + 3] = sin(angle) * speed;
        particles[idx + 4] = mouseX;
        particles[idx + 5] = mouseY;

        // Color logic
        let r = random();
        if (r < 0.33) particles[idx + 6] = random(160, 190);
        else if (r < 0.66) particles[idx + 6] = random(260, 290);
        else particles[idx + 6] = random(300, 340);

        particles[idx + 7] = random(50, 100);

        particleCount++;
      }
    }
  }

  // --- 3. PARTICLE PHYSICS ---
  blendMode(ADD);

  flowZ += 0.005;
  let mx = mouseX;
  let my = mouseY;
  let isInteracting = mouseIsPressed;

  for (let i = 0; i < particleCount; i++) {
    let idx = i * P_STRIDE;

    let x = particles[idx];
    let y = particles[idx + 1];
    let vx = particles[idx + 2];
    let vy = particles[idx + 3];
    let pHue = particles[idx + 6];

    // A. Perlin Noise Flow
    let n = noise(x * NOISE_SCALE, y * NOISE_SCALE, flowZ);
    let angle = n * TWO_PI * 2;
    vx += cos(angle) * 0.15;
    vy += sin(angle) * 0.15;

    // B. Mouse Interaction
    let dx = mx - x;
    let dy = my - y;
    let distSq = dx*dx + dy*dy;

    if (distSq < 150000) {
      let dist = sqrt(distSq);
      let f = (400 - dist) / 400;

      if (isInteracting) {
        // VORTEX MODE
        let spinSpeed = 3.0;
        let pullSpeed = 1.0;

        vx -= (dy / dist) * f * spinSpeed;
        vy += (dx / dist) * f * spinSpeed;
        vx += (dx / dist) * f * pullSpeed;
        vy += (dy / dist) * f * pullSpeed;

        pHue = (pHue + 2) % 360;

      } else {
        // FLUID DISPLACEMENT
        if (dist < 200) {
          let repelF = (200 - dist) / 200;
          vx -= (dx / dist) * repelF * 1.5;
          vy -= (dy / dist) * repelF * 1.5;
        }
      }
    }

    // C. Physics Update
    vx *= FRICTION;
    vy *= FRICTION;

    let speed = sqrt(vx*vx + vy*vy);
    if (speed > MAX_SPEED) {
      vx = (vx / speed) * MAX_SPEED;
      vy = (vy / speed) * MAX_SPEED;
    }

    let nextX = x + vx;
    let nextY = y + vy;

    // D. Rendering
    let bright = map(speed, 0, MAX_SPEED, 60, 100);
    let alpha = map(speed, 0, MAX_SPEED, 40, 100);

    strokeWeight(map(speed, 0, MAX_SPEED, 1, 2.5));
    stroke(pHue, 80, bright, alpha);
    line(x, y, nextX, nextY);

    if (speed > 4 && random() < 0.01) {
      stroke(0, 0, 100);
      point(nextX, nextY);
    }

    // E. Boundary Wrap
    if (nextX < 0) nextX = width;
    if (nextX > width) nextX = 0;
    if (nextY < 0) nextY = height;
    if (nextY > height) nextY = 0;

    particles[idx] = nextX;
    particles[idx + 1] = nextY;
    particles[idx + 2] = vx;
    particles[idx + 3] = vy;
    particles[idx + 6] = pHue;
  }

  // --- 4. UI & POST-PROCESS EFFECTS ---
  blendMode(BLEND);

  // A. Scanline
  scanLineY += 2;
  if (scanLineY > height) scanLineY = 0;
  stroke(180, 50, 100, 10);
  strokeWeight(2);
  line(0, scanLineY, width, scanLineY);

  // B. Glitch / Screen Shake
  let glitchChance = mouseIsPressed ? 0.1 : 0.01;
  if (keyIsDown(32)) glitchChance = 0.05; // Slight glitch on spawn

  if (random() < glitchChance) {
    let y = random(height);
    let h = random(10, 50);
    let xShift = random(-10, 10);
    let img = get(0, y, width, h);
    image(img, xShift, y);

    noStroke();
    fill(random() > 0.5 ? 0 : 180, 100, 100, 20);
    rect(0, y, width, h);
  }

  drawHUD();
}

function drawHUD() {
  // Reticle
  noFill();
  strokeWeight(1.5);

  if (mouseIsPressed) {
    stroke(320, 100, 100, 80);
    let s = 40 + sin(frameCount * 0.5) * 10;
    ellipse(mouseX, mouseY, s);
    line(mouseX - s, mouseY, mouseX + s, mouseY);
    line(mouseX, mouseY - s, mouseX, mouseY + s);

    noStroke();
    fill(320, 100, 100);
    textSize(12);
    textAlign(CENTER, BOTTOM);
    text(">> GRAVITY WELL <<", mouseX, mouseY - 30);

  } else if (keyIsDown(32)) {
    stroke(100, 100, 100, 80); // Greenish for spawn
    let s = 30 + cos(frameCount * 0.8) * 5;
    rectMode(CENTER);
    rect(mouseX, mouseY, s, s);
    rectMode(CORNER);

    noStroke();
    fill(100, 100, 100);
    textSize(12);
    textAlign(CENTER, BOTTOM);
    text(">> EMITTER ACTIVE <<", mouseX, mouseY - 30);
  } else {
    stroke(180, 100, 100, 50);
    ellipse(mouseX, mouseY, 30);
    point(mouseX, mouseY);
  }

  // HUD Info
  fill(180, 50, 90);
  noStroke();
  textAlign(LEFT, TOP);
  text("SYS.OP // VORTEX_ENGINE_V2", 20, 20);
  text("FPS: " + floor(frameRate()), 20, 40);

  // Spacebar Hint
  if (particleCount < MAX_PARTICLES) {
     text("[HOLD SPACE] TO SPAWN", 20, 60);
  } else {
     fill(320, 100, 100);
     text("MAX CAPACITY REACHED", 20, 60);
  }

  fill(180, 50, 90);
  textAlign(RIGHT, BOTTOM);
  text("LOAD: " + floor((particleCount/MAX_PARTICLES)*100) + "% [" + particleCount + "/" + MAX_PARTICLES + "]", width - 20, height - 20);
  text("COORDS: [" + floor(mouseX) + ", " + floor(mouseY) + "]", width - 20, height - 40);

  // Decoration
  stroke(180, 50, 50, 50);
  strokeWeight(1);
  line(20, 80, 200, 80);
  line(width - 20, height - 60, width - 200, height - 60);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(240, 30, 5);
  // Resetting to initial count to clear screen clutter on resize
  initParticles();
}
