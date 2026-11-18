// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BackgroundCard } from '../../backgrounds/BackgroundCard';
import { BackgroundsList } from '../../backgrounds/BackgroundsList';
import { ClassCard } from '../ClassCard';
import { ClassesList } from '../ClassesList';

import { useBackgroundsList } from '@/lib/hooks/backgrounds';
import { useClassesList } from '@/lib/hooks/classes';
import { render } from '@/lib/i18n/test/render-uk';
import { makeClass } from '@/lib/utils/characters/classes/__tests__/class-fixtures';
import type { BackgroundData } from '@/types/backgrounds';

vi.unmock('next-intl');
vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));
vi.mock('@/lib/hooks/classes', () => ({ useClassesList: vi.fn() }));
vi.mock('@/lib/hooks/backgrounds', () => ({ useBackgroundsList: vi.fn() }));
vi.mock('@/components/content-import/ContentTransferButtons', () => ({
    ContentTransferButtons: ({ kind }: { kind: string }) => (
        <p>transfer:{kind}</p>
    ),
}));
vi.mock('../CreateClassDialog', () => ({
    CreateClassDialog: ({ open }: { open: boolean }) => (
        <p>class-dialog:{String(open)}</p>
    ),
}));
vi.mock('../../backgrounds/CreateBackgroundDialog', () => ({
    CreateBackgroundDialog: ({ open }: { open: boolean }) => (
        <p>bg-dialog:{String(open)}</p>
    ),
}));

const background = (over: Partial<BackgroundData> = {}): BackgroundData => ({
    id: 'b1',
    name: 'Acolyte',
    icon: null,
    description: null,
    choices: [],
    skillProficiencies: [],
    toolProficiencies: [],
    originFeatId: null,
    equipmentText: null,
    ...over,
});

describe('ClassCard', () => {
    afterEach(cleanup);

    it('shows hit die, caster type and the subclass count with names', () => {
        render(
            <ClassCard
                campaignId="c1"
                gameClass={makeClass({
                    name: 'Wizard',
                    hitDie: 6,
                    caster: 'full',
                    subclasses: [
                        { id: 's1', name: 'Evoker', icon: null },
                        { id: 's2', name: 'Abjurer', icon: null },
                    ] as never,
                })}
            />
        );
        expect(screen.getByText('d6')).toBeInTheDocument();
        expect(screen.getByText('Повний заклинач')).toBeInTheDocument();
        expect(screen.getByText('2 підкласи')).toBeInTheDocument();
        expect(screen.getByText('Evoker')).toBeInTheDocument();
        expect(screen.getByText('Abjurer')).toBeInTheDocument();
    });

    it('links to the editor only when editable', () => {
        const gameClass = makeClass({ id: 'k1', name: 'Rogue' });

        const { rerender } = render(
            <ClassCard campaignId="c1" gameClass={gameClass} />
        );

        expect(screen.getByRole('link', { name: 'Rogue' })).toHaveAttribute(
            'href',
            '/campaigns/c1/dm/classes/k1'
        );

        rerender(
            <ClassCard campaignId="c1" gameClass={gameClass} canEdit={false} />
        );
        expect(screen.queryByRole('link')).toBeNull();
    });
});

describe('BackgroundCard', () => {
    afterEach(cleanup);

    it('shows the choices badge only when the background has choices', () => {
        const { rerender } = render(
            <BackgroundCard campaignId="c1" background={background()} />
        );

        expect(screen.queryByText(/вибір|вибори|виборів/)).toBeNull();

        rerender(
            <BackgroundCard
                campaignId="c1"
                background={background({
                    choices: [{}, {}, {}] as BackgroundData['choices'],
                })}
            />
        );
        expect(screen.getByText('3 вибори')).toBeInTheDocument();
    });

    it('links to the background editor', () => {
        render(<BackgroundCard campaignId="c1" background={background()} />);
        expect(screen.getByRole('link', { name: 'Acolyte' })).toHaveAttribute(
            'href',
            '/campaigns/c1/dm/backgrounds/b1'
        );
    });
});

const classesList = (over: Partial<ReturnType<typeof useClassesList>> = {}) =>
    ({
        classes: [],
        isLoading: false,
        createDialog: { open: false, setOpen: vi.fn() },
        actions: { createClass: vi.fn(), deleteClass: vi.fn() },
        ...over,
    }) as unknown as ReturnType<typeof useClassesList>;

describe('ClassesList', () => {
    beforeEach(() => vi.mocked(useClassesList).mockReset());
    afterEach(cleanup);

    it('shows the empty state for an editor, with create and transfer controls', () => {
        vi.mocked(useClassesList).mockReturnValue(classesList());
        render(<ClassesList campaignId="c1" />);
        expect(screen.getByText('Ще немає класів')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /Новий клас/ })
        ).toBeInTheDocument();
        expect(screen.getByText('transfer:classes')).toBeInTheDocument();
        expect(screen.getByText('class-dialog:false')).toBeInTheDocument();
    });

    it('a viewer gets no create, transfer or dialog, and no edit links', () => {
        vi.mocked(useClassesList).mockReturnValue(
            classesList({ classes: [makeClass({ name: 'Monk' })] })
        );
        render(<ClassesList campaignId="c1" canEdit={false} />);
        expect(screen.getByText('Monk')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Новий клас/ })).toBeNull();
        expect(screen.queryByText(/transfer:|class-dialog/)).toBeNull();
        expect(screen.queryByRole('link')).toBeNull();
    });

    it('shows loading instead of the empty state while the first load runs', () => {
        vi.mocked(useClassesList).mockReturnValue(
            classesList({ isLoading: true })
        );
        render(<ClassesList campaignId="c1" />);
        expect(screen.queryByText('Ще немає класів')).toBeNull();
    });

    it('opens the create dialog through the list hook', () => {
        const list = classesList();

        vi.mocked(useClassesList).mockReturnValue(list);
        render(<ClassesList campaignId="c1" />);
        screen.getByRole('button', { name: /Новий клас/ }).click();
        expect(list.createDialog.setOpen).toHaveBeenCalledWith(true);
    });
});

const bgList = (items: BackgroundData[], isLoading = false) =>
    ({
        items,
        isLoading,
        createDialog: { open: false, setOpen: vi.fn() },
        create: vi.fn(),
        remove: vi.fn(),
    }) as unknown as ReturnType<typeof useBackgroundsList>;

describe('BackgroundsList', () => {
    beforeEach(() => vi.mocked(useBackgroundsList).mockReset());
    afterEach(cleanup);

    it('empty editor view offers creation; the cards render when items exist', () => {
        vi.mocked(useBackgroundsList).mockReturnValue(bgList([]));

        const { rerender } = render(<BackgroundsList campaignId="c1" />);

        expect(screen.getByText('Ще немає передісторій')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /Нова передісторія/ })
        ).toBeInTheDocument();
        expect(screen.getByText('transfer:backgrounds')).toBeInTheDocument();

        vi.mocked(useBackgroundsList).mockReturnValue(bgList([background()]));
        rerender(<BackgroundsList campaignId="c1" />);
        expect(screen.getByText('Acolyte')).toBeInTheDocument();
        expect(screen.getByText('1 у кампанії')).toBeInTheDocument();
    });

    it('a viewer has no edit controls', () => {
        vi.mocked(useBackgroundsList).mockReturnValue(bgList([background()]));
        render(<BackgroundsList campaignId="c1" canEdit={false} />);
        expect(
            screen.queryByRole('button', { name: /Нова передісторія/ })
        ).toBeNull();
        expect(screen.queryByText(/transfer:|bg-dialog/)).toBeNull();
    });
});
