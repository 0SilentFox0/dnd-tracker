import { bonus } from '../characteristics/derive';
import { CHARACTERISTIC_KEYS } from '../characteristics/keys';
import { applyWfrpCrit } from '../combat/crit-effect';
import { rollCrit } from '../combat/crit-table';
import { computeWfrpDamage } from '../combat/damage';
import { asLocation, hitLocation, sideOf } from '../combat/location';
import {
    apAt,
    participantChars,
    participantStats,
} from '../combat/participant';
import { editionOf } from '../edition';
import { ACTION_SLOT } from '../slots';
import { withFireWounds } from '../traits/regeneration';
import { wardRoll } from '../traits/size';

import { dynamicTextRef, textRef } from '@/lib/i18n/text-ref';
import { stepRow } from '@/lib/utils/battle/damage/rows';
import { signed } from '@/lib/utils/common/format';
import type {
    MitigateResult,
    MitigateStep,
    RuleSystemMagic,
    SpellPowerSource,
} from '@/lib/utils/rules/systems/types';
import type { SpellMagic } from '@/lib/utils/spells/model/schema';
import type { BattleParticipant } from '@/types/battle';

type Ctx<K extends 'spellPower' | 'soakSpellDamage'> = Parameters<
    NonNullable<RuleSystemMagic[K]>
>[0];

const canonMagic = (
    rules: Ctx<'spellPower'>['rules'],
    spell: SpellPowerSource
) =>
    editionOf(rules).magicModel === 'canon5e'
        ? spell.definition.casting?.magic
        : undefined;

const isCharacteristic = (
    key: string
): key is (typeof CHARACTERISTIC_KEYS)[number] =>
    (CHARACTERISTIC_KEYS as readonly string[]).includes(key);

/** Flat spell power (p235): the listed Damage plus WPB for a magic missile, plus the scaling bonus and overcast; dice-less spells only */
export const wfrpSpellPower: NonNullable<RuleSystemMagic['spellPower']> = (
    c
): ReturnType<NonNullable<RuleSystemMagic['spellPower']>> => {
    const magic = canonMagic(c.rules, c.spell);

    const listed = c.spell.definition.damageBonus;

    if (!magic || listed === undefined) return undefined;

    const chars = participantChars(c.caster);

    const wpb = magic.missile ? bonus(chars, 'wp') : 0;

    const scaled =
        magic.scale && isCharacteristic(magic.scale)
            ? bonus(chars, magic.scale)
            : 0;

    const total = listed + wpb + scaled + c.overcastDamage;

    const rows = [
        stepRow(textRef('battleWfrp.damage.steps.spell'), signed(listed)),
        ...(wpb
            ? [stepRow(textRef('battleWfrp.damage.steps.wpb'), signed(wpb))]
            : []),
        ...(scaled
            ? [
                  stepRow(
                      textRef('battleWfrp.damage.steps.spellScale'),
                      signed(scaled)
                  ),
              ]
            : []),
        ...(c.overcastDamage
            ? [
                  stepRow(
                      textRef('battleWfrp.damage.steps.overcast'),
                      signed(c.overcastDamage)
                  ),
              ]
            : []),
    ];

    return { damage: total, heal: total, breakdown: rows };
};

const step = (key: string, value: number): MitigateStep => ({
    key,
    value,
    label: dynamicTextRef(`battleWfrp.damage.steps.${key}`),
    side: key === 'tb' || key === 'ap' ? 'target' : 'attacker',
});

const totalLabel = textRef('battleWfrp.damage.total');

const isFireSpell = (spell: SpellPowerSource, magic: SpellMagic): boolean =>
    magic.attribute?.condition === 'ablaze' ||
    spell.definition.effects.some((e) => e.damageType === 'fire');

function ignoredOf(magic: SpellMagic | undefined) {
    return {
        tb: magic?.ignore === 'tbAp',
        ap: magic?.ignore === 'ap' || magic?.ignore === 'tbAp',
    };
}

/** Soak of a spell hit (p235): TB and AP of the struck location, minimum 1, Critical Damage on a critical cast */
export const wfrpSoakSpellDamage: NonNullable<
    RuleSystemMagic['soakSpellDamage']
> = (c: Ctx<'soakSpellDamage'>): MitigateResult | undefined => {
    const magic = canonMagic(c.rules, c.spell);

    if (!magic || c.amount <= 0) return undefined;

    const { target } = c;

    const ward = wardRoll(target, c.rng);

    if (ward?.saved)
        return {
            amount: 0,
            steps: [
                {
                    key: 'ward',
                    value: 0,
                    label: textRef('battleWfrp.damage.steps.ward', {
                        roll: ward.roll,
                        ward: participantStats(target)?.ward ?? 0,
                    }),
                    side: 'target',
                },
            ],
            totalLabel,
        };

    const cast = ACTION_SLOT.read(c.castDetails)?.cast;

    const split = editionOf(c.rules).hitLocationModel === 'side';

    const spot = magic.missile && cast ? hitLocation(cast.roll, split) : 'body';

    const location = asLocation(spot);

    const ignored = ignoredOf(magic);

    const stats = participantStats(target);

    const base = computeWfrpDamage({
        weapon: c.amount,
        sb: 0,
        netSl: 0,
        tb: ignored.tb ? 0 : (stats?.tb ?? 0),
        ap: ignored.ap ? 0 : apAt(stats, location),
    });

    const steps = base.steps
        .filter((s) => s.key === 'weapon' || s.value !== 0)
        .map((s) => step(s.key === 'weapon' ? 'spell' : s.key, s.value));

    const raw = base.steps.reduce((sum, s) => sum + s.value, 0);

    if (base.total !== raw) steps.push(step('minimum', base.total - raw));

    const crit =
        cast?.critBonus === 'criticalDamage'
            ? rollCrit(
                  location,
                  c.rules,
                  c.rng,
                  undefined,
                  0,
                  sideOf(spot),
                  stats?.tb ?? 0
              )
            : undefined;

    if (crit?.bonusDamage) steps.push(step('crit', crit.bonusDamage));

    const edition = editionOf(c.rules);

    const amount = base.total + (crit?.bonusDamage ?? 0);

    const fire = amount > 0 && isFireSpell(c.spell, magic);

    return {
        amount,
        steps,
        totalLabel,
        ...((crit || fire) && {
            afterHit: (p: BattleParticipant, round: number) => {
                const burned = fire ? withFireWounds(p, amount) : p;

                return crit
                    ? applyWfrpCrit(burned, crit, round, edition)
                    : { participant: burned, message: '' };
            },
        }),
    };
};
