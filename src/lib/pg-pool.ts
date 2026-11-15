/**
 * Postgres pool that works on Node AND on Cloudflare Workers.
 *
 * Workers forbid reusing a socket across requests ("Cannot perform I/O on
 * behalf of a different request"), so a long-lived `pg.Pool` breaks there.
 * On Workers we hand out a fresh `pg.Client` per checkout and close it on
 * release. The object keeps the `Pool` surface that Kysely / Better Auth and
 * `db.ts` use: `connect()` → client with `release()`, and `query()`.
 */
import pg from "pg";

export const isCloudflareWorker =
  typeof navigator !== "undefined" &&
  (navigator as { userAgent?: string }).userAgent === "Cloudflare-Workers";

type PoolLike = Pick<pg.Pool, "connect" | "query" | "end"> & { on?: unknown };

class PerRequestPool {
  constructor(private readonly connectionString: string) {}

  async connect() {
    const client = new pg.Client({ connectionString: this.connectionString });
    await client.connect();
    const release = () => {
      void client.end().catch(() => undefined);
    };
    return Object.assign(client, { release });
  }

  async query(text: string, params?: unknown[]) {
    const client = await this.connect();
    try {
      return await client.query(text, params as unknown[]);
    } finally {
      client.release();
    }
  }

  on() {
    return this;
  }

  async end() {}
}

export function createPgPool(connectionString: string): pg.Pool {
  if (isCloudflareWorker) {
    return new PerRequestPool(connectionString) as unknown as PoolLike as pg.Pool;
  }
  return new pg.Pool({ connectionString });
}

/**
 * Wrap a pool so every checkout first awaits `ready()` (e.g. pending schema
 * migrations). Lets Better Auth's very first query — usually sign-up — run
 * against an already-migrated database.
 */
export function withReady(pool: pg.Pool, ready: () => Promise<void>): pg.Pool {
  const wrapped = Object.create(pool) as pg.Pool;
  wrapped.connect = (async () => {
    await ready();
    return pool.connect();
  }) as pg.Pool["connect"];
  wrapped.query = (async (...args: Parameters<pg.Pool["query"]>) => {
    await ready();
    return (pool.query as (...a: unknown[]) => unknown)(...args);
  }) as pg.Pool["query"];
  return wrapped;
}
