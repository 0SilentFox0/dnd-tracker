import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_RULES } from '@/lib/utils/rules';
import type { MoveHook, MoveHookInput } from '@/lib/utils/rules/systems/types';
import type { BattleParticipant } from '@/types/battle';

const hooks = vi.hoisted(() => ({ current: [] as MoveHook[] }));

vi.mock('@/lib/utils/rules/systems', () => ({
    ruleSystemOf: () => ({ combat: { actions: { onMove: hooks.current } } }),
}));

const unit = (id: string, hp: number) =>
    ({
        basicInfo: { id },
        battleData: {
            position: { x: 0, y: 0 },
            reload: { hp },
            movementUsed: 0,
            activeEffects: [],
        },
    }) as unknown as BattleParticipant;

const run = async () => {
    vi.resetModules();

    const { resolveMovement } = await import(
        '@/systems/d20/rules/actions/movement'
    );

    const mover = unit('m', 10);

    return resolveMovement({
        map: { cols: 5, rows: 5 } as never,
        participants: [mover],
        mover,
        to: { x: 3, y: 0 },
        path: [
            { x: 1, y: 0 },
            { x: 2, y: 0 },
            { x: 3, y: 0 },
        ],
        budget: 10,
        strike: vi.fn() as never,
        cost: 3,
        round: 1,
        battleId: 'b',
        rules: DEFAULT_RULES,
        rng: () => 0.5,
    });
};

const damage =
    (hp: number, stopAt: { x: number; y: number } | null, text: string) =>
    (input: MoveHookInput) => {
        const mover = input.mover;

        return {
            participants: input.participants.map((p) =>
                p.basicInfo.id === 'm'
                    ? {
                          ...p,
                          battleData: { ...p.battleData, reload: { hp } },
                      }
                    : p
            ),
            stopAt,
            cost: 1,
            actions: [],
            messages: [{ message: `${text}:${mover.battleData.reload?.hp}` }],
        } as never;
    };

describe('onMove chain', () => {
    it('hands the updated mover and participants to the next hook', async () => {
        hooks.current = [damage(7, null, 'a'), damage(4, null, 'b')];

        const out = await run();

        expect(
            out.messages.map(
                (m) => (m as unknown as { message: string }).message
            )
        ).toEqual(['a:10', 'b:7']);
        expect(out.moved.battleData.reload?.hp).toBe(4);
        expect(out.destination).toEqual({ x: 3, y: 0 });
    });

    it('stops at the first stopper and skips the rest', async () => {
        const later = vi.fn(() => null);

        hooks.current = [damage(5, { x: 1, y: 0 }, 'a'), later];

        const out = await run();

        expect(later).not.toHaveBeenCalled();
        expect(out.destination).toEqual({ x: 1, y: 0 });
        expect(out.spent).toBe(1);
    });
});
