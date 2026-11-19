import type { SoundLibraryItem, SoundPreset as PresetRow } from '@prisma/client';

import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    BUILTIN_SOUND_IDS,
    BUILTIN_SOUNDS,
    MAX_LIBRARY_SOUNDS,
    PRESET_SLOTS,
    STARTER_PRESETS,
} from '@/lib/constants/soundboard';
import { prisma } from '@/lib/db';
import {
    removeSoundObject,
    soundObjectPath,
    soundPathOwnedBy,
    verifyUploadedSound,
} from '@/lib/supabase/soundboard-storage';
import { ContentError } from '@/lib/utils/api/content-error';
import type {
    LibrarySoundRow,
    SoundLibrary,
    SoundPreset,
} from '@/types/soundboard';

export type CreateLibrarySoundInput = {
    path: string;
    name?: string | null;
    icon?: string;
    color?: string | null;
    volume?: number;
    durationMs: number;
    source: 'upload' | 'record' | 'link';
    sourceUrl?: string;
};

export type UpdateLibrarySoundInput = {
    name?: string | null;
    icon?: string;
    color?: string | null;
    volume?: number;
};

export const toSlots = (value: unknown): (string | null)[] =>
    Array.isArray(value)
        ? value.map((v) => (typeof v === 'string' ? v : null))
        : [];

export const toPreset = (row: PresetRow): SoundPreset => ({
    id: row.id,
    name: row.name,
    slots: toSlots(row.slots),
    sortOrder: row.sortOrder,
});

const toRow = (row: SoundLibraryItem): LibrarySoundRow => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    volume: row.volume,
    url: row.url,
    durationMs: row.durationMs,
    sourceUrl: row.sourceUrl,
});

const padSlots = (ids: readonly string[]): (string | null)[] =>
    Array.from({ length: PRESET_SLOTS }, (_, i) => ids[i] ?? null);

async function seedStarterPresets(userId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
        // serializes concurrent first reads of the same account
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;

        const count = await tx.soundPreset.count({ where: { userId } });

        if (count > 0) return;

        await tx.soundPreset.createMany({
            data: STARTER_PRESETS.map((preset, index) => ({
                userId,
                name: preset.nameKey,
                slots: padSlots(preset.ids),
                sortOrder: index,
            })),
        });
    });
}

export async function getLibrary(userId: string): Promise<SoundLibrary> {
    await seedStarterPresets(userId);

    const [sounds, presets] = await Promise.all([
        prisma.soundLibraryItem.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
        }),
        prisma.soundPreset.findMany({
            where: { userId },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        }),
    ]);

    return { sounds: sounds.map(toRow), presets: presets.map(toPreset) };
}

async function ownedSound(
    userId: string,
    id: string
): Promise<SoundLibraryItem> {
    const row = await prisma.soundLibraryItem.findFirst({
        where: { id, userId },
    });

    if (!row) throw new ContentError(API_ERRORS.SOUND_NOT_FOUND, 404);

    return row;
}

export async function createLibrarySound(
    userId: string,
    input: CreateLibrarySoundInput
): Promise<LibrarySoundRow> {
    const count = await prisma.soundLibraryItem.count({ where: { userId } });

    if (count >= MAX_LIBRARY_SOUNDS)
        throw new ContentError(API_ERRORS.SOUND_LIMIT, 400, undefined, {
            max: MAX_LIBRARY_SOUNDS,
        });

    if (!soundPathOwnedBy(input.path, userId))
        throw new ContentError(API_ERRORS.FORBIDDEN, 403);

    const verified = await verifyUploadedSound(input.path);

    if (!verified.ok) throw new ContentError(verified.message, 400);

    const row = await prisma.soundLibraryItem.create({
        data: {
            userId,
            name: input.name ?? null,
            icon: input.icon,
            color: input.color ?? null,
            volume: input.volume,
            url: verified.value,
            durationMs: input.durationMs,
            source: input.source,
            sourceUrl: input.sourceUrl ?? null,
        },
    });

    return toRow(row);
}

export async function updateLibrarySound(
    userId: string,
    id: string,
    patch: UpdateLibrarySoundInput
): Promise<LibrarySoundRow> {
    await ownedSound(userId, id);

    await prisma.soundLibraryItem.updateMany({
        where: { id, userId },
        data: patch,
    });

    return toRow(await ownedSound(userId, id));
}

export async function deleteLibrarySound(
    userId: string,
    id: string
): Promise<void> {
    const row = await ownedSound(userId, id);

    await prisma.$transaction(async (tx) => {
        const presets = await tx.soundPreset.findMany({ where: { userId } });

        for (const preset of presets) {
            const slots = toSlots(preset.slots);

            if (!slots.includes(id)) continue;

            await tx.soundPreset.update({
                where: { id: preset.id },
                data: { slots: slots.map((s) => (s === id ? null : s)) },
            });
        }

        await tx.soundLibraryItem.deleteMany({ where: { id, userId } });
    });

    const path = soundObjectPath(row.url);

    if (path) await removeSoundObject(path);
}

export async function findPlayableFor(
    userId: string,
    soundId: string
): Promise<{ volume: number; url: string } | null> {
    if (soundId.startsWith('builtin:')) {
        if (!BUILTIN_SOUND_IDS.has(soundId)) return null;

        const builtin = BUILTIN_SOUNDS.find((s) => s.id === soundId);

        return builtin ? { volume: 1, url: builtin.url } : null;
    }

    const row = await prisma.soundLibraryItem.findFirst({
        where: { id: soundId, userId },
        select: { volume: true, url: true },
    });

    return row ?? null;
}
