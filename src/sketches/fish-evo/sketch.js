const CONFIG = {
  segmentCount: 20,
  segmentLength: 30,
  segmentWidth: 40,
  stiffness: 0.5,
  damping: 0.92,
  muscleStrength: 0.15,
  neuralSpeed: 0.15,
  neuralFrequency: 0.4
};

let creature;

function setup() {
  createCanvas(windowWidth, windowHeight);
  creature = new Organism(width / 2, height / 2);
}

function draw() {
  background(10, 15, 20, 200); // Slight trail effect

  // Physics Update
  creature.update();

  // Visuals
  creature.draw();

  // UI / Info
  drawUI();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function drawUI() {
  noStroke();
  fill(255);
  textSize(12);
  textAlign(LEFT, TOP);
  text("NEURO-MUSCULAR SIMULATION", 20, 20);
  fill(150);
  text("Click & Drag to pull the creature.", 20, 40);
  text("Muscles contract based on propagated sine wave signal.", 20, 55);
}

// --- Physics Engine Classes ---

class Node {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.oldPos = createVector(x, y);
    this.isLocked = false;
    this.mass = 1;
  }

  update() {
    if (this.isLocked) return;

    let vel = p5.Vector.sub(this.pos, this.oldPos);
    vel.mult(CONFIG.damping);

    this.oldPos.set(this.pos);
    this.pos.add(vel);

    // Mouse Interaction
    if (mouseIsPressed) {
      let d = dist(mouseX, mouseY, this.pos.x, this.pos.y);
      if (d < 150) {
        let force = p5.Vector.sub(createVector(mouseX, mouseY), this.pos);
        force.setMag(0.5); // Attraction force
        this.pos.add(force);
      }
    }

    // Boundary bounce
    if (this.pos.x < 0) { this.pos.x = 0; this.oldPos.x = this.pos.x + vel.x; }
    if (this.pos.x > width) { this.pos.x = width; this.oldPos.x = this.pos.x + vel.x; }
    if (this.pos.y < 0) { this.pos.y = 0; this.oldPos.y = this.pos.y + vel.y; }
    if (this.pos.y > height) { this.pos.y = height; this.oldPos.y = this.pos.y + vel.y; }
  }
}

class Constraint {
  constructor(n1, n2, length, type) {
    this.n1 = n1;
    this.n2 = n2;
    this.restLength = length || p5.Vector.dist(n1.pos, n2.pos);
    this.type = type; // 'bone' or 'muscle'
    this.activation = 0; // 0 to 1
  }

  resolve() {
    let delta = p5.Vector.sub(this.n2.pos, this.n1.pos);
    let currentDist = delta.mag();

    if (currentDist === 0) return; // Prevent divide by zero

    let targetLen = this.restLength;

    // If muscle, modify target length based on activation
    if (this.type === 'muscle') {
      // Contract (shorten) or Relax (lengthen) based on signal
      // -0.5 to shorten significantly, +0.2 to relax slightly
      let deformation = map(this.activation, -1, 1, -CONFIG.muscleStrength, CONFIG.muscleStrength);
      targetLen = this.restLength * (1 + deformation);
    }

    let diff = (currentDist - targetLen) / currentDist;

    // Stiffness factor
    let correction = diff * 0.5 * CONFIG.stiffness;
    let offset = delta.mult(correction);

    if (!this.n1.isLocked) this.n1.pos.add(offset);
    if (!this.n2.isLocked) this.n2.pos.sub(offset);
  }

  draw() {
    if (this.type === 'bone') {
      stroke(100, 100, 100, 150);
      strokeWeight(1);
      line(this.n1.pos.x, this.n1.pos.y, this.n2.pos.x, this.n2.pos.y);
    } else if (this.type === 'muscle') {
      // Visualizing activation: Red = Contracted, Blue = Relaxed/Expanded
      let r = map(this.activation, -1, 1, 255, 50);
      let b = map(this.activation, -1, 1, 50, 255);
      let w = map(abs(this.activation), 0, 1, 1, 4); // Thicker when active

      stroke(r, 50, b, 200);
      strokeWeight(w);
      line(this.n1.pos.x, this.n1.pos.y, this.n2.pos.x, this.n2.pos.y);

      // Draw "Nerve" spark
      if (abs(this.activation) > 0.5) {
        noStroke();
        fill(255, 255, 255, 200);
        let midX = (this.n1.pos.x + this.n2.pos.x) / 2;
        let midY = (this.n1.pos.y + this.n2.pos.y) / 2;
        circle(midX, midY, w * 1.5);
      }
    }
  }
}

class Organism {
  constructor(startX, startY) {
    this.nodes = [];
    this.constraints = [];
    this.muscles = [];

    // Build a truss structure (ladder)
    // L0--L1--L2
    // | \/ | \/ |
    // R0--R1--R2

    let dirX = 1;
    let dirY = 0;

    for (let i = 0; i < CONFIG.segmentCount; i++) {
      let x = startX + i * CONFIG.segmentLength;
      let y = startY;

      // Create Left and Right nodes
      let lNode = new Node(x, y - CONFIG.segmentWidth / 2);
      let rNode = new Node(x, y + CONFIG.segmentWidth / 2);

      this.nodes.push(lNode, rNode);

      // Cross-rung (Bone) - keeps width constant
      this.constraints.push(new Constraint(lNode, rNode, null, 'bone'));

      if (i > 0) {
        let prevL = this.nodes[(i - 1) * 2];
        let prevR = this.nodes[(i - 1) * 2 + 1];

        // Side connections (Bones) - spine rigidity
        this.constraints.push(new Constraint(prevL, lNode, null, 'bone'));
        this.constraints.push(new Constraint(prevR, rNode, null, 'bone'));

        // Diagonal connections (Muscles) - actuation
        // Muscle A: Top-Left to Bottom-Right
        let m1 = new Constraint(prevL, rNode, null, 'muscle');
        // Muscle B: Bottom-Left to Top-Right
        let m2 = new Constraint(prevR, lNode, null, 'muscle');

        // Store reference to apply signal later
        // We assign a phase offset based on segment index
        m1.phase = i * CONFIG.neuralFrequency;
        m2.phase = i * CONFIG.neuralFrequency;

        this.constraints.push(m1, m2);
        this.muscles.push({ m1, m2, index: i });
      }
    }
  }

  update() {
    let time = frameCount * CONFIG.neuralSpeed;

    // 1. Neural Update: Send signals to muscles
    for (let pair of this.muscles) {
      // Central Pattern Generator (Sine wave)
      // Traveling wave equation: sin(time - phase)
      let signal = sin(time - pair.index * CONFIG.neuralFrequency);

      // Antagonistic pairs: When one contracts (-), the other expands (+)
      pair.m1.activation = signal;
      pair.m2.activation = -signal;
    }

    // 2. Physics Update (Verlet Integration)
    for (let n of this.nodes) {
      n.update();
    }

    // 3. Constraint Resolution (Iterate for stability)
    for (let k = 0; k < 5; k++) {
      for (let c of this.constraints) {
        c.resolve();
      }
    }
  }

  draw() {
    // Draw constraints (Bones and Muscles)
    for (let c of this.constraints) {
      c.draw();
    }

    // Draw Nodes (Joints)
    noStroke();
    fill(255);
    for (let n of this.nodes) {
      ellipse(n.pos.x, n.pos.y, 4, 4);
    }

    // Draw Head visual
    let headL = this.nodes[0];
    let headR = this.nodes[1];
    let cx = (headL.pos.x + headR.pos.x) / 2;
    let cy = (headL.pos.y + headR.pos.y) / 2;

    fill(0, 255, 200, 100);
    ellipse(cx, cy, CONFIG.segmentWidth * 1.5);
    fill(255);
    text("BRAIN", cx - 15, cy - 25);
  }
}
