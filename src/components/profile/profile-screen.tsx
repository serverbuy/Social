import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { ImmersiveShell } from "@/components/layout/immersive-shell";
import { ProfilePager } from "@/components/profile/profile-pager";
import { ProfileDeco } from "@/components/profile/profile-deco";

export function ProfileScreen({
  title,
  onBack,
  extra,
  deco,
  profile,
  clips,
}: {
  title: string;
  onBack: () => void;
  extra?: ReactNode;
  deco?: string;
  profile: ReactNode;
  clips: ReactNode;
}) {
  return (
    <ImmersiveShell>
      <div className="relative flex h-full flex-col overflow-hidden">
        <header className="relative z-20 flex items-center gap-1 px-2 py-1.5">
          <button
            type="button"
            onClick={onBack}
            className="grid size-11 place-items-center rounded-full hover:bg-surface"
            aria-label="Zurück"
          >
            <ArrowLeft className="size-6" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-base font-bold">{title}</h1>
          {extra}
        </header>
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <ProfilePager profile={profile} clips={clips} />
        </div>
        <ProfileDeco kind={deco} />
      </div>
    </ImmersiveShell>
  );
}
