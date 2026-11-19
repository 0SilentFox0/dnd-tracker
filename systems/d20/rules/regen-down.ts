import { dropBrokenConcentration } from './concentration/damaged';
import { D20_CONDITION_SET } from './conditions';

import { CombatStatus } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import {
    findParticipant,
    replaceParticipant,
} from '@/lib/utils/abilities/engine/core/participants';
import { upsertLabeled } from '@/lib/utils/battle/actions/effects';
import { removeEffects } from '@/lib/utils/battle/conditions/query';
import { PERMANENT_ROUNDS } from '@/lib/utils/battle/conditions/set';
import type { DamageConsequencesResult } from '@/lib/utils/battle/damage/consequences';
import {
    clearGuardedDamage,
    isRegenDowned,
    regenerationOf,
    regenKeepsAlive,
    regenSuppressed,
} from '@/lib/utils/battle/damage/regen-guard';
import type {
    TurnHook,
    TurnSubjectCtx,
    ZeroHpCtx,
} from '@/lib/utils/rules/systems/types';

const REGEN_DOWN_KEY = 'regen-down';

const isUnconsciousEffect = (e: { effects: { type: string }[] }) =>
    e.effects.some((m) => m.type === 'unconscious');

/** A regenerating unit that fell to 0 HP stays down instead of dying: effects drop, it turns unconscious. */
export function regenGoesDown(ctx: ZeroHpCtx): DamageConsequencesResult | null {
    const { after, participants, rules } = ctx;

    if (
        after.combatStats.currentHp > 0 ||
        after.combatStats.status !== CombatStatus.ACTIVE ||
        !regenKeepsAlive(after, ctx.damageType)
    )
        return null;

    const dropped = dropBrokenConcentration(after, participants);

    const stripped = removeEffects(
        findParticipant(dropped.participants, after.basicInfo.id) ?? after,
        () => true
    ).participant;

    const input = D20_CONDITION_SET.effectInput('unconscious', {
        timedKey: REGEN_DOWN_KEY,
        rounds: PERMANENT_ROUNDS,
        permanent: true,
        exhaustion: rules.conditions.exhaustion,
    });

    const down = {
        ...(input ? upsertLabeled(stripped, input, 0) : stripped),
        combatStats: {
            ...stripped.combatStats,
            currentHp: 0,
            status: CombatStatus.UNCONSCIOUS,
        },
    };

    return {
        participant: down,
        participants: replaceParticipant(dropped.participants, down),
        messages: [
            ...dropped.messages,
            textRef('battleD20.regen.down', { name: after.basicInfo.name }),
        ],
    };
}

/** Its turn comes up: suppressed regeneration means death, otherwise it wakes and the turn-start regen heals it. */
export const d20RegenWake: TurnHook<TurnSubjectCtx> = ({
    participants,
    id,
}) => {
    const p = findParticipant(participants, id);

    const regen = p && isRegenDowned(p) ? regenerationOf(p) : undefined;

    if (!p || !regen) return { participants, messages: [] };

    const name = p.basicInfo.name;

    if (regenSuppressed(p, regen.suppressedBy)) {
        const dead = clearGuardedDamage({
            ...p,
            combatStats: { ...p.combatStats, status: CombatStatus.DEAD },
        });

        return {
            participants: replaceParticipant(participants, dead),
            messages: [textRef('battleD20.regen.dies', { name })],
        };
    }

    const woke = clearGuardedDamage({
        ...removeEffects(p, isUnconsciousEffect).participant,
        combatStats: {
            ...p.combatStats,
            currentHp: 1,
            status: CombatStatus.ACTIVE,
        },
    });

    return {
        participants: replaceParticipant(participants, woke),
        messages: [textRef('battleD20.regen.wakes', { name })],
    };
};
