import type { Dispatch } from 'react';

import type { useBattleScene } from './useBattleScene';

import { textRef } from '@/lib/i18n/text-ref';
import {
    buildSpellPick,
    defaultGrant,
    slotOptions,
    type SpellFlowAction,
    type SpellFlowState,
    spellPayload,
    spellSourceModel,
} from '@/lib/utils/battle/flows';
import { slotLevels } from '@/lib/utils/battle/view';
import { cryptoRandom, rollDie } from '@/lib/utils/common/dice';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type { BattleParticipant } from '@/types/battle';
import type { BookSpell } from '@/types/spells';

type Grants = ReturnType<typeof spellSourceModel>;

export interface SpellBookActionsContext {
    caster: BattleParticipant | null;
    selected: BookSpell | null;
    levels: number[];
    flow: { state: SpellFlowState; dispatch: Dispatch<SpellFlowAction> };
    root: SpellFlowState;
    scene: ReturnType<typeof useBattleScene>;
    source: Pick<
        Grants,
        'grantsOf' | 'canSlot' | 'slotChoices' | 'selectedGrant'
    >;
    build(
        s: BookSpell,
        opts?: { castLevel?: number; test?: boolean }
    ): ReturnType<typeof buildSpellPick>;
    inRange(p: BattleParticipant): boolean;
    bypassCost: boolean;
    attackDice?: number;
    setFinishLong(value: boolean): void;
    onDone?: () => void;
}

export function spellBookActions({
    caster,
    selected,
    levels,
    flow: { state, dispatch },
    root: flow,
    scene,
    source: { grantsOf, canSlot, slotChoices, selectedGrant },
    build,
    inRange,
    bypassCost,
    attackDice,
    setFinishLong,
    onDone,
}: SpellBookActionsContext) {
    const order = scene.battle.initiativeOrder;

    const firstUsable = (who: BattleParticipant) =>
        slotLevels(who).find((l) => l.current > 0)?.level ?? 0;

    const actions = {
        open: (level?: number, casterOverride?: BattleParticipant) => {
            const who = casterOverride ?? caster;

            if (who)
                dispatch({
                    type: 'OPEN',
                    casterId: who.basicInfo.id,
                    level: level ?? firstUsable(who),
                    levels,
                });
        },
        setLevel: (level: number) => dispatch({ type: 'SET_LEVEL', level }),
        pick: (s: BookSpell) => {
            const grants = grantsOf(s);

            const choices =
                !bypassCost && canSlot(s)
                    ? slotOptions(caster, s.level, scene.battle.rules)
                    : [];

            const first = grants.length === 0 ? choices[0] : undefined;

            const grant = defaultGrant(grants, {
                hasSlotChoices: choices.length > 0,
                spellLevel: s.level,
            });

            dispatch({
                type: 'PICK',
                pick: build(s, {
                    castLevel: grant?.castLevel ?? first?.castLevel,
                    test: !grant,
                }),
                ...(first && { slotKey: first.key }),
                ...(grant?.key && { grantKey: grant.key }),
                ...(grant?.upcast &&
                    grant.castLevel !== undefined && {
                        castLevel: grant.castLevel,
                    }),
            });
        },
        setSlot: (key: string) => {
            const option = selected && slotChoices.find((o) => o.key === key);

            if (selected && option)
                dispatch({
                    type: 'SET_SLOT',
                    slotKey: key,
                    pick: build(selected, { castLevel: option.castLevel }),
                });
        },
        setSource: (value: string) => {
            if (!selected) return;

            if (value.startsWith('slot:'))
                return actions.setSlot(value.slice('slot:'.length));

            const grant = grantsOf(selected).find(
                (g) => g.key === value.slice('grant:'.length)
            );

            if (grant?.key) {
                dispatch({
                    type: 'SET_GRANT',
                    grantKey: grant.key,
                    pick: build(selected, {
                        castLevel: grant.castLevel,
                        test: false,
                    }),
                    ...(grant.upcast &&
                        grant.castLevel !== undefined && {
                            castLevel: grant.castLevel,
                        }),
                });
            }
        },
        setCastLevel: (castLevel: number) => {
            if (selected && selectedGrant)
                dispatch({
                    type: 'SET_CAST_LEVEL',
                    castLevel,
                    pick: build(selected, { castLevel, test: false }),
                });
        },
        setOption: (index: number) => dispatch({ type: 'SET_OPTION', index }),
        setPicked: (id: string | undefined) =>
            dispatch({ type: 'SET_PICKED', id }),
        setInputCount: (count: number) =>
            dispatch({ type: 'SET_INPUT', count }),
        setAttack: (id: string, v: number | undefined) =>
            dispatch({ type: 'SET_ATTACK', id, value: v }),
        prepareCast: async (cancel = false) => {
            if (!caster || !selected) return;

            try {
                await scene.actions.castSpell.mutateAsync({
                    ...spellPayload(state),
                    spellId: cancel
                        ? (caster.battleData.pendingCast?.spellId ??
                          selected.id)
                        : selected.id,
                    targetIds: [],
                    diceRolls: [],
                    ...(cancel && { cancelCasting: true }),
                });
                dispatch({ type: 'CLOSE' });
                onDone?.();
            } catch (e) {
                dispatch({
                    type: 'FAIL',
                    error:
                        e instanceof Error
                            ? e.message
                            : textRef('battleWizards.spell.continueFailed'),
                });
            }
        },
        completeLong: () => {
            setFinishLong(true);
            dispatch({ type: 'TO_TARGETS' });
        },
        toTargets: () => {
            setFinishLong(false);
            dispatch({ type: 'TO_TARGETS' });
        },
        toggleTarget: (id: string) => {
            const target = order.find((p) => p.basicInfo.id === id);

            if (target && !inRange(target)) return;

            dispatch({ type: 'TOGGLE_TARGET', id });
        },
        confirmTargets: () => {
            if (state !== flow && state.aim)
                dispatch({
                    type: 'SET_AIM',
                    aim: state.aim,
                    targetIds: state.targetIds,
                });

            dispatch({ type: 'CONFIRM_TARGETS' });
        },
        setSave: (id: string, v: number | undefined) =>
            dispatch({ type: 'SET_SAVE', id, value: v }),
        setDamage: (i: number, v: number | undefined) =>
            dispatch({ type: 'SET_DAMAGE', index: i, value: v }),
        aiDamage: () => {
            state.pick?.diceSlots.forEach((sides, i) =>
                dispatch({
                    type: 'SET_DAMAGE',
                    index: i,
                    value: rollDie(sides, cryptoRandom),
                })
            );

            if (state.pick?.needsAttackRolls && attackDice)
                state.targetIds.forEach(
                    (id) =>
                        state.attacks[id] === undefined &&
                        dispatch({
                            type: 'SET_ATTACK',
                            id,
                            value: rollDie(attackDice, cryptoRandom),
                        })
                );
        },
        setCastRoll: (roll?: number, second?: number) =>
            dispatch({ type: 'SET_CAST_ROLL', roll, second }),
        setUseIngredient: (value: boolean) =>
            dispatch({ type: 'SET_CAST_INGREDIENT', value }),
        setCastSystem: (value: SystemSlot | null) =>
            dispatch({ type: 'SET_CAST_SYSTEM', value }),
        toSummary: () => dispatch({ type: 'TO_SUMMARY' }),
        back: () => dispatch({ type: 'BACK' }),
        submit: () => dispatch({ type: 'SUBMIT' }),
        close: () => dispatch({ type: 'CLOSE' }),
    };

    return actions;
}
