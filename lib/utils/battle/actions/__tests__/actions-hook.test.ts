import { describe, expect, it, vi } from 'vitest';

import { coreActionsOn, reactionBlockerOf } from '../access';
import { moveWithReactions, runCoreAction } from '../dispatch';
import { actionReason } from '../reasons';

import { D6POOL_SYSTEM } from '@/lib/__tests__/fixtures/d6pool/definition';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { BattleRuleError } from '@/lib/utils/battle/store/errors';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';

vi.mock('@/lib/utils/rules/systems', async (importOriginal) => {
    const { D6POOL_SYSTEM: base } = await import(
        '@/lib/__tests__/fixtures/d6pool/definition'
    );

    return {
        ...(await importOriginal<object>()),
        ruleSystemOf: () => base,
        ruleSystemByKey: () => base,
    };
});

describe('core actions of a system without them (d6pool base)', () => {
    const actor = createMockParticipant();

    const { actions } = D6POOL_SYSTEM.combat;

    it('lists nothing and is switched off whatever the rules section says', () => {
        expect(actions.catalog).toEqual({});
        expect(
            coreActionsOn({
                ...DEFAULT_RULES,
                actions: { ...DEFAULT_RULES.actions, enabled: true },
            })
        ).toBe(false);
    });

    it('reports every action unavailable', () => {
        expect(
            actions.available('dash', actor, [actor], null, DEFAULT_RULES).ok
        ).toBe(false);
        expect(actions.targets('grapple', actor, [actor], null)).toEqual([]);
    });

    it('running an action or a move is rejected by the core entry points', () => {
        expect(() =>
            runCoreAction({
                participants: [actor],
                body: { action: 'dodge', participantId: actor.basicInfo.id },
                map: null,
                rules: DEFAULT_RULES,
                round: 1,
                rng: () => 0.5,
                battleId: 'b',
            })
        ).toThrow(BattleRuleError);
        expect(() =>
            moveWithReactions({
                map: { cols: 3, rows: 3, background: null, opacity: 0.3 },
                participants: [actor],
                mover: actor,
                to: { x: 1, y: 1 },
                path: null,
                budget: 3,
                cost: 1,
                round: 1,
                battleId: 'b',
                rules: DEFAULT_RULES,
                rng: () => 0.5,
            })
        ).toThrow(BattleRuleError);
    });

    it('holds no grapples to release and blocks reactions', () => {
        const ps = [actor];

        expect(actions.releaseInvalidGrapples(ps).participants).toBe(ps);
        expect(reactionBlockerOf(DEFAULT_RULES, actor)).toEqual(
            actionReason('noReaction')
        );
    });
});

describe('wfrp noActions', () => {
    it('has an empty catalog, is off and blocks reactions', async () => {
        const { noActions, noReactions } = await import('../none');

        const actor = createMockParticipant();

        expect(noActions.catalog).toEqual({});
        expect(noActions.enabled(WFRP_RULES)).toBe(false);
        expect(
            noActions.available('dash', actor, [actor], null, WFRP_RULES).ok
        ).toBe(false);
        expect(noReactions.blocker(actor)).toEqual(actionReason('noReaction'));
    });
});
