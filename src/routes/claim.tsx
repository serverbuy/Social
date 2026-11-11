import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { claimUsername } from "@/lib/server/profiles";
import { useMe } from "@/components/layout/me-context";
import {
  normalizeUsername,
  usernameErrorCopy,
  validateUsername,
} from "@/lib/username";

export const Route = createFileRoute("/claim")({ component: Claim });

function Claim() {
  const { user, isPending } = useCurrentUserState();
  const { profile, ready, refresh } = useMe();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isPending || !ready) {
    return <main className="grid min-h-dvh place-items-center bg-elevated text-muted">Laden…</main>;
  }
  if (!user) return <RedirectToSignIn />;
  if (profile) return <Navigate to="/" />;

  async function submit() {
    const name = normalizeUsername(username);
    const local = validateUsername(name);
    if (local) {
      setError(usernameErrorCopy(local));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await claimUsername({
        data: { username: name, displayName: displayName.trim() || name },
      });
      if (!res.ok) {
        setError(res.error ?? "Claim fehlgeschlagen.");
        return;
      }
      await refresh();
      await navigate({ to: "/" });
    } catch {
      setError("Claim fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center bg-elevated px-6 py-16 text-fg">
      <h1 className="text-center text-[28px] font-bold">Username wählen</h1>
      <label className="mt-8 block text-xs font-semibold uppercase text-muted">
        Benutzername
        <div className="relative mt-2">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
            @
          </span>
          <Input
            autoFocus
            className="pl-8 lowercase"
            value={username}
            maxLength={20}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            placeholder="nova"
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
          />
        </div>
      </label>
      <label className="mt-4 block text-xs font-semibold uppercase text-muted">
        Anzeigename
        <Input
          className="mt-2"
          value={displayName}
          maxLength={40}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Nova"
        />
      </label>
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      <Button className="mt-8 w-full" size="lg" disabled={busy} onClick={() => void submit()}>
        {busy ? "…" : "Weiter"}
      </Button>
    </main>
  );
}
