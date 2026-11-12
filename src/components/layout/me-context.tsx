import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMe } from "@/lib/server/profiles";
import { touchSeen, unreadCount } from "@/lib/server/live";
import { notifyPush, pushEnabled } from "@/lib/push";
import { useTheme } from "./theme-context";
import { useI18n } from "./i18n-context";
import { isThemeId } from "@/lib/theme";
import type { MeState, Profile } from "@/lib/types";

type Ctx = {
  ready: boolean;
  signedIn: boolean;
  profile: Profile | null;
  unread: number;
  refresh: () => Promise<void>;
};

const MeContext = createContext<Ctx>({
  ready: false,
  signedIn: false,
  profile: null,
  unread: 0,
  refresh: async () => {},
});

export function MeProvider({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const { setTheme } = useTheme();
  const { setLang } = useI18n();
  // `loadedFor` = the session user id this state was loaded for. Until it
  // matches the current session, we are not ready — otherwise right after
  // sign-up/sign-in the shell sees a stale `signedIn: false` and bounces
  // between / and /login forever.
  const [state, setState] = useState<MeState & { ready: boolean; loadedFor: string | null }>({
    ready: false,
    signedIn: false,
    profile: null,
    loadedFor: null,
  });
  const [unread, setUnread] = useState(0);
  const hydrated = useRef<string | null>(null);
  const lastUnread = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const me = await getMe();
      setState((s) => ({ ...s, ready: true, ...me }));
      if (me.profile && hydrated.current !== me.profile.userId) {
        hydrated.current = me.profile.userId;
        if (isThemeId(me.profile.themeId)) setTheme(me.profile.themeId);
        if (me.profile.lang === "de" || me.profile.lang === "en") setLang(me.profile.lang);
      }
    } catch {
      setState((s) => ({ ...s, ready: true, signedIn: false, profile: null }));
    }
  }, [setLang, setTheme]);

  // Key on the id, not the object: useCurrentUserState() builds a fresh `user`
  // object every render, so depending on it re-ran getMe() in an endless loop.
  const userId = user?.id ?? null;
  useEffect(() => {
    if (isPending) return;
    if (!userId) {
      setState({ ready: true, signedIn: false, profile: null, loadedFor: null });
      hydrated.current = null;
      return;
    }
    let cancelled = false;
    void refresh().finally(() => {
      if (!cancelled) setState((s) => ({ ...s, loadedFor: userId }));
    });
    return () => {
      cancelled = true;
    };
  }, [userId, isPending, refresh]);

  useEffect(() => {
    if (!state.signedIn || !state.profile) return;
    void touchSeen().catch(() => {});
    void unreadCount()
      .then((n) => {
        if (pushEnabled() && n > lastUnread.current && lastUnread.current > 0) {
          notifyPush("@social", n === 1 ? "Neue Nachricht" : `${n} neue Nachrichten`);
        }
        lastUnread.current = n;
        setUnread(n);
      })
      .catch(() => {});
    const beat = window.setInterval(() => {
      void touchSeen().catch(() => {});
      void unreadCount()
        .then((n) => {
          if (pushEnabled() && n > lastUnread.current && lastUnread.current > 0) {
            notifyPush("@social", n === 1 ? "Neue Nachricht" : `${n} neue Nachrichten`);
          }
          lastUnread.current = n;
          setUnread(n);
        })
        .catch(() => {});
    }, 20_000);
    return () => window.clearInterval(beat);
  }, [state.signedIn, state.profile?.userId]);

  return (
    <MeContext.Provider
      value={{
        ready: state.ready && !isPending && (!userId || state.loadedFor === userId),
        signedIn: state.signedIn,
        profile: state.profile,
        unread,
        refresh,
      }}
    >
      {children}
    </MeContext.Provider>
  );
}

export function useMe() {
  return useContext(MeContext);
}
