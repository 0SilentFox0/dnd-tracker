/**
 * @vitest-environment happy-dom
 */
import { cleanup,render, screen } from "@testing-library/react";
import { afterEach,describe, expect, it } from "vitest";

import { AbilityBonusIcons } from "@/components/skills/icons/AbilityBonusIcons";

describe("AbilityBonusIcons", () => {
  afterEach(cleanup);

  it("повертає null при порожніх бонусах", () => {
    const { container } = render(<AbilityBonusIcons bonuses={{}} />);

    expect(container.firstChild).toBeNull();
  });

  it("не показує атрибути з нульовим значенням", () => {
    const { container } = render(
      <AbilityBonusIcons bonuses={{ strength: 0, dexterity: 1 }} />,
    );

    expect(container.firstChild).not.toBeNull();
    expect(screen.getByText("+1")).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("рендерить бейджі для кожного ненульового бонусу", () => {
    render(
      <AbilityBonusIcons
        bonuses={{
          strength: 2,
          intelligence: -1,
        }}
      />,
    );
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.getByText("-1")).toBeInTheDocument();
  });

  it("застосовує переданий className", () => {
    const { container } = render(
      <AbilityBonusIcons bonuses={{ strength: 1 }} className="custom-class" />,
    );

    const wrapper = container.firstChild as HTMLElement;

    expect(wrapper).toHaveClass("custom-class");
  });
});
