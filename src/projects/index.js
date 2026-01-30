// Project registry
// Each project has:
// - name: Display name
// - slug: URL slug (used in /project/[slug])
// - description: Optional description
// - thumbnail: Optional thumbnail image URL
// - load: Async function that returns the project module

export const projects = [
  {
    name: "Boids Flocking Simulation",
    slug: "boids",
    description: "Watch hundreds of autonomous agents exhibit lifelike flocking behavior using Craig Reynolds' classic algorithm. Adjust separation, alignment, and cohesion forces to see how simple rules create complex emergent patterns.",
    load: () => import("./boids/index.js")
  },
  {
    name: "Reaction Diffusion",
    slug: "reaction-diffusion",
    description: "A Gray-Scott reaction-diffusion system that simulates two chemicals interacting and diffusing across a surface. Click to seed new reactions and explore presets like mitosis, coral, maze, and chaos to discover organic pattern formation.",
    load: () => import("./reaction-diffusion/index.js")
  },
];
