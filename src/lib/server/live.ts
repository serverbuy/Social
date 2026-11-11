import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { ensureProfileMedia, loadProfileByUsername } from "./helpers";
import { num } from "@/lib/utils";
import { listInbox } from "./social";

export const touchSeen = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql`update profiles set last_seen = now() where user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const unreadCount = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const rows = await listInbox();
    return rows.filter((r) => r.unread).length;
  });

export const updateStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { statusText: string }) => ({
    statusText: String(input.statusText || "").trim().slice(0, 60),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfileMedia(sql);
    await sql`
      update profiles set status_text = ${data.statusText}, last_seen = now()
      where user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

export const updatePrefs = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { themeId?: string; lang?: string; bannerPreset?: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfileMedia(sql);
    if (typeof data.themeId === "string") {
      await sql`update profiles set theme_id = ${data.themeId.slice(0, 20)} where user_id = ${context.userId}`;
    }
    if (typeof data.lang === "string") {
      await sql`update profiles set lang = ${data.lang.slice(0, 8)} where user_id = ${context.userId}`;
    }
    if (typeof data.bannerPreset === "string") {
      await sql`update profiles set banner_preset = ${data.bannerPreset.slice(0, 20)} where user_id = ${context.userId}`;
    }
    return { ok: true as const };
  });

export const toggleReaction = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; emoji: string }) => ({
    id: Number(input.id),
    emoji: String(input.emoji || "").slice(0, 8),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfileMedia(sql);
    const has = await sql<{ emoji: string }>`
      select emoji from message_reactions
      where message_id = ${data.id} and user_id = ${context.userId} and emoji = ${data.emoji}
    `;
    if (has[0]) {
      await sql`
        delete from message_reactions
        where message_id = ${data.id} and user_id = ${context.userId} and emoji = ${data.emoji}
      `;
    } else {
      await sql`
        insert into message_reactions (message_id, user_id, emoji)
        values (${data.id}, ${context.userId}, ${data.emoji})
        on conflict do nothing
      `;
    }
    return { ok: true as const };
  });

export const pinMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { channelType: string; channelId: string; messageId: number }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfileMedia(sql);
    await sql`
      insert into chat_pins (channel_type, channel_id, message_id, pinned_by)
      values (${data.channelType}, ${data.channelId}, ${data.messageId}, ${context.userId})
      on conflict (channel_type, channel_id)
      do update set message_id = excluded.message_id, pinned_by = excluded.pinned_by
    `;
    return { ok: true as const };
  });

export const getPin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { channelType: string; channelId: string }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    await ensureProfileMedia(sql);
    const rows = await sql<{ message_id: number }>`
      select message_id from chat_pins
      where channel_type = ${data.channelType} and channel_id = ${data.channelId}
    `;
    return rows[0] ? num(rows[0].message_id) : null;
  });

export const blockUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { username: string }) => ({ username: String(input.username || "") }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfileMedia(sql);
    const other = await loadProfileByUsername(sql, data.username);
    if (!other) return { ok: false as const, error: "User fehlt." };
    if (other.userId === context.userId) return { ok: false as const, error: "Nein." };
    await sql`
      insert into blocks (user_id, blocked_id)
      values (${context.userId}, ${other.userId})
      on conflict do nothing
    `;
    const [a, b] = [context.userId, other.userId].sort();
    await sql`
      insert into friendships (user_a, user_b, status, initiated_by)
      values (${a}, ${b}, 'blocked', ${context.userId})
      on conflict (user_a, user_b) do update set status = 'blocked'
    `;
    return { ok: true as const, error: null };
  });

export const joinByInvite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code: string }) => ({
    code: String(input.code || "").trim().toLowerCase().slice(0, 16),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfileMedia(sql);
    if (!data.code) return { ok: false as const, error: "Code fehlt.", id: null };
    const s = await sql<{ id: number }>`select id from servers where invite_code = ${data.code} limit 1`;
    if (!s[0]) return { ok: false as const, error: "Code ungültig.", id: null };
    await sql`
      insert into server_members (server_id, user_id, role)
      values (${s[0].id}, ${context.userId}, 'member')
      on conflict do nothing
    `;
    return { ok: true as const, error: null, id: num(s[0].id) };
  });

export function makeInvite() {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += abc[Math.floor(Math.random() * abc.length)];
  return out;
}

export const setTyping = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { channelType: string; channelId: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfileMedia(sql);
    await sql`
      insert into chat_typing (channel_type, channel_id, user_id, updated_at)
      values (${data.channelType}, ${data.channelId}, ${context.userId}, now())
      on conflict (channel_type, channel_id, user_id)
      do update set updated_at = now()
    `;
    return { ok: true as const };
  });

export const listTyping = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { channelType: string; channelId: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfileMedia(sql);
    const rows = await sql<{ username: string }>`
      select p.username
      from chat_typing t
      join profiles p on p.user_id = t.user_id
      where t.channel_type = ${data.channelType}
        and t.channel_id = ${data.channelId}
        and t.user_id <> ${context.userId}
        and t.updated_at > now() - interval '6 seconds'
    `;
    return rows.map((r) => r.username);
  });

export const listStories = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const sql = await getSql();
    await ensureProfileMedia(sql);
    const rows = await sql<Record<string, unknown>>`
      select s.id, s.user_id, s.media_key, s.created_at, p.username, p.avatar_key
      from stories s
      join profiles p on p.user_id = s.user_id
      where s.created_at > now() - interval '24 hours'
      order by s.created_at desc
      limit 40
    `;
    return rows.map((r) => ({
      id: num(r.id),
      userId: String(r.user_id),
      mediaKey: String(r.media_key),
      createdAt: String(r.created_at),
      username: String(r.username),
      avatarKey: String(r.avatar_key),
    }));
  });

export const addStory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { mediaKey: string }) => ({
    mediaKey: String(input.mediaKey || ""),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfileMedia(sql);
    if (!data.mediaKey.startsWith("data:image/") && !data.mediaKey.startsWith("data:video/")) {
      return { ok: false as const, error: "Medien fehlen." };
    }
    if (data.mediaKey.length > 6_200_000) return { ok: false as const, error: "Zu groß." };
    await sql`
      insert into stories (user_id, media_key) values (${context.userId}, ${data.mediaKey})
    `;
    return { ok: true as const, error: null };
  });
