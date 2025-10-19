# fast-cdt

A decently fast implementation of incremental CDT (Constrained Delaunay Triangulation) made with use in pathfinding in mind (but possibly useful elsewhere wherever you might need CDT).

This repository contains a benchmark comparing 4 implementations:

1. **Default JS** (`src/`) - idiomatic modern TypeScript with cautious performance optimizations
2. **Fast JS** (`fast/`) - optimized version using static typed arrays for memory allocation
3. **WASM** (`zig/`) - Zig implementation compiled to WebAssembly
4. **Native Zig** (`zig/`) - native Zig binary for maximum performance

The benchmark tests each implementation across different JavaScript runtimes (Node.js/V8 and Bun/JSC).

See the [blog post](https://tchayen.com/notes-from-benchmarking-wasm-and-optimized-js) where I go into more detail.

## Running

```
./benchmark.ts
```

Will do builds of two JS variants, build Zig and also run both WASM and native version. Requires zig 15.1 (or compatible) installed e.g. with `brew`.

Example results on Apple M3 (Air):

| Version              | p50 (ms) | Speedup |
| -------------------- | -------- | ------- |
| Default JS (Bun/JSC) | 0.097375 | 1.00x   |
| Default JS (Node/V8) | 0.082459 | 1.18x   |
| Fast JS (Node/V8)    | 0.073584 | 1.32x   |
| Fast JS (Bun/JSC)    | 0.058959 | 1.65x   |
| WASM (Bun/JSC)       | 0.032292 | 3.02x   |
| Zig Native           | 0.025291 | 3.85x   |

## Web demo

Interactive demo that verifies all implementations work correctly. Run in the `example/` directory:

```
bun dev
```

and

```
bun dev:css
```

The demo allows switching between 5 test scenarios and 3 implementations (default, fast, WASM).
