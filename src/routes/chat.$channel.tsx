import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useMe } from "@/components/layout/me-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatLine } from "@/components/chat-line";
import { deleteMessage, listMessages, sendMessage } from "@/lib/server/social";
import type { ChatRow } from "@/lib/types";

type ChatSearch = { type?: string; with?: string };

export const Route = createFileRoute("/chat/$channel")({
  validateSearch: (s: Record<string, unknown>): ChatSearch => ({
    type: typeof s.type === "string" ? s.type : "dm",
    with: typeof s.with === "string" ? s.with : undefined,
  }),
  component: ChannelPage,
});

function ChannelPage() {
  const { channel } = Route.useParams();
  const { type, with: withUser } = Route.useSearch();
  const { signedIn, profile } = useMe();
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [body, setBody] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const channelType = type === "group" ? "group" : type === "server" ? "server" : "dm";

  async function load() {
    setRows(await listMessages({ data: { channelType, channelId: channel } }));
  }

  useEffect(() => {
    if (signedIn) void load();
  }, [signedIn, channel, channelType]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [rows.length]);

  return (
    <AppShell>
      <div className="flex h-[calc(100dvh-8rem)] flex-col px-4 py-4 sm:px-6 lg:h-dvh">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h1 className="text-2xl font-bold">{withUser ? `@${withUser}` : "Chat"}</h1>
          <Link to="/chat" className="text-xs text-muted">
            Zurück
          </Link>
        </div>
        <ul className="flex-1 space-y-4 overflow-y-auto py-4">
          {rows.map((m) => (
            <ChatLine
              key={m.id}
              m={m}
              canDelete={m.authorId === profile?.userId}
              onDelete={async (id) => {
                await deleteMessage({ data: { id } });
                setRows((cur) => cur.filter((x) => x.id !== id));
              }}
            />
          ))}
          <div ref={end} />
        </ul>
        <form
          className="flex gap-2 border-t border-line pt-3"
          onSubmit={async (e) => {
            e.preventDefault();
            await sendMessage({ data: { channelType, channelId: channel, body } });
            setBody("");
            await load();
          }}
        >
          <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Nachricht" />
          <Button type="submit">Senden</Button>
        </form>
      </div>
    </AppShell>
  );
}
