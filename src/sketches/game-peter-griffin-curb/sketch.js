let peter;
let curbs = [];
let gravity = 0.8;
let gameSpeed = 8;
let score = 0;
let gameState = 'START'; // START, PLAY, GAMEOVER
let groundY;
let hurtTimer = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  groundY = height - 120;
  peter = new Peter();
}

function draw() {
  background(135, 206, 235); // Sky blue

  drawBackground();

  if (gameState === 'START') {
    peter.y = groundY - peter.h;
    peter.vy = 0;
    peter.show();
    drawUI("PETER VS THE CURB", "Press SPACE or CLICK to Jump");
  } else if (gameState === 'PLAY') {
    peter.update();
    peter.show();
    handleCurbs();
    drawScore();
  } else if (gameState === 'GAMEOVER') {
    peter.showHurt();
    for (let c of curbs) c.show();
    handleHurtAnimation();
  }
}

function drawBackground() {
  // Grass
  noStroke();
  fill(100, 200, 100);
  rect(0, groundY - 50, width, 50);

  // Road
  fill(80);
  rect(0, groundY, width, height - groundY);

  // Sidewalk (The path Peter runs on)
  fill(200);
  rect(0, groundY, width, 20);

  // Curb edge visual (Front of the sidewalk)
  fill(160);
  rect(0, groundY + 20, width, 15);
}

function drawUI(title, subtitle) {
  fill(0, 150);
  rect(0, 0, width, height);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(min(width / 10, 60));
  textStyle(BOLD);
  text(title, width / 2, height / 2 - 40);

  textSize(min(width / 20, 24));
  textStyle(NORMAL);
  text(subtitle, width / 2, height / 2 + 40);
}

function drawScore() {
  fill(255);
  stroke(0);
  strokeWeight(3);
  textSize(32);
  textAlign(LEFT, TOP);
  text(`Score: ${score}`, 20, 20);
}

function handleCurbs() {
  if (frameCount % 70 === 0 || (random(1) < 0.01 && frameCount % 30 !== 0)) {
     if (curbs.length === 0 || width - curbs[curbs.length-1].x > 350) {
        curbs.push(new Curb());
     }
  }

  for (let i = curbs.length - 1; i >= 0; i--) {
    curbs[i].update();
    curbs[i].show();

    if (curbs[i].hits(peter)) {
      gameState = 'GAMEOVER';
      hurtTimer = millis();
    }

    if (curbs[i].offscreen()) {
      curbs.splice(i, 1);
      score++;
      if(score % 5 === 0) gameSpeed += 0.5;
    }
  }
}

function handleHurtAnimation() {
  let elapsed = millis() - hurtTimer;

  stroke(0);
  strokeWeight(4);
  textAlign(CENTER, CENTER);
  textSize(min(width/8, 80));
  textStyle(BOLDITALIC);

  // Cycle "Sssss" and "Ahhhh"
  let cycle = elapsed % 3000;

  if (cycle < 1500) {
    fill(255, 50, 50);
    text("SSSSSS...", width / 2, height / 3);
  } else {
    fill(255, 255, 50);
    text("AHHHHH...", width / 2, height / 3);
  }

  if (elapsed > 1000) {
    noStroke();
    fill(255);
    textSize(24);
    textStyle(NORMAL);
    text("Click or Space to Restart", width / 2, height - 50);
  }
}

function mousePressed() {
  handleInput();
}

function keyPressed() {
  if (key === ' ') {
    handleInput();
  }
}

function handleInput() {
  if (gameState === 'START') {
    gameState = 'PLAY';
    resetGame();
  } else if (gameState === 'PLAY') {
    peter.jump();
  } else if (gameState === 'GAMEOVER') {
    if (millis() - hurtTimer > 1000) {
      gameState = 'START';
    }
  }
}

function resetGame() {
  score = 0;
  gameSpeed = 8;
  curbs = [];
  peter = new Peter();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  groundY = height - 120;
  if (peter) {
    if (peter.onGround) peter.y = groundY - peter.h;
  }
}

class Peter {
  constructor() {
    this.w = 50;
    this.h = 90;
    this.x = width * 0.15;
    this.y = groundY - this.h;
    this.vy = 0;
    this.jumpForce = -15;
    this.onGround = true;
  }

  jump() {
    if (this.onGround) {
      this.vy = this.jumpForce;
      this.onGround = false;
    }
  }

  update() {
    this.vy += gravity;
    this.y += this.vy;

    if (this.y > groundY - this.h) {
      this.y = groundY - this.h;
      this.vy = 0;
      this.onGround = true;
    }
  }

  show() {
    push();
    translate(this.x, this.y);

    noStroke();

    // Legs (Green Pants)
    fill(46, 139, 87);
    if (this.onGround) {
        // Walking animation
        let walk = sin(frameCount * 0.5) * 10;
        rect(10 + walk, 50, 12, 40);
        rect(28 - walk, 50, 12, 40);
        // Shoes
        fill(50);
        ellipse(16 + walk, 90, 16, 10);
        ellipse(34 - walk, 90, 16, 10);
    } else {
        // Jumping pose
        rect(10, 50, 12, 35);
        rect(28, 55, 12, 35);
        fill(50);
        ellipse(16, 85, 16, 10);
        ellipse(34, 90, 16, 10);
    }

    // Torso (White Shirt)
    fill(255);
    ellipse(25, 45, 55, 60); // Round belly
    rect(5, 45, 40, 10); // Shirt bottom

    // Belt
    fill(30);
    rect(10, 50, 30, 4);
    fill(255, 215, 0);
    rect(22, 50, 6, 4);

    // Head
    fill(255, 220, 177);
    ellipse(25, 15, 32, 36);

    // Chin
    ellipse(20, 30, 10, 10);
    ellipse(30, 30, 10, 10);

    // Mouth
    stroke(0);
    strokeWeight(1);
    noFill();
    arc(25, 25, 10, 5, 0, PI);

    // Glasses
    fill(255);
    stroke(0);
    strokeWeight(1.5);
    ellipse(19, 15, 12, 12);
    ellipse(31, 15, 12, 12);
    point(19, 15);
    point(31, 15);
    line(13, 15, 5, 18);

    // Hair
    noStroke();
    fill(100, 70, 20);
    arc(25, 8, 34, 20, PI, TWO_PI);

    // Arms
    stroke(255);
    strokeWeight(8);
    line(5, 30, -5, 50);
    line(45, 30, 55, 50);

    // Hands
    noStroke();
    fill(255, 220, 177);
    ellipse(-5, 52, 10, 10);
    ellipse(55, 52, 10, 10);

    pop();
  }

  showHurt() {
    push();
    translate(this.x, groundY);

    // Rocking pain animation
    let rock = sin(millis() * 0.008) * 0.1;
    rotate(rock);

    // Peter lying on ground
    translate(0, -20);

    noStroke();

    // Body
    fill(255);
    ellipse(0, 10, 60, 50);

    // Head
    push();
    translate(-35, 0);
    rotate(-0.2);
    fill(255, 220, 177);
    ellipse(0, 0, 32, 36);
    // Hair
    fill(100, 70, 20);
    arc(0, -7, 34, 20, PI, TWO_PI);
    // Glasses
    fill(255);
    stroke(0);
    strokeWeight(1);
    ellipse(-6, 0, 12, 12);
    ellipse(6, 0, 12, 12);
    // Open mouth
    fill(0);
    ellipse(0, 15, 10, 15);
    pop();

    // Legs
    noStroke();
    fill(46, 139, 87);

    // Leg on ground
    rect(20, 10, 40, 14);
    fill(50);
    ellipse(60, 17, 16, 10);

    // Leg held in pain
    push();
    translate(20, 10);
    rotate(-0.5);
    fill(46, 139, 87);
    rect(0, 0, 20, 14); // Thigh
    translate(20, 0);
    rotate(1.8);
    rect(0, 0, 20, 14); // Shin
    fill(50);
    ellipse(20, 7, 16, 10); // Shoe
    pop();

    // Arms holding knee
    stroke(255);
    strokeWeight(8);
    line(-10, 0, 30, -15); // Reaching arm

    noStroke();
    fill(255, 220, 177);
    ellipse(30, -15, 12, 12); // Hand

    pop();
  }
}

class Curb {
  constructor() {
    this.w = 30;
    this.h = 25;
    this.x = width;
    this.y = groundY - this.h;
  }

  update() {
    this.x -= gameSpeed;
  }

  show() {
    // Concrete Curb
    fill(180);
    stroke(100);
    strokeWeight(2);
    rect(this.x, this.y, this.w, this.h);

    // 3D effect
    noStroke();
    fill(220);
    quad(this.x, this.y, this.x + this.w, this.y, this.x + this.w + 10, this.y - 10, this.x + 10, this.y - 10);
    fill(140);
    quad(this.x + this.w, this.y, this.x + this.w + 10, this.y - 10, this.x + this.w + 10, this.y - 10 + this.h, this.x + this.w, this.y + this.h);
  }

  offscreen() {
    return this.x < -100;
  }

  hits(player) {
    // Simple AABB
    let px = player.x + 15; // Narrower hitbox for player
    let py = player.y;
    let pw = 20;
    let ph = player.h;

    return (px < this.x + this.w &&
            px + pw > this.x &&
            py + ph > this.y + 5); // +5 tolerance
  }
}
