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
