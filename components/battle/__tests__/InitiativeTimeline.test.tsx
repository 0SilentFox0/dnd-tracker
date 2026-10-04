/**
 * @vitest-environment happy-dom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { InitiativeTimeline } from "@/components/battle/InitiativeTimeline";
import type { BattleScene } from "@/types/api";

const battle = {
  currentRound: 1,
  currentTurnIndex: 0,
  initiativeOrder: [],
} as unknown as BattleScene;

describe("InitiativeTimeline", () => {
  afterEach(cleanup);

  it("на старті згорнута, щоб на телефоні лишалось місце для учасників", () => {
    render(<InitiativeTimeline battle={battle} />);

    const toggle = screen.getByRole("button", { name: /Шкала ходів/ });

    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
  });
});
