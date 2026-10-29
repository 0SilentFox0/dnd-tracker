import { describe, expect, it } from "vitest";

import { canonicalJson, docToMarkdown, isLosslessDoc, markdownToDoc } from "@/lib/utils/scenario/markdown";
import type { RichDoc, RichNode } from "@/types/scenario";

const t = (text: string, ...marks: string[]): RichNode => ({ type: "text", text, ...(marks.length && { marks: marks.map((type) => ({ type: type as "bold" })) }) });

const p = (...content: RichNode[]): RichNode => ({ type: "paragraph", content });

const doc = (...content: RichNode[]): RichDoc => ({ type: "doc", content });

const ORDER = ["secret", "bold", "italic"];

const sortMarks = (n: RichNode): RichNode => ({
  ...n,
  ...(n.marks && { marks: [...n.marks].sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type)) }),
  ...(n.content && { content: n.content.map(sortMarks) }),
});

const roundTrip = (d: RichDoc) => expect(canonicalJson(markdownToDoc(docToMarkdown(d)))).toBe(canonicalJson({ ...d, content: d.content.map(sortMarks) }));

describe("scenario markdown", () => {
  it("зображення серіалізується як {{image:alt}} і не є lossless", () => {
    const d = doc(p(t("a")), { type: "image", attrs: { mediaId: "a".repeat(24), alt: "Мапа" } }, { type: "image", attrs: { mediaId: "b".repeat(24) } });

    expect(docToMarkdown(d)).toBe(`a\n\n{{image:Мапа}}\n\n{{image:${"b".repeat(24)}}}`);
    expect(isLosslessDoc(d)).toBe(false);
    expect(markdownToDoc("{{image:Мапа}}").content.some((n) => n.type === "image")).toBe(false);
  });

  it("абзаци, жирний, курсив, секрет", () => {
    const d = doc(p(t("Дзвони "), t("б'ють", "bold"), t(" і "), t("тиша", "italic", "secret")), p(t("Другий")));

    expect(docToMarkdown(d)).toBe("Дзвони **б'ють** і ||_тиша_||\n\nДругий");
    roundTrip(d);
  });

  it("суміжні вузли з різними марками", () => {
    roundTrip(doc(p(t("a", "bold"), t("b", "bold", "italic"), t("c", "italic"))));
  });

  it("hardBreak, заголовок, списки", () => {
    roundTrip(doc({ type: "heading", attrs: { level: 3 }, content: [t("Собор")] }, p(t("рядок1"), { type: "hardBreak" }, t("рядок2"))));
    roundTrip(doc({ type: "bulletList", content: [{ type: "listItem", content: [p(t("один"))] }, { type: "listItem", content: [p(t("два", "bold"))] }] }));
    roundTrip(doc({ type: "orderedList", attrs: { start: 1 }, content: [{ type: "listItem", content: [p(t("перший"))] }] }));
  });

  it("readAloud, say, callout з вкладеннями", () => {
    roundTrip(doc({ type: "readAloud", content: [p(t("Вітер виє."))] }, { type: "say", content: [t("— Стійте!")] }));
    roundTrip(doc({ type: "callout", attrs: { kind: "check", tag: "Перевірка" }, content: [p(t("DC 14")), { type: "readAloud", content: [p(t("Ви чуєте кроки"))] }] }));
  });

  it("згадка і жетон, марки на атомах", () => {
    const mention: RichNode = { type: "mention", attrs: { id: "c1", label: "Годрик", type: "character" } };

    roundTrip(doc(p(t("Це "), mention, t(" і "), { type: "token", attrs: { color: "red" } })));
    roundTrip(doc(p({ ...mention, marks: [{ type: "secret" }] })));
    expect(docToMarkdown(doc(p(mention)))).toBe("[@Годрик](character:c1)");
  });

  it("згадка знайомства: round-trip", () => {
    const mention: RichNode = { type: "mention", attrs: { id: "a1", label: "Ярема", type: "acquaintance" } };

    roundTrip(doc(p(t("Це "), mention)));
    expect(docToMarkdown(doc(p(mention)))).toBe("[@Ярема](acquaintance:a1)");
  });

  it("згадка місця: round-trip, невідомий тип лишається текстом", () => {
    const marker: RichNode = { type: "mention", attrs: { id: "m1", label: "Біла вежа", type: "marker" } };

    roundTrip(doc(p(t("Йдіть до "), marker)));
    expect(docToMarkdown(doc(p(marker)))).toBe("[@Біла вежа](marker:m1)");
    expect(JSON.stringify(markdownToDoc("[@X](planet:1)"))).not.toContain("\"mention\"");
  });

  it("таблиця", () => {
    const cell = (type: "tableHeader" | "tableCell", text: string): RichNode => ({ type, attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [p(t(text))] });

    const d = doc({ type: "table", content: [{ type: "tableRow", content: [cell("tableHeader", "Кидок"), cell("tableHeader", "Наслідок")] }, { type: "tableRow", content: [cell("tableCell", "1|2"), cell("tableCell", "провал")] }] });

    roundTrip(d);
    expect(isLosslessDoc(d)).toBe(true);
  });

  it("таблиця без заголовка (усі клітинки tableCell) — порожній рядок-шапка в діалекті", () => {
    const cell = (text: string): RichNode => ({ type: "tableCell", attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [p(t(text))] });

    const d = doc({ type: "table", content: [{ type: "tableRow", content: [cell("a"), cell("b")] }, { type: "tableRow", content: [cell("c"), cell("d")] }] });

    expect(docToMarkdown(d)).toBe("|  |  |\n| --- | --- |\n| a | b |\n| c | d |");
    roundTrip(d);
    expect(isLosslessDoc(d)).toBe(true);
  });

  it("екранування спецсимволів", () => {
    roundTrip(doc(p(t("a*b_c|d[e]{f}\\g"))));
  });

  it("парсер приймає *курсив* від моделі", () => {
    expect(canonicalJson(markdownToDoc("*тихо*"))).toBe(canonicalJson(doc(p(t("тихо", "italic")))));
  });

  it("порожній документ і порожні абзаци", () => {
    expect(docToMarkdown(doc())).toBe("");
    expect(canonicalJson(markdownToDoc(""))).toBe(canonicalJson(doc()));
    expect(isLosslessDoc(doc(p(), p(t("x"))))).toBe(true);
  });

  it("вкладений список і кілька абзаців у пункті — не lossless", () => {
    expect(isLosslessDoc(doc({ type: "bulletList", content: [{ type: "listItem", content: [p(t("a")), p(t("b"))] }] }))).toBe(false);
    expect(isLosslessDoc(doc({ type: "bulletList", content: [{ type: "listItem", content: [p(t("a")), { type: "bulletList", content: [{ type: "listItem", content: [p(t("b"))] }] }] }] }))).toBe(false);
  });

  it("невідомий синтаксис від моделі лишається текстом", () => {
    expect(canonicalJson(markdownToDoc("# Великий"))).toBe(canonicalJson(doc(p(t("# Великий")))));
  });
});
