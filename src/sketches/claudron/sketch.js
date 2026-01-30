

let bubbles = [];
let fumes = [];
let beakerFumes = [];
let fireParticles = [];
let stars = [];
let droplets = [];
let sparkles = [];
let runes = [];
let conveyorBottles = [];
let gears = [];
let arcs = [];
let lanterns = [];
let crystals = [];
let pumpBubbles = [];
let mouseParticles = [];

let magicBook;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Initialize atmosphere dust
  for(let i = 0; i < 50; i++) {
    stars.push({
      x: random(width),
      y: random(height),
      size: random(1, 3),
      alpha: random(50, 200)
    });
  }

  // Initialize Gears
  let gearCount = 5;
  for(let i=0; i<gearCount; i++) {
    gears.push(new Gear(random(width * 0.1, width * 0.4), random(height * 0.1, height * 0.4), random(30, 80)));
  }

  // Initialize Conveyor Bottles
  for(let i=0; i<6; i++) {
    conveyorBottles.push(new PotionBottle(i * (width/6)));
  }

  // Initialize Floating Book
  magicBook = new MagicBook(width * 0.85, height * 0.6);

  // Initialize Floating Crystals
  for(let i=0; i<3; i++) {
    crystals.push(new Crystal(i));
  }

  // Initialize Lanterns
  for(let i=0; i<3; i++) {
    lanterns.push(new Lantern(width * (0.2 + i * 0.3), random(100, 250)));
  }
}

function draw() {
  // --- Dark Atmosphere ---
  background(15, 12, 18);

  let cx = width / 2;
  let cy = height / 2 + 50;
  let cWidth = min(width, height) * 0.45;
  let cHeight = cWidth * 0.75;
  let tableY = cy + cHeight * 0.55;
  let liquidLevelY = cy - cHeight * 0.35;

  // --- Layer 0: Background (Windows, Wall, Shelves) ---
  drawFactoryBackground(tableY);

  // --- Layer 0.5: Liquid Pump System ---
  drawPumpSystem(width * 0.15, tableY);

  // Update and draw gears
  for(let g of gears) {
    g.update();
    g.display();
  }

  // --- Layer 1: Conveyor Belt (Behind Table) ---
  drawConveyorSystem(tableY - 150);

  // --- Layer 2: The Table ---
  drawTable(tableY);

  // --- Layer 3: Fire/Magic Aura ---
  drawFire(cx, tableY, cWidth * 0.6);

  // --- Layer 4: Cauldron Legs (Back) ---
  push();
  fill(25);
  noStroke();
  rect(cx - cWidth*0.3, cy + cHeight*0.3, cWidth*0.1, cHeight*0.4);
  rect(cx + cWidth*0.2, cy + cHeight*0.3, cWidth*0.1, cHeight*0.4);
  pop();

  // --- Layer 5: Cauldron Interior (Back Rim) ---
  push();
  fill(20);
  noStroke();
  ellipse(cx, liquidLevelY, cWidth, cWidth * 0.25);
  pop();

  // --- Layer 9: Cauldron Body (Front) ---
  drawCauldronBody(cx, cy, cWidth, cHeight);

  // --- Layer 10: Cauldron Legs (Front) ---
  drawFrontLegs(cx, cy, cWidth, cHeight, tableY);
  // --- Layer 6: Magic Liquid Surface ---
  drawLiquidSurface(cx, liquidLevelY, cWidth * 0.9, cWidth * 0.22);

  // --- Layer 6.5: Droplets ---
  handleDroplets(liquidLevelY, cx, cWidth * 0.8);

  // --- Layer 7: Bubbles ---
  if (frameCount % 10 === 0) {
    bubbles.push(new Bubble(cx, liquidLevelY, cWidth * 0.8, color(100, 255, 150)));
  }
  for (let i = bubbles.length - 1; i >= 0; i--) {
    let b = bubbles[i];
    b.update();
    b.display();
    if (b.isDead()) bubbles.splice(i, 1);
  }

  // --- Layer 8: Sparkles ---
  for (let i = sparkles.length - 1; i >= 0; i--) {
    let s = sparkles[i];
    s.update();
    s.display();
    if (s.isDead()) sparkles.splice(i, 1);
  }


  // --- Layer 11: Magic Fumes ---
  if (frameCount % 4 === 0) {
    fumes.push(new Fume(cx, cy - cHeight * 0.4, cWidth, color(random(20, 100), 255, random(100, 200))));
  }
  for (let i = fumes.length - 1; i >= 0; i--) {
    let f = fumes[i];
    f.update();
    f.display();
    if (f.isDead()) fumes.splice(i, 1);
  }

  // --- Layer 12: Mechanical Arm & Beaker ---
  let beakerX = cx + cWidth * 0.6;
  let beakerY = liquidLevelY - cHeight * 0.8;
  drawMechanicalArm(beakerX, beakerY);
  drawBeaker(beakerX, beakerY, cWidth * 0.3);

  // --- Layer 13: Magic Arcs (Tesla Coil Effect) ---
  if (frameCount % 45 === 0) {
    arcs.push(new MagicArc(width * 0.15, tableY - 100, cx, liquidLevelY));
  }
  for(let i = arcs.length -1; i>=0; i--){
    arcs[i].update();
    arcs[i].display();
    if(arcs[i].isDead()) arcs.splice(i,1);
  }

  // --- Layer 14: Floating Magic Book, Runes & Crystals ---
  magicBook.update();
  magicBook.display();

  for(let c of crystals) {
    c.update(magicBook.baseX, magicBook.y);
    c.display();
  }

  for (let i = runes.length - 1; i >= 0; i--) {
    let r = runes[i];
    r.update();
    r.display();
    if (r.isDead()) runes.splice(i, 1);
  }

  // --- Layer 15: Foreground Lanterns ---
  for(let l of lanterns) {
    l.update();
    l.display();
  }

  // --- Layer 16: Interactive Mouse Magic ---
  handleMouseMagic();

  // --- Layer 17: Vignette & Atmosphere ---
  drawVignette();
}

// ---------------------------------------------------------
// FACTORY SCENERY
// ---------------------------------------------------------

function drawFactoryBackground(floorY) {
  push();
  // Wall Texture
  noStroke();
  let brickH = 40;
  let brickW = 80;

  // Draw Windows first
  let winW = 100;
  let winH = 180;
  let winY = floorY * 0.2;
  for(let x = width * 0.2; x < width * 0.9; x += width * 0.3) {
    // Window Glow
    drawingContext.shadowBlur = 40;
    drawingContext.shadowColor = 'rgba(50, 60, 100, 0.8)';
    fill(10, 15, 30);
    rect(x - winW/2, winY, winW, winH, winW/2, winW/2, 0, 0);

    // Moon/Stars inside window
    push();
    clip(() => {
        rect(x - winW/2, winY, winW, winH, winW/2, winW/2, 0, 0);
    });
    fill(200, 200, 220, 200);
    circle(x + 20, winY + 40, 30); // Moon
    for(let i=0; i<10; i++) {
        fill(255, random(100,255));
        circle(x + random(-40, 40), winY + random(100), random(2));
    }
    pop();

    // Window Pane Bars
    stroke(0);
    strokeWeight(4);
    line(x, winY, x, winY + winH);
    line(x - winW/2, winY + winH*0.4, x + winW/2, winY + winH*0.4);
    drawingContext.shadowBlur = 0;
  }

  // Bricks overlay
  for(let y = 0; y < floorY; y += brickH) {
    let offset = (y / brickH) % 2 === 0 ? 0 : brickW / 2;
    for(let x = -brickW; x < width + brickW; x += brickW) {
      // Skip drawing bricks over windows approximately
      if (y > winY && y < winY + winH && (
          (x > width*0.2 - winW/2 && x < width*0.2 + winW/2) ||
          (x > width*0.5 - winW/2 && x < width*0.5 + winW/2) ||
          (x > width*0.8 - winW/2 && x < width*0.8 + winW/2)
      )) continue;

      let n = noise(x * 0.01, y * 0.01);
      fill(20 + n * 15, 20 + n * 15, 25 + n * 20);
      rect(x + offset, y, brickW - 2, brickH - 2, 2);
    }
  }

  // Pipes Background
  strokeWeight(15);
  noFill();
  stroke(40, 35, 30);

  // Horizontal Pipe
  beginShape();
  vertex(0, floorY * 0.3);
  vertex(width, floorY * 0.3);
  endShape();

  // Vertical drops
  strokeWeight(10);
  line(width * 0.1, floorY * 0.3, width * 0.1, floorY);
  line(width * 0.9, 0, width * 0.9, floorY * 0.3);

  // Shelves
  fill(30, 20, 10);
  noStroke();
  rect(0, floorY * 0.5, width * 0.3, 15);
  rect(width * 0.7, floorY * 0.2, width * 0.3, 15);

  // Shelf Items
  for(let i = 0; i < 5; i++) {
    fill(random(50, 100), random(50, 100), random(100, 200), 150);
    rect(20 + i * 40, floorY * 0.5 - 30, 25, 30, 2);
  }

  // Shadows
  let grad = drawingContext.createLinearGradient(0, 0, 0, floorY);
  grad.addColorStop(0, 'rgba(0,0,0,0.9)');
  grad.addColorStop(1, 'rgba(0,0,0,0.3)');
  drawingContext.fillStyle = grad;
  rect(0,0,width, floorY);
  pop();
}

function drawPumpSystem(x, floorY) {
    push();
    let pipeW = 30;

    // Glass Tube
    noFill();
    stroke(100, 200, 255, 50);
    strokeWeight(pipeW);
    line(x, 0, x, floorY);

    // Liquid inside
    strokeWeight(pipeW - 8);
    stroke(50, 255, 100, 100);
    line(x, 0, x, floorY);

    // Bubbles in pump
    if(frameCount % 15 === 0) {
        pumpBubbles.push({y: floorY, size: random(5, 12)});
    }

    noStroke();
    fill(200, 255, 200, 200);
    for(let i=pumpBubbles.length-1; i>=0; i--) {
        let pb = pumpBubbles[i];
        pb.y -= 3; // Move up
        ellipse(x, pb.y, pb.size);
        if(pb.y < 0) pumpBubbles.splice(i, 1);
    }

    // Metal rings
    stroke(60);
    strokeWeight(4);
    noFill();
    for(let y=50; y<floorY; y+=100) {
        rect(x - pipeW/2 - 2, y, pipeW + 4, 10);
    }
    pop();
}

function drawConveyorSystem(y) {
  push();
  // Belt
  fill(20);
  stroke(50);
  rect(0, y, width, 20);

  // Moving parts
  let offset = (frameCount * 2) % 40;
  fill(60);
  noStroke();
  for(let x = -40; x < width; x+=40) {
    rect(x + offset, y + 2, 5, 16);
  }

  // Bottles
  for(let b of conveyorBottles) {
    b.update();
    b.display(y);
  }
  pop();
}

function drawMechanicalArm(targetX, targetY) {
  push();
  stroke(80, 70, 60);
  strokeWeight(8);
  noFill();

  // Arm segments
  let jointX = targetX + 60;
  let jointY = targetY - 60;

  // Base to Joint
  line(width, targetY - 150, jointX, jointY);
  // Joint circle
  fill(50);
  ellipse(jointX, jointY, 15);
  // Joint to Clamp
  noFill();
  line(jointX, jointY, targetX, targetY);

  // Clamp
  stroke(100, 90, 80);
  strokeWeight(4);
  line(targetX - 20, targetY, targetX + 20, targetY); // Clamp bar
  line(targetX - 20, targetY, targetX - 20, targetY + 20);
  line(targetX + 20, targetY, targetX + 20, targetY + 20);
  pop();
}

// ---------------------------------------------------------
// CORE DRAWING HELPERS
// ---------------------------------------------------------

function handleMouseMagic() {
    if (movedX !== 0 || movedY !== 0) {
        mouseParticles.push(new Sparkle(mouseX, mouseY));
        if(frameCount % 5 === 0) {
            fumes.push(new Fume(mouseX, mouseY, 10, color(255, 0, 200)));
        }
    }

    for(let i=mouseParticles.length-1; i>=0; i--) {
        let p = mouseParticles[i];
        p.update();
        p.display();
        if(p.isDead()) mouseParticles.splice(i, 1);
    }
}

function handleDroplets(surfaceY, cx, surfaceW) {
  // Beaker spout position logic
  let cWidth = min(width, height) * 0.45;
  let beakerX = cx + cWidth * 0.6;
  let beakerY = (surfaceY) - (cWidth * 0.75) * 0.8;
  let spoutX = beakerX - 40;
  let spoutY = beakerY + 40;

  if (frameCount % 30 === 0) {
    droplets.push(new Droplet(spoutX, spoutY, surfaceY));
  }

  for (let i = droplets.length - 1; i >= 0; i--) {
    let d = droplets[i];
    d.update();
    d.display();

    if (d.y >= surfaceY) {
      // Reaction!
      for(let k=0; k<6; k++) {
        let col = random() > 0.5 ? color(200, 50, 255) : color(100, 255, 100);
        let b = new Bubble(d.x, surfaceY, surfaceW, col);
        b.speed *= 2;
        bubbles.push(b);
      }
      for(let k=0; k<8; k++) {
        sparkles.push(new Sparkle(d.x, surfaceY));
      }
      droplets.splice(i, 1);
    }
  }
}

function drawBeaker(x, y, size) {
  push();
  translate(x, y);
  rotate(PI / 4.5);

  let bW = size * 0.6;
  let bH = size * 1.0;
  let neckW = bW * 0.4;

  // Liquid
  push();
  noStroke();
  fill(138, 43, 226, 200);
  beginShape();
  vertex(-neckW/2, -bH/2);
  vertex(neckW/2, -bH/2);
  vertex(neckW/2, 0);
  vertex(bW/2, bH/2);
  vertex(-bW/2, bH/2);
  vertex(-neckW/2, 0);
  endShape(CLOSE);

  drawingContext.shadowBlur = 20;
  drawingContext.shadowColor = 'magenta';
  fill(160, 80, 255, 100);
  ellipse(0, bH/3, bW*0.6, bW*0.6);
  pop();

  // Glass
  noFill();
  strokeWeight(3);
  stroke(200, 200, 255, 100);

  beginShape();
  vertex(-neckW/2, -bH);
  vertex(-neckW/2, 0);
  vertex(-bW/2, bH/2);
  curveVertex(-bW/2, bH/2);
  curveVertex(0, bH/2 + 10);
  curveVertex(bW/2, bH/2);
  vertex(bW/2, bH/2);
  vertex(neckW/2, 0);
  vertex(neckW/2, -bH);
  endShape();
  ellipse(0, -bH, neckW, 10);

  stroke(255, 150);
  strokeWeight(2);
  line(-neckW/2 + 5, -bH + 10, -neckW/2 + 5, -10);
  arc(0, bH/3, bW*0.7, bH*0.4, PI*0.8, PI*1.2);

  // Steam
  if (frameCount % 5 === 0) {
    beakerFumes.push({
      x: 0,
      y: -bH,
      size: random(5, 15),
      alpha: 200,
      vx: random(-0.5, 0.5),
      vy: random(-1, -2)
    });
  }

  for(let i = beakerFumes.length-1; i>=0; i--) {
    let f = beakerFumes[i];
    f.x += f.vx;
    f.y += f.vy;
    f.x -= 0.5;
    f.size += 0.5;
    f.alpha -= 4;

    noStroke();
    fill(200, 100, 255, f.alpha);
    circle(f.x, f.y, f.size);
    if(f.alpha <= 0) beakerFumes.splice(i, 1);
  }
  pop();
}

function drawTable(y) {
  push();
  let tableH = height - y;
  let woodColor = color(45, 30, 20);
  fill(woodColor);
  noStroke();
  rect(0, y, width, tableH);

  stroke(60, 40, 30, 50);
  strokeWeight(2);
  for (let i = 0; i < tableH; i += 5 + i * 0.1) {
    line(0, y + i, width, y + i);
  }

  stroke(80, 60, 50);
  line(0, y, width, y);

  drawingContext.shadowBlur = 60;
  drawingContext.shadowColor = 'black';
  fill(0, 150);
  noStroke();
  ellipse(width/2, y + 20, min(width,height)*0.5, 40);
  drawingContext.shadowBlur = 0;
  pop();
}

function drawCauldronBody(cx, cy, cw, ch) {
  push();
  noStroke();
  let bodyGrad = drawingContext.createRadialGradient(cx - cw*0.2, cy - ch*0.2, cw*0.1, cx, cy, cw);
  bodyGrad.addColorStop(0, color(70, 70, 75));
  bodyGrad.addColorStop(0.5, color(30, 30, 35));
  bodyGrad.addColorStop(1, color(10, 10, 15));
  drawingContext.fillStyle = bodyGrad;

  arc(cx, cy - ch * 0.35, cw, ch * 1.6, 0, PI, CHORD);

  stroke(40);
  strokeWeight(cw * 0.06);
  noFill();
  arc(cx, cy - ch * 0.35, cw, cw * 0.25, 0, PI);

  stroke(120, 120, 130, 150);
  strokeWeight(cw * 0.015);
  arc(cx, cy - ch * 0.35, cw, cw * 0.25, 0.2, PI - 0.2);
  pop();
}

function drawFrontLegs(cx, cy, cWidth, cHeight, tableY) {
  push();
  let legGrad = drawingContext.createLinearGradient(0, cy, 0, tableY);
  legGrad.addColorStop(0, '#333');
  legGrad.addColorStop(1, '#111');
  drawingContext.fillStyle = legGrad;
  noStroke();

  beginShape(); // Left Front
  vertex(cx - cWidth*0.35, cy + cHeight*0.2);
  vertex(cx - cWidth*0.45, tableY + 10);
  vertex(cx - cWidth*0.35, tableY + 10);
  vertex(cx - cWidth*0.25, cy + cHeight*0.3);
  endShape(CLOSE);

  beginShape(); // Right Front
  vertex(cx + cWidth*0.35, cy + cHeight*0.2);
  vertex(cx + cWidth*0.45, tableY + 10);
  vertex(cx + cWidth*0.35, tableY + 10);
  vertex(cx + cWidth*0.25, cy + cHeight*0.3);
  endShape(CLOSE);
  pop();
}

function drawLiquidSurface(cx, cy, w, h) {
  push();
  let liqColor = color(50, 255, 100);
  drawingContext.shadowBlur = 30;
  drawingContext.shadowColor = color(50, 255, 100);
  fill(liqColor);
  noStroke();

  beginShape();
  for (let a = 0; a < TWO_PI; a += 0.1) {
    let x = cx + (w / 2) * cos(a);
    let y = cy + (h / 2) * sin(a);
    let wave = noise(x * 0.02, y * 0.02, frameCount * 0.05) * 10;
    vertex(x, y + wave - 5);
  }
  endShape(CLOSE);

  fill(0, 150, 50, 200);
  ellipse(cx, cy, w * 0.7, h * 0.7);
  pop();
}

function drawFire(cx, cy, w) {
  push();
  blendMode(ADD);
  noStroke();
  for(let i=0; i<4; i++) {
    fireParticles.push(new FireParticle(cx, cy, w));
  }
  for (let i = fireParticles.length - 1; i >= 0; i--) {
    let p = fireParticles[i];
    p.update();
    p.display();
    if (p.isDead()) fireParticles.splice(i, 1);
  }
  drawingContext.shadowBlur = 50;
  drawingContext.shadowColor = 'orange';
  fill(255, 100, 0, 20);
  ellipse(cx, cy, w, w * 0.2);
  pop();
}

function drawVignette() {
  push();
  blendMode(MULTIPLY);
  let grad = drawingContext.createRadialGradient(width/2, height/2, width*0.3, width/2, height/2, width);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.85)');
  drawingContext.fillStyle = grad;
  rect(0,0,width,height);

  blendMode(SCREEN);
  fill(200, 50);
  noStroke();
  for(let s of stars) {
    circle(s.x, s.y, s.size);
    s.y -= 0.2;
    if(s.y < 0) s.y = height;
  }
  pop();
}

// ---------------------------------------------------------
// CLASSES
// ---------------------------------------------------------

class Lantern {
  constructor(x, len) {
    this.x = x;
    this.len = len;
    this.angle = random(-0.1, 0.1);
    this.velocity = 0;
  }

  update() {
    let gravity = 0.005;
    let force = -gravity * sin(this.angle);
    this.velocity += force;
    this.velocity *= 0.99; // damping
    this.angle += this.velocity;

    // Mouse interaction wind
    if(dist(mouseX, mouseY, this.x, this.len) < 100) {
        this.velocity += (mouseX - pwinMouseX) * 0.001;
    }
  }

  display() {
    push();
    translate(this.x, 0);
    rotate(this.angle);

    // Chain
    stroke(20);
    strokeWeight(2);
    line(0,0,0,this.len);

    // Lantern Body
    translate(0, this.len);
    noStroke();
    fill(10);
    rect(-10, 0, 20, 30, 2);
    triangle(-15, 0, 15, 0, 0, -10);

    // Light
    drawingContext.shadowBlur = 30;
    drawingContext.shadowColor = 'orange';
    fill(255, 200, 50);
    rect(-6, 5, 12, 20);

    pop();
  }
}

class Crystal {
  constructor(index) {
    this.index = index;
    this.angle = (TWO_PI / 3) * index;
    this.dist = 60;
    this.size = random(10, 20);
    this.yOffset = 0;
  }

  update(centerX, centerY) {
    this.angle += 0.02;
    this.yOffset = sin(frameCount * 0.05 + this.index) * 10;
    this.x = centerX + cos(this.angle) * this.dist;
    this.y = centerY + sin(this.angle) * (this.dist * 0.5) + this.yOffset - 50;
  }

  display() {
    push();
    translate(this.x, this.y);
    rotate(frameCount * 0.02);
    noStroke();
    fill(100, 255, 255, 180);
    drawingContext.shadowBlur = 15;
    drawingContext.shadowColor = 'cyan';

    beginShape();
    vertex(0, -this.size);
    vertex(this.size*0.5, 0);
    vertex(0, this.size);
    vertex(-this.size*0.5, 0);
    endShape(CLOSE);
    pop();
  }
}

class Gear {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.teeth = floor(radius / 4);
    this.speed = random(-0.02, 0.02);
    this.angle = random(TWO_PI);
    this.color = color(random(40, 60), 40, 30);
  }

  update() {
    this.angle += this.speed;
  }

  display() {
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    fill(this.color);
    noStroke();

    // Draw teeth
    for (let i = 0; i < this.teeth; i++) {
      let a = TWO_PI * (i / this.teeth);
      let tx = cos(a) * (this.radius + 8);
      let ty = sin(a) * (this.radius + 8);
      push();
      translate(tx, ty);
      rotate(a);
      rectMode(CENTER);
      rect(0, 0, 10, 10);
      pop();
    }

    // Gear body
    ellipse(0, 0, this.radius * 2);
    fill(20);
    ellipse(0, 0, this.radius * 0.5); // Hole
    pop();
  }
}

class PotionBottle {
  constructor(x) {
    this.x = x;
    this.w = random(20, 35);
    this.h = random(30, 50);
    this.col = color(random(255), random(255), random(255));
    this.shape = random() > 0.5 ? 'rect' : 'round';
  }

  update() {
    this.x += 1; // Move right
    if(this.x > width + 50) {
      this.x = -50;
      this.col = color(random(255), random(255), random(255));
    }
  }

  display(y) {
    push();
    translate(this.x, y);
    fill(this.col);
    stroke(255, 100);
    strokeWeight(1);

    if(this.shape === 'rect') {
      rect(-this.w/2, -this.h, this.w, this.h);
      rect(-this.w/4, -this.h-10, this.w/2, 10); // neck
    } else {
      ellipse(0, -this.h/2, this.w, this.h);
      rect(-this.w/4, -this.h, this.w/2, 10); // neck
    }

    // Shine
    noStroke();
    fill(255, 100);
    rect(-this.w/4, -this.h*0.8, 5, this.h*0.5);
    pop();
  }
}

class MagicBook {
  constructor(x, y) {
    this.baseX = x;
    this.baseY = y;
    this.y = y;
    this.angle = 0;
  }

  update() {
    this.y = this.baseY + sin(frameCount * 0.03) * 15;

    // Spawn runes
    if(frameCount % 20 === 0) {
      runes.push(new Rune(this.baseX, this.y - 30));
    }
  }

  display() {
    push();
    translate(this.baseX, this.y);
    // Shadow
    noStroke();
    fill(0, 50);
    ellipse(0, 100, 60, 20);

    // Book
    rotate(0.2);
    fill(100, 50, 30); // Leather
    rect(-30, -40, 60, 80, 5);

    // Pages
    fill(240, 230, 200);
    for(let i=0; i<5; i++) {
       rect(-28 + i*2, -38 + i, 50, 76);
    }

    // Glow
    drawingContext.shadowBlur = 20;
    drawingContext.shadowColor = 'gold';
    fill(255, 215, 0);
    ellipse(0, 0, 20, 30); // Symbol on cover
    pop();
  }
}

class Rune {
  constructor(x, y) {
    this.x = x + random(-20, 20);
    this.y = y;
    this.chars = ["∆", "Ω", "∑", "∫", "⚡", "★"];
    this.char = random(this.chars);
    this.alpha = 255;
    this.size = random(12, 24);
  }

  update() {
    this.y -= 1.5;
    this.alpha -= 3;
    this.x += sin(frameCount * 0.1 + this.y) * 0.5;
  }

  display() {
    push();
    textAlign(CENTER);
    textSize(this.size);
    fill(255, 200, 50, this.alpha);
    drawingContext.shadowBlur = 10;
    drawingContext.shadowColor = 'orange';
    text(this.char, this.x, this.y);
    pop();
  }

  isDead() {
    return this.alpha <= 0;
  }
}

class MagicArc {
  constructor(x1, y1, x2, y2) {
    this.path = [];
    this.life = 15;

    let segments = 10;
    let dx = (x2 - x1) / segments;
    let dy = (y2 - y1) / segments;

    this.path.push({x: x1, y: y1});
    for(let i=1; i<segments; i++) {
      this.path.push({
        x: x1 + dx * i + random(-20, 20),
        y: y1 + dy * i + random(-20, 20)
      });
    }
    this.path.push({x: x2, y: y2});
  }

  update() {
    this.life--;
  }

  display() {
    push();
    noFill();
    stroke(100, 200, 255, map(this.life, 0, 15, 0, 255));
    strokeWeight(random(2, 5));
    blendMode(ADD);
    drawingContext.shadowBlur = 20;
    drawingContext.shadowColor = 'cyan';

    beginShape();
    for(let p of this.path) {
      vertex(p.x, p.y);
    }
    endShape();
    pop();
  }

  isDead() { return this.life <= 0; }
}

class Droplet {
  constructor(x, y, targetY) {
    this.x = x;
    this.y = y;
    this.targetY = targetY;
    this.velY = 0;
    this.acc = 0.5;
    this.size = 8;
  }
  update() {
    this.velY += this.acc;
    this.y += this.velY;
  }
  display() {
    push();
    fill(138, 43, 226);
    noStroke();
    let len = map(this.velY, 0, 20, this.size, this.size * 3);
    ellipse(this.x, this.y, this.size, len);
    pop();
  }
}

class Sparkle {
  constructor(x, y) {
    this.x = x + random(-20, 20);
    this.y = y + random(-10, 10);
    this.size = random(2, 10);
    this.life = 255;
    this.color = random() > 0.5 ? color(255) : color(255, 0, 255);
  }
  update() {
    this.life -= 10;
    this.size *= 0.9;
    this.y -= 1;
  }
  display() {
    push();
    noStroke();
    fill(red(this.color), green(this.color), blue(this.color), this.life);
    blendMode(ADD);
    translate(this.x, this.y);
    rotate(frameCount * 0.2);
    beginShape();
    for(let i=0; i<4; i++) {
      let angle = TWO_PI / 4 * i;
      vertex(cos(angle) * this.size, sin(angle) * this.size);
      vertex(0,0);
    }
    endShape(CLOSE);
    pop();
  }
  isDead() { return this.life <= 0; }
}

class Bubble {
  constructor(cx, cy, w, col) {
    this.cx = cx;
    this.w = w;
    this.r = random(5, 15);
    this.col = col;
    let angle = random(TWO_PI);
    let dist = random(w * 0.4);
    this.x = cx + cos(angle) * dist;
    this.y = cy + sin(angle) * (dist * 0.3);
    this.speed = random(1, 2.5);
    this.alpha = 255;
  }
  update() {
    this.y -= this.speed;
    this.x += sin(frameCount * 0.05 + this.y) * 0.5;
    this.alpha -= 2;
  }
  display() {
    push();
    noStroke();
    fill(red(this.col), green(this.col), blue(this.col), this.alpha);
    drawingContext.shadowBlur = 10;
    drawingContext.shadowColor = this.col;
    circle(this.x, this.y, this.r);
    fill(255, this.alpha);
    circle(this.x - this.r*0.2, this.y - this.r*0.2, this.r * 0.3);
    pop();
  }
  isDead() { return this.alpha <= 0; }
}

class Fume {
  constructor(cx, cy, cw, col) {
    this.x = cx + random(-cw * 0.4, cw * 0.4);
    this.y = cy;
    this.vx = random(-0.5, 0.5);
    this.vy = random(-1, -3);
    this.size = random(20, 50);
    this.alpha = 150;
    this.color = col;
  }
  update() {
    this.x += this.vx + (noise(frameCount * 0.01, this.y * 0.01) - 0.5) * 2;
    this.y += this.vy;
    this.size += 0.3;
    this.alpha -= 1.5;
  }
  display() {
    push();
    noStroke();
    fill(red(this.color), green(this.color), blue(this.color), this.alpha * 0.2);
    blendMode(ADD);
    circle(this.x, this.y, this.size);
    pop();
  }
  isDead() { return this.alpha <= 0; }
}

class FireParticle {
  constructor(cx, cy, w) {
    this.x = cx + random(-w*0.4, w*0.4);
    this.y = cy + random(-5, 5);
    this.vx = random(-0.5, 0.5);
    this.vy = random(-1, -4);
    this.size = random(10, 30);
    this.life = 255;
    this.maxLife = 255;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.size *= 0.94;
    this.life -= 8;
  }
  display() {
    fill(255, this.life, 50, this.life * 0.6);
    circle(this.x, this.y, this.size);
  }
  isDead() { return this.life <= 0; }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // Re-center objects
  if(magicBook) {
    magicBook.baseX = width * 0.85;
    magicBook.baseY = height * 0.6;
  }
  // Re-distribute lanterns
  lanterns = [];
  for(let i=0; i<3; i++) {
    lanterns.push(new Lantern(width * (0.2 + i * 0.3), random(100, 250)));
  }
  // Re-distribute gears
  gears = [];
  for(let i=0; i<5; i++) {
    gears.push(new Gear(random(width * 0.1, width * 0.4), random(height * 0.1, height * 0.4), random(30, 80)));
  }
}
