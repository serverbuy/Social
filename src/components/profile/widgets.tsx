import { useEffect, useRef, useState } from "react";
import { Gamepad2, MoreHorizontal, Music, Pause, Play, Trash2, Users } from "lucide-react";
import { isPhotoAvatar } from "@/lib/avatar";
import { labelFromLink, widgetOn } from "@/lib/widgets";
import { useI18n } from "@/components/layout/i18n-context";
import type { Profile } from "@/lib/types";

function Cover({ src, name, className }: { src: string; name: string; className?: string }) {
  if (isPhotoAvatar(src)) {
    return <img src={src} alt="" className={className ?? "size-full object-cover"} />;
  }
  const hue = ((name || "S").charCodeAt(0) * 17) % 360;
  return (
    <span
      className={className ?? "grid size-full place-items-center"}
      style={{
        background: `linear-gradient(145deg, hsl(${hue} 62% 44%), hsl(${(hue + 50) % 360} 45% 16%))`,
      }}
    >
      <Music className="size-10 text-white/90" />
    </span>
  );
}

export function MusicWidget({
  name,
  src,
  cover,
  link,
  username,
  editable,
  onAdd,
  onCover,
  onLink,
  onName,
  onRemove,
}: {
  name: string;
  src: string;
  cover: string;
  link: string;
  username: string;
  editable?: boolean;
  onAdd?: () => void;
  onCover?: () => void;
  onLink?: (url: string) => void;
  onName?: (name: string) => void;
  onRemove?: () => void;
}) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [menu, setMenu] = useState(false);
  const [linkDraft, setLinkDraft] = useState(link);
  const [titleDraft, setTitleDraft] = useState(name);

  useEffect(() => setLinkDraft(link), [link]);
  useEffect(() => setTitleDraft(name), [name]);
  useEffect(() => () => audio.current?.pause(), [src]);

  const has = Boolean(src || link);
  if (!has && !editable) return null;
  const title = titleDraft || name || (link ? labelFromLink(link) : "Song");

  async function toggle() {
    if (src) {
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
      } else audio.current.pause();
      return;
    }
    if (link) window.open(link, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface">
      <div className="flex items-center gap-3 p-2.5">
        <button
          type="button"
          className="relative size-[4.5rem] shrink-0 overflow-hidden rounded-xl"
          onClick={editable ? onCover : undefined}
        >
          <Cover src={cover} name={title} className="size-full object-cover" />
        </button>
        <div className="min-w-0 flex-1">
          {editable ? (
            <input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => onName?.(titleDraft.trim())}
              placeholder="Songname"
              className="w-full bg-transparent text-[15px] font-bold outline-none"
            />
          ) : (
            <p className="truncate text-[15px] font-bold">{title}</p>
          )}
          <p className="truncate text-xs text-subtle">@{username}</p>
        </div>
        {has ? (
          <button
            type="button"
            onClick={() => void toggle()}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-fg text-bg"
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
          </button>
        ) : null}
        {editable ? (
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            className="grid size-8 shrink-0 place-items-center rounded-full text-subtle hover:bg-elevated"
          >
            <MoreHorizontal className="size-4" />
          </button>
        ) : null}
      </div>
      {menu ? (
        <div className="absolute right-2 top-14 z-20 w-56 rounded-xl bg-elevated p-2 shadow-xl ring-1 ring-line">
          <input
            value={linkDraft}
            onChange={(e) => setLinkDraft(e.target.value)}
            onBlur={() => {
              onLink?.(linkDraft.trim());
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onLink?.(linkDraft.trim());
                setMenu(false);
              }
            }}
            placeholder="Spotify / YouTube Link"
            className="mb-2 w-full rounded-lg bg-surface px-2 py-2 text-xs outline-none"
          />
          <button type="button" className="block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-surface" onClick={onCover}>
            Cover
          </button>
          <button type="button" className="block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-surface" onClick={onAdd}>
            Datei
          </button>
          {has ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-danger hover:bg-surface"
              onClick={onRemove}
            >
              <Trash2 className="size-3.5" /> Weg
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function GameWidget({
  game,
  editable,
  onSave,
}: {
  game: string;
  editable?: boolean;
  onSave?: (name: string) => void;
}) {
  const [draft, setDraft] = useState(game);
  useEffect(() => setDraft(game), [game]);
  if (!game && !editable) return null;
  return (
    <div className="flex items-center gap-3 overflow-hidden rounded-2xl bg-surface">
      <span
        className="grid size-14 place-items-center text-white"
        style={{ background: "linear-gradient(160deg,#7c3aed,#db2777)" }}
      >
        <Gamepad2 className="size-6" />
      </span>
      <div className="min-w-0 flex-1 py-2.5 pr-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-subtle">Spielt gerade</p>
        {editable ? (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => onSave?.(draft)}
            placeholder="Fortnite, GTA, …"
            className="w-full bg-transparent text-[15px] font-bold outline-none"
          />
        ) : (
          <p className="truncate text-[15px] font-bold">{game}</p>
        )}
      </div>
    </div>
  );
}

export function FriendsWidget({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2.5">
      <span className="grid size-9 place-items-center rounded-full bg-primary/20 text-primary">
        <Users className="size-4" />
      </span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-subtle">Friends</p>
        <p className="text-[15px] font-bold">{count}</p>
      </div>
    </div>
  );
}

export function SinceWidget({ createdAt }: { createdAt: string }) {
  const { t, lang } = useI18n();
  const d = createdAt ? new Date(createdAt) : null;
  const ok = d && Number.isFinite(d.getTime());
  const label = ok
    ? d.toLocaleDateString(lang === "de" ? "de-DE" : "en-US", { month: "long", year: "numeric" })
    : "—";
  return (
    <p className="px-1 text-sm text-fg/90">
      {t("widgetSince")} {label}
    </p>
  );
}

export function ProfileWidgets({
  profile,
  editable,
  onAddSong,
  onCover,
  onLink,
  onName,
  onRemoveSong,
  onGame,
}: {
  profile: Profile;
  editable?: boolean;
  onAddSong?: () => void;
  onCover?: () => void;
  onLink?: (url: string) => void;
  onName?: (name: string) => void;
  onRemoveSong?: () => void;
  onGame?: (name: string) => void;
}) {
  const w = profile.widgets;
  const showMusic = widgetOn(w, "music");
  const showGame = widgetOn(w, "game");
  const showFriends = widgetOn(w, "friends");
  const showSince = widgetOn(w, "since");
  if (!showMusic && !showGame && !showFriends && !showSince) return null;
  return (
    <div className="mt-5 space-y-3">
      {showMusic ? (
        <MusicWidget
          name={profile.songName}
          src={profile.songData}
          cover={profile.songCover}
          link={profile.songLink}
          username={profile.username}
          editable={editable}
          onAdd={onAddSong}
          onCover={onCover}
          onLink={onLink}
          onName={onName}
          onRemove={onRemoveSong}
        />
      ) : null}
      {showGame ? <GameWidget game={profile.gameName} editable={editable} onSave={onGame} /> : null}
      {showFriends ? <FriendsWidget count={profile.friendsCount} /> : null}
      {showSince ? <SinceWidget createdAt={profile.createdAt} /> : null}
    </div>
  );
}
