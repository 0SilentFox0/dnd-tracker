import { NextResponse } from "next/server";

import { defaultReadDeps } from "./default-deps";
import { BattleAccess, battleErrorResponse, runBattleMutation } from "./run-battle-mutation";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { BATTLE_LOG_RECENT_EVENTS } from "@/lib/constants/battle";
import { BattleAccessError } from "@/lib/utils/battle/store";
import type { BattleEventsPage, BattleVersion } from "@/types/api";

type BattleParams = { id: string; battleId: string };

export interface BattleReadDeps {
  getUserId(): Promise<string | null>;
  loadAccess(args: { battleId: string; campaignId: string; userId: string }): Promise<{ version: number; isMember: boolean } | null>;
  loadEventsBefore(battleId: string, page: { before: number; limit: number }): Promise<BattleEventsPage>;
}

async function authorize(params: BattleParams, deps: BattleReadDeps) {
  const userId = await deps.getUserId();

  if (!userId) throw new BattleAccessError(401, API_ERRORS.UNAUTHORIZED);

  const access = await deps.loadAccess({ battleId: params.battleId, campaignId: params.id, userId });

  if (!access) throw new BattleAccessError(404, API_ERRORS.NOT_FOUND);

  if (!access.isMember) throw new BattleAccessError(403, API_ERRORS.FORBIDDEN);

  return access;
}

/** Full scene for a member, as `GET /battles/[battleId]` answers it; the battle page reuses it for the first HTML. */
export function readBattleScene(params: BattleParams): Promise<NextResponse> {
  return runBattleMutation(new Request("http://internal/battle"), {
    params,
    access: BattleAccess.MEMBER,
    dryRun: () => true,
    includeRecentEvents: BATTLE_LOG_RECENT_EVENTS,
    includeKnowledge: true,
    mutate: (ctx) => ({ participants: ctx.participants, pending: ctx.pending, events: [] }),
  });
}

export async function readBattleVersion(params: BattleParams, deps: BattleReadDeps = defaultReadDeps): Promise<NextResponse> {
  try {
    const { version } = await authorize(params, deps);

    return NextResponse.json({ version } satisfies BattleVersion);
  } catch (err) {
    return battleErrorResponse(err);
  }
}

export async function readBattleEvents(
  params: BattleParams,
  page: { before: number; limit: number },
  deps: BattleReadDeps = defaultReadDeps,
): Promise<NextResponse> {
  try {
    await authorize(params, deps);

    return NextResponse.json(await deps.loadEventsBefore(params.battleId, page));
  } catch (err) {
    return battleErrorResponse(err);
  }
}
