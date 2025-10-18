# fast-cdt

A decently fast implementation of incremental CDT (Constrained Delaunay Triangulation) made with use in pathfinding in mind (but possibly useful elsewhere wherever you might need CDT).

## Notes

- I tried `robust-predicates` but it was actually a 40% slowdown (expectedly as there's much more math there).
- Compared to Zig version I was able to inline custom data structures and that even caused performance gains.
- Massive win came from inlining code assertions and null checks. I was transforming `-1` index to `null` and comparing that. After switching to just working on `-1` I saw 50% improvement.
- At the start of optimizations (of already fast code operating on static arrays) was at 4.5k ops/s. Raised it to 13k ops/s.
- For comparison, previous most optimized JS-only solution working on JS arrays and not avoiding objects and dynamic allocations (but fast algorithmically) was at 900ms for a 100x100 grid at 30% occupation. This version runs at 14ms (64x faster) which is even lower than Zig version at 25ms (needs verification - that does seem a bit odd; I would expect it to be fast but not THAT fast).
