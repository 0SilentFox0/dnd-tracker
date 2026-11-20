// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorldEnemies } from '../WorldEnemies';

import { render } from '@/components/ui/__tests__/uk-intl';
import type { WorldEnemyPin } from '@/types/world';

vi.unmock('next-intl');

afterEach(cleanup);

const enemy = (over: Partial<WorldEnemyPin> = {}): WorldEnemyPin => ({
    id: 'e1',
    mapId: 'm',
    name: 'Огр',
    icon: null,
    color: null,
    dmNote: null,
    x: 0.3,
    y: 0.4,
    ...over,
});

const setup = (over: { drag?: boolean; selectedId?: string } = {}) => {
    const onEnemyClick = vi.fn();

    const onEnemyDrag = vi.fn();

    render(
        <WorldEnemies
            enemies={[enemy()]}
            zoom={2}
            selectedId={over.selectedId}
            toPoint={(x, y) => ({ x: x / 1000, y: y / 1000 })}
            handlers={{
                onEnemyClick,
                onEnemyDrag: over.drag === false ? undefined : onEnemyDrag,
            }}
        />
    );

    return {
        onEnemyClick,
        onEnemyDrag,
        pin: screen.getByRole('button', { name: 'Огр' }),
    };
};

describe('WorldEnemies', () => {
    it('renders a pin with the DM-only badge, scaled against the zoom', () => {
        const { pin } = setup();

        expect(pin.textContent).toContain('лише ДМ');
        expect(pin.style.left).toBe('30%');
        expect(pin.style.transform).toContain('scale(0.5)');
    });

    it('marks the selected pin', () => {
        const { pin } = setup({ selectedId: 'e1' });

        expect(pin.dataset.selected).toBe('true');
    });

    it('a click reports the enemy', () => {
        const { pin, onEnemyClick, onEnemyDrag } = setup();

        fireEvent.pointerDown(pin, { clientX: 100, clientY: 100 });
        fireEvent.pointerUp(pin, { clientX: 101, clientY: 100 });

        expect(onEnemyClick).toHaveBeenCalledWith('e1');
        expect(onEnemyDrag).not.toHaveBeenCalled();
    });

    it('a drag reports the new coordinates and is not a click', () => {
        const { pin, onEnemyClick, onEnemyDrag } = setup();

        fireEvent.pointerDown(pin, { clientX: 100, clientY: 100 });
        fireEvent.pointerMove(pin, { clientX: 600, clientY: 500 });

        expect(pin.style.left).toBe('60%');

        fireEvent.pointerUp(pin, { clientX: 600, clientY: 500 });

        expect(onEnemyDrag).toHaveBeenCalledWith('e1', { x: 0.6, y: 0.5 });
        expect(onEnemyClick).not.toHaveBeenCalled();
    });

    it('without a drag handler a long movement is still a click', () => {
        const { pin, onEnemyClick } = setup({ drag: false });

        fireEvent.pointerDown(pin, { clientX: 100, clientY: 100 });
        fireEvent.pointerMove(pin, { clientX: 600, clientY: 500 });
        fireEvent.pointerUp(pin, { clientX: 600, clientY: 500 });

        expect(onEnemyClick).toHaveBeenCalledWith('e1');
    });
});
