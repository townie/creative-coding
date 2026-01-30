/**
 * Interactive Particle Trail
 *
 * Generates a vibrant, fading particle stream following the cursor.
 * Uses HSB color mode for dynamic hue cycling and vector math for physics.
 */

const particles = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  noStroke();
}

function draw() {
  // Semi-transparent background creates the trailing effect
  background(0, 0, 5, 10);

  // Spawn new particles at cursor position
  for (let i = 0; i < 3; i++) {
    particles.push(new Particle(mouseX, mouseY));
  }

  // Update and render active particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    p.show();
    if (p.isDead()) {
      particles.splice(i, 1);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

class Particle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    // Random direction with varying speed
    this.vel = p5.Vector.random2D().mult(random(0.5, 2.5));
    this.size = random(10, 25);
    // Cycle hue based on frame count for rainbow effect
    this.hue = (frameCount * 2) % 360;
    this.alpha = 100;
  }

  update() {
    this.pos.add(this.vel);
    this.size *= 0.95; // Shrink over time
    this.alpha -= 1.5; // Fade out
  }

  show() {
    fill(this.hue, 80, 100, this.alpha);
    ellipse(this.pos.x, this.pos.y, this.size);
  }

  isDead() {
    return this.alpha <= 0;
  }
}
