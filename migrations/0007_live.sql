alter table profiles add column if not exists status_text text not null default '';
alter table profiles add column if not exists theme_id text not null default '';
alter table profiles add column if not exists lang text not null default '';
alter table profiles add column if not exists banner_preset text not null default '';

alter table servers add column if not exists invite_code text not null default '';

create table if not exists message_reactions (
  message_id integer not null references chat_messages (id) on delete cascade,
  user_id text not null,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create table if not exists chat_pins (
  channel_type text not null,
  channel_id text not null,
  message_id integer not null references chat_messages (id) on delete cascade,
  pinned_by text not null,
  created_at timestamptz not null default now(),
  primary key (channel_type, channel_id)
);

create table if not exists blocks (
  user_id text not null,
  blocked_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_id)
);
