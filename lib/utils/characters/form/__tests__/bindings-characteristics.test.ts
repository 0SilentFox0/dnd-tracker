import { describe, expect, it } from "vitest";

import { formDataToCharacter } from "@/lib/utils/characters/character-form";
import { buildCharacterFormBindings } from "@/lib/utils/characters/form/bindings";
import { defaultCharacterFormData } from "@/lib/utils/characters/form/defaults";
import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";
import type { CharacterFormData } from "@/types/characters";

describe("characteristics binding", () => {
  it("set updates only the given characteristics field", () => {
    let state: CharacterFormData = defaultCharacterFormData;

    const setFormData = (update: React.SetStateAction<CharacterFormData>) => {
      state = typeof update === "function" ? update(state) : update;
    };

    const { characteristics } = buildCharacterFormBindings(state, setFormData as never, { toggleSavingThrow: () => {}, toggleSkill: () => {} });

    characteristics.set("fate", 3);

    expect(state.characteristics).toEqual({ ...defaultCharacterFormData.characteristics, fate: 3 });
    expect(state.basicInfo).toBe(defaultCharacterFormData.basicInfo);
  });

  it("formDataToCharacter carries characteristics", () => {
    const data = { ...defaultCharacterFormData, characteristics: { ...DEFAULT_CHARACTERISTICS, move: 5 } };

    expect(formDataToCharacter(data).characteristics?.move).toBe(5);
  });
});
