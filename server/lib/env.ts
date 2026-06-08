/** Centralised, validated environment access. Fails fast on misconfig. */
export const NODE_ENV = process.env.NODE_ENV ?? "development";
export const IS_PROD = NODE_ENV === "production";

export const PORT = Number(process.env.PORT ?? 5000);

export const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and configure it.");
}

const secret = process.env.SESSION_SECRET ?? "dev-only-change-me";
if (IS_PROD && (secret === "dev-only-change-me" || secret.length < 16)) {
  throw new Error("SESSION_SECRET must be set to a strong value in production.");
}
export const SESSION_SECRET = secret;

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";

/** Auth cookie name + TTL. */
export const AUTH_COOKIE = "pp_session";
export const SESSION_TTL_DAYS = 7;
