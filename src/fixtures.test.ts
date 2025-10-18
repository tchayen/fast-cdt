import { describe, expect, test } from "bun:test";
import { selfIntersecting, tinySquare } from "./fixtures";
import { EdgeContext } from "./EdgeContext";
import { hasConstraintAlongLine } from "./testHelpers";
import { P } from "./utils";

describe("fixtures", () => {
  test("selfIntersecting creates square constraint edges", () => {
    const edges = new EdgeContext(1024);
    selfIntersecting(edges);
    expect(edges.count()).toBe(72);

    expect(hasConstraintAlongLine(edges, P(30, 40), P(10, 70))).toBe(true);
    expect(hasConstraintAlongLine(edges, P(10, 70), P(50, 50))).toBe(true);
    expect(hasConstraintAlongLine(edges, P(50, 50), P(20, 45))).toBe(true);

    expect(hasConstraintAlongLine(edges, P(20, 50), P(50, 50))).toBe(true);
    expect(hasConstraintAlongLine(edges, P(50, 50), P(50, 80))).toBe(true);
    expect(hasConstraintAlongLine(edges, P(50, 80), P(20, 80))).toBe(true);
    expect(hasConstraintAlongLine(edges, P(20, 80), P(20, 50))).toBe(true);
  });

  test("tinySquare creates correct structure", () => {
    const edges = new EdgeContext(512);
    tinySquare(edges);

    expect(hasConstraintAlongLine(edges, P(0, 0), P(1, 0))).toBe(true);
    expect(hasConstraintAlongLine(edges, P(1, 0), P(1, 1))).toBe(true);

    expect(hasConstraintAlongLine(edges, P(1, 0), P(2, 0))).toBe(true);
    expect(hasConstraintAlongLine(edges, P(2, 0), P(2, 1))).toBe(true);
    expect(hasConstraintAlongLine(edges, P(2, 1), P(1, 1))).toBe(true);
    expect(hasConstraintAlongLine(edges, P(1, 1), P(1, 0))).toBe(true);
  });
});
