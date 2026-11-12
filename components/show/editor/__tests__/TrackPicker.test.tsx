// @vitest-environment happy-dom
import { NextIntlClientProvider } from 'next-intl';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TrackPicker } from '../TrackPicker';

import music from '@/messages/uk/music.json';
import show from '@/messages/uk/show.json';

const toggle = vi.hoisted(() => vi.fn());

vi.unmock('next-intl');
vi.mock('@/lib/hooks/music', () => ({
    useTracks: () => ({
        data: [
            { id: 't1', title: 'Таверна', kind: 'file', url: 'u', group: null },
        ],
    }),
    useTrackPreview: () => ({
        playingId: null,
        failedId: null,
        progress: null,
        toggle,
        stop: vi.fn(),
    }),
}));

afterEach(cleanup);

describe('TrackPicker', () => {
    it('кнопка прослуховування не вибирає трек', () => {
        const onChange = vi.fn();

        render(
            <NextIntlClientProvider locale="uk" messages={{ music, show }}>
                <TrackPicker
                    campaignId="c"
                    value={undefined}
                    onChange={onChange}
                />
            </NextIntlClientProvider>
        );

        fireEvent.click(
            screen.getByRole('button', { name: /Слухати: Таверна/ })
        );

        expect(toggle).toHaveBeenCalled();
        expect(onChange).not.toHaveBeenCalled();
    });
});
