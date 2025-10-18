import indexHtml from "./index.html";

const port = process.env.PORT || 3000;

Bun.serve({
  development: { hmr: true },
  port,
  routes: {
    "/": indexHtml,
    "/lib.wasm": {
      GET: async () => {
        const file = Bun.file("../zig/zig-out/bin/lib.wasm");
        if (await file.exists()) {
          return new Response(file, {
            headers: {
              "Content-Type": "application/wasm",
            },
          });
        }
        return new Response("WASM file not found", { status: 404 });
      },
    },
  },
});

// eslint-disable-next-line no-console
console.log(`🚀 Server running at http://localhost:${port}`);
