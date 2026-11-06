import { CHARACTERISTIC_KEYS } from "../characteristics/keys";
import { rollTable } from "../tables/roll-table";
import type { SpeciesProfile } from "./profile";

import { rollDie } from "@/lib/utils/common/dice";
import type { Rng } from "@/lib/utils/common/rng";

export type CreationRolls = { careerRolls: { careerId: string; roll: number }[]; statRolls: number[]; randomTalents: string[] };

export function rollCreation(rng: Rng, profile: SpeciesProfile): CreationRolls {
  const { careerTable, randomTalents, randomTalentCount } = profile;

  const careerRolls = careerTable.length
    ? Array.from({ length: 2 }, () => {
        const { row, roll } = rollTable(careerTable, rng);

        return { careerId: row.careerId, roll };
      })
    : [];

  const statRolls = CHARACTERISTIC_KEYS.map(() => rollDie(10, rng) + rollDie(10, rng));

  const talents = randomTalents.length ? Array.from({ length: randomTalentCount }, () => rollTable(randomTalents, rng).row.featId) : [];

  return { careerRolls, statRolls, randomTalents: talents };
}
