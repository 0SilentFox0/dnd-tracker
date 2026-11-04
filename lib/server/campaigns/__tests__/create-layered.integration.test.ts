import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: vi.fn() }));
vi.mock("@/lib/cache/campaign-list", () => ({ invalidateCampaignLists: vi.fn() }));
vi.mock("@/lib/cache/tags", () => ({ invalidateAllReference: vi.fn() }));
vi.mock("@/lib/i18n/translator", () => ({ getTranslator: vi.fn(async () => (key: string) => key) }));

const h = vi.hoisted(() => ({ raw: undefined as unknown as import("@prisma/client").PrismaClient, queries: [] as string[] }));

vi.mock("@/lib/db", async () => {
  const { PrismaClient } = await import("@prisma/client");

  const { contentLayer } = await import("@/lib/db/content-layer");

  const { createScopedDatabase } = await import("@/lib/server/content/write-context");

  const { singleConnectionDatabaseUrl } = await import("@/lib/server/test-support/local-db");

  const raw = new PrismaClient({ datasources: { db: { url: singleConnectionDatabaseUrl("DATABASE_URL") } }, log: [{ emit: "event", level: "query" }] });

  raw.$on("query", (e) => { h.queries.push(e.query); });
  h.raw = raw;

  return { prisma: createScopedDatabase(raw.$extends(contentLayer())) };
});

import { prisma } from "@/lib/db";
import { invalidateCampaignLayer } from "@/lib/db/content-layer";
import { runCampaignOperation } from "@/lib/server/campaigns/action-service";
import { createCampaignForUser } from "@/lib/server/campaigns/create-campaign";
import { runContentWriteContext } from "@/lib/server/content/write-context";
import { exportCampaign } from "@/lib/server/templates/export-campaign";
import { newContentId } from "@/lib/server/templates/ids";
import { latestPublishedVersion, publishTemplateVersion } from "@/lib/server/templates/publish";
import { publishTemplate } from "@/lib/server/templates/publish-service";
import { isLocalDevDatabaseEnv } from "@/lib/server/test-support/local-db";

const raw = () => h.raw as unknown as Record<string, any>;

const D = prisma as unknown as Record<string, any>;

const marker = `create-layers-${randomUUID()}`;

const tpl = `${marker}-tpl`;

const ids = { group: newContentId(), s1: newContentId(), s2: newContentId(), r1: newContentId(), r2: newContentId(), u1: newContentId(), u2: newContentId(), a1: newContentId() };

const CONTENT_TABLES = ["spell_groups", "spells", "races", "classes", "feats", "backgrounds", "units", "main_skills", "skills", "skill_trees", "artifact_sets", "artifacts", "campaign_tracks"];

const contentInserts = () => h.queries.filter((q) => new RegExp(`^INSERT INTO "public"."(${CONTENT_TABLES.join("|")})"`).test(q));

const inWrite = <T>(campaignId: string, run: (tx: any) => Promise<T>): Promise<T> => prisma.$transaction((tx: any) => runContentWriteContext(campaignId, tx, () => run(tx))) as Promise<T>;

const names = async (campaignId: string, model = "spell") => ((await D[model].findMany({ where: { campaignId }, orderBy: { name: "asc" } })) as Array<{ name: string }>).map((r) => r.name);

const publish = (id: string) => prisma.$transaction((tx: any) => runContentWriteContext(id, tx, () => publishTemplateVersion(tx, id)));

const created: string[] = [];

async function createFromTemplate(name: string) {
  const result = await createCampaignForUser(marker, { name, templateId: tpl }, { defer: () => {} });

  if (!result.ok) throw new Error("Creation failed");

  created.push(result.campaign.id);

  return result.campaign;
}

const actorOf = (campaignId: string) => ({ campaignId, userId: marker, isDM: true, via: "session" as const, scopes: null });

describe.skipIf(!isLocalDevDatabaseEnv())("campaign creation over content layers", () => {
  beforeAll(async () => {
    await raw().user.create({ data: { id: marker, email: `${marker}@example.invalid`, displayName: marker } });
    await raw().campaign.create({ data: { id: tpl, name: "Template", dmUserId: marker, inviteCode: randomUUID(), kind: "template", visibility: "official", contentVersion: 1 } });
    await raw().spellGroup.create({ data: { id: ids.group, campaignId: tpl, name: "Evocation" } });
    await raw().spell.createMany({ data: [{ id: ids.s1, campaignId: tpl, name: "Alpha", type: "damage", damageType: "fire", groupId: ids.group }, { id: ids.s2, campaignId: tpl, name: "Bravo", type: "damage", damageType: "cold" }] });
    await raw().race.createMany({ data: [{ id: ids.r1, campaignId: tpl, name: "Elf" }, { id: ids.r2, campaignId: tpl, name: "Orc" }] });
    await raw().unit.createMany({ data: [{ id: ids.u1, campaignId: tpl, name: "Archer", raceId: ids.r1 }, { id: ids.u2, campaignId: tpl, name: "Brute", raceId: ids.r2 }] });
    await raw().artifact.create({ data: { id: ids.a1, campaignId: tpl, name: "Ring", slot: "ring" } });
    await publish(tpl);
    invalidateCampaignLayer();
  });

  afterAll(async () => {
    const campaignIds = { in: [tpl, ...created] };

    await raw().campaignContentHide.deleteMany({ where: { campaignId: campaignIds } });
    for (const model of ["spell", "unit", "race", "artifact", "spellGroup"]) await raw()[model].deleteMany({ where: { campaignId: campaignIds } });
    for (const model of ["spellBase", "unitBase", "raceBase", "artifactBase", "spellGroupBase"]) await raw()[model].deleteMany({ where: { sourceCampaignId: { in: [tpl, ...created] } } });
    await raw().campaignSourceSync.deleteMany({ where: { campaignId: campaignIds } });
    await raw().campaign.deleteMany({ where: { id: campaignIds } });
    await raw().user.delete({ where: { id: marker } });
    await raw().$disconnect();
  });

  it("creates a campaign from a published template with two inserts and reads every model through the layer", async () => {
    h.queries.length = 0;

    const campaign = await createFromTemplate("From published");

    expect(contentInserts()).toEqual([]);
    expect(h.queries.filter((q) => q.startsWith('INSERT INTO "public"."campaigns"'))).toHaveLength(1);
    expect(campaign).toMatchObject({ baseSourceId: tpl, baseVersion: expect.any(Number), createdFromId: tpl });

    for (const model of ["spell", "unit", "race", "artifact", "spellGroup"]) expect(await raw()[model].count({ where: { campaignId: campaign.id } }), model).toBe(0);

    expect(await raw().campaignSourceSync.count({ where: { campaignId: campaign.id } })).toBe(0);
    expect(await names(campaign.id)).toEqual(["Alpha", "Bravo"]);
    expect(await names(campaign.id, "race")).toEqual(["Elf", "Orc"]);
    expect(await names(campaign.id, "unit")).toEqual(["Archer", "Brute"]);
    expect(await D.artifact.count({ where: { campaignId: campaign.id } })).toBe(1);
    expect(await D.spell.findFirst({ where: { campaignId: campaign.id, id: ids.s1 } })).toMatchObject({ name: "Alpha", groupId: ids.group, campaignId: campaign.id });
  });

  it("a template edited after publishing does not reach the new campaign until it is published again", async () => {
    await raw().spell.update({ where: { id: ids.s1 }, data: { name: "Alpha edited" } });

    const campaign = await createFromTemplate("Before republish");

    expect(await names(campaign.id)).toEqual(["Alpha", "Bravo"]);

    await publish(tpl);
    await raw().spell.update({ where: { id: ids.s1 }, data: { name: "Alpha" } });
    await publish(tpl);
  });

  it("clone and template.save of a layered campaign copy only local rows, overrides and hides", async () => {
    const campaign = await createFromTemplate("To clone");

    const localId = newContentId();

    await inWrite(campaign.id, async (tx) => {
      await tx.spell.update({ where: { id: ids.s1 }, data: { name: "Alpha mine" } });
      await tx.spell.delete({ where: { id: ids.s2 } });
      await tx.spell.create({ data: { id: localId, campaignId: campaign.id, name: "Local", type: "damage", damageType: "fire", groupId: ids.group } });
    });

    expect(await names(campaign.id)).toEqual(["Alpha mine", "Local"]);

    for (const operation of ["clone", "template.save"]) {
      h.queries.length = 0;

      const result = await runCampaignOperation(actorOf(campaign.id), operation, { name: `Copy ${operation}` });

      const copyId = (result.data as { id: string }).id;

      created.push(copyId);

      expect(await raw().campaign.findUnique({ where: { id: copyId } })).toMatchObject({ baseSourceId: tpl, baseVersion: campaign.baseVersion, createdFromId: campaign.id });
      expect(contentInserts().filter((q) => !q.includes('"public"."spells"'))).toEqual([]);

      const stored = await raw().spell.findMany({ where: { campaignId: copyId }, orderBy: { name: "asc" } });

      expect(stored.map((r: any) => [r.name, r.sourceId])).toEqual([["Alpha mine", ids.s1], ["Local", null]]);
      expect(stored.every((r: any) => ![ids.s1, localId].includes(r.id))).toBe(true);
      expect(await raw().campaignContentHide.findMany({ where: { campaignId: copyId } })).toEqual([{ campaignId: copyId, table: "spells", id: ids.s2 }]);
      expect(await names(copyId)).toEqual(["Alpha mine", "Local"]);
      expect(await D.spell.findFirst({ where: { campaignId: copyId, name: "Local" } })).toMatchObject({ groupId: ids.group });
    }
  });

  it("an orphan override (base row closed upstream) exports under its base id once, and a template with a base cannot be published", async () => {
    const orphan = `${marker}-orphan`;

    created.push(orphan);

    const published = (await latestPublishedVersion(raw(), tpl))!;

    await raw().campaign.create({ data: { id: orphan, name: "Orphan", dmUserId: marker, inviteCode: randomUUID(), kind: "template", baseSourceId: tpl, baseVersion: published } });
    invalidateCampaignLayer();

    await inWrite(orphan, (tx) => tx.spell.update({ where: { id: ids.s2 }, data: { name: "Bravo mine" } }));

    await raw().spellBase.updateMany({ where: { sourceCampaignId: tpl, id: ids.s2, validTo: null }, data: { validTo: published + 1 } });
    await raw().campaign.update({ where: { id: orphan }, data: { baseVersion: published + 1 } });
    invalidateCampaignLayer();

    const bundle = await exportCampaign(prisma as never, orphan);

    expect(bundle.spells.map((s) => [s.id, s.name]).sort()).toEqual([[ids.s1, "Alpha"], [ids.s2, "Bravo mine"]].sort());
    expect(new Set(bundle.spells.map((s) => s.id)).size).toBe(bundle.spells.length);

    await expect(publishTemplate(actorOf(orphan))).rejects.toMatchObject({ status: 409 });
    expect(await raw().spellBase.count({ where: { sourceCampaignId: orphan } })).toBe(0);

    await raw().spellBase.updateMany({ where: { sourceCampaignId: tpl, id: ids.s2 }, data: { validTo: null } });
  });
});
