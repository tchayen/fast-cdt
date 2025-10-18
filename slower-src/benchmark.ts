/* eslint no-console: 0 */

import { EdgeContext } from "./EdgeContext";
// eslint-disable-next-line import-x/no-namespace
import * as fixtures from "./fixtures";

export function runBenchmark(
  fixture: keyof typeof fixtures,
  iterations: number,
  capacity: number,
): void {
  const edges = new EdgeContext(capacity);
  const times: number[] = [];
  const fn = fixtures[fixture];

  console.log(`Running '${fixture}' ${iterations} times...`);

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn(edges);
    const end = performance.now();
    times.push(end - start);
    edges.reset();
  }

  // Sort times for percentile calculation.
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

// runBenchmark("benchmarkGrid", 64_000);
runBenchmark("playground", 30_000, 3200);
