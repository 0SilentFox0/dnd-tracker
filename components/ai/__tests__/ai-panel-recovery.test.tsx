// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AiPanel } from "@/components/ai/AiPanel";

const chat = vi.hoisted(() => ({ send: vi.fn(), recover: vi.fn(), stop: vi.fn(), status: "ready", error: new Error("З'єднання перервано"), messages: [{ id: "u", role: "user", parts: [{ type: "text", text: "Зміна" }] }] }));

vi.mock("@/lib/hooks/common", () => ({ DESKTOP_QUERY: "", useMediaQuery: () => true }));
vi.mock("@/components/ai/AiComposer", () => ({ AiComposer: () => null }));
vi.mock("@/components/ai/AiThreadHeader", () => ({ AiThreadHeader: () => null }));
vi.mock("@/lib/hooks/ai", () => ({
  AI_PANEL_WIDTH: { min: 320, step: 32 },
  useAiPanelWidth: () => ({ width: 420, max: 960 }),
  useAiCredentials: () => ({ query: {}, credentials: [{ provider: "anthropic" }] }),
  useAiThreads: () => ({ query: {}, threads: [{ id: "t", mode: "scenario" }] }),
  useAiThreadMessages: () => ({ query: {}, messages: [] }),
  useAiChat: () => chat,
}));
describe("T15 retry affordance", () => {
  it("retry after an interrupted request reads recovery instead of creating another intent", () => {
    render(<QueryClientProvider client={new QueryClient()}><AiPanel campaignId="c" page={{ id: "p" } as never} mode="scenario" focus={undefined} proposals={{ refresh: vi.fn() } as never} actions={{ onClose: vi.fn(), onClearFocus: vi.fn() }} /></QueryClientProvider>);
    fireEvent.click(screen.getByRole("button", { name: /Повторити|Відновити стан/ }));
    expect(chat.recover).toHaveBeenCalledOnce();
    expect(chat.send).not.toHaveBeenCalled();
  });
});
