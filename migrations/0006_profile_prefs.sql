alter table profiles add column if not exists badge text not null default '';
alter table profiles add column if not exists dm_privacy text not null default 'everyone';
