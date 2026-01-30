let arms = [];
let feeders = [];
let products = [];
let particles = [];
let pushers = [];
let gates = []; // New array for scanner gates
let conveyorSpeed = 10;
let spawnTimer = 0;
let beltY = 180;
let tunnelDepth = 4000;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  colorMode(HSB, 360, 100, 100, 100);
  setAttributes('antialias', true);

  // Create stations along the tunnel
  let numPairs = 8;
  let spacing = tunnelDepth / numPairs;

  for (let i = 0; i < numPairs; i++) {
    let z = -tunnelDepth + (i * spacing) + 400;

    // Left Station (Robot Arm)
    let leftFeeder = new Feeder(-850, beltY - 20, z, 1);
    feeders.push(leftFeeder);
    arms.push(new RobotArm(-400, -250, z, 240, 220, true, leftFeeder));

    // Right Station (Robot Arm)
    let rightFeeder = new Feeder(850, beltY - 20, z, -1);
    feeders.push(rightFeeder);
    arms.push(new RobotArm(400, -250, z, 240, 220, false, rightFeeder));

    // Add Side Pushers between stations to rotate boxes
    if (i < numPairs - 1) {
      let midZ = z + spacing / 2;
      let side = (i % 2 === 0) ? 1 : -1;
      pushers.push(new SidePusher(side * 260, beltY - 20, midZ, side));
    }
  }

  // Add Scanner/Stamper Gates at specific intervals
  // These gates scan products and stamp them as "Processed"

  gates.push(new ScannerGate(200));

}

function draw() {
  background(230, 60, 5); // Darker industrial background

  // --- Camera ---
  let camX = sin(frameCount * 0.003) * 100;
  let camY = -350 + sin(frameCount * 0.005) * 50;
  let camZ = 1100 + sin(frameCount * 0.002) * 100;
  camera(camX, camY, camZ, 0, 0, -500, 0, 1, 0);

  // --- Lighting ---
  ambientLight(200, 40, 20);
  let lightZ = (frameCount * conveyorSpeed * 2) % 2000 - 1000;
  pointLight(320, 80, 100, -400, -200, lightZ);
  pointLight(190, 80, 100, 400, -200, lightZ + 500);
  directionalLight(0, 0, 50, 0, 1, -0.5);

  // --- Logic ---

  // 1. Spawn Products
  spawnTimer++;
  if (spawnTimer > 90) {
    products.push(new Product(-tunnelDepth - 200, beltY - 40));
    spawnTimer = 0;
  }

  // 2. Update Products
  for (let i = products.length - 1; i >= 0; i--) {
    let p = products[i];
    p.update();
    if (p.pos.z > 1400) products.splice(i, 1);
  }

  // 3. Update Feeders
  for (let f of feeders) {
    f.update();
  }

  // 4. Update Arms
  for (let arm of arms) {
    arm.think(products);
    arm.update();
  }

  // 5. Update Pushers
  for (let pusher of pushers) {
    pusher.update(products);
  }

  // 6. Update Gates
  for (let g of gates) {
    g.update(products);
  }

  // 7. Update Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.update();
    if (p.isDead()) particles.splice(i, 1);
  }

  // --- Rendering ---

  drawEnvironment();

  for (let f of feeders) f.show();
  for (let p of products) p.show();
  for (let pusher of pushers) pusher.show();
  for (let arm of arms) arm.show();
  for (let g of gates) g.show();

  // Draw Particles with additive blending
  push();
  noLights();
  blendMode(ADD);
  for (let p of particles) {
    p.show();
  }
  pop();
}

function drawEnvironment() {
  push();
  translate(0, beltY + 50, 0);

  // Floor glow
  noStroke();
  fill(220, 60, 10, 80);
  box(2500, 10, tunnelDepth * 2.5);

  // Center Conveyor Belt
  fill(0, 0, 5);
  translate(0, -10, 0);
  box(320, 10, tunnelDepth * 2.5);

  // Moving Grid Lines
  strokeWeight(2);
  let offset = (frameCount * conveyorSpeed) % 200;

  for (let z = -tunnelDepth; z < 1500; z += 200) {
    let lineZ = z + offset;
    stroke(40, 100, 100);
    line(-150, -6, lineZ, 150, -6, lineZ);

    stroke(200, 50, 40);
    line(-1000, 10, lineZ, -200, 10, lineZ);
    line(200, 10, lineZ, 1000, 10, lineZ);
  }
  pop();

  // Ceiling
  push();
  translate(0, -400, 0);
  noStroke();
  for (let z = -tunnelDepth; z < 1500; z += 500) {
    push();
    translate(0, 0, z + offset * 0.5);
    fill(0, 0, 15);
    box(1800, 30, 80);
    translate(0, 20, 0);
    emissiveMaterial(190, 80, 80);
    fill(190, 80, 80);
    box(1000, 5, 10);
    pop();
  }
  pop();
}

// --- Classes ---

class ScannerGate {
  constructor(z) {
    this.z = z;
    this.pos = createVector(0, beltY, z);
    this.stampY = -250; // Relative to gate center
    this.state = 'IDLE'; // IDLE, STAMP, RETRACT
    this.detectedProduct = null;
    this.gateWidth = 380;
    this.gateHeight = 350;
    this.hue = 130; // Greenish for QC
  }

  update(products) {
    if (this.state === 'IDLE') {
       for (let p of products) {
         // Check if product is directly under and hasn't been scanned
         if (!p.scanned && abs(p.pos.z - this.z) < 20) {
           this.state = 'STAMP';
           this.detectedProduct = p;
           break;
         }
       }
    } else if (this.state === 'STAMP') {
       // Fast down stroke
       this.stampY += 25;
       // Target height is roughly the top of the box (-45 from beltY)
       // Gate is at beltY, so top of box is -45 relative to gate base
       // We want the stamper to hit that point.
       if (this.stampY >= -60) {
         this.stampY = -60;
         this.state = 'RETRACT';
         if (this.detectedProduct) {
            this.detectedProduct.scanned = true;
            this.spawnSparks();
         }
       }
    } else if (this.state === 'RETRACT') {
       // Slower retract
       this.stampY -= 10;
       if (this.stampY <= -250) {
         this.stampY = -250;
         this.state = 'IDLE';
         this.detectedProduct = null;
       }
    }
  }

  spawnSparks() {
    for(let i=0; i<20; i++) {
       particles.push(new Particle(0, this.pos.y - 60, this.z, this.hue));
    }
  }

  show() {
    push();
    translate(0, this.pos.y, this.z);

    // -- Structure --
    noStroke();
    fill(200, 20, 20);

    // Pillars
    push();
    translate(-200, -175, 0);
    box(40, 350, 60);
    translate(400, 0, 0);
    box(40, 350, 60);
    pop();

    // Crossbeam
    push();
    translate(0, -350, 0);
    fill(200, 30, 15);
    box(460, 50, 80);

    // Status Lights
    translate(-180, 0, 42);
    if (this.state === 'IDLE') fill(this.hue, 100, 50);
    else fill(0, 100, 100); // Red when busy
    emissiveMaterial(0, 100, 100);
    box(20, 20, 5);
    translate(360, 0, 0);
    box(20, 20, 5);
    pop();

    // -- Laser Scanner Field --
    if (this.state === 'IDLE') {
        push();
        translate(0, -175, 0);
        stroke(this.hue, 100, 100, 40);
        strokeWeight(2);
        noFill();
        // Draw a scanning fan
        let scanOffset = (frameCount * 2) % 60 - 30;
        line(-150, -150, 0, 0, 150, 0);
        line(150, -150, 0, 0, 150, 0);

        // Horizontal scan line moving down
        stroke(this.hue, 100, 100, 80);
        line(-150, scanOffset, 0, 150, scanOffset, 0);
        pop();
    }

    // -- Stamper Mechanism --
    translate(0, this.stampY, 0);

    // Piston Rod
    fill(0, 0, 60);
    cylinder(15, 100);

    // Stamp Head
    translate(0, 50, 0);
    if (this.state === 'RETRACT') {
        fill(this.hue, 80, 100);
        emissiveMaterial(this.hue, 80, 100);
    } else {
        fill(this.hue, 80, 40);
        specularMaterial(255);
    }
    box(80, 20, 80);

    pop();
  }
}

class SidePusher {
  constructor(x, y, z, side) {
    this.pos = createVector(x, y, z);
    this.side = side; // 1 (Right) or -1 (Left)
    this.state = 'IDLE'; // IDLE, PUSH, RETRACT
    this.extension = 0; // 0.0 to 1.0
    this.maxStroke = 140; // How far it pushes in
    this.width = 100; // Z-width of the paddle
    this.hue = side > 0 ? 320 : 190;
    this.targetProduct = null;
  }

  update(products) {
    if (this.state === 'IDLE') {
      for (let p of products) {
        let dz = p.pos.z - this.pos.z;
        if (dz > -60 && dz < -40 && !p.isRotating) {
          this.state = 'PUSH';
          this.targetProduct = p;
          break;
        }
      }
    }
    else if (this.state === 'PUSH') {
      this.extension += 0.15;
      if (this.extension >= 1.0) {
        this.extension = 1.0;
        this.state = 'RETRACT';
        if (this.targetProduct) {
          this.targetProduct.targetRotY += HALF_PI;
          this.targetProduct.isRotating = true;
          this.spawnEffects();
        }
      }
    }
    else if (this.state === 'RETRACT') {
      this.extension -= 0.05;
      if (this.extension <= 0) {
        this.extension = 0;
        this.state = 'IDLE';
        if (this.targetProduct) {
          this.targetProduct.isRotating = false;
          this.targetProduct = null;
        }
      }
    }
  }

  spawnEffects() {
    let impactX = this.pos.x - (this.side * this.maxStroke);
    for(let i=0; i<10; i++) {
       particles.push(new Particle(impactX, this.pos.y, this.pos.z + random(-20, 20), this.hue));
    }
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y, this.pos.z);
    fill(0, 0, 20);
    noStroke();
    box(60, 60, 140);
    translate(0, -35, 0);
    if (this.state !== 'IDLE') {
      emissiveMaterial(this.hue, 100, 100);
      fill(this.hue, 100, 100);
    } else {
      fill(this.hue, 100, 30);
    }
    cylinder(5, 10);
    translate(0, 35, 0);
    let currentX = -this.side * this.extension * this.maxStroke;
    push();
    translate(currentX / 2, 0, 0);
    rotateZ(PI/2);
    fill(0, 0, 60);
    cylinder(8, abs(currentX) + 40);
    pop();
    translate(currentX, 0, 0);
    fill(this.hue, 80, 60);
    stroke(this.hue, 100, 100);
    strokeWeight(2);
    if (this.side > 0) {
      beginShape();
      vertex(0, -20, -this.width/2);
      vertex(0, -20, this.width/2);
      vertex(0, 20, this.width/2);
      vertex(0, 20, -this.width/2);
      endShape(CLOSE);
    } else {
      beginShape();
      vertex(0, -20, -this.width/2);
      vertex(0, -20, this.width/2);
      vertex(0, 20, this.width/2);
      vertex(0, 20, -this.width/2);
      endShape(CLOSE);
    }
    noStroke();
    fill(0, 0, 10);
    translate(-this.side * 5, 0, 0);
    box(10, 30, this.width - 10);
    pop();
  }
}

class Feeder {
  constructor(x, y, z, dir) {
    this.pos = createVector(x, y, z);
    this.y = y;
    this.z = z;
    this.dir = dir;
    this.items = [];
    this.spawnTimer = random(100);
  }

  update() {
    this.spawnTimer++;
    if (this.spawnTimer > 120) {
      let startX = this.pos.x + (this.dir * -400);
      this.items.push(new FeederItem(startX, this.y - 15, this.z, this.dir));
      this.spawnTimer = 0;
    }
    for (let i = this.items.length - 1; i >= 0; i--) {
      let item = this.items[i];
      item.update();
      let distToCenter = abs(item.pos.x);
      if (distToCenter < 600) {
        item.ready = true;
        if (!item.picked) {
           item.pos.y = this.y - 15 + sin(frameCount * 0.2) * 3;
        } else {
           this.items.splice(i, 1);
        }
      } else {
        item.ready = false;
      }
    }
  }

  show() {
    push();
    translate(0, 0, this.z);
    let beltLen = 800;
    translate(this.pos.x, this.y, 0);
    noStroke();
    fill(0, 0, 12);
    box(beltLen, 10, 100);
    fill(this.dir > 0 ? 320 : 190, 80, 50);
    translate(0, -5, 50);
    box(beltLen, 6, 6);
    translate(0, 0, -100);
    box(beltLen, 6, 6);
    pop();
    for (let item of this.items) item.show();
  }

  getReadyItem() {
    for (let item of this.items) {
      if (item.ready && !item.picked) return item;
    }
    return null;
  }
}

class FeederItem {
  constructor(x, y, z, dir) {
    this.pos = createVector(x, y, z);
    this.dir = dir;
    this.ready = false;
    this.picked = false;
    this.hue = dir > 0 ? 320 : 190;
    this.shapeSeed = random(100);
  }

  update() {
    if (!this.ready) {
      this.pos.x += this.dir * 3;
    }
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y, this.pos.z);
    fill(this.hue, 80, 80);
    stroke(this.hue, 100, 100);
    strokeWeight(1);
    if (this.shapeSeed < 33) box(30);
    else if (this.shapeSeed < 66) cylinder(15, 30);
    else sphere(18);
    noStroke();
    fill(0, 0, 100, 40);
    sphere(8);
    pop();
  }
}

class Product {
  constructor(z, y) {
    this.pos = createVector(0, y, z);
    this.w = 140;
    this.h = 90;
    this.d = 140;
    this.hue = random() > 0.5 ? 320 : 190;
    this.partsAdded = 0;
    this.rotY = 0;
    this.targetRotY = 0;
    this.isRotating = false;
    this.scanned = false; // New property
  }

  update() {
    this.pos.z += conveyorSpeed;
    this.rotY = lerp(this.rotY, this.targetRotY, 0.15);
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y, this.pos.z);
    rotateY(this.rotY);

    stroke(this.hue, 100, 100);
    strokeWeight(2);
    fill(this.hue, 40, 15, 90);
    specularMaterial(this.hue, 20, 100);
    shininess(50);
    box(this.w, this.h, this.d);

    fill(0, 0, 80);
    translate(0, -this.h/2, 0);
    box(this.w - 20, 5, this.d - 20);

    // Draw Scanned Label
    if (this.scanned) {
        push();
        translate(0, -4, 0);
        fill(130, 100, 100);
        emissiveMaterial(130, 100, 100);
        noStroke();
        rectMode(CENTER);
        rotateX(PI/2);
        rect(0, 0, 60, 60);
        pop();
    }

    if (this.partsAdded > 0) {
      for(let i=0; i<this.partsAdded; i++) {
        push();
        let side = (i % 2 === 0) ? 1 : -1;
        translate(side * 40, -20, (i * 10) - 20);
        fill(0, 0, 100);
        emissiveMaterial(side > 0 ? 190 : 320, 100, 100);
        box(20, 20, 20);
        pop();
      }
    }
    pop();
  }
}

class RobotArm {
  constructor(x, y, z, len1, len2, isLeft, feeder) {
    this.base = createVector(x, y, z);
    this.len1 = len1;
    this.len2 = len2;
    this.isLeft = isLeft;
    this.feeder = feeder;

    this.state = 'IDLE';
    this.stateTimer = 0;
    this.heldItem = false;

    this.baseRot = isLeft ? 0 : PI;
    this.angle1 = PI / 4;
    this.angle2 = -PI / 2;

    this.targetPos = createVector(x + (isLeft ? -200 : 200), y + 200, z);
    this.currentPos = this.targetPos.copy();
    this.laserActive = false;
  }

  think(products) {
    let mainTarget = null;
    this.laserActive = false;

    for (let p of products) {
      let dz = p.pos.z - this.base.z;
      if (dz > -200 && dz < 200) {
        mainTarget = p;
        break;
      }
    }

    if (this.state === 'IDLE') {
      let item = this.feeder.getReadyItem();
      if (item) {
        this.targetPos.set(item.pos.x, item.pos.y, item.pos.z);
        if (this.isAtTarget(20)) {
          this.state = 'GRAB';
          item.picked = true;
          this.stateTimer = 10;
        }
      } else {
        let restX = this.base.x + (this.isLeft ? -250 : 250);
        this.targetPos.set(restX, this.base.y + 150, this.base.z);
      }
    }
    else if (this.state === 'GRAB') {
      this.stateTimer--;
      if (this.stateTimer <= 0) {
        this.heldItem = true;
        this.state = 'HOLD';
      }
    }
    else if (this.state === 'HOLD') {
      let waitX = this.isLeft ? -120 : 120;
      this.targetPos.set(waitX, this.base.y + 100, this.base.z);
      if (mainTarget && this.isAtTarget(50)) {
        this.state = 'INSTALL';
      }
    }
    else if (this.state === 'INSTALL') {
      if (mainTarget) {
        let weldX = mainTarget.pos.x + (this.isLeft ? -30 : 30);
        let weldY = mainTarget.pos.y - 60;
        let weldZ = mainTarget.pos.z;

        this.targetPos.set(weldX, weldY, weldZ);
        this.laserActive = true;

        if (dist(this.currentPos.x, this.currentPos.y, this.currentPos.z, weldX, weldY, weldZ) < 30) {
          this.createEffects(weldX, weldY, weldZ);
          if (random() < 0.1) {
            mainTarget.partsAdded++;
            this.heldItem = false;
            this.state = 'IDLE';
          }
        }

        if (mainTarget.pos.z > this.base.z + 200) {
           this.state = 'IDLE';
           this.heldItem = false;
        }
      } else {
        this.state = 'IDLE';
      }
    }

    this.currentPos.lerp(this.targetPos, 0.1);
    this.solveIK(this.currentPos.x, this.currentPos.y, this.currentPos.z);
  }

  isAtTarget(tolerance) {
    return p5.Vector.dist(this.currentPos, this.targetPos) < tolerance;
  }

  solveIK(tx, ty, tz) {
    let dx = tx - this.base.x;
    let dz = tz - this.base.z;
    let targetRot = atan2(dz, dx);
    let hDist = sqrt(dx*dx + dz*dz);
    let dy = ty - this.base.y;
    let distToTarget = sqrt(hDist*hDist + dy*dy);

    let maxReach = this.len1 + this.len2 - 10;
    if (distToTarget > maxReach) {
      let ratio = maxReach / distToTarget;
      hDist *= ratio;
      dy *= ratio;
      distToTarget = maxReach;
    }

    let a = this.len1;
    let b = this.len2;
    let c = distToTarget;

    let angleA = acos(constrain((a*a + c*c - b*b) / (2*a*c), -1, 1));
    let angleB = acos(constrain((a*a + b*b - c*c) / (2*a*b), -1, 1));
    let angleToTarget = atan2(dy, hDist);

    let tA1 = angleToTarget - angleA;
    let tA2 = PI - angleB;

    this.baseRot = lerp(this.baseRot, targetRot, 0.2);
    this.angle1 = lerp(this.angle1, tA1, 0.2);
    this.angle2 = lerp(this.angle2, tA2, 0.2);
  }

  createEffects(x, y, z) {
    for(let i=0; i<3; i++) {
      particles.push(new Particle(x, y, z, this.isLeft ? 190 : 320));
    }
    push();
    translate(x, y, z);
    if (frameCount % 4 < 2) {
      pointLight(0, 0, 100, 0, 0, 0);
    }
    pop();
  }

  update() {}

  show() {
    push();
    translate(this.base.x, this.base.y, this.base.z);
    fill(40);
    cylinder(40, 30);
    rotateY(-this.baseRot);
    fill(60);
    sphere(30);
    rotateZ(this.angle1);
    push();
    translate(this.len1 / 2, 0, 0);
    fill(25);
    stroke(this.isLeft ? 190 : 320, 80, 80);
    strokeWeight(2);
    box(this.len1, 30, 30);
    noStroke();
    fill(80);
    translate(0, -20, 0);
    cylinder(5, this.len1 * 0.8);
    pop();
    translate(this.len1, 0, 0);
    fill(50);
    cylinder(25, 40);
    rotateZ(this.angle2);
    push();
    translate(this.len2 / 2, 0, 0);
    fill(30);
    stroke(this.isLeft ? 190 : 320, 80, 80);
    strokeWeight(2);
    box(this.len2, 22, 22);
    pop();
    translate(this.len2, 0, 0);
    fill(70);
    box(20);
    push();
    rotateY(PI/2);
    fill(20);
    cylinder(8, 30);
    translate(0, 15, 0);
    fill(this.isLeft ? 190 : 320, 100, 100);
    cone(5, 15);
    pop();
    if (this.heldItem) {
      push();
      translate(25, 0, 0);
      noStroke();
      fill(this.isLeft ? 190 : 320, 100, 100);
      box(25);
      fill(this.isLeft ? 190 : 320, 100, 100, 50);
      sphere(20);
      pop();
    }
    pop();
    if (this.laserActive) {
      push();
      blendMode(ADD);
      strokeWeight(4);
      let hue = this.isLeft ? 190 : 320;
      stroke(hue, 100, 100);
      line(this.currentPos.x, this.currentPos.y, this.currentPos.z,
           this.targetPos.x, this.targetPos.y, this.targetPos.z);
      translate(this.targetPos.x, this.targetPos.y, this.targetPos.z);
      noStroke();
      fill(hue, 50, 100);
      sphere(10);
      pop();
    }
  }
}

class Particle {
  constructor(x, y, z, hue) {
    this.pos = createVector(x, y, z);
    this.vel = p5.Vector.random3D().mult(random(3, 8));
    this.vel.y = -abs(this.vel.y);
    this.life = 255;
    this.hue = hue;
  }

  update() {
    this.vel.y += 0.3;
    this.pos.add(this.vel);
    this.life -= 10;
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y, this.pos.z);
    stroke(this.hue, 100, 100, map(this.life, 0, 255, 0, 100));
    strokeWeight(3);
    point(0, 0);
    pop();
  }

  isDead() {
    return this.life <= 0;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
