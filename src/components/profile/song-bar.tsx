import { useEffect, useRef, useState } from "react";
import { Music, Pause, Play, Trash2 } from "lucide-react";

export function SongBar({
  name,
  src,
  username,
  editable,
  onAdd,
  onRemove,
}: {
  name: string;
  src: string;
  username: string;
  editable?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
}) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      audio.current?.pause();
    };
  }, [src]);

  if (!src) {
    if (!editable) return null;
    return (
      <button
        type="button"
        onClick={onAdd}
        className="mt-4 flex w-full max-w-lg items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-left"
      >
        <span className="grid size-10 place-items-center rounded-full bg-primary text-white">
          <Music className="size-4" />
        </span>
        <span>
          <span className="block text-sm font-semibold">Song hinzufügen</span>
          <span className="text-xs text-subtle">Tippen und Datei wählen</span>
        </span>
      </button>
    );
  }

  async function toggle() {
    if (!audio.current) {
      audio.current = new Audio(src);
      audio.current.addEventListener("ended", () => setPlaying(false));
      audio.current.addEventListener("pause", () => setPlaying(false));
      audio.current.addEventListener("play", () => setPlaying(true));
    }
    if (audio.current.paused) {
      try {
        await audio.current.play();
      } catch {
        setPlaying(false);
      }
    } else {
      audio.current.pause();
    }
  }

  return (
    <div className="mt-4 flex w-full max-w-lg items-center gap-2">
      <button
        type="button"
        onClick={() => void toggle()}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-left"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-white">
          {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{name || "Song"}</span>
          <span className="text-xs text-subtle">@{username}</span>
        </span>
        {playing ? (
          <span className="flex h-4 items-end gap-0.5" aria-hidden>
            <i className="eq" />
            <i className="eq delay-75" />
            <i className="eq delay-150" />
          </span>
        ) : (
          <Music className="size-4 shrink-0 text-subtle" />
        )}
      </button>
      {editable ? (
        <button
          type="button"
          onClick={onRemove}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-subtle hover:text-danger"
          aria-label="Song entfernen"
        >
          <Trash2 className="size-4" />
        </button>
      ) : null}
      <style>{`
        .eq {
          display: block;
          width: 3px;
          height: 6px;
          border-radius: 2px;
          background: var(--color-primary);
          animation: eq 0.7s ease-in-out infinite alternate;
        }
        .eq.delay-75 { animation-delay: 0.1s; height: 10px; }
        .eq.delay-150 { animation-delay: 0.2s; height: 4px; }
        @keyframes eq {
          from { transform: scaleY(0.4); }
          to { transform: scaleY(1.4); }
        }
      `}</style>
    </div>
  );
}
