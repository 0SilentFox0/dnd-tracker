import type { CampaignTrack } from '@/types/audio';

export function trackLink(
    track: Pick<CampaignTrack, 'kind' | 'url' | 'youtubeId'>
): string | null {
    if (track.kind === 'youtube')
        return track.youtubeId ? `https://youtu.be/${track.youtubeId}` : null;

    return track.url;
}
