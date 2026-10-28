// @vitest-environment happy-dom
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { aiKeys } from "../keys";
import { useAssistantIntents } from "../useAssistantIntents";

import type { IntentStatus } from "@/types/assistant";

const clients: QueryClient[] = [];

const fetchMock = vi.fn();

function setup(intentId?: string, status: IntentStatus = "pending") {
  vi.stubGlobal("fetch", fetchMock.mockImplementation(async (url: string) => {
    if (url.endsWith("/confirm")) return Response.json({ id: "r1", status: "applied", effectsStatus: "complete", result: { data: null, affected: [], warnings: [] } });

    if (url.endsWith("/reject")) return Response.json({ id: "i1", status: "rejected" });

    if (url.endsWith("/receipt")) return Response.json({ id: "r1", status, effectsStatus: "complete" });

    if (url.includes("/assistant/intents?")) return Response.json({ items: [], nextCursor: "next" });

    if (url.endsWith("/assistant/intents/i1")) return Response.json({ id: "i1", status });

    if (url.includes("/ai/proposals?")) return Response.json([]);

    throw new Error(`Unexpected HTTP: ${url}`);
  }));

  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

  clients.push(client);

  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);

  const hook = renderHook(() => useAssistantIntents("c1", { intentId, cursor: "page2", limit: 7 }), { wrapper });

  return { client, ...hook };
}

afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.clear());
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("preserves existing tuple and cursor/limit cache identity with campaign prefixes", () => {
  const client = new QueryClient();

  expect(aiKeys.intentsRoot("c")).toEqual(["assistant-intents", "c"]);
  expect(aiKeys.intentRoot("c")).toEqual(["assistant-intent", "c"]);
  expect(aiKeys.receiptsRoot("c")).toEqual(["assistant-receipt", "c"]);
  expect(aiKeys.proposalsRoot("c")).toEqual(["ai-proposals", "c"]);
  expect(aiKeys.workspaceProposals("c")).toEqual(["ai-proposals", "c", "workspace"]);
  client.setQueryData(["assistant-intents", "c", null, 20], "default");
  client.setQueryData(["assistant-intents", "c", "page2", 7], "page2");
  client.setQueryData(["ai-proposals", "c", "workspace"], "legacy");
  expect(client.getQueryData(aiKeys.intents("c"))).toBe("default");
  expect(client.getQueryData(aiKeys.intents("c", "page2", 7))).toBe("page2");
  expect(client.getQueryData(aiKeys.intents("c", "page2", 8))).toBeUndefined();
  expect(client.getQueryData(aiKeys.intents("c", "page3", 7))).toBeUndefined();
  expect(client.getQueryData(aiKeys.workspaceProposals("c"))).toBe("legacy");
  expect(aiKeys.intent("c", "i")).toEqual(["assistant-intent", "c", "i"]);
  expect(aiKeys.receipt("c", "i")).toEqual(["assistant-receipt", "c", "i"]);
  expect(aiKeys.proposals("c", "page")).toEqual(["ai-proposals", "c", "page"]);
  client.clear();
});

it.each([
  ["confirm", false], ["reject", false], ["confirm", true], ["reject", true],
] as const)("%s refreshes campaign caches on settlement (failure=%s)", async (action, failure) => {
  const { client, result } = setup();

  await waitFor(() => expect(result.current.query.isSuccess && result.current.legacy.isSuccess).toBe(true));

  const keys = (campaign: string) => [aiKeys.intents(campaign), aiKeys.intents(campaign, "later", 5), aiKeys.intent(campaign, "other"), aiKeys.receipt(campaign, "other"), aiKeys.proposals(campaign, "page"), aiKeys.workspaceProposals(campaign)];

  // Inactive entries expose actual prefix coverage, while active queries must refetch.
  for (const key of [...keys("c1"), ...keys("c2")]) client.setQueryData(key, { cached: true });

  const before = fetchMock.mock.calls.length;

  if (failure) fetchMock.mockImplementationOnce(async () => { throw new Error("Mocked transport failure"); });

  await act(async () => {
    if (failure) await expect(result.current[action]("i1")).rejects.toThrow("Mocked transport failure");
    else await result.current[action]("i1");
  });

  for (const key of keys("c1").filter(key => key[2] !== "workspace")) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  for (const key of keys("c2")) expect(client.getQueryState(key)?.isInvalidated).toBe(false);
  expect(fetchMock.mock.calls.slice(before).map(([url]) => url)).toEqual(expect.arrayContaining([
    expect.stringContaining("/assistant/intents?limit=7&cursor=page2&status=pending"),
    expect.stringContaining("/ai/proposals?status=pending&workspace=true"),
  ]));
});

it("keeps pending-only HTTP filters and detail/receipt disabled without an intent id", async () => {
  const { result } = setup();

  await waitFor(() => expect(result.current.query.isSuccess && result.current.legacy.isSuccess).toBe(true));
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    "/api/campaigns/c1/assistant/intents?limit=7&cursor=page2&status=pending",
    "/api/campaigns/c1/ai/proposals?status=pending&workspace=true",
  ]);
  expect(result.current.detail.fetchStatus).toBe("idle");
  expect(result.current.receipt.fetchStatus).toBe("idle");
});

it.each(["pending", "applied", "executing", "unknown", "failed", "rejected", "stale"] as const)("preserves %s receipt eligibility and polling timing", async status => {
  vi.useFakeTimers();

  const { result } = setup("i1", status);

  await act(() => vi.advanceTimersByTimeAsync(1));
  expect(result.current.detail.data?.status).toBe(status);

  const count = (path: string) => fetchMock.mock.calls.filter(([url]) => url.includes(path)).length;

  const receiptEnabled = ["applied", "executing", "unknown", "failed"].includes(status);

  expect(count("/receipt")).toBe(receiptEnabled ? 1 : 0);
  await act(() => vi.advanceTimersByTimeAsync(1998));
  expect(count("/receipt")).toBe(receiptEnabled ? 1 : 0);
  await act(() => vi.advanceTimersByTimeAsync(2));
  expect(count("/receipt")).toBe(status === "executing" ? 2 : receiptEnabled ? 1 : 0);
  expect(count("/assistant/intents?")).toBe(1);
  await act(() => vi.advanceTimersByTimeAsync(7998));
  expect(count("/assistant/intents?")).toBe(1);
  await act(() => vi.advanceTimersByTimeAsync(2));
  expect(count("/assistant/intents?")).toBe(2);
});
