import { describe, expect, it } from "vitest";

import { makeT } from "@/lib/i18n/test/mock-t";
import { applyAiOps, resolveAiOps as resolve } from "@/lib/utils/scenario/ai-ops";
import { blockInventory, lostBlocks } from "@/lib/utils/scenario/block-inventory";
import type { ScenarioAiOpInput } from "@/types/ai";
import type { RichDoc, ScenarioContent } from "@/types/scenario";

const doc = (text: string): RichDoc => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

const content = (): ScenarioContent => ({
  legend: [],
  sections: [
    { id: "s1", title: "Собор", played: false, rows: [{ id: "r1", story: doc("Дзвони"), notes: doc("DC 12") }, { id: "r2", story: doc("Тиша"), notes: { type: "doc", content: [] } }] },
    { id: "s2", title: "Крипта", played: false, rows: [] },
  ],
});

const t = makeT("assistant");

const resolveAiOps = (c: ScenarioContent, ops: Parameters<typeof resolve>[1]) => resolve(c, ops, t);

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
    expect(!r.ok && r.error).toEqual({ message: "assistant.scenarioOps.lossyRow", params: { id: "r1" } });
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
      expect(!r.ok && r.error.message).toBe("assistant.scenarioOps.removal");
      expect(!r.ok && r.error.params?.lost).toContain('assistant.blocks.callout {"count":3}');
      expect(!r.ok && r.error.params?.lost).toContain('assistant.blocks.secret {"count":1}');
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

      expect(!r.ok && r.error.params?.lost).toContain('assistant.blocks.secret {"count":1}');
    });
  });

  it("insertRow і addSection генерують нові унікальні id", () => {
    const { ops } = ok(resolveAiOps(content(), [{ op: "insertRow", sectionId: "s1", afterRowId: "r1", story: "Новий" }, { op: "addSection", afterSectionId: "s1", title: "Двір", rows: [{ story: "Сніг" }] }]));

    const ids = [ops[0].op === "insertRow" && ops[0].row.id, ops[1].op === "addSection" && ops[1].section.id, ops[1].op === "addSection" && ops[1].section.rows[0].id];

    expect(new Set(ids).size).toBe(3);
    expect(ids).not.toContain("r1");
  });
});

describe("resolveAiOps createAcquaintance", () => {
  it("зберігає ref, ім'я та порожній опис за замовчуванням", () => {
    const { ops } = ok(resolveAiOps(content(), [{ op: "createAcquaintance", ref: "b", name: "Беатріс" }]));

    expect(ops).toEqual([{ op: "createAcquaintance", ref: "b", name: "Беатріс", description: "" }]);
  });

  it("applyAiOps не змінює сценарій для createAcquaintance", () => {
    const c = content();

    expect(applyAiOps(c, [{ op: "createAcquaintance", ref: "b", name: "Беатріс", description: "" }])).toEqual({ ok: true, content: c });
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

describe("resolveAiOps linkMentions", () => {
  const withName = (): ScenarioContent => ({
    legend: [],
    sections: [
      { id: "s1", title: "Бал", played: false, rows: [{ id: "r1", story: doc("Беатріс танцює"), notes: doc("Дай Беатрісі ключ") }, { id: "r2", story: doc("Тиша"), notes: doc("") }] },
      { id: "s2", title: "Сад", played: false, rows: [{ id: "r3", story: doc("Лист для Беатріс"), notes: doc("") }] },
    ],
  });

  const create = { op: "createAcquaintance", ref: "b", name: "Беатріс" } as const;

  const link = (extra: object = {}): ScenarioAiOpInput => ({ op: "linkMentions", acquaintance: { ref: "b" }, forms: ["Беатріс", "Беатрісі"], ...extra });

  it("ref: replaceRow per changed row with @ref placeholder id and before", () => {
    const c = withName();

    const { ops } = ok(resolveAiOps(c, [create, link()]));

    const rows = ops.filter((o) => o.op === "replaceRow");

    expect(rows.map((o) => o.op === "replaceRow" && o.rowId)).toEqual(["r1", "r3"]);

    const first = rows[0];

    if (first.op !== "replaceRow") throw new Error("x");

    expect(first.story?.content[0].content?.[0].attrs).toEqual({ id: "@ref:b", label: "Беатріс", type: "acquaintance" });
    expect(first.notes?.content[0].content?.[1].attrs?.label).toBe("Беатрісі");
    expect(first.before.story).toEqual(c.sections[0].rows[0].story);
    expect(ok(applyAiOps(c, ops)).content.sections[0].rows[0].story.content[0].content?.[0].type).toBe("mention");
  });

  it("id target is written as is; sectionId, rowIds and fields narrow the scope", () => {
    const { ops } = ok(resolveAiOps(withName(), [link({ acquaintance: { id: "real" }, sectionId: "s1", rowIds: ["r1"], fields: ["notes"] })]));

    expect(ops).toHaveLength(1);

    const op = ops[0];

    if (op.op !== "replaceRow") throw new Error("x");

    expect(op.story).toBeUndefined();
    expect(op.notes?.content[0].content?.[1].attrs?.id).toBe("real");
  });

  it("zero occurrences -> noMentions, no ops", () => {
    const r = resolveAiOps(withName(), [create, link({ forms: ["Гаррі"] })]);

    expect(r).toMatchObject({ ok: false, error: { message: "assistant.scenarioOps.noMentions" } });
  });

  it("already linked occurrences are skipped, so a second pass is noMentions", () => {
    const c = withName();

    const first = ok(resolveAiOps(c, [create, link()]));

    const applied = ok(applyAiOps(c, first.ops));

    expect(resolveAiOps(applied.content, [link({ acquaintance: { id: "@ref:b" } })])).toMatchObject({ ok: false, error: { message: "assistant.scenarioOps.noMentions" } });
  });

  it("unknown ref and unknown section fail", () => {
    expect(resolveAiOps(withName(), [link()])).toMatchObject({ ok: false, error: { message: "assistant.scenarioOps.refMissing" } });
    expect(resolveAiOps(withName(), [create, link({ sectionId: "zz" })])).toMatchObject({ ok: false, error: { message: "assistant.scenarioOps.sectionMissing" } });
  });

  it("two linkMentions over the same row chain their before states", () => {
    const c = withName();

    const { ops } = ok(resolveAiOps(c, [create, link({ forms: ["Беатріс"], fields: ["story"] }), link({ forms: ["Беатрісі"], fields: ["notes"] })]));

    expect(ok(applyAiOps(c, ops)).content.sections[0].rows[0].notes.content[0].content?.[1].type).toBe("mention");
  });

  it("block inventory: mention count grows and nothing is reported lost", () => {
    const { ops } = ok(resolveAiOps(withName(), [create, link()]));

    for (const o of ops) if (o.op === "replaceRow") expect(lostBlocks(o.before.story, o.story ?? o.before.story)).toEqual({});

    const row = ops.find((o) => o.op === "replaceRow");

    expect(row?.op === "replaceRow" && blockInventory(row.story as RichDoc).mention).toBe(1);
  });
});
