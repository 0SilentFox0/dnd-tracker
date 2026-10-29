// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DmBattleLog } from "@/components/battle/dm/DmBattleLog";
import { BATTLE_SNAPSHOTS_KEPT_AFTER_COMPLETE } from "@/lib/constants/battle";
import { renderWithConfirm } from "@/lib/i18n/test/render-uk";
import type { BattleScene } from "@/types/api";
import type { BattleAction } from "@/types/battle";

vi.unmock("next-intl");

const scene = vi.hoisted(() => ({ battle: null as unknown }));

vi.mock("@/components/battle/log/BattleLogLoadEarlier", () => ({ BattleLogLoadEarlier: () => null }));

vi.mock("@/lib/hooks/battle", () => ({
  useBattleScene: () => ({ battle: scene.battle, viewer: { isDM: true }, actions: { rollback: { mutate: vi.fn() } } }),
}));

afterEach(cleanup);

const entry = (i: number) =>
  ({ id: `e${i}`, actionIndex: i, round: 1, actorName: "Ліра", actorSide: "ally", actionType: "end_turn", targets: [], actionDetails: {}, hpChanges: [], resultText: `#${i}`, isCancelled: false }) as unknown as BattleAction;

const battle = (status: BattleScene["status"]) =>
  ({ status, battleLog: Array.from({ length: 30 }, (_, i) => entry(i + 1)) }) as unknown as BattleScene;

const rollbackButtons = () => screen.queryAllByTitle(/Відмінити дію/);

describe("DmBattleLog — кнопка відкату", () => {
  it("активний бій — на кожному записі", () => {
    scene.battle = battle("active");
    renderWithConfirm(<DmBattleLog onClose={vi.fn()} />);

    expect(rollbackButtons()).toHaveLength(30);
  });

  it("завершений бій — лише на записах, для яких лишився знімок", () => {
    scene.battle = battle("completed");
    renderWithConfirm(<DmBattleLog onClose={vi.fn()} />);

    expect(rollbackButtons()).toHaveLength(BATTLE_SNAPSHOTS_KEPT_AFTER_COMPLETE);
  });
});
