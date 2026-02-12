/**
 * @vitest-environment happy-dom
 */
import { cleanup, fireEvent,render, screen } from "@testing-library/react";
import { afterEach,describe, expect, it, vi } from "vitest";

import { SkillEffectRow } from "@/components/skills/form/effects/SkillEffectRow";
import type { SkillEffect } from "@/types/battle";

function minimalEffect(overrides: Partial<SkillEffect> = {}): SkillEffect {
  return {
    stat: "melee_damage",
    type: "flat",
    value: 10,
    isPercentage: false,
    duration: undefined,
    maxTriggers: null,
    ...overrides,
  };
}

describe("SkillEffectRow", () => {
  afterEach(cleanup);

  it("рендерить лейбли Стат, Тип, Значення, Раунди, Разів", () => {
    const onUpdate = vi.fn();

    const onRemove = vi.fn();

    render(
      <SkillEffectRow
        effect={minimalEffect()}
        index={0}
        onUpdate={onUpdate}
        onRemove={onRemove}
      />,
    );
    expect(screen.getByText("Стат")).toBeInTheDocument();
    expect(screen.getByText("Тип")).toBeInTheDocument();
    expect(screen.getByText("Значення")).toBeInTheDocument();
    expect(screen.getByText("Раунди")).toBeInTheDocument();
    expect(screen.getByText("Разів")).toBeInTheDocument();
  });

  it("викликає onRemove з індексом при кліку на кнопку видалення", () => {
    const onUpdate = vi.fn();

    const onRemove = vi.fn();

    render(
      <SkillEffectRow
        effect={minimalEffect()}
        index={2}
        onUpdate={onUpdate}
        onRemove={onRemove}
      />,
    );

    const removeButton = screen.getByTestId("remove-effect");

    fireEvent.click(removeButton);
    expect(onRemove).toHaveBeenCalledWith(2);
  });

  it("показує числове значення для flat-ефекту", () => {
    render(
      <SkillEffectRow
        effect={minimalEffect({ type: "flat", value: 5 })}
        index={0}
        onUpdate={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const valueInput = screen.getByPlaceholderText("0");

    expect((valueInput as HTMLInputElement).value).toBe("5");
  });

  it("показує disabled поле Значення для flag-типу", () => {
    render(
      <SkillEffectRow
        effect={minimalEffect({ type: "flag", value: true })}
        index={0}
        onUpdate={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const valueInput = screen.getByDisplayValue("✓");

    expect(valueInput).toBeDisabled();
  });
});
