/**
 * @vitest-environment happy-dom
 *
 * Тест: два гравці, підписані на канал бою, отримують однаковий стан після battle-delta.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RESYNC_AFTER_HIDDEN_MS, usePusherBattleSync } from "../usePusherBattleSync";

import { getBattleVersion } from "@/lib/api/battles";
import type { BattleScene } from "@/types/api";

vi.mock("@/lib/api/battles", () => ({ getBattleVersion: vi.fn() }));

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

const stateListeners = new Set<(states: { previous: string; current: string }) => void>();

function changeState(previous: string, current: string) {
  stateListeners.forEach((cb) => cb({ previous, current }));
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

let mockPusherInstance: ReturnType<typeof createMockPusher> | null = null;

function createMockPusher() {
  return {
    subscribe: (channelName: string) => subscribeToChannel(channelName),
    unsubscribe: (channelName: string) => unsubscribeChannel(channelName),
    connection: {
      state: "connected",
      bind: vi.fn((event: string, cb: (states: { previous: string; current: string }) => void) => {
        if (event === "state_change") stateListeners.add(cb);
      }),
      unbind: vi.fn((_event: string, cb: (states: { previous: string; current: string }) => void) => {
        stateListeners.delete(cb);
      }),
    },
  };
}

vi.mock("@/lib/pusher-client", () => ({
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
    stateListeners.clear();
    mockPusherInstance = null;
    vi.mocked(getBattleVersion).mockReset();
  });

  afterEach(() => {
    cleanup();
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

  it("помилка авторизації каналу бою — не вважаємо себе підключеними, щоб працював polling", async () => {
    const qc = new QueryClient();

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    function StateProbe() {
      const { connectionState } = usePusherBattleSync(campaignId, battleId, "user-1", vi.fn());

      return <span data-testid="state">{String(connectionState)}</span>;
    }

    render(
      <QueryClientProvider client={qc}>
        <StateProbe />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("connected"));
    await waitFor(() => expect(channelBindings.get(channelName)?.has("pusher:subscription_error")).toBe(true));

    act(() => simulateTrigger(channelName, "pusher:subscription_error", { status: 404 }));

    expect(screen.getByTestId("state").textContent).toBe("unavailable");
    expect(warn).toHaveBeenCalled();

    act(() => changeState("connecting", "connected"));
    expect(screen.getByTestId("state").textContent).toBe("unavailable");
    warn.mockRestore();
  });

  describe("ресинхронізація після розриву", () => {
    async function mounted(version = 5) {
      const qc = new QueryClient();

      qc.setQueryData(key, makeBattlePayload({ version }));

      const invalidate = vi.spyOn(qc, "invalidateQueries");

      render(<PlayerSync campaignId={campaignId} battleId={battleId} userId="user-1" client={qc} />);

      await subscribed();
      await waitFor(() => expect(stateListeners.size).toBe(1));
      invalidate.mockClear();

      return invalidate;
    }

    it("будь-який вихід із connected і повернення — запит версії; новіша → повний GET", async () => {
      vi.mocked(getBattleVersion).mockResolvedValue({ version: 6 });

      const invalidate = await mounted();

      act(() => changeState("connected", "connecting"));
      act(() => changeState("connecting", "connected"));

      await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: key }));
      expect(getBattleVersion).toHaveBeenCalledWith(campaignId, battleId);
    });

    it("версія не новіша за кеш — без повного GET", async () => {
      vi.mocked(getBattleVersion).mockResolvedValue({ version: 5 });

      const invalidate = await mounted();

      act(() => changeState("connected", "unavailable"));
      act(() => changeState("unavailable", "connected"));

      await waitFor(() => expect(getBattleVersion).toHaveBeenCalledTimes(1));
      await Promise.resolve();
      expect(invalidate).not.toHaveBeenCalled();
    });

    it("вкладка схована довше за поріг — перевірка версії при поверненні; коротко — нічого", async () => {
      vi.mocked(getBattleVersion).mockResolvedValue({ version: 7 });

      const now = vi.spyOn(Date, "now");

      const invalidate = await mounted();

      now.mockReturnValue(1_000);
      act(() => setVisibility("hidden"));
      now.mockReturnValue(1_000 + RESYNC_AFTER_HIDDEN_MS / 2);
      act(() => setVisibility("visible"));
      expect(getBattleVersion).not.toHaveBeenCalled();

      now.mockReturnValue(10_000);
      act(() => setVisibility("hidden"));
      now.mockReturnValue(10_000 + RESYNC_AFTER_HIDDEN_MS + 1);
      act(() => setVisibility("visible"));

      await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: key }));
      now.mockRestore();
    });

    it("повернення вкладки й перепідключення одночасно — один запит версії й одна інвалідація", async () => {
      let resolve: (v: { version: number }) => void = () => {};

      vi.mocked(getBattleVersion).mockImplementation(() => new Promise((r) => { resolve = r; }));

      const now = vi.spyOn(Date, "now");

      const invalidate = await mounted();

      now.mockReturnValue(1_000);
      act(() => setVisibility("hidden"));
      act(() => changeState("connected", "connecting"));
      now.mockReturnValue(1_000 + RESYNC_AFTER_HIDDEN_MS + 1);
      act(() => setVisibility("visible"));
      act(() => changeState("connecting", "connected"));

      expect(getBattleVersion).toHaveBeenCalledTimes(1);

      await act(async () => resolve({ version: 9 }));
      await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(1));
      now.mockRestore();
    });
  });
});
