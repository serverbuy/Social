import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { useMe } from "@/components/layout/me-context";
import { AvatarMark } from "@/components/mark/avatar-mark";
import { SparkleName } from "@/components/mark/name-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DonateDialog } from "@/components/rankings/donate-dialog";
import { EmptyState } from "@/components/empty-state";
import {
  donate,
  getDuoBoard,
  getFamousBoard,
  getMyVote,
  getRichestBoard,
  nominate,
  vote,
} from "@/lib/server/rankings";
import { formatCount, formatEuro, rankLabel } from "@/lib/utils";
import type { DuoRow, RankRow } from "@/lib/types";

export const Route = createFileRoute("/rankings/$world")({ component: RankingPage });

function RankingPage() {
  const { world } = Route.useParams();
  const { signedIn } = useMe();
  const navigate = useNavigate();
  const [rows, setRows] = useState<RankRow[]>([]);
  const [duos, setDuos] = useState<DuoRow[]>([]);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [donateTo, setDonateTo] = useState<string | null>(null);
  const [nom, setNom] = useState("");
  const [nom2, setNom2] = useState("");
  const [busy, setBusy] = useState(false);

  const title =
    world === "richest" ? "Richest" : world === "duo" ? "Best Duo" : "Most Famous";

  async function reload() {
    if (world === "duo") {
      setDuos(await getDuoBoard());
      setMyVote((await getMyVote({ data: { world: "duo" } })).targetId);
    } else if (world === "richest") {
      setRows(await getRichestBoard());
    } else {
      setRows(await getFamousBoard());
      setMyVote((await getMyVote({ data: { world: "famous" } })).targetId);
    }
  }

  useEffect(() => {
    void reload().catch(() => toast.error("Board nicht geladen."));
  }, [world]);

  function needAuth() {
    if (signedIn) return false;
    void navigate({ to: "/login" });
    return true;
  }

  return (
    <AppShell>
      <div className="px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold">{title}</h1>

        <form
          className="mt-8 flex flex-wrap gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (needAuth()) return;
            const w = world === "richest" ? "richest" : world === "duo" ? "duo" : "famous";
            const res = await nominate({
              data: { world: w, username: nom, second: nom2 },
            });
            if (!res.ok) toast.error(res.error ?? "Abgelehnt.");
            else {
              toast.success("Nominierung liegt bei Moderation.");
              setNom("");
              setNom2("");
            }
          }}
        >
          <Input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="@username"
            className="max-w-48"
          />
          {world === "duo" ? (
            <Input
              value={nom2}
              onChange={(e) => setNom2(e.target.value)}
              placeholder="@zweites"
              className="max-w-48"
            />
          ) : null}
          <Button variant="outline" type="submit">
            Nominieren
          </Button>
        </form>

        {world === "duo" ? (
          <ul className="mt-8 divide-y divide-line border border-line">
            {duos.length === 0 ? (
              <EmptyState className="m-4" title="Keine Duos" />
            ) : (
              duos.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-4 px-4 py-4">
                  <span className="w-8 text-sm text-subtle">{rankLabel(d.rank)}</span>
                  <div className="flex -space-x-2">
                    <AvatarMark username={d.a.username} avatarKey={d.a.avatarKey} size={36} />
                    <AvatarMark username={d.b.username} avatarKey={d.b.avatarKey} size={36} />
                  </div>
                  <Link to="/duo/$id" params={{ id: String(d.id) }} className="min-w-0 flex-1">
                    <span className="block text-xl font-bold">{d.name}</span>
                    <span className="text-xs text-muted">
                      @{d.a.username} × @{d.b.username}
                    </span>
                  </Link>
                  <span className="tabular-nums">{formatCount(d.score)}</span>
                  <Button
                    size="sm"
                    disabled={Boolean(myVote)}
                    onClick={async () => {
                      if (needAuth()) return;
                      const res = await vote({ data: { world: "duo", targetId: String(d.id) } });
                      if (!res.ok) toast.error(res.error ?? "");
                      else toast.success("Stimme gesetzt.");
                      await reload();
                    }}
                  >
                    Vote
                  </Button>
                </li>
              ))
            )}
          </ul>
        ) : (
          <ul className="mt-8 divide-y divide-line border border-line">
            {rows.map((r) => (
              <li key={r.userId} className="flex flex-wrap items-center gap-3 px-4 py-4">
                <span className="w-8 text-sm text-subtle">{rankLabel(r.rank)}</span>
                <AvatarMark username={r.username} avatarKey={r.avatarKey} size={36} />
                <Link
                  to="/u/$username"
                  params={{ username: r.username }}
                  className="min-w-0 flex-1"
                >
                  <span className="block text-sm">
                    <SparkleName badge={r.badge} size={15}>
                      @{r.username}
                    </SparkleName>
                  </span>
                  <span className="text-xs text-muted">{r.displayName}</span>
                </Link>
                <span className="tabular-nums">
                  {world === "richest" ? formatEuro(r.score) : formatCount(r.score)}
                </span>
                {world === "richest" ? (
                  <Button size="sm" onClick={() => !needAuth() && setDonateTo(r.username)}>
                    Donate
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={Boolean(myVote)}
                    onClick={async () => {
                      if (needAuth()) return;
                      const res = await vote({ data: { world: "famous", targetId: r.userId } });
                      if (!res.ok) toast.error(res.error ?? "");
                      else toast.success("Stimme gesetzt.");
                      await reload();
                    }}
                  >
                    Vote
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {donateTo ? (
        <DonateDialog
          username={donateTo}
          busy={busy}
          onClose={() => setDonateTo(null)}
          onSubmit={async (amount) => {
            setBusy(true);
            try {
              const res = await donate({ data: { username: donateTo, amountEuros: amount } });
              if (!res.ok) toast.error(res.error ?? "");
              else if (res.overtake)
                toast.success(`Overbid. @${donateTo} hat @${res.overtake} überholt.`);
              else toast.success("Payment verifiziert.");
              setDonateTo(null);
              await reload();
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}
    </AppShell>
  );
}
