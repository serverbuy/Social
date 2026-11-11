-- Social core schema

create table if not exists profiles (
  user_id text primary key,
  username text not null unique,
  display_name text not null,
  bio text not null default '',
  avatar_key text not null default '',
  scene_tags text not null default '',
  privacy text not null default 'public',
  activity_public boolean not null default true,
  verified boolean not null default false,
  is_seed boolean not null default false,
  is_mod boolean not null default false,
  hall_access boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create index if not exists profiles_username_idx on profiles (username);

create table if not exists username_claims (
  username text primary key,
  user_id text not null,
  claimed_at timestamptz not null default now()
);

create table if not exists friendships (
  id serial primary key,
  user_a text not null,
  user_b text not null,
  status text not null,
  initiated_by text not null,
  created_at timestamptz not null default now(),
  unique (user_a, user_b)
);
create index if not exists friendships_user_a_idx on friendships (user_a);
create index if not exists friendships_user_b_idx on friendships (user_b);

create table if not exists connections (
  id serial primary key,
  from_id text not null,
  to_id text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (from_id, to_id)
);

create table if not exists duos (
  id serial primary key,
  user_a text not null,
  user_b text not null,
  name text not null,
  bio text not null default '',
  status text not null default 'approved',
  nominated_by text,
  created_at timestamptz not null default now()
);

create table if not exists votes (
  id serial primary key,
  voter_id text not null,
  world text not null,
  target_id text not null,
  period text not null,
  created_at timestamptz not null default now(),
  unique (voter_id, world, period)
);
create index if not exists votes_world_period_idx on votes (world, period, target_id);

create table if not exists donations (
  id serial primary key,
  donor_id text not null,
  recipient_id text not null,
  amount_cents integer not null,
  verified boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists donations_recipient_idx on donations (recipient_id);

create table if not exists live_events (
  id serial primary key,
  kind text not null,
  body text not null,
  href text not null default '/',
  created_at timestamptz not null default now()
);

create table if not exists threads (
  id serial primary key,
  board text not null,
  title text not null,
  author_id text not null,
  pinned boolean not null default false,
  hall_only boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists posts (
  id serial primary key,
  thread_id integer not null references threads (id) on delete cascade,
  author_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id serial primary key,
  channel_type text not null,
  channel_id text not null,
  author_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_channel_idx on chat_messages (channel_type, channel_id, id);

create table if not exists groups (
  id serial primary key,
  name text not null,
  owner_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  group_id integer not null references groups (id) on delete cascade,
  user_id text not null,
  role text not null default 'member',
  primary key (group_id, user_id)
);

create table if not exists servers (
  id serial primary key,
  name text not null,
  slug text not null unique,
  description text not null default '',
  visibility text not null default 'public',
  owner_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists server_channels (
  id serial primary key,
  server_id integer not null references servers (id) on delete cascade,
  name text not null,
  kind text not null default 'text',
  position integer not null default 0
);

create table if not exists server_members (
  server_id integer not null references servers (id) on delete cascade,
  user_id text not null,
  role text not null default 'member',
  primary key (server_id, user_id)
);

create table if not exists hall_items (
  id serial primary key,
  title text not null,
  body text not null,
  tag text not null,
  poster_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists hall_access_log (
  id serial primary key,
  user_id text not null,
  granted_by text not null,
  method text not null,
  created_at timestamptz not null default now()
);

create table if not exists reports (
  id serial primary key,
  reporter_id text not null,
  target_type text not null,
  target_id text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists nominations (
  id serial primary key,
  world text not null,
  target_username text not null,
  second_username text,
  nominator_id text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
