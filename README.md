# fast-cdt

A decently fast implementation of incremental CDT (Constrained Delaunay Triangulation) made with use in pathfinding in mind (but possibly useful elsewhere wherever you might need CDT).

Features 3 versions:

- default (using idiomatic modern JS/TS but overall cautious about performance)
- sped up version which goes harder into using static array allocation
- original Zig implementation that also compiles to WASM

## Running

```
./benchmark-all.ts
```

Will do builds of two JS variants, build Zig and also run both WASM and native version (requires zig installed e.g. with `brew`).

## Web example

I use it as a test to make sure everything works (benchmarks of broken code are not worth much).

In two separate terminals:

```
bun dev:css
```

and

```
bun dev
```

You can switch between 5 examples and 3 versions (default, fast, WASM).
