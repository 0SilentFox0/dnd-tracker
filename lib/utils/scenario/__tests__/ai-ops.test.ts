import { describe, expect, it } from "vitest";

import { applyAiOps, resolveAiOps } from "@/lib/utils/scenario/ai-ops";
import type { RichDoc, ScenarioContent } from "@/types/scenario";

const doc = (text: string): RichDoc => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

const content = (): ScenarioContent => ({
  legend: [],
  sections: [
    { id: "s1", title: "Собор", played: false, rows: [{ id: "r1", story: doc("Дзвони"), notes: doc("DC 12") }, { id: "r2", story: doc("Тиша"), notes: { type: "doc", content: [] } }] },
    { id: "s2", title: "Крипта", played: false, rows: [] },
  ],
});

const ok = <T extends { ok: boolean }>(r: T) => {
  if (!r.ok) throw new Error(JSON.stringify(r));

  return r as Extract<T, { ok: true }>;
};

describe("resolveAiOps", () => {
  it("replaceRow: markdown → RichDoc, before з поточного рядка", () => {
    const { ops } = ok(resolveAiOps(content(), [{ op: "replaceRow", sectionId: "s1", rowId: "r1", story: "Дзвони **гудуть**" }]));

    expect(ops[0]).toMatchObject({ op: "replaceRow", before: { story: doc("Дзвони"), notes: doc("DC 12") } });
    expect(ops[0].op === "replaceRow" && ops[0].notes).toBeUndefined();
  });

  it("неіснуючий рядок або розділ — помилка для моделі", () => {
    expect(resolveAiOps(content(), [{ op: "replaceRow", sectionId: "s1", rowId: "nope", story: "x" }])).toMatchObject({ ok: false });
    expect(resolveAiOps(content(), [{ op: "insertRow", sectionId: "nope", story: "x" }])).toMatchObject({ ok: false });
    expect(resolveAiOps(content(), [{ op: "addSection", afterSectionId: "nope", title: "x", rows: [{ story: "y" }] }])).toMatchObject({ ok: false });
  });

  it("рядок із розміткою, що не переживає цикл, — відмова", () => {
    const c = content();

    c.sections[0].rows[0].story = { type: "doc", content: [{ type: "bulletList", content: [{ type: "listItem", content: [doc("a").content[0], doc("b").content[0]] }] }] };

    const r = resolveAiOps(c, [{ op: "replaceRow", sectionId: "s1", rowId: "r1", story: "нове" }]);

    expect(r).toMatchObject({ ok: false });
    expect(!r.ok && r.error).toContain("вручну");
  });

  describe("втрата структурних блоків", () => {
    const rich = (): ScenarioContent => {
      const c = content();

      const callout = { type: "callout", attrs: { kind: "check", tag: "" }, content: [doc("DC").content[0]] };

      const secret = { type: "paragraph", content: [{ type: "text", text: "таємниця", marks: [{ type: "secret" }] }] };

      c.sections[0].rows[0].story = { type: "doc", content: [doc("a").content[0], callout, callout, callout, secret] } as RichDoc;

      return c;
    };

    it("втрата виносок і секрету — помилка з кількостями", () => {
      const r = resolveAiOps(rich(), [{ op: "replaceRow", sectionId: "s1", rowId: "r1", story: "Коротко" }]);

      expect(r.ok).toBe(false);
      expect(!r.ok && r.error).toContain("3 виноски");
      expect(!r.ok && r.error).toContain("1 секрет");
    });

    it("allowRemoval: true дозволяє", () => {
      expect(resolveAiOps(rich(), [{ op: "replaceRow", sectionId: "s1", rowId: "r1", story: "Коротко", allowRemoval: true }]).ok).toBe(true);
    });

    it("збережені блоки (рівно або більше) — ok", () => {
      const md = "a\n\n:::callout kind=\"check\" tag=\"\"\nDC\n:::\n\n:::callout kind=\"check\" tag=\"\"\nDC\n:::\n\n:::callout kind=\"check\" tag=\"\"\nDC\n:::\n\n||таємниця||\n\n:::say\nпривіт\n:::";

      expect(resolveAiOps(rich(), [{ op: "replaceRow", sectionId: "s1", rowId: "r1", story: md }]).ok).toBe(true);
    });

    it("втрата лише секрету виявляється", () => {
      const c = content();

      c.sections[0].rows[0].notes = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "s", marks: [{ type: "secret" }] }] }] } as RichDoc;

      const r = resolveAiOps(c, [{ op: "replaceRow", sectionId: "s1", rowId: "r1", notes: "відкрито" }]);

      expect(!r.ok && r.error).toContain("1 секрет");
    });
  });

  it("insertRow і addSection генерують нові унікальні id", () => {
    const { ops } = ok(resolveAiOps(content(), [{ op: "insertRow", sectionId: "s1", afterRowId: "r1", story: "Новий" }, { op: "addSection", afterSectionId: "s1", title: "Двір", rows: [{ story: "Сніг" }] }]));

    const ids = [ops[0].op === "insertRow" && ops[0].row.id, ops[1].op === "addSection" && ops[1].section.id, ops[1].op === "addSection" && ops[1].section.rows[0].id];

    expect(new Set(ids).size).toBe(3);
    expect(ids).not.toContain("r1");
  });
});

describe("applyAiOps", () => {
  it("застосовує всі чотири операції в правильні місця", () => {
    const { ops } = ok(resolveAiOps(content(), [
      { op: "replaceRow", sectionId: "s1", rowId: "r2", notes: "тихо" },
      { op: "insertRow", sectionId: "s1", afterRowId: "r1", story: "Між" },
      { op: "addSection", afterSectionId: "s1", title: "Двір", rows: [{ story: "Сніг" }] },
      { op: "renameSection", sectionId: "s2", title: "Глибока крипта" },
    ]));

    const next = ok(applyAiOps(content(), ops)).content;

    expect(next.sections.map((s) => s.title)).toEqual(["Собор", "Двір", "Глибока крипта"]);
    expect(next.sections[0].rows.map((r) => r.id)[0]).toBe("r1");
    expect(next.sections[0].rows).toHaveLength(3);
    expect(next.sections[0].rows[2].notes).toEqual(doc("тихо"));
    expect(next.sections[0].rows[2].story).toEqual(doc("Тиша"));
  });

  it("insertRow без afterRowId — на початок розділу", () => {
    const { ops } = ok(resolveAiOps(content(), [{ op: "insertRow", sectionId: "s1", story: "Перший" }]));

    expect(ok(applyAiOps(content(), ops)).content.sections[0].rows[0].story).toEqual(doc("Перший"));
  });

  it("змінений рядок після пропозиції — stale", () => {
    const { ops } = ok(resolveAiOps(content(), [{ op: "replaceRow", sectionId: "s1", rowId: "r1", story: "x" }]));

    const edited = content();

    edited.sections[0].rows[0].story = doc("Дзвони!");

    expect(applyAiOps(edited, ops)).toEqual({ ok: false });
  });

  it("зміни в інших рядках не роблять пропозицію stale", () => {
    const { ops } = ok(resolveAiOps(content(), [{ op: "replaceRow", sectionId: "s1", rowId: "r1", story: "x" }]));

    const edited = content();

    edited.sections[0].rows[1].story = doc("Інше");

    expect(applyAiOps(edited, ops).ok).toBe(true);
  });

  it("зниклий рядок, сусід чи розділ — stale", () => {
    const { ops } = ok(resolveAiOps(content(), [{ op: "insertRow", sectionId: "s1", afterRowId: "r2", story: "x" }]));

    const edited = content();

    edited.sections[0].rows.pop();

    expect(applyAiOps(edited, ops)).toEqual({ ok: false });
  });

  it("порядок ключів JSONB не впливає на перевірку before", () => {
    const { ops } = ok(resolveAiOps(content(), [{ op: "replaceRow", sectionId: "s1", rowId: "r1", story: "x" }]));

    const reordered = JSON.parse(JSON.stringify(content(), (_k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).reverse()) : v)));

    expect(applyAiOps(reordered, ops).ok).toBe(true);
  });
});
