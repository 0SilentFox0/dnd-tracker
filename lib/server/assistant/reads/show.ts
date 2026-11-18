import { z } from 'zod';

import { readAction } from './define';

import 'server-only';
import { readShowState } from '@/lib/server/show/show-store';

export async function showSummary(campaignId: string): Promise<string | null> {
    const s = await readShowState(campaignId);

    if (!s?.slide) return null;

    return [
        `Deck: ${s.deckTitle ?? '—'}`,
        `Slide: ${s.slide.title ?? 'untitled'}`,
        s.slide.caption && `Caption: ${s.slide.caption}`,
        s.battle && `Players are called to battle: ${s.battle.name}`,
    ]
        .filter(Boolean)
        .join('\n');
}

export const showStateInput = z.strictObject({});

export const SHOW_STATE_ACTION = readAction({
    id: 'show.state',
    title: 'Current show',
    description: 'What the players currently see on the show screen.',
    scope: 'show:read',
    input: showStateInput,
    run: async ({ campaignId }) =>
        (await showSummary(campaignId)) ?? 'No show is running right now',
});
