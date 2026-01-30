/**
 * Interactive Double Compound Pendulum Simulation
 *
 * Demonstrates chaotic motion with adjustable parameters.
 * - Uses Runge-Kutta 4 (RK4) integration.
 * - UI controls for Gravity, Simulation Speed, Chaos Factor (Count), Trail.
 * - Added: Pause/Play and Force Visualization.
 */

let pendulums = [];
let canvas;

// UI Elements
let sliders = {};
let labels = {};
let resetButton;
let pauseButton;
let forceCheckbox;

// State
let isPaused = false;
let showForces = false;

// Configuration Constants
const ROD_LENGTH = 150;

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);

  createInterface();
  resetSimulation();
}

function draw() {
  // Trail Effect: Draw background with opacity controlled by slider
  noStroke();
  let trailAlpha = sliders.trail.value();
  // If paused, we don't want the trail to fade out the drawing completely if we aren't moving,
  // but usually trails fade over time. We'll keep the fade active.
  fill(10, 10, 10, 100 - trailAlpha);
  rect(0, 0, width, height);

  // Update Labels
  updateLabels();

  // Centering
  translate(width / 2, height / 2.5);

  let g = sliders.gravity.value();
  let dt = sliders.speed.value();

  // Global Glow effect
  drawingContext.shadowBlur = 10;

  // Physics and Drawing
  for (let p of pendulums) {
    if (!isPaused) {
      p.update(g, dt);
    }
    // Calculate instantaneous forces (acceleration) for visualization if needed
    // We pass 'g' to display to calculate forces on the fly for the current frame
    p.display(g);
  }

  drawingContext.shadowBlur = 0;
}

function createInterface() {
  let uiX = 20;
  let uiY = 20;
  let gap = 35;

  // Helper to create labelled slider
  const createControl = (name, min, max, val, step, labelFunc) => {
    let div = createDiv('');
    div.position(uiX, uiY);
    div.style('font-family', 'monospace');
    div.style('color', '#fff');
    div.style('background', 'rgba(0,0,0,0.5)');
    div.style('padding', '5px');
    div.style('border-radius', '4px');
    div.style('width', '220px');

    let lab = createSpan(name);
    lab.parent(div);

    let slid = createSlider(min, max, val, step);
    slid.parent(div);
    slid.style('width', '100%');

    sliders[name.toLowerCase().split(' ')[0]] = slid;
    labels[name.toLowerCase().split(' ')[0]] = { span: lab, func: labelFunc };

    uiY += gap + 20;
  };

  createControl('Gravity', 0.1, 2.0, 0.85, 0.01, v => `Gravity: ${v.toFixed(2)}`);
  createControl('Speed (dt)', 0.0001, 0.2, 0.02, 0.01, v => `Sim Speed: ${v.toFixed(2)}`);
  createControl('Count', 1, 50, 5, 1, v => `Pendulums: ${v}`);
  createControl('Trail', 0, 95, 80, 1, v => `Trail Length: ${v}%`);

  // Reset Button
  resetButton = createButton('RESET SIMULATION');
  resetButton.position(uiX, uiY);
  resetButton.mousePressed(resetSimulation);
  resetButton.style('width', '230px');
  resetButton.style('padding', '10px');
  resetButton.style('background', '#ff3366');
  resetButton.style('color', 'white');
  resetButton.style('border', 'none');
  resetButton.style('font-family', 'monospace');
  resetButton.style('cursor', 'pointer');
  resetButton.style('margin-bottom', '10px');

  uiY += 50;

  // Pause Button
  pauseButton = createButton('PAUSE');
  pauseButton.position(uiX, uiY);
  pauseButton.mousePressed(togglePause);
  pauseButton.style('width', '110px');
  pauseButton.style('padding', '10px');
  pauseButton.style('background', '#33ccff');
  pauseButton.style('color', 'black');
  pauseButton.style('border', 'none');
  pauseButton.style('font-family', 'monospace');
  pauseButton.style('cursor', 'pointer');
  pauseButton.style('font-weight', 'bold');

  // Force Toggle
  // Using a button that acts as a toggle for better styling consistency
  let forceBtn = createButton('SHOW FORCES');
  forceBtn.position(uiX + 120, uiY);
  forceBtn.mousePressed(() => {
    showForces = !showForces;
    forceBtn.style('background', showForces ? '#33ff99' : '#555');
    forceBtn.style('color', showForces ? 'black' : 'white');
  });
  forceBtn.style('width', '110px');
  forceBtn.style('padding', '10px');
  forceBtn.style('background', '#555');
  forceBtn.style('color', 'white');
  forceBtn.style('border', 'none');
  forceBtn.style('font-family', 'monospace');
  forceBtn.style('cursor', 'pointer');
  forceBtn.style('font-weight', 'bold');
}

function togglePause() {
  isPaused = !isPaused;
  if (isPaused) {
    pauseButton.html('PLAY');
    pauseButton.style('background', '#ff9933');
  } else {
    pauseButton.html('PAUSE');
    pauseButton.style('background', '#33ccff');
  }
}

function updateLabels() {
  for (let key in labels) {
    let val = sliders[key].value();
    labels[key].span.html(labels[key].func(val));
  }
}

function resetSimulation() {
  pendulums = [];
  let count = sliders.count.value();

  // Start inverted (high energy)
  let baseTheta1 = PI - 0.01;
  let baseTheta2 = PI - 0.01;

  for (let i = 0; i < count; i++) {
    // Minute differences in initial angle to show chaos
    let offset = i * 0.0005;

    // Color gradient
    let hue = map(i, 0, count, 180, 360) % 360;
    let col = color(hue, 90, 100);

    pendulums.push(new DoublePendulum(baseTheta1 + offset, baseTheta2, col));
  }

  background(10);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(10);
}

class DoublePendulum {
  constructor(theta1, theta2, col) {
    this.theta1 = theta1;
    this.theta2 = theta2;
    this.omega1 = 0;
    this.omega2 = 0;
    this.color = col;
  }

  /**
   * Lagrangian derivatives
   * M = Mass Matrix, C = Coriolis/Gravity forces
   */
  getDerivatives(t1, t2, w1, w2, g) {
    const delta = t1 - t2;
    const sinD = Math.sin(delta);
    const cosD = Math.cos(delta);
    const sinT1 = Math.sin(t1);
    const sinT2 = Math.sin(t2);

    // Mass Matrix coefficients (assuming m1=m2=1, L1=L2=1 for physics calc)
    // For compound pendulums (rods):
    const m11 = 4.0 / 3.0;
    const m12 = 0.5 * cosD;
    const m21 = m12;
    const m22 = 1.0 / 3.0;

    // Forces
    const rhs1 = -(0.5 * w2 * w2 * sinD + 1.5 * g * sinT1);
    const rhs2 = -(-0.5 * w1 * w1 * sinD + 0.5 * g * sinT2);

    const det = m11 * m22 - m12 * m21;

    const alpha1 = (m22 * rhs1 - m12 * rhs2) / det;
    const alpha2 = (-m21 * rhs1 + m11 * rhs2) / det;

    return { dt1: w1, dt2: w2, dw1: alpha1, dw2: alpha2 };
  }

  update(g, dt) {
    let k1 = this.getDerivatives(this.theta1, this.theta2, this.omega1, this.omega2, g);

    let k2 = this.getDerivatives(
      this.theta1 + k1.dt1 * dt * 0.5,
      this.theta2 + k1.dt2 * dt * 0.5,
      this.omega1 + k1.dw1 * dt * 0.5,
      this.omega2 + k1.dw2 * dt * 0.5,
      g
    );

    let k3 = this.getDerivatives(
      this.theta1 + k2.dt1 * dt * 0.5,
      this.theta2 + k2.dt2 * dt * 0.5,
      this.omega1 + k2.dw1 * dt * 0.5,
      this.omega2 + k2.dw2 * dt * 0.5,
      g
    );

    let k4 = this.getDerivatives(
      this.theta1 + k3.dt1 * dt,
      this.theta2 + k3.dt2 * dt,
      this.omega1 + k3.dw1 * dt,
      this.omega2 + k3.dw2 * dt,
      g
    );

    this.theta1 += (dt / 6.0) * (k1.dt1 + 2*k2.dt1 + 2*k3.dt1 + k4.dt1);
    this.theta2 += (dt / 6.0) * (k1.dt2 + 2*k2.dt2 + 2*k3.dt2 + k4.dt2);
    this.omega1 += (dt / 6.0) * (k1.dw1 + 2*k2.dw1 + 2*k3.dw1 + k4.dw1);
    this.omega2 += (dt / 6.0) * (k1.dw2 + 2*k2.dw2 + 2*k3.dw2 + k4.dw2);
  }

  display(g) {
    let x1 = ROD_LENGTH * Math.sin(this.theta1);
    let y1 = ROD_LENGTH * Math.cos(this.theta1);

    let x2 = x1 + ROD_LENGTH * Math.sin(this.theta2);
    let y2 = y1 + ROD_LENGTH * Math.cos(this.theta2);

    drawingContext.shadowColor = this.color;

    stroke(this.color);
    strokeWeight(2);

    // Draw Rods
    line(0, 0, x1, y1);
    line(x1, y1, x2, y2);

    // Draw Mass Points
    noStroke();
    fill(this.color);
    ellipse(x1, y1, 6, 6);
    ellipse(x2, y2, 6, 6);

    // Force Visualization
    if (showForces) {
      // Calculate instantaneous acceleration (force proxy)
      let derivs = this.getDerivatives(this.theta1, this.theta2, this.omega1, this.omega2, g);

      // Visualizing Tangential Forces (Acceleration vectors)
      // The acceleration is perpendicular to the rod
      const scaleFactor = 4000; // Scale small alpha values for visibility

      strokeWeight(1);

      // Force on Bob 1
      push();
      translate(x1, y1);
      rotate(this.theta1 + HALF_PI); // Tangent direction
      stroke(255, 200);
      // Draw line proportional to angular acceleration
      line(0, 0, derivs.dw1 * scaleFactor, 0);
      // Arrowhead
      if (Math.abs(derivs.dw1) > 0.001) {
        translate(derivs.dw1 * scaleFactor, 0);
        let arrowSize = 3;
        let dir = derivs.dw1 > 0 ? -1 : 1;
        line(0, 0, arrowSize * dir, -arrowSize);
        line(0, 0, arrowSize * dir, arrowSize);
      }
      pop();

      // Force on Bob 2
      push();
      translate(x2, y2);
      rotate(this.theta2 + HALF_PI); // Tangent direction
      stroke(255, 200);
      line(0, 0, derivs.dw2 * scaleFactor, 0);
      if (Math.abs(derivs.dw2) > 0.001) {
        translate(derivs.dw2 * scaleFactor, 0);
        let arrowSize = 3;
        let dir = derivs.dw2 > 0 ? -1 : 1;
        line(0, 0, arrowSize * dir, -arrowSize);
        line(0, 0, arrowSize * dir, arrowSize);
      }
      pop();
    }
  }
}
