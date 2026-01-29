/**
 * BIO-KINEMATIC SWARM - HYBRID LEARNING (v12.0)
 *
 * Major Updates:
 * - Neural Expansion: Hidden layer increased to 24 neurons for higher dimensionality.
 * - Online Backpropagation: Agents now perform real-time gradient descent (learning)
 *   during their lifetime, correcting steering errors relative to the target vector.
 * - Heuristic Training: The "Target" for backprop is dynamically adjusted to include
 *   obstacle avoidance vectors, teaching the network to blend goals.
 */

const ENV = {
  solverIterations: 10,
  drag: 0.92,
  sensorRange: 220,
  trialsPerGen: 5,
  learningRate: 0.1, // Rate of backpropagation
  colors: {
    bg: [230, 40, 7],
    uiBg: [230, 30, 10, 0.95],
    windowHeader: [230, 40, 15, 0.98],
    modalBg: [225, 25, 8, 0.96],
    panelBg: [225, 25, 5, 0.6],
    accent: [190, 100, 100],
    warning: [0, 90, 90],
    obstacle: [0, 0, 30],
    obstacleStroke: [0, 80, 80],
    wallFill: [240, 20, 20],
    wallStroke: [190, 80, 80],
    textDim: [200, 10, 60],
    textBright: [0, 0, 100],
    grid: [220, 20, 20],
    debug: [120, 80, 80],
    lineageEdge: [230, 10, 40],
    lineageNode: [0, 0, 90],
    sensorSafe: [120, 80, 80],
    sensorDanger: [0, 90, 90]
  },
  menu: {
    x: 20, y: 20, w: 40, h: 40,
    expandedW: 220
  }
};

// Simulation State
let population = [];
const POPULATION_SIZE = 8;
let lastEvolveTime = 0;
let generation = 1;
let currentTrial = 1;
const RACE_DURATION = 15000;

let raceTarget;
let startLineX;
let bestDistanceAllTime = 0;
let globalIdCounter = 0;
let obstacles = [];

// Environment Params
let envParams = {
  mode: 'maze',
  seed: 42,
  complexity: 0.6,
  gapSize: 130,
  wallThickness: 30
};

// Lineage State
let lineageData = [];
let lineageMode = false;
let lineageCamX = 0;
let lineageHoverNode = null;

// Interaction State
let selectedAgent = null;

// UI State
let uiWindows = [];
let menuOpen = false;
let dragTarget = null;

// Designer Params
let customParams = {
  hue: 200,
  swimForce: 2.0,
  waveFrequency: 0.5,
  waveSpeed: 0.25,
  muscleStiffness: 0.2,
  musclePower: 0.4,
  switchRate: 0.03,
  waveType: 'sine',
  waveType2: 'square'
};
const WAVE_TYPES = ['sine', 'square', 'triangle', 'pulse'];

// Oscilloscope Buffer
let scopeBuffer = [];
const SCOPE_SIZE = 100;

// --- UTILS & MATH ---

class SeededRNG {
  constructor(seed) {
    this.m = 0x80000000;
    this.a = 1103515245;
    this.c = 12345;
    this.state = seed ? seed : Math.floor(Math.random() * (this.m - 1));
  }
  nextInt() {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state;
  }
  nextFloat() {
    return this.nextInt() / (this.m - 1);
  }
  nextRange(min, max) {
    return min + this.nextFloat() * (max - min);
  }
}

// Backpropagation-Capable Neural Network
class NeuralNetwork {
  constructor(inputNodes, hiddenNodes, outputNodes, weights = null) {
    this.inputNodes = inputNodes;
    this.hiddenNodes = hiddenNodes;
    this.outputNodes = outputNodes;
    this.learningRate = ENV.learningRate;

    if (weights) {
      this.weightsIH = new Float32Array(weights.ih);
      this.weightsHO = new Float32Array(weights.ho);
      this.biasH = new Float32Array(weights.bh);
      this.biasO = new Float32Array(weights.bo);
    } else {
      // Xavier Initialization approximation
      let limitIH = Math.sqrt(6 / (inputNodes + hiddenNodes));
      let limitHO = Math.sqrt(6 / (hiddenNodes + outputNodes));

      this.weightsIH = new Float32Array(this.inputNodes * this.hiddenNodes).map(() => Math.random() * 2 * limitIH - limitIH);
      this.weightsHO = new Float32Array(this.hiddenNodes * this.outputNodes).map(() => Math.random() * 2 * limitHO - limitHO);
      this.biasH = new Float32Array(this.hiddenNodes).map(() => Math.random() * 0.1 - 0.05);
      this.biasO = new Float32Array(this.outputNodes).map(() => Math.random() * 0.1 - 0.05);
    }

    this.lastInputs = new Float32Array(inputNodes);
    this.lastHidden = new Float32Array(hiddenNodes);
    this.lastOutput = new Float32Array(outputNodes);
  }

  // Forward Pass
  predict(inputs) {
    this.lastInputs.set(inputs);

    // Hidden Layer
    for (let i = 0; i < this.hiddenNodes; i++) {
      let sum = this.biasH[i];
      for (let j = 0; j < this.inputNodes; j++) {
        sum += inputs[j] * this.weightsIH[j * this.hiddenNodes + i];
      }
      this.lastHidden[i] = Math.tanh(sum);
    }

    // Output Layer
    let outputs = [];
    for (let i = 0; i < this.outputNodes; i++) {
      let sum = this.biasO[i];
      for (let j = 0; j < this.hiddenNodes; j++) {
        sum += this.lastHidden[j] * this.weightsHO[j * this.outputNodes + i];
      }
      let val = Math.tanh(sum);
      this.lastOutput[i] = val;
      outputs.push(val);
    }
    return outputs;
  }

  // Backpropagation Training
  train(inputs, targets) {
    // 1. Forward pass (ensure state is current)
    let outputs = this.predict(inputs);

    // 2. Calculate Output Errors
    let outputErrors = new Float32Array(this.outputNodes);
    for(let i = 0; i < this.outputNodes; i++) {
      outputErrors[i] = targets[i] - outputs[i];
    }

    // 3. Calculate Hidden Errors (Backpropagate)
    let hiddenErrors = new Float32Array(this.hiddenNodes);
    for(let i = 0; i < this.hiddenNodes; i++) {
      let errorSum = 0;
      for(let j = 0; j < this.outputNodes; j++) {
        errorSum += outputErrors[j] * this.weightsHO[i * this.outputNodes + j];
      }
      hiddenErrors[i] = errorSum;
    }

    // 4. Update Hidden->Output Weights (Gradient Descent)
    // dE/dW = error * dActivation * input_to_layer
    for(let i = 0; i < this.outputNodes; i++) {
      // Derivative of tanh(x) is 1 - tanh(x)^2
      let gradient = (1 - (outputs[i] * outputs[i])) * outputErrors[i] * this.learningRate;

      this.biasO[i] += gradient;
      for(let j = 0; j < this.hiddenNodes; j++) {
        let delta = gradient * this.lastHidden[j];
        this.weightsHO[j * this.outputNodes + i] += delta;
      }
    }

    // 5. Update Input->Hidden Weights
    for(let i = 0; i < this.hiddenNodes; i++) {
      let gradient = (1 - (this.lastHidden[i] * this.lastHidden[i])) * hiddenErrors[i] * this.learningRate;

      this.biasH[i] += gradient;
      for(let j = 0; j < this.inputNodes; j++) {
        let delta = gradient * this.lastInputs[j];
        this.weightsIH[j * this.hiddenNodes + i] += delta;
      }
    }
  }

  mutate(rate) {
    const mutateVal = (val) => {
      if (Math.random() < rate) {
        return val + (Math.random() * 0.5 - 0.25);
      }
      return val;
    };

    this.weightsIH = this.weightsIH.map(mutateVal);
    this.weightsHO = this.weightsHO.map(mutateVal);
    this.biasH = this.biasH.map(mutateVal);
    this.biasO = this.biasO.map(mutateVal);
  }

  getGenome() {
    return {
      ih: Array.from(this.weightsIH),
      ho: Array.from(this.weightsHO),
      bh: Array.from(this.biasH),
      bo: Array.from(this.biasO)
    };
  }
}

class UIWindow {
  constructor(id, title, x, y, w, h, drawContentFn, onCloseFn = null) {
    this.id = id;
    this.title = title;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.drawContent = drawContentFn;
    this.visible = false;
    this.onClose = onCloseFn;
  }

  draw() {
    if (!this.visible) return;

    push();
    translate(this.x, this.y);

    // Shadow
    noStroke();
    fill(0, 0, 0, 0.3);
    rect(4, 4, this.w, this.h, 4);

    // Body
    fill(ENV.colors.uiBg);
    stroke(ENV.colors.bg[0], 50, 50);
    strokeWeight(1);
    rect(0, 0, this.w, this.h, 4);

    // Header
    fill(ENV.colors.windowHeader);
    rect(0, 0, this.w, 30, 4, 4, 0, 0);

    // Title
    fill(ENV.colors.accent);
    noStroke();
    textSize(12);
    textStyle(BOLD);
    textAlign(LEFT, CENTER);
    text(this.title.toUpperCase(), 10, 15);

    // Close Button (X)
    let closeHover = dist(mouseX, mouseY, this.x + this.w - 15, this.y + 15) < 10;
    if (closeHover) fill(ENV.colors.warning);
    else fill(ENV.colors.textDim);
    textAlign(CENTER, CENTER);
    text("✕", this.w - 15, 15);

    // Content Area
    push();
    translate(0, 30);
    this.drawContent(this.w, this.h - 30);
    pop();

    pop();
  }

  isHeaderHover(mx, my) {
    return this.visible && mx >= this.x && mx <= this.x + this.w && my >= this.y && my <= this.y + 30;
  }

  isCloseHover(mx, my) {
    return this.visible && mx >= this.x + this.w - 30 && mx <= this.x + this.w && my >= this.y && my <= this.y + 30;
  }

  isInside(mx, my) {
    return this.visible && mx >= this.x && mx <= this.x + this.w && my >= this.y && my <= this.y + this.h;
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 1);

  startLineX = width * 0.1;
  raceTarget = createVector(width * 0.9, height / 2);

  for(let i=0; i<SCOPE_SIZE; i++) scopeBuffer.push({h:0, t:0});

  generateObstacles();
  initPopulation();
  initWindows();
}

function initWindows() {
  uiWindows = [];

  // 1. Dashboard
  let dashWin = new UIWindow('dashboard', 'Live Telemetry', width - 340, 80, 320, height - 160, (w, h) => {
    drawDashboardContent(w, h);
  });
  dashWin.visible = true;
  uiWindows.push(dashWin);

  // 2. Designer
  let designWin = new UIWindow('designer', 'Prototype Engineer', 80, 80, 300, 600, (w, h) => {
    drawDesignerContent(w, h);
  });
  uiWindows.push(designWin);

  // 3. Environment Control
  let envWin = new UIWindow('environment', 'Environment Control', 400, 80, 300, 350, (w, h) => {
    drawEnvironmentContent(w, h);
  });
  uiWindows.push(envWin);

  // 4. Inspector
  let inspectWin = new UIWindow('inspector', 'Specimen Analysis', (width-900)/2, (height-550)/2, 900, 550, (w, h) => {
    if (selectedAgent) drawInspectorContent(w, h, selectedAgent);
    else {
      fill(ENV.colors.textDim);
      textAlign(CENTER, CENTER);
      text("NO SPECIMEN SELECTED", w/2, h/2);
    }
  }, () => { selectedAgent = null; });
  uiWindows.push(inspectWin);
}

function initPopulation() {
  population = [];
  for (let i = 0; i < POPULATION_SIZE; i++) {
    let y = getLaneY(i);
    population.push(new Organism(startLineX, y, i, null, null));
  }
}

function getLaneY(index) {
  return map(index, 0, POPULATION_SIZE - 1, height * 0.2, height * 0.8);
}

function generateObstacles() {
  obstacles = [];

  if (envParams.mode === 'scattered') {
    let count = floor(random(6, 12));
    for(let i = 0; i < count; i++) {
      let r = random(30, 70);
      let x = random(width * 0.3, width * 0.7);
      let y = random(height * 0.1, height * 0.9);

      let overlapping = false;
      for(let o of obstacles) {
        if(o.type === 'circle' && dist(x, y, o.pos.x, o.pos.y) < r + o.r + 20) {
          overlapping = true;
          break;
        }
      }

      if(!overlapping) {
        obstacles.push({
          type: 'circle',
          pos: createVector(x, y),
          r: r,
          pulseOffset: random(TWO_PI)
        });
      }
    }
  } else if (envParams.mode === 'maze') {
    let rng = new SeededRNG(envParams.seed);
    let numLayers = floor(map(envParams.complexity, 0, 1, 1, 15));
    let startX = width * 0.25;
    let endX = width * 0.75;
    let availableWidth = endX - startX;
    let spacing = availableWidth / (numLayers + 1);

    for (let i = 0; i < numLayers; i++) {
      let x = startX + (i + 1) * spacing;
      let gapY = rng.nextRange(height * 0.2, height * 0.8);
      let gapSize = envParams.gapSize;

      obstacles.push({
        type: 'rect',
        x: x,
        y: 0,
        w: envParams.wallThickness,
        h: gapY - gapSize/2,
        id: i
      });

      obstacles.push({
        type: 'rect',
        x: x,
        y: gapY + gapSize/2,
        w: envParams.wallThickness,
        h: height - (gapY + gapSize/2),
        id: i
      });
    }
  }
}

function draw() {
  background(ENV.colors.bg[0], ENV.colors.bg[1], ENV.colors.bg[2]);

  if (lineageMode) {
    drawLineageView();
  } else {
    drawRaceSystem();
  }

  for (let win of uiWindows) {
    win.draw();
  }

  drawHamburgerMenu();
}

function drawRaceSystem() {
  drawRaceTrack();
  drawObstacles();

  let timeSinceStart = millis() - lastEvolveTime;

  for (let creature of population) {
    creature.thinkAndAct();
    creature.update();
    creature.draw();
  }

  if (selectedAgent) {
    drawSelectionHalo(selectedAgent);
  }

  if (timeSinceStart > RACE_DURATION) {
    handleEpochEnd();
  }
}

// --- INTERACTION ---

function mousePressed() {
  if (menuOpen) {
    let mx = ENV.menu.x;
    let my = ENV.menu.y + 50;
    let itemH = 40;
    let w = ENV.menu.expandedW;

    let items = [
      { l: "TOGGLE DASHBOARD", act: () => toggleWindow('dashboard') },
      { l: "TOGGLE DESIGNER", act: () => toggleWindow('designer') },
      { l: "ENVIRONMENT SETTINGS", act: () => toggleWindow('environment') },
      { l: lineageMode ? "EXIT PHYLOGENY" : "VIEW PHYLOGENY", act: () => toggleLineage() },
      { l: "RESET SIMULATION", act: () => resetSim() }
    ];

    for(let i=0; i<items.length; i++) {
        if (mouseX > mx && mouseX < mx + w && mouseY > my + i*itemH && mouseY < my + (i+1)*itemH) {
            items[i].act();
            menuOpen = false;
            return;
        }
    }
  }

  if (mouseX > ENV.menu.x && mouseX < ENV.menu.x + ENV.menu.w && mouseY > ENV.menu.y && mouseY < ENV.menu.y + ENV.menu.h) {
    menuOpen = !menuOpen;
    return;
  }

  if (menuOpen && mouseX > ENV.menu.x + ENV.menu.expandedW) {
      menuOpen = false;
      return;
  }

  let hitWindow = false;
  for (let i = uiWindows.length - 1; i >= 0; i--) {
    let win = uiWindows[i];
    if (win.visible && win.isInside(mouseX, mouseY)) {
      hitWindow = true;

      uiWindows.splice(i, 1);
      uiWindows.push(win);

      if (win.isCloseHover(mouseX, mouseY)) {
        win.visible = false;
        if (win.onClose) win.onClose();
      } else if (win.isHeaderHover(mouseX, mouseY)) {
        dragTarget = { window: win, offX: mouseX - win.x, offY: mouseY - win.y };
      } else {
        handleWindowContentClick(win, mouseX - win.x, mouseY - win.y - 30);
      }
      break;
    }
  }

  if (hitWindow) return;

  if (!lineageMode) {
    let clickedAgent = null;
    let minDist = 100;
    for (let agent of population) {
      let headPos = agent.points[0].pos;
      let d = dist(mouseX, mouseY, headPos.x, headPos.y);
      if (d < 60 && d < minDist) {
        minDist = d;
        clickedAgent = agent;
      }
    }

    if (clickedAgent) {
      selectedAgent = clickedAgent;
      let insWin = uiWindows.find(w => w.id === 'inspector');
      if (insWin) {
        insWin.visible = true;
        uiWindows = uiWindows.filter(w => w !== insWin);
        uiWindows.push(insWin);
      }
    } else {
      selectedAgent = null;
      let insWin = uiWindows.find(w => w.id === 'inspector');
      if (insWin) insWin.visible = false;
    }
  }
}

function mouseDragged() {
  if (dragTarget) {
    dragTarget.window.x = mouseX - dragTarget.offX;
    dragTarget.window.y = mouseY - dragTarget.offY;
    return;
  }

  if (uiWindows.length > 0) {
      let topWin = uiWindows[uiWindows.length-1];
      if (topWin.visible && topWin.isInside(mouseX, mouseY)) {
          handleWindowContentClick(topWin, mouseX - topWin.x, mouseY - topWin.y - 30);
      }
  }

  if (lineageMode) {
    lineageCamX += movedX;
    let minX = -max(0, (generation) * 120);
    lineageCamX = constrain(lineageCamX, minX, 100);
  }
}

function mouseReleased() {
  dragTarget = null;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  startLineX = width * 0.1;
  raceTarget.set(width * 0.9, height / 2);
  generateObstacles();

  let dash = uiWindows.find(w => w.id === 'dashboard');
  if(dash && dash.x > width) dash.x = width - 340;
}

// --- MENU & WINDOW HELPERS ---

function drawHamburgerMenu() {
  let x = ENV.menu.x;
  let y = ENV.menu.y;
  let s = ENV.menu.w;

  push();
  noStroke();
  fill(ENV.colors.uiBg);
  if(menuOpen) fill(ENV.colors.accent);
  rect(x, y, s, s, 4);

  stroke(menuOpen ? ENV.colors.uiBg : ENV.colors.textBright);
  strokeWeight(3);
  let pad = 10;
  line(x + pad, y + pad, x + s - pad, y + pad);
  line(x + pad, y + s/2, x + s - pad, y + s/2);
  line(x + pad, y + s - pad, x + s - pad, y + s - pad);

  if (menuOpen) {
    let w = ENV.menu.expandedW;
    let h = 5 * 40 + 10;

    translate(x, y + s + 5);

    fill(ENV.colors.uiBg);
    noStroke();
    rect(0, 0, w, h, 4);

    let items = [
      { l: "TOGGLE DASHBOARD", active: uiWindows.find(w=>w.id==='dashboard').visible },
      { l: "TOGGLE DESIGNER", active: uiWindows.find(w=>w.id==='designer').visible },
      { l: "ENVIRONMENT SETTINGS", active: uiWindows.find(w=>w.id==='environment').visible },
      { l: lineageMode ? "EXIT PHYLOGENY" : "VIEW PHYLOGENY", active: lineageMode },
      { l: "RESET SIMULATION", active: false }
    ];

    textSize(12);
    textStyle(BOLD);
    textAlign(LEFT, CENTER);

    for(let i=0; i<items.length; i++) {
        let it = items[i];
        let iy = i * 40;

        if (mouseX > x && mouseX < x + w && mouseY > y + s + 5 + iy && mouseY < y + s + 5 + iy + 40) {
            fill(ENV.colors.accent[0], 40, 40);
            rect(0, iy, w, 40);
        }

        fill(it.active ? ENV.colors.accent : ENV.colors.textBright);
        text(it.l, 15, iy + 20);

        stroke(ENV.colors.bg[0], 50, 50);
        strokeWeight(1);
        if(i < items.length-1) line(0, iy+40, w, iy+40);
        noStroke();
    }
  }
  pop();
}

function toggleWindow(id) {
  let win = uiWindows.find(w => w.id === id);
  if (win) {
    win.visible = !win.visible;
    if (win.visible) {
      uiWindows = uiWindows.filter(w => w !== win);
      uiWindows.push(win);
    }
  }
}

function toggleLineage() {
  lineageMode = !lineageMode;
  if(lineageMode) {
    lineageCamX = -max(0, (generation - 5) * 120);
  }
}

function resetSim() {
  generation = 1;
  currentTrial = 1;
  lastEvolveTime = millis();
  bestDistanceAllTime = 0;
  lineageData = [];
  initPopulation();
  generateObstacles();
  selectedAgent = null;
}

function handleWindowContentClick(win, lx, ly) {
  if (win.id === 'designer') {
    handleDesignerClick(lx, ly, win.w);
  } else if (win.id === 'environment') {
    handleEnvironmentClick(lx, ly, win.w);
  }
}

// --- WINDOW CONTENTS ---

function drawEnvironmentContent(w, h) {
  let startY = 10;
  let gap = 50;
  let sx = 20;
  let sw = w - 40;

  fill(ENV.colors.textDim);
  textAlign(LEFT, BOTTOM);
  textSize(10);
  text("OBSTACLE CONFIGURATION", sx, startY);

  let btnW = (sw - 10) / 2;
  let modeY = startY + 5;

  let isScattered = envParams.mode === 'scattered';
  fill(isScattered ? ENV.colors.accent : [0, 0, 20]);
  stroke(isScattered ? ENV.colors.accent : [0, 0, 40]);
  rect(sx, modeY, btnW, 30, 4);
  fill(isScattered ? 0 : ENV.colors.textBright);
  noStroke();
  textAlign(CENTER, CENTER);
  text("ASTEROID FIELD", sx + btnW/2, modeY + 15);

  let isMaze = envParams.mode === 'maze';
  fill(isMaze ? ENV.colors.accent : [0, 0, 20]);
  stroke(isMaze ? ENV.colors.accent : [0, 0, 40]);
  rect(sx + btnW + 10, modeY, btnW, 30, 4);
  fill(isMaze ? 0 : ENV.colors.textBright);
  noStroke();
  text("THE GAUNTLET", sx + btnW + 10 + btnW/2, modeY + 15);

  if (isMaze) {
    let sY = modeY + 50;
    envParams.complexity = drawSlider("MAZE COMPLEXITY", envParams.complexity, 0, 1, sx, sY, sw, false, 'environment');
    envParams.gapSize = drawSlider("GAP APERTURE", envParams.gapSize, 60, 200, sx, sY + gap, sw, false, 'environment');
    envParams.seed = floor(drawSlider("GENERATION SEED", envParams.seed, 0, 1000, sx, sY + gap * 2, sw, false, 'environment'));
  } else {
    fill(ENV.colors.textDim);
    textAlign(CENTER, CENTER);
    text("Randomized obstacle placement.", w/2, h/2);
  }

  let btnRegenY = h - 50;
  fill(ENV.colors.warning);
  rect(sx, btnRegenY, sw, 40, 4);
  fill(ENV.colors.textBright);
  textSize(12);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text("REGENERATE WORLD", sx + sw/2, btnRegenY + 20);
}

function handleEnvironmentClick(lx, ly, w) {
  let startY = 10;
  let sx = 20;
  let sw = w - 40;
  let modeY = startY + 5;
  let btnW = (sw - 10) / 2;

  if (ly >= modeY && ly <= modeY + 30) {
    if (lx >= sx && lx <= sx + btnW) envParams.mode = 'scattered';
    if (lx >= sx + btnW + 10 && lx <= sx + btnW*2 + 10) envParams.mode = 'maze';
  }

  let h = 320;
  let btnRegenY = h - 50;
  if (ly >= btnRegenY && ly <= btnRegenY + 40 && lx >= sx && lx <= sx + sw) {
    generateObstacles();
  }
}

function drawDashboardContent(w, h) {
  let elapsed = lineageMode ? 0 : (millis() - lastEvolveTime);
  let progress = constrain(elapsed / RACE_DURATION, 0, 1);

  fill(0, 0, 15);
  rect(10, 10, w - 20, 4);
  fill(ENV.colors.accent);
  rect(10, 10, (w - 20) * (1-progress), 4);

  fill(ENV.colors.textBright);
  textSize(16);
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  text(`GEN ${generation}`, 10, 25);

  textSize(12);
  textStyle(NORMAL);
  fill(ENV.colors.textDim);
  if (elapsed === 0) text("PHYLOGENY MODE", 80, 28);
  else text(`RUN ${currentTrial}/${ENV.trialsPerGen} | ${(RACE_DURATION/1000 - elapsed/1000).toFixed(1)}s`, 80, 28);

  fill(ENV.colors.textBright);
  text(`BEST: ${bestDistanceAllTime.toFixed(0)}m`, 10, 48);

  fill(ENV.colors.debug);
  let avgSpeed = 0;
  for(let p of population) avgSpeed += p.velHistory[p.velHistory.length-1];
  avgSpeed /= population.length;
  text(`AVG SPD: ${(avgSpeed*10).toFixed(1)}`, 110, 48);

  let listY = 70;
  let slotH = (h - listY) / POPULATION_SIZE;

  stroke(ENV.colors.bg[0], 50, 50);
  line(0, 65, w, 65);

  for (let i = 0; i < population.length; i++) {
    let agent = population[i];
    let y = listY + i * slotH;

    if (selectedAgent === agent) {
      fill(ENV.colors.accent[0], ENV.colors.accent[1], ENV.colors.accent[2], 0.15);
      noStroke();
      rect(0, y, w, slotH);
    }

    fill(0, 0, 100, 0.05);
    textSize(32);
    textAlign(RIGHT, CENTER);
    textStyle(BOLD);
    text(i + 1, w - 10, y + slotH/2);

    push();
    translate(10, y + 10);

    fill(agent.dna.hue, 70, 90);
    textSize(12);
    textStyle(BOLD);
    textAlign(LEFT, TOP);
    let rankLabel = agent.isElite ? "ELITE" : "UNIT";
    text(`${rankLabel}-${agent.globalId.toString().padStart(3, '0')}`, 0, 0);

    textSize(10);
    fill(ENV.colors.textDim);
    textStyle(NORMAL);
    text(`${agent.dna.waveType.toUpperCase().substring(0,3)}/${agent.dna.waveType2.toUpperCase().substring(0,3)}`, 70, 2);

    let rowY = 16;
    fill(ENV.colors.textBright);
    text(`DIST: ${agent.points[0].pos.x.toFixed(0)}`, 0, rowY);

    let stats = [
      { l: "F", v: agent.dna.swimForce, min: 1.0, max: 3.0 },
      { l: "Q", v: agent.dna.waveFrequency, min: 0.2, max: 0.8 }
    ];

    let barY = rowY + 14;
    stats.forEach((s, idx) => {
      let bx = idx * 60;
      fill(ENV.colors.textDim);
      text(s.l, bx, barY);
      fill(agent.dna.hue, 80, 80);
      let pct = map(s.v, s.min, s.max, 0, 1);
      rect(bx + 10, barY, 40 * pct, 4);
      fill(0, 0, 20);
      rect(bx + 10 + 40*pct, barY, 40*(1-pct), 4);
    });

    pop();

    stroke(0, 0, 100, 0.1);
    strokeWeight(1);
    line(10, y + slotH, w - 10, y + slotH);
  }
}

function drawDesignerContent(w, h) {
    let startY = 10;
    let gap = 40;
    let sw = w - 40;
    let sx = 20;

    customParams.hue = drawSlider("HUE PIGMENT", customParams.hue, 0, 360, sx, startY, sw, true, 'designer');
    customParams.swimForce = drawSlider("SWIM FORCE", customParams.swimForce, 1.0, 4.0, sx, startY + gap, sw, false, 'designer');
    customParams.waveFrequency = drawSlider("OSC FREQUENCY", customParams.waveFrequency, 0.1, 1.0, sx, startY + gap*2, sw, false, 'designer');
    customParams.waveSpeed = drawSlider("WAVE SPEED", customParams.waveSpeed, 0.1, 0.5, sx, startY + gap*3, sw, false, 'designer');
    customParams.muscleStiffness = drawSlider("MYOFIBRIL STIFFNESS", customParams.muscleStiffness, 0.05, 0.5, sx, startY + gap*4, sw, false, 'designer');
    customParams.musclePower = drawSlider("CONTRACT POWER", customParams.musclePower, 0.1, 0.9, sx, startY + gap*5, sw, false, 'designer');
    customParams.switchRate = drawSlider("PATTERN SHIFT RATE", customParams.switchRate, 0.01, 0.1, sx, startY + gap*6, sw, false, 'designer');

    let typeY = startY + gap*7 + 10;

    // Wave Type 1
    fill(ENV.colors.textDim);
    textAlign(LEFT, BOTTOM);
    text("PRIMARY WAVEFORM", sx, typeY);
    let btnW = (sw - (WAVE_TYPES.length-1)*5) / WAVE_TYPES.length;
    for(let i=0; i<WAVE_TYPES.length; i++) {
      let bx = sx + i * (btnW + 5);
      let by = typeY + 5;
      let type = WAVE_TYPES[i];
      let selected = customParams.waveType === type;
      fill(selected ? ENV.colors.accent : [0, 0, 20]);
      stroke(selected ? ENV.colors.accent : [0, 0, 40]);
      rect(bx, by, btnW, 25, 2);
      fill(selected ? [0, 0, 0] : ENV.colors.textBright);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(9);
      text(type.toUpperCase().substring(0, 4), bx + btnW/2, by + 12.5);
    }

    // Wave Type 2
    let typeY2 = typeY + 45;
    fill(ENV.colors.textDim);
    textAlign(LEFT, BOTTOM);
    text("SECONDARY WAVEFORM", sx, typeY2);
    for(let i=0; i<WAVE_TYPES.length; i++) {
      let bx = sx + i * (btnW + 5);
      let by = typeY2 + 5;
      let type = WAVE_TYPES[i];
      let selected = customParams.waveType2 === type;
      fill(selected ? ENV.colors.accent : [0, 0, 20]);
      stroke(selected ? ENV.colors.accent : [0, 0, 40]);
      rect(bx, by, btnW, 25, 2);
      fill(selected ? [0, 0, 0] : ENV.colors.textBright);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(9);
      text(type.toUpperCase().substring(0, 4), bx + btnW/2, by + 12.5);
    }

    let prevY = typeY2 + 45;
    fill(0, 0, 10);
    stroke(ENV.colors.accent[0], 30, 30);
    rect(sx, prevY, sw, 60);

    push();
    translate(sx + sw/2, prevY + 30);
    let prevColor = color(customParams.hue, 80, 80);
    fill(prevColor);
    noStroke();
    circle(0, 0, 15);
    noFill();
    stroke(prevColor);
    strokeWeight(2);

    // Preview Blend
    let mix = 0.5 + 0.5 * sin(frameCount * customParams.switchRate);
    let dummyAgent = { getWaveSignal: (p, t) => {
        if(t==='square') return sin(p)>=0?1:-1;
        if(t==='triangle') return asin(sin(p))/(PI/2);
        if(t==='pulse') return sin(p)>0.5?1:(sin(p)<-0.5?-0.5:0);
        return sin(p);
    }};

    beginShape();
    for(let i=0; i<20; i++) {
      let x = -i * 5;
      let ph = frameCount * 0.2 - i * 0.5;
      let s1 = dummyAgent.getWaveSignal(ph, customParams.waveType);
      let s2 = dummyAgent.getWaveSignal(ph, customParams.waveType2);
      let y = lerp(s1, s2, mix) * 10;
      vertex(x, y);
    }
    endShape();
    pop();

    let btnY = prevY + 70;
    fill(ENV.colors.accent);
    noStroke();
    rect(sx, btnY, sw, 40, 4);

    fill(ENV.colors.textBright);
    textSize(14);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text("INJECT SPECIMEN", sx + sw/2, btnY + 20);
}

function handleDesignerClick(lx, ly, w) {
    let startY = 10;
    let gap = 40;
    let sw = w - 40;
    let sx = 20;
    let typeY = startY + gap*7 + 10;
    let btnW = (sw - (WAVE_TYPES.length-1)*5) / WAVE_TYPES.length;

    // Wave 1 Click
    if (ly >= typeY + 5 && ly <= typeY + 30) {
        for(let i=0; i<WAVE_TYPES.length; i++) {
            let bx = sx + i * (btnW + 5);
            if (lx >= bx && lx <= bx + btnW) {
                customParams.waveType = WAVE_TYPES[i];
                return;
            }
        }
    }

    // Wave 2 Click
    let typeY2 = typeY + 45;
    if (ly >= typeY2 + 5 && ly <= typeY2 + 30) {
        for(let i=0; i<WAVE_TYPES.length; i++) {
            let bx = sx + i * (btnW + 5);
            if (lx >= bx && lx <= bx + btnW) {
                customParams.waveType2 = WAVE_TYPES[i];
                return;
            }
        }
    }

    let prevY = typeY2 + 45;
    let btnY = prevY + 70;
    if (lx >= sx && lx <= sx + sw && ly >= btnY && ly <= btnY + 40) {
        injectCustomSwimmer();
    }
}

function drawSlider(label, val, minV, maxV, x, y, w, isColor = false, winId = '') {
  let h = 4;
  let knR = 6;

  let win = uiWindows.find(w => w.id === winId);
  if (win && win.visible && mouseIsPressed && win.isInside(mouseX, mouseY)) {
      let mx = mouseX - win.x;
      let my = mouseY - win.y - 30;

      if (mx >= x - 10 && mx <= x + w + 10 && my >= y && my <= y + 25) {
        let norm = constrain((mx - x) / w, 0, 1);
        val = map(norm, 0, 1, minV, maxV);
      }
  }

  let pct = map(val, minV, maxV, 0, 1);

  push();
  fill(ENV.colors.textDim);
  noStroke();
  textAlign(LEFT, BOTTOM);
  textSize(10);
  text(label, x, y);

  textAlign(RIGHT, BOTTOM);
  fill(ENV.colors.textBright);
  text(isColor ? val.toFixed(0) : val.toFixed(2), x + w, y);

  fill(0, 0, 20);
  rect(x, y + 5, w, h, 2);

  if (isColor) {
    fill(val, 80, 80);
  } else {
    fill(ENV.colors.accent);
  }
  rect(x, y + 5, w * pct, h, 2);

  fill(255);
  circle(x + w * pct, y + 5 + h/2, knR * 2);
  pop();

  return val;
}

function drawInspectorContent(w, h, agent) {
  let timeAlive = millis() - lastEvolveTime;

  textAlign(RIGHT, CENTER);
  textSize(12);
  fill(ENV.colors.textDim);
  text(`GEN: ${generation} | TRIAL: ${currentTrial} | ALIVE: ${(timeAlive/1000).toFixed(1)}s`, w - 20, 10);

  let col1W = w * 0.30;
  let col2W = w * 0.45;
  let col3W = w * 0.25;

  drawGeneticsPanel(20, 40, col1W - 30, h - 60, agent);
  drawNeuralSchematic(20 + col1W, 40, col2W - 20, h - 60, agent);
  drawTelemetryPanel(20 + col1W + col2W, 40, col3W - 40, h - 60, agent);
}

// --- INSPECTOR COMPONENTS ---

function drawGeneticsPanel(x, y, w, h, agent) {
  push();
  translate(x, y);

  fill(ENV.colors.panelBg);
  noStroke();
  rect(0, 0, w, 140, 4);

  fill(ENV.colors.textBright);
  textSize(10);
  text("NEURAL OSCILLATOR (DUAL-PHASE)", 10, 20);

  let time = frameCount * agent.dna.waveSpeed;
  let headPhase = time;
  let tailPhase = time - (agent.dna.segmentCount-1) * agent.dna.waveFrequency;

  let mix = 0.5 + 0.5 * sin(frameCount * agent.dna.switchRate);

  let h1 = agent.getWaveSignal(headPhase, agent.dna.waveType);
  let h2 = agent.getWaveSignal(headPhase, agent.dna.waveType2);
  let headSig = lerp(h1, h2, mix);

  let t1 = agent.getWaveSignal(tailPhase, agent.dna.waveType);
  let t2 = agent.getWaveSignal(tailPhase, agent.dna.waveType2);
  let tailSig = lerp(t1, t2, mix);

  scopeBuffer.push({ h: headSig, t: tailSig });
  if (scopeBuffer.length > SCOPE_SIZE) scopeBuffer.shift();

  push();
  translate(10, 80);
  let scaleY = 40;
  let stepX = (w - 20) / SCOPE_SIZE;

  stroke(255, 0.1);
  line(0, 0, w-20, 0);

  // Draw Mix Indicator
  noStroke();
  fill(0, 0, 100, 0.1);
  rect(0, -50, (w-20)*mix, 4);
  fill(ENV.colors.accent);
  text(`MIX: ${mix.toFixed(2)}`, w-50, -55);

  noFill();
  strokeWeight(1.5);

  stroke(180, 100, 100);
  beginShape();
  for(let i=0; i<scopeBuffer.length; i++) vertex(i*stepX, scopeBuffer[i].h * -scaleY);
  endShape();

  stroke(300, 100, 100, 0.7);
  drawingContext.setLineDash([3, 3]);
  beginShape();
  for(let i=0; i<scopeBuffer.length; i++) vertex(i*stepX, scopeBuffer[i].t * -scaleY);
  endShape();
  drawingContext.setLineDash([]);

  noStroke();
  fill(180, 100, 100); text("HEAD", 0, 50);
  fill(300, 100, 100); text("TAIL", 40, 50);
  pop();

  let startY = 160;
  drawBarStat("SWIM FORCE", agent.dna.swimForce, 1.0, 3.0, 0, startY, w);
  drawBarStat("FREQUENCY", agent.dna.waveFrequency, 0.2, 0.8, 1, startY, w);
  drawBarStat("STIFFNESS", agent.dna.muscleStiffness, 0.05, 0.3, 2, startY, w);
  drawBarStat("SHIFT RATE", agent.dna.switchRate, 0.01, 0.1, 3, startY, w);

  pop();
}

function drawBarStat(label, val, minV, maxV, idx, startY, w) {
  let h = 35;
  let y = startY + idx * (h + 10);
  let pct = map(val, minV, maxV, 0, 1, true);

  fill(ENV.colors.textDim);
  textSize(9);
  textAlign(LEFT, TOP);
  text(label, 0, y);

  textAlign(RIGHT, TOP);
  fill(ENV.colors.textBright);
  text(val.toFixed(2), w, y);

  fill(0, 0, 20);
  rect(0, y + 14, w, 6, 2);

  fill(ENV.colors.accent);
  if (pct > 0.8) fill(ENV.colors.warning);
  rect(0, y + 14, w * pct, 6, 2);
}

function drawNeuralSchematic(x, y, w, h, agent) {
  push();
  translate(x, y);

  stroke(ENV.colors.accent[0], 40, 40);
  fill(0, 0, 0, 0.3);
  rect(0, 0, w, h, 4);

  // Grid lines
  stroke(ENV.colors.accent[0], 30, 30, 0.2);
  for(let i=0; i<w; i+=40) line(i, 0, i, h);
  for(let j=0; j<h; j+=40) line(0, j, w, j);

  noStroke();
  fill(ENV.colors.accent);
  textSize(10);
  text("DEEP NEURAL NETWORK (24 HIDDEN)", 10, 20);

  // Training Indicator
  if (frameCount % 10 < 5) {
      fill(ENV.colors.warning);
      textAlign(RIGHT, TOP);
      text("BACKPROP ACTIVE", w - 10, 10);
  }

  // Draw Brain Viz
  let brain = agent.brain;
  let inputs = brain.lastInputs;
  let hidden = brain.lastHidden;
  let output = brain.lastOutput;

  let layerX = [w * 0.15, w * 0.5, w * 0.85];
  let nodeR = 6;

  // Calculate node positions
  let inputY = [];
  let hiddenY = [];
  let outputY = [];

  const getYs = (count) => {
    let arr = [];
    let spacing = min(h / (count + 1), 30);
    let totalH = spacing * (count - 1);
    let startY = (h - totalH) / 2;
    for(let i=0; i<count; i++) arr.push(startY + i*spacing);
    return arr;
  };

  inputY = getYs(brain.inputNodes);
  hiddenY = getYs(brain.hiddenNodes);
  outputY = getYs(brain.outputNodes);

  // Draw Connections (Weights)
  const drawWeights = (fromY, toY, weights, x1, x2) => {
    for (let i = 0; i < fromY.length; i++) {
      for (let j = 0; j < toY.length; j++) {
        let weight = weights[i * toY.length + j];
        if (abs(weight) > 0.15) {
          let alpha = map(abs(weight), 0.15, 1, 0, 0.4);
          strokeWeight(map(abs(weight), 0, 1, 0.5, 1.5));
          if (weight > 0) stroke(190, 80, 80, alpha); // Cyan
          else stroke(0, 80, 80, alpha); // Red
          line(x1, fromY[i], x2, toY[j]);
        }
      }
    }
  };

  drawWeights(inputY, hiddenY, brain.weightsIH, layerX[0], layerX[1]);
  drawWeights(hiddenY, outputY, brain.weightsHO, layerX[1], layerX[2]);

  // Draw Nodes
  const drawNodes = (yArr, x, activations, labels) => {
    for(let i=0; i<yArr.length; i++) {
      let val = activations[i];
      noStroke();
      fill(0, 0, 20);
      circle(x, yArr[i], nodeR*2);

      if (val > 0) fill(190, 80, 100, val);
      else fill(0, 80, 100, abs(val));
      circle(x, yArr[i], nodeR*2);

      stroke(255);
      strokeWeight(1);
      noFill();
      circle(x, yArr[i], nodeR*2);

      if (labels) {
        fill(ENV.colors.textDim);
        noStroke();
        textSize(8);
        textAlign(CENTER, BOTTOM);
        text(labels[i], x, yArr[i] - 10);
      }
    }
  };

  drawNodes(inputY, layerX[0], inputs, ["ANG", "DST", "S-L", "S-C", "S-R"]);
  drawNodes(hiddenY, layerX[1], hidden, null);
  drawNodes(outputY, layerX[2], output, ["STEER"]);

  pop();
}

function drawTelemetryPanel(x, y, w, h, agent) {
  push();
  translate(x, y);

  let vel = p5.Vector.sub(agent.points[0].pos, agent.points[0].oldPos).mag() * 10;
  drawCircularGauge(w/2, 60, 40, vel, 0, 15, "VELOCITY", "px/t");

  let heading = degrees(agent.headingAngle);
  drawCompassGauge(w/2, 180, 35, heading);

  let ty = 260;
  fill(ENV.colors.panelBg);
  rect(0, ty, w, h - ty, 4);

  let tx = 15;
  let tyStart = ty + 20;
  let gap = 20;

  fill(ENV.colors.textBright);
  textSize(10);
  textAlign(LEFT);

  text("TARGET DIST:", tx, tyStart);
  textAlign(RIGHT);
  text(dist(agent.points[0].pos.x, agent.points[0].pos.y, raceTarget.x, raceTarget.y).toFixed(0), w-tx, tyStart);

  text("EFFICIENCY:", tx, tyStart + gap);
  textAlign(RIGHT);
  let eff = (vel / agent.dna.swimForce) * 10;
  text(eff.toFixed(2), w-tx, tyStart + gap);

  text("LEARNING RATE:", tx, tyStart + gap*2);
  textAlign(RIGHT);
  text(ENV.learningRate.toFixed(2), w-tx, tyStart + gap*2);
  pop();
}

function drawCircularGauge(cx, cy, r, val, minV, maxV, label, unit) {
  push();
  translate(cx, cy);
  noFill();
  stroke(0, 0, 20);
  strokeWeight(6);
  arc(0, 0, r*2, r*2, PI - QUARTER_PI, TWO_PI + QUARTER_PI);
  let norm = constrain(map(val, minV, maxV, 0, 1), 0, 1);
  let endAngle = map(norm, 0, 1, PI - QUARTER_PI, TWO_PI + QUARTER_PI);
  stroke(ENV.colors.accent);
  if (norm > 0.8) stroke(ENV.colors.warning);
  arc(0, 0, r*2, r*2, PI - QUARTER_PI, endAngle);
  noStroke();
  fill(ENV.colors.textBright);
  textSize(18);
  textAlign(CENTER, CENTER);
  text(val.toFixed(1), 0, 0);
  textSize(9);
  fill(ENV.colors.textDim);
  text(unit, 0, 12);
  text(label, 0, r + 15);
  pop();
}

function drawCompassGauge(cx, cy, r, angleDeg) {
  push();
  translate(cx, cy);
  noFill();
  stroke(0, 0, 30);
  strokeWeight(2);
  ellipse(0, 0, r*2, r*2);
  stroke(0, 0, 50);
  for(let i=0; i<8; i++) {
    let a = i * (TWO_PI/8);
    line(cos(a)*(r-5), sin(a)*(r-5), cos(a)*r, sin(a)*r);
  }
  rotate(radians(angleDeg));
  fill(ENV.colors.accent);
  noStroke();
  triangle(0, -r+5, -4, 4, 4, 4);
  rotate(-radians(angleDeg));
  fill(ENV.colors.textDim);
  textAlign(CENTER);
  textSize(9);
  text("HEADING", 0, r + 15);
  pop();
}

// --- LINEAGE & PHYSICS ---

function handleEpochEnd() {
  // Sync brains to DNA before any manipulation
  for (let p of population) {
    p.dna.brainWeights = p.brain.getGenome();
  }

  // Sort by distance (fitness)
  population.sort((a, b) => {
      let dA = dist(a.points[0].pos.x, a.points[0].pos.y, raceTarget.x, raceTarget.y);
      let dB = dist(b.points[0].pos.x, b.points[0].pos.y, raceTarget.x, raceTarget.y);
      return dA - dB;
  });

  let currentBest = population[0].points[0].pos.x;
  if (currentBest > bestDistanceAllTime) bestDistanceAllTime = currentBest;

  if (currentTrial < ENV.trialsPerGen) {
    // Micro-Evolution: Refine weights without full reproduction
    refinePopulation();
    currentTrial++;
  } else {
    // Macro-Evolution: Full reproduction and new generation
    reproducePopulation();
    currentTrial = 1;
    generation++;
  }

  lastEvolveTime = millis();

  // Maintain selection if possible
  if(selectedAgent) {
      let survivor = population.find(p => p.globalId === selectedAgent.globalId);
      selectedAgent = survivor || null;
      if(!selectedAgent) {
           let win = uiWindows.find(w => w.id === 'inspector');
           if(win) win.visible = false;
      }
  }
}

function refinePopulation() {
  // Hill Climbing Strategy
  let bestDNA = JSON.parse(JSON.stringify(population[0].dna));
  let newPop = [];

  for(let i=0; i<POPULATION_SIZE; i++) {
    let p = population[i];
    let y = getLaneY(i);
    let newAgent;

    if (i === 0) {
      // Elite: No change
      newAgent = new Organism(startLineX, y, i, p.dna, p.globalId);
      newAgent.isElite = true;
    } else if (i < POPULATION_SIZE / 2) {
      // Top Half: Small mutation
      newAgent = new Organism(startLineX, y, i, p.dna, p.globalId);
      newAgent.mutate(0.05);
    } else {
      // Bottom Half: Replace with Best + Moderate Mutation
      newAgent = new Organism(startLineX, y, i, bestDNA, p.globalId);
      newAgent.mutate(0.2);
    }
    newPop.push(newAgent);
  }
  population = newPop;
}

function reproducePopulation() {
  // Log Lineage
  for(let p of population) {
    lineageData.push({
      id: p.globalId,
      parentId: p.parentId,
      gen: generation,
      dna: JSON.parse(JSON.stringify(p.dna)),
      dist: p.points[0].pos.x,
      lane: p.laneIndex,
      isElite: p.isElite
    });
  }

  let newPop = [];

  // Elites (Top 2) - Clone exactly
  for (let i = 0; i < 2; i++) {
    let parent = population[i];
    let y = getLaneY(newPop.length);
    let elite = new Organism(startLineX, y, newPop.length, parent.dna, parent.globalId);
    elite.isElite = true;
    newPop.push(elite);
  }

  // Survivors (Next 4) - Small mutation
  let cullCount = floor(POPULATION_SIZE * 0.25);
  let survivorCount = POPULATION_SIZE - cullCount - 2;

  for (let i = 2; i < 2 + survivorCount; i++) {
    let parent = population[i];
    let y = getLaneY(newPop.length);
    let survivor = new Organism(startLineX, y, newPop.length, parent.dna, parent.globalId);
    survivor.mutate(0.1);
    newPop.push(survivor);
  }

  // Offspring (Bottom 2 replaced) - Large mutation from Top 2 parents
  for (let i = 0; i < cullCount; i++) {
    let parent = population[i % 2];
    let y = getLaneY(newPop.length);
    let child = new Organism(startLineX, y, newPop.length, parent.dna, parent.globalId);
    child.mutate(0.4);
    newPop.push(child);
  }

  population = newPop;
  generateObstacles();
}

function injectCustomSwimmer() {
  let lane = POPULATION_SIZE - 1;
  let y = getLaneY(lane);

  let dna = {
    hue: customParams.hue,
    segmentCount: 10,
    segmentSize: 18,
    baseWidth: 28,
    boneStiffness: 1.0,
    muscleStiffness: customParams.muscleStiffness,
    musclePower: customParams.musclePower,
    waveSpeed: customParams.waveSpeed,
    waveFrequency: customParams.waveFrequency,
    swimForce: customParams.swimForce,
    turnSpeed: 0.8,
    waveType: customParams.waveType,
    waveType2: customParams.waveType2,
    switchRate: customParams.switchRate,
    brainWeights: null,
    colors: {
      boneFill: color(customParams.hue, 60, 20, 0.4).toString(),
      boneStroke: color(customParams.hue, 70, 70, 0.4).toString(),
      muscleContract: color(customParams.hue, 90, 90, 1).toString(),
      muscleRelax: color((customParams.hue + 180)%360, 80, 80, 0.5).toString(),
      skin: color(customParams.hue, 30, 90, 0.2).toString()
    }
  };

  let customAgent = new Organism(startLineX, y, lane, dna, null);
  customAgent.isElite = true;
  population[lane] = customAgent;

  let flashDiv = createDiv('');
  flashDiv.style('position', 'absolute');
  flashDiv.style('top', '0');
  flashDiv.style('left', '0');
  flashDiv.style('width', '100%');
  flashDiv.style('height', '100%');
  flashDiv.style('background', 'white');
  flashDiv.style('opacity', '0.3');
  flashDiv.style('pointer-events', 'none');
  setTimeout(() => flashDiv.remove(), 100);
}

function drawLineageView() {
  push();
  fill(ENV.colors.bg[0], ENV.colors.bg[1], 5, 0.9);
  rect(0, 0, width, height);
  stroke(ENV.colors.grid[0], ENV.colors.grid[1], ENV.colors.grid[2], 0.1);
  for(let i=0; i<width; i+=100) line(i, 0, i, height);

  translate(lineageCamX + 100, 0);

  let xStep = 120;
  let nodeSize = 16;
  const getNodePos = (gen, lane) => {
    let y = map(lane, 0, POPULATION_SIZE-1, height * 0.2, height * 0.8);
    return createVector((gen - 1) * xStep, y);
  };

  for (let node of lineageData) {
    if (node.parentId !== null) {
      let parentNode = lineageData.find(n => n.id === node.parentId);
      if (parentNode) {
        let start = getNodePos(parentNode.gen, parentNode.lane);
        let end = getNodePos(node.gen, node.lane);
        stroke(ENV.colors.lineageEdge[0], ENV.colors.lineageEdge[1], ENV.colors.lineageEdge[2], 0.4);
        if (node.isElite) stroke(ENV.colors.accent[0], 80, 80, 0.6);
        noFill();
        bezier(start.x, start.y, start.x + xStep*0.5, start.y, end.x - xStep*0.5, end.y, end.x, end.y);
      }
    }
  }

  lineageHoverNode = null;
  let mouseRelX = mouseX - (lineageCamX + 100);
  for (let node of lineageData) {
    let pos = getNodePos(node.gen, node.lane);
    if (pos.x + lineageCamX < -200 || pos.x + lineageCamX > width) continue;

    let d = dist(mouseRelX, mouseY, pos.x, pos.y);
    let isHover = d < nodeSize;
    if (isHover) lineageHoverNode = node;

    noStroke();
    if (node.isElite || isHover) {
      fill(node.dna.hue, 80, 100, 0.3);
      circle(pos.x, pos.y, nodeSize * 2);
    }
    fill(node.dna.hue, 70, 90);
    circle(pos.x, pos.y, nodeSize);
    if (node.lane === 0) {
      fill(ENV.colors.textDim);
      textAlign(CENTER, BOTTOM);
      textSize(10);
      text(`GEN ${node.gen}`, pos.x, height * 0.18);
    }
  }

  let currentGenX = (generation - 1) * xStep;
  stroke(ENV.colors.accent);
  drawingContext.setLineDash([5, 5]);
  line(currentGenX, height*0.15, currentGenX, height*0.85);
  drawingContext.setLineDash([]);
  pop();

  if (lineageHoverNode) drawNodeTooltip(lineageHoverNode);
}

function drawNodeTooltip(node) {
  let w = 200;
  let h = 100;
  let x = mouseX + 15;
  let y = mouseY + 15;
  if (x + w > width) x = mouseX - w - 15;
  if (y + h > height) y = mouseY - h - 15;

  push();
  translate(x, y);
  fill(ENV.colors.uiBg);
  stroke(node.dna.hue, 80, 80);
  rect(0, 0, w, h, 4);

  fill(ENV.colors.textBright);
  textSize(12);
  textStyle(BOLD);
  textAlign(LEFT, TOP);
  text(`ID: ${node.id} (GEN ${node.gen})`, 10, 10);

  textSize(10);
  textStyle(NORMAL);
  fill(ENV.colors.textDim);
  text(node.parentId ? `PARENT ID: ${node.parentId}` : "PROGENITOR", 10, 25);
  let distPct = (node.dist / (width*0.8)) * 100;
  text(`DISTANCE: ${node.dist.toFixed(0)} (${distPct.toFixed(0)}%)`, 10, 40);
  textAlign(CENTER);
  text(`WAVES: ${node.dna.waveType.toUpperCase().substring(0,3)} / ${node.dna.waveType2.toUpperCase().substring(0,3)}`, w/2, h - 15);
  pop();
}

function drawRaceTrack() {
  stroke(ENV.colors.grid[0], ENV.colors.grid[1], ENV.colors.grid[2], 0.3);
  strokeWeight(1);
  let gridSize = 50;
  for(let x = (frameCount * -1) % gridSize; x < width; x+=gridSize) {
    line(x, 0, x, height);
  }
  stroke(120, 60, 60, 0.3);
  strokeWeight(2);
  drawingContext.setLineDash([5, 15]);
  line(startLineX, 0, startLineX, height);
  drawingContext.setLineDash([]);
  noStroke();
  fill(raceTarget.x > width/2 ? 120 : 0, 80, 80, 0.05);
  circle(raceTarget.x, raceTarget.y, 400);
}

function drawObstacles() {
  for(let o of obstacles) {
    if (o.type === 'circle') {
      push();
      translate(o.pos.x, o.pos.y);
      noStroke();
      fill(ENV.colors.obstacle[0], ENV.colors.obstacle[1], ENV.colors.obstacle[2], 0.8);
      circle(0, 0, o.r * 2);
      noFill();
      stroke(ENV.colors.obstacleStroke[0], ENV.colors.obstacleStroke[1], ENV.colors.obstacleStroke[2], 0.6);
      strokeWeight(2);
      let pulse = sin(frameCount * 0.05 + o.pulseOffset) * 5;
      circle(0, 0, o.r * 2 + pulse);
      pop();
    } else if (o.type === 'rect') {
      push();
      fill(ENV.colors.wallFill[0], ENV.colors.wallFill[1], ENV.colors.wallFill[2], 0.8);
      stroke(ENV.colors.wallStroke[0], ENV.colors.wallStroke[1], ENV.colors.wallStroke[2], 0.8);
      strokeWeight(2);
      rect(o.x, o.y, o.w, o.h, 4);

      stroke(0, 0, 0, 0.2);
      strokeWeight(1);
      line(o.x + 5, o.y, o.x + 5, o.y + o.h);
      line(o.x + o.w - 5, o.y, o.x + o.w - 5, o.y + o.h);
      pop();
    }
  }
}

function drawSelectionHalo(agent) {
  let head = agent.points[0].pos;
  push();
  translate(head.x, head.y);
  noFill();
  stroke(ENV.colors.accent);
  strokeWeight(1);
  rotate(frameCount * 0.05);
  let r = 50;
  arc(0, 0, r, r, 0, PI/2);
  arc(0, 0, r, r, PI, PI + PI/2);
  pop();
}

// --- PHYSICS CLASSES ---

class Point {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.oldPos = createVector(x, y);
    this.pinned = false;
  }
  update() {
    if (this.pinned) return;
    let vel = p5.Vector.sub(this.pos, this.oldPos);
    vel.mult(ENV.drag);
    this.oldPos.set(this.pos);
    this.pos.add(vel);

    if (this.pos.y < 0) { this.pos.y = 0; this.oldPos.y = 0; }
    if (this.pos.y > height) { this.pos.y = height; this.oldPos.y = height; }
    if (this.pos.x < 0) { this.pos.x = 0; this.oldPos.x = 0; }
    if (this.pos.x > width) { this.pos.x = width; this.oldPos.x = width; }
  }
  applyForce(f) { this.pos.add(f); }
}

class Link {
  constructor(p1, p2, type, stiffness, power = 0) {
    this.p1 = p1;
    this.p2 = p2;
    this.restLen = p5.Vector.dist(p1.pos, p2.pos);
    this.type = type;
    this.stiffness = stiffness;
    this.power = power;
    this.activation = 0;
  }
  resolve() {
    let delta = p5.Vector.sub(this.p1.pos, this.p2.pos);
    let currentLen = delta.mag();
    if (currentLen === 0) return;
    let targetLen = this.restLen;
    if (this.type === 'muscle') {
      targetLen = this.restLen * (1 + this.activation * this.power);
    }
    let diff = (currentLen - targetLen) / currentLen;
    let k = this.stiffness;
    let correction = delta.mult(diff * 0.5 * k);
    if (!this.p1.pinned) this.p1.pos.sub(correction);
    if (!this.p2.pinned) this.p2.pos.add(correction);
  }
}

class Vertebra {
  constructor(tl, tr, br, bl, colorSet) {
    this.pts = [tl, tr, br, bl];
    this.colors = colorSet;
  }
  draw() {
    let [tl, tr, br, bl] = this.pts;
    noStroke();
    fill(this.colors.boneFill);
    beginShape();
    vertex(tl.pos.x, tl.pos.y);
    vertex(tr.pos.x, tr.pos.y);
    vertex(br.pos.x, br.pos.y);
    vertex(bl.pos.x, bl.pos.y);
    endShape(CLOSE);
    stroke(this.colors.boneStroke);
    strokeWeight(1);
    line(tl.pos.x, tl.pos.y, bl.pos.x, bl.pos.y);
    line(tr.pos.x, tr.pos.y, br.pos.x, br.pos.y);
  }
}

class Organism {
  constructor(x, y, laneIndex, parentDNA = null, parentId = null) {
    this.globalId = ++globalIdCounter;
    this.parentId = parentId;
    this.laneIndex = laneIndex;

    this.points = [];
    this.links = [];
    this.muscles = [];
    this.vertebrae = [];
    this.headingAngle = 0;
    this.isElite = false;
    this.velHistory = new Array(50).fill(0);
    this.sensors = [];

    if (parentDNA) {
      this.dna = JSON.parse(JSON.stringify(parentDNA));
    } else {
      this.dna = this.generateDNA();
    }

    // Initialize Brain
    // Inputs: 5 (Angle, Dist, Sensors L, C, R)
    // Hidden: 24 (Expanded)
    // Output: 1 (Steering)
    this.brain = new NeuralNetwork(5, 24, 1, this.dna.brainWeights);

    this.build(x, y);
  }

  generateDNA() {
    const waveTypes = ['sine', 'square', 'triangle', 'pulse'];
    const type1 = random(waveTypes);
    const type2 = random(waveTypes);
    const hue = random(0, 360);
    return {
      hue: hue,
      segmentCount: 10,
      segmentSize: 18,
      baseWidth: random(20, 35),
      boneStiffness: 1.0,
      muscleStiffness: random(0.05, 0.25),
      musclePower: random(0.2, 0.5),
      waveSpeed: random(0.15, 0.35),
      waveFrequency: random(0.3, 0.7),
      swimForce: random(1.5, 2.5),
      turnSpeed: random(0.5, 1.0),
      waveType: type1,
      waveType2: type2,
      switchRate: random(0.01, 0.05),
      brainWeights: null,
      colors: {
        boneFill: color(hue, 60, 20, 0.4).toString(),
        boneStroke: color(hue, 70, 70, 0.4).toString(),
        muscleContract: color(hue, 90, 90, 1).toString(),
        muscleRelax: color((hue + 180)%360, 80, 80, 0.5).toString(),
        skin: color(hue, 30, 90, 0.2).toString()
      }
    };
  }

  mutate(rate) {
    const m = (val, mag) => val * (1 + random(-mag, mag));
    this.dna.waveSpeed = m(this.dna.waveSpeed, rate);
    this.dna.waveFrequency = m(this.dna.waveFrequency, rate);
    this.dna.swimForce = m(this.dna.swimForce, rate);
    this.dna.muscleStiffness = constrain(m(this.dna.muscleStiffness, rate), 0.01, 0.8);
    this.dna.musclePower = constrain(m(this.dna.musclePower, rate), 0.1, 0.8);
    this.dna.switchRate = constrain(m(this.dna.switchRate, rate), 0.005, 0.1);

    if (random() < rate * 0.5) {
       const waveTypes = ['sine', 'square', 'triangle', 'pulse'];
       if(random() < 0.5) this.dna.waveType = random(waveTypes);
       else this.dna.waveType2 = random(waveTypes);
    }

    // Mutate Brain
    this.brain.mutate(rate);
    this.dna.brainWeights = this.brain.getGenome();

    for (let mObj of this.muscles) {
      mObj.m1.stiffness = this.dna.muscleStiffness;
      mObj.m1.power = this.dna.musclePower;
      mObj.m2.stiffness = this.dna.muscleStiffness;
      mObj.m2.power = this.dna.musclePower;
    }
  }

  build(startX, startY) {
    let prevTop, prevBot;
    let segCount = this.dna.segmentCount;
    let segSize = this.dna.segmentSize;
    let c = this.dna.colors;
    let colorSet = {
      boneFill: color(c.boneFill),
      boneStroke: color(c.boneStroke),
      muscleContract: color(c.muscleContract),
      muscleRelax: color(c.muscleRelax),
      skin: color(c.skin)
    };

    for (let i = 0; i < segCount; i++) {
      let t = i / (segCount - 1);
      let w = this.dna.baseWidth * (sin(t * PI) * 0.7 + 0.3);
      let px = startX - i * segSize;
      let pt = new Point(px, startY - w/2);
      let pb = new Point(px, startY + w/2);
      this.points.push(pt, pb);
      this.links.push(new Link(pt, pb, 'bone', this.dna.boneStiffness));

      if (i > 0) {
        this.links.push(new Link(prevTop, pt, 'bone', this.dna.boneStiffness));
        this.links.push(new Link(prevBot, pb, 'bone', this.dna.boneStiffness));
        let m1 = new Link(prevTop, pb, 'muscle', this.dna.muscleStiffness, this.dna.musclePower);
        let m2 = new Link(prevBot, pt, 'muscle', this.dna.muscleStiffness, this.dna.musclePower);
        this.links.push(m1, m2);
        this.muscles.push({ m1, m2, id: i });
        this.vertebrae.push(new Vertebra(prevTop, pt, pb, prevBot, colorSet));
      }
      prevTop = pt; prevBot = pb;
    }

    let headTop = this.points[0];
    let headBot = this.points[1];
    this.nose = new Point(startX + 20, startY);
    this.points.push(this.nose);
    this.links.push(new Link(headTop, this.nose, 'bone', this.dna.boneStiffness));
    this.links.push(new Link(headBot, this.nose, 'bone', this.dna.boneStiffness));
    this.links.push(new Link(headTop, headBot, 'bone', this.dna.boneStiffness));
  }

  getWaveSignal(phase, type) {
    let val = 0;
    let p = phase % TWO_PI;
    if (p < 0) p += TWO_PI;
    switch(type) {
      case 'square': val = sin(phase) >= 0 ? 1 : -1; val *= 0.8; break;
      case 'triangle': val = asin(sin(phase)) / (PI/2); break;
      case 'pulse': val = sin(phase) > 0.5 ? 1 : (sin(phase) < -0.5 ? -0.5 : 0); break;
      case 'sine': default: val = sin(phase); break;
    }
    return val;
  }

  castRay(angleOffset) {
    let head = this.nose.pos;
    let dir = p5.Vector.sub(this.nose.pos, this.points[0].pos).normalize();
    dir.rotate(angleOffset);
    let end = p5.Vector.add(head, p5.Vector.mult(dir, ENV.sensorRange));

    let minDist = ENV.sensorRange;

    for (let o of obstacles) {
      if (o.type === 'circle') {
        let f = p5.Vector.sub(head, o.pos);
        let a = dir.dot(dir);
        let b = 2 * f.dot(dir);
        let c = f.dot(f) - o.r * o.r;
        let discriminant = b*b - 4*a*c;
        if (discriminant >= 0) {
          discriminant = sqrt(discriminant);
          let t1 = (-b - discriminant) / (2*a);
          if (t1 >= 0 && t1 <= ENV.sensorRange) minDist = min(minDist, t1);
        }
      } else if (o.type === 'rect') {
        let lines = [
          {p1: createVector(o.x, o.y), p2: createVector(o.x+o.w, o.y)},
          {p1: createVector(o.x+o.w, o.y), p2: createVector(o.x+o.w, o.y+o.h)},
          {p1: createVector(o.x+o.w, o.y+o.h), p2: createVector(o.x, o.y+o.h)},
          {p1: createVector(o.x, o.y+o.h), p2: createVector(o.x, o.y)}
        ];

        for(let l of lines) {
          let den = (l.p2.y - l.p1.y) * (end.x - head.x) - (l.p2.x - l.p1.x) * (end.y - head.y);
          if (den == 0) continue;
          let ua = ((l.p2.x - l.p1.x) * (head.y - l.p1.y) - (l.p2.y - l.p1.y) * (head.x - l.p1.x)) / den;
          let ub = ((end.x - head.x) * (head.y - l.p1.y) - (end.y - head.y) * (head.x - l.p1.x)) / den;
          if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
            let hitDist = p5.Vector.dist(head, createVector(head.x + ua * (end.x - head.x), head.y + ua * (end.y - head.y)));
            minDist = min(minDist, hitDist);
          }
        }
      }
    }

    if (end.y < 0 || end.y > height) {
        let dy = end.y < 0 ? -head.y : height - head.y;
        let dx = dy / dir.y * dir.x;
        let d = sqrt(dx*dx + dy*dy);
        if (d < ENV.sensorRange) minDist = min(minDist, d);
    }

    return minDist;
  }

  thinkAndAct() {
    let headBase = p5.Vector.lerp(this.points[0].pos, this.points[1].pos, 0.5);
    let forward = p5.Vector.sub(this.nose.pos, headBase);
    let currentAngle = forward.heading();

    // 1. Calculate Target Angle
    let targetVec = p5.Vector.sub(raceTarget, headBase);
    let targetAngle = targetVec.heading();
    let angleDiff = targetAngle - currentAngle;
    if (angleDiff > PI) angleDiff -= TWO_PI;
    if (angleDiff < -PI) angleDiff += TWO_PI;
    let normAngle = constrain(angleDiff / PI, -1, 1);

    // 2. Calculate Distance
    let distToTarget = targetVec.mag();
    let normDist = constrain(map(distToTarget, 0, width, 1, 0), 0, 1);

    // 3. Sensory Input
    let rayL = this.castRay(-PI/6);
    let rayC = this.castRay(0);
    let rayR = this.castRay(PI/6);

    let sL = 1 - (rayL / ENV.sensorRange);
    let sC = 1 - (rayC / ENV.sensorRange);
    let sR = 1 - (rayR / ENV.sensorRange);

    this.sensors = [sL, sC, sR];

    // 4. Brain Inference
    let inputs = [normAngle, normDist, sL, sC, sR];
    let outputs = this.brain.predict(inputs);
    let steering = outputs[0];

    // 5. Online Learning (Backpropagation)
    // Heuristic: If blocked, steer away from blockage. If clear, steer to target.
    let desiredSteer = normAngle;

    // Simple obstacle avoidance heuristic for training signal
    if (sC > 0.5 || sL > 0.5 || sR > 0.5) {
        if (sL > sR) desiredSteer = 1.0; // Turn right
        else desiredSteer = -1.0; // Turn left
    }

    // Train the network to match this desired behavior
    this.brain.train(inputs, [desiredSteer]);

    // 6. Apply Steering
    this.headingAngle = lerp(this.headingAngle, steering * PI, 0.1);

    // Swim Mechanics
    let time = frameCount * this.dna.waveSpeed;
    let mix = 0.5 + 0.5 * sin(frameCount * this.dna.switchRate);

    for (let pair of this.muscles) {
      let phase = time - pair.id * this.dna.waveFrequency;

      let s1 = this.getWaveSignal(phase, this.dna.waveType);
      let s2 = this.getWaveSignal(phase, this.dna.waveType2);
      let signal = lerp(s1, s2, mix);

      let turnBias = this.headingAngle * 0.8;
      pair.m1.activation = signal + turnBias;
      pair.m2.activation = -signal + turnBias;
    }

    let thrustDir = forward.copy().normalize();
    this.nose.applyForce(thrustDir.mult(this.dna.swimForce));
  }

  checkCollisions() {
    let bodyRadius = 8;
    for (let p of this.points) {
      for (let o of obstacles) {
        if (o.type === 'circle') {
          let d = p5.Vector.dist(p.pos, o.pos);
          if (d < o.r + bodyRadius/2) {
            let n = p5.Vector.sub(p.pos, o.pos).normalize();
            p.pos = p5.Vector.add(o.pos, n.mult(o.r + bodyRadius/2));
            p.oldPos.lerp(p.pos, 0.1);
          }
        } else if (o.type === 'rect') {
          let closestX = constrain(p.pos.x, o.x, o.x + o.w);
          let closestY = constrain(p.pos.y, o.y, o.y + o.h);
          let d = dist(p.pos.x, p.pos.y, closestX, closestY);

          if (d < bodyRadius) {
             let overlap = bodyRadius - d;
             let n;
             if (d === 0) {
                let dx1 = p.pos.x - o.x;
                let dx2 = (o.x + o.w) - p.pos.x;
                let dy1 = p.pos.y - o.y;
                let dy2 = (o.y + o.h) - p.pos.y;
                let minD = min(dx1, dx2, dy1, dy2);
                if (minD === dx1) n = createVector(-1, 0);
                else if (minD === dx2) n = createVector(1, 0);
                else if (minD === dy1) n = createVector(0, -1);
                else n = createVector(0, 1);
                overlap = minD + bodyRadius;
             } else {
                n = p5.Vector.sub(p.pos, createVector(closestX, closestY)).normalize();
             }
             p.pos.add(n.mult(overlap));
             p.oldPos.lerp(p.pos, 0.2);
          }
        }
      }
    }
  }

  update() {
    for (let p of this.points) p.update();
    let v = p5.Vector.sub(this.points[0].pos, this.points[0].oldPos).mag();
    this.velHistory.push(v);
    if(this.velHistory.length > 50) this.velHistory.shift();
    this.checkCollisions();
    for (let i = 0; i < ENV.solverIterations; i++) {
      for (let l of this.links) l.resolve();
    }
  }

  draw() {
    strokeWeight(1.5);
    let cContract = color(this.dna.colors.muscleContract);
    let cRelax = color(this.dna.colors.muscleRelax);
    for (let pair of this.muscles) {
      let intensity = constrain(pair.m1.activation, -1, 1);
      let c = intensity > 0
        ? lerpColor(color(0, 0, 30, 0.3), cContract, intensity)
        : lerpColor(color(0, 0, 30, 0.3), cRelax, abs(intensity));
      stroke(c);
      line(pair.m1.p1.pos.x, pair.m1.p1.pos.y, pair.m1.p2.pos.x, pair.m1.p2.pos.y);
      intensity = constrain(pair.m2.activation, -1, 1);
      c = intensity > 0
        ? lerpColor(color(0, 0, 30, 0.3), cContract, intensity)
        : lerpColor(color(0, 0, 30, 0.3), cRelax, abs(intensity));
      stroke(c);
      line(pair.m2.p1.pos.x, pair.m2.p1.pos.y, pair.m2.p2.pos.x, pair.m2.p2.pos.y);
    }
    for (let v of this.vertebrae) v.draw();
    this.drawHead();
    this.drawSkin();

    if (this.sensors.length > 0) {
      let head = this.nose.pos;
      let forward = p5.Vector.sub(this.nose.pos, this.points[0].pos).normalize();

      let angles = [-PI/6, 0, PI/6];
      for(let i=0; i<3; i++) {
        let val = this.sensors[i];
        let dir = forward.copy().rotate(angles[i]);
        let len = ENV.sensorRange * (1 - val);

        let c = lerpColor(color(ENV.colors.sensorSafe), color(ENV.colors.sensorDanger), val);
        c.setAlpha(0.3 + val * 0.7);
        stroke(c);
        strokeWeight(1 + val * 2);
        line(head.x, head.y, head.x + dir.x * len, head.y + dir.y * len);

        if (val > 0.1) {
            noStroke();
            fill(c);
            circle(head.x + dir.x * len, head.y + dir.y * len, 4);
        }
      }
    }
  }

  drawHead() {
    let ht = this.points[0];
    let hb = this.points[1];
    let n = this.nose;
    fill(this.dna.colors.boneFill);
    stroke(this.dna.colors.boneStroke);
    strokeWeight(1);
    triangle(ht.pos.x, ht.pos.y, hb.pos.x, hb.pos.y, n.pos.x, n.pos.y);
    let eyePos = p5.Vector.lerp(ht.pos, hb.pos, 0.5).lerp(n.pos, 0.4);
    if (this.isElite) {
      fill(50, 100, 100);
      drawingContext.shadowBlur = 20;
      drawingContext.shadowColor = 'yellow';
    } else {
      fill(0, 0, 100);
      drawingContext.shadowBlur = 10;
      drawingContext.shadowColor = 'white';
    }
    noStroke();
    circle(eyePos.x, eyePos.y, 4);
    drawingContext.shadowBlur = 0;
  }

  drawSkin() {
    noFill();
    stroke(this.dna.colors.skin);
    strokeWeight(1);
    beginShape();
    curveVertex(this.nose.pos.x, this.nose.pos.y);
    curveVertex(this.nose.pos.x, this.nose.pos.y);
    for (let i = 0; i < this.points.length - 1; i += 2) {
      if (i < 2) continue;
      curveVertex(this.points[i].pos.x, this.points[i].pos.y);
    }
    let lastT = this.points[this.points.length - 3];
    let lastB = this.points[this.points.length - 2];
    let tailX = (lastT.pos.x + lastB.pos.x) / 2;
    let tailY = (lastT.pos.y + lastB.pos.y) / 2;
    curveVertex(tailX, tailY);
    for (let i = this.points.length - 2; i > 1; i -= 2) {
       curveVertex(this.points[i].pos.x, this.points[i].pos.y);
    }
    curveVertex(this.nose.pos.x, this.nose.pos.y);
    curveVertex(this.nose.pos.x, this.nose.pos.y);
    endShape();
  }
}
