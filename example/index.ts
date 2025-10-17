/* eslint no-console: 0 */

import {
  EdgeContext,
  grid,
  playground,
  pointRemoval,
  selfIntersecting,
  tinySquare,
} from "..";

let showLabels = false;
let showEdges = true;

const presets = [
  { fn: playground, key: "playground", name: "Playground" },
  { fn: pointRemoval, key: "point-removal", name: "Point Removal" },
  { fn: selfIntersecting, key: "self-intersecting", name: "Self Intersecting" },
  { fn: grid, key: "grid", name: "Grid" },
  { fn: tinySquare, key: "tiny-square", name: "Tiny Square" },
];

function getPresetFromUrl(): number {
  const params = new URLSearchParams(window.location.search);
  const presetKey = params.get("preset");

  if (presetKey) {
    const index = presets.findIndex((p) => p.key === presetKey);
    if (index !== -1) {
      return index;
    }
  }

  return 0;
}

function updateUrl(presetIndex: number): void {
  const preset = presets[presetIndex];
  if (!preset) {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("preset", preset.key);
  window.history.replaceState({}, "", url);
}

let selectedMap = getPresetFromUrl();

const edges = new EdgeContext(64_000);

function loadPreset(index: number): void {
  const preset = presets[index];
  if (!preset) {
    return;
  }

  console.log(`Loading preset: ${preset.name}`);

  try {
    const startTime = performance.now();
    preset.fn(edges);
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`${preset.name} completed in ${duration.toFixed(2)}ms`);
    console.log(`Created ${edges.count()} edges`);
    console.log(
      `${((edges.count() / duration) * 1000).toFixed(0)} edges/second`,
    );

    centerView();
    draw();
  } catch (error) {
    console.error(`❌ Failed to load preset ${preset.name}:`, error);
  }
}

function centerView(): void {
  const edgeList = exportEdges();

  if (edgeList.length === 0) {
    return;
  }

  // Calculate bounding box
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const edge of edgeList) {
    minX = Math.min(minX, edge.x);
    maxX = Math.max(maxX, edge.x);
    minY = Math.min(minY, edge.y);
    maxY = Math.max(maxY, edge.y);
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const centerX = minX + width / 2;
  const centerY = minY + height / 2;

  // Calculate scale to fit with 10% margin on top and bottom
  const canvasWidth = window.innerWidth * dpr;
  const canvasHeight = window.innerHeight * dpr;

  // Apply 10% margin (so content uses 80% of screen)
  const targetWidth = canvasWidth * 0.8;
  const targetHeight = canvasHeight * 0.8;

  const scaleX = width > 0 ? targetWidth / width : 1;
  const scaleY = height > 0 ? targetHeight / height : 1;

  // Use the smaller scale to ensure everything fits
  scale = Math.min(scaleX, scaleY, maxScale);
  scale = Math.max(scale, minScale);

  // Center the view
  offsetX = canvasWidth / 2 - centerX * scale;
  offsetY = canvasHeight / 2 - centerY * scale;
}

type HalfEdge = {
  fixed: boolean;
  index: number;
  next: number;
  twin: number;
  x: number;
  y: number;
};

function exportEdges(): HalfEdge[] {
  const result: HalfEdge[] = [];
  const capacity = edges.getCapacity();

  for (let i = 0; i < capacity; i++) {
    if (!edges.isInUse(i)) {
      continue;
    }

    const originX = edges.origins[i * 2]!;
    const originY = edges.origins[i * 2 + 1]!;
    const next = edges.next[i]!;
    const twin = edges.twin[i]!;
    const fixed = edges.fixed[i] === 1;

    result.push({
      fixed,
      index: i,
      next,
      twin,
      x: originX,
      y: originY,
    });
  }

  return result;
}

const dpr = window.devicePixelRatio;
const initialScale = dpr;
const minScale = 1;
const maxScale = 30;

const canvas = document.createElement("canvas");
document.body.append(canvas);

const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
canvas.addEventListener("mousedown", startDragging);
canvas.addEventListener("mousemove", drag);
canvas.addEventListener("mouseup", stopDragging);
canvas.addEventListener("mouseleave", stopDragging);
canvas.addEventListener("wheel", handleZoom);
window.addEventListener("resize", draw);

const controls = document.createElement("div");
controls.setAttribute(
  "style",
  "position: absolute; top: 10px; right: 10px; display: flex; flex-direction: column; gap: 8px;",
);
document.body.append(controls);

const presetContainer = document.createElement("div");
presetContainer.setAttribute(
  "style",
  "display: flex; flex-direction: column; gap: 4px;",
);

const presetLabel = document.createElement("label");
presetLabel.textContent = "Preset:";
presetLabel.setAttribute("style", "font-size: 14px; font-weight: bold;");
presetContainer.append(presetLabel);

const presetSelect = document.createElement("select");
presetSelect.setAttribute("style", "padding: 4px;");
presets.forEach((preset, index) => {
  const option = document.createElement("option");
  option.value = index.toString();
  option.textContent = preset.name;
  presetSelect.append(option);
});

presetSelect.value = selectedMap.toString();

presetSelect.addEventListener("change", (e) => {
  const target = e.target as HTMLSelectElement;
  selectedMap = Number.parseInt(target.value);
  updateUrl(selectedMap);
  loadPreset(selectedMap);
});

presetContainer.append(presetSelect);
controls.append(presetContainer);

const checkboxes = document.createElement("div");
checkboxes.setAttribute(
  "style",
  "display: flex; flex-direction: column; gap: 4px;",
);
controls.append(checkboxes);

function addCheckbox(label: string, checked: boolean, onChange: () => void) {
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = checked;
  checkbox.id = label;
  checkbox.addEventListener("change", onChange);

  const labelElement = document.createElement("label");
  labelElement.setAttribute("style", "font-size: 14px; user-select: none;");
  labelElement.textContent = label;
  labelElement.setAttribute("for", label);

  const container = document.createElement("div");
  container.append(checkbox);
  container.append(labelElement);
  checkboxes.append(container);
  container.setAttribute("style", "display: flex; align-items: center;");
}

addCheckbox("show edges", showEdges, () => {
  showEdges = !showEdges;
  draw();
});

addCheckbox("show labels", showLabels, () => {
  showLabels = !showLabels;
  draw();
});

// Add center button
const centerButton = document.createElement("button");
centerButton.textContent = "Center";
centerButton.setAttribute(
  "style",
  "padding: 6px 12px; margin-top: 8px; cursor: pointer; background: #007bff; color: white; border: none; border-radius: 4px; font-size: 14px; font-weight: bold;",
);
centerButton.addEventListener("click", () => {
  centerView();
  draw();
});
controls.append(centerButton);

let isDragging = false;
let lastX = 0;
let lastY = 0;
let offsetX = 50;
let offsetY = 50;
let scale = initialScale;

function startDragging(e: MouseEvent) {
  isDragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
}

function stopDragging() {
  isDragging = false;
}

function drag(e: MouseEvent) {
  if (!isDragging) {
    return;
  }

  const deltaX = (e.clientX - lastX) * dpr;
  const deltaY = (e.clientY - lastY) * dpr;

  offsetX += deltaX;
  offsetY += deltaY;

  lastX = e.clientX;
  lastY = e.clientY;

  draw();
}

function handleZoom(e: WheelEvent) {
  e.preventDefault();

  const rect = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left) * dpr;
  const mouseY = (e.clientY - rect.top) * dpr;

  const worldX = (mouseX - offsetX) / scale;
  const worldY = (mouseY - offsetY) / scale;

  const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.min(Math.max(scale * zoomFactor, minScale), maxScale);

  offsetX = mouseX - worldX * newScale;
  offsetY = mouseY - worldY * newScale;

  scale = newScale;

  draw();
}

function edgeToString(x1: number, y1: number, x2: number, y2: number): string {
  if (x2 > x1) {
    return `${x1},${y1}-${x2},${y2}`;
  } else if (x2 === x1) {
    return y2 > y1 ? `${x1},${y1}-${x2},${y2}` : `${x2},${y2}-${x1},${y1}`;
  } else {
    return `${x2},${y2}-${x1},${y1}`;
  }
}

function draw() {
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.setAttribute(
    "style",
    `width: ${window.innerWidth}px; height: ${window.innerHeight}px;`,
  );

  ctx.reset();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const points = new Set<string>();
  const drawnEdges = new Set<string>();

  const edgeList = exportEdges();

  const edgeMap = new Map<number, HalfEdge>();
  for (const edge of edgeList) {
    edgeMap.set(edge.index, edge);
  }

  for (const e1 of edgeList) {
    if (e1.next === -1) {
      continue;
    }

    const e2 = edgeMap.get(e1.next);
    if (!e2) {
      continue;
    }

    const hash = edgeToString(e1.x, e1.y, e2.x, e2.y);
    if (drawnEdges.has(hash)) {
      continue;
    }
    drawnEdges.add(hash);

    const twinEdge = e1.twin !== -1 ? edgeMap.get(e1.twin) : null;
    if (e1.fixed || twinEdge?.fixed) {
      ctx.strokeStyle = "rgba(0, 0, 0, 1)";
      ctx.lineWidth = (2 * dpr) / scale;
    } else {
      ctx.strokeStyle = showEdges ? "rgba(210, 210, 210, 1)" : "transparent";
      ctx.lineWidth = (1 * dpr) / scale;
    }

    ctx.beginPath();
    ctx.moveTo(e1.x, e1.y);
    ctx.lineTo(e2.x, e2.y);
    ctx.stroke();

    points.add(`${e1.x},${e1.y}`.toString());
    points.add(`${e2.x},${e2.y}`.toString());
  }

  if (showLabels) {
    for (const p of points) {
      const [x, y] = p.split(",").map(Number);
      ctx.font = `${(12 * dpr) / scale}px sans-serif`;
      ctx.fillStyle = "blue";
      ctx.fillText(`(${x!.toFixed(1)}, ${y!.toFixed(1)})`, x!, y!);
    }
  }
}

updateUrl(selectedMap);
loadPreset(selectedMap);
