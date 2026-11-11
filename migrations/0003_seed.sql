-- Scene community seed. Periods use the current ISO week so rankings are live.

insert into profiles (user_id, username, display_name, bio, avatar_key, scene_tags, verified, is_seed, is_mod, hall_access)
values
  ('seed-nova', 'nova', 'Nova Chen', 'Headliner. Kein Mythos — nur Wiederholung, bis der Raum sie kennt.', 'split', 'techno,berlin,night', true, true, true, true),
  ('seed-kairo', 'kairo', 'Kairo Voss', 'Zahlt sichtbar. Spricht wenig. Streetwear als Bilanz.', 'invert', 'streetwear,money,berlin', true, true, false, true),
  ('seed-lumen', 'lumen', 'Lumen Park', 'Licht statt Logo. Installationen, die man nicht screenshotten sollte.', 'stripe', 'art,light,underground', true, true, false, true),
  ('seed-vex', 'vex', 'Vex', 'Keller, kein Booking. Wer fragt, ist falsch.', 'slash', 'underground,rave', false, true, false, true),
  ('seed-iris', 'iris', 'Iris M.', 'Tür, Liste, Blick. Nightlife als Handwerk.', 'corner', 'nightlife,door', true, true, false, false),
  ('seed-ash', 'ash', 'Ash R.', 'Wände vor Feeds. Graffiti, das die City löschen will.', 'frame', 'graffiti,street', false, true, false, true),
  ('seed-rex', 'rex', 'REX', 'Mic, nicht Bio. Szenenrap ohne Playlist-Pflege.', 'split', 'rap,scene', false, true, false, false),
  ('seed-sol', 'sol', 'Sol A.', 'Lookbook ohne Branddeal. Fashion als Haltung.', 'invert', 'fashion,runway', true, true, false, false),
  ('seed-mira', 'mira', 'Mira K.', 'Drei Tage wach, eine richtige Nacht.', 'stripe', 'rave,techno', false, true, false, true),
  ('seed-juno', 'juno', 'Juno', 'Zweite Stimme. Erste Idee.', 'slash', 'duo,art', false, true, false, false),
  ('seed-orion', 'orion', 'Orion', 'Server-Owner. Weniger Chaos, mehr Channel.', 'corner', 'community,techno', true, true, false, true),
  ('seed-nyx', 'nyx', 'Nyx', 'Archiviert, was andere löschen. Hall-only.', 'frame', 'archive,inside', false, true, true, true)
on conflict (user_id) do nothing;

insert into username_claims (username, user_id)
select username, user_id from profiles
on conflict (username) do nothing;

-- Famous votes, current week
insert into votes (voter_id, world, target_id, period)
values
  ('seed-kairo', 'famous', 'seed-nova', to_char(now(), 'IYYY-"W"IW')),
  ('seed-lumen', 'famous', 'seed-nova', to_char(now(), 'IYYY-"W"IW')),
  ('seed-vex', 'famous', 'seed-nova', to_char(now(), 'IYYY-"W"IW')),
  ('seed-ash', 'famous', 'seed-nova', to_char(now(), 'IYYY-"W"IW')),
  ('seed-sol', 'famous', 'seed-nova', to_char(now(), 'IYYY-"W"IW')),
  ('seed-juno', 'famous', 'seed-nova', to_char(now(), 'IYYY-"W"IW')),
  ('seed-iris', 'famous', 'seed-kairo', to_char(now(), 'IYYY-"W"IW')),
  ('seed-rex', 'famous', 'seed-kairo', to_char(now(), 'IYYY-"W"IW')),
  ('seed-mira', 'famous', 'seed-lumen', to_char(now(), 'IYYY-"W"IW')),
  ('seed-orion', 'famous', 'seed-vex', to_char(now(), 'IYYY-"W"IW')),
  ('seed-nyx', 'famous', 'seed-iris', to_char(now(), 'IYYY-"W"IW')),
  ('seed-nova', 'famous', 'seed-lumen', to_char(now(), 'IYYY-"W"IW'))
on conflict do nothing;

-- Famous votes, previous week (trend)
insert into votes (voter_id, world, target_id, period)
values
  ('seed-kairo', 'famous', 'seed-kairo', to_char(now() - interval '7 days', 'IYYY-"W"IW')),
  ('seed-lumen', 'famous', 'seed-nova', to_char(now() - interval '7 days', 'IYYY-"W"IW')),
  ('seed-vex', 'famous', 'seed-lumen', to_char(now() - interval '7 days', 'IYYY-"W"IW')),
  ('seed-ash', 'famous', 'seed-vex', to_char(now() - interval '7 days', 'IYYY-"W"IW')),
  ('seed-sol', 'famous', 'seed-sol', to_char(now() - interval '7 days', 'IYYY-"W"IW')),
  ('seed-juno', 'famous', 'seed-nova', to_char(now() - interval '7 days', 'IYYY-"W"IW')),
  ('seed-iris', 'famous', 'seed-iris', to_char(now() - interval '7 days', 'IYYY-"W"IW')),
  ('seed-rex', 'famous', 'seed-rex', to_char(now() - interval '7 days', 'IYYY-"W"IW')),
  ('seed-mira', 'famous', 'seed-mira', to_char(now() - interval '7 days', 'IYYY-"W"IW')),
  ('seed-orion', 'famous', 'seed-orion', to_char(now() - interval '7 days', 'IYYY-"W"IW')),
  ('seed-nyx', 'famous', 'seed-nyx', to_char(now() - interval '7 days', 'IYYY-"W"IW')),
  ('seed-nova', 'famous', 'seed-nova', to_char(now() - interval '7 days', 'IYYY-"W"IW'))
on conflict do nothing;

insert into duos (user_a, user_b, name, bio, status, nominated_by)
values
  ('seed-nova', 'seed-kairo', 'Night Circuit', 'Stimme und Bilanz. Der Raum kennt beide.', 'approved', 'seed-orion'),
  ('seed-lumen', 'seed-vex', 'Glass House', 'Licht und Keller. Kein Kompromiss.', 'approved', 'seed-nyx'),
  ('seed-iris', 'seed-ash', 'Afterhours', 'Tür und Wand. Die Stadt dazwischen.', 'approved', 'seed-mira')
on conflict do nothing;

insert into votes (voter_id, world, target_id, period)
values
  ('seed-mira', 'duo', '1', to_char(now(), 'IYYY-"W"IW')),
  ('seed-orion', 'duo', '1', to_char(now(), 'IYYY-"W"IW')),
  ('seed-nyx', 'duo', '1', to_char(now(), 'IYYY-"W"IW')),
  ('seed-sol', 'duo', '1', to_char(now(), 'IYYY-"W"IW')),
  ('seed-rex', 'duo', '2', to_char(now(), 'IYYY-"W"IW')),
  ('seed-juno', 'duo', '2', to_char(now(), 'IYYY-"W"IW')),
  ('seed-kairo', 'duo', '3', to_char(now(), 'IYYY-"W"IW'))
on conflict do nothing;

insert into votes (voter_id, world, target_id, period)
values
  ('seed-mira', 'duo', '2', to_char(now() - interval '7 days', 'IYYY-"W"IW')),
  ('seed-orion', 'duo', '1', to_char(now() - interval '7 days', 'IYYY-"W"IW')),
  ('seed-nyx', 'duo', '3', to_char(now() - interval '7 days', 'IYYY-"W"IW'))
on conflict do nothing;

insert into donations (donor_id, recipient_id, amount_cents, verified, created_at)
values
  ('seed-nova', 'seed-kairo', 420000, true, now() - interval '2 days'),
  ('seed-sol', 'seed-kairo', 180000, true, now() - interval '18 hours'),
  ('seed-orion', 'seed-kairo', 90000, true, now() - interval '3 hours'),
  ('seed-kairo', 'seed-nova', 250000, true, now() - interval '4 days'),
  ('seed-mira', 'seed-nova', 200000, true, now() - interval '6 hours'),
  ('seed-iris', 'seed-sol', 310000, true, now() - interval '1 day'),
  ('seed-ash', 'seed-orion', 150000, true, now() - interval '8 hours'),
  ('seed-rex', 'seed-lumen', 120000, true, now() - interval '12 hours'),
  ('seed-juno', 'seed-vex', 80000, true, now() - interval '20 hours'),
  ('seed-nyx', 'seed-iris', 60000, true, now() - interval '1 hour')
on conflict do nothing;

insert into live_events (kind, body, href, created_at)
values
  ('overtake', '@kairo bleibt vorn bei Richest. Last donation €900.', '/rankings/richest', now() - interval '3 hours'),
  ('vote', '@nova zieht Famous. Sechs Stimmen diese Woche.', '/rankings/famous', now() - interval '5 hours'),
  ('duo', 'Night Circuit führt Best Duo.', '/rankings/duo', now() - interval '8 hours'),
  ('overtake', '@nova hat @sol bei Richest überholt.', '/rankings/richest', now() - interval '6 hours'),
  ('hall', 'Neues Archiv in der Hall of Clowns.', '/hall', now() - interval '1 day')
on conflict do nothing;

insert into friendships (user_a, user_b, status, initiated_by)
values
  ('seed-nova', 'seed-kairo', 'accepted', 'seed-nova'),
  ('seed-lumen', 'seed-vex', 'accepted', 'seed-lumen'),
  ('seed-iris', 'seed-ash', 'accepted', 'seed-iris'),
  ('seed-nova', 'seed-juno', 'accepted', 'seed-juno'),
  ('seed-orion', 'seed-nova', 'accepted', 'seed-orion')
on conflict do nothing;

insert into connections (from_id, to_id, status)
values
  ('seed-nova', 'seed-kairo', 'accepted'),
  ('seed-kairo', 'seed-nova', 'accepted'),
  ('seed-lumen', 'seed-vex', 'accepted'),
  ('seed-vex', 'seed-lumen', 'accepted'),
  ('seed-nova', 'seed-juno', 'accepted')
on conflict do nothing;

insert into threads (board, title, author_id, pinned, hall_only)
values
  ('rankings', 'Famous diese Woche: Nova oder Blase?', 'seed-kairo', true, false),
  ('rankings', 'Overbid-Regeln nochmal klar', 'seed-orion', false, false),
  ('events', 'Ost-Flügel, Samstag. Keine Storys.', 'seed-mira', false, false),
  ('nominierungen', 'Wer kommt auf Famous, der nicht schon da ist?', 'seed-iris', false, false),
  ('szenen', 'Streetwear vs. Techno-Uniform', 'seed-sol', false, false),
  ('hall', 'Der Rank-Fail von letzter Season', 'seed-nyx', false, true)
on conflict do nothing;

insert into posts (thread_id, author_id, body)
values
  (1, 'seed-kairo', 'Bekanntheit ist kein Talent. Es ist Wiederholung plus Raum. Nova hat beides.'),
  (1, 'seed-vex', 'Wer votet, will gesehen werden. Das Ranking misst das, nicht den Sound.'),
  (1, 'seed-nova', 'Eine Stimme pro Zeitraum. Mehr braucht es nicht.'),
  (2, 'seed-orion', 'Nur verifizierte Payments. Öffentliche Historie. Höhere Summe überholt. Punkt.'),
  (2, 'seed-ash', 'Wenn jemand 500 setzt, ist das kein Vote. Das ist eine Ansage.'),
  (3, 'seed-mira', 'Adresse geht an Friends. Kein öffentlicher Pin.'),
  (4, 'seed-iris', 'Nominierung ≠ Platz. Erst Mod, dann Board.'),
  (5, 'seed-sol', 'Die Szene trägt Schwarz, bis jemand Weiß trägt. Dann ist es wieder Schwarz.'),
  (6, 'seed-nyx', 'Der Screenshot bleibt hier. Nicht im Feed.')
on conflict do nothing;

insert into chat_messages (channel_type, channel_id, author_id, body, created_at)
values
  ('global', 'global', 'seed-orion', 'Live: Famous sitzt bei @nova.', now() - interval '50 minutes'),
  ('global', 'global', 'seed-kairo', 'Wer überholen will, soll zahlen. Nicht reden.', now() - interval '42 minutes'),
  ('global', 'global', 'seed-mira', 'Ost-Flügel ist voll. Tür macht iris.', now() - interval '30 minutes'),
  ('global', 'global', 'seed-vex', 'Keller bleibt Keller.', now() - interval '22 minutes'),
  ('global', 'global', 'seed-nyx', 'Hall ist kein Feed. Wer teilt, fliegt.', now() - interval '12 minutes'),
  ('global', 'global', 'seed-sol', '@kairo die Jacke von gestern war die Bilanz.', now() - interval '8 minutes')
on conflict do nothing;

insert into servers (name, slug, description, visibility, owner_id)
values
  ('Techno Ost', 'techno-ost', 'Öffentlicher Server. Rankings eingebettet, weniger Noise.', 'public', 'seed-orion'),
  ('Night Circuit', 'night-circuit', 'Invite. Duo-Kreis um Nova / Kairo.', 'invite', 'seed-nova')
on conflict do nothing;

insert into server_channels (server_id, name, kind, position)
values
  (1, 'general', 'text', 0),
  (1, 'rankings', 'ranking', 1),
  (1, 'media', 'media', 2),
  (1, 'announce', 'announcements', 3),
  (2, 'general', 'text', 0),
  (2, 'duo', 'text', 1)
on conflict do nothing;

insert into server_members (server_id, user_id, role)
values
  (1, 'seed-orion', 'owner'),
  (1, 'seed-nova', 'member'),
  (1, 'seed-mira', 'member'),
  (1, 'seed-vex', 'member'),
  (1, 'seed-kairo', 'member'),
  (2, 'seed-nova', 'owner'),
  (2, 'seed-kairo', 'admin'),
  (2, 'seed-juno', 'member')
on conflict do nothing;

insert into chat_messages (channel_type, channel_id, author_id, body)
values
  ('server', '1:general', 'seed-orion', 'Defaults stehen. Ranking-Channel ist kein Memekanal.'),
  ('server', '1:general', 'seed-mira', 'Announce nur für Events. Rest nach general.')
on conflict do nothing;

insert into groups (name, owner_id)
values
  ('Duo Night Circuit', 'seed-nova'),
  ('Ost-Tür', 'seed-iris')
on conflict do nothing;

insert into group_members (group_id, user_id, role)
values
  (1, 'seed-nova', 'owner'),
  (1, 'seed-kairo', 'admin'),
  (1, 'seed-juno', 'member'),
  (2, 'seed-iris', 'owner'),
  (2, 'seed-ash', 'member')
on conflict do nothing;

insert into hall_items (title, body, tag, poster_id, created_at)
values
  ('Rank-Fail, Season 04', 'Jemand hat sich selbst bei Famous votet — öffentlich, in der Minute. Der Clip bleibt hier.', 'rank-fail', 'seed-nyx', now() - interval '12 days'),
  ('Die falsche Donation', '€20 an den Falschen, Screenshot, Stille. Overbid in die andere Richtung.', 'inside', 'seed-nyx', now() - interval '9 days'),
  ('Keller ohne Adresse', 'Wer den Pin geleakt hat, ist raus. Der Screen ist das Archiv.', 'screen', 'seed-vex', now() - interval '6 days'),
  ('Duo-Antrag, abgelehnt', 'Zwei Profile, null gemeinsame Nacht. Mod hat nein gesagt. Zu Recht.', 'archive', 'seed-orion', now() - interval '4 days'),
  ('Tür-Liste, durchgestrichen', 'Drei Namen, ein Stift, kein Comeback.', 'clip', 'seed-iris', now() - interval '2 days')
on conflict do nothing;

insert into hall_access_log (user_id, granted_by, method)
select user_id, 'seed-nyx', 'role'
from profiles
where hall_access = true
on conflict do nothing;

insert into nominations (world, target_username, second_username, nominator_id, status)
values
  ('famous', 'rex', null, 'seed-mira', 'pending'),
  ('duo', 'sol', 'mira', 'seed-ash', 'pending')
on conflict do nothing;
