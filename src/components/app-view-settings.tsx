import { useState } from "react";
import { cn } from "@/lib/utils";

/** Brücke zur Android-App (nur vorhanden, wenn @social als APK läuft). */
type AppBridge = {
  getMode(): string;
  setMode(mode: string): void;
  getButton(): boolean;
  setButton(show: boolean): void;
};

function getBridge(): AppBridge | null {
  if (typeof window === "undefined") return null;
  return ((window as unknown as { SocialApp?: AppBridge }).SocialApp ?? null);
}

const MODES: Array<{ id: string; label: string; desc: string }> = [
  { id: "portrait", label: "📱 Handy · hochkant", desc: "Normale Handy-Ansicht" },
  { id: "auto", label: "🔄 Handy · automatisch drehen", desc: "Dreht sich mit, wenn du das Handy kippst" },
  { id: "landscape", label: "↔️ Handy · quer", desc: "Handy-Layout im Querformat" },
  { id: "desktop", label: "🖥 Desktop · quer", desc: "PC-Layout mit Seitenleiste wie am Computer" },
];

/** Einstellungen für Ausrichtung & Desktop-Ansicht – erscheint nur in der Android-App. */
export function AppViewSettings() {
  const [bridge] = useState(getBridge);
  const [mode, setMode] = useState(() => bridge?.getMode() ?? "portrait");
  const [button, setButton] = useState(() => bridge?.getButton() ?? false);
  if (!bridge) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-subtle">
        App-Ansicht
      </h2>
      <div className="overflow-hidden rounded-2xl bg-surface">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setMode(m.id);
              bridge.setMode(m.id);
            }}
            className="flex w-full items-center gap-3 border-b border-line px-4 py-3.5 text-left last:border-b-0 hover:bg-elevated/50"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium">{m.label}</span>
              <span className="block text-xs text-subtle">{m.desc}</span>
            </span>
            <span
              className={cn("size-5 shrink-0 rounded-full border-2")}
              style={{
                borderColor: mode === m.id ? "var(--color-primary)" : "rgba(255,255,255,0.25)",
                background: mode === m.id ? "var(--color-primary)" : "transparent",
              }}
            />
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            const next = !button;
            setButton(next);
            bridge.setButton(next);
          }}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-elevated/50"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium">Schnell-Umschalter am Rand</span>
            <span className="block text-xs text-subtle">Kleiner Knopf zum Wechseln zwischen Handy und Desktop</span>
          </span>
          <span
            className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
            style={{ background: button ? "var(--color-primary)" : "rgba(255,255,255,0.18)" }}
          >
            <span
              className="absolute top-0.5 size-5 rounded-full bg-white transition-all"
              style={{ left: button ? 22 : 2 }}
            />
          </span>
        </button>
      </div>
    </section>
  );
}
