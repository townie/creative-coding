let physicsLoaded = false;
let engine, world;
let Matter;

// Physics objects
let momSegments = [];
let pups = [];
let boundaries = [];
let momController; // The constraint moving the head
let currentHeadTarget = { x: 0, y: 0 };

// Game State
let bedZone = { x: 0, y: 0, w: 300, h: 200 }; // Defined in setup
let aiState = {
  targetId: null,
  mode: 'IDLE', // IDLE, CHASING, DRAGGING, RETURNING
  stateTimer: 0
};

// Visuals
let colors = {};

// GUI
let gui = {
  visible: false,
  toggleBtn: null,
  panel: null,
  sliders: {}
};

function preload() {
  // Inject Matter.js
  let script = createElement('script');
  script.attribute('src', 'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js');
  script.elt.onload = () => {
    Matter = window.Matter;
    physicsLoaded = true;
    initPhysics();
  };
  document.head.appendChild(script.elt);
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  setAttributes('antialias', true);

  // Red Panda Palette
  colors = {
    fur: color(204, 68, 0),      // Rusty Red
    dark: color(50, 30, 20),     // Dark Brown/Black
    light: color(255, 245, 230), // Cream/White
    bed: color(100, 150, 255)    // Blue bed
  };

  bedZone = { x: width - 350, y: height - 150, w: 300, h: 150 };

  // Initialize GUI
  createGUI();
}

function createGUI() {
  const panelStyle = `
    background: rgba(50, 30, 20, 0.9);
    color: #fff;
    padding: 20px;
    border-radius: 0 0 8px 0;
    font-family: 'Verdana', sans-serif;
    width: 280px;
    display: none;
    flex-direction: column;
    gap: 12px;
    border-right: 4px solid #cc4400;
    border-bottom: 4px solid #cc4400;
    box-shadow: 5px 5px 20px rgba(0, 0, 0, 0.5);
  `;

  const labelStyle = `
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    margin-bottom: 4px;
    color: #ffd;
  `;

  gui.toggleBtn = createButton('NURSERY SETTINGS');
  gui.toggleBtn.position(20, 20);
  gui.toggleBtn.style(`
    background: #cc4400;
    color: #fff;
    border: 2px solid #fff;
    border-radius: 20px;
    padding: 8px 16px;
    font-family: 'Verdana', sans-serif;
    font-weight: bold;
    cursor: pointer;
    z-index: 1000;
  `);
  gui.toggleBtn.mouseOver(() => gui.toggleBtn.style('transform', 'scale(1.05)'));
  gui.toggleBtn.mouseOut(() => gui.toggleBtn.style('transform', 'scale(1.0)'));
  gui.toggleBtn.mousePressed(() => {
    gui.visible = !gui.visible;
    gui.panel.style('display', gui.visible ? 'flex' : 'none');
  });

  gui.panel = createDiv('');
  gui.panel.position(20, 70);
  gui.panel.style(panelStyle);
  gui.panel.style('z-index', '999');

  function addControl(label, min, max, val, step) {
    let container = createDiv('');
    container.parent(gui.panel);
    container.style('display: flex; flex-direction: column;');

    let txt = createDiv(`<span>${label}</span> <span id="val-${label}" style="color:#cc4400">${val}</span>`);
    txt.parent(container);
    txt.style(labelStyle);

    let s = createSlider(min, max, val, step);
    s.parent(container);
    s.style('width', '100%');
    s.style('accent-color', '#cc4400');
    s.input(() => {
      select(`#val-${label}`).html(s.value());
    });

    gui.sliders[label] = s;
  }

  addControl('Mom Speed', 10, 150, 60, 1);
  addControl('Mom Strength', 0.01, 1.0, 0.1, 0.01);
  addControl('Pup Energy', 0, 10, 2, 0.1); // How much they jump
  addControl('Gravity', 0, 2, 1.0, 0.1);
}

function initPhysics() {
  let Engine = Matter.Engine,
      World = Matter.World,
      Bodies = Matter.Bodies,
      Constraint = Matter.Constraint;

  engine = Engine.create();
  world = engine.world;

  engine.gravity.y = 1;

  // 1. Boundaries
  let wallThickness = 200;
  let wallHeight = height * 3;

  let wallLeft = Bodies.rectangle(0 - wallThickness/2, height/2, wallThickness, wallHeight, { isStatic: true });
  let wallRight = Bodies.rectangle(width + wallThickness/2, height/2, wallThickness, wallHeight, { isStatic: true });
  let ground = Bodies.rectangle(width/2, height + wallThickness/2, width, wallThickness, { isStatic: true, friction: 1.0 });
  let ceiling = Bodies.rectangle(width/2, -1000, width, wallThickness, { isStatic: true });

  boundaries.push(ground, wallLeft, wallRight, ceiling);
  World.add(world, boundaries);

  // 2. Mom (The Chain)
  // Anchored at top left-ish or mid-left to swoop down
  let segCount = 9;
  let segSize = 45;
  let startX = 100;
  let startY = height / 2;

  let prevBody = null;

  for (let i = 0; i < segCount; i++) {
    // Tapering size for tail vs body
    let currentSize = segSize;
    if (i < 3) currentSize = segSize * 0.7; // Tail is thinner
    if (i > 6) currentSize = segSize * 0.9; // Neck/Head

    let x = startX + (i * 30);
    let y = startY;

    // Using circles/capsules for smoother organic movement
    let segment = Bodies.circle(x, y, currentSize/2, {
      frictionAir: 0.05,
      density: 0.05,
      collisionFilter: { group: -1 }, // Don't collide with self
      restitution: 0.2
    });

    momSegments.push({ body: segment, index: i, size: currentSize });
    World.add(world, segment);

    let options = {
      bodyA: segment,
      stiffness: 0.8,
      damping: 0.1,
      length: 25,
      render: { visible: false }
    };

    if (i === 0) {
      // Anchor the tail to the wall/air
      options.pointB = { x: startX, y: startY };
      options.pointA = { x: 0, y: 0 };
      let anchor = Constraint.create(options);
      World.add(world, anchor);
    } else {
      options.bodyB = prevBody;
      options.pointA = { x: -10, y: 0 };
      options.pointB = { x: 10, y: 0 };
      let joint = Constraint.create(options);
      World.add(world, joint);
    }
    prevBody = segment;
  }

  // 3. Mom Controller (Head)
  let head = momSegments[momSegments.length - 1].body;
  currentHeadTarget = { x: startX + 200, y: startY };

  momController = Constraint.create({
    pointA: currentHeadTarget,
    bodyB: head,
    pointB: { x: 0, y: 0 },
    stiffness: 0.1,
    damping: 0.1,
    length: 0
  });
  World.add(world, momController);
}

function draw() {
  // Background - Soft Nursery Color
  background(240, 230, 220);

  if (!physicsLoaded) {
    fill(204, 68, 0);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(20);
    text("MOM IS WAKING UP...", 0, 0);
    return;
  }

  // --- PHYSICS PARAMS ---
  engine.gravity.y = gui.sliders['Gravity'].value();
  momController.stiffness = gui.sliders['Mom Strength'].value();

  // --- GAME LOGIC ---
  bedZone.x = width - 250;
  bedZone.y = height - 100;

  spawnPups();
  updateMomAI();
  updateMomMotor();

  Matter.Engine.update(engine);

  // --- RENDER ---
  // Setup Lights
  ambientLight(150);
  directionalLight(255, 255, 255, 0.5, 1, -1);
  pointLight(255, 200, 150, 0, -height/2, 500);

  push();
  translate(-width / 2, -height / 2, 0);

  drawEnvironment();
  drawPups();
  drawMom();

  pop();

  drawHUD();
}

function spawnPups() {
  // Keep about 5 pups
  if (frameCount % 120 === 0 && pups.length < 5) {
    let sz = 40;
    // Spawn from left side or top
    let posX = random(100, width/2);
    let startY = -100;

    let pupBody = Matter.Bodies.rectangle(posX, startY, sz, sz, {
      restitution: 0.6, // Bouncy!
      friction: 0.3,
      density: 0.01,
      angle: random(TWO_PI)
    });

    // Random initial spin
    Matter.Body.setAngularVelocity(pupBody, random(-0.3, 0.3));

    let pupColorVar = random(0.8, 1.2); // Slight coat variation

    pups.push({
      body: pupBody,
      w: sz,
      h: sz,
      id: pupBody.id,
      colorVar: pupColorVar,
      lastHeading: 0
    });
    Matter.World.add(world, pupBody);
  }

  // Random "Play" forces
  let energy = gui.sliders['Pup Energy'].value();
  for (let p of pups) {
    if (random() < 0.02 * energy) {
      // Jump!
      if (p.body.position.y > height - 100) {
        Matter.Body.applyForce(p.body, p.body.position, {
          x: random(-0.02, 0.02),
          y: -0.04 * energy
        });
      }
    }
  }

  // Cleanup
  for (let i = pups.length - 1; i >= 0; i--) {
    let p = pups[i];
    let pos = p.body.position;
    if (pos.y > height + 200 || pos.x < -200 || pos.x > width + 200) {
      Matter.World.remove(world, p.body);
      pups.splice(i, 1);
      if (aiState.targetId === p.id) aiState.targetId = null;
    }
  }
}

function updateMomAI() {
  let head = momSegments[momSegments.length - 1].body;
  let headPos = head.position;

  // Find pups NOT in bed
  let activePups = pups.filter(p => {
    let inBed = p.body.position.x > bedZone.x - bedZone.w/2 && p.body.position.y > height - 200;
    return !inBed;
  });

  // If we have a target ID, check if it's still valid
  let targetPup = pups.find(p => p.id === aiState.targetId);

  // If target doesn't exist or is already in bed, reset
  if (!targetPup || (targetPup.body.position.x > bedZone.x - bedZone.w/2 && targetPup.body.position.y > height - 200)) {
    aiState.targetId = null;
    aiState.mode = 'IDLE';
  }

  // State Machine
  if (aiState.mode === 'IDLE') {
    // Find closest active pup
    let closestDist = Infinity;
    let closestId = null;

    for (let p of activePups) {
      let d = dist(headPos.x, headPos.y, p.body.position.x, p.body.position.y);
      if (d < closestDist) {
        closestDist = d;
        closestId = p.id;
      }
    }

    if (closestId) {
      aiState.targetId = closestId;
      aiState.mode = 'CHASING';
    } else {
      // Rest position (hanging down)
      aiState.desiredPoint = { x: 150, y: height/2 + 100 };
    }
  }
  else if (aiState.mode === 'CHASING') {
    if (targetPup) {
      let tPos = targetPup.body.position;
      // Aim slightly above the pup to not smash it
      aiState.desiredPoint = { x: tPos.x, y: tPos.y - 50 };

      let d = dist(headPos.x, headPos.y, tPos.x, tPos.y);
      if (d < 80) {
        aiState.mode = 'DRAGGING';
      }
    }
  }
  else if (aiState.mode === 'DRAGGING') {
    if (targetPup) {
      // Move towards bed
      let bedTargetX = bedZone.x;
      let bedTargetY = height - 100;

      aiState.desiredPoint = { x: bedTargetX, y: bedTargetY };

      // Gently push the pup towards bed using physics collision logic implicitly
      // But let's add a little nudge force if close
      let d = dist(headPos.x, headPos.y, targetPup.body.position.x, targetPup.body.position.y);
      if (d < 100) {
        // We are close, guide it
        let dirToBed = { x: bedZone.x - targetPup.body.position.x, y: 0 }; // Mainly horizontal push
        let mag = Math.sqrt(dirToBed.x**2 + dirToBed.y**2);
        if (mag > 0) {
            Matter.Body.applyForce(targetPup.body, targetPup.body.position, {
                x: (dirToBed.x / mag) * 0.002,
                y: -0.005 // Lift slightly
            });
        }
      } else {
        // Lost grip
        aiState.mode = 'CHASING';
      }
    }
  }
}

function updateMomMotor() {
  if (!aiState.desiredPoint) return;

  let dx = aiState.desiredPoint.x - currentHeadTarget.x;
  let dy = aiState.desiredPoint.y - currentHeadTarget.y;
  let dTotal = Math.sqrt(dx*dx + dy*dy);

  let speedLimit = gui.sliders['Mom Speed'].value();

  if (dTotal > speedLimit) {
    let ratio = speedLimit / dTotal;
    currentHeadTarget.x += dx * ratio;
    currentHeadTarget.y += dy * ratio;
  } else {
    currentHeadTarget.x = aiState.desiredPoint.x;
    currentHeadTarget.y = aiState.desiredPoint.y;
  }

  // Clamp
  currentHeadTarget.x = constrain(currentHeadTarget.x, -50, width + 50);
  currentHeadTarget.y = constrain(currentHeadTarget.y, -50, height + 100);

  momController.pointA = currentHeadTarget;
}

function drawEnvironment() {
  // Floor
  noStroke();
  push();
  translate(width/2, height + 10, 0);
  fill(180, 160, 140); // Wood floor
  box(width, 20, 400);
  pop();

  // Bed Zone
  push();
  translate(bedZone.x, height - 10, 0);
  fill(colors.bed);
  box(bedZone.w, 10, 200); // Mattress

  // Bed Rails
  fill(255);
  translate(-bedZone.w/2, -30, 0);
  box(10, 60, 200);
  pop();
}

function drawMom() {
  // Draw Mom as a connected series of fluffy shapes
  noStroke();

  // Draw segments from tail to head
  for (let i = 0; i < momSegments.length; i++) {
    let seg = momSegments[i];
    let pos = seg.body.position;
    let angle = seg.body.angle;
    let r = seg.size / 2;

    push();
    translate(pos.x, pos.y, 0);
    rotateZ(angle);

    if (i < 3) {
      // Tail: Striped
      if (i % 2 === 0) fill(colors.dark);
      else fill(colors.fur);
      ellipsoid(r * 1.5, r, r);
    }
    else if (i === momSegments.length - 1) {
      // Head
      drawMomHead(r);
    }
    else {
      // Body
      fill(colors.fur);
      ellipsoid(r * 1.4, r, r);

      // Belly patch
      push();
      translate(0, r*0.5, 0);
      fill(colors.dark);
      ellipsoid(r, r*0.5, r*0.8);
      pop();
    }

    pop();
  }
}

function drawMomHead(r) {
  // Base head
  fill(colors.fur);
  sphere(r * 1.2);

  // Ears
  fill(colors.dark);
  push();
  translate(-r, -r, 0);
  sphere(r * 0.4);
  pop();
  push();
  translate(r, -r, 0);
  sphere(r * 0.4);
  pop();

  // White cheeks/eyebrows
  fill(colors.light);
  push();
  translate(-r*0.5, r*0.2, r*0.8);
  sphere(r * 0.4);
  pop();
  push();
  translate(r*0.5, r*0.2, r*0.8);
  sphere(r * 0.4);
  pop();

  // Eyes
  fill(10);
  push();
  translate(-r*0.4, 0, r*1.1);
  sphere(r * 0.15);
  pop();
  push();
  translate(r*0.4, 0, r*1.1);
  sphere(r * 0.15);
  pop();

  // Nose
  fill(10);
  push();
  translate(0, r*0.4, r*1.1);
  sphere(r * 0.15);
  pop();
}

function drawPups() {
  for (let p of pups) {
    let pos = p.body.position;
    let vel = p.body.velocity;
    let angVel = p.body.angularVelocity;

    // Determine heading based on velocity, smooth it
    let heading = 0;
    if (Math.abs(vel.x) > 0.1 || Math.abs(vel.y) > 0.1) {
      heading = Math.atan2(vel.y, vel.x);
      p.lastHeading = heading;
    } else {
      heading = p.lastHeading;
    }

    // Wiggle speed based on spin
    let wiggle = Math.sin(frameCount * 0.5 + Math.abs(angVel) * 10) * 0.5;

    push();
    translate(pos.x, pos.y, 0);

    // Rotate to face movement direction.
    // Adjust because atan2 0 is right, but we might draw facing right.
    rotateZ(heading);

    // Draw Pup
    scale(p.colorVar); // Size variation

    // Body
    noStroke();
    fill(colors.fur);
    ellipsoid(25, 15, 15);

    // Head offset forward
    push();
    translate(15, 0, 0);
    fill(colors.fur);
    sphere(12);

    // Face details
    fill(colors.light);
    translate(5, 2, 0);
    sphere(6); // Muzzle

    fill(0);
    translate(4, -2, 0);
    sphere(2); // Nose
    pop();

    // Tail offset back
    push();
    translate(-25, 0, 0);
    fill(colors.dark);
    ellipsoid(15, 5, 5);
    pop();

    // Legs (Wiggling)
    fill(colors.dark);

    // Front Left
    push();
    translate(10, 10, 10);
    rotateX(wiggle);
    ellipsoid(4, 8, 4);
    pop();

    // Front Right
    push();
    translate(10, 10, -10);
    rotateX(-wiggle);
    ellipsoid(4, 8, 4);
    pop();

    // Back Left
    push();
    translate(-10, 10, 10);
    rotateX(-wiggle);
    ellipsoid(4, 8, 4);
    pop();

    // Back Right
    push();
    translate(-10, 10, -10);
    rotateX(wiggle);
    ellipsoid(4, 8, 4);
    pop();

    pop();
  }
}

function drawHUD() {
  push();
  resetMatrix();
  fill(50, 30, 20);
  noStroke();
  textSize(14);
  textFont('Verdana');
  textAlign(LEFT, TOP);

  let activeCount = pups.filter(p => p.body.position.x < bedZone.x - bedZone.w/2).length;

  text(`MOM STATUS: ${aiState.mode}`, 30, height - 60);
  text(`PUPS AWAKE: ${activeCount}`, 30, height - 40);

  if (activeCount === 0 && pups.length > 0) {
    fill(0, 150, 50);
    textSize(20);
    text("ALL PUPS IN BED!", 30, height - 90);
  }

  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (physicsLoaded) {
    Matter.World.clear(world);
    Matter.Engine.clear(engine);
    momSegments = [];
    pups = [];
    boundaries = [];
    initPhysics();
  }
}
