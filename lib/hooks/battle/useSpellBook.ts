'use client';

import { useMemo, useReducer, useState } from 'react';

import { spellBookActions } from './spellBookActions';
import { useBattleRules } from './useBattleRules';
import { useBattleScene } from './useBattleScene';
import { useBattleSpellLibrary } from './useBattleSpellLibrary';
import { useIngredientPlan } from './useIngredientPlan';
import { useSpellBookTargets } from './useSpellBookTargets';
import { useSpellCastSubmit } from './useSpellCastSubmit';

import { joinLines, textRef } from '@/lib/i18n/text-ref';
import { useText } from '@/lib/i18n/use-text';
import { reactionBlockerOf } from '@/lib/utils/battle/actions/access';
import {
    buildSpellPick,
    casterUsesUniversalSlot,
    castPreviewOf,
    costBlocked,
    grantLabel as grantLabelOf,
    initialSpellFlow,
    inlineGrantLabel,
    inlineGrantOf,
    spellBlockedBySlots,
    spellDefinition,
    spellFlow,
    spellSaveTargets,
    spellSlotCostLabel,
    spellSlotsLeft,
    spellSourceModel,
    spellWidening,
} from '@/lib/utils/battle/flows';
import { slotLevels } from '@/lib/utils/battle/view';
import {
    groupSpellsByLevel,
    levelsWithSpells,
} from '@/lib/utils/spells/group-by-level';
import type { BattleParticipant } from '@/types/battle';
import type { BookSpell } from '@/types/spells';
import type { LogLine } from '@/types/text';

export {
    useBonusSpells,
    useReactionSpells,
    useSpellBookPrefetch,
} from './useBattleSpellLibrary';

export type { BookSpell };

export function useSpellBook(
    caster: BattleParticipant | null,
    options: {
        reactionsOnly?: boolean;
        allSpells?: boolean;
        onDone?: () => void;
        legendary?: { abilityKey: string; spellId: string };
    } = {}
) {
    const scene = useBattleScene();

    const { tested: magic, attackDice } = useBattleRules();

    const text = useText();

    const [finishLong, setFinishLong] = useState(false);

    const [flow, dispatch] = useReducer(spellFlow, initialSpellFlow);

    const isOpen = flow.step !== 'closed' && !!caster;

    const free = !!options.allSpells;

    const special = options.legendary;

    const costFree = free || !!special;

    const bypassCost = costFree || magic;

    const spells = useBattleSpellLibrary(caster, {
        isOpen,
        free,
        specialSpellId: special?.spellId,
        reactionsOnly: options.reactionsOnly,
    });

    const byLevel = useMemo(() => groupSpellsByLevel(spells), [spells]);

    const levels = useMemo(() => levelsWithSpells(byLevel), [byLevel]);

    if (
        flow.step === 'book' &&
        !flow.levelPinned &&
        levels.length > 0 &&
        !levels.includes(flow.level)
    ) {
        dispatch({ type: 'SPELLS_LOADED', levels });
    }

    const selected = useMemo(
        () => spells.find((s) => s.id === flow.pick?.spellId) ?? null,
        [spells, flow.pick?.spellId]
    );

    const order = scene.battle.initiativeOrder;

    const map = scene.battle.map ?? null;

    const build = (
        s: BookSpell,
        opts: { castLevel?: number; test?: boolean } = {}
    ) =>
        buildSpellPick(order, caster, s, scene.battle.rules, map, {
            castLevel: opts.castLevel,
            castTest: magic && !costFree && opts.test !== false,
        });

    if (flow.step === 'book' && special && spells[0]) {
        dispatch({
            type: 'PICK',
            pick: build(spells[0], {
                castLevel: caster?.spellcasting.grants?.find(
                    (g) => g.spellId === special.spellId
                )?.castLevel,
            }),
        });
    }

    const {
        targets,
        onMap,
        inRange,
        filteredOut,
        hover,
        aimPreviewAt,
        mapTargeting,
        chain,
        state,
    } = useSpellBookTargets(caster, flow, dispatch);

    const saveTargets = spellSaveTargets(targets, state, scene.viewer);

    const universalSlot = casterUsesUniversalSlot(caster);

    const wideningOf = (s: BookSpell) => spellWidening(order, caster, s, onMap);

    const {
        grantsOf,
        grantOf,
        canSlot,
        slotChoices,
        selectedGrant,
        sourceOptions,
        castLevelOptions,
        formulaOf,
    } = spellSourceModel(
        caster,
        flow,
        selected,
        bypassCost,
        scene.battle.rules
    );

    const ingredients = useIngredientPlan(
        caster,
        selected,
        costFree || !!selectedGrant || !!selected?.grantKey,
        state.useIngredient ?? false
    );

    useSpellCastSubmit({
        caster,
        selected,
        flow: { state, dispatch },
        cast: { free, legendaryKey: special?.abilityKey, finishLong },
        onDone: options.onDone,
    });

    const labelOf = (s: BookSpell) =>
        s.grantKey
            ? inlineGrantLabel(caster, inlineGrantOf(caster, s))
            : grantLabelOf(caster, s.id);

    const castPreview =
        magic && caster && selected && state.pick?.castTest
            ? castPreviewOf(
                  caster,
                  scene.battle.rules,
                  selected.casting?.magic?.kind
              )
            : null;

    const view = {
        cast: castPreview && {
            ...castPreview,
            cn: selected?.casting?.magic?.cn ?? 0,
        },
        caster,
        spells,
        byLevel,
        selected,
        targets,
        saveTargets,
        hover,
        aimPreviewAt,
        mapTargeting,
        chain,
        inRange,
        filteredOut,
        formulaOf: (s: BookSpell) => text(formulaOf(s)),
        wideningOf,
        definitionOf: spellDefinition,
        slots: caster ? slotLevels(caster) : [],
        universalSlot,
        free,
        timing: selected?.casting,
        ingredients,
        pendingCast: caster?.battleData.pendingCast,
        canFastForward: scene.viewer.isDM,
        grantLabel: labelOf,
        sourceOptions,
        sourceValue: flow.grantKey
            ? `grant:${flow.grantKey}`
            : flow.slotKey
              ? `slot:${flow.slotKey}`
              : '',
        castLevelOptions,
        castLevelValue: flow.castLevel ?? selectedGrant?.castLevel,
        magic,
        slotLeft: (level: number) =>
            spellSlotsLeft(
                caster,
                level,
                bypassCost ||
                    spells.some((s) => s.level === level && !!grantOf(s))
            ),
        slotCostLabel: (s: BookSpell) => {
            const parts = [
                special
                    ? textRef('battleWizards.flow.cost.special')
                    : undefined,
                labelOf(s),
            ].filter((p): p is LogLine => p !== undefined && p !== '');

            return parts.length > 0
                ? joinLines(parts, ' · ')
                : spellSlotCostLabel(s, {
                      free,
                      universal: universalSlot,
                      chosen: slotChoices.find((o) => o.key === state.slotKey)
                          ?.label,
                  });
        },
        slot: { options: slotChoices, value: state.slotKey },
        noSlot: (s: BookSpell) =>
            !canSlot(s) &&
            spellBlockedBySlots(
                caster,
                s.level,
                bypassCost,
                scene.battle.rules
            ),
        attackTargets:
            state.pick?.needsAttackRolls && attackDice
                ? targets.filter((t) =>
                      state.targetIds.includes(t.basicInfo.id)
                  )
                : [],
        costUsed: (s: BookSpell) =>
            costBlocked({
                caster,
                spell: s,
                definitionCost: spellDefinition(s).cost,
                grants: s.grantKey
                    ? [inlineGrantOf(caster, s)].filter((g) => !!g)
                    : grantsOf(s),
                grant: s.grantKey ? inlineGrantOf(caster, s) : grantOf(s),
                slotKey: state.slotKey,
                free,
                bypassCost,
                special: !!special,
                isDM: scene.viewer.isDM,
                isMyTurn:
                    order[scene.battle.currentTurnIndex]?.basicInfo.id ===
                    caster?.basicInfo.id,
                reactionBlocked:
                    !!caster && !!reactionBlockerOf(scene.battle.rules, caster),
            }),
    };

    const actions = spellBookActions({
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
        onDone: options.onDone,
    });

    return { state, view, actions };
}
