// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiTokenList } from "@/components/ai";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import { API_TOKEN_SCOPES, type ApiTokenScope } from "@/lib/constants/ai";

const token = { id: "k1", name: "Claude Desktop", prefix: "dndt_ab12", scopes: ["ai"] as ApiTokenScope[], lastUsedAt: null, createdAt: "2026-10-21T00:00:00Z" };

describe("ApiTokenList", () => {
  afterEach(cleanup);

  it("новий токен видно лише в діалозі створення", async () => {
    const onCreate = vi.fn(async () => ({ ...token, id: "k2", token: "dndt_SECRETVALUE" }));

    renderWithConfirm(<ApiTokenList tokens={[token]} scopes={API_TOKEN_SCOPES} actions={{ onCreate, onRevoke: vi.fn() }} />);

    expect(screen.getByText(/dndt_ab12…/)).toBeTruthy();
    expect(screen.getByText(/ще не використовувався/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Створити токен" }));
    fireEvent.change(screen.getByLabelText("Назва"), { target: { value: "Cursor" } });
    fireEvent.click(screen.getByRole("button", { name: "Створити" }));

    await waitFor(() => expect(screen.getByText("dndt_SECRETVALUE")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Скопіювати" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Готово" }));
    await waitFor(() => expect(screen.queryByText("dndt_SECRETVALUE")).toBeNull());
  });

  it("права: чипи в списку, галочки в діалозі, без прав не створити", async () => {
    const onCreate = vi.fn(async () => ({ ...token, id: "k2", scopes: ["content:write"] as ApiTokenScope[], token: "dndt_S" }));

    renderWithConfirm(<ApiTokenList tokens={[token]} scopes={API_TOKEN_SCOPES} actions={{ onCreate, onRevoke: vi.fn() }} />);

    expect(screen.getByText("AI-асистент (MCP)")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Створити токен" }));
    fireEvent.change(screen.getByLabelText("Назва"), { target: { value: "Cursor" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "AI-асистент (MCP)" }));
    expect((screen.getByRole("button", { name: "Створити" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("checkbox", { name: "Запис контенту" }));
    fireEvent.click(screen.getByRole("button", { name: "Створити" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith({ name: "Cursor", scopes: ["content:write"] }));
  });

  it("на шаблоні лише права на контент", () => {
    renderWithConfirm(<ApiTokenList tokens={[]} scopes={["content:read", "content:write"]} actions={{ onCreate: vi.fn(), onRevoke: vi.fn() }} />);
    fireEvent.click(screen.getByRole("button", { name: "Створити токен" }));
    expect(screen.queryByRole("checkbox", { name: "AI-асистент (MCP)" })).toBeNull();
  });
});
