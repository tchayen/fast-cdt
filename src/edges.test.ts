import { describe, expect, test } from "bun:test";
import { EdgeContext, Point, HalfEdge } from "./EdgeContext";
import { P } from "./utils";
import { isConvexQuad, isDelaunay, getVertex } from "./edges";
import { pointsEqual } from "./checks";

function isEdgeEqual(
  ctx: EdgeContext,
  edge: HalfEdge,
  e1: Point,
  e2: Point,
): boolean {
  const a = edge.origin;
  const b = edge.next!.origin;
  return (
    (pointsEqual(a, e1) && pointsEqual(b, e2)) ||
    (pointsEqual(a, e2) && pointsEqual(b, e1))
  );
}

describe("edges helpers", () => {
  test("isConvexQuad", () => {
    const edges = new EdgeContext(16);
    const a = P(0, 0);
    const b = P(1, 0);
    const c = P(1, 1);
    const d = P(0, 1);

    const ab = edges.create(a.x, a.y);
    const bc = edges.create(b.x, b.y);
    const ca = edges.create(c.x, c.y);
    ab.next = bc;
    bc.next = ca;
    ca.next = ab;

    const cd = edges.create(c.x, c.y);
    const da = edges.create(d.x, d.y);
    const ac = edges.create(a.x, a.y);
    cd.next = da;
    da.next = ac;
    ac.next = cd;

    ac.twin = ca;
    ca.twin = ac;

    expect(isConvexQuad(edges, ac)).toBe(true);
  });

  test("isDelaunay", () => {
    const edges = new EdgeContext(16);
    const a = P(0, 0);
    const b = P(40, 40);
    const c = P(0, 100);
    const d = P(60, 80);

    const ab = edges.create(a.x, a.y);
    const bc = edges.create(b.x, b.y);
    const ca = edges.create(c.x, c.y);
    ab.next = bc;
    bc.next = ca;
    ca.next = ab;

    const ac = edges.create(a.x, a.y);
    const cd = edges.create(c.x, c.y);
    const da = edges.create(d.x, d.y);
    ac.next = cd;
    cd.next = da;
    da.next = ac;

    ac.twin = ca;
    ca.twin = ac;

    expect(isDelaunay(edges, ac)).toBe(true);
    expect(isDelaunay(edges, ca)).toBe(true);
  });

  test("getVertex", () => {
    const edges = new EdgeContext(8);
    const a = P(0, 0);
    const b = P(1, 0);
    const c = P(0, 1);

    const ab = edges.create(a.x, a.y);
    const bc = edges.create(b.x, b.y);
    const ca = edges.create(c.x, c.y);
    ab.next = bc;
    bc.next = ca;
    ca.next = ab;

    expect(getVertex(edges, a, ab)).toBe(ab);
    expect(getVertex(edges, b, ab)).toBe(bc);
    expect(getVertex(edges, c, ab)).toBe(ca);
    const p = P(2, 2);
    expect(() => getVertex(edges, p, ab)).toThrow("Vertex not found");
  });

  test("isEdgeEqual", () => {
    const edges = new EdgeContext(8);
    const a = P(0, 0);
    const b = P(1, 0);
    const c = P(0, 1);

    const ab = edges.create(a.x, a.y);
    const bc = edges.create(b.x, b.y);
    const ca = edges.create(c.x, c.y);
    ab.next = bc;
    bc.next = ca;
    ca.next = ab;

    expect(isEdgeEqual(edges, ab, a, b)).toBe(true);
    expect(isEdgeEqual(edges, ab, b, a)).toBe(true);
    expect(isEdgeEqual(edges, ab, a, c)).toBe(false);
  });
});
