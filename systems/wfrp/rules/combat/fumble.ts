import { applyWfrpConditionTo } from '../conditions/apply';
import type { EditionProfile } from '../edition';
import type { QualityRef } from '../equipment/qualities';
import type { PercentileAttackDetails } from '../percentile/details';
import { withWfrpState } from '../state';
import { rollSlot, rowText } from '../tables/resolve';
import type { TableEffect, TableSlot } from '../tables/schema';
import { applyWfrpCrit } from './crit-effect';
import type { CritResult } from './crit-table';
import { computeWfrpDamage } from './damage';
import { apAt, participantStats } from './participant';
import { canonWeaponUse } from './weapon-use';
import { attackWearKey, wearWeapon } from './weapon-wear';

import { EffectMarker } from '@/lib/constants/battle';
import { dynamicTextRef, textRef } from '@/lib/i18n/text-ref';
import { isActive } from '@/lib/utils/abilities/engine/core/participants';
import { upsertLabeled } from '@/lib/utils/battle/actions/effects';
import { isHostile } from '@/lib/utils/battle/modes/engine';
import { rollDie } from '@/lib/utils/common/dice';
import type { Rng } from '@/lib/utils/common/rng';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { BattleAttack, BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';
import type { LogLine } from '@/types/text';

const MISFIRE_GROUPS = ['blackpowder', 'engineering', 'explosives'];

const MISFIRE_FROM = 99;

const SL_PENALTY_ROUNDS = 2;

type FumbleEdition = Pick<
    EditionProfile,
    'fumbleModel' | 'woundModel' | 'conditionModel'
> &
    Partial<Pick<EditionProfile, 'gearModel'>>;

/** What a fumble may touch beyond the fumbler: the weapon that slipped and the fighters around */
export interface FumbleScene {
    attack?: BattleAttack;
    participants?: BattleParticipant[];
    map?: BattleMapConfig | null;
}

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

export interface BlastWeapon {
    weapon: number;
    noSb?: boolean;
}

/** Misfire catastrophe: the weapon's full Damage (+0 SL) to the primary arm, reduced by TB and arm AP (p165) */
const blastWounds = (attacker: BattleParticipant, blast: BlastWeapon) => {
    const stats = participantStats(attacker);

    return computeWfrpDamage({
        weapon: blast.weapon,
        sb: blast.noSb ? 0 : (stats?.sb ?? 0),
        netSl: 0,
        tb: stats?.tb ?? 0,
        ap: apAt(stats, 'arm'),
    }).total;
};

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
    ctx: {
        edition: FumbleEdition;
        rng: Rng;
        text: LogLine;
        /** Oops only: the damaged weapon, canon gear */
        wear?: { key: string; qualities?: QualityRef[] };
    }
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

    if (e.kind === 'slPenalty' && ctx.edition.conditionModel === 'sl')
        return withWfrpState(p, { oopsPenalty: 'next' });

    if (e.kind === 'actLast' && ctx.edition.conditionModel === 'sl')
        return withWfrpState(p, { actLastNext: true });

    if (e.kind === 'weaponDamage' && ctx.wear)
        return wearWeapon(p, ctx.wear.key, ctx.wear.qualities);

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

const wearOf = (
    attacker: BattleParticipant,
    edition: FumbleEdition,
    scene: FumbleScene
) =>
    edition.gearModel === 'canon' && scene.attack
        ? {
              key: attackWearKey(scene.attack),
              qualities: canonWeaponUse(attacker, scene.attack).refs.qualities,
          }
        : undefined;

/** Oops 10: a random ally takes the hit, else the fumbler stuns themself; the hit itself is left to the DM */
function allyHit(
    attacker: BattleParticipant,
    details: PercentileAttackDetails,
    scene: FumbleScene,
    rng: Rng
): { line: LogLine; stunSelf: boolean } {
    const allies = (scene.participants ?? []).filter(
        (p) =>
            p.basicInfo.id !== attacker.basicInfo.id &&
            isActive(p) &&
            !isHostile(scene.map, attacker, p)
    );

    const ally = allies[Math.floor(rng() * allies.length)];

    return ally
        ? {
              stunSelf: false,
              line: textRef('battleWfrp.log.fumbleAlly', {
                  name: attacker.basicInfo.name,
                  ally: ally.basicInfo.name,
                  sl: details.roll % 10,
              }),
          }
        : {
              stunSelf: true,
              line: textRef('battleWfrp.log.fumbleAllyNone', {
                  name: attacker.basicInfo.name,
              }),
          };
}

function tableOutcome(
    slot: TableSlot,
    key: 'fumbleOops' | 'fumbleMisfire',
    input: {
        details: PercentileAttackDetails;
        attacker: BattleParticipant;
        rules: Pick<Ruleset, 'tables'>;
        edition: FumbleEdition;
        rng: Rng;
        blast?: BlastWeapon;
        scene: FumbleScene;
    }
): FumbleOutcome {
    const { details, attacker, rules, edition, rng, blast, scene } = input;

    const { row, roll } = rollSlot(rules, slot, rng);

    const text = rowText(row);

    const wear =
        key === 'fumbleOops' ? wearOf(attacker, edition, scene) : undefined;

    const ally =
        edition.gearModel === 'canon' &&
        row.effects.some((e) => e.type === 'fumble' && e.kind === 'hitAlly')
            ? allyHit(attacker, details, scene, rng)
            : undefined;

    const exploded =
        blast &&
        row.effects.some(
            (e) => e.type === 'fumble' && e.kind === 'weaponDamage'
        );

    return {
        update: (p) =>
            ally?.stunSelf
                ? applyEffect(
                      p,
                      { type: 'condition', key: 'stunned', levels: 1 },
                      { edition, rng, text }
                  )
                : row.effects.reduce(
                      (acc, e) =>
                          applyEffect(acc, e, { edition, rng, text, wear }),
                      p
                  ),
        wounds: exploded
            ? blastWounds(attacker, blast)
            : row.effects.reduce(
                  (sum, e) => (e.type === 'wounds' ? sum + e.amount : sum),
                  0
              ),
        lines: [
            textRef(`battleWfrp.log.${key}`, {
                name: attacker.basicInfo.name,
                roll,
                text,
            }),
            ...(ally ? [ally.line] : []),
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
    group?: string;
    edition: FumbleEdition;
    rules: Pick<Ruleset, 'tables'>;
    rng: Rng;
    blast?: BlastWeapon;
    scene?: FumbleScene;
}): FumbleOutcome | undefined {
    const { details, attacker, group, edition, rules, rng, blast } = input;

    const scene = input.scene ?? {};

    const model = fumbleModelOf(edition, rules);

    if (model === 'none' || !details.fumble) return undefined;

    if (group && MISFIRE_GROUPS.includes(group) && details.roll >= MISFIRE_FROM)
        return tableOutcome('misfire', 'fumbleMisfire', {
            details,
            attacker,
            rules,
            edition,
            rng,
            blast,
            scene,
        });

    if (model === 'oops')
        return tableOutcome('oops', 'fumbleOops', {
            details,
            attacker,
            rules,
            edition,
            rng,
            scene,
        });

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
