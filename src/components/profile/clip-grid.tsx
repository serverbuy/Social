import { Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { isVideoClip, type ProfileClip } from "@/lib/media";

export function ClipGrid({
  clips,
  editable,
  onAdd,
  onDelete,
}: {
  clips: ProfileClip[];
  editable?: boolean;
  onAdd?: () => void;
  onDelete?: (id: number) => void;
}) {
  const [playing, setPlaying] = useState<number | null>(null);
  const vids = useRef<Record<number, HTMLVideoElement | null>>({});

  function toggle(id: number, video: boolean) {
    const el = vids.current[id];
    if (video && el) {
      if (playing === id) {
        el.pause();
        setPlaying(null);
      } else {
        Object.values(vids.current).forEach((v) => v?.pause());
        void el.play();
        setPlaying(id);
      }
      return;
    }
    setPlaying((p) => (p === id ? null : id));
  }

  return (
    <div>
      {editable ? (
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-9 items-center gap-1 rounded-full bg-primary px-3.5 text-sm font-semibold text-white"
        >
          <Plus className="size-4" />
          Clip
        </button>
      ) : null}
      {clips.length === 0 ? (
        <p className="mt-6 text-sm text-muted">{editable ? "Noch keine Clips." : "Keine Clips."}</p>
      ) : (
        <ul className="mt-4 grid max-w-md grid-cols-2 gap-3">
          {clips.map((c) => (
            <li key={c.id} className="relative overflow-hidden rounded-2xl bg-elevated">
              <button type="button" className="block w-full" onClick={() => toggle(c.id, isVideoClip(c.mediaKey))}>
                {isVideoClip(c.mediaKey) ? (
                  <video
                    ref={(n) => {
                      vids.current[c.id] = n;
                    }}
                    src={c.mediaKey}
                    className="aspect-[4/5] w-full object-cover"
                    playsInline
                    loop
                    muted
                  />
                ) : (
                  <img src={c.mediaKey} alt="" className="aspect-[4/5] w-full object-cover" />
                )}
              </button>
              {editable ? (
                <button
                  type="button"
                  className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/50 text-white"
                  aria-label="Clip löschen"
                  onClick={() => onDelete?.(c.id)}
                >
                  <Trash2 className="size-3.5" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
