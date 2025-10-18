import {
  orient2D,
  inTriangle,
  doCross,
  intersect,
  onSegment,
  pointsEqual,
  EPS,
} from "./checks";
import { EdgeContext, HalfEdge, Point } from "./EdgeContext";
import { Ring, RingNode } from "./Ring";
import { isConvexQuad, isDelaunay, getVertex } from "./edges";

const SAFETY_LIMIT = 10_000;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

class Queue<T> {
  private items: T[] = [];

  enqueue(item: T): void {
    this.items.push(item);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  clear(): void {
    this.items = [];
  }
}

export function locatePoint(
  ctx: EdgeContext,
  p: Point,
  start: HalfEdge,
): HalfEdge | null {
  let current = start;
  let i = 0;

  while (i < SAFETY_LIMIT) {
    i += 1;

    const a = current.origin;
    const bEdge = current.next;
    if (bEdge === null) {
      throw new Error("Half-edge has no `next` reference");
    }
    const b = bEdge.origin;

    const cEdge = bEdge.next;
    if (cEdge === null) {
      throw new Error("Half-edge has no `next` reference");
    }
    const c = cEdge.origin;

    if (inTriangle(p, a, b, c)) {
      return current;
    }

    let nextEdge: HalfEdge | null = null;

    const orientB = orient2D(b, c, p);
    if (orientB < 0) {
      const twin = bEdge.twin;
      if (twin === null) {
        return null;
      }
      nextEdge = twin;
    } else {
      const orientC = orient2D(c, a, p);
      if (orientC < 0) {
        const twin = cEdge.twin;
        if (twin === null) {
          return null;
        }
        nextEdge = twin;
      }
    }

    if (nextEdge === null) {
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
  ab.next = bc;
  bc.next = ca;
  ca.next = ab;

  const cd = ctx.create(width, height);
  const da = ctx.create(0, height);
  const ac = ctx.create(0, 0);
  cd.next = da;
  da.next = ac;
  ac.next = cd;

  ac.twin = ca;
  ca.twin = ac;
}

export function flip(ctx: EdgeContext, edge: HalfEdge): void {
  const twin = edge.twin;
  assert(twin !== null && !edge.fixed && !twin.fixed, "cannot flip fixed edge");
  assert(isConvexQuad(ctx, edge), "flip requires convex quad");

  const ac = edge;
  const ca = twin!;
  const ab = ca.next!;
  const bc = ab.next!;
  const cd = ac.next!;
  const da = cd.next!;

  ctx.setOrigin(ac, da.origin.x, da.origin.y);
  ctx.setOrigin(ca, bc.origin.x, bc.origin.y);

  ac.next = bc;
  cd.next = ac;
  bc.next = cd;

  ca.next = da;
  ab.next = ca;
  da.next = ab;
}

function flipEdges(ctx: EdgeContext, stack: HalfEdge[]): void {
  while (stack.length > 0) {
    const edge = stack.pop()!;
    const twin = edge.twin;
    if (twin === null) {
      continue;
    }
    if (edge.fixed || twin.fixed) {
      continue;
    }
    if (isDelaunay(ctx, edge)) {
      continue;
    }

    const fNext = twin.next!;
    const fNextNext = fNext.next!;
    stack.push(fNext);
    stack.push(fNextNext);
    flip(ctx, edge);
  }
}

export function findSharedEdge(
  ctx: EdgeContext,
  edge: HalfEdge,
  e1: Point,
  e2: Point,
): HalfEdge | null {
  const start = getVertex(ctx, e1, edge);
  if (start === null) {
    return null;
  }

  let current = start;
  const SEARCH_LIMIT = 128;
  let i = 0;

  while (i < SEARCH_LIMIT) {
    i += 1;
    const a = current.origin;
    const bEdge = current.next!;
    const b = bEdge.origin;
    if (pointsEqual(a, e1) && pointsEqual(b, e2)) {
      return current;
    }
    const twin = current.twin;
    if (twin === null) {
      break;
    }
    current = twin.next!;
    if (current === start) {
      break;
    }
  }

  current = start;
  i = 0;
  while (i < SEARCH_LIMIT) {
    i += 1;
    const a = current.origin;
    const bEdge = current.next!;
    const b = bEdge.origin;
    if (pointsEqual(a, e1) && pointsEqual(b, e2)) {
      return current;
    }
    const next = current.next!.next!.twin;
    if (next === null) {
      break;
    }
    current = next;
    if (current === start) {
      break;
    }
  }
  return null;
}

function insertPointInEdge(ctx: EdgeContext, p: Point, edge: HalfEdge): void {
  const ac = edge;
  const cd = ac.next!;
  const da = cd.next!;

  const pd = ctx.create(p.x, p.y);
  const dp = ctx.create(da.origin.x, da.origin.y);
  pd.twin = dp;
  dp.twin = pd;

  ac.next = pd;
  pd.next = da;

  const pc = ctx.create(p.x, p.y, undefined, undefined, ac.fixed);
  pc.next = cd;
  dp.next = pc;
  cd.next = dp;

  const stack: HalfEdge[] = [];
  stack.push(cd);
  stack.push(da);

  const pa = ac.twin;
  if (pa !== null) {
    ctx.setOrigin(pa, p.x, p.y);
    const ab = pa.next!;

    const cp = ctx.create(
      cd.origin.x,
      cd.origin.y,
      undefined,
      undefined,
      pa.fixed,
    );
    pc.twin = cp;
    cp.twin = pc;

    const bc = ab.next!;
    const pb = ctx.create(p.x, p.y);
    const bp = ctx.create(bc.origin.x, bc.origin.y);
    pb.twin = bp;
    bp.twin = pb;

    ab.next = bp;
    bp.next = pa;

    cp.next = pb;
    pb.next = bc;
    bc.next = cp;

    stack.push(ab);
    stack.push(bc);
  }

  flipEdges(ctx, stack);
}

function insertPointInFace(ctx: EdgeContext, p: Point, edge: HalfEdge): void {
  const ab = edge;
  const bc = ab.next!;
  const ca = bc.next!;

  const a = ab.origin;
  const b = bc.origin;
  const c = ca.origin;

  const pa = ctx.create(p.x, p.y);
  const ap = ctx.create(a.x, a.y);
  pa.twin = ap;
  ap.twin = pa;
  pa.next = ab;

  const pb = ctx.create(p.x, p.y);
  const bp = ctx.create(b.x, b.y);
  pb.twin = bp;
  bp.twin = pb;
  pb.next = bc;

  const pc = ctx.create(p.x, p.y);
  const cp = ctx.create(c.x, c.y);
  pc.twin = cp;
  cp.twin = pc;
  pc.next = ca;

  ap.next = pc;
  bp.next = pa;
  cp.next = pb;

  ab.next = bp;
  bc.next = cp;
  ca.next = ap;

  const stack: HalfEdge[] = [];
  stack.push(ab);
  stack.push(bc);
  stack.push(ca);
  flipEdges(ctx, stack);
}

export function insertPoint(ctx: EdgeContext, p: Point): void {
  const start = ctx.any();
  const t = locatePoint(ctx, p, start);
  assert(t !== null, "Edge not found");

  const tNext = t!.next!;
  const tNextNext = tNext.next!;
  assert(tNextNext.next === t, "triangle connectivity broken");

  const tOrigin = t!.origin;
  const tNextOrigin = tNext.origin;
  const tNextNextOrigin = tNextNext.origin;

  if (
    pointsEqual(tOrigin, p) ||
    pointsEqual(tNextOrigin, p) ||
    pointsEqual(tNextNextOrigin, p)
  ) {
    return;
  }

  if (onSegment(p, tOrigin, tNextOrigin)) {
    insertPointInEdge(ctx, p, t!);
  } else if (onSegment(p, tNextOrigin, tNextNextOrigin)) {
    insertPointInEdge(ctx, p, tNext);
  } else if (onSegment(p, tNextNextOrigin, tOrigin)) {
    insertPointInEdge(ctx, p, tNextNext);
  } else {
    insertPointInFace(ctx, p, t!);
  }
}

function hasIntersection(
  _ctx: EdgeContext,
  edge: HalfEdge,
  e1: Point,
  e2: Point,
): boolean {
  const a = edge.origin;
  const b = edge.next!.origin;
  return intersect(a, b, e1, e2) !== null;
}

function findStartEdgeForIntersect(
  ctx: EdgeContext,
  inTriangleEdge: HalfEdge,
  e1: Point,
  e2: Point,
): HalfEdge | null {
  const LIMIT = 32;
  const start = getVertex(ctx, e1, inTriangleEdge);
  if (start === null) {
    throw new Error("E1 is not a vertex");
  }

  let current = start;
  let i = 0;
  while (i < LIMIT) {
    const eA = current;
    const eB = current.next!;
    const eC = eB.next!;
    if (
      hasIntersection(ctx, eA, e1, e2) ||
      hasIntersection(ctx, eB, e1, e2) ||
      hasIntersection(ctx, eC, e1, e2)
    ) {
      return current;
    }

    const twin = current.twin;
    if (twin === null) {
      break;
    }
    current = twin.next!;
    if (current === start) {
      break;
    }
    i += 1;
  }

  current = start;
  while (i < LIMIT) {
    const eA = current;
    const eB = current.next!;
    const eC = eB.next!;
    if (
      hasIntersection(ctx, eA, e1, e2) ||
      hasIntersection(ctx, eB, e1, e2) ||
      hasIntersection(ctx, eC, e1, e2)
    ) {
      return current;
    }

    const next = current.next!.next!.twin;
    if (next === null) {
      break;
    }
    current = next;
    if (current === start) {
      break;
    }
    i += 1;
  }

  return null;
}

export function getIntersecting(
  ctx: EdgeContext,
  seed: HalfEdge,
  e1: Point,
  e2: Point,
  queue: Queue<HalfEdge>,
): void {
  const inTriangleEdge = locatePoint(ctx, e1, seed);
  if (inTriangleEdge === null) {
    throw new Error("E1 is not in any triangle");
  }

  const LIMIT = 20;
  const startEdge = findStartEdgeForIntersect(ctx, inTriangleEdge, e1, e2);
  if (startEdge === null) {
    throw new Error("NoSuitableStartEdge");
  }

  let current = startEdge;
  let i = 0;
  while (i < LIMIT) {
    i += 1;
    const first = current.next!;
    const second = first.next!;

    for (const edge of [first, second]) {
      const a = edge.origin;
      const b = edge.next!.origin;
      const intersection = intersect(a, b, e1, e2);
      if (intersection !== null) {
        const twin = edge.twin;
        assert(twin !== null, "intersecting edge should have a twin");
        queue.enqueue(edge);
        current = twin!;
      }
    }
  }
}

function markCrossing(
  _ctx: EdgeContext,
  edge: HalfEdge,
  e1: Point,
  e2: Point,
): void {
  const LIMIT = 100;
  let current = edge;
  let i = 0;

  while (i < LIMIT) {
    i += 1;
    const e0 = current;
    const e1Idx = current.next!;
    const e2Idx = e1Idx.next!;
    for (const candidate of [e0, e1Idx, e2Idx]) {
      const a = candidate.origin;
      const b = candidate.next!.origin;
      if (onSegment(a, e1, e2) && onSegment(b, e1, e2)) {
        candidate.fixed = true;
        const twin = candidate.twin;
        if (twin !== null) {
          twin.fixed = true;
        }
      }
    }

    const twin = current.twin;
    if (twin === null) {
      break;
    }
    current = twin.next!;
    if (current === edge) {
      break;
    }
  }

  current = edge;
  i = 0;
  while (i < LIMIT) {
    i += 1;
    const e0 = current;
    const e1Idx = current.next!;
    const e2Idx = e1Idx.next!;
    for (const candidate of [e0, e1Idx, e2Idx]) {
      const a = candidate.origin;
      const b = candidate.next!.origin;
      if (onSegment(a, e1, e2) && onSegment(b, e1, e2)) {
        candidate.fixed = true;
        const twin = candidate.twin;
        if (twin !== null) {
          twin.fixed = true;
        }
      }
    }

    const next = current.next!.next!.twin;
    if (next === null) {
      break;
    }
    current = next;
    if (current === edge) {
      break;
    }
  }
}

export function enforceEdge(ctx: EdgeContext, e1: Point, e2: Point): void {
  const queue = new Queue<HalfEdge>();

  const anyEdge = ctx.any();
  const p = locatePoint(ctx, e1, anyEdge);
  if (p === null) {
    throw new Error("Edge not found");
  }

  const vertex = getVertex(ctx, e1, p);
  if (vertex !== null) {
    const shared = findSharedEdge(ctx, p, e1, e2);
    if (shared !== null) {
      shared.fixed = true;
      const sharedTwin = shared.twin;
      if (sharedTwin !== null) {
        sharedTwin.fixed = true;
      }
      return;
    }
  }

  getIntersecting(ctx, p, e1, e2, queue);

  let i = 0;
  while (i < SAFETY_LIMIT) {
    i += 1;
    if (queue.isEmpty()) {
      break;
    }
    const edge = queue.dequeue()!;

    if (edge.fixed) {
      const a = edge.origin;
      const b = edge.next!.origin;
      const intersection = intersect(e1, e2, a, b);
      assert(intersection !== null, "Expected intersection to exist");
      insertPointInEdge(ctx, intersection!, edge);
      const next = edge.next!;
      markCrossing(ctx, next, e1, e2);
      continue;
    }

    if (!isConvexQuad(ctx, edge)) {
      queue.enqueue(edge);
      continue;
    }

    flip(ctx, edge);

    const start = edge.origin;
    const end = edge.next!.origin;
    if (onSegment(start, e1, e2) && onSegment(end, e1, e2)) {
      edge.fixed = true;
      const twin = edge.twin;
      if (twin !== null) {
        twin.fixed = true;
      }
    }

    if (doCross(e1, e2, start, end)) {
      queue.enqueue(edge);
    }
  }
}

function isBoundaryEdge(_ctx: EdgeContext, edge: HalfEdge): boolean {
  return edge.twin === null;
}

function ringContains(ring: Ring<HalfEdge>, edge: HalfEdge): boolean {
  const first = ring.first;
  if (first === null) {
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

export function collectBoundary(
  ctx: EdgeContext,
  boundary: Ring<HalfEdge>,
  p: Point,
): void {
  boundary.reset();
  const anyEdge = ctx.any();
  const startTriangle = locatePoint(ctx, p, anyEdge);
  if (startTriangle === null) {
    throw new Error("Edge not found");
  }

  const startVertex = getVertex(ctx, p, startTriangle);
  if (startVertex === null) {
    throw new Error("Not a vertex");
  }

  let current = startVertex;
  const LIMIT = 128;
  let i = 0;
  let continueCW = false;
  const stack: HalfEdge[] = [];

  while (i < LIMIT) {
    const next = current.next!;
    boundary.append(next);

    stack.push(current);
    stack.push(next.next!);

    const twin = next.next!.twin;
    if (twin === null) {
      boundary.append(next.next!);
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
    if (startVertex.twin === null) {
      boundary.prepend(startVertex);
    }

    let currentCW = startVertex.twin;
    while (currentCW !== null) {
      i += 1;
      assert(i < LIMIT, "collectBoundary exceeded iteration cap (cw)");
      const next = currentCW.next!.next!;
      boundary.prepend(next);

      stack.push(currentCW);
      stack.push(currentCW.next!);

      const nextTwin = currentCW.next!.twin;
      if (nextTwin === null) {
        boundary.prepend(currentCW.next!);
        break;
      }
      currentCW = nextTwin;
    }
  }

  while (stack.length > 0) {
    const edge = stack.pop()!;
    if (!isBoundaryEdge(ctx, edge) && !ringContains(boundary, edge)) {
      ctx.destroy(edge);
    }
  }
}

export function removeCollinear(
  ctx: EdgeContext,
  boundary: Ring<HalfEdge>,
): void {
  let aNode = boundary.first;
  if (aNode === null) {
    return;
  }
  let bNode = boundary.nextOf(aNode);
  let cNode = boundary.nextOf(bNode);

  let i = 0;
  while (i < SAFETY_LIMIT) {
    i += 1;
    const aEdge = boundary.valueOf(aNode);
    const bEdge = boundary.valueOf(bNode);
    const cEdge = boundary.valueOf(cNode);

    const isOnBoundary =
      isBoundaryEdge(ctx, aEdge) && isBoundaryEdge(ctx, bEdge);
    const collinear =
      Math.abs(orient2D(aEdge.origin, bEdge.origin, cEdge.origin)) <= EPS;

    if (isOnBoundary && collinear) {
      ctx.destroy(bEdge);
      aEdge.next = cEdge;
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
  _ctx: EdgeContext,
  boundary: Ring<HalfEdge>,
  aNode: RingNode<HalfEdge>,
  bNode: RingNode<HalfEdge>,
  cNode: RingNode<HalfEdge>,
  a: Point,
  b: Point,
  c: Point,
): boolean {
  if (orient2D(a, b, c) <= 0) {
    return false;
  }
  let other = boundary.first;
  if (other === null) {
    return true;
  }
  do {
    if (other !== aNode && other !== bNode && other !== cNode) {
      const pEdge = boundary.valueOf(other);
      const p = pEdge.origin;
      if (inTriangle(p, a, b, c)) {
        return false;
      }
    }
    other = boundary.nextOf(other);
  } while (other !== boundary.first);

  return true;
}

export function fillCavity(ctx: EdgeContext, boundary: Ring<HalfEdge>): void {
  assert(
    boundary.length() >= 3,
    "fillCavity expects at least three boundary edges",
  );
  const stack: HalfEdge[] = [];
  let current = boundary.first;

  while (boundary.length() > 3 && current !== null) {
    const aNode = current;
    const bNode = boundary.nextOf(aNode);
    const cNode = boundary.nextOf(bNode);

    const aEdge = boundary.valueOf(aNode);
    const bEdge = boundary.valueOf(bNode);
    const cEdge = boundary.valueOf(cNode);

    const a = aEdge.origin;
    const b = bEdge.origin;
    const c = cEdge.origin;

    const isEar = computeIsEar(ctx, boundary, aNode, bNode, cNode, a, b, c);

    if (isEar) {
      const ca = ctx.create(c.x, c.y);
      const ac = ctx.create(a.x, a.y);
      ca.twin = ac;
      ac.twin = ca;

      aEdge.next = bEdge;
      bEdge.next = ca;
      ca.next = aEdge;

      stack.push(aEdge);
      stack.push(bEdge);

      current = boundary.insertAfter(bNode, ac);
      boundary.remove(aNode);
      boundary.remove(bNode);
    } else {
      current = boundary.nextOf(current);
    }
  }

  const first = boundary.first;
  if (first !== null) {
    const second = boundary.nextOf(first);
    const third = boundary.nextOf(second);
    const aEdge = boundary.valueOf(first);
    const bEdge = boundary.valueOf(second);
    const cEdge = boundary.valueOf(third);
    aEdge.next = bEdge;
    bEdge.next = cEdge;
    cEdge.next = aEdge;
  }

  flipEdges(ctx, stack);
}

const boundaryRing = new Ring<HalfEdge>(256);

export function removePoint(ctx: EdgeContext, p: Point): void {
  collectBoundary(ctx, boundaryRing, p);
  removeCollinear(ctx, boundaryRing);
  fillCavity(ctx, boundaryRing);
}
