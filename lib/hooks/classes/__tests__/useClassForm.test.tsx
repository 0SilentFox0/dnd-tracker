// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildClassBody, useClassForm } from "../useClassForm";

import type { ClassFormData } from "@/types/classes";

const mutate = vi.fn();

const navigateFresh = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/hooks/common", () => ({ useNavigateFresh: () => navigateFresh }));
vi.mock("../useClasses", () => ({ useUpdateClass: () => ({ mutate, isPending: false }) }));

const initial: ClassFormData = {
  name: "  Воїн  ",
  icon: "",
  color: "",
  hitDie: 10,
  savingThrows: ["strength", "constitution"],
  proficiencies: { armor: ["Важкі"], weapons: [], tools: [] },
  skillChoices: { count: 2, from: ["athletics"] },
  caster: "none",
  spellcastingAbility: "wisdom",
  features: [{ level: 1, abilities: [] }],
  subclassLevel: null,
  subclasses: [],
};

const submitEvent = () => ({ preventDefault: vi.fn() }) as unknown as React.FormEvent;

describe("useClassForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("збирає тіло запиту з форми", () => {
    const { result } = renderHook(() => useClassForm("c1", "k1", initial));

    act(() => result.current.actions.submit(submitEvent()));

    expect(mutate).toHaveBeenCalledWith(
      {
        classId: "k1",
        data: {
          ...initial,
          name: "Воїн",
          icon: null,
          color: null,
          spellcastingAbility: null,
        },
      },
      expect.any(Object),
    );
  });

  it("залишає характеристику заклинань для заклинача", () => {
    const { result } = renderHook(() => useClassForm("c1", "k1", { ...initial, caster: "full" }));

    act(() => result.current.actions.submit(submitEvent()));

    expect(mutate.mock.calls[0][0].data).toMatchObject({ caster: "full", spellcastingAbility: "wisdom" });
  });

  it("не надсилає, поки у здібностях є помилки", () => {
    const { result } = renderHook(() => useClassForm("c1", "k1", initial));

    act(() => result.current.abilities.setErrors(2));
    act(() => result.current.actions.submit(submitEvent()));

    expect(mutate).not.toHaveBeenCalled();
  });

  it("змінює форму через form.set", () => {
    const { result } = renderHook(() => useClassForm("c1", "k1", initial));

    act(() => result.current.form.set((p) => ({ ...p, hitDie: 12 })));
    act(() => result.current.actions.submit(submitEvent()));

    expect(mutate.mock.calls[0][0].data.hitDie).toBe(12);
  });

  it("порожні підкласи — subclassLevel null", () => {
    expect(buildClassBody({ ...initial, subclassLevel: 3, subclasses: [] }).subclassLevel).toBeNull();
  });
});
