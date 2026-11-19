import { applyTo } from '@/lib/utils/battle/spell/cast/effects';
import { resolveOutcome } from '@/lib/utils/battle/spell/cast/outcome';
import {
    isPerTarget,
    type Outcome,
    readsEventDamage,
    type SpellCastState,
} from '@/lib/utils/battle/spell/cast/state';
import { computeSpellPower } from '@/lib/utils/battle/spell/power';

export function projectileShots(
    targeting: object,
    shots: string[],
    rolls: number[]
): string[] | undefined {
    return 'projectiles' in targeting &&
        targeting.projectiles &&
        shots.length > 0 &&
        rolls.length > 0 &&
        rolls.length % shots.length === 0
        ? shots
        : undefined;
}

export function runProjectiles(
    state: SpellCastState,
    shots: string[]
): Outcome[] {
    const { flow, spell, caster } = state;

    const all = state.diceRolls;

    const per = all.length / shots.length;

    const saved = {
        power: state.power,
        diceCount: state.diceCount,
        attackRolls: state.attackRolls,
    };

    const outcomes = shots.map((id, index) => {
        const slice = all.slice(index * per, (index + 1) * per);

        state.diceRolls = slice;
        state.diceCount = per;
        state.power = computeSpellPower({
            caster,
            rules: flow.ctx.rules,
            groupId: spell.groupId,
            rolls: slice,
            participants: flow.ps,
            extra: state.actionModifiers[caster.basicInfo.id],
            addAbilityMod: spell.definition.addAbilityMod,
            damageBonus: spell.definition.damageBonus,
        });
        state.attackRolls =
            shots.indexOf(id) === index ? saved.attackRolls : [];

        const outcome = resolveOutcome(state, id, true);

        state.outcomes.set(id, outcome);

        spell.definition.effects.forEach((effect, effectIndex) => {
            if (isPerTarget(effect) && !readsEventDamage(effect))
                applyTo(state, effect, effectIndex, id, index);
        });

        return outcome;
    });

    state.diceRolls = all;
    state.diceCount = saved.diceCount;
    state.power = saved.power;
    state.attackRolls = saved.attackRolls;

    return outcomes;
}
