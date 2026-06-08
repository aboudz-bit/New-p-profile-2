import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { resolve } from "node:path";
import { apiRouter } from "./routes/index";
import { errorHandler } from "./lib/http";
import { setupClient } from "./lib/vite";
import { PORT, UPLOAD_DIR, NODE_ENV } from "./lib/env";

async function main() {
  const app = express();

  app.use(express.json({ limit: "30mb" }));
  app.use(cookieParser());

  // Conservative security headers (dependency-free; safe for an SPA + JSON API).
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-DNS-Prefetch-Control", "off");
    next();
  });

  // Serve uploaded documents (local storage adapter).
  app.use("/uploads", express.static(resolve(UPLOAD_DIR)));

  // REST API.
  app.use("/api", apiRouter);

  // API 404 (before the SPA catch-all so unknown /api paths don't return HTML).
  app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

  // Client (Vite middleware in dev, static build in prod).
  await setupClient(app);

  // Error handler last.
  app.use(errorHandler);

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`P Profile [${NODE_ENV}] listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal startup error:", err);
  process.exit(1);
});
