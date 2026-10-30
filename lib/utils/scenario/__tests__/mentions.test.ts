import { describe, expect, it } from "vitest";

import { buildMentionPattern, findMentions, mentionPrefixes, wordStem } from "@/lib/utils/scenario/mentions";
import type { RichNode, ScenarioContent } from "@/types/scenario";

const doc = (...content: RichNode[]) => ({ type: "doc" as const, content: [{ type: "paragraph" as const, content }] });

const t = (text: string): RichNode => ({ type: "text", text });

const chip = (label: string): RichNode => ({ type: "mention", attrs: { id: "a1", label, type: "acquaintance" } });

const make = (story: RichNode[], notes: RichNode[] = []): ScenarioContent => ({ legend: [], sections: [{ id: "s1", title: "С", played: false, rows: [{ id: "r1", story: doc(...story), notes: doc(...notes) }] }] });

describe("findMentions", () => {
  it("знаходить відмінки за основою і збирає реальні форми", () => {
    const hits = findMentions(make([t("Беатріс прийшла. Дай Беатрісі ключ, бачу Беатрісу.")]), "Беатріс");

    expect(hits).toHaveLength(3);
    expect(hits[0].forms).toEqual(["Беатріс", "Беатрісі", "Беатрісу"]);
    expect(hits.every((h) => h.field === "story" && h.rowId === "r1" && h.sectionId === "s1")).toBe(true);
  });

  it("запит у непрямому відмінку знаходить називний", () => {
    expect(findMentions(make([t("Беатріс тут")]), "Беатрісі")).toHaveLength(1);
  });

  it("регістр не важливий, forms зберігають написання з тексту", () => {
    const [h] = findMentions(make([t("БЕАТРІС кричить")]), "беатріс");

    expect(h.forms).toEqual(["БЕАТРІС"]);
  });

  it("слово всередині іншого слова не збігається", () => {
    expect(findMentions(make([t("Небеатріске, абеатріс, Беатрісофон")]), "Беатріс")).toHaveLength(0);
  });

  it("inMention: уже чіп", () => {
    const hits = findMentions(make([chip("Беатріс"), t(" і Беатріс")]), "Беатріс");

    expect(hits.map((h) => h.inMention)).toEqual([true, false]);
  });

  it("знаходить у notes і через кілька текстових вузлів", () => {
    const hits = findMentions(make([t("Бе"), { type: "text", text: "атріс", marks: [{ type: "bold" }] }], [t("див. Беатріс")]), "Беатріс");

    expect(hits.map((h) => h.field)).toEqual(["story", "notes"]);
  });

  it("більше 20 входжень не обрізається", () => {
    expect(findMentions(make([t("Беатріс ".repeat(50))]), "Беатріс")).toHaveLength(50);
  });

  it("багатослівне ім'я, короткі слова — лише ціле слово, sectionId фільтрує", () => {
    expect(findMentions(make([t("Брат Йоган мовчить")]), "Брат Йоган")).toHaveLength(1);
    expect(findMentions(make([t("Ді дивиться на Діну")]), "Ді")).toHaveLength(1);
    expect(findMentions(make([t("Беатріс")]), "Беатріс", { sectionId: "nope" })).toHaveLength(0);
  });

  it("порожній запит — нічого, спецсимволи екрануються", () => {
    expect(findMentions(make([t("a.b")]), "   ")).toEqual([]);
    expect(findMentions(make([t("axb a.bc")]), "a.bc")).toHaveLength(1);
  });

  it("wordStem не коротша за 4 літери", () => {
    expect(wordStem("Беатрісі")).toBe("Беатріс");
    expect(wordStem("Ольга")).toBe("Ольг");
    expect(wordStem("Іра")).toBe("Іра");
  });
});

describe("findMentions alternation, English and NFC", () => {
  const forms = (story: string, query: string) => findMentions(make([t(story)]), query).flatMap((h) => h.forms);

  it("consonant alternation г/к/х to з/ц/с in both directions", () => {
    expect(new Set(forms("Ользі, Ольгою", "Ольга"))).toEqual(new Set(["Ользі", "Ольгою"]));
    expect(forms("Ольга тут", "Ользі")).toEqual(["Ольга"]);
    expect(forms("Марічці і Солосі", "Марічка")).toEqual(["Марічці"]);
    expect(forms("Солосі", "Солоха")).toEqual(["Солосі"]);
  });

  it("no alternation without a dropped ending", () => {
    expect(findMentions(make([t("Тарах")]), "Тарас")).toHaveLength(0);
  });

  it("English names with possessives and plurals", () => {
    const hits = findMentions(make([t("Beatrice, Beatrice's, Beatrice’s, BEATRICE, Beatrices")]), "Beatrice");

    expect(hits).toHaveLength(5);
    expect(hits[0].forms).toEqual(["Beatrice", "BEATRICE", "Beatrices"]);
    expect(buildMentionPattern("Beatrice's")?.source).toBe(buildMentionPattern("Beatrice")?.source);
    expect(findMentions(make([t("Ser Beatrice arrived")]), "Ser Beatrice")).toHaveLength(1);
    expect(findMentions(make([t("Beatrice")]), "Bea")).toHaveLength(0);
  });

  it("NFC query matches NFD text", () => {
    expect(findMentions(make([t("Zoe\u0308 smiles")]), "Zo\u00eb")).toHaveLength(1);
  });

  it("mentionPrefixes are literal lowercase prefixes contained in every match", () => {
    expect(mentionPrefixes("Ольга Петрівна")).toEqual(["оль", "петрівн"]);

    const samples: [string, string][] = [["Ольга", "Ользі і Ольгою"], ["Беатріс", "БЕАТРІСУ"], ["Beatrice's", "Beatrices"], ["Ser Bea", "ser bea"]];

    for (const [q, text] of samples) {
      const re = buildMentionPattern(q) as RegExp;

      for (const m of text.matchAll(re)) for (const p of mentionPrefixes(q)) expect(m[0].toLowerCase()).toContain(p);
    }
  });
});
