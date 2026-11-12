import { createServerFn } from "@tanstack/react-start";
import { getSql, type Sql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { optionalAuth } from "./optional-auth";
import { iso, num } from "@/lib/utils";
import { loadProfileById, ensureProfileMedia } from "./helpers";
import { makeInvite } from "./live";
import type { ChannelRow, HallItem, ServerRow } from "@/lib/types";

export const DEFAULT_SERVERS = [
  {
    slug: "hall",
    name: "Hall",
    description: "Inner circle.",
    channels: [["general", "text", 0]],
  },
] as const;

export const DEFAULT_SLUGS = DEFAULT_SERVERS.map((s) => s.slug);

/**
 * Rankings and the forum were removed from the app. Older databases still hold
 * the former ranking/forum servers and ranking channels (seed + migration
 * 0005), so they are hidden here instead of deleted — no user data is
 * destroyed. Keep in sync with `helpers.ts` (server count).
 */
const REMOVED_SERVER_SLUGS = ["famous", "richest", "duo", "forum"];

let defaultsReady: Promise<void> | null = null;

export function ensureDefaultServers(sql: Sql): Promise<void> {
  defaultsReady ??= (async () => {
    const seed = await sql<{ user_id: string }>`
      select user_id from profiles where user_id = 'seed-orion' limit 1
    `;
    const any = seed[0]
      ? seed
      : await sql<{ user_id: string }>`select user_id from profiles limit 1`;
    const owner = any[0]?.user_id;
    if (!owner) return;
    for (const s of DEFAULT_SERVERS) {
      const existing = await sql<{ id: number }>`select id from servers where slug = ${s.slug}`;
      let id = num(existing[0]?.id);
      if (!id) {
        const ins = await sql<{ id: number }>`
          insert into servers (name, slug, description, visibility, owner_id)
          values (${s.name}, ${s.slug}, ${s.description}, 'public', ${owner})
          returning id
        `;
        id = num(ins[0]?.id);
      }
      if (!id) continue;
      const existingCh = await sql<{ name: string }>`
        select name from server_channels where server_id = ${id}
      `;
      const have = new Set(existingCh.map((c) => c.name));
      const wanted = [...s.channels, ["voice", "voice", 9] as const];
      for (const [name, kind, pos] of wanted) {
        if (have.has(name)) continue;
        await sql`
          insert into server_channels (server_id, name, kind, position)
          values (${id}, ${name}, ${kind}, ${pos})
        `;
      }
    }
  })().catch((err) => {
    defaultsReady = null;
    throw err;
  });
  return defaultsReady;
}

export const listServers = createServerFn({ method: "GET" })
  .middleware([optionalAuth])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureDefaultServers(sql);
    const rows = await sql<Record<string, unknown>>`
      select s.*,
        (select count(*)::int from server_members m where m.server_id = s.id) as member_count,
        sm.role as my_role
      from servers s
      left join server_members sm
        on sm.server_id = s.id and sm.user_id = ${context.userId ?? "__none__"}
      where not (s.slug = any(${REMOVED_SERVER_SLUGS}))
        and (s.visibility = 'public'
          or sm.user_id is not null
          or s.owner_id = ${context.userId ?? "__none__"})
      order by
        case s.slug
          when 'hall' then 0
          else 10
        end,
        s.id
    `;
    return rows.map((r) => ({
      id: num(r.id),
      name: String(r.name),
      slug: String(r.slug),
      description: String(r.description ?? ""),
      visibility: String(r.visibility) as ServerRow["visibility"],
      ownerId: String(r.owner_id),
      memberCount: num(r.member_count),
      joined: Boolean(r.my_role) || String(r.owner_id) === String(context.userId ?? ""),
      role: r.my_role
        ? String(r.my_role)
        : String(r.owner_id) === String(context.userId ?? "")
          ? "owner"
          : null,
      inviteCode:
        r.my_role === "owner" || String(r.owner_id) === String(context.userId ?? "")
          ? String(r.invite_code ?? "")
          : "",
    })) satisfies ServerRow[];
  });

export const getServer = createServerFn({ method: "GET" })
  .middleware([optionalAuth])
  .validator((input: { id: number }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureDefaultServers(sql);
    const s = await sql<Record<string, unknown>>`
      select s.*, sm.role as my_role
      from servers s
      left join server_members sm
        on sm.server_id = s.id and sm.user_id = ${context.userId ?? "__none__"}
      where s.id = ${data.id}
    `;
    if (!s[0] || REMOVED_SERVER_SLUGS.includes(String(s[0].slug))) return null;
    const vis = String(s[0].visibility);
    const isOwner = Boolean(context.userId) && String(s[0].owner_id) === context.userId;
    let joined = Boolean(s[0].my_role) || isOwner;
    if (isOwner && !s[0].my_role) {
      await sql`
        insert into server_members (server_id, user_id, role)
        values (${data.id}, ${context.userId}, 'owner')
        on conflict do nothing
      `;
      joined = true;
    }
    if (vis !== "public" && !joined) return { locked: true as const, server: null, channels: [] };
    const channels = await sql<Record<string, unknown>>`
      select id, name, kind, position from server_channels
      where server_id = ${data.id} and kind <> 'ranking'
      order by position, id
    `;
    return {
      locked: false as const,
      server: {
        id: num(s[0].id),
        name: String(s[0].name),
        slug: String(s[0].slug),
        description: String(s[0].description ?? ""),
        visibility: vis as ServerRow["visibility"],
        ownerId: String(s[0].owner_id),
        memberCount: 0,
        joined,
        role: s[0].my_role ? String(s[0].my_role) : isOwner ? "owner" : null,
        inviteCode: isOwner || s[0].my_role === "owner" ? String(s[0].invite_code ?? "") : "",
      } satisfies ServerRow,
      channels: channels.map(
        (c) =>
          ({
            id: num(c.id),
            name: String(c.name),
            kind: String(c.kind),
            position: num(c.position),
          }) satisfies ChannelRow,
      ),
    };
  });

export const joinServer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureDefaultServers(sql);
    const me = await loadProfileById(sql, context.userId);
    if (!me) throw new Error("Erst Username claimen.");
    const s = await sql<{ visibility: string; slug: string; owner_id: string }>`
      select visibility, slug, owner_id from servers where id = ${data.id}
    `;
    if (!s[0]) return { ok: false as const, error: "Server nicht gefunden." };
    if (s[0].owner_id === context.userId) {
      await sql`
        insert into server_members (server_id, user_id, role)
        values (${data.id}, ${context.userId}, 'owner')
        on conflict do nothing
      `;
      return { ok: true as const, error: null };
    }
    if (s[0].slug === "hall" && !me.hallAccess) {
      return { ok: false as const, error: "Hall ist locked." };
    }
    if (s[0].visibility !== "public") {
      return { ok: false as const, error: "Invite only." };
    }
    await sql`
      insert into server_members (server_id, user_id, role)
      values (${data.id}, ${context.userId}, 'member')
      on conflict do nothing
    `;
    return { ok: true as const, error: null };
  });

export const createServer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: { name: string; description: string; visibility: "public" | "invite" | "private" }) =>
      input,
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfileMedia(sql);
    const me = await loadProfileById(sql, context.userId);
    if (!me) throw new Error("Erst Username claimen.");
    const name = data.name.trim().slice(0, 40);
    if (name.length < 3) return { ok: false as const, error: "Name zu kurz.", id: null };
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32);
    const taken = await sql<{ slug: string }>`select slug from servers where slug = ${slug}`;
    if (taken[0]) return { ok: false as const, error: "Name/Slug vergeben.", id: null };
    const code = makeInvite();
    const inserted = await sql<{ id: number }>`
      insert into servers (name, slug, description, visibility, owner_id, invite_code)
      values (${name}, ${slug}, ${data.description.trim().slice(0, 200)}, ${data.visibility}, ${context.userId}, ${code})
      returning id
    `;
    const id = num(inserted[0]?.id);
    await sql`
      insert into server_members (server_id, user_id, role)
      values (${id}, ${context.userId}, 'owner')
    `;
    const channels = [
      ["general", "text", 0],
      ["media", "media", 2],
      ["announce", "announcements", 3],
      ["voice", "voice", 4],
    ] as const;
    for (const [cname, kind, pos] of channels) {
      await sql`
        insert into server_channels (server_id, name, kind, position)
        values (${id}, ${cname}, ${kind}, ${pos})
      `;
    }
    await sql`update profiles set hall_access = true where user_id = ${context.userId} and hall_access = false`;
    return { ok: true as const, error: null, id };
  });

export const updateServer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      id: number;
      name: string;
      description: string;
      visibility: "public" | "invite" | "private";
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const s = await sql<{ owner_id: string }>`
      select owner_id from servers where id = ${data.id}
    `;
    if (!s[0] || s[0].owner_id !== context.userId) {
      return { ok: false as const, error: "Nur der Owner." };
    }
    const name = data.name.trim().slice(0, 40);
    if (name.length < 2) return { ok: false as const, error: "Name zu kurz." };
    await sql`
      update servers
      set name = ${name},
          description = ${data.description.trim().slice(0, 200)},
          visibility = ${data.visibility}
      where id = ${data.id}
    `;
    return { ok: true as const, error: null };
  });

export const addServerChannel = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; name: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const s = await sql<{ owner_id: string }>`
      select owner_id from servers where id = ${data.id}
    `;
    if (!s[0] || s[0].owner_id !== context.userId) {
      return { ok: false as const, error: "Nur der Owner." };
    }
    const name = data.name
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[^\p{L}\p{N}\p{Extended_Pictographic}\p{Emoji_Presentation} _\-]/gu, "")
      .slice(0, 32);
    if (name.length < 1) return { ok: false as const, error: "Channel-Name zu kurz." };
    const pos = await sql<{ n: number }>`
      select coalesce(max(position), 0)::int as n from server_channels where server_id = ${data.id}
    `;
    await sql`
      insert into server_channels (server_id, name, kind, position)
      values (${data.id}, ${name}, 'text', ${num(pos[0]?.n) + 1})
    `;
    return { ok: true as const, error: null };
  });

export const deleteServerChannel = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; channelId: number }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const s = await sql<{ owner_id: string }>`select owner_id from servers where id = ${data.id}`;
    if (!s[0] || s[0].owner_id !== context.userId) return { ok: false as const, error: "Nur der Owner." };
    const ch = await sql<{ name: string }>`
      select name from server_channels where id = ${data.channelId} and server_id = ${data.id}
    `;
    if (!ch[0]) return { ok: false as const, error: "Channel fehlt." };
    if (ch[0].name === "general") return { ok: false as const, error: "general bleibt." };
    await sql`delete from server_channels where id = ${data.channelId} and server_id = ${data.id}`;
    return { ok: true as const, error: null };
  });

export const listServerMembers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { id: number }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select p.user_id, p.username, p.display_name, p.avatar_key, sm.role
      from server_members sm
      join profiles p on p.user_id = sm.user_id
      where sm.server_id = ${data.id}
      order by sm.role = 'owner' desc, p.username
    `;
    return rows.map((m) => ({
      userId: String(m.user_id),
      username: String(m.username),
      displayName: String(m.display_name),
      avatarKey: String(m.avatar_key),
      role: String(m.role),
    }));
  });

export const setMemberRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; userId: string; role: "admin" | "member" }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const s = await sql<{ owner_id: string }>`select owner_id from servers where id = ${data.id}`;
    if (!s[0] || s[0].owner_id !== context.userId) return { ok: false as const, error: "Nur der Owner." };
    if (data.userId === context.userId) return { ok: false as const, error: "Owner bleibt Owner." };
    await sql`
      update server_members set role = ${data.role}
      where server_id = ${data.id} and user_id = ${data.userId}
    `;
    return { ok: true as const, error: null };
  });

export const kickMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; userId: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const me = await sql<{ role: string }>`
      select role from server_members where server_id = ${data.id} and user_id = ${context.userId}
    `;
    if (!me[0] || (me[0].role !== "owner" && me[0].role !== "admin")) {
      return { ok: false as const, error: "Keine Rechte." };
    }
    const target = await sql<{ role: string }>`
      select role from server_members where server_id = ${data.id} and user_id = ${data.userId}
    `;
    if (!target[0] || target[0].role === "owner") return { ok: false as const, error: "Owner bleibt." };
    if (me[0].role === "admin" && target[0].role === "admin") {
      return { ok: false as const, error: "Admins kicken sich nicht." };
    }
    await sql`delete from server_members where server_id = ${data.id} and user_id = ${data.userId}`;
    return { ok: true as const, error: null };
  });

export const listHall = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const me = await loadProfileById(sql, context.userId);
    if (!me?.hallAccess) return { access: false as const, items: [] as HallItem[] };
    const rows = await sql<Record<string, unknown>>`
      select h.*, p.username, p.display_name
      from hall_items h
      join profiles p on p.user_id = h.poster_id
      order by h.created_at desc
    `;
    return {
      access: true as const,
      items: rows.map(
        (r) =>
          ({
            id: num(r.id),
            title: String(r.title),
            body: String(r.body),
            tag: String(r.tag),
            posterUsername: String(r.username),
            posterDisplay: String(r.display_name),
            createdAt: iso(r.created_at),
          }) satisfies HallItem,
      ),
    };
  });

export const fileReport = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { targetType: string; targetId: string; reason: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const reason = data.reason.trim().slice(0, 400);
    if (reason.length < 4) return { ok: false as const };
    await sql`
      insert into reports (reporter_id, target_type, target_id, reason)
      values (${context.userId}, ${data.targetType}, ${data.targetId}, ${reason})
    `;
    return { ok: true as const };
  });
