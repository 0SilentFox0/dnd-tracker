// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useCharacterForm } from "@/lib/hooks/characters";

describe("useCharacterForm", () => {
  it("без мертвих прив'язок: roleplay, мови, known spells", () => {
    const { result } = renderHook(() => useCharacterForm({ onSubmit: vi.fn() }));

    for (const key of ["roleplay", "addLanguage", "removeLanguage", "addKnownSpell", "removeKnownSpell"]) {
      expect(result.current).not.toHaveProperty(key);
    }

    expect(Object.keys(result.current.spellcasting)).toEqual(["data", "set"]);
    expect(result.current.formData.roleplay).toEqual({ languages: [], proficiencies: {}, immunities: [] });
  });

  it("type з опцій задає тип нового персонажа", () => {
    const { result } = renderHook(() => useCharacterForm({ type: "npc_hero", onSubmit: vi.fn() }));

    expect(result.current.formData.basicInfo.type).toBe("npc_hero");
    expect(result.current.formData.spellcasting.spellSlots).toEqual({});
  });

  it("set секції оновлює лише свій ключ", () => {
    const { result } = renderHook(() => useCharacterForm({ onSubmit: vi.fn() }));

    act(() => result.current.abilityScores.set("strength", 17));
    act(() => result.current.basicInfo.set("name", "Ліра"));

    expect(result.current.formData.abilityScores.strength).toBe(17);
    expect(result.current.formData.abilityScores.dexterity).toBe(10);
    expect(result.current.basicInfo.data.name).toBe("Ліра");
  });
});
