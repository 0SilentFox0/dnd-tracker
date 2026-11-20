import { applyWfrpConditionTo } from '../conditions/apply';
import type { EditionProfile } from '../edition';
import type { PercentileAttackDetails } from '../percentile/details';
import { ATTACK_SLOT } from '../slots';
import { rollSlot, rowText } from '../tables/resolve';
import type { TableEffect, TableSlot } from '../tables/schema';
import { applyWfrpCrit } from './crit-effect';
import type { CritResult } from './crit-table';
import { participantStats } from './participant';

import { EffectMarker } from '@/lib/constants/battle';
import { dynamicTextRef, textRef } from '@/lib/i18n/text-ref';
import { upsertLabeled } from '@/lib/utils/battle/actions/effects';
import { rollDice, rollDie } from '@/lib/utils/common/dice';
import type { Rng } from '@/lib/utils/common/rng';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { BattleAttack, BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

const MISFIRE_GROUPS = ['blackpowder', 'engineering', 'explosives'];

const MISFIRE_FROM = 99;

const SL_PENALTY_ROUNDS = 2;

type FumbleEdition = Pick<
    EditionProfile,
    'fumbleModel' | 'woundModel' | 'conditionModel'
>;

export interface FumbleOutcome {
    update: (p: BattleParticipant) => BattleParticipant;
    lines: LogLine[];
    /** Wounds the attacker takes, applied through the damage consequences; ignores TB and AP */
    wounds: number;
}

/** A pack that supplies its own Oops table switches the default `drop` to the table (p165) */
export const fumbleModelOf = (
    edition: Pick<EditionProfile, 'fumbleModel'>,
    rules: Pick<Ruleset, 'tables'>
) =>
    edition.fumbleModel === 'drop' && rules.tables.oops
        ? 'oops'
        : edition.fumbleModel;

const timed = (
    p: BattleParticipant,
    kind: string,
    rounds: number,
    effects: { type: string; value: number }[],
    abilityEffects?: Parameters<typeof upsertLabeled>[1]['abilityEffects']
) =>
    upsertLabeled(
        p,
        {
            timedKey: `wfrp:fumble:${kind}`,
            name: `fumble.wfrp.${kind}`,
            label: dynamicTextRef(`battleWfrp.fumble.labels.${kind}`),
            type: 'debuff',
            rounds,
            stackable: false,
            effects,
            ...(abilityEffects && { abilityEffects }),
        },
        0
    );

function applyEffect(
    p: BattleParticipant,
    e: TableEffect,
    ctx: { edition: FumbleEdition; rng: Rng; text: LogLine }
): BattleParticipant {
    if (e.type === 'condition')
        return applyWfrpConditionTo(p, {
            key: e.key,
            levels: e.levels,
            round: 0,
            edition: ctx.edition,
            sourceName: ctx.text,
        }).participant;

    if (e.type !== 'fumble') return p;

    if (e.kind === 'loseAction')
        return timed(p, 'loseAction', 1, [
            { type: EffectMarker.SKIP_ACTION, value: 100 },
        ]);

    if (e.kind === 'loseMove')
        return timed(p, 'loseMove', 1, [
            { type: EffectMarker.IMMOBILIZED, value: 1 },
        ]);

    if (e.kind === 'slPenalty')
        return timed(
            p,
            'slPenalty',
            SL_PENALTY_ROUNDS,
            [],
            [{ kind: 'modifyStat', stat: 'attackBonus', flat: -1 }]
        );

    if (e.kind === 'legPenalty') {
        const side = ctx.rng() < 0.5 ? 'left' : 'right';

        const crit: CritResult = {
            id: 'leg.oops',
            text: ctx.text,
            bonusDamage: 0,
            conditions: [],
            markers: ['crippled'],
            markerRounds: { crippled: rollDie(10, ctx.rng) },
            side,
            death: false,
        };

        return applyWfrpCrit(p, crit, 0, ctx.edition).participant;
    }

    return p;
}

const NOTE_KINDS = ['actLast', 'weaponDamage'];

/** Full weapon Damage at +0 SL, ignoring TB and AP; profile weapons have a flat `damageBonus` and no dice */
function weaponDamageOf(
    attacker: BattleParticipant,
    weapon: BattleAttack | undefined,
    rng: Rng
): number {
    if (!weapon) return 0;

    const sb = ATTACK_SLOT.read(weapon.system)?.noSb
        ? 0
        : (participantStats(attacker)?.sb ?? 0);

    const dice = weapon.damageDice ? rollDice(weapon.damageDice, rng) : 0;

    return dice + (weapon.damageBonus ?? 0) + sb;
}

function tableOutcome(
    slot: TableSlot,
    key: 'fumbleOops' | 'fumbleMisfire',
    attacker: BattleParticipant,
    weapon: BattleAttack | undefined,
    rules: Pick<Ruleset, 'tables'>,
    edition: FumbleEdition,
    rng: Rng
): FumbleOutcome {
    const { row, roll } = rollSlot(rules, slot, rng);

    const text = rowText(row);

    const explodes =
        slot === 'misfire' &&
        row.effects.some(
            (e) => e.type === 'fumble' && e.kind === 'weaponDamage'
        );

    const explosion = explodes ? weaponDamageOf(attacker, weapon, rng) : 0;

    return {
        update: (p) =>
            row.effects.reduce(
                (acc, e) => applyEffect(acc, e, { edition, rng, text }),
                p
            ),
        wounds: row.effects.reduce(
            (sum, e) =>
                e.type === 'wounds'
                    ? sum + (explosion > 0 ? explosion : e.amount)
                    : sum,
            0
        ),
        lines: [
            textRef(`battleWfrp.log.${key}`, {
                name: attacker.basicInfo.name,
                roll,
                text,
            }),
            ...row.effects.flatMap((e) =>
                e.type === 'fumble' && NOTE_KINDS.includes(e.kind)
                    ? [
                          textRef('battleWfrp.log.fumbleNote', {
                              name: attacker.basicInfo.name,
                              note: dynamicTextRef(
                                  `wfrpTables.fumbleKinds.${e.kind}`
                              ),
                          }),
                      ]
                    : []
            ),
        ],
    };
}

/** Consequences of a fumbled Melee or Ranged test for the attacker (p165); undefined when nothing applies */
export function fumbleOutcome(input: {
    details: PercentileAttackDetails;
    attacker: BattleParticipant;
    weapon?: BattleAttack;
    group?: string;
    edition: FumbleEdition;
    rules: Pick<Ruleset, 'tables'>;
    rng: Rng;
}): FumbleOutcome | undefined {
    const { details, attacker, weapon, group, edition, rules, rng } = input;

    const model = fumbleModelOf(edition, rules);

    if (model === 'none' || !details.fumble) return undefined;

    if (group && MISFIRE_GROUPS.includes(group) && details.roll >= MISFIRE_FROM)
        return tableOutcome(
            'misfire',
            'fumbleMisfire',
            attacker,
            weapon,
            rules,
            edition,
            rng
        );

    if (model === 'oops')
        return tableOutcome(
            'oops',
            'fumbleOops',
            attacker,
            weapon,
            rules,
            edition,
            rng
        );

    return {
        update: (p) =>
            applyEffect(
                p,
                { type: 'fumble', kind: 'loseAction' },
                { edition, rng, text: '' }
            ),
        wounds: 0,
        lines: [
            textRef('battleWfrp.log.fumbleDrop', {
                name: attacker.basicInfo.name,
            }),
        ],
    };
}
