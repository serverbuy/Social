import { createServerFn } from "@tanstack/react-start";
import { hashPassword } from "better-auth/crypto";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { optionalAuth } from "./optional-auth";
import { num, pairKey } from "@/lib/utils";
import {
  ensureProfileMedia,
  HALL_INVITE,
  loadProfileById,
  loadProfileByUsername,
} from "./helpers";
import {
  localAuthEmail,
  normalizeUsername,
  validateUsername,
} from "@/lib/username";
import { fetchMusicMeta, normalizeMusicLink } from "@/lib/widgets";
import type { ConnectionRow, DmPrivacy, Privacy } from "@/lib/types";

export const getMe = createServerFn({ method: "GET" })
  .middleware([optionalAuth])
  .handler(async ({ context }) => {
    if (!context.userId) return { signedIn: false as const, profile: null };
    const sql = await getSql();
    await ensureProfileMedia(sql);
    const profile = await loadProfileById(sql, context.userId);
    return { signedIn: true as const, profile };
  });

export const getProfile = createServerFn({ method: "GET" })
  .middleware([optionalAuth])
  .validator((input: { username: string }) => ({
    username: normalizeUsername(input.username),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfileMedia(sql);
    const profile = await loadProfileByUsername(sql, data.username);
    if (!profile) return { profile: null, visible: false, connections: [] as ConnectionRow[] };
    const self = context.userId === profile.userId;
    let visible = self || profile.privacy === "public";
    if (!visible && context.userId && profile.privacy === "friends") {
      const [a, b] = pairKey(context.userId, profile.userId);
      const rel = await sql<{ status: string }>`
        select status from friendships where user_a = ${a} and user_b = ${b} and status = 'accepted'
      `;
      visible = Boolean(rel[0]);
    }
    if (!visible && context.userId && profile.privacy === "server") {
      const share = await sql<{ n: number }>`
        select count(*)::int as n
        from server_members a
        join server_members b on a.server_id = b.server_id
        where a.user_id = ${context.userId} and b.user_id = ${profile.userId}
      `;
      visible = num(share[0]?.n) > 0;
    }
    const cons = await sql<Record<string, unknown>>`
      select p.user_id, p.username, p.display_name, p.avatar_key, c.status,
             c.from_id = ${profile.userId} as outgoing
      from connections c
      join profiles p on p.user_id = case when c.from_id = ${profile.userId} then c.to_id else c.from_id end
      where (c.from_id = ${profile.userId} or c.to_id = ${profile.userId})
        and c.status = 'accepted'
      limit 12
    `;
    const connections: ConnectionRow[] = cons.map((r) => ({
      userId: String(r.user_id),
      username: String(r.username),
      displayName: String(r.display_name),
      avatarKey: String(r.avatar_key),
      status: String(r.status),
      outgoing: Boolean(r.outgoing),
    }));
    return { profile, visible: visible || self, connections };
  });

export const claimUsername = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { username: string; displayName: string }) => ({
    username: normalizeUsername(input.username),
    displayName: String(input.displayName || "").trim().slice(0, 40),
  }))
  .handler(async ({ context, data }) => {
    const err = validateUsername(data.username);
    if (err) return { ok: false as const, error: err === "reserved" ? "Reserviert." : "Ungültig." };
    const sql = await getSql();
    await ensureProfileMedia(sql);
    const existing = await loadProfileById(sql, context.userId);
    if (existing) return { ok: true as const, error: null };
    const taken = await sql<{ n: number }>`
      select count(*)::int as n from profiles where username = ${data.username}
    `;
    if (num(taken[0]?.n) > 0) return { ok: false as const, error: "Username vergeben." };
    const name = data.displayName || data.username;
    await sql`
      insert into profiles (user_id, username, display_name)
      values (${context.userId}, ${data.username}, ${name})
    `;
    await sql`
      insert into username_claims (username, user_id)
      values (${data.username}, ${context.userId})
      on conflict do nothing
    `;
    return { ok: true as const, error: null };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      displayName: string;
      bio: string;
      sceneTags: string;
      privacy: Privacy;
      activityPublic: boolean;
      avatarKey?: string;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const displayName = data.displayName.trim().slice(0, 40) || "Ohne Namen";
    const bio = data.bio.trim().slice(0, 280);
    const sceneTags = data.sceneTags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 6)
      .join(",");
    const privacy: Privacy = ["public", "friends", "server", "private"].includes(data.privacy)
      ? data.privacy
      : "public";
    const avatar =
      typeof data.avatarKey === "string" &&
      data.avatarKey.startsWith("data:image/") &&
      data.avatarKey.length < 220_000
        ? data.avatarKey
        : null;
    if (avatar) {
      await sql`
        update profiles
        set display_name = ${displayName}, bio = ${bio}, scene_tags = ${sceneTags},
            privacy = ${privacy}, activity_public = ${Boolean(data.activityPublic)},
            avatar_key = ${avatar}, last_seen = now()
        where user_id = ${context.userId}
      `;
    } else {
      await sql`
        update profiles
        set display_name = ${displayName}, bio = ${bio}, scene_tags = ${sceneTags},
            privacy = ${privacy}, activity_public = ${Boolean(data.activityPublic)},
            last_seen = now()
        where user_id = ${context.userId}
      `;
    }
    return { ok: true as const };
  });

export const updateAvatar = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { avatarKey: string }) => input)
  .handler(async ({ context, data }) => {
    if (!data.avatarKey.startsWith("data:image/") || data.avatarKey.length > 220_000) {
      return { ok: false as const, error: "Bild ungültig." };
    }
    const sql = await getSql();
    await sql`update profiles set avatar_key = ${data.avatarKey}, last_seen = now() where user_id = ${context.userId}`;
    return { ok: true as const, error: null };
  });

export const updateBanner = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { bannerKey: string }) => input)
  .handler(async ({ context, data }) => {
    if (!data.bannerKey.startsWith("data:image/") || data.bannerKey.length > 400_000) {
      return { ok: false as const, error: "Banner ungültig." };
    }
    const sql = await getSql();
    await ensureProfileMedia(sql);
    await sql`update profiles set banner_key = ${data.bannerKey}, last_seen = now() where user_id = ${context.userId}`;
    return { ok: true as const, error: null };
  });

export const updateSong = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { songName: string; songData: string; songCover?: string; songLink?: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfileMedia(sql);
    await sql`
      update profiles
      set song_name = ${data.songName.slice(0, 80)},
          song_data = ${data.songData},
          song_cover = ${String(data.songCover || "")},
          song_link = ${String(data.songLink || "")},
          last_seen = now()
      where user_id = ${context.userId}
    `;
    return { ok: true as const, error: null };
  });

export const patchSongMeta = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { songName?: string; songCover?: string; songLink?: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfileMedia(sql);
    let link = typeof data.songLink === "string" ? normalizeMusicLink(data.songLink) : undefined;
    let name = typeof data.songName === "string" ? data.songName.trim().slice(0, 80) : undefined;
    let cover = typeof data.songCover === "string" ? data.songCover : undefined;
    if (link && !name && !cover) {
      const meta = await fetchMusicMeta(link);
      name = meta.title || name;
      cover = meta.cover || cover;
    }
    if (name !== undefined) {
      await sql`update profiles set song_name = ${name}, last_seen = now() where user_id = ${context.userId}`;
    }
    if (cover !== undefined) {
      await sql`update profiles set song_cover = ${cover}, last_seen = now() where user_id = ${context.userId}`;
    }
    if (link !== undefined) {
      await sql`update profiles set song_link = ${link}, last_seen = now() where user_id = ${context.userId}`;
    }
    return { ok: true as const, error: null };
  });

export const updateGame = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { gameName: string }) => ({
    gameName: String(input.gameName || "").trim().slice(0, 40),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfileMedia(sql);
    await sql`
      update profiles set game_name = ${data.gameName}, last_seen = now()
      where user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

export const updateWidgets = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { widgets: string }) => ({
    widgets: String(input.widgets || "").slice(0, 80),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfileMedia(sql);
    await sql`
      update profiles set widgets = ${data.widgets}, last_seen = now()
      where user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

export const updateDeco = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { deco: string }) => ({
    deco: String(input.deco || "").slice(0, 20),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfileMedia(sql);
    await sql`
      update profiles set deco = ${data.deco}, last_seen = now()
      where user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

export const updateBadge = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { badge: string }) => ({ badge: String(input.badge || "").slice(0, 20) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfileMedia(sql);
    await sql`update profiles set badge = ${data.badge}, last_seen = now() where user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const updateDmPrivacy = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { dmPrivacy: DmPrivacy }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfileMedia(sql);
    await sql`
      update profiles set dm_privacy = ${data.dmPrivacy}, last_seen = now()
      where user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

export const addClip = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { title: string; mediaKey: string }) => ({
    title: String(input.title || "").trim().slice(0, 40),
    mediaKey: String(input.mediaKey || ""),
  }))
  .handler(async ({ context, data }) => {
    const okType =
      data.mediaKey.startsWith("data:video/") ||
      data.mediaKey.startsWith("data:image/gif") ||
      data.mediaKey.startsWith("data:image/webp") ||
      data.mediaKey.startsWith("data:image/jpeg") ||
      data.mediaKey.startsWith("data:image/png");
    if (!okType || data.mediaKey.length < 32 || data.mediaKey.length > 6_200_000) {
      return { ok: false as const, error: "Clip ungültig oder zu groß." };
    }
    const sql = await getSql();
    await ensureProfileMedia(sql);
    await sql`
      insert into profile_clips (user_id, title, media_key)
      values (${context.userId}, ${data.title || "Clip"}, ${data.mediaKey})
    `;
    return { ok: true as const, error: null };
  });

export const deleteClip = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number }) => ({ id: Number(input.id) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from profile_clips where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const requestConnection = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { username: string }) => ({
    username: normalizeUsername(input.username),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const other = await loadProfileByUsername(sql, data.username);
    if (!other) return { ok: false as const, error: "User fehlt." };
    if (other.userId === context.userId) return { ok: false as const, error: "Nein." };
    await sql`
      insert into connections (from_id, to_id, status)
      values (${context.userId}, ${other.userId}, 'pending')
      on conflict do nothing
    `;
    return { ok: true as const, error: null };
  });

export const redeemHallInvite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code: string }) => ({
    code: String(input.code || "").trim().toUpperCase(),
  }))
  .handler(async ({ context, data }) => {
    if (data.code !== HALL_INVITE) return { ok: false as const, error: "Invite ungültig." };
    const sql = await getSql();
    await sql`update profiles set hall_access = true where user_id = ${context.userId}`;
    await sql`
      insert into hall_access_log (user_id, granted_by, method)
      values (${context.userId}, ${context.userId}, 'invite')
    `;
    return { ok: true as const, error: null };
  });

export const usernameTaken = createServerFn({ method: "GET" })
  .validator((input: { username: string }) => ({
    username: normalizeUsername(input.username),
  }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<{ n: number }>`
      select count(*)::int as n from profiles where username = ${data.username}
    `;
    return { taken: num(rows[0]?.n) > 0 };
  });

export const resolveAuthEmail = createServerFn({ method: "GET" })
  .validator((input: { username: string }) => ({
    username: normalizeUsername(input.username),
  }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<{ email: string }>`
      select u.email as email
      from profiles p
      join "user" u on u.id = p.user_id
      where p.username = ${data.username}
      limit 1
    `;
    return { email: rows[0]?.email ?? localAuthEmail(data.username) };
  });

export const setLocalPassword = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { password: string }) => ({
    password: String(input.password || ""),
  }))
  .handler(async ({ context, data }) => {
    if (data.password.length < 8) {
      return { ok: false as const, error: "Mindestens 8 Zeichen." };
    }
    const sql = await getSql();
    const hash = await hashPassword(data.password);
    const existing = await sql<{ id: string }>`
      select id from "account"
      where "userId" = ${context.userId} and "providerId" = 'credential'
      limit 1
    `;
    if (existing[0]) {
      await sql`
        update "account" set password = ${hash}, "updatedAt" = now()
        where id = ${existing[0].id}
      `;
    } else {
      const id = crypto.randomUUID();
      await sql`
        insert into "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
        values (${id}, ${context.userId}, 'credential', ${context.userId}, ${hash}, now(), now())
      `;
    }
    return { ok: true as const, error: null };
  });

export const changeUsername = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { username: string }) => ({
    username: normalizeUsername(input.username),
  }))
  .handler(async ({ context, data }) => {
    const err = validateUsername(data.username);
    if (err) return { ok: false as const, error: err === "reserved" ? "Reserviert." : "Ungültig." };
    const sql = await getSql();
    const taken = await sql<{ n: number }>`
      select count(*)::int as n from profiles
      where username = ${data.username} and user_id <> ${context.userId}
    `;
    if (num(taken[0]?.n) > 0) return { ok: false as const, error: "Username vergeben." };
    await sql`delete from username_claims where user_id = ${context.userId}`;
    await sql`
      insert into username_claims (username, user_id) values (${data.username}, ${context.userId})
      on conflict (username) do update set user_id = ${context.userId}
    `;
    await sql`
      update profiles set username = ${data.username}, last_seen = now()
      where user_id = ${context.userId}
    `;
    return { ok: true as const, error: null };
  });
