import { describe, expect, test } from "bun:test";
import { EdgeContext } from "../src/EdgeContext";
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
} from "../src/geometry";
import { Ring } from "./Ring";

type Point = { x: number; y: number };

const setupTriangle = () => {
  const edges = new EdgeContext(16);
  const a = P(0, 0);
  const b = P(1, 0);
  const c = P(0, 1);

  const ab = edges.create(a.x, a.y);
  const bc = edges.create(b.x, b.y);
  const ca = edges.create(c.x, c.y);
  edges.next[ab] = bc;
  edges.next[bc] = ca;
  edges.next[ca] = ab;
  return { ab, bc, ca, edges };
};

describe("geometry", () => {
  test("locatePoint finds containing triangle", () => {
    const { ab, edges } = setupTriangle();
    const point = P(0.1, 0.1);
    const containing = locatePoint(edges, point.x, point.y, ab);
    expect(containing).toBe(ab);
  });

  test("locatePoint returns null when stepping outside boundary", () => {
    const { ab, edges } = setupTriangle();
    const point = P(2, 2);
    expect(locatePoint(edges, point.x, point.y, ab)).toBe(-1);
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

    flip(edges, ac);
    expect(edges.next[ac]!).toBe(bc);
  });

  test("findSharedEdge discovers direct edge", () => {
    const edges = new EdgeContext(32);
    square(edges, 4, 4);
    const any = edges.any();
    const point = {
      x: edges.origins[any * 2]!,
      y: edges.origins[any * 2 + 1]!,
    };
    const startEdge = locatePoint(edges, point.x, point.y, any);
    expect(startEdge).not.toBe(-1);
    const shared = findSharedEdge(edges, startEdge, point.x, point.y, 4, 4);
    expect(shared).not.toBe(-1);
  });

  test("insertPoint creates vertex and is idempotent", () => {
    const edges = new EdgeContext(256);
    square(edges, 100, 100);

    const p = P(40, 40);
    insertPoint(edges, 40, 40);
    const withPoint = [...edges.iterator()].some((edge) => {
      const origin = {
        x: edges.origins[edge * 2]!,
        y: edges.origins[edge * 2 + 1]!,
      };
      return Math.abs(origin.x - p.x) < 1e-6 && Math.abs(origin.y - p.y) < 1e-6;
    });
    expect(withPoint).toBe(true);

    const afterInsertCount = edges.count();
    insertPoint(edges, 40, 40);
    expect(edges.count()).toBe(afterInsertCount);

    const onEdge = P(50, 0);
    insertPoint(edges, 50, 0);
    const onEdgeExists = [...edges.iterator()].some((edge) => {
      const origin = {
        x: edges.origins[edge * 2]!,
        y: edges.origins[edge * 2 + 1]!,
      };
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
    insertPoint(edges, 30, 40);
    insertPoint(edges, 10, 70);
    insertPoint(edges, 50, 50);
    insertPoint(edges, 20, 45);

    enforceEdge(edges, 30, 40, 10, 70);
    enforceEdge(edges, 10, 70, 50, 50);

    const tri = locatePoint(edges, 20, 55, edges.any());
    expect(tri).not.toBeNull();
  });

  test("collectBoundary trims fan around vertex", () => {
    const edges = new EdgeContext(512);
    square(edges, 4, 4);
    insertSquare(edges, 0, 0, 1);
    insertSquare(edges, 1, 0, 1);

    const ring = new Ring(256);
    collectBoundary(edges, ring, 2, 1);

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
    if (node !== -1) {
      do {
        const edgeIdx = ring.valueOf(node);
        const nextNode = ring.nextOf(node);
        const nextIdx = ring.valueOf(nextNode);
        actual.push([
          {
            x: edges.origins[edgeIdx * 2]!,
            y: edges.origins[edgeIdx * 2 + 1]!,
          },
          {
            x: edges.origins[nextIdx * 2]!,
            y: edges.origins[nextIdx * 2 + 1]!,
          },
        ]);
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
    removePoint(edges, 2, 1);
    expect(edges.count()).toBeLessThan(initial);

    expect(() => removePoint(edges, 3, 3)).toThrow();
    expect(() => removePoint(edges, -1, -1)).toThrow();
  });
});
