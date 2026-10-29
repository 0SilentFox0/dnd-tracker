// @vitest-environment happy-dom
import { type ReactNode, useContext } from "react";
import { cleanup, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MazeViewProvider } from "../MazeViewProvider";

import { ParticipantList } from "@/components/battle/participants/ParticipantList";
import { ParticipantSide } from "@/lib/constants/battle";
import { BattleSceneContext, BattleSceneDataContext, ModeViewContext, useModeView } from "@/lib/hooks/battle";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import { useAttackWizard } from "@/lib/hooks/battle/useAttackWizard";
import { useBattleSceneData } from "@/lib/hooks/battle/useBattleScene";
import { render } from "@/lib/i18n/test/render-uk";
import { testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { MAZE_UNKNOWN_NAME } from "@/lib/utils/battle/modes/maze";
import { mazeMap } from "@/lib/utils/battle/modes/maze/__tests__/fixtures";
import type { BattleAction } from "@/types/battle";

vi.unmock("next-intl");

afterEach(cleanup);

const entry = (actorId: string, targets: string[] = []): BattleAction =>
  ({ id: actorId, actorId, actorName: actorId, actionIndex: 1, round: 1, actionType: "attack", targets: targets.map((id) => ({ participantId: id, participantName: id })), actionDetails: {}, resultText: `${actorId} діє`, hpChanges: [], isCancelled: false }) as unknown as BattleAction;

/** Фрейда (0,0) дивиться на схід; гоблін (0,5) — позаду поля зору; Годрік (7,5) — далеко. */
function mazeScene({ isDM = false, maze = true } = {}) {
  const s = fakeScene({ isDM, isMyTurn: false, map: maze ? mazeMap({ exit: { x: 7, y: 0 } }, 8, 6) : testMap(8, 6) });

  s.me.basicInfo.controlledBy = "u";
  s.me.battleData.position = { x: 0, y: 0 };
  s.me.battleData.facing = "e";
  s.gob.battleData.position = { x: 0, y: 5 };
  s.ally.battleData.position = { x: 7, y: 5 };
  s.battle.battleLog = [entry("me"), entry("gob", ["ally"]), entry("gob", ["me"])];

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <s.wrapper>
      <MazeViewProvider>{children}</MazeViewProvider>
    </s.wrapper>
  );

  return { ...s, Wrapper };
}

describe("маска лабіринту для гравця під MazeViewProvider", () => {
  it("список ворогів, «ходить …» і журнал — без прихованого гобліна", () => {
    const { Wrapper } = mazeScene();

    const { result } = renderHook(() => useBattleSceneData(), { wrapper: Wrapper });

    expect(result.current.roster.enemies).toEqual([]);
    expect(result.current.roster.allies.map((p) => p.basicInfo.id)).toEqual(["me"]);
    expect(result.current.turn.current?.basicInfo.name).toBe(MAZE_UNKNOWN_NAME);
    expect(result.current.battle.battleLog.map((e) => e.targets.map((t) => t.participantId).join())).toEqual(["", "me"]);
  });

  it("ParticipantList «Вороги» порожній", () => {
    const { Wrapper } = mazeScene();

    render(<ParticipantList side={ParticipantSide.ENEMY} />, { wrapper: Wrapper });

    expect(screen.queryByText("Гоблін")).toBeNull();
  });

  it("майстер атаки не пропонує прихованого ворога", () => {
    const s = mazeScene();

    const { result } = renderHook(() => useAttackWizard(s.me), { wrapper: s.Wrapper });

    expect(result.current.view.targets.map((p) => p.basicInfo.id)).toEqual([]);
  });

  it("FX: удар прихованого по своєму герою грає, по далекому союзнику — ні", () => {
    const { Wrapper } = mazeScene();

    const { result } = renderHook(() => useModeView().fxLog, { wrapper: Wrapper });

    expect(result.current.map((e) => e.targets.map((t) => t.participantId).join())).toEqual(["", "me"]);
  });

  it("ДМ і бій без лабіринту — повна сцена", () => {
    for (const opts of [{ isDM: true }, { maze: false }]) {
      const { Wrapper } = mazeScene(opts);

      const { result } = renderHook(() => useBattleSceneData(), { wrapper: Wrapper });

      expect(result.current.roster.enemies.map((p) => p.basicInfo.id)).toEqual(["gob"]);
      expect(result.current.turn.current?.basicInfo.name).toBe("Гоблін");
      expect(result.current.battle.battleLog).toHaveLength(3);
    }
  });

  it("провайдер без лабіринту пропускає вигляд зовнішнього режиму", () => {
    const outer = { view: null, visible: () => false, fxLog: [] };

    const s = mazeScene({ maze: false });

    const Wrapper = ({ children }: { children: ReactNode }) => (
      <s.wrapper>
        <ModeViewContext.Provider value={outer}>
          <MazeViewProvider>{children}</MazeViewProvider>
        </ModeViewContext.Provider>
      </s.wrapper>
    );

    const { result } = renderHook(() => useModeView(), { wrapper: Wrapper });

    expect(result.current).toBe(outer);
  });

  it("вигляд лабіринту доходить до споживача крізь внутрішній неактивний провайдер", () => {
    const s = mazeScene();

    const Inactive = ({ children }: { children: ReactNode }) => {
      const parent = useModeView();

      return <ModeViewContext.Provider value={parent}>{children}</ModeViewContext.Provider>;
    };

    const Wrapper = ({ children }: { children: ReactNode }) => (
      <s.wrapper>
        <MazeViewProvider>
          <Inactive>{children}</Inactive>
        </MazeViewProvider>
      </s.wrapper>
    );

    const { result } = renderHook(() => useModeView(), { wrapper: Wrapper });

    expect(result.current.view).not.toBeNull();
  });

  it("неактивний провайдер віддає контексти сцени без копій, активний для гравця — маскує, не чіпаючи зовнішні", () => {
    const useSceneContexts = () => ({ data: useContext(BattleSceneDataContext), value: useContext(BattleSceneContext) });

    const ids = (list: { basicInfo: { id: string } }[] | undefined) => list?.map((p) => p.basicInfo.id);

    for (const maze of [false, true]) {
      const s = mazeScene({ maze });

      const captureOuter = vi.fn<(ctx: ReturnType<typeof useSceneContexts>) => void>();

      const Outer = ({ children }: { children: ReactNode }) => {
        captureOuter(useSceneContexts());

        return <>{children}</>;
      };

      const Wrapper = ({ children }: { children: ReactNode }) => (
        <s.wrapper>
          <Outer>
            <MazeViewProvider>{children}</MazeViewProvider>
          </Outer>
        </s.wrapper>
      );

      const { result } = renderHook(useSceneContexts, { wrapper: Wrapper });

      const [outer] = captureOuter.mock.lastCall ?? [];

      if (!maze) {
        expect(result.current.data).toBe(outer?.data);
        expect(result.current.value).toBe(outer?.value);
        continue;
      }

      expect(result.current.data).not.toBe(outer?.data);
      expect(ids(result.current.data?.roster.enemies)).toEqual([]);
      expect(result.current.value?.battle).toBe(result.current.data?.battle);
      expect(ids(outer?.data?.roster.enemies)).toEqual(["gob"]);
    }
  });
});
