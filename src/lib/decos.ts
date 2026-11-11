export const DECOS = [
  { id: "", label: "Keine" },
  { id: "rain", label: "Regen" },
  { id: "snow", label: "Schnee" },
  { id: "spark", label: "Sparkle" },
  { id: "embers", label: "Embers" },
  { id: "storm", label: "Blitz" },
  { id: "confetti", label: "Konfetti" },
  { id: "aurora", label: "Aurora" },
  { id: "matrix", label: "Matrix" },
] as const;

export type DecoId = (typeof DECOS)[number]["id"];

export function isDecoId(v: string | null | undefined): v is DecoId {
  return DECOS.some((d) => d.id === v);
}
