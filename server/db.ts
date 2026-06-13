import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as neonDrizzle } from 'drizzle-orm/neon-serverless';
import { Pool as PgPool } from 'pg';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Self-hosting: set DATABASE_DRIVER=pg to connect to a standard PostgreSQL
// server (Docker, RDS, Supabase, a local install, etc.) using node-postgres.
// When unset (the default, e.g. on Replit/Neon) the Neon serverless driver is
// used, which speaks to Neon over WebSockets.
const useStandardPg = process.env.DATABASE_DRIVER === "pg";

let pool: NeonPool | PgPool;
let db: ReturnType<typeof neonDrizzle> | ReturnType<typeof pgDrizzle>;

if (useStandardPg) {
  pool = new PgPool({ connectionString: process.env.DATABASE_URL });
  db = pgDrizzle(pool as PgPool, { schema });
} else {
  neonConfig.webSocketConstructor = ws;
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  db = neonDrizzle({ client: pool as NeonPool, schema });
}

export { pool, db };
