import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

/*
 * Conexión Postgres para Server Actions/servicios (capa de escritura).
 * Atraviesa RLS con privilegios de la cadena de conexión; por eso la
 * autorización SE VALIDA EN LA APP (assertMembership) antes de cada query
 * (defensa en profundidad, ADR-004 / SECURITY §4).
 *
 * Inicialización PEREZOSA: la conexión no se abre al importar el módulo, solo
 * en la primera query en runtime. Así el build (page-data collection) no
 * requiere DATABASE_URL ni abre sockets.
 */
type DB = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>;
  drizzleDb?: DB;
};

function getDb(): DB {
  if (globalForDb.drizzleDb) return globalForDb.drizzleDb;

  const pgClient =
    globalForDb.pgClient ?? postgres(env.databaseUrl, { prepare: false });
  const instance = drizzle(pgClient, { schema });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.pgClient = pgClient;
    globalForDb.drizzleDb = instance;
  }
  return instance;
}

// Proxy que difiere la creación de la conexión hasta el primer acceso real.
export const db: DB = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb() as object, prop, receiver);
  },
});

export type Database = DB;
