import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AvatarMark } from "@/components/mark/avatar-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { addFriend, listFriends, respondFriend } from "@/lib/server/social";
import { useMe } from "@/components/layout/me-context";
import { dmChannelId, timeAgo } from "@/lib/utils";
import type { FriendRow } from "@/lib/types";

export function FriendsBlock() {
  const { profile } = useMe();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [friends, setFriends] = useState<FriendRow[]>([]);

  async function load() {
    setFriends(await listFriends());
  }

  useEffect(() => {
    void load();
  }, []);

  const accepted = friends.filter((f) => f.status === "accepted");
  const pending = friends.filter((f) => f.status === "pending");

  return (
    <section className="mt-10 max-w-lg">
      <h2 className="text-xl font-bold">Freunde</h2>
      <p className="mt-1 text-xs text-subtle">Nur du siehst das.</p>
      <form
        className="mt-4 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await addFriend({ data: { username: q } });
          if (!res.ok) toast.error(res.error ?? "");
          else toast.success(res.auto ? "Hinzugefügt." : "Anfrage gesendet.");
          setQ("");
          await load();
        }}
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="@username" />
        <Button type="submit">Add</Button>
      </form>

      {pending.length > 0 ? (
        <ul className="mt-4 space-y-1">
          {pending.map((f) => (
            <li key={f.userId} className="flex items-center gap-3 rounded-xl px-2 py-2">
              <AvatarMark username={f.username} avatarKey={f.avatarKey} size={36} />
              <span className="flex-1 text-sm">@{f.username}</span>
              {f.incoming ? (
                <>
                  <Button
                    size="sm"
                    onClick={async () => {
                      await respondFriend({ data: { userId: f.userId, action: "accept" } });
                      await load();
                    }}
                  >
                    Annehmen
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await respondFriend({ data: { userId: f.userId, action: "decline" } });
                      await load();
                    }}
                  >
                    Ablehnen
                  </Button>
                </>
              ) : (
                <span className="text-xs text-subtle">Ausstehend</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {accepted.length === 0 ? (
        <EmptyState className="mt-4" title="Noch keine Freunde" />
      ) : (
        <ul className="mt-4 space-y-1">
          {accepted.map((f) => (
            <li key={f.userId} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-elevated">
              <AvatarMark username={f.username} avatarKey={f.avatarKey} size={36} />
              <Link to="/u/$username" params={{ username: f.username }} className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">@{f.username}</span>
                <span className="text-xs text-subtle">
                  {f.online ? "Online" : timeAgo(f.lastSeen)}
                </span>
              </Link>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (!profile) return;
                  void navigate({
                    to: "/chat/$channel",
                    params: { channel: dmChannelId(profile.userId, f.userId) },
                    search: { type: "dm", with: f.username },
                  });
                }}
              >
                Chat
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
