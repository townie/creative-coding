let snake;
let font;

// Biological Needs / Environment objects
let foodPos;
let riverZone;
let shelterZone;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Define Environment Zones
  riverZone = { x: 50, y: height - 200, w: width - 100, h: 150 };
  shelterZone = { x: 50, y: 50, w: 250, h: 200 };
  spawnFood();

  // Create a snake with 24 segments, segment length 20
  snake = new Snake(24, 20);
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

  // Draw Environment (River, Shelter, Boundary)
  drawEnvironment();

  // Draw Food
  drawFood();

  // Update Snake (Autonomous)
  snake.update();
  snake.show();

  drawInterface();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  riverZone = { x: 50, y: height - 200, w: width - 100, h: 150 };
  // Note: Snake bounds are dynamic in update loop, so no extra resize logic needed for snake
}

function keyPressed() {
  // Press 'F' to drop nutrients in front of the snake
  if (key === 'f' || key === 'F') {
    dropFoodInFront();
  }
}

function mousePressed() {
  // Also allow clicking to place food manually
  foodPos = createVector(mouseX, mouseY);
}

function dropFoodInFront() {
  if (!snake) return;

  // Calculate position in front of snake
  let dropDistance = 200;
  let dropVector = p5.Vector.fromAngle(snake.heading);
  dropVector.mult(dropDistance);
  dropVector.add(snake.pos);

  // Constrain to "Lab" walls
  dropVector.x = constrain(dropVector.x, 60, width - 60);
  dropVector.y = constrain(dropVector.y, 60, height - 60);

  foodPos = dropVector;

  // Visual feedback ring
  stroke(255);
  noFill();
  ellipse(foodPos.x, foodPos.y, 100, 100);
}

function drawEnvironment() {
  // 1. Draw River (Water Source)
  noStroke();
  fill(0, 100, 200, 40);
  rect(riverZone.x, riverZone.y, riverZone.w, riverZone.h);

  // River flow visual effect
  stroke(0, 150, 255, 50);
  strokeWeight(2);
  let time = millis() * 0.001;
  for (let i = 0; i < 10; i++) {
    let y = map(i, 0, 10, riverZone.y + 10, riverZone.y + riverZone.h - 10);
    let xOffset = sin(time + i) * 20;
    line(riverZone.x, y, riverZone.x + riverZone.w, y);
  }

  // 2. Draw Shelter (Box)
  fill(40, 30, 20, 150); // Dark cave-like
  stroke(100, 80, 50);
  strokeWeight(2);
  rect(shelterZone.x, shelterZone.y, shelterZone.w, shelterZone.h);

  // Shelter hatching
  stroke(100, 80, 50, 50);
  strokeWeight(1);
  for(let i = 0; i < shelterZone.w + shelterZone.h; i+=20) {
     let x1 = shelterZone.x + i;
     let y1 = shelterZone.y;
     let x2 = shelterZone.x;
     let y2 = shelterZone.y + i;
     // Clip lines to box
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
  fill(200, 150, 100);
  textSize(12);
  textAlign(LEFT, TOP);
  text("SHELTER ZONE", shelterZone.x + 10, shelterZone.y + 10);

  fill(100, 200, 255);
  text("WATER SOURCE (RIVER)", riverZone.x + 10, riverZone.y + 10);

  // 3. Draw the bounding box (Lab Walls)
  stroke(40, 60, 80);
  strokeWeight(2);
  noFill();
  rect(50, 50, width - 100, height - 100);

  // Grid lines for "lab" feel
  stroke(30, 35, 40);
  strokeWeight(1);
  for(let x = 50; x <= width - 50; x += 50) line(x, 50, x, height - 50);
  for(let y = 50; y <= height - 50; y += 50) line(50, y, width - 50, y);
}

function drawFood() {
  if (!foodPos) return;

  // Pulsing organic food
  let pulse = sin(millis() * 0.005) * 5;
  noStroke();

  // Outer glow
  fill(0, 255, 100, 50);
  ellipse(foodPos.x, foodPos.y, 40 + pulse, 40 + pulse);

  // Core
  fill(50, 255, 150);
  ellipse(foodPos.x, foodPos.y, 15, 15);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(10);
  text("NUTRIENT", foodPos.x, foodPos.y - 30);
}

function drawInterface() {
  // HUD
  fill(0, 255, 255);
  noStroke();
  textSize(14);
  textAlign(LEFT, TOP);
  text("NEURAL INTERFACE v3.3", 20, 20);
  text("---------------------", 20, 35);
  text("MODE: FULLY AUTONOMOUS", 20, 50);

  // Controls
  fill(0, 255, 100);
  text("[F] DROP NUTRIENT", 20, 70);

  // CPG Stats (Internal)
  fill(150);
  textSize(10);
  text(`CPG FREQ: ${snake.cpg.freq.toFixed(3)} Hz`, 20, 95);
  text(`CPG AMP : ${snake.cpg.amp.toFixed(3)}`, 20, 110);
  text(`VELOCITY: ${snake.speed.toFixed(1)} px/f`, 20, 125);

  // --- BIO NEEDS BARS ---
  let barX = 20;
  let barY = 150;
  let barW = 150;
  let barH = 10;
  let spacing = 25;

  drawBar(barX, barY, barW, barH, snake.needs.food, "FOOD (NUTRIENTS)", color(0, 255, 100));
  drawBar(barX, barY + spacing, barW, barH, snake.needs.water, "WATER (HYDRATION)", color(0, 150, 255));
  drawBar(barX, barY + spacing * 2, barW, barH, snake.needs.shelter, "SHELTER (REST)", color(255, 200, 50));

  // Current Priority
  fill(255);
  textSize(12);
  text(`CORTEX PRIORITY: ${snake.currentPriority.toUpperCase()}`, 20, 240);

  // Sensory Info
  fill(255, 200, 0);
  textSize(14);
  text("SENSORY INPUT:", 20, 270);
  let status = "CLEAR";
  if (snake.vision.detected) {
    status = "OBJECT DETECTED";
    // Check if we are ignoring the object due to needs
    let ignoring = true;
    for(let p of snake.vision.points) {
      if (p.type === 'wall') ignoring = false;
      if (p.type === 'water' && snake.currentPriority !== 'water') ignoring = false;
      if (p.type === 'shelter' && snake.currentPriority !== 'shelter') ignoring = false;
    }
    if (ignoring) status = "APPROACHING TARGET";
    else status = "AVOIDING OBSTACLE";
  }

  text(`  VISUAL CORTEX: ${status}`, 20, 285);
  text(`  SCAN RANGE: ${snake.vision.dist}px`, 20, 300);

  fill(100, 100, 100);
  text("  WALL SENSOR: DISABLED", 20, 315);
}

function drawBar(x, y, w, h, val, label, col) {
  // Label
  noStroke();
  fill(200);
  textSize(10);
  textAlign(LEFT, BOTTOM);
  text(label, x, y - 2);

  // Background
  fill(30);
  rect(x, y, w, h);

  // Fill
  fill(col);
  let fillW = map(val, 0, 100, 0, w);
  rect(x, y, fillW, h);

  // Warning flash if low
  if (val < 20 && frameCount % 30 < 15) {
    noFill();
    stroke(255, 0, 0);
    strokeWeight(2);
    rect(x - 2, y - 2, w + 4, h + 4);
  }
}

// ------------------------------------------------------------------
// BIOLOGICAL SIMULATION CLASSES
// ------------------------------------------------------------------

class Snake {
  constructor(numSegments, segLength) {
    this.segments = [];
    this.numSegments = numSegments;
    this.segLength = segLength;
    this.time = 0;

    // Locomotion Physics
    this.pos = createVector(windowWidth / 2, windowHeight / 2);
    this.heading = random(TWO_PI);
    this.speed = 0;
    this.margin = 60;

    // Internal Central Pattern Generator State
    this.cpg = {
      freq: 0.1,
      amp: 0.5,
      targetFreq: 0.1,
      targetAmp: 0.5
    };

    // Biological Needs (0 - 100)
    this.needs = {
      food: 60,
      water: 60,
      shelter: 60
    };

    this.currentPriority = "wandering";

    // Perception System
    this.vision = {
      dist: 500,
      fov: PI / 1.1,
      detected: false,
      scanT: 0,
      points: [],       // Stores {pos, type}
      readings: []      // Store ray readings for visualization {angle, dist, type}
    };

    for (let i = 0; i < numSegments; i++) {
      this.segments.push(new Vertebra(i, segLength));
    }
  }

  update() {
    // 1. Determine Needs & Priority
    this.evaluateNeeds();

    // 2. Adjust CPG (Brain) based on priority
    this.adjustCPG();

    // 3. Propagate Neural Signals & Physics
    this.time += this.cpg.freq;
    this.vision.scanT += 0.1;

    // Decay needs based on exertion
    this.updateMetabolism();

    // Steering Logic
    this.handleSteering();

    // Locomotion Physics (Muscles driving Speed)
    this.handleLocomotion();

    // Sensory Processing
    this.processVision();

    // Body Kinematics
    this.updateBody();
  }

  evaluateNeeds() {
    let sortedNeeds = [
      {type: 'food', val: this.needs.food},
      {type: 'water', val: this.needs.water},
      {type: 'shelter', val: this.needs.shelter}
    ].sort((a,b) => a.val - b.val);

    this.currentPriority = sortedNeeds[0].type;

    // If all needs are relatively high, just wander
    if (sortedNeeds[0].val > 80) this.currentPriority = 'wandering';
  }

  adjustCPG() {
    // Default wandering state
    let tf = 0.15; // Target Freq
    let ta = 0.4;  // Target Amp

    if (this.currentPriority === 'food') {
      // Hunt: Fast, high energy
      tf = 0.35;
      ta = 0.9;
    } else if (this.currentPriority === 'water') {
      // Travel: Steady, efficient
      tf = 0.25;
      ta = 0.6;
    } else if (this.currentPriority === 'shelter') {
      // Tired: Slow, dragging
      tf = 0.1;
      ta = 0.3;
    }

    // Check if actually inside the shelter to rest
    let inShelter = (this.pos.x > shelterZone.x && this.pos.x < shelterZone.x + shelterZone.w &&
                     this.pos.y > shelterZone.y && this.pos.y < shelterZone.y + shelterZone.h);

    if (inShelter && this.currentPriority === 'shelter') {
      tf = 0.02; // Barely moving (sleeping)
      ta = 0.1;
    }

    // Smoothly interpolate CPG values (Neuroplasticity/Reaction time)
    this.cpg.freq = lerp(this.cpg.freq, tf, 0.05);
    this.cpg.amp = lerp(this.cpg.amp, ta, 0.05);
  }

  handleSteering() {
    let target = createVector(width/2, height/2);

    // Set Target based on priority
    if(this.currentPriority === 'food' && foodPos) {
      target = foodPos.copy();
    } else if (this.currentPriority === 'water') {
      target = createVector(riverZone.x + riverZone.w/2, riverZone.y + riverZone.h/2);
    } else if (this.currentPriority === 'shelter') {
      target = createVector(shelterZone.x + shelterZone.w/2, shelterZone.y + shelterZone.h/2);
    } else if (this.currentPriority === 'wandering') {
      // Perlin noise wandering target
      target = createVector(
        noise(this.time * 0.1) * width,
        noise(this.time * 0.1 + 1000) * height
      );
    }

    // Calculate desired heading to target
    let desired = p5.Vector.sub(target, this.pos);
    let desiredHeading = desired.heading();

    // Smooth Steering
    let angleDiff = desiredHeading - this.heading;
    while (angleDiff < -PI) angleDiff += TWO_PI;
    while (angleDiff > PI) angleDiff -= TWO_PI;

    // Obstacle Avoidance Override
    if (this.vision.detected) {
      let avoidVec = createVector(0,0);
      let count = 0;

      for(let p of this.vision.points) {
        // Determine if we should avoid this point
        let shouldAvoid = true;

        // Don't avoid water if we are thirsty
        if (p.type === 'water' && this.currentPriority === 'water') shouldAvoid = false;
        // Don't avoid shelter if we need rest
        if (p.type === 'shelter' && this.currentPriority === 'shelter') shouldAvoid = false;

        if (shouldAvoid) {
          avoidVec.add(p.pos);
          count++;
        }
      }

      if (count > 0) {
        avoidVec.div(count);
        let avoidDir = p5.Vector.sub(this.pos, avoidVec);
        let avoidHeading = avoidDir.heading();

        let avoidDiff = avoidHeading - this.heading;
        while (avoidDiff < -PI) avoidDiff += TWO_PI;
        while (avoidDiff > PI) avoidDiff -= TWO_PI;

        angleDiff = avoidDiff * 2.5; // Stronger avoidance
      }
    }

    // Turn rate limit based on speed (higher speed = wider turn radius)
    let turnRate = map(this.speed, 0, 10, 0.1, 0.03);
    this.heading += constrain(angleDiff, -turnRate, turnRate);
  }

  handleLocomotion() {
    // Propulsion is generated by the muscles (Function of Freq * Amp)
    let muscleOutput = this.cpg.freq * this.cpg.amp;

    // Physical fatigue
    let fatigue = (300 - (this.needs.food + this.needs.water + this.needs.shelter)) / 300;
    let efficiency = map(fatigue, 0, 1, 1.0, 0.3);

    // Base speed derived from muscle output
    let targetSpeed = muscleOutput * 40 * efficiency;

    this.speed = lerp(this.speed, targetSpeed, 0.1);

    // Apply Velocity
    let vel = p5.Vector.fromAngle(this.heading);
    vel.mult(this.speed);
    this.pos.add(vel);

    // Wall Bouncing (Physical Limits)
    let hitWall = false;
    let v = p5.Vector.fromAngle(this.heading);

    if (this.pos.x < this.margin) { this.pos.x = this.margin; if (v.x < 0) v.x *= -1; hitWall = true; }
    else if (this.pos.x > width - this.margin) { this.pos.x = width - this.margin; if (v.x > 0) v.x *= -1; hitWall = true; }

    if (this.pos.y < this.margin) { this.pos.y = this.margin; if (v.y < 0) v.y *= -1; hitWall = true; }
    else if (this.pos.y > height - this.margin) { this.pos.y = height - this.margin; if (v.y > 0) v.y *= -1; hitWall = true; }

    if (hitWall) this.heading = v.heading();
  }

  updateBody() {
    // --- NEURAL SIGNAL PROPAGATION ---
    for (let i = 0; i < this.segments.length; i++) {
      let seg = this.segments[i];

      // Phase shift creates the traveling wave
      let phase = this.time - (i * 0.3);
      let signalBase = Math.sin(phase) * this.cpg.amp;

      let leftSignal = signalBase > 0 ? signalBase : 0;
      let rightSignal = signalBase < 0 ? -signalBase : 0;

      let bracingSignal = (Math.sin(this.time * 2) + 1) * 0.2 * this.cpg.amp;

      seg.neurons.left.stimulate(leftSignal);
      seg.neurons.right.stimulate(rightSignal);
      seg.neurons.top.stimulate(bracingSignal);
      seg.neurons.bottom.stimulate(bracingSignal);

      seg.updateBiology();
    }

    // --- KINEMATICS ---
    // Head matches physics position
    this.segments[0].pos.set(this.pos.x, this.pos.y);
    let headWiggle = Math.sin(this.time) * this.cpg.amp * 0.3;
    this.segments[0].angle = this.heading + headWiggle;

    // Follow the leader
    for (let i = 1; i < this.segments.length; i++) {
      let prev = this.segments[i - 1];
      let curr = this.segments[i];

      // Muscle tension affects bend
      let bendForce = (curr.muscles.right.tension - curr.muscles.left.tension);
      let bendAngle = bendForce * 0.8;

      curr.angle = prev.angle + bendAngle;

      let dx = Math.cos(curr.angle) * this.segLength;
      let dy = Math.sin(curr.angle) * this.segLength;

      let compression = 1.0 - (curr.muscles.top.tension + curr.muscles.bottom.tension) * 0.2;
      curr.pos.set(prev.pos.x - dx * compression, prev.pos.y - dy * compression);
    }
  }

  updateMetabolism() {
    let effort = (this.cpg.freq * 5) + (this.cpg.amp * 0.5);

    // SIGNIFICANTLY REDUCED DEPLETION RATES (approx 10x slower)
    this.needs.food -= 0.005 + (effort * 0.005);
    this.needs.water -= 0.008 + (effort * 0.008);
    this.needs.shelter -= 0.003;

    // Interactions
    let d = dist(this.pos.x, this.pos.y, foodPos.x, foodPos.y);
    if (d < 40) {
      this.needs.food = min(this.needs.food + 40, 100);
      spawnFood();
    }

    if (this.pos.x > riverZone.x && this.pos.x < riverZone.x + riverZone.w &&
        this.pos.y > riverZone.y && this.pos.y < riverZone.y + riverZone.h) {
      this.needs.water = min(this.needs.water + 1.5, 100); // Drink faster
    }

    if (this.pos.x > shelterZone.x && this.pos.x < shelterZone.x + shelterZone.w &&
        this.pos.y > shelterZone.y && this.pos.y < shelterZone.y + shelterZone.h) {
      this.needs.shelter = min(this.needs.shelter + 1.0, 100); // Rest
    }

    this.needs.food = constrain(this.needs.food, 0, 100);
    this.needs.water = constrain(this.needs.water, 0, 100);
    this.needs.shelter = constrain(this.needs.shelter, 0, 100);
  }

  processVision() {
    this.vision.detected = false;
    this.vision.points = [];
    this.vision.readings = [];

    // Increased ray count for better shape resolution
    let rayCount = 50;
    let startAngle = this.heading - this.vision.fov / 2;

    for (let i = 0; i <= rayCount; i++) {
      let angle = map(i, 0, rayCount, startAngle, startAngle + this.vision.fov);
      let result = this.castRay(this.pos, angle, this.vision.dist);

      // Store reading for drawing the polygon
      this.vision.readings.push({
        angle: angle - this.heading, // Relative angle for drawing
        dist: result.dist,
        type: result.type
      });

      // Detection logic
      if (result.dist < this.vision.dist - 0.1) {
        this.vision.detected = true;
        let v = p5.Vector.fromAngle(angle);
        v.mult(result.dist);
        v.add(this.pos);
        // Store point with type for intelligent steering
        this.vision.points.push({ pos: v, type: result.type });
      }
    }
  }

  castRay(origin, angle, maxDist) {
    let dir = p5.Vector.fromAngle(angle);
    let minDist = maxDist;
    let hitType = 'clear';

    // 1. Check Lab Walls (Enclosing Box) - DISABLED FOR SENSOR
    // The snake will still physically bounce off walls in handleLocomotion,
    // but the sensor "eye" will not see them.
    /*
    let wall = 50;
    if (dir.x !== 0) {
      let targetX = dir.x > 0 ? width - wall : wall;
      let d = (targetX - origin.x) / dir.x;
      if (d > 0 && d < minDist) { minDist = d; hitType = 'wall'; }
    }
    if (dir.y !== 0) {
      let targetY = dir.y > 0 ? height - wall : wall;
      let d = (targetY - origin.y) / dir.y;
      if (d > 0 && d < minDist) { minDist = d; hitType = 'wall'; }
    }
    */

    // 2. Check Environment Objects (River, Shelter)
    // Helper Slab method for Ray-AABB intersection
    const checkRect = (rect, type) => {
      // Avoid division by zero
      let dx = (Math.abs(dir.x) < 0.000001) ? 0.000001 : dir.x;
      let dy = (Math.abs(dir.y) < 0.000001) ? 0.000001 : dir.y;

      let t1 = (rect.x - origin.x) / dx;
      let t2 = (rect.x + rect.w - origin.x) / dx;
      let t3 = (rect.y - origin.y) / dy;
      let t4 = (rect.y + rect.h - origin.y) / dy;

      let tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
      let tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4));

      // Check if intersection is valid
      if (tmax >= 0 && tmin <= tmax) {
        // If tmin < 0, we are inside the object, so the intersection is at tmax (exit)
        // If tmin > 0, we are outside, intersection is at tmin (entry)
        let d = (tmin < 0) ? tmax : tmin;

        if (d < minDist) {
          minDist = d;
          hitType = type;
        }
      }
    };

    checkRect(riverZone, 'water');
    checkRect(shelterZone, 'shelter');

    return { dist: minDist, type: hitType };
  }

  show() {
    this.drawVisionCone();
    for (let i = 0; i < this.segments.length - 1; i++) {
      let s1 = this.segments[i];
      let s2 = this.segments[i+1];
      stroke(50);
      strokeWeight(2);
      line(s1.pos.x, s1.pos.y, s2.pos.x, s2.pos.y);
    }
    for (let s of this.segments) s.show();

    // Head Direction
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.heading);
    stroke(0, 255, 255, 100);
    line(0, 0, 40, 0);
    pop();
  }

  drawVisionCone() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.heading);

    // Determine color based on what is mostly seen
    let primaryType = 'clear';
    let wallCount = 0;
    let waterCount = 0;
    let shelterCount = 0;

    for(let r of this.vision.readings) {
      if(r.type === 'wall') wallCount++;
      if(r.type === 'water') waterCount++;
      if(r.type === 'shelter') shelterCount++;
    }

    // Color logic
    let coneColor = color(0, 255, 200); // Default
    if (wallCount > this.vision.readings.length / 3) coneColor = color(255, 50, 50); // Warning
    if (waterCount > this.vision.readings.length / 3) coneColor = color(0, 150, 255); // Water detected
    if (shelterCount > this.vision.readings.length / 3) coneColor = color(255, 200, 50); // Shelter detected

    if (this.vision.detected) {
      fill(red(coneColor), green(coneColor), blue(coneColor), 40);
      stroke(red(coneColor), green(coneColor), blue(coneColor), 80);
    } else {
      fill(0, 255, 200, 20);
      stroke(0, 255, 200, 40);
    }

    strokeWeight(1);

    // Draw the vision field as a polygon clipped by environment
    beginShape();
    vertex(0, 0);
    for (let r of this.vision.readings) {
      let rx = cos(r.angle) * r.dist;
      let ry = sin(r.angle) * r.dist;
      vertex(rx, ry);
    }
    vertex(0, 0);
    endShape(CLOSE);

    // Scanning line effect
    let scanAngle = map(sin(this.vision.scanT), -1, 1, -this.vision.fov/2, this.vision.fov/2);
    // Cast a specific ray for the scanner line
    let scanResult = this.castRay(this.pos, this.heading + scanAngle, this.vision.dist);

    stroke(255, 255, 255, 150);
    strokeWeight(2);
    line(0, 0, cos(scanAngle) * scanResult.dist, sin(scanAngle) * scanResult.dist);

    pop();

    // Draw intersection points in world space
    if (this.vision.detected) {
      noStroke();
      for (let p of this.vision.points) {
        if(p.type === 'wall') fill(255, 50, 50);
        else if(p.type === 'water') fill(0, 150, 255);
        else if(p.type === 'shelter') fill(255, 200, 50);
        else fill(255, 200, 0);

        ellipse(p.pos.x, p.pos.y, 6, 6);
      }
    }
  }
}

class Vertebra {
  constructor(index, len) {
    this.index = index;
    this.len = len;
    this.pos = createVector(0, 0);
    this.angle = 0;

    this.neurons = { left: new Neuron(), right: new Neuron(), top: new Neuron(), bottom: new Neuron() };
    this.muscles = { left: new Muscle(), right: new Muscle(), top: new Muscle(), bottom: new Muscle() };
  }

  updateBiology() {
    this.muscles.left.update(this.neurons.left.outputLevel);
    this.muscles.right.update(this.neurons.right.outputLevel);
    this.muscles.top.update(this.neurons.top.outputLevel);
    this.muscles.bottom.update(this.neurons.bottom.outputLevel);
    Object.values(this.neurons).forEach(n => n.update());
  }

  show() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);

    let baseSize = 30;
    let vScale = 1.0 - (this.muscles.top.tension + this.muscles.bottom.tension) * 0.4;
    let size = baseSize * vScale;

    this.drawNervePath(-10, -5, this.neurons.left);
    this.drawNervePath(-10, 5, this.neurons.right);
    this.drawNervePath(0, 0, this.neurons.top);

    this.drawMuscle(0, -size/2, this.muscles.left, 'left');
    this.drawMuscle(0, size/2, this.muscles.right, 'right');
    this.drawCoreMuscle(size, this.muscles.top, this.muscles.bottom);

    noStroke();
    fill(240);
    ellipse(0, 0, 8, 8);
    pop();
  }

  drawNervePath(xOffset, yOffset, neuron) {
    stroke(0, 50, 50);
    strokeWeight(1);
    line(-this.len, yOffset, 0, yOffset);
    if (neuron.spikes.length > 0) {
      noStroke();
      fill(0, 255, 255);
      for (let spikePos of neuron.spikes) {
        let px = map(spikePos, 0, 1, -this.len, 0);
        ellipse(px, yOffset, 3, 3);
      }
    }
  }

  drawMuscle(x, y, muscle, side) {
    let tension = muscle.tension;
    let r = lerp(60, 255, tension);
    let g = lerp(60, 0, tension);
    let b = lerp(60, 50, tension);
    fill(r, g, b, 200);
    noStroke();
    let w = this.len * 1.1;
    let h = 8 + (tension * 8);
    ellipse(x - this.len/2, y, w, h);
  }

  drawCoreMuscle(size, mTop, mBottom) {
    let tension = (mTop.tension + mBottom.tension) / 2;
    strokeWeight(2 + tension * 4);
    stroke(50, 255, 100, 100 + tension * 155);
    noFill();
    ellipse(-this.len/2, 0, size, size);
  }
}

class Neuron {
  constructor() {
    this.outputLevel = 0;
    this.spikes = [];
  }
  stimulate(signalLevel) {
    this.outputLevel = signalLevel;
    if (signalLevel > 0.05 && Math.random() < signalLevel * 0.8) this.fire();
  }
  fire() { this.spikes.push(0); }
  update() {
    let conductionVelocity = 0.2;
    for (let i = this.spikes.length - 1; i >= 0; i--) {
      this.spikes[i] += conductionVelocity;
      if (this.spikes[i] > 1.0) this.spikes.splice(i, 1);
    }
  }
}

class Muscle {
  constructor() { this.tension = 0; }
  update(inputSignal) {
    let attack = 0.1;
    let decay = 0.05;
    if (inputSignal > this.tension) this.tension = lerp(this.tension, inputSignal, attack);
    else this.tension = lerp(this.tension, inputSignal, decay);
    this.tension = constrain(this.tension, 0, 1);
  }
}
