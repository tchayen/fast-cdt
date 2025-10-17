import indexHtml from "./index.html";

const port = process.env.PORT || 3000;

Bun.serve({
  development: {
    hmr: true,
  },
  port,
  routes: {
    "/": indexHtml,
  },
});

// eslint-disable-next-line no-console
console.log(`🚀 Server running at http://localhost:${port}`);
