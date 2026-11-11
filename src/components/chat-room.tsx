import { ArrowLeft, ImagePlus, Reply, Search, Smile } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AvatarMark } from "@/components/mark/avatar-mark";
import { ChatLine } from "@/components/chat-line";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/layout/i18n-context";
import { compressChatImage } from "@/lib/avatar";
import { GIF_PREFIX, IMG_PREFIX } from "@/lib/media";
import { listTyping, setTyping } from "@/lib/server/live";
import { cn } from "@/lib/utils";
import type { ChatRow } from "@/lib/types";

const GIFS = [
  "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif",
  "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
  "https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif",
  "https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif",
  "https://media.giphy.com/media/11sBLVxNs7v6WA/giphy.gif",
  "https://media.giphy.com/media/3ohzdIuqJoo8QdKlnW/giphy.gif",
];

export function ChatRoom({
  title,
  subtitle,
  avatar,
  avatarName,
  onBack,
  onTitle,
  onOpenProfile,
  rows,
  meId,
  canModerate,
  onDelete,
  onSend,
  onReact,
  onPin,
  reload,
  pinned,
  toolbar,
  extra,
  onEdit,
  canWrite = true,
  showBack = true,
  channelType,
  channelId,
  seenId,
}: {
  title: string;
  subtitle?: string;
  avatar?: string;
  avatarName?: string;
  onBack: () => void;
  onTitle?: () => void;
  onOpenProfile?: (username: string) => void;
  rows: ChatRow[];
  meId?: string;
  canModerate?: boolean;
  onDelete: (id: number) => void;
  onSend: (body: string, replyTo?: number | null) => Promise<void>;
  onReact?: (id: number, emoji: string) => void;
  onPin?: (id: number) => void;
  reload?: () => Promise<void>;
  pinned?: ChatRow | null;
  toolbar?: ReactNode;
  extra?: ReactNode;
  onEdit?: (id: number, body: string) => void;
  canWrite?: boolean;
  showBack?: boolean;
  channelType?: string;
  channelId?: string;
  seenId?: number;
}) {
  const [body, setBody] = useState("");
  const [focus, setFocus] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [find, setFind] = useState(false);
  const [gifs, setGifs] = useState(false);
  const [reply, setReply] = useState<ChatRow | null>(null);
  const [typing, setTypingNames] = useState<string[]>([]);
  const end = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const typed = useRef(0);
  const { t } = useI18n();

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (m) => m.body.toLowerCase().includes(q) || m.authorUsername.toLowerCase().includes(q),
    );
  }, [rows, query]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [rows.length]);

  useEffect(() => {
    if (!reload) return;
    const id = window.setInterval(() => void reload(), 2000);
    return () => window.clearInterval(id);
  }, [reload]);

  useEffect(() => {
    if (!channelType || !channelId) return;
    const tick = () => {
      void listTyping({ data: { channelType, channelId } })
        .then(setTypingNames)
        .catch(() => {});
    };
    tick();
    const id = window.setInterval(tick, 2000);
    return () => window.clearInterval(id);
  }, [channelType, channelId]);

  async function send(text: string) {
    if (!text || busy) return;
    setBusy(true);
    try {
      await onSend(text, reply?.id ?? null);
      setBody("");
      setReply(null);
      setGifs(false);
    } finally {
      setBusy(false);
    }
  }

  const lastMine = [...rows].reverse().find((m) => m.authorId === meId);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-2 border-b border-line px-2 py-2">
        {showBack ? (
        <button
          type="button"
          onClick={onBack}
          className="grid size-11 place-items-center rounded-full hover:bg-surface"
          aria-label="Zurück"
        >
          <ArrowLeft className="size-6" />
        </button>
        ) : null}
        {avatarName ? (
          <button type="button" onClick={onTitle} className="shrink-0">
            <AvatarMark username={avatarName} avatarKey={avatar} size={36} />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onTitle}
          disabled={!onTitle}
          className="min-w-0 flex-1 py-1 text-left"
        >
          <h1 className="truncate text-base font-bold">{title}</h1>
          <p className="truncate text-xs text-subtle">
            {typing.length ? `${typing.map((u) => `@${u}`).join(", ")} schreibt…` : subtitle}
          </p>
        </button>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-full hover:bg-surface"
          onClick={() => setFind((v) => !v)}
          aria-label="Suche"
        >
          <Search className="size-5" />
        </button>
        {extra}
      </header>
      {find ? (
        <div className="border-b border-line px-3 py-2">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Im Chat suchen" />
        </div>
      ) : null}
      {toolbar}
      {pinned ? (
        <button
          type="button"
          className="border-b border-line bg-surface px-4 py-2 text-left text-xs text-muted"
        >
          Pin · {pinned.body.startsWith("img:") || pinned.body.startsWith("gif:") ? "Foto" : pinned.body.slice(0, 80)}
        </button>
      ) : null}
      <ul className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {shown.length === 0 ? (
          <li className="py-20 text-center text-sm text-muted">{t("writeFirst")}</li>
        ) : (
          shown.map((m, i) => {
            const prev = shown[i - 1];
            const compact = Boolean(
              prev &&
                prev.authorId === m.authorId &&
                Math.abs(new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime()) <
                  8 * 60 * 1000,
            );
            const replySrc = m.replyTo ? rows.find((x) => x.id === m.replyTo) : null;
            return (
              <ChatLine
                key={m.id}
                m={m}
                compact={compact}
                canDelete={m.authorId === meId || Boolean(canModerate)}
                onDelete={onDelete}
                onOpen={onOpenProfile}
                onReact={onReact}
                onPin={onPin}
                onEdit={onEdit && m.authorId === meId ? onEdit : undefined}
                onReply={() => setReply(m)}
                replyPreview={replySrc ? `@${replySrc.authorUsername}: ${replySrc.body.slice(0, 60)}` : null}
                seen={Boolean(lastMine && m.id === lastMine.id && seenId && seenId >= m.id)}
              />
            );
          })
        )}
        <div ref={end} />
      </ul>
      {canWrite ? (
        <>
          {reply ? (
            <div className="flex items-center gap-2 border-t border-line bg-surface px-3 py-1.5 text-xs text-muted">
              <Reply className="size-3.5" />
              <span className="min-w-0 flex-1 truncate">
                @{reply.authorUsername}: {reply.body.slice(0, 80)}
              </span>
              <button type="button" onClick={() => setReply(null)}>
                ×
              </button>
            </div>
          ) : null}
          {gifs ? (
            <div className="grid grid-cols-3 gap-1 border-t border-line p-2">
              {GIFS.map((src) => (
                <button
                  key={src}
                  type="button"
                  className="overflow-hidden rounded-lg bg-elevated"
                  onClick={() => void send(`${GIF_PREFIX}${src}`)}
                >
                  <img src={src} alt="" className="h-20 w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
          <form
            className={cn(
              "border-t border-line px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] transition-all",
              focus ? "pt-3" : "py-2",
            )}
            onSubmit={(e) => {
              e.preventDefault();
              void send(body.trim());
              setFocus(false);
            }}
          >
            <input
              ref={imgRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  const data = await compressChatImage(file);
                  await send(`${IMG_PREFIX}${data}`);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Bild fehlgeschlagen.");
                }
              }}
            />
            <div className="flex items-end gap-2">
              <button
                type="button"
                className="mb-1 grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-surface hover:text-fg"
                onClick={() => imgRef.current?.click()}
                aria-label="Bild"
              >
                <ImagePlus className="size-5" />
              </button>
              <button
                type="button"
                className="mb-1 grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-surface"
                onClick={() => setGifs((v) => !v)}
                aria-label="GIF"
              >
                <Smile className="size-5" />
              </button>
              <textarea
                value={body}
                rows={focus || body.length > 40 ? 4 : 1}
                onFocus={() => setFocus(true)}
                onBlur={() => {
                  if (!body.trim()) setFocus(false);
                }}
                onChange={(e) => {
                  setBody(e.target.value);
                  if (channelType && channelId && Date.now() - typed.current > 1500) {
                    typed.current = Date.now();
                    void setTyping({ data: { channelType, channelId } }).catch(() => {});
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(body.trim());
                  }
                }}
                placeholder={t("message")}
                autoComplete="off"
                className={cn(
                  "w-full resize-none rounded-2xl border border-transparent bg-elevated px-4 py-3 text-base text-fg outline-none placeholder:text-subtle",
                  focus ? "min-h-28" : "min-h-12",
                )}
              />
              <Button type="submit" disabled={busy || !body.trim()} className="mb-1 h-11 shrink-0">
                {t("send")}
              </Button>
            </div>
          </form>
        </>
      ) : (
        <p className="border-t border-line px-4 py-3 text-center text-xs text-subtle">
          Keine Schreibrechte in diesem Channel.
        </p>
      )}
    </div>
  );
}
