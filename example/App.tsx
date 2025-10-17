/* eslint no-console: 0 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  Checkbox,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
} from "react-aria-components";
import {
  EdgeContext,
  grid,
  playground,
  pointRemoval,
  selfIntersecting,
  tinySquare,
} from "..";

type HalfEdge = {
  fixed: boolean;
  index: number;
  next: number;
  twin: number;
  x: number;
  y: number;
};

type Preset = {
  fn: (edges: EdgeContext) => void;
  key: string;
  name: string;
};

const presets: Preset[] = [
  { fn: playground, key: "playground", name: "Playground" },
  { fn: pointRemoval, key: "point-removal", name: "Point Removal" },
  { fn: selfIntersecting, key: "self-intersecting", name: "Self Intersecting" },
  { fn: grid, key: "grid", name: "Grid" },
  { fn: tinySquare, key: "tiny-square", name: "Tiny Square" },
];

const dpr = window.devicePixelRatio;
const initialScale = dpr;
const minScale = 1;
const maxScale = 30;

function StyledCheckbox({
  children,
  isSelected,
  onChange,
}: {
  children: React.ReactNode;
  isSelected: boolean;
  onChange: (isSelected: boolean) => void;
}) {
  return (
    <Checkbox
      className="flex items-center gap-2 group"
      isSelected={isSelected}
      onChange={onChange}
    >
      <div className="w-4 h-4 border border-gray-300 flex items-center justify-center group-data-[selected]:bg-gray-300 group-data-[selected]:border-gray-300">
        <svg
          className="w-2.5 h-2.5 text-black opacity-0 group-data-[selected]:opacity-100"
          fill="none"
          viewBox="0 0 12 10"
        >
          <path d="M1 5L4.5 8.5L11 1.5" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>
      <span className="text-sm select-none text-gray-700">{children}</span>
    </Checkbox>
  );
}

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

function exportEdges(edges: EdgeContext): HalfEdge[] {
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

function edgeToString(x1: number, y1: number, x2: number, y2: number): string {
  if (x2 > x1) {
    return `${x1},${y1}-${x2},${y2}`;
  } else if (x2 === x1) {
    return y2 > y1 ? `${x1},${y1}-${x2},${y2}` : `${x2},${y2}-${x1},${y1}`;
  } else {
    return `${x2},${y2}-${x1},${y1}`;
  }
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const edgesRef = useRef<EdgeContext | null>(null);
  const isDraggingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);
  const offsetXRef = useRef(50);
  const offsetYRef = useRef(50);
  const scaleRef = useRef(initialScale);

  const [showLabels, setShowLabels] = useState(false);
  const [showEdges, setShowEdges] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState(getPresetFromUrl());

  useEffect(() => {
    edgesRef.current = new EdgeContext(64_000);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const edges = edgesRef.current;
    if (!canvas || !edges) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    ctx.reset();
    ctx.translate(offsetXRef.current, offsetYRef.current);
    ctx.scale(scaleRef.current, scaleRef.current);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const points = new Set<string>();
    const drawnEdges = new Set<string>();

    const edgeList = exportEdges(edges);

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
        ctx.lineWidth = (2 * dpr) / scaleRef.current;
      } else {
        ctx.strokeStyle = showEdges ? "rgba(210, 210, 210, 1)" : "transparent";
        ctx.lineWidth = (1 * dpr) / scaleRef.current;
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
        ctx.font = `${(12 * dpr) / scaleRef.current}px sans-serif`;
        ctx.fillStyle = "blue";
        ctx.fillText(`(${x!.toFixed(1)}, ${y!.toFixed(1)})`, x!, y!);
      }
    }
  }, [showLabels, showEdges]);

  const centerView = useCallback(() => {
    const edges = edgesRef.current;
    if (!edges) {
      return;
    }

    const edgeList = exportEdges(edges);

    if (edgeList.length === 0) {
      return;
    }

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

    const canvasWidth = window.innerWidth * dpr;
    const canvasHeight = window.innerHeight * dpr;

    const targetWidth = canvasWidth * 0.8;
    const targetHeight = canvasHeight * 0.8;

    const scaleX = width > 0 ? targetWidth / width : 1;
    const scaleY = height > 0 ? targetHeight / height : 1;

    scaleRef.current = Math.min(scaleX, scaleY, maxScale);
    scaleRef.current = Math.max(scaleRef.current, minScale);

    offsetXRef.current = canvasWidth / 2 - centerX * scaleRef.current;
    offsetYRef.current = canvasHeight / 2 - centerY * scaleRef.current;

    draw();
  }, [draw]);

  const loadPreset = useCallback(
    (index: number) => {
      const edges = edgesRef.current;
      if (!edges) {
        return;
      }

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
      } catch (error) {
        console.error(`Failed to load preset ${preset.name}:`, error);
      }
    },
    [centerView],
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastXRef.current = e.clientX;
    lastYRef.current = e.clientY;
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggingRef.current) {
        return;
      }

      const deltaX = (e.clientX - lastXRef.current) * dpr;
      const deltaY = (e.clientY - lastYRef.current) * dpr;

      offsetXRef.current += deltaX;
      offsetYRef.current += deltaY;

      lastXRef.current = e.clientX;
      lastYRef.current = e.clientY;

      draw();
    },
    [draw],
  );

  const handleCenter = useCallback(() => {
    centerView();
  }, [centerView]);

  useEffect(() => {
    if (edgesRef.current) {
      updateUrl(selectedPreset);
      loadPreset(selectedPreset);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) * dpr;
      const mouseY = (e.clientY - rect.top) * dpr;

      const worldX = (mouseX - offsetXRef.current) / scaleRef.current;
      const worldY = (mouseY - offsetYRef.current) / scaleRef.current;

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.min(
        Math.max(scaleRef.current * zoomFactor, minScale),
        maxScale,
      );

      offsetXRef.current = mouseX - worldX * newScale;
      offsetYRef.current = mouseY - worldY * newScale;

      scaleRef.current = newScale;

      draw();
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [draw]);

  useEffect(() => {
    draw();
  }, [showLabels, showEdges, draw]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas
        className="block w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        ref={canvasRef}
      />
      <div className="absolute top-0 right-0 z-1 flex flex-col gap-2 p-4 bg-gray-50">
        <Select
          className="flex flex-col gap-1 w-40"
          onChange={(key) => {
            const index = Number(key);
            setSelectedPreset(index);
            updateUrl(index);
            loadPreset(index);
          }}
          value={selectedPreset.toString()}
        >
          <Label className="text-sm font-semibold text-gray-700">Preset</Label>
          <Button className="h-7 px-2 border border-gray-300 bg-white text-sm text-left outline-none">
            <SelectValue />
          </Button>
          <Popover className="bg-white border border-gray-300 shadow-lg">
            <ListBox className="outline-none w-40">
              {presets.map((preset, index) => (
                <ListBoxItem
                  className="cursor-default h-7 px-2 flex items-center text-sm outline-none data-[hovered]:bg-gray-100"
                  id={index.toString()}
                  key={index}
                >
                  {preset.name}
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </Select>
        <div className="flex flex-col gap-1">
          <StyledCheckbox isSelected={showEdges} onChange={setShowEdges}>
            show edges
          </StyledCheckbox>
          <StyledCheckbox isSelected={showLabels} onChange={setShowLabels}>
            show labels
          </StyledCheckbox>
        </div>
        <Button
          className="self-end mt-2 px-4 h-8 bg-gray-200 text-sm text-black rounded-full font-medium hover:bg-gray-300 cursor-default"
          onPress={handleCenter}
        >
          Center
        </Button>
      </div>
    </div>
  );
}
