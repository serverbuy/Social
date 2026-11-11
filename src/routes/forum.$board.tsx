import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { useMe } from "@/components/layout/me-context";
import { AvatarMark } from "@/components/mark/avatar-mark";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { BOARDS, createThread, listThreads } from "@/lib/server/community";
import { timeAgo } from "@/lib/utils";
import type { ThreadCard } from "@/lib/types";

export const Route = createFileRoute("/forum/$board")({ component: BoardPage });

function BoardPage() {
  const { board } = Route.useParams();
  const { signedIn, profile } = useMe();
  const navigate = useNavigate();
  const meta = BOARDS.find((b) => b.slug === board);
  const [threads, setThreads] = useState<ThreadCard[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    void listThreads({ data: { board } }).then(setThreads);
  }, [board]);

  if (!meta) {
    return (
      <AppShell>
        <div className="p-6">
          <EmptyState title="Unbekanntes Board" />
        </div>
      </AppShell>
    );
  }

  if (meta.hall && !profile?.hallAccess) {
    return (
      <AppShell>
        <div className="p-6">
          <EmptyState
            title="Hall-Board gesperrt"
            action={
              <Link to="/hall" className="text-sm underline">
                Zur Hall
              </Link>
            }
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold">{meta.label}</h1>
        <form
          className="mt-8 space-y-3 border border-line p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!signedIn) return navigate({ to: "/login" });
            const res = await createThread({ data: { board, title, body } });
            if (!res.ok) toast.error(res.error ?? "");
            else {
              toast.success("Thread live.");
              setTitle("");
              setBody("");
              if (res.id) void navigate({ to: "/forum/thread/$id", params: { id: String(res.id) } });
            }
          }}
        >
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel" />
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Beitrag" />
          <Button type="submit">Thread eröffnen</Button>
        </form>
        {threads.length === 0 ? (
          <EmptyState className="mt-6" title="Leeres Board" />
        ) : (
          <ul className="mt-6 divide-y divide-line border border-line">
            {threads.map((t) => (
              <li key={t.id}>
                <Link
                  to="/forum/thread/$id"
                  params={{ id: String(t.id) }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-elevated"
                >
                  <AvatarMark username={t.authorUsername} avatarKey={t.authorAvatar} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">
                      {t.pinned ? "Pin · " : ""}
                      {t.title}
                    </span>
                    <span className="text-xs text-subtle">
                      @{t.authorUsername} · {t.replies} · {timeAgo(t.createdAt)}
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
