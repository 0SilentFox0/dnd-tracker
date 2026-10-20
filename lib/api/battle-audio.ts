import { campaignGet, campaignPost } from "./client";
import { withClock } from "./with-clock";

import type { BattleAudioCommand, BattleAudioResponse, BattleAudioSnapshot } from "@/types/audio";

const toSnapshot = ({ body, clockOffsetMs }: { body: BattleAudioResponse; clockOffsetMs: number | null }): BattleAudioSnapshot => ({ audio: body.audio, clockOffsetMs });

export async function getBattleAudio(campaignId: string, battleId: string): Promise<BattleAudioSnapshot> {
  return toSnapshot(await withClock((onResponse) => campaignGet<BattleAudioResponse>(campaignId, `/battles/${battleId}/audio`, { cache: "no-store", onResponse })));
}

export async function sendBattleAudio(campaignId: string, battleId: string, cmd: BattleAudioCommand): Promise<BattleAudioSnapshot> {
  return toSnapshot(await withClock((onResponse) => campaignPost<BattleAudioResponse>(campaignId, `/battles/${battleId}/audio`, cmd, { onResponse })));
}
