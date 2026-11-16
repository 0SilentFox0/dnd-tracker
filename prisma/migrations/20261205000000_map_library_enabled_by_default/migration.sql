ALTER TABLE "campaigns" ALTER COLUMN "mapLibraryEnabled" SET DEFAULT true;

UPDATE "campaigns" SET "mapLibraryEnabled" = true;
