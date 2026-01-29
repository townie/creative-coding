import van from "vanjs-core";
import "./index.css";
import { projects } from "./projects/index.js";

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

// Handle current route
const handleRoute = () => {
  const route = getRoute();

  if (route.type === "project") {
    loadProject(route.slug);
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

// Grid item
const GridItem = ({ project, index }) => {
  const container = div({ class: "grid-item-canvas" });

  setTimeout(() => createThumbnail(project, container), 50 + index * 20);

  return div(
    {
      class: "grid-item",
      onclick: () => {
        navigate(`/project/${project.slug}`);
        modalOpen.val = false;
      }
    },
    container,
    div({ class: "grid-item-title" }, project.name),
    project.description ? div({ class: "grid-item-desc" }, project.description) : null
  );
};

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
      ...projects.map((project, i) => GridItem({ project, index: i }))
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
