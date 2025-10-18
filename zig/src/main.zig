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

    const iterations: usize = 10000;
    var total_time: u64 = 0;

    std.debug.print("Running playground example {d} times...\n", .{iterations});

    for (0..iterations) |i| {
        // Reset before timing to exclude reset time from measurements
        storage.reset();

        var timer = try std.time.Timer.start();
        try presets.playground(storage);
        total_time += timer.read();

        // Print progress every 1000 iterations
        if ((i + 1) % 1000 == 0) {
            std.debug.print("  Completed {d}/{d} iterations\n", .{ i + 1, iterations });
        }
    }

    const avg_time = total_time / iterations;
    const avg_time_ms = @as(f64, @floatFromInt(avg_time)) / 1_000_000.0;
    const total_time_s = @as(f64, @floatFromInt(total_time)) / 1_000_000_000.0;

    std.debug.print("\nResults:\n", .{});
    std.debug.print("  Total iterations: {d}\n", .{iterations});
    std.debug.print("  Total time: {d:.3}s\n", .{total_time_s});
    std.debug.print("  Average time: {d:.6}ms\n", .{avg_time_ms});

    try validate(storage);
}
