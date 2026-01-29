import van from "vanjs-core";
import "./index.css";
import { projects } from "./projects/index.js";
import { sketches } from "./sketches/index.js";
import { loadSketch } from "./sketchWrapper.js";

const { div, button, span, h1, h2, p } = van.tags;

// State
const modalOpen = van.state(false);
const currentProject = van.state(null);
let p5Instance = null;

// Simple router
const getRoute = () => {
  const path = window.location.pathname;
  if (path.startsWith("/project/")) {
    return { type: "project", slug: path.replace("/project/", "") };
  }
  if (path.startsWith("/sketch/")) {
    return { type: "sketch", slug: path.replace("/sketch/", "") };
  }
  return { type: "home" };
};

// Navigate to a route
const navigate = async (path) => {
  const container = document.getElementById("sketch-container");
  
  // Fade out
  if (container) {
    container.classList.add("fading-out");
    await new Promise(r => setTimeout(r, 300));
  }

  history.pushState({}, "", path);
  await handleRoute();
  
  // Fade in
  if (container) {
    // Small delay to ensure DOM update
    setTimeout(() => {
      container.classList.remove("fading-out");
    }, 50);
  }
};

// Load a project page
const loadProject = async (slug) => {
  if (p5Instance) {
    p5Instance.remove();
    p5Instance = null;
  }

  const project = projects.find(p => p.slug === slug);
  if (!project) {
    navigate("/");
    return;
  }

  currentProject.val = project;

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

// Load a sketch page
const loadSketchPage = async (slug) => {
  if (p5Instance) {
    p5Instance.remove();
    p5Instance = null;
  }

  const sketch = sketches.find(s => s.slug === slug);
  if (!sketch) {
    navigate("/");
    return;
  }

  currentProject.val = sketch;

  // Clear container and load sketch
  const container = document.getElementById("sketch-container");
  container.innerHTML = "";

  // Load the sketch using the wrapper
  try {
    p5Instance = await loadSketch(sketch.sketchPath, container);
  } catch (e) {
    console.error("Failed to load sketch:", e);
  }
};

// Handle current route
const handleRoute = async () => {
  const route = getRoute();

  if (route.type === "project") {
    await loadProject(route.slug);
  } else if (route.type === "sketch") {
    await loadSketchPage(route.slug);
  } else {
    // Show grid on home
    currentProject.val = null;
    modalOpen.val = true;
    if (p5Instance) {
      p5Instance.remove();
      p5Instance = null;
    }
    const container = document.getElementById("sketch-container");
    if (container) container.innerHTML = "";
  }
};

// Create thumbnail preview for grid
const createThumbnail = (project, container) => {
  if (project.thumbnail) {
    const img = document.createElement("img");
    img.src = project.thumbnail;
    img.alt = project.name;
    container.appendChild(img);
    return;
  }

  // Placeholder for projects without thumbnail
  // Use a subtle gradient or pattern instead of just text
  container.style.background = "linear-gradient(45deg, #111, #1a1a1a)";
};

// Navigation Controls
const UIControls = () => {
  const isHovered = van.state(false);

  return div(
    { 
      class: "ui-controls",
      onmouseenter: () => isHovered.val = true,
      onmouseleave: () => isHovered.val = false,
      onclick: (e) => {
        // Only toggle if clicking the container or the button directly
        if (e.target.closest('.minimal-btn') || e.target.classList.contains('ui-controls')) {
          modalOpen.val = !modalOpen.val;
        }
      }
    },
    // Main Title/Menu Button
    button(
      {
        class: "minimal-btn main-title-btn",
      },
      () => {
        if (modalOpen.val) {
           return currentProject.val ? "Close" : "Index";
        }
        return currentProject.val?.name || "Index";
      }
    ),
    // Description - reveals on hover
    div(
      { 
        class: () => `nav-description ${isHovered.val && !modalOpen.val && currentProject.val ? "visible" : ""}` 
      },
      () => currentProject.val?.description || ""
    )
  );
};

// Grid item - supports both projects and sketches
const GridItem = ({ item, index, type }) => {
  const container = div({ class: "grid-item-canvas" });

  setTimeout(() => createThumbnail(item, container), 50 + index * 20);

  const route = type === "sketch" ? `/sketch/${item.slug}` : `/project/${item.slug}`;

  return div(
    {
      class: "grid-item",
      onclick: () => {
        navigate(route);
        modalOpen.val = false;
      }
    },
    container,
    div(
      { class: "grid-item-info" },
      div({ class: "grid-item-title" }, item.name),
      item.description ? div({ class: "grid-item-desc" }, item.description) : null
    )
  );
};

// Combine projects and sketches for the gallery
const allItems = [
  ...projects.map(p => ({ ...p, type: "project" })),
  ...sketches.map(s => ({ ...s, type: "sketch" }))
];

// Modal overlay with grid
const Modal = () =>
  div(
    {
      class: () => `modal-overlay ${modalOpen.val ? "open" : ""}`
    },
    div(
      { class: "modal-header" },
      // Header is now minimal, just padding for the buttons
    ),
    div(
      { class: "grid" },
      ...allItems.map((item, i) => GridItem({ item, index: i, type: item.type }))
    )
  );

// Main app
const App = () =>
  div(
    div({ id: "sketch-container" }),
    UIControls(),
    Modal()
  );

// Mount app
document.body.replaceChildren(App());

// Handle initial route
handleRoute();

// Handle browser back/forward
window.addEventListener("popstate", async () => {
    const container = document.getElementById("sketch-container");
    container.classList.add("fading-out");
    await new Promise(r => setTimeout(r, 300));
    await handleRoute();
    container.classList.remove("fading-out");
});

// Keyboard navigation
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (modalOpen.val) {
      modalOpen.val = false;
    } else if (currentProject.val) {
      navigate("/");
    }
  } else if (e.key === "m" || e.key === "M") {
    modalOpen.val = !modalOpen.val;
  }
});
