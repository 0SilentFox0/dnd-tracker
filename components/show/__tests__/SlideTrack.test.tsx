// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CampaignTrack } from '@/types/audio';

const toggle = vi.fn();

const tracks: CampaignTrack[] = [
    {
        id: 'tr1',
        title: 'Tavern Theme',
        kind: 'file',
        url: 'https://s/c1/tavern.mp3',
        youtubeId: null,
        durationSec: 125,
        sortOrder: 0,
        createdAt: '',
    },
];

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/lib/hooks/music', () => ({
    useTracks: () => ({ data: tracks }),
    useTrackPreview: () => ({
        playingId: null,
        failedId: null,
        progress: null,
        toggle,
        stop: vi.fn(),
    }),
}));

import { SlideTrack } from '../SlideTrack';

afterEach(cleanup);

describe('SlideTrack', () => {
    it('shows the track name and plays it', () => {
        render(<SlideTrack campaignId="c1" trackId="tr1" />);
        expect(screen.getByText('Tavern Theme')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'play' }));
        expect(toggle).toHaveBeenCalledWith(tracks[0]);
    });

    it('renders nothing for a deleted track', () => {
        const { container } = render(
            <SlideTrack campaignId="c1" trackId="gone" />
        );

        expect(container.textContent).toBe('');
    });
});
