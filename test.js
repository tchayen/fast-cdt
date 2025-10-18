import { EdgeContext, playground } from "./dist/index.js";
const edges = new EdgeContext(3200);

const times = [];
const iterations = 10_000;

for (let i = 0; i < 1000; i++) {
  playground(edges);
  edges.reset();
}

for (let i = 0; i < iterations; i++) {
  const start = performance.now();
  playground(edges);
  const end = performance.now();
  times.push(end - start);
  edges.reset();
}

times.sort((a, b) => a - b);
const sum = times.reduce((acc, t) => acc + t, 0);
const avg = sum / iterations;
const p5 = times[Math.floor(iterations * 0.05)];
const p50 = times[Math.floor(iterations * 0.5)];
const p95 = times[Math.floor(iterations * 0.95)];

console.log(`\nBenchmark Results (${iterations} iterations):`);
console.log(`Average:  ${avg.toFixed(3)}ms`);
console.log(`p50:      ${p50.toFixed(3)}ms`);
console.log(`p5:       ${p5.toFixed(3)}ms`);
console.log(`p95:      ${p95.toFixed(3)}ms`);
console.log(`Total:    ${sum.toFixed(2)}ms`);
console.log(`Ops/sec:  ${(1000 / avg).toFixed(2)}`);
console.log(`Final edge count: ${edges.count()}`);
