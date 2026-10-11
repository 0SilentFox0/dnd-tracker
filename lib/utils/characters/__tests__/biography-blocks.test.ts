import { describe, expect, it } from "vitest";

import { parseBiography, parseBold } from "@/lib/utils/characters/biography";

describe("parseBiography", () => {
  it("splits headings, quotes, lists and prose", () => {
    const src = "> «Цитата»\nТитул героя\n\n# Стосунки\n• **Ніколас** — учень\n• **Фріда** — донька\n\n# Історія\nПерший абзац\n\nДругий абзац";

    expect(parseBiography(src)).toEqual([
      { kind: "quote", text: "«Цитата»" },
      { kind: "paragraph", text: "Титул героя" },
      { kind: "heading", text: "Стосунки" },
      { kind: "list", items: ["**Ніколас** — учень", "**Фріда** — донька"] },
      { kind: "heading", text: "Історія" },
      { kind: "paragraph", text: "Перший абзац" },
      { kind: "paragraph", text: "Другий абзац" },
    ]);
  });

  it("plain text without markup stays prose", () => {
    expect(parseBiography("Просто текст\nз переносом")).toEqual([{ kind: "paragraph", text: "Просто текст\nз переносом" }]);
  });
});

describe("parseBold", () => {
  it("marks **bold** segments", () => {
    expect(parseBold("**Ім'я** — опис")).toEqual([
      { text: "Ім'я", bold: true },
      { text: " — опис", bold: false },
    ]);
  });
});
