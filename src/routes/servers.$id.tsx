import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Hash, Users } from "lucide-react";
import { ImmersiveShell } from "@/components/layout/immersive-shell";
import { useMe } from "@/components/layout/me-context";
import { ChatRoom } from "@/components/chat-room";
import { EmptyState } from "@/components/empty-state";
import { AvatarMark } from "@/components/mark/avatar-mark";
import { Input } from "@/components/ui/input";
import {
  addServerChannel,
  deleteServerChannel,
  getServer,
  joinServer,
  kickMember,
  listServerMembers,
  setMemberRole,
} from "@/lib/server/community";
import { deleteMessage, editMessage, listMessages, sendMessage } from "@/lib/server/social";
import { pinMessage, toggleReaction } from "@/lib/server/live";
import { channelEmoji } from "@/lib/utils";
import type { ChannelRow, ChatRow, ServerMember, ServerRow } from "@/lib/types";

export const Route = createFileRoute("/servers/$id")({ component: ServerPage });

function ServerPage() {
  const { id } = Route.useParams();
  const { signedIn, profile } = useMe();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [server, setServer] = useState<ServerRow | null>(null);
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [active, setActive] = useState<ChannelRow | null>(null);
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [members, setMembers] = useState<ServerMember[]>([]);
  const [panel, setPanel] = useState<"chat" | "members">("chat");
  const [newCh, setNewCh] = useState("");
  const activeRef = useRef<ChannelRow | null>(null);

  async function messagesFor(ch: ChannelRow) {
    if (ch.kind === "voice") {
      setRows([]);
      return;
    }
    setRows(
      await listMessages({
        data: { channelType: "server", channelId: `${id}:${ch.name}` },
      }).catch(() => []),
    );
  }

  async function selectChannel(c: ChannelRow) {
    activeRef.current = c;
    setActive(c);
    await messagesFor(c);
  }

  async function load(channel?: ChannelRow | null) {
    try {
      const res = await getServer({ data: { id: Number(id) } });
      if (!res || res.locked || !res.server) {
        setLocked(Boolean(res?.locked));
        setServer(null);
        setReady(true);
        return;
      }
      if (!res.server.joined && res.server.visibility === "public" && res.server.role !== "owner") {
        const joined = await joinServer({ data: { id: res.server.id } });
        if (joined.ok) {
          const again = await getServer({ data: { id: Number(id) } });
          if (again?.server) {
            setLocked(false);
            setServer(again.server);
            setChannels(again.channels);
            const textChannels = again.channels.filter((c) => c.kind !== "voice");
            const ch = channel ?? activeRef.current ?? textChannels[0] ?? again.channels[0] ?? null;
            activeRef.current = ch;
            setActive(ch);
            if (ch) await messagesFor(ch);
            setMembers(await listServerMembers({ data: { id: Number(id) } }).catch(() => []));
            setReady(true);
            return;
          }
        }
      }
      setLocked(false);
      setServer(res.server);
      setChannels(res.channels);
      const textChannels = res.channels.filter((c) => c.kind !== "voice");
      const ch = channel ?? activeRef.current ?? textChannels[0] ?? res.channels[0] ?? null;
      activeRef.current = ch;
      setActive(ch);
      if (ch) await messagesFor(ch);
      setMembers(await listServerMembers({ data: { id: Number(id) } }).catch(() => []));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server ging nicht auf.");
      setServer(null);
    }
    setReady(true);
  }

  useEffect(() => {
    setReady(false);
    void load();
  }, [id, signedIn]);

  if (!ready) {
    return (
      <ImmersiveShell>
        <div className="p-6 text-sm text-muted">Laden…</div>
      </ImmersiveShell>
    );
  }
  if (locked) {
    return (
      <ImmersiveShell>
        <div className="p-6">
          <EmptyState title="Invite only" />
        </div>
      </ImmersiveShell>
    );
  }
  if (!server) {
    return (
      <ImmersiveShell>
        <div className="p-6">
          <EmptyState title="Server fehlt" />
        </div>
      </ImmersiveShell>
    );
  }

  const role = server.role ?? "";
  const isOwner = role === "owner" || server.ownerId === profile?.userId;
  const isAdmin = isOwner || role === "admin";
  const canWrite = !(active?.name === "announce" && !isAdmin);

  return (
    <ImmersiveShell>
      {panel === "members" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <header className="flex items-center gap-2 px-2 py-2">
            <button type="button" className="px-3 py-2 text-sm" onClick={() => setPanel("chat")}>
              ← Chat
            </button>
            <h1 className="text-base font-bold">Mitglieder</h1>
          </header>
          <ul className="flex-1 overflow-y-auto px-3 py-2">
            {members.map((m) => (
              <li key={m.userId} className="flex items-center gap-3 rounded-xl px-2 py-2">
                <AvatarMark username={m.username} avatarKey={m.avatarKey} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">@{m.username}</span>
                  <span className="text-[11px] text-subtle">{m.role}</span>
                </span>
                {isOwner && m.role !== "owner" ? (
                  <button
                    type="button"
                    className="text-xs text-primary"
                    onClick={async () => {
                      const next = m.role === "admin" ? "member" : "admin";
                      const res = await setMemberRole({
                        data: { id: server.id, userId: m.userId, role: next },
                      });
                      if (!res.ok) toast.error(res.error ?? "");
                      else await load(active);
                    }}
                  >
                    {m.role === "admin" ? "Member" : "Admin"}
                  </button>
                ) : null}
                {isAdmin && m.role !== "owner" && m.userId !== profile?.userId ? (
                  <button
                    type="button"
                    className="text-xs text-danger"
                    onClick={async () => {
                      const res = await kickMember({ data: { id: server.id, userId: m.userId } });
                      if (!res.ok) toast.error(res.error ?? "");
                      else await load(active);
                    }}
                  >
                    Kick
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <aside className="flex h-full w-[9.25rem] shrink-0 flex-col border-r border-line bg-elevated sm:w-52">
            <div className="flex items-center gap-1 border-b border-line px-1 py-1.5">
              <button
                type="button"
                onClick={() => void navigate({ to: "/servers" })}
                className="grid size-10 place-items-center rounded-full hover:bg-surface"
                aria-label="Zurück"
              >
                <ArrowLeft className="size-5" />
              </button>
              <p className="min-w-0 truncate text-sm font-bold">{server.name}</p>
            </div>
            <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {channels
                .filter((c) => c.kind !== "voice")
                .map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => void selectChannel(c)}
                    className={
                      active?.id === c.id
                        ? "mb-0.5 flex w-full items-center gap-1.5 rounded-lg bg-surface px-2 py-2 text-left text-sm font-semibold"
                        : "mb-0.5 flex w-full items-center gap-1.5 rounded-lg px-2 py-2 text-left text-sm text-muted hover:bg-surface/70 hover:text-fg"
                    }
                  >
                    {channelEmoji(c.name) ? (
                      <span className="w-5 shrink-0 text-base leading-none">{channelEmoji(c.name)}</span>
                    ) : (
                      <Hash className="size-3.5 shrink-0" />
                    )}
                    <span className="min-w-0 truncate">
                      {channelEmoji(c.name) ? c.name.replace(channelEmoji(c.name), "").trim() || c.name : c.name}
                    </span>
                    {isOwner && c.name !== "general" ? (
                      <span
                        role="presentation"
                        className="ml-auto text-xs text-subtle"
                        onClick={(e) => {
                          e.stopPropagation();
                          void deleteServerChannel({ data: { id: server.id, channelId: c.id } }).then(
                            (res) => {
                              if (!res.ok) toast.error(res.error ?? "");
                              else void load();
                            },
                          );
                        }}
                      >
                        ×
                      </span>
                    ) : null}
                  </button>
                ))}
              {isOwner ? (
                <form
                  className="mt-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const res = await addServerChannel({ data: { id: server.id, name: newCh } });
                    if (!res.ok) toast.error(res.error ?? "");
                    else {
                      setNewCh("");
                      await load(active);
                    }
                  }}
                >
                  <Input
                    value={newCh}
                    onChange={(e) => setNewCh(e.target.value)}
                    placeholder="🎮 oder name"
                    className="h-8 text-xs"
                  />
                </form>
              ) : null}
            </nav>
            <button
              type="button"
              onClick={() => setPanel("members")}
              className="m-2 flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted hover:bg-surface hover:text-fg"
            >
              <Users className="size-4" />
              Mitglieder
            </button>
          </aside>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <ChatRoom
              title={
                active
                  ? channelEmoji(active.name)
                    ? active.name
                    : `#${active.name}`
                  : server.name
              }
              subtitle={server.name}
              onBack={() => void navigate({ to: "/servers" })}
              showBack={false}
              onOpenProfile={(u) => void navigate({ to: "/u/$username", params: { username: u } })}
              rows={rows}
              meId={profile?.userId}
              canModerate={isAdmin}
              canWrite={canWrite}
              onDelete={async (mid) => {
                await deleteMessage({ data: { id: mid } });
                setRows((cur) => cur.filter((x) => x.id !== mid));
              }}
              onSend={async (body, replyTo) => {
                const ch = activeRef.current;
                if (!ch) return;
                const res = await sendMessage({
                  data: {
                    channelType: "server",
                    channelId: `${id}:${ch.name}`,
                    body,
                    replyTo: replyTo ?? null,
                  },
                });
                if (res && "error" in res && res.error) toast.error(String(res.error));
                await messagesFor(ch);
              }}
              reload={async () => {
                const ch = activeRef.current;
                if (ch) await messagesFor(ch);
              }}
              onReact={async (mid, emoji) => {
                await toggleReaction({ data: { id: mid, emoji } });
                const ch = activeRef.current;
                if (ch) await messagesFor(ch);
              }}
              onPin={async (mid) => {
                const ch = activeRef.current;
                if (!ch) return;
                await pinMessage({
                  data: { channelType: "server", channelId: `${id}:${ch.name}`, messageId: mid },
                });
              }}
              onEdit={async (mid, body) => {
                await editMessage({ data: { id: mid, body } });
                const ch = activeRef.current;
                if (ch) await messagesFor(ch);
              }}
              channelType="server"
              channelId={active ? `${id}:${active.name}` : undefined}
            />
          </div>
        </div>
      )}
    </ImmersiveShell>
  );
}
