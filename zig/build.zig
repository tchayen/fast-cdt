const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.resolveTargetQuery(.{
        .cpu_arch = .wasm32,
        .os_tag = .freestanding,
    });

    const optimize = std.builtin.OptimizeMode.ReleaseFast;

    const wasm = b.addExecutable(.{
        .name = "lib",
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/root.zig"),
            .target = target,
            .optimize = optimize,
        }),
    });

    wasm.rdynamic = true;
    wasm.entry = .disabled; // -fno-entry

    b.installArtifact(wasm);

    const wasm_step = b.step("wasm", "Build the WASM module");
    wasm_step.dependOn(&wasm.step);

    // Native executable for benchmarking
    const native_target = b.standardTargetOptions(.{});
    const native_optimize = b.standardOptimizeOption(.{});

    const exe = b.addExecutable(.{
        .name = "zcdt",
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/main.zig"),
            .target = native_target,
            .optimize = native_optimize,
        }),
    });

    b.installArtifact(exe);

    const run_cmd = b.addRunArtifact(exe);
    run_cmd.step.dependOn(b.getInstallStep());

    const run_step = b.step("run", "Run the benchmark");
    run_step.dependOn(&run_cmd.step);
}
