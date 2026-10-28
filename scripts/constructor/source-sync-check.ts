#!/usr/bin/env tsx
// tsx scripts/constructor/source-sync-check.ts <templateId> <userId> [--keep]
// tsx scripts/constructor/source-sync-check.ts --diff-only <campaignId>
import type { Prisma } from "@prisma/client";

import { assertSeedTarget } from "../seed/seed-library-lib";

import { prisma } from "@/lib/db";
import { createCampaignFromBundle } from "@/lib/server/campaigns/create-campaign";
import { BUNDLE_TABLES } from "@/lib/server/templates/bundle";
import { exportCampaign } from "@/lib/server/templates/export-campaign";
import { collectKeysAndStrings } from "@/lib/server/templates/remap-ids";
import { applySourceChanges } from "@/lib/server/templates/sync/apply";
import { loadSyncContext } from "@/lib/server/templates/sync/context";
import { buildDiff } from "@/lib/server/templates/sync/diff";
import type { SourceDiff } from "@/types/campaigns";

function fail(message: string): never {
  throw new Error(`FAIL: ${message}`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function summarize(diff: SourceDiff) {
  const counts: Record<string, number> = {};

  for (const i of diff.items) counts[`${i.scope}/${i.status}`] = (counts[`${i.scope}/${i.status}`] ?? 0) + 1;

  return counts;
}

async function diffOf(campaignId: string) {
  return buildDiff(prisma, await loadSyncContext(prisma, campaignId));
}

async function diffOnly(campaignId: string) {
  const diff = await diffOf(campaignId);

  console.info(`items: ${diff.items.length}`, summarize(diff));

  for (const i of diff.items) console.info(`${i.scope} ${i.status} ${i.name} [${i.changedFields.join(",")}]`);
}

type Cleanup = () => Promise<unknown>;

async function setup(templateId: string, campaignId: string, cleanups: Cleanup[]) {
  const spells = await prisma.spell.findMany({ where: { campaignId: templateId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 2 });

  const [spell1] = spells;

  const spell1Name = spell1.name;

  cleanups.push(() => prisma.spell.update({ where: { id: spell1.id }, data: { name: spell1Name } }));

  await prisma.spell.update({ where: { id: spell1.id }, data: { name: `${spell1Name} (sync)` } });

  const race = await prisma.race.create({ data: { campaignId: templateId, name: "ТЕСТ sync раса" } });

  cleanups.push(() => prisma.race.deleteMany({ where: { id: race.id } }));

  const unit = await prisma.unit.create({ data: { campaignId: templateId, name: "ТЕСТ sync юніт", raceId: race.id, knownSpells: [spell1.id] } });

  cleanups.push(() => prisma.unit.deleteMany({ where: { id: unit.id } }));

  const templateBundle = await exportCampaign(prisma, templateId);

  const referenced = new Set<string>();

  for (const { key } of BUNDLE_TABLES) {
    for (const row of templateBundle[key] as unknown as Array<{ id: string }>) {
      for (const s of collectKeysAndStrings(row)) if (s !== row.id) referenced.add(s);
    }
  }

  const artifacts = await prisma.artifact.findMany({ where: { campaignId: templateId }, orderBy: { createdAt: "asc" } });

  const artifact = artifacts.find((a) => !referenced.has(a.id) && a.setId === null) ?? artifacts.find((a) => !referenced.has(a.id));

  assert(artifact, "no unreferenced artifact in the template");

  const { id: _artifactId, ...artifactRest } = artifact;

  cleanups.push(async () => {
    await prisma.artifact.create({ data: { id: artifact.id, ...(artifactRest as Prisma.ArtifactUncheckedCreateWithoutCampaignInput), campaignId: templateId } });
  });

  await prisma.artifact.delete({ where: { id: artifact.id } });

  const cloneSpell2 = await prisma.spell.findFirst({ where: { campaignId, sourceId: spells[1].id } });

  assert(cloneSpell2, "clone spell 2 not found");

  await prisma.spell.update({ where: { id: cloneSpell2.id }, data: { description: `${cloneSpell2.description ?? ""} local edit` } });

  const cloneSkill = await prisma.skill.findFirst({ where: { campaignId, sourceId: { not: null } } });

  assert(cloneSkill, "clone skill not found");

  await prisma.skill.delete({ where: { id: cloneSkill.id } });

  return { spell1, spell1Name, unit, artifact, cloneSpell2, cloneSkill };
}

type Fixture = Awaited<ReturnType<typeof setup>>;

function assertDiff(diff: SourceDiff, { spell1Name, artifact, cloneSpell2, cloneSkill }: Fixture) {
  const find = (scope: string, status: string, name: string) => diff.items.find((i) => i.scope === scope && i.status === status && i.name === name);

  assert(find("spells", "updated", `${spell1Name} (sync)`), "spell1 updated missing");

  const unitItem = find("units", "new", "ТЕСТ sync юніт");

  assert(unitItem, "unit new missing");
  assert(unitItem.requires.some((r) => r.scope === "races"), "unit requires race missing");
  assert(find("races", "new", "ТЕСТ sync раса"), "race new missing");
  assert(find("artifacts", "deletedInSource", artifact.name), "artifact deletedInSource missing");
  assert(!diff.items.some((i) => i.localId === cloneSpell2.id), "local spell2 edit should not appear");
  assert(!diff.items.some((i) => i.scope === "skills" && i.status !== "new" && i.name === cloneSkill.name), "deleted skill should not appear as changed");
}

async function applyInParallel(campaignId: string, diff: SourceDiff, unitId: string) {
  const refs = diff.items.map(({ scope, key, sourceHash, status }) => ({ scope, key, sourceHash, status }));

  const applyOnce = () =>
    prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM campaigns WHERE id = ${campaignId} FOR NO KEY UPDATE`;

        return applySourceChanges(tx, campaignId, { apply: refs, ignore: [] });
      },
      { timeout: 60_000, maxWait: 10_000 },
    );

  const results = await Promise.allSettled([applyOnce(), applyOnce()]);

  const ok = results.filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof applyOnce>>> => r.status === "fulfilled");

  const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");

  assert(ok.length === 1 && rejected.length === 1 && (rejected[0].reason as { status?: number }).status === 409, "parallel apply: expected one success and one 409");

  console.info("apply result", JSON.stringify(ok[0].value));

  const dup = await prisma.unit.count({ where: { campaignId, sourceId: unitId } });

  assert(dup === 1, `parallel apply duplicated the unit (${dup})`);
}

async function assertApplied(campaignId: string, { spell1, unit }: Fixture) {
  const after = await diffOf(campaignId);

  if (after.items.length > 0) console.error(after.items.slice(0, 5));

  assert(after.items.length === 0, `expected 0 items after apply, got ${after.items.length}`);

  const cloneUnit = await prisma.unit.findFirst({ where: { campaignId, sourceId: unit.id } });

  const cloneSpell1 = await prisma.spell.findFirst({ where: { campaignId, sourceId: spell1.id } });

  const known = cloneUnit?.knownSpells as string[] | undefined;

  assert(cloneUnit && cloneSpell1 && known?.includes(cloneSpell1.id) && !known.includes(spell1.id), "unit knownSpells not remapped to local ids");
}

async function cleanup(cleanups: Cleanup[], campaignId: string, keep: boolean) {
  for (const undo of cleanups.reverse()) {
    try {
      await undo();
    } catch (error) {
      console.error("RESTORE FAILED", error);
    }
  }

  if (!keep) await prisma.campaign.delete({ where: { id: campaignId } });
}

async function run(templateId: string, userId: string, keep: boolean) {
  const bundle = await exportCampaign(prisma, templateId);

  const { campaign } = await createCampaignFromBundle({ userId, name: "ТЕСТ sync", bundle, createdFromId: templateId });

  console.info("test campaign", campaign.id);

  const cleanups: Cleanup[] = [];

  try {
    const initial = await diffOf(campaign.id);

    if (initial.items.length > 0) console.error(initial.items.slice(0, 5));

    assert(initial.items.length === 0, `expected 0 items after clone, got ${initial.items.length}`);

    const fixture = await setup(templateId, campaign.id, cleanups);

    const diff = await diffOf(campaign.id);

    console.info("diff statuses", summarize(diff));

    for (const i of diff.items) console.info(`${i.scope} ${i.status} ${i.name} [${i.changedFields.join(",")}] requires=${i.requires.map((r) => `${r.scope}:${r.name}`).join("|")}`);

    assertDiff(diff, fixture);
    await applyInParallel(campaign.id, diff, fixture.unit.id);
    await assertApplied(campaign.id, fixture);

    console.info("campaign", campaign.id, keep ? "kept" : "to delete");
    console.info("OK");
  } finally {
    await cleanup(cleanups, campaign.id, keep);
  }
}

async function main() {
  const args = process.argv.slice(2);

  assertSeedTarget(process.env.DATABASE_URL, false);

  if (args[0] === "--diff-only") return diffOnly(args[1]);

  const keep = args.includes("--keep");

  const [templateId, userId] = args.filter((a) => !a.startsWith("--"));

  if (!templateId || !userId) fail("usage: <templateId> <userId> [--keep] | --diff-only <campaignId>");

  await run(templateId, userId, keep);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error && error.message.startsWith("FAIL:") ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
