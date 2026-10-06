// @vitest-environment happy-dom
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useCharacterForm } from "@/lib/hooks/characters";

describe("useCharacterForm", () => {
  it("без мертвих прив'язок: roleplay, мови, known spells", () => {
    const { result } = renderHook(() => useCharacterForm({ onSubmit: vi.fn() }));

    for (const key of ["roleplay", "addLanguage", "removeLanguage", "addKnownSpell", "removeKnownSpell"]) {
      expect(result.current).not.toHaveProperty(key);
    }

    expect(result.current.spellcasting).not.toHaveProperty("handlers");
    expect(result.current.spellcasting.setters).not.toHaveProperty("setKnownSpells");
    expect(result.current.formData.roleplay).toEqual({ languages: [], proficiencies: {}, immunities: [] });
  });

  it("type з опцій задає тип нового персонажа", () => {
    const { result } = renderHook(() => useCharacterForm({ type: "npc_hero", onSubmit: vi.fn() }));

    expect(result.current.formData.basicInfo.type).toBe("npc_hero");
    expect(result.current.formData.spellcasting.spellSlots).toEqual({});
  });
});
