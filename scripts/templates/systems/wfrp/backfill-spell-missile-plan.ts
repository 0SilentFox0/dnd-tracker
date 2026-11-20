import { SPELL_MISSILES } from './spell-missiles';

import { isRecord } from '@/lib/utils/common/is-record';
import { PRESETS } from '@/lib/utils/rules/systems/catalog';

export interface SpellRow {
    id: string;
    campaignId: string;
    slug: string;
    casting: unknown;
    spellEffects: unknown;
    dice: number;
    upcastDice: number | null;
}

export interface SpellState {
    casting: unknown;
    spellEffects: unknown;
    dice: number;
    upcastDice: number | null;
}

export interface MissilePlan {
    row: SpellRow;
    action: 'write' | 'unchanged' | 'modified';
    after?: SpellState;
}

/** Dice columns of the template rows before the missile data (template at 67e7b5d95) */
const OLD_DICE: Record<string, [number, number | null]> = {
    'spark-flick': [1, null],
    'hearth-spark': [1, null],
    'leech-touch': [1, null],
    'burst-orb': [1, 1],
    'lance-bolt': [1, 1],
    'falling-star': [4, 1],
    'ore-wrench': [2, 1],
    'howling-skull': [1, 1],
    'spirit-pyre': [1, null],
    'twin-star-fall': [1, null],
    'cold-verdict': [1, null],
};

export const isWfrpRules = (rules: unknown): boolean => {
    const key =
        isRecord(rules) && isRecord(rules.system)
            ? rules.system.key
            : undefined;

    return typeof key === 'string' && PRESETS[key]?.base === 'wfrp';
};

const SPELL_ROLL_EFFECT = [
    { kind: 'dealDamage', amount: { spellRoll: 100 }, damageType: 'magic' },
];

const sameJson = (a: unknown, b: unknown) =>
    JSON.stringify(a) === JSON.stringify(b);

const magicOf = (casting: unknown): Record<string, unknown> | undefined =>
    isRecord(casting) && isRecord(casting.magic) ? casting.magic : undefined;

export function targetState(row: SpellRow): SpellState | undefined {
    const entry = SPELL_MISSILES[row.slug];

    const magic = magicOf(row.casting);

    if (!entry || !magic || !isRecord(row.casting)) return undefined;

    const effects = Array.isArray(row.spellEffects) ? row.spellEffects : [];

    return {
        casting: {
            ...row.casting,
            magic: { ...magic, missile: entry.missile },
        },
        spellEffects: effects.map((e) =>
            isRecord(e) && e.kind === 'dealDamage'
                ? { ...e, amount: entry.amount }
                : e
        ),
        dice: 0,
        upcastDice: null,
    };
}

export function planMissileRow(row: SpellRow): MissilePlan {
    const after = targetState(row);

    if (!after) return { row, action: 'unchanged' };

    const current: SpellState = {
        casting: row.casting,
        spellEffects: row.spellEffects,
        dice: row.dice,
        upcastDice: row.upcastDice,
    };

    if (sameJson(current, after)) return { row, action: 'unchanged' };

    const old = OLD_DICE[row.slug];

    const magic = magicOf(row.casting);

    const template =
        !!old &&
        !!magic &&
        magic.missile === undefined &&
        row.dice === old[0] &&
        row.upcastDice === old[1] &&
        sameJson(row.spellEffects, SPELL_ROLL_EFFECT);

    return template
        ? { row, action: 'write', after }
        : { row, action: 'modified' };
}

export const planMissiles = (rows: readonly SpellRow[]): MissilePlan[] =>
    rows.map(planMissileRow);

export function summarizeMissiles(
    plans: readonly MissilePlan[],
    active: ReadonlySet<string>
) {
    const writes = plans.filter((p) => p.action === 'write');

    return {
        write: writes.length,
        activeBattle: writes.filter((p) => active.has(p.row.campaignId)).length,
        unchanged: plans.filter((p) => p.action === 'unchanged').length,
        modified: plans.filter((p) => p.action === 'modified').length,
    };
}

export const formatMissilePlan = (p: MissilePlan): string[] =>
    p.action === 'write'
        ? []
        : p.action === 'modified'
          ? [
                `modified by the DM, skipped: ${p.row.campaignId} ${p.row.slug} (${p.row.id})`,
            ]
          : [];

export const stateText = (s: SpellState) => JSON.stringify(s);
