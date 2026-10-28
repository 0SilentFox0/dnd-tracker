import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, expect, it, vi } from "vitest";

vi.hoisted(() => {
  for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
    const url = new URL(process.env[key] ?? "");

    if (!["postgres:", "postgresql:"].includes(url.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.port !== "54322" || url.pathname !== "/constructor") throw Error("LOCAL_CONSTRUCTOR_REQUIRED");

    url.searchParams.set("connection_limit", "1");
    process.env[key] = url.toString();
  }
});
vi.mock("@/lib/cache/tags", async original => ({ ...await original<object>(), invalidateReference: vi.fn() }));

import { prisma } from "@/lib/db";
import { adaptCompendium } from "@/lib/server/compendium-import/adapt";
import { BUNDLE_TABLES, delegateOf } from "@/lib/server/templates/bundle";
import { exportCampaign } from "@/lib/server/templates/export-campaign";
import { importBundle } from "@/lib/server/templates/import-bundle";
import { applySourceChanges } from "@/lib/server/templates/sync/apply";
import { classify } from "@/lib/server/templates/sync/classify";
import { loadSyncContext } from "@/lib/server/templates/sync/context";

const marker = `refactor-roundtrip-${randomUUID()}`;

const owned = new Set<string>();

let userCreated = false;

let measuring = false;

let queries = 0, bytes = 0;

const db = prisma.$extends({ query: { async $allOperations({ args, query }) {
  const result = await query(args);

  if (measuring) {
    queries++;
    bytes += Buffer.byteLength(JSON.stringify(result, (_, value) => typeof value === "bigint" ? String(value) : value) ?? "null");
  }

  return result;
} } }) as unknown as typeof prisma;

type Sample = { elapsedMs: number; queryCount: number; resultJsonBytes: number; heapDeltaBytes: number };

const samples: Record<string, Sample[]> = {};

async function measure(name: string, work: () => Promise<unknown>, reset?: () => Promise<void>) {
  const collected: Sample[] = [];

  for (let iteration = -5; iteration < 30; iteration++) {
    await reset?.();
    queries = 0; bytes = 0; measuring = true;

    const heap = process.memoryUsage().heapUsed;

    const start = performance.now();

    try { await work(); } finally { measuring = false; }

    const sample = { elapsedMs: performance.now() - start, queryCount: queries, resultJsonBytes: bytes, heapDeltaBytes: process.memoryUsage().heapUsed - heap };

    if (iteration >= 0) collected.push(sample);
  }

  samples[name] = collected;
}

afterAll(async () => {
  for (const id of [...owned].reverse()) {
    const row = await prisma.campaign.findUnique({ where: { id } });

    if (row && (row.name !== marker || row.dmUserId !== marker)) throw Error("FIXTURE_OWNERSHIP_MISMATCH");

    await prisma.campaign.deleteMany({ where: { id, dmUserId: marker, name: marker } });
  }

  if (userCreated) await prisma.user.delete({ where: { id: marker } });

  expect(await prisma.campaign.count({ where: { id: { in: [...owned] } } })).toBe(0);
  await prisma.$disconnect();
});

it("export import source-update roundtrip preserves nested refs and records bounded local measurements", async () => {
  const migrations = () => prisma.$queryRaw<Array<{ migration_name: string }>>`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name`;

  const before = await migrations();

  await prisma.user.create({ data: { id: marker, email: `${marker}@example.invalid`, displayName: marker } });
  userCreated = true;

  const explain: unknown[] = [];

  for (const [size, count, heroes] of [["small", 10, 2], ["large", 500, 20]] as const) {
    const source = await prisma.campaign.create({ data: { name: marker, dmUserId: marker, inviteCode: randomUUID(), kind: "template", visibility: "official", credits: "Synthetic source" } });

    owned.add(source.id);

    const target = await prisma.campaign.create({ data: { name: marker, dmUserId: marker, inviteCode: randomUUID(), createdFromId: source.id, credits: "Synthetic source" } });

    owned.add(target.id);
    await prisma.spell.createMany({ data: Array.from({ length: count }, (_, i) => ({ campaignId: source.id, name: `Spell ${i}`, level: 1, type: "damage", damageType: "fire", description: "Synthetic" })) });
    await prisma.artifact.createMany({ data: Array.from({ length: count }, (_, i) => ({ campaignId: source.id, name: `Artifact ${i}`, slot: "weapon" })) });
    await prisma.character.createMany({ data: Array.from({ length: heroes }, (_, i) => ({ campaignId: source.id, name: `Hero ${i}`, type: "npc_hero", controlledBy: marker, race: "Human", class: "Mage" })) });

    const spell = await prisma.spell.findFirstOrThrow({ where: { campaignId: source.id }, orderBy: { id: "asc" } });

    const feat = await prisma.feat.create({ data: { campaignId: source.id, name: "Origin", type: "origin", choices: [{ id: "gift", label: "Gift", kind: "option", level: 1, count: 1, options: [{ id: "magic", name: "Magic", spells: [{ level: 1, spellId: spell.id, grant: { uses: 1, rest: "long", via: "grant" } }] }] }] } });

    const background = await prisma.background.create({ data: { campaignId: source.id, name: "Scholar", originFeatId: feat.id } });

    const cls = await prisma.gameClass.create({ data: { campaignId: source.id, name: "Mage", features: [{ level: 1, abilities: [], choices: [{ id: "grant", label: "Grant", kind: "spell", count: 1, level: 1, spells: { lists: ["wizard"], minLevel: 0, maxLevel: 1 }, grant: { uses: 1, rest: "long" } }] }] } });

    const bundle = await exportCampaign(db, source.id);

    expect(JSON.stringify(bundle)).not.toMatch(/inviteCode|aiInstructions|dmUserId/);

    const clear = async () => {
      await prisma.campaignSourceSync.deleteMany({ where: { campaignId: target.id } });
      for (const table of [...BUNDLE_TABLES].reverse()) await delegateOf(prisma, table).deleteMany({ where: { campaignId: target.id } });
    };

    await measure(`${size}.import`, () => db.$transaction(tx => importBundle(tx, bundle, target.id), { timeout: 30000 }), clear);

    const cloned = await prisma.background.findFirstOrThrow({ where: { campaignId: target.id, sourceId: background.id } });

    const clonedFeat = await prisma.feat.findFirstOrThrow({ where: { campaignId: target.id, sourceId: feat.id } });

    const clonedSpell = await prisma.spell.findFirstOrThrow({ where: { campaignId: target.id, sourceId: spell.id } });

    expect(cloned.originFeatId).toBe(clonedFeat.id);
    expect(clonedFeat.choices).toMatchObject([{ options: [{ spells: [{ spellId: clonedSpell.id, grant: { uses: 1, rest: "long", via: "grant" } }] }] }]);
    expect(await prisma.gameClass.findFirst({ where: { campaignId: target.id, sourceId: cls.id } })).toMatchObject({ features: [{ choices: [{ grant: { uses: 1, rest: "long" } }] }] });
    expect((await exportCampaign(db, target.id)).credits).toBe("Synthetic source");
    expect(clonedSpell.id).not.toBe(spell.id);
    expect(await prisma.character.count({ where: { campaignId: target.id } })).toBe(0);

    await measure(`${size}.export`, () => exportCampaign(db, source.id));
    await prisma.spell.update({ where: { id: spell.id }, data: { description: "Updated synthetic source" } });
    await measure(`${size}.diff`, async () => classify(await loadSyncContext(db, target.id, { userId: marker })));

    const reset = async () => {
      await clear();
      await prisma.$transaction(tx => importBundle(tx, bundle, target.id));
    };

    const changed = classify(await loadSyncContext(db, target.id, { userId: marker })).find(item => item.scope === "spells" && item.key === spell.id);

    if (!changed) throw Error("EXPECTED_SOURCE_CHANGE");

    const body = { apply: [{ scope: changed.scope, key: changed.key, sourceHash: changed.sourceHash, status: changed.status }], ignore: [] };

    await measure(`${size}.apply`, () => db.$transaction(tx => applySourceChanges(tx, target.id, body, { userId: marker }), { timeout: 30000 }), reset);
    expect(await prisma.spell.findFirst({ where: { campaignId: target.id, sourceId: spell.id } })).toMatchObject({ description: "Updated synthetic source" });
    expect(classify(await loadSyncContext(db, target.id, { userId: marker }))).toEqual([]);

    const root = { class: [{ name: "Mage", source: "Synthetic", classFeatures: Array.from({ length: count }, (_, i) => `Feature ${i}|Mage|Synthetic|1|Synthetic`) }], classFeature: Array.from({ length: count }, (_, i) => ({ name: `Feature ${i}`, className: "Mage", classSource: "Synthetic", source: "Synthetic", level: 1, entries: ["Synthetic feature"] })) };

    expect(adaptCompendium(root).embedded?.classFeature).toBe(count);

    await measure(`${size}.features`, async () => { adaptCompendium(root); });

    const plan = await prisma.$queryRaw`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT id FROM spells WHERE "campaignId" = ${source.id}`;

    explain.push({ size, plan: JSON.parse(JSON.stringify(plan, (key, value) => ["Filter", "Index Cond", "Recheck Cond", "Output"].includes(key) ? undefined : value)) });
  }

  expect(await migrations()).toEqual(before);

  const output = path.resolve(".superpowers/sdd/2026-10-26-constructor-refactor-s10-final-review/content-benchmark.json");

  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify({ commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), fixtureSizes: { small: { spells: 10, artifacts: 10, heroes: 2 }, large: { spells: 500, artifacts: 500, heroes: 20 } }, node: process.version, postgres: await prisma.$queryRaw`SHOW server_version`, warmups: 5, iterations: 30, seed: "synthetic-index", clock: "no timing-dependent payloads", metrics: "queryCount counts Prisma operations excluding BEGIN/COMMIT; JSON bytes are returned query results, not wire traffic; heap delta includes GC", beforeAfter: "no new optimization; comparative baseline unavailable", samples, explain }, null, 2));
}, 180000);
