import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { dmChannelId, iso, num, pairKey } from "@/lib/utils";
import { loadProfileById, loadProfileByUsername, ensureProfileMedia } from "./helpers";
import { normalizeUsername } from "@/lib/username";
import type { ChatRow, FriendRow, GroupRow } from "@/lib/types";

function mapChat(rows: Record<string, unknown>[]): ChatRow[] {
  return rows.map((r) => ({
    id: num(r.id),
    channelType: String(r.channel_type),
    channelId: String(r.channel_id),
    authorId: String(r.author_id),
    authorUsername: String(r.username),
    authorDisplay: String(r.display_name),
    authorAvatar: String(r.avatar_key),
    authorBadge: String(r.badge ?? ""),
    body: String(r.body),
    createdAt: iso(r.created_at),
    editedAt: r.edited_at ? iso(r.edited_at) : null,
    replyTo: r.reply_to != null ? num(r.reply_to) : null,
    reactions: [],
    authorRole: String(r.author_role ?? ""),
  }));
}

export const listFriends = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select f.status, f.initiated_by, f.created_at,
             p.user_id, p.username, p.display_name, p.avatar_key, p.last_seen, p.is_seed
      from friendships f
      join profiles p on p.user_id = case
        when f.user_a = ${context.userId} then f.user_b else f.user_a end
      where f.user_a = ${context.userId} or f.user_b = ${context.userId}
      order by f.status = 'accepted' desc, p.username
    `;
    const now = Date.now();
    return rows.map((r) => {
      const last = iso(r.last_seen);
      const lastMs = new Date(last).getTime();
      const online = Boolean(r.is_seed) || (Number.isFinite(lastMs) && now - lastMs < 5 * 60 * 1000);
      return {
        userId: String(r.user_id),
        username: String(r.username),
        displayName: String(r.display_name),
        avatarKey: String(r.avatar_key),
        status: String(r.status) as FriendRow["status"],
        incoming: String(r.initiated_by) !== context.userId && String(r.status) === "pending",
        lastSeen: last,
        online,
        lastBody: "",
        lastAt: "",
        unread: false,
      } satisfies FriendRow;
    });
  });

export const addFriend = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { username: string; note?: string }) => ({
    username: normalizeUsername(input.username),
    note: typeof input.note === "string" ? input.note.trim().slice(0, 120) : "",
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const me = await loadProfileById(sql, context.userId);
    if (!me) return { ok: false as const, error: "Erst Username claimen." };
    const other = await loadProfileByUsername(sql, data.username);
    if (!other) return { ok: false as const, error: "Kein Profil unter diesem @username." };
    if (other.userId === me.userId) return { ok: false as const, error: "Das bist du." };
    const [a, b] = pairKey(me.userId, other.userId);
    const existing = await sql<{ status: string; initiated_by: string }>`
      select status, initiated_by from friendships where user_a = ${a} and user_b = ${b}
    `;
    if (existing[0]?.status === "blocked") {
      return { ok: false as const, error: "Block aktiv." };
    }
    if (existing[0]?.status === "accepted") {
      return { ok: false as const, error: "Ihr seid bereits Friends." };
    }
    if (existing[0]?.status === "pending") {
      return { ok: true as const, error: null, auto: false };
    }
    const status = other.isSeed ? "accepted" : "pending";
    await sql`
      insert into friendships (user_a, user_b, status, initiated_by)
      values (${a}, ${b}, ${status}, ${me.userId})
      on conflict (user_a, user_b) do nothing
    `;
    if (data.note) {
      await sql`
        insert into chat_messages (channel_type, channel_id, author_id, body)
        values (
          'dm', ${dmChannelId(me.userId, other.userId)}, ${me.userId}, ${data.note}
        )
      `;
    } else if (other.isSeed) {
      await sql`
        insert into chat_messages (channel_type, channel_id, author_id, body)
        values (
          'dm', ${dmChannelId(me.userId, other.userId)}, ${other.userId},
          ${"Anfrage akzeptiert."}
        )
      `;
    }
    return { ok: true as const, error: null, auto: other.isSeed };
  });


export const respondFriend = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; action: "accept" | "decline" | "block" }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const [a, b] = pairKey(context.userId, data.userId);
    const status =
      data.action === "accept" ? "accepted" : data.action === "block" ? "blocked" : "declined";
    await sql`
      update friendships set status = ${status}
      where user_a = ${a} and user_b = ${b}
        and (user_a = ${context.userId} or user_b = ${context.userId})
    `;
    return { ok: true };
  });

export const listMessages = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { channelType: string; channelId: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfileMedia(sql);
    if (data.channelType === "dm") {
      const parts = data.channelId.split(":");
      if (!parts.includes(context.userId)) throw new Error("Kein Zugriff.");
    }
    if (data.channelType === "group") {
      const gid = Number(data.channelId);
      const mem = await sql<{ user_id: string }>`
        select user_id from group_members
        where group_id = ${gid} and user_id = ${context.userId}
      `;
      if (!mem[0]) {
        const own = await sql<{ owner_id: string }>`
          select owner_id from groups where id = ${gid}
        `;
        if (own[0]?.owner_id === context.userId) {
          await sql`
            insert into group_members (group_id, user_id, role)
            values (${gid}, ${context.userId}, 'owner')
            on conflict do nothing
          `;
        } else {
          throw new Error("Kein Zugriff.");
        }
      }
    }
    if (data.channelType === "server") {
      const serverId = Number(data.channelId.split(":")[0]);
      const mem = await sql<{ user_id: string }>`
        select user_id from server_members
        where server_id = ${serverId} and user_id = ${context.userId}
      `;
      if (!mem[0]) {
        const own = await sql<{ owner_id: string }>`
          select owner_id from servers where id = ${serverId}
        `;
        if (own[0]?.owner_id === context.userId) {
          await sql`
            insert into server_members (server_id, user_id, role)
            values (${serverId}, ${context.userId}, 'owner')
            on conflict do nothing
          `;
        } else {
          throw new Error("Kein Zugriff.");
        }
      }
    }
    const rows = await sql<Record<string, unknown>>`
      select m.*, p.username, p.display_name, p.avatar_key, p.badge
      from chat_messages m
      join profiles p on p.user_id = m.author_id
      where m.channel_type = ${data.channelType} and m.channel_id = ${data.channelId}
      order by m.id desc
      limit 80
    `;
    const mapped = mapChat(rows).reverse();
    const ids = mapped.map((m) => m.id);
    if (ids.length) {
      const reacts = await sql<{ message_id: number; emoji: string; n: number; mine: boolean }>`
        select message_id, emoji, count(*)::int as n,
               bool_or(user_id = ${context.userId}) as mine
        from message_reactions
        where message_id = any(${ids})
        group by message_id, emoji
      `;
      const by = new Map<number, ChatRow["reactions"]>();
      for (const r of reacts) {
        const list = by.get(num(r.message_id)) ?? [];
        list.push({ emoji: r.emoji, count: num(r.n), mine: Boolean(r.mine) });
        by.set(num(r.message_id), list);
      }
      for (const m of mapped) m.reactions = by.get(m.id) ?? [];
    }
    return mapped;
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { channelType: string; channelId: string; body: string; replyTo?: number | null }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfileMedia(sql);
    const me = await loadProfileById(sql, context.userId);
    if (!me) throw new Error("Erst Username claimen.");
    const body =
      data.body.startsWith("img:data:image/") || data.body.startsWith("gif:")
        ? data.body.slice(0, 240_000)
        : data.body.trim().slice(0, 1000);
    if (!body) return { ok: false as const };
    if (data.channelType === "dm") {
      const parts = data.channelId.split(":");
      if (!parts.includes(context.userId)) throw new Error("Kein Zugriff.");
      const otherId = parts.find((p) => p !== context.userId);
      if (otherId) {
        await ensureProfileMedia(sql);
        const blocked = await sql<{ user_id: string }>`
          select user_id from blocks
          where (user_id = ${context.userId} and blocked_id = ${otherId})
             or (user_id = ${otherId} and blocked_id = ${context.userId})
        `;
        if (blocked[0]) return { ok: false as const, error: "Block." };
        const other = await loadProfileById(sql, otherId);
        if (other?.dmPrivacy === "nobody") {
          return { ok: false as const, error: "DMs sind zu." };
        }
        if (other?.dmPrivacy === "friends") {
          const [a, b] = pairKey(context.userId, otherId);
          const rel = await sql<{ status: string }>`
            select status from friendships
            where user_a = ${a} and user_b = ${b} and status = 'accepted'
          `;
          if (!rel[0]) return { ok: false as const, error: "Nur Freunde können DM schreiben." };
        }
      }
    }
    if (data.channelType === "server") {
      const [sid, cname] = data.channelId.split(":");
      const mem = await sql<{ role: string }>`
        select role from server_members
        where server_id = ${Number(sid)} and user_id = ${context.userId}
      `;
      if (!mem[0]) {
        const own = await sql<{ owner_id: string }>`
          select owner_id from servers where id = ${Number(sid)}
        `;
        if (own[0]?.owner_id !== context.userId) {
          return { ok: false as const, error: "Kein Zugriff." };
        }
        await sql`
          insert into server_members (server_id, user_id, role)
          values (${Number(sid)}, ${context.userId}, 'owner')
          on conflict do nothing
        `;
      } else if (cname === "announce" && mem[0].role !== "owner" && mem[0].role !== "admin") {
        return { ok: false as const, error: "Nur Admin kann hier schreiben." };
      }
    }
    if (data.channelType === "group") {
      const gid = Number(data.channelId);
      const mem = await sql<{ user_id: string }>`
        select user_id from group_members where group_id = ${gid} and user_id = ${context.userId}
      `;
      if (!mem[0]) {
        const own = await sql<{ owner_id: string }>`select owner_id from groups where id = ${gid}`;
        if (own[0]?.owner_id !== context.userId) {
          return { ok: false as const, error: "Kein Zugriff." };
        }
        await sql`
          insert into group_members (group_id, user_id, role)
          values (${gid}, ${context.userId}, 'owner')
          on conflict do nothing
        `;
      }
    }
    const replyTo = data.replyTo != null && Number.isFinite(data.replyTo) ? Number(data.replyTo) : null;
    await sql`
      insert into chat_messages (channel_type, channel_id, author_id, body, reply_to)
      values (${data.channelType}, ${data.channelId}, ${context.userId}, ${body}, ${replyTo})
    `;
    return { ok: true as const };
  });

export const editMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; body: string }) => ({
    id: Number(input.id),
    body: String(input.body || "").trim().slice(0, 1000),
  }))
  .handler(async ({ context, data }) => {
    if (!data.body) return { ok: false as const, error: "Leer." };
    const sql = await getSql();
    await ensureProfileMedia(sql);
    const rows = await sql<{ author_id: string }>`
      select author_id from chat_messages where id = ${data.id}
    `;
    if (!rows[0] || rows[0].author_id !== context.userId) {
      return { ok: false as const, error: "Nur eigene Nachrichten." };
    }
    await sql`
      update chat_messages set body = ${data.body}, edited_at = now() where id = ${data.id}
    `;
    return { ok: true as const, error: null };
  });

export const deleteMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number }) => ({ id: Number(input.id) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{
      author_id: string;
      channel_type: string;
      channel_id: string;
    }>`
      select author_id, channel_type, channel_id from chat_messages where id = ${data.id}
    `;
    const msg = rows[0];
    if (!msg) return { ok: false as const };
    let allowed = msg.author_id === context.userId;
    if (!allowed && msg.channel_type === "group") {
      const owner = await sql<{ owner_id: string }>`
        select owner_id from groups where id = ${Number(msg.channel_id)}
      `;
      allowed = owner[0]?.owner_id === context.userId;
    }
    if (!allowed) return { ok: false as const };
    await sql`delete from chat_messages where id = ${data.id}`;
    return { ok: true as const };
  });


export const listGroups = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select g.id, g.name, g.owner_id, gm.role,
             (select count(*)::int from group_members x where x.group_id = g.id) as member_count
      from groups g
      left join group_members gm on gm.group_id = g.id and gm.user_id = ${context.userId}
      where gm.user_id = ${context.userId} or g.owner_id = ${context.userId}
      order by g.id desc
    `;
    return rows.map((r) => ({
      id: num(r.id),
      name: String(r.name),
      ownerId: String(r.owner_id),
      memberCount: num(r.member_count),
      role: String(r.role ?? (String(r.owner_id) === context.userId ? "owner" : "member")),
    })) satisfies GroupRow[];
  });

export const createGroup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { name: string; memberUsernames: string[] }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const me = await loadProfileById(sql, context.userId);
    if (!me) throw new Error("Erst Username claimen.");
    const name = data.name.trim().slice(0, 40);
    if (name.length < 2) return { ok: false as const, error: "Name zu kurz.", id: null };
    const inserted = await sql<{ id: number }>`
      insert into groups (name, owner_id) values (${name}, ${context.userId})
      returning id
    `;
    const id = num(inserted[0]?.id);
    await sql`
      insert into group_members (group_id, user_id, role)
      values (${id}, ${context.userId}, 'owner')
    `;
    for (const raw of data.memberUsernames) {
      const u = normalizeUsername(raw);
      const p = await loadProfileByUsername(sql, u);
      if (p && p.userId !== context.userId) {
        await sql`
          insert into group_members (group_id, user_id, role)
          values (${id}, ${p.userId}, 'member')
          on conflict do nothing
        `;
      }
    }
    return { ok: true as const, error: null, id };
  });

export const getGroup = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { id: number }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    let g = await sql<Record<string, unknown>>`
      select g.id, g.name, g.owner_id, gm.role
      from groups g
      join group_members gm on gm.group_id = g.id and gm.user_id = ${context.userId}
      where g.id = ${data.id}
    `;
    if (!g[0]) {
      const owned = await sql<Record<string, unknown>>`
        select id, name, owner_id from groups
        where id = ${data.id} and owner_id = ${context.userId}
      `;
      if (owned[0]) {
        await sql`
          insert into group_members (group_id, user_id, role)
          values (${data.id}, ${context.userId}, 'owner')
          on conflict do nothing
        `;
        g = [{ ...owned[0], role: "owner" }];
      }
    }
    if (!g[0]) return null;
    const members = await sql<Record<string, unknown>>`
      select p.user_id, p.username, p.display_name, p.avatar_key, gm.role
      from group_members gm
      join profiles p on p.user_id = gm.user_id
      where gm.group_id = ${data.id}
      order by gm.role = 'owner' desc, p.username
    `;
    return {
      id: num(g[0].id),
      name: String(g[0].name),
      ownerId: String(g[0].owner_id),
      role: String(g[0].role),
      members: members.map((m) => ({
        userId: String(m.user_id),
        username: String(m.username),
        displayName: String(m.display_name),
        avatarKey: String(m.avatar_key),
        role: String(m.role),
      })),
    };
  });

export const deleteGroup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number }) => ({ id: Number(input.id) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const g = await sql<{ owner_id: string }>`
      select owner_id from groups where id = ${data.id}
    `;
    if (!g[0] || g[0].owner_id !== context.userId) {
      return { ok: false as const, error: "Nur der Owner kann die Gruppe löschen." };
    }
    await sql`
      delete from chat_messages
      where channel_type = 'group' and channel_id = ${String(data.id)}
    `;
    await sql`delete from groups where id = ${data.id} and owner_id = ${context.userId}`;
    return { ok: true as const, error: null };
  });

export const addGroupMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; username: string }) => ({
    id: Number(input.id),
    username: normalizeUsername(input.username),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const g = await sql<{ owner_id: string }>`
      select owner_id from groups where id = ${data.id}
    `;
    if (!g[0] || g[0].owner_id !== context.userId) {
      return { ok: false as const, error: "Nur der Owner." };
    }
    const p = await loadProfileByUsername(sql, data.username);
    if (!p) return { ok: false as const, error: "User nicht gefunden." };
    await sql`
      insert into group_members (group_id, user_id, role)
      values (${data.id}, ${p.userId}, 'member')
      on conflict do nothing
    `;
    return { ok: true as const, error: null };
  });

let chatReady: Promise<void> | null = null;
function ensureChatReads(sql: Awaited<ReturnType<typeof getSql>>) {
  chatReady ??= sql
    .query(
      `create table if not exists chat_reads (
        user_id text not null,
        channel_id text not null,
        last_id integer not null default 0,
        primary key (user_id, channel_id)
      )`,
    )
    .then(() => undefined)
    .catch((err) => {
      chatReady = null;
      throw err;
    });
  return chatReady;
}

export const listInbox = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureChatReads(sql);
    const friends = await listFriends();
    const accepted = friends.filter((f) => f.status === "accepted");
    if (accepted.length === 0) return accepted;
    const ids = accepted.map((f) => dmChannelId(context.userId, f.userId));
    const last = await sql<Record<string, unknown>>`
      select distinct on (channel_id) channel_id, body, created_at, id, author_id
      from chat_messages
      where channel_type = 'dm' and channel_id = any(${ids})
      order by channel_id, id desc
    `;
    const reads = await sql<{ channel_id: string; last_id: number }>`
      select channel_id, last_id from chat_reads
      where user_id = ${context.userId} and channel_id = any(${ids})
    `;
    const lastMap = new Map(last.map((r) => [String(r.channel_id), r]));
    const readMap = new Map(reads.map((r) => [r.channel_id, num(r.last_id)]));
    const rows = accepted.map((f) => {
      const ch = dmChannelId(context.userId, f.userId);
      const m = lastMap.get(ch);
      const lastId = m ? num(m.id) : 0;
      return {
        ...f,
        lastBody: m ? String(m.body) : "",
        lastAt: m ? iso(m.created_at) : "",
        unread: lastId > (readMap.get(ch) ?? 0) && String(m?.author_id ?? "") !== context.userId,
      };
    });
    rows.sort((a, b) => (b.lastAt || "").localeCompare(a.lastAt || ""));
    return rows;
  });

export const markRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { channelId: string; lastId: number }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureChatReads(sql);
    await sql`
      insert into chat_reads (user_id, channel_id, last_id)
      values (${context.userId}, ${data.channelId}, ${data.lastId})
      on conflict (user_id, channel_id) do update set last_id = excluded.last_id
    `;
    return { ok: true as const };
  });

export const getPeerRead = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { channelId: string; otherId: string }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    await ensureChatReads(sql);
    const rows = await sql<{ last_id: number }>`
      select last_id from chat_reads
      where user_id = ${data.otherId} and channel_id = ${data.channelId}
    `;
    return rows[0] ? num(rows[0].last_id) : 0;
  });

export const searchPeople = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { q: string }) => ({ q: String(input.q || "").trim().slice(0, 24) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const q = data.q.replace(/^@/, "");
    if (q.length < 1) return [];
    const like = `%${q.toLowerCase()}%`;
    const rows = await sql<Record<string, unknown>>`
      select user_id, username, display_name, avatar_key
      from profiles
      where user_id <> ${context.userId}
        and (lower(username) like ${like} or lower(display_name) like ${like})
      order by username
      limit 12
    `;
    return rows.map((r) => ({
      userId: String(r.user_id),
      username: String(r.username),
      displayName: String(r.display_name),
      avatarKey: String(r.avatar_key),
    }));
  });


export const listGlobalPeek = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<Record<string, unknown>>`
    select m.*, p.username, p.display_name, p.avatar_key
    from chat_messages m
    join profiles p on p.user_id = m.author_id
    where m.channel_type = 'global' and m.channel_id = 'global'
    order by m.id desc
    limit 8
  `;
  return mapChat(rows).reverse();
});
