/**
 * P5.js Lawn Mower Simulation 11.0 - Persistent Hall of Fame
 *
 * New Features:
 * - LocalStorage integration to save the top 10 best runs ever.
 * - "HALL OF FAME" UI to view and replay historical best strategies.
 * - Tracks finish time/efficiency for records.
 * - Applies stored DNA patterns to current geometry.
 */

let mode = 'SIMULATION'; // EDITOR, SIMULATION, DETAIL, BACKGROUND_EVO, REPLAY, HALL_OF_FAME
let strategies = [
  'LINEAR_STRIPER',
  'DIAGONAL_STRIPER',
  'SPIRAL_FILL',
  'RANDOM_BOUNCE',
  'GREEDY_SLAM',
  'POTENTIAL_FLOW',
  'HYBRID_NAVIGATOR'
];

// Simulation Vars
let lawnVertices = [];
let population = [];
let popSize = 12;
let cols = 4;
let rows = 3;
let generation = 1;
let maxFrames = 3500;
let currentFrame = 0;
let masterGrid = [];
let lawnMap = [];
let gridRes = 50;
let lawnBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0, w: 0, h: 0 };
let bestGlobalScore = 0;
let selectedMowerIndex = -1;

// Fast Evo Vars
let evoTargetGens = 100;
let evoCurrentGenCount = 0;
let bestGlobalDNA = null;
let bestGlobalScoreEver = 0;

// Persistence
const STORAGE_KEY = 'p5_lawnmower_hof_v1';
let hallOfFame = [];
let replayDNA = null; // Specific DNA loaded from History

// UI
let btnStart, btnReset, btnBack, btnClear, btnFastEvo, btnReplay, btnHistory, btnClearHistory;

// Strategy Colors
const STRAT_COLORS = {
  'LINEAR_STRIPER': [0, 190, 255],
  'DIAGONAL_STRIPER': [0, 100, 200],
  'SPIRAL_FILL': [0, 255, 200],
  'RANDOM_BOUNCE': [255, 105, 180],
  'GREEDY_SLAM': [180, 80, 255],
  'POTENTIAL_FLOW': [100, 100, 255],
  'HYBRID_NAVIGATOR': [255, 200, 0]
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  textSize(16);

  loadHallOfFame();

  // Initialize UI
  btnStart = createButton('START SIMULATION');
  btnStart.position(20, 20);
  btnStart.mousePressed(startSimulation);
  btnStart.hide();

  btnFastEvo = createButton('FAST EVOLVE (100 GEN)');
  btnFastEvo.position(180, 20);
  btnFastEvo.mousePressed(startFastEvolution);
  btnFastEvo.hide();

  btnHistory = createButton('HALL OF FAME');
  btnHistory.position(380, 20);
  btnHistory.mousePressed(openHallOfFame);
  btnHistory.hide();

  btnReset = createButton('EDIT SHAPE');
  btnReset.position(20, 60);
  btnReset.mousePressed(resetEditor);

  btnClear = createButton('CLEAR CANVAS');
  btnClear.position(20, 100);
  btnClear.mousePressed(() => {
    lawnVertices = [];
    btnStart.hide();
    btnFastEvo.hide();
    btnHistory.hide();
  });
  btnClear.hide();

  btnBack = createButton('BACK');
  btnBack.position(20, 20);
  btnBack.mousePressed(() => {
    if(mode === 'REPLAY') mode = 'HALL_OF_FAME'; // Go back to list if replaying from history
    else mode = 'SIMULATION';
  });
  btnBack.hide();

  btnReplay = createButton('REPLAY SESSION BEST');
  btnReplay.position(width/2 - 70, height/2 + 60);
  btnReplay.mousePressed(() => startReplay(bestGlobalDNA));
  btnReplay.hide();

  btnClearHistory = createButton('WIPE HISTORY');
  btnClearHistory.position(width - 140, 20);
  btnClearHistory.mousePressed(() => {
    if(confirm("Delete all saved run records?")) {
      hallOfFame = [];
      localStorage.removeItem(STORAGE_KEY);
    }
  });
  btnClearHistory.hide();

  // Initialize with a default complex shape
  createDefaultShape();
  finishShape();
  startSimulation();
}

function draw() {
  background(30);

  if (mode === 'EDITOR') {
    drawEditor();
  } else if (mode === 'SIMULATION') {
    runSimulationStep();
    drawSimulationUI();
  } else if (mode === 'DETAIL') {
    runSimulationStep();
    drawDetailView();
  } else if (mode === 'BACKGROUND_EVO') {
    runFastGeneration();
    drawBackgroundEvoUI();
  } else if (mode === 'REPLAY') {
    runSimulationStep();
    drawReplayView();
  } else if (mode === 'HALL_OF_FAME') {
    drawHallOfFame();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// ------------------------------------------------------------------
// PERSISTENCE
// ------------------------------------------------------------------

function loadHallOfFame() {
  try {
    let data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      hallOfFame = JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to load history", e);
    hallOfFame = [];
  }
}

function checkAndSaveToHOF(mower) {
  let score = mower.mowedCount / masterGrid.length;
  // We only care about runs that are reasonably good (>80%)
  if (score < 0.8) return;

  // Check if better than the worst in HOF, or if HOF has space
  if (hallOfFame.length < 10 || score > hallOfFame[hallOfFame.length-1].score) {

    // De-duplicate: Don't save if we have this exact score/strat combo already to avoid spam
    let duplicate = hallOfFame.find(entry =>
      entry.strategy === mower.strategy &&
      Math.abs(entry.score - score) < 0.0001 &&
      Math.abs(entry.genes[0] - mower.dna.genes[0]) < 0.001
    );
    if (duplicate) return;

    let entry = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      strategy: mower.strategy,
      score: score,
      genes: [...mower.dna.genes],
      finishTime: mower.finishFrame || maxFrames,
      date: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };

    hallOfFame.push(entry);
    // Sort: Higher score first. If tie, lower finishTime is better.
    hallOfFame.sort((a, b) => {
      if (Math.abs(b.score - a.score) > 0.0001) return b.score - a.score;
      return a.finishTime - b.finishTime;
    });

    if (hallOfFame.length > 10) hallOfFame.pop();

    localStorage.setItem(STORAGE_KEY, JSON.stringify(hallOfFame));
  }
}

// ------------------------------------------------------------------
// UI & MODES
// ------------------------------------------------------------------

function drawEditor() {
  btnBack.hide();
  btnReset.hide();
  btnFastEvo.hide();
  btnReplay.hide();
  btnHistory.hide();
  btnClearHistory.hide();
  btnClear.show();

  fill(200);
  noStroke();
  textAlign(CENTER, TOP);
  textSize(24);
  text("LAWN GEOMETRY EDITOR", width/2, 30);
  textSize(16);
  text("Click to place points. Close the loop to finish.", width/2, 60);

  stroke(255, 10);
  strokeWeight(1);
  for(let i=0; i<width; i+=40) line(i, 0, i, height);
  for(let i=0; i<height; i+=40) line(0, i, width, i);

  if (lawnVertices.length > 0) {
    stroke(100, 255, 100);
    strokeWeight(3);
    fill(50, 150, 50, 100);
    beginShape();
    for (let v of lawnVertices) vertex(v.x, v.y);
    endShape();

    for (let i=0; i<lawnVertices.length; i++) {
      let v = lawnVertices[i];
      fill(i===0 ? [255, 200, 0] : 255);
      noStroke();
      ellipse(v.x, v.y, 10, 10);
    }

    if (!btnStart.elt.style.display || btnStart.elt.style.display === 'none') {
      stroke(255, 255, 100, 150);
      strokeWeight(2);
      let last = lawnVertices[lawnVertices.length-1];
      line(last.x, last.y, mouseX, mouseY);
    }
  }
}

function mousePressed() {
  if (mode === 'EDITOR') {
    if (mouseX < 200 && mouseY < 150) return;

    if (lawnVertices.length > 2) {
      let d = dist(mouseX, mouseY, lawnVertices[0].x, lawnVertices[0].y);
      if (d < 20) {
        finishShape();
        return;
      }
    }
    lawnVertices.push(createVector(mouseX, mouseY));
  }
  else if (mode === 'SIMULATION') {
    if (mouseY < 100 && mouseX < 500) return;

    let cellW = windowWidth / cols;
    let cellH = windowHeight / rows;
    let col = floor(mouseX / cellW);
    let row = floor(mouseY / cellH);
    let idx = row * cols + col;
    if (idx >= 0 && idx < population.length) {
      selectedMowerIndex = idx;
      mode = 'DETAIL';
    }
  }
  else if (mode === 'HALL_OF_FAME') {
    // Check clicks on Replay buttons in the list
    let startY = 120;
    let rowH = 40;
    for(let i=0; i<hallOfFame.length; i++) {
      let y = startY + i * rowH;
      // Replay Button area approx
      if (mouseY > y && mouseY < y + 30 && mouseX > width - 150 && mouseX < width - 50) {
        let entry = hallOfFame[i];
        let dna = new DNA(entry.genes, entry.strategy);
        startReplay(dna);
      }
    }
  }
}

function createDefaultShape() {
  let cx = width / 2;
  let cy = height / 2;
  let size = min(width, height) * 0.55;
  lawnVertices = [
    createVector(cx - size/2, cy - size/2),
    createVector(cx + size/2, cy - size/2),
    createVector(cx + size/2, cy + size/2),
    createVector(cx + size/6, cy + size/2),
    createVector(cx + size/6, cy),
    createVector(cx - size/6, cy),
    createVector(cx - size/6, cy + size/2),
    createVector(cx - size/2, cy + size/2)
  ];
}

function finishShape() {
  if (lawnVertices.length < 3) return;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let v of lawnVertices) {
    if (v.x < minX) minX = v.x;
    if (v.x > maxX) maxX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.y > maxY) maxY = v.y;
  }
  lawnBounds = { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };

  masterGrid = [];
  lawnMap = new Array(gridRes).fill(0).map(() => new Array(gridRes).fill(false));

  let validPoints = 0;
  for (let c = 0; c < gridRes; c++) {
    for (let r = 0; r < gridRes; r++) {
      let wx = map(c + 0.5, 0, gridRes, minX, maxX);
      let wy = map(r + 0.5, 0, gridRes, minY, maxY);
      if (pointInPoly(wx, wy, lawnVertices)) {
        masterGrid.push({ c, r });
        lawnMap[c][r] = true;
        validPoints++;
      }
    }
  }

  if (validPoints < 10) {
    alert("Shape too small! Draw bigger.");
    lawnVertices = [];
    return;
  }

  btnStart.show();
  btnFastEvo.show();
  btnHistory.show();
  btnClear.hide();
}

function resetEditor() {
  mode = 'EDITOR';
  lawnVertices = [];
  population = [];
  generation = 1;
  bestGlobalScore = 0;
  bestGlobalScoreEver = 0;
  btnStart.hide();
  btnFastEvo.hide();
  btnHistory.hide();
  btnReset.hide();
  btnBack.hide();
  btnReplay.hide();
  btnClearHistory.hide();
  btnClear.show();
}

function startSimulation() {
  mode = 'SIMULATION';
  btnStart.hide();
  btnFastEvo.hide();
  btnHistory.hide();
  btnClear.hide();
  btnReplay.hide();
  btnClearHistory.hide();
  initPopulation();
}

function startFastEvolution() {
  mode = 'BACKGROUND_EVO';
  btnStart.hide();
  btnFastEvo.hide();
  btnHistory.hide();
  btnClear.hide();
  btnReset.hide();
  btnReplay.hide();
  btnClearHistory.hide();

  generation = 1;
  evoCurrentGenCount = 0;
  bestGlobalScoreEver = 0;
  bestGlobalDNA = null;
  initPopulation();
}

function openHallOfFame() {
  mode = 'HALL_OF_FAME';
  btnStart.show();
  btnFastEvo.show();
  btnHistory.hide();
  btnReset.show();
  btnClear.hide();
  btnBack.hide();
  btnReplay.hide();
  btnClearHistory.show();
}

function startReplay(dnaObj) {
  if (!dnaObj) return;
  mode = 'REPLAY';
  btnReplay.hide();
  btnBack.show();
  btnHistory.hide();
  btnClearHistory.hide();

  population = [new Mower(dnaObj)];
  currentFrame = 0;
}

// ------------------------------------------------------------------
// SIMULATION LOOP
// ------------------------------------------------------------------

function initPopulation() {
  population = [];
  for (let i = 0; i < popSize; i++) {
    let strat = strategies[i % strategies.length];
    population.push(new Mower(new DNA([], strat)));
  }
  currentFrame = 0;
}

function runSimulationStep() {
  let allFinished = true;
  for (let mower of population) {
    if (!mower.finished) {
      mower.update(currentFrame);
      allFinished = false;
    }
  }

  currentFrame++;
  if (mode === 'REPLAY') {
    return;
  }

  if (currentFrame >= maxFrames || allFinished) {
    nextGeneration();
  }
}

// ------------------------------------------------------------------
// FAST EVOLUTION LOGIC
// ------------------------------------------------------------------

function runFastGeneration() {
  let simFrame = 0;
  let genFinished = false;

  while (simFrame < maxFrames && !genFinished) {
    let allFinished = true;
    for (let mower of population) {
      if (!mower.finished) {
        mower.update(simFrame);
        allFinished = false;
      }
    }
    if (allFinished) genFinished = true;
    simFrame++;
  }

  evaluateAndStoreBest();
  nextGeneration();

  evoCurrentGenCount++;

  if (evoCurrentGenCount >= evoTargetGens) {
    finishFastEvolution();
  }
}

function evaluateAndStoreBest() {
  let maxPossible = masterGrid.length;
  for (let m of population) m.calcFitness(maxPossible);

  population.sort((a, b) => b.fitness - a.fitness);
  let bestOfBatch = population[0];
  let coverage = bestOfBatch.mowedCount / maxPossible;

  // Track Session Best
  if (coverage > bestGlobalScoreEver) {
    bestGlobalScoreEver = coverage;
    bestGlobalDNA = new DNA([...bestOfBatch.dna.genes], bestOfBatch.dna.strategy);
  }

  // Check Persistence
  checkAndSaveToHOF(bestOfBatch);
}

function finishFastEvolution() {
  // Just stay in background evo mode but stop updating
  // The Draw loop handles the "Complete" screen
}

function drawBackgroundEvoUI() {
  fill(20);
  rect(0, 0, width, height);
  textAlign(CENTER, CENTER);

  if (evoCurrentGenCount < evoTargetGens) {
    fill(255);
    textSize(32);
    text("TRAINING NEURAL MOWERS...", width/2, height/2 - 50);
    textSize(18);
    text(`Generation: ${generation} / ${evoTargetGens + 1}`, width/2, height/2);

    let barW = 400;
    let barH = 20;
    let pct = evoCurrentGenCount / evoTargetGens;
    noStroke();
    fill(50);
    rect(width/2 - barW/2, height/2 + 20, barW, barH, 10);
    fill(0, 255, 100);
    rect(width/2 - barW/2, height/2 + 20, barW * pct, barH, 10);

    fill(150);
    text(`Best Coverage Found: ${(bestGlobalScoreEver*100).toFixed(2)}%`, width/2, height/2 + 70);
  } else {
    fill(255);
    textSize(40);
    text("EVOLUTION COMPLETE", width/2, height/2 - 60);
    fill(0, 255, 100);
    textSize(24);
    text(`Peak Efficiency: ${(bestGlobalScoreEver*100).toFixed(2)}%`, width/2, height/2);

    let stratName = bestGlobalDNA ? bestGlobalDNA.strategy : "N/A";
    fill(200);
    textSize(16);
    text(`Winning Strategy: ${stratName}`, width/2, height/2 + 30);

    btnReplay.show();
    btnReset.show();
    btnHistory.show();
  }
}

// ------------------------------------------------------------------
// DRAWING VIEWS
// ------------------------------------------------------------------

function drawHallOfFame() {
  btnBack.hide();
  btnStart.show();
  btnHistory.hide();
  btnClearHistory.show();

  fill(20);
  noStroke();
  rect(0, 0, width, height);

  textAlign(CENTER, TOP);
  fill(255, 215, 0); // Gold
  textSize(32);
  text("HALL OF FAME", width/2, 40);

  textSize(14);
  fill(150);
  text("Top 10 Most Successful Runs (Local Storage)", width/2, 80);

  let startY = 120;
  let rowH = 40;
  let w = 800;
  let x = (width - w) / 2;

  // Header
  fill(50);
  rect(x, startY - 30, w, 30);
  fill(200);
  textAlign(LEFT, CENTER);
  text("#", x + 20, startY - 15);
  text("STRATEGY", x + 60, startY - 15);
  text("SCORE", x + 300, startY - 15);
  text("FRAMES", x + 400, startY - 15);
  text("DATE", x + 500, startY - 15);
  text("ACTION", x + 700, startY - 15);

  if (hallOfFame.length === 0) {
    textAlign(CENTER, CENTER);
    fill(100);
    text("No records found yet. Run simulations to generate data!", width/2, height/2);
    return;
  }

  for (let i = 0; i < hallOfFame.length; i++) {
    let entry = hallOfFame[i];
    let y = startY + i * rowH;

    fill(i % 2 === 0 ? 30 : 35);
    noStroke();
    rect(x, y, w, rowH - 2);

    // Rank
    fill(entry.score > 0.99 ? '#ffd700' : 255);
    textAlign(LEFT, CENTER);
    text((i + 1) + ".", x + 20, y + rowH/2);

    // Strategy (Color coded)
    fill(STRAT_COLORS[entry.strategy] || 255);
    text(entry.strategy, x + 60, y + rowH/2);

    // Score
    fill(entry.score > 0.99 ? '#4f4' : 200);
    text((entry.score * 100).toFixed(2) + "%", x + 300, y + rowH/2);

    // Frames
    fill(180);
    text(entry.finishTime, x + 400, y + rowH/2);

    // Date
    fill(120);
    textSize(12);
    text(entry.date, x + 500, y + rowH/2);
    textSize(14);

    // Replay Button (Visual only, logic in mousePressed)
    fill(50, 100, 200);
    rect(width - x - 150, y + 5, 80, 25, 5);
    fill(255);
    textAlign(CENTER, CENTER);
    text("REPLAY", width - x - 110, y + 17);
  }
}

function drawSimulationUI() {
  btnBack.hide();
  btnStart.hide();
  btnFastEvo.hide();
  btnClear.hide();
  btnReset.show();
  btnReplay.hide();
  btnHistory.hide();
  btnClearHistory.hide();

  let cellW = windowWidth / cols;
  let cellH = windowHeight / rows;

  for (let i = 0; i < population.length; i++) {
    let mower = population[i];
    let col = i % cols;
    let row = floor(i / cols);
    let xOff = col * cellW;
    let yOff = row * cellH;

    push();
    translate(xOff, yOff);

    fill(20);
    stroke(50);
    rect(0, 0, cellW, cellH);

    drawLawn(mower, cellW, cellH, false);
    mower.show(cellW, cellH, false);

    fill(0, 180);
    noStroke();
    rect(0, 0, cellW, 30);

    let c = STRAT_COLORS[mower.strategy];
    fill(c);
    rect(0, 0, 4, 30);

    fill(255);
    textSize(11);
    textAlign(LEFT, TOP);
    text(`BOT ${i+1}: ${mower.strategy}`, 10, 2);

    textSize(9);
    fill(200);
    text(`${mower.trait} MODE`, 10, 16);

    let prog = mower.getProgress();
    noStroke();
    fill(60);
    rect(cellW - 60, 10, 50, 4);
    fill(prog > 0.95 ? '#4f4' : c);
    rect(cellW - 60, 10, 50 * prog, 4);

    pop();
  }

  fill(255);
  noStroke();
  textSize(14);
  textAlign(RIGHT, TOP);
  text(`GENERATION ${generation}`, width - 20, 20);
  text(`FRAME ${currentFrame} / ${maxFrames}`, width - 20, 40);
  fill(100, 255, 100);
  text(`SESSION BEST: ${(bestGlobalScore*100).toFixed(1)}%`, width - 20, 65);
}

function drawDetailView() {
  btnBack.show();
  btnReset.hide();

  let mower = population[selectedMowerIndex];
  let margin = 40;
  let viewW = width - margin*2;
  let viewH = height - margin*2;

  push();
  translate(margin, margin);
  fill(15);
  stroke(100);
  rect(0, 0, viewW, viewH);
  drawLawn(mower, viewW, viewH, true);
  mower.show(viewW, viewH, true);
  drawHUD(mower, viewW, viewH);
  pop();
}

function drawReplayView() {
  btnBack.show();
  btnReplay.hide();
  btnReset.hide();

  let mower = population[0];
  let margin = 40;
  let viewW = width - margin*2;
  let viewH = height - margin*2;

  push();
  translate(margin, margin);
  fill(15);
  stroke(100);
  rect(0, 0, viewW, viewH);
  drawLawn(mower, viewW, viewH, true);
  mower.show(viewW, viewH, true);

  fill(0, 0, 0, 200);
  rect(20, 20, 250, 120, 10);
  fill(255);
  noStroke();
  textSize(18);
  textAlign(LEFT, TOP);
  text("REPLAY MODE", 35, 30);
  textSize(14);
  fill(0, 255, 100);
  text(`Strategy: ${mower.strategy}`, 35, 60);
  fill(200);
  text(`Coverage: ${(mower.getProgress()*100).toFixed(1)}%`, 35, 80);
  text(`Frame: ${currentFrame}`, 35, 100);

  pop();
}

function drawHUD(mower, w, h) {
  let hudW = 300;
  let hudH = 260;
  let x = 20;
  let y = 20;

  fill(0, 0, 0, 200);
  stroke(STRAT_COLORS[mower.strategy]);
  strokeWeight(2);
  rect(x, y, hudW, hudH, 10);

  noStroke();
  fill(255);
  textSize(14);
  textAlign(LEFT, TOP);

  let pad = 15;
  let ly = y + pad;

  text(`STRATEGY: ${mower.strategy}`, x + pad, ly); ly += 25;
  fill(255, 255, 100);
  text(`TRAIT: ${mower.trait}`, x + pad, ly); ly += 20;
  textSize(12);
  fill(220);
  text(`Speed: ${mower.speed.toFixed(2)} | Cut Width: ${mower.mowRadius*2 + 1}x${mower.mowRadius*2 + 1}`, x + pad, ly); ly += 25;
  fill(200);
  text(`Coverage: ${(mower.getProgress()*100).toFixed(1)}%`, x + pad, ly); ly += 20;
  text(`State: ${mower.state}`, x + pad, ly); ly += 20;

  if (['LINEAR_STRIPER', 'DIAGONAL_STRIPER', 'HYBRID_NAVIGATOR'].includes(mower.strategy)) {
    fill(255, 200, 0);
    text(`SubState: ${mower.subState || 'N/A'}`, x + pad, ly); ly += 20;
  }

  ly += 10;
  fill(150);
  text("GENES:", x + pad, ly); ly += 20;
  fill(220);
  text(`P1: ${mower.dna.genes[0].toFixed(3)} | P2: ${mower.dna.genes[1].toFixed(3)}`, x + pad, ly);
  text(`Trait Gene: ${mower.dna.genes[2].toFixed(3)}`, x + pad, ly+20);
}

function drawLawn(mower, w, h, detail) {
  let scaleX = (w - (detail?80:20)) / lawnBounds.w;
  let scaleY = (h - (detail?80:20)) / lawnBounds.h;
  let s = min(scaleX, scaleY);

  let offsetX = (w - lawnBounds.w * s) / 2;
  let offsetY = (h - lawnBounds.h * s) / 2;
  let cellS = (lawnBounds.w / gridRes) * s;

  push();
  translate(offsetX, offsetY);

  noStroke();

  for (let cell of masterGrid) {
    let isMowed = mower.mowedGrid[cell.c][cell.r];
    if (isMowed) {
      fill(140, 200, 80);
      rect(cell.c * cellS, cell.r * cellS, cellS + 0.6, cellS + 0.6);
    } else {
      fill(30, 80, 40);
      rect(cell.c * cellS, cell.r * cellS, cellS + 0.6, cellS + 0.6);
    }
  }

  if (detail && mower.path && mower.path.length > 0) {
    noFill();
    stroke(255, 0, 0, 200);
    strokeWeight(2);
    beginShape();
    vertex(mower.pos.x * cellS + cellS/2, mower.pos.y * cellS + cellS/2);
    for (let p of mower.path) {
      vertex(p.x * cellS + cellS/2, p.y * cellS + cellS/2);
    }
    endShape();

    let end = mower.path[mower.path.length-1];
    fill(255, 0, 0);
    noStroke();
    ellipse(end.x * cellS + cellS/2, end.y * cellS + cellS/2, 8, 8);
  }

  pop();
}

// ------------------------------------------------------------------
// EVOLUTION LOGIC
// ------------------------------------------------------------------

function nextGeneration() {
  let maxPossible = masterGrid.length;
  for (let m of population) m.calcFitness(maxPossible);

  population.sort((a, b) => b.fitness - a.fitness);

  // Check global best and persistence
  let best = population[0];
  let coverage = best.mowedCount / maxPossible;

  if (coverage > bestGlobalScore) bestGlobalScore = coverage;
  if (coverage > bestGlobalScoreEver) {
    bestGlobalScoreEver = coverage;
    bestGlobalDNA = new DNA([...best.dna.genes], best.dna.strategy);
  }

  checkAndSaveToHOF(best);

  let newPop = [];
  newPop.push(new Mower(population[0].dna));
  let parentPool = population.slice(0, floor(popSize/2) + 1);

  while (newPop.length < popSize) {
    let pA = random(parentPool);
    let pB = random(parentPool);
    let childDNA = pA.dna.crossover(pB.dna);
    childDNA.mutate(0.05);
    newPop.push(new Mower(childDNA));
  }

  population = newPop;
  generation++;
  currentFrame = 0;
}

// ------------------------------------------------------------------
// A* PATHFINDING ALGORITHM
// ------------------------------------------------------------------

function findPath(start, end, gridMap) {
  let openSet = [];
  let closedSet = new Set();
  let cameFrom = new Map();

  let startNode = { x: floor(start.x), y: floor(start.y), f: 0, g: 0 };
  let endNode = { x: floor(end.x), y: floor(end.y) };

  openSet.push(startNode);

  let iter = 0;
  while (openSet.length > 0 && iter < 1000) {
    iter++;
    let winner = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[winner].f) winner = i;
    }
    let current = openSet[winner];

    if (current.x === endNode.x && current.y === endNode.y) {
      let path = [];
      let temp = current;
      while (temp) {
        path.push(createVector(temp.x + 0.5, temp.y + 0.5));
        temp = cameFrom.get(`${temp.x},${temp.y}`);
      }
      return path.reverse();
    }

    openSet.splice(winner, 1);
    closedSet.add(`${current.x},${current.y}`);

    let neighbors = [
      {x:0, y:1}, {x:0, y:-1}, {x:1, y:0}, {x:-1, y:0}
    ];

    for (let n of neighbors) {
      let nx = current.x + n.x;
      let ny = current.y + n.y;

      if (nx >= 0 && nx < gridRes && ny >= 0 && ny < gridRes && gridMap[nx][ny]) {
        if (closedSet.has(`${nx},${ny}`)) continue;

        let gScore = current.g + 1;
        let existing = openSet.find(node => node.x === nx && node.y === ny);

        if (!existing) {
          let h = abs(nx - endNode.x) + abs(ny - endNode.y);
          let newNode = { x: nx, y: ny, g: gScore, f: gScore + h };
          openSet.push(newNode);
          cameFrom.set(`${nx},${ny}`, current);
        } else if (gScore < existing.g) {
          existing.g = gScore;
          existing.f = gScore + (abs(nx - endNode.x) + abs(ny - endNode.y));
          cameFrom.set(`${nx},${ny}`, current);
        }
      }
    }
  }
  return [];
}

// ------------------------------------------------------------------
// CLASSES
// ------------------------------------------------------------------

class DNA {
  constructor(genes, strategy) {
    this.genes = genes || [];
    if (this.genes.length === 0) {
      for(let i=0; i<10; i++) this.genes.push(random(1));
    }
    this.strategy = strategy || random(strategies);
  }

  crossover(partner) {
    let newGenes = [];
    let mid = floor(random(this.genes.length));
    for (let i = 0; i < this.genes.length; i++) {
      newGenes.push(i > mid ? partner.genes[i] : this.genes[i]);
    }
    let newStrat = random(1) < 0.5 ? this.strategy : partner.strategy;
    return new DNA(newGenes, newStrat);
  }

  mutate(rate) {
    for (let i = 0; i < this.genes.length; i++) {
      if (random(1) < rate) this.genes[i] = random(1);
    }
    if (random(1) < 0.1) this.strategy = random(strategies);
  }
}

class Mower {
  constructor(dna) {
    this.dna = dna;
    this.strategy = this.dna.strategy;

    if (this.dna.genes[2] < 0.5) {
      this.trait = 'SPEED';
      this.speed = 0.9;
      this.mowRadius = 0;
    } else {
      this.trait = 'WIDE';
      this.speed = 0.3;
      this.mowRadius = 1;
    }

    this.laneWidth = (this.mowRadius * 2 + 1) * 0.9;

    let validSpots = masterGrid;
    let spawn = validSpots[floor(validSpots.length * 0.5)];
    this.pos = createVector(spawn.c + 0.5, spawn.r + 0.5);

    this.mowedGrid = new Array(gridRes).fill(0).map(()=>new Array(gridRes).fill(false));
    this.mowedCount = 0;
    this.finished = false;
    this.finishFrame = 0;
    this.fitness = 0;

    this.state = 'MOVING';
    this.subState = 'INIT';
    this.path = [];
    this.pathIndex = 0;

    this.baseAngle = this.dna.genes[0] * PI;
    this.angle = this.baseAngle;
    this.turnDir = this.dna.genes[1] > 0.5 ? 1 : -1;

    if (this.strategy === 'DIAGONAL_STRIPER') {
      this.baseAngle = (floor(this.dna.genes[0] * 4) * HALF_PI) + QUARTER_PI;
      this.angle = this.baseAngle;
    }
    else if (this.strategy === 'GREEDY_SLAM' || this.strategy === 'RANDOM_BOUNCE' || this.strategy === 'POTENTIAL_FLOW') {
      this.angle = random(TWO_PI);
    }
    else if (this.strategy === 'SPIRAL_FILL') {
      this.angle = floor(random(4)) * HALF_PI;
    }

    this.greedyTimer = 0;
  }

  update(currentFrameCount) {
    if (this.finished) return;

    switch(this.strategy) {
      case 'LINEAR_STRIPER':
      case 'DIAGONAL_STRIPER':
        this.updateStriper();
        break;
      case 'SPIRAL_FILL':
        this.updateSpiral();
        break;
      case 'RANDOM_BOUNCE':
        this.updateBounce();
        break;
      case 'GREEDY_SLAM':
        this.updateSLAM();
        break;
      case 'POTENTIAL_FLOW':
        this.updatePotential();
        break;
      case 'HYBRID_NAVIGATOR':
        this.updateHybrid();
        break;
    }

    this.checkMow(currentFrameCount);
  }

  // --- SPIRAL FILL ---
  updateSpiral() {
    this.state = 'SPIRALING';
    let spd = this.speed;
    let fwdVec = p5.Vector.fromAngle(this.angle);
    let fwdPos = p5.Vector.add(this.pos, fwdVec);
    let leftPos = p5.Vector.add(this.pos, p5.Vector.fromAngle(this.angle - HALF_PI));
    let isFwdValid = this.isMowable(fwdPos);
    let isLeftValid = this.isMowable(leftPos);

    if (isLeftValid) {
      this.angle -= HALF_PI;
      this.tryMove(p5.Vector.fromAngle(this.angle).mult(spd));
    }
    else if (isFwdValid) {
      this.tryMove(fwdVec.mult(spd));
    }
    else {
      this.angle += HALF_PI;
    }
    this.angle = round(this.angle / HALF_PI) * HALF_PI;
  }

  isMowable(p) {
    if (!this.isValid(p)) return false;
    let c = floor(p.x), r = floor(p.y);
    return !this.mowedGrid[c][r];
  }

  // --- RANDOM BOUNCE ---
  updateBounce() {
    this.state = 'BOUNCING';
    let vel = p5.Vector.fromAngle(this.angle).mult(this.speed);
    if (!this.tryMove(vel)) {
      let currentHead = this.angle;
      this.angle = currentHead + PI + random(-HALF_PI, HALF_PI);
    }
  }

  // --- POTENTIAL FLOW ---
  updatePotential() {
    this.state = 'FLOWING';
    let scanR = 5;
    let force = createVector(0, 0);
    for (let x = -scanR; x <= scanR; x++) {
      for (let y = -scanR; y <= scanR; y++) {
        if (x===0 && y===0) continue;
        let cx = floor(this.pos.x) + x;
        let cy = floor(this.pos.y) + y;
        let d = dist(0,0,x,y);
        if (d > scanR) continue;
        let vec = createVector(x, y).normalize();

        if (cx >= 0 && cx < gridRes && cy >= 0 && cy < gridRes) {
          if (lawnMap[cx][cy]) {
            if (!this.mowedGrid[cx][cy]) {
              force.add(vec.mult(10.0 / (d*d)));
            } else {
              force.sub(vec.mult(0.5 / d));
            }
          } else {
            force.sub(vec.mult(5.0 / (d*d)));
          }
        } else {
          force.sub(vec.mult(5.0 / (d*d)));
        }
      }
    }

    force.add(p5.Vector.random2D().mult(0.5));
    if (force.magSq() > 0) {
      let desired = force.heading();
      let diff = desired - this.angle;
      while (diff < -PI) diff += TWO_PI;
      while (diff > PI) diff -= TWO_PI;
      this.angle += diff * 0.2;
    }
    this.tryMove(p5.Vector.fromAngle(this.angle).mult(this.speed));
  }

  // --- HYBRID NAVIGATOR ---
  updateHybrid() {
    if (this.subState === 'INIT') {
      this.subState = 'STRIPING';
    }

    if (this.subState === 'STRIPING') {
      let working = this.runStriperStep();
      if (!working) {
        this.subState = 'LOCAL_SCAN';
        this.greedyTimer = 30;
      }
    }
    else if (this.subState === 'LOCAL_SCAN') {
      this.updateSLAM();
      this.greedyTimer--;
      if (this.greedyTimer <= 0) {
        this.subState = 'CALCULATE_RELOCATION';
      }
    }
    else if (this.subState === 'CALCULATE_RELOCATION') {
      let target = this.findBestTarget();
      if (target) {
        this.path = findPath(this.pos, target, lawnMap);
        if (this.path.length > 0) {
          this.pathIndex = 0;
          this.subState = 'RELOCATING';
        } else {
           this.angle = random(TWO_PI);
           this.tryMove(p5.Vector.fromAngle(this.angle).mult(this.speed));
           this.subState = 'LOCAL_SCAN';
           this.greedyTimer = 15;
        }
      } else {
        this.finished = true;
      }
    }
    else if (this.subState === 'RELOCATING') {
      this.followPath();
    }
  }

  followPath() {
    if (this.pathIndex >= this.path.length) {
      this.path = [];
      this.angle = this.baseAngle;
      this.subState = 'STRIPING';
      this.state = 'MOVING';
      return;
    }

    let target = this.path[this.pathIndex];
    let d = p5.Vector.dist(this.pos, target);

    if (d < this.speed) {
      this.pos = target;
      this.pathIndex++;
    } else {
      let desired = p5.Vector.sub(target, this.pos);
      desired.setMag(this.speed);
      this.pos.add(desired);
      this.angle = desired.heading();
    }
  }

  findBestTarget() {
    let candidates = [];
    let step = 3;
    for(let c=0; c<gridRes; c+=step) {
      for(let r=0; r<gridRes; r+=step) {
        if(lawnMap[c][r] && !this.mowedGrid[c][r]) {
          candidates.push(createVector(c+0.5, r+0.5));
        }
      }
    }

    if (candidates.length === 0) return null;
    let best = null;
    let maxScore = -Infinity;
    for (let p of candidates) {
      let d = dist(this.pos.x, this.pos.y, p.x, p.y);
      let score = d;
      if (score > maxScore) {
        maxScore = score;
        best = p;
      }
    }
    return best;
  }

  // --- STRIPER LOGIC ---
  updateStriper() {
    if (this.subState === 'INIT') this.subState = 'STRIPING';

    if (this.subState === 'STRIPING') {
      let isWorking = this.runStriperStep();
      if (!isWorking) {
        this.subState = 'CALCULATE_RELOCATION';
      }
    }
    else if (this.subState === 'CALCULATE_RELOCATION') {
      let target = this.findBestTarget();
      if (target) {
        this.path = findPath(this.pos, target, lawnMap);
        if (this.path && this.path.length > 0) {
          this.pathIndex = 0;
          this.subState = 'RELOCATING';
        } else {
          this.finished = true;
        }
      } else {
        this.finished = true;
      }
    }
    else if (this.subState === 'RELOCATING') {
      this.followPath();
    }
  }

  runStriperStep() {
    let fwd = p5.Vector.fromAngle(this.angle);
    let checkDist = this.speed + 0.2;

    if (this.state === 'MOVING') {
      let next = p5.Vector.add(this.pos, p5.Vector.mult(fwd, checkDist));
      if (this.isValid(next)) {
        this.tryMove(p5.Vector.mult(fwd, this.speed));
        return true;
      } else {
        this.state = 'TURNING';
        return true;
      }
    }
    else if (this.state === 'TURNING') {
      let shiftDir = p5.Vector.fromAngle(this.angle + HALF_PI * this.turnDir);
      let laneSize = this.laneWidth;
      let shiftPos = p5.Vector.add(this.pos, p5.Vector.mult(shiftDir, laneSize));

      if (this.isValid(shiftPos)) {
        let backAngle = this.angle + PI;
        let backCheck = p5.Vector.add(shiftPos, p5.Vector.fromAngle(backAngle).mult(1.0));

        if (this.isValid(backCheck)) {
          this.pos = shiftPos;
          this.angle = backAngle;
          this.turnDir *= -1;
          this.state = 'MOVING';
          return true;
        }
      }
      return false;
    }
    return true;
  }

  // --- GREEDY SLAM ---
  updateSLAM() {
    this.state = 'SCANNING';
    let r = 3;
    let bestScore = -Infinity;
    let bestTarget = null;

    for (let x = -r; x <= r; x++) {
      for (let y = -r; y <= r; y++) {
        if (x===0 && y===0) continue;
        let tx = floor(this.pos.x) + x + 0.5;
        let ty = floor(this.pos.y) + y + 0.5;
        let t = createVector(tx, ty);

        if (this.isValid(t)) {
          let score = 0;
          let c = floor(t.x), row = floor(t.y);
          if (!this.mowedGrid[c][row]) score += 50;
          else score -= 5;

          let d = dist(this.pos.x, this.pos.y, tx, ty);
          score -= d * 2;

          let desiredAngle = atan2(ty - this.pos.y, tx - this.pos.x);
          let diff = abs(this.angle - desiredAngle);
          while(diff > PI) diff = TWO_PI - diff;
          score -= diff;

          if (score > bestScore) {
            bestScore = score;
            bestTarget = t;
          }
        }
      }
    }

    if (bestTarget) {
      let desired = p5.Vector.sub(bestTarget, this.pos);
      let angleTo = desired.heading();
      let angleDiff = angleTo - this.angle;
      while (angleDiff > PI) angleDiff -= TWO_PI;
      while (angleDiff < -PI) angleDiff += TWO_PI;
      this.angle += angleDiff * 0.3;
      this.tryMove(p5.Vector.fromAngle(this.angle).mult(this.speed));
    } else {
      this.angle += 0.5;
    }
  }

  tryMove(vel) {
    let next = p5.Vector.add(this.pos, vel);
    if (this.isValid(next)) {
      this.pos = next;
      return true;
    }
    return false;
  }

  isValid(p) {
    let c = floor(p.x);
    let r = floor(p.y);
    if (c < 0 || c >= gridRes || r < 0 || r >= gridRes) return false;
    return lawnMap[c][r] === true;
  }

  checkMow(frameNum) {
    let c = floor(this.pos.x);
    let r = floor(this.pos.y);
    let range = this.mowRadius;
    for(let i=-range; i<=range; i++){
      for(let j=-range; j<=range; j++){
        let nc = c+i, nr = r+j;
        if(nc>=0 && nc<gridRes && nr>=0 && nr<gridRes && lawnMap[nc][nr]) {
          if(!this.mowedGrid[nc][nr]) {
            this.mowedGrid[nc][nr] = true;
            this.mowedCount++;
          }
        }
      }
    }

    if (this.mowedCount >= masterGrid.length * 0.99) {
      this.finished = true;
      this.finishFrame = frameNum;
    }
  }

  getProgress() {
    return masterGrid.length > 0 ? this.mowedCount / masterGrid.length : 0;
  }

  calcFitness(maxPossible) {
    let coverage = this.mowedCount / maxPossible;
    this.fitness = pow(coverage, 4);
    if (coverage > 0.98) {
      // Reward speed if done
      let framesTaken = this.finishFrame > 0 ? this.finishFrame : maxFrames;
      this.fitness += (maxFrames - framesTaken) * 0.001;
    }
  }

  show(w, h, detail) {
    let scaleX = (w - (detail?80:20)) / lawnBounds.w;
    let scaleY = (h - (detail?80:20)) / lawnBounds.h;
    let s = min(scaleX, scaleY);
    let offsetX = (w - lawnBounds.w * s) / 2;
    let offsetY = (h - lawnBounds.h * s) / 2;

    let lx = map(this.pos.x, 0, gridRes, 0, lawnBounds.w);
    let ly = map(this.pos.y, 0, gridRes, 0, lawnBounds.h);
    let px = offsetX + lx * s;
    let py = offsetY + ly * s;

    push();
    translate(px, py);
    rotate(this.angle);

    let c = STRAT_COLORS[this.strategy];
    let sz = detail ? 20 : 10;

    rectMode(CENTER);
    fill(c);
    stroke(0);
    strokeWeight(1);

    if (this.trait === 'WIDE') {
      rect(0, 0, sz * 1.5, sz * 2, 2);
      fill(50);
      rect(0, 0, sz * 0.5, sz * 2.4);
    } else {
      rect(0, 0, sz * 1.8, sz * 0.8, 4);
      fill(255, 255, 255, 100);
      rect(-sz*0.2, 0, sz*0.4, sz*0.8);
    }

    fill(20);
    let wOffY = this.trait === 'WIDE' ? sz : sz * 0.5;
    rect(sz*0.4, -wOffY, sz*0.4, sz*0.2);
    rect(sz*0.4, wOffY, sz*0.4, sz*0.2);
    rect(-sz*0.4, -wOffY, sz*0.4, sz*0.2);
    rect(-sz*0.4, wOffY, sz*0.4, sz*0.2);

    fill(255, 255, 0);
    noStroke();
    triangle(sz*0.3, -sz*0.2, sz*0.3, sz*0.2, sz*0.8, 0);

    pop();
  }
}

// ------------------------------------------------------------------
// UTILS
// ------------------------------------------------------------------

function pointInPoly(x, y, vertices) {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    let xi = vertices[i].x, yi = vertices[i].y;
    let xj = vertices[j].x, yj = vertices[j].y;
    let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
