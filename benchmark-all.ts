#!/usr/bin/env bun
/* eslint-disable no-console */
import { $ } from "bun";
import { rmSync, existsSync } from "node:fs";

console.log("COMPREHENSIVE BENCHMARK");

console.log("\n📦 Cleaning previous builds...");

if (existsSync("dist")) {
  rmSync("dist", { recursive: true });
}

if (existsSync("dist-fast")) {
  rmSync("dist-fast", { recursive: true });
}

console.log("\n🔨 Building default version (src)...");
await $`bun build index.ts --outdir dist --target node --format esm`;
await $`bunx tsc index.ts --declaration --emitDeclarationOnly --outDir dist --skipLibCheck --target ESNext --downlevelIteration`;
console.log("✅ Default version built to dist/");

const fastIndexContent = `export * from "./fast/geometry";
export * from "./fast/utils";
export * from "./fast/checks";
export * from "./fast/fixtures";
export * from "./fast/EdgeContext";
`;

await Bun.write("index-fast.ts", fastIndexContent);

console.log("\n🔨 Building fast version (fast)...");
await $`bun build index-fast.ts --outfile dist-fast/index.js --target node --format esm`;
await $`bunx tsc index-fast.ts --declaration --emitDeclarationOnly --outDir dist-fast --skipLibCheck --target ESNext --downlevelIteration`;
await $`mv dist-fast/index-fast.d.ts dist-fast/index.d.ts`;
console.log("✅ Fast version built to dist-fast/");

rmSync("index-fast.ts");

console.log("\n🔨 Building Zig native version...");
await $`cd zig && zig build -Doptimize=ReleaseFast`;
console.log("✅ Zig native version built");

async function runJSBenchmark(version: string, distPath: string) {
  console.log(`BENCHMARKING: ${version}`);

  const benchmarkCode = `
import { EdgeContext, playground } from "./${distPath}/index.js";
const edges = new EdgeContext(3200);

const times = [];
const iterations = 10_000;

// Warm up
for (let i = 0; i < 1000; i++) {
  playground(edges);
  edges.reset();
}

// Actual benchmark
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

console.log(\`\\nResults:\`);
console.log(\`  Total iterations: \${iterations}\`);
console.log(\`  Total time: \${(sum / 1000).toFixed(3)}s\`);
console.log(\`  Average time: \${avg.toFixed(6)}ms\`);
console.log(\`  p5:  \${p5.toFixed(6)}ms\`);
console.log(\`  p50: \${p50.toFixed(6)}ms\`);
console.log(\`  p95: \${p95.toFixed(6)}ms\`);
console.log(\`  Ops/sec: \${(1000 / avg).toFixed(2)}\`);
  `;

  const tempFile = `benchmark-${version}.js`;
  await Bun.write(tempFile, benchmarkCode);
  await $`bun ${tempFile}`;
  if (existsSync(tempFile)) {
    rmSync(tempFile);
  }
}

await runJSBenchmark("default", "dist");
await runJSBenchmark("fast", "dist-fast");

console.log("BENCHMARKING: Zig Native");
await $`./zig/zig-out/bin/zcdt`;

console.log("BENCHMARK COMPLETE");
console.log("\n✅ All benchmarks completed successfully!");
console.log(
  "\nCompare the results above to see the performance differences between:",
);
console.log("  1. Default JS version (src)");
console.log("  2. Fast JS version (fast)");
console.log("  3. Zig native version");
