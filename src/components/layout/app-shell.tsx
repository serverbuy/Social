import { Link, Navigate, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Home, MessageSquare, Server, Settings, Users, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { AvatarMark } from "@/components/mark/avatar-mark";
import { NameBadge } from "@/components/mark/name-badge";
import { useMe } from "./me-context";
import { useI18n } from "./i18n-context";
import type { ReactNode } from "react";
import type { I18nKey } from "@/lib/i18n";

const NAV = [
  { to: "/", label: "home" as I18nKey, icon: Home, exact: true },
  { to: "/chat", label: "chat" as I18nKey, icon: MessageSquare, exact: false },
  { to: "/friends", label: "friends" as I18nKey, icon: Users, exact: false },
  { to: "/servers", label: "servers" as I18nKey, icon: Server, exact: false },
  { to: "/groups", label: "groups" as I18nKey, icon: UsersRound, exact: false },
] as const;

function BootScreen({ label }: { label: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg text-sm text-muted">{label}</div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { ready, signedIn, profile, unread } = useMe();
  const { t } = useI18n();
  const navigate = useNavigate();

  const immersiveChat =
    pathname.startsWith("/dm/") ||
    /^\/groups\/[^/]+/.test(pathname) ||
    /^\/servers\/[^/]+/.test(pathname);
  const immersivePage =
    pathname === "/settings" ||
    pathname.startsWith("/forum") ||
    pathname === "/hall";
  const immersive = immersiveChat || immersivePage;

  if (!ready) return <BootScreen label="…" />;
  if (!signedIn) return <Navigate to="/login" replace />;
  if (!profile) return <Navigate to="/claim" replace />;

  return (
    <div className="min-h-dvh text-fg">
      {!immersive ? (
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-elevated/90 lg:flex">
          <Link to="/" className="block px-5 py-5 text-base font-bold">
            @social
          </Link>
          <nav className="flex flex-1 flex-col gap-0.5 px-3">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium",
                    active ? "bg-surface text-fg" : "text-muted hover:bg-surface/60 hover:text-fg",
                  )}
                >
                  <Icon className="size-5 shrink-0" strokeWidth={1.75} />
                  <span className="truncate">{t(item.label)}</span>
                  {item.to === "/chat" && unread > 0 ? (
                    <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-danger px-1.5 text-[10px] font-bold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  ) : null}
                </Link>
              );
            })}
            <Link
              to="/settings"
              className={cn(
                "mt-auto flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium",
                pathname.startsWith("/settings")
                  ? "bg-surface text-fg"
                  : "text-muted hover:bg-surface/60 hover:text-fg",
              )}
            >
              <Settings className="size-5 shrink-0" strokeWidth={1.75} />
              {t("settings")}
            </Link>
          </nav>
          <div className="px-4 py-4">
            <Link to="/profile" className="flex items-center gap-2">
              <AvatarMark username={profile.username} avatarKey={profile.avatarKey} size={36} />
              <span className="block truncate text-sm font-medium text-fg">
                @{profile.username}
                <NameBadge badge={profile.badge} />
              </span>
            </Link>
          </div>
        </aside>
      ) : null}

      {!immersive ? (
        <header className="sticky top-0 z-20 flex items-center justify-between bg-bg/80 px-4 py-3 backdrop-blur lg:hidden">
          <Link to="/" className="text-base font-bold">
            @social
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/settings"
              className="grid size-9 place-items-center rounded-full text-muted hover:bg-surface hover:text-fg"
              aria-label={t("settings")}
            >
              <Settings className="size-5" />
            </Link>
            <Link to="/profile">
              <AvatarMark username={profile.username} avatarKey={profile.avatarKey} size={32} />
            </Link>
          </div>
        </header>
      ) : null}

      <main className={immersive ? "" : "lg:pl-60"}>
        <div
          className={
            immersive
              ? "min-h-dvh"
              : "mx-auto min-h-[calc(100dvh-3.5rem)] max-w-3xl pb-24 lg:min-h-dvh lg:pb-10"
          }
        >
          {immersivePage ? (
            <div className="flex items-center gap-1 px-2 py-1.5">
              <button
                type="button"
                onClick={() => {
                  if (window.history.length > 1) window.history.back();
                  else void navigate({ to: "/" });
                }}
                className="grid size-11 place-items-center rounded-full hover:bg-surface"
                aria-label="Zurück"
              >
                <ArrowLeft className="size-6" />
              </button>
            </div>
          ) : null}
          {children}
        </div>
      </main>

      {!immersive ? (
        <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-elevated/95 lg:hidden">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium",
                  active ? "text-fg" : "text-subtle",
                )}
              >
                <span className="relative">
                  <Icon className="size-5" strokeWidth={active ? 2.2 : 1.75} />
                  {item.to === "/chat" && unread > 0 ? (
                    <span className="absolute -right-2 -top-1 size-2 rounded-full bg-danger" />
                  ) : null}
                </span>
                <span className="truncate">{t(item.label)}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}

