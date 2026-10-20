import { describe, expect, it } from "vitest";

import { detectTrackFormat, trackFormatOfUrl, validateTrackFile } from "../track-file";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { MAX_TRACK_BYTES } from "@/lib/constants/music";

describe("track file", () => {
  it("формат за MIME, а без MIME — за розширенням", () => {
    expect(detectTrackFormat({ name: "a.bin", type: "audio/mpeg" })).toBe("mp3");
    expect(detectTrackFormat({ name: "a.bin", type: "audio/x-m4a" })).toBe("m4a");
    expect(detectTrackFormat({ name: "Battle.M4A", type: "" })).toBe("m4a");
    expect(detectTrackFormat({ name: "a.mp3", type: "application/octet-stream" })).toBe("mp3");
    expect(detectTrackFormat({ name: "a.mp3", type: "audio/ogg" })).toBeNull();
    expect(detectTrackFormat({ name: "a.wav", type: "" })).toBeNull();
  });

  it("розмір 1 байт..10 МБ", () => {
    expect(validateTrackFile({ name: "a.mp3", type: "audio/mpeg", size: MAX_TRACK_BYTES })).toEqual({ ok: true, value: "mp3" });
    expect(validateTrackFile({ name: "a.mp3", type: "audio/mpeg", size: MAX_TRACK_BYTES + 1 })).toEqual({ ok: false, message: API_ERRORS.TRACK_FILE_INVALID });
    expect(validateTrackFile({ name: "a.mp3", type: "audio/mpeg", size: 0 })).toEqual({ ok: false, message: API_ERRORS.TRACK_FILE_INVALID });
    expect(validateTrackFile({ name: "a.ogg", type: "audio/ogg", size: 10 })).toEqual({ ok: false, message: API_ERRORS.TRACK_FILE_INVALID });
  });
});

describe("trackFormatOfUrl", () => {
  it("формат за розширенням URL, без урахування регістру", () => {
    expect(trackFormatOfUrl("https://s/a/1.MP3")).toBe("mp3");
    expect(trackFormatOfUrl("https://s/a/1.m4a")).toBe("m4a");
    expect(trackFormatOfUrl("https://s/a/1.ogg")).toBeNull();
    expect(trackFormatOfUrl(null)).toBeNull();
  });
});
