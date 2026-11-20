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

/** Legacy: the first career roll plus one more; canon5e (p36): the first plus two more, three distinct options */
export const CAREER_ROLLS = { legacy: 2, canon5e: 3 } as const;

const CAREER_REROLL_ATTEMPTS = 20;

function rollCareers(
    rng: Rng,
    table: SpeciesProfile['careerTable'],
    count: number
) {
    const rolls: CreationRolls['careerRolls'] = [];

    for (let i = 0; i < count; i++) {
        let { row, roll } = rollTable(table, rng);

        for (
            let attempt = 0;
            count > CAREER_ROLLS.legacy &&
            attempt < CAREER_REROLL_ATTEMPTS &&
            rolls.some((r) => r.careerId === row.careerId);
            attempt++
        )
            ({ row, roll } = rollTable(table, rng));

        rolls.push({ careerId: row.careerId, roll });
    }

    return rolls;
}

export function rollCreation(
    rng: Rng,
    profile: SpeciesProfile,
    careerRollCount: number = CAREER_ROLLS.legacy
): CreationRolls {
    const { careerTable, randomTalents, randomTalentCount } = profile;

    const careerRolls = careerTable.length
        ? rollCareers(rng, careerTable, careerRollCount)
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
