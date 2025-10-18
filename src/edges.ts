import { orient2D, inCircle, pointsEqual } from "./checks";
import { EdgeContext, HalfEdge, Point } from "./EdgeContext";

export function isConvexQuad(ctx: EdgeContext, edge: HalfEdge): boolean {
  const twin = edge.twin;
  if (twin === null) {
    throw new Error("isConvexQuad requires an internal edge");
  }

  const a = edge.origin;
  const c = edge.next!.origin;
  const d = edge.next!.next!.origin;
  const b = twin.next!.next!.origin;

  return (
    orient2D(a, b, c) > 0 &&
    orient2D(b, c, d) > 0 &&
    orient2D(c, d, a) > 0 &&
    orient2D(d, a, b) > 0
  );
}

export function isDelaunay(ctx: EdgeContext, edge: HalfEdge): boolean {
  const twin = edge.twin;
  if (twin === null) {
    throw new Error("isDelaunay requires a twin edge");
  }

  const t1 = edge.origin;
  const t2 = edge.next!.origin;
  const t3 = edge.next!.next!.origin;
  const d = twin.next!.next!.origin;

  return inCircle(d, t1, t2, t3) < 0;
}

export function getVertex(
  ctx: EdgeContext,
  p: Point,
  edge: HalfEdge,
): HalfEdge | null {
  if (pointsEqual(edge.origin, p)) {
    return edge;
  }
  const bEdge = edge.next;
  if (bEdge === null) {
    return null;
  }
  if (pointsEqual(bEdge.origin, p)) {
    return bEdge;
  }
  const cEdge = bEdge.next;
  if (cEdge === null) {
    return null;
  }
  if (pointsEqual(cEdge.origin, p)) {
    return cEdge;
  }
  throw new Error("Vertex not found");
}
