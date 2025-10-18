const std = @import("std");
const geometry = @import("geometry.zig");
const EdgeContext = geometry.EdgeContext;
const presets = @import("presets.zig");
const validate = geometry.validate;
const locatePoint = geometry.locatePoint;
const square = geometry.square;
const insertPoint = geometry.insertPoint;
const enforceEdge = geometry.enforceEdge;
const getVertex = geometry.getVertex;
const getIntersecting = geometry.getIntersecting;
const Queue = geometry.Queue;
const types = @import("types.zig");
const P = types.P;

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    const allocator = gpa.allocator();

    var storage = try allocator.create(EdgeContext);
    defer allocator.destroy(storage);
    storage.* = try EdgeContext.init(allocator);
    defer storage.deinit();

    const iterations: usize = 10_000;
    var times = try std.ArrayList(u64).initCapacity(allocator, iterations);
    defer times.deinit(allocator);

    // Benchmark
    for (0..iterations) |_| {
        storage.reset();
        var timer = try std.time.Timer.start();
        try presets.playground(storage);
        const elapsed = timer.read();
        times.appendAssumeCapacity(elapsed);
    }

    // Sort times for percentiles
    std.mem.sort(u64, times.items, {}, comptime std.sort.asc(u64));

    var total_time: u64 = 0;
    for (times.items) |time| {
        total_time += time;
    }

    const avg_time = total_time / iterations;
    const avg_time_ms = @as(f64, @floatFromInt(avg_time)) / 1_000_000.0;
    const total_time_s = @as(f64, @floatFromInt(total_time)) / 1_000_000_000.0;

    const p5_time = times.items[@as(usize, @intFromFloat(@as(f64, @floatFromInt(iterations)) * 0.05))];
    const p50_time = times.items[@as(usize, @intFromFloat(@as(f64, @floatFromInt(iterations)) * 0.5))];
    const p95_time = times.items[@as(usize, @intFromFloat(@as(f64, @floatFromInt(iterations)) * 0.95))];

    const p5_ms = @as(f64, @floatFromInt(p5_time)) / 1_000_000.0;
    const p50_ms = @as(f64, @floatFromInt(p50_time)) / 1_000_000.0;
    const p95_ms = @as(f64, @floatFromInt(p95_time)) / 1_000_000.0;
    const ops_per_sec = 1000.0 / avg_time_ms;

    std.debug.print("\nResults:\n", .{});
    std.debug.print("  Total iterations: {d}\n", .{iterations});
    std.debug.print("  Total time: {d:.3}s\n", .{total_time_s});
    std.debug.print("  Average time: {d:.6}ms\n", .{avg_time_ms});
    std.debug.print("  p5:  {d:.6}ms\n", .{p5_ms});
    std.debug.print("  p50: {d:.6}ms\n", .{p50_ms});
    std.debug.print("  p95: {d:.6}ms\n", .{p95_ms});
    std.debug.print("  Ops/sec: {d:.2}\n", .{ops_per_sec});

    try validate(storage);
}
