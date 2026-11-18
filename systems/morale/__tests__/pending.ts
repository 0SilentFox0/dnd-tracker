import { pendingMoraleOf, withPendingMorale } from '@/systems/morale/rules/state';
import type { PendingMoraleCheckPayload } from '@/systems/morale/rules/threshold';

export const pendingSlot = (payload: unknown) =>
    withPendingMorale(undefined, payload as PendingMoraleCheckPayload | null);

export { pendingMoraleOf };
