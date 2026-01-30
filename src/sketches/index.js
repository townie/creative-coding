// Auto-discover sketches using import.meta.glob
// Each sketch folder must have:
// - meta.json (required): { name: "Display Name", description?: string, thumbnail?: string, tags?: string[] }
// - sketch.js (required): main sketch file (global mode p5.js)

// Import all meta.json files eagerly
const metaModules = import.meta.glob('./**/meta.json', { eager: true });

// Build sketches array from discovered meta files
export const sketches = Object.entries(metaModules).map(([path, module]) => {
  // Extract folder name from path: "./folder-name/meta.json" -> "folder-name"
  const slug = path.split('/')[1];
  const meta = module.default || module;

  return {
    name: meta.name,
    slug,
    description: meta.description || null,
    thumbnail: meta.thumbnail || null,
    tags: meta.tags || [],
    // Load function returns the path to the sketch for the wrapper to handle
    // In dev: /src/sketches/slug/sketch.js (Vite serves source)
    // In prod: /sketches/slug/sketch.js (built output)
    sketchPath: import.meta.env.DEV
      ? `/src/sketches/${slug}/sketch.js`
      : `/sketches/${slug}/sketch.js`
  };
});
