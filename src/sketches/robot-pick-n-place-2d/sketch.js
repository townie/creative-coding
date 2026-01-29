/**
 * PRECISION ROBOTIC ARM - CALIBRATED KINEMATICS v6.0 (ANALYTICS SUITE)
 *
 * Features:
 * - Full Kinematic Physics Engine (FK/IK)
 * - Velocity Sync Gripper Logic
 * - Collapsible Control Panel (Left)
 * - NEW: Advanced Analytics Dashboard (Right)
 *   - Cycle Time, Grip Time, Streaks, Misses
 *   - Statistical Distributions (Mean, P50, P99)
 *   - Sparkline visualization
 * - NEW: Toggleable TCP Camera with Close Button
 * - Emergency Stop & Resume Logic
 */

let simulation;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Courier New');
  simulation = new FactorySimulation();
}

function draw() {
  background(15, 18, 22);
  simulation.update();
  simulation.draw();
}

function mousePressed() {
  if (simulation) simulation.handlePress(mouseX, mouseY);
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
    this.history = []; // { cycleTime, gripTime, timestamp }
    this.misses = 0;
    this.streak = 0;
    this.bestStreak = 0;

    // Computed Stats
    this.stats = {
      count: 0,
      meanCycle: 0,
      p50Cycle: 0,
      p99Cycle: 0,
      meanGrip: 0,
      fastest: 9999
    };
  }

  recordSuccess(cycleMs, gripMs) {
    this.streak++;
    if (this.streak > this.bestStreak) this.bestStreak = this.streak;

    this.history.push({
      cycle: cycleMs,
      grip: gripMs,
      ts: millis()
    });

    if (this.history.length > 50) this.history.shift(); // Keep last 50 for visuals
    this.computeStats();
  }

  recordMiss() {
    this.misses++;
    this.streak = 0;
  }

  computeStats() {
    let cycles = this.history.map(h => h.cycle).sort((a,b) => a - b);
    let grips = this.history.map(h => h.grip);

    let sumC = cycles.reduce((a, b) => a + b, 0);
    let sumG = grips.reduce((a, b) => a + b, 0);

    this.stats.count = this.history.length;
    this.stats.meanCycle = cycles.length ? sumC / cycles.length : 0;
    this.stats.meanGrip = grips.length ? sumG / grips.length : 0;
    this.stats.fastest = cycles.length ? cycles[0] : 0;

    // Percentiles
    if (cycles.length > 0) {
      this.stats.p50Cycle = cycles[Math.floor(cycles.length * 0.5)];
      this.stats.p99Cycle = cycles[Math.floor(cycles.length * 0.99)];
    }
  }
}

// ---------------- UI: LEFT CONTROL PANEL ----------------

class SidebarUI {
  constructor(sim) {
    this.sim = sim;
    this.expandedW = 240;
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
    let btnH = 40;
    let gap = 15;

    this.buttons.push({
      id: 'estop', label: 'E-STOP',
      x: x, y: yStart, w: this.expandedW - 40, h: 50,
      bg: color(200, 0, 0), activeBg: color(255, 0, 0),
      action: () => this.sim.triggerEstop()
    });

    this.buttons.push({
      id: 'resume', label: 'RESUME OPS',
      x: x, y: yStart + 65, w: this.expandedW - 40, h: 40,
      bg: color(0, 100, 0), activeBg: color(0, 180, 0),
      action: () => this.sim.resumeEstop()
    });

    this.buttons.push({
      id: 'spawn', label: 'ADD CARGO',
      x: x, y: yStart + 65 + 55, w: this.expandedW - 40, h: 40,
      bg: color(0, 60, 120), activeBg: color(0, 100, 200),
      action: () => this.sim.manualSpawn()
    });

    this.buttons.push({
      id: 'cam', label: 'TOGGLE CAM',
      x: x, y: yStart + 65 + 55 + 55, w: this.expandedW - 40, h: 40,
      bg: color(60), activeBg: color(100),
      action: () => { this.sim.cam.visible = !this.sim.cam.visible; }
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
    text("SYSTEM CONTROL", this.padding, 75);

    for (let btn of this.buttons) this.drawButton(btn);

    let statusColor = this.sim.estopActive ? color(255, 0, 0) : color(25, 255, 0);
    fill(statusColor); noStroke();
    textSize(12); textAlign(LEFT, BASELINE);
    text(this.sim.estopActive ? "SYSTEM HALTED" : "SYSTEM OPTIMAL", this.padding, height - 30);

    this.drawToggleButton(false);
  }

  drawToggleButton(collapsed) {
    let btn = this.toggleBtn;
    let isHover = mouseX > btn.x && mouseX < btn.x + btn.w && mouseY > btn.y && mouseY < btn.y + btn.h;
    fill(isHover ? 60 : 40); stroke(isHover ? 150 : 100); strokeWeight(1);
    rect(btn.x, btn.y, btn.w, btn.h, 4);
    fill(255); noStroke(); textAlign(CENTER, CENTER); textSize(12);
    text(collapsed ? "CONTROLS" : "HIDE PANEL", btn.x + btn.w/2, btn.y + btn.h/2);
  }

  drawButton(btn) {
    let isHover = mouseX > btn.x && mouseX < btn.x + btn.w && mouseY > btn.y && mouseY < btn.y + btn.h;
    let isDisabled = (btn.id === 'spawn' && this.sim.estopActive) ||
                     (btn.id === 'resume' && !this.sim.estopActive) ||
                     (btn.id === 'estop' && this.sim.estopActive);

    if (isDisabled) { fill(40); stroke(60); }
    else { fill(isHover ? btn.activeBg : btn.bg); stroke(255, 50); }

    strokeWeight(1); rect(btn.x, btn.y, btn.w, btn.h, 4);
    fill(isDisabled ? 100 : 255); noStroke();
    textAlign(CENTER, CENTER); textSize(14);
    text(btn.label, btn.x + btn.w/2, btn.y + btn.h/2);
  }
}

// ---------------- UI: RIGHT ANALYTICS PANEL ----------------

class StatsUI {
  constructor(sim, analytics) {
    this.sim = sim;
    this.data = analytics;
    this.expandedW = 280;
    this.w = 0; // Start collapsed
    this.isCollapsed = true;
    this.padding = 20;

    this.toggleBtn = { w: 100, h: 30 };
  }

  toggle() {
    this.isCollapsed = !this.isCollapsed;
    this.w = this.isCollapsed ? 0 : this.expandedW;
    this.sim.resize();
  }

  checkClick(mx, my) {
    let btnX = width - this.toggleBtn.w - 20;
    let btnY = 20;

    if (mx > btnX && mx < btnX + this.toggleBtn.w && my > btnY && my < btnY + this.toggleBtn.h) {
      this.toggle();
      return true;
    }
    return (!this.isCollapsed && mx > width - this.w);
  }

  draw() {
    // Toggle Button
    let btnX = width - this.toggleBtn.w - 20;
    let btnY = 20;
    let isHover = mouseX > btnX && mouseX < btnX + this.toggleBtn.w && mouseY > btnY && mouseY < btnY + this.toggleBtn.h;

    fill(isHover ? 60 : 40); stroke(isHover ? 150 : 100); strokeWeight(1);
    rect(btnX, btnY, this.toggleBtn.w, this.toggleBtn.h, 4);
    fill(255); noStroke(); textAlign(CENTER, CENTER); textSize(12);
    text(this.isCollapsed ? "ANALYTICS" : "HIDE DATA", btnX + this.toggleBtn.w/2, btnY + this.toggleBtn.h/2);

    if (this.isCollapsed) return;

    // Panel Background
    push();
    translate(width - this.w, 0);
    fill(10, 12, 16, 245);
    stroke(40); strokeWeight(1);
    rect(0, 0, this.w, height);

    // Header
    stroke(255, 150, 0); strokeWeight(2);
    line(this.padding, 65, this.w - this.padding, 65);
    fill(255, 150, 0); noStroke();
    textSize(18); textAlign(LEFT, TOP);
    text("PERFORMANCE DATA", this.padding, 75);

    // Main Stats
    let y = 110;
    this.drawStatRow("TOTAL CYCLES", this.data.stats.count, y);
    this.drawStatRow("MISSES", this.data.misses, y += 25, color(255, 50, 50));
    this.drawStatRow("CURR STREAK", this.data.streak, y += 25);
    this.drawStatRow("BEST STREAK", this.data.bestStreak, y += 25, color(0, 255, 0));

    // Time Stats
    y += 40;
    fill(150); textSize(10); text("TIMING METRICS (ms)", this.padding, y);
    y += 20;
    this.drawStatRow("MEAN CYCLE", this.data.stats.meanCycle.toFixed(0), y);
    this.drawStatRow("MEAN GRIP", this.data.stats.meanGrip.toFixed(0), y += 25);
    this.drawStatRow("P50 (MEDIAN)", this.data.stats.p50Cycle.toFixed(0), y += 25);
    this.drawStatRow("P99 (WORST)", this.data.stats.p99Cycle.toFixed(0), y += 25, color(255, 100, 100));
    this.drawStatRow("FASTEST", this.data.stats.fastest === 9999 ? '-' : this.data.stats.fastest.toFixed(0), y += 25, color(0, 255, 255));

    // Sparkline Graph
    y += 40;
    this.drawSparkline(y);

    pop();
  }

  drawStatRow(label, val, y, valColor = 255) {
    fill(180); noStroke(); textSize(12); textAlign(LEFT, TOP);
    text(label, this.padding, y);
    fill(valColor); textAlign(RIGHT, TOP);
    text(val, this.w - this.padding, y);
  }

  drawSparkline(y) {
    let h = 100;
    let w = this.w - this.padding * 2;
    fill(20); stroke(60);
    rect(this.padding, y, w, h);

    if (this.data.history.length < 2) {
      fill(100); textAlign(CENTER, CENTER);
      text("NO DATA", this.padding + w/2, y + h/2);
      return;
    }

    let maxVal = Math.max(...this.data.history.map(d => d.cycle));
    let minVal = Math.min(...this.data.history.map(d => d.cycle));
    let range = maxVal - minVal || 1;

    noFill(); stroke(0, 255, 255); strokeWeight(1.5);
    beginShape();
    for (let i = 0; i < this.data.history.length; i++) {
      let d = this.data.history[i];
      let px = map(i, 0, this.data.history.length - 1, this.padding, this.padding + w);
      let py = map(d.cycle, minVal, maxVal, y + h - 5, y + 5);
      vertex(px, py);
    }
    endShape();

    // Labels
    fill(100); noStroke(); textSize(9);
    textAlign(RIGHT, TOP); text(`${maxVal.toFixed(0)}ms`, this.padding + w - 2, y + 2);
    textAlign(RIGHT, BOTTOM); text(`${minVal.toFixed(0)}ms`, this.padding + w - 2, y + h - 2);
    textAlign(LEFT, BOTTOM); text("LAST 50 CYCLES", this.padding + 2, y + h - 2);
  }
}

// ---------------- CAMERA SYSTEM ----------------

class EndEffectorCam {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.margin = 20;
    this.visible = true;
    this.closeBtn = { s: 20 };
  }

  checkClick(mx, my) {
    if (!this.visible) return false;
    let x = width - this.w - this.margin;
    let y = this.margin;
    // Check close button
    if (mx > x + this.w - this.closeBtn.s && mx < x + this.w &&
        my > y && my < y + this.closeBtn.s) {
      this.visible = false;
      return true;
    }
    return false;
  }

  render(sim) {
    if (!this.visible) return;

    let x = width - this.w - this.margin;
    let y = this.margin;

    // Container
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

    // Cam Background
    background(10, 20, 10);

    // --- WORLD TRANSFORM ---
    push();
    translate(this.w/2, this.h/2);

    let tcp = sim.robot.frames.tcp.getPos();
    let angle = sim.robot.getGlobalWristAngle();

    rotate(-angle - HALF_PI);
    translate(-tcp.x, -tcp.y);

    sim.drawEnvironment();
    for(let t of sim.totes) t.draw();
    for(let i of sim.items) i.draw();

    pop();
    // --- END WORLD ---

    // --- HUD OVERLAY ---
    this.drawHUD(sim);

    drawingContext.restore();

    // Decoration
    noFill(); stroke(0, 255, 255, 100); strokeWeight(1);
    rect(-3, -3, this.w+6, this.h+6);

    // Label
    fill(0, 255, 255); noStroke();
    textSize(10); textAlign(LEFT, TOP);
    text("TCP_CAM_01 [LIVE]", 5, 5);

    // Blinking Rec Dot
    if (frameCount % 60 < 30) {
      fill(255, 0, 0); circle(this.w - 10, 10, 6);
    }

    // Close Button
    let btnS = this.closeBtn.s;
    let bx = this.w - btnS;
    let by = 0;
    let isHover = mouseX > x + bx && mouseX < x + bx + btnS && mouseY > y && mouseY < y + btnS;

    fill(isHover ? color(255, 50, 50) : color(0, 100, 100)); noStroke();
    rect(bx, by, btnS, btnS);
    stroke(255); strokeWeight(2);
    line(bx + 5, by + 5, bx + btnS - 5, by + btnS - 5);
    line(bx + btnS - 5, by + 5, bx + 5, by + btnS - 5);

    pop();
  }

  drawHUD(sim) {
    // Crosshair
    stroke(0, 255, 0, 100); strokeWeight(1);
    line(this.w/2 - 10, this.h/2, this.w/2 + 10, this.h/2);
    line(this.w/2, this.h/2 - 10, this.w/2, this.h/2 + 10);

    // Gripper Jaws
    let gw = sim.robot.gripper.width;
    let viewScale = 0.5;
    let gap = (gw * viewScale) / 2;

    fill(30, 30, 30, 220); stroke(100); strokeWeight(1);
    rect(this.w/2 - 20 - gap, this.h - 50, 20, 60);
    rect(this.w/2 + gap, this.h - 50, 20, 60);

    fill(0, 255, 0, 150); noStroke();
    rect(this.w/2 - gap - 2, this.h - 45, 2, 20);
    rect(this.w/2 + gap, this.h - 45, 2, 20);

    fill(0, 255, 0, 200); textAlign(LEFT, BOTTOM); textSize(8);
    text(`GRIP: ${Math.round(gw)}mm`, 5, this.h - 5);
    textAlign(RIGHT, BOTTOM);
    text(`T: ${(millis()/1000).toFixed(1)}`, this.w - 5, this.h - 5);

    stroke(0, 255, 0, 20); strokeWeight(1);
    for(let i=0; i<this.h; i+=4) line(0, i, this.w, i);
  }
}

// ---------------- SIMULATION CONTROLLER ----------------

class FactorySimulation {
  constructor() {
    this.floorY = height - 120;
    this.items = [];
    this.totes = [];
    this.spawnTimer = 0;
    this.beltSpeed = 3.5;

    this.estopActive = false;
    this.analytics = new AnalyticsEngine();

    this.draggedItem = null;
    this.dragOffset = createVector(0, 0);

    this.ui = new SidebarUI(this);
    this.statsUI = new StatsUI(this, this.analytics);
    this.cam = new EndEffectorCam(220, 160);

    this.robot = new KinematicRobot(this.ui.w + (width - this.ui.w) * 0.5, this.floorY);
    this.totes.push(new Tote(width * 0.9, this.floorY));

    this.resize();
  }

  resize() {
    this.floorY = height - 120;
    let effectiveX = this.ui.w + (width - this.ui.w - this.statsUI.w) * 0.5 + 40;
    if (this.robot) this.robot.origin.set(effectiveX, this.floorY);
    if (this.totes.length) this.totes[0].pos.set(width - this.statsUI.w - 150, this.floorY);
  }

  triggerEstop() { this.estopActive = true; }
  resumeEstop() { this.estopActive = false; }

  manualSpawn() {
    if (this.estopActive) return;
    let spawnX = this.ui.w > 0 ? this.ui.w - 50 : -50;
    let item = new Item(spawnX, this.floorY - 100);
    item.vel.x = random(4, 7);
    this.items.push(item);
  }

  handlePress(mx, my) {
    if (this.cam.checkClick(mx, my)) return;
    if (this.ui.checkClick(mx, my)) return;
    if (this.statsUI.checkClick(mx, my)) return;
    if (this.estopActive) return;

    for (let item of this.items) {
      if (item.contains(mx, my)) {
        this.draggedItem = item;
        this.dragOffset.set(item.pos.x - mx, item.pos.y - my);
        if (item.isGripped) {
          this.robot.gripper.release();
          item.isGripped = false;
          this.analytics.recordMiss(); // Manual interference counts as miss
        }
        item.vel.mult(0);
        return;
      }
    }
  }

  handleRelease() {
    if (this.draggedItem) {
      this.draggedItem.vel.set(mouseX - pmouseX, mouseY - pmouseY).mult(1.5);
      this.draggedItem = null;
    }
  }

  update() {
    if (this.estopActive) return;

    if (millis() > this.spawnTimer && this.items.length < 8) {
      if (random() > 0.6) {
        let spawnX = this.ui.w > 0 ? this.ui.w - 50 : -50;
        let item = new Item(spawnX, this.floorY - 100);
        item.vel.x = random(3, 6);
        this.items.push(item);
      }
      this.spawnTimer = millis() + random(1500, 3000);
    }

    for (let i = this.items.length - 1; i >= 0; i--) {
      let item = this.items[i];

      if (item === this.draggedItem) {
        item.pos.set(mouseX, mouseY).add(this.dragOffset);
        item.vel.mult(0);
      } else if (item.isGripped) {
        let tcp = this.robot.frames.tcp.getPos();
        item.pos.x = lerp(item.pos.x, tcp.x, 0.4);
        item.pos.y = lerp(item.pos.y, tcp.y, 0.4);
        item.rot = lerp(item.rot, this.robot.gripper.rotation, 0.3);
        item.vel.mult(0);
      } else {
        this.applyPhysics(item);
      }

      if (item.pos.x > width + 100) this.items.splice(i, 1);
    }

    this.robot.update(this.items, this.totes[0], this);
  }

  applyPhysics(item) {
    item.vel.y += 0.6;
    let beltY = this.floorY - 40;

    if (item.pos.x < width * 0.7 && item.pos.y >= beltY - item.h/2 - 5 && item.pos.y < beltY + 20) {
      item.vel.x = lerp(item.vel.x, this.beltSpeed, 0.1);
      if (item.pos.y > beltY - item.h/2) {
        item.pos.y = beltY - item.h/2;
        item.vel.y = 0;
      }
    } else if (item.pos.y > this.floorY - item.h/2) {
      item.pos.y = this.floorY - item.h/2;
      item.vel.y *= -0.4;
      item.vel.x *= 0.95;
    }

    let t = this.totes[0];
    let tw = t.w/2 - 5;
    if (item.pos.x > t.pos.x - tw && item.pos.x < t.pos.x + tw) {
      if (item.pos.y > t.pos.y - 10 - item.h/2) {
        item.pos.y = t.pos.y - 10 - item.h/2;
        item.vel.y *= -0.2;
        item.vel.x *= 0.8;
        item.inTote = true;
      }
    }

    item.pos.add(item.vel);
  }

  draw() {
    this.drawEnvironment();
    for (let t of this.totes) t.draw();
    for (let i of this.items) i.draw();
    this.robot.draw();

    this.ui.draw();
    this.statsUI.draw();
    this.cam.render(this);

    if (this.estopActive) {
      push();
      fill(0, 200); rect(0,0,width,height);
      fill(255, 0, 0);
      textAlign(CENTER, CENTER);
      textSize(60);
      text("EMERGENCY STOP", width/2, height/2);
      textSize(20);
      fill(255);
      text("PRESS RESUME TO CONTINUE", width/2, height/2 + 50);
      pop();
    }
  }

  drawEnvironment() {
    noStroke();
    // Wall
    fill(20, 24, 30); rect(0, 0, width, this.floorY);
    // Floor
    fill(10, 12, 15); rect(0, this.floorY, width, height - this.floorY);

    // Hazard Lines
    drawingContext.save();
    drawingContext.beginPath();
    rect(0, this.floorY, width, height - this.floorY);
    drawingContext.clip();
    stroke(255, 200, 0, 20);
    strokeWeight(20);
    for(let i=-height; i<width; i+=80) line(i, this.floorY, i+80, height);
    drawingContext.restore();

    // Conveyor
    let beltY = this.floorY - 40;
    fill(40); noStroke();
    rect(0, beltY, width * 0.75, 15);

    stroke(80); strokeWeight(2);
    let off = this.estopActive ? 0 : (frameCount * this.beltSpeed) % 40;
    for(let x=0; x<width*0.75; x+=40) {
      let drawX = x + off;
      if (this.estopActive) drawX = x + (frameCount * 0) % 40;
      line(drawX, beltY, drawX, beltY+15);
      line(drawX+2, beltY, drawX+2, beltY+15);
    }
  }
}

// ---------------- KINEMATIC ROBOT ----------------

class KinematicRobot {
  constructor(x, y) {
    this.origin = createVector(x, y);

    this.links = { base: 80, humerus: 190, ulna: 170, hand: 80 };
    this.theta = { j1: -HALF_PI, j2: HALF_PI, j3: 0 };
    this.frames = {
      base: new Mat3(), shoulder: new Mat3(), elbow: new Mat3(), wrist: new Mat3(), tcp: new Mat3()
    };

    this.target = null;
    this.state = "SCAN";
    this.stateTimer = 0;

    // Analytics tracking
    this.cycleStartTime = 0;
    this.gripStartTime = 0;
    this.gripDuration = 0;

    this.gripper = {
      width: 65, targetWidth: 65, minWidth: 28, rotation: 0,
      close: () => { this.gripper.targetWidth = this.gripper.minWidth; },
      release: () => { this.gripper.targetWidth = 65; },
      isClosed: () => { return abs(this.gripper.width - this.gripper.minWidth) < 5; }
    };

    this.targetPos = createVector(x, y - 250);
    this.currentPos = createVector(x, y - 250);
    this.targetOrient = HALF_PI;
    this.currentOrient = HALF_PI;
  }

  update(items, tote, simRef) {
    this.motionPlanner(items, tote, simRef);

    this.currentPos.x = lerp(this.currentPos.x, this.targetPos.x, 0.25);
    this.currentPos.y = lerp(this.currentPos.y, this.targetPos.y, 0.25);

    let diff = this.targetOrient - this.currentOrient;
    this.currentOrient += diff * 0.15;

    this.solveIK(this.currentPos.x, this.currentPos.y, this.currentOrient);
    this.updateFK();

    this.gripper.width = lerp(this.gripper.width, this.gripper.targetWidth, 0.3);
    this.gripper.rotation = this.getGlobalWristAngle();
  }

  motionPlanner(items, tote, simRef) {
    let now = millis();
    let safeHeight = this.origin.y - 250;

    // Sanity Checks
    if (this.state !== "SCAN" && this.target && this.target !== simulation.draggedItem) {
      // Normal op
    } else if (this.state !== "SCAN" && this.state !== "DELIVER" && this.state !== "DROP") {
       this.gripper.release();
       this.state = "SCAN";
       simRef.analytics.recordMiss();
    }

    switch (this.state) {
      case "SCAN":
        this.targetPos.set(this.origin.x, safeHeight);
        this.targetOrient = HALF_PI;

        let bestItem = null;
        let maxScore = -9999;

        for (let item of items) {
          if (!item.isGripped && !item.inTote && item.pos.x < this.origin.x + 80 && item.pos.x > width * 0.2) {
            let score = item.pos.x;
            if (score > maxScore) {
              maxScore = score;
              bestItem = item;
            }
          }
        }

        if (bestItem) {
          this.target = bestItem;
          this.cycleStartTime = now; // Start cycle timer
          this.state = "APPROACH";
        }
        break;

      case "APPROACH":
        if (!this.checkTarget()) return;
        let lead = this.target.vel.copy().mult(10);
        this.targetPos.set(this.target.pos.x + lead.x, this.target.pos.y - 120);
        this.targetOrient = HALF_PI + (this.target.vel.x * 0.05);
        if (dist(this.currentPos.x, this.currentPos.y, this.targetPos.x, this.targetPos.y) < 40) {
          this.state = "ALIGN";
        }
        break;

      case "ALIGN":
        if (!this.checkTarget()) return;
        let lookAhead = this.target.vel.copy().mult(4);
        this.targetPos.set(this.target.pos.x + lookAhead.x, this.target.pos.y - 80);
        this.targetOrient = HALF_PI;
        if (abs(this.currentPos.x - this.targetPos.x) < 10 && abs(this.currentOrient - HALF_PI) < 0.05) {
          this.state = "PLUNGE";
        }
        break;

      case "PLUNGE":
        if (!this.checkTarget()) return;
        this.targetPos.set(this.target.pos.x + this.target.vel.x * 2, this.target.pos.y);
        this.targetOrient = HALF_PI;
        if (dist(this.frames.tcp.getPos().x, this.frames.tcp.getPos().y, this.target.pos.x, this.target.pos.y) < 8) {
          this.state = "GRIP";
          this.gripStartTime = now;
          this.stateTimer = now + 250;
        }
        break;

      case "GRIP":
        if (this.target) {
          this.targetPos.set(this.target.pos.x + this.target.vel.x, this.target.pos.y);
          this.targetOrient = HALF_PI;
        }
        this.gripper.close();
        if (this.gripper.isClosed() || now > this.stateTimer) {
          if (this.target) this.target.isGripped = true;
          this.gripDuration = now - this.gripStartTime; // Record grip time
          this.state = "LIFT";
        }
        break;

      case "LIFT":
        this.targetPos.set(this.origin.x, safeHeight);
        this.targetOrient = HALF_PI;
        if (this.currentPos.y < safeHeight + 20) {
          this.state = "DELIVER";
        }
        break;

      case "DELIVER":
        this.targetPos.set(tote.pos.x, tote.pos.y - 100);
        this.targetOrient = HALF_PI;
        if (dist(this.currentPos.x, this.currentPos.y, this.targetPos.x, this.targetPos.y) < 15) {
          this.state = "DROP";
          this.stateTimer = now + 200;
        }
        break;

      case "DROP":
        this.gripper.release();
        if (now > this.stateTimer) {
          if (this.target) {
            this.target.isGripped = false;
            this.target = null;
            // Complete Cycle - Record Data
            let totalCycle = now - this.cycleStartTime;
            simRef.analytics.recordSuccess(totalCycle, this.gripDuration);
          }
          this.state = "SCAN";
        }
        break;
    }
  }

  checkTarget() {
    if (!this.target || this.target.pos.x > this.origin.x + 150 || this.target.isGripped) {
      if (this.state !== "SCAN") simulation.analytics.recordMiss();
      this.state = "SCAN";
      this.target = null;
      return false;
    }
    return true;
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
    this.drawDebugOverlay();
  }

  drawLinks() {
    strokeCap(ROUND);
    let base = this.frames.base.getPos();
    let sh = this.frames.shoulder.getPos();
    let el = this.frames.elbow.getPos();
    let wr = this.frames.wrist.getPos();
    stroke(60); strokeWeight(16); line(base.x, base.y, sh.x, sh.y);
    stroke(255, 120, 0); strokeWeight(14); line(sh.x, sh.y, el.x, el.y);
    stroke(220); strokeWeight(12); line(el.x, el.y, wr.x, wr.y);
  }

  drawJoints() {
    let pts = [this.frames.shoulder, this.frames.elbow, this.frames.wrist];
    for(let f of pts) {
      let p = f.getPos();
      noStroke(); fill(30); circle(p.x, p.y, 28);
      fill(80); circle(p.x, p.y, 12);
      stroke(0); strokeWeight(1); noFill(); circle(p.x, p.y, 28);
    }
  }

  drawGripper() {
    let wr = this.frames.wrist.getPos();
    let angle = this.getGlobalWristAngle();
    let w = this.gripper.width;
    let handLen = this.links.hand;
    let isGripping = this.gripper.isClosed();

    push();
    translate(wr.x, wr.y);
    rotate(angle);
    fill(50); noStroke(); rectMode(CENTER); rect(20, 0, 40, 34, 6);
    stroke(100); strokeWeight(4); line(40, -w/2, 40, w/2);
    noStroke(); fill(180);
    rect(60, -w/2, 40, 10); rect(handLen, -w/2 + 3, 15, 6);
    rect(60, w/2, 40, 10); rect(handLen, w/2 - 3, 15, 6);
    if (isGripping) fill(50, 255, 50); else fill(255, 40, 40);
    rect(handLen, -w/2 + 6, 20, 3); rect(handLen, w/2 - 6, 20, 3);
    if (this.state === "ALIGN" || this.state === "PLUNGE") {
      stroke(255, 0, 0, 150); strokeWeight(1); line(handLen, 0, handLen + 200, 0);
    }
    if (isGripping && random() > 0.8 && !simulation.estopActive) {
      stroke(255, 255, 0); strokeWeight(2);
      let r = random(5, 15); let a = random(TWO_PI);
      point(handLen + cos(a)*r, sin(a)*r);
    }
    pop();
  }

  drawDebugOverlay() {
    if (simulation.estopActive) return;
    let tcp = this.frames.tcp.getPos();

    line(tcp.x - 5, tcp.y, tcp.x + 5, tcp.y);
    line(tcp.x, tcp.y - 5, tcp.x, tcp.y + 5);
    if (this.target && this.state !== "SCAN") {
      noFill(); stroke(255, 200, 0, 100);
      circle(this.targetPos.x, this.targetPos.y, 10);
      line(this.targetPos.x, this.targetPos.y, tcp.x, tcp.y);
    }

    let labelX = simulation.ui.isCollapsed ? 20 : simulation.ui.w + 20;
    let labelY = simulation.ui.isCollapsed ? 70 : 30;

    if (simulation.ui.isCollapsed) {
       fill(255); noStroke(); textSize(12); textAlign(LEFT);
       text(`OP MODE: ${this.state}`, labelX, labelY);
    }
  }
}

// ---------------- OBJECTS ----------------

class Item {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.w = 40; this.h = 40;
    this.rot = 0;
    this.color = color(random(60, 100), random(120, 220), 255);
    this.isGripped = false;
    this.inTote = false;
  }
  contains(mx, my) { return dist(mx, my, this.pos.x, this.pos.y) < 30; }
  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.rot);
    rectMode(CENTER);
    if (!this.inTote && !this.isGripped) { noStroke(); fill(0, 50); rect(4, 4, this.w, this.h, 4); }
    stroke(255, 150); strokeWeight(1); fill(this.color); rect(0, 0, this.w, this.h, 6);
    stroke(255, 100); line(-5, 0, 5, 0); line(0, -5, 0, 5);
    pop();
  }
}

class Tote {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.w = 140; this.h = 80;
  }
  draw() {
    push();
    translate(this.pos.x, this.pos.y);
    rectMode(CENTER);
    fill(30, 35, 45); noStroke(); rect(0, -this.h/2 - 5, this.w, this.h);
    fill(255, 100); textAlign(CENTER); textSize(10); text("PROCESSED", 0, -this.h/2);
    stroke(80); strokeWeight(3); noFill(); rect(0, -this.h/2, this.w, this.h, 0, 0, 8, 8);
    pop();
  }
}
