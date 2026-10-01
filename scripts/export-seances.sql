-- Export des séances du coach, à lancer dans le SQL Editor du projet Supabase du coach.
-- Lecture seule. Renvoie UNE cellule de texte : toutes les séances, dans l'ordre,
-- puis le profil, le parcours, les mesures et les protocoles conduits.
-- Copier la cellule (ou Export > CSV) et la coller / joindre dans la conversation.

with u as (
  -- Le compte qui a le plus de séances. Pour en viser un autre :
  -- select id from users where email = '...'
  select user_id as id from sessions group by user_id order by count(*) desc limit 1
),
seances as (
  select s.date as d,
    '=== SÉANCE ' || to_char(s.date at time zone 'Europe/Paris', 'YYYY-MM-DD HH24:MI')
      || ' · ' || s.mode
      || case when cardinality(s.themes) > 0 then ' · thèmes : ' || array_to_string(s.themes, ', ') else '' end
      || E'\n'
      || coalesce((
           select string_agg(
             case when m->>'role' = 'user' then 'MOI' else 'COACH' end || ' : ' || (m->>'content'),
             E'\n' order by ord)
           from jsonb_array_elements(s.messages) with ordinality as t(m, ord)
         ), '(vide)')
      || coalesce(E'\n-- Résumé du coach : ' || s.coach_summary, '')
      || coalesce(E'\n-- Actions : ' || s.actions::text, '')
      as bloc
  from sessions s join u on s.user_id = u.id
),
contexte as (
  select
    '=== PROFIL' || E'\n' || coalesce((select row_to_json(p)::text from profiles p join u on p.user_id = u.id), '(aucun)')
    || E'\n\n=== PARCOURS' || E'\n' || coalesce((select json_agg(pr)::text from programs pr join u on pr.user_id = u.id), '(aucun)')
    || E'\n\n=== MESURES' || E'\n' || coalesce((
         select json_agg(json_build_object(
           'label', me.label, 'question', me.question, 'baseline', me.baseline, 'cible', me.cible,
           'releves', (select json_agg(json_build_object('v', e.value, 'le', e.recorded_at::date, 'note', e.note) order by e.recorded_at)
                       from measure_entries e where e.measure_id = me.id)))::text
         from measures me join u on me.user_id = u.id), '(aucune)')
    || E'\n\n=== PRATIQUES' || E'\n' || coalesce((
         select json_agg(json_build_object(
           'label', pa.label, 'declencheur', pa.declencheur, 'active', pa.active,
           'faites', (select count(*) from practice_logs l where l.practice_id = pa.id and l.done)))::text
         from practices pa join u on pa.user_id = u.id), '(aucune)')
    || E'\n\n=== PROTOCOLES CONDUITS' || E'\n' || coalesce((select json_agg(r order by r.ran_at)::text from protocol_runs r join u on r.user_id = u.id), '(aucun)')
    || E'\n\n=== CHECK-INS' || E'\n' || coalesce((select json_agg(c order by c.day)::text from checkins c join u on c.user_id = u.id), '(aucun)')
    as bloc
)
select coalesce((select string_agg(bloc, E'\n\n' order by d) from seances), '(aucune séance)')
       || E'\n\n' || (select bloc from contexte) as export;
