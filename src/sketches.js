// Collection of p5.js sketches
// Each sketch has: name, setup function, draw function

export const sketches = [
  {
    name: "Flow Field",
    setup: (p) => {
      p.cols = Math.floor(p.width / 20);
      p.rows = Math.floor(p.height / 20);
      p.flowField = [];
      p.particles = [];
      p.zoff = 0;
      for (let i = 0; i < 800; i++) {
        p.particles.push({
          x: p.random(p.width),
          y: p.random(p.height),
          prevX: 0,
          prevY: 0
        });
      }
    },
    draw: (p) => {
      p.background(0, 15);
      let yoff = 0;
      for (let y = 0; y < p.rows; y++) {
        let xoff = 0;
        for (let x = 0; x < p.cols; x++) {
          let angle = p.noise(xoff, yoff, p.zoff) * p.TWO_PI * 2;
          p.flowField[x + y * p.cols] = p.createVector(p.cos(angle), p.sin(angle));
          xoff += 0.1;
        }
        yoff += 0.1;
      }
      p.zoff += 0.002;

      p.stroke(255, 20);
      p.strokeWeight(1);
      for (let particle of p.particles) {
        let x = Math.floor(particle.x / 20);
        let y = Math.floor(particle.y / 20);
        let index = x + y * p.cols;
        let force = p.flowField[index];
        if (force) {
          particle.prevX = particle.x;
          particle.prevY = particle.y;
          particle.x += force.x * 2;
          particle.y += force.y * 2;
          p.line(particle.prevX, particle.prevY, particle.x, particle.y);
        }
        if (particle.x < 0 || particle.x > p.width || particle.y < 0 || particle.y > p.height) {
          particle.x = p.random(p.width);
          particle.y = p.random(p.height);
        }
      }
    }
  },

  {
    name: "Circles",
    setup: (p) => {
      p.t = 0;
    },
    draw: (p) => {
      p.background(0);
      p.noFill();
      p.translate(p.width / 2, p.height / 2);

      for (let i = 0; i < 50; i++) {
        let radius = i * 8;
        let offset = p.sin(p.t + i * 0.1) * 20;
        p.stroke(255, 255 - i * 4);
        p.strokeWeight(1);
        p.ellipse(offset, 0, radius, radius);
      }
      p.t += 0.02;
    }
  },

  {
    name: "Noise Waves",
    setup: (p) => {
      p.t = 0;
    },
    draw: (p) => {
      p.background(0);
      p.stroke(255);
      p.strokeWeight(1);
      p.noFill();

      for (let j = 0; j < 20; j++) {
        p.beginShape();
        for (let x = 0; x <= p.width; x += 5) {
          let y = p.height / 2 +
            p.noise(x * 0.005, j * 0.2, p.t) * 200 - 100 +
            j * 20 - 200;
          p.vertex(x, y);
        }
        p.endShape();
      }
      p.t += 0.01;
    }
  },

  {
    name: "Particles",
    setup: (p) => {
      p.particles = [];
      for (let i = 0; i < 200; i++) {
        p.particles.push({
          x: p.random(p.width),
          y: p.random(p.height),
          vx: p.random(-1, 1),
          vy: p.random(-1, 1),
          size: p.random(2, 6)
        });
      }
    },
    draw: (p) => {
      p.background(0, 30);
      p.noStroke();

      for (let particle of p.particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > p.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > p.height) particle.vy *= -1;

        p.fill(255, 150);
        p.ellipse(particle.x, particle.y, particle.size);
      }

      // Draw connections
      p.stroke(255, 30);
      p.strokeWeight(1);
      for (let i = 0; i < p.particles.length; i++) {
        for (let j = i + 1; j < p.particles.length; j++) {
          let d = p.dist(p.particles[i].x, p.particles[i].y, p.particles[j].x, p.particles[j].y);
          if (d < 100) {
            p.line(p.particles[i].x, p.particles[i].y, p.particles[j].x, p.particles[j].y);
          }
        }
      }
    }
  },

  {
    name: "Grid Distortion",
    setup: (p) => {
      p.t = 0;
    },
    draw: (p) => {
      p.background(0);
      p.stroke(255);
      p.strokeWeight(1);
      p.noFill();

      let spacing = 30;
      let cx = p.width / 2;
      let cy = p.height / 2;

      for (let x = 0; x < p.width; x += spacing) {
        p.beginShape();
        for (let y = 0; y <= p.height; y += 5) {
          let d = p.dist(x, y, cx, cy);
          let offset = p.sin(d * 0.02 - p.t) * 20;
          p.vertex(x + offset, y);
        }
        p.endShape();
      }

      for (let y = 0; y < p.height; y += spacing) {
        p.beginShape();
        for (let x = 0; x <= p.width; x += 5) {
          let d = p.dist(x, y, cx, cy);
          let offset = p.sin(d * 0.02 - p.t) * 20;
          p.vertex(x, y + offset);
        }
        p.endShape();
      }

      p.t += 0.05;
    }
  },

  {
    name: "Spiral",
    setup: (p) => {
      p.angle = 0;
    },
    draw: (p) => {
      p.background(0, 10);
      p.translate(p.width / 2, p.height / 2);
      p.stroke(255);
      p.strokeWeight(2);
      p.noFill();

      p.beginShape();
      for (let i = 0; i < 500; i++) {
        let a = i * 0.1 + p.angle;
        let r = i * 0.5;
        let x = p.cos(a) * r;
        let y = p.sin(a) * r;
        p.vertex(x, y);
      }
      p.endShape();

      p.angle += 0.02;
    }
  },

  {
    name: "Pulse",
    setup: (p) => {
      p.rings = [];
    },
    draw: (p) => {
      p.background(0);
      p.translate(p.width / 2, p.height / 2);

      if (p.frameCount % 20 === 0) {
        p.rings.push({ radius: 0, alpha: 255 });
      }

      p.noFill();
      for (let i = p.rings.length - 1; i >= 0; i--) {
        let ring = p.rings[i];
        p.stroke(255, ring.alpha);
        p.strokeWeight(2);
        p.ellipse(0, 0, ring.radius, ring.radius);
        ring.radius += 4;
        ring.alpha -= 2;
        if (ring.alpha <= 0) p.rings.splice(i, 1);
      }
    }
  },

  {
    name: "Matrix",
    setup: (p) => {
      p.streams = [];
      let cols = Math.floor(p.width / 20);
      for (let i = 0; i < cols; i++) {
        p.streams.push({
          x: i * 20,
          y: p.random(-500, 0),
          speed: p.random(5, 15),
          chars: []
        });
        for (let j = 0; j < 20; j++) {
          p.streams[i].chars.push(String.fromCharCode(0x30A0 + p.random(96)));
        }
      }
    },
    draw: (p) => {
      p.background(0, 100);
      p.textSize(18);
      p.textFont('monospace');

      for (let stream of p.streams) {
        for (let i = 0; i < stream.chars.length; i++) {
          let alpha = p.map(i, 0, stream.chars.length, 255, 0);
          p.fill(255, alpha);
          p.text(stream.chars[i], stream.x, stream.y - i * 20);
        }
        stream.y += stream.speed;
        if (stream.y - stream.chars.length * 20 > p.height) {
          stream.y = p.random(-200, 0);
        }
        if (p.random() < 0.02) {
          let idx = Math.floor(p.random(stream.chars.length));
          stream.chars[idx] = String.fromCharCode(0x30A0 + p.random(96));
        }
      }
    }
  },

  {
    name: "Attractor",
    setup: (p) => {
      p.x = 0.1;
      p.y = 0;
      p.z = 0;
      p.points = [];
    },
    draw: (p) => {
      p.background(0, 20);
      p.translate(p.width / 2, p.height / 2);

      let dt = 0.01;
      let a = 10, b = 28, c = 8/3;

      for (let i = 0; i < 10; i++) {
        let dx = a * (p.y - p.x);
        let dy = p.x * (b - p.z) - p.y;
        let dz = p.x * p.y - c * p.z;
        p.x += dx * dt;
        p.y += dy * dt;
        p.z += dz * dt;
        p.points.push({x: p.x, y: p.y, z: p.z});
      }

      if (p.points.length > 2000) p.points.splice(0, 10);

      p.stroke(255, 50);
      p.strokeWeight(1);
      p.noFill();
      p.beginShape();
      for (let pt of p.points) {
        p.vertex(pt.x * 8, pt.y * 8);
      }
      p.endShape();
    }
  },

  {
    name: "Terrain",
    setup: (p) => {
      p.flying = 0;
    },
    draw: (p) => {
      p.background(0);
      p.stroke(255);
      p.strokeWeight(1);
      p.noFill();

      p.flying -= 0.05;

      let scale = 20;
      let cols = Math.floor(p.width / scale) + 1;
      let rows = 30;

      p.translate(0, p.height / 2);
      p.rotateX(p.PI / 3);
      p.translate(-p.width / 2, -200);

      for (let y = 0; y < rows - 1; y++) {
        p.beginShape(p.TRIANGLE_STRIP);
        for (let x = 0; x < cols; x++) {
          let z1 = p.map(p.noise(x * 0.1, (y + p.flying) * 0.1), 0, 1, -50, 50);
          let z2 = p.map(p.noise(x * 0.1, (y + 1 + p.flying) * 0.1), 0, 1, -50, 50);
          p.vertex(x * scale, y * scale, z1);
          p.vertex(x * scale, (y + 1) * scale, z2);
        }
        p.endShape();
      }
    }
  }
];
