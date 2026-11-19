// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCritChoiceDialog } from '../useCritChoiceDialog';

import { useBattleScene } from '@/lib/hooks/battle';
import { critEffectsFor } from '@/lib/utils/battle/crit-choice/catalog';

const mutate = vi.hoisted(() => vi.fn());

const critRules = vi.hoisted(() =>
    vi.fn(() => ({
        disabledSuccess: [] as string[],
        disabledFail: [] as string[],
    }))
);

vi.mock('@/lib/hooks/battle', () => ({
    useBattleScene: vi.fn(),
    isSystemActionPending: (_a: unknown, key: string) => key === 'crit-choice',
}));
vi.mock('@/lib/utils/battle/attack/crit-rules', () => ({
    critRulesOf: critRules,
}));

const scene = (isDM: boolean, pendingChoice: unknown) =>
    ({
        battle: {
            rules: {},
            pendingChoice,
            initiativeOrder: [
                { basicInfo: { id: 'a', name: 'Ельф' } },
                { basicInfo: { id: 'b', name: 'Гоблін' } },
            ],
        },
        viewer: { isDM },
        actions: { system: { mutate } },
    }) as unknown as ReturnType<typeof useBattleScene>;

const trigger = {
    key: 't1',
    source: 'attack' as const,
    kind: 'success' as const,
    actorId: 'a',
    targetId: 'b',
};

describe('useCritChoiceDialog', () => {
    beforeEach(() => {
        mutate.mockReset();
        critRules.mockReturnValue({ disabledSuccess: [], disabledFail: [] });
    });

    it('is closed for the DM without a pending choice and for players with one', () => {
        vi.mocked(useBattleScene).mockReturnValue(scene(true, null));
        expect(
            renderHook(() => useCritChoiceDialog()).result.current.open
        ).toBe(false);

        vi.mocked(useBattleScene).mockReturnValue(
            scene(false, { triggers: [trigger] })
        );
        expect(
            renderHook(() => useCritChoiceDialog()).result.current.open
        ).toBe(false);
    });

    it('opens for the DM and resolves participant names and options per trigger', () => {
        vi.mocked(useBattleScene).mockReturnValue(
            scene(true, {
                triggers: [
                    trigger,
                    { ...trigger, key: 't2', targetId: 'gone' },
                ],
            })
        );

        const { rows, open } = renderHook(() => useCritChoiceDialog()).result
            .current;

        expect(open).toBe(true);
        expect(rows[0]).toMatchObject({
            actorName: 'Ельф',
            targetName: 'Гоблін',
        });
        expect(rows[0].options).toEqual(critEffectsFor('attack', 'success'));
        expect(rows[1].targetName).toBe('');
    });

    it('drops attack effects the campaign disabled', () => {
        const all = critEffectsFor('attack', 'success');

        critRules.mockReturnValue({
            disabledSuccess: [String(all[0].id)],
            disabledFail: [],
        });
        vi.mocked(useBattleScene).mockReturnValue(
            scene(true, { triggers: [trigger] })
        );

        const { rows } = renderHook(() => useCritChoiceDialog()).result.current;

        expect(rows[0].options.map((o) => o.id)).not.toContain(all[0].id);
        expect(rows[0].options).toHaveLength(all.length - 1);
    });

    it('submit and cancel send crit-choice system ops', () => {
        vi.mocked(useBattleScene).mockReturnValue(
            scene(true, { triggers: [trigger] })
        );

        const { submit, cancel, isSubmitting } = renderHook(() =>
            useCritChoiceDialog()
        ).result.current;

        submit({ t1: 3, t2: 'random' });
        expect(mutate).toHaveBeenLastCalledWith({
            action: 'crit-choice',
            body: { choices: { t1: 3, t2: 'random' } },
        });
        cancel();
        expect(mutate).toHaveBeenLastCalledWith({
            action: 'crit-choice',
            body: { cancel: true },
        });
        expect(isSubmitting).toBe(true);
    });

    it('shows rider offers next to the triggers and submits the DM answers', () => {
        const offer = {
            key: 'r1',
            holderId: 'a',
            effectId: 'e',
            kind: 'attack',
            die: 6,
            total: 9,
        };

        vi.mocked(useBattleScene).mockReturnValue(
            scene(true, { triggers: [trigger], riders: [offer] })
        );

        const { riderRows, submit } = renderHook(() => useCritChoiceDialog())
            .result.current;

        expect(riderRows).toEqual([{ offer, holderName: 'Ельф' }]);

        submit({ t1: 3 }, { r1: true });
        expect(mutate).toHaveBeenLastCalledWith({
            action: 'crit-choice',
            body: { choices: { t1: 3 }, riders: { r1: true } },
        });
    });
});
