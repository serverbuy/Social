import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { useMe } from "@/components/layout/me-context";
import { useI18n } from "@/components/layout/i18n-context";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { createServer, DEFAULT_SLUGS, listServers } from "@/lib/server/community";
import { joinByInvite } from "@/lib/server/live";
import type { ServerRow } from "@/lib/types";

export const Route = createFileRoute("/servers")({ component: ServersPage });

function ServerLink({ s }: { s: ServerRow }) {
  const navigate = useNavigate();
  const inner = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{s.name}</span>
        <span className="text-xs text-subtle">
          {s.memberCount} · {s.joined || s.role === "owner" ? "Öffnen" : s.visibility}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-subtle" />
    </>
  );
  const cls =
    "flex w-full items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-left hover:bg-elevated";
  return (
    <button
      type="button"
      className={cls}
      onClick={() => {
        if (s.slug === "forum") void navigate({ to: "/forum" });
        else if (s.slug === "hall") void navigate({ to: "/hall" });
        else void navigate({ to: "/servers/$id", params: { id: String(s.id) } });
      }}
    >
      {inner}
    </button>
  );
}

function ServersPage() {
  const { signedIn, profile } = useMe();
  const { t } = useI18n();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [servers, setServers] = useState<ServerRow[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "invite" | "private">("public");

  async function load() {
    setServers(await listServers());
  }

  useEffect(() => {
    void load();
  }, [signedIn]);

  const featured = servers.filter((s) => DEFAULT_SLUGS.includes(s.slug as (typeof DEFAULT_SLUGS)[number]));
  const mine = servers.filter((s) => s.ownerId === profile?.userId || s.role === "owner");
  const rest = servers.filter(
    (s) =>
      !DEFAULT_SLUGS.includes(s.slug as (typeof DEFAULT_SLUGS)[number]) &&
      s.ownerId !== profile?.userId &&
      s.role !== "owner",
  );

  if (pathname !== "/servers") return <Outlet />;

  return (
    <AppShell>
      <div className="px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold">{t("servers")}</h1>
        <form
          className="mt-4 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const code = String(fd.get("code") || "");
            const res = await joinByInvite({ data: { code } });
            if (!res.ok) toast.error(res.error ?? "");
            else if (res.id) void navigate({ to: "/servers/$id", params: { id: String(res.id) } });
          }}
        >
          <Input name="code" placeholder="Invite-Code" />
          <Button type="submit">Join</Button>
        </form>

        {mine.length > 0 ? (
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-muted">{t("myServers")}</h2>
            <ul className="mt-2 space-y-2">
              {mine.map((s) => (
                <li key={s.id}>
                  <ServerLink s={s} />
                  {s.inviteCode ? (
                    <button
                      type="button"
                      className="mt-1 px-1 text-xs text-primary"
                      onClick={() => {
                        void navigator.clipboard.writeText(s.inviteCode);
                        toast.success(`Invite: ${s.inviteCode}`);
                      }}
                    >
                      Invite kopieren · {s.inviteCode}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {featured.length > 0 ? (
          <ul className="mt-6 space-y-2">
            {featured.map((s) => (
              <li key={`f-${s.id}`}>
                <ServerLink s={s} />
              </li>
            ))}
          </ul>
        ) : null}

        {signedIn ? (
          <form
            className="mt-8 max-w-lg space-y-3 rounded-2xl bg-surface p-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await createServer({ data: { name, description, visibility } });
              if (!res.ok) toast.error(res.error ?? "");
              else if (res.id) {
                toast.success("Server erstellt.");
                setName("");
                setDescription("");
                await load();
                void navigate({ to: "/servers/$id", params: { id: String(res.id) } });
              }
            }}
          >
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschreibung"
            />
            <div className="flex gap-2">
              {(["public", "invite", "private"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={
                    visibility === v
                      ? "h-9 rounded-full bg-primary px-3 text-xs font-semibold text-white"
                      : "h-9 rounded-full bg-elevated px-3 text-xs text-muted"
                  }
                >
                  {v}
                </button>
              ))}
            </div>
            <Button type="submit">{t("createServer")}</Button>
          </form>
        ) : null}

        {rest.length === 0 && featured.length === 0 && mine.length === 0 ? (
          <EmptyState className="mt-8" title="Keine Server" />
        ) : rest.length > 0 ? (
          <ul className="mt-8 space-y-2">
            {rest.map((s) => (
              <li key={s.id}>
                <ServerLink s={s} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </AppShell>
  );
}
