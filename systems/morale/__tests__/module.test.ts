import { describe, expect, it } from 'vitest';

import {
    context,
    goblin,
    hero,
} from '@/lib/server/battles/__tests__/mutations/fixtures';
import { systemServerOf } from '@/lib/server/systems/registry';
import { runAbilities } from '@/lib/utils/abilities/engine/core/run-abilities';
import { resetSceneState, upgradeSceneState } from '@/lib/utils/battle/scene-state';
import { assertCanAct, assertCanEndTurn } from '@/lib/utils/battle/turn';
import { beforeAdvanceHooks } from '@/lib/utils/battle/turn/hooks';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import { type Ruleset } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { pendingSlot } from '@/systems/morale/__tests__/pending';
import { moraleCapPart } from '@/systems/morale/rules/cap';
import { pendingMoraleOf, withPendingMorale } from '@/systems/morale/rules/state';
import { applyPendingMorale } from '@/systems/morale/rules/turn/apply-pending';

const bare: Ruleset = { ...DEFAULT_RULES, system: { key: 'dnd5e' } };

const withMorale: Ruleset = {
    ...DEFAULT_RULES,
    system: { key: 'dnd5e', modules: ['morale'] },
    morale: { enabled: true, cap: 4 },
};

const moraleHero = { ...hero, combatStats: { ...hero.combatStats, morale: 2 } };

const ctxOf = (rules: Ruleset, pending: unknown = null) => {
    const base = context({ participants: [moraleHero, goblin] });

    return {
        ...base,
        scene: { ...base.scene, sceneState: pendingSlot(pending) },
        meta: { ...base.meta, rules },
    };
};

describe('morale module on d20', () => {
    it('without the module nothing gates acting, advance has no hook and the cap is untouched', () => {
        expect(() => assertCanAct(ctxOf(bare), 'hero')).not.toThrow();
        expect(() => assertCanEndTurn(ctxOf(bare), 'hero')).not.toThrow();
        expect(beforeAdvanceHooks(bare)).toEqual([]);
        expect(ruleSystemOf(bare).participant?.fromUnit).not.toContain(
            moraleCapPart
        );
    });

    it('with the module an unresolved check blocks acting and ending, skipMorale waives the act gate', () => {
        expect(() => assertCanAct(ctxOf(withMorale), 'hero')).toThrow(
            expect.objectContaining({ code: 'action_rejected' })
        );
        expect(() => assertCanEndTurn(ctxOf(withMorale), 'hero')).toThrow(
            expect.objectContaining({ code: 'action_rejected' })
        );
        expect(() =>
            assertCanAct(ctxOf(withMorale), 'hero', { skipMorale: true })
        ).not.toThrow();
    });

    it('a panic result blocks acting even with skipMorale', () => {
        const panic = {
            participantId: 'hero',
            d10Roll: 1,
            moraleResult: {
                shouldSkipTurn: true,
                hasExtraTurn: false,
                moralePositive: false,
                message: '',
            },
        };

        expect(() =>
            assertCanAct(ctxOf(withMorale, panic), 'hero', { skipMorale: true })
        ).toThrow(expect.objectContaining({ code: 'action_used' }));
    });

    it('the module sets the cap from the rules, or 0 when morale is off', () => {
        const part = ruleSystemOf(withMorale).participant?.fromCharacter;

        expect(part).toEqual([moraleCapPart]);
        expect(
            moraleCapPart(hero, {
                row: { level: 1 },
                rules: withMorale,
                refs: {},
            }).combatStats.moraleCap
        ).toBe(4);
        expect(
            moraleCapPart(hero, {
                row: { level: 1 },
                rules: { ...withMorale, morale: { enabled: false, cap: 4 } },
                refs: {},
            }).combatStats.moraleCap
        ).toBe(0);
    });

    it('cap 0 and cap 2 are written as given', () => {
        const capOf = (cap: number) =>
            moraleCapPart(hero, {
                row: { level: 1 },
                rules: { ...withMorale, morale: { enabled: true, cap } },
                refs: {},
            }).combatStats.moraleCap;

        expect(capOf(0)).toBe(0);
        expect(capOf(2)).toBe(2);
    });

    it('homm runs the pending-morale hook first; a payload stored before Ch8 applies the same', () => {
        expect(beforeAdvanceHooks(DEFAULT_RULES)[0]).toBe(applyPendingMorale);

        const legacy = {
            participantId: 'hero',
            d10Roll: 1,
            moraleResult: {
                shouldSkipTurn: true,
                hasExtraTurn: false,
                moralePositive: false,
                message: '',
            },
        };

        const { scene } = ctxOf(DEFAULT_RULES, legacy);

        const out = applyPendingMorale({
            participants: [moraleHero, goblin],
            scene,
            round: 1,
            rng: Math.random,
            rules: DEFAULT_RULES,
            run: runAbilities,
        });

        expect(out.participants[0].actionFlags.hasUsedReaction).toBe(true);
        expect(out.actions?.[0].actionType).toBe('morale_skip');
    });

    it('startCheck.valueOf is the effective morale, absent without the module', () => {
        expect(
            ruleSystemOf(withMorale).combat.turn?.startCheck?.valueOf(
                moraleHero,
                [moraleHero]
            )
        ).toBe(2);
        expect(ruleSystemOf(bare).combat.turn?.startCheck).toBeUndefined();
    });

    it('the server battle operation declares its own dice, so core dice.ts names no module', () => {
        const dice = systemServerOf(withMorale).battle?.['morale-check']?.serverDice;

        expect(dice?.placeholder).toEqual({ d10Roll: 1 });

        const rolled = dice?.roll(context({ participants: [hero] })).d10Roll;

        expect(rolled).toBeGreaterThanOrEqual(1);
        expect(rolled).toBeLessThanOrEqual(10);
    });

    it('upgrade-on-read folds the legacy column into the scene slot, round-trips, and leaves a migrated slot alone', () => {
        const payload = {
            participantId: 'hero',
            d10Roll: 4,
            moraleResult: {
                shouldSkipTurn: true,
                hasExtraTurn: false,
                moralePositive: false,
                message: '',
            },
        };

        const upgraded = upgradeSceneState(withMorale, undefined, {
            pendingMoraleCheck: payload,
        });

        expect(pendingMoraleOf(upgraded)).toEqual(payload);
        expect(JSON.parse(JSON.stringify(upgraded))).toEqual(upgraded);

        const cleared = resetSceneState(withMorale, upgraded);

        expect(pendingMoraleOf(cleared)).toBeNull();
        expect(
            upgradeSceneState(withMorale, cleared, {
                pendingMoraleCheck: payload,
            })
        ).toEqual(cleared);
        expect(
            upgradeSceneState(withMorale, undefined, {
                pendingMoraleCheck: null,
            })
        ).toBeUndefined();
    });

    it('without the module the scene slot is neither upgraded nor reset', () => {
        const legacy = { pendingMoraleCheck: { participantId: 'hero' } };

        expect(upgradeSceneState(bare, undefined, legacy)).toBeUndefined();

        const slot = { key: 'd20', data: { ext: { other: 1 } } };

        expect(resetSceneState(bare, slot)).toBe(slot);
    });

    it('a pending result keeps foreign ext entries of the scene slot', () => {
        const slot = { key: 'd20', data: { ext: { other: 1 } } };

        const next = withPendingMorale(slot, {
            participantId: 'hero',
            d10Roll: 1,
            moraleResult: {
                shouldSkipTurn: false,
                hasExtraTurn: false,
                moralePositive: true,
                message: '',
            },
        });

        expect(next).toMatchObject({ data: { ext: { other: 1 } } });
        expect(withPendingMorale(slot, null)).toBe(slot);
    });
});
