import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useI18n } from "@/components/layout/i18n-context";
import { AvatarMark } from "@/components/mark/avatar-mark";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { listInbox, listGroups, searchPeople } from "@/lib/server/social";
import { chatPreview } from "@/lib/media";
import { timeAgo } from "@/lib/utils";
import type { FriendRow, GroupRow } from "@/lib/types";

export const Route = createFileRoute("/chat")({ component: ChatIndex });

function ChatIndex() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useI18n();
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ userId: string; username: string; displayName: string; avatarKey: string }[]>(
    [],
  );

  useEffect(() => {
    void Promise.all([listInbox(), listGroups()]).then(([f, g]) => {
      setFriends(f);
      setGroups(g);
    });
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 1) {
      setHits([]);
      return;
    }
    const tmr = window.setTimeout(() => {
      void searchPeople({ data: { q: term } }).then(setHits);
    }, 180);
    return () => window.clearTimeout(tmr);
  }, [q]);

  if (pathname !== "/chat") return <Outlet />;

  return (
    <AppShell>
      <div className="px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-bold">{t("chat")}</h1>
        <Input
          className="mt-4"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search")}
        />
        {hits.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {hits.map((p) => (
              <li key={p.userId}>
                <button
                  type="button"
                  onClick={() => void navigate({ to: "/dm/$username", params: { username: p.username } })}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface"
                >
                  <AvatarMark username={p.username} avatarKey={p.avatarKey} size={40} />
                  <span>
                    <span className="block text-sm font-semibold">@{p.username}</span>
                    <span className="text-xs text-subtle">{p.displayName}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {friends.length === 0 && hits.length === 0 ? (
          <EmptyState className="mt-8" title={t("noDms")} />
        ) : (
          <ul className="mt-4 space-y-1">
            {friends.map((f) => (
              <li key={f.userId}>
                <button
                  type="button"
                  onClick={() =>
                    void navigate({ to: "/dm/$username", params: { username: f.username } })
                  }
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-surface"
                >
                  <span className="relative">
                    <AvatarMark username={f.username} avatarKey={f.avatarKey} size={48} />
                    <span
                      className={
                        f.online
                          ? "absolute bottom-0 right-0 size-3 rounded-full border-2 border-bg bg-online"
                          : "absolute bottom-0 right-0 size-3 rounded-full border-2 border-bg bg-subtle"
                      }
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">@{f.username}</span>
                      {f.lastAt ? (
                        <span className="ml-auto shrink-0 text-[11px] text-subtle">
                          {timeAgo(f.lastAt)}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-subtle">
                      {f.lastBody ? chatPreview(f.lastBody) : f.online ? t("online") : timeAgo(f.lastSeen)}
                    </span>
                  </span>
                  {f.unread ? <span className="size-2.5 shrink-0 rounded-full bg-primary" /> : null}
                </button>
              </li>
            ))}
          </ul>
        )}

        {groups.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-muted">{t("groups")}</h2>
            <ul className="mt-3 space-y-2">
              {groups.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => void navigate({ to: "/groups/$id", params: { id: String(g.id) } })}
                    className="flex w-full items-center justify-between rounded-xl bg-surface px-4 py-3 text-left"
                  >
                    <span className="text-sm font-semibold">{g.name}</span>
                    <span className="text-xs text-subtle">{g.memberCount}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
