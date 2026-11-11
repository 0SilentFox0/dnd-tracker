import { isDeepStrictEqual } from "node:util";

import type { PackHooks } from "../types";
import { wfrpDataOf } from "./common";

import { prisma } from "@/lib/db";
import { saveRaceProfile } from "@/lib/server/races/race-profile";
import { jsonContent } from "@/lib/utils/common/json";
import { nameKey } from "@/lib/utils/content/import";
import type { SpeciesProfile } from "@/lib/utils/rules/systems";

type Ctx = Parameters<NonNullable<PackHooks["afterImport"]>>[0];

const noop = () => undefined;

const idMap = (rows: Array<{ id: string; name: string }>) => new Map(rows.map((r) => [nameKey(r.name), r.id]));

function resolveProfile(profile: SpeciesProfile, ids: { feats: Map<string, string>; careers: Map<string, string> }): SpeciesProfile {
  const feat = (name: string) => ids.feats.get(nameKey(name)) as string;

  return {
    ...profile,
    talents: profile.talents.map(feat),
    randomTalents: profile.randomTalents.map((r) => ({ ...r, featId: feat(r.featId) })),
    careerTable: profile.careerTable.map((r) => ({ ...r, careerId: ids.careers.get(nameKey(r.careerId)) as string })),
  };
}

/** Race profiles name talents and careers; resolve them to the ids the import just wrote and save the changed ones. */
export async function writeRaceProfiles({ pack, templateId, idBySlug }: Ctx): Promise<void> {
  const { raceProfiles } = wfrpDataOf(pack);

  if (raceProfiles.length === 0) return;

  const where = { campaignId: templateId };

  const select = { id: true, name: true };

  const [feats, careers, raceRows] = await Promise.all([prisma.feat.findMany({ where, select }), prisma.career.findMany({ where, select }), prisma.race.findMany({ where, select: { id: true, profile: true } })]);

  const [featIds, careerIds] = [feats, careers].map(idMap);

  const stored = new Map(raceRows.map((r) => [r.id, r.profile]));

  for (const { race, profile } of raceProfiles) {
    const raceId = idBySlug.races?.[race];

    if (!raceId) throw new Error(`Вид зі slug "${race}" не знайдено в шаблоні після імпорту`);

    const resolved = resolveProfile(profile, { feats: featIds, careers: careerIds });

    if (!isDeepStrictEqual(jsonContent(resolved), stored.get(raceId))) await saveRaceProfile(templateId, raceId, resolved, noop);
  }
}
