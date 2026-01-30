

/**
 * CASTLE GUARD - MIDNIGHT PATROL (AUTOMATED)
 *
 * Mode: CINEMATIC AUTO-PILOT
 * - Removed manual keyboard/mouse inputs.
 * - Implemented autonomous pathfinding and obstacle avoidance.
 * - Added procedural "looking" behavior (observing towers/street).
 * - Maintained high-fidelity rendering and lighting fixes.
 */

// --- CONFIGURATION ---
const WORLD_SIZE = 6000;
const CHUNK_SIZE = 400;
const RENDER_DIST = 2500;
const FOV = Math.PI / 3;

// --- GLOBAL STATE ---
let buildings = [];
let torches = [];
let particles = [];
let textures = {};

// Player/Camera State (Automated)
let player = {
  pos: null,
  vel: null,
  rot: { x: 0, y: -Math.PI/2 }, // Pitch, Yaw
  targetRot: { x: 0, y: -Math.PI/2 },
  bobTimer: 0,
  seedOffset: 0 // For random noise per session
};

// DOM Elements
let hudElements = {};

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  p5.disableFriendlyErrors = true;
  setAttributes('antialias', true);

  // Initialize State
  player.pos = createVector(0, -170, 800);
  player.vel = createVector(0, 0, 0);
  player.seedOffset = random(1000);

  generateTextures();
  generateWorld();
  initHUD();

  // Pre-warm particles
  for(let i=0; i<200; i++) spawnParticle(true);

  // Camera Setup
  perspective(FOV, width/height, 10, 8000);
}

function draw() {
  // 1. Logic & Physics (Auto-Pilot)
  updateAutoPilot();
  updateParticles();

  // 2. Scene Setup
  background(6, 6, 10); // Deep midnight blue/black

  // 3. Camera Transform
  // Smooth look-at calculation
  let cx = player.pos.x + cos(player.rot.y) * cos(player.rot.x);
  let cy = player.pos.y + sin(player.rot.x);
  let cz = player.pos.z + sin(player.rot.y) * cos(player.rot.x);
  camera(player.pos.x, player.pos.y, player.pos.z, cx, cy, cz, 0, 1, 0);

  // 4. Lighting
  setupLighting();

  // 5. Render World
  drawFloor();
  drawCity();
  drawParticles();

  // 6. First-Person Items (Weapon/Lantern)
  drawHeldItems();

  // 7. HUD Update
  updateHUD();
}

// --- AUTOMATION SYSTEM ---

function updateAutoPilot() {
  const WALK_SPEED = 6.0;
  const TURN_SPEED = 0.03;
  const LOOK_AHEAD = 250;

  // 1. Pathfinding / Obstacle Avoidance
  // Project a "feeler" vector forward
  let forwardX = cos(player.rot.y);
  let forwardZ = sin(player.rot.y);
  let futureX = player.pos.x + forwardX * LOOK_AHEAD;
  let futureZ = player.pos.z + forwardZ * LOOK_AHEAD;

  let obstacleDetected = false;

  // Check world boundaries
  if (abs(futureX) > WORLD_SIZE/2 || abs(futureZ) > WORLD_SIZE/2) {
    obstacleDetected = true;
  }

  // Check buildings
  if (!obstacleDetected) {
    for (let b of buildings) {
      if (dist(player.pos.x, player.pos.z, b.x, b.z) > 600) continue; // Optimization

      let margin = b.w/2 + 80;
      // Check if future position is inside a building
      if (futureX > b.x - margin && futureX < b.x + margin &&
          futureZ > b.z - margin && futureZ < b.z + margin) {
        obstacleDetected = true;
        break;
      }
    }
  }

  // 2. Steering
  if (obstacleDetected) {
    // If blocked, turn right (simple maze solving)
    player.targetRot.y += TURN_SPEED * 1.5;
  } else {
    // Wander naturally using Perlin noise
    let wander = map(noise(frameCount * 0.005, player.seedOffset), 0, 1, -TURN_SPEED, TURN_SPEED);
    player.targetRot.y += wander;

    // Bias towards center if too far out to prevent getting lost in void
    if (player.pos.mag() > 2000) {
      let angleToCenter = atan2(-player.pos.z, -player.pos.x);
      // Smoothly steer towards center
      let angleDiff = angleToCenter - player.targetRot.y;
      // Normalize angle
      while (angleDiff > PI) angleDiff -= TWO_PI;
      while (angleDiff < -PI) angleDiff += TWO_PI;
      player.targetRot.y += angleDiff * 0.01;
    }
  }

  // Smooth Rotation
  player.rot.y = lerp(player.rot.y, player.targetRot.y, 0.1);

  // 3. Automated Head Movement (Look around)
  // Look up at towers occasionally, look down at path, mostly level
  let headNoise = noise(frameCount * 0.01, player.seedOffset + 100);
  let targetPitch = map(headNoise, 0, 1, -0.4, 0.2); // Range of pitch
  player.rot.x = lerp(player.rot.x, targetPitch, 0.05);

  // 4. Locomotion
  let moveDir = createVector(cos(player.rot.y), 0, sin(player.rot.y));
  player.vel = moveDir.mult(WALK_SPEED);

  player.pos.add(player.vel);

  // Bobbing logic
  player.bobTimer += 0.15;
  let bobY = sin(player.bobTimer) * 6;
  player.pos.y = lerp(player.pos.y, -170 + bobY, 0.2);
}

function setupLighting() {
  ambientLight(30, 30, 45); // Darker ambient for mood

  // Lantern Light (Player)
  let flicker = random(0.9, 1.1);
  pointLight(255*flicker, 160*flicker, 60*flicker, player.pos.x, player.pos.y, player.pos.z);

  // Nearest Torches
  let dists = [];
  for(let i=0; i<torches.length; i++) {
    let d = dist(player.pos.x, player.pos.z, torches[i].x, torches[i].z);
    if (d < RENDER_DIST) dists.push({id: i, d: d});
  }
  dists.sort((a,b) => a.d - b.d);

  // Render closest lights
  let activeLights = 0;
  for(let item of dists) {
    if (activeLights >= 6) break;
    let t = torches[item.id];
    // Distance attenuation simulation via intensity
    let intensity = map(item.d, 0, 1000, 200, 0, true);
    if (intensity > 10) {
      let n = noise(frameCount * 0.1, t.x) * 50;
      pointLight(intensity + n, 100, 40, t.x, t.y, t.z);
      activeLights++;
    }
  }

  // Moon/City glow
  directionalLight(40, 50, 80, 0.5, 1, -0.5);
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.pos.add(p.vel);
    p.life -= p.decay;

    // Swirling wind effect
    let n = noise(p.pos.x * 0.005, p.pos.z * 0.005, frameCount * 0.01);
    p.vel.x += cos(n * TWO_PI) * 0.02;
    p.vel.z += sin(n * TWO_PI) * 0.02;

    if (p.life <= 0 || dist(p.pos.x, p.pos.z, player.pos.x, player.pos.z) > RENDER_DIST) {
      particles.splice(i, 1);
      spawnParticle(false);
    }
  }
  while(particles.length < 150) spawnParticle(false);
}

function spawnParticle(randomPos) {
  let r = randomPos ? RENDER_DIST : 800;
  let angle = random(TWO_PI);
  let distOffset = random(100, r);

  // Spawn around player
  let x = player.pos.x + cos(angle) * distOffset;
  let z = player.pos.z + sin(angle) * distOffset;
  let y = random(-600, 0); // Falling ash/snow

  particles.push({
    pos: createVector(x, y, z),
    vel: createVector(random(-0.5, 0.5), random(0.2, 1.5), random(-0.5, 0.5)), // Falling down slightly
    life: random(150, 255),
    decay: random(0.5, 2),
    size: random(2, 4)
  });
}

// --- RENDERERS ---

function drawFloor() {
  push();
  noStroke();
  texture(textures.cobble);
  textureWrap(REPEAT);

  let size = 3000;
  let y = 0;
  let px = player.pos.x;
  let pz = player.pos.z;
  // UV scaling
  let s = 0.005;

  beginShape(QUADS);
  normal(0, -1, 0);
  vertex(px - size, y, pz - size, (px - size)*s, (pz - size)*s);
  vertex(px + size, y, pz - size, (px + size)*s, (pz - size)*s);
  vertex(px + size, y, pz + size, (px + size)*s, (pz + size)*s);
  vertex(px - size, y, pz + size, (px - size)*s, (pz + size)*s);
  endShape();
  pop();
}

function drawCity() {
  noStroke();

  for (let b of buildings) {
    // Culling
    if (dist(player.pos.x, player.pos.z, b.x, b.z) > RENDER_DIST) continue;

    push();
    translate(b.x, 0, b.z);

    let tex = (b.id % 2 === 0) ? textures.wall : textures.wallWin;
    texture(tex);

    if (b.type === 'tower') {
      translate(0, -b.h/2, 0);
      // Main tower body
      cylinder(b.w/2, b.h, 12, 1);

      // Top fortification
      translate(0, -b.h/2, 0);
      texture(textures.wall);
      cylinder(b.w/2 + 20, 60, 12, 1);

      // Flag
      translate(0, -60, 0);
      drawFlag(b.id);
    }
    else {
      // House body
      translate(0, -b.h/2, 0);
      box(b.w, b.h, b.w);

      // Roof
      translate(0, -b.h/2, 0);
      texture(textures.wood);

      beginShape(TRIANGLES);
      let r = b.w/2 + 10;
      let rh = b.w/2;
      // Roof geometry
      vertex(-r, 0, r, 0, 1); vertex(r, 0, r, 1, 1); vertex(0, -rh, 0, 0.5, 0);
      vertex(r, 0, -r, 0, 1); vertex(-r, 0, -r, 1, 1); vertex(0, -rh, 0, 0.5, 0);
      vertex(-r, 0, -r, 0, 1); vertex(-r, 0, r, 1, 1); vertex(0, -rh, 0, 0.5, 0);
      vertex(r, 0, r, 0, 1); vertex(r, 0, -r, 1, 1); vertex(0, -rh, 0, 0.5, 0);
      endShape();
    }

    if (b.hasTorch) {
      // Draw torch relative to building center
      pop();
      drawTorch(b.torchPos);
      push();
    }

    pop();
  }
}

function drawFlag(seed) {
  push();
 // noTexture();
  noStroke();

  // Pole
  fill(80);
  cylinder(3, 120);

  // Waving Cloth
  translate(0, -40, 0);
  rotateY(PI/2);

  fill(160, 20, 20);
  let time = frameCount * 0.1;

  beginShape(TRIANGLE_STRIP);
  for(let x=0; x<=80; x+=10) {
    let yOffset = noise(x * 0.05 - time, seed) * 30 - 15;
    let zOffset = sin(x * 0.1 - time) * 10;
    // Darken cloth further from pole
    fill(160 - x, 20, 20);
    vertex(x, -25 + yOffset, zOffset);
    vertex(x, 25 + yOffset, zOffset);
  }
  endShape();
  pop();
}

function drawTorch(pos) {
  push();
 // noTexture();
  translate(pos.x, pos.y, pos.z);

  // Holder
  noStroke();
  fill(40);
  rotateZ(PI/4);
  cylinder(4, 40);

  translate(0, -20, 0);
  rotateZ(-PI/4);

  // Fire Core
  emissiveMaterial(255, 150, 0);
  fill(255, 100, 0);
  let s = noise(frameCount*0.2, pos.x) * 5 + 5;
  sphere(s);

  // Sparks
  fill(255, 200, 50);
  for(let i=0; i<3; i++) {
    push();
    let px = random(-5, 5);
    let py = random(-10, -30);
    let pz = random(-5, 5);
    translate(px, py, pz);
    sphere(2);
    pop();
  }

  pop();
}

function drawParticles() {
  push();
  //noTexture();
  noStroke();
  emissiveMaterial(255, 200, 100);
  fill(255, 180, 50);

  for(let p of particles) {
    push();
    translate(p.pos.x, p.pos.y, p.pos.z);
    sphere(p.size * (p.life/255));
    pop();
  }
  pop();
}

function drawHeldItems() {
  push();
  //noTexture();
  // Attach items to camera position
  translate(player.pos.x, player.pos.y, player.pos.z);

  // Lock to camera rotation
  rotateY(-player.rot.y - HALF_PI);
  rotateX(-player.rot.x);

  // Sway based on movement
  let swayX = sin(player.bobTimer) * 2;
  let swayY = abs(cos(player.bobTimer)) * 3;

  // 1. Lantern (Left Hand)
  push();
  translate(-35 + swayX, 25 + swayY, 55);
  // Handle
  fill(40);
  cylinder(2, 40);
  translate(0, 20, 0);
  // Cage
  fill(20);
  box(14, 24, 14);
  // Light
  emissiveMaterial(255, 200, 100);
  fill(255, 200, 50);
  sphere(5);
  pop();

  // 2. Spear (Right Hand)
  push();
  translate(35 - swayX, 30 + swayY, 60);
  rotateX(PI/12);
  // Shaft
  fill(90, 60, 40);
  cylinder(3, 140);
  // Tip
  translate(0, -70, 0);
  fill(160);
  emissiveMaterial(50);
  cone(5, 30);
  pop();

  pop();
}

// --- GENERATION & ASSETS ---

function generateTextures() {
  // 1. Cobblestone
  textures.cobble = createGraphics(512, 512);
  let g = textures.cobble;
  g.background(40, 35, 35);
  g.noStroke();
  for(let i=0; i<800; i++) {
    g.fill(random(50, 80));
    let x = random(512), y = random(512), s = random(10, 30);
    g.rect(x, y, s, s, 4);
  }

  // 2. Wall (Base)
  textures.wall = createGraphics(256, 256);
  g = textures.wall;
  g.background(70, 70, 75);
  g.stroke(40);
  g.strokeWeight(2);
  for(let y=0; y<256; y+=20) {
    let off = (y%40===0)?0:10;
    for(let x=-20; x<256; x+=20) {
      g.fill(random(70, 90));
      g.rect(x+off, y, 20, 20);
    }
  }
  // Grunge
  g.noStroke();
  g.fill(10, 10, 10, 50);
  for(let i=0; i<50; i++) g.ellipse(random(256), random(256), random(20, 60));

  // 3. Wall with Windows
  textures.wallWin = createGraphics(256, 256);
  g = textures.wallWin;
  g.image(textures.wall, 0, 0);
  g.noStroke();
  g.fill(255, 220, 100);
  for(let y=40; y<220; y+=60) {
    for(let x=40; x<220; x+=50) {
      if(random() > 0.4) {
        // Window glow
        g.drawingContext.shadowBlur = 10;
        g.drawingContext.shadowColor = "orange";
        g.rect(x, y, 15, 25);
        g.drawingContext.shadowBlur = 0;

        // Window frame
        g.stroke(40, 20, 10);
        g.strokeWeight(2);
        g.line(x+7, y, x+7, y+25);
        g.line(x, y+12, x+15, y+12);
        g.noStroke();
      }
    }
  }

  // 4. Wood
  textures.wood = createGraphics(128, 128);
  g = textures.wood;
  g.background(60, 40, 20);
  g.stroke(30, 15, 5);
  for(let i=0; i<128; i+=4) g.line(0, i, 128, i+random(-2,2));
}

function generateWorld() {
  buildings = [];
  torches = [];

  let range = 8; // Larger world for auto-pilot
  let idCounter = 0;

  for (let x = -range; x <= range; x++) {
    for (let z = -range; z <= range; z++) {
      // Clear central plaza
      if (abs(x) < 2 && abs(z) < 2) continue;

      let wx = x * CHUNK_SIZE;
      let wz = z * CHUNK_SIZE;
      let px = wx + random(-50, 50);
      let pz = wz + random(-50, 50);

      let type = 'house';
      let w = random(200, 300);
      let h = random(300, 600);

      // Towers on perimeter or random chance
      if (abs(x) === range || abs(z) === range || random() > 0.9) {
        type = 'tower';
        h = random(800, 1400);
        w = 150;
      }

      let hasTorch = (random() > 0.6);
      let torchPos = null;
      if (hasTorch) {
        let ty = -h * 0.4;
        torchPos = createVector(px + w/2 + 5, ty, pz);
        torches.push({x: torchPos.x, y: torchPos.y, z: torchPos.z});
      }

      buildings.push({
        id: idCounter++,
        x: px, z: pz, w, h,
        type, hasTorch, torchPos
      });
    }
  }

  // Central Landmark
  buildings.push({ id: 9999, x: 0, z: 0, w: 120, h: 500, type: 'tower', hasTorch: false });
  // Plaza torches
  torches.push({x: 150, y: -200, z: 150});
  torches.push({x: -150, y: -200, z: -150});
  torches.push({x: 150, y: -200, z: -150});
  torches.push({x: -150, y: -200, z: 150});
}

function initHUD() {
  let container = createDiv('');
  container.style('position', 'absolute');
  container.style('inset', '0');
  container.style('pointer-events', 'none');
  container.style('display', 'flex');
  container.style('flex-direction', 'column');
  container.style('justify-content', 'space-between');
  container.style('padding', '30px');
  container.style('font-family', '"Courier New", monospace');
  container.style('color', '#fb2');
  container.style('text-shadow', '0 0 10px #fb2, 2px 2px 0 #000');

  let header = createDiv('⚔️ CASTLE GUARD<br><span style="font-size:0.6em; opacity:0.8; letter-spacing: 2px;">AUTOMATED PATROL LOG</span>');
  header.parent(container);
  header.style('text-align', 'left');

  let footer = createDiv('');
  footer.parent(container);
  footer.style('display', 'flex');
  footer.style('justify-content', 'space-between');
  footer.style('width', '100%');

  hudElements.status = createDiv('STATUS: PATROLLING');
  hudElements.status.parent(footer);

  hudElements.time = createDiv('00:00');
  hudElements.time.parent(footer);
}

function updateHUD() {
  if (frameCount % 30 === 0) {
    let d = dist(player.pos.x, player.pos.z, 0, 0);
    let zone = "ROYAL PLAZA";
    if (d > 800) zone = "RESIDENTIAL DISTRICT";
    if (d > 2000) zone = "OUTER WALLS";

    // Formatting time
    let h = floor(map(frameCount % 7200, 0, 7200, 0, 24));
    let m = floor(map(frameCount % 300, 0, 300, 0, 60));

    hudElements.status.html(`ZONE: ${zone}<br>STATUS: PATROLLING`);
    hudElements.time.html(`SHIFT TIME: ${nf(h,2)}:${nf(m,2)}`);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  perspective(FOV, width/height, 10, 8000);
}
