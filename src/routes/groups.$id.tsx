import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ImmersiveShell } from "@/components/layout/immersive-shell";
import { useMe } from "@/components/layout/me-context";
import { ChatRoom } from "@/components/chat-room";
import { EmptyState } from "@/components/empty-state";
import { deleteGroup, deleteMessage, editMessage, getGroup, listMessages, sendMessage } from "@/lib/server/social";
import { pinMessage, toggleReaction } from "@/lib/server/live";
import type { ChatRow } from "@/lib/types";

export const Route = createFileRoute("/groups/$id")({ component: GroupPage });

function GroupPage() {
  const { id } = Route.useParams();
  const { signedIn, profile } = useMe();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Awaited<ReturnType<typeof getGroup>> | undefined>(undefined);
  const [rows, setRows] = useState<ChatRow[]>([]);

  async function load() {
    try {
      const g = await getGroup({ data: { id: Number(id) } });
      setGroup(g);
      if (g) {
        setRows(
          await listMessages({ data: { channelType: "group", channelId: String(id) } }).catch(() => []),
        );
      }
    } catch {
      setGroup(null);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  if (group === undefined) {
    return (
      <ImmersiveShell>
        <div className="p-6 text-sm text-muted">Laden…</div>
      </ImmersiveShell>
    );
  }
  if (!group) {
    return (
      <ImmersiveShell>
        <div className="p-6">
          <EmptyState title="Kein Zugang" />
        </div>
      </ImmersiveShell>
    );
  }

  const isOwner = group.role === "owner" || group.ownerId === profile?.userId;
  const lead = group.members[0];

  return (
    <ImmersiveShell>
      <ChatRoom
        title={group.name}
        subtitle={`${group.members.length} Leute`}
        avatar={lead?.avatarKey}
        avatarName={lead?.username}
        onBack={() => void navigate({ to: "/groups" })}
        onOpenProfile={(u) => void navigate({ to: "/u/$username", params: { username: u } })}
        rows={rows}
        meId={profile?.userId}
        canModerate={isOwner}
        onDelete={async (messageId) => {
          await deleteMessage({ data: { id: messageId } });
          setRows((cur) => cur.filter((m) => m.id !== messageId));
        }}
        onSend={async (body, replyTo) => {
          await sendMessage({
            data: { channelType: "group", channelId: String(id), body, replyTo: replyTo ?? null },
          });
          await load();
        }}
        reload={load}
        onReact={async (mid, emoji) => {
          await toggleReaction({ data: { id: mid, emoji } });
          await load();
        }}
        onPin={async (mid) => {
          await pinMessage({ data: { channelType: "group", channelId: String(id), messageId: mid } });
        }}
        onEdit={async (mid, body) => {
          await editMessage({ data: { id: mid, body } });
          await load();
        }}
        channelType="group"
        channelId={String(id)}
        toolbar={
          isOwner ? (
            <div className="px-4 pb-2">
              <button
                type="button"
                className="text-xs text-danger"
                onClick={async () => {
                  if (!confirm(`Gruppe „${group.name}“ löschen?`)) return;
                  const res = await deleteGroup({ data: { id: group.id } });
                  if (!res.ok) toast.error(res.error ?? "");
                  else void navigate({ to: "/groups" });
                }}
              >
                Gruppe löschen
              </button>
            </div>
          ) : null
        }
      />
    </ImmersiveShell>
  );
}
