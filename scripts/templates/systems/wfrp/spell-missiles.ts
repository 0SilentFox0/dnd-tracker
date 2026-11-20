import fs from 'node:fs';
import path from 'node:path';

import type { Row } from './common';

import { isRecord } from '@/lib/utils/common/is-record';
import type { SpellMagic } from '@/lib/utils/spells/model/schema';

export interface SpellMissileEntry {
    /** Declared Damage: the book's "+N" of a magic missile, or a dice string */
    amount: number | string;
    missile: NonNullable<SpellMagic['missile']>;
    /** Printed page of the book entry the value comes from */
    page: number;
    /** Value is not printed in the book: the owner reviews it */
    derived?: true;
}

/** Values only from the book (page + shape match to the manifest row), except entries marked derived. */
export const SPELL_MISSILES: Record<string, SpellMissileEntry> = {
    'burst-orb': { amount: 3, missile: { wpb: true }, page: 243 },
    'lance-bolt': { amount: 4, missile: { wpb: true }, page: 243 },
    'falling-star': { amount: 18, missile: { wpb: true }, page: 249 },
    'ore-wrench': {
        amount: 9,
        missile: { wpb: true, ignore: ['tb', 'ap'] },
        page: 253,
    },
    'howling-skull': { amount: 5, missile: { wpb: true }, page: 259 },
    'leech-touch': {
        amount: 0,
        missile: { wpb: true, ignore: ['ap'] },
        page: 240,
    },
    'spirit-pyre': {
        amount: '1d10',
        missile: { wpb: false, ignore: ['tb', 'ap'] },
        page: 227,
    },
    'twin-star-fall': {
        amount: '1d10',
        missile: { wpb: false, ignore: ['tb', 'ap'], perSl: 1 },
        page: 227,
    },
    'cold-verdict': {
        amount: '1d10',
        missile: { wpb: false, ignore: ['tb', 'ap'], perSl: 1 },
        page: 228,
    },
    // DERIVED: same page, range and target as the book's Dart (Damage +0)
    'spark-flick': {
        amount: 0,
        missile: { wpb: true },
        page: 240,
        derived: true,
    },
    // DERIVED: no damage printed; lowest-tier rule, same as the Dart (+0)
    'hearth-spark': {
        amount: 0,
        missile: { wpb: true },
        page: 220,
        derived: true,
    },
};

export function applySpellMissile(row: Row): Row {
    const entry = SPELL_MISSILES[String(row.slug)];

    if (!entry) return row;

    const casting = isRecord(row.casting) ? row.casting : {};

    const magic = isRecord(casting.magic) ? casting.magic : {};

    const { dice: _dice, upcastDice: _upcast, ...rest } = row;

    return {
        ...rest,
        casting: { ...casting, magic: { ...magic, missile: entry.missile } },
        spellEffects: (Array.isArray(row.spellEffects)
            ? row.spellEffects
            : []
        ).map((e) =>
            isRecord(e) && e.kind === 'dealDamage'
                ? { ...e, amount: entry.amount }
                : e
        ),
    };
}

if (process.argv[1]?.endsWith('spell-missiles.ts')) {
    const file = path.join(
        process.cwd(),
        'data/templates/grim-d100/spells.json'
    );

    const rows = JSON.parse(fs.readFileSync(file, 'utf8')) as Row[];

    const lines = rows.map((r) => `  ${JSON.stringify(applySpellMissile(r))}`);

    fs.writeFileSync(file, `[\n${lines.join(',\n')}\n]\n`);
}
