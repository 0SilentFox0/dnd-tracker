// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

import { BattleLog } from "@/components/battle/scene/BattleLog";
import { InitiativeTrack } from "@/components/battle/scene/InitiativeTrack";
import { ParticipantList } from "@/components/battle/scene/ParticipantList";
import { ParticipantSide } from "@/lib/constants/battle";
import { BattleSceneContext, type BattleSceneValue } from "@/lib/hooks/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import { turnQueue } from "@/lib/utils/battle/view";
import type { BattleScene } from "@/types/api";
import type { BattleAction } from "@/types/battle";

const p = (id: string, name: string, side: ParticipantSide, hp = 20, extra = false) => {
  const b = createMockParticipant();

  return {
    ...b,
    basicInfo: { ...b.basicInfo, id, name, side, controlledBy: side === "ally" ? "u" : "dm" },
    combatStats: { ...b.combatStats, currentHp: hp, maxHp: 40, armorClass: 15, status: "active" as const },
    actionFlags: { ...b.actionFlags, hasExtraTurn: extra },
  };
};

function scene(isDM = false) {
  const hero = p("me", "Фрейда", ParticipantSide.ALLY, 34, true);

  const gob = p("gob", "Гоблін", ParticipantSide.ENEMY, 9);

  const log = [
    { actionIndex: 1, round: 1, actorName: "Годрік", actionType: "attack", targets: [{ participantId: "gob", participantName: "Гоблін" }], resultText: "Годрік завдав 6", actionDetails: { totalAttackValue: 15, isHit: true, targetAC: 15, damageBreakdown: "секрет" } },
  ] as unknown as BattleAction[];

  const battle = { initiativeOrder: [gob, hero], currentTurnIndex: 0, currentRound: 3, battleLog: log } as unknown as BattleScene;

  return {
    battle, isDM, viewer: { userId: "u", isDM, canSeeEnemyHp: false }, hero, myParticipants: [hero],
    queue: turnQueue([gob, hero], 0, 3), allies: [hero], enemies: [gob], select: vi.fn(), selectedId: null, log: { open: false, focus: null },
  } as unknown as BattleSceneValue;
}

function wrap(value: BattleSceneValue) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <BattleSceneContext.Provider value={value}>{children}</BattleSceneContext.Provider>;
  };
}

describe("поле бою", () => {
  afterEach(cleanup);

  it("гравець бачить ворога станом і відомим AC, союзника — числами", () => {
    render(<><ParticipantList side="enemy" /><ParticipantList side="ally" /></>, { wrapper: wrap(scene()) });

    expect(screen.getAllByText("при смерті").length).toBeGreaterThan(0);
    expect(screen.getByText("≤ 15")).toBeTruthy();
    expect(screen.getByText("34 / 40")).toBeTruthy();
    expect(screen.queryByText("9 / 40")).toBeNull();
  });

  it("DM бачить HP ворога числами", () => {
    render(<ParticipantList side="enemy" />, { wrapper: wrap(scene(true)) });

    expect(screen.getByText("9 / 40")).toBeTruthy();
  });

  it("трек: межа наступного раунду і додатковий хід «+»", () => {
    render(<InitiativeTrack />, { wrapper: wrap(scene()) });

    expect(screen.getByText("IV")).toBeTruthy();
    expect(screen.getAllByText("+").length).toBe(1);
  });

  it("журнал гравця не показує розбивку DM", () => {
    render(<BattleLog />, { wrapper: wrap(scene()) });

    expect(screen.getByText("Годрік завдав 6")).toBeTruthy();
    expect(screen.queryByText(/секрет/)).toBeNull();
  });

  it("журнал, відкритий на записі, показує його деталі без прихованого від гравця", () => {
    render(<BattleLog />, { wrapper: wrap({ ...scene(), log: { open: true, focus: 1 } } as BattleSceneValue) });

    expect(screen.getByText("Попадання")).toBeTruthy();
    expect(screen.queryByText(/КЛ цілі/)).toBeNull();
    expect(screen.queryByText(/секрет/)).toBeNull();
  });

  it("без фокуса деталі згорнуті й розгортаються дотиком", () => {
    render(<BattleLog />, { wrapper: wrap(scene()) });

    expect(screen.queryByText("Попадання")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Годрік завдав 6" }));

    expect(screen.getByText("Попадання")).toBeTruthy();
  });
});
