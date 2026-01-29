import { Boid } from "./boid.js";

// Boids flocking simulation
// Demonstrates: separation, alignment, cohesion

const params = {
  count: 200,
  alignRadius: 50,
  cohesionRadius: 50,
  separationRadius: 30,
  alignForce: 1.0,
  cohesionForce: 1.0,
  separationForce: 1.5
};

let flock = [];

export function init(container) {
  // Create controls
  const controls = document.createElement("div");
  controls.className = "project-controls";
  controls.innerHTML = `
    <div class="control-group">
      <label>Boids: <span id="count-val">${params.count}</span></label>
      <input type="range" id="count" min="50" max="500" value="${params.count}">
    </div>
    <div class="control-group">
      <label>Separation: <span id="sep-val">${params.separationForce}</span></label>
      <input type="range" id="separation" min="0" max="3" step="0.1" value="${params.separationForce}">
    </div>
    <div class="control-group">
      <label>Alignment: <span id="align-val">${params.alignForce}</span></label>
      <input type="range" id="alignment" min="0" max="3" step="0.1" value="${params.alignForce}">
    </div>
    <div class="control-group">
      <label>Cohesion: <span id="coh-val">${params.cohesionForce}</span></label>
      <input type="range" id="cohesion" min="0" max="3" step="0.1" value="${params.cohesionForce}">
    </div>
  `;
  container.appendChild(controls);

  // Wire up controls
  const countSlider = controls.querySelector("#count");
  const sepSlider = controls.querySelector("#separation");
  const alignSlider = controls.querySelector("#alignment");
  const cohSlider = controls.querySelector("#cohesion");

  countSlider.oninput = (e) => {
    params.count = parseInt(e.target.value);
    controls.querySelector("#count-val").textContent = params.count;
  };

  sepSlider.oninput = (e) => {
    params.separationForce = parseFloat(e.target.value);
    controls.querySelector("#sep-val").textContent = params.separationForce.toFixed(1);
  };

  alignSlider.oninput = (e) => {
    params.alignForce = parseFloat(e.target.value);
    controls.querySelector("#align-val").textContent = params.alignForce.toFixed(1);
  };

  cohSlider.oninput = (e) => {
    params.cohesionForce = parseFloat(e.target.value);
    controls.querySelector("#coh-val").textContent = params.cohesionForce.toFixed(1);
  };

  // Create p5 instance
  return new p5((p) => {
    p.setup = () => {
      const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
      canvas.parent(container);

      // Initialize flock
      flock = [];
      for (let i = 0; i < params.count; i++) {
        flock.push(new Boid(p, p.random(p.width), p.random(p.height)));
      }
    };

    p.draw = () => {
      p.background(0);

      // Adjust flock size if needed
      while (flock.length < params.count) {
        flock.push(new Boid(p, p.random(p.width), p.random(p.height)));
      }
      while (flock.length > params.count) {
        flock.pop();
      }

      // Update and draw boids
      for (let boid of flock) {
        boid.edges();
        boid.flock(flock, params);
        boid.update();
        boid.draw();
      }
    };

    p.windowResized = () => {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
    };
  });
}
