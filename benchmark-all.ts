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

async function runJSBenchmark(
  version: string,
  distPath: string,
  runtime: "node" | "bun",
): Promise<number> {
  console.log(`BENCHMARKING: ${version} (${runtime})`);

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

// Output for parsing
console.log(\`P50_VALUE:\${p50}\`);
  `;

  const tempFile = `benchmark-${version}-${runtime}.js`;
  await Bun.write(tempFile, benchmarkCode);
  const command = runtime === "node" ? $`node ${tempFile}` : $`bun ${tempFile}`;
  const result = await command;
  const output = result.text() || "";
  if (existsSync(tempFile)) {
    rmSync(tempFile);
  }

  // Parse p50 from output
  const match = output.match(/P50_VALUE:([\d.]+)/);
  if (!match || !match[1]) {
    return 0;
  }
  return Number.parseFloat(match[1]);
}

const defaultNodeP50 = await runJSBenchmark("default", "dist", "node");
const defaultBunP50 = await runJSBenchmark("default", "dist", "bun");
const fastNodeP50 = await runJSBenchmark("fast", "dist-fast", "node");
const fastBunP50 = await runJSBenchmark("fast", "dist-fast", "bun");

console.log("BENCHMARKING: Zig Native");
const zigResult = await $`./zig/zig-out/bin/zcdt 2>&1`;
const zigOutput = zigResult.text() || "";
const zigMatch = zigOutput.match(/p50:\s+([\d.]+)ms/);
const zigP50 = zigMatch?.[1] ? Number.parseFloat(zigMatch[1]) : 0;

console.log("BENCHMARK COMPLETE");

// Summary table
const results = [
  { name: "Default JS (Node/V8)", p50: defaultNodeP50 },
  { name: "Default JS (Bun/JSC)", p50: defaultBunP50 },
  { name: "Fast JS (Node/V8)", p50: fastNodeP50 },
  { name: "Fast JS (Bun/JSC)", p50: fastBunP50 },
  { name: "Zig Native", p50: zigP50 },
];

// Sort by p50 descending (slowest first)
results.sort((a, b) => b.p50 - a.p50);

// Use the slowest as baseline
const baseline = results[0].p50;

console.log("\nSUMMARY");
console.log(
  `${"Version".padEnd(25)} ${"p50 (ms)".padStart(12)} ${"Speedup".padStart(
    12,
  )}`,
);
console.log("-".repeat(65));

for (const result of results) {
  const speedup = baseline / result.p50;
  console.log(
    `${result.name.padEnd(25)} ${result.p50.toFixed(6).padStart(12)} ${speedup
      .toFixed(2)
      .padStart(11)}x`,
  );
}
