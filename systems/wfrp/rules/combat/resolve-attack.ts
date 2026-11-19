import { skillTarget, value } from '../characteristics/derive';
import { againstMod, selfTestMod } from '../conditions/test-mod';
import { editionOf, type EditionProfile } from '../edition';
import { weaponSkillTarget } from '../edition/attack-skill';
import { qualityFumbleFrom, qualityToHit } from '../equipment/quality-effects';
import {
    type PercentileTestResult,
    resolvePercentileTest,
} from '../percentile';
import { resolveModeSources } from '../percentile/advantage';
import type { PercentileAttackDetails } from '../percentile/details';
import { DIFFICULTY_SL } from '../percentile/difficulty';
import {
    applyFortune,
    forcedOf,
    FORTUNE_INPUT,
    spentFor,
} from '../percentile/fortune';
import { ACTION_SLOT, ATTACK_SLOT, SCENE_SLOT } from '../slots';
import { withWfrpState } from '../state';
import { sizeHitMod } from '../traits/size';
import { MOMENTUM_SL_BONUS, OUTNUMBERING_BONUS } from './constants';
import { hitLocation } from './location';
import { percentileLines } from './log';
import {
    hasMomentum,
    heldBy,
    loseMomentum,
    settle,
    withMomentum,
} from './momentum';
import { resolveOpposed } from './opposed';
import { participantChars } from './participant';

import { AttackType } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import { collectModifiers } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import {
    isActive,
    withSelf,
} from '@/lib/utils/abilities/engine/core/participants';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import { isAdjacentOnMap } from '@/lib/utils/battle/grid/adjacency';
import type { AttackRollResult } from '@/lib/utils/battle/types/attack';
import type {
    ResolveAttackCtx,
    ResolvedAttack,
} from '@/lib/utils/rules/systems/types';
import type { BattleAttack, BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

const attackCharacteristicOf = (attack: BattleAttack) =>
    (attackKindOf(attack.type) === AttackType.RANGED ? 'bs' : 'ws') as
        | 'bs'
        | 'ws';

const attackBaseTargetOf = (
    attacker: BattleParticipant,
    attack: BattleAttack,
    edition?: Pick<EditionProfile, 'attackTarget'>
): number => {
    const chars = participantChars(attacker);

    const characteristic = value(chars, attackCharacteristicOf(attack));

    if (edition?.attackTarget !== 'skill') return characteristic;

    return (
        weaponSkillTarget(
            chars,
            attackCharacteristicOf(attack) === 'bs' ? 'ranged' : 'melee',
            ATTACK_SLOT.read(attack.system)?.group
        ) ?? characteristic
    );
};

const attackerTargetOf = (
    attacker: BattleParticipant,
    attack: BattleAttack,
    edition?: Pick<EditionProfile, 'attackTarget'>
): number =>
    attackBaseTargetOf(attacker, attack, edition) +
    selfTestMod(attacker, 'attack');

// Best parry target among the defender's melee weapons; bare Weapon Skill without one.
function parryTargetOf(
    defender: BattleParticipant,
    edition: Pick<EditionProfile, 'attackTarget'>
): number {
    const chars = participantChars(defender);

    const ws = value(chars, 'ws');

    if (edition.attackTarget !== 'skill') return ws;

    return (defender.battleData.attacks ?? []).reduce((best, a) => {
        if (attackKindOf(a.type) === AttackType.RANGED) return best;

        return Math.max(
            best,
            weaponSkillTarget(
                chars,
                'melee',
                ATTACK_SLOT.read(a.system)?.group
            ) ?? ws
        );
    }, ws);
}

export const wfrpAttackTarget = (
    attacker: BattleParticipant,
    attack: BattleAttack
) => ({
    label: textRef(
        `gameTerms.characteristics.${attackCharacteristicOf(attack)}.label`
    ),
    target: attackerTargetOf(attacker, attack),
});

// Positions are required: without a map nobody counts as outnumbering.
function isOutnumbering(
    attacker: BattleParticipant,
    target: BattleParticipant,
    participants: BattleParticipant[],
    map: BattleMapConfig | null | undefined
): boolean {
    const near = (
        of: BattleParticipant,
        side: BattleParticipant['basicInfo']['side']
    ) =>
        participants.filter(
            (p) =>
                p.basicInfo.side === side &&
                isActive(p) &&
                (p.basicInfo.id === of.basicInfo.id ||
                    isAdjacentOnMap(map, p, of))
        ).length;

    if (!isAdjacentOnMap(map, attacker, target)) return false;

    return (
        near(target, attacker.basicInfo.side) >=
        2 * near(attacker, target.basicInfo.side)
    );
}

export const wfrpAbortedRoll = (ctx: ResolveAttackCtx): AttackRollResult => ({
    isHit: false,
    isCritical: false,
    isCriticalFail: false,
    totalAttackValue: ctx.manualRoll ?? 0,
    attackBonus: 0,
    advantageUsed: false,
    chosenD20: ctx.manualRoll ?? 0,
});

const sidesOf = (ctx: ResolveAttackCtx) => ({
    attacker: ctx.attacker.basicInfo.side,
    target: ctx.target.basicInfo.side,
});

const heldOf = (ctx: ResolveAttackCtx) => {
    const m = SCENE_SLOT.read(ctx.sceneState) ?? {};

    const sides = sidesOf(ctx);

    return {
        m,
        sides,
        attacker: heldBy(m, sides.attacker),
        defender: heldBy(m, sides.target),
    };
};

type MomentumOutcome = {
    spent: boolean;
    gainedBy: 'attacker' | 'defender' | null;
};

// Personal Momentum: the winner of an opposed melee test gains it, the loser of a melee test loses it (p168).
function personalMomentum(
    ctx: ResolveAttackCtx,
    gainedBy: MomentumOutcome['gainedBy'],
    parried: boolean
): Pick<ResolvedAttack, 'attackerUpdate' | 'targetUpdate'> & {
    gained: boolean;
} {
    const attackerWon = gainedBy === 'attacker';

    return {
        gained: attackerWon && !hasMomentum(ctx.attacker),
        attackerUpdate: (p) =>
            attackerWon ? withMomentum(p, true) : loseMomentum(p),
        ...(parried && {
            targetUpdate: (p: BattleParticipant) =>
                attackerWon ? loseMomentum(p) : withMomentum(p, true),
        }),
    };
}

function toResult(
    ctx: ResolveAttackCtx,
    details: PercentileAttackDetails,
    isHit: boolean,
    momentum: MomentumOutcome,
    personal?: { parried: boolean }
): ResolvedAttack {
    const { m, sides } = heldOf(ctx);

    const side = personal ? undefined : settle(m, sides, momentum);

    const own = personal
        ? personalMomentum(ctx, momentum.gainedBy, personal.parried)
        : undefined;

    const gained = side?.gained ?? own?.gained ?? false;

    return {
        isHit,
        ...(side && { scene: SCENE_SLOT.write(side.next, ctx.sceneState) }),
        ...(own?.attackerUpdate && { attackerUpdate: own.attackerUpdate }),
        ...(own?.targetUpdate && { targetUpdate: own.targetUpdate }),
        defenseValue: details.defender?.target ?? 0,
        lines: [
            ...percentileLines(details, isHit),
            ...(gained ? [textRef('battleLog.percentile.momentum')] : []),
        ],
        attackRoll: {
            isHit,
            isCritical: details.doubles && isHit,
            isCriticalFail: false,
            totalAttackValue: details.roll,
            attackBonus: 0,
            advantageUsed: false,
            chosenD20: details.roll,
            system: ACTION_SLOT.write({ attack: details }),
            margin: details.netSl,
            location: details.location,
        },
    };
}

const detailsOf = (
    t: PercentileTestResult,
    netSl: number,
    extra: Partial<PercentileAttackDetails> = {}
): PercentileAttackDetails => ({
    roll: t.roll,
    target: t.target,
    sl: t.sl,
    netSl,
    location: hitLocation(t.rawRoll),
    doubles: t.doubles,
    ...extra,
});

const refsOf = (attack: BattleAttack) => {
    const slot = ATTACK_SLOT.read(attack.system);

    return { qualities: slot?.qualities ?? [], flaws: slot?.flaws ?? [] };
};

export function resolveWfrpAttack(ctx: ResolveAttackCtx): ResolvedAttack {
    const { attacker, target, attack, participants, rng, manualRoll } = ctx;

    const edition = editionOf(ctx.rules);

    const toHit = qualityToHit(refsOf(attack));

    const fumbleFrom = qualityFumbleFrom(refsOf(attack));

    const fortuneInput = FORTUNE_INPUT.read(ctx.system);

    const forced = forcedOf(fortuneInput);

    const chosenLocation =
        forced?.outcome === 'critical' ? fortuneInput?.location : undefined;

    const locationOf = () =>
        chosenLocation ? { location: chosenLocation } : {};

    const fumbled = (roll: number) =>
        !forced && fumbleFrom !== undefined && roll >= fumbleFrom;

    const talentSl = collectModifiers(
        withSelf(participants, attacker),
        attacker.basicInfo.id,
        { stat: 'attackBonus', attackKind: attackKindOf(attack.type) }
    ).flat;

    const reverse = edition.advantageModel === 'reverse';

    const fortuneEdge = fortuneInput?.kind === 'sl';

    const slBonus = (fortuneEdge && !reverse ? 1 : 0) + talentSl;

    const fortuneAdvantage = fortuneEdge && reverse ? 1 : 0;

    const marked = (
        r: ResolvedAttack,
        fortune?: ReturnType<typeof applyFortune>['fortune']
    ): ResolvedAttack => {
        if (!fortune) return r;

        const shown =
            fortune.kind === 'sl' && reverse
                ? ({ ...fortune, kind: 'advantage' } as const)
                : fortune;

        const fortuneLine = textRef(
            shown.kind === 'reroll'
                ? 'battleWfrp.log.fortuneReroll'
                : shown.kind === 'advantage'
                  ? 'battleWfrp.log.fortuneAdvantage'
                  : shown.kind === 'notFail'
                    ? 'battleWfrp.log.fateNotFail'
                    : 'battleWfrp.log.fortuneSl',
            { name: attacker.basicInfo.name, first: shown.firstRoll ?? 0 }
        );

        const attack = ACTION_SLOT.read(r.attackRoll.system)?.attack;

        return {
            ...r,
            lines: [...r.lines, fortuneLine],
            attackerUpdate: (p) =>
                withWfrpState(
                    r.attackerUpdate?.(p) ?? p,
                    spentFor(p, fortune.kind)
                ),
            attackRoll: {
                ...r.attackRoll,
                ...(attack && {
                    system: ACTION_SLOT.write(
                        { attack: { ...attack, fortune: shown } },
                        r.attackRoll.system
                    ),
                }),
            },
        };
    };

    if (attackKindOf(attack.type) === AttackType.RANGED) {
        const rangedMode = resolveModeSources({ advantage: fortuneAdvantage });

        const rangedOnce = (presetRoll?: number) => {
            const test = resolvePercentileTest({
                target:
                    attackerTargetOf(attacker, attack, edition) +
                    againstMod(target, 'ranged') +
                    toHit +
                    sizeHitMod(attacker, target),
                slModifier:
                    DIFFICULTY_SL.challenging + slBonus + rangedMode.slMod,
                mode: rangedMode.mode,
                doubles: true,
                slModel: edition.slModel,
                rng,
                presetRoll,
                forced,
            });

            const isHit =
                (test.outcome === 'success' || test.outcome === 'critical') &&
                !fumbled(test.roll);

            return {
                roll: test.roll,
                result: toResult(
                    ctx,
                    detailsOf(test, test.sl, locationOf()),
                    isHit,
                    {
                        spent: false,
                        gainedBy: null,
                    }
                ),
            };
        };

        const { result, fortune } = applyFortune<ReturnType<typeof rangedOnce>>(
            (preset) => rangedOnce(preset),
            fortuneInput,
            (r) => r.result.isHit,
            manualRoll
        );

        return marked(result.result, fortune);
    }

    const d = participantChars(target);

    const dodge = skillTarget(d, 'dodge')?.target ?? value(d, 'ag');

    const held = heldOf(ctx);

    const personal = edition.momentumModel === 'participant';

    const spent = personal ? hasMomentum(attacker) : held.attacker;

    const meleeOnce = (presetRolls: {
        attacker?: number;
        defender?: number;
    }) => {
        const result = resolveOpposed({
            attackerTarget:
                attackerTargetOf(attacker, attack, edition) +
                toHit +
                againstMod(target, 'melee') +
                sizeHitMod(attacker, target) +
                (isOutnumbering(attacker, target, participants, ctx.map)
                    ? OUTNUMBERING_BONUS
                    : 0),
            defenderTargets: [
                {
                    kind: 'parry',
                    target:
                        parryTargetOf(target, edition) +
                        selfTestMod(target, 'test'),
                },
                { kind: 'dodge', target: dodge + selfTestMod(target, 'test') },
            ],
            attackerSlMod:
                (spent && !personal ? MOMENTUM_SL_BONUS : 0) + slBonus,
            defenderSlMod: held.defender && !personal ? MOMENTUM_SL_BONUS : 0,
            ...(personal && {
                attackerModes: {
                    advantage: (spent ? 1 : 0) + fortuneAdvantage,
                },
                defenderModes: {
                    parry: { advantage: hasMomentum(target) ? 1 : 0 },
                },
            }),
            edition,
            attackerForced: forced,
            rng,
            presetRolls,
        });

        const details = detailsOf(result.attacker, result.netSl, {
            ...locationOf(),
            defender: {
                kind: result.defender.kind,
                roll: result.defender.roll,
                sl: result.defender.sl,
                target: result.defender.target,
            },
            opposed: true,
            ...(spent && { momentumUsed: true }),
        });

        return {
            roll: result.attacker.roll,
            defenderRaw: result.defender.rawRoll,
            resolved: toResult(
                ctx,
                details,
                result.isHit && !fumbled(result.attacker.roll),
                {
                    spent,
                    gainedBy: result.attackerWon ? 'attacker' : 'defender',
                },
                personal
                    ? { parried: result.defender.kind === 'parry' }
                    : undefined
            ),
        };
    };

    const { result, fortune } = applyFortune<ReturnType<typeof meleeOnce>>(
        (preset, first) =>
            meleeOnce(
                first
                    ? { attacker: preset, defender: first.defenderRaw }
                    : { attacker: preset }
            ),
        fortuneInput,
        (r) => r.resolved.isHit,
        manualRoll
    );

    return marked(result.resolved, fortune);
}
