import { EffectMarker } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import {
    findParticipant,
    mergeParticipants,
    withSelf,
} from '@/lib/utils/abilities/engine/core/participants';
import { resolveTargetIds } from '@/lib/utils/abilities/engine/core/targets';
import { actionReason } from '@/lib/utils/battle/actions/reasons';
import {
    type ActionFlow,
    fire,
    getP,
} from '@/lib/utils/battle/common/action-flow';
import { uniqueCastId } from '@/lib/utils/battle/concentration';
import { removeEffects } from '@/lib/utils/battle/conditions/query';
import { runAutoReactions } from '@/lib/utils/battle/spell/auto-reaction';
import { applyAnchoredZones } from '@/lib/utils/battle/spell/cast/anchored-zone';
import { applyBursts } from '@/lib/utils/battle/spell/cast/burst';
import {
    applyCastAttribute,
    rollCastTest,
    settleCastTest,
} from '@/lib/utils/battle/spell/cast/cast-test';
import { applyTo } from '@/lib/utils/battle/spell/cast/effects';
import {
    finishSpellAction,
    spendCastCost,
} from '@/lib/utils/battle/spell/cast/finish';
import { applyGrantCasts } from '@/lib/utils/battle/spell/cast/grant-cast';
import { applyGrantSpells } from '@/lib/utils/battle/spell/cast/grant-spell';
import { applyHitRiders } from '@/lib/utils/battle/spell/cast/hit-rider';
import { interruptedTargets } from '@/lib/utils/battle/spell/cast/interrupt';
import {
    moveAdjacent,
    teleportTo,
} from '@/lib/utils/battle/spell/cast/move-self';
import { moveSummon } from '@/lib/utils/battle/spell/cast/move-summon';
import { resolveOutcome } from '@/lib/utils/battle/spell/cast/outcome';
import { phantomRequests } from '@/lib/utils/battle/spell/cast/phantom';
import {
    projectileShots,
    runProjectiles,
} from '@/lib/utils/battle/spell/cast/projectiles';
import {
    abilityOf,
    actionOf,
    type ChosenSpell,
    expandChosen,
    hasMoveSelf,
    hasTeleportSelf,
    isPerTarget,
    moveSummonOf,
    readsEventDamage,
    type SpellCastState,
    spellDiceOf,
    targetOf,
} from '@/lib/utils/battle/spell/cast/state';
import { inlineSummonRequests } from '@/lib/utils/battle/spell/cast/summon-inline';
import { transformRequests } from '@/lib/utils/battle/spell/cast/transform';
import { computeSpellPower } from '@/lib/utils/battle/spell/power';
import { spellSaveDc } from '@/lib/utils/battle/spell/save-dc';
import type {
    CastSpellParams,
    CastSpellResult,
} from '@/lib/utils/battle/types/spell-process';
import { rollGroups } from '@/lib/utils/common/dice';
import { rngOf } from '@/lib/utils/common/rng';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { AbilityEvent } from '@/types/abilities';

const DEFAULT_CONCENTRATION_ROUNDS = 10;

export const effectRounds = (e: object): number =>
    'duration' in e
        ? ((e.duration as { rounds?: number } | undefined)?.rounds ?? 0)
        : 'rounds' in e
          ? (e.rounds as number)
          : 0;

export function castSpell(params: CastSpellParams): CastSpellResult {
    const {
        caster,
        spell: source,
        targetIds: requestedIds,
        allParticipants,
        currentRound,
        battleId,
        diceRolls,
        saveRolls = [],
        attackRolls = [],
        isDMCast = false,
    } = params;

    const targetIds = [...new Set(requestedIds)];

    const spell: ChosenSpell = {
        ...source,
        definition: {
            ...source.definition,
            effects: expandChosen(
                source.definition.effects,
                params.optionIndex
            ),
        },
    };

    const def = spell.definition;

    if (def.executionMode === 'manual') {
        const message = actionReason('manualSpell');

        return {
            success: false,
            casterUpdated: caster,
            allParticipantsUpdated: allParticipants,
            battleAction: actionOf(
                caster,
                spell,
                [],
                battleId,
                currentRound,
                message
            ),
            summons: [],
            messages: [message],
        };
    }

    const rng = rngOf(params);

    const casterId = caster.basicInfo.id;

    const unhidden = removeEffects(caster, (e) =>
        e.effects.some((x) => x.type === EffectMarker.HIDDEN)
    );

    const flow: ActionFlow = {
        ps: withSelf(allParticipants, unhidden.participant),
        messages: [],
        summons: [],
        ctx: {
            round: currentRound,
            rng,
            map: params.map,
            rules: params.rules,
            crit: params.crit,
        },
    };

    const before = flow.ps;

    const chosenLevel = params.castLevel ?? spell.level;

    const baseInfo = {
        spellId: spell.id,
        school: spell.groupId,
        level: spell.level,
        ...(params.castLevel !== undefined && { castLevel: chosenLevel }),
    };

    const targetsBefore = targetIds.flatMap(
        (id) => findParticipant(before, id) ?? []
    );

    const { actionModifiers } = fire(flow, {
        type: 'spellCast',
        phase: 'before',
        actorId: casterId,
        targetIds,
        ...baseInfo,
    });

    const readyCaster = getP(flow, casterId);

    const magic = ruleSystemOf(params.rules).magic.tested;

    const percentile =
        magic && !isDMCast && !params.isLegendaryCast && !params.grant
            ? magic
            : undefined;

    const spellMagic = def.casting?.magic;

    if (percentile && (!spellMagic || def.resolution.kind !== 'auto')) {
        return {
            success: false,
            reason: 'systemMismatch',
            casterUpdated: readyCaster,
            allParticipantsUpdated: mergeParticipants(allParticipants, flow.ps),
            battleAction: actionOf(
                readyCaster,
                spell,
                targetsBefore,
                battleId,
                currentRound,
                ''
            ),
            summons: [],
            messages: [],
        };
    }

    const castCells = params.aim
        ? [params.aim]
        : params.targetIds.flatMap((id) => {
              const at = params.allParticipants.find(
                  (p) => p.basicInfo.id === id
              )?.battleData.position;

              return at ? [at] : [];
          });

    const rolled =
        percentile && spellMagic && !params.dryRun
            ? rollCastTest(
                  percentile,
                  {
                      caster: readyCaster,
                      spell: source,
                      magic: spellMagic,
                      rules: params.rules,
                      rng,
                      at: castCells[0],
                      targets: castCells,
                  },
                  params.castTest
              )
            : undefined;

    const test =
        rolled && percentile && params.ingredientUsed
            ? percentile.avertMiscast(rolled, {
                  name: readyCaster.basicInfo.name,
                  spell: spell.name,
              })
            : rolled;

    const overcastDice = test?.overcastDamage === undefined;

    const overcastSteps =
        test && overcastDice && spellMagic?.overcast === 'dice'
            ? test.overcastSteps
            : 0;

    const overcastDamage =
        test && spellMagic?.overcast === 'dice'
            ? (test.overcastDamage ?? 0)
            : 0;

    const castLevel =
        overcastSteps > 0 ? spell.level + overcastSteps : chosenLevel;

    const sides = params.dice?.sides ?? 0;

    const extraCount =
        overcastSteps > 0 && !def.fixedDice && sides > 0
            ? (def.upcastDice ?? 0) * overcastSteps
            : 0;

    const extraRolls =
        extraCount > 0
            ? rollGroups([{ count: extraCount, size: sides }], rng)
            : [];

    const allRolls = [...diceRolls, ...extraRolls];

    const info =
        castLevel !== chosenLevel ? { ...baseInfo, castLevel } : baseInfo;

    const resource =
        !isDMCast && !params.isLegendaryCast && !params.grant
            ? ruleSystemOf(params.rules).magic.resource
            : undefined;

    const cost = {
        resource,
        slotKey: params.slotKey,
        isDMCast,
        isLegendaryCast: params.isLegendaryCast,
        grant: params.grant,
    };

    if (
        resource &&
        !resource.canCast(readyCaster, {
            level: spell.level,
            slotKey: params.slotKey,
        }).ok
    ) {
        return {
            success: false,
            casterUpdated: readyCaster,
            allParticipantsUpdated: mergeParticipants(allParticipants, flow.ps),
            battleAction: actionOf(
                readyCaster,
                spell,
                targetsBefore,
                battleId,
                currentRound,
                textRef('battleActions.spell.noSlots', {
                    name: readyCaster.basicInfo.name,
                    spell: spell.name,
                })
            ),
            summons: [],
            messages: [],
        };
    }

    const state: SpellCastState = {
        flow,
        spell,
        caster: unhidden.participant,
        targetIds,
        touchedIds: new Set(targetIds),
        info,
        castLevel,
        chosenCastLevel:
            castLevel !== chosenLevel ? castLevel : params.castLevel,
        ability: abilityOf(spell),
        grant: params.grant,
        power: computeSpellPower({
            caster: readyCaster,
            rules: params.rules,
            groupId: spell.groupId,
            rolls: allRolls,
            participants: flow.ps,
            extra: actionModifiers[casterId],
            addAbilityMod: def.addAbilityMod,
            damageBonus: (def.damageBonus ?? 0) + overcastDamage || undefined,
            spell: source,
            overcastDamage,
        }),
        saveDc:
            params.grant?.dc ??
            spellSaveDc(params.rules, readyCaster, params.grant?.dcAbility),
        attackBonus: params.grant?.attackBonus,
        overcastDamage,
        castDetails: test?.details,
        battleId,
        actionModifiers,
        rng,
        saveRolls,
        attackRolls,
        diceRolls: allRolls,
        diceCount: (params.dice?.count ?? 0) + extraRolls.length,
        diceSides: params.dice?.sides ?? 0,
        attacks: [],
        saves: [],
        damageSteps: {},
        outcomes: new Map(),
        summons: [],
        transforms: [],
        dealt: 0,
    };

    if (test) flow.messages.push(...test.lines);

    const settle =
        percentile && spellMagic && test
            ? { magic: percentile, spellMagic, cast: test }
            : undefined;

    if (settle && !settle.cast.success) {
        spendCastCost(state, cost);
        settleCastTest(state, settle);

        return finishSpellAction(state, {
            before,
            targetsBefore,
            allParticipants,
            battleId,
            round: currentRound,
            sourceEffects: source.definition.effects,
            details: settle.cast.details,
            fizzled: true,
        });
    }

    if (settle && params.cancelledBy !== undefined) {
        spendCastCost(state, cost);
        settleCastTest(state, settle);

        return finishSpellAction(state, {
            before,
            targetsBefore,
            allParticipants,
            battleId,
            round: currentRound,
            sourceEffects: source.definition.effects,
            details: settle.cast.details,
            fizzled: true,
            cancelledBy: params.cancelledBy,
        });
    }

    const { sustain } = ruleSystemOf(params.rules).magic;

    const concentrates = sustain.holds(params.rules, def);

    const castId = uniqueCastId(
        flow.ps,
        params.map,
        casterId,
        spell.id,
        currentRound
    );

    const tag = concentrates ? { casterId, castId } : undefined;

    if (tag) {
        const zoneRounds =
            def.targeting.kind === 'template'
                ? (def.targeting.zone?.rounds ?? 0)
                : 0;

        const rounds = Math.max(zoneRounds, ...def.effects.map(effectRounds));

        const begun = sustain.begin(flow.ps, {
            casterId,
            castId: tag.castId,
            spellName: spell.name,
            rounds: rounds || DEFAULT_CONCENTRATION_ROUNDS,
            round: currentRound,
            cn: spellMagic?.cn,
        });

        flow.ps = begun.participants;
        flow.messages.push(...begun.messages);
    }

    const psBeforeEffects = flow.ps;

    const shots = projectileShots(def.targeting, requestedIds, allRolls);

    const shotOutcomes = shots ? runProjectiles(state, shots) : undefined;

    if (!shots) {
        for (const id of targetIds)
            state.outcomes.set(id, resolveOutcome(state, id, true));

        for (const [index, id] of targetIds.entries()) {
            def.effects.forEach((effect, effectIndex) => {
                if (isPerTarget(effect) && !readsEventDamage(effect))
                    applyTo(state, effect, effectIndex, id, index);
            });
        }
    }

    def.effects.forEach((effect, effectIndex) => {
        if (isPerTarget(effect)) return;

        if (
            'onlyIfAffected' in effect &&
            effect.onlyIfAffected &&
            (
                shotOutcomes ?? targetIds.map((id) => state.outcomes.get(id))
            ).every((o) => o?.skip !== false)
        )
            return;

        const event: AbilityEvent = {
            type: 'spellCast',
            phase: 'after',
            actorId: casterId,
            targetIds,
            ...info,
        };

        resolveTargetIds(
            targetOf(effect) as Parameters<typeof resolveTargetIds>[0],
            casterId,
            event,
            flow.ps,
            flow.ctx
        ).forEach((id, index) =>
            applyTo(state, effect, effectIndex, id, index)
        );
    });

    for (const [index, id] of targetIds.entries()) {
        def.effects.forEach((effect, effectIndex) => {
            if (isPerTarget(effect) && readsEventDamage(effect))
                applyTo(state, effect, effectIndex, id, index);
        });
    }

    applyHitRiders({
        flow,
        effects: source.definition.effects,
        casterId,
        targetIds,
        ability: state.ability,
        saveDc: state.saveDc,
        round: currentRound,
        upcastSteps: ruleSystemOf(params.rules).magic.upcast.steps(
            spell.level,
            castLevel
        ),
    });

    applyAnchoredZones({
        flow,
        effects: source.definition.effects,
        casterId,
        targetIds,
        ability: state.ability,
        spellId: spell.id,
        saveDc: state.saveDc,
        dice: spellDiceOf(state),
        round: currentRound,
    });

    applyBursts({
        flow,
        effects: source.definition.effects,
        casterId,
        centreId: targetIds[0],
        spell,
        saveDc: state.saveDc,
        upcastSteps: ruleSystemOf(params.rules).magic.upcast.steps(
            spell.level,
            castLevel
        ),
    });

    const summonMove = moveSummonOf(source.definition.effects);

    if (summonMove?.kind === 'moveSummon' && !params.dryRun)
        moveSummon({
            flow,
            casterId,
            spell,
            feet: summonMove.feet,
            aim: params.aim,
        });

    if (hasMoveSelf(source.definition.effects) && targetIds[0]) {
        const moved = moveAdjacent(
            flow.ctx.map,
            flow.ps,
            casterId,
            targetIds[0]
        );

        flow.ps = moved.participants;

        if (moved.message) flow.messages.push(moved.message);
    }

    if (hasTeleportSelf(source.definition.effects) && !params.dryRun) {
        const teleported = teleportTo(
            flow.ctx.map,
            flow.ps,
            casterId,
            params.aim
        );

        flow.ps = teleported.participants;

        if (teleported.message) flow.messages.push(teleported.message);
    }

    if (def.resolution.kind === 'attack' && !params.grant?.inline?.auto) {
        for (const id of targetIds)
            runAutoReactions(
                flow,
                {
                    attackerId: casterId,
                    targetId: id,
                    targetHpBefore:
                        findParticipant(before, id)?.combatStats.currentHp ?? 0,
                },
                castSpell
            );
    }

    if (tag)
        flow.ps = sustain.tag(psBeforeEffects, flow.ps, tag, state.ability.key);

    applyGrantCasts({
        flow,
        effects: source.definition.effects,
        casterId,
        targetIds,
        spell,
        castId,
        round: currentRound,
        concentrationOf: tag,
    });

    applyGrantSpells({
        flow,
        effects: source.definition.effects,
        casterId,
        spell,
        picked: params.pickedSpell,
        optionIndex: params.optionIndex,
        castId,
        round: currentRound,
    });

    state.summons.push(
        ...inlineSummonRequests({
            effects: source.definition.effects,
            caster: readyCaster,
            rules: flow.ctx.rules,
            spell,
            castLevel,
            saveDc: state.saveDc,
            dice: spellDiceOf(state),
            round: currentRound,
            castId,
            concentrationOf: tag,
        })
    );

    state.summons.push(
        ...phantomRequests(state, source.definition.effects, castId)
    );

    state.transforms.push(
        ...transformRequests(
            state,
            source.definition.effects,
            currentRound,
            castId,
            tag,
            params.pickedId
        )
    );

    if (settle) applyCastAttribute(state, settle);

    spendCastCost(state, cost);

    if (settle) settleCastTest(state, settle);

    const result = finishSpellAction(state, {
        before,
        targetsBefore,
        allParticipants,
        battleId,
        round: currentRound,
        sourceEffects: source.definition.effects,
        ...(test && { details: test.details }),
    });

    const interruptedIds = interruptedTargets(state, source.definition.effects);

    return {
        ...result,
        ...(tag && { concentration: tag }),
        ...(interruptedIds.length > 0 && { interruptedIds }),
    };
}
