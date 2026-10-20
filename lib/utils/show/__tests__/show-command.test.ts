import { describe, expect, it } from "vitest";

import { applyShowCommand, refreshShowSlide, type ShowDeck, showNeedsLibrary, targetSlideTrack, withoutBattle } from "../show-command";

import type { AudioLibraryEntry } from "@/lib/utils/audio/audio-command";
import type { BattleAudioState } from "@/types/audio";
import type { ShowState, Slide } from "@/types/show";

const img = (n: number) => `https://s.supabase.co/storage/v1/object/public/scene-slides/c1/${n}.webp`;

const s = (n: number, trackId?: string): Slide => ({ id: `slide-000${n}`, imageUrl: img(n), title: `Слайд ${n}`, ...(trackId && { trackId }) });

const deck: ShowDeck = { id: "d1", title: "Таверна", slides: [s(1), s(2, "t2"), s(3)] };

const library: AudioLibraryEntry[] = [
  { id: "t1", track: { title: "Бій", kind: "file", url: "https://a/1.mp3", youtubeId: null, durationSec: 100 } },
  { id: "t2", track: { title: "Таверна", kind: "file", url: "https://a/2.mp3", youtubeId: null, durationSec: 100 } },
];

const ctx = { now: 5_000, deck, library };

const audio = (over: Partial<BattleAudioState> = {}): BattleAudioState => ({ trackId: "t1", track: library[0].track, playing: true, offsetSec: 0, startedAt: 1_000, seq: 7, ...over });

const showing = (slideIdx: number, over: Partial<ShowState> = {}): ShowState => ({
  deckId: "d1",
  deckTitle: "Таверна",
  slide: deck.slides[slideIdx],
  nextImageUrl: deck.slides[slideIdx + 1]?.imageUrl ?? null,
  audio: null,
  seq: 4,
  ...over,
});

const ok = (r: ReturnType<typeof applyShowCommand>) => {
  if (!r.ok) throw new Error(r.message);

  return r.value;
};

describe("applyShowCommand", () => {
  it("open без slideId — перший слайд, наступна картинка, seq з 1", () => {
    expect(ok(applyShowCommand(null, { action: "open", deckId: "d1" }, ctx))).toEqual({ deckId: "d1", deckTitle: "Таверна", slide: s(1), nextImageUrl: img(2), audio: null, seq: 1 });
  });

  it("open конкретного слайда з треком — play цього треку", () => {
    const next = ok(applyShowCommand(showing(0), { action: "open", deckId: "d1", slideId: "slide-0002" }, ctx));

    expect(next.slide).toEqual(s(2, "t2"));
    expect(next.audio).toMatchObject({ trackId: "t2", playing: true, startedAt: 5_000, seq: 1 });
    expect(next.seq).toBe(5);
  });

  it("трек слайда вже грає або на паузі — аудіо без змін (той самий об'єкт)", () => {
    const playing = audio({ trackId: "t2", track: library[1].track });

    expect(ok(applyShowCommand(showing(0, { audio: playing }), { action: "next" }, ctx)).audio).toBe(playing);

    const paused = audio({ trackId: "t2", track: library[1].track, playing: false });

    expect(ok(applyShowCommand(showing(0, { audio: paused }), { action: "next" }, ctx)).audio).toBe(paused);
  });

  it("трек слайда видалено з бібліотеки — слайд відкривається, музика як була", () => {
    const current = audio();

    const next = ok(applyShowCommand(showing(0, { audio: current }), { action: "next" }, { ...ctx, library: [library[0]] }));

    expect(next.slide?.id).toBe("slide-0002");
    expect(next.audio).toBe(current);
  });

  it("слайд без треку — музика не чіпається", () => {
    const current = audio();

    expect(ok(applyShowCommand(showing(1, { audio: current }), { action: "next" }, ctx)).audio).toBe(current);
  });

  it("next/prev на краю — той самий стан без підвищення seq", () => {
    const last = showing(2);

    expect(ok(applyShowCommand(last, { action: "next" }, ctx))).toBe(last);

    const first = showing(0);

    expect(ok(applyShowCommand(first, { action: "prev" }, ctx))).toBe(first);
  });

  it("останній слайд — nextImageUrl null", () => {
    expect(ok(applyShowCommand(showing(1), { action: "next" }, ctx)).nextImageUrl).toBeNull();
  });

  it("поточний слайд видалено з набору — next/prev ідуть на перший", () => {
    const gone = showing(0, { slide: { id: "slide-gone", imageUrl: img(9) } });

    expect(ok(applyShowCommand(gone, { action: "next" }, ctx)).slide?.id).toBe("slide-0001");
    expect(ok(applyShowCommand(gone, { action: "prev" }, ctx)).slide?.id).toBe("slide-0001");
  });

  it("помилки: немає набору, порожній набір, невідомий слайд, next без показу", () => {
    expect(applyShowCommand(null, { action: "open", deckId: "d1" }, { ...ctx, deck: null })).toEqual({ ok: false, message: "Набір слайдів не знайдено" });
    expect(applyShowCommand(null, { action: "open", deckId: "d1" }, { ...ctx, deck: { ...deck, slides: [] } })).toEqual({ ok: false, message: "У наборі немає слайдів" });
    expect(applyShowCommand(null, { action: "open", deckId: "d1", slideId: "slide-nope" }, ctx)).toEqual({ ok: false, message: "Слайд не знайдено" });
    expect(applyShowCommand(null, { action: "next" }, ctx)).toEqual({ ok: false, message: "Показ не запущено" });
    expect(applyShowCommand(showing(0), { action: "next" }, { ...ctx, deck: null })).toEqual({ ok: false, message: "Набір слайдів не знайдено" });
  });

  it("end: очищає показ, зупиняє музику, seq і audio.seq ростуть; повторний open після end має більший seq", () => {
    const ended = ok(applyShowCommand(showing(1, { audio: audio() }), { action: "end" }, ctx));

    expect(ended).toEqual({ deckId: null, deckTitle: null, slide: null, nextImageUrl: null, audio: { trackId: null, track: null, playing: false, offsetSec: 0, startedAt: 5_000, seq: 8 }, seq: 5 });

    const reopened = ok(applyShowCommand(ended, { action: "open", deckId: "d1", slideId: "slide-0002" }, ctx));

    expect(reopened.seq).toBe(6);
    expect(reopened.audio?.seq).toBe(9);
  });

  it("end без музики — audio лишається null", () => {
    expect(ok(applyShowCommand(showing(0), { action: "end" }, ctx)).audio).toBeNull();
  });

  it("audio: команда плеєра працює і без відкритого набору; помилка плеєра — помилка", () => {
    const next = ok(applyShowCommand(null, { action: "audio", command: { action: "play", trackId: "t1" } }, ctx));

    expect(next).toMatchObject({ deckId: null, slide: null, seq: 1, audio: { trackId: "t1", playing: true } });
    expect(applyShowCommand(null, { action: "audio", command: { action: "pause" } }, ctx)).toEqual({ ok: false, message: "Немає обраного треку" });
  });
});

describe("refreshShowSlide", () => {
  const at = { before: deck.slides, now: 5_000 };

  it("змінився підпис поточного слайда — новий знімок і seq+1", () => {
    const edited: ShowDeck = { ...deck, slides: [{ ...s(1), caption: "Новий" }, s(2, "t2"), s(3)] };

    expect(refreshShowSlide(showing(0), edited, at)).toEqual({ ...showing(0), slide: { ...s(1), caption: "Новий" }, seq: 5 });
  });

  it("змінився наступний слайд — новий nextImageUrl", () => {
    const edited: ShowDeck = { ...deck, slides: [s(1), s(3)] };

    expect(refreshShowSlide(showing(0), edited, at)?.nextImageUrl).toBe(img(3));
  });

  it("нічого не змінилося або інший набір — null", () => {
    expect(refreshShowSlide(showing(0), deck, at)).toBeNull();
    expect(refreshShowSlide(showing(0), { ...deck, id: "d2" }, at)).toBeNull();
  });

  it("поточний слайд видалено — сусід на тому ж місці без автотреку, музика та сама", () => {
    const playing = audio();

    expect(refreshShowSlide(showing(0, { audio: playing }), { ...deck, slides: [s(2, "t2"), s(3)] }, at)).toEqual({
      ...showing(0, { audio: playing }),
      slide: s(2, "t2"),
      nextImageUrl: img(3),
      seq: 5,
    });
    expect(refreshShowSlide(showing(2), { ...deck, slides: [s(1), s(2, "t2")] }, at)).toMatchObject({ slide: s(2, "t2"), nextImageUrl: null, seq: 5 });
  });

  it("набір спорожнів — показ завершено, як командою end", () => {
    const prev = showing(1, { audio: audio() });

    const ended = ok(applyShowCommand(prev, { action: "end" }, { ...ctx, deck: null, library: [] }));

    expect(refreshShowSlide(prev, { ...deck, slides: [] }, at)).toEqual(ended);
    expect(ended).toMatchObject({ deckId: null, slide: null, nextImageUrl: null, audio: { playing: false }, seq: 5 });
  });
});

describe("targetSlideTrack / showNeedsLibrary", () => {
  it("open і next/prev дають трек слайда-цілі", () => {
    expect(targetSlideTrack(null, { action: "open", deckId: "d1" }, deck)).toBeUndefined();
    expect(targetSlideTrack(null, { action: "open", deckId: "d1", slideId: "slide-0002" }, deck)).toBe("t2");
    expect(targetSlideTrack(showing(0), { action: "next" }, deck)).toBe("t2");
    expect(targetSlideTrack(showing(2), { action: "prev" }, deck)).toBe("t2");
    expect(targetSlideTrack(showing(2), { action: "next" }, deck)).toBeUndefined();
    expect(targetSlideTrack(showing(0), { action: "end" }, deck)).toBeUndefined();
    expect(targetSlideTrack(showing(0), { action: "next" }, null)).toBeUndefined();
  });

  it("бібліотека потрібна лише для нового треку або команди аудіо з вибором", () => {
    expect(showNeedsLibrary(showing(1), { action: "next" }, deck)).toBe(false);
    expect(showNeedsLibrary(showing(0), { action: "next" }, deck)).toBe(true);
    expect(showNeedsLibrary(showing(0, { audio: audio({ trackId: "t2" }) }), { action: "next" }, deck)).toBe(false);
    expect(showNeedsLibrary(showing(0), { action: "audio", command: { action: "pause" } }, deck)).toBe(false);
    expect(showNeedsLibrary(showing(0), { action: "audio", command: { action: "play", trackId: "t1" } }, deck)).toBe(true);
  });
});

describe("команда battle", () => {
  const battle = (status: string) => ({ id: "b1", name: "Засідка", status });

  it("активний бій: battle у стані, музика зупинена, seq+1, слайд лишається", () => {
    const next = ok(applyShowCommand(showing(1, { audio: audio() }), { action: "battle", battleId: "b1" }, { ...ctx, battle: battle("active") }));

    expect(next.battle).toEqual({ id: "b1", name: "Засідка" });
    expect(next.slide).toEqual(s(2, "t2"));
    expect(next.audio).toMatchObject({ trackId: null, playing: false });
    expect(next.seq).toBe(5);
  });

  it("без запущеного показу — стан без слайда з battle", () => {
    const next = ok(applyShowCommand(null, { action: "battle", battleId: "b1" }, { ...ctx, battle: battle("active") }));

    expect(next).toMatchObject({ deckId: null, slide: null, battle: { id: "b1", name: "Засідка" }, seq: 1 });
  });

  it("бій не active — помилка", () => {
    for (const status of ["prepared", "completed"]) {
      expect(applyShowCommand(null, { action: "battle", battleId: "b1" }, { ...ctx, battle: battle(status) })).toEqual({ ok: false, message: "Бій ще не почався або вже завершений" });
    }
  });

  it("open / next / prev / end скидають battle", () => {
    const called = showing(0, { battle: { id: "b1", name: "Засідка" } });

    expect(ok(applyShowCommand(called, { action: "next" }, ctx))).not.toHaveProperty("battle");
    expect(ok(applyShowCommand(showing(1, { battle: { id: "b1", name: "Засідка" } }), { action: "prev" }, ctx))).not.toHaveProperty("battle");
    expect(ok(applyShowCommand(called, { action: "open", deckId: "d1", slideId: "slide-0003" }, ctx))).not.toHaveProperty("battle");
    expect(ok(applyShowCommand(called, { action: "end" }, ctx))).not.toHaveProperty("battle");
  });

  it("audio-команда не скидає battle", () => {
    const called = showing(0, { battle: { id: "b1", name: "Засідка" } });

    expect(ok(applyShowCommand(called, { action: "audio", command: { action: "play", trackId: "t1" } }, ctx)).battle).toEqual({ id: "b1", name: "Засідка" });
  });
});

describe("виклик battle на межі набору", () => {
  const called = { id: "b1", name: "Засідка" };

  it("next на останньому і prev на першому слайді скидають battle (seq+1)", () => {
    const last = ok(applyShowCommand(showing(2, { battle: called }), { action: "next" }, ctx));

    expect(last).not.toHaveProperty("battle");
    expect(last).toMatchObject({ seq: 5, slide: deck.slides[2] });

    const first = ok(applyShowCommand(showing(0, { battle: called }), { action: "prev" }, ctx));

    expect(first).not.toHaveProperty("battle");
    expect(first.seq).toBe(5);
  });

  it("без battle на межі стан не змінюється", () => {
    const prev = showing(2);

    expect(ok(applyShowCommand(prev, { action: "next" }, ctx))).toBe(prev);
  });
});

describe("withoutBattle", () => {
  const called = { id: "b1", name: "Засідка" };

  it("знімає виклик цього бою, seq+1, решту лишає", () => {
    const next = withoutBattle(showing(1, { battle: called }), "b1");

    expect(next).not.toHaveProperty("battle");
    expect(next).toMatchObject({ deckId: "d1", seq: 5, slide: deck.slides[1] });
  });

  it("null, якщо показу немає, виклику немає або він про інший бій", () => {
    expect(withoutBattle(null, "b1")).toBeNull();
    expect(withoutBattle(showing(0), "b1")).toBeNull();
    expect(withoutBattle(showing(0, { battle: called }), "b2")).toBeNull();
  });
});
