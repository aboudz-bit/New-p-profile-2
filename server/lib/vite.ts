/**
 * Dev: mount Vite as middleware so the SPA and API share one origin (no proxy
 * needed — this was the local-dev pain point in the legacy repos).
 * Prod: serve the built client from dist/public with SPA fallback.
 */
import type { Express } from "express";
import express from "express";
import { resolve } from "node:path";
import { IS_PROD } from "./env";

export async function setupClient(app: Express): Promise<void> {
  if (IS_PROD) {
    // Bundle runs at dist/server/index.mjs → the built client is at dist/public.
    const dist = resolve(import.meta.dirname, "../public");
    app.use(express.static(dist));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(resolve(dist, "index.html"));
    });
    return;
  }

  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
    configFile: resolve(import.meta.dirname, "../../vite.config.ts"),
  });
  app.use(vite.middlewares);
}
