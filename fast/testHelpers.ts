import { EdgeContext } from "./EdgeContext";
import { EPS } from "./checks";

function isOnLineSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const t = dx !== 0 ? (px - x1) / dx : dy !== 0 ? (py - y1) / dy : 0;

  if (t < -EPS || t > 1 + EPS) {
    return false;
  }

  const projectedX = x1 + t * dx;
  const projectedY = y1 + t * dy;
  return Math.abs(px - projectedX) < EPS && Math.abs(py - projectedY) < EPS;
}

export function hasConstraintAlongLine(
  edges: EdgeContext,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): boolean {
  for (let i = 0; i < edges.getCapacity(); i++) {
    if (!edges.isInUse(i) || edges.fixed[i] !== 1) {
      continue;
    }

    const ax = edges.origins[i * 2]!;
    const ay = edges.origins[i * 2 + 1]!;
    const nextIdx = edges.next[i]!;
    if (nextIdx === -1) {
      continue;
    }

    const bx = edges.origins[nextIdx * 2]!;
    const by = edges.origins[nextIdx * 2 + 1]!;

    if (
      isOnLineSegment(ax, ay, x1, y1, x2, y2) &&
      isOnLineSegment(bx, by, x1, y1, x2, y2)
    ) {
      return true;
    }
  }
  return false;
}
