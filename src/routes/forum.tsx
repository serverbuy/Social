import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AvatarMark } from "@/components/mark/avatar-mark";
import { SparkleName } from "@/components/mark/name-badge";
import { EmptyState } from "@/components/empty-state";
import { BOARDS, listThreads } from "@/lib/server/community";
import { timeAgo } from "@/lib/utils";
import type { ThreadCard } from "@/lib/types";
import { useMe } from "@/components/layout/me-context";

export const Route = createFileRoute("/forum")({ component: ForumPage });

function ForumPage() {
  const { profile } = useMe();
  const [threads, setThreads] = useState<ThreadCard[]>([]);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    void listThreads({ data: {} }).then(setThreads);
  }, []);

  if (pathname !== "/forum") return <Outlet />;

  return (
    <AppShell>
      <div className="px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold">Forum</h1>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BOARDS.map((b) => (
            <Link
              key={b.slug}
              to="/forum/$board"
              params={{ board: b.slug }}
              className="rounded-2xl bg-surface p-5 hover:bg-elevated"
            >
              <p className="text-xs text-subtle">
                {b.hall ? (profile?.hallAccess ? "Hall" : "Locked") : "Public"}
              </p>
              <h2 className="mt-2 text-xl font-bold">{b.label}</h2>
            </Link>
          ))}
        </div>
        <h2 className="mt-10 text-xl font-bold">Zuletzt</h2>
        {threads.length === 0 ? (
          <EmptyState className="mt-4" title="Keine Threads" />
        ) : (
          <ul className="mt-4 divide-y divide-line border border-line">
            {threads.map((t) => (
              <li key={t.id}>
                <Link
                  to="/forum/thread/$id"
                  params={{ id: String(t.id) }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-elevated"
                >
                  <AvatarMark username={t.authorUsername} avatarKey={t.authorAvatar} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{t.title}</span>
                    <span className="text-xs text-subtle">
                      {t.board} ·{" "}
                      <SparkleName badge={t.authorBadge} size={13}>
                        @{t.authorUsername}
                      </SparkleName>{" "}
                      · {timeAgo(t.createdAt)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
