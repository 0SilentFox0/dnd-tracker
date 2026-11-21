// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MarkerStyleFields } from '../MarkerStyleFields';

import { render } from '@/components/ui/__tests__/uk-intl';
import type { useMarkerFields } from '@/lib/hooks/world';
import type { WorldMarker } from '@/types/world';

vi.unmock('next-intl');

afterEach(cleanup);

const layer = { color: '#00aa00', icon: 'castle', zoneOpacity: null };

const marker = (o: Partial<WorldMarker> = {}) =>
    ({ id: 'k', kind: 'point', icon: null, color: null, ...o }) as WorldMarker;

const form = (o: Record<string, unknown> = {}) => {
    const f = {
        color: null,
        colorValue: '#d3b060',
        isCustomColor: false,
        pickColor: vi.fn(),
        resetColor: vi.fn(),
        labelMode: null,
        setLabelMode: vi.fn(),
        fillOpacity: null,
        changeFillOpacity: vi.fn(),
        save: vi.fn(),
        ...o,
    };

    return f as unknown as ReturnType<typeof useMarkerFields> & typeof f;
};

describe('MarkerStyleFields', () => {
    it('marks colour and icon as inherited and offers no reset', () => {
        render(
            <MarkerStyleFields marker={marker()} layer={layer} form={form()} />
        );

        expect(screen.getAllByText(/успадковано від шару/)).toHaveLength(2);
        expect(
            screen.queryByRole('button', { name: /Наслідувати від шару/ })
        ).toBeNull();
    });

    it('shows nothing inherited without a layer', () => {
        render(<MarkerStyleFields marker={marker()} form={form()} />);

        expect(screen.queryByText(/успадковано від шару/)).toBeNull();
    });

    it('resets an own colour and icon to null when the marker has a layer', () => {
        const f = form({ color: '#ff0000' });

        render(
            <MarkerStyleFields
                marker={marker({ icon: 'city', color: '#ff0000' })}
                layer={layer}
                form={f}
            />
        );

        const [colour, icon] = screen.getAllByRole('button', {
            name: /Наслідувати від шару/,
        });

        fireEvent.click(colour);
        fireEvent.click(icon);

        expect(f.resetColor).toHaveBeenCalled();
        expect(f.save).toHaveBeenCalledWith({ icon: null });
    });

    it('zones get the label mode and opacity fields, points do not', () => {
        const { rerender } = render(
            <MarkerStyleFields marker={marker()} layer={layer} form={form()} />
        );

        expect(screen.queryByRole('slider')).toBeNull();

        rerender(
            <MarkerStyleFields
                marker={marker({ kind: 'zone' })}
                layer={layer}
                form={form()}
            />
        );

        expect(
            screen.getByRole('slider', { name: 'Прозорість зони' })
        ).toBeTruthy();
        expect(
            screen.getByRole('combobox', { name: 'Підпис зони' })
        ).toBeTruthy();
    });

    it('slider changes and the reset button send the opacity', () => {
        const f = form({ fillOpacity: 0.4 });

        render(
            <MarkerStyleFields
                marker={marker({ kind: 'zone' })}
                layer={layer}
                form={f}
            />
        );

        fireEvent.change(screen.getByRole('slider'), {
            target: { value: '0.8' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Наслідувати' }));

        expect(f.changeFillOpacity).toHaveBeenNthCalledWith(1, 0.8);
        expect(f.changeFillOpacity).toHaveBeenNthCalledWith(2, null);
    });
});
