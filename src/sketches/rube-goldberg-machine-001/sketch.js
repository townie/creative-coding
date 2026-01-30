

let physicsLoaded = false;
let engine, world;
let runner;
let cameraPos = { x: 0, y: 0 };
let targetBody = null;
let particles = [];

// Game State objects
let tennisBall, orange, rubiksCube;

// Color Palettes
const bgCol = [240, 240, 235];
const woodCol = [210, 180, 140];

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Inject Matter.js
  let script = createElement('script');
  script.attribute('src', 'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js');
  script.elt.onload = () => {
    physicsLoaded = true;
    initPhysics();
  };
  document.head.appendChild(script.elt);
}

function initPhysics() {
  const { Engine, World, Bodies, Composite, Constraint, Runner, Body } = Matter;

  engine = Engine.create();
  world = engine.world;

  // Improve simulation stability
  engine.positionIterations = 10;
  engine.velocityIterations = 10;

  // --- STAGE 1: The Shelf & Tennis Ball ---

  // High Shelf (Ramp) - Angle steepened slightly for momentum
  Composite.add(world, Bodies.rectangle(180, 180, 400, 20, {
    isStatic: true,
    angle: Math.PI * 0.12,
    label: 'shelf',
    friction: 0.1
  }));

  // Tennis Ball - Positioned to roll cleanly
  tennisBall = Bodies.circle(50, 80, 20, {
    restitution: 0.7,
    friction: 0.01,
    density: 0.04,
    label: 'tennisBall'
  });
  Composite.add(world, tennisBall);
  targetBody = tennisBall;

  // --- STAGE 2: The Books (Dominoes) ---

  // Table for books
  Composite.add(world, Bodies.rectangle(600, 320, 600, 20, {
    isStatic: true,
    label: 'table',
    friction: 1.0 // High friction so books don't slide
  }));

  // Create Books
  // Start x at 400 to ensure ball hits first book
  for (let i = 0; i < 12; i++) {
    let h = 70;
    let w = 12;
    let book = Bodies.rectangle(400 + i * 35, 275, w, h, {
      density: 0.04, // Heavier to knock next one
      friction: 0.8, // Grip the table
      restitution: 0.0,
      label: 'book',
      render: {
        fillStyle: [random(60, 180), random(60, 180), random(80, 200)]
      }
    });
    Composite.add(world, book);
  }

  // --- STAGE 3: The Orange (Trigger) ---

  // Resting at edge, close enough to be hit by last book
  // Increased density so it falls through Plinko with authority
  orange = Bodies.circle(830, 300, 17, {
    density: 0.08,
    restitution: 0.1,
    friction: 0.0,
    label: 'orange'
  });
  Composite.add(world, orange);

  // --- STAGE 4: Pegboard (Plinko) ---
  // Shifted LEFT so output hits the left side of the catapult

  let plinkoX = 850;
  let plinkoY = 600;

  // Walls (Funneling down)
  Composite.add(world, Bodies.rectangle(plinkoX - 120, plinkoY, 20, 500, { isStatic: true, label: 'wall', angle: -0.05 }));
  Composite.add(world, Bodies.rectangle(plinkoX + 120, plinkoY, 20, 500, { isStatic: true, label: 'wall', angle: 0.05 }));

  // Pegs
  // Spacing adjusted to prevent jamming
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 4; col++) {
      let x = (plinkoX - 75) + col * 50 + (row % 2) * 25;
      let y = (plinkoY - 200) + row * 50;
      let peg = Bodies.circle(x, y, 4, {
        isStatic: true,
        label: 'pushpin',
        restitution: 0.5
      });
      Composite.add(world, peg);
    }
  }

  // --- STAGE 5: The Catapult (Household items) ---

  // Pivot needs to be to the right of where the orange falls
  // Orange falls approx at x=850. Pivot should be at x=1000.
  let pivotX = 1000;
  let pivotY = 900;

  // Pivot: Soup Can
  let soupCan = Bodies.circle(pivotX, pivotY, 30, {
    isStatic: true,
    label: 'soupCan'
  });
  Composite.add(world, soupCan);

  // Plank: Yardstick
  // Length 500. Center at pivot. Left side extends to ~750 (under plinko)
  let yardstick = Bodies.rectangle(pivotX, pivotY - 35, 500, 15, {
    density: 0.02,
    label: 'yardstick',
    friction: 0.5
  });
  Composite.add(world, yardstick);

  // Constraint (Stiff hinge)
  let joint = Constraint.create({
    bodyA: yardstick,
    pointA: { x: 0, y: 0 },
    bodyB: soupCan,
    length: 0,
    stiffness: 1.0,
    render: { visible: false }
  });
  Composite.add(world, joint);

  // Payload: Rubik's Cube
  // Placed on the far right end. Lighter than orange to ensure launch.
  rubiksCube = Bodies.rectangle(pivotX + 200, 850, 35, 35, {
    density: 0.002,
    restitution: 0.5,
    friction: 0.5,
    label: 'rubiksCube'
  });
  Composite.add(world, rubiksCube);

  // --- STAGE 6: The Laundry Basket (Catcher) ---

  // Positioned to catch the trajectory
  let basketX = 1450;
  let basketY = 700;

  // Bottom
  Composite.add(world, Bodies.rectangle(basketX, basketY + 50, 160, 10, {
    isStatic: true, label: 'basketPlastic'
  }));
  // Left Wall
  Composite.add(world, Bodies.rectangle(basketX - 75, basketY, 10, 110, {
    isStatic: true, label: 'basketPlastic', angle: -0.1
  }));
  // Right Wall
  Composite.add(world, Bodies.rectangle(basketX + 75, basketY, 10, 110, {
    isStatic: true, label: 'basketPlastic', angle: 0.1
  }));
  // Backboard (to stop overshoot)
  Composite.add(world, Bodies.rectangle(basketX + 120, basketY - 100, 10, 300, {
    isStatic: true, label: 'wall', render: { visible: false } // Invisible backboard helper
  }));

  // --- RUN ---
  runner = Runner.create();
  Runner.run(runner, engine);
}

function draw() {
  background(bgCol);

  if (!physicsLoaded) {
    fill(50);
    textAlign(CENTER);
    textSize(20);
    text("Loading Physics Engine...", width / 2, height / 2);
    return;
  }

  // --- Camera Logic ---
  // Smart switching based on object activity
  let destBody = tennisBall;

  if (targetBody === tennisBall) {
    // If ball falls off shelf or hits books
    if (tennisBall.position.x > 350 && tennisBall.position.y > 250) {
       // Look at the domino chain progressing
       let bodies = Matter.Composite.allBodies(world);
       let movingBook = bodies.find(b => b.label === 'book' && b.angularVelocity > 0.05 && b.position.x > 600);
       if(movingBook) destBody = movingBook;

       // If last book is moving or orange is moving
       if (orange.speed > 0.5 || orange.position.y > 350) {
         targetBody = orange;
       }
    }
  }

  if (targetBody === orange) {
    destBody = orange;
    // Once orange hits the catapult (low y), switch to cube
    if (orange.position.y > 800) {
      targetBody = rubiksCube;
    }
  }

  if (targetBody === rubiksCube) {
    destBody = rubiksCube;
  }

  let targetPos = destBody.position;
  // Smooth follow
  let desiredX = width / 2 - targetPos.x;
  let desiredY = height / 2 - targetPos.y;

  // Clamp Y to not show too much empty sky/floor
  desiredY = constrain(desiredY, -500, 200);

  cameraPos.x = lerp(cameraPos.x, desiredX, 0.08);
  cameraPos.y = lerp(cameraPos.y, desiredY, 0.08);

  push();
  translate(cameraPos.x, cameraPos.y);

  drawBackgroundDetail();

  // Draw Bodies
  let bodies = Matter.Composite.allBodies(world);
  for (let b of bodies) {
    drawHouseholdItem(b);
  }

  // Check Win Condition (Cube in basket)
  if (rubiksCube.position.x > 1350 && rubiksCube.position.x < 1550 && rubiksCube.position.y > 650) {
    spawnConfetti(rubiksCube.position.x, rubiksCube.position.y - 50);
    noStroke();
    fill(50, 200, 50);
    textAlign(CENTER);
    textSize(20);
    text("SUCCESS!", rubiksCube.position.x, rubiksCube.position.y - 100);
  }

  drawParticles();

  pop();

  drawUI();
}

// --- Custom Renderer ---
function drawHouseholdItem(body) {
  if (body.render.visible === false) return;

  push();
  translate(body.position.x, body.position.y);
  rotate(body.angle);

  const label = body.label;

  if (label === 'tennisBall') {
    drawTennisBall(body.circleRadius);
  } else if (label === 'book') {
    drawBook(body);
  } else if (label === 'orange') {
    drawOrange(body.circleRadius);
  } else if (label === 'pushpin') {
    drawPushpin(body.circleRadius);
  } else if (label === 'shelf' || label === 'table') {
    drawWoodPlank(body);
  } else if (label === 'yardstick') {
    drawYardstick(body);
  } else if (label === 'soupCan') {
    drawSoupCan(body.circleRadius);
  } else if (label === 'rubiksCube') {
    drawRubiksCube(35);
  } else if (label === 'basketPlastic') {
    drawBasketPart(body);
  } else if (label === 'wall') {
    fill(200);
    stroke(180);
    rectMode(CENTER);
    let w = dist(body.vertices[0].x, body.vertices[0].y, body.vertices[1].x, body.vertices[1].y);
    let h = dist(body.vertices[1].x, body.vertices[1].y, body.vertices[2].x, body.vertices[2].y);
    rect(0, 0, w, h);
  } else {
    // Fallback
    fill(150);
    noStroke();
    beginShape();
    for (let v of body.vertices) {
        let lx = (v.x - body.position.x) * Math.cos(-body.angle) - (v.y - body.position.y) * Math.sin(-body.angle);
        let ly = (v.x - body.position.x) * Math.sin(-body.angle) + (v.y - body.position.y) * Math.cos(-body.angle);
        vertex(lx, ly);
    }
    endShape(CLOSE);
  }

  pop();
}

// --- Item Drawing Functions ---

function drawTennisBall(r) {
  fill(210, 255, 60);
  stroke(200, 240, 50);
  strokeWeight(2);
  ellipse(0, 0, r * 2);

  noFill();
  stroke(255, 255, 255, 200);
  strokeWeight(2);
  arc(0, 0, r * 1.5, r * 1.5, 0, PI);
  arc(0, 0, r * 1.5, r * 1.5, PI + 0.5, TWO_PI - 0.5);
}

function drawOrange(r) {
  fill(255, 140, 0);
  noStroke();
  ellipse(0, 0, r * 2);
  fill(200, 100, 0, 100);
  for(let i=0; i<5; i++) ellipse(random(-r/2, r/2), random(-r/2, r/2), 2, 2);
  fill(50, 100, 50);
  ellipse(0, -r+2, 6, 4);
}

function drawBook(body) {
  let w = 12;
  let h = 70;
  let col = body.render.fillStyle;

  rectMode(CENTER);
  fill(col[0], col[1], col[2]);
  stroke(30);
  strokeWeight(1);
  rect(0, 0, w, h, 1);

  // Spine
  fill(255, 255, 255, 150);
  rect(0, -h/4, w-2, 4);
}

function drawPushpin(r) {
  fill(200, 50, 50);
  noStroke();
  ellipse(0, 0, r * 2.5);
  fill(100);
  ellipse(0, 0, r);
}

function drawWoodPlank(body) {
  let w = dist(body.vertices[0].x, body.vertices[0].y, body.vertices[1].x, body.vertices[1].y);
  let h = dist(body.vertices[1].x, body.vertices[1].y, body.vertices[2].x, body.vertices[2].y);

  rectMode(CENTER);
  fill(139, 69, 19);
  stroke(100, 50, 10);
  rect(0, 0, w, h, 2);
  stroke(160, 82, 45);
  line(-w/2 + 10, 0, w/2 - 10, 0);
}

function drawYardstick(body) {
  let w = 500;
  let h = 15;

  rectMode(CENTER);
  fill(240, 220, 100);
  stroke(200, 180, 50);
  rect(0, 0, w, h);

  stroke(0);
  strokeWeight(1);
  for(let x = -w/2 + 10; x < w/2; x+=15) {
    let len = (Math.abs(x) % 60 < 10) ? h * 0.6 : h * 0.3;
    line(x, -h/2, x, -h/2 + len);
  }
}

function drawSoupCan(r) {
  fill(200);
  stroke(150);
  ellipse(0, 0, r * 2);
  fill(220, 20, 20);
  ellipse(0, 0, r * 1.6);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(8);
  noStroke();
  text("TOMATO", 0, 0);
}

function drawRubiksCube(size) {
  rectMode(CENTER);
  stroke(0);
  strokeWeight(1.5);

  let cellSize = size / 3;
  let offset = -size/2 + cellSize/2;

  for(let i=0; i<3; i++) {
    for(let j=0; j<3; j++) {
      let colors = ['#ffffff', '#b90000', '#0045ad', '#009b48', '#ffd500', '#ff5900'];
      let colIdx = (i * 2 + j * 3) % colors.length;
      fill(colors[colIdx]);
      rect(offset + i*cellSize, offset + j*cellSize, cellSize, cellSize);
    }
  }
}

function drawBasketPart(body) {
  let w = dist(body.vertices[0].x, body.vertices[0].y, body.vertices[1].x, body.vertices[1].y);
  let h = dist(body.vertices[1].x, body.vertices[1].y, body.vertices[2].x, body.vertices[2].y);

  rectMode(CENTER);
  fill(100, 200, 255, 200);
  noStroke();
  rect(0, 0, w, h, 4);

  stroke(255, 255, 255, 100);
  strokeWeight(1);
  if (w > h) {
      for(let x=-w/2; x<w/2; x+=15) line(x, -h/2, x, h/2);
  } else {
      for(let y=-h/2; y<h/2; y+=15) line(-w/2, y, w/2, y);
  }
}

function drawBackgroundDetail() {
  stroke(200);
  strokeWeight(2);
  line(-2000, 1000, 4000, 1000); // Floor

  stroke(230);
  strokeWeight(1);
  let gridSize = 100;
  let startX = Math.floor(-cameraPos.x / gridSize) * gridSize;
  let endX = startX + width + gridSize;
  let startY = Math.floor(-cameraPos.y / gridSize) * gridSize;
  let endY = startY + height + gridSize;

  for (let x = startX; x < endX; x += gridSize) {
    line(x, startY, x, endY);
  }
}

function drawUI() {
    fill(50);
    noStroke();
    textSize(24);
    textStyle(BOLD);
    textAlign(LEFT, TOP);
    text("HOUSEHOLD RUBE GOLDBERG", 20, 20);

    textSize(14);
    textStyle(NORMAL);
    text("Tennis Ball -> Dominoes -> Orange -> Plinko -> Catapult -> Basket", 20, 55);

    fill(200, 50, 50);
    rect(width - 120, 20, 100, 30, 5);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(14);
    text("RESET", width - 70, 35);
}

function mousePressed() {
    if (mouseX > width - 120 && mouseX < width - 20 && mouseY > 20 && mouseY < 50) {
        resetSimulation();
    }
}

function resetSimulation() {
    Matter.World.clear(world);
    Matter.Engine.clear(engine);
    particles = [];
    cameraPos = {x: 0, y: 0};
    initPhysics();
}

function spawnConfetti(x, y) {
    if (frameCount % 3 === 0) {
        for(let i=0; i<5; i++) {
            particles.push({
                x: x,
                y: y,
                vx: random(-5, 5),
                vy: random(-10, -2),
                col: [random(255), random(255), random(255)],
                angle: random(TWO_PI),
                spin: random(-0.2, 0.2),
                life: 255
            });
        }
    }
}

function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.angle += p.spin;
        p.life -= 4;

        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }

        push();
        translate(p.x, p.y);
        rotate(p.angle);
        fill(p.col[0], p.col[1], p.col[2], p.life);
        noStroke();
        rect(0, 0, 6, 3);
        pop();
    }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
