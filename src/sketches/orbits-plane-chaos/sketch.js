let particles = [];
const numParticles = 3500;
let noiseScale = 0.005;
let earthRadius;

// Slicing / MRI variables
let scanZ = 0;
let sliceThickness = 20;

// UI Variables
let sliderVal = 0.5; // Range 0.0 to 1.0
let isDragging = false;
let sliderRect;
let uiLayer; // 2D Graphics buffer for text/UI

// Tracking
let followedParticle = null;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  uiLayer = createGraphics(windowWidth, windowHeight);

  earthRadius = min(width, height) * 0.35;

  // Initialize particles in 3D space
  for (let i = 0; i < numParticles; i++) {
    particles.push(new Particle());
  }

  updateSliderRect();
}

function draw() {
  background(5, 10, 15);

  // --- Logic Update ---
  handleInput();

  // Auto-follow logic
  if (followedParticle) {
    let targetNorm = map(followedParticle.pos.z, -earthRadius, earthRadius, 0, 1);
    sliderVal = constrain(targetNorm, 0, 1);
  }

  // Smooth Z movement
  let targetZ = map(sliderVal, 0, 1, -earthRadius, earthRadius);
  let lerpAmt = followedParticle ? 0.2 : 0.1;
  scanZ = lerp(scanZ, targetZ, lerpAmt);
  let zClamped = constrain(scanZ, -earthRadius + 0.1, earthRadius - 0.1);
  let sliceRadius = sqrt(sq(earthRadius) - sq(zClamped));

  let t = frameCount * 0.004;

  // Update Physics
  for (let p of particles) {
    p.update(t);
  }

  // --- 1. LEFT VIEW: 2D MRI SLICE ---
  push();
  translate(-width / 4, 0, 0); // Move to left side

  // Draw Slice Boundary
  noFill();
  strokeWeight(2);
  stroke(40, 150, 200);
  ellipse(0, 0, sliceRadius * 2);

  // Ticks
  stroke(40, 150, 200, 100);
  strokeWeight(1);
  let tickCount = 36;
  for(let i = 0; i < tickCount; i++) {
    let a = map(i, 0, tickCount, 0, TWO_PI);
    let r1 = sliceRadius + 5;
    let r2 = sliceRadius + 15;
    line(cos(a)*r1, sin(a)*r1, cos(a)*r2, sin(a)*r2);
  }

  // Draw Particles on Slice
  blendMode(ADD);
  for (let p of particles) {
    p.drawSlice(sliceRadius);
  }

  // Reticle on Slice
  if (followedParticle) {
    drawReticle(followedParticle.pos.x, followedParticle.pos.y, true);
  }
  blendMode(BLEND);
  pop();

  // --- 2. RIGHT VIEW: 3D GLOBAL VIEW ---
  push();
  translate(width / 4, 0, 0); // Move to right side

  // Rotate Scene
  let rotSpeed = 0.005;
  rotateY(frameCount * rotSpeed);
  rotateX(frameCount * rotSpeed * 0.5);

  // Draw Wireframe Sphere
  noFill();
  stroke(30, 40, 50);
  strokeWeight(1);
  sphere(earthRadius);

  // Draw Scan Plane
  push();
  translate(0, 0, scanZ);
  fill(40, 150, 200, 30);
  stroke(40, 150, 200, 100);
  // Draw a circle representing the cut plane
  // We need to rotate it to lie flat on XY plane relative to Z translation?
  // sphere() is centered. Z is depth. So plane is XY plane at Z.
  ellipse(0, 0, sliceRadius * 2);
  pop();

  // Draw 3D Particles
  strokeWeight(2);
  beginShape(POINTS);
  for (let p of particles) {
    // Color based on if it's inside the slice
    let distToSlice = abs(p.pos.z - scanZ);
    if (distToSlice < sliceThickness) {
      stroke(0, 255, 255, 200);
    } else {
      stroke(255, 255, 255, 30);
    }

    if (p === followedParticle) {
       stroke(255, 50, 50, 255);
       strokeWeight(5); // Make tracked particle bigger
    } else {
       strokeWeight(2);
    }
    vertex(p.pos.x, p.pos.y, p.pos.z);
  }
  endShape();

  // 3D Reticle logic (Lines pointing to tracked particle)
  if (followedParticle) {
    stroke(255, 50, 50, 100);
    strokeWeight(1);
    // Line from center to particle
    line(0,0,0, followedParticle.pos.x, followedParticle.pos.y, followedParticle.pos.z);
    // Line from scan plane center to particle
    line(0,0,scanZ, followedParticle.pos.x, followedParticle.pos.y, followedParticle.pos.z);
  }

  pop();

  // --- 3. UI OVERLAY ---
  drawUI(zClamped);

  // Render UI Layer onto WEBGL canvas
  resetMatrix();
  imageMode(CORNER);
  // image(img, x, y) in WEBGL centers image if mode is CENTER.
  // Easier to map -w/2, -h/2
  image(uiLayer, -width/2, -height/2);
}

function drawReticle(x, y, isSliceView) {
  // Simple brackets
  let sz = 20;
  stroke(255, 50, 50);
  noFill();
  strokeWeight(2);

  push();
  translate(x, y);
  rotate(frameCount * 0.05);
  line(-sz, -sz, -sz/2, -sz);
  line(-sz, -sz, -sz, -sz/2);
  line(sz, -sz, sz/2, -sz);
  line(sz, -sz, sz, -sz/2);
  line(sz, sz, sz/2, sz);
  line(sz, sz, sz, sz/2);
  line(-sz, sz, -sz/2, sz);
  line(-sz, sz, -sz, sz/2);
  pop();
}

function updateSliderRect() {
  let w = width * 0.3;
  let h = 6;
  let x = (width - w) / 2;
  let y = height - 60;
  sliderRect = {x, y, w, h};
}

// Input handling for WEBGL mode
function mousePressed() {
  // Mouse coordinates are relative to top-left for UI logic
  let mx = mouseX;
  let my = mouseY;

  // 1. Check Slider (UI Layer coordinates)
  if (mx > sliderRect.x - 20 && mx < sliderRect.x + sliderRect.w + 20 &&
      my > sliderRect.y - 20 && my < sliderRect.y + 40) {
    isDragging = true;
    followedParticle = null;
    return;
  }

  // 2. Check Particles (Only on Left View / Slice View)
  // Left View is centered at width/4 (screen space)
  let leftViewCenterX = width * 0.25;
  let leftViewCenterY = height * 0.5;

  // Check if click is generally on the left side
  if (mx < width / 2) {
    let localMx = mx - leftViewCenterX;
    let localMy = my - leftViewCenterY;

    let closestDist = 40;
    let found = null;

    for (let p of particles) {
      if (abs(p.pos.z - scanZ) < sliceThickness) {
        let d = dist(localMx, localMy, p.pos.x, p.pos.y);
        if (d < closestDist) {
          closestDist = d;
          found = p;
        }
      }
    }

    if (found) {
      followedParticle = found;
    } else {
      followedParticle = null;
    }
  }
}

function mouseReleased() {
  isDragging = false;
}

function handleInput() {
  if (isDragging) {
    sliderVal = constrain(map(mouseX, sliderRect.x, sliderRect.x + sliderRect.w, 0, 1), 0, 1);
  }
}

function drawUI(currentZ) {
  uiLayer.clear();

  // Draw Slider
  uiLayer.noStroke();
  uiLayer.fill(30, 40, 50);
  uiLayer.rect(sliderRect.x, sliderRect.y, sliderRect.w, sliderRect.h, 3);

  let handleX = map(sliderVal, 0, 1, sliderRect.x, sliderRect.x + sliderRect.w);

  if (followedParticle) {
    uiLayer.fill(255, 50, 50);
    uiLayer.drawingContext.shadowColor = 'red';
  } else {
    uiLayer.fill(0, 255, 255);
    uiLayer.drawingContext.shadowColor = 'cyan';
  }

  uiLayer.drawingContext.shadowBlur = 15;
  uiLayer.circle(handleX, sliderRect.y + sliderRect.h/2, 16);
  uiLayer.drawingContext.shadowBlur = 0;

  // Labels
  uiLayer.textAlign(CENTER, TOP);
  uiLayer.textSize(12);
  uiLayer.textFont('monospace');

  if (followedParticle) {
    uiLayer.fill(255, 100, 100);
    uiLayer.text("TARGET LOCKED", width/2, sliderRect.y + 20);
  } else {
    uiLayer.fill(150, 200, 255);
    uiLayer.text("LAYER DEPTH SCAN", width/2, sliderRect.y + 20);
  }

  // View Labels
  uiLayer.fill(40, 150, 200);
  uiLayer.textSize(14);
  uiLayer.text("SLICE VIEW", width * 0.25, 40);
  uiLayer.text("3D ORBIT", width * 0.75, 40);

  // Data readout
  uiLayer.textAlign(LEFT, BOTTOM);
  uiLayer.fill(150, 200, 255, 150);
  uiLayer.text(`Z-DEPTH: ${currentZ.toFixed(1)}`, 20, height - 20);
  uiLayer.text("CLICK LEFT TO TRACK", 20, height - 40);
}

class Particle {
  constructor() {
    this.respawn();
    this.life = random(100, 255);
  }

  respawn() {
    let valid = false;
    while (!valid) {
      this.pos = createVector(random(-1, 1), random(-1, 1), random(-1, 1));
      if (this.pos.mag() <= 1) {
        this.pos.mult(earthRadius);
        valid = true;
      }
    }
    this.prevPos = this.pos.copy();
    this.life = 255;
    this.maxSpeed = random(1, 3);
  }

  update(time) {
    this.prevPos = this.pos.copy();

    let scale = noiseScale;
    let n1 = noise(this.pos.x * scale, this.pos.y * scale, this.pos.z * scale + time);
    let n2 = noise(this.pos.x * scale + 100, this.pos.y * scale + 100, this.pos.z * scale + time);
    let n3 = noise(this.pos.x * scale + 200, this.pos.y * scale + 200, this.pos.z * scale + time);

    let vel = createVector(n1 - 0.5, n2 - 0.5, n3 - 0.5);
    vel.normalize().mult(this.maxSpeed);

    // Core spin
    let tangent = createVector(-this.pos.z, 0, this.pos.x).normalize().mult(0.5);
    vel.add(tangent);

    this.pos.add(vel);
    this.life -= 1;

    if (this.pos.mag() > earthRadius || this.life < 0) {
      this.respawn();
    }
  }

  drawSlice(currentSliceRadius) {
    let distToSlice = abs(this.pos.z - scanZ);
    if (distToSlice < sliceThickness) {
      let alpha = map(distToSlice, 0, sliceThickness, 255, 0);
      alpha *= (this.life / 255);

      let d = dist(this.pos.x, this.pos.y, 0, 0);
      let normDist = constrain(d / currentSliceRadius, 0, 1);

      let r, g, b;
      if (this === followedParticle) {
         r = 255; g = 50; b = 50;
         alpha = 255;
      } else {
         r = lerp(220, 0, normDist);
         g = lerp(255, 50, normDist);
         b = lerp(255, 100, normDist);
      }

      stroke(r, g, b, alpha);
      strokeWeight(map(distToSlice, 0, sliceThickness, 3, 0.5));
      line(this.prevPos.x, this.prevPos.y, this.pos.x, this.pos.y);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  uiLayer.resizeCanvas(windowWidth, windowHeight);
  earthRadius = min(width, height) * 0.35;
  updateSliderRect();
}
