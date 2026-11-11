import { useRef, useState, type PointerEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { joinServer } from "@/lib/server/community";
import type { ServerRow } from "@/lib/types";

const ORDER = ["famous", "richest", "duo"] as const;

export function ServerStrip({
  servers,
  onJoined,
}: {
  servers: ServerRow[];
  onJoined: () => void;
}) {
  const navigate = useNavigate();
  const featured = ORDER.map((slug) => servers.find((s) => s.slug === slug)).filter(
    (s): s is ServerRow => Boolean(s),
  );
  const extra = servers.filter((s) => s.slug === "forum" || s.slug === "hall");
  const [active, setActive] = useState(0);
  const [drag, setDrag] = useState(0);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const axis = useRef<"x" | "y" | null>(null);
  const last = useRef(0);
  const width = useRef(1);
  const track = useRef<HTMLDivElement>(null);

  function go(i: number) {
    setActive(Math.max(0, Math.min(featured.length - 1, i)));
    setDrag(0);
    last.current = 0;
    axis.current = null;
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button,a")) return;
    dragging.current = true;
    axis.current = null;
    startX.current = e.clientX;
    startY.current = e.clientY;
    width.current = track.current?.parentElement?.clientWidth || 1;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (!axis.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      axis.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (axis.current !== "x") return;
    last.current = dx;
    setDrag(dx);
  }
  function onUp() {
    if (!dragging.current) return;
    dragging.current = false;
    const dx = last.current;
    const w = width.current || 1;
    if (axis.current === "x" && Math.abs(dx) > Math.min(56, w * 0.16)) {
      if (dx < 0) go(active + 1);
      else go(active - 1);
    } else setDrag(0);
    last.current = 0;
    axis.current = null;
  }

  async function enter(s: ServerRow) {
    if (!s.joined) {
      const res = await joinServer({ data: { id: s.id } });
      if (!res.ok) {
        toast.error(res.error ?? "Join fehlgeschlagen.");
        return;
      }
      onJoined();
    }
    if (s.slug === "forum") void navigate({ to: "/forum" });
    else if (s.slug === "hall") void navigate({ to: "/hall" });
    else void navigate({ to: "/servers/$id", params: { id: String(s.id) } });
  }

  const pct = -active * 100 + (width.current ? (drag / width.current) * 100 : 0);

  return (
    <div>
      {featured.length > 0 ? (
        <>
          <div className="mb-3 flex justify-center gap-2">
            {featured.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => go(i)}
                className={cn(
                  "h-9 rounded-full px-4 text-sm font-semibold",
                  i === active ? "bg-primary text-white" : "bg-elevated text-muted",
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
          <div
            className="overflow-hidden touch-pan-y"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            <div
              ref={track}
              className="flex will-change-transform"
              style={{
                transform: `translateX(${pct}%)`,
                transition: drag !== 0 ? "none" : "transform 260ms ease",
              }}
            >
              {featured.map((s) => (
                <div key={s.id} className="w-full shrink-0 px-4">
                  <article className="rounded-2xl bg-surface p-5 sm:p-6">
                    <p className="text-xs text-subtle">Standard-Server</p>
                    <h2 className="mt-1 text-2xl font-bold">{s.name}</h2>
                    <p className="mt-2 text-sm text-muted">{s.description}</p>
                    <p className="mt-3 text-xs text-subtle">{s.memberCount} Mitglieder</p>
                    <div className="mt-5 flex gap-2">
                      <Button onClick={() => void enter(s)}>{s.joined ? "Öffnen" : "Join"}</Button>
                      {s.joined ? (
                        <Link
                          to="/servers/$id"
                          params={{ id: String(s.id) }}
                          className="inline-flex h-11 items-center rounded-full bg-elevated px-4 text-sm font-semibold"
                        >
                          Chat
                        </Link>
                      ) : null}
                    </div>
                  </article>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {extra.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 px-4">
          {extra.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => void enter(s)}
              className="rounded-2xl bg-surface px-4 py-4 text-left"
            >
              <span className="block text-sm font-bold">{s.name}</span>
              <span className="mt-1 block text-xs text-subtle">
                {s.joined ? "Öffnen" : "Join"} · {s.memberCount}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
