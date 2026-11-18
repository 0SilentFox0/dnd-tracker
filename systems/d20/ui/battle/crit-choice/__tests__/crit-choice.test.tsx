// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CritChoiceDialog } from '../CritChoiceDialog';
import { CritChoiceWaitingBanner } from '../CritChoiceWaitingBanner';

import '@/components/ui/__tests__/match-media';
import { useBattleScene } from '@/lib/hooks/battle';
import { render } from '@/lib/i18n/test/render-uk';
import { critEffectsFor } from '@/lib/utils/battle/crit-choice/catalog';
import { useCritChoiceDialog } from '@/systems/d20/hooks/battle/useCritChoiceDialog';

vi.unmock('next-intl');
vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));
vi.mock('@/systems/d20/hooks/battle/useCritChoiceDialog', () => ({
    useCritChoiceDialog: vi.fn(),
}));
vi.mock('@/lib/hooks/battle', () => ({ useBattleScene: vi.fn() }));

type Dialog = ReturnType<typeof useCritChoiceDialog>;

const [e1, e2] = critEffectsFor('attack', 'success');

const dialog = (over: Partial<Dialog> = {}): Dialog => ({
    open: true,
    rows: [
        {
            trigger: {
                key: 't1',
                source: 'attack',
                kind: 'success',
                actorId: 'a',
                targetId: 'b',
            },
            actorName: 'Ельф',
            targetName: 'Гоблін',
            options: [e1, e2],
        },
        {
            trigger: {
                key: 't2',
                source: 'save',
                kind: 'fail',
                actorId: 'a',
                targetId: 'c',
            },
            actorName: 'Ельф',
            targetName: 'Орк',
            options: critEffectsFor('save', 'fail').slice(0, 1),
        },
    ],
    submit: vi.fn(),
    cancel: vi.fn(),
    isSubmitting: false,
    ...over,
});

describe('CritChoiceDialog', () => {
    beforeEach(() => vi.mocked(useCritChoiceDialog).mockReset());
    afterEach(cleanup);

    it('renders nothing when closed', () => {
        vi.mocked(useCritChoiceDialog).mockReturnValue(dialog({ open: false }));
        render(<CritChoiceDialog />);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('titles attack and save rows differently', () => {
        vi.mocked(useCritChoiceDialog).mockReturnValue(dialog());
        render(<CritChoiceDialog />);
        expect(
            screen.getByText('Ельф → Гоблін: Критична удача')
        ).toBeInTheDocument();
        expect(screen.getByText('Рятівний кидок: Орк')).toBeInTheDocument();
        expect(screen.getByText('Подвійний урон')).toBeInTheDocument();
    });

    it('confirm stays disabled until every row has a choice, then submits them', () => {
        const d = dialog();

        vi.mocked(useCritChoiceDialog).mockReturnValue(d);
        render(<CritChoiceDialog />);

        const confirm = screen.getByRole('button', { name: 'Підтвердити' });

        expect(confirm).toBeDisabled();

        fireEvent.click(screen.getAllByRole('radio')[1]);
        expect(confirm).toBeDisabled();

        fireEvent.click(
            screen.getAllByRole('button', { name: 'Випадково' })[1]
        );
        expect(confirm).toBeEnabled();
        fireEvent.submit(document.getElementById('crit-choice-form')!);
        expect(d.submit).toHaveBeenCalledWith({ t1: e2.id, t2: 'random' });
    });

    it('random-for-all submits random for every row without picking', () => {
        const d = dialog();

        vi.mocked(useCritChoiceDialog).mockReturnValue(d);
        render(<CritChoiceDialog />);
        fireEvent.click(
            screen.getByRole('button', { name: 'Випадково для всіх' })
        );
        expect(d.submit).toHaveBeenCalledWith({ t1: 'random', t2: 'random' });
    });

    it('cancel calls cancel; submitting disables every action', () => {
        const d = dialog();

        vi.mocked(useCritChoiceDialog).mockReturnValue(d);

        const { unmount } = render(<CritChoiceDialog />);

        fireEvent.click(screen.getByRole('button', { name: 'Скасувати дію' }));
        expect(d.cancel).toHaveBeenCalledTimes(1);
        unmount();

        vi.mocked(useCritChoiceDialog).mockReturnValue(
            dialog({ isSubmitting: true })
        );
        render(<CritChoiceDialog />);
        for (const name of [
            'Скасувати дію',
            'Випадково для всіх',
            'Підтвердити',
        ])
            expect(screen.getByRole('button', { name })).toBeDisabled();
    });
});

describe('CritChoiceWaitingBanner', () => {
    afterEach(cleanup);

    const scene = (isDM: boolean, pendingChoice: unknown) =>
        ({
            battle: { pendingChoice },
            viewer: { isDM },
        }) as unknown as ReturnType<typeof useBattleScene>;

    it.each([
        ['a player while the DM is choosing', false, { triggers: [] }, true],
        ['the DM', true, { triggers: [] }, false],
        ['a player with nothing pending', false, null, false],
    ])('%s', (_n, isDM, pending, shown) => {
        vi.mocked(useBattleScene).mockReturnValue(scene(isDM, pending));
        render(<CritChoiceWaitingBanner />);
        expect(screen.queryByRole('status') !== null).toBe(shown);

        if (shown)
            expect(screen.getByRole('status')).toHaveTextContent(
                'ДМ обирає ефект…'
            );
    });
});
