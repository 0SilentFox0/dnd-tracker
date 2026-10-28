import { beforeEach, describe, expect, it, vi } from "vitest";

import { isClassMode, resolveDraftClass } from "../draft-class";
import { draftFields } from "../draft-data";
import { classDraftSchema, draftSchema } from "../draft-schema";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { DEFAULT_RULES } from "@/lib/utils/rules";

const mocks = vi.hoisted(() => ({ getCachedClasses: vi.fn(), applyClasses: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/cache/reference-data", () => ({ getCachedClasses: mocks.getCachedClasses }));
vi.mock("@/lib/server/characters/apply-classes", () => ({ applyClasses: mocks.applyClasses }));

const on = { ...DEFAULT_RULES, classes: { ...DEFAULT_RULES.classes, enabled: true } };

const base = { name: "Герой", race: "Люди", method: "standard", strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8 };

beforeEach(() => vi.clearAllMocks());

describe("isClassMode", () => {
  it("needs enabled rules and at least one class", async () => {
    mocks.getCachedClasses.mockResolvedValue([{ id: "c1" }]);

    expect(await isClassMode("camp", on)).toBe(true);
    expect(await isClassMode("camp", DEFAULT_RULES)).toBe(false);

    mocks.getCachedClasses.mockResolvedValue([]);

    expect(await isClassMode("camp", on)).toBe(false);
  });
});

describe("resolveDraftClass", () => {
  it("requires classId", async () => {
    expect(await resolveDraftClass({ campaignId: "c", rules: on, maxLevel: 20, classId: undefined })).toEqual({ ok: false, status: 422, error: API_ERRORS.DRAFT_CLASS_REQUIRED });
  });

  it("applies a level-1 class entry and clears the archetype", async () => {
    mocks.applyClasses.mockResolvedValue({ ok: true, data: { classes: [{ classId: "c1", level: 1 }], level: 1, class: "Бард", subclass: null, spellSlots: { "1": { max: 2, current: 2 } }, spellcastingAbility: "charisma" } });

    const res = await resolveDraftClass({ campaignId: "c", rules: on, maxLevel: 20, classId: "c1" });

    expect(mocks.applyClasses).toHaveBeenCalledWith(expect.objectContaining({ entries: [{ classId: "c1", level: 1 }] }));
    expect(res).toMatchObject({ ok: true, fields: { class: "Бард", level: 1, archetype: null, classes: [{ classId: "c1", level: 1 }] }, spellSlots: { "1": { max: 2, current: 2 } } });
  });

  it("passes applyClasses errors through", async () => {
    mocks.applyClasses.mockResolvedValue({ ok: false, status: 422, error: API_ERRORS.CLASS_NOT_FOUND });

    expect(await resolveDraftClass({ campaignId: "c", rules: on, maxLevel: 20, classId: "x" })).toMatchObject({ ok: false, error: API_ERRORS.CLASS_NOT_FOUND });
  });
});

describe("draft schemas", () => {
  it("HOMM schema still requires class and archetype", () => {
    expect(draftSchema.safeParse(base).success).toBe(false);
    expect(draftSchema.safeParse({ ...base, class: "Воїн", archetype: "warrior" }).success).toBe(true);
  });

  it("class schema accepts classId without class/archetype", () => {
    const parsed = classDraftSchema.parse({ ...base, classId: "c1", class: "ignored", archetype: "mage" });

    expect(parsed).toMatchObject({ classId: "c1" });
    expect(parsed).not.toHaveProperty("archetype");
    expect(draftFields(parsed)).toMatchObject({ class: "", archetype: null });
  });
});
