import { redactPendingForPlayers } from '@/lib/utils/battle/counter/pending';
import type { PendingChoice } from '@/lib/utils/battle/store/types';

export const publicPending = (p: PendingChoice | null | undefined): unknown =>
    p?.shown ?? null;

export { redactPendingForPlayers };
