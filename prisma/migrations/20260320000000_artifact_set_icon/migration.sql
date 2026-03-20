-- Іконка сету для HUD у бою (статус бонусу повного комплекту)
ALTER TABLE "artifact_sets" ADD COLUMN IF NOT EXISTS "icon" TEXT;
