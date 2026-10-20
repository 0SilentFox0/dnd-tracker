// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { cleanup, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useAttackWizard } from "../useAttackWizard";
import { useBattleSceneData } from "../useBattleScene";
import { MazeViewProvider, useMazeFxLog } from "../useMazeView";
import { fakeScene } from "./fake-scene";

import { ParticipantList } from "@/components/battle/participants/ParticipantList";
import { emptyMaze, ParticipantSide } from "@/lib/constants/battle";
import { testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import type { BattleAction } from "@/types/battle";

afterEach(cleanup);

const entry = (actorId: string, targets: string[] = []): BattleAction =>
  ({ id: actorId, actorId, actorName: actorId, actionIndex: 1, round: 1, actionType: "attack", targets: targets.map((id) => ({ participantId: id, participantName: id })), actionDetails: {}, resultText: `${actorId} діє`, hpChanges: [], isCancelled: false }) as unknown as BattleAction;

/** Фрейда (0,0) дивиться на схід; гоблін (0,5) — позаду поля зору; Годрік (7,5) — далеко. */
function mazeScene({ isDM = false, maze = true } = {}) {
  const s = fakeScene({ isDM, isMyTurn: false, map: testMap(8, 6, maze ? { maze: { ...emptyMaze(), exit: { x: 7, y: 0 } } } : {}) });

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
    expect(result.current.turn.current?.basicInfo.name).toBe("невідомий");
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

    const { result } = renderHook(() => useMazeFxLog(), { wrapper: Wrapper });

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
});
