// @vitest-environment happy-dom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CatalogRow } from '@/components/battle/setup/participants/CatalogRow';
import {
    ParticipantCatalog,
    type SetupData,
} from '@/components/battle/setup/participants/ParticipantCatalog';
import { ParticipantSide, ParticipantSourceType } from '@/lib/constants/battle';
import type { CatalogTab, ParticipantActions } from '@/lib/hooks/battles';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.sessionStorage.clear();
});

const entity = { id: 'e1', name: 'Скелет', avatar: null };

function rowActions() {
    return {
        add: vi.fn(),
        setSide: vi.fn(),
        setQuantity: vi.fn(),
        remove: vi.fn(),
    };
}

describe('CatalogRow', () => {
    it('кнопки +Союзник/+Ворог додають на правильну сторону з aria-label', () => {
        const actions = rowActions();

        render(
            <CatalogRow
                entity={entity}
                kind="unit"
                stats={null}
                state={null}
                actions={actions}
            />
        );

        fireEvent.click(screen.getByLabelText(/participants\.addAlly/));
        fireEvent.click(screen.getByLabelText(/participants\.addEnemy/));
        expect(actions.add.mock.calls).toEqual([
            [ParticipantSide.ALLY],
            [ParticipantSide.ENEMY],
        ]);
    });

    it('клік по рядку: герой -> союзники, істота -> вороги, повторний -> remove', () => {
        const hero = rowActions();

        const { rerender } = render(
            <CatalogRow
                entity={entity}
                kind="hero"
                stats={null}
                state={null}
                actions={hero}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /Скелет/ }));
        expect(hero.add).toHaveBeenCalledWith(ParticipantSide.ALLY);

        const unit = rowActions();

        rerender(
            <CatalogRow
                entity={entity}
                kind="unit"
                stats={null}
                state={null}
                actions={unit}
            />
        );
        fireEvent.click(screen.getByRole('button', { name: /Скелет/ }));
        expect(unit.add).toHaveBeenCalledWith(ParticipantSide.ENEMY);

        rerender(
            <CatalogRow
                entity={entity}
                kind="unit"
                stats={null}
                state={{ side: ParticipantSide.ENEMY, quantity: 2 }}
                actions={unit}
            />
        );
        fireEvent.click(screen.getByRole('button', { name: /Скелет/ }));
        expect(unit.remove).toHaveBeenCalledTimes(1);
    });

    it('обраний: сегмент змінює сторону, степер кількість, ✕ прибирає', () => {
        const actions = rowActions();

        render(
            <CatalogRow
                entity={entity}
                kind="unit"
                stats={null}
                state={{ side: ParticipantSide.ENEMY, quantity: 3 }}
                actions={actions}
            />
        );

        fireEvent.click(
            screen.getByRole('radio', { name: 'battleSetup.participants.ally' })
        );
        expect(actions.setSide).toHaveBeenCalledWith(ParticipantSide.ALLY);

        fireEvent.click(screen.getByLabelText(/participants\.quantityMore/));
        fireEvent.click(screen.getByLabelText(/participants\.quantityLess/));
        expect(actions.setQuantity.mock.calls).toEqual([[4], [2]]);

        fireEvent.click(screen.getByLabelText(/participants\.remove/));
        expect(actions.remove).toHaveBeenCalledTimes(1);
    });

    it('герой без степера кількості', () => {
        render(
            <CatalogRow
                entity={entity}
                kind="hero"
                stats={null}
                state={{ side: ParticipantSide.ALLY }}
                actions={rowActions()}
            />
        );
        expect(screen.queryByLabelText(/quantityMore/)).toBeNull();
    });
});

const data = {
    characters: [{ id: 'h1', name: 'Зехір', avatar: null }],
    playerCharacters: [{ id: 'h1', name: 'Зехір', avatar: null }],
    npcCharacters: [],
    units: [
        {
            id: 'u1',
            name: 'Вовк',
            raceId: 'r1',
            raceName: 'Звірі',
            avatar: null,
            level: 1,
        },
    ],
    races: [],
    entityStats: null,
} as unknown as SetupData;

function renderCatalog(actions: Partial<ParticipantActions> = {}) {
    const all = {
        addToSide: vi.fn(),
        setQuantity: vi.fn(),
        remove: vi.fn(),
        ...actions,
    } as unknown as ParticipantActions;

    function Harness() {
        const [tab, setTab] = useState<CatalogTab>('heroes');

        return (
            <ParticipantCatalog
                data={data}
                entityStats={null}
                selection={[]}
                actions={all}
                tab={{ tab, set: setTab }}
            />
        );
    }

    render(<Harness />);

    return all;
}

describe('ParticipantCatalog', () => {
    it('сегмент перемикає героїв і істот; додавання через addToSide', () => {
        const actions = renderCatalog();

        fireEvent.click(screen.getByLabelText(/addAlly/));
        expect(actions.addToSide).toHaveBeenCalledWith(
            'h1',
            ParticipantSourceType.CHARACTER,
            ParticipantSide.ALLY
        );

        fireEvent.click(screen.getByRole('radio', { name: /tabUnits/ }));
        fireEvent.click(screen.getByLabelText(/addEnemy/));
        expect(actions.addToSide).toHaveBeenLastCalledWith(
            'u1',
            ParticipantSourceType.UNIT,
            ParticipantSide.ENEMY
        );
    });

    it('sessionStorage кидає: групи розгорнуті, без винятку', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('denied');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('denied');
        });

        renderCatalog();

        expect(screen.getByText('Зехір')).toBeTruthy();
    });
});
