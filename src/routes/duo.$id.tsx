import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { useMe } from "@/components/layout/me-context";
import { AvatarMark } from "@/components/mark/avatar-mark";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { getDuo, vote } from "@/lib/server/rankings";
import { formatCount, rankLabel } from "@/lib/utils";
import type { DuoRow } from "@/lib/types";

export const Route = createFileRoute("/duo/$id")({ component: DuoPage });

function DuoPage() {
  const { id } = Route.useParams();
  const { signedIn } = useMe();
  const navigate = useNavigate();
  const [duo, setDuo] = useState<DuoRow | null>(null);

  useEffect(() => {
    void getDuo({ data: { id: Number(id) } }).then(setDuo);
  }, [id]);

  if (!duo) {
    return (
      <AppShell>
        <div className="p-6">
          <EmptyState title="Duo nicht gefunden" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-4 py-10 sm:px-6">
        <p className="text-xs text-subtle">
          Best Duo · {rankLabel(duo.rank)}
        </p>
        <h1 className="mt-2 text-2xl font-bold">{duo.name}</h1>
        {duo.bio ? <p className="mt-4 max-w-xl text-muted">{duo.bio}</p> : null}
        <div className="mt-8 flex flex-wrap items-center gap-8">
          {[duo.a, duo.b].map((p) => (
            <Link
              key={p.userId}
              to="/u/$username"
              params={{ username: p.username }}
              className="flex items-center gap-3"
            >
              <AvatarMark username={p.username} avatarKey={p.avatarKey} size={64} />
              <span>
                <span className="block text-sm">@{p.username}</span>
                <span className="text-muted">{p.displayName}</span>
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-6 text-sm tabular-nums">{formatCount(duo.score)} Stimmen</p>
        <div className="mt-6 flex gap-2">
          <Button
            onClick={async () => {
              if (!signedIn) return navigate({ to: "/login" });
              const res = await vote({ data: { world: "duo", targetId: String(duo.id) } });
              if (!res.ok) toast.error(res.error ?? "");
              else toast.success("Stimme gesetzt.");
              setDuo(await getDuo({ data: { id: duo.id } }));
            }}
          >
            Vote Duo
          </Button>
          <Link
            to="/forum/$board"
            params={{ board: "rankings" }}
            className="inline-flex h-11 items-center border border-line-strong px-4 text-sm"
          >
            Discussion
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
