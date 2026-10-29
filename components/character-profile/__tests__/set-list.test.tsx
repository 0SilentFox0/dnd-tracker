// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SetList } from "@/components/character-profile/SetList";

const line = (value: string) => [{ key: "summary.text", params: { value } }];

const shown = (value: string) => `abilityRegistry.summary.text {"value":"${value}"}`;

describe("SetList", () => {
  afterEach(cleanup);

  it("неповний сет — have/total і що дасть повний; повний — золотом з ефектами", () => {
    render(
      <SetList
        sets={[
          { setId: "s1", name: "Мисливець", have: 2, total: 3, complete: false, effects: [line("Ініціатива +1")] },
          { setId: "s2", name: "Дракон", have: 2, total: 2, complete: true, effects: [line("AC +1"), line("Сила +2")] },
        ]}
      />,
    );

    expect(screen.getByText(/characterProfile\.sets\.name .*"name":"Мисливець".*"have":2/)).toBeTruthy();
    expect(screen.getByText(`characterProfile.sets.withFull {"effects":${JSON.stringify(shown("Ініціатива +1"))}}`)).toBeTruthy();
    expect(screen.getByText(/"name":"Дракон"/).className).toContain("text-hud-gold-strong");
    expect(screen.getByText(`${shown("AC +1")} · ${shown("Сила +2")}`)).toBeTruthy();
  });

  it("порожній список нічого не рендерить", () => {
    const { container } = render(<SetList sets={[]} />);

    expect(container.firstChild).toBeNull();
  });
});
