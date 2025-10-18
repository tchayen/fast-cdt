import { describe, expect, test } from "bun:test";
import { EdgeContext, HalfEdge, Point } from "./EdgeContext";
import { insertSquare, P } from "./utils";
import {
  locatePoint,
  square,
  flip,
  findSharedEdge,
  insertPoint,
  enforceEdge,
  collectBoundary,
  removePoint,
} from "./geometry";
import { Ring } from "./Ring";

const setupTriangle = () => {
  const edges = new EdgeContext(16);
  const a = P(0, 0);
  const b = P(1, 0);
  const c = P(0, 1);

  const ab = edges.create(a.x, a.y);
  const bc = edges.create(b.x, b.y);
  const ca = edges.create(c.x, c.y);
  ab.next = bc;
  bc.next = ca;
  ca.next = ab;
  return { ab, bc, ca, edges };
};

describe("geometry", () => {
  test("locatePoint finds containing triangle", () => {
    const { ab, edges } = setupTriangle();
    const point = P(0.1, 0.1);
    const containing = locatePoint(edges, point, ab);
    expect(containing).toBe(ab);
  });

  test("locatePoint returns null when stepping outside boundary", () => {
    const { ab, edges } = setupTriangle();
    const point = P(2, 2);
    expect(locatePoint(edges, point, ab)).toBe(null);
  });

  test("flip updates connectivity", () => {
    const edges = new EdgeContext(16);
    const a = P(0, 3);
    const b = P(3, 0);
    const c = P(5, 5);
    const d = P(1, 6);

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

    flip(edges, ac);
    expect(ac.next!).toBe(bc);
  });

  test("findSharedEdge discovers direct edge", () => {
    const edges = new EdgeContext(32);
    square(edges, 4, 4);
    const any = edges.any();
    const point = any.origin;
    const startEdge = locatePoint(edges, point, any);
    expect(startEdge).not.toBe(null);
    const shared = findSharedEdge(edges, startEdge!, point, P(4, 4));
    expect(shared).not.toBe(null);
  });

  test("insertPoint creates vertex and is idempotent", () => {
    const edges = new EdgeContext(256);
    square(edges, 100, 100);

    const p = P(40, 40);
    insertPoint(edges, p);
    const withPoint = [...edges.iterator()].some((edge) => {
      const origin = edge.origin;
      return Math.abs(origin.x - p.x) < 1e-6 && Math.abs(origin.y - p.y) < 1e-6;
    });
    expect(withPoint).toBe(true);

    const afterInsertCount = edges.count();
    insertPoint(edges, p);
    expect(edges.count()).toBe(afterInsertCount);

    const onEdge = P(50, 0);
    insertPoint(edges, onEdge);
    const onEdgeExists = [...edges.iterator()].some((edge) => {
      const origin = edge.origin;
      return (
        Math.abs(origin.x - onEdge.x) < 1e-6 &&
        Math.abs(origin.y - onEdge.y) < 1e-6
      );
    });
    expect(onEdgeExists).toBe(true);
    expect(edges.count()).toBeGreaterThan(afterInsertCount);
  });

  test("enforceEdge works correctly", () => {
    const edges = new EdgeContext(512);

    square(edges, 100, 100);
    insertPoint(edges, P(30, 40));
    insertPoint(edges, P(10, 70));
    insertPoint(edges, P(50, 50));
    insertPoint(edges, P(20, 45));

    enforceEdge(edges, P(30, 40), P(10, 70));
    enforceEdge(edges, P(10, 70), P(50, 50));

    const tri = locatePoint(edges, P(20, 55), edges.any());
    expect(tri).not.toBeNull();
  });

  test("collectBoundary trims fan around vertex", () => {
    const edges = new EdgeContext(512);
    square(edges, 4, 4);
    insertSquare(edges, 0, 0, 1);
    insertSquare(edges, 1, 0, 1);

    const ring = new Ring<HalfEdge>(256);
    collectBoundary(edges, ring, P(2, 1));

    expect(edges.count()).toBe(15);

    const expected: Array<[Point, Point]> = [
      [P(0, 4), P(1, 1)],
      [P(4, 4), P(0, 4)],
      [P(4, 0), P(4, 4)],
      [P(2, 0), P(4, 0)],
      [P(1, 0), P(2, 0)],
      [P(1, 1), P(1, 0)],
    ];

    const actual: Array<[Point, Point]> = [];
    let node = ring.first;
    if (node !== null) {
      do {
        const edge = ring.valueOf(node);
        const nextNode = ring.nextOf(node);
        const nextEdge = ring.valueOf(nextNode);
        actual.push([edge.origin, nextEdge.origin]);
        node = nextNode;
      } while (node !== ring.first && actual.length < expected.length);
    }

    expect(actual.length).toBe(expected.length);

    const serialize = (a: Point, b: Point) => `${a.x},${a.y}->${b.x},${b.y}`;
    const actualSet = new Set(actual.map(([a, b]) => serialize(a, b)));
    const expectedSet = new Set(expected.map(([a, b]) => serialize(a, b)));
    expect(actualSet).toStrictEqual(expectedSet);
  });

  test("removePoint removes vertex and fills cavity", () => {
    const edges = new EdgeContext(512);
    square(edges, 4, 4);
    insertSquare(edges, 0, 0, 1);
    insertSquare(edges, 1, 0, 1);

    const initial = edges.count();
    removePoint(edges, P(2, 1));
    expect(edges.count()).toBeLessThan(initial);

    expect(() => removePoint(edges, P(3, 3))).toThrow();
    expect(() => removePoint(edges, P(-1, -1))).toThrow();
  });
});
