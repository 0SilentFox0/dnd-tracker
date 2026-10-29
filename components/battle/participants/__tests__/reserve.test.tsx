// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

import { ParticipantList } from "@/components/battle/participants/ParticipantList";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ParticipantSide } from "@/lib/constants/battle";
import { BattleSceneContext, BattleSceneDataContext } from "@/lib/hooks/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { BattleScene } from "@/types/api";
import type { BattleSceneValue } from "@/types/battle-scene";

afterEach(cleanup);

const b = createMockParticipant();

const gob = { ...b, basicInfo: { ...b.basicInfo, id: "gob", name: "Гоблін", side: ParticipantSide.ENEMY, controlledBy: "dm" } };

const imp = { ...gob, basicInfo: { ...gob.basicInfo, id: "imp", name: "Біс" }, battleData: { ...gob.battleData, reserved: true } };

function renderList(isDM: boolean) {
  const reveal = { mutate: vi.fn(), isPending: false };

  const updateParticipant = { mutate: vi.fn(), isPending: false };

  const battle = { initiativeOrder: [gob], pendingSummons: [imp], currentTurnIndex: 0, currentRound: 1, battleLog: [], knowledge: undefined } as unknown as BattleScene;

  const value = {
    battle, viewer: { userId: "u", isDM, canSeeEnemyHp: false }, turn: { current: gob }, roster: { allies: [], enemies: [gob], reserve: isDM ? [imp] : [] }, awaiting: null, effects: new Map(), select: vi.fn(),
    actions: { reveal, updateParticipant },
  } as unknown as BattleSceneValue;

  renderWithConfirm(
    <BattleSceneContext.Provider value={value}>
      <BattleSceneDataContext.Provider value={value}>
        <TooltipProvider><ParticipantList side={ParticipantSide.ENEMY} /></TooltipProvider>
      </BattleSceneDataContext.Provider>
    </BattleSceneContext.Provider>,
  );

  return { reveal, updateParticipant };
}

describe("резерв у списку учасників", () => {
  it("ДМ бачить напівпрозору картку і вводить учасника кнопкою з оком", () => {
    const { reveal } = renderList(true);

    fireEvent.click(screen.getByRole("button", { name: "Ввести в бій: Біс" }));
    expect(reveal.mutate).toHaveBeenCalledWith({ participantIds: ["imp"] });
  });

  it("ДМ видаляє учасника з резерву після підтвердження", async () => {
    const { updateParticipant } = renderList(true);

    fireEvent.click(screen.getByRole("button", { name: "Видалити з резерву: Біс" }));
    fireEvent.click(await screen.findByRole("button", { name: "Видалити" }));

    await waitFor(() => expect(updateParticipant.mutate).toHaveBeenCalledWith({ participantId: "imp", data: { removeFromBattle: true } }));
  });

  it("гравець резерву не бачить", () => {
    renderList(false);
    expect(screen.queryByText("Біс")).toBeNull();
  });
});
