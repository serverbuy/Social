import { Pencil, Pin, Reply, Trash2 } from "lucide-react";
import { useState } from "react";
import { AvatarMark } from "@/components/mark/avatar-mark";
import { SparkleName } from "@/components/mark/name-badge";
import { chatImageSrc, isChatImage } from "@/lib/media";
import { cn, timeAgo } from "@/lib/utils";
import type { ChatRow } from "@/lib/types";

const EMOJIS = ["👍", "❤️", "🔥", "😂"];

export function ChatLine({
  m,
  canDelete,
  onDelete,
  compact,
  onOpen,
  onReact,
  onPin,
  onEdit,
  onReply,
  replyPreview,
  seen,
}: {
  m: ChatRow;
  canDelete: boolean;
  onDelete: (id: number) => void;
  compact?: boolean;
  onOpen?: (username: string) => void;
  onReact?: (id: number, emoji: string) => void;
  onPin?: (id: number) => void;
  onEdit?: (id: number, body: string) => void;
  onReply?: () => void;
  replyPreview?: string | null;
  seen?: boolean;
}) {
  const img = isChatImage(m.body);
  const owner = m.authorRole === "owner" || m.authorRole === "admin";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.body);
  return (
    <li className={cn("group flex gap-3 px-1", compact ? "mt-0.5" : "mt-3")}>
      {compact ? (
        <span className="w-10 shrink-0" />
      ) : (
        <button type="button" className="mt-0.5 shrink-0" onClick={() => onOpen?.(m.authorUsername)}>
          <AvatarMark username={m.authorUsername} avatarKey={m.authorAvatar} size={40} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        {replyPreview ? (
          <p className="mb-0.5 truncate text-[11px] text-subtle">↩ {replyPreview}</p>
        ) : null}
        {compact ? null : (
          <p className="flex items-baseline gap-2 leading-none">
            <SparkleName badge={m.authorBadge} size={15}>
              <button
                type="button"
                className={cn("text-sm font-semibold hover:underline", owner && "text-[#f0b232]")}
                onClick={() => onOpen?.(m.authorUsername)}
              >
                @{m.authorUsername}
              </button>
            </SparkleName>
            <span className="text-[11px] text-subtle">{timeAgo(m.createdAt)}</span>
            {m.editedAt ? <span className="text-[10px] text-subtle">(bearbeitet)</span> : null}
          </p>
        )}
        {img ? (
          <img
            src={chatImageSrc(m.body)}
            alt=""
            className={cn(
              "max-h-64 max-w-[min(100%,18rem)] rounded-lg object-cover",
              compact ? "mt-1" : "mt-2",
            )}
          />
        ) : editing ? (
          <form
            className="mt-1 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              onEdit?.(m.id, draft.trim());
              setEditing(false);
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-8 flex-1 rounded-md bg-elevated px-2 text-sm outline-none"
              autoFocus
            />
            <button type="submit" className="text-xs font-semibold text-primary">
              OK
            </button>
          </form>
        ) : (
          <p className={cn("text-[15px] leading-snug text-fg/95", compact ? "" : "mt-1")}>{m.body}</p>
        )}
        {m.reactions?.length ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {m.reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onReact?.(m.id, r.emoji)}
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px]",
                  r.mine ? "bg-primary/25" : "bg-elevated",
                )}
              >
                {r.emoji} {r.count}
              </button>
            ))}
          </div>
        ) : null}
        <div className="mt-0.5 hidden gap-1 group-hover:flex">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              className="rounded px-1 text-xs hover:bg-surface"
              onClick={() => onReact?.(m.id, e)}
            >
              {e}
            </button>
          ))}
          {onPin ? (
            <button type="button" className="rounded px-1 text-subtle hover:bg-surface" onClick={() => onPin(m.id)}>
              <Pin className="size-3" />
            </button>
          ) : null}
          {onEdit && !img ? (
            <button
              type="button"
              className="rounded px-1 text-subtle hover:bg-surface"
              onClick={() => {
                setDraft(m.body);
                setEditing(true);
              }}
            >
              <Pencil className="size-3" />
            </button>
          ) : null}
          {onReply ? (
            <button type="button" className="rounded px-1 text-subtle hover:bg-surface" onClick={onReply}>
              <Reply className="size-3" />
            </button>
          ) : null}
        </div>
        {seen ? <p className="mt-0.5 text-[10px] text-subtle">Gesehen</p> : null}
      </div>
      {canDelete ? (
        <button
          type="button"
          className="mt-1 grid size-7 shrink-0 place-items-center rounded text-subtle opacity-0 hover:bg-surface hover:text-danger group-hover:opacity-100"
          aria-label="Nachricht löschen"
          onClick={() => onDelete(m.id)}
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : null}
    </li>
  );
}
