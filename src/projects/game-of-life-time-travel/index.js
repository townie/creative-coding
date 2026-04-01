// Game of Life: Branching Time Travel
// 4D cellular automaton explorer — 2D grid × time × branching timelines
// Set up a game, let it evolve, rewind to any frame, edit cells to fork
// new timelines, and build the largest branching history you can.

import { GameEngine } from "./engine.js";
import { Timeline } from "./timeline.js";

export function init(container) {
  const COLS = 48;
  const ROWS = 48;
  const engine = new GameEngine(COLS, ROWS);
  const timeline = new Timeline();

  // Simulation state
  let playing = false;
  let speed = 10;
  let lastStepTime = 0;

  // View state
  let editMode = false;
  let hoveredCell = null;
  let draggingTimeline = false;
  let timelineDragStartX = 0;
  let timelineScrollOffset = 0;

  // Particles for atmosphere
  const particles = [];
  const MAX_PARTICLES = 60;

  // Initialize root branch
  const rootId = timeline.createBranch();
  timeline.activeBranchId = rootId;
  engine.randomize(0.3);
  timeline.addFrame(rootId, engine.snapshot());
  timeline.activeFrameIdx = 0;

  // Layout constants
  const TIMELINE_H = 150;
  const GRID_PAD = 30;

  // Create controls
  const controls = document.createElement("div");
  controls.className = "project-controls";
  controls.innerHTML = `
    <div class="control-group" style="display:flex; gap:6px; flex-wrap:wrap;">
      <button id="gol-play" style="flex:1; min-width:70px;">&#9654; Play</button>
      <button id="gol-step-back" title="Step back">&#9664;</button>
      <button id="gol-step-fwd" title="Step forward">&#9654;|</button>
    </div>
    <div class="control-group">
      <label>Speed: <span id="gol-speed-val">${speed}</span> gen/s</label>
      <input type="range" id="gol-speed" min="1" max="60" value="${speed}">
    </div>
    <div class="control-group" style="display:flex; gap:6px;">
      <button id="gol-edit" style="flex:1;">&#9998; Edit Cells</button>
      <button id="gol-fork" style="flex:1;">&#9096; Fork</button>
    </div>
    <div class="control-group" style="display:flex; gap:6px;">
      <button id="gol-random" style="flex:1;">Randomize</button>
      <button id="gol-clear" style="flex:1;">Clear</button>
    </div>
    <div class="control-group">
      <label>Branch</label>
      <select id="gol-branch"></select>
    </div>
    <div class="control-group">
      <div id="gol-stats" style="font-size:11px; opacity:0.6; line-height:1.5;"></div>
    </div>
  `;
  container.appendChild(controls);

  // Control references
  const playBtn = controls.querySelector("#gol-play");
  const speedSlider = controls.querySelector("#gol-speed");
  const speedVal = controls.querySelector("#gol-speed-val");
  const editBtn = controls.querySelector("#gol-edit");
  const forkBtn = controls.querySelector("#gol-fork");
  const randomBtn = controls.querySelector("#gol-random");
  const clearBtn = controls.querySelector("#gol-clear");
  const branchSelect = controls.querySelector("#gol-branch");
  const statsDiv = controls.querySelector("#gol-stats");

  // Control handlers
  playBtn.onclick = () => {
    playing = !playing;
    playBtn.innerHTML = playing ? "&#9646;&#9646; Pause" : "&#9654; Play";
  };

  speedSlider.oninput = (e) => {
    speed = parseInt(e.target.value);
    speedVal.textContent = speed;
  };

  controls.querySelector("#gol-step-back").onclick = () => {
    if (timeline.activeFrameIdx > 0) {
      timeline.activeFrameIdx--;
      engine.load(timeline.getFrame(timeline.activeBranchId, timeline.activeFrameIdx));
    }
  };

  controls.querySelector("#gol-step-fwd").onclick = () => stepForward();

  editBtn.onclick = () => {
    editMode = !editMode;
    editBtn.style.background = editMode ? "rgba(255,200,100,0.2)" : "";
    editBtn.innerHTML = editMode ? "&#9998; Editing..." : "&#9998; Edit Cells";
  };

  forkBtn.onclick = () => doFork();

  randomBtn.onclick = () => {
    const snap = engine.randomize(0.3);
    doForkWithSnapshot(snap);
  };

  clearBtn.onclick = () => {
    const snap = engine.clear();
    doForkWithSnapshot(snap);
  };

  branchSelect.onchange = (e) => {
    const id = parseInt(e.target.value);
    timeline.activeBranchId = id;
    const branch = timeline.getBranch(id);
    timeline.activeFrameIdx = Math.min(timeline.activeFrameIdx, branch.frames.length - 1);
    engine.load(timeline.getFrame(id, timeline.activeFrameIdx));
  };

  function stepForward() {
    const branch = timeline.getBranch(timeline.activeBranchId);
    if (timeline.activeFrameIdx < branch.frames.length - 1) {
      timeline.activeFrameIdx++;
      engine.load(timeline.getFrame(timeline.activeBranchId, timeline.activeFrameIdx));
    } else {
      const snap = engine.step();
      timeline.addFrame(timeline.activeBranchId, snap);
      timeline.activeFrameIdx = branch.frames.length - 1;
    }
  }

  function doFork() {
    const currentSnap = timeline.getFrame(timeline.activeBranchId, timeline.activeFrameIdx);
    const newId = timeline.fork(timeline.activeBranchId, timeline.activeFrameIdx, currentSnap.slice());
    timeline.activeBranchId = newId;
    timeline.activeFrameIdx = 0;
    engine.load(currentSnap);
    updateBranchSelect();
  }

  function doForkWithSnapshot(snap) {
    const newId = timeline.fork(timeline.activeBranchId, timeline.activeFrameIdx, snap);
    timeline.activeBranchId = newId;
    timeline.activeFrameIdx = 0;
    engine.load(snap);
    updateBranchSelect();
  }

  function updateBranchSelect() {
    const branches = timeline.getAllBranches();
    branchSelect.innerHTML = branches
      .map(
        (b) =>
          `<option value="${b.id}" ${b.id === timeline.activeBranchId ? "selected" : ""}>${b.label} (${b.frames.length})</option>`
      )
      .join("");
  }

  updateBranchSelect();

  // Init particles
  function initParticles(p) {
    particles.length = 0;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      particles.push({
        x: p.random(p.width),
        y: p.random(p.height - TIMELINE_H),
        vx: p.random(-0.15, 0.15),
        vy: p.random(-0.2, -0.05),
        size: p.random(1, 2.5),
        alpha: p.random(20, 60),
        life: p.random(200, 600)
      });
    }
  }

  // ---- P5 INSTANCE ----
  return new p5((p) => {
    p.setup = () => {
      const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
      canvas.parent(container);
      p.textFont("monospace");
      p.pixelDensity(1);
      initParticles(p);
    };

    p.draw = () => {
      // Simulation step
      if (playing) {
        const now = p.millis();
        const interval = 1000 / speed;
        if (now - lastStepTime >= interval) {
          stepForward();
          lastStepTime = now;
        }
      }

      // Background
      p.background(10, 12, 20);

      // Draw main area
      const mainH = p.height - TIMELINE_H;

      // Atmospheric particles
      drawParticles(p, mainH);

      // Grid layout
      const gridSize = Math.min(
        (p.width - 350) * 0.5,
        mainH - GRID_PAD * 2
      );
      const gridX = GRID_PAD;
      const gridY = (mainH - gridSize) / 2;

      // Draw the perspective corridor (right side)
      drawCorridor(p, gridX + gridSize + 40, gridY, p.width - gridX - gridSize - 80, gridSize);

      // Draw active grid
      const activeSnap = timeline.getFrame(timeline.activeBranchId, timeline.activeFrameIdx);
      if (activeSnap) {
        drawGrid(p, activeSnap, gridX, gridY, gridSize, gridSize, true);

        // Generation label
        const absGen = timeline.getAbsoluteGeneration(timeline.activeBranchId, timeline.activeFrameIdx);
        p.fill(180);
        p.noStroke();
        p.textSize(12);
        p.textAlign(p.LEFT, p.BOTTOM);
        p.text(`T=${absGen}`, gridX, gridY - 6);

        // Branch label
        const branch = timeline.getBranch(timeline.activeBranchId);
        const col = branchColor(p, branch.hue, true);
        p.fill(col);
        p.text(branch.label, gridX + 60, gridY - 6);
      }

      // Edit mode overlay
      if (editMode) {
        // Cursor highlight
        if (hoveredCell) {
          const cellW = gridSize / COLS;
          const cellH = gridSize / ROWS;
          p.noFill();
          p.stroke(255, 200, 100, 180);
          p.strokeWeight(1.5);
          p.rect(
            gridX + hoveredCell.x * cellW,
            gridY + hoveredCell.y * cellH,
            cellW,
            cellH,
            1
          );
        }
        // Edit badge
        p.fill(255, 200, 100);
        p.noStroke();
        p.textSize(11);
        p.textAlign(p.LEFT, p.TOP);
        p.text("EDIT MODE  \u2014  click cells to toggle, auto-forks on change", gridX, gridY + gridSize + 8);
      }

      // Timeline bar
      drawTimelineBar(p, mainH);

      // Stats
      const branch = timeline.getBranch(timeline.activeBranchId);
      const absGen = timeline.getAbsoluteGeneration(timeline.activeBranchId, timeline.activeFrameIdx);
      statsDiv.innerHTML =
        `Gen: ${absGen} | Frame: ${timeline.activeFrameIdx}/${branch.frames.length - 1}<br>` +
        `Alive: ${engine.countAlive()} / ${COLS * ROWS}<br>` +
        `Total: ${timeline.getTotalFrames()} frames | ${timeline.getAllBranches().length} branches`;
    };

    // ---- RENDERING FUNCTIONS ----

    function drawGrid(p, snapshot, x, y, w, h, interactive) {
      // Card background
      p.fill(13, 16, 22);
      p.stroke(35, 40, 50);
      p.strokeWeight(0.5);
      p.rect(x, y, w, h, 2);

      const cellW = w / COLS;
      const cellH = h / ROWS;

      // Live cells
      p.noStroke();
      for (let cy = 0; cy < ROWS; cy++) {
        for (let cx = 0; cx < COLS; cx++) {
          if (snapshot[cy * COLS + cx]) {
            // Warm cream glow
            p.fill(230, 222, 200, 240);
            p.rect(
              x + cx * cellW + 0.5,
              y + cy * cellH + 0.5,
              cellW - 1,
              cellH - 1,
              cellW > 5 ? 1 : 0
            );
          }
        }
      }

      // Subtle grid lines (only when cells are large enough)
      if (cellW > 3) {
        p.stroke(30, 35, 45, 60);
        p.strokeWeight(0.3);
        for (let cx = 0; cx <= COLS; cx++) {
          p.line(x + cx * cellW, y, x + cx * cellW, y + h);
        }
        for (let cy = 0; cy <= ROWS; cy++) {
          p.line(x, y + cy * cellH, x + w, y + cy * cellH);
        }
      }

      // Active border glow
      if (interactive) {
        p.noFill();
        p.stroke(80, 75, 60, 60);
        p.strokeWeight(1);
        p.rect(x - 1, y - 1, w + 2, h + 2, 3);
      }
    }

    function drawMiniGrid(p, snapshot, x, y, w, h, alpha) {
      // Card background
      p.fill(13, 16, 22, alpha);
      p.stroke(35, 40, 50, alpha * 0.4);
      p.strokeWeight(0.5);
      p.rect(x, y, w, h, 1);

      const cellW = w / COLS;
      const cellH = h / ROWS;
      const skip = cellW < 1.5 ? 2 : 1;

      p.noStroke();
      p.fill(225, 218, 200, alpha);

      for (let cy = 0; cy < ROWS; cy += skip) {
        for (let cx = 0; cx < COLS; cx += skip) {
          if (snapshot[cy * COLS + cx]) {
            p.rect(
              x + cx * cellW,
              y + cy * cellH,
              Math.max(cellW * skip - 0.3, 0.8),
              Math.max(cellH * skip - 0.3, 0.8)
            );
          }
        }
      }
    }

    function drawCorridor(p, areaX, areaY, areaW, areaH) {
      const branch = timeline.getBranch(timeline.activeBranchId);
      const currentFrame = timeline.activeFrameIdx;

      // Vanishing point (upper-right area)
      const vanishX = areaX + areaW * 0.85;
      const vanishY = areaY + areaH * 0.08;

      // Start position (lower-left, near the active grid)
      const startX = areaX + 10;
      const startY = areaY + areaH * 0.65;
      const startSize = Math.min(areaW * 0.28, areaH * 0.45);

      // How many cards to show
      const maxCards = Math.min(14, currentFrame);
      if (maxCards === 0) return;

      const step = Math.max(1, Math.floor(currentFrame / maxCards));

      // Collect frames to show (from oldest to most recent before current)
      const framesToShow = [];
      for (let i = 0; i < currentFrame; i += step) {
        framesToShow.push(i);
      }
      // Ensure we always show the frame just before current
      if (framesToShow.length > 0 && framesToShow[framesToShow.length - 1] !== currentFrame - 1 && currentFrame > 0) {
        framesToShow.push(currentFrame - 1);
      }

      if (framesToShow.length === 0) return;

      // Connecting line from vanishing point to start
      p.stroke(60, 55, 45, 40);
      p.strokeWeight(0.5);
      p.line(vanishX, vanishY + 20, startX + startSize / 2, startY + startSize / 2);

      // Draw from farthest to nearest
      for (let idx = 0; idx < framesToShow.length; idx++) {
        const frameIdx = framesToShow[idx];
        const snap = branch.frames[frameIdx];
        if (!snap) continue;

        // t: 0 = farthest, 1 = nearest
        const t = framesToShow.length === 1 ? 1 : idx / (framesToShow.length - 1);
        const ease = Math.pow(t, 0.65);

        const cardX = p.lerp(vanishX, startX, ease);
        const cardY = p.lerp(vanishY, startY, ease);
        const cardSize = p.lerp(startSize * 0.06, startSize, ease);
        const alpha = p.lerp(25, 230, ease);

        // Shadow
        p.fill(0, 0, 0, alpha * 0.25);
        p.noStroke();
        p.rect(cardX + 2, cardY + 2, cardSize, cardSize, 1);

        // Grid card
        drawMiniGrid(p, snap, cardX, cardY, cardSize, cardSize, alpha);

        // Frame label
        if (cardSize > 30) {
          const absGen = timeline.getAbsoluteGeneration(timeline.activeBranchId, frameIdx);
          p.fill(180, 175, 160, alpha);
          p.noStroke();
          p.textSize(Math.max(7, cardSize * 0.08));
          p.textAlign(p.LEFT, p.BOTTOM);
          p.text(`T=${absGen}`, cardX, cardY - 2);
        }
      }

      // Show other branches as dimmer corridors
      const otherBranches = timeline.getAllBranches().filter((b) => b.id !== timeline.activeBranchId && b.frames.length > 0);
      for (let bi = 0; bi < Math.min(otherBranches.length, 3); bi++) {
        const ob = otherBranches[bi];
        const offsetY = (bi + 1) * 35;
        const dimAlpha = 40;

        // Show just a few frames from other branches
        const showCount = Math.min(5, ob.frames.length);
        const obStep = Math.max(1, Math.floor(ob.frames.length / showCount));

        for (let i = 0; i < ob.frames.length; i += obStep) {
          const t = showCount <= 1 ? 0.5 : (i / obStep) / (showCount - 1);
          const ease = Math.pow(t, 0.65);
          const cardX = p.lerp(vanishX - 10, startX + 20, ease);
          const cardY = p.lerp(vanishY + offsetY, startY + offsetY, ease);
          const cardSize = p.lerp(startSize * 0.04, startSize * 0.35, ease);

          if (ob.frames[i]) {
            drawMiniGrid(p, ob.frames[i], cardX, cardY, cardSize, cardSize, dimAlpha);
          }
        }

        // Branch label
        const col = branchColor(p, ob.hue, false);
        p.fill(p.red(col), p.green(col), p.blue(col), 80);
        p.noStroke();
        p.textSize(9);
        p.textAlign(p.LEFT, p.BOTTOM);
        p.text(ob.label, startX + 22, startY + offsetY - 2);
      }
    }

    function drawParticles(p, maxY) {
      p.noStroke();
      for (const pt of particles) {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life--;

        if (pt.life <= 0 || pt.y < -10 || pt.x < -10 || pt.x > p.width + 10) {
          pt.x = p.random(p.width);
          pt.y = maxY + p.random(20);
          pt.life = p.random(200, 600);
          pt.vx = p.random(-0.15, 0.15);
          pt.vy = p.random(-0.2, -0.05);
        }

        const fadeIn = Math.min(pt.life / 60, 1);
        const fadeOut = Math.min((600 - pt.life) / 100, 1);
        const a = pt.alpha * Math.min(fadeIn, fadeOut);
        p.fill(190, 170, 120, a);
        p.circle(pt.x, pt.y, pt.size);
      }
    }

    function drawTimelineBar(p, y) {
      const barH = TIMELINE_H;

      // Background
      p.fill(6, 8, 14, 240);
      p.noStroke();
      p.rect(0, y, p.width, barH);

      // Top separator
      p.stroke(30, 35, 45);
      p.strokeWeight(0.5);
      p.line(0, y, p.width, y);

      const layout = timeline.getTreeLayout();
      if (layout.length === 0) return;

      // Calculate the range of generations to show
      let maxGen = 0;
      for (const entry of layout) {
        maxGen = Math.max(maxGen, entry.endGen);
      }
      maxGen = Math.max(maxGen, 10);

      const pad = 60;
      const usableW = p.width - pad * 2;
      const pxPerGen = Math.min(usableW / (maxGen + 5), 12);

      // Center the view on the active frame
      const activeAbsGen = timeline.getAbsoluteGeneration(
        timeline.activeBranchId,
        timeline.activeFrameIdx
      );
      const targetScrollOffset = activeAbsGen * pxPerGen - usableW / 2;
      if (!draggingTimeline) {
        timelineScrollOffset = p.lerp(timelineScrollOffset, targetScrollOffset, 0.1);
      }

      const branchSpacing = Math.min(35, (barH - 40) / Math.max(layout.length, 1));
      const baseY = y + 25;

      p.push();
      p.translate(-timelineScrollOffset, 0);

      for (const entry of layout) {
        const lineY = baseY + entry.y * branchSpacing;
        const startX = pad + entry.startGen * pxPerGen;
        const endX = pad + entry.endGen * pxPerGen;
        const isActive = entry.branchId === timeline.activeBranchId;

        const col = branchColor(p, entry.hue, isActive);
        const r = p.red(col);
        const g = p.green(col);
        const b = p.blue(col);

        // Fork connection line
        if (entry.parentId !== null && entry.forkGen !== undefined) {
          const forkX = pad + entry.forkGen * pxPerGen;
          const parentY = baseY + entry.parentY * branchSpacing;
          p.stroke(r, g, b, 60);
          p.strokeWeight(1);
          p.noFill();
          // Curved fork line
          p.bezier(
            forkX, parentY,
            forkX + 10, parentY,
            startX - 10, lineY,
            startX, lineY
          );
        }

        // Branch line
        p.stroke(r, g, b, isActive ? 180 : 80);
        p.strokeWeight(isActive ? 2 : 1);
        p.line(startX, lineY, Math.max(endX, startX + 5), lineY);

        // Frame dots (adaptive density)
        const maxDots = Math.floor(usableW / 4);
        const dotStep = Math.max(1, Math.ceil(entry.frameCount / maxDots));

        for (let i = 0; i < entry.frameCount; i += dotStep) {
          const absGen = timeline.getAbsoluteGeneration(entry.branchId, i);
          const dotX = pad + absGen * pxPerGen;
          const isCurrentFrame = isActive && i === timeline.activeFrameIdx;

          if (isCurrentFrame) {
            // Active frame marker — bright, large
            p.fill(255);
            p.noStroke();
            p.circle(dotX, lineY, 8);
            // Glow ring
            p.noFill();
            p.stroke(255, 255, 255, 60);
            p.strokeWeight(1);
            p.circle(dotX, lineY, 14);
          } else {
            p.fill(r, g, b, isActive ? 120 : 50);
            p.noStroke();
            p.circle(dotX, lineY, 2.5);
          }
        }

        // Ensure the last frame has a dot if we skipped it
        if (entry.frameCount > 0) {
          const lastIdx = entry.frameCount - 1;
          const lastAbsGen = timeline.getAbsoluteGeneration(entry.branchId, lastIdx);
          const dotX = pad + lastAbsGen * pxPerGen;
          const isCurrentFrame = isActive && lastIdx === timeline.activeFrameIdx;
          if (!isCurrentFrame) {
            p.fill(r, g, b, isActive ? 150 : 70);
            p.noStroke();
            p.circle(dotX, lineY, 3);
          }
        }

        // Branch label
        p.fill(r, g, b, isActive ? 220 : 100);
        p.noStroke();
        p.textSize(9);
        p.textAlign(p.LEFT, p.BOTTOM);
        p.text(`${entry.label} (${entry.frameCount})`, startX, lineY - 8);
      }

      p.pop();

      // Scroll indicator arrows if timeline extends beyond view
      if (timelineScrollOffset > 10) {
        p.fill(100, 100, 100, 80);
        p.noStroke();
        p.triangle(8, y + barH / 2, 18, y + barH / 2 - 8, 18, y + barH / 2 + 8);
      }
      if (timelineScrollOffset + usableW < maxGen * pxPerGen) {
        p.fill(100, 100, 100, 80);
        p.noStroke();
        const rx = p.width - 8;
        p.triangle(rx, y + barH / 2, rx - 10, y + barH / 2 - 8, rx - 10, y + barH / 2 + 8);
      }
    }

    function branchColor(p, hue, active) {
      if (hue === 0) {
        // Root branch — white/silver
        return active ? p.color(210, 215, 225) : p.color(140, 145, 155);
      }
      p.push();
      p.colorMode(p.HSB, 360, 100, 100);
      const c = p.color(hue, active ? 55 : 25, active ? 88 : 55);
      p.pop();
      return c;
    }

    // ---- INTERACTION ----

    function getGridBounds() {
      const mainH = p.height - TIMELINE_H;
      const gridSize = Math.min(
        (p.width - 350) * 0.5,
        mainH - GRID_PAD * 2
      );
      return {
        x: GRID_PAD,
        y: (mainH - gridSize) / 2,
        w: gridSize,
        h: gridSize
      };
    }

    function getCellAt(mx, my) {
      const g = getGridBounds();
      const lx = mx - g.x;
      const ly = my - g.y;
      if (lx < 0 || ly < 0 || lx >= g.w || ly >= g.h) return null;
      return {
        x: Math.floor(lx / (g.w / COLS)),
        y: Math.floor(ly / (g.h / ROWS))
      };
    }

    function getTimelineBranchFrame(mx, my) {
      const mainH = p.height - TIMELINE_H;
      if (my < mainH) return null;

      const layout = timeline.getTreeLayout();
      if (layout.length === 0) return null;

      let maxGen = 0;
      for (const entry of layout) {
        maxGen = Math.max(maxGen, entry.endGen);
      }
      maxGen = Math.max(maxGen, 10);

      const pad = 60;
      const usableW = p.width - pad * 2;
      const pxPerGen = Math.min(usableW / (maxGen + 5), 12);
      const branchSpacing = Math.min(35, (TIMELINE_H - 40) / Math.max(layout.length, 1));
      const baseY = mainH + 25;

      // Adjust for scroll
      const adjMx = mx + timelineScrollOffset;

      for (const entry of layout) {
        const lineY = baseY + entry.y * branchSpacing;
        if (Math.abs(my - lineY) > branchSpacing / 2) continue;

        // Find the closest frame
        const clickGen = (adjMx - pad) / pxPerGen;
        let bestFrame = -1;
        let bestDist = Infinity;

        for (let i = 0; i < entry.frameCount; i++) {
          const absGen = timeline.getAbsoluteGeneration(entry.branchId, i);
          const dist = Math.abs(absGen - clickGen);
          if (dist < bestDist) {
            bestDist = dist;
            bestFrame = i;
          }
        }

        if (bestFrame >= 0 && bestDist < 3) {
          return { branchId: entry.branchId, frameIdx: bestFrame };
        }
      }
      return null;
    }

    p.mousePressed = () => {
      const mainH = p.height - TIMELINE_H;

      // Timeline click
      if (p.mouseY >= mainH) {
        const hit = getTimelineBranchFrame(p.mouseX, p.mouseY);
        if (hit) {
          timeline.activeBranchId = hit.branchId;
          timeline.activeFrameIdx = hit.frameIdx;
          engine.load(timeline.getFrame(hit.branchId, hit.frameIdx));
          updateBranchSelect();
        }
        return;
      }

      // Grid cell click (edit mode)
      if (editMode) {
        const cell = getCellAt(p.mouseX, p.mouseY);
        if (cell) {
          toggleCell(cell.x, cell.y);
        }
      }
    };

    p.mouseDragged = () => {
      if (editMode) {
        const cell = getCellAt(p.mouseX, p.mouseY);
        if (cell && (!hoveredCell || cell.x !== hoveredCell.x || cell.y !== hoveredCell.y)) {
          toggleCell(cell.x, cell.y);
          hoveredCell = cell;
        }
      }
    };

    function toggleCell(cx, cy) {
      const branch = timeline.getBranch(timeline.activeBranchId);

      // If not at tip, auto-fork
      if (timeline.activeFrameIdx < branch.frames.length - 1) {
        const snap = timeline.getFrame(timeline.activeBranchId, timeline.activeFrameIdx).slice();
        snap[cy * COLS + cx] = snap[cy * COLS + cx] ? 0 : 1;
        doForkWithSnapshot(snap);
      } else {
        engine.toggle(cx, cy);
        branch.frames[timeline.activeFrameIdx] = engine.snapshot();
      }
    }

    p.mouseMoved = () => {
      if (editMode) {
        hoveredCell = getCellAt(p.mouseX, p.mouseY);
      } else {
        hoveredCell = null;
      }
    };

    p.keyPressed = () => {
      if (p.key === " ") {
        playing = !playing;
        playBtn.innerHTML = playing ? "&#9646;&#9646; Pause" : "&#9654; Play";
        return false; // prevent scroll
      }
      if (p.key === "e" || p.key === "E") {
        editMode = !editMode;
        editBtn.style.background = editMode ? "rgba(255,200,100,0.2)" : "";
        editBtn.innerHTML = editMode ? "&#9998; Editing..." : "&#9998; Edit Cells";
      }
      if (p.key === "f" || p.key === "F") {
        doFork();
      }
      if (p.keyCode === p.RIGHT_ARROW) {
        stepForward();
      }
      if (p.keyCode === p.LEFT_ARROW) {
        if (timeline.activeFrameIdx > 0) {
          timeline.activeFrameIdx--;
          engine.load(timeline.getFrame(timeline.activeBranchId, timeline.activeFrameIdx));
        }
      }
    };

    p.mouseWheel = (e) => {
      // Scroll timeline when mouse is in timeline area
      if (p.mouseY >= p.height - TIMELINE_H) {
        timelineScrollOffset += e.delta * 0.5;
        timelineScrollOffset = Math.max(0, timelineScrollOffset);
        return false;
      }
    };

    p.windowResized = () => {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
    };
  });
}
