import { vi } from "vitest";

import type { BattleAudioState, BattleAudioTrack, CampaignTrack } from "@/types/audio";

export const fileTrack: BattleAudioTrack = { title: "Бій", kind: "file", url: "https://s/1.mp3", youtubeId: null, durationSec: 100 };

export const youtubeTrack: BattleAudioTrack = { title: "Епік", kind: "youtube", url: null, youtubeId: "dQw4w9WgXcQ", durationSec: null };

export const audioState = (over: Partial<BattleAudioState> = {}): BattleAudioState => ({ trackId: "t1", track: fileTrack, playing: true, offsetSec: 0, startedAt: 0, seq: 1, ...over });

export const campaignTrack = (over: Partial<CampaignTrack> = {}): CampaignTrack => ({ id: "t1", ...fileTrack, sortOrder: 0, createdAt: "", ...over });

/** happy-dom не відтворює медіа: play/pause/load — заглушки на прототипі */
export function stubMediaElement(): void {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => undefined);
}
