import { NextResponse } from "next/server";

import { defaultReadDeps } from "./default-deps";
import { battleErrorResponse } from "./run-battle-mutation";

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

  if (!userId) throw new BattleAccessError(401, "Unauthorized");

  const access = await deps.loadAccess({ battleId: params.battleId, campaignId: params.id, userId });

  if (!access) throw new BattleAccessError(404, "Not found");

  if (!access.isMember) throw new BattleAccessError(403, "Forbidden");

  return access;
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
