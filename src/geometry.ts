import { nullthrows as nt } from "./nullthrows";
import {
  orient2D,
  inTriangle,
  doCross,
  intersect,
  onSegment,
  pointsEqual,
  EPS,
} from "./checks";
import { EdgeContext } from "./EdgeContext";
import { Ring } from "./Ring";
import { isConvexQuad, isDelaunay, getVertex } from "./edges";

const STACK_LIMIT = 128;
const QUEUE_LIMIT = 256;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

class Queue {
  public begin: number;
  public end: number;

  constructor(
    public readonly items: number[],
    public readonly capacity: number,
  ) {
    this.items = new Array(capacity);
    this.begin = 0;
    this.end = 0;
  }
}

export function locatePoint(
  ctx: EdgeContext,
  px: number,
  py: number,
  start: number,
): number | null {
  let current = start;
  let i = 0;
  while (i < 10_000) {
    i += 1;

    const ax = ctx.origins[current * 2]!;
    const ay = ctx.origins[current * 2 + 1]!;

    const bIdx = ctx.next[current]!;
    if (bIdx === -1) {
      throw new Error("Half-edge has no `next` reference");
    }
    const bx = ctx.origins[bIdx * 2]!;
    const by = ctx.origins[bIdx * 2 + 1]!;

    const cIdx = ctx.next[bIdx]!;
    if (cIdx === -1) {
      throw new Error("Half-edge has no `next` reference");
    }
    const cx = ctx.origins[cIdx * 2]!;
    const cy = ctx.origins[cIdx * 2 + 1]!;

    if (inTriangle(px, py, ax, ay, bx, by, cx, cy)) {
      return current;
    }

    let nextEdge = -1;

    // Check edge bIdx
    const orientB = orient2D(bx, by, cx, cy, px, py);
    if (orientB < 0) {
      const twin = ctx.twin[bIdx]!;
      if (twin === -1) {
        return null;
      }
      nextEdge = twin;
    } else {
      // Check edge cIdx
      const orientC = orient2D(cx, cy, ax, ay, px, py);
      if (orientC < 0) {
        const twin = ctx.twin[cIdx]!;
        if (twin === -1) {
          return null;
        }
        nextEdge = twin;
      }
    }

    if (nextEdge === -1) {
      throw new Error("locatePoint failed to advance");
    }

    current = nextEdge;
  }

  throw new Error("locatePoint exceeded iteration cap");
}

export function square(ctx: EdgeContext, width: number, height: number): void {
  const ab = ctx.create(0, 0);
  const bc = ctx.create(width, 0);
  const ca = ctx.create(width, height);
  ctx.next[ab] = bc;
  ctx.next[bc] = ca;
  ctx.next[ca] = ab;

  const cd = ctx.create(width, height);
  const da = ctx.create(0, height);
  const ac = ctx.create(0, 0);
  ctx.next[cd] = da;
  ctx.next[da] = ac;
  ctx.next[ac] = cd;

  ctx.twin[ac] = ca;
  ctx.twin[ca] = ac;
}

export function flip(ctx: EdgeContext, edge: number): void {
  const twin = nt(ctx.twin[edge]!, "Half-edge has no twin");
  assert(
    ctx.fixed[edge] !== 1 && ctx.fixed[twin] !== 1,
    "cannot flip fixed edge",
  );
  assert(isConvexQuad(ctx, edge), "flip requires convex quad");

  const ac = edge;
  const ca = twin;
  const ab = nt(ctx.next[ca], "Half-edge has no `next` reference");
  const bc = nt(ctx.next[ab], "Half-edge has no `next` reference");
  const cd = nt(ctx.next[ac], "Half-edge has no `next` reference");
  const da = nt(ctx.next[cd], "Half-edge has no `next` reference");

  const daX = ctx.origins[da * 2]!;
  const daY = ctx.origins[da * 2 + 1]!;
  ctx.setOrigin(ac, daX, daY);
  const bcX = ctx.origins[bc * 2]!;
  const bcY = ctx.origins[bc * 2 + 1]!;
  ctx.setOrigin(ca, bcX, bcY);

  ctx.next[ac] = bc;
  ctx.next[cd] = ac;
  ctx.next[bc] = cd;

  ctx.next[ca] = da;
  ctx.next[ab] = ca;
  ctx.next[da] = ab;
}

function flipEdges(
  ctx: EdgeContext,
  stackValues: number[],
  stackTop: number,
): void {
  while (stackTop > 0) {
    const edge = stackValues[--stackTop]!;
    const twin = ctx.twin[edge]!;
    if (twin === -1) {
      continue;
    }
    if (ctx.fixed[edge] === 1 || ctx.fixed[twin] === 1) {
      continue;
    }
    if (isDelaunay(ctx, edge)) {
      continue;
    }

    const fNext = nt(ctx.next[twin], "Half-edge has no `next` reference");
    const fNextNext = nt(ctx.next[fNext], "Half-edge has no `next` reference");
    stackValues[stackTop++] = fNext;
    stackValues[stackTop++] = fNextNext;
    flip(ctx, edge);
  }
}

export function findSharedEdge(
  ctx: EdgeContext,
  edge: number,
  e1x: number,
  e1y: number,
  e2x: number,
  e2y: number,
): number {
  const start = getVertex(ctx, e1x, e1y, edge);
  let current = start;
  const LIMIT = 100;
  let i = 0;

  while (i < LIMIT) {
    i += 1;
    const ax = ctx.origins[current * 2]!;
    const ay = ctx.origins[current * 2 + 1]!;
    const bIdx = nt(ctx.next[current], "Half-edge has no `next` reference");
    const bx = ctx.origins[bIdx * 2]!;
    const by = ctx.origins[bIdx * 2 + 1]!;
    if (pointsEqual(ax, ay, e1x, e1y) && pointsEqual(bx, by, e2x, e2y)) {
      return current;
    }
    const twin = ctx.twin[current]!;
    if (twin === -1) {
      break;
    }
    current = nt(ctx.next[twin], "Half-edge has no `next` reference");
    if (current === start) {
      break;
    }
  }

  current = start;
  while (i < LIMIT) {
    i += 1;
    const ax = ctx.origins[current * 2]!;
    const ay = ctx.origins[current * 2 + 1]!;
    const bIdx = nt(ctx.next[current], "Half-edge has no `next` reference");
    const bx = ctx.origins[bIdx * 2]!;
    const by = ctx.origins[bIdx * 2 + 1]!;
    if (pointsEqual(ax, ay, e1x, e1y) && pointsEqual(bx, by, e2x, e2y)) {
      return current;
    }
    const next =
      ctx.twin[
        nt(
          ctx.next[
            nt(ctx.next[current]!, "Half-edge has no `next` reference")
          ]!,
          "Half-edge has no `next` reference",
        )
      ]!;
    if (next === -1) {
      break;
    }
    current = next;
    if (current === start) {
      break;
    }
  }
  return -1;
}

function insertPointInEdge(
  ctx: EdgeContext,
  px: number,
  py: number,
  edge: number,
): void {
  const ac = edge;
  const cd = nt(ctx.next[ac], "Half-edge has no `next` reference");
  const da = nt(ctx.next[cd], "Half-edge has no `next` reference");

  const daX = ctx.origins[da * 2]!;
  const daY = ctx.origins[da * 2 + 1]!;
  const pd = ctx.create(px, py);
  const dp = ctx.create(daX, daY);
  ctx.twin[pd] = dp;
  ctx.twin[dp] = pd;

  ctx.next[ac] = pd;
  ctx.next[pd] = da;

  const pc = ctx.create(px, py, -1, -1, ctx.fixed[ac] === 1);
  ctx.next[pc] = cd;
  ctx.next[dp] = pc;
  ctx.next[cd] = dp;

  let top = 0;
  const stack = new Array<number>(STACK_LIMIT);
  stack[top++] = cd;
  stack[top++] = da;

  const pa = ctx.twin[ac]!;
  if (pa !== -1) {
    ctx.setOrigin(pa, px, py);
    const ab = nt(ctx.next[pa], "Half-edge has no `next` reference");

    const cdX = ctx.origins[cd * 2]!;
    const cdY = ctx.origins[cd * 2 + 1]!;
    const cp = ctx.create(cdX, cdY, -1, -1, ctx.fixed[pa] === 1);
    ctx.twin[pc] = cp;
    ctx.twin[cp] = pc;

    const bc = nt(ctx.next[ab], "Half-edge has no `next` reference");
    const bcX = ctx.origins[bc * 2]!;
    const bcY = ctx.origins[bc * 2 + 1]!;
    const pb = ctx.create(px, py);
    const bp = ctx.create(bcX, bcY);
    ctx.twin[pb] = bp;
    ctx.twin[bp] = pb;

    ctx.next[ab] = bp;
    ctx.next[bp] = pa;

    ctx.next[cp] = pb;
    ctx.next[pb] = bc;
    ctx.next[bc] = cp;

    stack[top++] = ab;
    stack[top++] = bc;
  }

  flipEdges(ctx, stack, top);
}

function insertPointInFace(
  ctx: EdgeContext,
  px: number,
  py: number,
  edge: number,
): void {
  const ab = edge;
  const bc = nt(ctx.next[ab], "Half-edge has no `next` reference");
  const ca = nt(ctx.next[bc], "Half-edge has no `next` reference");

  const ax = ctx.origins[ab * 2]!;
  const ay = ctx.origins[ab * 2 + 1]!;
  const bx = ctx.origins[bc * 2]!;
  const by = ctx.origins[bc * 2 + 1]!;
  const cx = ctx.origins[ca * 2]!;
  const cy = ctx.origins[ca * 2 + 1]!;

  const pa = ctx.create(px, py);
  const ap = ctx.create(ax, ay);
  ctx.twin[pa] = ap;
  ctx.twin[ap] = pa;
  ctx.next[pa] = ab;

  const pb = ctx.create(px, py);
  const bp = ctx.create(bx, by);
  ctx.twin[pb] = bp;
  ctx.twin[bp] = pb;
  ctx.next[pb] = bc;

  const pc = ctx.create(px, py);
  const cp = ctx.create(cx, cy);
  ctx.twin[pc] = cp;
  ctx.twin[cp] = pc;
  ctx.next[pc] = ca;

  ctx.next[ap] = pc;
  ctx.next[bp] = pa;
  ctx.next[cp] = pb;

  ctx.next[ab] = bp;
  ctx.next[bc] = cp;
  ctx.next[ca] = ap;

  let top = 0;
  const stack = new Array<number>(STACK_LIMIT);
  stack[top++] = ab;
  stack[top++] = bc;
  stack[top++] = ca;
  flipEdges(ctx, stack, top);
}

export function insertPoint(ctx: EdgeContext, px: number, py: number): void {
  const start = ctx.any();
  const t = nt(locatePoint(ctx, px, py, start), "Edge not found");

  const tNext = nt(ctx.next[t], "Half-edge has no `next` reference");
  const tNextNext = nt(ctx.next[tNext], "Half-edge has no `next` reference");
  assert(
    nt(ctx.next[tNextNext], "Half-edge has no `next` reference") === t,
    "triangle connectivity broken",
  );

  const tx = ctx.origins[t * 2]!;
  const ty = ctx.origins[t * 2 + 1]!;
  const tNextX = ctx.origins[tNext * 2]!;
  const tNextY = ctx.origins[tNext * 2 + 1]!;
  const tNextNextX = ctx.origins[tNextNext * 2]!;
  const tNextNextY = ctx.origins[tNextNext * 2 + 1]!;

  if (
    pointsEqual(tx, ty, px, py) ||
    pointsEqual(tNextX, tNextY, px, py) ||
    pointsEqual(tNextNextX, tNextNextY, px, py)
  ) {
    return;
  }

  if (onSegment(px, py, tx, ty, tNextX, tNextY)) {
    insertPointInEdge(ctx, px, py, t);
  } else if (onSegment(px, py, tNextX, tNextY, tNextNextX, tNextNextY)) {
    insertPointInEdge(ctx, px, py, tNext);
  } else if (onSegment(px, py, tNextNextX, tNextNextY, tx, ty)) {
    insertPointInEdge(ctx, px, py, tNextNext);
  } else {
    insertPointInFace(ctx, px, py, t);
  }
}

function hasIntersection(
  ctx: EdgeContext,
  edge: number,
  e1x: number,
  e1y: number,
  e2x: number,
  e2y: number,
): boolean {
  const ax = ctx.origins[edge * 2]!;
  const ay = ctx.origins[edge * 2 + 1]!;
  const bIdx = nt(ctx.next[edge], "Half-edge has no `next` reference");
  const bx = ctx.origins[bIdx * 2]!;
  const by = ctx.origins[bIdx * 2 + 1]!;
  return intersect(ax, ay, bx, by, e1x, e1y, e2x, e2y) !== null;
}

function findStartEdgeForIntersect(
  ctx: EdgeContext,
  inTriangleEdge: number,
  e1x: number,
  e1y: number,
  e2x: number,
  e2y: number,
): number {
  const LIMIT = 32;
  const start = getVertex(ctx, e1x, e1y, inTriangleEdge);
  if (start === -1) {
    throw new Error("E1NotAVertex");
  }

  let current = start;
  let i = 0;
  while (i < LIMIT) {
    const eA = current;
    const eB = nt(ctx.next[current], "Half-edge has no `next` reference");
    const eC = nt(ctx.next[eB], "Half-edge has no `next` reference");
    if (
      hasIntersection(ctx, eA, e1x, e1y, e2x, e2y) ||
      hasIntersection(ctx, eB, e1x, e1y, e2x, e2y) ||
      hasIntersection(ctx, eC, e1x, e1y, e2x, e2y)
    ) {
      return current;
    }

    const twin = ctx.twin[current]!;
    if (twin === -1) {
      break;
    }
    current = nt(ctx.next[twin], "Half-edge has no `next` reference");
    if (current === start) {
      break;
    }
    i += 1;
  }

  current = start;
  while (i < LIMIT) {
    const eA = current;
    const eB = nt(ctx.next[current], "Half-edge has no `next` reference");
    const eC = nt(ctx.next[eB], "Half-edge has no `next` reference");
    if (
      hasIntersection(ctx, eA, e1x, e1y, e2x, e2y) ||
      hasIntersection(ctx, eB, e1x, e1y, e2x, e2y) ||
      hasIntersection(ctx, eC, e1x, e1y, e2x, e2y)
    ) {
      return current;
    }

    const next =
      ctx.twin[
        nt(
          ctx.next[
            nt(ctx.next[current]!, "Half-edge has no `next` reference")
          ]!,
          "Half-edge has no `next` reference",
        )
      ]!;
    if (next === -1) {
      break;
    }
    current = next;
    if (current === start) {
      break;
    }
    i += 1;
  }

  return -1;
}

export function getIntersecting(
  ctx: EdgeContext,
  seed: number,
  e1x: number,
  e1y: number,
  e2x: number,
  e2y: number,
  queue: Queue,
): void {
  const inTriangleEdge = locatePoint(ctx, e1x, e1y, seed);
  if (inTriangleEdge === null) {
    throw new Error("E1NotInAnyTriangle");
  }

  const LIMIT = 20;
  const startEdge = findStartEdgeForIntersect(
    ctx,
    inTriangleEdge,
    e1x,
    e1y,
    e2x,
    e2y,
  );
  if (startEdge === -1) {
    throw new Error("NoSuitableStartEdge");
  }

  let current = startEdge;
  let iterations = 0;
  while (iterations < LIMIT) {
    iterations += 1;
    const first = nt(ctx.next[current], "Half-edge has no `next` reference");
    const second = nt(ctx.next[first], "Half-edge has no `next` reference");

    for (const edge of [first, second]) {
      const ax = ctx.origins[edge * 2]!;
      const ay = ctx.origins[edge * 2 + 1]!;
      const bIdx = nt(ctx.next[edge], "Half-edge has no `next` reference");
      const bx = ctx.origins[bIdx * 2]!;
      const by = ctx.origins[bIdx * 2 + 1]!;
      const intersection = intersect(ax, ay, bx, by, e1x, e1y, e2x, e2y);
      if (intersection !== null) {
        const twin = ctx.twin[edge]!;
        assert(twin !== -1, "intersecting edge should have a twin");
        queue.items[queue.end++] = edge;
        current = twin;
      }
    }
  }
}

function markCrossing(
  ctx: EdgeContext,
  edge: number,
  e1x: number,
  e1y: number,
  e2x: number,
  e2y: number,
): void {
  const LIMIT = 100;
  let current = edge;
  let i = 0;

  while (i < LIMIT) {
    i += 1;
    const e0 = current;
    const e1Idx = nt(ctx.next[current], "Half-edge has no `next` reference");
    const e2Idx = nt(ctx.next[e1Idx], "Half-edge has no `next` reference");
    for (const candidate of [e0, e1Idx, e2Idx]) {
      const ax = ctx.origins[candidate * 2]!;
      const ay = ctx.origins[candidate * 2 + 1]!;
      const bIdx = nt(ctx.next[candidate], "Half-edge has no `next` reference");
      const bx = ctx.origins[bIdx * 2]!;
      const by = ctx.origins[bIdx * 2 + 1]!;
      if (
        onSegment(ax, ay, e1x, e1y, e2x, e2y) &&
        onSegment(bx, by, e1x, e1y, e2x, e2y)
      ) {
        ctx.fixed[candidate] = 1;
        const twin = ctx.twin[candidate]!;
        if (twin !== -1) {
          ctx.fixed[twin] = 1;
        }
      }
    }

    const twin = ctx.twin[current]!;
    if (twin === -1) {
      break;
    }
    current = nt(ctx.next[twin], "Half-edge has no `next` reference");
    if (current === edge) {
      break;
    }
  }

  current = edge;
  i = 0;
  while (i < LIMIT) {
    i += 1;
    const e0 = current;
    const e1Idx = nt(ctx.next[current], "Half-edge has no `next` reference");
    const e2Idx = nt(ctx.next[e1Idx], "Half-edge has no `next` reference");
    for (const candidate of [e0, e1Idx, e2Idx]) {
      const ax = ctx.origins[candidate * 2]!;
      const ay = ctx.origins[candidate * 2 + 1]!;
      const bIdx = nt(ctx.next[candidate], "Half-edge has no `next` reference");
      const bx = ctx.origins[bIdx * 2]!;
      const by = ctx.origins[bIdx * 2 + 1]!;
      if (
        onSegment(ax, ay, e1x, e1y, e2x, e2y) &&
        onSegment(bx, by, e1x, e1y, e2x, e2y)
      ) {
        ctx.fixed[candidate] = 1;
        const twin = ctx.twin[candidate]!;
        if (twin !== -1) {
          ctx.fixed[twin] = 1;
        }
      }
    }

    const next =
      ctx.twin[
        nt(
          ctx.next[
            nt(ctx.next[current]!, "Half-edge has no `next` reference")
          ]!,
          "Half-edge has no `next` reference",
        )
      ]!;
    if (next === -1) {
      break;
    }
    current = next;
    if (current === edge) {
      break;
    }
  }
}

// Shared global queue for `enforceEdge` and `getIntersecting`.
const queue = new Queue(new Array<number>(QUEUE_LIMIT), QUEUE_LIMIT);

export function enforceEdge(
  ctx: EdgeContext,
  e1x: number,
  e1y: number,
  e2x: number,
  e2y: number,
): void {
  const anyEdge = ctx.any();
  const p = locatePoint(ctx, e1x, e1y, anyEdge);
  if (p === null) {
    throw new Error("EdgeNotFound");
  }

  const vertex = getVertex(ctx, e1x, e1y, p);
  if (vertex !== -1) {
    const shared = findSharedEdge(ctx, p, e1x, e1y, e2x, e2y);
    if (shared !== -1) {
      ctx.fixed[shared] = 1;
      const twinShared = ctx.twin[shared]!;
      if (twinShared !== -1) {
        ctx.fixed[twinShared] = 1;
      }
      return;
    }
  }

  getIntersecting(ctx, p, e1x, e1y, e2x, e2y, queue);

  while (true) {
    if (queue.begin === queue.end) {
      break;
    }
    const edge = queue.items[queue.begin++]!;

    if (ctx.fixed[edge] === 1) {
      const ax = ctx.origins[edge * 2]!;
      const ay = ctx.origins[edge * 2 + 1]!;
      const bIdx = nt(ctx.next[edge], "Half-edge has no `next` reference");
      const bx = ctx.origins[bIdx * 2]!;
      const by = ctx.origins[bIdx * 2 + 1]!;
      const intersection = intersect(e1x, e1y, e2x, e2y, ax, ay, bx, by);
      assert(intersection !== null, "Expected intersection to exist");
      insertPointInEdge(ctx, intersection!.x, intersection!.y, edge);
      const next = nt(ctx.next[edge], "Half-edge has no `next` reference");
      markCrossing(ctx, next, e1x, e1y, e2x, e2y);
      continue;
    }

    if (!isConvexQuad(ctx, edge)) {
      queue.items[queue.end++] = edge;
      continue;
    }

    flip(ctx, edge);

    const originX = ctx.origins[edge * 2]!;
    const originY = ctx.origins[edge * 2 + 1]!;
    const destIdx = nt(ctx.next[edge], "Half-edge has no `next` reference");
    const destX = ctx.origins[destIdx * 2]!;
    const destY = ctx.origins[destIdx * 2 + 1]!;
    if (
      onSegment(originX, originY, e1x, e1y, e2x, e2y) &&
      onSegment(destX, destY, e1x, e1y, e2x, e2y)
    ) {
      ctx.fixed[edge] = 1;
      const twin = ctx.twin[edge]!;
      if (twin !== -1) {
        ctx.fixed[twin] = 1;
      }
    }

    if (doCross(e1x, e1y, e2x, e2y, originX, originY, destX, destY)) {
      queue.items[queue.end++] = edge;
    }
  }
}

function isBoundaryEdge(ctx: EdgeContext, edge: number): boolean {
  return ctx.twin[edge]! === -1;
}

function ringContains(ring: Ring, edge: number): boolean {
  const first = ring.first;
  if (first === -1) {
    return false;
  }
  let node = first;
  do {
    if (ring.valueOf(node) === edge) {
      return true;
    }
    node = ring.nextOf(node);
  } while (node !== first);
  return false;
}

function destroyEdgeIfInternal(
  ctx: EdgeContext,
  edge: number,
  boundary: Ring,
): void {
  if (!isBoundaryEdge(ctx, edge) && !ringContains(boundary, edge)) {
    ctx.destroy(edge);
  }
}

export function collectBoundary(
  ctx: EdgeContext,
  boundary: Ring,
  px: number,
  py: number,
): void {
  boundary.reset();
  const anyEdge = ctx.any();
  const startTriangle = locatePoint(ctx, px, py, anyEdge);
  if (startTriangle === null) {
    throw new Error("EdgeNotFound");
  }

  const startVertex = getVertex(ctx, px, py, startTriangle);
  if (startVertex === -1) {
    throw new Error("NotVertex");
  }

  let current = startVertex;
  const LIMIT = 128;
  let i = 0;
  let continueCW = false;
  let top = 0;
  const stack = new Array<number>(STACK_LIMIT);

  while (i < LIMIT) {
    const next = nt(ctx.next[current], "Half-edge has no `next` reference");
    boundary.append(next);

    stack[top++] = current;
    stack[top++] = nt(ctx.next[next], "Half-edge has no `next` reference");

    const twin =
      ctx.twin[nt(ctx.next[next]!, "Half-edge has no `next` reference")]!;
    if (twin === -1) {
      boundary.append(nt(ctx.next[next], "Half-edge has no `next` reference"));
      continueCW = true;
      break;
    }

    current = twin;
    if (current === startVertex) {
      break;
    }
    i += 1;
  }

  if (continueCW) {
    if (ctx.twin[startVertex]! === -1) {
      boundary.prepend(startVertex);
    }

    let currentCW = ctx.twin[startVertex]!;
    while (currentCW !== -1) {
      i += 1;
      assert(i < LIMIT, "collectBoundary exceeded iteration cap (cw)");
      const next = nt(
        ctx.next[nt(ctx.next[currentCW], "Half-edge has no `next` reference")],
        "Half-edge has no `next` reference",
      );
      boundary.prepend(next);

      stack[top++] = currentCW;
      stack[top++] = nt(
        ctx.next[currentCW],
        "Half-edge has no `next` reference",
      );

      const nextTwin =
        ctx.twin[
          nt(ctx.next[currentCW]!, "Half-edge has no `next` reference")
        ]!;
      if (nextTwin === -1) {
        boundary.prepend(
          nt(ctx.next[currentCW], "Half-edge has no `next` reference"),
        );
        break;
      }
      currentCW = nextTwin;
    }
  }

  while (top > 0) {
    const edge = stack[--top]!;
    destroyEdgeIfInternal(ctx, edge, boundary);
  }
}

export function removeCollinear(ctx: EdgeContext, boundary: Ring): void {
  let aNode = boundary.first;
  if (aNode === -1) {
    return;
  }
  let bNode = boundary.nextOf(aNode);
  let cNode = boundary.nextOf(bNode);

  while (true) {
    const aEdge = boundary.valueOf(aNode);
    const bEdge = boundary.valueOf(bNode);
    const cEdge = boundary.valueOf(cNode);

    const isOnBoundary =
      isBoundaryEdge(ctx, aEdge) && isBoundaryEdge(ctx, bEdge);
    const collinear =
      Math.abs(
        orient2D(
          ctx.origins[aEdge * 2]!,
          ctx.origins[aEdge * 2 + 1]!,
          ctx.origins[bEdge * 2]!,
          ctx.origins[bEdge * 2 + 1]!,
          ctx.origins[cEdge * 2]!,
          ctx.origins[cEdge * 2 + 1]!,
        ),
      ) <= EPS;

    if (isOnBoundary && collinear) {
      ctx.destroy(bEdge);
      ctx.next[aEdge] = cEdge;
      boundary.remove(bNode);
      if (boundary.length() < 3) {
        break;
      }
      bNode = boundary.nextOf(aNode);
      cNode = boundary.nextOf(bNode);
      continue;
    }

    aNode = boundary.nextOf(aNode);
    bNode = boundary.nextOf(aNode);
    cNode = boundary.nextOf(bNode);
    if (aNode === boundary.first) {
      break;
    }
  }
}

function computeIsEar(
  ctx: EdgeContext,
  boundary: Ring,
  aNode: number,
  bNode: number,
  cNode: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): boolean {
  if (orient2D(ax, ay, bx, by, cx, cy) <= 0) {
    return false;
  }
  let other = boundary.first;
  if (other === -1) {
    return true;
  }
  do {
    if (other !== aNode && other !== bNode && other !== cNode) {
      const pEdge = boundary.valueOf(other);
      const px = ctx.origins[pEdge * 2]!;
      const py = ctx.origins[pEdge * 2 + 1]!;
      if (inTriangle(px, py, ax, ay, bx, by, cx, cy)) {
        return false;
      }
    }
    other = boundary.nextOf(other);
  } while (other !== boundary.first);

  return true;
}

export function fillCavity(ctx: EdgeContext, boundary: Ring): void {
  assert(
    boundary.length() >= 3,
    "fillCavity expects at least three boundary edges",
  );
  const stack = new Array<number>(STACK_LIMIT);
  let top = 0;
  let current = boundary.first;

  while (boundary.length() > 3 && current !== -1) {
    const aNode = current;
    const bNode = boundary.nextOf(aNode);
    const cNode = boundary.nextOf(bNode);

    const aEdge = boundary.valueOf(aNode);
    const bEdge = boundary.valueOf(bNode);
    const cEdge = boundary.valueOf(cNode);

    const ax = ctx.origins[aEdge * 2]!;
    const ay = ctx.origins[aEdge * 2 + 1]!;
    const bx = ctx.origins[bEdge * 2]!;
    const by = ctx.origins[bEdge * 2 + 1]!;
    const cx = ctx.origins[cEdge * 2]!;
    const cy = ctx.origins[cEdge * 2 + 1]!;

    const isEar = computeIsEar(
      ctx,
      boundary,
      aNode,
      bNode,
      cNode,
      ax,
      ay,
      bx,
      by,
      cx,
      cy,
    );

    if (isEar) {
      const ca = ctx.create(cx, cy);
      const ac = ctx.create(ax, ay);
      ctx.twin[ca] = ac;
      ctx.twin[ac] = ca;

      ctx.next[aEdge] = bEdge;
      ctx.next[bEdge] = ca;
      ctx.next[ca] = aEdge;

      stack[top++] = aEdge;
      stack[top++] = bEdge;

      current = boundary.insertAfter(bNode, ac);
      boundary.remove(aNode);
      boundary.remove(bNode);
    } else {
      current = boundary.nextOf(current);
    }
  }

  const first = boundary.first;
  if (first !== -1) {
    const second = boundary.nextOf(first);
    const third = boundary.nextOf(second);
    const aEdge = boundary.valueOf(first);
    const bEdge = boundary.valueOf(second);
    const cEdge = boundary.valueOf(third);
    ctx.next[aEdge] = bEdge;
    ctx.next[bEdge] = cEdge;
    ctx.next[cEdge] = aEdge;
  }

  flipEdges(ctx, stack, top);
}

const boundaryRing = new Ring(256);

export function removePoint(ctx: EdgeContext, px: number, py: number): void {
  collectBoundary(ctx, boundaryRing, px, py);
  removeCollinear(ctx, boundaryRing);
  fillCavity(ctx, boundaryRing);
}
