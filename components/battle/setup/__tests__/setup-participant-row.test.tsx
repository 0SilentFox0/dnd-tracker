// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SetupParticipantRow } from "@/components/battle/setup/SetupParticipantRow";
import { ParticipantSide } from "@/lib/constants/battle";

afterEach(cleanup);

function renderRow(reserved: number, quantity?: number) {
  const actions = { onMoveToOtherSide: vi.fn(), onRemove: vi.fn(), onReserveChange: vi.fn() };

  render(<SetupParticipantRow name="Вовк" avatar={null} quantity={quantity} side={ParticipantSide.ENEMY} reserved={reserved} actions={actions} />);

  return actions;
}

describe("SetupParticipantRow: резерв", () => {
  it("око відправляє у резерв усю кількість", () => {
    const actions = renderRow(0, 4);

    fireEvent.click(screen.getByTitle("battleSetup.participant.reserve"));
    expect(actions.onReserveChange).toHaveBeenCalledWith(4);
  });

  it("герой без кількості — резерв 1", () => {
    const actions = renderRow(0);

    fireEvent.click(screen.getByTitle("battleSetup.participant.reserve"));
    expect(actions.onReserveChange).toHaveBeenCalledWith(1);
  });

  it("повторне натискання прибирає з резерву", () => {
    const actions = renderRow(2, 4);

    fireEvent.click(screen.getByTitle("battleSetup.participant.unreserve"));
    expect(actions.onReserveChange).toHaveBeenCalledWith(0);
  });

  it("лічильник резерву змінює кількість на 1 і видимий лише для груп", () => {
    const actions = renderRow(2, 4);

    fireEvent.click(screen.getByLabelText("battleSetup.participant.reserveMore"));
    fireEvent.click(screen.getByLabelText("battleSetup.participant.reserveLess"));
    expect(actions.onReserveChange.mock.calls).toEqual([[3], [1]]);
    cleanup();
    renderRow(1);
    expect(screen.queryByLabelText("battleSetup.participant.reserveMore")).toBeNull();
  });
});
