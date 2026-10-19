import { campaignGet, campaignPost } from "./client";

import { clockOffsetFromDate } from "@/lib/utils/audio/clock";
import type { BattleAudioCommand, BattleAudioResponse, BattleAudioSnapshot } from "@/types/audio";

async function withClock(run: (onResponse: (r: Response) => void) => Promise<BattleAudioResponse>): Promise<BattleAudioSnapshot> {
  const sentAt = Date.now();

  let date: string | null = null;

  const { audio } = await run((r) => {
    date = r.headers.get("date");
  });

  return { audio, clockOffsetMs: clockOffsetFromDate(date, sentAt, Date.now()) };
}

export function getBattleAudio(campaignId: string, battleId: string): Promise<BattleAudioSnapshot> {
  return withClock((onResponse) => campaignGet<BattleAudioResponse>(campaignId, `/battles/${battleId}/audio`, { cache: "no-store", onResponse }));
}

export function sendBattleAudio(campaignId: string, battleId: string, cmd: BattleAudioCommand): Promise<BattleAudioSnapshot> {
  return withClock((onResponse) => campaignPost<BattleAudioResponse>(campaignId, `/battles/${battleId}/audio`, cmd, { onResponse }));
}
