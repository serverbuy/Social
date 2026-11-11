export const BADGES = [
  { id: "", label: "Keine", kind: "none" as const, color: "#4e5058", src: "" },
  { id: "mod", label: "Moderator", kind: "img" as const, color: "#a855f7", src: "/badges/mod.png" },
  { id: "artist", label: "Music Artist", kind: "img" as const, color: "#3b82f6", src: "/badges/artist.png" },
  { id: "blue", label: "Verified", kind: "burst" as const, color: "#1d9bf0", src: "" },
  { id: "gold", label: "Gold", kind: "burst" as const, color: "#f5c542", src: "" },
  { id: "green", label: "OG", kind: "burst" as const, color: "#23a559", src: "" },
  { id: "purple", label: "Nitro", kind: "burst" as const, color: "#a855f7", src: "" },
  { id: "red", label: "Staff", kind: "burst" as const, color: "#ed4245", src: "" },
  { id: "cyan", label: "Early", kind: "burst" as const, color: "#2eb8c7", src: "" },
  { id: "pink", label: "Partner", kind: "burst" as const, color: "#f472b6", src: "" },
  { id: "white", label: "Star", kind: "burst" as const, color: "#f2f3f5", src: "" },
] as const;

export type BadgeId = (typeof BADGES)[number]["id"];

export function getBadge(id: string | undefined) {
  return BADGES.find((b) => b.id === id);
}

export function badgeColor(id: string | undefined) {
  return getBadge(id)?.color ?? "#1d9bf0";
}

export function badgeLabel(id: string | undefined) {
  return getBadge(id)?.label ?? "";
}

export function isBadgeId(v: string | null | undefined): v is BadgeId {
  return BADGES.some((b) => b.id === v);
}
