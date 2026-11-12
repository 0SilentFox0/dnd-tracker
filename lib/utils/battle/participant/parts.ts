import type { ParticipantPart, ParticipantPartCtx } from "@/lib/utils/rules/systems/types";
import type { BattleParticipant } from "@/types/battle";

export const runParticipantParts = <R>(list: readonly ParticipantPart<R>[] | undefined, participant: BattleParticipant, ctx: ParticipantPartCtx<R>): BattleParticipant =>
  (list ?? []).reduce((acc, part) => part(acc, ctx), participant);
