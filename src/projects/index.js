// Project registry
// Each project has:
// - name: Display name
// - slug: URL slug (used in /project/[slug])
// - description: Optional description
// - thumbnail: Optional thumbnail image URL
// - load: Async function that returns the project module

export const projects = [
  {
    name: "Boids",
    slug: "boids",
    description: "Flocking simulation with emergent behavior",
    load: () => import("./boids/index.js")
  },
  {
    name: "Reaction Diffusion",
    slug: "reaction-diffusion",
    description: "Gray-Scott reaction diffusion system",
    load: () => import("./reaction-diffusion/index.js")
  },
];
