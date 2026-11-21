import type { Row } from './common';

import { isRecord } from '@/lib/utils/common/is-record';

/** Listed power of one native spell (numbers only, p235): `bonus` absent = the spell keeps its dice */
export interface SpellPowerSpec {
    bonus?: number;
    missile?: true;
    ignore?: 'ap' | 'tbAp';
    /** Adds the cast SL to the dice damage */
    slBonus?: true;
    /** Characteristic whose bonus is added to the listed number */
    scale?: string;
}

const missile = (
    bonus: number,
    rest: Omit<SpellPowerSpec, 'bonus' | 'missile'> = {}
): SpellPowerSpec => ({ bonus, missile: true, ...rest });

const flat = (
    bonus: number,
    rest: Omit<SpellPowerSpec, 'bonus'> = {}
): SpellPowerSpec => ({
    bonus,
    ...rest,
});

/** Every native damage or heal spell of the template; a spell with a book Damage is native and listed here */
export const SPELL_POWER: Record<string, SpellPowerSpec> = {
    'Spark Flick': missile(0),
    'Leech Touch': missile(0, { ignore: 'ap' }),
    'Burst Orb': missile(3),
    'Lance Bolt': missile(4),
    'Elemental Exhale': missile(0),
    'Arcing Strike': missile(4),
    'Gilded Javelin': missile(8),
    'Furnace Burst': missile(5, { ignore: 'ap' }),
    'Falling Star': missile(18),
    'Forked Arc': missile(10),
    'Ore Wrench': missile(9, { ignore: 'tbAp' }),
    'Rotten Stream': missile(0, { ignore: 'ap', scale: 't' }),
    'Howling Skull': missile(5),
    'Soul Draw': missile(6, { ignore: 'tbAp' }),
    'Vital Siphon': missile(6, { ignore: 'ap' }),
    'Spirit Whirl': missile(8, { ignore: 'tbAp' }),
    'Carrion Cloud': flat(7),
    'Shove Wave': { ignore: 'ap' },
    'Smiting Ash': { ignore: 'tbAp', slBonus: true },
    'Spirit Pyre': { ignore: 'tbAp' },
    'Twin Star Fall': { ignore: 'tbAp', slBonus: true },
    'Cold Verdict': { ignore: 'tbAp', slBonus: true },
    // template originals without a book source
    'Ember Dart': missile(4),
    'Cinder Cloud': missile(4),
    'Pyre Lance': missile(8),
    'Shade Bolt': missile(4),
    'Hollow Scream': missile(6),
    'Sour Blood': missile(4),
    'Crow-Knot Curse': missile(6),
    'Hearth Spark': {},
    'Hearthfire Smite': { ignore: 'tbAp' },
    // heals
    'Soothing Touch': flat(1),
    'Mending Moss': flat(1),
    'Hearth Mending': flat(1),
    'Sear Seal': flat(1),
    'Soil Vigour': flat(0, { scale: 'wp' }),
    'Mending Surge': flat(0, { scale: 'wp' }),
    'Mending Gleam': flat(0, { scale: 'int' }),
    'Pale Mending': flat(0, { scale: 'wp' }),
    'Gentle Hands': flat(0, { scale: 'fel' }),
    'Mercy of the Hearth': {},
    'Last Light': {},
};

/** Checks a native row against its listed power: the flat model keeps no dice, a dice spell keeps no bonus */
export function spellPowerIssues(
    row: Row,
    effectKind: string | null
): string[] {
    const issues: string[] = [];

    const spec = SPELL_POWER[String(row.name)];

    const casting = isRecord(row.casting) ? row.casting : {};

    const magic = isRecord(casting.magic) ? casting.magic : {};

    if (!spec) return issues;

    if (row.executionMode === 'manual')
        issues.push('a spell with a listed Damage or heal must be native');

    const damage = effectKind === 'dealDamage';

    const bonus = row.damageBonus;

    if (spec.bonus === undefined) {
        if (bonus !== undefined)
            issues.push('a dice spell carries no damageBonus');

        if (magic.missile !== undefined)
            issues.push('a dice spell is not a magic missile');
    } else {
        if (bonus !== spec.bonus)
            issues.push(`damageBonus must be ${spec.bonus}`);

        if (row.dice !== 0) issues.push('a flat spell has no dice');

        if ((magic.missile === true) !== (spec.missile === true))
            issues.push(
                'casting.magic.missile does not match the listed spell'
            );
    }

    if (magic.ignore !== spec.ignore)
        issues.push(`casting.magic.ignore must be ${spec.ignore ?? 'absent'}`);

    if (magic.slBonus !== spec.slBonus)
        issues.push(`casting.magic.slBonus must be ${spec.slBonus ?? 'absent'}`);

    if (magic.scale !== spec.scale)
        issues.push(`casting.magic.scale must be ${spec.scale ?? 'absent'}`);

    if (!damage && (spec.missile || spec.ignore))
        issues.push('missile and ignore apply to damage spells only');

    return issues;
}

/** A native damage or heal row of the pack must be listed in SPELL_POWER */
export function unlistedPowerIssues(
    row: Row,
    effectKind: string | null
): string[] {
    return effectKind &&
        row.executionMode !== 'manual' &&
        !SPELL_POWER[String(row.name)]
        ? ['a damage or heal spell needs an entry in SPELL_POWER']
        : [];
}
