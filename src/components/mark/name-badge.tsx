import { useEffect, useState, type ReactNode } from "react";
import { badgeColor, badgeLabel, getBadge } from "@/lib/badges";

function burstPoints(cx: number, cy: number, spikes: number, outer: number, inner: number) {
  const pts: string[] = [];
  const count = spikes * 2;
  for (let i = 0; i < count; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return pts.join(" ");
}

export function BurstBadge({
  color,
  size = 18,
}: {
  color: string;
  size?: number;
}) {
  const check = color === "#f2f3f5" || color === "#f5c542" ? "#111214" : "#ffffff";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <polygon points={burstPoints(12, 12, 12, 11.2, 8)} fill={color} />
      <path
        d="M7.6 12.2l2.6 2.6 6.2-6.4"
        fill="none"
        stroke={check}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BadgeMark({ id, size = 18 }: { id: string; size?: number }) {
  const b = getBadge(id);
  if (!b || !b.id) return null;
  if (b.kind === "img") {
    return (
      <img
        src={b.src}
        alt=""
        width={size}
        height={size}
        className="inline-block shrink-0 object-contain"
        style={{ width: size, height: size, background: "transparent" }}
      />
    );
  }
  return <BurstBadge color={badgeColor(id)} size={size} />;
}

export function NameBadge({ badge, size = 20 }: { badge?: string; size?: number }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const tid = window.setTimeout(() => setOpen(false), 1600);
    return () => window.clearTimeout(tid);
  }, [open]);
  if (!badge) return null;
  return (
    <span className="relative ml-1 inline-flex align-middle">
      <button
        type="button"
        className="inline-flex"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        aria-label={badgeLabel(badge)}
      >
        <BadgeMark id={badge} size={size} />
      </button>
      {open ? (
        <span className="absolute left-1/2 top-full z-40 mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-fg px-2.5 py-1 text-[11px] font-semibold text-bg shadow-lg">
          {badgeLabel(badge)}
        </span>
      ) : null}
    </span>
  );
}

const SPARKS = [
  { x: "-10px", y: "-8px", d: "0s", s: 3 },
  { x: "12px", y: "-6px", d: "0.25s", s: 2 },
  { x: "-6px", y: "10px", d: "0.5s", s: 3 },
  { x: "14px", y: "8px", d: "0.15s", s: 2 },
  { x: "0px", y: "-12px", d: "0.4s", s: 2 },
  { x: "8px", y: "12px", d: "0.7s", s: 3 },
];

export function SparkleName({
  badge,
  children,
  size = 16,
}: {
  badge?: string;
  children: ReactNode;
  size?: number;
}) {
  const color = badge ? badgeColor(badge) : "";
  return (
    <span className="relative inline-flex max-w-full items-center">
      {badge
        ? SPARKS.map((s, i) => (
            <i
              key={i}
              className="spark-dot pointer-events-none absolute left-1/2 top-1/2 rounded-full"
              style={{
                width: s.s,
                height: s.s,
                background: color,
                boxShadow: `0 0 6px ${color}`,
                ["--sx" as string]: s.x,
                ["--sy" as string]: s.y,
                animationDelay: s.d,
              }}
            />
          ))
        : null}
      <span className="relative z-[1] inline-flex min-w-0 items-center">
        {children}
        <NameBadge badge={badge} size={size} />
      </span>
    </span>
  );
}

export function BadgeIcon({ id, size = 40 }: { id: string; size?: number }) {
  if (!id) return <span className="size-10 rounded-full bg-elevated" />;
  return <BadgeMark id={id} size={size} />;
}
