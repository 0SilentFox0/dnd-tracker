// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CharacterAbilitiesSection } from "@/components/characters/abilities/CharacterAbilitiesSection";
import { MAIN_SKILL_BY_CATEGORY } from "@/lib/constants/main-skills";

const hooks = vi.hoisted(() => ({ useMainSkills: vi.fn(), usePersonalSkills: vi.fn() }));

const selectProps = vi.hoisted(() => ({ options: [] as { value: string; label: string }[] }));

vi.mock("@/lib/hooks/skills", () => hooks);

vi.mock("@/components/ui/select-field", () => ({
  SelectField: (props: { options: { value: string; label: string }[] }) => {
    selectProps.options = props.options;

    return null;
  },
}));

const abilities = { personalSkillId: "", setters: { setPersonalSkillId: vi.fn() } };

describe("CharacterAbilitiesSection", () => {
  beforeEach(() => {
    hooks.usePersonalSkills.mockReturnValue({ data: [{ id: "s1", name: "Поклик", icon: null, description: null }] });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("запитує скіли за id основного навику «Персональні»", () => {
    hooks.useMainSkills.mockReturnValue({
      data: [
        { id: "m1", name: "Бойові" },
        { id: "m2", name: MAIN_SKILL_BY_CATEGORY.Personal },
      ],
    });
    render(<CharacterAbilitiesSection campaignId="c" abilities={abilities} />);

    expect(hooks.usePersonalSkills).toHaveBeenCalledWith("c", "m2");
    expect(selectProps.options).toEqual([{ value: "s1", label: "Поклик" }]);
  });

  it("без основного навику «Персональні» id не передається і опцій немає", () => {
    hooks.useMainSkills.mockReturnValue({ data: [{ id: "m1", name: "Бойові" }] });
    hooks.usePersonalSkills.mockReturnValue({ data: undefined });
    render(<CharacterAbilitiesSection campaignId="c" abilities={abilities} />);

    expect(hooks.usePersonalSkills).toHaveBeenCalledWith("c", undefined);
    expect(selectProps.options).toEqual([]);
  });
});
