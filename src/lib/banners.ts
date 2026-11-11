export const BANNER_PRESETS = [
  { id: "", label: "Foto", css: "" },
  { id: "twilight", label: "Twilight", css: "linear-gradient(120deg,#312e81,#1e1b4b 40%,#111827)" },
  { id: "blaze", label: "Blaze", css: "linear-gradient(120deg,#9a3412,#7f1d1d 45%,#1c1917)" },
  { id: "mint", label: "Mint", css: "linear-gradient(120deg,#115e59,#164e63 50%,#0f172a)" },
  { id: "candy", label: "Candy", css: "linear-gradient(120deg,#9d174d,#6b21a8 50%,#1e1b4b)" },
  { id: "steel", label: "Steel", css: "linear-gradient(120deg,#334155,#1e293b 40%,#0f172a)" },
] as const;

export function bannerCss(id?: string) {
  return BANNER_PRESETS.find((b) => b.id === id)?.css ?? "";
}
