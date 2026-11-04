ALTER TABLE "characters" ADD COLUMN "characteristics" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "units" ADD COLUMN "characteristics" JSONB NOT NULL DEFAULT '{}';
