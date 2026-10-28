import { beforeEach, describe, expect, it, vi } from "vitest";

import { applyClasses, validateClassEntries } from "../apply-classes";

import { getCachedClasses } from "@/lib/cache/reference-data";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";
import type { GameClassData } from "@/types/classes";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/cache/reference-data", () => ({ getCachedClasses: vi.fn() }));

const cls = (over: Partial<GameClassData> = {}): GameClassData => ({
  id: "c1",
  name: "Воїн",
  icon: null,
  color: null,
  hitDie: 10,
  savingThrows: [],
  proficiencies: { armor: [], weapons: [], tools: [] },
  skillChoices: { count: 0, from: [] },
  caster: "none",
  spellcastingAbility: null,
  features: [],
  subclassLevel: null,
  subclasses: [],
  ...over,
});

const row = (c: GameClassData) => ({ ...c, campaignId: "camp", proficiencies: c.proficiencies, skillChoices: c.skillChoices, subclasses: c.subclasses, features: [] });

const ON = { ...DEFAULT_RULES, classes: { enabled: true } };

const base = { campaignId: "camp", rules: ON, maxLevel: 20, spellcastingAbility: null };

describe("validateClassEntries", () => {
  const champ = { id: "s1", name: "Чемпіон", features: [] };

  it("rejects unknown class", () => {
    expect(validateClassEntries([{ classId: "x", level: 1 }], {}, 20)).toBe("Клас не знайдено");
  });

  it("rejects subclass before subclassLevel", () => {
    expect(validateClassEntries([{ classId: "c1", subclassId: "s1", level: 2 }], { c1: cls({ subclassLevel: 3, subclasses: [champ] }) }, 20)).toMatch(/рівня 3/);
  });

  it("rejects subclass of another class", () => {
    const byId = { c1: cls({ subclassLevel: 3, subclasses: [champ] }), c2: cls({ id: "c2", subclassLevel: 3 }) };

    expect(validateClassEntries([{ classId: "c2", subclassId: "s1", level: 5 }], byId, 20)).toBe("Підклас не знайдено в цьому класі");
  });

  it("accepts subclass at subclassLevel", () => {
    expect(validateClassEntries([{ classId: "c1", subclassId: "s1", level: 3 }], { c1: cls({ subclassLevel: 3, subclasses: [champ] }) }, 20)).toBeNull();
  });

  it("rejects total level above campaign max", () => {
    expect(validateClassEntries([{ classId: "c1", level: 12 }], { c1: cls() }, 10)).toBe("Максимальний рівень кампанії — 10");
  });
});

describe("applyClasses", () => {
  beforeEach(() => {
    vi.mocked(getCachedClasses).mockResolvedValue([
      row(cls()),
      row(cls({ id: "c2", name: "Чаклун", caster: "pact", spellcastingAbility: "charisma" })),
    ] as never);
  });

  it("rejects classes when rules disabled", async () => {
    expect(await applyClasses({ ...base, rules: DEFAULT_RULES, entries: [{ classId: "c1", level: 1 }] })).toMatchObject({ ok: false, status: 422 });
  });

  it("empty entries change nothing", async () => {
    expect(await applyClasses({ ...base, rules: DEFAULT_RULES, entries: [] })).toEqual({ ok: true, data: null });
  });

  it("rejects unknown class", async () => {
    expect(await applyClasses({ ...base, entries: [{ classId: "zz", level: 1 }] })).toMatchObject({ ok: false, error: "Клас не знайдено" });
  });

  it("derives level, label and slots", async () => {
    const res = await applyClasses({
      ...base,
      entries: [
        { classId: "c1", level: 3 },
        { classId: "c2", level: 2 },
      ],
    });

    expect(res).toMatchObject({
      ok: true,
      data: { level: 5, class: "Воїн 3 / Чаклун 2", subclass: null, spellSlots: { pact: { level: 1, max: 2, current: 2 } }, spellcastingAbility: "charisma" },
    });
  });

  it("keeps manual spellcasting ability", async () => {
    const res = await applyClasses({ ...base, spellcastingAbility: "wisdom", entries: [{ classId: "c2", level: 1 }] });

    expect(res).toMatchObject({ ok: true, data: { spellcastingAbility: undefined } });
  });
});

describe("applyClasses spellcastingAbility", () => {
  beforeEach(() => vi.mocked(getCachedClasses).mockReset());

  it("не персиститься, якщо ключова характеристика класу поза списком заклинальних", async () => {
    vi.mocked(getCachedClasses).mockResolvedValue([row(cls({ caster: "half", spellcastingAbility: "strength" }))] as never);

    const res = await applyClasses({ ...base, entries: [{ classId: "c1", level: 3 }] });

    expect(res.ok && res.data?.spellcastingAbility).toBeUndefined();
  });

  it("мудрість зберігається", async () => {
    vi.mocked(getCachedClasses).mockResolvedValue([row(cls({ caster: "full", spellcastingAbility: "wisdom" }))] as never);

    const res = await applyClasses({ ...base, entries: [{ classId: "c1", level: 3 }] });

    expect(res.ok && res.data?.spellcastingAbility).toBe("wisdom");
  });
});

