// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));
vi.mock("@/components/battle/fx/frames/ImpactFrame", () => ({ ImpactFrame: ({ impact }: { impact: FxImpact }) => <i data-testid="impact-frame" data-element={impact.element} /> }));

import { BattleLog } from "@/components/battle/log/BattleLog";
import { InitiativeTrack } from "@/components/battle/participants/InitiativeTrack";
import { ParticipantList } from "@/components/battle/participants/ParticipantList";
import { ParticipantRow } from "@/components/battle/participants/ParticipantRow";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ParticipantSide } from "@/lib/constants/battle";
import { BattleSceneContext, BattleSceneDataContext, type BattleSceneValue } from "@/lib/hooks/battle";
import { render } from "@/lib/i18n/test/render-uk";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { FxImpact } from "@/lib/utils/battle/fx";
import { buildDisplayEffects, turnQueue } from "@/lib/utils/battle/view";
import type { BattleScene } from "@/types/api";
import type { ActiveEffect, BattleAction } from "@/types/battle";

vi.unmock("next-intl");

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
    { actionIndex: 1, round: 1, actorName: "Годрік", actionType: "attack", hpChanges: [], targets: [{ participantId: "gob", participantName: "Гоблін" }], resultText: "Годрік завдав 6", actionDetails: { totalAttackValue: 15, isHit: true, targetAC: 15, damageBreakdown: "секрет" } },
  ] as unknown as BattleAction[];

  const battle = { initiativeOrder: [gob, hero], currentTurnIndex: 0, currentRound: 3, battleLog: log } as unknown as BattleScene;

  return {
    battle, viewer: { userId: "u", isDM, canSeeEnemyHp: false },
    turn: { queue: turnQueue([gob, hero], 0, 3) }, roster: { hero, myParticipants: [hero], allies: [hero], enemies: [gob], reserve: [] }, awaiting: null, effects: buildDisplayEffects([gob, hero]), select: vi.fn(), selectedId: null, log: { open: false, focus: null },
    logHistory: { canLoadEarlier: false, isLoading: false, loadEarlier: vi.fn() },
  } as unknown as BattleSceneValue;
}

function wrap(value: BattleSceneValue) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <BattleSceneDataContext.Provider value={value}>
        <BattleSceneContext.Provider value={value}>{children}</BattleSceneContext.Provider>
      </BattleSceneDataContext.Provider>
    );
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

  describe("журнал не видає гравцям справжню броню ворога", () => {
    const withEntries = (isDM: boolean) => {
      const value = scene(isDM);

      const entry = (actionIndex: number) => ({ actionIndex, round: 1, actorName: "Годрік", actionType: "attack", targets: [{ participantId: "gob", participantName: "Гоблін" }], resultText: `Удар ${actionIndex}`, actionDetails: { attackRoll: 12, totalAttackValue: 17, isHit: true, targetAC: 17, damageBreakdown: "d8+3 = 9" } }) as unknown as BattleAction;

      return { ...value, battle: { ...value.battle, battleLog: [entry(0), entry(1)] }, log: { open: true, focus: 0 } } as BattleSceneValue;
    };

    it("гравець: ні КЛ цілі, ні розбивки шкоди, включно зі старішою сторінкою", () => {
      render(<BattleLog />, { wrapper: wrap(withEntries(false)) });

      fireEvent.click(screen.getAllByRole("button", { name: /Деталі|Сховати деталі/ })[0]);

      expect(screen.getAllByText(/Кидок атаки/).length).toBeGreaterThan(0);
      expect(screen.queryByText(/КЛ цілі/)).toBeNull();
      expect(screen.queryByText(/Урон:/)).toBeNull();
      expect(screen.queryByText(/d8\+3/)).toBeNull();
    });

    it("DM бачить КЛ цілі й розбивку", () => {
      render(<BattleLog />, { wrapper: wrap(withEntries(true)) });

      expect(document.body.textContent).toContain("КЛ цілі: 17");
      expect(screen.getAllByText("d8+3 = 9").length).toBeGreaterThan(0);
    });
  });

  it("без фокуса деталі згорнуті й розгортаються дотиком", () => {
    render(<BattleLog />, { wrapper: wrap(scene()) });

    expect(screen.queryByText("Попадання")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Деталі" }));

    expect(screen.getByText("Попадання")).toBeTruthy();
  });

  it("раунд у журналі згортається дотиком по заголовку", () => {
    render(<BattleLog />, { wrapper: wrap(scene()) });

    fireEvent.click(screen.getByRole("button", { name: /Раунд 1/ }));

    expect(screen.queryByText("Годрік завдав 6")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Раунд 1/ }));

    expect(screen.getByText("Годрік завдав 6")).toBeTruthy();
  });

  it("журнал із неповною історією показує «Показати раніші», дотик підвантажує сторінку", () => {
    const value = scene();

    const loadEarlier = vi.fn();

    render(<BattleLog />, { wrapper: wrap({ ...value, logHistory: { canLoadEarlier: true, isLoading: false, loadEarlier } }) });

    fireEvent.click(screen.getByRole("button", { name: "Показати раніші" }));

    expect(loadEarlier).toHaveBeenCalledTimes(1);
  });

  it("повна історія — кнопки немає", () => {
    render(<BattleLog />, { wrapper: wrap(scene()) });

    expect(screen.queryByRole("button", { name: "Показати раніші" })).toBeNull();
  });

  describe("рядок учасника", () => {
    const effect = (id: string) => ({ id, name: `Ефект ${id}`, type: "buff", duration: 2, permanent: false, appliedAt: { round: 1, timestamp: new Date(0) }, effects: [] }) as unknown as ActiveEffect;

    const renderRow = () => {
      const onSelect = vi.fn();

      render(<TooltipProvider><ParticipantRow impact={null} participant={p("gob", "Гоблін", ParticipantSide.ENEMY)} effects={[effect("a"), effect("b"), effect("c")]} exact acText="15" current={false} onSelect={onSelect} /></TooltipProvider>, { wrapper: wrap(scene()) });

      return onSelect;
    };

    it("дотик по кнопці рядка вибирає учасника", () => {
      const onSelect = renderRow();

      fireEvent.click(screen.getByRole("button", { name: "Гоблін" }));

      expect(onSelect).toHaveBeenCalledWith("gob");
    });

    it("«+N» і чип ефекту не вибирають учасника", () => {
      const onSelect = renderRow();

      fireEvent.click(screen.getByRole("button", { name: /Показати всі ефекти/ }));
      fireEvent.click(screen.getByLabelText(/Ефект a/));

      expect(onSelect).not.toHaveBeenCalled();
    });

    describe("декорації удару фіксуються в момент зміни HP", () => {
      const hit: FxImpact = { element: "fire", kind: "damage", delayMs: 600 };

      const row = (hp: number, impact: FxImpact | null) => <TooltipProvider><ParticipantRow impact={impact} participant={p("gob", "Гоблін", ParticipantSide.ENEMY, hp)} effects={[]} exact acText="15" current={false} onSelect={vi.fn()} /></TooltipProvider>;

      const portrait = (container: HTMLElement) => container.querySelector('[data-fx-participant="gob"]') as HTMLElement;

      it("пізніша дія без цієї цілі не перезапускає спалах і рамку", async () => {
        const { container, rerender } = render(row(20, null), { wrapper: wrap(scene()) });

        rerender(row(12, hit));

        const frame = await screen.findByTestId("impact-frame");

        expect(portrait(container).className).not.toMatch(/hud-flash/);

        rerender(row(12, null));

        expect(portrait(container).className).not.toMatch(/hud-flash/);
        expect(screen.getByTestId("impact-frame")).toBe(frame);
      });

      it("бафф без зміни HP не показує рамку шкоди", () => {
        const { container, rerender } = render(row(20, null), { wrapper: wrap(scene()) });

        rerender(row(12, null));

        expect(portrait(container).className).toMatch(/hud-flash-red/);
        expect(screen.queryByTestId("impact-frame")).toBeNull();

        rerender(row(12, { element: "radiant", kind: "damage", delayMs: 400 }));

        expect(screen.queryByTestId("impact-frame")).toBeNull();
      });
    });
  });
});
