import { orient2D, inCircle, pointsEqual } from "./checks";
import { EdgeContext } from "./EdgeContext";

export function isConvexQuad(ctx: EdgeContext, edge: number): boolean {
  const twin = ctx.twin[edge]!;
  if (twin === -1) {
    throw new Error("isConvexQuad requires an internal edge");
  }

  const ax = ctx.origins[edge * 2]!;
  const ay = ctx.origins[edge * 2 + 1]!;
  const cIdx = ctx.next[edge]!;
  const cx = ctx.origins[cIdx * 2]!;
  const cy = ctx.origins[cIdx * 2 + 1]!;
  const dIdx = ctx.next[cIdx]!;
  const dx = ctx.origins[dIdx * 2]!;
  const dy = ctx.origins[dIdx * 2 + 1]!;
  const bIdx = ctx.next[ctx.next[twin]!]!;
  const bx = ctx.origins[bIdx * 2]!;
  const by = ctx.origins[bIdx * 2 + 1]!;

  return (
    orient2D(ax, ay, bx, by, cx, cy) > 0 &&
    orient2D(bx, by, cx, cy, dx, dy) > 0 &&
    orient2D(cx, cy, dx, dy, ax, ay) > 0 &&
    orient2D(dx, dy, ax, ay, bx, by) > 0
  );
}

export function isDelaunay(ctx: EdgeContext, edge: number): boolean {
  const twin = ctx.twin[edge]!;
  if (twin === -1) {
    throw new Error("isDelaunay requires a twin edge");
  }

  const t1x = ctx.origins[edge * 2]!;
  const t1y = ctx.origins[edge * 2 + 1]!;
  const t2Idx = ctx.next[edge]!;
  const t2x = ctx.origins[t2Idx * 2]!;
  const t2y = ctx.origins[t2Idx * 2 + 1]!;
  const t3Idx = ctx.next[t2Idx]!;
  const t3x = ctx.origins[t3Idx * 2]!;
  const t3y = ctx.origins[t3Idx * 2 + 1]!;
  const dIdx = ctx.next[ctx.next[twin]!]!;
  const dx = ctx.origins[dIdx * 2]!;
  const dy = ctx.origins[dIdx * 2 + 1]!;

  return inCircle(dx, dy, t1x, t1y, t2x, t2y, t3x, t3y) < 0;
}

export function getVertex(
  ctx: EdgeContext,
  px: number,
  py: number,
  edge: number,
): number {
  const ax = ctx.origins[edge * 2]!;
  const ay = ctx.origins[edge * 2 + 1]!;
  if (pointsEqual(ax, ay, px, py)) {
    return edge;
  }
  const bIdx = ctx.next[edge]!;
  if (bIdx === -1) {
    return -1;
  }
  const bx = ctx.origins[bIdx * 2]!;
  const by = ctx.origins[bIdx * 2 + 1]!;
  if (pointsEqual(bx, by, px, py)) {
    return bIdx;
  }
  const cIdx = ctx.next[bIdx]!;
  if (cIdx === -1) {
    return -1;
  }
  const cx = ctx.origins[cIdx * 2]!;
  const cy = ctx.origins[cIdx * 2 + 1]!;
  if (pointsEqual(cx, cy, px, py)) {
    return cIdx;
  }
  return -1;
}
