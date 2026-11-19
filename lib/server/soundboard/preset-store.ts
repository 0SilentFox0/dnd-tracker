import type { Prisma } from '@prisma/client';

import { toPreset, toSlots } from './library-store';

import 'server-only';
import { API_ERRORS } from '@/lib/constants/api-errors';
import {
    BUILTIN_SOUND_IDS,
    MAX_PRESETS,
    PRESET_SLOTS,
} from '@/lib/constants/soundboard';
import { prisma } from '@/lib/db';
import { lockUserSounds } from '@/lib/server/soundboard/user-lock';
import { ContentError } from '@/lib/utils/api/content-error';
import type { SoundPreset } from '@/types/soundboard';

const slotInvalid = () =>
    new ContentError(API_ERRORS.PRESET_SLOT_INVALID, 400);

async function ownedPreset(userId: string, id: string) {
    const row = await prisma.soundPreset.findFirst({ where: { id, userId } });

    if (!row) throw new ContentError(API_ERRORS.PRESET_NOT_FOUND, 404);

    return row;
}

async function assertSlotsPlayable(
    db: Prisma.TransactionClient,
    userId: string,
    slots: (string | null)[]
): Promise<void> {
    if (slots.length !== PRESET_SLOTS) throw slotInvalid();

    const ids = [...new Set(slots.filter((s): s is string => s !== null))];

    const custom = ids.filter((id) => !id.startsWith('builtin:'));

    if (ids.some((id) => id.startsWith('builtin:') && !BUILTIN_SOUND_IDS.has(id)))
        throw slotInvalid();

    if (custom.length === 0) return;

    const owned = await db.soundLibraryItem.findMany({
        where: { userId, id: { in: custom } },
        select: { id: true },
    });

    if (owned.length !== custom.length) throw slotInvalid();
}

export async function createPreset(
    userId: string,
    name: string
): Promise<SoundPreset> {
    const row = await prisma.$transaction(async (tx) => {
        await lockUserSounds(tx, userId);

        const count = await tx.soundPreset.count({ where: { userId } });

        if (count >= MAX_PRESETS)
            throw new ContentError(API_ERRORS.PRESET_LIMIT, 400);

        const last = await tx.soundPreset.aggregate({
            where: { userId },
            _max: { sortOrder: true },
        });

        return tx.soundPreset.create({
            data: {
                userId,
                name,
                slots: Array.from({ length: PRESET_SLOTS }, () => null),
                sortOrder: (last._max.sortOrder ?? -1) + 1,
            },
        });
    });

    return toPreset(row);
}

export async function updatePreset(
    userId: string,
    id: string,
    patch: { name?: string; slots?: (string | null)[] }
): Promise<SoundPreset> {
    await ownedPreset(userId, id);

    await prisma.$transaction(async (tx) => {
        await lockUserSounds(tx, userId);

        if (patch.slots)
            await assertSlotsPlayable(tx, userId, toSlots(patch.slots));

        await tx.soundPreset.updateMany({
            where: { id, userId },
            data: { name: patch.name, slots: patch.slots },
        });
    });

    return toPreset(await ownedPreset(userId, id));
}

export async function deletePreset(userId: string, id: string): Promise<void> {
    await ownedPreset(userId, id);
    await prisma.soundPreset.deleteMany({ where: { id, userId } });
}

export async function reorderPresets(
    userId: string,
    ids: string[]
): Promise<void> {
    await prisma.$transaction(
        ids.map((id, index) =>
            prisma.soundPreset.updateMany({
                where: { id, userId },
                data: { sortOrder: index },
            })
        )
    );
}
