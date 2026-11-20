import type { WfrpConditionKey } from '../conditions/catalog';
import { resolveTable, rollSlot, rowText } from '../tables/resolve';
import type { HitLocation, HitSide } from './constants';

import { dynamicTextRef } from '@/lib/i18n/text-ref';
import { rollDie } from '@/lib/utils/common/dice';
import type { Rng } from '@/lib/utils/common/rng';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { TableSlot } from '@/systems/wfrp/rules/tables/schema';
import type { LogLine } from '@/types/text';

export interface CritResult {
    id: string;
    text: LogLine;
    bonusDamage: number;
    conditions: { key: WfrpConditionKey; levels: number }[];
    markers: string[];
    /** Duration of a marker in rounds; a marker without an entry is permanent */
    markerRounds?: Partial<Record<string, number>>;
    /** Which arm or leg was struck (canon5e) */
    side?: HitSide;
    /** The roll ran past the table (or hit a `death` row), p171-176 */
    death: boolean;
}

const SLOT: Record<HitLocation, TableSlot> = {
    head: 'critHead',
    arm: 'critArm',
    body: 'critBody',
    leg: 'critLeg',
};

const ROUNDS_TERM = /^(\d+)d(\d+)(?:([+-])(\d+|TB))?$/;

/** Rolls a `roundsDice` duration (min 1 round) */
function rollRounds(expr: string, tb: number, rng: Rng): number {
    const m = ROUNDS_TERM.exec(expr);

    if (!m) return 1;

    const dice = Array.from({ length: Number(m[1]) }, () =>
        rollDie(Number(m[2]), rng)
    ).reduce((a, b) => a + b, 0);

    const offset = m[4] === 'TB' ? tb : Number(m[4] ?? 0);

    return Math.max(1, dice + (m[3] === '-' ? -offset : offset));
}

export function rollCrit(
    location: HitLocation,
    rules: Pick<Ruleset, 'tables'>,
    rng: Rng,
    presetRoll?: number,
    /** +10 per Wound beyond what dropped the target to 0 (p171) */
    bonus = 0,
    side?: HitSide,
    tb = 0
): CritResult {
    const slot = SLOT[location];

    const sided =
        side && (location === 'arm' || location === 'leg') ? { side } : {};

    const roll = (presetRoll ?? rollDie(100, rng)) + bonus;

    const { index, row } = rollSlot(rules, slot, rng, roll);

    const rows = resolveTable(rules, slot);

    if (roll > rows[rows.length - 1].max)
        return {
            id: `${location}.death`,
            text: dynamicTextRef(`battleWfrp.crit.${location}.death`),
            bonusDamage: 0,
            conditions: [],
            markers: [],
            death: true,
            ...sided,
        };

    const result: CritResult = {
        id: `${location}.${index + 1}`,
        text: rowText(row),
        bonusDamage: 0,
        conditions: [],
        markers: [],
        death: false,
        ...sided,
    };

    for (const e of row.effects) {
        if (e.type === 'damage') result.bonusDamage += e.amount;
        else if (e.type === 'condition')
            result.conditions.push({ key: e.key, levels: e.levels });
        else if (e.type === 'marker') {
            result.markers.push(e.key);

            const rounds = e.roundsDice
                ? rollRounds(e.roundsDice, tb, rng)
                : e.rounds;

            if (rounds)
                result.markerRounds = {
                    ...result.markerRounds,
                    [e.key]: rounds,
                };
        } else if (e.type === 'death') result.death = true;
    }

    return result;
}
