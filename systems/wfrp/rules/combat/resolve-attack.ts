import { skillTarget, value } from '../characteristics/derive';
import { applyWfrpConditionTo } from '../conditions/apply';
import {
    againstMod,
    againstSl,
    cannotDefend,
    selfModes,
    selfSlMod,
    selfTestMod,
} from '../conditions/test-mod';
import { EDITION_PROFILES, editionOf, type EditionProfile } from '../edition';
import { weaponSkillLabel, weaponSkillTarget } from '../edition/attack-skill';
import {
    qualityAttackSl,
    qualityBlackpowder,
    qualityDangerousFumble,
    qualityFumbleFrom,
    qualityImpaleCrit,
    qualityParry,
    qualityToHit,
} from '../equipment/quality-effects';
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
    spentFate,
    spentFor,
} from '../percentile/fortune';
import { ACTION_SLOT, ATTACK_SLOT, SCENE_SLOT } from '../slots';
import { wfrpState, withWfrpState } from '../state';
import { isAfraid, isAfraidOf } from '../traits/fear';
import {
    hatesTarget,
    HATRED_SL_BONUS,
    isPsychImmune,
} from '../traits/passions';
import { coolTarget, isSuccess } from '../traits/psych-test';
import { sizeHitMod } from '../traits/size';
import { collectAttackMods } from './attack-mods';
import {
    MOMENTUM_SL_BONUS,
    OFFHAND_SL_PENALTY,
    OUTNUMBERING_BONUS,
} from './constants';
import { applyWfrpCrit } from './crit-effect';
import { type CritResult, rollCrit } from './crit-table';
import { canonDefence } from './defence';
import { engagedFoes, isOutnumbering, isSurrounded } from './engagement';
import { fateLeftOf, fateSpendsOn } from './fate';
import { fumbleModelOf, fumbleOutcome } from './fumble';
import { asLocation, hitLocation, sideOf } from './location';
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
import { canonWeaponUse, type WeaponUse } from './weapon-use';

import { AttackType } from '@/lib/constants/battle';
import { dynamicTextRef, textRef } from '@/lib/i18n/text-ref';
import { collectModifiers } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import {
    replaceParticipant,
    withSelf,
} from '@/lib/utils/abilities/engine/core/participants';
import { dropBreakOnDamage } from '@/lib/utils/abilities/engine/effects/hp';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import { applyDamageConsequences } from '@/lib/utils/battle/damage/consequences';
import type { AttackRollResult } from '@/lib/utils/battle/types/attack';
import { rollDie } from '@/lib/utils/common/dice';
import type { Ruleset } from '@/lib/utils/rules';
import type {
    ResolveAttackCtx,
    ResolvedAttack,
} from '@/lib/utils/rules/systems/types';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const attackCharacteristicOf = (attack: BattleAttack) =>
    (attackKindOf(attack.type) === AttackType.RANGED ? 'bs' : 'ws') as
        | 'bs'
        | 'ws';

const attackBaseTargetOf = (
    attacker: BattleParticipant,
    attack: BattleAttack,
    edition?: Pick<EditionProfile, 'attackTarget'>,
    groupTarget?: number
): number => {
    if (groupTarget !== undefined) return groupTarget;

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
    edition?: Pick<EditionProfile, 'attackTarget' | 'conditionModel'>,
    groupTarget?: number
): number =>
    attackBaseTargetOf(attacker, attack, edition, groupTarget) +
    selfTestMod(attacker, 'attack', edition ?? EDITION_PROFILES.legacy);

const groupLabelOf = (group: string | undefined) =>
    group ? dynamicTextRef(`wfrpEquipmentEditor.groups.${group}`) : '';

// Best parry target among the defender's melee weapons; bare Weapon Skill without one.
export function parryTargetOf(
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
    attack: BattleAttack,
    rules: Ruleset
) => {
    const edition = editionOf(rules);

    const characteristic = attackCharacteristicOf(attack);

    const group = ATTACK_SLOT.read(attack.system)?.group;

    const skill =
        edition.attackTarget === 'skill' &&
        weaponSkillTarget(
            participantChars(attacker),
            characteristic === 'bs' ? 'ranged' : 'melee',
            group
        ) !== undefined
            ? weaponSkillLabel(
                  characteristic === 'bs' ? 'ranged' : 'melee',
                  group
              )
            : undefined;

    return {
        label:
            skill ??
            textRef(`gameTerms.characteristics.${characteristic}.label`),
        target: attackerTargetOf(attacker, attack, edition),
    };
};

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
        gained:
            attackerWon &&
            !hasMomentum(ctx.attacker) &&
            !isAfraid(ctx.attacker),
        attackerUpdate: (p) =>
            attackerWon ? withMomentum(p, true) : loseMomentum(p),
        ...(parried && {
            targetUpdate: (p: BattleParticipant) =>
                attackerWon ? loseMomentum(p) : withMomentum(p, true),
        }),
    };
}

function withCounterCrit(
    r: ResolvedAttack,
    crit: CritResult,
    edition: Pick<EditionProfile, 'woundModel' | 'conditionModel'>,
    name: string
): ResolvedAttack {
    return {
        ...r,
        attackerUpdate: (p) =>
            applyWfrpCrit(r.attackerUpdate?.(p) ?? p, crit, 0, edition)
                .participant,
        lines: [
            ...r.lines,
            textRef('battleWfrp.log.counterCrit', { name, text: crit.text }),
        ],
    };
}

function toResult(
    ctx: ResolveAttackCtx,
    details: PercentileAttackDetails,
    isHit: boolean,
    momentum: MomentumOutcome,
    personal?: { parried: boolean },
    impaled = false
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
            isCritical: (details.doubles || impaled) && isHit,
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

// How Did That Miss (p133): the defender's Fate cancels a hit with every consequence, incl. Momentum and the counter-crit.
function negateByFate(
    ctx: ResolveAttackCtx,
    r: ResolvedAttack,
    edition: Pick<EditionProfile, 'fortunePools'>
): ResolvedAttack {
    const { target, attacker } = ctx;

    if (
        edition.fortunePools !== 'split' ||
        !r.isHit ||
        fateLeftOf(target) < 1 ||
        !ctx.crit?.negate?.({
            holder: target,
            actorId: attacker.basicInfo.id,
            cost: 'battleWfrp.ui.fateReaction.spend',
        })
    )
        return r;

    const attack = ACTION_SLOT.read(r.attackRoll.system)?.attack;

    const { attackerUpdate: _a, scene: _s, ...rest } = r;

    return {
        ...rest,
        isHit: false,
        lines: [
            ...r.lines,
            textRef('battleWfrp.log.fateHowDidThatMiss', {
                name: target.basicInfo.name,
                attacker: attacker.basicInfo.name,
            }),
        ],
        targetUpdate: (p) => withWfrpState(p, spentFate(p)),
        attackRoll: {
            ...r.attackRoll,
            isHit: false,
            isCritical: false,
            ...(attack && {
                system: ACTION_SLOT.write(
                    { attack: { ...attack, negated: true } },
                    r.attackRoll.system
                ),
            }),
        },
    };
}

const detailsOf = (
    t: PercentileTestResult,
    netSl: number,
    extra: Partial<PercentileAttackDetails> = {},
    split = false,
    fumbles = true
): PercentileAttackDetails => ({
    roll: t.roll,
    target: t.target,
    sl: t.sl,
    netSl,
    location: hitLocation(t.rawRoll, split),
    doubles: t.doubles,
    ...(fumbles && t.outcome === 'fumble' && { fumble: true as const }),
    ...extra,
});

const counterCritOf = (
    spot: string,
    rules: ResolveAttackCtx['rules'],
    rng: Parameters<typeof rollCrit>[2]
) => rollCrit(asLocation(spot), rules, rng, undefined, 0, sideOf(spot));

const refsOf = (attack: BattleAttack, use?: WeaponUse) => {
    if (use) return use.refs;

    const slot = ATTACK_SLOT.read(attack.system);

    return { qualities: slot?.qualities ?? [], flaws: slot?.flaws ?? [] };
};

function woundAttacker(
    ctx: ResolveAttackCtx,
    before: BattleParticipant,
    wounds: number
) {
    const after = dropBreakOnDamage(
        {
            ...before,
            combatStats: {
                ...before.combatStats,
                currentHp: Math.max(0, before.combatStats.currentHp - wounds),
            },
        },
        wounds
    );

    return applyDamageConsequences({
        before,
        after,
        amount: wounds,
        rules: ctx.rules,
        rng: ctx.rng,
        participants: replaceParticipant(ctx.participants, after),
    });
}

function withFumble(ctx: ResolveAttackCtx, r: ResolvedAttack): ResolvedAttack {
    const details = ACTION_SLOT.read(r.attackRoll.system)?.attack;

    const slot = ATTACK_SLOT.read(ctx.attack.system);

    const edition = editionOf(ctx.rules);

    const fumble =
        details &&
        fumbleOutcome({
            details,
            attacker: ctx.attacker,
            group: slot?.group,
            edition,
            ...(edition.gearModel === 'canon' && {
                blast: {
                    weapon: ctx.attack.damageBonus ?? 0,
                    noSb: slot?.noSb,
                },
            }),
            rules: ctx.rules,
            rng: ctx.rng,
        });

    if (!fumble) return r;

    const applied = (p: BattleParticipant) =>
        fumble.update(r.attackerUpdate?.(p) ?? p);

    const draws: number[] = [];

    const recording = () => {
        const v = ctx.rng();

        draws.push(v);

        return v;
    };

    const woundLines =
        fumble.wounds > 0
            ? [
                  textRef('battleWfrp.log.fumbleWounds', {
                      name: ctx.attacker.basicInfo.name,
                      wounds: fumble.wounds,
                  }),
                  ...woundAttacker(
                      { ...ctx, rng: recording },
                      applied(ctx.attacker),
                      fumble.wounds
                  ).messages,
              ]
            : [];

    return {
        ...r,
        lines: [...r.lines, ...fumble.lines, ...woundLines],
        attackerUpdate: (p) => {
            if (fumble.wounds <= 0) return applied(p);

            let i = 0;

            // Replays the dry run's draws so the log and the applied state agree
            const replay = () => draws[i++] ?? ctx.rng();

            return woundAttacker(
                { ...ctx, rng: replay },
                applied(p),
                fumble.wounds
            ).participant;
        },
    };
}

const surroundedNote = (ctx: ResolveAttackCtx) =>
    editionOf(ctx.rules).momentumModel === 'participant' &&
    attackKindOf(ctx.attack.type) === AttackType.MELEE &&
    isSurrounded(engagedFoes(ctx.target, ctx.participants, ctx.map))
        ? [
              textRef('battleWfrp.log.targetSurrounded', {
                  name: ctx.target.basicInfo.name,
              }),
          ]
        : [];

function withBlackpowder(
    ctx: ResolveAttackCtx,
    edition: EditionProfile,
    refs: ReturnType<typeof refsOf>,
    r: ResolvedAttack
): ResolvedAttack {
    const { target, attacker } = ctx;

    if (
        !qualityBlackpowder(refs, edition.gearModel) ||
        isPsychImmune(ctx.participants, target.basicInfo.id)
    )
        return r;

    const t = resolvePercentileTest({
        target: coolTarget(target) + selfTestMod(target, 'test', edition),
        slModifier: DIFFICULTY_SL.average + selfSlMod(target, edition),
        slModel: edition.slModel,
        rng: ctx.rng,
    });

    const shockLine = textRef(
        isSuccess(t.outcome)
            ? 'battleWfrp.log.blackpowderPass'
            : 'battleWfrp.log.blackpowderFail',
        { name: target.basicInfo.name, roll: t.roll, sl: t.sl }
    );

    if (isSuccess(t.outcome)) return { ...r, lines: [...r.lines, shockLine] };

    const shock = (p: BattleParticipant) =>
        applyWfrpConditionTo(p, {
            key: 'broken',
            round: 0,
            edition,
            sourceName: attacker.basicInfo.name,
        });

    return {
        ...r,
        lines: [...r.lines, shockLine, ...shock(target).messages],
        targetUpdate: (p) => shock(r.targetUpdate?.(p) ?? p).participant,
    };
}

export function resolveWfrpAttack(ctx: ResolveAttackCtx): ResolvedAttack {
    const core = resolveAttackCore(ctx);

    const resolved = withFumble(ctx, {
        ...core,
        lines: [...core.lines, ...surroundedNote(ctx)],
    });

    const hand = ATTACK_SLOT.read(ctx.attack.system)?.hand;

    if (!hand || editionOf(ctx.rules).momentumModel !== 'participant')
        return resolved;

    return {
        ...resolved,
        attackerUpdate: (p) =>
            withWfrpState(resolved.attackerUpdate?.(p) ?? p, {
                lastHand: hand,
            }),
    };
}

function resolveAttackCore(ctx: ResolveAttackCtx): ResolvedAttack {
    const { attacker, target, attack, participants, rng, manualRoll } = ctx;

    const edition = editionOf(ctx.rules);

    const gear = edition.gearModel;

    const use = gear === 'canon' ? canonWeaponUse(attacker, attack) : undefined;

    const refs = refsOf(attack, use);

    const toHit = qualityToHit(refs, gear);

    const fumbleFrom = qualityFumbleFrom(refs, gear);

    const attackSl = qualityAttackSl(refs, gear);

    const dangerous = (roll: number, passed: boolean) =>
        fumbles && !passed && qualityDangerousFumble(refs, roll, gear);

    const fumbles = fumbleModelOf(edition, ctx.rules) !== 'none';

    const fortuneInput = FORTUNE_INPUT.read(ctx.system);

    const forced = forcedOf(fortuneInput);

    const split = edition.hitLocationModel === 'side';

    const pickedLocation =
        forced?.outcome === 'critical' ? fortuneInput?.location : undefined;

    const chosenLocation =
        pickedLocation && !split ? asLocation(pickedLocation) : pickedLocation;

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

    const offHandPenalty =
        edition.momentumModel === 'participant' &&
        ATTACK_SLOT.read(attack.system)?.hand === 'off'
            ? OFFHAND_SL_PENALTY
            : 0;

    const hatred =
        edition.psychologyModel === 'extended' && hatesTarget(attacker, target)
            ? HATRED_SL_BONUS
            : 0;

    const slBonus =
        (fortuneEdge && !reverse ? 1 : 0) +
        talentSl +
        hatred -
        offHandPenalty +
        attackSl.penalty;

    const fortuneAdvantage = fortuneEdge && reverse ? 1 : 0;

    const canonMods = edition.combatModsModel === 'canon';

    const attackMods = canonMods
        ? collectAttackMods({
              ctx,
              edition,
              kind:
                  attackKindOf(attack.type) === AttackType.RANGED
                      ? 'ranged'
                      : 'melee',
              input: fortuneInput?.mods,
          })
        : undefined;

    const modsDetail = attackMods?.mods.length
        ? {
              mods: attackMods.mods.map(({ key, sl }) => ({ key, sl })),
          }
        : {};

    const sizeHit =
        edition.sizeModel === 'legacy' ? sizeHitMod(attacker, target) : 0;

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
            shown.kind === 'reroll' && fortune.spent > 1
                ? 'battleWfrp.log.fortuneRerolls'
                : shown.kind === 'reroll'
                  ? 'battleWfrp.log.fortuneReroll'
                  : shown.kind === 'advantage'
                    ? 'battleWfrp.log.fortuneAdvantage'
                    : shown.kind === 'notFail'
                      ? 'battleWfrp.log.fateNotFail'
                      : 'battleWfrp.log.fortuneSl',
            {
                name: attacker.basicInfo.name,
                first: shown.firstRoll ?? 0,
                rolls: fortune.spent,
            }
        );

        const attack = ACTION_SLOT.read(r.attackRoll.system)?.attack;

        return {
            ...r,
            lines: [...r.lines, fortuneLine],
            attackerUpdate: (p) =>
                withWfrpState(
                    r.attackerUpdate?.(p) ?? p,
                    spentFor(p, fortune.kind, fortune.spent)
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
        if (use?.forbidden)
            return {
                isHit: false,
                defenseValue: 0,
                lines: [
                    textRef('battleWfrp.log.groupForbidden', {
                        name: attacker.basicInfo.name,
                        group: groupLabelOf(
                            ATTACK_SLOT.read(attack.system)?.group
                        ),
                    }),
                ],
                attackRoll: wfrpAbortedRoll(ctx),
            };

        const blind = selfModes(attacker, 'attack', edition);

        const rangedMode = resolveModeSources({
            advantage: fortuneAdvantage + (attackMods?.advantage ?? 0),
            disadvantage:
                (blind.disadvantage ?? 0) + (attackMods?.disadvantage ?? 0),
        });

        const rangedOnce = (presetRoll?: number) => {
            const test = resolvePercentileTest({
                target:
                    attackerTargetOf(attacker, attack, edition, use?.target) +
                    againstMod(target, 'ranged', edition) +
                    toHit +
                    sizeHit,
                slModifier:
                    Math.min(DIFFICULTY_SL.challenging, use?.slCap ?? 0) +
                    slBonus +
                    (attackMods?.sl ?? 0) +
                    selfSlMod(attacker, edition) +
                    rangedMode.slMod,
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

            const passed = isSuccess(test.outcome);

            return {
                roll: test.roll,
                result: toResult(
                    ctx,
                    detailsOf(
                        test,
                        test.sl + (isHit ? attackSl.onSuccess : 0),
                        {
                            ...locationOf(),
                            ...modsDetail,
                            ...(dangerous(test.roll, passed) && {
                                fumble: true as const,
                            }),
                        },
                        split,
                        fumbles
                    ),
                    isHit,
                    {
                        spent: false,
                        gainedBy: null,
                    },
                    undefined,
                    isHit &&
                        isSuccess(test.outcome) &&
                        qualityImpaleCrit(refs, test.roll, gear)
                ),
            };
        };

        const { result, fortune } = applyFortune<ReturnType<typeof rangedOnce>>(
            (preset) => rangedOnce(preset),
            fortuneInput,
            (r) => r.result.isHit,
            manualRoll,
            { repeat: fateSpendsOn(ctx.rules) }
        );

        return withBlackpowder(
            ctx,
            edition,
            refs,
            marked(negateByFate(ctx, result.result, edition), fortune)
        );
    }

    const d = participantChars(target);

    const dodge = skillTarget(d, 'dodge')?.target ?? value(d, 'ag');

    const held = heldOf(ctx);

    const personal = edition.momentumModel === 'participant';

    const meleeAgainst = againstSl(target, 'melee', edition);

    const spent = personal ? hasMomentum(attacker) : held.attacker;

    const canon = gear === 'canon';

    const defence = canon
        ? canonDefence(target, attack, edition, attacker)
        : undefined;

    const unopposed =
        canon &&
        qualityParry(refs, gear) &&
        wfrpState(attacker).momentumAttack === true &&
        wfrpState(attacker).meleeHit === true;

    const meleeOnce = (presetRolls: {
        attacker?: number;
        defender?: number;
    }) => {
        const result = resolveOpposed({
            attackerTarget:
                attackerTargetOf(attacker, attack, edition, use?.target) +
                toHit +
                againstMod(target, 'melee', edition) +
                sizeHit +
                (!canonMods &&
                isOutnumbering(attacker, target, participants, ctx.map)
                    ? OUTNUMBERING_BONUS
                    : 0),
            defenderTargets: [
                {
                    kind: 'parry',
                    target:
                        (defence?.parryTarget ??
                            parryTargetOf(target, edition)) +
                        selfTestMod(target, 'test', edition),
                },
                {
                    kind: 'dodge',
                    target: dodge + selfTestMod(target, 'test', edition),
                },
            ],
            attackerSlOnSuccess: attackSl.onSuccess,
            attackerSlMod:
                (spent && !personal ? MOMENTUM_SL_BONUS : 0) +
                slBonus +
                (attackMods?.sl ?? 0) +
                selfSlMod(attacker, edition) +
                meleeAgainst.sl,
            defenderSlMod:
                (held.defender && !personal ? MOMENTUM_SL_BONUS : 0) +
                selfSlMod(target, edition),
            ...(defence && { defenderSlByKind: defence.sl }),
            ...(unopposed && { unopposed }),
            ...(personal && {
                attackerModes: {
                    advantage:
                        (spent ? 1 : 0) +
                        fortuneAdvantage +
                        meleeAgainst.advantage +
                        (attackMods?.advantage ?? 0) +
                        (isAfraidOf(target, attacker.basicInfo.id) ? 1 : 0),
                    disadvantage:
                        (selfModes(attacker, 'attack', edition).disadvantage ??
                            0) + (attackMods?.disadvantage ?? 0),
                },
                defenderModes: {
                    parry: { advantage: hasMomentum(target) ? 1 : 0 },
                },
            }),
            edition,
            attackerForced: forced,
            defenderDoubles: edition.woundModel === 'critical',
            defenderHelpless: cannotDefend(target, edition),
            rng,
            presetRolls,
        });

        const hit = result.isHit && !fumbled(result.attacker.roll);

        const details = detailsOf(
            result.attacker,
            result.netSl,
            {
                ...locationOf(),
                ...modsDetail,
                ...(dangerous(
                    result.attacker.roll,
                    isSuccess(result.attacker.outcome)
                ) && { fumble: true as const }),
                ...(!unopposed && {
                    defender: {
                        kind: result.defender.kind,
                        roll: result.defender.roll,
                        sl: result.defender.sl,
                        target: result.defender.target,
                    },
                    opposed: true,
                }),
                ...(spent &&
                    (personal
                        ? { momentumAdvantage: true as const }
                        : { momentumUsed: true })),
            },
            split,
            fumbles
        );

        const counterCrit =
            edition.woundModel === 'critical' &&
            result.defender.outcome === 'critical'
                ? counterCritOf(
                      hitLocation(rollDie(100, rng), split),
                      ctx.rules,
                      rng
                  )
                : undefined;

        const resolved = toResult(
            ctx,
            details,
            hit,
            {
                spent,
                gainedBy: result.attackerWon
                    ? 'attacker'
                    : unopposed
                      ? null
                      : 'defender',
            },
            personal
                ? { parried: !unopposed && result.defender.kind === 'parry' }
                : undefined,
            hit &&
                isSuccess(result.attacker.outcome) &&
                qualityImpaleCrit(refs, result.attacker.roll, gear)
        );

        const tracked: ResolvedAttack =
            canon && hit
                ? {
                      ...resolved,
                      attackerUpdate: (p) =>
                          withWfrpState(resolved.attackerUpdate?.(p) ?? p, {
                              meleeHit: true,
                          }),
                  }
                : resolved;

        return {
            roll: result.attacker.roll,
            defenderRaw: unopposed ? undefined : result.defender.rawRoll,
            resolved: counterCrit
                ? withCounterCrit(
                      tracked,
                      counterCrit,
                      edition,
                      attacker.basicInfo.name
                  )
                : tracked,
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
        manualRoll,
        { repeat: fateSpendsOn(ctx.rules) }
    );

    return withBlackpowder(
        ctx,
        edition,
        refs,
        marked(negateByFate(ctx, result.resolved, edition), fortune)
    );
}
