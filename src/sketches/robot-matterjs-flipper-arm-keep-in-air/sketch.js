let physicsLoaded = false;
let engine, world;
let Matter;

// Physics objects
let armSegments = [];
let debris = [];
let boundaries = [];
let armController; // The constraint moving the arm
let currentArmTarget = { x: 0, y: 0 }; // For smoothing movement

// Visuals
let robotColor;
let debrisColor;

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

  robotColor = color(0, 255, 200);
  debrisColor = color(255, 50, 100);

  // Initialize GUI
  createGUI();
}

function createGUI() {
  // Style string for reuse
  const panelStyle = `
    background: rgba(0, 0, 0, 0.8);
    color: #fff;
    padding: 20px;
    border-radius: 8px;
    font-family: monospace;
    width: 250px;
    display: none;
    flex-direction: column;
    gap: 10px;
    border: 1px solid #00ffc8;
    box-shadow: 0 0 15px rgba(0, 255, 200, 0.2);
  `;

  const labelStyle = `
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    margin-bottom: 2px;
  `;

  // Hamburger / Toggle Button
  gui.toggleBtn = createButton('☰ CONTROLS');
  gui.toggleBtn.position(20, 20);
  gui.toggleBtn.style(`
    background: #000;
    color: #00ffc8;
    border: 1px solid #00ffc8;
    padding: 10px 15px;
    font-family: monospace;
    font-weight: bold;
    cursor: pointer;
    z-index: 1000;
  `);
  gui.toggleBtn.mousePressed(() => {
    gui.visible = !gui.visible;
    gui.panel.style('display', gui.visible ? 'flex' : 'none');
  });

  // Panel Container
  gui.panel = createDiv('');
  gui.panel.position(20, 70);
  gui.panel.style(panelStyle);
  gui.panel.style('z-index', '999');

  // Helper to create slider with label
  function addControl(label, min, max, val, step) {
    let container = createDiv('');
    container.parent(gui.panel);
    container.style('display: flex; flex-direction: column; margin-bottom: 10px;');

    let txt = createDiv(`<span>${label}</span> <span id="val-${label}">${val}</span>`);
    txt.parent(container);
    txt.style(labelStyle);

    let s = createSlider(min, max, val, step);
    s.parent(container);
    s.style('width', '100%');
    s.input(() => {
      select(`#val-${label}`).html(s.value());
    });

    gui.sliders[label] = s;
  }

  // Add Sliders
  addControl('Motor Speed', 5, 100, 25, 1);     // Limits how fast the target point moves
  addControl('Arm Power', 0.01, 1.0, 0.1, 0.01); // Stiffness of the pull
  addControl('Max Velocity', 5, 50, 20, 1);      // Clamps physics body speed
  addControl('Gravity', 0, 2, 1, 0.1);
  addControl('Time Scale', 0.1, 2.0, 1.0, 0.1);
}

function initPhysics() {
  let Engine = Matter.Engine,
      World = Matter.World,
      Bodies = Matter.Bodies,
      Constraint = Matter.Constraint;

  engine = Engine.create();
  world = engine.world;

  // Standard gravity
  engine.gravity.y = 1;

  // 1. Create Boundaries
  let thickness = 200;
  let ground = Bodies.rectangle(width / 2, height + thickness/2, width, thickness, { isStatic: true, friction: 1.0 });
  let wallLeft = Bodies.rectangle(-thickness/2, height / 2, thickness, height, { isStatic: true });
  let wallRight = Bodies.rectangle(width + thickness/2, height / 2, thickness, height, { isStatic: true });
  let ceiling = Bodies.rectangle(width/2, -height*2, width, thickness, { isStatic: true });

  boundaries.push(ground, wallLeft, wallRight, ceiling);
  World.add(world, boundaries);

  // 2. Create Robotic Arm
  let segW = 160;
  let segH = 30;
  let segCount = 5;
  let startX = 0;
  let startY = height / 2;

  let prevBody = null;

  for (let i = 0; i < segCount; i++) {
    let x = startX + (i * segW * 0.8) + 40;
    let y = startY;

    let segment = Bodies.rectangle(x, y, segW, segH, {
      frictionAir: 0.05, // Increased air friction for stability
      density: 0.1,      // Heavier arm
      chamfer: { radius: 10 },
      collisionFilter: { group: -1 },
      restitution: 0.2
    });

    armSegments.push(segment);
    World.add(world, segment);

    let options = {
      bodyA: segment,
      stiffness: 0.9,
      length: 0,
      render: { visible: false }
    };

    if (i === 0) {
      options.pointB = { x: 0, y: startY };
      options.pointA = { x: -segW / 2 + 20, y: 0 };
    } else {
      options.bodyB = prevBody;
      options.pointA = { x: -segW / 2 + 10, y: 0 };
      options.pointB = { x: segW / 2 - 10, y: 0 };
    }

    let joint = Constraint.create(options);
    World.add(world, joint);
    prevBody = segment;
  }

  // 3. Add Controller Constraint
  let endEffector = armSegments[armSegments.length - 1];
  currentArmTarget = { x: width/2, y: height/2 };

  armController = Constraint.create({
    pointA: currentArmTarget,
    bodyB: endEffector,
    pointB: { x: segW/2, y: 0 },
    stiffness: 0.1, // Initial stiffness (will be overridden by GUI)
    damping: 0.1,
    length: 0,
    render: { visible: false }
  });
  World.add(world, armController);
}

function draw() {
  background(20, 20, 30);

  if (!physicsLoaded) {
    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(20);
    text("Initializing Physics Engine...", 0, 0);
    return;
  }

  // --- PHYSICS CONTROL & LIMITATIONS ---

  // 1. Update Engine Parameters from GUI
  engine.gravity.y = gui.sliders['Gravity'].value();
  engine.timing.timeScale = gui.sliders['Time Scale'].value();
  armController.stiffness = gui.sliders['Arm Power'].value();

  // 2. Safety Clamp (Prevent explosions)
  let maxVel = gui.sliders['Max Velocity'].value();
  for (let body of armSegments) {
    if (body.speed > maxVel) {
      Matter.Body.setSpeed(body, maxVel);
    }
    // Limit angular velocity too
    if (Math.abs(body.angularVelocity) > 0.5) {
      Matter.Body.setAngularVelocity(body, Math.sign(body.angularVelocity) * 0.5);
    }
  }

  // --- GAME LOGIC ---

  // Spawn Debris
  if (frameCount % 40 === 0 && debris.length < 8) {
    let sz = random(40, 70);
    let posX = random(width * 0.3, width * 0.9);
    let box = Matter.Bodies.rectangle(posX, -100, sz, sz, {
      restitution: 0.8,
      friction: 0.001,
      density: 0.002
    });
    Matter.Body.setAngularVelocity(box, random(-0.2, 0.2));
    debris.push({ body: box, w: sz, h: sz, id: box.id });
    Matter.World.add(world, box);
  }

  // Cleanup Debris
  for (let i = debris.length - 1; i >= 0; i--) {
    let d = debris[i];
    if (d.body.position.y > height + 200 || d.body.position.y < -height * 2) {
      Matter.World.remove(world, d.body);
      debris.splice(i, 1);
    }
  }

  // AI Logic
  let desiredTarget = { x: width * 0.8, y: height / 2 };
  let bestTarget = null;
  let maxPriority = -Infinity;

  for (let d of debris) {
    let b = d.body;
    if (b.position.y >= height - 50) continue;

    let score = b.position.y + (b.velocity.y * 20);
    if (score > maxPriority) {
      maxPriority = score;
      bestTarget = b;
    }
  }

  if (bestTarget) {
    let interceptX = bestTarget.position.x + bestTarget.velocity.x * 5;
    let interceptY = bestTarget.position.y;
    let aimX = interceptX;
    let aimY = interceptY + 80;

    let endEffector = armSegments[armSegments.length - 1];
    let distToObj = dist(endEffector.position.x, endEffector.position.y, interceptX, interceptY);

    if (distToObj < 150 && abs(endEffector.position.x - interceptX) < 100) {
      aimY = interceptY - 150;
      if (interceptX > width * 0.8) aimX -= 50;
      if (interceptX < width * 0.2) aimX += 50;
    }
    desiredTarget = { x: aimX, y: aimY };

    // Visualization
    push();
    translate(aimX - width/2, aimY - height/2, 0);
    noStroke();
    emissiveMaterial(255, 255, 0);
    sphere(8);
    pop();

    push();
    translate(bestTarget.position.x - width/2, bestTarget.position.y - height/2, 0);
    noFill();
    stroke(255, 0, 0);
    strokeWeight(2);
    circle(0, 0, 80);
    pop();
  } else {
    desiredTarget.y = height/2 + sin(frameCount * 0.05) * 100;
  }

  // Smooth Motor Movement (Kinematic Limit)
  // Instead of snapping the constraint point, move it towards target at max speed
  let dx = desiredTarget.x - currentArmTarget.x;
  let dy = desiredTarget.y - currentArmTarget.y;
  let distToTarget = Math.sqrt(dx*dx + dy*dy);
  let motorSpeed = gui.sliders['Motor Speed'].value();

  if (distToTarget > motorSpeed) {
    let ratio = motorSpeed / distToTarget;
    currentArmTarget.x += dx * ratio;
    currentArmTarget.y += dy * ratio;
  } else {
    currentArmTarget.x = desiredTarget.x;
    currentArmTarget.y = desiredTarget.y;
  }

  // Update Constraint Anchor
  armController.pointA = currentArmTarget;

  // Update Physics Engine
  Matter.Engine.update(engine);

  // --- RENDER 3D SCENE ---

  ambientLight(40);
  pointLight(255, 255, 255, 0, -height/2, 600);
  directionalLight(200, 200, 255, 1, 1, -1);

  push();
  translate(-width / 2, -height / 2, 0);

  // Draw Arm
  noStroke();
  specularMaterial(robotColor);
  shininess(80);

  for (let i = 0; i < armSegments.length; i++) {
    drawBody(armSegments[i], 160, 30, true);
  }

  // Draw Joints
  fill(30);
  for (let i = 0; i < armSegments.length; i++) {
    let pos = armSegments[i].position;
    push();
    translate(pos.x, pos.y, 16);
    sphere(12);
    pop();
  }

  // Base
  push();
  translate(0, height/2, 0);
  fill(50);
  sphere(30);
  pop();

  // Draw Debris
  for (let d of debris) {
    let hueVal = (d.id * 57) % 360;
    push();
    colorMode(HSB);
    fill(hueVal, 80, 90);
    colorMode(RGB);
    drawBody(d.body, d.w, d.h, false);
    pop();
  }

  // Draw Motor Target (Ghost)
  push();
  translate(currentArmTarget.x, currentArmTarget.y, 0);
  fill(0, 255, 200, 100);
  noStroke();
  sphere(5);
  pop();

  pop();
}

function drawBody(body, w, h, isRobot) {
  let pos = body.position;
  let angle = body.angle;

  push();
  translate(pos.x, pos.y, 0);
  rotateZ(angle);

  if (isRobot) {
    box(w, h, 30);
    push();
    translate(0, 0, 16);
    fill(0, 50);
    plane(w * 0.7, h * 0.5);
    pop();
  } else {
    box(w, h, w);
  }
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (physicsLoaded) {
    Matter.World.clear(world);
    Matter.Engine.clear(engine);
    debris = [];
    armSegments = [];
    boundaries = [];
    initPhysics();
  }
}
