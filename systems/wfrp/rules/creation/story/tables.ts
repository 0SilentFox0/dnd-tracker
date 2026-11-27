import { rollTable } from '../../tables/roll-table';
import { type RolledQuestionId,STORY_QUESTIONS } from './types';

import type { Rng } from '@/lib/utils/common/rng';

const ROWS = 10;

export const STORY_TABLES: Record<
    RolledQuestionId,
    { max: number; key: string }[]
> = Object.fromEntries(
    STORY_QUESTIONS.map((q) => [
        q,
        Array.from({ length: ROWS }, (_, i) => ({
            max: (i + 1) * 10,
            key: `tables.${q}.${i + 1}`,
        })),
    ])
) as Record<RolledQuestionId, { max: number; key: string }[]>;

export function rollStory(
    q: RolledQuestionId,
    rng: Rng
): { roll: number; key: string } {
    const { row, roll } = rollTable(STORY_TABLES[q], rng);

    return { roll, key: row.key };
}
