import { describe, expect, it } from "vitest";

import { buildTrackPatch, trackToDraft } from "../track-edit";
import { trackLink } from "../track-link";

import { API_ERRORS } from "@/lib/constants/api-errors";
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
    expect(buildTrackPatch(file, { ...trackToDraft(file), name: " Битва 1 ", durationSec: "" })).toEqual({ ok: true, patch: { title: "Люди - Битва 1", durationSec: null } });
  });

  it("зміна групи переносить трек; «Інше» чи порожня група знімають префікс; задовга назва — помилка", () => {
    expect(buildTrackPatch(file, { ...trackToDraft(file), group: "Ельфи" })).toEqual({ ok: true, patch: { title: "Ельфи - Битва" } });
    expect(buildTrackPatch(file, { ...trackToDraft(file), group: "Інше" })).toEqual({ ok: true, patch: { title: "Битва" } });
    expect(buildTrackPatch(file, { ...trackToDraft(file), group: "" })).toEqual({ ok: true, patch: { title: "Битва" } });
    expect(buildTrackPatch(file, { ...trackToDraft(file), group: "x".repeat(120) })).toMatchObject({ ok: false, error: { title: API_ERRORS.TRACK_TITLE_TOO_LONG } });
  });

  it("нове посилання YouTube іде патчем, те саме відео — ні", () => {
    expect(buildTrackPatch(youtube, { ...trackToDraft(youtube), url: "https://www.youtube.com/watch?v=aaaaaaaaaaa" })).toEqual({ ok: true, patch: { url: "https://www.youtube.com/watch?v=aaaaaaaaaaa" } });
    expect(buildTrackPatch(youtube, { ...trackToDraft(youtube), url: "https://youtube.com/watch?v=dQw4w9WgXcQ" })).toEqual({ ok: true, patch: {} });
  });

  it("помилки: посилання, тривалість, порожня назва; посилання файлу ігнорується", () => {
    expect(buildTrackPatch(youtube, { ...trackToDraft(youtube), url: "нісенітниця" })).toMatchObject({ ok: false, error: { url: API_ERRORS.YOUTUBE_URL_INVALID } });
    expect(buildTrackPatch(file, { ...trackToDraft(file), durationSec: "1.5" })).toMatchObject({ ok: false, error: { durationSec: API_ERRORS.TRACK_DURATION_INVALID } });
    expect(buildTrackPatch(file, { ...trackToDraft(file), name: "  " }).ok).toBe(false);
    expect(buildTrackPatch(file, { ...trackToDraft(file), url: "https://elsewhere" })).toEqual({ ok: true, patch: {} });
  });
});
