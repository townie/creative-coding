/**
 * ROBO-CATCHER: KINEMATIC INTERCEPT GAME v1.0
 *
 * Instructions:
 * - Drag the projectile on the left to aim and power up.
 * - Release to shoot at the robot.
 * - The Robot AI will attempt to intercept the projectile mid-air.
 * - Caught items are deposited in the bin.
 *
 * Features:
 * - Trajectory Prediction & Visualization
 * - High-Speed Kinematic Interception AI
 * - Dynamic Physics Engine
 * - Performance Analytics (Catch Rate, Reaction Time)
 */

let simulation;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Courier New');
  simulation = new GameSimulation();
}

function draw() {
  background(15, 18, 22);
  simulation.update();
  simulation.draw();
}

function mousePressed() {
  if (simulation) simulation.handlePress(mouseX, mouseY);
}

function mouseDragged() {
  if (simulation) simulation.handleDrag(mouseX, mouseY);
}

function mouseReleased() {
  if (simulation) simulation.handleRelease();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (simulation) simulation.resize();
}

// ---------------- MATH KERNEL ----------------

class Mat3 {
  constructor() { this.reset(); }
  reset() { this.val = [1, 0, 0, 0, 1, 0, 0, 0, 1]; }
  mult(m) {
    let a = this.val, b = m.val;
    let r00 = a[0]*b[0] + a[1]*b[3];
    let r01 = a[0]*b[1] + a[1]*b[4];
    let tx  = a[0]*b[2] + a[1]*b[5] + a[2];
    let r10 = a[3]*b[0] + a[4]*b[3];
    let r11 = a[3]*b[1] + a[4]*b[4];
    let ty  = a[3]*b[2] + a[4]*b[5] + a[5];
    this.val[0] = r00; this.val[1] = r01; this.val[2] = tx;
    this.val[3] = r10; this.val[4] = r11; this.val[5] = ty;
    return this;
  }
  translate(x, y) {
    let m = new Mat3(); m.val[2] = x; m.val[5] = y;
    return this.mult(m);
  }
  rotate(theta) {
    let m = new Mat3();
    let c = cos(theta), s = sin(theta);
    m.val[0] = c; m.val[1] = -s; m.val[3] = s; m.val[4] = c;
    return this.mult(m);
  }
  getPos() { return createVector(this.val[2], this.val[5]); }
  copy() { let m = new Mat3(); m.val = [...this.val]; return m; }
}

// ---------------- ANALYTICS ENGINE ----------------

class AnalyticsEngine {
  constructor() {
    this.history = [];
    this.catches = 0;
    this.misses = 0;
    this.streak = 0;
    this.bestStreak = 0;

    this.stats = {
      total: 0,
      catchRate: 0,
      avgReaction: 0
    };
  }

  recordCatch(reactionTime) {
    this.catches++;
    this.streak++;
    if (this.streak > this.bestStreak) this.bestStreak = this.streak;
    this.history.push({ type: 'catch', time: reactionTime, ts: millis() });
    if (this.history.length > 50) this.history.shift();
    this.computeStats();
  }

  recordMiss() {
    this.misses++;
    this.streak = 0;
    this.history.push({ type: 'miss', time: 0, ts: millis() });
    if (this.history.length > 50) this.history.shift();
    this.computeStats();
  }

  computeStats() {
    this.stats.total = this.catches + this.misses;
    this.stats.catchRate = this.stats.total > 0 ? (this.catches / this.stats.total) * 100 : 0;

    let catchTimes = this.history.filter(h => h.type === 'catch').map(h => h.time);
    let sum = catchTimes.reduce((a, b) => a + b, 0);
    this.stats.avgReaction = catchTimes.length ? sum / catchTimes.length : 0;
  }
}

// ---------------- UI: CONTROL PANEL ----------------

class SidebarUI {
  constructor(sim) {
    this.sim = sim;
    this.expandedW = 200;
    this.w = this.expandedW;
    this.isCollapsed = false;
    this.padding = 20;
    this.buttons = [];
    this.toggleBtn = { x: 20, y: 20, w: 100, h: 30 };
    this.setupButtons();
  }

  setupButtons() {
    let x = this.padding;
    let yStart = 120;

    this.buttons.push({
      id: 'reset_ball', label: 'RESET BALL',
      x: x, y: yStart, w: this.expandedW - 40, h: 40,
      bg: color(0, 60, 120), activeBg: color(0, 100, 200),
      action: () => this.sim.resetProjectile()
    });

    this.buttons.push({
      id: 'cam', label: 'TOGGLE CAM',
      x: x, y: yStart + 55, w: this.expandedW - 40, h: 40,
      bg: color(60), activeBg: color(100),
      action: () => { this.sim.cam.visible = !this.sim.cam.visible; }
    });

    this.buttons.push({
      id: 'reset_stats', label: 'CLR STATS',
      x: x, y: yStart + 110, w: this.expandedW - 40, h: 40,
      bg: color(80, 20, 20), activeBg: color(120, 30, 30),
      action: () => { this.sim.analytics = new AnalyticsEngine(); this.sim.statsUI.data = this.sim.analytics; }
    });
  }

  toggle() {
    this.isCollapsed = !this.isCollapsed;
    this.w = this.isCollapsed ? 0 : this.expandedW;
    this.sim.resize();
  }

  checkClick(mx, my) {
    if (mx > this.toggleBtn.x && mx < this.toggleBtn.x + this.toggleBtn.w &&
        my > this.toggleBtn.y && my < this.toggleBtn.y + this.toggleBtn.h) {
      this.toggle();
      return true;
    }
    if (this.isCollapsed) return false;
    if (mx > this.w) return false;
    for (let btn of this.buttons) {
      if (mx > btn.x && mx < btn.x + btn.w && my > btn.y && my < btn.y + btn.h) {
        btn.action();
        return true;
      }
    }
    return true;
  }

  draw() {
    if (this.isCollapsed) {
      this.drawToggleButton(true);
      return;
    }

    fill(10, 12, 16, 240);
    stroke(40); strokeWeight(1);
    rect(0, 0, this.w, height);

    stroke(0, 255, 255); strokeWeight(2);
    line(this.padding, 65, this.w - this.padding, 65);

    fill(0, 255, 255); noStroke();
    textSize(18); textAlign(LEFT, TOP);
    text("GAME CONTROLS", this.padding, 75);

    for (let btn of this.buttons) this.drawButton(btn);
    this.drawToggleButton(false);
  }

  drawToggleButton(collapsed) {
    let btn = this.toggleBtn;
    let isHover = mouseX > btn.x && mouseX < btn.x + btn.w && mouseY > btn.y && mouseY < btn.y + btn.h;
    fill(isHover ? 60 : 40); stroke(isHover ? 150 : 100); strokeWeight(1);
    rect(btn.x, btn.y, btn.w, btn.h, 4);
    fill(255); noStroke(); textAlign(CENTER, CENTER); textSize(12);
    text(collapsed ? "MENU" : "HIDE", btn.x + btn.w/2, btn.y + btn.h/2);
  }

  drawButton(btn) {
    let isHover = mouseX > btn.x && mouseX < btn.x + btn.w && mouseY > btn.y && mouseY < btn.y + btn.h;
    fill(isHover ? btn.activeBg : btn.bg); stroke(255, 50);
    strokeWeight(1); rect(btn.x, btn.y, btn.w, btn.h, 4);
    fill(255); noStroke(); textAlign(CENTER, CENTER); textSize(14);
    text(btn.label, btn.x + btn.w/2, btn.y + btn.h/2);
  }
}

// ---------------- UI: SCOREBOARD ----------------

class StatsUI {
  constructor(sim, analytics) {
    this.sim = sim;
    this.data = analytics;
    this.expandedW = 240;
    this.w = this.expandedW;
    this.padding = 20;
  }

  draw() {
    let x = width - this.w;

    // Panel Background
    fill(10, 12, 16, 245);
    stroke(40); strokeWeight(1);
    rect(x, 0, this.w, height);

    // Header
    stroke(255, 150, 0); strokeWeight(2);
    line(x + this.padding, 65, width - this.padding, 65);
    fill(255, 150, 0); noStroke();
    textSize(18); textAlign(LEFT, TOP);
    text("SCOREBOARD", x + this.padding, 75);

    // Main Stats
    let y = 110;
    this.drawStatRow("CATCHES", this.data.catches, y, color(0, 255, 0));
    this.drawStatRow("MISSES", this.data.misses, y += 30, color(255, 50, 50));
    this.drawStatRow("STREAK", this.data.streak, y += 30);
    this.drawStatRow("BEST", this.data.bestStreak, y += 30, color(255, 215, 0));

    y += 50;
    fill(150); textSize(10); text("METRICS", x + this.padding, y);
    y += 20;
    this.drawStatRow("RATE", this.data.stats.catchRate.toFixed(1) + "%", y);
    this.drawStatRow("REACT", this.data.stats.avgReaction.toFixed(0) + "ms", y += 30);

    // Visual History
    y += 50;
    this.drawHistory(x + this.padding, y, this.w - this.padding*2);
  }

  drawStatRow(label, val, y, valColor = 255) {
    fill(180); noStroke(); textSize(12); textAlign(LEFT, TOP);
    text(label, width - this.w + this.padding, y);
    fill(valColor); textAlign(RIGHT, TOP);
    text(val, width - this.padding, y);
  }

  drawHistory(x, y, w) {
    let h = 20;
    let rw = w / 20;
    noStroke();
    let start = Math.max(0, this.data.history.length - 20);
    for(let i = 0; i < 20; i++) {
      let idx = start + i;
      if (idx < this.data.history.length) {
        let item = this.data.history[idx];
        fill(item.type === 'catch' ? color(0, 255, 0) : color(255, 0, 0));
        rect(x + i*rw, y, rw - 2, h);
      } else {
        fill(30);
        rect(x + i*rw, y, rw - 2, h);
      }
    }
  }
}

// ---------------- CAMERA SYSTEM ----------------

class EndEffectorCam {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.margin = 20;
    this.visible = true;
  }

  render(sim) {
    if (!this.visible) return;
    let x = width - this.w - this.margin - sim.statsUI.w - 10;
    let y = this.margin;

    push();
    translate(x, y);

    // Frame
    stroke(0, 255, 255); strokeWeight(2); fill(0);
    rect(0, 0, this.w, this.h);

    // Clip Content
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(0, 0, this.w, this.h);
    drawingContext.clip();

    background(10, 20, 10);

    push();
    translate(this.w/2, this.h/2);
    let tcp = sim.robot.frames.tcp.getPos();
    let angle = sim.robot.getGlobalWristAngle();
    rotate(-angle - HALF_PI);
    translate(-tcp.x, -tcp.y);

    sim.drawEnvironment();
    if (sim.projectile) sim.projectile.draw();
    sim.tote.draw();

    pop();

    // HUD
    stroke(0, 255, 0, 100); strokeWeight(1);
    line(this.w/2 - 10, this.h/2, this.w/2 + 10, this.h/2);
    line(this.w/2, this.h/2 - 10, this.w/2, this.h/2 + 10);

    fill(0, 255, 0); noStroke(); textSize(10); textAlign(LEFT, TOP);
    text("TRACKING_CAM", 5, 5);
    if (sim.robot.state === "INTERCEPT") {
      fill(255, 0, 0);
      text("TARGET LOCK", 5, 18);
    }

    drawingContext.restore();
    pop();
  }
}

// ---------------- GAME SIMULATION ----------------

class GameSimulation {
  constructor() {
    this.floorY = height - 100;
    this.gravity = createVector(0, 0.4);

    this.analytics = new AnalyticsEngine();
    this.ui = new SidebarUI(this);
    this.statsUI = new StatsUI(this, this.analytics);
    this.cam = new EndEffectorCam(200, 150);

    this.robot = new KinematicRobot(0, this.floorY);
    this.tote = new Tote(0, this.floorY);

    // Slingshot Variables
    this.anchor = createVector(150, height - 250);
    this.dragPos = this.anchor.copy();
    this.isDragging = false;
    this.maxDrag = 150;

    this.projectile = new Projectile(this.anchor.x, this.anchor.y);

    this.resize();
  }

  resize() {
    this.floorY = height - 100;
    this.anchor.set(this.ui.w + 100, height - 250);
    if (!this.projectile.launched) {
      this.projectile.pos = this.anchor.copy();
      this.dragPos = this.anchor.copy();
    }

    let robotX = width - this.statsUI.w - 300;
    this.robot.origin.set(robotX, this.floorY);
    this.tote.pos.set(robotX + 150, this.floorY);
  }

  resetProjectile() {
    this.projectile = new Projectile(this.anchor.x, this.anchor.y);
    this.dragPos = this.anchor.copy();
    this.isDragging = false;
    this.robot.resetState();
  }

  handlePress(mx, my) {
    if (this.ui.checkClick(mx, my)) return;

    // Check if clicking projectile
    if (!this.projectile.launched && !this.projectile.caught &&
        dist(mx, my, this.projectile.pos.x, this.projectile.pos.y) < 40) {
      this.isDragging = true;
    }
  }

  handleDrag(mx, my) {
    if (this.isDragging) {
      this.dragPos.set(mx, my);
      let v = p5.Vector.sub(this.dragPos, this.anchor);
      if (v.mag() > this.maxDrag) {
        v.setMag(this.maxDrag);
        this.dragPos = p5.Vector.add(this.anchor, v);
      }
      this.projectile.pos = this.dragPos.copy();
    }
  }

  handleRelease() {
    if (this.isDragging) {
      this.isDragging = false;
      let force = p5.Vector.sub(this.anchor, this.dragPos);
      force.mult(0.18); // Power multiplier
      this.projectile.launch(force);
    }
  }

  update() {
    // Projectile Physics
    if (this.projectile.launched && !this.projectile.caught && !this.projectile.inTote) {
      this.projectile.vel.add(this.gravity);
      this.projectile.pos.add(this.projectile.vel);
      this.projectile.rot += this.projectile.vel.x * 0.05;

      // Floor collision
      if (this.projectile.pos.y > this.floorY - this.projectile.h/2) {
        this.projectile.pos.y = this.floorY - this.projectile.h/2;
        this.projectile.vel.y *= -0.5;
        this.projectile.vel.x *= 0.7;

        if (!this.projectile.missLogged && abs(this.projectile.vel.y) < 1) {
          this.analytics.recordMiss();
          this.projectile.missLogged = true;
        }
      }

      // Out of bounds
      if (this.projectile.pos.x > width || this.projectile.pos.x < 0) {
        if (!this.projectile.missLogged) {
          this.analytics.recordMiss();
          this.projectile.missLogged = true;
        }
      }
    } else if (this.projectile.caught) {
      // Sync with gripper
      let tcp = this.robot.frames.tcp.getPos();
      this.projectile.pos.set(tcp.x, tcp.y);
      this.projectile.rot = this.robot.getGlobalWristAngle();
    } else if (this.projectile.inTote) {
       // Settle in tote
       let t = this.tote;
       this.projectile.pos.x = lerp(this.projectile.pos.x, t.pos.x, 0.1);
       if (this.projectile.pos.y < t.pos.y - 10) {
         this.projectile.pos.y += 5;
       }
    }

    this.robot.update(this.projectile, this.tote, this);
  }

  draw() {
    this.drawEnvironment();
    this.tote.draw();
    this.robot.draw();
    this.drawSlingshot();
    this.projectile.draw();

    this.ui.draw();
    this.statsUI.draw();
    this.cam.render(this);
  }

  drawEnvironment() {
    noStroke();
    // Wall
    fill(20, 24, 30); rect(0, 0, width, this.floorY);
    // Floor
    fill(10, 12, 15); rect(0, this.floorY, width, height - this.floorY);

    // Grid
    stroke(255, 255, 255, 10); strokeWeight(1);
    for(let i=0; i<width; i+=50) line(i, 0, i, this.floorY);
    for(let i=0; i<this.floorY; i+=50) line(0, i, width, i);

    // Launch Zone Text
    if (!this.projectile.launched && !this.isDragging) {
      fill(255, 100); textAlign(CENTER); textSize(14);
      text("DRAG TO SHOOT", this.anchor.x, this.anchor.y + 60);
    }
  }

  drawSlingshot() {
    stroke(150); strokeWeight(4);
    line(this.anchor.x, this.anchor.y, this.anchor.x, this.floorY);

    if (this.isDragging) {
      // Bands
      stroke(255, 100, 0); strokeWeight(3);
      line(this.anchor.x - 10, this.anchor.y, this.projectile.pos.x, this.projectile.pos.y);
      line(this.anchor.x + 10, this.anchor.y, this.projectile.pos.x, this.projectile.pos.y);

      // Trajectory Prediction
      this.drawTrajectory();
    } else if (!this.projectile.launched) {
       // Idle bands
       stroke(100); strokeWeight(2);
       line(this.anchor.x - 10, this.anchor.y, this.projectile.pos.x, this.projectile.pos.y);
       line(this.anchor.x + 10, this.anchor.y, this.projectile.pos.x, this.projectile.pos.y);
    }
  }

  drawTrajectory() {
    let force = p5.Vector.sub(this.anchor, this.dragPos).mult(0.18);
    let simPos = this.projectile.pos.copy();
    let simVel = force.copy();

    noFill(); stroke(255, 255, 255, 100); strokeWeight(2);
    beginShape(POINTS);
    for(let i=0; i<40; i++) {
      vertex(simPos.x, simPos.y);
      simVel.add(this.gravity);
      simPos.add(simVel);
      if (simPos.y > this.floorY) break;
    }
    endShape();
  }
}

// ---------------- KINEMATIC ROBOT (CATCHER) ----------------

class KinematicRobot {
  constructor(x, y) {
    this.origin = createVector(x, y);
    // Longer arms for better reach
    this.links = { base: 100, humerus: 220, ulna: 200, hand: 80 };
    this.theta = { j1: -HALF_PI, j2: HALF_PI, j3: 0 };
    this.frames = {
      base: new Mat3(), shoulder: new Mat3(), elbow: new Mat3(), wrist: new Mat3(), tcp: new Mat3()
    };

    this.state = "IDLE";
    this.stateTimer = 0;
    this.reactionStart = 0;

    this.gripper = {
      width: 65, targetWidth: 65, minWidth: 28, rotation: 0,
      close: () => { this.gripper.targetWidth = this.gripper.minWidth; },
      release: () => { this.gripper.targetWidth = 65; },
      isClosed: () => { return abs(this.gripper.width - this.gripper.minWidth) < 5; }
    };

    this.targetPos = createVector(x, y - 300);
    this.currentPos = createVector(x, y - 300);
    this.targetOrient = PI; // Face left
    this.currentOrient = PI;
  }

  resetState() {
    this.state = "IDLE";
    this.gripper.release();
    this.target = null;
  }

  update(projectile, tote, simRef) {
    this.aiController(projectile, tote, simRef);

    // High speed movement for catching
    let speed = (this.state === "INTERCEPT" || this.state === "CATCH") ? 0.6 : 0.15;

    this.currentPos.x = lerp(this.currentPos.x, this.targetPos.x, speed);
    this.currentPos.y = lerp(this.currentPos.y, this.targetPos.y, speed);

    let diff = this.targetOrient - this.currentOrient;
    this.currentOrient += diff * 0.2;

    this.solveIK(this.currentPos.x, this.currentPos.y, this.currentOrient);
    this.updateFK();

    // Super fast gripper
    this.gripper.width = lerp(this.gripper.width, this.gripper.targetWidth, 0.6);
    this.gripper.rotation = this.getGlobalWristAngle();
  }

  aiController(p, tote, sim) {
    let now = millis();
    let reach = this.links.humerus + this.links.ulna;

    switch (this.state) {
      case "IDLE":
        this.targetPos.set(this.origin.x - 100, this.origin.y - 300);
        this.targetOrient = PI;
        if (p.launched && !p.caught && !p.missLogged) {
          this.state = "INTERCEPT";
          this.reactionStart = now;
        }
        break;

      case "INTERCEPT":
        if (p.missLogged || p.pos.y > this.origin.y) {
          this.state = "IDLE";
          return;
        }

        // PREDICTIVE INTERCEPTION
        // Find the point on trajectory closest to robot base that is reachable
        let bestT = -1;
        let minDist = 9999;
        let simP = p.pos.copy();
        let simV = p.vel.copy();
        let g = sim.gravity;

        // Look ahead up to 60 frames
        for(let i=0; i<60; i++) {
          simV.add(g);
          simP.add(simV);

          let d = dist(this.origin.x, this.origin.y, simP.x, simP.y);
          // Check if reachable and in front of robot
          if (d < reach * 0.9 && simP.x < this.origin.x) {
             // We found a valid intercept point
             this.targetPos.set(simP.x, simP.y);

             // Orient gripper to match incoming angle
             let angle = atan2(simV.y, simV.x);
             this.targetOrient = angle + PI;

             // If very close, trigger catch
             let realDist = dist(this.frames.tcp.getPos().x, this.frames.tcp.getPos().y, p.pos.x, p.pos.y);
             if (realDist < 40) {
               this.state = "CATCH";
             }
             break;
          }
        }
        break;

      case "CATCH":
        // Track perfectly
        this.targetPos.set(p.pos.x, p.pos.y);
        this.gripper.close();

        if (this.gripper.isClosed()) {
          if (dist(this.frames.tcp.getPos().x, this.frames.tcp.getPos().y, p.pos.x, p.pos.y) < 25) {
            p.caught = true;
            p.vel.mult(0);
            sim.analytics.recordCatch(now - this.reactionStart);
            this.state = "DEPOSIT";
          } else {
            // Missed the grab window
            this.state = "IDLE";
            this.gripper.release();
          }
        }
        break;

      case "DEPOSIT":
        this.targetPos.set(tote.pos.x, tote.pos.y - 100);
        this.targetOrient = HALF_PI;

        if (dist(this.currentPos.x, this.currentPos.y, this.targetPos.x, this.targetPos.y) < 20) {
          this.gripper.release();
          p.caught = false;
          p.inTote = true;
          this.state = "CELEBRATE";
          this.stateTimer = now + 500;
        }
        break;

      case "CELEBRATE":
        this.targetPos.set(this.origin.x, this.origin.y - 400);
        this.targetOrient = PI + sin(now * 0.02) * 0.5;
        if (now > this.stateTimer) {
          this.state = "IDLE";
        }
        break;
    }
  }

  updateFK() {
    this.frames.base.reset();
    this.frames.base.translate(this.origin.x, this.origin.y);
    this.frames.shoulder = this.frames.base.copy().rotate(0).translate(0, -this.links.base);
    this.frames.elbow = this.frames.shoulder.copy().rotate(this.theta.j1).translate(this.links.humerus, 0);
    this.frames.wrist = this.frames.elbow.copy().rotate(this.theta.j2).translate(this.links.ulna, 0);
    this.frames.tcp = this.frames.wrist.copy().rotate(this.theta.j3).translate(this.links.hand, 0);
  }

  solveIK(tx, ty, goalAngle) {
    let wx = tx - cos(goalAngle) * this.links.hand;
    let wy = ty - sin(goalAngle) * this.links.hand;
    let dx = wx - this.frames.shoulder.getPos().x;
    let dy = wy - this.frames.shoulder.getPos().y;
    let distSQ = dx*dx + dy*dy;
    let distToWC = sqrt(distSQ);
    let a = this.links.humerus;
    let b = this.links.ulna;
    let maxReach = (a + b) * 0.999;

    if (distToWC > maxReach) {
       distToWC = maxReach;
       let angle = atan2(dy, dx);
       dx = cos(angle) * distToWC;
       dy = sin(angle) * distToWC;
    }

    let cosElbow = (a*a + b*b - distToWC*distToWC) / (2*a*b);
    let elbowAngle = acos(constrain(cosElbow, -1, 1));
    this.theta.j2 = PI - elbowAngle;

    // Correct angle for "Elbow Up" configuration vs "Elbow Down"
    // Since we are reaching left mostly, elbow up (negative relative) usually looks better
    // But let's stick to standard solver

    let angleToWC = atan2(dy, dx);
    let cosShoulder = (a*a + distToWC*distToWC - b*b) / (2*a*distToWC);
    let shoulderOffset = acos(constrain(cosShoulder, -1, 1));
    this.theta.j1 = angleToWC - shoulderOffset;
    this.theta.j3 = goalAngle - this.theta.j1 - this.theta.j2;
  }

  getGlobalWristAngle() { return this.theta.j1 + this.theta.j2 + this.theta.j3; }

  draw() {
    this.drawLinks();
    this.drawJoints();
    this.drawGripper();
  }

  drawLinks() {
    strokeCap(ROUND);
    let base = this.frames.base.getPos();
    let sh = this.frames.shoulder.getPos();
    let el = this.frames.elbow.getPos();
    let wr = this.frames.wrist.getPos();
    stroke(60); strokeWeight(20); line(base.x, base.y, sh.x, sh.y);
    stroke(255, 120, 0); strokeWeight(18); line(sh.x, sh.y, el.x, el.y);
    stroke(220); strokeWeight(14); line(el.x, el.y, wr.x, wr.y);

    // Decorative hydraulics
    stroke(50); strokeWeight(4);
    line(sh.x, sh.y - 20, el.x, el.y - 20);
  }

  drawJoints() {
    let pts = [this.frames.shoulder, this.frames.elbow, this.frames.wrist];
    for(let f of pts) {
      let p = f.getPos();
      noStroke(); fill(30); circle(p.x, p.y, 32);
      fill(80); circle(p.x, p.y, 14);
      stroke(0); strokeWeight(1); noFill(); circle(p.x, p.y, 32);
    }
  }

  drawGripper() {
    let wr = this.frames.wrist.getPos();
    let angle = this.getGlobalWristAngle();
    let w = this.gripper.width;
    let handLen = this.links.hand;

    push();
    translate(wr.x, wr.y);
    rotate(angle);
    fill(50); noStroke(); rectMode(CENTER); rect(20, 0, 40, 40, 6);
    stroke(100); strokeWeight(4); line(40, -w/2, 40, w/2);
    noStroke(); fill(180);

    // Jaws
    rect(60, -w/2, 40, 12); rect(handLen, -w/2 + 4, 15, 8);
    rect(60, w/2, 40, 12); rect(handLen, w/2 - 4, 15, 8);

    // Pads
    fill(0, 255, 255);
    rect(handLen, -w/2 + 8, 20, 4); rect(handLen, w/2 - 8, 20, 4);

    pop();
  }
}

// ---------------- OBJECTS ----------------

class Projectile {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.w = 30; this.h = 30;
    this.rot = 0;
    this.launched = false;
    this.caught = false;
    this.inTote = false;
    this.missLogged = false;
  }

  launch(force) {
    this.vel = force;
    this.launched = true;
  }

  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.rot);
    rectMode(CENTER);

    // Trail effect
    if (this.launched && !this.caught && !this.inTote) {
      stroke(255, 100, 0, 100); strokeWeight(2);
      line(-this.vel.x*2, -this.vel.y*2, 0, 0);
    }

    stroke(255); strokeWeight(2);
    fill(255, 80, 0);
    if (this.caught) fill(0, 255, 0);
    rect(0, 0, this.w, this.h, 6);

    // Face
    fill(255); noStroke();
    circle(-5, -2, 8); circle(5, -2, 8);
    fill(0);
    circle(-5 + map(this.vel.x, -10, 10, -2, 2), -2, 3);
    circle(5 + map(this.vel.x, -10, 10, -2, 2), -2, 3);

    pop();
  }
}

class Tote {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.w = 120; this.h = 80;
  }
  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    rectMode(CENTER);
    fill(30, 35, 45); noStroke(); rect(0, -this.h/2 - 5, this.w, this.h);
    fill(0, 255, 0); textAlign(CENTER); textSize(10); text("GOAL", 0, -this.h/2);
    stroke(0, 255, 0); strokeWeight(2); noFill(); rect(0, -this.h/2, this.w, this.h, 0, 0, 8, 8);
    pop();
  }
}
