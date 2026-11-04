import type { QueryKey } from "@tanstack/react-query";

import type { BattleAudioCommand, BattleAudioSnapshot, BattleAudioState } from "@/types/audio";

/** Звідки плеєр бере стан і куди шле команди: бій або показ. */
export interface AudioHost {
  campaignId: string;
  isDM: boolean;
  /** Вікно DM у режимі «вигляд гравців»: стан синхронізується, але звук вимкнено, щоб не дублювати вікно гравців. */
  silent?: boolean;
  queryKey: QueryKey;
  seed: BattleAudioState | null | undefined;
  fetch(): Promise<BattleAudioSnapshot>;
  send(cmd: BattleAudioCommand): Promise<BattleAudioSnapshot>;
  onFailure(message: string): void;
}
