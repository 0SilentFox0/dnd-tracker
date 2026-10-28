ALTER TABLE "spells" ADD COLUMN "executionMode" TEXT NOT NULL DEFAULT 'native';
ALTER TABLE "spells" ADD CONSTRAINT "spells_executionMode_check" CHECK ("executionMode" IN ('native', 'manual'));

CREATE TABLE "compendium_sources" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "campaignId" TEXT NOT NULL REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "sourceJson" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}'
);
CREATE UNIQUE INDEX "compendium_sources_campaignId_sourceJson_key" ON "compendium_sources" ("campaignId", "sourceJson");

CREATE TABLE "compendium_entries" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "campaignId" TEXT NOT NULL REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "canonicalKey" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "localId" TEXT NOT NULL,
  "locator" JSONB NOT NULL DEFAULT '[]',
  "edition" TEXT NOT NULL,
  "sourceJson" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "attribution" JSONB NOT NULL DEFAULT '{}',
  "inputHash" TEXT NOT NULL,
  "adapterVersion" TEXT NOT NULL,
  "baseline" JSONB NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "issues" JSONB NOT NULL DEFAULT '[]',
  "bindings" JSONB NOT NULL DEFAULT '{}'
);
CREATE UNIQUE INDEX "compendium_entries_campaignId_canonicalKey_key" ON "compendium_entries" ("campaignId", "canonicalKey");
CREATE INDEX "compendium_entries_campaignId_kind_localId_idx" ON "compendium_entries" ("campaignId", "kind", "localId");

CREATE TABLE "compendium_import_runs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "campaignId" TEXT NOT NULL REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "userId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "planHash" TEXT NOT NULL,
  "report" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "compendium_import_runs_campaignId_idempotencyKey_key" ON "compendium_import_runs" ("campaignId", "idempotencyKey");
CREATE INDEX "compendium_import_runs_campaignId_createdAt_idx" ON "compendium_import_runs" ("campaignId", "createdAt");
ALTER TABLE "compendium_sources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "compendium_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "compendium_import_runs" ENABLE ROW LEVEL SECURITY;
