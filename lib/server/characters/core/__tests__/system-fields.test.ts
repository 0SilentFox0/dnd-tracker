import { describe, expect, it } from "vitest";

import { createCharacterSchema } from "../create-character-schema";
import { normalizeCharacterInput } from "../system-fields";
import { updateCharacterSchema } from "../update-character-schema";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/server/content/errors";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { RULE_SYSTEM_REGISTRY } from "@/lib/utils/rules/systems";
import { WFRP_RULES } from "@/lib/utils/rules/systems/wfrp/rules-preset";

const wfrp = RULE_SYSTEM_REGISTRY.wfrp;

const d20 = RULE_SYSTEM_REGISTRY.dnd5e;

const create = (extra: Record<string, unknown> = {}) => createCharacterSchema.parse({ name: "Hero", type: "player", controlledBy: "u", class: "x", race: "human", ...extra });

describe("normalizeCharacterInput", () => {
  it("wfrp create without characteristics is a 400", () => {
    try {
      normalizeCharacterInput(wfrp, create(), WFRP_RULES, "create");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ContentError);
      expect(error).toMatchObject({ status: 400, message: API_ERRORS.CHARACTERISTICS_REQUIRED });
    }
  });

  it("wfrp create writes defaults for d20 fields", () => {
    const data = normalizeCharacterInput(wfrp, create({ characteristics: {}, initiative: 0, strength: 18, level: 5, speed: 40 }), { ...WFRP_RULES, initiative: { ...WFRP_RULES.initiative, heroMin: 10 } }, "create");

    expect(data).toMatchObject({ initiative: 10, strength: 10, charisma: 10, level: 1, armorClass: 10, archetype: null, classes: [], speed: 30 });
  });

  it("wfrp update drops d20 fields", () => {
    const data = normalizeCharacterInput(wfrp, updateCharacterSchema.parse({ name: "N", strength: 18, armorClass: 12, level: 3, initiative: 5 }), WFRP_RULES, "update");

    expect(data).toEqual({ name: "N" });
  });

  it("d20 drops characteristics", () => {
    const data = normalizeCharacterInput(d20, create({ characteristics: {} }), DEFAULT_RULES, "create");

    expect("characteristics" in data).toBe(false);
    expect(normalizeCharacterInput(d20, updateCharacterSchema.parse({ characteristics: {} }), DEFAULT_RULES, "update")).toEqual({});
  });
});
