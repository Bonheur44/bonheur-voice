-- ---------------------------------------------------------------------------
-- 0003 — compétences mesurées
--
-- Le « score » par compétence disparaît. C'était un compteur de pratique modulé
-- par le ressenti déclaré, qui ne pouvait que monter et ne mesurait pas la voix.
-- Ce que le micro mesure (justesse, stabilité) est désormais recalculé côté
-- client depuis la table observations ; ce qui a été pratiqué est compté depuis
-- les séances. Rien de tout cela n'a besoin d'être stocké.
--
-- Idempotent : peut être rejoué sans effet.
-- ---------------------------------------------------------------------------

alter table public.skills drop constraint if exists skills_score_range;
alter table public.skills drop column if exists score;

-- L'application fonctionne avant comme après : elle n'écrit plus la colonne, et
-- celle-ci a une valeur par défaut. Rejouer ce fichier plus tard est sans risque.
