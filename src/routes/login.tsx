import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/layout/i18n-context";
import { claimUsername, resolveAuthEmail, usernameTaken } from "@/lib/server/profiles";
import { localAuthEmail, normalizeUsername, validateUsername, usernameErrorCopy } from "@/lib/username";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isPending) {
    return <main className="grid min-h-dvh place-items-center bg-bg text-muted">…</main>;
  }
  if (user) return <Navigate to="/" replace />;

  const google = GROK_PROVIDERS.find((p) => p.idp === "google");
  const rest = GROK_PROVIDERS.filter((p) => p.idp !== "google");

  async function onSubmit() {
    const name = normalizeUsername(username);
    const local = validateUsername(name);
    if (local) {
      setError(usernameErrorCopy(local));
      return;
    }
    if (password.length < 8) {
      setError("Min. 8 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === "register") {
        const check = await usernameTaken({ data: { username: name } });
        if (check.taken) {
          setError(`@${name} is taken.`);
          return;
        }
        const { error: upErr } = await authClient.signUp.email({
          email: localAuthEmail(name),
          password,
          name,
        });
        if (upErr) {
          setError(upErr.message ?? "Sign up failed.");
          return;
        }
        const claimed = await claimUsername({ data: { username: name, displayName: name } });
        if (!claimed.ok) {
          setError(claimed.error ?? "Username failed.");
          return;
        }
        await navigate({ to: "/" });
        return;
      }
      const resolved = await resolveAuthEmail({ data: { username: name } });
      const { error: inErr } = await authClient.signIn.email({
        email: resolved.email,
        password,
      });
      if (inErr) {
        setError(
          inErr.message ?? "Login failed. Passwort vergessen? Google, dann in Settings neu setzen.",
        );
        return;
      }
      await navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-elevated px-6 text-fg">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-end gap-1">
          {(["de", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={
                lang === l
                  ? "h-8 rounded-full bg-primary px-3 text-xs font-semibold text-white"
                  : "h-8 rounded-full bg-surface px-3 text-xs text-muted"
              }
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <p className="text-center text-sm font-semibold text-muted">@social</p>
        <h1 className="mt-2 text-center text-[28px] font-bold tracking-tight">
          {mode === "login" ? t("welcomeBack") : t("createAccount")}
        </h1>
        <p className="mt-2 text-center text-sm text-muted">{t("loginHint")}</p>

        <form
          className="mt-8 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmit();
          }}
        >
          <label className="block text-xs font-semibold uppercase text-muted">
            {t("username")}
            <Input
              className="mt-2 lowercase"
              value={username}
              autoComplete="username"
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@nova"
            />
          </label>
          <label className="block text-xs font-semibold uppercase text-muted">
            {t("password")}
            <Input
              className="mt-2"
              type="password"
              value={password}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {mode === "login" ? t("signIn") : t("createAccount")}
          </Button>
        </form>

        <button
          type="button"
          className="mt-4 w-full text-center text-sm text-muted"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
        >
          {mode === "login" ? t("newHere") : t("haveAccount")}
        </button>

        {authEnabled ? (
          <div className="mt-8 flex flex-col gap-3">
            <div className="flex items-center gap-3 py-1">
              <span className="h-px flex-1 bg-line-strong" />
              <span className="text-xs font-semibold uppercase text-subtle">{t("or")}</span>
              <span className="h-px flex-1 bg-line-strong" />
            </div>
            {google ? (
              <Button
                size="lg"
                className="w-full"
                variant="outline"
                onClick={() => signIn(google.providerId, { callbackURL: "/" })}
              >
                {t("withGoogle")}
              </Button>
            ) : null}
            {rest.map((p) => (
              <Button
                key={p.providerId}
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
              >
                {p.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
