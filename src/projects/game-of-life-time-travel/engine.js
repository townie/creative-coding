// Conway's Game of Life engine
// Efficient grid simulation using Uint8Array with toroidal wrapping

export class GameEngine {
  constructor(cols = 48, rows = 48) {
    this.cols = cols;
    this.rows = rows;
    this.grid = new Uint8Array(cols * rows);
  }

  idx(x, y) {
    return y * this.cols + x;
  }

  get(x, y) {
    return this.grid[this.idx(x, y)];
  }

  set(x, y, val) {
    this.grid[this.idx(x, y)] = val ? 1 : 0;
  }

  toggle(x, y) {
    const i = this.idx(x, y);
    this.grid[i] = this.grid[i] ? 0 : 1;
  }

  countNeighbors(x, y) {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = (x + dx + this.cols) % this.cols;
        const ny = (y + dy + this.rows) % this.rows;
        count += this.grid[this.idx(nx, ny)];
      }
    }
    return count;
  }

  step() {
    const next = new Uint8Array(this.cols * this.rows);
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const alive = this.get(x, y);
        const neighbors = this.countNeighbors(x, y);
        if (alive && (neighbors === 2 || neighbors === 3)) {
          next[this.idx(x, y)] = 1;
        } else if (!alive && neighbors === 3) {
          next[this.idx(x, y)] = 1;
        }
      }
    }
    this.grid = next;
    return this.snapshot();
  }

  snapshot() {
    return this.grid.slice();
  }

  load(snapshot) {
    this.grid = snapshot.slice();
  }

  randomize(density = 0.35) {
    for (let i = 0; i < this.grid.length; i++) {
      this.grid[i] = Math.random() < density ? 1 : 0;
    }
    return this.snapshot();
  }

  clear() {
    this.grid.fill(0);
    return this.snapshot();
  }

  countAlive() {
    let count = 0;
    for (let i = 0; i < this.grid.length; i++) count += this.grid[i];
    return count;
  }
}
