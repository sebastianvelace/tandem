import { defineConfig } from "drizzle-kit";

/*
 * Migraciones con DIRECT_URL (conexión no pooled), runtime con DATABASE_URL.
 */
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
