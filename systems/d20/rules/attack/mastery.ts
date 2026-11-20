import { d20AttackAbility } from './ability';

import { AttackType } from '@/lib/constants/battle';
import type { WeaponMastery } from '@/lib/constants/weapon-mastery';
import { textRef } from '@/lib/i18n/text-ref';
import {
    findParticipant,
    isActive,
} from '@/lib/utils/abilities/engine/core/participants';
import { applyRawDamage } from '@/lib/utils/abilities/engine/effects/hp';
import { applyEffect } from '@/lib/utils/abilities/registry/effects';
import type { StaticEffect } from '@/lib/utils/abilities/schema';
import { upsertLabeled } from '@/lib/utils/battle/actions/effects';
import {
    applyFlowDamage,
    getP,
    put,
    settleDowned,
} from '@/lib/utils/battle/common/action-flow';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import { sizeOf } from '@/lib/utils/battle/grid/occupancy';
import { applyResistance } from '@/lib/utils/battle/resistance';
import { proficiencyOf, savesOf } from '@/lib/utils/battle/saves/access';
import { activeMastery } from '@/lib/utils/battle/weapon-mastery/mastery';
import {
    markUsedThisTurn,
    usedThisTurn,
} from '@/lib/utils/battle/weapon-mastery/once';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type {
    MasteryHooks,
    MasteryStrikeCtx,
} from '@/lib/utils/rules/systems/types';
import type { ResolvedAbility } from '@/types/abilities';
import type { BattleParticipant } from '@/types/battle';
import type { TextRef } from '@/types/text';

const LARGE = 2;

const LABELS = {
    cleave: textRef('battleD20.mastery.cleave'),
    graze: textRef('battleD20.mastery.graze'),
    nick: textRef('battleD20.mastery.nick'),
    push: textRef('battleD20.mastery.push'),
    sap: textRef('battleD20.mastery.sap'),
    slow: textRef('battleD20.mastery.slow'),
    topple: textRef('battleD20.mastery.topple'),
    vex: textRef('battleD20.mastery.vex'),
} satisfies Record<WeaponMastery, TextRef>;

const label = (mastery: WeaponMastery) => LABELS[mastery];

const flag = (f: Record<string, unknown>) =>
    ({ kind: 'flag', ...f }) as StaticEffect;

function masteryAbility(mastery: string): ResolvedAbility {
    const key = `mastery:${mastery}`;

    return {
        id: key,
        name: mastery,
        trigger: { event: 'passive' },
        effects: [],
        stackable: false,
        key,
        source: { type: 'skill', id: key, name: mastery },
    } as ResolvedAbility;
}

function graze({ flow, attackerId, targetId, attack }: MasteryStrikeCtx) {
    const attacker = getP(flow, attackerId);

    const target = getP(flow, targetId);

    const modifier = d20AttackAbility(attacker, attack, flow.ps).roll;

    if (modifier <= 0 || !isActive(target)) return;

    const resisted = applyResistance(
        target,
        modifier,
        attack.damageType ?? 'physical',
        {
            participants: flow.ps,
            attackKind: attackKindOf(attack.type),
            rules: flow.ctx.rules,
        }
    );

    if (resisted.finalDamage <= 0) return;

    put(flow, applyRawDamage(target, resisted.finalDamage));
    applyFlowDamage(
        flow,
        target,
        resisted.finalDamage,
        undefined,
        undefined,
        attack.damageType
    );
    flow.messages.push(
        textRef('battleD20.mastery.grazeHit', {
            target: target.basicInfo.name,
            damage: resisted.finalDamage,
        })
    );
    settleDowned(flow, targetId, attackerId);
}

function push({ flow, attackerId, targetId }: MasteryStrikeCtx) {
    const target = getP(flow, targetId);

    if (!isActive(target) || sizeOf(target) > LARGE) return;

    const r = applyEffect({
        participants: flow.ps,
        ability: masteryAbility('push'),
        effectIndex: 0,
        ownerId: attackerId,
        effect: { kind: 'push', feet: 10, from: 'caster' },
        targetIds: [targetId],
        event: {
            type: 'hit',
            actorId: attackerId,
            targetId,
            attackKind: 'melee',
            damage: 0,
        },
        ctx: flow.ctx,
    });

    flow.ps = r.participants;
    flow.messages.push(...r.messages);
}

function timedOnTarget(
    ctx: MasteryStrikeCtx,
    mastery: 'sap' | 'slow',
    abilityEffects: StaticEffect[],
    consumeOn?: 'ownAttack'
) {
    const target = getP(ctx.flow, ctx.targetId);

    if (!isActive(target)) return;

    const attacker = getP(ctx.flow, ctx.attackerId);

    put(
        ctx.flow,
        upsertLabeled(
            target,
            {
                timedKey:
                    mastery === 'slow'
                        ? 'mastery:slow'
                        : `mastery:${mastery}@${ctx.attackerId}`,
                name: mastery,
                label: label(mastery),
                type: 'debuff',
                rounds: 1,
                stackable: false,
                abilityEffects,
                ...(consumeOn && { consumeOn }),
                source: {
                    participantId: ctx.attackerId,
                    name: attacker.basicInfo.name,
                },
            },
            ctx.flow.ctx.round
        )
    );
    ctx.flow.messages.push(
        textRef('battleD20.mastery.applied', {
            mastery: label(mastery),
            target: target.basicInfo.name,
        })
    );
}

function vex({ flow, attackerId, targetId }: MasteryStrikeCtx) {
    const attacker = getP(flow, attackerId);

    const target = getP(flow, targetId);

    put(
        flow,
        upsertLabeled(
            attacker,
            {
                timedKey: `mastery:vex@${attackerId}`,
                name: 'vex',
                label: label('vex'),
                type: 'buff',
                rounds: 2,
                stackable: false,
                abilityEffects: [
                    flag({
                        flag: 'advantage',
                        attackKind: 'all',
                        againstId: targetId,
                    }),
                ],
                consumeOn: 'ownAttack',
            },
            flow.ctx.round
        )
    );
    flow.messages.push(
        textRef('battleD20.mastery.vexNext', { target: target.basicInfo.name })
    );
}

function topple(ctx: MasteryStrikeCtx) {
    const { flow, attackerId, targetId, attack } = ctx;

    const target = getP(flow, targetId);

    if (!isActive(target)) return;

    const attacker = getP(flow, attackerId);

    const dc =
        8 +
        d20AttackAbility(attacker, attack, flow.ps).roll +
        proficiencyOf(flow.ctx.rules).bonus(attacker);

    const save = savesOf(flow.ctx.rules).roll({
        target,
        ability: 'constitution',
        dc,
        participants: flow.ps,
        rules: flow.ctx.rules,
        rng: flow.ctx.rng,
    });

    flow.messages.push(
        textRef('battleD20.mastery.toppleSave', {
            target: target.basicInfo.name,
            dc,
            total: save.total,
            success: String(save.success),
        })
    );

    if (save.success) return;

    const r = ruleSystemOf(flow.ctx.rules).conditionSet.apply(
        flow.ps,
        targetId,
        {
            key: 'prone',
            rounds: 10,
            permanent: true,
            source: {
                participantId: attackerId,
                name: attacker.basicInfo.name,
            },
            sourceName: label('topple'),
            timedKey: `mastery:topple@${attackerId}`,
            round: flow.ctx.round,
            rules: flow.ctx.rules,
            rng: flow.ctx.rng,
        }
    );

    flow.ps = r.participants;
    flow.messages.push(...r.messages);
}

export function masteryOnStrike(ctx: MasteryStrikeCtx): void {
    const attacker = findParticipant(ctx.flow.ps, ctx.attackerId);

    const mastery = attacker && activeMastery(attacker, ctx.attack);

    if (!mastery) return;

    if (!ctx.hit) {
        if (mastery === 'graze') graze(ctx);

        return;
    }

    switch (mastery) {
        case 'push':
            return push(ctx);
        case 'sap':
            return timedOnTarget(ctx, 'sap', [flag({ flag: 'disadvantage' })], 'ownAttack');
        case 'slow':
            return timedOnTarget(ctx, 'slow', [
                { kind: 'modifyStat', stat: 'speed', flat: -10 },
            ]);
        case 'topple':
            return topple(ctx);
        case 'vex':
            return vex(ctx);
    }
}

export const D20_MASTERIES: MasteryHooks = {
    onStrike: masteryOnStrike,
    cleave: (attacker, attack, round) =>
        activeMastery(attacker, attack) === 'cleave' &&
        attack.type === AttackType.MELEE &&
        !usedThisTurn(attacker, 'cleave')
            ? { spent: markUsedThisTurn(attacker, 'cleave', round) }
            : null,
};

export function nickFree(
    attacker: BattleParticipant,
    attack: Parameters<typeof activeMastery>[1],
    round: number
): BattleParticipant | null {
    return activeMastery(attacker, attack) === 'nick' &&
        !usedThisTurn(attacker, 'nick')
        ? markUsedThisTurn(attacker, 'nick', round)
        : null;
}
