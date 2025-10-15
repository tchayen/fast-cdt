import { EdgeContext } from "./EdgeContext";
import { square } from "./geometry";
import { insertOctagon, insertPolygon, insertSquare, P } from "./utils";

function playground(edges: EdgeContext): void {
  edges.reset();
  square(edges, 400, 400);

  insertSquare(edges, 200, 320, 4);
  insertSquare(edges, 208, 320, 4);
  insertSquare(edges, 208, 324, 4);
  insertSquare(edges, 170, 350, 8);
  insertSquare(edges, 180, 354, 8);
  insertSquare(edges, 160, 380, 8);
  insertSquare(edges, 140, 328, 4);

  insertSquare(edges, 360, 290, 8);
  insertSquare(edges, 360, 300, 8);
  insertSquare(edges, 350, 300, 8);

  insertSquare(edges, 50, 27, 16);
  insertSquare(edges, 336, 57, 16);
  insertSquare(edges, 222, 367, 16);

  insertOctagon(edges, 80, 30, 10);
  insertOctagon(edges, 360, 60, 10);
  insertOctagon(edges, 370, 150, 10);
  insertOctagon(edges, 250, 370, 10);

  // River top.
  insertPolygon(edges, [P(272, 0), P(286, 0), P(286, 56), P(272, 55)]);

  // River top second.
  insertPolygon(edges, [
    P(270, 70),
    P(286, 70),
    P(289, 104),
    P(303, 126),
    P(314, 152),
    P(305, 190),
    P(290, 220),
    P(267, 251),
    P(251, 243),
    P(279, 203),
    P(291, 179),
    P(297, 149),
    P(283, 124),
    P(263, 120),
    P(230, 134),
    P(202, 142),
    P(196, 128),
    P(234, 118),
    P(258, 107),
    P(270, 92),
  ]);

  // River middle.
  insertPolygon(edges, [
    P(244, 258),
    P(258, 265),
    P(248, 282),
    P(248, 290),
    P(254, 299),
    P(262, 308),
    P(255, 318),
    P(236, 306),
    P(218, 300),
    P(188, 302),
    P(160, 310),
    P(133, 321),
    P(127, 307),
    P(155, 297),
    P(165, 284),
    P(161, 270),
    P(176, 264),
    P(183, 275),
    P(196, 284),
    P(222, 284),
    P(234, 277),
  ]);

  // Left middle.
  insertPolygon(edges, [
    P(183, 134),
    P(188, 147),
    P(173, 158),
    P(155, 181),
    P(155, 218),
    P(169, 251),
    P(155, 256),
    P(138, 221),
    P(139, 186),
    P(150, 160),
    P(165, 147),
  ]);

  // Right.
  insertPolygon(edges, [
    P(273, 314),
    P(290, 323),
    P(304, 334),
    P(320, 350),
    P(327, 371),
    P(327, 400),
    P(313, 400),
    P(313, 371),
    P(310, 360),
    P(297, 344),
    P(266, 325),
  ]);

  // Left.
  insertPolygon(edges, [
    P(113, 312),
    P(119, 327),
    P(100, 336),
    P(80, 343),
    P(60, 347),
    P(37, 350),
    P(0, 350),
    P(0, 333),
    P(37, 333),
    P(76, 326),
  ]);
}

export function runBenchmark(): void {
  const edges = new EdgeContext(100000);
  const iterations = 1000;
  const times: number[] = [];

  console.log(`Running playground ${iterations} times...`);

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    playground(edges);
    const end = performance.now();
    times.push(end - start);
  }

  // Sort times for percentile calculation
  times.sort((a, b) => a - b);

  const sum = times.reduce((acc, t) => acc + t, 0);
  const avg = sum / iterations;
  const p5 = times[Math.floor(iterations * 0.05)]!;
  const p50 = times[Math.floor(iterations * 0.5)]!;
  const p95 = times[Math.floor(iterations * 0.95)]!;

  console.log(`\nBenchmark Results (${iterations} iterations):`);
  console.log(`Average:  ${avg.toFixed(3)}ms`);
  console.log(`p50:      ${p50.toFixed(3)}ms`);
  console.log(`p5:       ${p5.toFixed(3)}ms`);
  console.log(`p95:      ${p95.toFixed(3)}ms`);
  console.log(`Total:    ${sum.toFixed(2)}ms`);
  console.log(`Ops/sec:  ${(1000 / avg).toFixed(2)}`);
  console.log(`Final edge count: ${edges.count()}`);
}

runBenchmark();
