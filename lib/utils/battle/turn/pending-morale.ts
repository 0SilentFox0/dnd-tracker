import type { MoraleCheckResult } from "@/lib/utils/battle/battle-morale";

export interface PendingMoraleCheckPayload {
  participantId: string;
  d10Roll: number;
  moraleResult: MoraleCheckResult;
}
