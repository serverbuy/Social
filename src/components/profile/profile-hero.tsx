import { Camera } from "lucide-react";
import { AvatarMark } from "@/components/mark/avatar-mark";
import { NameBadge } from "@/components/mark/name-badge";
import { isPhotoAvatar } from "@/lib/avatar";
import { bannerCss } from "@/lib/banners";
import type { Profile } from "@/lib/types";

export function ProfileHero({
  profile,
  avatarPreview,
  editable,
  onAvatar,
  onBanner,
}: {
  profile: Pick<
    Profile,
    "username" | "displayName" | "avatarKey" | "bannerKey" | "badge" | "bannerPreset" | "statusText"
  >;
  avatarPreview?: string | null;
  editable?: boolean;
  onAvatar?: () => void;
  onBanner?: () => void;
}) {
  const avatar = avatarPreview ?? profile.avatarKey;
  const banner = profile.bannerKey;
  const preset = bannerCss(profile.bannerPreset);
  return (
    <div>
      <button
        type="button"
        className="relative block w-full overflow-hidden bg-surface aspect-[600/240]"
        onClick={editable ? onBanner : undefined}
        disabled={!editable}
      >
        {isPhotoAvatar(banner) ? (
          <img src={banner} alt="" className="size-full object-cover" />
        ) : (
          <span
            className="block size-full"
            style={{
              background:
                preset ||
                "radial-gradient(120% 80% at 10% 0%, color-mix(in srgb, var(--color-primary) 80%, #fff) 0%, transparent 55%), linear-gradient(160deg, #2b2d31 0%, #111214 70%)",
            }}
          />
        )}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-bg to-transparent" />
        {editable ? (
          <span className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-black/55 text-white">
            <Camera className="size-4" />
          </span>
        ) : null}
      </button>
      <div className="flex items-end gap-3 px-4 sm:px-6">
        <button
          type="button"
          className="relative -mt-8 shrink-0 rounded-full ring-4 ring-bg disabled:opacity-60"
          onClick={editable ? onAvatar : undefined}
          disabled={!editable}
        >
          <AvatarMark username={profile.username} avatarKey={avatar} size={80} />
          {editable ? (
            <span className="absolute bottom-0 right-0 grid size-7 place-items-center rounded-full bg-primary text-white">
              <Camera className="size-3.5" />
            </span>
          ) : null}
        </button>
        <div className="min-w-0 pb-0.5">
          <h1 className="flex items-center text-xl font-bold">
            {profile.displayName}
            <NameBadge badge={profile.badge} size={20} />
          </h1>
          <p className="text-sm text-muted">@{profile.username}</p>
          {profile.statusText ? (
            <p className="mt-0.5 truncate text-sm text-fg/80">{profile.statusText}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
