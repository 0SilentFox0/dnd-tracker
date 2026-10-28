import { describe, expect, it } from "vitest";

import { buildTrackPatch, trackToDraft } from "../track-edit";
import { trackLink } from "../track-link";

import type { CampaignTrack } from "@/types/audio";

const youtube: CampaignTrack = { id: "y", title: "Люди - Битва", kind: "youtube", url: null, youtubeId: "dQw4w9WgXcQ", durationSec: null, sortOrder: 0, createdAt: "" };

const file: CampaignTrack = { ...youtube, id: "f", kind: "file", url: "https://s/camp1/a.mp3", youtubeId: null, durationSec: 61 };

describe("trackLink", () => {
  it("YouTube — youtu.be, файл — публічний URL", () => {
    expect(trackLink(youtube)).toBe("https://youtu.be/dQw4w9WgXcQ");
    expect(trackLink(file)).toBe("https://s/camp1/a.mp3");
    expect(trackLink({ ...file, url: null })).toBeNull();
  });
});

describe("buildTrackPatch", () => {
  it("без змін — порожній патч", () => {
    expect(buildTrackPatch(youtube, trackToDraft(youtube))).toEqual({ ok: true, patch: {} });
    expect(buildTrackPatch(file, trackToDraft(file))).toEqual({ ok: true, patch: {} });
  });

  it("лише змінені поля; порожня тривалість очищає", () => {
    expect(buildTrackPatch(file, { ...trackToDraft(file), title: " Люди - Битва 1 ", durationSec: "" })).toEqual({ ok: true, patch: { title: "Люди - Битва 1", durationSec: null } });
  });

  it("нове посилання YouTube іде патчем, те саме відео — ні", () => {
    expect(buildTrackPatch(youtube, { ...trackToDraft(youtube), url: "https://www.youtube.com/watch?v=aaaaaaaaaaa" })).toEqual({ ok: true, patch: { url: "https://www.youtube.com/watch?v=aaaaaaaaaaa" } });
    expect(buildTrackPatch(youtube, { ...trackToDraft(youtube), url: "https://youtube.com/watch?v=dQw4w9WgXcQ" })).toEqual({ ok: true, patch: {} });
  });

  it("помилки: посилання, тривалість, порожня назва; посилання файлу ігнорується", () => {
    expect(buildTrackPatch(youtube, { ...trackToDraft(youtube), url: "нісенітниця" })).toMatchObject({ ok: false, error: { url: expect.any(String) } });
    expect(buildTrackPatch(file, { ...trackToDraft(file), durationSec: "1.5" })).toMatchObject({ ok: false, error: { durationSec: expect.any(String) } });
    expect(buildTrackPatch(file, { ...trackToDraft(file), title: "  " }).ok).toBe(false);
    expect(buildTrackPatch(file, { ...trackToDraft(file), url: "https://elsewhere" })).toEqual({ ok: true, patch: {} });
  });
});
