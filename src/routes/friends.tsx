import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { useI18n } from "@/components/layout/i18n-context";
import { AvatarMark } from "@/components/mark/avatar-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { TapRow } from "@/components/tap-row";
import { addFriend, listFriends, respondFriend } from "@/lib/server/social";
import { timeAgo } from "@/lib/utils";
import type { FriendRow } from "@/lib/types";

export const Route = createFileRoute("/friends")({ component: FriendsPage });

function FriendsPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
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
    <AppShell>
      <div className="px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-bold">{t("friends")}</h1>
        <form
          className="mt-4 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await addFriend({ data: { username: q } });
            if (!res.ok) toast.error(res.error ?? "");
            else toast.success(res.auto ? t("added") : t("requestSent"));
            setQ("");
            await load();
          }}
        >
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="@username" />
          <Button type="submit">{t("add")}</Button>
        </form>

        {pending.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-muted">{t("requests")}</h2>
            <ul className="mt-3 space-y-1">
              {pending.map((f) => (
                <li key={f.userId} className="flex items-center gap-3 rounded-xl px-2 py-2">
                  <AvatarMark username={f.username} avatarKey={f.avatarKey} size={40} />
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
                        {t("accept")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await respondFriend({ data: { userId: f.userId, action: "decline" } });
                          await load();
                        }}
                      >
                        {t("decline")}
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-subtle">{t("pending")}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-muted">{t("friends")}</h2>
          {accepted.length === 0 ? (
            <EmptyState className="mt-4" title={t("noFriends")} />
          ) : (
            <ul className="mt-3 space-y-2">
              {accepted.map((f) => (
                <li key={f.userId}>
                  <TapRow
                    onClick={() => {
                      void navigate({
                        to: "/dm/$username",
                        params: { username: f.username },
                      });
                    }}
                  >
                    <span className="flex items-center gap-3">
                      <span className="relative">
                        <AvatarMark username={f.username} avatarKey={f.avatarKey} size={40} />
                        <span
                          className={
                            f.online
                              ? "absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-bg bg-online"
                              : "absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-bg bg-subtle"
                          }
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">@{f.username}</span>
                        <span className="text-xs text-subtle">
                          {f.online ? t("online") : timeAgo(f.lastSeen)}
                        </span>
                      </span>
                    </span>
                  </TapRow>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
