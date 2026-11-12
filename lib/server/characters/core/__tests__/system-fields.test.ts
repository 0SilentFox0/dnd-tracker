import { describe, expect, it } from "vitest";

import { createCharacterSchema } from "../create-character-schema";
import { normalizeCharacterInput } from "../system-fields";
import { updateCharacterSchema } from "../update-character-schema";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/server/content/errors";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { RULE_SYSTEM_REGISTRY } from "@/lib/utils/rules/systems";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";

const wfrp = RULE_SYSTEM_REGISTRY.wfrp;

const d20 = RULE_SYSTEM_REGISTRY.dnd5e;

const create = (extra: Record<string, unknown> = {}) => createCharacterSchema.parse({ name: "Hero", type: "player", controlledBy: "u", class: "x", race: "human", ...extra });

describe("normalizeCharacterInput", () => {
  it("d20 create without race is a 400, wfrp create accepts an empty race", () => {
    expect(() => normalizeCharacterInput(d20, create({ race: "" }), DEFAULT_RULES, "create")).toThrow(expect.objectContaining({ status: 400, message: API_ERRORS.RACE_REQUIRED }));
    expect(createCharacterSchema.parse({ name: "H", type: "player", controlledBy: "u", class: "x", characteristics: {} }).race).toBe("");
    expect(normalizeCharacterInput(wfrp, create({ race: "", characteristics: {} }), WFRP_RULES, "create").race).toBe("");
  });

  it("wfrp create without characteristics is a 400", () => {
    try {
      normalizeCharacterInput(wfrp, create(), WFRP_RULES, "create");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ContentError);
      expect(error).toMatchObject({ status: 400, message: API_ERRORS.CHARACTERISTICS_REQUIRED });
    }
  });

  it("wfrp create drops a client-supplied downtime", () => {
    const data = normalizeCharacterInput(wfrp, create({ characteristics: { downtime: { ailments: [] } } }), WFRP_RULES, "create");

    expect(data.characteristics && "downtime" in data.characteristics).toBe(false);
  });

  it("wfrp create drops a client-supplied corruption", () => {
    const data = normalizeCharacterInput(wfrp, create({ characteristics: { corruption: { points: 5, mutations: [] } } }), WFRP_RULES, "create");

    expect(data.characteristics && "corruption" in data.characteristics).toBe(false);
  });

  it("wfrp create writes defaults for d20 fields", () => {
    const data = normalizeCharacterInput(wfrp, create({ characteristics: {}, initiative: 0, strength: 18, level: 5, speed: 40 }), { ...WFRP_RULES, initiative: { ...WFRP_RULES.initiative, heroMin: 10 } }, "create");

    expect(data).toMatchObject({ initiative: 10, strength: 10, charisma: 10, level: 1, armorClass: 10, archetype: null, classes: [], speed: 30 });
  });

  it("wfrp update drops d20 fields", () => {
    const data = normalizeCharacterInput(wfrp, updateCharacterSchema.parse({ name: "N", strength: 18, armorClass: 12, level: 3, initiative: 5 }), WFRP_RULES, "update");

    expect(data).toEqual({ name: "N" });
  });

  it("wfrp create and update pass without a class and drop a sent one", () => {
    const body = { name: "Hero", type: "player", controlledBy: "u", characteristics: {} };

    expect(normalizeCharacterInput(wfrp, createCharacterSchema.parse(body), WFRP_RULES, "create")).toMatchObject({ class: "", classes: [] });
    expect(normalizeCharacterInput(wfrp, createCharacterSchema.parse({ ...body, class: "Warrior" }), WFRP_RULES, "create").class).toBe("");
    expect(normalizeCharacterInput(wfrp, updateCharacterSchema.parse({ name: "N", class: "" }), WFRP_RULES, "update")).toEqual({ name: "N" });
  });

  it("d20 still requires a class on create and forbids clearing it on update", () => {
    const bad = { name: "H", type: "player", controlledBy: "u", race: "human" };

    expect(() => normalizeCharacterInput(d20, createCharacterSchema.parse(bad), DEFAULT_RULES, "create")).toThrow(expect.objectContaining({ status: 400, message: API_ERRORS.HERO_CLASS_REQUIRED }));
    expect(() => normalizeCharacterInput(d20, updateCharacterSchema.parse({ class: "" }), DEFAULT_RULES, "update")).toThrow(expect.objectContaining({ message: API_ERRORS.HERO_CLASS_REQUIRED }));
    expect(normalizeCharacterInput(d20, createCharacterSchema.parse({ ...bad, classes: [{ classId: "c", level: 1 }] }), DEFAULT_RULES, "create").classes).toHaveLength(1);
    expect(normalizeCharacterInput(d20, updateCharacterSchema.parse({ name: "N" }), DEFAULT_RULES, "update")).toEqual({ name: "N" });
  });

  it("drops input for columns the composition does not own, for non-persisted systems too", () => {
    const noArchetype = { ...d20, stats: { columns: [{ owns: ["strength", "level"] as const }] } };

    const data = normalizeCharacterInput(noArchetype, updateCharacterSchema.parse({ name: "N", strength: 12, level: 2, archetype: "mage", speed: 40 }), DEFAULT_RULES, "update");

    expect(data).toEqual({ name: "N", strength: 12, level: 2 });
  });

  it("d20 drops characteristics", () => {
    const data = normalizeCharacterInput(d20, create({ characteristics: {} }), DEFAULT_RULES, "create");

    expect("characteristics" in data).toBe(false);
    expect(normalizeCharacterInput(d20, updateCharacterSchema.parse({ characteristics: {} }), DEFAULT_RULES, "update")).toEqual({});
  });
});
