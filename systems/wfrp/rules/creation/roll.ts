import { CHARACTERISTIC_KEYS } from '../characteristics/keys';
import { rollTable } from '../tables/roll-table';
import type { SpeciesProfile } from './profile';

import { rollDie } from '@/lib/utils/common/dice';
import type { Rng } from '@/lib/utils/common/rng';

const TALENT_REROLL_ATTEMPTS = 20;

export type CreationRolls = {
    careerRolls: { careerId: string; roll: number }[];
    statRolls: number[];
    randomTalents: string[];
};

export function rollCreation(rng: Rng, profile: SpeciesProfile): CreationRolls {
    const { careerTable, randomTalents, randomTalentCount } = profile;

    const careerRolls = careerTable.length
        ? Array.from({ length: 2 }, () => {
              const { row, roll } = rollTable(careerTable, rng);

              return { careerId: row.careerId, roll };
          })
        : [];

    const statRolls = CHARACTERISTIC_KEYS.map(
        () => rollDie(10, rng) + rollDie(10, rng)
    );

    const talents: string[] = [];

    if (randomTalents.length) {
        const taken = new Set(profile.talents);

        for (let i = 0; i < randomTalentCount; i++) {
            let featId = rollTable(randomTalents, rng).row.featId;

            for (
                let attempt = 0;
                attempt < TALENT_REROLL_ATTEMPTS && taken.has(featId);
                attempt++
            )
                featId = rollTable(randomTalents, rng).row.featId;

            taken.add(featId);
            talents.push(featId);
        }
    }

    return { careerRolls, statRolls, randomTalents: talents };
}
