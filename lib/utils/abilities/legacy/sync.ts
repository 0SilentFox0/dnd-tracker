import type { PrismaClient } from "@prisma/client";

import { convertLegacyArtifact } from "./convert-artifact";
import { convertLegacyArtifactSet } from "./convert-artifact-set";
import { convertLegacyRace } from "./convert-race";
import { convertLegacySkill, type LegacySkillRow } from "./convert-skill";
import { convertLegacyUnit } from "./convert-unit";
import { abilitiesJson } from "./read";

type Db = Pick<PrismaClient, "skill" | "race" | "artifact" | "artifactSet" | "unit">;

// Подвійний запис до 3b: старі форми пишуть старі поля, abilities перераховується з них.
export async function syncSkillAbilities(db: Db, row: LegacySkillRow): Promise<void> {
  await db.skill.update({ where: { id: row.id }, data: { abilities: abilitiesJson(convertLegacySkill(row).abilities) } });
}

export async function syncRaceAbilities(db: Db, row: Parameters<typeof convertLegacyRace>[0]): Promise<void> {
  await db.race.update({ where: { id: row.id }, data: { abilities: abilitiesJson(convertLegacyRace(row).abilities) } });
}

export async function syncArtifactAbilities(db: Db, row: Parameters<typeof convertLegacyArtifact>[0]): Promise<void> {
  await db.artifact.update({ where: { id: row.id }, data: { abilities: abilitiesJson(convertLegacyArtifact(row).abilities) } });
}

export async function syncArtifactSetAbilities(db: Db, row: Parameters<typeof convertLegacyArtifactSet>[0]): Promise<void> {
  await db.artifactSet.update({ where: { id: row.id }, data: { abilities: abilitiesJson(convertLegacyArtifactSet(row).abilities) } });
}

export async function syncUnitAbilities(db: Db, row: Parameters<typeof convertLegacyUnit>[0]): Promise<void> {
  await db.unit.update({ where: { id: row.id }, data: { abilities: abilitiesJson(convertLegacyUnit(row).abilities) } });
}
