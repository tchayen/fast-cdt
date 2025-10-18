import { describe, expect, test } from "bun:test";
import { EdgeContext } from "./EdgeContext";
import { P } from "./utils";
import { isConvexQuad, isDelaunay, getVertex } from "./edges";
import { pointsEqual } from "./checks";

function isEdgeEqual(
  ctx: EdgeContext,
  edge: number,
  e1x: number,
  e1y: number,
  e2x: number,
  e2y: number,
): boolean {
  const aIdx = edge;
  const bIdx = ctx.next[edge]!;
  const ax = ctx.origins[aIdx * 2]!;
  const ay = ctx.origins[aIdx * 2 + 1]!;
  const bx = ctx.origins[bIdx * 2]!;
  const by = ctx.origins[bIdx * 2 + 1]!;
  return (
    (pointsEqual(ax, ay, e1x, e1y) && pointsEqual(bx, by, e2x, e2y)) ||
    (pointsEqual(ax, ay, e2x, e2y) && pointsEqual(bx, by, e1x, e1y))
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
    edges.next[ab] = bc;
    edges.next[bc] = ca;
    edges.next[ca] = ab;

    const cd = edges.create(c.x, c.y);
    const da = edges.create(d.x, d.y);
    const ac = edges.create(a.x, a.y);
    edges.next[cd] = da;
    edges.next[da] = ac;
    edges.next[ac] = cd;

    edges.twin[ac] = ca;
    edges.twin[ca] = ac;

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
    edges.next[ab] = bc;
    edges.next[bc] = ca;
    edges.next[ca] = ab;

    const ac = edges.create(a.x, a.y);
    const cd = edges.create(c.x, c.y);
    const da = edges.create(d.x, d.y);
    edges.next[ac] = cd;
    edges.next[cd] = da;
    edges.next[da] = ac;

    edges.twin[ac] = ca;
    edges.twin[ca] = ac;

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
    edges.next[ab] = bc;
    edges.next[bc] = ca;
    edges.next[ca] = ab;

    expect(getVertex(edges, a.x, a.y, ab)).toBe(ab);
    expect(getVertex(edges, b.x, b.y, ab)).toBe(bc);
    expect(getVertex(edges, c.x, c.y, ab)).toBe(ca);
    const p = P(2, 2);
    expect(() => getVertex(edges, p.x, p.y, ab)).toThrow("Vertex not found");
  });

  test("isEdgeEqual", () => {
    const edges = new EdgeContext(8);
    const a = P(0, 0);
    const b = P(1, 0);
    const c = P(0, 1);

    const ab = edges.create(a.x, a.y);
    const bc = edges.create(b.x, b.y);
    const ca = edges.create(c.x, c.y);
    edges.next[ab] = bc;
    edges.next[bc] = ca;
    edges.next[ca] = ab;

    expect(isEdgeEqual(edges, ab, a.x, a.y, b.x, b.y)).toBe(true);
    expect(isEdgeEqual(edges, ab, b.x, b.y, a.x, a.y)).toBe(true);
    expect(isEdgeEqual(edges, ab, a.x, a.y, c.x, c.y)).toBe(false);
  });
});
