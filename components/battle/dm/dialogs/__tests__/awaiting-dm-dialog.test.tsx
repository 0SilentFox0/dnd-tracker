// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));

import { AwaitingDmDialog } from "@/components/battle/dm/dialogs/AwaitingDmDialog";
import { ParticipantSide } from "@/lib/constants/battle";
import { BattleSceneContext } from "@/lib/hooks/battle";
import type { BattleSceneValue } from "@/lib/hooks/battle/types";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";

afterEach(cleanup);

const b = createMockParticipant();

const reserved = (id: string, name: string, side: ParticipantSide) => ({ ...b, basicInfo: { ...b.basicInfo, id, name, side }, battleData: { ...b.battleData, reserved: true } });

const reserve = [reserved("imp", "Біс", ParticipantSide.ENEMY), reserved("imp2", "Біс-2", ParticipantSide.ENEMY), reserved("ally", "Союзник", ParticipantSide.ALLY)];

function renderDialog(over: Partial<BattleSceneValue> = {}) {
  const reveal = { mutate: vi.fn(), isPending: false };

  const complete = { mutate: vi.fn(), isPending: false };

  const setOpen = vi.fn();

  const value = { viewer: { isDM: true }, awaiting: "victory", roster: { reserve }, dialogs: { awaitingDm: { open: true, setOpen } }, actions: { reveal, complete }, ...over } as unknown as BattleSceneValue;

  render(<BattleSceneContext.Provider value={value}><AwaitingDmDialog /></BattleSceneContext.Provider>);

  return { reveal, complete, setOpen };
}

describe("AwaitingDmDialog", () => {
  it("відкривається для ДМ і показує резерв тієї сторони, що програла", () => {
    renderDialog();

    expect(screen.getByText("У резерві ще є вороги")).toBeTruthy();
    expect(screen.getByText("Біс")).toBeTruthy();
    expect(screen.getByText("Біс-2")).toBeTruthy();
    expect(screen.queryByText("Союзник")).toBeNull();
  });

  it("гравцеві не показується", () => {
    renderDialog({ viewer: { isDM: false } as BattleSceneValue["viewer"] });
    expect(screen.queryByText("У резерві ще є вороги")).toBeNull();
  });

  it("не показується, коли діалог закрито", () => {
    renderDialog({ dialogs: { awaitingDm: { open: false, setOpen: vi.fn() }, resultScreen: { open: false, setOpen: vi.fn() } } });
    expect(screen.queryByText("У резерві ще є вороги")).toBeNull();
  });

  it("«Ввести всіх» шле рівно id резерву ворогів", () => {
    const { reveal } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Ввести всіх" }));
    expect(reveal.mutate).toHaveBeenCalledWith({ participantIds: ["imp", "imp2"] });
  });

  it("«Завершити бій» шле result awaiting", () => {
    const { complete } = renderDialog({ awaiting: "defeat" });

    fireEvent.click(screen.getByRole("button", { name: "Завершити бій" }));
    expect(complete.mutate).toHaveBeenCalledWith({ result: "defeat" });
  });

  it("закриття діалогу повідомляє стан, а не ховає назавжди", () => {
    const { setOpen } = renderDialog();

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(setOpen).toHaveBeenCalledWith(false);
  });
});
