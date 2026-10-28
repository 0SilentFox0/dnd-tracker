-- Optional timing metadata; existing spells keep their action/bonus-action behavior.
ALTER TABLE "spells" ADD COLUMN "casting" JSONB;
