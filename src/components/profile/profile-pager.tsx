import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/layout/i18n-context";

export function ProfilePager({
  profile,
  clips,
}: {
  profile: ReactNode;
  clips: ReactNode;
}) {
  const { t } = useI18n();
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
    setActive(i < 0 ? 0 : i > 1 ? 1 : i);
    setDrag(0);
    last.current = 0;
    axis.current = null;
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button,a,input,textarea,video,label")) return;
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

  const pct = -active * 100 + (width.current ? (drag / width.current) * 100 : 0);
  const tabs = [
    { i: 0, label: t("profile") },
    { i: 1, label: t("clips") },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="min-h-0 flex-1 overflow-hidden touch-pan-y"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div
          ref={track}
          className="flex h-full will-change-transform"
          style={{
            transform: `translateX(${pct}%)`,
            transition: drag !== 0 ? "none" : "transform 260ms ease",
          }}
        >
          <div className="h-full w-full shrink-0 overflow-y-auto">{profile}</div>
          <div className="h-full w-full shrink-0 overflow-y-auto px-4 py-4 sm:px-6">{clips}</div>
        </div>
      </div>
      <nav className="flex border-t border-line pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => (
          <button
            key={tab.i}
            type="button"
            onClick={() => go(tab.i)}
            className={cn(
              "flex-1 py-3 text-sm font-semibold",
              tab.i === active ? "text-fg" : "text-subtle",
            )}
          >
            {tab.label}
            <span
              className={cn(
                "mx-auto mt-1 block h-0.5 w-10 rounded-full",
                tab.i === active ? "bg-fg" : "bg-transparent",
              )}
            />
          </button>
        ))}
      </nav>
    </div>
  );
}
