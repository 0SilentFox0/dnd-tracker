// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SetList } from "@/components/character-profile/SetList";

describe("SetList", () => {
  afterEach(cleanup);

  it("неповний сет — have/total і що дасть повний; повний — золотом з ефектами", () => {
    render(
      <SetList
        sets={[
          { setId: "s1", name: "Мисливець", have: 2, total: 3, complete: false, effects: ["Ініціатива +1"] },
          { setId: "s2", name: "Дракон", have: 2, total: 2, complete: true, effects: ["AC +1", "Сила +2"] },
        ]}
      />,
    );

    expect(screen.getByText(/«Мисливець» 2\/3/)).toBeTruthy();
    expect(screen.getByText("З повним сетом: Ініціатива +1")).toBeTruthy();
    expect(screen.getByText(/«Дракон» 2\/2/).className).toContain("text-[#e6c25a]");
    expect(screen.getByText("AC +1 · Сила +2")).toBeTruthy();
  });

  it("порожній список нічого не рендерить", () => {
    const { container } = render(<SetList sets={[]} />);

    expect(container.firstChild).toBeNull();
  });
});
