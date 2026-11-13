import { textRef } from '@/lib/i18n/text-ref';
import { collectModifiers } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import {
    findParticipant,
    isActive,
    withSelf,
} from '@/lib/utils/abilities/engine/core/participants';
import type { StaticEffect } from '@/lib/utils/abilities/schema';
import { INSPIRATION_LABEL } from '@/lib/utils/battle/attack/inspiration';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import { effectName } from '@/lib/utils/battle/common/terms';
import { isAdjacentAttack } from '@/lib/utils/battle/grid/adjacent-attack';
import { cellFeetOf } from '@/lib/utils/battle/grid/cell-feet';
import { footprintDistance } from '@/lib/utils/battle/grid/geometry';
import { cellsOf, isOnMap } from '@/lib/utils/battle/grid/occupancy';
import * as reachCheck from '@/lib/utils/battle/grid/reach-check';
import { isObscured } from '@/lib/utils/battle/grid/terrain';
import { uniqueLines } from '@/lib/utils/battle/log/lines';
import {
    ARMOR_PENALTY_LABEL,
    armorPenalty,
    armorPenaltyAffects,
    isWeaponProficient,
} from '@/lib/utils/battle/proficiency';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type {
    AttackAbilityResult,
    ReachRules,
} from '@/lib/utils/rules/systems/types';
import type {
    BattleAttack,
    BattleMapConfig,
    BattleParticipant,
} from '@/types/battle';
import type { LogLine } from '@/types/text';

/** The system-dependent inputs of an attack roll, passed in so this module never reads the registry (a d20 system file imports it). */
export interface AttackMathSystem {
    abilityOf(
        p: BattleParticipant,
        attack: BattleAttack,
        participants?: BattleParticipant[]
    ): AttackAbilityResult;
    proficiencyBonus(p: BattleParticipant): number;
    reach: ReachRules | undefined;
}

export type RollMode = 'advantage' | 'disadvantage' | 'normal';

export type RollModeReasons = { advantage: LogLine[]; disadvantage: LogLine[] };

export type SourceOpts = {
    rules: Ruleset;
    extra?: StaticEffect[];
    targetId?: string;
    targetExtra?: StaticEffect[];
    map?: BattleMapConfig | null;
    inspiration?: boolean;
};

export function attackBonusOf(
    sys: AttackMathSystem,
    attacker: BattleParticipant,
    attack: BattleAttack,
    participants: BattleParticipant[] = [attacker],
    extra?: StaticEffect[]
): number {
    const statModifier = sys.abilityOf(attacker, attack).roll;

    const base =
        (attack.attackBonus || 0) +
        statModifier +
        (isWeaponProficient(attacker, attack)
            ? sys.proficiencyBonus(attacker)
            : 0);

    return (
        base +
        collectModifiers(
            withSelf(participants, attacker),
            attacker.basicInfo.id,
            { stat: 'attackBonus', attackKind: attackKindOf(attack.type) },
            extra
        ).flat
    );
}

const OBSCURED_ATTACKER_LABEL = textRef('battleLog.rollMode.obscuredAttacker');

const OBSCURED_TARGET_LABEL = textRef('battleLog.rollMode.obscuredTarget');

const labels = (entries: { label: LogLine }[]) => entries.map((e) => e.label);

/** Що з навичок/ефектів дає перевагу чи недолік — назви джерел. */
export function rollModeReasonsOf(
    sys: AttackMathSystem,
    attacker: BattleParticipant,
    attack: BattleAttack,
    participants: BattleParticipant[],
    opts: SourceOpts
): RollModeReasons {
    const kind = attackKindOf(attack.type);

    const ps = withSelf(participants, attacker);

    const id = attacker.basicInfo.id;

    const abilityKey = () => sys.abilityOf(attacker, attack).key;

    const flagEntries = (
        pid: string,
        flag:
            | 'advantage'
            | 'disadvantage'
            | 'advantageForAttackers'
            | 'disadvantageForAttackers'
            | 'proneDefense',
        extra?: StaticEffect[]
    ) => collectModifiers(ps, pid, { flag }, extra).entries;

    const target = opts.targetId
        ? findParticipant(ps, opts.targetId)
        : undefined;

    const senses = (
        viewer: BattleParticipant,
        other: BattleParticipant | undefined,
        blindOnly = false
    ) => {
        if (!other || !isOnMap(viewer) || !isOnMap(other)) return false;

        const feet =
            footprintDistance(cellsOf(viewer), cellsOf(other)) *
            cellFeetOf(opts.rules);

        return collectModifiers(ps, viewer.basicInfo.id, {
            flag: 'sense',
        }).flags.some(
            (f) =>
                f.flag === 'sense' &&
                (f.sense === 'blindsight' ||
                    (!blindOnly && f.sense === 'truesight')) &&
                f.range >= feet
        );
    };

    const attackerSees = senses(attacker, target);

    const attackerBlindSees = senses(attacker, target, true);

    const targetSees = !!target && senses(target, attacker);

    const proneDefense = target
        ? labels(
              flagEntries(target.basicInfo.id, 'proneDefense', opts.targetExtra)
          )
        : [];

    const adjacent =
        !!target &&
        proneDefense.length > 0 &&
        isAdjacentAttack(attacker, target, attack);

    const frightenedLabels = attacker.battleData.activeEffects
        .filter(
            (e) =>
                e.source &&
                e.effects.some((m) => m.type === 'frightened') &&
                ps.some(
                    (p) =>
                        p.basicInfo.id === e.source?.participantId &&
                        isActive(p)
                )
        )
        .map(effectName);

    const attackerBlind = isObscured(opts.map, attacker) && !attackerSees;

    const targetBlind = !!target && isObscured(opts.map, target) && !targetSees;

    const advantage = [
        ...labels(
            flagEntries(id, 'advantage', opts.extra).filter(
                (e) =>
                    !(targetSees && e.condition === 'invisible') &&
                    e.flag?.flag === 'advantage' &&
                    (e.flag.attackKind === 'all' ||
                        e.flag.attackKind === kind) &&
                    (!e.flag.attackAbility ||
                        e.flag.attackAbility === abilityKey())
            )
        ),
        ...(opts.targetId
            ? labels(
                  flagEntries(
                      opts.targetId,
                      'advantageForAttackers',
                      opts.targetExtra
                  )
              )
            : []),
        ...(adjacent ? proneDefense : []),
        ...(targetBlind ? [OBSCURED_TARGET_LABEL] : []),
        ...(opts.inspiration ? [INSPIRATION_LABEL] : []),
    ];

    const disadvantage = [
        ...labels(
            flagEntries(id, 'disadvantage', opts.extra).filter(
                (e) => !(attackerBlindSees && e.condition === 'blinded')
            )
        ),
        ...(opts.targetId
            ? labels(
                  flagEntries(
                      opts.targetId,
                      'disadvantageForAttackers',
                      opts.targetExtra
                  ).filter(
                      (e) => !(attackerSees && e.condition === 'invisible')
                  )
              )
            : []),
        ...(adjacent ? [] : proneDefense),
        ...frightenedLabels,
        ...(attackerBlind ? [OBSCURED_ATTACKER_LABEL] : []),
        ...(armorPenalty(attacker) && armorPenaltyAffects(abilityKey())
            ? [ARMOR_PENALTY_LABEL]
            : []),
        ...(target
            ? reachCheck.rangeDisadvantageReasons(
                  opts.map,
                  ps,
                  attacker,
                  attack,
                  target,
                  opts.rules,
                  sys.reach
              )
            : []),
    ];

    return {
        advantage: uniqueLines(advantage),
        disadvantage: uniqueLines(disadvantage),
    };
}

/** Режим кидка з навичок; forced — якщо хоч одне джерело є (взаємне скасування теж вирішене навичками). */
export function forcedRollMode(r: RollModeReasons): {
    mode: RollMode;
    forced: boolean;
} {
    const adv = r.advantage.length > 0;

    const dis = r.disadvantage.length > 0;

    return {
        mode: adv === dis ? 'normal' : adv ? 'advantage' : 'disadvantage',
        forced: adv || dis,
    };
}
