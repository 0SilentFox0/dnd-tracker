// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ShowBattleCall } from "@/components/show/stage/ShowBattleCall";

afterEach(cleanup);

describe("ShowBattleCall", () => {
  it("посилання на бій з назвою", () => {
    render(<ShowBattleCall campaignId="c1" battle={{ id: "b1", name: "Засідка" }} />);

    const link = screen.getByRole("link", { name: /До бою!/ });

    expect(link.getAttribute("href")).toBe("/campaigns/c1/battles/b1");
    expect(screen.getByText("Засідка")).toBeTruthy();
  });
});
