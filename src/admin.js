import van from "vanjs-core";
import { projects } from "./projects/index.js";
import { sketches } from "./sketches/index.js";
import { loadSketch } from "./sketchWrapper.js";

const { div, button, span, h2, img } = van.tags;

// Combine all items
const allItems = [
  ...projects.map(p => ({ ...p, type: "project" })),
  ...sketches.map(s => ({ ...s, type: "sketch" }))
];

// State for capture mode
const captureMode = van.state(false);
const captureItem = van.state(null);
let p5Instance = null;

// Check if thumbnail exists (will be validated on render)
const thumbnailStatus = van.state({});

// Check thumbnails on load
const checkThumbnails = async () => {
  const status = {};
  for (const item of allItems) {
    const path = `/thumbnails/${item.slug}.png`;
    try {
      const response = await fetch(path, { method: 'HEAD' });
      status[item.slug] = response.ok;
    } catch {
      status[item.slug] = false;
    }
  }
  thumbnailStatus.val = status;
};

// Capture the canvas as PNG
const captureCanvas = () => {
  const container = document.getElementById("capture-container");
  const canvas = container?.querySelector("canvas");

  if (!canvas) {
    console.error("No canvas found to capture");
    return;
  }

  // Create offscreen canvas at target size
  const targetWidth = 640;
  const targetHeight = 360;
  const offscreen = document.createElement("canvas");
  offscreen.width = targetWidth;
  offscreen.height = targetHeight;
  const ctx = offscreen.getContext("2d");

  // Draw scaled version
  ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

  // Download
  offscreen.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${captureItem.val.slug}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, "image/png");
};

// Close capture mode
const closeCapture = () => {
  if (p5Instance) {
    p5Instance.remove();
    p5Instance = null;
  }
  captureMode.val = false;
  captureItem.val = null;
};

// Start capture for an item
const startCapture = async (item) => {
  captureItem.val = item;
  captureMode.val = true;

  // Wait for DOM to update
  await new Promise(r => setTimeout(r, 50));

  const container = document.getElementById("capture-container");
  if (!container) return;

  container.innerHTML = "";

  try {
    if (item.type === "project") {
      const module = await item.load();
      if (module.init) {
        p5Instance = module.init(container);
      }
    } else {
      p5Instance = await loadSketch(item.sketchPath, container);
    }
  } catch (e) {
    console.error("Failed to load for capture:", e);
  }
};

// Admin item card
const AdminItem = (item) => {
  const hasThumb = () => thumbnailStatus.val[item.slug] || false;
  const thumbPath = `/thumbnails/${item.slug}.png`;

  return div(
    { class: "admin-item" },
    div(
      { class: "admin-thumb" },
      () => hasThumb()
        ? img({ src: thumbPath + "?t=" + Date.now(), alt: item.name })
        : div({ class: "admin-placeholder" })
    ),
    div(
      { class: "admin-item-info" },
      div({ class: "admin-item-name" }, item.name),
      div(
        { class: "admin-item-type" },
        item.type === "project" ? "Project" : "Sketch"
      ),
      span(
        { class: () => `admin-badge ${hasThumb() ? "has-thumb" : "needs-thumb"}` },
        () => hasThumb() ? "Has thumbnail" : "Needs thumbnail"
      )
    ),
    button(
      {
        class: "admin-capture-btn",
        onclick: () => startCapture(item)
      },
      "Capture"
    )
  );
};

// Capture modal with full-size sketch
const CaptureModal = () =>
  div(
    { class: () => `capture-modal ${captureMode.val ? "open" : ""}` },
    div({ id: "capture-container", class: "capture-container" }),
    div(
      { class: "capture-toolbar" },
      span(
        { class: "capture-name" },
        () => captureItem.val?.name || ""
      ),
      button(
        {
          class: "capture-btn primary",
          onclick: captureCanvas
        },
        "Capture"
      ),
      button(
        {
          class: "capture-btn",
          onclick: closeCapture
        },
        "Close"
      )
    )
  );

// Main admin page
export const AdminPage = () => {
  // Check thumbnails when component mounts
  setTimeout(checkThumbnails, 100);

  return div(
    { class: "admin-page" },
    div(
      { class: "admin-header" },
      h2("Thumbnail Admin"),
      button(
        {
          class: "admin-refresh-btn",
          onclick: checkThumbnails
        },
        "Refresh Status"
      )
    ),
    div(
      { class: "admin-grid" },
      ...allItems.map(item => AdminItem(item))
    ),
    CaptureModal()
  );
};
