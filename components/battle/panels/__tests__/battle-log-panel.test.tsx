// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BattleLogPanel } from "../BattleLogPanel";

import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import { BATTLE_SNAPSHOTS_KEPT_AFTER_COMPLETE } from "@/lib/constants/battle";
import type { BattleScene } from "@/types/api";
import type { BattleAction } from "@/types/battle";

vi.mock("../BattleLogLoadEarlier", () => ({ BattleLogLoadEarlier: () => null }));

afterEach(cleanup);

const entry = (i: number) =>
  ({ id: `e${i}`, actionIndex: i, round: 1, actorName: "Ліра", actorSide: "ally", actionType: "end_turn", targets: [], actionDetails: {}, hpChanges: [], resultText: `#${i}`, isCancelled: false }) as unknown as BattleAction;

const battle = (status: BattleScene["status"]) =>
  ({ status, battleLog: Array.from({ length: 30 }, (_, i) => entry(i + 1)) }) as unknown as BattleScene;

const rollbackButtons = () => screen.queryAllByTitle(/Відмінити дію/);

describe("BattleLogPanel — кнопка відкату", () => {
  it("активний бій — на кожному записі", () => {
    renderWithConfirm(<BattleLogPanel battle={battle("active")} isDM onRollback={vi.fn()} embedInSidebar />);

    expect(rollbackButtons()).toHaveLength(30);
  });

  it("завершений бій — лише на записах, для яких лишився знімок", () => {
    renderWithConfirm(<BattleLogPanel battle={battle("completed")} isDM onRollback={vi.fn()} embedInSidebar />);

    expect(rollbackButtons()).toHaveLength(BATTLE_SNAPSHOTS_KEPT_AFTER_COMPLETE);
  });
});
