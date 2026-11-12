import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Settings } from "lucide-react";
import { ImmersiveShell } from "@/components/layout/immersive-shell";
import { useMe } from "@/components/layout/me-context";
import { useI18n } from "@/components/layout/i18n-context";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { ClipGrid } from "@/components/profile/clip-grid";
import { ProfileScreen } from "@/components/profile/profile-screen";
import { ProfileHero } from "@/components/profile/profile-hero";
import { ProfileWidgets } from "@/components/profile/widgets";
import {
  addClip,
  deleteClip,
  patchSongMeta,
  updateAvatar,
  updateBanner,
  updateGame,
  updateProfile,
  updateSong,
} from "@/lib/server/profiles";
import { compressArt, compressAvatar, compressBanner } from "@/lib/avatar";
import { CLIP_MAX, fileTitle, readAsDataUrl, SONG_MAX } from "@/lib/media";
import { updateStatus } from "@/lib/server/live";
import type { Privacy } from "@/lib/types";

export const Route = createFileRoute("/profile")({ component: OwnProfile });

function OwnProfile() {
  const { profile, refresh } = useMe();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [statusText, setStatusText] = useState("");
  const [privacy, setPrivacy] = useState<Privacy>("public");
  const [activityPublic, setActivityPublic] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const songRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const clipRef = useRef<HTMLInputElement>(null);
  const syncedId = useRef<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    if (syncedId.current === profile.userId) return;
    syncedId.current = profile.userId;
    setDisplayName(profile.displayName);
    setBio(profile.bio);
    setStatusText(profile.statusText);
    setPrivacy(profile.privacy);
    setActivityPublic(profile.activityPublic);
  }, [profile]);

  if (!profile) {
    return (
      <ImmersiveShell>
        <div className="p-6 text-sm text-muted">{t("loading")}</div>
      </ImmersiveShell>
    );
  }

  async function onPick(file: File) {
    setUploading(true);
    try {
      const data = await compressAvatar(file);
      setAvatarPreview(data);
      const res = await updateAvatar({ data: { avatarKey: data } });
      if (!res.ok) {
        toast.error(res.error ?? "Bild nicht gespeichert.");
        return;
      }
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bild fehlgeschlagen.");
    } finally {
      setUploading(false);
    }
  }

  async function onBanner(file: File) {
    setUploading(true);
    try {
      const data = await compressBanner(file);
      const res = await updateBanner({ data: { bannerKey: data } });
      if (!res.ok) {
        toast.error(res.error ?? "Banner nicht gespeichert.");
        return;
      }
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Banner fehlgeschlagen.");
    } finally {
      setUploading(false);
    }
  }

  async function onSong(file: File) {
    try {
      if (!file.type.startsWith("audio/")) throw new Error("Nur Audio.");
      const data = await readAsDataUrl(file, SONG_MAX);
      const res = await updateSong({
        data: {
          songName: fileTitle(file),
          songData: data,
          songCover: profile?.songCover ?? "",
          songLink: profile?.songLink ?? "",
        },
      });
      if (!res.ok) toast.error(res.error ?? "Song nicht gespeichert.");
      else await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Song fehlgeschlagen.");
    }
  }

  async function onClip(file: File) {
    try {
      const ok =
        file.type.startsWith("video/") ||
        file.type === "image/gif" ||
        file.type === "image/webp" ||
        file.type.startsWith("image/");
      if (!ok) throw new Error("Nur Video oder Bild.");
      const data = await readAsDataUrl(file, CLIP_MAX);
      const res = await addClip({ data: { title: fileTitle(file), mediaKey: data } });
      if (!res.ok) toast.error(res.error ?? "Clip nicht gespeichert.");
      else await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Clip fehlgeschlagen.");
    }
  }

  return (
    <ProfileScreen
      title={`@${profile.username}`}
      onBack={() => void navigate({ to: "/" })}
      deco={profile.deco}
      extra={
        <>
          {displayName !== profile.displayName || bio !== profile.bio || privacy !== profile.privacy ? (
            <button
              type="button"
              className="mr-1 h-9 rounded-full bg-fg px-3 text-sm font-semibold text-bg"
              onClick={async () => {
                await updateProfile({
                  data: { displayName, bio, sceneTags: "", privacy, activityPublic },
                });
                await refresh();
                toast.success(t("profileSaved"));
              }}
            >
              {t("save")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void navigate({ to: "/settings" })}
            className="grid size-11 place-items-center rounded-full hover:bg-surface"
            aria-label={t("settings")}
          >
            <Settings className="size-5" />
          </button>
        </>
      }
      profile={
        <>
          <input
            ref={songRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void onSong(file);
            }}
          />
          <input
            ref={coverRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                const data = await compressArt(file);
                const res = await patchSongMeta({ data: { songCover: data } });
                if (!res.ok) toast.error(res.error ?? "");
                else await refresh();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Cover fehlgeschlagen.");
              }
            }}
          />
          <input
            ref={clipRef}
            type="file"
            accept="video/*,image/gif,image/webp,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void onClip(file);
            }}
          />
          <input
            ref={bannerRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void onBanner(file);
            }}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void onPick(file);
            }}
          />
          <ProfileHero
            profile={profile}
            avatarPreview={avatarPreview}
            editable={!uploading}
            onAvatar={() => fileRef.current?.click()}
            onBanner={() => bannerRef.current?.click()}
          />
          <div className="px-4 pb-8 sm:px-6">
            <ProfileWidgets
              profile={profile}
              editable
              onAddSong={() => songRef.current?.click()}
              onCover={() => coverRef.current?.click()}
              onLink={async (url) => {
                await patchSongMeta({ data: { songLink: url } });
                await refresh();
              }}
              onName={async (name) => {
                await patchSongMeta({ data: { songName: name } });
                await refresh();
              }}
              onRemoveSong={async () => {
                await updateSong({ data: { songName: "", songData: "", songCover: "", songLink: "" } });
                await refresh();
              }}
              onGame={async (name) => {
                await updateGame({ data: { gameName: name } });
                await refresh();
              }}
            />

            <form className="mt-8 max-w-lg space-y-4" onSubmit={(e) => e.preventDefault()}>
              <label className="block text-xs font-semibold uppercase text-muted">
                {t("displayName")}
                <Input className="mt-2" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </label>
              <label className="block text-xs font-semibold uppercase text-muted">
                Status
                <Input
                  className="mt-2"
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  onBlur={() => void updateStatus({ data: { statusText } }).then(() => refresh())}
                  placeholder="AFK, ranked, …"
                />
              </label>
              <label className="block text-xs font-semibold uppercase text-muted">
                {t("bio")}
                <Textarea className="mt-2" value={bio} onChange={(e) => setBio(e.target.value)} />
              </label>
              <div>
                <p className="text-xs font-semibold uppercase text-muted">{t("visibility")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["public", "friends", "server", "private"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPrivacy(p)}
                      className={
                        privacy === p
                          ? "h-9 rounded-full bg-primary px-4 text-xs font-semibold text-white"
                          : "h-9 rounded-full bg-elevated px-4 text-xs text-muted"
                      }
                    >
                      {p === "public"
                        ? t("visPublic")
                        : p === "friends"
                          ? t("visFriends")
                          : p === "server"
                            ? t("visServer")
                            : t("visPrivate")}
                    </button>
                  ))}
                </div>
              </div>
            </form>

            <p className="mt-6 text-sm">
              <Link to="/u/$username" params={{ username: profile.username }} className="text-primary">
                /u/{profile.username}
              </Link>
            </p>

          </div>
        </>
      }
      clips={
        <ClipGrid
          clips={profile.clips ?? []}
          editable
          onAdd={() => clipRef.current?.click()}
          onDelete={async (id) => {
            await deleteClip({ data: { id } });
            await refresh();
          }}
        />
      }
    />
  );
}
