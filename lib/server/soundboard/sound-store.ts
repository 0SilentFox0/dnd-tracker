import type { CampaignSound } from '@prisma/client';

import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    BUILTIN_SOUND_IDS,
    MAX_SOUNDS_PER_CAMPAIGN,
} from '@/lib/constants/soundboard';
import { prisma } from '@/lib/db';
import {
    removeSoundObject,
    soundObjectPath,
    soundPathOwnedBy,
    verifyUploadedSound,
} from '@/lib/supabase/soundboard-storage';
import { ContentError } from '@/lib/utils/api/content-error';
import type { CustomSoundRow, Sound, SoundList } from '@/types/soundboard';

const SOUND_ORDER = [
    { sortOrder: 'asc' as const },
    { createdAt: 'asc' as const },
];

const toRow = (row: CampaignSound): CustomSoundRow => ({
    id: row.id,
    name: row.name,
    url: row.url,
    volume: row.volume,
    color: row.color,
    icon: row.icon,
    sortOrder: row.sortOrder,
    durationMs: row.durationMs,
});

const toSound = (row: CampaignSound): Sound => ({
    ...toRow(row),
    source: 'custom',
});

async function hiddenBuiltinOf(campaignId: string): Promise<string[]> {
    const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { hiddenBuiltinSounds: true },
    });

    return campaign?.hiddenBuiltinSounds ?? [];
}

async function ownedSound(
    campaignId: string,
    soundId: string
): Promise<CampaignSound> {
    const row = await prisma.campaignSound.findFirst({
        where: { id: soundId, campaignId },
    });

    if (!row) throw new ContentError(API_ERRORS.SOUND_NOT_FOUND, 404);

    return row;
}

export async function listSounds(campaignId: string): Promise<SoundList> {
    const [rows, hiddenBuiltin] = await Promise.all([
        prisma.campaignSound.findMany({
            where: { campaignId },
            orderBy: SOUND_ORDER,
        }),
        hiddenBuiltinOf(campaignId),
    ]);

    return { sounds: rows.map(toRow), hiddenBuiltin };
}

export async function soundsVersion(campaignId: string): Promise<string> {
    const [agg, hidden] = await Promise.all([
        prisma.campaignSound.aggregate({
            where: { campaignId },
            _count: true,
            _max: { createdAt: true },
        }),
        hiddenBuiltinOf(campaignId),
    ]);

    return `${agg._count}-${agg._max.createdAt?.getTime() ?? 0}-${hidden.length}`;
}

export async function createSound(
    campaignId: string,
    input: {
        path: string;
        name: string;
        durationMs?: number;
        color?: string;
        icon?: string;
    }
): Promise<Sound> {
    const count = await prisma.campaignSound.count({ where: { campaignId } });

    if (count >= MAX_SOUNDS_PER_CAMPAIGN)
        throw new ContentError(API_ERRORS.SOUND_LIMIT, 400);

    if (!soundPathOwnedBy(input.path, campaignId))
        throw new ContentError(API_ERRORS.FORBIDDEN, 403);

    const verified = await verifyUploadedSound(input.path);

    if (!verified.ok) throw new ContentError(verified.message, 400);

    const last = await prisma.campaignSound.aggregate({
        where: { campaignId },
        _max: { sortOrder: true },
    });

    const row = await prisma.campaignSound.create({
        data: {
            campaignId,
            name: input.name,
            url: verified.value,
            durationMs: input.durationMs,
            color: input.color,
            icon: input.icon,
            sortOrder: (last._max.sortOrder ?? -1) + 1,
        },
    });

    return toSound(row);
}

export async function updateSound(
    campaignId: string,
    soundId: string,
    patch: {
        name?: string;
        volume?: number;
        color?: string | null;
        icon?: string | null;
    }
): Promise<Sound> {
    await ownedSound(campaignId, soundId);

    return toSound(
        await prisma.campaignSound.update({
            where: { id: soundId },
            data: patch,
        })
    );
}

export async function deleteSound(
    campaignId: string,
    soundId: string
): Promise<void> {
    const row = await ownedSound(campaignId, soundId);

    await prisma.campaignSound.delete({ where: { id: soundId } });

    const path = soundObjectPath(row.url);

    if (path) await removeSoundObject(path);
}

export async function reorderSounds(
    campaignId: string,
    ids: string[]
): Promise<void> {
    await prisma.$transaction(
        ids.map((id, index) =>
            prisma.campaignSound.updateMany({
                where: { id, campaignId },
                data: { sortOrder: index },
            })
        )
    );
}

export async function setHiddenBuiltin(
    campaignId: string,
    ids: string[]
): Promise<void> {
    await prisma.campaign.update({
        where: { id: campaignId },
        data: { hiddenBuiltinSounds: ids },
    });
}

export async function findPlayable(
    campaignId: string,
    soundId: string
): Promise<{ volume: number } | null> {
    if (soundId.startsWith('builtin:')) {
        if (!BUILTIN_SOUND_IDS.has(soundId)) return null;

        const hidden = await hiddenBuiltinOf(campaignId);

        return hidden.includes(soundId) ? null : { volume: 1 };
    }

    const row = await prisma.campaignSound.findFirst({
        where: { id: soundId, campaignId },
        select: { volume: true },
    });

    return row ? { volume: row.volume } : null;
}
