insert into servers (name, slug, description, visibility, owner_id)
select v.name, v.slug, v.description, v.visibility, coalesce(
  (select user_id from profiles where user_id = 'seed-orion' limit 1),
  (select user_id from profiles limit 1)
)
from (values
  ('Famous', 'famous', 'Most Famous. Vote und Chat.', 'public'),
  ('Richest', 'richest', 'Richest. Donate und Chat.', 'public'),
  ('Duo', 'duo', 'Duos. Vote und Chat.', 'public'),
  ('Forum', 'forum', 'Boards und Threads.', 'public'),
  ('Hall', 'hall', 'Inner circle.', 'public')
) as v(name, slug, description, visibility)
where exists (select 1 from profiles)
  and not exists (select 1 from servers s where s.slug = v.slug);

insert into server_channels (server_id, name, kind, position)
select s.id, c.name, c.kind, c.position
from servers s
join (values
  ('famous', 'general', 'text', 0),
  ('famous', 'board', 'ranking', 1),
  ('richest', 'general', 'text', 0),
  ('richest', 'board', 'ranking', 1),
  ('duo', 'general', 'text', 0),
  ('duo', 'board', 'ranking', 1),
  ('forum', 'general', 'text', 0),
  ('hall', 'general', 'text', 0)
) as c(slug, name, kind, position) on c.slug = s.slug
where not exists (
  select 1 from server_channels x where x.server_id = s.id
);
