export const WIDGET_IDS = ["music", "game", "friends", "since"] as const;
export type WidgetId = (typeof WIDGET_IDS)[number];

export function parseWidgets(raw?: string | null): WidgetId[] {
  return String(raw || "")
    .split(",")
    .map((x) => x.trim())
    .filter((x): x is WidgetId => WIDGET_IDS.includes(x as WidgetId));
}

export function widgetOn(raw: string | undefined, id: WidgetId) {
  return parseWidgets(raw).includes(id);
}

export function toggleWidget(raw: string | undefined, id: WidgetId) {
  const cur = parseWidgets(raw);
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  return next.join(",");
}

export function normalizeMusicLink(url: string) {
  let t = url.trim();
  if (!t) return "";
  if (t.startsWith("spotify:")) {
    const parts = t.split(":");
    if (parts[1] && parts[2]) t = `https://open.spotify.com/${parts[1]}/${parts[2]}`;
  }
  if (!/^https?:\/\//i.test(t)) t = `https://${t}`;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return u.toString().slice(0, 400);
  } catch {
    return "";
  }
}

export function labelFromLink(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("spotify")) return "Spotify";
    if (host.includes("youtu")) return "YouTube";
    if (host.includes("soundcloud")) return "SoundCloud";
    if (host.includes("apple")) return "Apple Music";
    return host;
  } catch {
    return "Link";
  }
}

export function youtubeId(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? "";
}

export async function fetchMusicMeta(url: string): Promise<{ title: string; cover: string; link: string }> {
  const link = normalizeMusicLink(url);
  if (!link) return { title: "", cover: "", link: "" };
  const yt = youtubeId(link);
  if (yt) {
    return {
      title: "YouTube",
      cover: `https://img.youtube.com/vi/${yt}/hqdefault.jpg`,
      link,
    };
  }
  if (link.includes("spotify.com")) {
    try {
      const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(link)}`);
      if (res.ok) {
        const j = (await res.json()) as { title?: string; thumbnail_url?: string };
        return {
          title: String(j.title || "Spotify").slice(0, 60),
          cover: String(j.thumbnail_url || ""),
          link,
        };
      }
    } catch {
      /* ignore */
    }
    return { title: "Spotify", cover: "", link };
  }
  return { title: labelFromLink(link), cover: "", link };
}
