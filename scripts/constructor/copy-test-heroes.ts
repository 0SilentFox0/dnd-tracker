#!/usr/bin/env tsx
// pnpm constructor:copy-heroes <fromCampaignId> <toCampaignId> [--allow-remote]
import type { Character, CharacterInventory, CharacterSkills, Prisma } from "@prisma/client";

import { assertSeedTarget } from "../seed/seed-library-lib";

import { CharacterType } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { remapIds } from "@/lib/server/templates/remap-ids";

type IdMap = ReadonlyMap<string, string>;

type HeroRefs = Pick<Character, "knownSpells" | "personalSkillId" | "skillTreeProgress">;

type InventoryRefs = Pick<CharacterInventory, "equipped" | "backpack" | "items">;

type SkillRowRefs = Pick<CharacterSkills, "skillTreeId" | "unlockedSkills">;

export function mapHeroRefs(character: HeroRefs, inventory: InventoryRefs | null, skillRows: SkillRowRefs[], sourceIdToNew: IdMap) {
  const progress = character.skillTreeProgress && typeof character.skillTreeProgress === "object" ? character.skillTreeProgress : {};

  return {
    knownSpells: remapIds(character.knownSpells, sourceIdToNew),
    personalSkillId: character.personalSkillId ? (sourceIdToNew.get(character.personalSkillId) ?? character.personalSkillId) : null,
    skillTreeProgress: Object.fromEntries(Object.entries(progress).map(([key, value]) => [sourceIdToNew.get(key) ?? key, remapIds(value, sourceIdToNew)])),
    inventory: inventory && {
      equipped: remapIds(inventory.equipped, sourceIdToNew),
      backpack: remapIds(inventory.backpack, sourceIdToNew),
      items: remapIds(inventory.items, sourceIdToNew),
    },
    skillRows: skillRows.map((row) => ({
      skillTreeId: sourceIdToNew.get(row.skillTreeId) ?? row.skillTreeId,
      unlockedSkills: remapIds(row.unlockedSkills, sourceIdToNew),
    })),
  };
}

export function missingPlayerIds(controllers: readonly string[], existingMemberIds: readonly string[]): string[] {
  const existing = new Set(existingMemberIds);

  return [...new Set(controllers)].filter((id) => !existing.has(id));
}

async function buildSourceIdToNew(campaignId: string): Promise<Map<string, string>> {
  const where = { campaignId, sourceId: { not: null } };

  const select = { id: true, sourceId: true };

  const groups = await Promise.all([
    prisma.spell.findMany({ where, select }),
    prisma.skill.findMany({ where, select }),
    prisma.skillTree.findMany({ where, select }),
    prisma.artifact.findMany({ where, select }),
    prisma.artifactSet.findMany({ where, select }),
  ]);

  return new Map(groups.flat().flatMap((row) => (row.sourceId ? [[row.sourceId, row.id] as const] : [])));
}

async function main() {
  const args = process.argv.slice(2);

  const [fromId, toId] = args.filter((a) => !a.startsWith("--"));

  if (!fromId || !toId) throw new Error("Використання: pnpm constructor:copy-heroes <fromCampaignId> <toCampaignId> [--allow-remote]");

  assertSeedTarget(process.env.DATABASE_URL, args.includes("--allow-remote"));

  const sourceIdToNew = await buildSourceIdToNew(toId);

  const heroes = await prisma.character.findMany({
    where: { campaignId: fromId, type: { in: [CharacterType.PLAYER, CharacterType.NPC_HERO] } },
    include: { inventory: true, characterSkills: true },
  });

  const members = await prisma.campaignMember.findMany({ where: { campaignId: toId }, select: { userId: true } });

  const newPlayers = missingPlayerIds(
    heroes.map((h) => h.controlledBy),
    members.map((m) => m.userId),
  );

  if (newPlayers.length) {
    await prisma.campaignMember.createMany({ data: newPlayers.map((userId) => ({ campaignId: toId, userId, role: "player" })), skipDuplicates: true });
  }

  for (const { id: _id, inventory, characterSkills, campaignId: _campaignId, createdAt: _c, updatedAt: _u, ...character } of heroes) {
    const mapped = mapHeroRefs(character, inventory, characterSkills, sourceIdToNew);

    const created = await prisma.character.create({
      data: {
        ...character,
        campaignId: toId,
        knownSpells: mapped.knownSpells as Prisma.InputJsonValue,
        personalSkillId: mapped.personalSkillId,
        skillTreeProgress: mapped.skillTreeProgress as Prisma.InputJsonValue,
        savingThrows: character.savingThrows as Prisma.InputJsonValue,
        skills: character.skills as Prisma.InputJsonValue,
        spellSlots: character.spellSlots as Prisma.InputJsonValue,
        languages: character.languages as Prisma.InputJsonValue,
        proficiencies: character.proficiencies as Prisma.InputJsonValue,
        immunities: character.immunities as Prisma.InputJsonValue,
        goals: character.goals as Prisma.InputJsonValue,
        classes: character.classes as Prisma.InputJsonValue,
        resources: character.resources as Prisma.InputJsonValue,
      },
    });

    if (mapped.inventory) {
      const { equipped, backpack, items } = mapped.inventory;

      await prisma.characterInventory.create({
        data: {
          characterId: created.id,
          gold: inventory?.gold ?? 0,
          silver: inventory?.silver ?? 0,
          copper: inventory?.copper ?? 0,
          equipped: equipped as Prisma.InputJsonValue,
          backpack: backpack as Prisma.InputJsonValue,
          items: items as Prisma.InputJsonValue,
        },
      });
    }

    for (const row of mapped.skillRows) {
      await prisma.characterSkills.create({
        data: { characterId: created.id, skillTreeId: row.skillTreeId, unlockedSkills: row.unlockedSkills as Prisma.InputJsonValue },
      });
    }

    console.info(`${character.name}: скопійовано (${created.id})`);
  }

  console.info(`Героїв скопійовано: ${heroes.length}, нових гравців: ${newPlayers.length}`);
}

if (process.argv[1]?.endsWith("copy-test-heroes.ts")) {
  main()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
