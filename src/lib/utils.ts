import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function iso(v: unknown) {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString();
  const d = new Date(String(v));
  return Number.isFinite(d.getTime()) ? d.toISOString() : String(v);
}

export function timeAgo(value: string) {
  const t = new Date(value).getTime();
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 45) return "jetzt";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(t).toLocaleDateString();
}

export function formatEuro(cents: number) {
  return (num(cents) / 100).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

export function formatCount(n: number) {
  const v = num(n);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}m`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}

export function rankLabel(n: number) {
  const v = num(n);
  const j = v % 10;
  const k = v % 100;
  if (j === 1 && k !== 11) return `${v}st`;
  if (j === 2 && k !== 12) return `${v}nd`;
  if (j === 3 && k !== 13) return `${v}rd`;
  return `${v}th`;
}

export function pairKey(a: string, b: string) {
  return a < b ? ([a, b] as const) : ([b, a] as const);
}

export function dmChannelId(a: string, b: string) {
  const [x, y] = pairKey(a, b);
  return `${x}:${y}`;
}

export function channelEmoji(name: string) {
  const m = name.trim().match(/^\p{Extended_Pictographic}\uFE0F?/u);
  return m?.[0] ?? "";
}
