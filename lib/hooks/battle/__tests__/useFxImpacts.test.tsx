// @vitest-environment happy-dom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useFxImpacts } from "../useFxImpacts";

import { AttackType } from "@/lib/constants/battle";
import { action } from "@/lib/utils/battle/fx/__tests__/action-fixture";
import type { BattleAction } from "@/types/battle";

const h = vi.hoisted(() => ({ log: [] as BattleAction[], morale: null as unknown, hidden: false }));

vi.mock("../useBattleScene", () => ({ useBattleSceneData: () => ({ battle: { battleLog: h.log, pendingMoraleCheck: h.morale } }) }));
vi.mock("../useFxEnabled", () => ({ useFxEnabled: () => ({ enabled: true }) }));
vi.mock("@/lib/hooks/common", () => ({ usePageHidden: () => h.hidden }));

const melee = { attackKind: AttackType.MELEE, isHit: true };

const attack = action({ id: "atk", actionIndex: 1, actorId: "a", targets: [{ participantId: "d", participantName: "D" }], actionType: "attack", actionDetails: melee });

const retaliation = action({ id: "ret", actionIndex: 2, actorId: "d", targets: [{ participantId: "a", participantName: "A" }], actionType: "retaliation", actionDetails: melee });

beforeEach(() => {
  h.log = [attack, retaliation];
  h.morale = null;
  h.hidden = false;
});

describe("useFxImpacts", () => {
  it("атака + відповідний удар в одній дельті: кожен отримує свою дію", () => {
    const { result } = renderHook(() => useFxImpacts());

    expect(result.current("d")?.actionId).toBe("atk");
    expect(result.current("a")?.actionId).toBe("ret");
  });

  it("waitMs росте з кількістю дій у черзі", () => {
    const { result } = renderHook(() => useFxImpacts());

    const first = result.current("d")?.waitMs ?? 0;

    const last = result.current("a")?.waitMs ?? 0;

    expect(first).toBeGreaterThan(last);
  });

  it("мораль у черзі збільшує запобіжник", () => {
    const base = renderHook(() => useFxImpacts()).result.current("a")?.waitMs ?? 0;

    h.morale = { participantId: "a" };

    expect(renderHook(() => useFxImpacts()).result.current("a")?.waitMs).toBeGreaterThan(base);
  });

  it("прихована сторінка — вплив без actionId", () => {
    h.hidden = true;

    const impact = renderHook(() => useFxImpacts()).result.current("d");

    expect(impact).not.toBeNull();
    expect(impact?.actionId).toBeUndefined();
  });
});
