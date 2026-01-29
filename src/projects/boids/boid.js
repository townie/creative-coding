// Individual Boid class
export class Boid {
  constructor(p, x, y) {
    this.p = p;
    this.position = p.createVector(x, y);
    this.velocity = p5.Vector.random2D();
    this.velocity.setMag(p.random(2, 4));
    this.acceleration = p.createVector();
    this.maxForce = 0.2;
    this.maxSpeed = 4;
    this.size = 4;
  }

  edges() {
    const p = this.p;
    if (this.position.x > p.width) this.position.x = 0;
    if (this.position.x < 0) this.position.x = p.width;
    if (this.position.y > p.height) this.position.y = 0;
    if (this.position.y < 0) this.position.y = p.height;
  }

  align(boids, perceptionRadius) {
    const p = this.p;
    let steering = p.createVector();
    let total = 0;

    for (let other of boids) {
      let d = p5.Vector.dist(this.position, other.position);
      if (other !== this && d < perceptionRadius) {
        steering.add(other.velocity);
        total++;
      }
    }

    if (total > 0) {
      steering.div(total);
      steering.setMag(this.maxSpeed);
      steering.sub(this.velocity);
      steering.limit(this.maxForce);
    }

    return steering;
  }

  separation(boids, perceptionRadius) {
    const p = this.p;
    let steering = p.createVector();
    let total = 0;

    for (let other of boids) {
      let d = p5.Vector.dist(this.position, other.position);
      if (other !== this && d < perceptionRadius) {
        let diff = p5.Vector.sub(this.position, other.position);
        diff.div(d * d);
        steering.add(diff);
        total++;
      }
    }

    if (total > 0) {
      steering.div(total);
      steering.setMag(this.maxSpeed);
      steering.sub(this.velocity);
      steering.limit(this.maxForce);
    }

    return steering;
  }

  cohesion(boids, perceptionRadius) {
    const p = this.p;
    let steering = p.createVector();
    let total = 0;

    for (let other of boids) {
      let d = p5.Vector.dist(this.position, other.position);
      if (other !== this && d < perceptionRadius) {
        steering.add(other.position);
        total++;
      }
    }

    if (total > 0) {
      steering.div(total);
      steering.sub(this.position);
      steering.setMag(this.maxSpeed);
      steering.sub(this.velocity);
      steering.limit(this.maxForce);
    }

    return steering;
  }

  flock(boids, params) {
    let alignment = this.align(boids, params.alignRadius);
    let cohesion = this.cohesion(boids, params.cohesionRadius);
    let separation = this.separation(boids, params.separationRadius);

    alignment.mult(params.alignForce);
    cohesion.mult(params.cohesionForce);
    separation.mult(params.separationForce);

    this.acceleration.add(alignment);
    this.acceleration.add(cohesion);
    this.acceleration.add(separation);
  }

  update() {
    this.position.add(this.velocity);
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxSpeed);
    this.acceleration.mult(0);
  }

  draw() {
    const p = this.p;
    p.push();
    p.translate(this.position.x, this.position.y);
    p.rotate(this.velocity.heading());
    p.fill(255);
    p.noStroke();
    p.triangle(
      this.size * 2, 0,
      -this.size, -this.size,
      -this.size, this.size
    );
    p.pop();
  }
}
