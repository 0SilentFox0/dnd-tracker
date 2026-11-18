import { z } from 'zod';

import type { ParticipantSnapshot, ParticipantState } from './types';

import { isRecord } from '@/lib/utils/common/is-record';

// Only the container shape is checked: stored rows are upgraded on read and carry module keys (`ext`) that must survive untouched.
export const participantSnapshotSchema = z.custom<ParticipantSnapshot>(
    isRecord,
    'battle.participant.snapshot'
);

export const participantStateSchema = z.custom<ParticipantState>(
    isRecord,
    'battle.participant.state'
);

const sectionSchema = z.record(z.string(), z.unknown());

const spellSlotSchema = z
    .object({ max: z.number(), level: z.number().optional() })
    .passthrough();

// Open at every level: `ext` and module-owned keys must survive a parse.
export const joinableSnapshotSchema = z
    .object({
        basicInfo: sectionSchema.default({}),
        abilities: sectionSchema,
        combatStats: sectionSchema,
        spellcasting: z
            .object({
                spellSlots: z.record(z.string(), spellSlotSchema).optional(),
            })
            .passthrough(),
        battleData: sectionSchema.default({}),
    })
    .passthrough();

export type JoinableSnapshot = z.infer<typeof joinableSnapshotSchema>;

/** Legacy rows that do not match keep the unchecked shape, as before the schema existed. */
export function readJoinableSnapshot(
    snapshot: ParticipantSnapshot
): JoinableSnapshot {
    const parsed = joinableSnapshotSchema.safeParse(snapshot);

    return parsed.success ? parsed.data : (snapshot as JoinableSnapshot);
}
