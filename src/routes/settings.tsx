import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  ChevronRight,
  Clapperboard,
  KeyRound,
  Languages,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Palette,
  QrCode,
  Search,
  Server,
  Shield,
  Sparkles,
  UserRound,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { useTheme } from "@/components/layout/theme-context";
import { useI18n } from "@/components/layout/i18n-context";
import { useMe } from "@/components/layout/me-context";
import { AvatarMark } from "@/components/mark/avatar-mark";
import { BadgeIcon } from "@/components/mark/name-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { THEMES } from "@/lib/theme";
import { BADGES } from "@/lib/badges";
import { authEnabled, signOut } from "@/lib/auth/client";
import { hasGateSessionMarker } from "@/lib/auth/gate-session-marker";
import { cn } from "@/lib/utils";
import {
  setLocalPassword,
  updateBadge,
  updateDmPrivacy,
  updateProfile,
  updateDeco,
  updateWidgets,
  changeUsername,
} from "@/lib/server/profiles";
import { updatePrefs, updateStatus } from "@/lib/server/live";
import { listServers } from "@/lib/server/community";
import { listFriends, listGroups } from "@/lib/server/social";
import { BANNER_PRESETS } from "@/lib/banners";
import { DECOS } from "@/lib/decos";
import { disablePush, enablePush, pushEnabled } from "@/lib/push";
import { parseWidgets, toggleWidget, WIDGET_IDS, type WidgetId } from "@/lib/widgets";
import type { DmPrivacy, FriendRow, GroupRow, Privacy, ServerRow } from "@/lib/types";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

type Panel =
  | "account"
  | "badge"
  | "theme"
  | "language"
  | "privacy"
  | "dms"
  | "groups"
  | "servers"
  | "password"
  | "widgets"
  | "deco"
  | null;

function subscribeToNothing() {
  return () => {};
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-subtle">
        {title}
      </h2>
      <div className="overflow-hidden rounded-2xl bg-surface">{children}</div>
    </section>
  );
}

function Row({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-line px-4 py-3.5 text-left last:border-b-0 hover:bg-elevated/50"
    >
      <span className="grid size-8 place-items-center rounded-full bg-elevated text-fg">
        <Icon className="size-4" strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{label}</span>
      <ChevronRight className="size-5 shrink-0 text-subtle" />
    </button>
  );
}

function SettingsPage() {
  const { profile, refresh } = useMe();
  const { theme, setTheme } = useTheme();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<Panel>(null);
  const [q, setQ] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [password, setPassword] = useState("");
  const [mine, setMine] = useState<ServerRow[]>([]);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [dm, setDm] = useState<DmPrivacy>(profile?.dmPrivacy ?? "everyone");
  const [privacy, setPrivacy] = useState<Privacy>(profile?.privacy ?? "public");
  const [activity, setActivity] = useState(profile?.activityPublic ?? true);
  const gateSession = useSyncExternalStore(
    subscribeToNothing,
    hasGateSessionMarker,
    () => false,
  );
  const canSignOut = authEnabled && !gateSession;

  useEffect(() => {
    void Promise.all([listServers(), listFriends(), listGroups()]).then(([s, f, g]) => {
      setMine(s.filter((x) => x.ownerId === profile?.userId || x.role === "owner"));
      setFriends(f.filter((x) => x.status === "accepted"));
      setGroups(g);
    });
  }, [profile?.userId]);

  useEffect(() => {
    if (!profile) return;
    setDm(profile.dmPrivacy);
    setPrivacy(profile.privacy);
    setActivity(profile.activityPublic);
  }, [profile]);

  async function savePrivacy(next: Privacy) {
    if (!profile) return;
    setPrivacy(next);
    await updateProfile({
      data: {
        displayName: profile.displayName,
        bio: profile.bio,
        sceneTags: "",
        privacy: next,
        activityPublic: activity,
      },
    });
    await refresh();
  }

  async function saveActivity(next: boolean) {
    if (!profile) return;
    setActivity(next);
    await updateProfile({
      data: {
        displayName: profile.displayName,
        bio: profile.bio,
        sceneTags: "",
        privacy,
        activityPublic: next,
      },
    });
    await refresh();
  }

  const query = q.trim().toLowerCase();
  const show = (label: string) => !query || label.toLowerCase().includes(query);

  const titles: Record<Exclude<Panel, null>, string> = {
    account: t("account"),
    badge: t("badges"),
    theme: t("theme"),
    language: t("language"),
    privacy: t("dataPrivacy"),
    dms: t("openDms"),
    groups: t("groups"),
    servers: t("myServers"),
    password: t("setPassword"),
    widgets: t("widgets"),
    deco: t("deco"),
  };

  const body = useMemo(() => {
    if (panel === "theme") {
      return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {THEMES.map((item) => {
            const on = theme === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTheme(item.id);
                  void updatePrefs({ data: { themeId: item.id } });
                }}
                className={cn(
                  "overflow-hidden rounded-2xl text-left",
                  on ? "ring-2 ring-primary" : "ring-1 ring-line",
                )}
              >
                <span className="block h-16" style={{ background: item.gradient }} />
                <span className="bg-surface px-3 py-2 text-sm font-medium">
                  {item.id === "dark" ? t("themeDark") : item.id === "light" ? t("themeLight") : item.label}
                </span>
              </button>
            );
          })}
        </div>
      );
    }
    if (panel === "language") {
      return (
        <div className="flex gap-2">
          {(["de", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => {
                setLang(l);
                void updatePrefs({ data: { lang: l } });
              }}
              className={
                lang === l
                  ? "h-11 rounded-full bg-primary px-5 text-sm font-semibold text-white"
                  : "h-11 rounded-full bg-surface px-5 text-sm text-muted"
              }
            >
              {l === "de" ? t("german") : t("english")}
            </button>
          ))}
        </div>
      );
    }
    if (panel === "badge") {
      return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {BADGES.map((b) => {
            const on = (profile?.badge || "") === b.id;
            return (
              <button
                key={b.id || "none"}
                type="button"
                onClick={async () => {
                  await updateBadge({ data: { badge: b.id } });
                  await refresh();
                }}
                className={cn(
                  "flex flex-col items-center gap-3 rounded-2xl bg-surface px-3 py-5",
                  on ? "ring-2 ring-primary" : "",
                )}
              >
                {b.id ? <BadgeIcon id={b.id} size={44} /> : <span className="size-11 rounded-full bg-elevated" />}
                <span className="text-sm font-medium">{b.id ? b.label : t("none")}</span>
              </button>
            );
          })}
        </div>
      );
    }
    if (panel === "privacy") {
      return (
        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted">{t("dmWho")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  ["everyone", t("everyone")],
                  ["friends", t("friendsOnly")],
                  ["nobody", t("nobody")],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={async () => {
                    setDm(id);
                    await updateDmPrivacy({ data: { dmPrivacy: id } });
                    await refresh();
                  }}
                  className={
                    dm === id
                      ? "h-9 rounded-full bg-primary px-4 text-xs font-semibold text-white"
                      : "h-9 rounded-full bg-surface px-4 text-xs text-muted"
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm text-muted">{t("profile")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["public", "friends", "server", "private"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => void savePrivacy(p)}
                  className={
                    privacy === p
                      ? "h-9 rounded-full bg-primary px-4 text-xs font-semibold text-white"
                      : "h-9 rounded-full bg-surface px-4 text-xs text-muted"
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
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={activity}
              onChange={(e) => void saveActivity(e.target.checked)}
            />
            {t("activityPublic")}
          </label>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-2xl bg-surface px-4 py-3.5 text-sm"
            onClick={async () => {
              if (pushEnabled()) disablePush();
              else await enablePush();
              toast.success("OK");
            }}
          >
            Push-Nachrichten
            <span className="text-xs text-subtle">{pushEnabled() ? "an" : "aus"}</span>
          </button>
        </div>
      );
    }
    if (panel === "account") {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-4">
            <AvatarMark username={profile?.username ?? ""} avatarKey={profile?.avatarKey} size={48} />
            <div>
              <p className="font-semibold">@{profile?.username}</p>
              <p className="text-xs text-subtle">{profile?.displayName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void navigate({ to: "/profile" })}
            className="flex w-full items-center justify-between rounded-2xl bg-surface px-4 py-3.5 text-sm font-medium"
          >
            {t("editProfile")}
            <ChevronRight className="size-5 text-subtle" />
          </button>
          <form
            className="space-y-2 rounded-2xl bg-surface px-4 py-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const res = await changeUsername({ data: { username: String(fd.get("username") || "") } });
              if (!res.ok) toast.error(res.error ?? "");
              else {
                toast.success("Username geändert.");
                await refresh();
              }
            }}
          >
            <p className="text-xs font-semibold uppercase text-muted">Username ändern</p>
            <Input name="username" defaultValue={profile?.username} className="lowercase" />
            <Button type="submit">Ändern</Button>
          </form>
          <label className="block rounded-2xl bg-surface px-4 py-3 text-xs font-semibold uppercase text-muted">
            Status
            <Input
              className="mt-2"
              defaultValue={profile?.statusText ?? ""}
              placeholder="AFK, ranked, …"
              onBlur={(e) => {
                void updateStatus({ data: { statusText: e.target.value } }).then(() => refresh());
              }}
            />
          </label>
          <div>
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase text-subtle">Banner</p>
            <div className="grid grid-cols-3 gap-2">
              {BANNER_PRESETS.map((b) => (
                <button
                  key={b.id || "foto"}
                  type="button"
                  onClick={() => {
                    void updatePrefs({ data: { bannerPreset: b.id } }).then(() => refresh());
                  }}
                  className={cn(
                    "h-12 overflow-hidden rounded-xl",
                    (profile?.bannerPreset || "") === b.id ? "ring-2 ring-primary" : "ring-1 ring-line",
                  )}
                  style={{ background: b.css || "#2b2d31" }}
                />
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPanel("password")}
            className="flex w-full items-center justify-between rounded-2xl bg-surface px-4 py-3.5 text-sm font-medium"
          >
            {t("setPassword")}
            <ChevronRight className="size-5 text-subtle" />
          </button>
          {canSignOut ? (
            <Button
              className="w-full"
              variant="outline"
              disabled={signingOut}
              onClick={() => {
                setSigningOut(true);
                void signOut("/login").catch(() => {
                  setSigningOut(false);
                  toast.error(t("logoutFailed"));
                });
              }}
            >
              <LogOut className="mr-2 size-4" />
              {signingOut ? "…" : t("signOut")}
            </Button>
          ) : null}
        </div>
      );
    }
    if (panel === "password") {
      return (
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await setLocalPassword({ data: { password } });
            if (!res.ok) toast.error(res.error ?? "");
            else {
              toast.success("OK");
              setPassword("");
            }
          }}
        >
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
          />
          <Button type="submit">{t("setPassword")}</Button>
        </form>
      );
    }
    if (panel === "widgets") {
      const on = parseWidgets(profile?.widgets);
      const labels: Record<WidgetId, string> = {
        music: t("widgetMusic"),
        game: t("widgetGame"),
        friends: t("widgetFriends"),
        since: t("widgetSince"),
      };
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted">{t("widgetsHint")}</p>
          {WIDGET_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={async () => {
                const next = toggleWidget(profile?.widgets, id);
                await updateWidgets({ data: { widgets: next } });
                await refresh();
              }}
              className="flex w-full items-center justify-between rounded-2xl bg-surface px-4 py-3.5"
            >
              <span className="text-sm font-medium">{labels[id]}</span>
              <span
                className={
                  on.includes(id)
                    ? "h-6 w-10 rounded-full bg-primary p-0.5"
                    : "h-6 w-10 rounded-full bg-elevated p-0.5"
                }
              >
                <span
                  className={
                    on.includes(id)
                      ? "ml-auto block size-5 rounded-full bg-white"
                      : "block size-5 rounded-full bg-subtle"
                  }
                />
              </span>
            </button>
          ))}
        </div>
      );
    }
    if (panel === "deco") {
      return (
        <div className="grid grid-cols-2 gap-2">
          {DECOS.map((d) => (
            <button
              key={d.id || "none"}
              type="button"
              onClick={async () => {
                await updateDeco({ data: { deco: d.id } });
                await refresh();
              }}
              className={
                (profile?.deco || "") === d.id
                  ? "rounded-2xl bg-primary px-4 py-4 text-sm font-semibold text-white"
                  : "rounded-2xl bg-surface px-4 py-4 text-sm font-medium"
              }
            >
              {d.id === "" ? t("none") : d.label}
            </button>
          ))}
        </div>
      );
    }
    if (panel === "dms") {
      return friends.length === 0 ? (
        <p className="text-sm text-muted">{t("noDms")}</p>
      ) : (
        <ul className="space-y-1">
          {friends.map((f) => (
            <li key={f.userId}>
              <button
                type="button"
                onClick={() => void navigate({ to: "/dm/$username", params: { username: f.username } })}
                className="flex w-full items-center gap-3 rounded-2xl bg-surface px-3 py-3 text-left"
              >
                <AvatarMark username={f.username} avatarKey={f.avatarKey} size={36} />
                <span className="flex-1 text-sm font-semibold">@{f.username}</span>
                <ChevronRight className="size-5 text-subtle" />
              </button>
            </li>
          ))}
        </ul>
      );
    }
    if (panel === "groups") {
      return groups.length === 0 ? (
        <p className="text-sm text-muted">{t("noGroups")}</p>
      ) : (
        <ul className="space-y-1">
          {groups.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => void navigate({ to: "/groups/$id", params: { id: String(g.id) } })}
                className="flex w-full items-center justify-between rounded-2xl bg-surface px-4 py-3 text-left"
              >
                <span className="text-sm font-semibold">{g.name}</span>
                <ChevronRight className="size-5 text-subtle" />
              </button>
            </li>
          ))}
        </ul>
      );
    }
    if (panel === "servers") {
      return mine.length === 0 ? (
        <button
          type="button"
          onClick={() => void navigate({ to: "/servers" })}
          className="flex w-full items-center justify-between rounded-2xl bg-surface px-4 py-3 text-sm font-semibold"
        >
          {t("createServer")}
          <ChevronRight className="size-5 text-subtle" />
        </button>
      ) : (
        <ul className="space-y-1">
          {mine.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => void navigate({ to: "/servers/$id", params: { id: String(s.id) } })}
                className="flex w-full items-center justify-between rounded-2xl bg-surface px-4 py-3 text-left"
              >
                <span>
                  <span className="block text-sm font-semibold">{s.name}</span>
                  <span className="text-xs text-subtle">{s.memberCount}</span>
                </span>
                <ChevronRight className="size-5 text-subtle" />
              </button>
            </li>
          ))}
        </ul>
      );
    }
    return null;
  }, [
    panel,
    theme,
    lang,
    profile,
    dm,
    privacy,
    activity,
    friends,
    groups,
    mine,
    password,
    signingOut,
    canSignOut,
    t,
  ]);

  return (
    <AppShell>
      <div className="px-4 py-5 sm:px-6">
        {panel ? (
          <>
            <button
              type="button"
              onClick={() => setPanel(panel === "password" ? "account" : null)}
              className="mb-4 flex items-center gap-2 text-sm font-semibold"
            >
              <ArrowLeft className="size-5" />
              {titles[panel]}
            </button>
            {body}
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">{t("settings")}</h1>
            <label className="relative mt-4 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
              <Input
                className="pl-9"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("search")}
              />
            </label>

            {show("account") || show("passwort") || show("password") ? (
              <Group title={t("accountSettings")}>
                {show("account") ? (
                  <Row icon={UserRound} label={t("account")} onClick={() => setPanel("account")} />
                ) : null}
                {show("passwort") ? (
                  <Row icon={KeyRound} label={t("setPassword")} onClick={() => setPanel("password")} />
                ) : null}
              </Group>
            ) : null}

            {show("badge") ||
            show("inhalte") ||
            show("sozial") ||
            show("clips") ||
            show("widget") ||
            show("music") ||
            show("dms") ||
            show("groups") ||
            show("friends") ||
            show("freunde") ? (
              <Group title={t("contentSocial")}>
                {show("badge") ? (
                  <Row icon={BadgeCheck} label={t("badges")} onClick={() => setPanel("badge")} />
                ) : null}
                {show("dms") ? <Row icon={MessageSquare} label={t("openDms")} onClick={() => setPanel("dms")} /> : null}
                {show("groups") || show("gruppen") ? (
                  <Row icon={UsersRound} label={t("groups")} onClick={() => setPanel("groups")} />
                ) : null}
                {show("friends") || show("freunde") ? (
                  <Row icon={Users} label={t("friends")} onClick={() => void navigate({ to: "/friends" })} />
                ) : null}
                {show("clips") ? (
                  <Row icon={Clapperboard} label={t("clips")} onClick={() => void navigate({ to: "/profile" })} />
                ) : null}
                {show("widget") || show("music") || show("game") ? (
                  <Row icon={LayoutGrid} label={t("widgets")} onClick={() => setPanel("widgets")} />
                ) : null}
                {show("deco") || show("regen") ? (
                  <Row icon={Sparkles} label={t("deco")} onClick={() => setPanel("deco")} />
                ) : null}
              </Group>
            ) : null}

            {show("privat") || show("daten") || show("privacy") ? (
              <Group title={t("dataPrivacy")}>
                <Row icon={Shield} label={t("dataPrivacy")} onClick={() => setPanel("privacy")} />
              </Group>
            ) : null}

            {show("theme") || show("sprache") || show("language") ? (
              <Group title={t("appearance")}>
                {show("theme") ? (
                  <Row icon={Palette} label={t("theme")} onClick={() => setPanel("theme")} />
                ) : null}
                {show("sprache") || show("language") ? (
                  <Row icon={Languages} label={t("language")} onClick={() => setPanel("language")} />
                ) : null}
              </Group>
            ) : null}

            {show("server") ? (
              <Group title="Server">
                <Row icon={Server} label={t("myServers")} onClick={() => setPanel("servers")} />
              </Group>
            ) : null}

            {show("forum") || show("hall") || show("qr") ? (
              <Group title={t("more")}>
                {show("forum") ? (
                  <Row icon={QrCode} label="Forum" onClick={() => void navigate({ to: "/forum" })} />
                ) : null}
                {show("hall") ? (
                  <Row icon={BadgeCheck} label="Hall" onClick={() => void navigate({ to: "/hall" })} />
                ) : null}
              </Group>
            ) : null}

            {canSignOut ? (
              <Group title={t("account")}>
                <Row
                  icon={LogOut}
                  label={t("signOut")}
                  onClick={() => {
                    setSigningOut(true);
                    void signOut("/login").catch(() => {
                      setSigningOut(false);
                      toast.error(t("logoutFailed"));
                    });
                  }}
                />
              </Group>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}
