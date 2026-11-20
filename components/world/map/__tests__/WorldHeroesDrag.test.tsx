// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorldHeroes } from '../WorldHeroes';

import { render } from '@/components/ui/__tests__/uk-intl';
import type { WorldHero } from '@/types/world';

vi.unmock('next-intl');

vi.mock('next/image', () => ({
    default: (p: { alt: string }) => <img alt={p.alt} />,
}));

afterEach(cleanup);

const hero = (o: Partial<WorldHero>): WorldHero => ({
    id: 'h',
    name: 'Арвен',
    avatar: null,
    mapId: 'map',
    x: 0.2,
    y: 0.2,
    own: false,
    ...o,
});

const box = { width: 800, height: 600 };

const setup = (selected: string[] = []) => {
    const onDrop = vi.fn();

    const onHeroClick = vi.fn();

    render(
        <WorldHeroes
            zoom={1}
            box={box}
            onHeroClick={onHeroClick}
            heroes={[
                hero({ id: 'a', name: 'Арвен', x: 0.2 }),
                hero({ id: 'b', name: 'Борін', x: 0.8 }),
            ]}
            drag={{
                selected,
                toPoint: (x, y) => ({ x: x / 1000, y: y / 1000 }),
                onDrop,
            }}
        />
    );

    return {
        onDrop,
        onHeroClick,
        pin: screen.getByRole('button', { name: 'Арвен' }),
    };
};

describe('WorldHeroes drag', () => {
    it('a movement below the threshold is a click', () => {
        const { onDrop, onHeroClick, pin } = setup();

        fireEvent.pointerDown(pin, { clientX: 100, clientY: 100 });
        fireEvent.pointerMove(pin, { clientX: 102, clientY: 101 });
        fireEvent.pointerUp(pin, { clientX: 102, clientY: 101 });

        expect(onHeroClick).toHaveBeenCalledWith('a');
        expect(onDrop).not.toHaveBeenCalled();
    });

    it('a longer movement drops the hero and is not a click', () => {
        const { onDrop, onHeroClick, pin } = setup();

        fireEvent.pointerDown(pin, { clientX: 100, clientY: 100 });
        fireEvent.pointerMove(pin, { clientX: 500, clientY: 400 });

        expect(screen.getByTestId('hero-drag-ghost')).toBeTruthy();

        fireEvent.pointerUp(pin, { clientX: 500, clientY: 400 });

        expect(onDrop).toHaveBeenCalledWith(['a'], { x: 0.5, y: 0.4 });
        expect(onHeroClick).not.toHaveBeenCalled();
        expect(screen.queryByTestId('hero-drag-ghost')).toBeNull();
    });

    it('a selected hero drags the whole selection', () => {
        const { onDrop, pin } = setup(['a', 'b']);

        fireEvent.pointerDown(pin, { clientX: 100, clientY: 100 });
        fireEvent.pointerMove(pin, { clientX: 500, clientY: 400 });
        fireEvent.pointerUp(pin, { clientX: 500, clientY: 400 });

        expect(onDrop).toHaveBeenCalledWith(['a', 'b'], { x: 0.5, y: 0.4 });
    });

    it('Escape cancels the drag', () => {
        const { onDrop, pin } = setup();

        fireEvent.pointerDown(pin, { clientX: 100, clientY: 100 });
        fireEvent.pointerMove(pin, { clientX: 500, clientY: 400 });
        fireEvent.keyDown(window, { key: 'Escape' });
        fireEvent.pointerUp(pin, { clientX: 500, clientY: 400 });

        expect(onDrop).not.toHaveBeenCalled();
    });

    it('does not drag without the drag prop', () => {
        const onHeroClick = vi.fn();

        render(
            <WorldHeroes
                zoom={1}
                box={box}
                heroes={[hero({})]}
                onHeroClick={onHeroClick}
            />
        );

        const pin = screen.getByRole('button', { name: 'Арвен' });

        fireEvent.pointerDown(pin, { clientX: 0, clientY: 0 });
        fireEvent.pointerMove(pin, { clientX: 300, clientY: 300 });

        expect(screen.queryByTestId('hero-drag-ghost')).toBeNull();
    });
});
