import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ImmersiveShell } from "@/components/layout/immersive-shell";
import { useMe } from "@/components/layout/me-context";
import { useI18n } from "@/components/layout/i18n-context";
import { ChatRoom } from "@/components/chat-room";
import { EmptyState } from "@/components/empty-state";
import { getProfile } from "@/lib/server/profiles";
import { deleteMessage, editMessage, getPeerRead, listMessages, markRead, sendMessage } from "@/lib/server/social";
import { pinMessage, toggleReaction, getPin } from "@/lib/server/live";
import { dmChannelId } from "@/lib/utils";
import type { ChatRow, Profile } from "@/lib/types";

export const Route = createFileRoute("/dm/$username")({ component: DmPage });

function DmPage() {
  const { username } = Route.useParams();
  const { profile } = useMe();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [other, setOther] = useState<Profile | null | undefined>(undefined);
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [pinId, setPinId] = useState<number | null>(null);
  const [seenId, setSeenId] = useState(0);

  const channelId = profile && other ? dmChannelId(profile.userId, other.userId) : "";

  async function load() {
    const res = await getProfile({ data: { username } });
    setOther(res.profile);
    if (res.profile && profile) {
      const ch = dmChannelId(profile.userId, res.profile.userId);
      const msgs = await listMessages({
        data: { channelType: "dm", channelId: ch },
      });
      setRows(msgs);
      setPinId(await getPin({ data: { channelType: "dm", channelId: ch } }));
      setSeenId(await getPeerRead({ data: { channelId: ch, otherId: res.profile.userId } }));
      const last = msgs[msgs.length - 1];
      if (last) await markRead({ data: { channelId: ch, lastId: last.id } });
    }
  }

  useEffect(() => {
    void load().catch(() => setOther(null));
  }, [username, profile?.userId]);

  function goProfile(u: string) {
    void navigate({ to: "/u/$username", params: { username: u } });
  }

  if (other === undefined) {
    return (
      <ImmersiveShell>
        <div className="p-6 text-sm text-muted">{t("loading")}</div>
      </ImmersiveShell>
    );
  }
  if (!other || !profile) {
    return (
      <ImmersiveShell>
        <div className="p-6">
          <EmptyState title={t("userMissing")} />
        </div>
      </ImmersiveShell>
    );
  }

  return (
    <ImmersiveShell>
      <ChatRoom
        title={`@${other.username}`}
        subtitle={other.displayName || t("privateChat")}
        avatar={other.avatarKey}
        avatarName={other.username}
        onBack={() => void navigate({ to: "/chat" })}
        onTitle={() => goProfile(other.username)}
        onOpenProfile={goProfile}
        rows={rows}
        meId={profile.userId}
        onDelete={async (id) => {
          await deleteMessage({ data: { id } });
          setRows((cur) => cur.filter((m) => m.id !== id));
        }}
        onSend={async (body, replyTo) => {
          const res = await sendMessage({
            data: { channelType: "dm", channelId, body, replyTo: replyTo ?? null },
          });
          if (res && "error" in res && res.error) {
            toast.error(String(res.error));
            return;
          }
          await load();
        }}
        reload={load}
        onReact={async (id, emoji) => {
          await toggleReaction({ data: { id, emoji } });
          await load();
        }}
        onPin={async (id) => {
          await pinMessage({ data: { channelType: "dm", channelId, messageId: id } });
          await load();
        }}
        onEdit={async (id, body) => {
          await editMessage({ data: { id, body } });
          await load();
        }}
        channelType="dm"
        channelId={channelId}
        seenId={seenId}
        pinned={rows.find((m) => m.id === pinId) ?? null}
      />
    </ImmersiveShell>
  );
}
