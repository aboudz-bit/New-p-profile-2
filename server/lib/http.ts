/** Small HTTP helpers: typed errors, async wrapper, zod body validation. */
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { type ZodType } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/** Wrap an async handler so thrown/rejected errors reach the error middleware. */
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/** Read a path parameter as a single string (Express 5 types params as
 *  `string | string[]` to support wildcard routes; ours are always single). */
export function pathParam(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

/** Parse & validate the request body, throwing a 422 on failure. */
export function parseBody<T>(schema: ZodType<T>, req: Request): T {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    throw new ApiError(422, "Validation failed", result.error.flatten());
  }
  return result.data;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  // eslint-disable-next-line no-console
  console.error("[unhandled]", err);
  res.status(500).json({ error: "Internal server error" });
}
