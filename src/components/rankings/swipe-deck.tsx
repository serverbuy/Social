import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Link } from "@tanstack/react-router";
import { cn, formatCount, formatEuro, rankLabel } from "@/lib/utils";
import type { DuoRow, RankRow } from "@/lib/types";
import { AvatarMark } from "@/components/mark/avatar-mark";
import { Button } from "@/components/ui/button";

const WORLDS = [
  { id: "famous", label: "Famous" },
  { id: "richest", label: "Richest" },
  { id: "duo", label: "Duo" },
] as const;

export function SwipeDeck({
  famous,
  richest,
  duos,
  onVote,
  onDonate,
  onVoteDuo,
  myFamousVote,
  myDuoVote,
}: {
  famous: RankRow[];
  richest: RankRow[];
  duos: DuoRow[];
  onVote: (userId: string) => void;
  onDonate: (username: string) => void;
  onVoteDuo: (id: number) => void;
  myFamousVote: string | null;
  myDuoVote: string | null;
}) {
  const [active, setActive] = useState(0);
  const [drag, setDrag] = useState(0);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const axis = useRef<"x" | "y" | null>(null);
  const lastDrag = useRef(0);
  const widthRef = useRef(1);
  const track = useRef<HTMLDivElement>(null);

  function go(i: number) {
    setActive(Math.max(0, Math.min(2, i)));
    setDrag(0);
    lastDrag.current = 0;
    axis.current = null;
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft") go(active - 1);
      if (e.key === "ArrowRight") go(active + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button,a,input")) return;
    dragging.current = true;
    axis.current = null;
    startX.current = e.clientX;
    startY.current = e.clientY;
    widthRef.current = track.current?.parentElement?.clientWidth || 1;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (!axis.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      axis.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (axis.current !== "x") return;
    e.preventDefault();
    lastDrag.current = dx;
    setDrag(dx);
  }
  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    const dx = lastDrag.current;
    const w = widthRef.current || 1;
    if (axis.current === "x" && Math.abs(dx) > Math.min(72, w * 0.18)) {
      if (dx < 0) go(active + 1);
      else go(active - 1);
    } else {
      setDrag(0);
    }
    lastDrag.current = 0;
    axis.current = null;
  }

  const pct = -active * 100 + (widthRef.current ? (drag / widthRef.current) * 100 : 0);

  return (
    <div>
      <div className="mb-3 flex justify-center gap-2">
        {WORLDS.map((w, i) => (
          <button
            key={w.id}
            type="button"
            onClick={() => go(i)}
            className={cn(
              "h-9 rounded-full px-4 text-sm font-semibold",
              i === active ? "bg-primary text-white" : "bg-elevated text-muted",
            )}
          >
            {w.label}
          </button>
        ))}
      </div>
      <div
        className="overflow-hidden touch-pan-y"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          ref={track}
          className="flex will-change-transform"
          style={{
            transform: `translateX(${pct}%)`,
            transition: dragging.current || drag !== 0 ? "none" : "transform 280ms ease",
          }}
        >
          <div className="w-full shrink-0">
            <FamousPanel rows={famous} onVote={onVote} myVote={myFamousVote} />
          </div>
          <div className="w-full shrink-0">
            <RichestPanel rows={richest} onDonate={onDonate} />
          </div>
          <div className="w-full shrink-0">
            <DuoPanel rows={duos} onVote={onVoteDuo} myVote={myDuoVote} />
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-center gap-1.5">
        {WORLDS.map((w, i) => (
          <span
            key={w.id}
            className={cn("h-1.5 rounded-full", i === active ? "w-6 bg-primary" : "w-1.5 bg-subtle")}
          />
        ))}
      </div>
    </div>
  );
}

function FamousPanel({
  rows,
  onVote,
  myVote,
}: {
  rows: RankRow[];
  onVote: (id: string) => void;
  myVote: string | null;
}) {
  const lead = rows[0];
  if (!lead) return <EmptyPanel title="Famous" />;
  return (
    <article className="rounded-2xl bg-surface p-5 sm:p-6">
      <Header title="Most Famous" world="famous" />
      <Lead
        rank={lead.rank}
        username={lead.username}
        display={lead.displayName}
        avatar={lead.avatarKey}
        meta={`${formatCount(lead.score)} Stimmen`}
        trend={lead.trend}
      />
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={() => onVote(lead.userId)} disabled={Boolean(myVote)}>
          {myVote === lead.userId ? "Deine Stimme" : myVote ? "Stimme vergeben" : "Vote"}
        </Button>
        <Link
          to="/u/$username"
          params={{ username: lead.username }}
          className="inline-flex h-11 items-center rounded-full bg-elevated px-4 text-sm font-semibold"
        >
          Profil
        </Link>
      </div>
      <Rest rows={rows.slice(1, 5)} kind="votes" />
    </article>
  );
}

function RichestPanel({
  rows,
  onDonate,
}: {
  rows: RankRow[];
  onDonate: (username: string) => void;
}) {
  const lead = rows[0];
  if (!lead) return <EmptyPanel title="Richest" />;
  return (
    <article className="rounded-2xl bg-surface p-5 sm:p-6">
      <Header title="Richest" world="richest" />
      <Lead
        rank={lead.rank}
        username={lead.username}
        display={lead.displayName}
        avatar={lead.avatarKey}
        meta={formatEuro(lead.score)}
        trend={0}
      />
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={() => onDonate(lead.username)}>Donate</Button>
        <Link
          to="/u/$username"
          params={{ username: lead.username }}
          className="inline-flex h-11 items-center rounded-full bg-elevated px-4 text-sm font-semibold"
        >
          Profil
        </Link>
      </div>
      <Rest rows={rows.slice(1, 5)} kind="money" />
    </article>
  );
}

function DuoPanel({
  rows,
  onVote,
  myVote,
}: {
  rows: DuoRow[];
  onVote: (id: number) => void;
  myVote: string | null;
}) {
  const lead = rows[0];
  if (!lead) return <EmptyPanel title="Duo" />;
  return (
    <article className="rounded-2xl bg-surface p-5 sm:p-6">
      <Header title="Best Duo" world="duo" />
      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-subtle">{rankLabel(lead.rank)}</p>
          <Link to="/duo/$id" params={{ id: String(lead.id) }} className="mt-1 block text-2xl font-bold">
            {lead.name}
          </Link>
          <p className="mt-1 text-sm text-muted">
            @{lead.a.username} × @{lead.b.username}
          </p>
          <p className="mt-3 text-sm tabular-nums">{formatCount(lead.score)} Stimmen</p>
        </div>
        <div className="flex -space-x-3">
          <AvatarMark username={lead.a.username} avatarKey={lead.a.avatarKey} size={56} />
          <AvatarMark username={lead.b.username} avatarKey={lead.b.avatarKey} size={56} />
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={() => onVote(lead.id)} disabled={Boolean(myVote)}>
          {myVote === String(lead.id) ? "Deine Stimme" : myVote ? "Stimme vergeben" : "Vote"}
        </Button>
        <Link
          to="/duo/$id"
          params={{ id: String(lead.id) }}
          className="inline-flex h-11 items-center rounded-full bg-elevated px-4 text-sm font-semibold"
        >
          Duo
        </Link>
      </div>
      <ul className="mt-5 space-y-2">
        {rows.slice(1, 5).map((d) => (
          <li key={d.id} className="flex items-center gap-3 text-sm">
            <span className="w-8 text-xs text-subtle">{rankLabel(d.rank)}</span>
            <Link to="/duo/$id" params={{ id: String(d.id) }} className="min-w-0 flex-1 truncate">
              {d.name}
            </Link>
            <span className="tabular-nums text-xs text-muted">{formatCount(d.score)}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function Lead({
  rank,
  username,
  display,
  avatar,
  meta,
  trend,
}: {
  rank: number;
  username: string;
  display: string;
  avatar: string;
  meta: string;
  trend: number;
}) {
  return (
    <div className="mt-5 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs text-subtle">{rankLabel(rank)}</p>
        <Link to="/u/$username" params={{ username }} className="mt-1 block text-2xl font-bold">
          @{username}
        </Link>
        <p className="mt-1 text-sm text-muted">{display}</p>
        <p className="mt-3 text-sm tabular-nums">
          {meta}
          {trend !== 0 ? (
            <span className="ml-3 text-xs text-subtle">
              {trend > 0 ? "▲" : "▼"} {Math.abs(trend)}
            </span>
          ) : null}
        </p>
      </div>
      <AvatarMark username={username} avatarKey={avatar} size={72} />
    </div>
  );
}

function Rest({ rows, kind }: { rows: RankRow[]; kind: "votes" | "money" }) {
  return (
    <ul className="mt-5 space-y-2">
      {rows.map((r) => (
        <li key={r.userId} className="flex items-center gap-3 text-sm">
          <span className="w-8 text-xs text-subtle">{rankLabel(r.rank)}</span>
          <AvatarMark username={r.username} avatarKey={r.avatarKey} size={28} />
          <Link to="/u/$username" params={{ username: r.username }} className="min-w-0 flex-1 truncate">
            @{r.username}
          </Link>
          <span className="tabular-nums text-xs text-muted">
            {kind === "money" ? formatEuro(r.score) : formatCount(r.score)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Header({ title, world }: { title: string; world: "famous" | "richest" | "duo" }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-bold">{title}</h2>
      <Link to="/rankings/$world" params={{ world }} className="text-xs text-muted">
        Alle
      </Link>
    </div>
  );
}

function EmptyPanel({ title }: { title: string }) {
  return (
    <article className="rounded-2xl bg-surface p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-3 text-sm text-muted">Noch leer.</p>
    </article>
  );
}
