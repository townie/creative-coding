// Gravitational constant
const G = 500;

export function init(container) {
    return new p5((p) => {
        // Time step for simulation
        const dt = 0.1;
        const maxTrailLength = 500;

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

        // Blackhole state
        let blackhole = null;
        let totalSpawned = 0;
        const BLACKHOLE_SPAWN_THRESHOLD = 10;
        const BLACKHOLE_DEACTIVATE_THRESHOLD = 5;
        const BLACKHOLE_ACTIVATE_THRESHOLD = 100;
        const BLACKHOLE_MAX_MASS = 10000;
        const BLACKHOLE_VACUUM_RADIUS = 100; // Delete bodies within this radius
        const PAIR_PROXIMITY_THRESHOLD = 1000; // Bodies must be within this of same-color body

        // Escape boundary
        const ESCAPE_RADIUS = 1000000; // Bodies beyond this distance from origin are deleted
        let escapedSuccess = 0; // Count of bodies that escaped with a partner
        let escapedFailed = 0;  // Count of bodies that escaped alone

        // Body mass range for spawned pairs
        const PAIR_MASS_MIN = 10;
        const PAIR_MASS_MAX = 90;

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

        // Create the blackhole at origin
        function createBlackhole() {
            blackhole = {
                pos: p.createVector(0, 0),
                vel: p.createVector(0, 0),
                mass: BLACKHOLE_MAX_MASS,
                active: true,
                color: [20, 0, 40], // Dark purple
                trail: []
            };
        }

        // Check if a body has a same-colored partner within range
        function hasNearbyPartner(body, index) {
            for (let i = 0; i < bodies.length; i++) {
                if (i === index) continue;
                const other = bodies[i];
                // Check if same color
                if (body.color[0] === other.color[0] &&
                    body.color[1] === other.color[1] &&
                    body.color[2] === other.color[2]) {
                    // Check distance
                    const dx = body.pos.x - other.pos.x;
                    const dy = body.pos.y - other.pos.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist <= PAIR_PROXIMITY_THRESHOLD) {
                        return true;
                    }
                }
            }
            return false;
        }

        // Update blackhole - vacuum up lonely bodies
        function updateBlackhole() {
            if (!blackhole) return;

            // Adjust blackhole mass based on body count
            if (bodies.length < BLACKHOLE_DEACTIVATE_THRESHOLD) {
                blackhole.active = false;
                blackhole.mass = 0;
            } else if (bodies.length >= BLACKHOLE_ACTIVATE_THRESHOLD) {
                blackhole.active = true;
                blackhole.mass = BLACKHOLE_MAX_MASS;
            }

            if (!blackhole.active) return;

            // Find bodies to delete (within vacuum radius OR lonely bodies)
            const toDelete = [];
            for (let i = 0; i < bodies.length; i++) {
                const body = bodies[i];
                const dx = body.pos.x - blackhole.pos.x;
                const dy = body.pos.y - blackhole.pos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Delete if too close to blackhole
                if (dist < BLACKHOLE_VACUUM_RADIUS) {
                    toDelete.push(i);
                }
                // Delete if no same-colored partner nearby
                else if (!hasNearbyPartner(body, i)) {
                    toDelete.push(i);
                }
            }

            // Remove bodies (in reverse order to preserve indices)
            for (let i = toDelete.length - 1; i >= 0; i--) {
                bodies.splice(toDelete[i], 1);
            }
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

        // Get center of mass of all bodies
        function getCenterOfMass() {
            if (bodies.length === 0) return { x: camX, y: camY };
            let totalMass = 0, comX = 0, comY = 0;
            for (const body of bodies) {
                totalMass += body.mass;
                comX += body.mass * body.pos.x;
                comY += body.mass * body.pos.y;
            }
            return { x: comX / totalMass, y: comY / totalMass };
        }

        // Camera animation state
        let targetCamX = 0;
        let targetCamY = 0;
        let targetZoom = 1;
        const panSmoothing = 0.03;
        const zoomSmoothing = 0.02; // Slower for dramatic effect

        // Cinematic camera state
        let cameraMode = 'all'; // 'all', 'focus', 'com', 'blackhole'
        let followTarget = null; // Body to follow in 'focus' mode
        let lastCameraChange = 0;
        let cameraDuration = 5000; // How long to hold current shot
        const minCameraDuration = 5000; // Minimum 5 seconds between camera changes
        const maxSimulationTime = 2 * 60 * 1000; // 2 minutes max
        let simulationStartTime = 0;

        // Camera control state
        let cameraPaused = false; // Pause automatic camera changes
        let manualCameraMode = null; // null = auto, or specific mode name
        let displayBodiesUI = true; // Toggle body list display with 'L' key

        // All available camera modes
        const cameraModes = ['all', 'focus', 'com', 'blackhole', 'cluster'];

        // Current cluster data for cluster mode
        let currentCluster = null; // { bodies: [], center: {x, y} }

        // Interval IDs for cleanup
        let spawnInterval = null;
        let cameraInterval = null;

        // Set camera mode manually
        function setCameraMode(mode) {
            if (mode === null) {
                manualCameraMode = null;
                return;
            }
            manualCameraMode = mode;
            cameraMode = mode;
            lastCameraChange = Date.now();

            switch (mode) {
                case 'all': setAllShot(); break;
                case 'focus': setFocusShot(); break;
                case 'com': setCOMShot(); break;
                case 'blackhole': setBlackholeShot(); break;
                case 'cluster': setClusterShot(); break;
            }
        }

        // Toggle camera pause
        function toggleCameraPause() {
            cameraPaused = !cameraPaused;
        }

        // Toggle blackhole on/off
        function toggleBlackhole() {
            if (blackhole) {
                blackhole = null;
            } else {
                createBlackhole();
                if (bodies.length > 0) {
                    const com = getCenterOfMass();
                    blackhole.pos.set(com.x, com.y);
                }
            }
        }

        // Choose a cinematic camera angle
        function chooseCameraShot() {
            if (bodies.length === 0) return;

            if (cameraPaused || manualCameraMode !== null) return;

            const now = Date.now();

            if (now - lastCameraChange < minCameraDuration) {
                return;
            }

            const elapsed = now - simulationStartTime;
            const widePreference = Math.min(elapsed / maxSimulationTime, 0.8);

            const roll = Math.random();

            if (blackhole && roll < 0.25) {
                cameraMode = 'blackhole';
                cameraDuration = 6000 + Math.random() * 4000;
                setBlackholeShot();
            }
            else if (bodies.length >= 4 && roll < 0.40) {
                cameraMode = 'cluster';
                cameraDuration = 6000 + Math.random() * 4000;
                setClusterShot();
            }
            else if (roll < 0.40 + widePreference * 0.35) {
                cameraMode = 'all';
                cameraDuration = 6000 + Math.random() * 4000;
                setAllShot();
            }
            else if (roll < 0.60 + widePreference * 0.2) {
                cameraMode = 'com';
                cameraDuration = 6000 + Math.random() * 4000;
                setCOMShot();
            }
            else {
                cameraMode = 'focus';
                cameraDuration = 5000 + Math.random() * 3000;
                setFocusShot();
            }

            lastCameraChange = now;
        }

        // Set camera to show ALL bodies
        function setAllShot() {
            if (bodies.length === 0) return;

            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;

            for (const body of bodies) {
                minX = Math.min(minX, body.pos.x);
                maxX = Math.max(maxX, body.pos.x);
                minY = Math.min(minY, body.pos.y);
                maxY = Math.max(maxY, body.pos.y);
            }

            if (blackhole) {
                minX = Math.min(minX, blackhole.pos.x);
                maxX = Math.max(maxX, blackhole.pos.x);
                minY = Math.min(minY, blackhole.pos.y);
                maxY = Math.max(maxY, blackhole.pos.y);
            }

            const padding = 200;
            minX -= padding;
            maxX += padding;
            minY -= padding;
            maxY += padding;

            targetCamX = (minX + maxX) / 2;
            targetCamY = (minY + maxY) / 2;

            const worldWidth = maxX - minX;
            const worldHeight = maxY - minY;
            const zoomX = p.width / worldWidth;
            const zoomY = p.height / worldHeight;
            targetZoom = Math.min(zoomX, zoomY, 1.5);
            targetZoom = Math.max(targetZoom, 0.05);
        }

        // Set camera to focus on ONE random body
        function setFocusShot() {
            if (bodies.length === 0) return;
            followTarget = bodies[Math.floor(Math.random() * bodies.length)];
            targetCamX = followTarget.pos.x;
            targetCamY = followTarget.pos.y;
            targetZoom = 1.5 + Math.random() * 1.0;
        }

        // Update camera for dynamic modes
        function updateFollowCamera() {
            if (followTarget && cameraMode === 'focus') {
                targetCamX = followTarget.pos.x;
                targetCamY = followTarget.pos.y;
            }
            else if (cameraMode === 'com') {
                const com = getCenterOfMass();
                targetCamX = com.x;
                targetCamY = com.y;
            }
            else if (cameraMode === 'blackhole' && blackhole) {
                targetCamX = blackhole.pos.x;
                targetCamY = blackhole.pos.y;
            }
        }

        // Set center of mass shot
        function setCOMShot() {
            if (bodies.length === 0) return;

            const com = getCenterOfMass();
            targetCamX = com.x;
            targetCamY = com.y;

            const distances = bodies.map(body => {
                const dx = body.pos.x - com.x;
                const dy = body.pos.y - com.y;
                return Math.sqrt(dx * dx + dy * dy);
            }).sort((a, b) => a - b);

            const halfIndex = Math.floor(distances.length * 0.5);
            const radius = distances[halfIndex] || 500;

            const viewRadius = radius + 200;
            const zoomX = (p.width / 2) / viewRadius;
            const zoomY = (p.height / 2) / viewRadius;
            targetZoom = Math.min(zoomX, zoomY, 2.0);
            targetZoom = Math.max(targetZoom, 0.1);
        }

        // Set blackhole shot
        function setBlackholeShot() {
            if (!blackhole) {
                setAllShot();
                return;
            }

            targetCamX = blackhole.pos.x;
            targetCamY = blackhole.pos.y;

            if (bodies.length === 0) {
                targetZoom = 1.0;
                return;
            }

            const distances = bodies.map(body => {
                const dx = body.pos.x - blackhole.pos.x;
                const dy = body.pos.y - blackhole.pos.y;
                return Math.sqrt(dx * dx + dy * dy);
            }).sort((a, b) => a - b);

            const halfIndex = Math.floor(distances.length * 0.5);
            const radius = distances[halfIndex] || 500;

            const viewRadius = radius + 200;
            const zoomX = (p.width / 2) / viewRadius;
            const zoomY = (p.height / 2) / viewRadius;
            targetZoom = Math.min(zoomX, zoomY, 2.0);
            targetZoom = Math.max(targetZoom, 0.1);
        }

        // K-means clustering algorithm
        function kMeansClustering(k, maxIterations = 50) {
            if (bodies.length < k) {
                return [bodies.map((b, i) => i)];
            }

            const centroids = [];
            const usedIndices = new Set();
            while (centroids.length < k) {
                const idx = Math.floor(Math.random() * bodies.length);
                if (!usedIndices.has(idx)) {
                    usedIndices.add(idx);
                    centroids.push({ x: bodies[idx].pos.x, y: bodies[idx].pos.y });
                }
            }

            let assignments = new Array(bodies.length).fill(0);

            for (let iter = 0; iter < maxIterations; iter++) {
                const newAssignments = bodies.map((body, i) => {
                    let minDist = Infinity;
                    let closest = 0;
                    for (let c = 0; c < k; c++) {
                        const dx = body.pos.x - centroids[c].x;
                        const dy = body.pos.y - centroids[c].y;
                        const dist = dx * dx + dy * dy;
                        if (dist < minDist) {
                            minDist = dist;
                            closest = c;
                        }
                    }
                    return closest;
                });

                let changed = false;
                for (let i = 0; i < bodies.length; i++) {
                    if (newAssignments[i] !== assignments[i]) {
                        changed = true;
                        break;
                    }
                }
                assignments = newAssignments;

                if (!changed) break;

                for (let c = 0; c < k; c++) {
                    let sumX = 0, sumY = 0, count = 0;
                    for (let i = 0; i < bodies.length; i++) {
                        if (assignments[i] === c) {
                            sumX += bodies[i].pos.x;
                            sumY += bodies[i].pos.y;
                            count++;
                        }
                    }
                    if (count > 0) {
                        centroids[c].x = sumX / count;
                        centroids[c].y = sumY / count;
                    }
                }
            }

            const clusters = [];
            for (let c = 0; c < k; c++) {
                const cluster = [];
                for (let i = 0; i < bodies.length; i++) {
                    if (assignments[i] === c) {
                        cluster.push(i);
                    }
                }
                if (cluster.length > 0) {
                    clusters.push(cluster);
                }
            }

            return clusters;
        }

        // Set cluster shot
        function setClusterShot() {
            if (bodies.length < 2) {
                setAllShot();
                return;
            }

            const maxK = Math.min(10, bodies.length);
            const k = 2 + Math.floor(Math.random() * (maxK - 1));

            const clusters = kMeansClustering(k);

            if (clusters.length === 0) {
                setAllShot();
                return;
            }

            const clusterIndices = clusters[Math.floor(Math.random() * clusters.length)];

            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            let centerX = 0, centerY = 0;

            const clusterBodies = clusterIndices.map(i => bodies[i]);
            for (const body of clusterBodies) {
                centerX += body.pos.x;
                centerY += body.pos.y;
                minX = Math.min(minX, body.pos.x);
                maxX = Math.max(maxX, body.pos.x);
                minY = Math.min(minY, body.pos.y);
                maxY = Math.max(maxY, body.pos.y);
            }
            centerX /= clusterBodies.length;
            centerY /= clusterBodies.length;

            currentCluster = {
                bodyIndices: clusterIndices,
                center: { x: centerX, y: centerY }
            };

            targetCamX = centerX;
            targetCamY = centerY;

            const padding = 150;
            const worldWidth = (maxX - minX) + padding * 2;
            const worldHeight = (maxY - minY) + padding * 2;

            const minSize = 300;
            const effectiveWidth = Math.max(worldWidth, minSize);
            const effectiveHeight = Math.max(worldHeight, minSize);

            const zoomX = p.width / effectiveWidth;
            const zoomY = p.height / effectiveHeight;
            targetZoom = Math.min(zoomX, zoomY, 2.5);
            targetZoom = Math.max(targetZoom, 0.1);
        }

        // Spawn a pair of bodies near each other
        function spawnBodyPair() {
            let centerX, centerY;
            if (bodies.length > 0) {
                const randomBody = bodies[Math.floor(Math.random() * bodies.length)];
                centerX = randomBody.pos.x + (Math.random() - 0.5) * 300;
                centerY = randomBody.pos.y + (Math.random() - 0.5) * 300;
            } else {
                centerX = camX;
                centerY = camY;
            }

            const distance = 30 + Math.random() * 120;
            const angle = Math.random() * Math.PI * 2;

            const offsetX = Math.cos(angle) * distance / 2;
            const offsetY = Math.sin(angle) * distance / 2;

            const mass1 = PAIR_MASS_MIN + Math.random() * (PAIR_MASS_MAX - PAIR_MASS_MIN);
            const mass2 = PAIR_MASS_MIN + Math.random() * (PAIR_MASS_MAX - PAIR_MASS_MIN);

            const vx1 = (Math.random() - 0.5) * 2;
            const vy1 = (Math.random() - 0.5) * 2;
            const vx2 = (Math.random() - 0.5) * 2;
            const vy2 = (Math.random() - 0.5) * 2;

            const colorIndex = Math.floor(bodies.length / 2) % colors.length;
            const pairColor = colors[colorIndex];

            bodies.push(createBody(
                centerX - offsetX, centerY - offsetY,
                vx1, vy1,
                mass1,
                pairColor
            ));

            bodies.push(createBody(
                centerX + offsetX, centerY + offsetY,
                vx2, vy2,
                mass2,
                pairColor
            ));

            totalSpawned += 2;

            if (!blackhole && totalSpawned >= BLACKHOLE_SPAWN_THRESHOLD) {
                createBlackhole();
            }

            chooseCameraShot();
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

                for (const pt of body.trail) {
                    minX = Math.min(minX, pt.x);
                    maxX = Math.max(maxX, pt.x);
                    minY = Math.min(minY, pt.y);
                    maxY = Math.max(maxY, pt.y);
                }
            }

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

            const mmX = p.width - minimapSize - minimapMargin;
            const mmY = p.height - minimapSize - minimapMargin;

            p.fill(0, 0, 0, 200);
            p.stroke(100);
            p.strokeWeight(1);
            p.rect(mmX, mmY, minimapSize, minimapSize);

            const scaleX = minimapSize / worldWidth;
            const scaleY = minimapSize / worldHeight;
            const scale = Math.min(scaleX, scaleY);

            const offsetX = mmX + (minimapSize - worldWidth * scale) / 2;
            const offsetY = mmY + (minimapSize - worldHeight * scale) / 2;

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

            p.noStroke();
            for (const body of bodies) {
                const mx = offsetX + (body.pos.x - bounds.minX) * scale;
                const my = offsetY + (body.pos.y - bounds.minY) * scale;
                p.fill(body.color[0], body.color[1], body.color[2]);
                p.circle(mx, my, Math.max(3, Math.sqrt(body.mass) * scale * 2));
            }

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

            camX = p.width / 2;
            camY = p.height / 2;
            targetCamX = camX;
            targetCamY = camY;

            simulationStartTime = Date.now();
            lastCameraChange = simulationStartTime;

            // Spawn a pair of bodies every 2 seconds
            spawnInterval = setInterval(spawnBodyPair, 2000);

            // Change camera shots independently
            cameraInterval = setInterval(() => {
                const now = Date.now();
                if (now - lastCameraChange > cameraDuration) {
                    chooseCameraShot();
                }
            }, 500);
        };

        p.windowResized = () => {
            p.resizeCanvas(p.windowWidth, p.windowHeight);
        };

        p.mouseWheel = (event) => {
            const worldBefore = screenToWorld(p.mouseX, p.mouseY);

            const zoomFactor = 0.1;
            if (event && event.deltaY > 0) {
                zoom *= (1 - zoomFactor);
            } else {
                zoom *= (1 + zoomFactor);
            }

            zoom = p.constrain(zoom, 0.01, 10);

            const worldAfter = screenToWorld(p.mouseX, p.mouseY);

            camX += worldBefore.x - worldAfter.x;
            camY += worldBefore.y - worldAfter.y;

            return false;
        };

        p.mousePressed = () => {
            const minimapX = p.width - minimapSize - minimapMargin;
            const minimapY = p.height - minimapSize - minimapMargin;
            if (p.mouseX >= minimapX && p.mouseX <= minimapX + minimapSize &&
                p.mouseY >= minimapY && p.mouseY <= minimapY + minimapSize) {
                const bounds = getWorldBounds();
                const clickRatioX = (p.mouseX - minimapX) / minimapSize;
                const clickRatioY = (p.mouseY - minimapY) / minimapSize;
                camX = bounds.minX + clickRatioX * (bounds.maxX - bounds.minX);
                camY = bounds.minY + clickRatioY * (bounds.maxY - bounds.minY);
                return;
            }

            if (p.mouseButton === p.RIGHT || p.mouseButton === p.CENTER) {
                isDragging = true;
                dragStartX = p.mouseX;
                dragStartY = p.mouseY;
                camStartX = camX;
                camStartY = camY;
                return;
            }

            if (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
                const world = screenToWorld(p.mouseX, p.mouseY);
                const newMass = 10 + Math.random() * 400;
                const vx = (Math.random() - 0.5) * 4;
                const vy = (Math.random() - 0.5) * 4;
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

        p.keyPressed = () => {
            if (p.key === ' ') {
                toggleCameraPause();
                return false;
            }

            const num = parseInt(p.key);
            if (num >= 1 && num <= cameraModes.length) {
                setCameraMode(cameraModes[num - 1]);
                return false;
            }

            if (p.key === '0' || p.key === 'a' || p.key === 'A') {
                setCameraMode(null);
                return false;
            }

            if (p.key === 'b' || p.key === 'B') {
                toggleBlackhole();
                return false;
            }

            if (p.key === 'l' || p.key === 'L') {
                displayBodiesUI = !displayBodiesUI;
                return false;
            }
        };

        p.draw = () => {
            updateFollowCamera();
            updateBlackhole();

            camX += (targetCamX - camX) * panSmoothing;
            camY += (targetCamY - camY) * panSmoothing;
            zoom += (targetZoom - zoom) * zoomSmoothing;

            p.background(0, 0, 0);

            p.push();
            p.translate(p.width / 2, p.height / 2);
            p.scale(zoom);
            p.translate(-camX, -camY);

            let accelerations = bodies.map(() => p.createVector(0, 0));

            for (let i = 0; i < bodies.length; i++) {
                for (let j = i + 1; j < bodies.length; j++) {
                    const bodyA = bodies[i];
                    const bodyB = bodies[j];

                    let r_vec = p5.Vector.sub(bodyB.pos, bodyA.pos);
                    let r_mag = r_vec.mag();

                    if (r_mag < 20) r_mag = 20;

                    const forceMag = (G * bodyA.mass * bodyB.mass) / (r_mag * r_mag);
                    const forceDir = r_vec.copy().normalize();

                    const accA = forceDir.copy().mult(forceMag / bodyA.mass);
                    accelerations[i].add(accA);

                    const accB = forceDir.copy().mult(-forceMag / bodyB.mass);
                    accelerations[j].add(accB);
                }
            }

            let blackholeAcc = p.createVector(0, 0);
            if (blackhole && blackhole.mass > 0) {
                for (let i = 0; i < bodies.length; i++) {
                    const body = bodies[i];
                    let r_vec = p5.Vector.sub(blackhole.pos, body.pos);
                    let r_mag = r_vec.mag();
                    if (r_mag < 20) r_mag = 20;

                    const forceMag = (G * body.mass * blackhole.mass) / (r_mag * r_mag);
                    const forceDir = r_vec.copy().normalize();

                    const acc = forceDir.copy().mult(forceMag / body.mass);
                    accelerations[i].add(acc);

                    const bhAcc = forceDir.copy().mult(-forceMag / blackhole.mass);
                    blackholeAcc.add(bhAcc);
                }
            }

            for (let i = 0; i < bodies.length; i++) {
                const body = bodies[i];
                body.vel.add(p5.Vector.mult(accelerations[i], dt));
                body.pos.add(p5.Vector.mult(body.vel, dt));

                body.trail.push(body.pos.copy());
                if (body.trail.length > maxTrailLength) {
                    body.trail.shift();
                }
            }

            if (blackhole && blackhole.mass > 0) {
                blackhole.vel.add(p5.Vector.mult(blackholeAcc, dt));
                blackhole.pos.add(p5.Vector.mult(blackhole.vel, dt));

                blackhole.trail.push(blackhole.pos.copy());
                if (blackhole.trail.length > maxTrailLength) {
                    blackhole.trail.shift();
                }
            }

            const escapedIndices = [];
            const escapeCenter = blackhole ? blackhole.pos : { x: 0, y: 0 };
            for (let i = 0; i < bodies.length; i++) {
                const body = bodies[i];
                const dx = body.pos.x - escapeCenter.x;
                const dy = body.pos.y - escapeCenter.y;
                const distFromCenter = Math.sqrt(dx * dx + dy * dy);
                if (distFromCenter > ESCAPE_RADIUS) {
                    escapedIndices.push(i);
                    const hasPartner = hasNearbyPartner(body, i);
                    if (hasPartner) {
                        escapedSuccess++;
                    } else {
                        escapedFailed++;
                    }
                }
            }
            for (let i = escapedIndices.length - 1; i >= 0; i--) {
                bodies.splice(escapedIndices[i], 1);
            }

            // Draw trails
            p.noFill();
            p.strokeWeight(1 / zoom);
            for (const body of bodies) {
                p.stroke(body.color[0], body.color[1], body.color[2], 150);
                p.beginShape();
                for (const pt of body.trail) {
                    p.vertex(pt.x, pt.y);
                }
                p.endShape();
            }

            // Draw blackhole trail
            if (blackhole && blackhole.trail.length > 0) {
                p.strokeWeight(3 / zoom);
                p.stroke(80, 0, 120, 200);
                p.beginShape();
                for (const pt of blackhole.trail) {
                    p.vertex(pt.x, pt.y);
                }
                p.endShape();
                p.strokeWeight(1 / zoom);
            }

            // Draw center of mass
            if (bodies.length > 0) {
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
            }

            // Draw blackhole
            if (blackhole) {
                if (blackhole.active) {
                    p.noFill();
                    p.stroke(255, 0, 0, 80);
                    p.strokeWeight(2 / zoom);
                    p.circle(blackhole.pos.x, blackhole.pos.y, BLACKHOLE_VACUUM_RADIUS * 2);
                }

                p.fill(0, 0, 0);
                p.stroke(blackhole.active ? 255 : 50, 0, blackhole.active ? 255 : 50);
                p.strokeWeight(3 / zoom);
                const bhSize = blackhole.active ? 80 : 40;
                p.circle(blackhole.pos.x, blackhole.pos.y, bhSize);

                if (blackhole.active) {
                    p.noFill();
                    p.stroke(150, 0, 255, 100);
                    p.strokeWeight(1 / zoom);
                    for (let r = 100; r <= 400; r += 100) {
                        p.circle(blackhole.pos.x, blackhole.pos.y, r * 2);
                    }
                }
            }

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

            p.pop();

            // Draw UI
            p.fill(255);
            p.noStroke();
            p.textSize(12);
            p.text(`Bodies: ${bodies.length}`, 10, 20);
            p.text(`Zoom: ${(zoom * 100).toFixed(0)}%`, 10, 35);
            p.text(`Total spawned: ${totalSpawned}`, 10, 50);

            p.fill(100, 255, 100);
            p.text(`${escapedSuccess}`, 150, 20);
            p.fill(255);
            p.text(`-`, 150 + p.textWidth(`${escapedSuccess}`) + 3, 20);
            p.fill(255, 100, 100);
            p.text(`${escapedFailed}`, 150 + p.textWidth(`${escapedSuccess}-`) + 6, 20);
            p.fill(150);
            p.text(`escaped`, 150 + p.textWidth(`${escapedSuccess}-${escapedFailed}`) + 12, 20);
            p.fill(255);

            if (blackhole) {
                p.fill(blackhole.active ? [255, 0, 255] : [100, 100, 100]);
                p.text(`Blackhole: ${blackhole.active ? 'ACTIVE' : 'dormant'} (B to toggle)`, 10, 65);
            } else {
                p.fill(60);
                p.text(`Blackhole: OFF (B to toggle)`, 10, 65);
            }
            p.fill(255);

            const modeLabel = manualCameraMode ? manualCameraMode.toUpperCase() : 'AUTO';
            const pauseLabel = cameraPaused ? ' [PAUSED]' : '';
            p.fill(cameraPaused ? [255, 200, 0] : [100, 255, 100]);
            p.text(`Camera: ${cameraMode} (${modeLabel})${pauseLabel}`, 10, 80);
            p.fill(255);
            p.text(`Space: pause/play | 1-5: select mode | 0/A: auto`, 10, 95);

            p.textSize(10);
            p.fill(150);
            p.text(`1:all  2:focus  3:com  4:blackhole  5:cluster`, 10, 115);
            p.textSize(12);

            p.fill(255);
            p.text(`Left-click: add body | Right-drag: pan | Scroll: zoom | L: toggle list`, 10, 135);

            if (displayBodiesUI) {
                const lineHeight = 15;
                const startY = 160;
                const colWidth = 180;
                const maxRowsPerCol = Math.floor((p.height - startY - 20) / lineHeight);

                for (let i = 0; i < bodies.length; i++) {
                    const col = Math.floor(i / maxRowsPerCol);
                    const row = i % maxRowsPerCol;
                    const x = 10 + col * colWidth;
                    const y = startY + row * lineHeight;

                    p.fill(bodies[i].color[0], bodies[i].color[1], bodies[i].color[2]);
                    p.text(`Body ${i + 1}: mass = ${bodies[i].mass.toFixed(1)}`, x, y);
                }
            }

            drawMinimap();
        };

        // Cleanup intervals when sketch is removed
        const originalRemove = p.remove.bind(p);
        p.remove = () => {
            if (spawnInterval) clearInterval(spawnInterval);
            if (cameraInterval) clearInterval(cameraInterval);
            originalRemove();
        };
    });
}
