// @vitest-environment happy-dom
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiTokenList } from "@/components/ai";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";

const token = { id: "k1", name: "Claude Desktop", prefix: "dndt_ab12", lastUsedAt: null, createdAt: "2026-10-21T00:00:00Z" };

describe("ApiTokenList", () => {
  it("новий токен видно лише в діалозі створення", async () => {
    const onCreate = vi.fn(async () => ({ ...token, id: "k2", token: "dndt_SECRETVALUE" }));

    renderWithConfirm(<ApiTokenList tokens={[token]} actions={{ onCreate, onRevoke: vi.fn() }} />);

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
});
