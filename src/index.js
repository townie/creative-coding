import van from "vanjs-core";
import "./index.css";
import { sketches } from "./sketches.js";
import { projects } from "./projects/index.js";

const { div, button, span, h1 } = van.tags;

// Combine sketches and projects for the grid
const allItems = [
  ...projects.map(p => ({ ...p, type: "project" })),
  ...sketches.map(s => ({ ...s, type: "sketch" }))
];

// State
const modalOpen = van.state(false);
const currentSketch = van.state(0);
const currentView = van.state("sketch"); // "sketch" or "project"
let p5Instance = null;

// Simple router
const getRoute = () => {
  const path = window.location.pathname;
  if (path.startsWith("/project/")) {
    return { type: "project", slug: path.replace("/project/", "") };
  }
  return { type: "home" };
};

// Navigate to a route
const navigate = (path) => {
  history.pushState({}, "", path);
  handleRoute();
};

// Load a sketch into the main canvas
const loadSketch = (index) => {
  if (p5Instance) {
    p5Instance.remove();
  }

  const item = allItems[index];

  if (item.type === "project") {
    navigate(`/project/${item.slug}`);
    return;
  }

  currentSketch.val = index;
  currentView.val = "sketch";

  p5Instance = new p5((p) => {
    p.setup = () => {
      const canvas = p.createCanvas(p.windowWidth, p.windowHeight, item.name === "Terrain" ? p.WEBGL : p.P2D);
      canvas.parent('sketch-container');
      item.setup(p);
    };
    p.draw = () => item.draw(p);
    p.windowResized = () => {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
      item.setup(p);
    };
  });
};

// Load a project page
const loadProject = async (slug) => {
  if (p5Instance) {
    p5Instance.remove();
    p5Instance = null;
  }

  currentView.val = "project";

  const project = projects.find(p => p.slug === slug);
  if (!project) {
    navigate("/");
    return;
  }

  // Clear container and load project
  const container = document.getElementById("sketch-container");
  container.innerHTML = "";

  // Load the project module dynamically
  try {
    const module = await project.load();
    if (module.init) {
      p5Instance = module.init(container);
    }
  } catch (e) {
    console.error("Failed to load project:", e);
  }
};

// Handle current route
const handleRoute = () => {
  const route = getRoute();

  if (route.type === "project") {
    loadProject(route.slug);
  } else {
    // Find first sketch (not project) and load it
    const firstSketchIndex = allItems.findIndex(item => item.type === "sketch");
    if (firstSketchIndex !== -1) {
      currentSketch.val = firstSketchIndex;
      loadSketch(firstSketchIndex);
    }
  }
};

// Create thumbnail preview for grid
const createThumbnail = (index, container) => {
  const item = allItems[index];

  if (item.type === "project" && item.thumbnail) {
    // Use static thumbnail for projects
    const img = document.createElement("img");
    img.src = item.thumbnail;
    img.style.cssText = "width:100%;height:100%;object-fit:cover;";
    container.appendChild(img);
    return;
  }

  if (item.type === "project") {
    // Placeholder for projects without thumbnail
    container.style.background = "#1a1a1a";
    container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#444;font-size:24px;">◆</div>`;
    return;
  }

  // Render p5 sketch thumbnail
  new p5((p) => {
    p.setup = () => {
      const canvas = p.createCanvas(280, 175, item.name === "Terrain" ? p.WEBGL : p.P2D);
      canvas.parent(container);
      item.setup(p);
      for (let i = 0; i < 60; i++) {
        item.draw(p);
      }
      p.noLoop();
    };
    p.draw = () => {};
  });
};

// Hamburger menu button
const MenuButton = () =>
  button(
    {
      class: "menu-btn",
      onclick: () => (modalOpen.val = true),
      "aria-label": "Open menu"
    },
    span(),
    span(),
    span()
  );

// Back button for projects
const BackButton = () =>
  button(
    {
      class: "back-btn",
      onclick: () => navigate("/"),
      "aria-label": "Back to sketches",
      style: () => currentView.val === "project" ? "display:flex" : "display:none"
    },
    span({ style: "transform: rotate(-45deg) translate(2px, 2px);" }),
    span({ style: "transform: rotate(45deg) translate(2px, -2px);" })
  );

// Close button
const CloseButton = () =>
  button({
    class: "close-btn",
    onclick: () => (modalOpen.val = false),
    "aria-label": "Close menu"
  });

// Grid item
const GridItem = ({ index }) => {
  const item = allItems[index];
  const container = div({ class: "grid-item-canvas" });

  setTimeout(() => createThumbnail(index, container), 50 + index * 20);

  return div(
    {
      class: () => `grid-item ${item.type === "project" ? "grid-item-project" : ""}`,
      onclick: () => {
        loadSketch(index);
        modalOpen.val = false;
      }
    },
    container,
    div({ class: "grid-item-title" },
      item.type === "project" ? `${item.name}` : item.name
    ),
    item.type === "project" ? div({ class: "grid-item-badge" }, "Project") : null
  );
};

// Modal overlay with grid
const Modal = () =>
  div(
    {
      class: () => `modal-overlay ${modalOpen.val ? "open" : ""}`
    },
    div({ class: "modal-header" }, h1("Works")),
    CloseButton(),
    div(
      { class: "grid" },
      ...allItems.map((_, i) => GridItem({ index: i }))
    )
  );

// Sketch title display
const SketchTitle = () =>
  div(
    { class: "sketch-title" },
    () => {
      if (currentView.val === "project") {
        const route = getRoute();
        const project = projects.find(p => p.slug === route.slug);
        return project ? project.name : "";
      }
      return allItems[currentSketch.val]?.name || "";
    }
  );

// Keyboard hints
const Hints = () =>
  div(
    {
      class: "hint",
      style: () => currentView.val === "sketch" ? "" : "display:none"
    },
    span({}, "Press "),
    span({ class: "kbd" }, "Space"),
    span({}, " for next")
  );

// Main app
const App = () =>
  div(
    div({ id: "sketch-container" }),
    MenuButton(),
    BackButton(),
    SketchTitle(),
    Hints(),
    Modal()
  );

// Mount app
document.body.replaceChildren(App());

// Handle initial route
handleRoute();

// Handle browser back/forward
window.addEventListener("popstate", handleRoute);

// Keyboard navigation
document.addEventListener("keydown", (e) => {
  if (modalOpen.val) {
    if (e.key === "Escape") modalOpen.val = false;
    return;
  }

  if (currentView.val === "project") {
    if (e.key === "Escape") navigate("/");
    return;
  }

  if (e.key === " " || e.key === "ArrowRight") {
    e.preventDefault();
    // Find next sketch (skip projects)
    let next = currentSketch.val;
    do {
      next = (next + 1) % allItems.length;
    } while (allItems[next].type === "project" && next !== currentSketch.val);
    loadSketch(next);
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    let prev = currentSketch.val;
    do {
      prev = (prev - 1 + allItems.length) % allItems.length;
    } while (allItems[prev].type === "project" && prev !== currentSketch.val);
    loadSketch(prev);
  } else if (e.key === "Escape") {
    modalOpen.val = false;
  } else if (e.key === "m" || e.key === "M") {
    modalOpen.val = !modalOpen.val;
  }
});
