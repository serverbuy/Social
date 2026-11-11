import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { useMe } from "@/components/layout/me-context";
import { AvatarMark } from "@/components/mark/avatar-mark";
import { SparkleName } from "@/components/mark/name-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { fileReport, getThread, replyThread } from "@/lib/server/community";
import { timeAgo } from "@/lib/utils";
import type { PostRow, ThreadCard } from "@/lib/types";

export const Route = createFileRoute("/forum/thread/$id")({ component: ThreadPage });

function ThreadPage() {
  const { id } = Route.useParams();
  const { signedIn } = useMe();
  const navigate = useNavigate();
  const [thread, setThread] = useState<ThreadCard | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [body, setBody] = useState("");

  async function load() {
    const res = await getThread({ data: { id: Number(id) } });
    setThread(res?.thread ?? null);
    setPosts(res?.posts ?? []);
  }

  useEffect(() => {
    void load();
  }, [id]);

  if (!thread) {
    return (
      <AppShell>
        <div className="p-6">
          <EmptyState title="Thread nicht sichtbar" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-4 py-8 sm:px-6">
        <Link
          to="/forum/$board"
          params={{ board: thread.board }}
          className="text-xs text-subtle"
        >
          {thread.board}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{thread.title}</h1>
        <ul className="mt-8 space-y-6">
          {posts.map((p) => (
            <li key={p.id} className="flex gap-3 border-b border-line pb-6">
              <AvatarMark username={p.authorUsername} avatarKey={p.authorAvatar} size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-subtle">
                  <SparkleName badge={p.authorBadge} size={13}>
                    @{p.authorUsername}
                  </SparkleName>{" "}
                  · {timeAgo(p.createdAt)}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{p.body}</p>
              </div>
            </li>
          ))}
        </ul>
        <form
          className="mt-8 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!signedIn) return navigate({ to: "/login" });
            await replyThread({ data: { threadId: thread.id, body } });
            setBody("");
            await load();
          }}
        >
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Antwort"
          />
          <div className="flex gap-2">
            <Button type="submit">Antworten</Button>
            <Button
              type="button"
              variant="ghost"
              onClick={async () => {
                if (!signedIn) return navigate({ to: "/login" });
                await fileReport({
                  data: {
                    targetType: "thread",
                    targetId: String(thread.id),
                    reason: "Thread gemeldet",
                  },
                });
                toast.success("Report bei Moderation.");
              }}
            >
              Melden
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
