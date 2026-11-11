import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { optionalAuth } from "./optional-auth";
import { iso, num } from "@/lib/utils";
import { loadProfileById, periodPair, pushEvent, tagsOf } from "./helpers";
import type { DuoRow, LiveEvent, NominationRow, RankRow } from "@/lib/types";

type RankSql = {
  user_id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_key: string;
  scene_tags: string;
  verified: boolean;
  badge: string;
  score: number;
  prev_score: number;
  last_donation_cents: number | null;
  last_donation_at: string | Date | null;
  top_donor: string | null;
  last_overtake: string | null;
};

function mapRank(rows: RankSql[]): RankRow[] {
  return rows.map((r, i) => ({
    userId: r.user_id,
    username: r.username,
    displayName: r.display_name,
    bio: r.bio ?? "",
    avatarKey: r.avatar_key,
    sceneTags: tagsOf(r.scene_tags),
    verified: Boolean(r.verified),
    badge: String(r.badge ?? ""),
    rank: i + 1,
    score: num(r.score),
    prevScore: num(r.prev_score),
    trend: num(r.score) - num(r.prev_score),
    lastDonationCents: r.last_donation_cents == null ? null : num(r.last_donation_cents),
    lastDonationAt: r.last_donation_at ? iso(r.last_donation_at) : null,
    topDonorUsername: r.top_donor,
    lastOvertake: r.last_overtake,
  }));
}

async function famousBoard(): Promise<RankRow[]> {
  const sql = await getSql();
  const { cur, prev } = await periodPair(sql);
  const rows = await sql<RankSql>`
    select p.user_id, p.username, p.display_name, p.bio, p.avatar_key, p.scene_tags, p.verified, p.badge,
           coalesce(v.cnt, 0)::int as score,
           coalesce(pv.cnt, 0)::int as prev_score,
           null::int as last_donation_cents,
           null::timestamptz as last_donation_at,
           null::text as top_donor,
           null::text as last_overtake
    from profiles p
    left join (
      select target_id, count(*)::int as cnt from votes
      where world = 'famous' and period = ${cur} group by target_id
    ) v on v.target_id = p.user_id
    left join (
      select target_id, count(*)::int as cnt from votes
      where world = 'famous' and period = ${prev} group by target_id
    ) pv on pv.target_id = p.user_id
    order by coalesce(v.cnt, 0) desc, coalesce(pv.cnt, 0) desc, p.username
    limit 24
  `;
  return mapRank(rows);
}

async function richestBoard(): Promise<RankRow[]> {
  const sql = await getSql();
  const rows = await sql<RankSql>`
    select p.user_id, p.username, p.display_name, p.bio, p.avatar_key, p.scene_tags, p.verified, p.badge,
           coalesce(d.total, 0)::int as score,
           0 as prev_score,
           last.amount_cents::int as last_donation_cents,
           last.created_at as last_donation_at,
           top.username as top_donor,
           ov.body as last_overtake
    from profiles p
    left join (
      select recipient_id, sum(amount_cents)::int as total
      from donations where verified = true group by recipient_id
    ) d on d.recipient_id = p.user_id
    left join lateral (
      select amount_cents, created_at from donations
      where recipient_id = p.user_id and verified = true
      order by created_at desc limit 1
    ) last on true
    left join lateral (
      select pr.username from donations dn
      join profiles pr on pr.user_id = dn.donor_id
      where dn.recipient_id = p.user_id and dn.verified = true
      group by pr.username
      order by sum(dn.amount_cents) desc
      limit 1
    ) top on true
    left join lateral (
      select body from live_events
      where kind = 'overtake' and body like '%' || p.username || '%'
      order by created_at desc limit 1
    ) ov on true
    where coalesce(d.total, 0) > 0 or p.is_seed = true
    order by coalesce(d.total, 0) desc, p.username
    limit 24
  `;
  return mapRank(rows);
}

async function duoBoard(): Promise<DuoRow[]> {
  const sql = await getSql();
  const { cur, prev } = await periodPair(sql);
  const rows = await sql<Record<string, unknown>>`
    select d.id, d.name, d.bio,
           a.user_id as a_id, a.username as a_username, a.display_name as a_display,
           a.avatar_key as a_avatar, a.verified as a_verified,
           b.user_id as b_id, b.username as b_username, b.display_name as b_display,
           b.avatar_key as b_avatar, b.verified as b_verified,
           coalesce(v.cnt, 0)::int as score,
           coalesce(pv.cnt, 0)::int as prev_score
    from duos d
    join profiles a on a.user_id = d.user_a
    join profiles b on b.user_id = d.user_b
    left join (
      select target_id, count(*)::int as cnt from votes
      where world = 'duo' and period = ${cur} group by target_id
    ) v on v.target_id = d.id::text
    left join (
      select target_id, count(*)::int as cnt from votes
      where world = 'duo' and period = ${prev} group by target_id
    ) pv on pv.target_id = d.id::text
    where d.status = 'approved'
    order by coalesce(v.cnt, 0) desc, d.id
    limit 24
  `;
  return rows.map((r, i) => ({
    id: num(r.id),
    name: String(r.name),
    bio: String(r.bio ?? ""),
    a: {
      userId: String(r.a_id),
      username: String(r.a_username),
      displayName: String(r.a_display),
      avatarKey: String(r.a_avatar),
      verified: Boolean(r.a_verified),
    },
    b: {
      userId: String(r.b_id),
      username: String(r.b_username),
      displayName: String(r.b_display),
      avatarKey: String(r.b_avatar),
      verified: Boolean(r.b_verified),
    },
    rank: i + 1,
    score: num(r.score),
    prevScore: num(r.prev_score),
    trend: num(r.score) - num(r.prev_score),
  }));
}

async function liveEvents(): Promise<LiveEvent[]> {
  const sql = await getSql();
  const rows = await sql<Record<string, unknown>>`
    select id, kind, body, href, created_at from live_events
    order by created_at desc limit 20
  `;
  return rows.map((r) => ({
    id: num(r.id),
    kind: String(r.kind),
    body: String(r.body),
    href: String(r.href),
    createdAt: iso(r.created_at),
  }));
}

export const getFamousBoard = createServerFn({ method: "GET" }).handler(famousBoard);
export const getRichestBoard = createServerFn({ method: "GET" }).handler(richestBoard);
export const getDuoBoard = createServerFn({ method: "GET" }).handler(duoBoard);
export const getLiveEvents = createServerFn({ method: "GET" }).handler(liveEvents);

export const getHomePayload = createServerFn({ method: "GET" }).handler(async () => {
  const [famous, richest, duos, events] = await Promise.all([
    famousBoard(),
    richestBoard(),
    duoBoard(),
    liveEvents(),
  ]);
  return { famous, richest, duos, events };
});

export const getMyVote = createServerFn({ method: "GET" })
  .middleware([optionalAuth])
  .validator((input: { world: "famous" | "duo" }) => input)
  .handler(async ({ context, data }) => {
    if (!context.userId) return { targetId: null as string | null };
    const sql = await getSql();
    const { cur } = await periodPair(sql);
    const rows = await sql<{ target_id: string }>`
      select target_id from votes
      where voter_id = ${context.userId} and world = ${data.world} and period = ${cur}
      limit 1
    `;
    return { targetId: rows[0]?.target_id ?? null };
  });

export const vote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { world: "famous" | "duo"; targetId: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const me = await loadProfileById(sql, context.userId);
    if (!me) return { ok: false as const, error: "Erst Username claimen." };
    if (data.world === "famous" && data.targetId === me.userId) {
      return { ok: false as const, error: "Sich selbst voten zählt nicht." };
    }
    const { cur } = await periodPair(sql);
    const existing = await sql<{ target_id: string }>`
      select target_id from votes
      where voter_id = ${context.userId} and world = ${data.world} and period = ${cur}
    `;
    if (existing[0]) {
      return { ok: false as const, error: "Eine Stimme pro Zeitraum. Deine ist gesetzt." };
    }
    await sql`
      insert into votes (voter_id, world, target_id, period)
      values (${context.userId}, ${data.world}, ${data.targetId}, ${cur})
    `;
    if (data.world === "famous") {
      const p = await sql<{ username: string }>`
        select username from profiles where user_id = ${data.targetId}
      `;
      if (p[0]) {
        await pushEvent(
          sql,
          "vote",
          `@${me.username} votet @${p[0].username} bei Famous.`,
          `/u/${p[0].username}`,
        );
      }
    } else {
      await pushEvent(sql, "duo", `@${me.username} votet ein Duo.`, `/duo/${data.targetId}`);
    }
    return { ok: true as const, error: null };
  });

export const donate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { username: string; amountEuros: number }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const me = await loadProfileById(sql, context.userId);
    if (!me) return { ok: false as const, error: "Erst Username claimen.", overtake: null };
    const amountEuros = Math.round(Number(data.amountEuros));
    if (!Number.isFinite(amountEuros) || amountEuros < 5) {
      return { ok: false as const, error: "Minimum €5.", overtake: null };
    }
    if (amountEuros > 50000) {
      return { ok: false as const, error: "Cap €50.000 pro Payment.", overtake: null };
    }
    const target = await sql<{ user_id: string; username: string }>`
      select user_id, username from profiles where username = ${data.username.toLowerCase()}
    `;
    if (!target[0]) return { ok: false as const, error: "Profil nicht gefunden.", overtake: null };
    if (target[0].user_id === me.userId) {
      return { ok: false as const, error: "Selbst-Donation zählt nicht.", overtake: null };
    }

    const before = await sql<{ user_id: string; total: number }>`
      select recipient_id as user_id, sum(amount_cents)::int as total
      from donations where verified = true
      group by recipient_id
      order by total desc, recipient_id
    `;
    const cents = amountEuros * 100;
    await sql`
      insert into donations (donor_id, recipient_id, amount_cents, verified)
      values (${me.userId}, ${target[0].user_id}, ${cents}, true)
    `;
    const after = await sql<{ user_id: string; total: number }>`
      select recipient_id as user_id, sum(amount_cents)::int as total
      from donations where verified = true
      group by recipient_id
      order by total desc, recipient_id
    `;
    const rankOf = (list: { user_id: string }[], id: string) =>
      list.findIndex((r) => r.user_id === id);
    const oldRank = rankOf(before, target[0].user_id);
    const newRank = rankOf(after, target[0].user_id);
    let overtake: string | null = null;
    if (newRank >= 0 && (oldRank === -1 || newRank < oldRank)) {
      const passed = after[newRank + 1];
      if (passed) {
        const name = await sql<{ username: string }>`
          select username from profiles where user_id = ${passed.user_id}
        `;
        if (name[0]) {
          overtake = name[0].username;
          await pushEvent(
            sql,
            "overtake",
            `@${target[0].username} hat @${name[0].username} bei Richest überholt.`,
            "/rankings/richest",
          );
        }
      }
    } else {
      await pushEvent(
        sql,
        "donate",
        `@${me.username} spendet €${amountEuros} an @${target[0].username}.`,
        `/u/${target[0].username}`,
      );
    }
    return { ok: true as const, error: null, overtake };
  });

export const getDonationHistory = createServerFn({ method: "GET" })
  .validator((input: { username: string }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select d.amount_cents, d.created_at, p.username as donor
      from donations d
      join profiles p on p.user_id = d.donor_id
      join profiles r on r.user_id = d.recipient_id
      where r.username = ${data.username.toLowerCase()} and d.verified = true
      order by d.created_at desc
      limit 30
    `;
    return rows.map((r) => ({
      donor: String(r.donor),
      amountCents: num(r.amount_cents),
      createdAt: iso(r.created_at),
    }));
  });

export const getDuo = createServerFn({ method: "GET" })
  .validator((input: { id: number }) => input)
  .handler(async ({ data }) => {
    const board = await duoBoard();
    return board.find((d) => d.id === data.id) ?? null;
  });

export const nominate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: { world: "famous" | "richest" | "duo"; username: string; second?: string }) => input,
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const me = await loadProfileById(sql, context.userId);
    if (!me) return { ok: false as const, error: "Erst Username claimen." };
    const username = data.username.trim().toLowerCase().replace(/^@/, "");
    const second = data.second?.trim().toLowerCase().replace(/^@/, "") || null;
    if (!username) return { ok: false as const, error: "Username fehlt." };
    if (data.world === "duo" && !second) {
      return { ok: false as const, error: "Duo braucht zwei Usernames." };
    }
    await sql`
      insert into nominations (world, target_username, second_username, nominator_id, status)
      values (${data.world}, ${username}, ${second}, ${context.userId}, 'pending')
    `;
    return { ok: true as const, error: null };
  });

export const listNominations = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const me = await loadProfileById(sql, context.userId);
    if (!me?.isMod) return [] as NominationRow[];
    const rows = await sql<Record<string, unknown>>`
      select n.id, n.world, n.target_username, n.second_username, n.status, n.created_at,
             p.username as nominator
      from nominations n
      join profiles p on p.user_id = n.nominator_id
      order by n.created_at desc
      limit 50
    `;
    return rows.map((r) => ({
      id: num(r.id),
      world: String(r.world),
      targetUsername: String(r.target_username),
      secondUsername: r.second_username ? String(r.second_username) : null,
      nominatorUsername: String(r.nominator),
      status: String(r.status),
      createdAt: iso(r.created_at),
    }));
  });

export const moderateNomination = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: number; status: "approved" | "rejected" }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const me = await loadProfileById(sql, context.userId);
    if (!me?.isMod) return { ok: false as const, error: "Nur Mod." };
    await sql`update nominations set status = ${data.status} where id = ${data.id}`;
    if (data.status === "approved") {
      const nom = await sql<{
        world: string;
        target_username: string;
        second_username: string | null;
      }>`select world, target_username, second_username from nominations where id = ${data.id}`;
      const n = nom[0];
      if (n?.world === "duo" && n.second_username) {
        const a = await sql<{ user_id: string }>`
          select user_id from profiles where username = ${n.target_username}
        `;
        const b = await sql<{ user_id: string }>`
          select user_id from profiles where username = ${n.second_username}
        `;
        if (a[0] && b[0]) {
          await sql`
            insert into duos (user_a, user_b, name, bio, status, nominated_by)
            values (
              ${a[0].user_id}, ${b[0].user_id},
              ${n.target_username + " × " + n.second_username},
              '', 'approved', ${context.userId}
            )
          `;
        }
      }
    }
    return { ok: true as const, error: null };
  });
