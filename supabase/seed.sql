insert into public.settings (key, value)
values
  ('wedding-config', '{
    "brideName": "Yeral",
    "groomName": "Alejo",
    "ceremonyDate": "2026-11-21T11:00",
    "ceremonyVenue": "Parroquia Inmacula Concepcion de Suba",
    "receptionDate": "2026-11-22T13:00",
    "welcomeMessage": "Por tanto, lo que Dios ha unido, que no lo separe nadie.",
    "welcomeReference": "Marcos 10:9"
  }'::jsonb)
on conflict (key) do nothing;

insert into public.guests (primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, tipo_invitacion, id_relacionado, confirmacion)
values
  ('Yeral', '', 'Apellido', 'Uno', 'Principal', '', 'Pendiente'),
  ('Alejo', '', 'Apellido', 'Dos', 'Principal', '', 'Pendiente')
on conflict do nothing;
