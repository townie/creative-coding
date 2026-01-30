let snakes = [];
let particles = [];
let font;

// Biological Needs / Environment objects
let foodPos;
let riverZone;
let shelterZone;

// Combat Stats
let killsA = 0;
let killsB = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Define Environment Zones
  riverZone = { x: 50, y: height - 200, w: width - 100, h: 150 };
  shelterZone = { x: 50, y: 50, w: 250, h: 200 };
  spawnFood();

  // Create two snakes
  // Unit A (Green/Cyan) - Balanced
  let s1 = new Snake(24, 20, width * 0.2, height * 0.5, color(0, 255, 150), "UNIT A");
  // Unit B (Red/Orange) - Aggressive
  let s2 = new Snake(24, 20, width * 0.8, height * 0.5, color(255, 80, 80), "UNIT B");

  snakes.push(s1);
  snakes.push(s2);

  // Link enemies
  s1.setEnemy(s2);
  s2.setEnemy(s1);

  textFont('Courier New');
}

function spawnFood() {
  let margin = 100;
  let x = random(margin, width - margin);
  let y = random(margin, height - margin);
  foodPos = createVector(x, y);
}

function draw() {
  background(10, 12, 18);

  // Update and Draw Particles (Blood/Sparks)
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].show();
    if (particles[i].finished()) {
      particles.splice(i, 1);
    }
  }

  // Draw Environment
  drawEnvironment();

  // Draw Food
  drawFood();

  // Update and Draw Snakes
  for (let s of snakes) {
    s.update();
    s.show();
  }

  drawInterface();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  riverZone = { x: 50, y: height - 200, w: width - 100, h: 150 };
}

function keyPressed() {
  if (key === 'f' || key === 'F') dropFoodInFront();
}

function mousePressed() {
  foodPos = createVector(mouseX, mouseY);
}

function dropFoodInFront() {
  if (snakes.length === 0) return;
  let s = snakes[0];
  let dropDistance = 200;
  let dropVector = p5.Vector.fromAngle(s.heading);
  dropVector.mult(dropDistance);
  dropVector.add(s.pos);
  dropVector.x = constrain(dropVector.x, 60, width - 60);
  dropVector.y = constrain(dropVector.y, 60, height - 60);
  foodPos = dropVector;
}

function drawEnvironment() {
  // River (Water + Energy Regen)
  noStroke();
  fill(0, 100, 200, 40);
  rect(riverZone.x, riverZone.y, riverZone.w, riverZone.h);

  stroke(0, 150, 255, 50);
  strokeWeight(2);
  let time = millis() * 0.001;
  for (let i = 0; i < 10; i++) {
    let y = map(i, 0, 10, riverZone.y + 10, riverZone.y + riverZone.h - 10);
    let xOffset = sin(time + i) * 20;
    line(riverZone.x, y, riverZone.x + riverZone.w, y);
  }

  // Shelter (Health Regen)
  fill(40, 30, 20, 150);
  stroke(100, 80, 50);
  strokeWeight(2);
  rect(shelterZone.x, shelterZone.y, shelterZone.w, shelterZone.h);

  // Hatching
  stroke(100, 80, 50, 50);
  strokeWeight(1);
  for(let i = 0; i < shelterZone.w + shelterZone.h; i+=20) {
     let x1 = shelterZone.x + i;
     let y1 = shelterZone.y;
     let x2 = shelterZone.x;
     let y2 = shelterZone.y + i;
     if (x1 > shelterZone.x + shelterZone.w) {
       y1 += (x1 - (shelterZone.x + shelterZone.w));
       x1 = shelterZone.x + shelterZone.w;
     }
     if (y2 > shelterZone.y + shelterZone.h) {
       x2 += (y2 - (shelterZone.y + shelterZone.h));
       y2 = shelterZone.y + shelterZone.h;
     }
     line(x1, y1, x2, y2);
  }

  noStroke();
  fill(0, 255, 100);
  textSize(12);
  textAlign(LEFT, TOP);
  text("REGEN ZONE (SHELTER)", shelterZone.x + 10, shelterZone.y + 10);

  fill(100, 200, 255);
  text("WATER SOURCE (RIVER)", riverZone.x + 10, riverZone.y + 10);

  // Walls
  stroke(40, 60, 80);
  strokeWeight(2);
  noFill();
  rect(50, 50, width - 100, height - 100);
}

function drawFood() {
  if (!foodPos) return;
  let pulse = sin(millis() * 0.005) * 5;
  noStroke();
  fill(0, 255, 100, 50);
  ellipse(foodPos.x, foodPos.y, 40 + pulse, 40 + pulse);
  fill(50, 255, 150);
  ellipse(foodPos.x, foodPos.y, 15, 15);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(10);
  text("BIO-MASS", foodPos.x, foodPos.y - 30);
}

function drawInterface() {
  fill(0, 255, 255);
  noStroke();
  textSize(14);
  textAlign(LEFT, TOP);
  text("COMBAT SIMULATION v9.0 [SURVIVAL MODE]", 20, 20);

  // Scoreboard
  fill(0, 255, 150);
  text(`UNIT A WINS: ${killsA}`, 20, 40);
  fill(255, 80, 80);
  text(`UNIT B WINS: ${killsB}`, 20, 55);

  let startY = 90;
  let colWidth = 250;

  for(let i=0; i<snakes.length; i++) {
    let s = snakes[i];
    let xOffset = 20 + (i * colWidth);
    drawSnakeStats(s, xOffset, startY);
  }
}

function drawSnakeStats(snake, x, y) {
  fill(snake.baseColor);
  textSize(12);
  text(`>> ${snake.id} [${snake.state}]`, x, y);

  // Health Bar
  let barW = 180;
  let barH = 10;

  // Health
  fill(50); rect(x, y + 15, barW, barH);
  fill(255, 50, 50);
  rect(x, y + 15, map(snake.health, 0, 100, 0, barW), barH);
  fill(255); textSize(9); text(`HP: ${Math.floor(snake.health)}`, x + barW + 5, y + 15 + 8);

  // Energy/Needs
  let barY = y + 40;
  let spacing = 15;
  drawBar(x, barY, barW, 6, snake.needs.food, "HUNGER", color(0, 255, 100));
  drawBar(x, barY + spacing, barW, 6, snake.needs.water, "THIRST", color(0, 150, 255));

  // Status Text
  fill(200);
  text(`ACT: ${snake.currentPriority}`, x, barY + spacing * 2 + 10);
}

function drawBar(x, y, w, h, val, label, col) {
  fill(150); textSize(8); textAlign(LEFT, BOTTOM); text(label, x, y - 2);
  fill(30); rect(x, y, w, h);
  fill(col);
  let fillW = map(val, 0, 100, 0, w);
  rect(x, y, fillW, h);
}

// ------------------------------------------------------------------
// CLASSES
// ------------------------------------------------------------------

class Snake {
  constructor(numSegments, segLength, startX, startY, baseColor, id) {
    this.segments = [];
    this.numSegments = numSegments;
    this.segLength = segLength;
    this.time = random(100);
    this.baseColor = baseColor;
    this.id = id;

    this.pos = createVector(startX, startY);
    this.heading = random(TWO_PI);
    this.speed = 0;
    this.margin = 60;

    // Combat & Health
    this.health = 100;
    this.maxHealth = 100;
    this.enemy = null;
    this.attackCooldown = 0;
    this.lastHitTime = 0;
    this.state = "ALIVE"; // ALIVE, DEAD

    this.cpg = { freq: 0.1, amp: 0.5 };

    // Needs (0 = Satisfied, 100 = Desperate)
    this.needs = { food: 50, water: 50, shelter: 50 };
    this.currentPriority = "wandering";

    // Perception
    this.vision = { dist: 400, fov: PI / 1.5, detected: false, points: [] };

    for (let i = 0; i < numSegments; i++) {
      this.segments.push(new Vertebra(i, segLength));
    }
  }

  setEnemy(e) { this.enemy = e; }

  update() {
    if (this.state === "DEAD") {
      this.respawnTimer--;
      if (this.respawnTimer <= 0) this.respawn();
      return;
    }

    this.decideStrategy();
    this.adjustCPG();
    this.time += this.cpg.freq;

    // Metabolism & Cooldowns
    this.updateMetabolism();
    if (this.attackCooldown > 0) this.attackCooldown--;

    this.handleSteering();
    this.handleLocomotion();
    this.updateBody();
  }

  decideStrategy() {
    // Distance to enemy
    let dEnemy = this.enemy ? p5.Vector.dist(this.pos, this.enemy.pos) : 9999;
    let enemyWeak = this.enemy && this.enemy.health < 30;
    let selfWeak = this.health < 40;

    // Default Priority List
    // 1. Survival (Flee if dying)
    // 2. Needs (Eat/Drink if critical)
    // 3. Combat (Fight if strong or enemy is weak)
    // 4. Wander

    if (selfWeak && dEnemy < 300) {
      this.currentPriority = 'flee';
    } else if (this.needs.water > 80) {
      this.currentPriority = 'water';
    } else if (this.needs.food > 80) {
      this.currentPriority = 'food';
    } else if (dEnemy < 250 && (this.health > 60 || enemyWeak)) {
      this.currentPriority = 'fight';
    } else if (selfWeak) {
      this.currentPriority = 'shelter'; // Go heal
    } else if (this.needs.food > 50) {
      this.currentPriority = 'food';
    } else {
      this.currentPriority = 'wandering';
    }
  }

  adjustCPG() {
    let tf = 0.15, ta = 0.4;

    switch(this.currentPriority) {
      case 'fight': // Aggressive, fast, wide swings
        tf = 0.35; ta = 0.8;
        break;
      case 'flee': // Panic, very fast, tight wiggles
        tf = 0.5; ta = 0.3;
        break;
      case 'food': // Hunting focus
        tf = 0.25; ta = 0.6;
        break;
      case 'shelter': // Sluggish
        tf = 0.1; ta = 0.3;
        break;
    }

    // Strike Lunge
    if (this.attackCooldown > 40) { // Just attacked
        tf = 0.8; ta = 1.2;
    }

    this.cpg.freq = lerp(this.cpg.freq, tf, 0.1);
    this.cpg.amp = lerp(this.cpg.amp, ta, 0.1);
  }

  handleSteering() {
    let target = createVector(width/2, height/2);
    let force = 1.0;

    if (this.currentPriority === 'fight' && this.enemy) {
      // Aim for enemy head
      target = this.enemy.pos.copy();

      // Attack Logic
      let d = p5.Vector.dist(this.pos, this.enemy.pos);
      if (d < 60 && this.attackCooldown === 0) {
        this.attack(this.enemy);
      }
    }
    else if (this.currentPriority === 'flee' && this.enemy) {
      // Run away from enemy
      let diff = p5.Vector.sub(this.pos, this.enemy.pos);
      target = p5.Vector.add(this.pos, diff);
    }
    else if (this.currentPriority === 'food' && foodPos) {
      target = foodPos.copy();
    }
    else if (this.currentPriority === 'water') {
      target = createVector(riverZone.x + riverZone.w/2, riverZone.y + riverZone.h/2);
    }
    else if (this.currentPriority === 'shelter') {
      target = createVector(shelterZone.x + shelterZone.w/2, shelterZone.y + shelterZone.h/2);
    }
    else {
      // Wander
      let seedOffset = this.id === "UNIT A" ? 0 : 10000;
      target = createVector(
        noise(this.time * 0.1 + seedOffset) * width,
        noise(this.time * 0.1 + 1000 + seedOffset) * height
      );
    }

    let desired = p5.Vector.sub(target, this.pos);
    let desiredHeading = desired.heading();

    // Smooth Steering
    let angleDiff = desiredHeading - this.heading;
    while (angleDiff < -PI) angleDiff += TWO_PI;
    while (angleDiff > PI) angleDiff -= TWO_PI;

    let turnRate = (this.currentPriority === 'fight' || this.currentPriority === 'flee') ? 0.2 : 0.08;
    this.heading += constrain(angleDiff, -turnRate, turnRate);
  }

  attack(target) {
    this.attackCooldown = 60; // 1 second cooldown
    let dmg = random(10, 20);
    target.takeDamage(dmg);

    // Visuals
    for(let i=0; i<10; i++) {
      particles.push(new Particle(this.pos.x, this.pos.y, this.baseColor));
    }

    // Lunge forward physics
    let lunge = p5.Vector.fromAngle(this.heading);
    lunge.mult(20);
    this.pos.add(lunge);
  }

  takeDamage(amount) {
    this.health -= amount;
    this.lastHitTime = millis();

    // Blood particles
    for(let i=0; i<15; i++) {
      particles.push(new Particle(this.pos.x, this.pos.y, color(255, 0, 0)));
    }

    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    this.state = "DEAD";
    this.respawnTimer = 180; // 3 seconds
    // Update Score
    if (this.id === "UNIT A") killsB++;
    else killsA++;

    // Explosion of parts
    for(let i=0; i<50; i++) {
        particles.push(new Particle(this.pos.x, this.pos.y, this.baseColor));
    }
  }

  respawn() {
    this.state = "ALIVE";
    this.health = 100;
    this.needs = { food: 20, water: 20, shelter: 20 };
    this.pos = createVector(random(100, width-100), random(100, height-100));
    this.segments.forEach(s => s.pos.set(this.pos));
  }

  handleLocomotion() {
    let muscleOutput = this.cpg.freq * this.cpg.amp;
    let targetSpeed = muscleOutput * 45;

    // Health affects speed
    if (this.health < 30) targetSpeed *= 0.6;

    this.speed = lerp(this.speed, targetSpeed, 0.1);
    let vel = p5.Vector.fromAngle(this.heading);
    vel.mult(this.speed);
    this.pos.add(vel);

    // Wall Bouncing
    if (this.pos.x < this.margin || this.pos.x > width - this.margin ||
        this.pos.y < this.margin || this.pos.y > height - this.margin) {
       let v = p5.Vector.fromAngle(this.heading);
       if (this.pos.x < this.margin || this.pos.x > width - this.margin) v.x *= -1;
       if (this.pos.y < this.margin || this.pos.y > height - this.margin) v.y *= -1;
       this.heading = v.heading();
       this.pos.x = constrain(this.pos.x, this.margin, width-this.margin);
       this.pos.y = constrain(this.pos.y, this.margin, height-this.margin);
    }
  }

  updateBody() {
    for (let i = 0; i < this.segments.length; i++) {
      let seg = this.segments[i];
      let phase = this.time - (i * 0.35);
      let signalBase = Math.sin(phase) * this.cpg.amp;

      seg.neurons.left.stimulate(signalBase > 0 ? signalBase : 0);
      seg.neurons.right.stimulate(signalBase < 0 ? -signalBase : 0);
      seg.updateBiology();
    }

    this.segments[0].pos.set(this.pos.x, this.pos.y);
    this.segments[0].angle = this.heading + Math.sin(this.time)*0.2;

    for (let i = 1; i < this.segments.length; i++) {
      let prev = this.segments[i - 1];
      let curr = this.segments[i];
      let bend = (curr.muscles.right.tension - curr.muscles.left.tension) * 0.8;
      curr.angle = prev.angle + bend;
      let dx = Math.cos(curr.angle) * this.segLength;
      let dy = Math.sin(curr.angle) * this.segLength;
      curr.pos.set(prev.pos.x - dx, prev.pos.y - dy);
    }
  }

  updateMetabolism() {
    // Increase needs over time
    this.needs.food += 0.05;
    this.needs.water += 0.08;

    // Healing in Shelter
    if (this.pos.x > shelterZone.x && this.pos.x < shelterZone.x + shelterZone.w &&
        this.pos.y > shelterZone.y && this.pos.y < shelterZone.y + shelterZone.h) {
      this.health = min(this.health + 0.5, 100);
      this.needs.shelter = 0;
    } else {
      this.needs.shelter += 0.02;
    }

    // Drinking
    if (this.pos.x > riverZone.x && this.pos.x < riverZone.x + riverZone.w &&
        this.pos.y > riverZone.y && this.pos.y < riverZone.y + riverZone.h) {
      this.needs.water = max(this.needs.water - 2, 0);
    }

    // Eating
    if (foodPos && p5.Vector.dist(this.pos, foodPos) < 40) {
      this.needs.food = max(this.needs.food - 50, 0);
      this.health = min(this.health + 20, 100);
      spawnFood();
    }
  }

  show() {
    if (this.state === "DEAD") return;

    // Damage Flash
    let flash = false;
    if (millis() - this.lastHitTime < 100) flash = true;

    // Draw Spine
    noFill();
    stroke(flash ? 255 : this.baseColor);
    strokeWeight(2);
    beginShape();
    for (let s of this.segments) vertex(s.pos.x, s.pos.y);
    endShape();

    // Draw Segments
    for (let s of this.segments) s.show(flash ? color(255) : this.baseColor);

    // Head Features
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.heading);

    // Eyes
    fill(255);
    ellipse(5, -8, 6, 6);
    ellipse(5, 8, 6, 6);
    fill(0);
    ellipse(6, -8, 2, 2);
    ellipse(6, 8, 2, 2);

    // Teeth/Fangs if fighting
    if (this.currentPriority === 'fight') {
      fill(255);
      triangle(10, -5, 10, 5, 25, 0); // Beak/Fang
    }

    pop();
  }
}

class Vertebra {
  constructor(index, len) {
    this.index = index;
    this.len = len;
    this.pos = createVector(0, 0);
    this.angle = 0;
    this.neurons = { left: new Neuron(), right: new Neuron() };
    this.muscles = { left: new Muscle(), right: new Muscle() };
  }

  updateBiology() {
    this.muscles.left.update(this.neurons.left.outputLevel);
    this.muscles.right.update(this.neurons.right.outputLevel);
  }

  show(c) {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);

    let w = this.len;
    let h = 20 - (this.index * 0.5); // Taper

    // Muscle expansion visualization
    let leftT = this.muscles.left.tension;
    let rightT = this.muscles.right.tension;

    fill(red(c), green(c), blue(c), 100);
    noStroke();

    // Left Muscle
    let mw = w/2 + leftT * 10;
    ellipse(0, -h/2, mw, h/2);

    // Right Muscle
    mw = w/2 + rightT * 10;
    ellipse(0, h/2, mw, h/2);

    // Bone
    fill(200);
    ellipse(0,0, 6, 6);

    pop();
  }
}

class Neuron {
  constructor() { this.outputLevel = 0; }
  stimulate(val) { this.outputLevel = val; }
}

class Muscle {
  constructor() { this.tension = 0; }
  update(signal) {
    this.tension = lerp(this.tension, signal, 0.2);
  }
}

class Particle {
  constructor(x, y, col) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(2, 8));
    this.col = col;
    this.life = 255;
  }
  update() {
    this.pos.add(this.vel);
    this.life -= 10;
  }
  show() {
    noStroke();
    fill(red(this.col), green(this.col), blue(this.col), this.life);
    ellipse(this.pos.x, this.pos.y, 6, 6);
  }
  finished() { return this.life < 0; }
}
