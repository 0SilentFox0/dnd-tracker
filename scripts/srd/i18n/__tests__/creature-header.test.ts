import { describe, expect, it } from "vitest";

import { normalizeCreatureHeader } from "../creature-header";

const glossary = { Medium: "Середній", "Medium|f": "Середня", "Medium|n": "Середнє", Fey: "фея", "Fey|gender": "f", Beast: "звір", "Beast|gender": "m", "Chaotic Evil": "хаотично-злий", "Chaotic Evil|f": "хаотично-зла", Unaligned: "без світогляду" };

describe("normalizeCreatureHeader", () => {
  it("узгоджує розмір і світогляд у роді з типом", () => {
    expect(normalizeCreatureHeader("Medium Fey, Chaotic Evil\nSpeed: 30 feet", "Середній Фей, Хаотично-злий\nШвидкість: 30 футів", glossary)).toBe("Середня фея, хаотично-зла\nШвидкість: 30 футів");
    expect(normalizeCreatureHeader("Medium Beast, Unaligned", "Середній Звір, без мировоззрення", glossary)).toBe("Середній звір, без світогляду");
  });

  it("не чіпає інші рядки й невідомі терміни", () => {
    expect(normalizeCreatureHeader("Speed: 30 feet", "Швидкість: 30 футів", glossary)).toBe("Швидкість: 30 футів");
    expect(normalizeCreatureHeader("Medium Giant, Chaotic Evil", "x", glossary)).toBe("x");
  });
});
