import van from "vanjs-core";
import "./index.css";
import { projects } from "./projects/index.js";
import { sketches } from "./sketches/index.js";
import { loadSketch } from "./sketchWrapper.js";

const { div, button, span, h1 } = van.tags;

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
const navigate = (path) => {
  history.pushState({}, "", path);
  handleRoute();
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
const handleRoute = () => {
  const route = getRoute();

  if (route.type === "project") {
    loadProject(route.slug);
  } else if (route.type === "sketch") {
    loadSketchPage(route.slug);
  } else {
    // Show grid on home
    currentProject.val = null;
    modalOpen.val = true;
  }
};

// Create thumbnail preview for grid
const createThumbnail = (project, container) => {
  if (project.thumbnail) {
    const img = document.createElement("img");
    img.src = project.thumbnail;
    img.style.cssText = "width:100%;height:100%;object-fit:cover;";
    container.appendChild(img);
    return;
  }

  // Placeholder for projects without thumbnail
  container.style.background = "#1a1a1a";
  container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#444;font-size:24px;">◆</div>`;
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
      "aria-label": "Back to projects",
      style: () => currentProject.val ? "display:flex" : "display:none"
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
    div({ class: "grid-item-title" }, item.name),
    item.description ? div({ class: "grid-item-desc" }, item.description) : null
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
    div({ class: "modal-header" }, h1("Projects")),
    CloseButton(),
    div(
      { class: "grid" },
      ...allItems.map((item, i) => GridItem({ item, index: i, type: item.type }))
    )
  );

// Project title display
const ProjectTitle = () =>
  div(
    { class: "sketch-title" },
    () => currentProject.val?.name || ""
  );

// Main app
const App = () =>
  div(
    div({ id: "sketch-container" }),
    MenuButton(),
    BackButton(),
    ProjectTitle(),
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
