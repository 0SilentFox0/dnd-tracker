import { describe, expect, it } from "vitest";

import { battleAudioCommandSchema, createTrackSchema, reorderTracksSchema, updateTrackSchema } from "../music";

describe("music schemas", () => {
  it("createTrack: файл зі шляхом і назвою; YouTube — лише розпізнане посилання", () => {
    expect(createTrackSchema.safeParse({ kind: "file", path: "c1/abc.mp3", title: "Бій", durationSec: 120 }).success).toBe(true);
    expect(createTrackSchema.safeParse({ kind: "file", path: "c1/abc.mp3", title: "   " }).success).toBe(false);
    expect(createTrackSchema.safeParse({ kind: "youtube", url: "https://youtu.be/dQw4w9WgXcQ" }).success).toBe(true);
    expect(createTrackSchema.safeParse({ kind: "youtube", url: "https://vimeo.com/1" }).success).toBe(false);
    expect(createTrackSchema.safeParse({ kind: "radio", url: "x" }).success).toBe(false);
  });

  it("назва 1..120 після обрізання пробілів", () => {
    expect(updateTrackSchema.parse({ title: "  Таверна  " })).toEqual({ title: "Таверна" });
    expect(updateTrackSchema.safeParse({ title: "x".repeat(121) }).success).toBe(false);
  });

  it("reorder: 1..200 id", () => {
    expect(reorderTracksSchema.safeParse({ ids: ["a"] }).success).toBe(true);
    expect(reorderTracksSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(reorderTracksSchema.safeParse({ ids: Array.from({ length: 201 }, (_, i) => `t${i}`) }).success).toBe(false);
  });

  it("команди аудіо: play вимагає trackId, невідома дія — ні", () => {
    expect(battleAudioCommandSchema.safeParse({ action: "play", trackId: "t1" }).success).toBe(true);
    expect(battleAudioCommandSchema.safeParse({ action: "play" }).success).toBe(false);

    for (const action of ["pause", "resume", "next", "prev", "stop"]) {
      expect(battleAudioCommandSchema.safeParse({ action }).success).toBe(true);
    }

    expect(battleAudioCommandSchema.safeParse({ action: "seek" }).success).toBe(false);
  });
});
