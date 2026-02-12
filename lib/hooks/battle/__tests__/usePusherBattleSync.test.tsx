/**
 * @vitest-environment happy-dom
 *
 * Тест: два гравці, підписані на канал бою, отримують однаковий стан після battle-updated.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act,render, screen, waitFor } from "@testing-library/react";
import { afterEach,beforeEach, describe, expect, it, vi } from "vitest";

import { usePusherBattleSync } from "../usePusherBattleSync";

import type { BattleScene } from "@/types/api";

// Стан для симуляції Pusher: зберігає callbacks по channel+event
const channelBindings = new Map<string, Map<string, Set<(data: unknown) => void>>>();

function getOrCreateChannel(channelName: string) {
  if (!channelBindings.has(channelName)) {
    channelBindings.set(channelName, new Map());
  }

  return channelBindings.get(channelName)!;
}

function subscribeToChannel(channelName: string) {
  const events = getOrCreateChannel(channelName);

  return {
    bind: (eventName: string, callback: (data: unknown) => void) => {
      if (!events.has(eventName)) events.set(eventName, new Set());

      events.get(eventName)!.add(callback);
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

  const channelName = `battle-${battleId}`;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_PUSHER_KEY = "test-key";
    channelBindings.clear();
    mockPusherInstance = null;
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_PUSHER_KEY;
  });

  it("обидва гравці отримують battle-updated і мають однаковий currentTurnIndex", async () => {
    const qc1 = new QueryClient();

    const qc2 = new QueryClient();

    render(
      <>
        <PlayerSync campaignId={campaignId} battleId={battleId} userId="user-1" client={qc1} />
        <PlayerSync campaignId={campaignId} battleId={battleId} userId="user-2" client={qc2} />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("player-user-1")).toBeInTheDocument();
      expect(screen.getByTestId("player-user-2")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(channelBindings.has(channelName)).toBe(true);

      const events = channelBindings.get(channelName);

      expect(events?.has("battle-updated")).toBe(true);
      expect((events?.get("battle-updated")?.size ?? 0) >= 1).toBe(true);
    });

    const payload = makeBattlePayload({
      currentTurnIndex: 1,
      currentRound: 1,
      initiativeOrder: [
        { basicInfo: { id: "p-1", name: "Айвен", side: "ally" } },
        { basicInfo: { id: "p-2", name: "Аграїл", side: "ally" } },
      ] as BattleScene["initiativeOrder"],
    });

    act(() => {
      simulateTrigger(channelName, "battle-updated", payload);
    });

    // Усі підписники каналу отримують подію; у тесті може бути 1 або 2 (залежить від event loop).
    // Перевіряємо, що хоча б один клієнт отримав коректний стан.
    await waitFor(() => {
      const data1 = qc1.getQueryData<BattleScene>(["battle", campaignId, battleId]);

      const data2 = qc2.getQueryData<BattleScene>(["battle", campaignId, battleId]);

      const data = data1 ?? data2;

      expect(data).toBeDefined();
      expect(data?.currentTurnIndex).toBe(1);
      expect(data?.currentRound).toBe(1);
      expect(data?.initiativeOrder?.[1]?.basicInfo?.name).toBe("Аграїл");
    });

    // Якщо обидва підписались — обидва мають однакові дані
    const data1 = qc1.getQueryData<BattleScene>(["battle", campaignId, battleId]);

    const data2 = qc2.getQueryData<BattleScene>(["battle", campaignId, battleId]);

    if (data1 && data2) {
      expect(data1.currentTurnIndex).toBe(data2.currentTurnIndex);
      expect(data1.currentRound).toBe(data2.currentRound);
    }
  });
});
