import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { useMe } from "@/components/layout/me-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { listHall } from "@/lib/server/community";
import { redeemHallInvite } from "@/lib/server/profiles";
import { timeAgo } from "@/lib/utils";
import type { HallItem } from "@/lib/types";

export const Route = createFileRoute("/hall")({ component: HallPage });

function HallPage() {
  const { signedIn, refresh } = useMe();
  const navigate = useNavigate();
  const [items, setItems] = useState<HallItem[]>([]);
  const [access, setAccess] = useState(false);
  const [code, setCode] = useState("");
  const [tag, setTag] = useState("all");

  async function load() {
    if (!signedIn) return;
    const res = await listHall();
    setAccess(res.access);
    setItems(res.items);
  }

  useEffect(() => {
    void load().catch(() => {});
  }, [signedIn]);

  const tags = ["all", ...Array.from(new Set(items.map((i) => i.tag)))];
  const shown = tag === "all" ? items : items.filter((i) => i.tag === tag);

  if (!signedIn) {
    return (
      <AppShell>
        <Locked
          onLogin={() => navigate({ to: "/login" })}
          code={code}
          setCode={setCode}
          onRedeem={null}
        />
      </AppShell>
    );
  }

  if (!access) {
    return (
      <AppShell>
        <Locked
          onLogin={null}
          code={code}
          setCode={setCode}
          onRedeem={async () => {
            const res = await redeemHallInvite({ data: { code } });
            if (!res.ok) toast.error(res.error ?? "Invite ungültig.");
            else {
              toast.success("Zugang gewährt.");
              await refresh();
              await load();
            }
          }}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold">Hall of Clowns</h1>
        <div className="mt-6 flex flex-wrap gap-2">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t)}
              className={
                tag === t
                  ? "h-9 rounded-full bg-primary px-4 text-xs font-semibold text-white"
                  : "h-9 rounded-full bg-elevated px-4 text-xs text-muted"
              }
            >
              {t}
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <EmptyState className="mt-8" title="Leeres Archiv" />
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {shown.map((item) => (
              <li key={item.id} className="rounded-2xl bg-surface p-5">
                <p className="text-xs text-subtle">{item.tag}</p>
                <h2 className="mt-2 text-xl font-bold">{item.title}</h2>
                <p className="mt-3 text-sm text-muted">{item.body}</p>
                <p className="mt-4 text-xs text-subtle">
                  @{item.posterUsername} · {timeAgo(item.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function Locked({
  onLogin,
  onRedeem,
  code,
  setCode,
}: {
  onLogin: (() => void) | null;
  onRedeem: (() => void) | null;
  code: string;
  setCode: (v: string) => void;
}) {
  return (
    <div className="px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold">Invite only</h1>
      {onLogin ? (
        <Button className="mt-8" onClick={onLogin}>
          Eintreten
        </Button>
      ) : (
        <div className="mt-8 flex max-w-md gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Invite-Code"
            className="uppercase"
          />
          <Button onClick={() => onRedeem?.()}>Einlösen</Button>
        </div>
      )}
    </div>
  );
}
