/**
 * Offline-Modus: dieselbe `getSql()`-API wie `src/lib/db.ts`, aber die Datenbank (PGlite =
 * Postgres als WebAssembly) läuft direkt im Handy und speichert dauerhaft in IndexedDB.
 */
import { PGlite } from "@electric-sql/pglite";
import { pendingMigrations } from "../scripts/migration-plan.mjs";
import demoSeed from "./demo-seed.sql?raw";

export type DbSource = "neon" | "pglite";
export const dbSource: DbSource = "pglite";

export interface Sql {
  <T = Record<string, unknown>>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]>;
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

const OID_INT8 = 20;
const OID_DATE = 1082;
const OID_INTERVAL = 1186;
const identity = (v: string) => v;

let pgPromise: Promise<PGlite> | null = null;
let sqlPromise: Promise<Sql> | null = null;

async function openDb(): Promise<PGlite> {
  const pg = new PGlite("idb://social-offline", {
    parsers: { [OID_INT8]: Number, [OID_DATE]: identity, [OID_INTERVAL]: identity },
    relaxedDurability: true,
  });
  await pg.waitReady;
  await pg.exec(
    "create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const migrations = import.meta.glob("/migrations/*.sql", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
  const done = (await pg.query<{ name: string }>("select name from _migrations")).rows.map((r) => r.name);
  for (const { name, path } of pendingMigrations(Object.keys(migrations), done)) {
    await pg.transaction(async (tx) => {
      await tx.exec(migrations[path]);
      await tx.query("insert into _migrations (name) values ($1)", [name]);
    });
  }
  // Offline-Demo-Daten einmalig einspielen
  const demo = await pg.query<{ name: string }>("select name from _migrations where name = 'offline_demo'");
  if (demo.rows.length === 0) {
    try {
      await pg.transaction(async (tx) => {
        await tx.exec(demoSeed);
        await tx.query("insert into _migrations (name) values ('offline_demo')");
      });
    } catch (e) {
      console.warn("[offline] Demo-Daten übersprungen", e);
    }
  }
  return pg;
}

export function getPglite(): Promise<PGlite> {
  pgPromise ??= openDb().catch((e) => { pgPromise = null; throw e; });
  return pgPromise;
}

export function getSql(): Promise<Sql> {
  sqlPromise ??= (async () => {
    const pg = await getPglite();
    const run = async <T>(text: string, params: unknown[]) => (await pg.query<T>(text, params)).rows;
    const sql = (async <T = Record<string, unknown>>(strings: TemplateStringsArray, ...values: unknown[]) => {
      let text = strings[0];
      for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
      return run<T>(text, values);
    }) as unknown as Sql;
    sql.query = <T = Record<string, unknown>>(text: string, params: unknown[] = []) => run<T>(text, params);
    return sql;
  })().catch((e) => { sqlPromise = null; throw e; });
  return sqlPromise;
}

export function ensureDbReady(): Promise<void> {
  return getSql().then(() => undefined);
}
