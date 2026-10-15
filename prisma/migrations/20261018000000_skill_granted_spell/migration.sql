-- Закляття від вміння: канонічне поле grantedSpellId; spellNewSpellId лишається до окремої міграції видалення
UPDATE "skills" SET "grantedSpellId" = "spellNewSpellId" WHERE "grantedSpellId" IS NULL AND "spellNewSpellId" IS NOT NULL;
