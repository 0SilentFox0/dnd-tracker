// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AiPanel } from "@/components/ai/AiPanel";

vi.mock("@/lib/hooks/common", async (orig) => ({ ...(await orig<object>()), useMediaQuery: () => true }));
vi.mock("@/lib/hooks/ai", async (orig) => ({
  ...(await orig<object>()),
  useAiCredentials: () => ({ query: { isLoading: false }, credentials: [] }),
  useAiThreads: () => ({ query: { isLoading: false, refetch: vi.fn() }, threads: [], create: vi.fn(), patch: vi.fn() }),
}));

const page = { id: "p1", content: { legend: [], sections: [] } } as never;

const proposals = { pending: [], refresh: vi.fn() } as never;

const mount = () => render(<AiPanel campaignId="c1" mode="scenario" focus={{ page, onClear: vi.fn() }} proposals={{ data: proposals }} actions={{ onClose: vi.fn() }} />);

const handle = () => screen.getByRole("separator", { name: "Ширина панелі AI" });

beforeEach(() => {
  window.localStorage.clear();
  Object.defineProperty(window, "innerWidth", { value: 1600, configurable: true, writable: true });
});

afterEach(cleanup);

describe("AiPanel resize", () => {
  it("стрілки міняють ширину на 32 px і упираються в межі", () => {
    mount();
    expect(handle().getAttribute("aria-valuenow")).toBe("420");
    fireEvent.keyDown(handle(), { key: "ArrowLeft" });
    expect(handle().getAttribute("aria-valuenow")).toBe("452");
    fireEvent.keyDown(handle(), { key: "ArrowRight" });
    fireEvent.keyDown(handle(), { key: "ArrowRight" });
    expect(handle().getAttribute("aria-valuenow")).toBe("388");

    for (let i = 0; i < 10; i++) fireEvent.keyDown(handle(), { key: "ArrowRight" });

    expect(handle().getAttribute("aria-valuenow")).toBe("320");

    for (let i = 0; i < 40; i++) fireEvent.keyDown(handle(), { key: "ArrowLeft" });

    expect(handle().getAttribute("aria-valuenow")).toBe("960");
  });

  it("максимум залежить від вікна і перераховується при resize; подвійний клік скидає", () => {
    mount();

    for (let i = 0; i < 40; i++) fireEvent.keyDown(handle(), { key: "ArrowLeft" });

    act(() => {
      window.innerWidth = 1000;
      window.dispatchEvent(new Event("resize"));
    });
    expect(handle().getAttribute("aria-valuenow")).toBe("520");
    fireEvent.doubleClick(handle());
    expect(handle().getAttribute("aria-valuenow")).toBe("420");
  });

  it("збережена ширина відновлюється при монтуванні", () => {
    window.localStorage.setItem("ai-panel-width", "600");
    mount();
    expect(handle().getAttribute("aria-valuenow")).toBe("600");
  });
});

it("shared queue replaces the old pending list rather than rendering a second copy", () => {
 render(<AiPanel campaignId="c1" mode="scenario" focus={{page,onClear:vi.fn()}} proposals={{data:{pending:[{id:"old1"}],refresh:vi.fn()} as never,showPending:true,render:()=><div>Duplicate legacy card</div>,review:<section aria-label="Єдина черга" />}} actions={{onClose:vi.fn()}} />);
 expect(screen.queryByText("Duplicate legacy card")).toBeNull();
 expect(screen.getByRole("region",{name:"Єдина черга"})).toBeTruthy();
});
