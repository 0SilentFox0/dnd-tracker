import { campaignGet, campaignPost } from "./client";
import { withClock } from "./with-clock";

import type { BattleAudioCommand, BattleAudioResponse, BattleAudioSnapshot } from "@/types/audio";

export const getBattleAudio = (campaignId: string, battleId: string): Promise<BattleAudioSnapshot> =>
  withClock((onResponse) => campaignGet<BattleAudioResponse>(campaignId, `/battles/${battleId}/audio`, { cache: "no-store", onResponse }));

export const sendBattleAudio = (campaignId: string, battleId: string, cmd: BattleAudioCommand): Promise<BattleAudioSnapshot> =>
  withClock((onResponse) => campaignPost<BattleAudioResponse>(campaignId, `/battles/${battleId}/audio`, cmd, { onResponse }));
