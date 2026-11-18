import { Prisma } from '@prisma/client';
import { z } from 'zod';

import 'server-only';
import { prisma } from '@/lib/db';
import { SHOW_STATE_EVENT, showChannelName } from '@/lib/pusher/channels';
import { safePusherTrigger } from '@/lib/pusher/safe-trigger';
import { pusherServer } from '@/lib/pusher/server';
import {
    storedShowBattleSchema,
    storedShowCoverSchema,
    storedShowWorldSchema,
    storedSlideTrailSchema,
} from '@/lib/schemas/show';
import { isRestricted, toClientShow } from '@/lib/utils/show/player-view';
import {
    withoutBattle,
    withoutWorldTargets,
} from '@/lib/utils/show/show-command';
import type { BattleAudioState } from '@/types/audio';
import type { PuzzleState, ShowEvent, ShowState, Slide } from '@/types/show';

const SHOW_SELECT = {
    deckId: true,
    deckTitle: true,
    slide: true,
    nextImageUrl: true,
    audio: true,
    battle: true,
    cover: true,
    curtain: true,
    world: true,
    trail: true,
    seq: true,
} as const;

type ShowRow = Prisma.CampaignShowGetPayload<{ select: typeof SHOW_SELECT }>;

type StoredSlide = Slide & { puzzleState?: PuzzleState };

/** Puzzle state lives inside the slide JSONB under `puzzleState` (the slide `puzzle` holds the slicing params). */
function splitSlide(raw: unknown): {
    slide: Slide | null;
    puzzle?: PuzzleState;
} {
    if (!raw) return { slide: null };

    const { puzzleState, ...slide } = raw as StoredSlide;

    return { slide, ...(puzzleState ? { puzzle: puzzleState } : {}) };
}

function optionalField<K extends string, T>(
    key: K,
    schema: z.ZodType<T>,
    value: unknown
): { [P in K]?: T } {
    if (!value) return {};

    const parsed = schema.safeParse(value);

    if (!parsed.success) {
        console.warn(`[show] invalid stored ${key} dropped`);

        return {};
    }

    return { [key]: parsed.data } as { [P in K]?: T };
}

export function toShowState(row: ShowRow): ShowState {
    const { slide, puzzle } = splitSlide(row.slide);

    return {
        deckId: row.deckId,
        deckTitle: row.deckTitle,
        slide,
        nextImageUrl: row.nextImageUrl,
        audio: (row.audio ?? null) as BattleAudioState | null,
        ...optionalField('battle', storedShowBattleSchema, row.battle),
        ...optionalField('cover', storedShowCoverSchema, row.cover),
        ...(row.curtain ? { curtain: true as const } : {}),
        ...optionalField('world', storedShowWorldSchema, row.world),
        ...(puzzle ? { puzzle } : {}),
        ...(Array.isArray(row.trail) && row.trail.length > 0
            ? optionalField('trail', storedSlideTrailSchema, row.trail)
            : {}),
        seq: row.seq,
    };
}

export async function readShowState(
    campaignId: string
): Promise<ShowState | null> {
    const row = await prisma.campaignShow.findUnique({
        where: { campaignId },
        select: SHOW_SELECT,
    });

    return row ? toShowState(row) : null;
}

const json = (v: unknown) =>
    v === null ? Prisma.DbNull : (v as Prisma.InputJsonValue);

/** An untouched field is not written back: a stored value dropped as invalid on read must not be wiped by the next write */
const unchangedOr = (
    prev: ShowState | null,
    next: ShowState,
    key: 'battle' | 'cover' | 'world'
) =>
    prev && prev[key] === next[key] ? {} : { [key]: json(next[key] ?? null) };

/** Optimistic locking by seq; the row is created by the first write and never deleted. */
export async function writeShowState(
    campaignId: string,
    prev: ShowState | null,
    next: ShowState
): Promise<boolean> {
    const data = {
        deckId: next.deckId,
        deckTitle: next.deckTitle,
        slide: json(
            next.slide && next.puzzle
                ? { ...next.slide, puzzleState: next.puzzle }
                : next.slide
        ),
        nextImageUrl: next.nextImageUrl,
        audio: json(next.audio),
        ...unchangedOr(prev, next, 'battle'),
        ...unchangedOr(prev, next, 'cover'),
        curtain: !!next.curtain,
        ...unchangedOr(prev, next, 'world'),
        seq: next.seq,
        ...(prev && prev.trail === next.trail
            ? {}
            : { trail: json(next.trail?.length ? next.trail : null) }),
    };

    if (!prev) {
        const { count } = await prisma.campaignShow.createMany({
            data: [{ campaignId, ...data }],
            skipDuplicates: true,
        });

        return count === 1;
    }

    const { count } = await prisma.campaignShow.updateMany({
        where: { campaignId, seq: prev.seq },
        data,
    });

    return count === 1;
}

/** Call from after(): Pusher must not delay the response. */
export function publishShow(
    campaignId: string,
    show: ShowState,
    options: { strict?: boolean } = {}
): Promise<void> {
    const event: ShowEvent = {
        campaignId,
        seq: show.seq,
        ...(isRestricted(show) ? {} : { show: toClientShow(show) }),
    };

    if (options.strict)
        return pusherServer
            .trigger(showChannelName(campaignId), SHOW_STATE_EVENT, event)
            .then(() => undefined);

    return safePusherTrigger(
        pusherServer,
        showChannelName(campaignId),
        SHOW_STATE_EVENT,
        event,
        { action: 'show state' }
    );
}

const CLEAR_ATTEMPTS = 3;

export async function clearShowBattle(
    campaignId: string,
    battleId: string,
    options: { strict?: boolean } = {}
): Promise<void> {
    try {
        for (let attempt = 0; attempt < CLEAR_ATTEMPTS; attempt++) {
            const show = await readShowState(campaignId);

            const next = withoutBattle(show, battleId);

            if (!show) return;

            if (!next) {
                if (options.strict)
                    await publishShow(campaignId, show, options);

                return;
            }

            if (await writeShowState(campaignId, show, next)) {
                await publishShow(campaignId, next, options);

                return;
            }
        }

        if (options.strict) throw new Error('Show update conflict');
    } catch (error) {
        if (options.strict) throw error;

        console.error('[show] clear battle call failed', error);
    }
}

export async function clearShowWorld(
    campaignId: string,
    gone: { mapIds: string[]; markerIds: string[] }
): Promise<void> {
    try {
        for (let attempt = 0; attempt < CLEAR_ATTEMPTS; attempt++) {
            const show = await readShowState(campaignId);

            const next = withoutWorldTargets(show, gone);

            if (!show || !next) return;

            if (await writeShowState(campaignId, show, next)) {
                await publishShow(campaignId, next);

                return;
            }
        }
    } catch (error) {
        console.error('[show] clear world failed', error);
    }
}
