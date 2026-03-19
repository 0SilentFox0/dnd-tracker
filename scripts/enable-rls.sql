-- Увімкнути Row Level Security (RLS) для всіх таблиць public.
-- Після цього доступ через Supabase Data API (anon key) без політик буде порожнім.
-- Додаток: Prisma (DATABASE_URL) і service_role ключ не обмежені RLS.
-- Виконання: Supabase Dashboard → SQL Editor → вставити і Run.

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campaign_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "characters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "units" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "unit_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "spells" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "spell_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "artifacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "artifact_sets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "character_inventories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "skill_trees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "character_skills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "battle_scenes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "status_effects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "racial_abilities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "skills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "races" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "main_skills" ENABLE ROW LEVEL SECURITY;
