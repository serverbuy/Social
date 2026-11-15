import { createFileRoute } from "@tanstack/react-router";

/**
 * Deploy diagnostics: which config is present (never the values) and whether
 * the database answers. Safe to leave in — it exposes no secrets.
 */
export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const has = (k: string) => Boolean(process.env[k]?.trim());
        const out: Record<string, unknown> = {
          DATABASE_URL: has("DATABASE_URL"),
          BETTER_AUTH_SECRET: has("BETTER_AUTH_SECRET"),
          BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? null,
        };
        const url = process.env.DATABASE_URL?.trim();
        if (url) {
          try {
            const { host, port } = new URL(url);
            out.dbHost = `${host}${port ? "" : ""}`;
          } catch {
            out.dbHost = "invalid DATABASE_URL (check for typos / special characters)";
          }
          try {
            const pg = await import("pg");
            const client = new pg.default.Client({ connectionString: url });
            await client.connect();
            const r = await client.query("select 1 as ok");
            await client.end();
            out.db = r.rows[0]?.ok === 1 ? "ok" : "unexpected";
          } catch (err) {
            out.db = "error";
            out.dbError = err instanceof Error ? err.message : String(err);
          }
        }
        return Response.json(out, { headers: { "cache-control": "no-store" } });
      },
    },
  },
});
