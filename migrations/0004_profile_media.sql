alter table profiles add column if not exists song_name text not null default '';
alter table profiles add column if not exists song_data text not null default '';

create table if not exists profile_clips (
  id serial primary key,
  user_id text not null references profiles (user_id) on delete cascade,
  title text not null default '',
  media_key text not null,
  created_at timestamptz not null default now()
);
create index if not exists profile_clips_user_idx on profile_clips (user_id, id desc);
