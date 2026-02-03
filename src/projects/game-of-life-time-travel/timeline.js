// Branching timeline tree for Game of Life history
// Each branch stores a sequence of grid snapshots (Uint8Array)
// Branches can fork from any point on any existing branch

export class Timeline {
  constructor() {
    this.branches = new Map();
    this.nextId = 0;
    this.activeBranchId = null;
    this.activeFrameIdx = 0;
  }

  createBranch(parentId = null, forkFrame = 0) {
    const id = this.nextId++;
    const hue = id === 0 ? 0 : (id * 137.508) % 360; // golden angle spread
    const branch = {
      id,
      parentId,
      forkFrame,
      frames: [],
      children: [],
      hue,
      label: parentId === null ? "Origin" : `Fork ${id}`
    };
    this.branches.set(id, branch);

    if (parentId !== null) {
      const parent = this.branches.get(parentId);
      if (parent) parent.children.push(id);
    }

    return id;
  }

  addFrame(branchId, snapshot) {
    const branch = this.branches.get(branchId);
    if (!branch) return -1;
    branch.frames.push(snapshot);
    return branch.frames.length - 1;
  }

  getFrame(branchId, frameIdx) {
    const branch = this.branches.get(branchId);
    if (!branch || frameIdx < 0 || frameIdx >= branch.frames.length) return null;
    return branch.frames[frameIdx];
  }

  getBranch(id) {
    return this.branches.get(id);
  }

  getBranchLength(id) {
    const branch = this.branches.get(id);
    return branch ? branch.frames.length : 0;
  }

  // Create a new branch forking from fromBranchId at atFrame
  fork(fromBranchId, atFrame, modifiedSnapshot) {
    const newId = this.createBranch(fromBranchId, atFrame);
    if (modifiedSnapshot) {
      this.addFrame(newId, modifiedSnapshot);
    }
    return newId;
  }

  getAllBranches() {
    return Array.from(this.branches.values());
  }

  // Get the absolute generation of a frame (accounting for ancestry)
  getAbsoluteGeneration(branchId, frameIdx) {
    let gen = frameIdx;
    let current = this.branches.get(branchId);
    while (current && current.parentId !== null) {
      gen += current.forkFrame;
      current = this.branches.get(current.parentId);
    }
    return gen;
  }

  // Get total frames stored across all branches
  getTotalFrames() {
    let total = 0;
    for (const branch of this.branches.values()) {
      total += branch.frames.length;
    }
    return total;
  }

  // Calculate the tree layout positions for visualization
  // Returns array of { branchId, y, startX, endX, forkX, forkY, parentY }
  getTreeLayout() {
    const layout = [];
    const branches = this.getAllBranches();
    const yMap = new Map();

    // Root branch at y=0
    let nextY = 0;
    for (const branch of branches) {
      yMap.set(branch.id, nextY);
      const startGen = this.getAbsoluteGeneration(branch.id, 0);
      const endGen = this.getAbsoluteGeneration(branch.id, Math.max(0, branch.frames.length - 1));

      const entry = {
        branchId: branch.id,
        y: nextY,
        startGen,
        endGen,
        frameCount: branch.frames.length,
        parentId: branch.parentId,
        forkFrame: branch.forkFrame,
        hue: branch.hue,
        label: branch.label
      };

      if (branch.parentId !== null) {
        entry.parentY = yMap.get(branch.parentId) || 0;
        entry.forkGen = this.getAbsoluteGeneration(branch.parentId, branch.forkFrame);
      }

      layout.push(entry);
      nextY++;
    }

    return layout;
  }
}
