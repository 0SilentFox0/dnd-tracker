// @vitest-environment happy-dom
import { type ComponentProps, type FunctionComponent, memo, type MemoExoticComponent, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const commits = vi.hoisted(() => ({ list: 0, rows: new Map<string, number>() }));

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));
vi.mock("@/lib/hooks/common/useMediaQuery", () => ({ useMediaQuery: () => false }));
vi.mock("@/lib/hooks/battle/usePusherBattleSync", () => ({ usePusherBattleSync: () => ({ connectionState: "connected" }) }));
vi.mock("@/lib/api/battles", async (orig) => ({ ...(await orig<typeof import("@/lib/api/battles")>()), attack: vi.fn(), getBattle: vi.fn() }));

// обгортка рахує коміти, зберігаючи memo оригіналу
function counted<P extends object>(original: FunctionComponent<P> | MemoExoticComponent<FunctionComponent<P>>, onCommit: (props: P) => void) {
  const inner = "type" in original ? original.type : original;

  const Counted = (props: P) => {
    useEffect(() => {
      onCommit(props);
    });

    return inner(props);
  };

  return "type" in original ? memo(Counted) : Counted;
}

vi.mock("@/components/battle/scene/ParticipantList", async (orig) => {
  const { ParticipantList } = await orig<typeof import("@/components/battle/scene/ParticipantList")>();

  return { ParticipantList: counted<ComponentProps<typeof ParticipantList>>(ParticipantList, () => commits.list++) };
});

vi.mock("@/components/battle/scene/ParticipantRow", async (orig) => {
  const { ParticipantRow } = await orig<typeof import("@/components/battle/scene/ParticipantRow")>();

  return {
    ParticipantRow: counted<ComponentProps<typeof ParticipantRow>>(ParticipantRow, ({ participant }) =>
      commits.rows.set(participant.basicInfo.id, (commits.rows.get(participant.basicInfo.id) ?? 0) + 1),
    ),
  };
});

import { BattleSceneProvider } from "@/components/battle/scene/BattleSceneProvider";
import { BattleScreen } from "@/components/battle/scene/BattleScreen";
import { attack } from "@/lib/api/battles";
import { ParticipantSide } from "@/lib/constants/battle";
import { type BattleSceneValue, useBattleScene, useBattleSceneValue } from "@/lib/hooks/battle";
import { battleQueryKey } from "@/lib/hooks/battles";
import { ConfirmContext } from "@/lib/hooks/common";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/mock-participant";
import type { BattleScene, ClientBattleDelta } from "@/types/api";
import type { BattleAction, BattleParticipant } from "@/types/battle";

const USER = "u1";

function participant(id: string, side: ParticipantSide): BattleParticipant {
  const b = createMockParticipant();

  return {
    ...b,
    basicInfo: { ...b.basicInfo, id, name: id, side, sourceType: "unit", controlledBy: side === ParticipantSide.ALLY && id === "me" ? USER : "dm" },
    spellcasting: { ...b.spellcasting, knownSpells: [] },
  };
}

const order = [
  participant("me", ParticipantSide.ALLY),
  participant("gob1", ParticipantSide.ENEMY),
  participant("ally1", ParticipantSide.ALLY),
  participant("gob2", ParticipantSide.ENEMY),
  participant("ally2", ParticipantSide.ALLY),
  participant("gob3", ParticipantSide.ENEMY),
];

const battle = {
  id: "b1", campaignId: "c1", name: "Засідка", status: "active", participants: [], currentRound: 1, currentTurnIndex: 0,
  initiativeOrder: order, pendingSummons: [], battleLog: [], createdAt: "", version: 5, isDM: false,
  campaign: { id: "c1", friendlyFire: false }, pendingMoraleCheck: null,
} as unknown as BattleScene;

const hit = { actionIndex: 1, round: 1, actorId: "me", actorName: "me", actionType: "attack", targets: [{ participantId: "gob1", participantName: "gob1" }], resultText: "me влучає", hpChanges: [{ participantId: "gob1", participantName: "gob1", oldHp: 20, newHp: 13, change: 7 }] } as unknown as BattleAction;

const delta: ClientBattleDelta = {
  battleId: "b1",
  version: 6,
  scene: { status: "active", round: 1, turnIndex: 0, pendingMoraleCheck: null },
  upserted: [],
  patched: [
    { id: "gob1", combatStats: { currentHp: 13 } },
    { id: "me", actionFlags: { hasUsedAction: true } },
  ],
  removed: [],
  log: [hit],
};

// TanStack Query сповіщає підписників через setTimeout(0)
const settle = () => new Promise((resolve) => setTimeout(resolve, 10));

const probe: { scene: BattleSceneValue | null } = { scene: null };

function Probe() {
  const value = useBattleScene();

  useEffect(() => {
    probe.scene = value;
  });

  return null;
}

function Page() {
  const { value } = useBattleSceneValue("c1", "b1", USER);

  return value ? (
    <BattleSceneProvider value={value}>
      <BattleScreen />
      <Probe />
    </BattleSceneProvider>
  ) : null;
}

describe("рендери на атаку", () => {
  afterEach(cleanup);

  it("список учасників і рядки комітяться щонайбільше двічі, незачеплені рядки — жодного разу", async () => {
    let respond: (value: { delta: ClientBattleDelta }) => void = () => {};

    vi.mocked(attack).mockImplementation(() => new Promise((resolve) => (respond = resolve)));

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    client.setQueryData(battleQueryKey("c1", "b1"), battle);

    render(
      <QueryClientProvider client={client}>
        <ConfirmContext.Provider value={async () => true}>
          <Page />
        </ConfirmContext.Provider>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("tab", { name: /Вороги/ })).toBeTruthy();

    commits.list = 0;
    commits.rows.clear();

    let sent: Promise<unknown> | undefined;

    // кожна фаза — окремий коміт, як у браузері: очікування відповіді, дельта, результат майстра
    await act(async () => {
      sent = probe.scene?.actions.attack.mutateAsync({ attackerId: "me", targetIds: ["gob1"], attackRoll: 15, damageRolls: [7] });
      await settle();
    });

    await act(async () => {
      respond({ delta });
      await sent;
      await settle();
    });

    await act(async () => {
      probe.scene?.showResult({ kind: "hit", targetName: "gob1", damage: 7, downed: false, d20: 15 });
      await settle();
    });

    await act(async () => {
      probe.scene?.showResult(null);
      await settle();
    });

    expect(client.getQueryData<BattleScene>(battleQueryKey("c1", "b1"))?.version).toBe(6);
    expect(commits.list).toBeGreaterThan(0);
    expect(commits.list).toBeLessThanOrEqual(2);
    expect(commits.rows.get("gob1") ?? 0).toBeLessThanOrEqual(2);
    expect(commits.rows.get("gob2") ?? 0).toBe(0);
    expect(commits.rows.get("gob3") ?? 0).toBe(0);
  });
});
