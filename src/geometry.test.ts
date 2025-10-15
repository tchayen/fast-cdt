import { describe, expect, test } from "vitest";
import { EdgeContext } from "../src/EdgeContext";
import { insertSquare, P } from "./utils";
import {
  locatePoint,
  square,
  flip,
  findSharedEdge,
  insertPoint,
  GeometryQueue,
  getIntersecting,
  enforceEdge,
  collectBoundary,
  removePoint,
  GeometryRing,
} from "../src/geometry";
import { pointsEqual } from "./checks";
import { getVertex } from "./edges";

type Point = { x: number; y: number };

const setupTriangle = () => {
  const edges = new EdgeContext(16);
  const a = P(0, 0);
  const b = P(1, 0);
  const c = P(0, 1);

  const ab = edges.create(a.x, a.y);
  const bc = edges.create(b.x, b.y);
  const ca = edges.create(c.x, c.y);
  edges.setNext(ab, bc);
  edges.setNext(bc, ca);
  edges.setNext(ca, ab);
  return { ab, bc, ca, edges };
};

describe("geometry basics", () => {
  test("locatePoint finds containing triangle", () => {
    const { ab, edges } = setupTriangle();
    const point = P(0.1, 0.1);
    const containing = locatePoint(edges, point.x, point.y, ab);
    expect(containing).toBe(ab);
  });

  test("locatePoint returns null when stepping outside boundary", () => {
    const { ab, edges } = setupTriangle();
    const point = P(2, 2);
    expect(locatePoint(edges, point.x, point.y, ab)).toBeNull();
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
    edges.setNext(ab, bc);
    edges.setNext(bc, ca);
    edges.setNext(ca, ab);

    const ac = edges.create(a.x, a.y);
    const cd = edges.create(c.x, c.y);
    const da = edges.create(d.x, d.y);
    edges.setNext(ac, cd);
    edges.setNext(cd, da);
    edges.setNext(da, ac);

    edges.setTwin(ac, ca);
    edges.setTwin(ca, ac);

    flip(edges, ac);
    expect(edges.getNext(ac)).toBe(bc);
  });

  test("findSharedEdge discovers direct edge", () => {
    const edges = new EdgeContext(32);
    square(edges, 4, 4);
    const any = edges.any();
    const point = edges.origin(any);
    const startEdge = locatePoint(edges, point.x, point.y, any);
    expect(startEdge).not.toBeNull();
    const shared = findSharedEdge(edges, startEdge!, point.x, point.y, 4, 4);
    expect(shared).not.toBe(-1);
  });

  test("insertPoint creates vertex and is idempotent", () => {
    const edges = new EdgeContext(256);
    square(edges, 100, 100);

    const p = P(40, 40);
    insertPoint(edges, 40, 40);
    const withPoint = [...edges.iterator()].some((edge) => {
      const origin = edges.origin(edge);
      return Math.abs(origin.x - p.x) < 1e-6 && Math.abs(origin.y - p.y) < 1e-6;
    });
    expect(withPoint).toBe(true);

    const afterInsertCount = edges.count();
    insertPoint(edges, 40, 40);
    expect(edges.count()).toBe(afterInsertCount);

    const onEdge = P(50, 0);
    insertPoint(edges, 50, 0);
    const onEdgeExists = [...edges.iterator()].some((edge) => {
      const origin = edges.origin(edge);
      return (
        Math.abs(origin.x - onEdge.x) < 1e-6 &&
        Math.abs(origin.y - onEdge.y) < 1e-6
      );
    });
    expect(onEdgeExists).toBe(true);
    expect(edges.count()).toBeGreaterThan(afterInsertCount);
  });
});

describe("geometry advanced functions", () => {
  test("getIntersecting finds edges crossing segment", () => {
    const edges = new EdgeContext(512);

    square(edges, 100, 100);
    insertPoint(edges, 40, 40);
    insertPoint(edges, 60, 80);

    const queue = new GeometryQueue();
    const triangle = locatePoint(edges, 100, 100, edges.any());
    expect(triangle).not.toBeNull();
    const vertexEdge = getVertex(edges, 100, 100, triangle!);
    expect(vertexEdge).not.toBe(-1);
    getIntersecting(edges, queue, vertexEdge, 100, 100, 0, 0);

    const collected: number[] = [];
    for (let value = queue.pop(); value !== null; value = queue.pop()) {
      collected.push(value);
    }
    expect(collected.length).toBeGreaterThan(0);

    edges.reset();
    square(edges, 100, 100);
    insertPoint(edges, 30, 40);
    insertPoint(edges, 10, 70);
    insertPoint(edges, 50, 50);
    insertPoint(edges, 20, 45);
    enforceEdge(edges, 30, 40, 10, 70);
    enforceEdge(edges, 10, 70, 50, 50);

    const queue2 = new GeometryQueue();
    const e1 = P(50, 50);
    const e2 = P(20, 45);
    const tri = locatePoint(edges, e1.x, e1.y, edges.any());
    expect(tri).not.toBeNull();
    const start = getVertex(edges, e1.x, e1.y, tri!);
    expect(start).not.toBe(-1);
    getIntersecting(edges, queue2, start, e1.x, e1.y, e2.x, e2.y);

    const popped = queue2.pop();
    expect(popped).not.toBeNull();
    const origin = edges.origin(popped!);
    const dest = edges.origin(edges.getNext(popped!));
    expect(pointsEqual(origin.x, origin.y, 10, 70)).toBe(true);
    expect(pointsEqual(dest.x, dest.y, 30, 40)).toBe(true);
    expect(queue2.pop()).toBeNull();
  });

  test("collectBoundary trims fan around vertex", () => {
    const edges = new EdgeContext(512);
    square(edges, 4, 4);
    insertSquare(edges, 0, 0, 1);
    insertSquare(edges, 1, 0, 1);

    const ring = new GeometryRing();
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
        actual.push([edges.origin(edgeIdx), edges.origin(nextIdx)]);
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
