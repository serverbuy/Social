import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { ImmersiveShell } from "@/components/layout/immersive-shell";
import { useMe } from "@/components/layout/me-context";
import { AvatarMark } from "@/components/mark/avatar-mark";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { DonateDialog } from "@/components/rankings/donate-dialog";
import { ProfileWidgets } from "@/components/profile/widgets";
import { ClipGrid } from "@/components/profile/clip-grid";
import { ProfileScreen } from "@/components/profile/profile-screen";
import { ProfileHero } from "@/components/profile/profile-hero";
import { getProfile, requestConnection } from "@/lib/server/profiles";
import { addFriend } from "@/lib/server/social";
import { blockUser } from "@/lib/server/live";
import { donate, getDonationHistory, vote } from "@/lib/server/rankings";
import { fileReport } from "@/lib/server/community";
import { formatEuro } from "@/lib/utils";
import type { ConnectionRow, Profile } from "@/lib/types";

export const Route = createFileRoute("/u/$username")({ component: ProfilePage });

function ProfilePage() {
  const { username } = Route.useParams();
  const { signedIn, profile: me } = useMe();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [visible, setVisible] = useState(true);
  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [history, setHistory] = useState<{ donor: string; amountCents: number; createdAt: string }[]>(
    [],
  );
  const [donateOpen, setDonateOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await getProfile({ data: { username } });
      setProfile(res.profile);
      setVisible(res.visible);
      setConnections(res.connections);
      if (res.profile) {
        setHistory(await getDonationHistory({ data: { username: res.profile.username } }));
      }
    })();
  }, [username]);

  if (!profile) {
    return (
      <ImmersiveShell>
        <div className="p-6">
          <EmptyState title={`@${username} gibt es nicht`} />
        </div>
      </ImmersiveShell>
    );
  }

  const isSelf = me?.userId === profile.userId;

  return (
    <>
    <ProfileScreen
      title={`@${profile.username}`}
      deco={profile.deco}
      onBack={() => {
        if (window.history.length > 1) window.history.back();
        else void navigate({ to: "/" });
      }}
      profile={
            <>
              <ProfileHero profile={profile} />
              <div className="px-4 pb-8 sm:px-6">
              {!isSelf && signedIn ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    onClick={async () => {
                      const res = await addFriend({ data: { username: profile.username } });
                      if (!res.ok) toast.error(res.error ?? "");
                      else
                        toast.success(
                          res.auto
                            ? "Akzeptiert."
                            : `Anfrage an @${profile.username} gesendet.`,
                        );
                    }}
                  >
                    Add Friend
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const res = await requestConnection({ data: { username: profile.username } });
                      if (!res.ok) toast.error(res.error ?? "");
                      else toast.success("Connection gesetzt.");
                    }}
                  >
                    Connect
                  </Button>
                  <Button variant="outline" onClick={() => setDonateOpen(true)}>
                    Donate
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      const res = await vote({
                        data: { world: "famous", targetId: profile.userId },
                      });
                      if (!res.ok) toast.error(res.error ?? "");
                      else toast.success("Stimme gesetzt.");
                    }}
                  >
                    Vote Famous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      void navigate({ to: "/dm/$username", params: { username: profile.username } })
                    }
                  >
                    DM
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      const res = await blockUser({ data: { username: profile.username } });
                      if (!res.ok) toast.error(res.error ?? "");
                      else toast.success("Block.");
                    }}
                  >
                    Block
                  </Button>
                </div>
              ) : null}
              {visible ? (
                <>
                  {profile.bio ? <p className="mt-6 max-w-xl text-sm text-muted">{profile.bio}</p> : null}
                  <ProfileWidgets profile={profile} />
                  <div className="mt-8 grid gap-8 lg:grid-cols-2">
                    <section>
                      <h2 className="text-xl font-bold">Connections</h2>
                      {connections.length === 0 ? (
                        <EmptyState className="mt-4" title="Keine Connections" />
                      ) : (
                        <ul className="mt-4 space-y-1">
                          {connections.map((c) => (
                            <li key={c.userId}>
                              <Link
                                to="/u/$username"
                                params={{ username: c.username }}
                                className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-surface"
                              >
                                <AvatarMark username={c.username} avatarKey={c.avatarKey} size={28} />
                                @{c.username}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                    <section>
                      <h2 className="text-xl font-bold">Donations</h2>
                      {history.length === 0 ? (
                        <EmptyState className="mt-4" title="Keine Payments" />
                      ) : (
                        <ul className="mt-4 space-y-1">
                          {history.map((h, i) => (
                            <li key={i} className="flex justify-between rounded-xl px-3 py-2 text-sm">
                              <span>@{h.donor}</span>
                              <span>{formatEuro(h.amountCents)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  </div>
                </>
              ) : (
                <EmptyState className="mt-8" title="Privat" />
              )}
              <div className="mt-8">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (!signedIn) return navigate({ to: "/login" });
                    await fileReport({
                      data: {
                        targetType: "profile",
                        targetId: profile.userId,
                        reason: "Profil gemeldet über UI",
                      },
                    });
                    toast.success("Report bei Moderation.");
                  }}
                >
                  Melden
                </Button>
              </div>
              </div>
            </>
          }
          clips={<ClipGrid clips={profile.clips ?? []} />}
        />

      {donateOpen ? (
        <DonateDialog
          username={profile.username}
          busy={busy}
          onClose={() => setDonateOpen(false)}
          onSubmit={async (amount) => {
            setBusy(true);
            try {
              const res = await donate({
                data: { username: profile.username, amountEuros: amount },
              });
              if (!res.ok) toast.error(res.error ?? "");
              else if (res.overtake)
                toast.success(`Overbid. @${profile.username} hat @${res.overtake} überholt.`);
              else toast.success("Payment verifiziert.");
              setDonateOpen(false);
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}
    </>
  );
}

