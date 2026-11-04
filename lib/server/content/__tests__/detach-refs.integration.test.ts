import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: vi.fn() }));

import { prisma } from "@/lib/db";
import { detachRefs } from "@/lib/server/content/detach-refs";
import { mainSkillsResource } from "@/lib/server/content/resources/main-skills";
import { racesResource } from "@/lib/server/content/resources/races";
import { spellGroupsResource } from "@/lib/server/content/resources/spell-groups";
import { spellsResource } from "@/lib/server/content/resources/spells";
import { unitsResource } from "@/lib/server/content/resources/units";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { isLocalDevDatabaseEnv, singleConnectionDatabaseUrl } from "@/lib/server/test-support/local-db";

const raw = new PrismaClient({ datasources: { db: { url: singleConnectionDatabaseUrl("DATABASE_URL") } } });

const marker = `detach-${randomUUID()}`;

const cid = `${marker}-c`;

const actor = { campaignId: cid } as never;

const id = (key: string) => `${marker}-${key}`;

async function seed() {
  const campaignId = cid;

  await raw.spellGroup.create({ data: { id: id("g"), campaignId, name: "G" } });
  await raw.race.create({ data: { id: id("r"), campaignId, name: "R", color: "#fff" } as never });
  await raw.unit.create({ data: { id: id("u"), campaignId, name: "U", raceId: id("r"), level: 1, maxHp: 1, armorClass: 10 } as never });
  await raw.spell.create({ data: { id: id("s"), campaignId, name: "S", type: "target", damageType: "damage", level: 1, groupId: id("g"), summonUnitId: id("u") } as never });
  await raw.mainSkill.create({ data: { id: id("m"), campaignId, name: "M", color: "#fff", spellGroupId: id("g") } as never });
  await raw.skill.create({ data: { id: id("k"), campaignId, name: "K", mainSkillId: id("m"), spellGroupId: id("g"), spellId: id("s"), spellNewSpellId: id("s"), grantedSpellId: id("s") } as never });
}

const skill = () => raw.skill.findUniqueOrThrow({ where: { id: id("k") } });

const run = (callback: () => Promise<unknown>) => withCampaignContentWrite(cid, callback);

describe.skipIf(!isLocalDevDatabaseEnv())("removing content nulls former ON DELETE SET NULL references", () => {
  beforeAll(async () => {
    await raw.user.create({ data: { id: marker, email: `${marker}@example.invalid`, displayName: marker } });
    await raw.campaign.create({ data: { id: cid, name: cid, dmUserId: marker, inviteCode: randomUUID() } });
    await seed();
  });

  afterAll(async () => {
    for (const m of ["skill", "mainSkill", "spell", "unit", "race", "spellGroup"] as const) await (raw[m] as unknown as { deleteMany(a: unknown): Promise<unknown> }).deleteMany({ where: { campaignId: cid } });

    await raw.campaign.deleteMany({ where: { id: cid } });
    await raw.user.delete({ where: { id: marker } });
    await raw.$disconnect();
  });

  it("spell group: spells.groupId, main_skills.spellGroupId, skills.spellGroupId", async () => {
    await run(async () => spellGroupsResource.remove(actor, (await raw.spellGroup.findUniqueOrThrow({ where: { id: id("g") } })) as never));

    expect((await raw.spell.findUniqueOrThrow({ where: { id: id("s") } })).groupId).toBeNull();
    expect((await raw.mainSkill.findUniqueOrThrow({ where: { id: id("m") } })).spellGroupId).toBeNull();
    expect((await skill()).spellGroupId).toBeNull();
    expect(await raw.spellGroup.count({ where: { id: id("g") } })).toBe(0);
  });

  it("main skill: skills.mainSkillId", async () => {
    await run(async () => mainSkillsResource.remove(actor, (await raw.mainSkill.findUniqueOrThrow({ where: { id: id("m") } })) as never));

    expect((await skill()).mainSkillId).toBeNull();
  });

  it("race: units.raceId", async () => {
    await run(async () => racesResource.remove(actor, (await raw.race.findUniqueOrThrow({ where: { id: id("r") } })) as never));

    expect((await raw.unit.findUniqueOrThrow({ where: { id: id("u") } })).raceId).toBeNull();
  });

  it("unit: spells.summonUnitId", async () => {
    await run(async () => unitsResource.remove(actor, (await raw.unit.findUniqueOrThrow({ where: { id: id("u") } })) as never));

    expect((await raw.spell.findUniqueOrThrow({ where: { id: id("s") } })).summonUnitId).toBeNull();
  });

  it("spell: skills.spellId, spellNewSpellId, grantedSpellId", async () => {
    await run(async () => spellsResource.remove(actor, (await raw.spell.findUniqueOrThrow({ where: { id: id("s") } })) as never));

    expect(await skill()).toMatchObject({ spellId: null, spellNewSpellId: null, grantedSpellId: null });
  });

  it("artifact set: artifacts.setId; skill tree: character_skills rows go away", async () => {
    await raw.artifactSet.create({ data: { id: id("as"), campaignId: cid, name: "AS" } as never });
    await raw.artifact.create({ data: { id: id("a"), campaignId: cid, name: "A", slot: "ring", setId: id("as") } as never });
    await raw.skillTree.create({ data: { id: id("t"), campaignId: cid, race: "R2" } as never });
    await raw.character.create({ data: { id: id("ch"), campaign: { connect: { id: cid } }, user: { connect: { id: marker } }, name: "Ch", type: "npc", class: "x", race: "R2" } as never });
    await raw.characterSkills.create({ data: { id: id("cs"), characterId: id("ch"), skillTreeId: id("t") } });

    await detachRefs(raw, cid, "artifactSet", [id("as")]);
    await detachRefs(raw, cid, "skillTree", [id("t")]);

    expect((await raw.artifact.findUniqueOrThrow({ where: { id: id("a") } })).setId).toBeNull();
    expect(await raw.characterSkills.count({ where: { id: id("cs") } })).toBe(0);

    await raw.character.delete({ where: { id: id("ch") } });
    await raw.artifact.delete({ where: { id: id("a") } });
    await raw.artifactSet.delete({ where: { id: id("as") } });
    await raw.skillTree.delete({ where: { id: id("t") } });
  });

  it("a layered campaign does not materialize overrides when a base group is removed", async () => {
    const tpl = `${marker}-tpl`;

    const layered = `${marker}-layered`;

    await raw.campaign.create({ data: { id: tpl, name: tpl, dmUserId: marker, inviteCode: randomUUID(), kind: "template", contentVersion: 1 } });
    await raw.campaign.create({ data: { id: layered, name: layered, dmUserId: marker, inviteCode: randomUUID(), baseSourceId: tpl, baseVersion: 1 } });
    await raw.spellGroupBase.create({ data: { id: id("bg"), name: "BG", sourceCampaignId: tpl, validFrom: 1 } as never });
    await raw.spellBase.create({ data: { id: id("bs"), name: "BS", type: "target", damageType: "damage", level: 1, groupId: id("bg"), sourceCampaignId: tpl, validFrom: 1 } as never });

    await withCampaignContentWrite(layered, async () => spellGroupsResource.remove({ campaignId: layered } as never, { id: id("bg") } as never));

    expect(await raw.spell.count({ where: { campaignId: layered } })).toBe(0);
    expect(await raw.campaignContentHide.count({ where: { campaignId: layered } })).toBe(1);
    expect(await prisma.spell.findMany({ where: { campaignId: layered }, select: { id: true, groupId: true } })).toEqual([{ id: id("bs"), groupId: null }]);

    await raw.campaignContentHide.deleteMany({ where: { campaignId: layered } });
    await raw.campaign.deleteMany({ where: { id: { in: [layered, tpl] } } });
    await raw.spellBase.deleteMany({ where: { sourceCampaignId: tpl } });
    await raw.spellGroupBase.deleteMany({ where: { sourceCampaignId: tpl } });
  });

  it("removeAll of spells and units nulls every reference", async () => {
    await raw.unit.create({ data: { id: id("u2"), campaignId: cid, name: "U2", level: 1, maxHp: 1, armorClass: 10 } as never });
    await raw.spell.create({ data: { id: id("s2"), campaignId: cid, name: "S2", type: "target", damageType: "damage", level: 1, summonUnitId: id("u2") } as never });
    await raw.skill.update({ where: { id: id("k") }, data: { spellId: id("s2") } });

    await run(() => unitsResource.removeAll!(actor));

    expect((await raw.spell.findUniqueOrThrow({ where: { id: id("s2") } })).summonUnitId).toBeNull();

    await run(() => spellsResource.removeAll!(actor));

    expect((await skill()).spellId).toBeNull();
  });
});
