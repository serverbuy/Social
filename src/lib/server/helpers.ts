import { getSql, type Sql } from "@/lib/db";
import { iso, num } from "@/lib/utils";
import type { DmPrivacy, Privacy, Profile } from "@/lib/types";
import type { ProfileClip } from "@/lib/media";

export async function periodPair(sql?: Sql): Promise<{ cur: string; prev: string }> {
  const db = sql ?? (await getSql());
  const rows = await db<{ cur: string; prev: string }>`
    select to_char(now(), 'IYYY-"W"IW') as cur,
           to_char(now() - interval '7 days', 'IYYY-"W"IW') as prev
  `;
  return rows[0] ?? { cur: "2026-W37", prev: "2026-W36" };
}

export function tagsOf(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function mapClips(rows: Record<string, unknown>[]): ProfileClip[] {
  return rows.map((r) => ({
    id: num(r.id),
    title: String(r.title ?? ""),
    mediaKey: String(r.media_key ?? ""),
    createdAt: iso(r.created_at),
  }));
}

let mediaReady: Promise<void> | null = null;

export function ensureProfileMedia(sql: Sql): Promise<void> {
  mediaReady ??= (async () => {
    await sql.query(
      `alter table profiles add column if not exists song_name text not null default ''`,
    );
    await sql.query(
      `alter table profiles add column if not exists song_data text not null default ''`,
    );
    await sql.query(`
      create table if not exists profile_clips (
        id serial primary key,
        user_id text not null references profiles (user_id) on delete cascade,
        title text not null default '',
        media_key text not null,
        created_at timestamptz not null default now()
      )
    `);
    await sql.query(
      `create index if not exists profile_clips_user_idx on profile_clips (user_id, id desc)`,
    );
    await sql.query(
      `alter table profiles add column if not exists badge text not null default ''`,
    );
    await sql.query(
      `alter table profiles add column if not exists dm_privacy text not null default 'everyone'`,
    );
    await sql.query(
      `alter table profiles add column if not exists banner_key text not null default ''`,
    );
    await sql.query(
      `alter table profiles add column if not exists song_cover text not null default ''`,
    );
    await sql.query(
      `alter table profiles add column if not exists song_link text not null default ''`,
    );
    await sql.query(
      `alter table profiles add column if not exists game_name text not null default ''`,
    );
    await sql.query(
      `alter table profiles add column if not exists widgets text not null default ''`,
    );
    await sql.query(
      `update profiles set widgets = '' where widgets = 'music,game,ranks'`,
    );
    await sql.query(
      `alter table profiles add column if not exists deco text not null default ''`,
    );
    await sql.query(
      `alter table profiles add column if not exists status_text text not null default ''`,
    );
    await sql.query(
      `alter table profiles add column if not exists theme_id text not null default ''`,
    );
    await sql.query(
      `alter table profiles add column if not exists lang text not null default ''`,
    );
    await sql.query(
      `alter table profiles add column if not exists banner_preset text not null default ''`,
    );
    await sql.query(
      `alter table servers add column if not exists invite_code text not null default ''`,
    );
    await sql.query(`
      create table if not exists message_reactions (
        message_id integer not null references chat_messages (id) on delete cascade,
        user_id text not null,
        emoji text not null,
        created_at timestamptz not null default now(),
        primary key (message_id, user_id, emoji)
      )
    `);
    await sql.query(`
      create table if not exists chat_pins (
        channel_type text not null,
        channel_id text not null,
        message_id integer not null references chat_messages (id) on delete cascade,
        pinned_by text not null,
        created_at timestamptz not null default now(),
        primary key (channel_type, channel_id)
      )
    `);
    await sql.query(`
      create table if not exists blocks (
        user_id text not null,
        blocked_id text not null,
        created_at timestamptz not null default now(),
        primary key (user_id, blocked_id)
      )
    `);
    await sql.query(
      `alter table chat_messages add column if not exists edited_at timestamptz`,
    );
    await sql.query(
      `alter table chat_messages add column if not exists reply_to integer`,
    );
    await sql.query(`
      create table if not exists chat_typing (
        channel_type text not null,
        channel_id text not null,
        user_id text not null,
        updated_at timestamptz not null default now(),
        primary key (channel_type, channel_id, user_id)
      )
    `);
    await sql.query(`
      create table if not exists stories (
        id serial primary key,
        user_id text not null,
        media_key text not null,
        created_at timestamptz not null default now()
      )
    `);
  })().catch((err) => {
    mediaReady = null;
    throw err;
  });
  return mediaReady;
}

export async function loadClips(sql: Sql, userId: string): Promise<ProfileClip[]> {
  await ensureProfileMedia(sql);
  const rows = await sql<Record<string, unknown>>`
    select id, title, media_key, created_at
    from profile_clips
    where user_id = ${userId}
    order by id desc
    limit 8
  `;
  return mapClips(rows);
}

export function mapProfileCore(row: Record<string, unknown>): Omit<
  Profile,
  "friendsCount" | "serversCount" | "clips"
> {
  return {
    userId: String(row.user_id),
    username: String(row.username),
    displayName: String(row.display_name),
    bio: String(row.bio ?? ""),
    avatarKey: String(row.avatar_key ?? "split"),
    bannerKey: String(row.banner_key ?? ""),
    sceneTags: tagsOf(row.scene_tags),
    songName: String(row.song_name ?? ""),
    songData: String(row.song_data ?? ""),
    songCover: String(row.song_cover ?? ""),
    songLink: String(row.song_link ?? ""),
    gameName: String(row.game_name ?? ""),
    widgets: String(row.widgets ?? ""),
    deco: String(row.deco ?? ""),
    statusText: String(row.status_text ?? ""),
    themeId: String(row.theme_id ?? ""),
    lang: String(row.lang ?? ""),
    bannerPreset: String(row.banner_preset ?? ""),
    privacy: (String(row.privacy ?? "public") as Privacy) || "public",
    dmPrivacy: (String(row.dm_privacy ?? "everyone") as DmPrivacy) || "everyone",
    badge: String(row.badge ?? ""),
    activityPublic: Boolean(row.activity_public),
    verified: Boolean(row.verified),
    isSeed: Boolean(row.is_seed),
    isMod: Boolean(row.is_mod),
    hallAccess: Boolean(row.hall_access),
    createdAt: iso(row.created_at),
    lastSeen: iso(row.last_seen),
  };
}

export async function attachStats(
  sql: Sql,
  core: ReturnType<typeof mapProfileCore>,
): Promise<Profile> {
  const [friends, servers, clips] = await Promise.all([
    sql<{ n: number }>`
      select count(*)::int as n from friendships
      where status = 'accepted' and (user_a = ${core.userId} or user_b = ${core.userId})
    `,
    // The former ranking servers (famous/richest/duo) are hidden, so don't count them.
    sql<{ n: number }>`
      select count(*)::int as n from server_members m
      join servers s on s.id = m.server_id
      where m.user_id = ${core.userId} and s.slug not in ('famous', 'richest', 'duo')
    `,
    loadClips(sql, core.userId),
  ]);
  return {
    ...core,
    clips,
    friendsCount: num(friends[0]?.n),
    serversCount: num(servers[0]?.n),
  };
}

export async function loadProfileById(sql: Sql, userId: string): Promise<Profile | null> {
  const rows = await sql<Record<string, unknown>>`
    select * from profiles where user_id = ${userId} limit 1
  `;
  if (!rows[0]) return null;
  return attachStats(sql, mapProfileCore(rows[0]));
}

export async function loadProfileByUsername(sql: Sql, username: string): Promise<Profile | null> {
  const rows = await sql<Record<string, unknown>>`
    select * from profiles where username = ${username} limit 1
  `;
  if (!rows[0]) return null;
  return attachStats(sql, mapProfileCore(rows[0]));
}

export async function pushEvent(
  sql: Sql,
  kind: string,
  body: string,
  href: string,
): Promise<void> {
  await sql`
    insert into live_events (kind, body, href) values (${kind}, ${body}, ${href})
  `;
}

export const HALL_INVITE = "INNER";

