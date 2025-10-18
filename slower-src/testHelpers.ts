import { EdgeContext, Point } from "./EdgeContext";
import { EPS } from "./checks";

function isOnLineSegment(p: Point, p1: Point, p2: Point): boolean {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const t = dx !== 0 ? (p.x - p1.x) / dx : dy !== 0 ? (p.y - p1.y) / dy : 0;

  if (t < -EPS || t > 1 + EPS) {
    return false;
  }

  const projectedX = p1.x + t * dx;
  const projectedY = p1.y + t * dy;
  return Math.abs(p.x - projectedX) < EPS && Math.abs(p.y - projectedY) < EPS;
}

export function hasConstraintAlongLine(
  edges: EdgeContext,
  p1: Point,
  p2: Point,
): boolean {
  for (const edge of edges.iterator()) {
    if (!edge.fixed) {
      continue;
    }

    const a = edge.origin;
    const nextEdge = edge.next;
    if (nextEdge === null) {
      continue;
    }

    const b = nextEdge.origin;

    if (isOnLineSegment(a, p1, p2) && isOnLineSegment(b, p1, p2)) {
      return true;
    }
  }
  return false;
}
