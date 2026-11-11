import { describe, expect, it } from "vitest";

import { formDataToCharacter } from "@/lib/utils/characters/character-form";
import { buildCharacterFormBindings } from "@/lib/utils/characters/form/bindings";
import { defaultCharacterFormData } from "@/lib/utils/characters/form/defaults";
import { DEFAULT_CHARACTERISTICS } from "@/systems/wfrp/rules/characteristics/keys";
import type { CharacterFormData } from "@/types/characters";

describe("characteristics binding", () => {
  it("update receives the previous value and replaces the stored characteristics", () => {
    let state: CharacterFormData = defaultCharacterFormData;

    const setFormData = (update: React.SetStateAction<CharacterFormData>) => {
      state = typeof update === "function" ? update(state) : update;
    };

    const { characteristics } = buildCharacterFormBindings(state, setFormData as never, { toggleSavingThrow: () => {}, toggleSkill: () => {} });

    characteristics.update((prev) => ({ ...prev, fate: 3 }));
    characteristics.update((prev) => ({ ...prev, move: 5 }));

    expect(state.characteristics).toEqual({ fate: 3, move: 5 });
    expect(state.basicInfo).toBe(defaultCharacterFormData.basicInfo);
  });

  it("formDataToCharacter carries characteristics", () => {
    const data = { ...defaultCharacterFormData, characteristics: { ...DEFAULT_CHARACTERISTICS, move: 5 } };

    expect(formDataToCharacter(data).characteristics?.move).toBe(5);
  });
});
