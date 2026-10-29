// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AiProviderCard } from "@/components/ai";

const actions = () => ({ onSave: vi.fn(), onModel: vi.fn(), onDelete: vi.fn() });

describe("AiProviderCard", () => {
  it("без ключа: поле і кнопка збереження; ключ передається обрізаним", () => {
    const a = actions();

    render(<AiProviderCard provider="anthropic" credential={null} actions={a} pending={false} />);
    fireEvent.change(screen.getByLabelText("ai.provider.apiKey"), { target: { value: "  sk-ant-123456789 " } });
    fireEvent.click(screen.getByRole("button", { name: "ai.provider.verifyAndSave" }));
    expect(a.onSave).toHaveBeenCalledWith("sk-ant-123456789", null);
  });

  it("з ключем: показує лише маску, кнопка видалення", () => {
    render(<AiProviderCard provider="anthropic" credential={{ provider: "anthropic", last4: "a1b2", defaultModel: null, updatedAt: "2026-10-21T00:00:00Z" }} actions={actions()} pending={false} />);
    expect(screen.getByText("…a1b2")).toBeTruthy();
    expect(screen.getByRole("button", { name: "common.actions.delete" })).toBeTruthy();
  });
});
