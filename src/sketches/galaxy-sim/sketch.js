// Gravitational constant
const G = 500;

// Time step for simulation
const dt = 0.1;
const maxTrailLength = 500;

// Color palette for new bodies
const colors = [
    [100, 150, 255],  // blue
    [255, 150, 100],  // orange
    [100, 255, 150],  // green
    [255, 100, 200],  // pink
    [255, 255, 100],  // yellow
    [150, 100, 255],  // purple
    [100, 255, 255],  // cyan
];

export function init(container) {
    return new p5((p) => {
        // Camera/viewport state
        let zoom = 1;
        let camX = 0;
        let camY = 0;
        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let camStartX = 0;
        let camStartY = 0;

        // Minimap settings
        const minimapSize = 150;
        const minimapMargin = 20;

        // Array of all bodies
        let bodies = [];

        // Create a new body
        function createBody(x, y, vx, vy, mass, color) {
            return {
                pos: p.createVector(x, y),
                vel: p.createVector(vx, vy),
                mass: mass,
                color: color,
                trail: []
            };
        }

        // Convert screen coordinates to world coordinates
        function screenToWorld(sx, sy) {
            const wx = (sx - p.width / 2) / zoom + camX;
            const wy = (sy - p.height / 2) / zoom + camY;
            return { x: wx, y: wy };
        }

        // Convert world coordinates to screen coordinates
        function worldToScreen(wx, wy) {
            const sx = (wx - camX) * zoom + p.width / 2;
            const sy = (wy - camY) * zoom + p.height / 2;
            return { x: sx, y: sy };
        }

        // Get bounding box of all bodies (for minimap)
        function getWorldBounds() {
            if (bodies.length === 0) {
                return { minX: 0, maxX: p.width, minY: 0, maxY: p.height };
            }

            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;

            for (const body of bodies) {
                minX = Math.min(minX, body.pos.x);
                maxX = Math.max(maxX, body.pos.x);
                minY = Math.min(minY, body.pos.y);
                maxY = Math.max(maxY, body.pos.y);

                // Include trails
                for (const pt of body.trail) {
                    minX = Math.min(minX, pt.x);
                    maxX = Math.max(maxX, pt.x);
                    minY = Math.min(minY, pt.y);
                    maxY = Math.max(maxY, pt.y);
                }
            }

            // Add padding
            const padding = 100;
            minX -= padding;
            maxX += padding;
            minY -= padding;
            maxY += padding;

            return { minX, maxX, minY, maxY };
        }

        // Draw minimap
        function drawMinimap() {
            const bounds = getWorldBounds();
            const worldWidth = bounds.maxX - bounds.minX;
            const worldHeight = bounds.maxY - bounds.minY;

            // Minimap position
            const mmX = p.width - minimapSize - minimapMargin;
            const mmY = p.height - minimapSize - minimapMargin;

            // Background
            p.fill(0, 0, 0, 200);
            p.stroke(100);
            p.strokeWeight(1);
            p.rect(mmX, mmY, minimapSize, minimapSize);

            // Scale factor to fit world in minimap
            const scaleX = minimapSize / worldWidth;
            const scaleY = minimapSize / worldHeight;
            const scale = Math.min(scaleX, scaleY);

            // Center offset
            const offsetX = mmX + (minimapSize - worldWidth * scale) / 2;
            const offsetY = mmY + (minimapSize - worldHeight * scale) / 2;

            // Draw trails on minimap
            p.noFill();
            p.strokeWeight(0.5);
            for (const body of bodies) {
                p.stroke(body.color[0], body.color[1], body.color[2], 100);
                p.beginShape();
                for (const pt of body.trail) {
                    const mx = offsetX + (pt.x - bounds.minX) * scale;
                    const my = offsetY + (pt.y - bounds.minY) * scale;
                    p.vertex(mx, my);
                }
                p.endShape();
            }

            // Draw bodies on minimap
            p.noStroke();
            for (const body of bodies) {
                const mx = offsetX + (body.pos.x - bounds.minX) * scale;
                const my = offsetY + (body.pos.y - bounds.minY) * scale;
                p.fill(body.color[0], body.color[1], body.color[2]);
                p.circle(mx, my, Math.max(3, Math.sqrt(body.mass) * scale * 2));
            }

            // Draw viewport rectangle
            const viewLeft = screenToWorld(0, 0);
            const viewRight = screenToWorld(p.width, p.height);

            const vx1 = offsetX + (viewLeft.x - bounds.minX) * scale;
            const vy1 = offsetY + (viewLeft.y - bounds.minY) * scale;
            const vx2 = offsetX + (viewRight.x - bounds.minX) * scale;
            const vy2 = offsetY + (viewRight.y - bounds.minY) * scale;

            p.noFill();
            p.stroke(255, 255, 255, 150);
            p.strokeWeight(1);
            p.rect(vx1, vy1, vx2 - vx1, vy2 - vy1);
        }

        p.setup = () => {
            const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
            canvas.parent(container);

            // Initialize camera to center of canvas
            camX = p.width / 2;
            camY = p.height / 2;

            // Initialize the original two bodies
            const centerX = p.width / 2;
            const centerY = p.height / 2;
            const separation = 200;
            const mass1 = 20;
            const mass2 = 200;

            const totalMass = mass1 + mass2;
            const d1 = (separation * mass2) / totalMass;
            const d2 = (separation * mass1) / totalMass;

            const r = separation;
            const mu = G * totalMass;
            const v_orbital = Math.sqrt(mu / r) * 0.7;

            // Body 1 (blue)
            bodies.push(createBody(
                centerX - d1, centerY,
                0, (-v_orbital * mass2) / totalMass,
                mass1,
                colors[0]
            ));

            // Body 2 (orange)
            bodies.push(createBody(
                centerX + d2, centerY,
                0, (v_orbital * mass1) / totalMass,
                mass2,
                colors[1]
            ));
        };

        p.windowResized = () => {
            p.resizeCanvas(p.windowWidth, p.windowHeight);
        };

        // Mouse wheel for zooming
        p.mouseWheel = (event) => {
            // Get world position under mouse before zoom
            const worldBefore = screenToWorld(p.mouseX, p.mouseY);

            // Adjust zoom
            const zoomFactor = 0.1;
            if (event && event.deltaY > 0) {
                zoom *= (1 - zoomFactor);  // Zoom out
            } else {
                zoom *= (1 + zoomFactor);  // Zoom in
            }

            // Clamp zoom
            zoom = p.constrain(zoom, 0.01, 10);

            // Get world position under mouse after zoom
            const worldAfter = screenToWorld(p.mouseX, p.mouseY);

            // Adjust camera to keep mouse point stationary
            camX += worldBefore.x - worldAfter.x;
            camY += worldBefore.y - worldAfter.y;

            return false;  // Prevent page scroll
        };

        // Mouse drag for panning
        p.mousePressed = () => {
            // Check if clicking on minimap
            const minimapX = p.width - minimapSize - minimapMargin;
            const minimapY = p.height - minimapSize - minimapMargin;
            if (p.mouseX >= minimapX && p.mouseX <= minimapX + minimapSize &&
                p.mouseY >= minimapY && p.mouseY <= minimapY + minimapSize) {
                // Click on minimap - jump camera to that location
                const bounds = getWorldBounds();
                const clickRatioX = (p.mouseX - minimapX) / minimapSize;
                const clickRatioY = (p.mouseY - minimapY) / minimapSize;
                camX = bounds.minX + clickRatioX * (bounds.maxX - bounds.minX);
                camY = bounds.minY + clickRatioY * (bounds.maxY - bounds.minY);
                return;
            }

            // Check if right-click or middle-click for panning
            if (p.mouseButton === p.RIGHT || p.mouseButton === p.CENTER) {
                isDragging = true;
                dragStartX = p.mouseX;
                dragStartY = p.mouseY;
                camStartX = camX;
                camStartY = camY;
                return;
            }

            // Left click - add a new body
            if (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
                // Convert screen to world coordinates
                const world = screenToWorld(p.mouseX, p.mouseY);

                // Random mass between 10 and 50
                const newMass = 10 + Math.random() * 40;

                // Give it a small random velocity
                const vx = (Math.random() - 0.5) * 4;
                const vy = (Math.random() - 0.5) * 4;

                // Pick a color
                const colorIndex = bodies.length % colors.length;

                bodies.push(createBody(
                    world.x, world.y,
                    vx, vy,
                    newMass,
                    colors[colorIndex]
                ));
            }
        };

        p.mouseDragged = () => {
            if (isDragging) {
                const dx = (p.mouseX - dragStartX) / zoom;
                const dy = (p.mouseY - dragStartY) / zoom;
                camX = camStartX - dx;
                camY = camStartY - dy;
            }
        };

        p.mouseReleased = () => {
            isDragging = false;
        };

        p.draw = () => {
            // Clear background
            p.background(0, 0, 0);

            // Save state and apply camera transform
            p.push();
            p.translate(p.width / 2, p.height / 2);
            p.scale(zoom);
            p.translate(-camX, -camY);

            // Calculate forces on each body from all other bodies
            let accelerations = bodies.map(() => p.createVector(0, 0));

            // Calculate gravitational forces between all pairs
            for (let i = 0; i < bodies.length; i++) {
                for (let j = i + 1; j < bodies.length; j++) {
                    const bodyA = bodies[i];
                    const bodyB = bodies[j];

                    // Vector from A to B
                    let r_vec = p5.Vector.sub(bodyB.pos, bodyA.pos);
                    let r_mag = r_vec.mag();

                    // Prevent extreme forces at close range
                    if (r_mag < 20) r_mag = 20;

                    // Force magnitude: F = G * m1 * m2 / r^2
                    const forceMag = (G * bodyA.mass * bodyB.mass) / (r_mag * r_mag);

                    // Force direction (unit vector from A to B)
                    const forceDir = r_vec.copy().normalize();

                    // Acceleration on A (toward B): a = F / m
                    const accA = forceDir.copy().mult(forceMag / bodyA.mass);
                    accelerations[i].add(accA);

                    // Acceleration on B (toward A): equal and opposite
                    const accB = forceDir.copy().mult(-forceMag / bodyB.mass);
                    accelerations[j].add(accB);
                }
            }

            // Update velocities and positions
            for (let i = 0; i < bodies.length; i++) {
                const body = bodies[i];

                // Update velocity
                body.vel.add(p5.Vector.mult(accelerations[i], dt));

                // Update position
                body.pos.add(p5.Vector.mult(body.vel, dt));

                // Store trail position
                body.trail.push(body.pos.copy());
                if (body.trail.length > maxTrailLength) {
                    body.trail.shift();
                }
            }

            // Draw trails
            p.noFill();
            p.strokeWeight(1 / zoom);  // Keep consistent screen width
            for (const body of bodies) {
                p.stroke(body.color[0], body.color[1], body.color[2], 150);
                p.beginShape();
                for (const pt of body.trail) {
                    p.vertex(pt.x, pt.y);
                }
                p.endShape();
            }

            // Draw center of mass
            let totalMass = 0;
            let comX = 0;
            let comY = 0;
            for (const body of bodies) {
                totalMass += body.mass;
                comX += body.mass * body.pos.x;
                comY += body.mass * body.pos.y;
            }
            comX /= totalMass;
            comY /= totalMass;

            p.fill(100, 100, 100);
            p.noStroke();
            p.circle(comX, comY, 8 / zoom);

            // Draw bodies
            p.noStroke();
            for (const body of bodies) {
                p.fill(body.color[0], body.color[1], body.color[2]);
                p.circle(body.pos.x, body.pos.y, Math.sqrt(body.mass) * 5);
            }

            // Draw velocity vectors
            p.stroke(100, 255, 100, 150);
            p.strokeWeight(2 / zoom);
            const velScale = 5;
            for (const body of bodies) {
                p.line(
                    body.pos.x,
                    body.pos.y,
                    body.pos.x + body.vel.x * velScale,
                    body.pos.y + body.vel.y * velScale,
                );
            }

            // Restore state (remove camera transform)
            p.pop();

            // Draw UI (not affected by camera transform)
            p.fill(255);
            p.noStroke();
            p.textSize(12);
            p.text(`Bodies: ${bodies.length}`, 10, 20);
            p.text(`Zoom: ${(zoom * 100).toFixed(0)}%`, 10, 35);
            p.text(`Left-click: add body`, 10, 50);
            p.text(`Right-drag: pan`, 10, 65);
            p.text(`Scroll: zoom`, 10, 80);

            // List body masses
            for (let i = 0; i < Math.min(bodies.length, 8); i++) {
                p.fill(bodies[i].color[0], bodies[i].color[1], bodies[i].color[2]);
                p.text(`Body ${i + 1}: mass = ${bodies[i].mass.toFixed(1)}`, 10, 110 + i * 15);
            }
            if (bodies.length > 8) {
                p.fill(255);
                p.text(`... and ${bodies.length - 8} more`, 10, 110 + 8 * 15);
            }

            // Draw minimap
            drawMinimap();
        };
    });
}
