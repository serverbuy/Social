import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageSquare, Plus, Server } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { useMe } from "@/components/layout/me-context";
import { useI18n } from "@/components/layout/i18n-context";
import { AvatarMark } from "@/components/mark/avatar-mark";
import { NameBadge } from "@/components/mark/name-badge";
import { SongBar } from "@/components/profile/song-bar";
import { listInbox } from "@/lib/server/social";
import { listServers } from "@/lib/server/community";
import { addStory, listStories } from "@/lib/server/live";
import { compressChatImage } from "@/lib/avatar";
import { chatPreview, STORY_MAX, readAsDataUrl } from "@/lib/media";
import { timeAgo } from "@/lib/utils";
import type { FriendRow, ServerRow } from "@/lib/types";
import type { I18nKey } from "@/lib/i18n";

export const Route = createFileRoute("/")({ component: Home });

function greetingKey(): I18nKey {
  const h = new Date().getHours();
  if (h < 5) return "greetNight";
  if (h < 12) return "greetMorning";
  if (h < 18) return "greetDay";
  return "greetEvening";
}

type Story = {
  id: number;
  userId: string;
  mediaKey: string;
  username: string;
  avatarKey: string;
};

function Home() {
  const { profile } = useMe();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [servers, setServers] = useState<ServerRow[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [openStory, setOpenStory] = useState<Story | null>(null);
  const [storyDraft, setStoryDraft] = useState<string | null>(null);

  useEffect(() => {
    void listInbox().then(setFriends);
    void listServers().then((s) =>
      setServers(s.filter((x) => x.joined || x.role === "owner" || x.ownerId === profile?.userId)),
    );
    void listStories()
      .then(setStories)
      .catch(() => {});
  }, [profile?.userId]);

  const online = friends.filter((f) => f.online);
  const unread = friends.filter((f) => f.unread);

  return (
    <AppShell>
      <div className="px-4 pt-4 sm:px-6">
        <p className="text-sm text-muted">{t(greetingKey())}</p>

        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          <label className="flex w-16 shrink-0 cursor-pointer flex-col items-center">
            <span className="relative grid size-14 place-items-center overflow-hidden rounded-full bg-surface ring-2 ring-line">
              {storyDraft ? (
                storyDraft.startsWith("data:video/") ? (
                  <video src={storyDraft} className="size-full object-cover" muted playsInline />
                ) : (
                  <img src={storyDraft} alt="" className="size-full object-cover" />
                )
              ) : (
                <Plus className="size-5 text-muted" />
              )}
            </span>
            <span className="mt-1 text-[10px]">Story</span>
            <input
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  const mediaKey = file.type.startsWith("image/")
                    ? await compressChatImage(file)
                    : await readAsDataUrl(file, STORY_MAX);
                  setStoryDraft(mediaKey);
                  const out = await addStory({ data: { mediaKey } });
                  if (!out.ok) {
                    toast.error(out.error ?? "");
                    setStoryDraft(null);
                  } else {
                    setStories(await listStories());
                    setStoryDraft(null);
                  }
                } catch (err) {
                  setStoryDraft(null);
                  toast.error(err instanceof Error ? err.message : "Story fail");
                }
              }}
            />
          </label>
          {stories.map((s) => (
            <button
              key={s.id}
              type="button"
              className="flex w-16 shrink-0 flex-col items-center"
              onClick={() => setOpenStory(s)}
            >
              <span className="overflow-hidden rounded-full p-[2px] ring-2 ring-primary">
                {s.mediaKey.startsWith("data:video/") ? (
                  <video src={s.mediaKey} className="size-[52px] rounded-full object-cover" muted playsInline />
                ) : s.mediaKey.startsWith("data:image") || s.mediaKey.startsWith("http") ? (
                  <img src={s.mediaKey} alt="" className="size-[52px] rounded-full object-cover" />
                ) : (
                  <AvatarMark username={s.username} avatarKey={s.avatarKey} size={52} />
                )}
              </span>
              <span className="mt-1 truncate text-[10px]">@{s.username}</span>
            </button>
          ))}
        </div>

        <div
          className="mt-3 overflow-hidden rounded-3xl p-5"
          style={{
            background:
              "linear-gradient(160deg, color-mix(in srgb, var(--color-primary) 55%, #000) 0%, #1a1b1e 55%, #111214 100%)",
          }}
        >
          <button
            type="button"
            className="flex items-center gap-4"
            onClick={() => void navigate({ to: "/profile" })}
          >
            <AvatarMark username={profile?.username ?? ""} avatarKey={profile?.avatarKey} size={72} />
            <div className="min-w-0 text-left">
              <h1 className="flex items-center text-2xl font-bold">
                @{profile?.username}
                <NameBadge badge={profile?.badge} size={20} />
              </h1>
              <p className="mt-1 truncate text-sm text-white/70">
                {profile?.statusText || profile?.displayName || t("yourProfile")}
              </p>
            </div>
          </button>
          {profile?.bio ? (
            <p className="mt-4 text-sm leading-relaxed text-white/80">{profile.bio}</p>
          ) : null}
          {profile?.songData ? (
            <SongBar name={profile.songName} src={profile.songData} username={profile.username} />
          ) : null}
        </div>
      </div>

      {unread.length > 0 ? (
        <section className="mt-6 px-4 sm:px-6">
          <h2 className="text-sm font-semibold">Ungelesen</h2>
          <ul className="mt-2 space-y-1">
            {unread.slice(0, 3).map((f) => (
              <li key={f.userId}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left hover:bg-surface"
                  onClick={() => void navigate({ to: "/dm/$username", params: { username: f.username } })}
                >
                  <AvatarMark username={f.username} avatarKey={f.avatarKey} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">@{f.username}</span>
                    <span className="truncate text-xs text-subtle">{chatPreview(f.lastBody)}</span>
                  </span>
                  <MessageSquare className="size-4 text-primary" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {online.length > 0 ? (
        <section className="mt-6">
          <h2 className="px-4 text-sm font-semibold sm:px-6">{t("nowHere")}</h2>
          <div className="mt-3 flex gap-4 overflow-x-auto px-4 pb-1 sm:px-6">
            {online.map((f) => (
              <button
                key={f.userId}
                type="button"
                onClick={() => void navigate({ to: "/dm/$username", params: { username: f.username } })}
                className="flex w-[4.5rem] shrink-0 flex-col items-center"
              >
                <span className="rounded-full p-[3px]" style={{ background: "var(--color-primary)" }}>
                  <AvatarMark username={f.username} avatarKey={f.avatarKey} size={56} />
                </span>
                <span className="mt-1.5 truncate text-[11px] font-medium">@{f.username}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {servers.length > 0 ? (
        <section className="mt-6 px-4 sm:px-6">
          <button
            type="button"
            className="flex w-full items-center justify-between"
            onClick={() => void navigate({ to: "/servers" })}
          >
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Server className="size-4" /> {t("servers")}
            </h2>
          </button>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {servers.map((s) => (
              <button
                key={s.id}
                type="button"
                className="h-10 shrink-0 rounded-full bg-surface px-4 text-sm font-medium"
                onClick={() => {
                  if (s.slug === "forum") void navigate({ to: "/forum" });
                  else if (s.slug === "hall") void navigate({ to: "/hall" });
                  else void navigate({ to: "/servers/$id", params: { id: String(s.id) } });
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6 px-4 pb-10 sm:px-6">
        <h2 className="text-sm font-semibold">{t("yourPeople")}</h2>
        {friends.length === 0 ? (
          <p className="mt-6 text-sm leading-relaxed text-muted">{t("stillQuiet")}</p>
        ) : (
          <ul className="mt-3 space-y-1">
            {friends.map((f) => (
              <li key={f.userId}>
                <button
                  type="button"
                  onClick={() =>
                    void navigate({ to: "/dm/$username", params: { username: f.username } })
                  }
                  className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left hover:bg-surface"
                >
                  <span className="relative">
                    <AvatarMark username={f.username} avatarKey={f.avatarKey} size={48} />
                    <span
                      className={
                        f.online
                          ? "absolute bottom-0 right-0 size-3 rounded-full border-2 border-bg bg-online"
                          : "absolute bottom-0 right-0 size-3 rounded-full border-2 border-bg bg-subtle"
                      }
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">@{f.username}</span>
                    <span className="text-xs text-subtle">
                      {f.lastBody
                        ? chatPreview(f.lastBody)
                        : f.online
                          ? t("online")
                          : timeAgo(f.lastSeen)}
                    </span>
                  </span>
                  {f.unread ? <span className="size-2.5 shrink-0 rounded-full bg-primary" /> : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {openStory ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4"
          onClick={() => setOpenStory(null)}
        >
          {openStory.mediaKey.startsWith("data:video/") ? (
            <video src={openStory.mediaKey} className="max-h-[90vh] max-w-full" controls autoPlay />
          ) : (
            <img src={openStory.mediaKey} alt="" className="max-h-[90vh] max-w-full object-contain" />
          )}
        </div>
      ) : null}
    </AppShell>
  );
}
