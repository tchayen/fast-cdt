import { describe, expect, test } from "bun:test";
import { selfIntersecting, tinySquare } from "./fixtures";
import { EdgeContext } from "./EdgeContext";
import { hasConstraintAlongLine } from "./testHelpers";

describe("fixtures", () => {
  test("selfIntersecting creates square constraint edges", () => {
    const edges = new EdgeContext(1024);
    selfIntersecting(edges);
    expect(edges.count()).toBe(72);

    expect(hasConstraintAlongLine(edges, 30, 40, 10, 70)).toBe(true);
    expect(hasConstraintAlongLine(edges, 10, 70, 50, 50)).toBe(true);
    expect(hasConstraintAlongLine(edges, 50, 50, 20, 45)).toBe(true);

    expect(hasConstraintAlongLine(edges, 20, 50, 50, 50)).toBe(true);
    expect(hasConstraintAlongLine(edges, 50, 50, 50, 80)).toBe(true);
    expect(hasConstraintAlongLine(edges, 50, 80, 20, 80)).toBe(true);
    expect(hasConstraintAlongLine(edges, 20, 80, 20, 50)).toBe(true);
  });

  test("tinySquare creates correct structure", () => {
    const edges = new EdgeContext(512);
    tinySquare(edges);

    expect(hasConstraintAlongLine(edges, 0, 0, 1, 0)).toBe(true);
    expect(hasConstraintAlongLine(edges, 1, 0, 1, 1)).toBe(true);

    expect(hasConstraintAlongLine(edges, 1, 0, 2, 0)).toBe(true);
    expect(hasConstraintAlongLine(edges, 2, 0, 2, 1)).toBe(true);
    expect(hasConstraintAlongLine(edges, 2, 1, 1, 1)).toBe(true);
    expect(hasConstraintAlongLine(edges, 1, 1, 1, 0)).toBe(true);
  });
});
