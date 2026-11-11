import { useEffect, useState } from "react";
import { Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";
import { AvatarMark } from "@/components/mark/avatar-mark";

export function CallScreen({
  name,
  avatar,
  onEnd,
}: {
  name: string;
  avatar?: string;
  onEnd: () => void;
}) {
  const [sec, setSec] = useState(0);
  const [muted, setMuted] = useState(false);
  const [ringing, setRinging] = useState(true);

  useEffect(() => {
    const ring = window.setTimeout(() => setRinging(false), 1800);
    return () => window.clearTimeout(ring);
  }, []);

  useEffect(() => {
    if (ringing) return;
    const id = window.setInterval(() => setSec((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [ringing]);

  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-between bg-[#0b0c0e] px-6 py-10 text-white">
      <div className="pt-10 text-center">
        <p className="text-sm text-white/60">{ringing ? "Klingelt…" : "Anruf"}</p>
        <h1 className="mt-2 text-2xl font-bold">{name}</h1>
        <p className="mt-1 text-sm text-white/50">{ringing ? "Verbinden" : `${mm}:${ss}`}</p>
      </div>
      <span className={ringing ? "animate-pulse rounded-full ring-4 ring-white/20" : "rounded-full"}>
        <AvatarMark username={name.replace(/^@/, "")} avatarKey={avatar} size={128} />
      </span>
      <p className="text-center text-xs text-white/40">Nur Vorschau — noch kein echtes Telefonat.</p>
      <div className="flex items-center gap-6 pb-4">
        <button
          type="button"
          onClick={() => setMuted((v) => !v)}
          className="grid size-14 place-items-center rounded-full bg-white/10"
        >
          {muted ? <MicOff className="size-6" /> : <Mic className="size-6" />}
        </button>
        <button
          type="button"
          onClick={onEnd}
          className="grid size-16 place-items-center rounded-full bg-danger"
        >
          <PhoneOff className="size-7" />
        </button>
        <button type="button" className="grid size-14 place-items-center rounded-full bg-white/10">
          <Volume2 className="size-6" />
        </button>
      </div>
    </div>
  );
}
