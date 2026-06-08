import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { DATABASE_URL } from "./lib/env";

const pool = new pg.Pool({ connectionString: DATABASE_URL });

export const db = drizzle(pool, { schema, casing: "snake_case" });
export { pool };
export type DB = typeof db;
