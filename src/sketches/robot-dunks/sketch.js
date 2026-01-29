/**
 * ROBOT ALLEY-OOP: CYBERPUNK DUNK SIMULATOR
 *
 * NBA 2K vibes with your robot friend!
 *
 * Instructions:
 * - Drag the basketball to aim your alley-oop pass
 * - Release to lob it toward the hoop
 * - Your robot friend will catch and DUNK based on pass quality
 * - Different passes unlock different dunks!
 *
 * Dunk Types:
 * - One-hand Jam (2 pts) - Low/fast passes
 * - Two-hand Slam (3 pts) - Mid height, fast, accurate
 * - Tomahawk (4 pts) - High speed, flat angle
 * - Reverse (4 pts) - Off-center passes
 * - Windmill (5 pts) - High arc, slow, accurate
 * - 360 Spin (6 pts) - Perfect height + bullseye
 * - Between-the-legs (8 pts) - Slow + high + perfect accuracy
 */

let game;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Courier New');
  game = new AlleyOopGame();
}

function draw() {
  game.update();
  game.draw();
}

function mousePressed() {
  if (game) game.handlePress(mouseX, mouseY);
}

function mouseDragged() {
  if (game) game.handleDrag(mouseX, mouseY);
}

function mouseReleased() {
  if (game) game.handleRelease();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (game) game.resize();
}

// ============== DUNK DEFINITIONS ==============

const DUNKS = {
  ONE_HAND_JAM: { name: "ONE-HAND JAM", points: 2, color: [100, 200, 255] },
  TWO_HAND_SLAM: { name: "TWO-HAND SLAM", points: 3, color: [255, 150, 0] },
  TOMAHAWK: { name: "TOMAHAWK", points: 4, color: [255, 50, 50] },
  REVERSE: { name: "REVERSE DUNK", points: 4, color: [200, 100, 255] },
  WINDMILL: { name: "WINDMILL", points: 5, color: [0, 255, 150] },
  SPIN_360: { name: "360 SPIN", points: 6, color: [255, 255, 0] },
  BETWEEN_LEGS: { name: "BETWEEN THE LEGS", points: 8, color: [255, 0, 255] }
};

// ============== PASS ANALYZER ==============

class PassAnalyzer {
  constructor() {
    this.reset();
  }

  reset() {
    this.height = 0;    // 1=low, 2=mid, 3=high
    this.speed = 0;     // 1=slow, 2=mid, 3=fast
    this.accuracy = 0;  // 1=off, 2=good, 3=bullseye
    this.angle = 0;     // approach angle
    this.analyzed = false;
  }

  analyze(ball, sweetSpot, hoopX) {
    if (this.analyzed) return;

    // Height rating based on arc peak
    let peakY = ball.peakY || ball.pos.y;
    let courtHeight = height - 100;
    let relativeHeight = 1 - (peakY / courtHeight);

    if (relativeHeight > 0.6) this.height = 3;      // high
    else if (relativeHeight > 0.35) this.height = 2; // mid
    else this.height = 1;                            // low

    // Speed rating
    let spd = ball.launchSpeed || ball.vel.mag();
    if (spd > 18) this.speed = 3;       // fast
    else if (spd > 12) this.speed = 2;  // mid
    else this.speed = 1;                // slow

    // Accuracy - distance from sweet spot
    let distToSweet = dist(ball.pos.x, ball.pos.y, sweetSpot.x, sweetSpot.y);
    if (distToSweet < 40) this.accuracy = 3;       // bullseye
    else if (distToSweet < 100) this.accuracy = 2; // good
    else this.accuracy = 1;                        // off

    // Approach angle (for reverse detection)
    this.angle = atan2(ball.vel.y, ball.vel.x);
    this.isFromBehind = ball.pos.x > hoopX - 50;

    this.analyzed = true;
  }

  selectDunk() {
    // Between-the-legs: slow + high + bullseye
    if (this.speed === 1 && this.height === 3 && this.accuracy === 3) {
      return DUNKS.BETWEEN_LEGS;
    }

    // 360 Spin: perfect height (mid-high) + bullseye
    if (this.height >= 2 && this.accuracy === 3 && this.speed === 2) {
      return DUNKS.SPIN_360;
    }

    // Windmill: high arc + slow + good accuracy
    if (this.height === 3 && this.speed <= 2 && this.accuracy >= 2) {
      return DUNKS.WINDMILL;
    }

    // Reverse: off-center or from behind
    if (this.isFromBehind || (this.accuracy === 1 && this.height === 2)) {
      return DUNKS.REVERSE;
    }

    // Tomahawk: fast + any height
    if (this.speed === 3 && this.accuracy >= 2) {
      return DUNKS.TOMAHAWK;
    }

    // Two-hand slam: mid height + fast + good
    if (this.height === 2 && this.speed >= 2 && this.accuracy >= 2) {
      return DUNKS.TWO_HAND_SLAM;
    }

    // Default: one-hand jam
    return DUNKS.ONE_HAND_JAM;
  }
}

// ============== BASKETBALL ==============

class Basketball {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.radius = 22;
    this.rot = 0;
    this.launched = false;
    this.caught = false;
    this.scored = false;
    this.missed = false;
    this.launchSpeed = 0;
    this.peakY = y;
    this.trail = [];
  }

  launch(force, floorY) {
    this.vel = force.copy();
    this.launchSpeed = force.mag();
    this.launched = true;
    this.peakY = this.pos.y;

    // If launched from below floor, start at floor level
    if (floorY && this.pos.y > floorY - this.radius) {
      this.pos.y = floorY - this.radius;
    }
  }

  update(gravity, floorY) {
    if (!this.launched || this.caught || this.scored) return;

    this.vel.add(gravity);
    this.pos.add(this.vel);
    this.rot += this.vel.x * 0.03;

    // Track peak height
    if (this.pos.y < this.peakY) {
      this.peakY = this.pos.y;
    }

    // Trail
    this.trail.push({ x: this.pos.x, y: this.pos.y, age: 0 });
    if (this.trail.length > 15) this.trail.shift();
    this.trail.forEach(t => t.age++);

    // Floor bounce
    if (this.pos.y > floorY - this.radius) {
      this.pos.y = floorY - this.radius;
      this.vel.y *= -0.6;
      this.vel.x *= 0.8;
      if (abs(this.vel.y) < 2) {
        this.missed = true;
      }
    }
  }

  draw() {
    // Trail
    for (let i = 0; i < this.trail.length; i++) {
      let t = this.trail[i];
      let alpha = map(i, 0, this.trail.length, 50, 150);
      let size = map(i, 0, this.trail.length, 8, this.radius * 1.5);
      fill(255, 100, 0, alpha);
      noStroke();
      circle(t.x, t.y, size);
    }

    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.rot);

    // Ball shadow
    fill(0, 50);
    noStroke();
    ellipse(3, 3, this.radius * 2, this.radius * 2);

    // Basketball body
    let ballColor = this.caught ? color(0, 255, 150) : color(255, 120, 50);
    fill(ballColor);
    stroke(80, 40, 20);
    strokeWeight(2);
    circle(0, 0, this.radius * 2);

    // Basketball lines
    stroke(50, 25, 10);
    strokeWeight(2);
    line(-this.radius, 0, this.radius, 0);
    line(0, -this.radius, 0, this.radius);
    noFill();
    arc(-this.radius/3, 0, this.radius, this.radius * 1.6, -HALF_PI, HALF_PI);
    arc(this.radius/3, 0, this.radius, this.radius * 1.6, HALF_PI, -HALF_PI);

    pop();
  }
}

// ============== BASKETBALL HOOP ==============

class Hoop {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.rimRadius = 35;
    this.backboardW = 15;
    this.backboardH = 120;
    this.netSegments = 8;
    this.netWave = 0;
    this.glowIntensity = 0;
  }

  getSweetSpot() {
    return createVector(this.pos.x - this.rimRadius - 20, this.pos.y - 50);
  }

  triggerGlow() {
    this.glowIntensity = 1;
  }

  update() {
    this.netWave += 0.1;
    this.glowIntensity *= 0.95;
  }

  draw() {
    push();
    translate(this.pos.x, this.pos.y);

    // Glow effect
    if (this.glowIntensity > 0.1) {
      for (let i = 5; i > 0; i--) {
        fill(0, 255, 255, this.glowIntensity * 30 * i);
        noStroke();
        circle(-this.rimRadius, 0, this.rimRadius * 2 + i * 20);
      }
    }

    // Backboard - glass effect
    fill(40, 60, 80, 200);
    stroke(0, 255, 255);
    strokeWeight(3);
    rect(0, -this.backboardH/2, this.backboardW, this.backboardH);

    // Backboard inner square
    stroke(255, 100);
    strokeWeight(2);
    noFill();
    rect(2, -30, 10, 60);

    // Pole
    fill(60);
    noStroke();
    rect(this.backboardW/2 - 5, this.backboardH/2, 10, 200);

    // Rim - metallic
    stroke(255, 100, 0);
    strokeWeight(6);
    noFill();
    line(0, 0, -this.rimRadius * 2, 0);

    // Rim ring
    fill(255, 80, 0);
    noStroke();
    circle(0, 0, 12);
    circle(-this.rimRadius * 2, 0, 12);

    // Net
    stroke(255, 255, 255, 180);
    strokeWeight(2);
    let netBottom = 60;
    for (let i = 0; i <= this.netSegments; i++) {
      let x1 = map(i, 0, this.netSegments, 0, -this.rimRadius * 2);
      let x2 = map(i, 0, this.netSegments, -10, -this.rimRadius * 2 + 10);
      let wave = sin(this.netWave + i * 0.5) * 5 * this.glowIntensity;
      line(x1, 0, x2 + wave, netBottom);
    }
    // Horizontal net lines
    for (let j = 1; j < 4; j++) {
      let y = j * netBottom / 4;
      let x1 = map(y, 0, netBottom, 0, -10);
      let x2 = map(y, 0, netBottom, -this.rimRadius * 2, -this.rimRadius * 2 + 10);
      line(x1, y, x2, y);
    }

    pop();
  }

  checkScore(ball) {
    // Ball passes through rim from above
    let rimLeft = this.pos.x - this.rimRadius * 2;
    let rimRight = this.pos.x;
    let rimY = this.pos.y;

    if (ball.pos.x > rimLeft && ball.pos.x < rimRight &&
        ball.pos.y > rimY - 10 && ball.pos.y < rimY + 30 &&
        ball.vel.y > 0) {
      return true;
    }
    return false;
  }
}

// ============== DUNKING ROBOT ==============

class DunkingRobot {
  constructor(x, y) {
    this.basePos = createVector(x, y);
    this.pos = createVector(x, y - 100);
    this.targetPos = this.pos.copy();

    // Body parts
    this.bodyH = 80;
    this.headSize = 40;
    this.armLength = 60;
    this.legLength = 50;

    // Animation state
    this.state = "IDLE";
    this.stateTimer = 0;
    this.dunkType = null;
    this.dunkProgress = 0;
    this.armAngle = 0;
    this.bodyTilt = 0;
    this.jumpHeight = 0;
    this.spinAngle = 0;
    this.celebrateTimer = 0;

    // Visual flair
    this.eyeGlow = 0;
    this.thrusterGlow = 0;
  }

  reset() {
    this.state = "IDLE";
    this.dunkType = null;
    this.dunkProgress = 0;
    this.armAngle = 0;
    this.bodyTilt = 0;
    this.jumpHeight = 0;
    this.spinAngle = 0;
  }

  update(ball, hoop, analyzer, game) {
    let now = millis();

    switch (this.state) {
      case "IDLE":
        // Hover near hoop
        this.targetPos.set(hoop.pos.x - 150, this.basePos.y - 120);
        this.armAngle = sin(now * 0.003) * 0.2;
        this.thrusterGlow = 0.3 + sin(now * 0.01) * 0.1;

        if (ball.launched && !ball.caught && !ball.missed && !ball.scored) {
          this.state = "TRACKING";
        }
        break;

      case "TRACKING":
        if (ball.missed) {
          this.state = "IDLE";
          return;
        }

        // Predict intercept point
        let predictPos = this.predictIntercept(ball, hoop, game.gravity);
        if (predictPos) {
          this.targetPos.set(predictPos.x, predictPos.y);
          this.thrusterGlow = 0.8;

          // Close enough to catch?
          let d = dist(this.pos.x, this.pos.y, ball.pos.x, ball.pos.y);
          if (d < 50 && ball.vel.y > 0) {
            ball.caught = true;
            analyzer.analyze(ball, hoop.getSweetSpot(), hoop.pos.x);
            this.dunkType = analyzer.selectDunk();
            this.state = "DUNK_WINDUP";
            this.stateTimer = now;
            this.eyeGlow = 1;
          }
        }
        break;

      case "DUNK_WINDUP":
        // Rise up and wind up based on dunk type
        this.targetPos.set(hoop.pos.x - 100, hoop.pos.y - 80);
        this.dunkProgress = min(1, (now - this.stateTimer) / 400);
        this.jumpHeight = this.dunkProgress * 50;
        this.thrusterGlow = 1;

        // Wind up arm
        this.armAngle = lerp(0, -PI * 0.7, this.dunkProgress);

        if (this.dunkType === DUNKS.SPIN_360) {
          this.spinAngle = this.dunkProgress * TWO_PI;
        } else if (this.dunkType === DUNKS.WINDMILL) {
          this.armAngle = -PI * 0.5 - this.dunkProgress * PI;
        }

        if (this.dunkProgress >= 1) {
          this.state = "DUNK_SLAM";
          this.stateTimer = now;
        }
        break;

      case "DUNK_SLAM":
        // Execute the dunk!
        this.dunkProgress = min(1, (now - this.stateTimer) / 250);
        this.targetPos.set(hoop.pos.x - hoop.rimRadius, hoop.pos.y);
        this.jumpHeight = 50 * (1 - this.dunkProgress);

        // Slam motion
        if (this.dunkType === DUNKS.BETWEEN_LEGS) {
          this.bodyTilt = sin(this.dunkProgress * PI) * 0.5;
          this.armAngle = lerp(-PI * 0.7, PI * 0.3, this.dunkProgress);
        } else if (this.dunkType === DUNKS.REVERSE) {
          this.bodyTilt = -0.3;
          this.armAngle = lerp(-PI * 0.7, PI * 0.5, this.dunkProgress);
        } else if (this.dunkType === DUNKS.TOMAHAWK) {
          this.armAngle = lerp(-PI * 0.7, PI * 0.4, this.dunkProgress);
        } else if (this.dunkType === DUNKS.WINDMILL) {
          this.armAngle = -PI * 1.5 - this.dunkProgress * PI * 1.5;
        } else if (this.dunkType === DUNKS.SPIN_360) {
          this.spinAngle = TWO_PI + this.dunkProgress * PI * 0.5;
          this.armAngle = lerp(-PI * 0.7, PI * 0.3, this.dunkProgress);
        } else {
          this.armAngle = lerp(-PI * 0.7, PI * 0.3, this.dunkProgress);
        }

        if (this.dunkProgress >= 1) {
          ball.caught = false;
          ball.scored = true;
          ball.pos.set(hoop.pos.x - hoop.rimRadius, hoop.pos.y + 20);
          ball.vel.set(0, 5);
          hoop.triggerGlow();
          game.scoreDunk(this.dunkType, analyzer);
          this.state = "CELEBRATE";
          this.stateTimer = now;
          this.celebrateTimer = 0;
        }
        break;

      case "CELEBRATE":
        this.celebrateTimer = (now - this.stateTimer) / 1000;
        this.targetPos.set(hoop.pos.x - 200, this.basePos.y - 150);
        this.armAngle = sin(now * 0.02) * 0.5 + 0.5;
        this.bodyTilt = sin(now * 0.015) * 0.1;
        this.jumpHeight = sin(now * 0.025) * 20;
        this.eyeGlow = 0.5 + sin(now * 0.03) * 0.5;

        if (now - this.stateTimer > 1500) {
          this.state = "IDLE";
          this.spinAngle = 0;
          this.bodyTilt = 0;
        }
        break;
    }

    // Smooth movement
    this.pos.x = lerp(this.pos.x, this.targetPos.x, 0.15);
    this.pos.y = lerp(this.pos.y, this.targetPos.y - this.jumpHeight, 0.15);
  }

  predictIntercept(ball, hoop, gravity) {
    let simPos = ball.pos.copy();
    let simVel = ball.vel.copy();
    let sweetSpot = hoop.getSweetSpot();

    for (let i = 0; i < 60; i++) {
      simVel.add(gravity);
      simPos.add(simVel);

      // Find point near sweet spot that's reachable
      let d = dist(simPos.x, simPos.y, sweetSpot.x, sweetSpot.y);
      if (d < 150 && simPos.y < hoop.pos.y + 50) {
        return simPos.copy();
      }
    }
    return null;
  }

  draw(ball) {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.bodyTilt);

    // Thrusters glow
    if (this.thrusterGlow > 0) {
      fill(0, 200, 255, this.thrusterGlow * 150);
      noStroke();
      ellipse(-15, this.bodyH/2 + 20, 20 + random(5), 30 + random(10));
      ellipse(15, this.bodyH/2 + 20, 20 + random(5), 30 + random(10));
    }

    // Legs
    stroke(80);
    strokeWeight(12);
    let legSpread = 15 + sin(millis() * 0.01) * 5;
    line(-legSpread, this.bodyH/2 - 10, -legSpread - 10, this.bodyH/2 + this.legLength);
    line(legSpread, this.bodyH/2 - 10, legSpread + 10, this.bodyH/2 + this.legLength);

    // Feet
    fill(60);
    noStroke();
    ellipse(-legSpread - 10, this.bodyH/2 + this.legLength, 25, 12);
    ellipse(legSpread + 10, this.bodyH/2 + this.legLength, 25, 12);

    // Body
    fill(40, 45, 55);
    stroke(0, 200, 255);
    strokeWeight(2);
    rectMode(CENTER);
    rect(0, 0, 50, this.bodyH, 10);

    // Chest plate
    fill(30, 35, 45);
    stroke(0, 255, 255, 150);
    rect(0, -5, 35, 40, 5);

    // Energy core
    let coreGlow = 150 + sin(millis() * 0.01) * 50;
    fill(0, 255, 255, coreGlow);
    noStroke();
    circle(0, 0, 15);
    fill(255);
    circle(0, 0, 6);

    // Left arm (non-ball)
    push();
    translate(-30, -25);
    rotate(-0.3);
    stroke(80);
    strokeWeight(10);
    line(0, 0, 0, this.armLength);
    fill(60);
    noStroke();
    circle(0, this.armLength, 18);
    pop();

    // Right arm (ball arm) with spin
    push();
    translate(30, -25);
    rotate(this.spinAngle);
    rotate(this.armAngle);
    stroke(80);
    strokeWeight(10);
    line(0, 0, this.armLength, 0);

    // Hand
    fill(60);
    noStroke();
    circle(this.armLength, 0, 22);

    // Draw ball if caught
    if (ball && ball.caught) {
      push();
      translate(this.armLength + 15, 0);
      rotate(-this.armAngle - this.spinAngle - this.bodyTilt);

      fill(255, 120, 50);
      stroke(80, 40, 20);
      strokeWeight(2);
      circle(0, 0, ball.radius * 2);
      stroke(50, 25, 10);
      line(-ball.radius, 0, ball.radius, 0);
      line(0, -ball.radius, 0, ball.radius);
      pop();
    }
    pop();

    // Head
    fill(50, 55, 65);
    stroke(0, 200, 255);
    strokeWeight(2);
    ellipse(0, -this.bodyH/2 - 15, this.headSize, this.headSize * 0.8);

    // Visor
    fill(0, 20, 40);
    stroke(0, 255, 255, 200);
    strokeWeight(2);
    arc(0, -this.bodyH/2 - 15, this.headSize - 5, 20, PI, TWO_PI);

    // Eyes
    let eyeBrightness = 200 + this.eyeGlow * 55;
    fill(0, eyeBrightness, 255);
    noStroke();
    circle(-8, -this.bodyH/2 - 15, 8);
    circle(8, -this.bodyH/2 - 15, 8);

    // Antenna
    stroke(100);
    strokeWeight(3);
    line(0, -this.bodyH/2 - 30, 0, -this.bodyH/2 - 45);
    fill(255, 0, 0);
    noStroke();
    circle(0, -this.bodyH/2 - 48, 8);

    pop();
  }
}

// ============== SCOREBOARD UI ==============

class Scoreboard {
  constructor() {
    this.totalScore = 0;
    this.dunks = 0;
    this.misses = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.lastDunk = null;
    this.lastDunkTimer = 0;
    this.passRating = null;
    this.history = [];
  }

  recordDunk(dunkType, analyzer) {
    this.totalScore += dunkType.points;
    this.dunks++;
    this.streak++;
    if (this.streak > this.bestStreak) this.bestStreak = this.streak;
    this.lastDunk = dunkType;
    this.lastDunkTimer = millis();
    this.passRating = { h: analyzer.height, s: analyzer.speed, a: analyzer.accuracy };
    this.history.push({ type: 'dunk', dunk: dunkType, ts: millis() });
    if (this.history.length > 20) this.history.shift();
  }

  recordMiss() {
    this.misses++;
    this.streak = 0;
    this.history.push({ type: 'miss', ts: millis() });
    if (this.history.length > 20) this.history.shift();
  }

  draw() {
    let panelW = 220;
    let x = width - panelW;

    // Panel
    fill(10, 15, 25, 240);
    stroke(0, 255, 255, 100);
    strokeWeight(2);
    rect(x, 0, panelW, height);

    // Header
    fill(0, 255, 255);
    noStroke();
    textSize(20);
    textAlign(LEFT, TOP);
    text("SCOREBOARD", x + 20, 25);

    stroke(0, 255, 255, 100);
    line(x + 20, 55, x + panelW - 20, 55);

    // Stats
    let y = 75;
    this.drawStat("SCORE", this.totalScore, x + 20, y, color(255, 215, 0));
    this.drawStat("DUNKS", this.dunks, x + 20, y += 35, color(0, 255, 150));
    this.drawStat("MISSES", this.misses, x + 20, y += 35, color(255, 80, 80));
    this.drawStat("STREAK", this.streak, x + 20, y += 35);
    this.drawStat("BEST", this.bestStreak, x + 20, y += 35, color(255, 150, 0));

    // Last dunk display
    if (this.lastDunk && millis() - this.lastDunkTimer < 3000) {
      y += 50;
      fill(this.lastDunk.color);
      textSize(14);
      textAlign(CENTER, TOP);
      text(this.lastDunk.name, x + panelW/2, y);
      text("+" + this.lastDunk.points + " PTS", x + panelW/2, y + 20);

      // Pass rating
      if (this.passRating) {
        y += 50;
        fill(150);
        textSize(10);
        textAlign(LEFT, TOP);
        let labels = ["LOW", "MID", "HIGH"];
        let speeds = ["SLOW", "MID", "FAST"];
        let accs = ["OFF", "GOOD", "PERFECT"];
        text("HEIGHT: " + labels[this.passRating.h - 1], x + 20, y);
        text("SPEED: " + speeds[this.passRating.s - 1], x + 20, y + 15);
        text("ACCURACY: " + accs[this.passRating.a - 1], x + 20, y + 30);
      }
    }

    // History
    y = height - 60;
    fill(100);
    textSize(10);
    textAlign(LEFT, TOP);
    text("HISTORY", x + 20, y - 20);

    let boxW = (panelW - 40) / 10;
    for (let i = 0; i < 10; i++) {
      let idx = this.history.length - 10 + i;
      if (idx >= 0 && idx < this.history.length) {
        let item = this.history[idx];
        if (item.type === 'dunk') {
          fill(item.dunk.color);
        } else {
          fill(80, 30, 30);
        }
      } else {
        fill(30);
      }
      noStroke();
      rect(x + 20 + i * boxW, y, boxW - 2, 20);
    }
  }

  drawStat(label, value, x, y, valueColor = color(255)) {
    fill(120);
    textSize(12);
    textAlign(LEFT, TOP);
    text(label, x, y);
    fill(valueColor);
    textAlign(RIGHT, TOP);
    text(value, x + 170, y);
  }
}

// ============== DUNK ANNOUNCEMENT ==============

class DunkAnnouncer {
  constructor() {
    this.currentDunk = null;
    this.showTime = 0;
    this.particles = [];
  }

  announce(dunkType) {
    this.currentDunk = dunkType;
    this.showTime = millis();

    // Spawn particles
    this.particles = [];
    for (let i = 0; i < 30; i++) {
      this.particles.push({
        x: width/2 + random(-200, 200),
        y: height/2 + random(-50, 50),
        vx: random(-5, 5),
        vy: random(-8, -2),
        size: random(5, 15),
        color: dunkType.color,
        life: 1
      });
    }
  }

  update() {
    for (let p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2;
      p.life -= 0.02;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  draw() {
    // Particles
    for (let p of this.particles) {
      fill(p.color[0], p.color[1], p.color[2], p.life * 255);
      noStroke();
      circle(p.x, p.y, p.size * p.life);
    }

    if (!this.currentDunk) return;

    let elapsed = millis() - this.showTime;
    if (elapsed > 2000) {
      this.currentDunk = null;
      return;
    }

    let alpha = elapsed < 500 ? map(elapsed, 0, 500, 0, 255) :
                elapsed > 1500 ? map(elapsed, 1500, 2000, 255, 0) : 255;

    let scale = elapsed < 300 ? map(elapsed, 0, 300, 0.5, 1.2) :
                elapsed < 500 ? map(elapsed, 300, 500, 1.2, 1) : 1;

    push();
    translate(width/2 - 110, height/2);
    scale = constrain(scale, 0.5, 1.5);

    // Glow
    for (let i = 3; i > 0; i--) {
      fill(this.currentDunk.color[0], this.currentDunk.color[1], this.currentDunk.color[2], alpha * 0.2);
      noStroke();
      textSize(48 + i * 5);
      textAlign(CENTER, CENTER);
      text(this.currentDunk.name, 0, 0);
    }

    // Main text
    fill(this.currentDunk.color[0], this.currentDunk.color[1], this.currentDunk.color[2], alpha);
    textSize(48);
    text(this.currentDunk.name, 0, 0);

    // Points
    fill(255, alpha);
    textSize(32);
    text("+" + this.currentDunk.points, 0, 45);

    pop();
  }
}

// ============== MAIN GAME ==============

class AlleyOopGame {
  constructor() {
    this.gravity = createVector(0, 0.35);
    this.floorY = height - 80;

    // Create game objects
    this.hoop = new Hoop(width - 350, height - 280);
    this.robot = new DunkingRobot(width - 400, this.floorY);
    this.ball = new Basketball(200, height - 200);
    this.analyzer = new PassAnalyzer();
    this.scoreboard = new Scoreboard();
    this.announcer = new DunkAnnouncer();

    // Pass controls
    this.anchor = createVector(200, height - 200);
    this.dragPos = this.anchor.copy();
    this.isDragging = false;
    this.maxDrag = 180;

    this.resize();
  }

  resize() {
    this.floorY = height - 80;
    this.hoop.pos.set(width - 350, height - 280);
    this.robot.basePos.set(width - 400, this.floorY);
    this.anchor.set(180, height - 200);

    if (!this.ball.launched) {
      this.ball.pos = this.anchor.copy();
      this.dragPos = this.anchor.copy();
    }
  }

  handlePress(mx, my) {
    // Check if clicking ball
    if (!this.ball.launched && !this.ball.caught &&
        dist(mx, my, this.ball.pos.x, this.ball.pos.y) < 50) {
      this.isDragging = true;
    }
  }

  handleDrag(mx, my) {
    if (this.isDragging) {
      this.dragPos.set(mx, my);
      let v = p5.Vector.sub(this.dragPos, this.anchor);
      if (v.mag() > this.maxDrag) {
        v.setMag(this.maxDrag);
        this.dragPos = p5.Vector.add(this.anchor, v);
      }
      this.ball.pos = this.dragPos.copy();
    }
  }

  handleRelease() {
    if (this.isDragging) {
      this.isDragging = false;
      let force = p5.Vector.sub(this.anchor, this.dragPos);
      force.mult(0.16);
      this.ball.launch(force, this.floorY);
    }
  }

  resetBall() {
    this.ball = new Basketball(this.anchor.x, this.anchor.y);
    this.dragPos = this.anchor.copy();
    this.analyzer.reset();
    this.robot.reset();
  }

  scoreDunk(dunkType, analyzer) {
    this.scoreboard.recordDunk(dunkType, analyzer);
    this.announcer.announce(dunkType);
  }

  update() {
    this.ball.update(this.gravity, this.floorY);
    this.hoop.update();
    this.robot.update(this.ball, this.hoop, this.analyzer, this);
    this.announcer.update();

    // Check for miss
    if (this.ball.missed && !this.ball.scored) {
      if (!this.ball.missRecorded) {
        this.scoreboard.recordMiss();
        this.ball.missRecorded = true;
      }
    }

    // Auto reset after score or miss
    if ((this.ball.scored || this.ball.missed) && this.robot.state === "IDLE") {
      if (!this.resetTimer) {
        this.resetTimer = millis();
      } else if (millis() - this.resetTimer > 1500) {
        this.resetBall();
        this.resetTimer = null;
      }
    }
  }

  draw() {
    // Cyberpunk gym background
    this.drawEnvironment();

    // Game objects
    this.hoop.draw();
    if (!this.ball.caught) this.ball.draw();
    this.robot.draw(this.ball);

    // Pass UI
    this.drawPassUI();

    // UI
    this.scoreboard.draw();
    this.announcer.draw();

    // Instructions
    if (!this.ball.launched && !this.isDragging) {
      fill(255, 150);
      textSize(16);
      textAlign(CENTER);
      text("DRAG BALL TO PASS", this.anchor.x, this.anchor.y + 70);
      textSize(12);
      fill(0, 255, 255, 150);
      text("Lob it to your robot friend for the alley-oop!", this.anchor.x, this.anchor.y + 95);
    }
  }

  drawEnvironment() {
    // Dark gradient background
    for (let y = 0; y < height; y += 4) {
      let inter = map(y, 0, height, 0, 1);
      let c = lerpColor(color(15, 20, 35), color(5, 8, 15), inter);
      stroke(c);
      line(0, y, width, y);
    }

    // Grid floor
    fill(20, 25, 40);
    noStroke();
    rect(0, this.floorY, width, height - this.floorY);

    // Neon grid lines
    stroke(0, 255, 255, 30);
    strokeWeight(1);
    for (let x = 0; x < width; x += 60) {
      line(x, this.floorY, x, height);
    }
    for (let y = this.floorY; y < height; y += 20) {
      line(0, y, width, y);
    }

    // Court markings
    stroke(0, 255, 255, 50);
    strokeWeight(3);
    // Three-point arc
    noFill();
    arc(this.hoop.pos.x, this.floorY, 500, 300, PI, TWO_PI);

    // Free throw line
    line(this.hoop.pos.x - 200, this.floorY, this.hoop.pos.x - 200, this.floorY - 150);

    // Key/paint area
    stroke(255, 0, 100, 40);
    strokeWeight(2);
    rect(this.hoop.pos.x - 100, this.floorY - 180, 150, 180);

    // Wall panels
    stroke(0, 200, 255, 20);
    strokeWeight(1);
    for (let x = 50; x < width - 250; x += 150) {
      line(x, 50, x, this.floorY - 50);
    }

    // Ambient neon lights
    noStroke();
    fill(255, 0, 100, 20);
    rect(0, 0, width, 5);
    fill(0, 255, 255, 20);
    rect(0, this.floorY - 3, width, 6);

    // "GYM" neon sign
    push();
    translate(100, 100);
    fill(255, 0, 100);
    textSize(40);
    textStyle(BOLD);
    text("CYBER", 0, 0);
    fill(0, 255, 255);
    text("DUNK", 0, 45);
    // Glow
    drawingContext.shadowBlur = 20;
    drawingContext.shadowColor = 'rgba(255, 0, 100, 0.5)';
    fill(255, 0, 100, 100);
    text("CYBER", 0, 0);
    drawingContext.shadowColor = 'rgba(0, 255, 255, 0.5)';
    fill(0, 255, 255, 100);
    text("DUNK", 0, 45);
    drawingContext.shadowBlur = 0;
    pop();
  }

  drawPassUI() {
    if (this.isDragging) {
      // Slingshot bands
      stroke(255, 100, 0);
      strokeWeight(4);
      line(this.anchor.x - 15, this.anchor.y, this.ball.pos.x, this.ball.pos.y);
      line(this.anchor.x + 15, this.anchor.y, this.ball.pos.x, this.ball.pos.y);

      // Trajectory preview
      this.drawTrajectory();

      // Power meter
      let power = p5.Vector.sub(this.anchor, this.dragPos).mag() / this.maxDrag;
      let meterX = this.anchor.x - 60;
      let meterY = this.anchor.y - 80;
      let meterH = 60;

      fill(30, 40);
      stroke(100);
      strokeWeight(1);
      rect(meterX, meterY, 15, meterH);

      let powerColor = power < 0.3 ? color(100, 200, 255) :
                       power < 0.7 ? color(255, 200, 0) : color(255, 50, 50);
      fill(powerColor);
      noStroke();
      rect(meterX + 2, meterY + meterH - power * meterH + 2, 11, power * meterH - 4);

      fill(255);
      textSize(10);
      textAlign(CENTER);
      text("PWR", meterX + 7, meterY - 8);
    } else if (!this.ball.launched) {
      // Idle anchor
      stroke(100, 150);
      strokeWeight(2);
      noFill();
      circle(this.anchor.x, this.anchor.y, 80);

      // Direction hint
      stroke(0, 255, 255, 100);
      line(this.anchor.x, this.anchor.y, this.anchor.x + 50, this.anchor.y - 30);

      // Arrow
      push();
      translate(this.anchor.x + 50, this.anchor.y - 30);
      rotate(atan2(-30, 50));
      fill(0, 255, 255, 100);
      noStroke();
      triangle(0, 0, -10, -5, -10, 5);
      pop();
    }
  }

  drawTrajectory() {
    let force = p5.Vector.sub(this.anchor, this.dragPos).mult(0.16);
    let simPos = this.ball.pos.copy();
    let simVel = force.copy();

    noFill();
    stroke(255, 255, 255, 80);
    strokeWeight(2);
    beginShape();
    for (let i = 0; i < 50; i++) {
      vertex(simPos.x, simPos.y);
      simVel.add(this.gravity);
      simPos.add(simVel);
      if (simPos.y > this.floorY) break;
    }
    endShape();

    // Sweet spot indicator
    let sweet = this.hoop.getSweetSpot();
    let d = dist(simPos.x, simPos.y, sweet.x, sweet.y);

    // Draw sweet spot target
    noFill();
    if (d < 50) {
      stroke(0, 255, 0, 150);
    } else if (d < 100) {
      stroke(255, 255, 0, 100);
    } else {
      stroke(255, 100, 100, 80);
    }
    strokeWeight(2);
    circle(sweet.x, sweet.y, 60);
    line(sweet.x - 15, sweet.y, sweet.x + 15, sweet.y);
    line(sweet.x, sweet.y - 15, sweet.x, sweet.y + 15);
  }
}
