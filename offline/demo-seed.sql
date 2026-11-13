-- Nur für die Offline-Test-App: ein paar Freunde & Nachrichten, damit es belebt aussieht.
insert into friendships (user_a, user_b, status, initiated_by) values
  ('dev-user', 'seed-nova', 'accepted', 'seed-nova'),
  ('dev-user', 'seed-kairo', 'accepted', 'dev-user'),
  ('dev-user', 'seed-mira', 'accepted', 'seed-mira'),
  ('dev-user', 'seed-lumen', 'pending', 'seed-lumen')
on conflict do nothing;

insert into chat_messages (channel_type, channel_id, author_id, body, created_at) values
  ('dm', 'dev-user:seed-nova', 'seed-nova', 'Hey! Willkommen bei @social 👋', now() - interval '50 minutes'),
  ('dm', 'dev-user:seed-nova', 'seed-nova', 'Stimm diese Woche bei Most Famous ab, es ist knapp 👀', now() - interval '49 minutes'),
  ('dm', 'dev-user:seed-kairo', 'seed-kairo', 'Richest-Ranking diese Woche… mal sehen, wer mich überholt 💸', now() - interval '3 hours'),
  ('dm', 'dev-user:seed-mira', 'seed-mira', 'Kommst du Samstag mit? Drei Tage wach, eine richtige Nacht 🔥', now() - interval '20 minutes')
;
