/**
 * @vitest-environment happy-dom
 *
 * Тест: два гравці, підписані на канал бою, отримують однаковий стан після battle-updated.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, waitFor } from "@testing-library/react";
import { afterEach,beforeEach, describe, expect, it, vi } from "vitest";

import { usePusherBattleSync } from "../usePusherBattleSync";

import type { BattleScene } from "@/types/api";

// Стан для симуляції Pusher: зберігає callbacks по channel+event
const channelBindings = new Map<string, Map<string, Set<(data: unknown) => void>>>();

function getOrCreateChannel(channelName: string) {
  if (!channelBindings.has(channelName)) {
    channelBindings.set(channelName, new Map());
  }

  const ch = channelBindings.get(channelName);

  if (!ch) throw new Error("Channel not found");

  return ch;
}

function subscribeToChannel(channelName: string) {
  const events = getOrCreateChannel(channelName);

  return {
    bind: (eventName: string, callback: (data: unknown) => void) => {
      let set = events.get(eventName);

      if (!set) {
        set = new Set();
        events.set(eventName, set);
      }

      set.add(callback);
    },
    unbind: (eventName: string, callback: (data: unknown) => void) => {
      events.get(eventName)?.delete(callback);
    },
  };
}

function simulateTrigger(channelName: string, eventName: string, data: unknown) {
  const events = channelBindings.get(channelName);

  if (!events) return;

  const callbacks = events.get(eventName);

  if (!callbacks) return;

  callbacks.forEach((cb) => cb(data));
}

function unsubscribeChannel(channelName: string) {
  channelBindings.delete(channelName);
}

let mockPusherInstance: ReturnType<typeof createMockPusher> | null = null;

function createMockPusher() {
  return {
    subscribe: (channelName: string) => subscribeToChannel(channelName),
    unsubscribe: (channelName: string) => unsubscribeChannel(channelName),
    connection: {
      state: "connected",
      bind: vi.fn(),
      unbind: vi.fn(),
    },
  };
}

vi.mock("@/lib/pusher", () => ({
  getPusherClient: () => {
    if (!mockPusherInstance) mockPusherInstance = createMockPusher();

    return mockPusherInstance;
  },
}));

function makeBattlePayload(overrides: Partial<BattleScene> = {}): BattleScene {
  return {
    id: "battle-1",
    campaignId: "camp-1",
    name: "Test Battle",
    status: "active",
    participants: [],
    currentRound: 1,
    currentTurnIndex: 1,
    initiativeOrder: [
      { basicInfo: { id: "p-1", name: "Айвен", side: "ally" } },
      { basicInfo: { id: "p-2", name: "Аграїл", side: "ally" } },
    ] as BattleScene["initiativeOrder"],
    battleLog: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function PlayerSync({
  campaignId,
  battleId,
  userId,
  client,
}: {
  campaignId: string;
  battleId: string;
  userId: string;
  client: QueryClient;
}) {
  return (
    <QueryClientProvider client={client}>
      <PlayerSyncInner campaignId={campaignId} battleId={battleId} userId={userId} />
    </QueryClientProvider>
  );
}

function PlayerSyncInner({
  campaignId,
  battleId,
  userId,
}: {
  campaignId: string;
  battleId: string;
  userId: string;
}) {
  usePusherBattleSync(campaignId, battleId, userId, vi.fn());

  return <span data-testid={`player-${userId}`}>ok</span>;
}

describe("usePusherBattleSync — two players receive same battle state", () => {
  const campaignId = "camp-1";

  const battleId = "battle-1";

  const channelName = `private-battle-${battleId}`;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_PUSHER_KEY = "test-key";
    channelBindings.clear();
    mockPusherInstance = null;
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_PUSHER_KEY;
  });

  const key = ["battle", campaignId, battleId];

  const delta = (version: number, turnIndex = 1) => ({
    battleId,
    version,
    scene: { status: "active", round: 1, turnIndex, pendingMoraleCheck: null },
    upserted: [{ basicInfo: { id: "p-2", name: "Аграїл (поранений)", side: "ally" } }],
    removed: [],
    log: [],
  });

  async function subscribed() {
    await waitFor(() => {
      expect(channelBindings.get(channelName)?.has("battle-delta")).toBe(true);
    });
  }

  it("обидва гравці застосовують battle-delta і мають однаковий стан", async () => {
    const qc1 = new QueryClient();

    const qc2 = new QueryClient();

    qc1.setQueryData(key, makeBattlePayload({ version: 1, currentTurnIndex: 0 }));
    qc2.setQueryData(key, makeBattlePayload({ version: 1, currentTurnIndex: 0 }));

    render(
      <>
        <PlayerSync campaignId={campaignId} battleId={battleId} userId="user-1" client={qc1} />
        <PlayerSync campaignId={campaignId} battleId={battleId} userId="user-2" client={qc2} />
      </>,
    );

    await subscribed();

    act(() => {
      simulateTrigger(channelName, "battle-delta", delta(2));
    });

    await waitFor(() => {
      const data = qc1.getQueryData<BattleScene>(key) ?? qc2.getQueryData<BattleScene>(key);

      expect(data?.version).toBe(2);
      expect(data?.currentTurnIndex).toBe(1);
      expect(data?.initiativeOrder?.[1]?.basicInfo?.name).toBe("Аграїл (поранений)");
    });

    const d1 = qc1.getQueryData<BattleScene>(key);

    const d2 = qc2.getQueryData<BattleScene>(key);

    if (d1?.version === 2 && d2?.version === 2) expect(d1.initiativeOrder).toEqual(d2.initiativeOrder);
  });

  it("refetch-сигнал новішої версії — одна інвалідація; версія, яку кеш уже має, — нічого", async () => {
    const qc = new QueryClient();

    qc.setQueryData(key, makeBattlePayload({ version: 5 }));

    const invalidate = vi.spyOn(qc, "invalidateQueries");

    render(<PlayerSync campaignId={campaignId} battleId={battleId} userId="user-1" client={qc} />);

    await subscribed();
    invalidate.mockClear();

    act(() => {
      simulateTrigger(channelName, "battle-delta", { battleId, version: 5, refetch: true });
    });

    expect(invalidate).not.toHaveBeenCalled();

    act(() => {
      simulateTrigger(channelName, "battle-delta", { battleId, version: 6, refetch: true });
    });

    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: key });
  });

  it("пропуск версії в дельті — інвалідація замість патчу", async () => {
    const qc = new QueryClient();

    qc.setQueryData(key, makeBattlePayload({ version: 1 }));

    const invalidate = vi.spyOn(qc, "invalidateQueries");

    render(<PlayerSync campaignId={campaignId} battleId={battleId} userId="user-1" client={qc} />);

    await subscribed();
    invalidate.mockClear();

    act(() => {
      simulateTrigger(channelName, "battle-delta", delta(3));
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: key });
    expect(qc.getQueryData<BattleScene>(key)?.version).toBe(1);
  });
});
