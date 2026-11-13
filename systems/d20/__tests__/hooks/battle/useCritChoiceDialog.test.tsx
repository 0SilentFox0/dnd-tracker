// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { fakeScene } from '@/lib/hooks/battle/__tests__/fake-scene';
import { critEffectsFor } from '@/lib/utils/battle/crit-choice/catalog';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { useCritChoiceDialog } from '@/systems/d20/hooks/battle/useCritChoiceDialog';

const pending = {
    action: 'attack' as const,
    actorId: 'me',
    triggers: [
        {
            key: 't0',
            source: 'attack' as const,
            kind: 'success' as const,
            actorId: 'me',
            targetId: 'gob',
        },
        {
            key: 't1',
            source: 'save' as const,
            kind: 'fail' as const,
            actorId: 'me',
            targetId: 'ally',
        },
    ],
};

describe('useCritChoiceDialog', () => {
    it('без pending: порожньо', () => {
        const scene = fakeScene({ isDM: true });

        const { result } = renderHook(() => useCritChoiceDialog(), {
            wrapper: scene.wrapper,
        });

        expect(result.current).toMatchObject({ open: false, rows: [] });
    });

    it('рядки: імена учасників і опції за джерелом та видом тригера', () => {
        const scene = fakeScene({ isDM: true });

        scene.battle.pendingChoice = pending;

        const { result } = renderHook(() => useCritChoiceDialog(), {
            wrapper: scene.wrapper,
        });

        expect(
            result.current.rows.map((r) => [
                r.trigger.key,
                r.actorName,
                r.targetName,
            ])
        ).toEqual([
            ['t0', 'Фрейда', 'Гоблін'],
            ['t1', 'Фрейда', 'Годрік'],
        ]);
        expect(result.current.rows[0].options).toBe(
            critEffectsFor('attack', 'success')
        );
        expect(result.current.rows[1].options).toBe(
            critEffectsFor('save', 'fail')
        );
    });

    it('вимкнені в правилах ефекти атаки прибрано з опцій, save не зачеплено', () => {
        const scene = fakeScene({ isDM: true });

        const all = critEffectsFor('attack', 'success');

        scene.battle.pendingChoice = pending;
        scene.battle.rules = {
            ...DEFAULT_RULES,
            criticals: {
                ...DEFAULT_RULES.criticals,
                disabledSuccess: [String(all[0].id)],
            },
        };

        const { result } = renderHook(() => useCritChoiceDialog(), {
            wrapper: scene.wrapper,
        });

        expect(result.current.rows[0].options.map((e) => e.id)).toEqual(
            all.slice(1).map((e) => e.id)
        );
        expect(result.current.rows[1].options).toBe(
            critEffectsFor('save', 'fail')
        );
    });

    it('open: лише для ДМ із pending', () => {
        const dm = fakeScene({ isDM: true });

        dm.battle.pendingChoice = pending;

        expect(
            renderHook(() => useCritChoiceDialog(), { wrapper: dm.wrapper })
                .result.current.open
        ).toBe(true);

        const player = fakeScene({ isDM: false });

        player.battle.pendingChoice = pending;

        expect(
            renderHook(() => useCritChoiceDialog(), { wrapper: player.wrapper })
                .result.current.open
        ).toBe(false);
    });

    it('cancel відправляє { cancel: true }', () => {
        const scene = fakeScene({ isDM: true });

        scene.battle.pendingChoice = pending;

        const { result } = renderHook(() => useCritChoiceDialog(), {
            wrapper: scene.wrapper,
        });

        act(() => result.current.cancel());

        expect(scene.value.actions.system.mutate).toHaveBeenCalledWith({
            action: 'crit-choice',
            body: { cancel: true },
        });
    });

    it('submit відправляє choices мутацією; isSubmitting береться з мутації', () => {
        const scene = fakeScene({ isDM: true });

        scene.battle.pendingChoice = pending;

        const { result } = renderHook(() => useCritChoiceDialog(), {
            wrapper: scene.wrapper,
        });

        act(() => result.current.submit({ t0: 3, t1: 'random' }));

        expect(scene.value.actions.system.mutate).toHaveBeenCalledWith({
            action: 'crit-choice',
            body: { choices: { t0: 3, t1: 'random' } },
        });
        expect(result.current.isSubmitting).toBe(false);
    });

    it('isSubmitting: лише для crit-choice, чужа дія pending не рахується', () => {
        const scene = fakeScene({ isDM: true });

        scene.battle.pendingChoice = pending;

        const pendingAction = (action: string) =>
            Object.assign(scene.value.actions.system, {
                isPending: true,
                variables: { action, body: {} },
            });

        pendingAction('morale-check');

        const { result, rerender } = renderHook(() => useCritChoiceDialog(), {
            wrapper: scene.wrapper,
        });

        expect(result.current.isSubmitting).toBe(false);

        pendingAction('crit-choice');
        rerender();

        expect(result.current.isSubmitting).toBe(true);
    });
});
