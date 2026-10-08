#!/usr/bin/env tsx
/**
 * Заповнює кампанію бібліотекою скілів і заклять (data/library): школи, закляття, раси, гілки, скіли, дерева рас.
 * Ідемпотентно: знаходить за назвою в кампанії → оновлює, інакше створює. Лише локальна БД без --allow-remote.
 *
 *   pnpm seed-library <campaignId> [--dry-run] [--replace-trees] [--allow-remote]
 *
 * Кеш довідників на сервері оновиться протягом 300 с (скрипт не інвалідує Next data cache).
 */
import type { Prisma } from "@prisma/client";

import { branchSkills, buildLibrary } from "../data/library/build";
import type { LibraryBranch, LibrarySkill } from "../data/library/types";
import { iconPublicUrl } from "../data/skill-icons";
import { prisma } from "../lib/db";
import { buildTreeJson } from "../lib/utils/skills/progression";
import {
  assertSeedTarget,
  emptyTally,
  findByName,
  formatSummary,
  type IdMaps,
  mapRaceModifiers,
  parseArgs,
  remapRefs,
  type Tally,
  treeInput,
} from "./seed-library-lib";

const RACE_BRANCH = { name: "Раса", color: "#c9a227" };

const ULTIMATE_BRANCH = { name: "Ультимат", color: "#b3261e" };

const PERSONAL_BRANCH = { name: "Персональні", color: "#8e6bbf" };

const json = (v: unknown) => v as Prisma.InputJsonValue;

const hasSummon = (effects: unknown) => Array.isArray(effects) && effects.some((e) => typeof e === "object" && e !== null && (e as { kind?: string }).kind === "summon");

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  const host = assertSeedTarget(process.env.DATABASE_URL, opts.allowRemote);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL не задано: іконки отримали б биті URL");


  const library = buildLibrary();

  const { campaignId, dryRun } = opts;

  console.info(`БД: ${host}${dryRun ? " (dry-run)" : ""}, кампанія ${campaignId}`);

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true } });

  if (!campaign) throw new Error(`Кампанію ${campaignId} не знайдено`);

  const tallies: Record<string, Tally> = {
    школи: emptyTally(),
    закляття: emptyTally(),
    раси: emptyTally(),
    гілки: emptyTally(),
    скіли: emptyTally(),
    дерева: emptyTally(),
  };

  const icon = (key?: string) => (key ? iconPublicUrl(supabaseUrl, key) : undefined);

  const upsert = async <T extends { id: string; name: string }>(
    kind: string,
    existing: T[],
    name: string,
    write: { create: () => Promise<T>; update: (id: string) => Promise<T> },
  ): Promise<string> => {
    const found = findByName(existing, name);

    if (found) {
      tallies[kind].updated++;

      if (dryRun) return found.id;

      return (await write.update(found.id)).id;
    }

    tallies[kind].created++;

    if (dryRun) return `new:${kind}:${name}`;

    const row = await write.create();

    existing.push(row);

    return row.id;
  };

  const groupRows = await prisma.spellGroup.findMany({ where: { campaignId }, select: { id: true, name: true } });

  const groups = new Map<string, string>();

  for (const school of library.schools) {
    groups.set(school, await upsert("школи", groupRows, school, {
      create: () => prisma.spellGroup.create({ data: { campaignId, name: school }, select: { id: true, name: true } }),
      update: (id) => prisma.spellGroup.update({ where: { id }, data: { name: school }, select: { id: true, name: true } }),
    }));
  }

  const raceRows = await prisma.race.findMany({ where: { campaignId }, select: { id: true, name: true } });

  const races = new Map<string, string>();

  for (const race of library.races) {
    const data = { name: race.name, icon: icon(race.iconKey ?? race.levels[0].iconKey), color: race.color, spellSlotProgression: json(race.spellSlotProgression) };

    races.set(race.key, await upsert("раси", raceRows, race.name, {
      create: () => prisma.race.create({ data: { campaignId, ...data }, select: { id: true, name: true } }),
      update: (id) => prisma.race.update({ where: { id }, data, select: { id: true, name: true } }),
    }));
  }

  const spellRows = await prisma.spell.findMany({ where: { campaignId }, select: { id: true, name: true, spellEffects: true } });

  const spells = new Map<string, string>();

  for (const spell of library.spells) {
    const d = spell.definition;

    const data = {
      name: spell.name,
      level: spell.level,
      groupId: groups.get(spell.school),
      icon: icon(spell.iconKey),
      description: spell.description,
      appearanceDescription: spell.appearanceDescription,
      dice: d.dice,
      cost: d.cost,
      stackable: d.stackable ?? false,
      maxStacks: d.maxStacks ?? null,
      targeting: json(d.targeting),
      resolution: json(d.resolution),
      spellEffects: json(d.effects),
      raceModifiers: json(mapRaceModifiers(spell.raceModifiers, races)),
    };

    const { spellEffects: _libraryEffects, ...dataKeepingEffects } = data;

    void _libraryEffects;

    const existing = findByName(spellRows, spell.name);

    const keepEffects = hasSummon(existing?.spellEffects);

    const created = () => prisma.spell.create({ data: { campaignId, type: "target", damageType: "damage", ...data }, select: { id: true, name: true, spellEffects: true } });

    spells.set(spell.key, await upsert("закляття", spellRows, spell.name, {
      create: created,
      update: (id) => prisma.spell.update({ where: { id }, data: keepEffects ? dataKeepingEffects : data, select: { id: true, name: true, spellEffects: true } }),
    }));
  }

  const maps: IdMaps = { groups, spells, races };

  const mainRows = await prisma.mainSkill.findMany({ where: { campaignId }, select: { id: true, name: true } });

  const mainSkills = new Map<string, string>();

  const mainSkill = (kind: string, name: string, color: string, extra: { icon?: string; spellGroupId?: string }) => {
    const data = { name, color, icon: extra.icon, spellGroupId: extra.spellGroupId, isEnableInSkillTree: false };

    return upsert(kind, mainRows, name, {
      create: () => prisma.mainSkill.create({ data: { campaignId, ...data }, select: { id: true, name: true } }),
      update: (id) => prisma.mainSkill.update({ where: { id }, data, select: { id: true, name: true } }),
    });
  };

  for (const b of library.branches) {
    mainSkills.set(b.key, await mainSkill("гілки", b.name, b.color, { icon: icon(b.iconKey), spellGroupId: b.spellSchool ? groups.get(b.spellSchool) : undefined }));
  }

  const raceMain = await mainSkill("гілки", RACE_BRANCH.name, RACE_BRANCH.color, {});

  const ultimateMain = await mainSkill("гілки", ULTIMATE_BRANCH.name, ULTIMATE_BRANCH.color, {});

  const personalMain = await mainSkill("гілки", PERSONAL_BRANCH.name, PERSONAL_BRANCH.color, {});

  const skillRows = await prisma.skill.findMany({ where: { campaignId }, select: { id: true, name: true } });

  const skills = new Map<string, string>();

  const putSkill = async (skill: LibrarySkill, mainSkillId: string) => {
    const iconUrl = icon(skill.iconKey);

    const data = {
      name: skill.name,
      description: skill.description,
      appearanceDescription: skill.appearanceDescription,
      icon: iconUrl,
      image: iconUrl,
      mainSkillId: mainSkillId.startsWith("new:") ? undefined : mainSkillId,
      abilities: json(remapRefs(skill.abilities, maps)),
      spellNewSpellId: skill.newSpellKey ? spells.get(skill.newSpellKey) : undefined,
      grantedSpellId: skill.grantedSpellKey ? spells.get(skill.grantedSpellKey) : undefined,
    };

    skills.set(skill.key, await upsert("скіли", skillRows, skill.name, {
      create: () => prisma.skill.create({ data: { campaignId, ...data }, select: { id: true, name: true } }),
      update: (id) => prisma.skill.update({ where: { id }, data, select: { id: true, name: true } }),
    }));
  };

  for (const b of library.branches) {
    for (const s of branchSkills(b)) await putSkill(s, mainSkills.get(b.key) ?? "");
  }

  for (const r of library.races) {
    for (const s of r.levels) await putSkill(s, raceMain);

    await putSkill(r.ultimate, ultimateMain);
  }

  for (const p of library.personal) await putSkill(p, personalMain);

  const treeRows = await prisma.skillTree.findMany({ where: { campaignId }, select: { id: true, race: true } });

  const branchIcon = (b: LibraryBranch) => icon(b.iconKey);

  for (const race of library.races) {
    const existing = treeRows.find((t) => t.race.toLowerCase() === race.name.toLowerCase());

    if (existing && !opts.replaceTrees) {
      tallies.дерева.skipped++;

      continue;
    }

    if (dryRun) {
      tallies.дерева[existing ? "updated" : "created"]++;

      continue;
    }

    const input = treeInput(race, library.branches, { skills, mainSkills, groups, branchIcon });

    const row = existing ?? (await prisma.skillTree.create({ data: { campaignId, race: race.name, skills: {} }, select: { id: true, race: true } }));

    await prisma.skillTree.update({ where: { id: row.id }, data: { race: race.name, skills: json(buildTreeJson({ id: row.id, ...input })) } });

    tallies.дерева[existing ? "updated" : "created"]++;
  }

  console.info(formatSummary(tallies));
  console.info("Кеш довідників на сервері оновиться протягом 300 с.");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
