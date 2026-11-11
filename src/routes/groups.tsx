import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { useMe } from "@/components/layout/me-context";
import { useI18n } from "@/components/layout/i18n-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { createGroup, deleteGroup, listFriends, listGroups } from "@/lib/server/social";
import type { FriendRow, GroupRow } from "@/lib/types";

export const Route = createFileRoute("/groups")({ component: GroupsPage });

function GroupsPage() {
  const { signedIn } = useMe();
  const { t } = useI18n();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  async function load() {
    setGroups(await listGroups());
    setFriends((await listFriends()).filter((f) => f.status === "accepted"));
  }

  useEffect(() => {
    if (signedIn) void load();
  }, [signedIn]);

  if (pathname !== "/groups") return <Outlet />;

  return (
    <AppShell>
      <div className="px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold">{t("groups")}</h1>
        <form
          className="mt-6 max-w-lg space-y-3 rounded-2xl bg-surface p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await createGroup({ data: { name, memberUsernames: picked } });
            if (!res.ok) toast.error(res.error ?? "");
            else if (res.id) {
              toast.success("Gruppe erstellt.");
              void navigate({ to: "/groups/$id", params: { id: String(res.id) } });
            }
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <div className="flex flex-wrap gap-2">
            {friends.map((f) => {
              const on = picked.includes(f.username);
              return (
                <button
                  key={f.userId}
                  type="button"
                  onClick={() =>
                    setPicked((p) =>
                      on ? p.filter((x) => x !== f.username) : [...p, f.username],
                    )
                  }
                  className={
                    on
                      ? "h-9 rounded-full bg-primary px-3 text-xs font-semibold text-white"
                      : "h-9 rounded-full bg-elevated px-3 text-xs text-muted"
                  }
                >
                  @{f.username}
                </button>
              );
            })}
          </div>
          <Button type="submit">{t("createGroup")}</Button>
        </form>
        {groups.length === 0 ? (
          <EmptyState className="mt-8" title={t("noGroupsYet")} />
        ) : (
          <ul className="mt-8 space-y-2">
            {groups.map((g) => (
              <li key={g.id} className="flex items-stretch overflow-hidden rounded-2xl bg-surface">
                <button
                  type="button"
                  onClick={() => void navigate({ to: "/groups/$id", params: { id: String(g.id) } })}
                  className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left hover:bg-elevated/40"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{g.name}</span>
                    <span className="text-xs text-subtle">
                      {g.memberCount} Mitglieder · {g.role}
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-subtle" />
                </button>
                {g.role === "owner" ? (
                  <button
                    type="button"
                    className="grid w-12 place-items-center text-subtle hover:bg-elevated hover:text-danger"
                    aria-label="Gruppe löschen"
                    onClick={async () => {
                      if (!confirm(`Gruppe „${g.name}“ löschen?`)) return;
                      const res = await deleteGroup({ data: { id: g.id } });
                      if (!res.ok) toast.error(res.error ?? "Nicht gelöscht.");
                      else {
                        toast.success("Gruppe gelöscht.");
                        await load();
                      }
                    }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
