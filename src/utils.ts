import { insertPoint, enforceEdge } from "./geometry";
import { EdgeContext, Point } from "./EdgeContext";

export function P(x: number, y: number): Point {
  return new Point(x, y);
}

export function insertSquare(
  ctx: EdgeContext,
  x: number,
  y: number,
  size: number,
): void {
  const coords = [
    new Point(x, y),
    new Point(x + size, y),
    new Point(x + size, y + size),
    new Point(x, y + size),
  ];

  for (const point of coords) {
    insertPoint(ctx, point);
  }

  for (let i = 0; i < coords.length; i += 1) {
    const a = coords[i]!;
    const b = coords[(i + 1) % coords.length]!;
    enforceEdge(ctx, a, b);
  }
}

export function insertPolygon(ctx: EdgeContext, points: Point[]): void {
  for (const point of points) {
    insertPoint(ctx, point);
  }
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    enforceEdge(ctx, a, b);
  }
}

export function insertOctagon(
  ctx: EdgeContext,
  x: number,
  y: number,
  size: number,
): void {
  const sqrt2 = Math.sqrt(2);
  const a = size / (sqrt2 + 1);
  const coords = [
    new Point(a / sqrt2 + x, 0 + y),
    new Point(a + a / sqrt2 + x, 0 + y),
    new Point(size + x, a / sqrt2 + y),
    new Point(size + x, a / sqrt2 + a + y),
    new Point(a + a / sqrt2 + x, size + y),
    new Point(a / sqrt2 + x, size + y),
    new Point(0 + x, a / sqrt2 + a + y),
    new Point(0 + x, a / sqrt2 + y),
  ];

  for (const point of coords) {
    insertPoint(ctx, point);
  }
  for (let i = 0; i < coords.length; i += 1) {
    const a = coords[i]!;
    const b = coords[(i + 1) % coords.length]!;
    enforceEdge(ctx, a, b);
  }
}
