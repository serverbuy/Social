export const THEMES = [
  {
    id: "dark",
    label: "Dunkel",
    primary: "#5865f2",
    gradient: "linear-gradient(180deg, #1a1b1e 0%, #111214 100%)",
  },
  {
    id: "midnight",
    label: "Midnight",
    primary: "#7c6af7",
    gradient: "linear-gradient(165deg, #16122a 0%, #0b0c10 45%, #0e1624 100%)",
  },
  {
    id: "sunset",
    label: "Sunset",
    primary: "#ff6b4a",
    gradient: "linear-gradient(160deg, #4a1f28 0%, #241318 40%, #3a2210 100%)",
  },
  {
    id: "ocean",
    label: "Ocean",
    primary: "#2eb8c7",
    gradient: "linear-gradient(165deg, #123848 0%, #10222c 50%, #0e2a24 100%)",
  },
  {
    id: "violet",
    label: "Violet",
    primary: "#a855f7",
    gradient: "linear-gradient(160deg, #2d1848 0%, #1b1328 50%, #1a1030 100%)",
  },
  {
    id: "forest",
    label: "Forest",
    primary: "#3dd68c",
    gradient: "linear-gradient(165deg, #163024 0%, #102018 50%, #0c1812 100%)",
  },
  {
    id: "rose",
    label: "Rose",
    primary: "#f472b6",
    gradient: "linear-gradient(160deg, #3a1528 0%, #1c1018 50%, #2a1220 100%)",
  },
  {
    id: "neon",
    label: "Neon",
    primary: "#22d3ee",
    gradient: "linear-gradient(165deg, #081820 0%, #05080c 45%, #101018 100%)",
  },
  {
    id: "ember",
    label: "Ember",
    primary: "#f59e0b",
    gradient: "linear-gradient(160deg, #2c1a0c 0%, #1a120c 50%, #24140c 100%)",
  },
  {
    id: "obsidian",
    label: "Obsidian",
    primary: "#d4af37",
    gradient: "radial-gradient(120% 80% at 20% 0%, #2a220c 0%, #050505 55%)",
  },
  {
    id: "aurora",
    label: "Aurora",
    primary: "#5eead4",
    gradient: "linear-gradient(145deg, #12382e 0%, #07141a 40%, #1a1438 100%)",
  },
  {
    id: "ice",
    label: "Ice",
    primary: "#7dd3fc",
    gradient: "linear-gradient(180deg, #163050 0%, #0b1220 55%, #0a1828 100%)",
  },
  {
    id: "wine",
    label: "Wine",
    primary: "#fb7185",
    gradient: "linear-gradient(160deg, #4a1020 0%, #1a0a10 50%, #2a0814 100%)",
  },
  {
    id: "graphite",
    label: "Graphite",
    primary: "#e4e4e7",
    gradient: "linear-gradient(180deg, #1c1c20 0%, #141416 100%)",
  },
  {
    id: "light",
    label: "Hell",
    primary: "#5865f2",
    gradient: "linear-gradient(180deg, #e8ebf4 0%, #f2f3f5 100%)",
  },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const THEME_KEY = "social-theme";
export const DEFAULT_THEME: ThemeId = "dark";

export function isThemeId(v: string | null | undefined): v is ThemeId {
  return THEMES.some((t) => t.id === v);
}
