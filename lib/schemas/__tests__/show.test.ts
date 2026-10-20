import { describe, expect, it } from "vitest";

import { readSlides, saveDeckSchema, showCommandSchema, slideUploadRequestSchema } from "@/lib/schemas/show";

const slide = (id: string, extra: Record<string, unknown> = {}) => ({ id, imageUrl: "https://x.supabase.co/storage/v1/object/public/scene-slides/c1/a.webp", ...extra });

describe("show schemas", () => {
  it("набір: порожні заголовок/підпис стають undefined, пробіли обрізаються", () => {
    const parsed = saveDeckSchema.parse({ title: "  Таверна ", slides: [slide("slide-0001", { title: "  ", caption: " Минуло три дні " })] });

    expect(parsed).toEqual({ title: "Таверна", slides: [{ id: "slide-0001", imageUrl: slide("x").imageUrl, title: undefined, caption: "Минуло три дні" }] });
  });

  it("набір: дублікати id, 101 слайд, підпис 201 символ, не-http посилання — відхиляються", () => {
    expect(saveDeckSchema.safeParse({ title: "a", slides: [slide("slide-0001"), slide("slide-0001")] }).success).toBe(false);
    expect(saveDeckSchema.safeParse({ title: "a", slides: Array.from({ length: 101 }, (_, i) => slide(`slide-${1000 + i}`)) }).success).toBe(false);
    expect(saveDeckSchema.safeParse({ title: "a", slides: [slide("slide-0001", { caption: "x".repeat(201) })] }).success).toBe(false);
    expect(saveDeckSchema.safeParse({ title: "a", slides: [{ id: "slide-0001", imageUrl: "javascript:alert(1)" }] }).success).toBe(false);
    expect(saveDeckSchema.safeParse({ title: " ", slides: [] }).success).toBe(false);
  });

  it("квиток: лише webp/jpeg до 8 МБ", () => {
    expect(slideUploadRequestSchema.safeParse({ size: 1000, contentType: "image/webp" }).success).toBe(true);
    expect(slideUploadRequestSchema.safeParse({ size: 1000, contentType: "image/svg+xml" }).success).toBe(false);
    expect(slideUploadRequestSchema.safeParse({ size: 9 * 1024 * 1024, contentType: "image/jpeg" }).success).toBe(false);
  });

  it("команди показу", () => {
    expect(showCommandSchema.parse({ action: "open", deckId: "d1" })).toEqual({ action: "open", deckId: "d1" });
    expect(showCommandSchema.parse({ action: "audio", command: { action: "play", trackId: "t1" } })).toEqual({ action: "audio", command: { action: "play", trackId: "t1" } });
    expect(showCommandSchema.safeParse({ action: "audio", command: { action: "seek" } }).success).toBe(false);
    expect(showCommandSchema.safeParse({ action: "jump" }).success).toBe(false);
  });

  it("readSlides: битий JSON з БД — порожній масив", () => {
    expect(readSlides([slide("slide-0001")])).toHaveLength(1);
    expect(readSlides({ nope: true })).toEqual([]);
    expect(readSlides(null)).toEqual([]);
  });
});
